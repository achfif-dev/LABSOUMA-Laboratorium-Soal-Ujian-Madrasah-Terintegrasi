// Sumber klien digabung untuk tes yang memeriksa teks kode: App.jsx dipecah ke beberapa berkas (lazy-load), jadi tes tidak boleh hanya membaca App.jsx.
import { readFileSync } from 'node:fs';
const BERKAS = ['App.jsx', 'ui.jsx', 'ExportTab.jsx', 'AdminKonfigurasi.jsx', 'lib/exportBuilders.js', 'lib/dasar.js'];
export const sumberWeb = BERKAS.map((f) => readFileSync(new URL(`../web/${f}`, import.meta.url), 'utf8')).join('\n');
