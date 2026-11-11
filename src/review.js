// Gerbang persetujuan soal yang dihitung di SERVER, bukan dipercayakan ke klien.
// Masalah sebelumnya: ai.verifikasi dan ai.buta ditulis penyusun sendiri, lalu aturan Firestore memakainya sebagai gerbang
// ("perlu catatan alasan"). Penyusun bisa menulis 'lolos' untuk kutipan yang sebenarnya gagal.
// Sekarang: persetujuan hanya lewat setujui() di bawah (Admin SDK). Kutipan dihitung ulang dari teks dan isi soal yang
// tersimpan; hasil uji jawab buta diambil dari catatan server (koleksi cekbutaHasil), bukan dari klaim di dokumen soal.
import { createHash } from 'node:crypto';
import { ApiError } from './soalService.js';
import { periksaKutipan, bidangDariSoal } from './kutipan.js';
import { bentukSah, punyaOpsi } from './bentuk.js';
import { periksaSumber } from './sumber.js';
import { DEFAULT_HOSTS } from './kitabFetch.js';
import { ALUR_BAWAAN, bolehTinjau, langkahSetelah, catatTinjauan } from './alurSoal.js';

export const KOLEKSI_BUTA = 'cekbutaHasil';
export const KOLEKSI_TELAAH = 'telaahHasil'; // gerbang soal tanpa opsi (isian, uraian), yang tidak bisa diuji buta
const norm = (s) => String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

/** Sidik isi yang diuji-buta: teks kitab, bentuk, stimulus, pertanyaan, opsi A-E, kunci. Berubah bila salah satunya berubah. */
export function sidikButa({ teks, bentuk, soal }) {
  const s = soal || {}; const o = s.opsi || {};
  const bahan = JSON.stringify([norm(teks), bentukSah(bentuk) || 'pilgan', norm(s.stimulus), norm(s.pertanyaan), ['A', 'B', 'C', 'D', 'E'].map((k) => norm(o[k])), norm(s.kunci)]);
  return createHash('sha256').update(bahan).digest('hex').slice(0, 40);
}

/** Sidik dari dokumen soal tersimpan. */
export const sidikButaSoal = (q) => sidikButa({ teks: q.teks, bentuk: q.bentuk, soal: { stimulus: q.stimulus, pertanyaan: q.pertanyaan, opsi: q.opsi, kunci: q.kunci } });

/** Catat hasil uji jawab buta (dipanggil /api/assist). Hanya 'sepakat'/'beda'. Gagal menulis tidak menggagalkan permintaan. */
export async function catatButa(db, FieldValue, { teks, bentuk, soal, status, uid, model }) {
  if (status !== 'sepakat' && status !== 'beda') return false;
  try {
    const ref = db.doc(`${KOLEKSI_BUTA}/${sidikButa({ teks, bentuk, soal })}`);
    // "beda" untuk isi yang persis sama bersifat lengket: uji ulang tidak boleh menimpanya dengan "sepakat" (penyusun tidak bisa mengulang sampai lolos).
    // Jalan keluarnya sah: ubah soalnya (sidik berubah, jadi catatan baru), atau editor menyetujui dengan catatan alasan.
    if (status === 'sepakat' && typeof ref.get === 'function') {
      const lama = await ref.get();
      if (lama && lama.exists && lama.data().status === 'beda') return false;
    }
    await ref.set({ status, uid: String(uid || ''), model: String(model || '').slice(0, 60), at: FieldValue.serverTimestamp() });
    return true;
  } catch (e) { console.error('[review] gagal mencatat uji buta:', e?.code ?? e?.message); return false; }
}

/** Sidik isi yang ditelaah (soal tanpa opsi): teks kitab, bentuk, stimulus, pertanyaan, jawaban, rubrik. Berubah bila salah satunya berubah. */
export function sidikTelaah({ teks, bentuk, soal }) {
  const s = soal || {};
  const bahan = JSON.stringify(['telaah', norm(teks), bentukSah(bentuk) || 'pilgan', norm(s.stimulus), norm(s.pertanyaan), norm(s.jawaban), norm(s.rubrik)]);
  return createHash('sha256').update(bahan).digest('hex').slice(0, 40);
}
export const sidikTelaahSoal = (q) => sidikTelaah({ teks: q.teks, bentuk: q.bentuk, soal: q });

const PERINGKAT_VERDICT = { layak: 0, perlu_perbaikan: 1, tidak_layak: 2 };

/**
 * Catat hasil telaah AI untuk soal TANPA opsi (isian, uraian); soal berpilihan memakai uji buta. Dipanggil /api/assist (aksi telaah).
 * Verdict yang lebih buruk bersifat lengket untuk isi yang persis sama: telaah ulang tidak boleh menimpanya dengan yang lebih baik
 * (penyusun tidak bisa mengulang sampai "layak"). Mengubah soal = sidik baru = telaah baru.
 */
export async function catatTelaah(db, FieldValue, { teks, bentuk, soal, verdict, uid, model }) {
  if (!(verdict in PERINGKAT_VERDICT) || punyaOpsi(bentuk)) return false;
  try {
    const ref = db.doc(`${KOLEKSI_TELAAH}/${sidikTelaah({ teks, bentuk, soal })}`);
    if (typeof ref.get === 'function') {
      const lama = await ref.get();
      if (lama && lama.exists && PERINGKAT_VERDICT[lama.data().verdict] > PERINGKAT_VERDICT[verdict]) return false;
    }
    await ref.set({ verdict, uid: String(uid || ''), model: String(model || '').slice(0, 60), at: FieldValue.serverTimestamp() });
    return true;
  } catch (e) { console.error('[review] gagal mencatat telaah:', e?.code ?? e?.message); return false; }
}

/**
 * Alasan yang mewajibkan catatan editor. Kutipan: dihitung ulang dari soal tersimpan (klaim di dokumen hanya dipakai bila tak bisa dihitung ulang).
 * Uji buta (soal berpilihan): WAJIB ada catatan server "sepakat" untuk isi yang persis sama; tanpa itu, editor wajib menulis alasan. Klaim "sepakat" di dokumen tidak dihitung; klaim 'beda' tetap dihormati (hanya bisa memperketat).
 * Kutipan "mirip" (harakat beda, kata berganti, negasi terpotong) juga mewajibkan alasan.
 */
export function alasanPerluCatatan(q, rekamButa, { sumber, sumberWajib = false, rekamTelaah = null } = {}) {
  const alasan = [];
  const ai = (q && q.ai) || {};
  const bisaDihitung = String(q.teks || '').trim() && String(q.pembahasan || '').trim();
  const hasilKutipan = bisaDihitung ? periksaKutipan(bidangDariSoal(q), q.teks) : null;
  const kutipan = hasilKutipan ? hasilKutipan.status : ai.verifikasi;
  if (kutipan === 'gagal') alasan.push('ada kutipan Arab yang tidak ada di teks kitab');
  // "mirip" = selisih harakat, satu kata berganti, atau kutipan terpotong tepat setelah kata negasi: satu kata saja bisa membalik hukum.
  else if (hasilKutipan && hasilKutipan.ringkas.mirip > 0) alasan.push('ada kutipan Arab yang mirip tetapi tidak persis dengan teks (cek harakat, kata yang berganti, atau negasi yang terpotong)');
  // Uji jawab buta WAJIB untuk soal berpilihan. Yang dihitung hanya catatan server; klaim "sepakat" di dokumen soal tidak pernah cukup.
  // Klaim "beda" di dokumen tetap dihormati (hanya memperketat).
  if (punyaOpsi(q.bentuk)) {
    const buta = rekamButa && rekamButa.status ? rekamButa.status : (ai.buta === 'beda' ? 'beda' : '');
    if (buta === 'beda') alasan.push('uji jawab buta berbeda dari kunci');
    else if (buta !== 'sepakat') alasan.push('uji jawab buta belum dijalankan untuk isi soal ini (jalankan Uji Buta, atau tulis alasan bila sengaja dilewati)');
  } else {
    // Soal tanpa opsi (isian, uraian) tidak bisa diuji buta: gantinya WAJIB ada catatan telaah dari server dengan verdict "layak".
    const v = rekamTelaah && rekamTelaah.verdict ? rekamTelaah.verdict : '';
    if (v === 'tidak_layak') alasan.push('telaah AI menyatakan soal ini tidak layak');
    else if (v === 'perlu_perbaikan') alasan.push('telaah AI menyatakan soal ini masih perlu perbaikan (terapkan perbaikannya, atau tulis alasan bila tidak setuju)');
    else if (v !== 'layak') alasan.push('soal ini belum ditelaah untuk isi yang sekarang (jalankan Telaah, atau tulis alasan bila sengaja dilewati)');
  }
  if (sumber && sumber.status === 'tidak_cocok') alasan.push('teks kitab hampir seluruhnya tidak ditemukan di halaman sumber (tautan sumber)');
  if (sumberWajib && sumber && ['tanpa_sumber', 'tidak_terjangkau'].includes(sumber.status)) alasan.push('teks kitab belum bisa dicocokkan dengan halaman sumber (tautan sumber kosong atau tidak terjangkau)');
  return alasan;
}

const sidikIsiSumber = (q) => createHash('sha256').update(JSON.stringify([q.teks || '', q.sumberUrl || ''])).digest('hex');

/**
 * Setujui satu soal Pending. Menggantikan penulisan langsung dari klien (aturan Firestore tidak lagi mengizinkannya).
 * Dengan alur editor bertahap (alur.aktif, jumlah tahap mapel > 1): di tahap sebelum terakhir, "setujui" HANYA meloloskan soal ke
 * editor tahap berikutnya (tetap Pending); status Approved dan gerbang kutipan/uji buta/sumber baru berlaku di tahap terakhir.
 */
export async function setujui(db, FieldValue, { id, uid, nama, role, catatan, ambilSumber, hosts = DEFAULT_HOSTS, sumberWajib = false, alur = ALUR_BAWAAN, tahapEditor = [] }) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) throw new ApiError(400, 'BAD_REQUEST', 'Id soal tidak valid.');
  const note = String(catatan ?? '').trim().slice(0, 1000);
  const ref = db.doc(`soal/${id}`);
  // Mengambil halaman sumber (jaringan, sampai ~10 dtk) dilakukan SEBELUM transaksi; di dalam transaksi isinya dipastikan tidak berubah.
  const awal = await ref.get();
  if (!awal.exists) throw new ApiError(404, 'SOAL_NOT_FOUND', 'Soal tidak ditemukan.');
  const q0 = awal.data();
  // Pemeriksaan sumber (jaringan) hanya perlu pada persetujuan akhir; meloloskan ke tahap berikutnya tidak memerlukannya.
  const akhir0 = q0.status !== 'pending' || langkahSetelah(q0, alur, 'lolos').status === 'approved';
  const sumber = q0.status === 'pending' && akhir0 ? await periksaSumber(q0, { ...(ambilSumber ? { ambil: ambilSumber } : {}), hosts }) : { status: 'tanpa_sumber', total: 0, cocok: 0 };
  let alasanDipakai = [];
  let lanjut = null;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, 'SOAL_NOT_FOUND', 'Soal tidak ditemukan.');
    const q = snap.data();
    if (q.status !== 'pending') throw new ApiError(409, 'STATUS_BERUBAH', 'Soal ini tidak lagi berstatus Pending (mungkin sudah ditinjau orang lain). Muat ulang daftar.');
    const izin = bolehTinjau({ uid, role, tahapEditor }, q, alur);
    if (!izin.ok) throw new ApiError(403, izin.kode, izin.alasan);
    if (sidikIsiSumber(q) !== sidikIsiSumber(q0)) throw new ApiError(409, 'SOAL_BERUBAH', 'Soal diubah saat diperiksa. Muat ulang lalu coba lagi.');
    const langkah = langkahSetelah(q, alur, 'lolos');
    // Pemeriksaan sumber di atas diputuskan dari tahap saat dibaca. Bila tahap berubah sejak itu (mis. editor lain baru meloloskan), jangan menyetujui tanpa pemeriksaan itu.
    if ((langkah.status === 'approved') !== akhir0) throw new ApiError(409, 'SOAL_BERUBAH', 'Tahap soal berubah saat diperiksa. Muat ulang lalu coba lagi.');
    const jejak = (hasil) => (izin.total > 1 ? { tahap: langkah.tahap, tinjauan: catatTinjauan(q.tinjauan, { tahap: izin.tahap, uid, nama, hasil, at: Date.now(), catatan: note }) } : {});
    if (langkah.status === 'pending') { // lolos ke editor tahap berikutnya; belum Approved
      tx.update(ref, { ...jejak('lolos'), reviewerUid: uid, reviewerName: String(nama || '').slice(0, 120), reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      lanjut = { tahap: langkah.tahap, total: izin.total };
      return;
    }
    const rek = await tx.get(db.doc(`${KOLEKSI_BUTA}/${sidikButaSoal(q)}`));
    const rekT = await tx.get(db.doc(`${KOLEKSI_TELAAH}/${sidikTelaahSoal(q)}`));
    const alasan = alasanPerluCatatan(q, rek.exists ? rek.data() : null, { sumber, sumberWajib, rekamTelaah: rekT.exists ? rekT.data() : null });
    if (alasan.length && !note) throw new ApiError(422, 'ALASAN_WAJIB', `Soal ini perlu catatan alasan sebelum disetujui: ${alasan.join('; ')}.`);
    alasanDipakai = alasan;
    tx.update(ref, { status: 'approved', ...jejak('setuju'), catatan: note, reviewerUid: uid, reviewerName: String(nama || '').slice(0, 120), reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  });
  if (lanjut) return { ok: true, id, lanjut: true, tahap: lanjut.tahap, total: lanjut.total };
  return { ok: true, id, dengan_catatan: alasanDipakai.length > 0, sumber: sumber.status };
}

/** Minta revisi satu soal Pending (ke penyusun). Lewat server agar tahap editor ditegakkan; klien tidak lagi menulis status 'revision' langsung. */
export async function mintaRevisi(db, FieldValue, { id, uid, nama, role, catatan, alur = ALUR_BAWAAN, tahapEditor = [] }) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) throw new ApiError(400, 'BAD_REQUEST', 'Id soal tidak valid.');
  const note = String(catatan ?? '').trim().slice(0, 1000);
  if (!note) throw new ApiError(422, 'CATATAN_WAJIB', 'Tulis catatan revisi untuk penyusun.');
  const ref = db.doc(`soal/${id}`);
  let hasil = null;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, 'SOAL_NOT_FOUND', 'Soal tidak ditemukan.');
    const q = snap.data();
    if (q.status !== 'pending') throw new ApiError(409, 'STATUS_BERUBAH', 'Soal ini tidak lagi berstatus Pending (mungkin sudah ditinjau orang lain). Muat ulang daftar.');
    const izin = bolehTinjau({ uid, role, tahapEditor }, q, alur);
    if (!izin.ok) throw new ApiError(403, izin.kode, izin.alasan);
    const langkah = langkahSetelah(q, alur, 'revisi');
    const upd = { status: 'revision', catatan: note, reviewerUid: uid, reviewerName: String(nama || '').slice(0, 120), reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() };
    if (izin.total > 1) { upd.tahap = langkah.tahap; upd.tinjauan = catatTinjauan(q.tinjauan, { tahap: izin.tahap, uid, nama, hasil: 'revisi', at: Date.now() }); }
    tx.update(ref, upd);
    hasil = { ok: true, id, tahapBerikut: langkah.tahap, total: izin.total };
  });
  return hasil;
}
