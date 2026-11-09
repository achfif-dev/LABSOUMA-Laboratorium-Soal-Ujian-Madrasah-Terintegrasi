// Lebar dua kolom kartu Review (Teks Kitab Asli | Naskah Soal) mengikuti panjang isi masing-masing, bukan 50/50 tetap.
// Murni: tanpa DOM, mudah diuji. Hanya dipakai di layar lebar (md ke atas); di layar sempit kedua kolom tersusun menurun.

/** Panjang isi sisi "Naskah Soal": semua bagian teks yang ditampilkan QuestionView. */
export function panjangSoal(q) {
  const x = q || {};
  const opsi = x.opsi && typeof x.opsi === 'object' ? Object.values(x.opsi) : [];
  return [x.stimulus, x.pertanyaan, x.jawaban, x.rubrik, x.pembahasan, ...opsi]
    .reduce((n, s) => n + String(s ?? '').trim().length, 0);
}

/**
 * Bagi lebar dua kolom menurut panjang teks.
 *  - lantai: panjang minimum yang dianggap tiap sisi, supaya sisi yang kosong atau sangat pendek tidak membuat kolom lain melebar ekstrem.
 *  - min/max: batas bagian kolom kiri terhadap total (bawaan 30% sampai 70%), supaya kolom tidak pernah terlalu sempit untuk dibaca.
 * Mengembalikan { kiri, kanan } (bagian 0..1, jumlah 1) dan `css` untuk grid-template-columns.
 * minmax(0, ...) mencegah isi panjang tanpa spasi (mis. tautan) mendorong kolom keluar dari kartu.
 */
export function lebarKolom(panjangKiri, panjangKanan, { min = 0.3, max = 0.7, lantai = 150 } = {}) {
  const k = Math.max(Number(panjangKiri) || 0, lantai);
  const n = Math.max(Number(panjangKanan) || 0, lantai);
  const kiri = Math.round(Math.min(max, Math.max(min, k / (k + n))) * 1000) / 1000;
  const kanan = Math.round((1 - kiri) * 1000) / 1000;
  return { kiri, kanan, css: `minmax(0, ${kiri}fr) minmax(0, ${kanan}fr)` };
}
