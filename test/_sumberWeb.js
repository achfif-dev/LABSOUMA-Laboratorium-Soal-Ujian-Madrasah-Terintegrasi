// Sumber klien digabung untuk tes yang memeriksa teks kode: App.jsx dipecah ke beberapa berkas (lazy-load), jadi tes tidak boleh hanya membaca App.jsx.
import { readFileSync } from 'node:fs';
// Berkas hasil pemecahan App.jsx (bersama, Compose, Paket Dauri, Ustadz, dll.) ikut dibaca; tambahkan di sini bila memecah lagi.
export const BERKAS = ['App.jsx', 'ui.jsx', 'ExportTab.jsx', 'AdminKonfigurasi.jsx', 'lib/exportBuilders.js', 'lib/dasar.js',
  'panelMalas.jsx', 'bersama.jsx', 'TinjauanView.jsx', 'Kepala.jsx', 'Compose.jsx', 'ReviewTab.jsx', 'BankTab.jsx', 'FokusUjian.jsx',
  'AdminPengguna.jsx', 'Dasbor.jsx', 'bacaBerkas.js', 'PegonTab.jsx', 'PaketDauri.jsx', 'AppUstadz.jsx', 'driveUi.js', 'BackupTab.jsx'];
export const sumberWeb = BERKAS.map((f) => readFileSync(new URL(`../web/${f}`, import.meta.url), 'utf8')).join('\n');
