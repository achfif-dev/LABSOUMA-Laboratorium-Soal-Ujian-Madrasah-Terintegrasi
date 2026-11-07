// Pembersihan riwayat versi soal yang induknya (soal) sudah dihapus.
// Firestore tidak menghapus subkoleksi otomatis: menghapus soal/{id} meninggalkan soal/{id}/riwayat/* (yatim).
// Klien membersihkan riwayat soal yang baru ia hapus (best effort); fungsi ini menyapu sisanya (gagal jaringan, data lama).
const POLA = /^soal\/([A-Za-z0-9_-]{1,100})\/riwayat\/[^/]+$/;
export const BATAS_PINDAI = 20000;

/**
 * Pindai semua dokumen riwayat, cari yang soalnya sudah tidak ada. `hapus: true` menghapusnya; tanpa itu hanya menghitung.
 * Biaya: satu pembacaan per dokumen riwayat per pindai (tidak ada pembacaan isi soal selain pengecekan keberadaan).
 */
export async function bersihkanRiwayatYatim(db, { hapus = false } = {}) {
  const snap = await db.collectionGroup('riwayat').select().limit(BATAS_PINDAI).get();
  const perSoal = new Map();
  for (const d of snap.docs) {
    const m = POLA.exec(d.ref.path);
    if (!m) continue; // riwayat di luar soal/{id}/riwayat: bukan urusan fungsi ini
    if (!perSoal.has(m[1])) perSoal.set(m[1], []);
    perSoal.get(m[1]).push(d.ref);
  }
  const ids = [...perSoal.keys()];
  const yatim = [];
  for (let i = 0; i < ids.length; i += 300) {
    const potongan = ids.slice(i, i + 300);
    const hasil = await db.getAll(...potongan.map((id) => db.doc(`soal/${id}`)));
    hasil.forEach((s, j) => { if (!s.exists) yatim.push(potongan[j]); });
  }
  const refsYatim = yatim.flatMap((id) => perSoal.get(id));
  let dihapus = 0;
  if (hapus) {
    for (let i = 0; i < refsYatim.length; i += 400) {
      const b = db.batch();
      refsYatim.slice(i, i + 400).forEach((r) => b.delete(r));
      await b.commit();
      dihapus += Math.min(400, refsYatim.length - i);
    }
  }
  return { riwayatTotal: snap.docs.length, soalYatim: yatim.length, riwayatYatim: refsYatim.length, dihapus, terpotong: snap.docs.length >= BATAS_PINDAI };
}

export const SIMPAN_RIWAYAT_MIN = 3;
export const SIMPAN_RIWAYAT_MAKS = 50;
export const SIMPAN_RIWAYAT_BAWAAN = 10;

/**
 * Pangkas riwayat versi: tiap soal hanya menyimpan `simpan` versi TERBARU (menurut `at`), sisanya dihapus.
 * Riwayat diindeks Firestore dan ikut membengkak tiap soal disunting, jadi ini pengendali ruang simpan paket Spark.
 * Klien tidak boleh menghapus riwayat (aturan hanya-tambah); pemangkasan lewat Admin SDK. Biaya: satu pembacaan per dokumen riwayat per pindai.
 * `hapus: false` hanya menghitung.
 */
export async function pangkasRiwayat(db, { simpan = SIMPAN_RIWAYAT_BAWAAN, hapus = false } = {}) {
  const n = Number.isInteger(simpan) ? Math.min(SIMPAN_RIWAYAT_MAKS, Math.max(SIMPAN_RIWAYAT_MIN, simpan)) : SIMPAN_RIWAYAT_BAWAAN;
  const snap = await db.collectionGroup('riwayat').select('at').limit(BATAS_PINDAI).get();
  const perSoal = new Map();
  for (const d of snap.docs) {
    const m = POLA.exec(d.ref.path);
    if (!m) continue;
    const t = d.data() && d.data().at; const ms = t && typeof t.toMillis === 'function' ? t.toMillis() : (t instanceof Date ? t.getTime() : Number(t) || 0);
    if (!perSoal.has(m[1])) perSoal.set(m[1], []);
    perSoal.get(m[1]).push({ ref: d.ref, ms });
  }
  const kelebihan = [];
  let soalDipangkas = 0;
  for (const daftar of perSoal.values()) {
    if (daftar.length <= n) continue;
    daftar.sort((a, b) => b.ms - a.ms); // terbaru dulu; yang tanpa waktu (ms 0) dianggap tertua
    kelebihan.push(...daftar.slice(n).map((x) => x.ref)); soalDipangkas++;
  }
  let dihapus = 0;
  if (hapus) {
    for (let i = 0; i < kelebihan.length; i += 400) {
      const b = db.batch();
      kelebihan.slice(i, i + 400).forEach((r) => b.delete(r));
      await b.commit();
      dihapus += Math.min(400, kelebihan.length - i);
    }
  }
  return { simpan: n, riwayatTotal: snap.docs.length, soalDipangkas, riwayatKelebihan: kelebihan.length, dihapus, terpotong: snap.docs.length >= BATAS_PINDAI };
}
