// Batas halaman cetak di dalam teks (aksi `perpus-batas-baca`, `perpus-batas-simpan`, `perpus-batas-mulai`, `perpus-batas-tulis`; dipanggil dari src/kitabBaca.js).
// Aturan pemotongan ada di web/lib/batasCetak.js (satu sumber dengan layar).
//
// Dua tahap, supaya menandai boleh dicicil dan menerapkan tidak setengah jadi:
//   1. DRAF (editor dan admin)   kitab/{id}/batasCetak/draf   tanda [{seq, off, hal, juz?, awal}], `rev` (kunci bentrok), `dasar` {revisi, ruang}. Tidak mengubah kitab.
//   2. TERAPKAN (admin saja)     seluruh kitab disusun ulang ke RUANG BARU (halaman_rN), memakai mekanisme impor ulang bertahap yang sudah ada:
//        perpus-batas-mulai   menghitung rencana dari draf, menulis impor/berjalan (+ daftar isi baru di ruang baru); kitab lama tetap aktif dan terbaca
//        perpus-batas-tulis   satu grup (<= 100 halaman hasil) per panggilan: membaca halaman asli yang diperlukan, menulis halaman dan indeks cari di ruang baru; diulang sampai selesai
//        impor-selesai        (aksi impor yang sudah ada) memeriksa jumlah, mengalihkan meta.ruang dalam SATU penulisan, lalu menghapus ruang lama
//      Selama tahap 2 kitab lama tidak berubah. Terputus di tengah: panggil perpus-batas-tulis lagi (melanjutkan) atau perpus-batas-mulai (mengulang dari awal).
// Yang HILANG pada halaman hasil potongan: pemisahan matn/syarah (`batasMatn: null`), tanda `diverifikasi`, `dikoreksi`, dan `rev`; teksnya tetap teks sekarang (koreksi ikut terbawa).
// Halaman yang disalin apa adanya tidak berubah selain urutan dan tanda anomali. Penghitung koreksi/suntingan di metadata kembali 0 (seperti impor ulang); riwayat arsipnya tetap ada.
// Daftar isi: tiap judul dipindahkan ke halaman hasil yang memuat AWAL halaman digital lamanya (posisi judul di dalam halaman tidak tersimpan, jadi bisa meleset satu halaman cetak).
// Urutan halaman (`seq`) BERUBAH. Batas materi, paket, dan soal yang menaut ke `seq` lama jadi tidak cocok: terapkan hanya pada kitab yang belum dipakai tautan itu.
import { ApiError } from './soalService.js';
import { firestoreAdmin } from './platform.js';
import { idHalaman, koleksiHalaman, koleksiCari, dokDaftarIsi, akhiran, hapusHalaman, validasiKitab } from './kitabImpor.js';
import { PERAN_KOREKSI } from './kitabKoreksi.js';
import { bangunPotongan, GRUP_HALAMAN } from '../web/lib/cariKitab.js';
import {
  periksaTanda, rencanaBatas, ratakan, petaSeqBaru, teksPotongan, cocokAwal, tandaiAnomali, kompakkan, bukaKompak, MAKS_TEKS_HALAMAN_CETAK, TEKS_PANJANG,
} from '../web/lib/batasCetak.js';

const tolak = (status, kode, pesan) => { throw new ApiError(status, kode, pesan); };
const izinkan = (pengguna, untuk) => { if (!pengguna || !PERAN_KOREKSI.includes(pengguna.role)) tolak(403, 'FORBIDDEN_ROLE', `${untuk} hanya untuk editor dan admin.`); };
const izinkanAdmin = (pengguna, untuk) => { if (!pengguna || pengguna.role !== 'admin') tolak(403, 'FORBIDDEN_ROLE', `${untuk} hanya untuk admin.`); };
const dasarDari = (m) => ({ revisi: m.revisi || 1, ruang: akhiran(m) });
const dasarSama = (d, m) => !!d && d.revisi === (m.revisi || 1) && (d.ruang || '') === akhiran(m);

/** Pemeriksaan sebelum menghitung batas laju (route). */
export function validasiBatas(b, jumlahHalaman = 100000) {
  if (!b || typeof b !== 'object') tolak(422, 'BATAS_INVALID', 'Permintaan tidak valid.');
  if (b.aksi === 'perpus-batas-simpan') {
    if (!Number.isInteger(b.rev) || b.rev < 0 || b.rev > 1_000_000) tolak(422, 'BATAS_INVALID', 'Revisi draf harus bilangan bulat 0-1.000.000.');
    const { galat } = periksaTanda(b.tanda, jumlahHalaman);
    if (galat) tolak(422, 'BATAS_INVALID', galat);
  }
}

/** Aksi `perpus-batas-baca`: draf tanda milik kitab ini. Keluaran: { tanda, rev, usang }. `usang` = draf dibuat untuk isi kitab sebelum diimpor ulang/disusun ulang, jadi tidak dipakai. */
export async function aksiBatasBaca(b, kid, m, pengguna) {
  izinkan(pengguna, 'Draf batas halaman cetak');
  const { db } = await firestoreAdmin();
  const s = await db.doc(`kitab/${kid}/batasCetak/draf`).get();
  if (!s.exists) return { tanda: [], rev: 0, usang: false };
  const d = s.data();
  const sah = dasarSama(d.dasar, m);
  return { tanda: sah ? d.tanda || [] : [], rev: d.rev || 0, usang: !sah, disimpanOleh: d.namaOleh || '', disimpanAt: d.at || '' };
}

/** Aksi `perpus-batas-simpan`: mengganti seluruh draf. Masukan: { kitabId, tanda, rev }. Bentrok (rev beda) = 409. */
export async function aksiBatasSimpan(b, kid, m, pengguna, { sekarang = () => new Date().toISOString() } = {}) {
  izinkan(pengguna, 'Menyimpan draf batas halaman cetak');
  validasiBatas(b, m.jumlahHalaman);
  const { tanda } = periksaTanda(b.tanda, m.jumlahHalaman);
  const { db } = await firestoreAdmin();
  const ref = db.doc(`kitab/${kid}/batasCetak/draf`);
  const t = sekarang();
  return db.runTransaction(async (tx) => {
    const [ds, ms] = await Promise.all([tx.get(ref), tx.get(db.doc(`kitab/${kid}`))]);
    const mm = ms.exists ? ms.data() : null;
    if (!mm || mm.aktif !== true || mm.status !== 'siap' || akhiran(mm) !== akhiran(m) || (mm.revisi || 1) !== (m.revisi || 1)) tolak(409, 'KITAB_BERUBAH', 'Kitab ini baru saja diimpor ulang atau dinonaktifkan. Muat ulang halaman.');
    const revLama = ds.exists ? (ds.data().rev || 0) : 0;
    if (revLama !== b.rev) tolak(409, 'BATAS_BENTROK', 'Draf ini sudah diubah orang lain sejak Anda membukanya. Muat ulang draf untuk melihat versi terbaru.');
    tx.set(ref, { tanda, jumlah: tanda.length, rev: revLama + 1, dasar: dasarDari(mm), oleh: pengguna.uid, namaOleh: String(pengguna.nama || '').slice(0, 120), at: t });
    return { ok: true, rev: revLama + 1, jumlah: tanda.length };
  });
}

/**
 * Aksi `perpus-batas-mulai` (admin): menyusun rencana dari draf dan menyiapkan ruang baru. Keluaran: { ok, jumlahLama, jumlahBaru, grup, revisi }.
 * Bila ada impor ulang atau penambahan jilid yang belum selesai: 409 (selesaikan dulu). Sisa percobaan penerapan sebelumnya dibersihkan.
 */
export async function aksiBatasMulai(b, kid, m, pengguna, { sekarang = () => new Date().toISOString() } = {}) {
  izinkanAdmin(pengguna, 'Menerapkan batas halaman cetak');
  const { db } = await firestoreAdmin();
  const s = await db.doc(`kitab/${kid}/batasCetak/draf`).get();
  const d = s.exists ? s.data() : null;
  if (!d || !Array.isArray(d.tanda) || !d.tanda.length) tolak(422, 'BATAS_KOSONG', 'Belum ada tanda batas halaman cetak yang tersimpan. Simpan draf dulu.');
  if (!dasarSama(d.dasar, m)) tolak(409, 'BATAS_USANG', 'Draf ini dibuat untuk isi kitab yang sudah berganti (impor ulang atau penyusunan ulang). Tandai ulang.');
  const N = m.jumlahHalaman;
  const { tanda, galat } = periksaTanda(d.tanda, N); if (galat) tolak(422, 'BATAS_INVALID', galat);
  const r = rencanaBatas(tanda, N); if (r.galat) tolak(422, 'BATAS_INVALID', r.galat);
  const hasil = ratakan(r.rencana);

  const berjalanRef = db.doc(`kitab/${kid}/impor/berjalan`);
  const brj = await berjalanRef.get();
  if (brj.exists) {
    const x = brj.data();
    if (!x.batas) tolak(409, 'IMPOR_BERJALAN', 'Ada impor ulang atau penambahan jilid yang belum selesai untuk kitab ini. Selesaikan atau ulangi dulu sebelum menerapkan batas halaman cetak.');
    await hapusHalaman(db, kid, x); // sisa percobaan penerapan sebelumnya (ruangnya bukan ruang kitab yang aktif)
  }

  // Daftar isi: pindahkan tiap judul ke halaman hasil yang memuat awal halaman lamanya; juz dan hal dari halaman hasil itu.
  const isiLama = await db.doc(dokDaftarIsi(kid, m)).get();
  const entriLama = isiLama.exists && Array.isArray(isiLama.data().entri) ? isiLama.data().entri : [];
  const peta = petaSeqBaru(hasil, N);
  const perlu = new Set();
  for (const e of entriLama) { const o = hasil[(peta.get(e.seq) || 1) - 1]; if (o.j === 'salin') perlu.add(o.seq); else if (o.hal === null || !o.juz) perlu.add(o.dari[0]); }
  const asal = new Map();
  await Promise.all([...perlu].map(async (q) => { const p = await db.doc(`${koleksiHalaman(kid, m)}/${idHalaman(q)}`).get(); if (p.exists) asal.set(q, p.data()); }));
  const entri = entriLama.filter((e) => peta.has(e.seq)).map((e) => {
    const idx = peta.get(e.seq); const o = hasil[idx - 1];
    const sumber = asal.get(o.j === 'salin' ? o.seq : o.dari[0]) || {};
    const hal = o.j === 'potong' && o.hal !== null ? o.hal : (sumber.hal ?? e.hal);
    const juz = o.j === 'potong' && o.juz ? o.juz : (sumber.juz ?? e.juz);
    return { judul: e.judul, level: e.level, juz, hal, seq: idx };
  });

  const revisi = (m.revisi || 1) + 1; const ruang = `_r${revisi}`; const t = sekarang();
  const juzMaks = Math.max(m.jumlahJuz || 1, ...tanda.map((x) => x.juz || 1));
  const kitab = validasiKitab({ ...m, jumlahHalaman: r.jumlah, jumlahJuz: juzMaks, ocrHalaman: Math.min(m.ocrHalaman || 0, r.jumlah), halamanVirtual: false, penomoranSesuaiCetak: true });
  await berjalanRef.set({
    revisi, ruang, kitab, jumlahHalaman: r.jumlah, ...(m.sidik ? { sidik: m.sidik } : {}), mulaiAt: t, oleh: pengguna.uid,
    batas: { rencana: kompakkan(r.rencana), dasar: { ...dasarDari(m), koreksi: m.koreksi || 0, nomorDisunting: m.nomorDisunting || 0, isiDisunting: m.isiDisunting || 0, jumlahHalaman: N }, berikutnya: 1, terakhir: null, draftRev: d.rev || 0 },
  });
  await db.doc(dokDaftarIsi(kid, { ruang })).set({ entri, jumlah: entri.length, revisi });
  await db.doc(`kitab/${kid}/batasRiwayat/${t.replace(/\D/g, '')}_${Math.random().toString(36).slice(2, 7)}`).set({ at: t, oleh: pengguna.uid, namaOleh: String(pengguna.nama || '').slice(0, 120), jumlahTanda: tanda.length, jumlahLama: N, jumlahBaru: r.jumlah, draftRev: d.rev || 0 });
  return { ok: true, jumlahLama: N, jumlahBaru: r.jumlah, grup: Math.ceil(r.jumlah / GRUP_HALAMAN), revisi };
}

/**
 * Aksi `perpus-batas-tulis` (admin): menulis satu grup halaman hasil ke ruang baru. Keluaran: { ok, tertulis, berikutnya, total, selesai }.
 * Bila `selesai`, klien memanggil `impor-selesai` untuk mengalihkan kitab ke ruang baru.
 */
export async function aksiBatasTulis(b, kid, m, pengguna) {
  izinkanAdmin(pengguna, 'Menerapkan batas halaman cetak');
  const { db } = await firestoreAdmin();
  const berjalanRef = db.doc(`kitab/${kid}/impor/berjalan`);
  const brj = await berjalanRef.get();
  if (!brj.exists || !brj.data().batas) tolak(404, 'BATAS_TIDAK_ADA', 'Tidak ada penerapan batas halaman cetak yang sedang berjalan. Mulai dulu.');
  const j = brj.data(); const bt = j.batas;
  if (!dasarSama(bt.dasar, m) || (m.koreksi || 0) !== bt.dasar.koreksi || (m.nomorDisunting || 0) !== bt.dasar.nomorDisunting || m.jumlahHalaman !== bt.dasar.jumlahHalaman) {
    tolak(409, 'KITAB_BERUBAH', 'Kitab berubah sejak penerapan dimulai (koreksi teks, nomor halaman, atau impor ulang). Mulai penerapan dari awal.');
  }
  const total = j.jumlahHalaman; const awal = bt.berikutnya;
  if (awal > total) return { ok: true, tertulis: 0, berikutnya: awal, total, selesai: true };
  const akhir = Math.min(total, Math.ceil(awal / GRUP_HALAMAN) * GRUP_HALAMAN);
  const hasil = ratakan(bukaKompak(bt.rencana)).slice(awal - 1, akhir);

  const perlu = new Set();
  for (const o of hasil) { if (o.j === 'salin') perlu.add(o.seq); else for (let q = o.dari[0]; q <= o.sampai[0]; q++) perlu.add(q); }
  const sumber = new Map();
  const daftar = [...perlu];
  for (let i = 0; i < daftar.length; i += 50) {
    await Promise.all(daftar.slice(i, i + 50).map(async (q) => { const p = await db.doc(`${koleksiHalaman(kid, m)}/${idHalaman(q)}`).get(); if (p.exists) sumber.set(q, p.data()); }));
  }
  const ada = (q) => { const p = sumber.get(q); if (!p) tolak(422, 'BATAS_INVALID', `Halaman digital urutan ${q} tidak ditemukan.`); return p; };

  const docs = hasil.map((o) => {
    if (o.j === 'salin') { const { nomorAnomali, ...p } = ada(o.seq); return { ...p, seq: o.idx }; }
    const a = ada(o.dari[0]);
    if (o.hal !== null && !cocokAwal(a.teks, o.dari[1], o.awal)) {
      tolak(422, 'BATAS_BERGESER', `Tanda halaman cetak ${o.hal} (urutan ${o.dari[0]}) tidak cocok lagi dengan teksnya: teks halaman itu kemungkinan dikoreksi sesudah penandaan. Hapus tanda itu lalu tandai ulang.`);
    }
    const { teks, seqs } = teksPotongan(o, (q) => ada(q).teks);
    const hal = o.hal !== null ? o.hal : a.hal;
    if (!teks) tolak(422, 'BATAS_INVALID', `Halaman cetak ${hal} tidak berisi teks. Periksa tanda di urutan ${o.dari[0]}.`);
    if (teks.length > MAKS_TEKS_HALAMAN_CETAK) tolak(422, 'BATAS_INVALID', `Halaman cetak ${hal} berisi ${teks.length} karakter (maksimal ${MAKS_TEKS_HALAMAN_CETAK}). Kemungkinan ada tanda yang terlewat di antara urutan ${o.dari[0]} dan ${o.sampai[0]}.`);
    return { seq: o.idx, juz: o.juz || a.juz, hal, teks, batasMatn: null, ...(a.bab ? { bab: a.bab } : {}), ...(seqs.some((q) => (sumber.get(q) || {}).ocr === true) ? { ocr: true } : {}) };
  });
  const urut = bt.terakhir ? [{ hal: bt.terakhir.hal, juz: bt.terakhir.juz }, ...docs] : docs;
  tandaiAnomali(urut); // salinan lama dibuang tanda anomalinya di atas; di sini dihitung ulang terhadap halaman hasil sebelumnya

  const bk = db.batch();
  docs.forEach((d) => bk.set(db.doc(`${koleksiHalaman(kid, j)}/${idHalaman(d.seq)}`), d));
  bangunPotongan(docs).forEach((p) => bk.set(db.doc(`${koleksiCari(kid, j)}/${p.id}`), { ...p.data, revisi: j.revisi }));
  await bk.commit();
  const last = docs[docs.length - 1];
  await berjalanRef.set({ ...j, batas: { ...bt, berikutnya: akhir + 1, terakhir: { hal: last.hal, juz: last.juz } } });
  const panjang = docs.filter((d) => d.teks.length > TEKS_PANJANG).length;
  return { ok: true, tertulis: docs.length, berikutnya: akhir + 1, total, selesai: akhir >= total, ...(panjang ? { melebihiBatasSoal: panjang } : {}) };
}
