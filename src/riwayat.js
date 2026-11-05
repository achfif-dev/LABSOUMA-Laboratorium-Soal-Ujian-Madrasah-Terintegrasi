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
