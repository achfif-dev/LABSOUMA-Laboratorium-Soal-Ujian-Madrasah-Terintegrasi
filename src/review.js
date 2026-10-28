// Gerbang persetujuan soal yang dihitung di SERVER, bukan dipercayakan ke klien.
// Masalah sebelumnya: ai.verifikasi dan ai.buta ditulis penyusun sendiri, lalu aturan Firestore memakainya sebagai gerbang
// ("perlu catatan alasan"). Penyusun bisa menulis 'lolos' untuk kutipan yang sebenarnya gagal.
// Sekarang: persetujuan hanya lewat setujui() di bawah (Admin SDK). Kutipan dihitung ulang dari teks dan isi soal yang
// tersimpan; hasil uji jawab buta diambil dari catatan server (koleksi cekbutaHasil), bukan dari klaim di dokumen soal.
import { createHash } from 'node:crypto';
import { ApiError } from './soalService.js';
import { periksaKutipan, bidangDariSoal } from './kutipan.js';
import { bentukSah } from './bentuk.js';
import { periksaSumber } from './sumber.js';
import { DEFAULT_HOSTS } from './kitabFetch.js';

export const KOLEKSI_BUTA = 'cekbutaHasil';
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
    await db.doc(`${KOLEKSI_BUTA}/${sidikButa({ teks, bentuk, soal })}`).set({ status, uid: String(uid || ''), model: String(model || '').slice(0, 60), at: FieldValue.serverTimestamp() });
    return true;
  } catch (e) { console.error('[review] gagal mencatat uji buta:', e?.code ?? e?.message); return false; }
}

/**
 * Alasan yang mewajibkan catatan editor. Kutipan: dihitung ulang dari soal tersimpan (klaim di dokumen hanya dipakai bila tak bisa dihitung ulang).
 * Uji buta: catatan server untuk isi yang persis sama menang atas klaim; tanpa catatan server, klaim 'beda' tetap dihormati (hanya bisa memperketat).
 */
export function alasanPerluCatatan(q, rekamButa, { sumber, sumberWajib = false } = {}) {
  const alasan = [];
  const ai = (q && q.ai) || {};
  const bisaDihitung = String(q.teks || '').trim() && String(q.pembahasan || '').trim();
  const kutipan = bisaDihitung ? periksaKutipan(bidangDariSoal(q), q.teks).status : ai.verifikasi;
  if (kutipan === 'gagal') alasan.push('ada kutipan Arab yang tidak ada di teks kitab');
  const buta = rekamButa && rekamButa.status ? rekamButa.status : ai.buta;
  if (buta === 'beda') alasan.push('uji jawab buta berbeda dari kunci');
  if (sumber && sumber.status === 'tidak_cocok') alasan.push('teks kitab hampir seluruhnya tidak ditemukan di halaman sumber (tautan sumber)');
  if (sumberWajib && sumber && ['tanpa_sumber', 'tidak_terjangkau'].includes(sumber.status)) alasan.push('teks kitab belum bisa dicocokkan dengan halaman sumber (tautan sumber kosong atau tidak terjangkau)');
  return alasan;
}

const sidikIsiSumber = (q) => createHash('sha256').update(JSON.stringify([q.teks || '', q.sumberUrl || ''])).digest('hex');

/** Setujui satu soal Pending. Menggantikan penulisan langsung dari klien (aturan Firestore tidak lagi mengizinkannya). */
export async function setujui(db, FieldValue, { id, uid, nama, role, catatan, ambilSumber, hosts = DEFAULT_HOSTS, sumberWajib = false }) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) throw new ApiError(400, 'BAD_REQUEST', 'Id soal tidak valid.');
  const note = String(catatan ?? '').trim().slice(0, 1000);
  const ref = db.doc(`soal/${id}`);
  // Mengambil halaman sumber (jaringan, sampai ~10 dtk) dilakukan SEBELUM transaksi; di dalam transaksi isinya dipastikan tidak berubah.
  const awal = await ref.get();
  if (!awal.exists) throw new ApiError(404, 'SOAL_NOT_FOUND', 'Soal tidak ditemukan.');
  const q0 = awal.data();
  const sumber = q0.status === 'pending' ? await periksaSumber(q0, { ...(ambilSumber ? { ambil: ambilSumber } : {}), hosts }) : { status: 'tanpa_sumber', total: 0, cocok: 0 };
  let alasanDipakai = [];
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, 'SOAL_NOT_FOUND', 'Soal tidak ditemukan.');
    const q = snap.data();
    if (q.status !== 'pending') throw new ApiError(409, 'STATUS_BERUBAH', 'Soal ini tidak lagi berstatus Pending (mungkin sudah ditinjau orang lain). Muat ulang daftar.');
    if (q.authorUid === uid && role !== 'admin') throw new ApiError(403, 'REVIEW_SENDIRI', 'Editor tidak boleh menyetujui soal buatannya sendiri.');
    if (sidikIsiSumber(q) !== sidikIsiSumber(q0)) throw new ApiError(409, 'SOAL_BERUBAH', 'Soal diubah saat diperiksa. Muat ulang lalu coba lagi.');
    const rek = await tx.get(db.doc(`${KOLEKSI_BUTA}/${sidikButaSoal(q)}`));
    const alasan = alasanPerluCatatan(q, rek.exists ? rek.data() : null, { sumber, sumberWajib });
    if (alasan.length && !note) throw new ApiError(422, 'ALASAN_WAJIB', `Soal ini perlu catatan alasan sebelum disetujui: ${alasan.join('; ')}.`);
    alasanDipakai = alasan;
    tx.update(ref, { status: 'approved', catatan: note, reviewerUid: uid, reviewerName: String(nama || '').slice(0, 120), reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  });
  return { ok: true, id, dengan_catatan: alasanDipakai.length > 0, sumber: sumber.status };
}
