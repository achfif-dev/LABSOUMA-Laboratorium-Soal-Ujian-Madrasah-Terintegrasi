// Pakai: node scripts/periksa-syamilah.mjs berkas.txt [seq-contoh]
// Mencetak laporan parse (tanpa menulis ke database). Berguna sebelum impor sungguhan.
import { readFileSync } from 'node:fs';
import { parseSyamilah } from '../src/syamilah.js';
const [, , berkas, contoh] = process.argv;
if (!berkas) { console.error('Pakai: node scripts/periksa-syamilah.mjs berkas.txt [seq]'); process.exit(1); }
const h = parseSyamilah(readFileSync(berkas, 'utf8'));
console.log(JSON.stringify({ kitab: h.kitab, laporan: { ...h.laporan, daftarAnomali: h.laporan.daftarAnomali.slice(0, 10) } }, null, 2));
if (contoh) { const p = h.halaman.find((x) => x.seq === +contoh); console.log('\n--- halaman seq', contoh, '\n', p); }
