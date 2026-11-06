// Pustaka `docx` (±400 KB) dimuat hanya saat pengguna mengunduh berkas Word, bukan saat aplikasi dibuka.
// Satu janji (promise) dipakai bersama agar unduhan berikutnya tidak memuat ulang.
let janji = null;
export const muatDocx = () => {
  if (!janji) janji = import('docx').catch((e) => { janji = null; throw new Error('Pustaka DOCX gagal dimuat. Periksa sambungan internet lalu coba lagi.'); });
  return janji;
};
