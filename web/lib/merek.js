// SATU-SATUNYA tempat nama aplikasi, logo, dan footnote kredit. Ubah di sini, lalu push dan deploy ulang (Vercel).
// Dipakai oleh: web/Merek.jsx (footnote di semua halaman + layar memuat), web/App.jsx (login, kepala), dan index.html
// (layar pembuka sebelum JavaScript termuat; diisi saat build oleh plugin di vite.config.js lewat terapkanMerek).
export const MEREK = {
  nama: 'LABSOUMA',
  namaPanjang: 'Laboratorium Soal Ujian Madrasah Terintegrasi',
  logo: '/logo.png',
  kreditLatin: 'Powered By Achmad Afifuddin / achfif-dev',
  kreditArab: 'أحمد عفيف الدين',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Ganti penanda %MEREK_...% di index.html dengan nilai MEREK (dipanggil plugin Vite saat build dan dev). */
export function terapkanMerek(html, m = MEREK) {
  return String(html)
    .replace(/%MEREK_NAMA_PANJANG%/g, esc(m.namaPanjang))
    .replace(/%MEREK_NAMA%/g, esc(m.nama))
    .replace(/%MEREK_LOGO%/g, esc(m.logo))
    .replace(/%MEREK_KREDIT_LATIN%/g, esc(m.kreditLatin))
    .replace(/%MEREK_KREDIT_ARAB%/g, esc(m.kreditArab));
}
