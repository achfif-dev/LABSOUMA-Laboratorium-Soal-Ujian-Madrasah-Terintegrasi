

/* ---------- Backup ke Google Drive (editor dan admin) ---------- */
// Soal dibaca dari Firestore di browser, diunggah ke Drive milik akun Google yang dipilih pengguna (izin drive.file), lalu diunduh kembali dan
// dibandingkan; cadangan baru dianggap berhasil bila isinya identik. Soal hanya boleh dihapus dari Firestore (arsip, khusus admin) setelah itu.
// Logika murninya ada di public/drive.js (tes: test/backup.test.js). Pemulihan lewat /api/backup (Admin SDK).
const GIS_SRC = 'https://accounts.google.com/gsi/client';

export function muatGis() {
  if (window.google && window.google.accounts && window.google.accounts.oauth2) return Promise.resolve();
  if (window.__gisJanji) return window.__gisJanji;
  window.__gisJanji = new Promise((selesai, gagal) => {
    const s = document.createElement('script'); s.src = GIS_SRC; s.async = true;
    s.onload = () => selesai();
    s.onerror = () => { window.__gisJanji = null; gagal(new Error('Skrip Google tidak bisa dimuat. Periksa koneksi internet atau pemblokir iklan.')); };
    document.head.appendChild(s);
  });
  return window.__gisJanji;
}

export const ukuranBerkas = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

export const waktuLokal = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }); };

export const tautanDriveAman = (u) => (/^https:\/\/(drive|docs)\.google\.com\//.test(String(u || '')) ? u : '');
