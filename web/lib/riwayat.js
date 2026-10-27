// Riwayat versi soal: setiap kali soal yang sudah ada disimpan ulang, isi SEBELUMNYA disalin ke subkoleksi soal/{id}/riwayat.
// Fungsi murni (tanpa Firestore) agar mudah diuji. Tulis-saja: aturan Firestore melarang ubah dan hapus.

export const BIDANG_RIWAYAT = ['tingkat', 'mapel', 'level', 'kelas', 'periode', 'nama', 'juz', 'hal', 'bab', 'teks', 'stimulus', 'pertanyaan', 'indikator',
  'sumberUrl', 'opsi', 'kunci', 'pembahasan', 'bentuk', 'jawaban', 'rubrik', 'status', 'catatan', 'ai', 'paket', 'dawr', 'cakupan', 'urut'];

export const LABEL_BIDANG = {
  tingkat: 'Tingkat', mapel: 'Mapel', level: 'Level', kelas: 'Kelas', periode: 'Periode', nama: 'Kitab', juz: 'Juz', hal: 'Halaman', bab: 'Bab',
  teks: 'Teks kitab', stimulus: 'Stimulus', pertanyaan: 'Pertanyaan', indikator: 'Indikator', sumberUrl: 'Tautan sumber', opsi: 'Pilihan jawaban',
  kunci: 'Kunci', pembahasan: 'Pembahasan', bentuk: 'Bentuk soal', jawaban: 'Jawaban', rubrik: 'Rubrik', status: 'Status', catatan: 'Catatan editor',
  ai: 'Jejak AI', paket: 'Paket', dawr: 'Dauri', cakupan: 'Cakupan', urut: 'Urutan',
};

/** Salinan isi soal untuk disimpan sebagai versi lama. Nilai undefined dibuang (Firestore menolaknya); waktu (Timestamp) tidak ikut. */
export function potretSoal(q) {
  const out = {};
  for (const k of BIDANG_RIWAYAT) if (q && q[k] !== undefined && q[k] !== null) out[k] = JSON.parse(JSON.stringify(q[k]));
  return out;
}

const sama = (a, b) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '');

/** Daftar bidang yang berbeda antara dua potret (urutan mengikuti BIDANG_RIWAYAT). */
export function bidangBerubah(a, b) {
  return BIDANG_RIWAYAT.filter((k) => !sama((a || {})[k], (b || {})[k]));
}

/** True bila penyimpanan ini benar-benar mengubah isi (bukan sekadar menyimpan ulang yang sama). */
export const adaPerubahan = (sebelum, sesudah) => bidangBerubah(potretSoal(sebelum), potretSoal(sesudah)).length > 0;

/** Dokumen riwayat. `at` diisi pemanggil dengan serverTimestamp agar cocok dengan aturan Firestore (at == request.time). */
export function buatRiwayat(sebelum, { uid, nama }, at) {
  return { snapshot: potretSoal(sebelum), oleh: String(uid || ''), namaOleh: String(nama || '').slice(0, 120), at };
}

/** Ringkasan satu baris untuk daftar: "Pertanyaan, Kunci". */
export function ringkasBeda(a, b) {
  const l = bidangBerubah(a, b).map((k) => LABEL_BIDANG[k] || k);
  return l.length ? l.join(', ') : 'tanpa perubahan isi';
}
