// Evaluasi mutu AI terhadap kasus emas. BERJALAN DENGAN MODEL SUNGGUHAN (butuh kunci API, memakai kuota).
//   node eval/run.mjs [berkas.json] [--min=0.8] [--ulang=1] [--jeda=0] [--hanya=telaah,tag,id] [--hanya-terverifikasi] [--bandingkan=hasil-lama.json]
// Tanpa terminal: GitHub Actions > "Evaluasi AI" > Run workflow. Ganti model/prompt -> jalankan ulang -> bandingkan.
// Kode keluar: 0 = laju lulus >= minimum; 1 = di bawah minimum; 2 = tidak bisa diukur (berkas hilang, kunci/model salah, semua galat).
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { getModel, provider } from '../src/soalService.js';
import { jalankanKasus } from './jalankan.mjs';
import { ringkasKelompok, bandingkan } from './lib.mjs';

const arg = process.argv.slice(2);
const flagStr = (nama, def = '') => { const a = arg.find((x) => x.startsWith(`--${nama}=`)); return a ? a.slice(nama.length + 3) : def; };
const flagNum = (nama, def) => { const n = Number(flagStr(nama, String(def))); return Number.isFinite(n) ? n : def; };
const berkas = arg.find((a) => !a.startsWith('--')) || new URL('./golden.json', import.meta.url).pathname;
const min = flagNum('min', 0.8);
const ulang = Math.max(1, Math.floor(flagNum('ulang', 1))); // jalankan tiap kasus N kali (keluaran model tidak deterministik; 3 lebih jujur)
const jedaMs = Math.max(0, flagNum('jeda', 0)); // jeda antarkasus; naikkan (mis. 15000) bila kuota gratis penyedia ketat
const hanya = flagStr('hanya').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const hanyaTerverifikasi = arg.includes('--hanya-terverifikasi');
const bandingPath = flagStr('bandingkan');

let mentah; let data;
try { mentah = await readFile(berkas, 'utf8'); data = JSON.parse(mentah); } catch (e) {
  console.error(`Tidak bisa membaca ${berkas}. Pastikan eval/golden.json ada dan berformat JSON (contoh format: eval/golden.example.json).\n${e.message}`);
  process.exit(2);
}
if (!Array.isArray(data.kasus) || !data.kasus.length) { console.error('golden.json tidak memuat daftar "kasus".'); process.exit(2); }

const cocok = (k) => {
  const bag = [k.id, k.jenis || 'generate', ...(k.tag || [])].map((x) => String(x).toLowerCase());
  return hanya.some((h) => bag.some((b) => b === h || (h.length >= 3 && b.includes(h))));
};
let kasusDipakai = data.kasus.filter((k) => (!hanya.length || cocok(k)) && (!hanyaTerverifikasi || String(k.diverifikasi_oleh || '').trim()));
if (!kasusDipakai.length) { console.error('Tidak ada kasus yang cocok dengan penyaring (--hanya / --hanya-terverifikasi).'); process.exit(2); }
const belumTerverifikasi = kasusDipakai.filter((k) => !String(k.diverifikasi_oleh || '').trim()).length;
if (belumTerverifikasi) console.log(`Peringatan: ${belumTerverifikasi} dari ${kasusDipakai.length} kasus belum diverifikasi ustadz (kolom diverifikasi_oleh kosong). Angka lulus belum bisa dipegang sebagai ukuran mutu.\n`);

const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
const hasil = [];
let beruntun = 0;
let berhenti = '';
loop: for (const kasus of kasusDipakai) {
  for (let i = 1; i <= ulang; i++) {
    const t0 = Date.now();
    const n = await jalankanKasus(kasus, { log: (s) => console.log(s) });
    hasil.push({ id: kasus.id, jenis: kasus.jenis || 'generate', level: kasus.level, bentuk: kasus.bentuk || 'pilgan', tag: kasus.tag || [], percobaan: i, ms: Date.now() - t0, ...n });
    const label = n.status === 'lulus' ? 'LULUS' : n.status === 'galat' ? 'GALAT' : 'GAGAL';
    console.log(`${label} ${kasus.id}${ulang > 1 ? ` #${i}` : ''} ${n.catatan.join('; ')}`);
    if (n.fatal) { berhenti = `Dihentikan: ${n.catatan[0].replace(/[.\s]+$/, '')}. Periksa kunci API, penyedia, dan nama model.`; break loop; }
    beruntun = n.status === 'galat' ? beruntun + 1 : 0;
    if (beruntun >= 3) { berhenti = 'Dihentikan: 3 galat penyedia berturut-turut (kuota habis atau layanan bermasalah). Naikkan --jeda atau coba lagi nanti.'; break loop; }
    if (jedaMs) await tidur(jedaMs);
  }
}

const dinilai = hasil.filter((h) => h.status !== 'galat');
const lulus = dinilai.filter((h) => h.lulus).length;
const galat = hasil.length - dinilai.length;
const laju = dinilai.length ? lulus / dinilai.length : 0;
const sidik = (s) => createHash('sha1').update(s).digest('hex').slice(0, 10);
// Sidik berkas yang memuat prompt dan logika AI: bila berubah antara dua hasil, perubahan angka bisa dicari penyebabnya di sini.
const kode = (await Promise.all(['soalService.js', 'assistService.js', 'cekButa.js'].map((f) => readFile(new URL(`../src/${f}`, import.meta.url), 'utf8')))).join('\n');
const ringkas = {
  penyedia: provider(), model: getModel(), penguji: process.env.AI_VERIFY_MODEL || '(sama)',
  total: hasil.length, dinilai: dinilai.length, lulus, galat, laju: Math.round(laju * 100) / 100, minimum: min, ulang,
  belumTerverifikasi, sidikGolden: sidik(mentah), sidikPrompt: sidik(kode), waktu: new Date().toISOString(),
  ...(berhenti ? { berhenti } : {}),
};
console.log(`\n${lulus}/${dinilai.length} lulus (${Math.round(laju * 100)}%) dengan ${ringkas.penyedia}/${ringkas.model}. Minimum ${Math.round(min * 100)}%.${galat ? ` ${galat} galat penyedia tidak dihitung.` : ''}`);
const kel = ringkasKelompok(hasil);
console.log(Object.entries(kel).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `  ${k.padEnd(28)} ${v.lulus}/${v.total}`).join('\n'));
if (berhenti) console.error(`\n${berhenti}`);

let banding = null;
if (bandingPath) {
  try {
    banding = bandingkan(JSON.parse(await readFile(bandingPath, 'utf8')), { ringkas, hasil });
    console.log(`\nDibanding ${bandingPath}${banding.goldenSama ? '' : ' (PERHATIAN: golden.json berbeda, perbandingan kurang adil)'}:`);
    console.log(banding.regresi.length ? banding.regresi.map((r) => `  MEMBURUK ${r.id}: ${Math.round(r.dari * 100)}% -> ${Math.round(r.ke * 100)}%`).join('\n') : '  tidak ada kasus yang memburuk');
    if (banding.membaik.length) console.log(banding.membaik.map((r) => `  membaik  ${r.id}: ${Math.round(r.dari * 100)}% -> ${Math.round(r.ke * 100)}%`).join('\n'));
  } catch (e) { console.error(`\nTidak bisa membaca berkas pembanding ${bandingPath}: ${e.message}`); }
}
await writeFile(new URL('./hasil.json', import.meta.url), JSON.stringify({ ringkas, kelompok: kel, ...(banding ? { banding } : {}), hasil }, null, 2));

if (process.env.GITHUB_STEP_SUMMARY) {
  const baris = hasil.map((h) => `| ${h.id} | ${h.status === 'lulus' ? 'lulus' : h.status === 'galat' ? 'galat' : '**gagal**'} | ${Object.entries(h.cek).filter(([, v]) => !v).map(([k]) => k).join(', ') || '-'} | ${h.catatan.join('; ').replace(/\|/g, '/') || '-'} |`);
  const kelBaris = Object.entries(kel).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `| ${k} | ${v.lulus}/${v.total} |`);
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Evaluasi AI: ${lulus}/${dinilai.length} lulus (${ringkas.penyedia}/${ringkas.model})\n\nGolden \`${ringkas.sidikGolden}\`, prompt \`${ringkas.sidikPrompt}\`, ${belumTerverifikasi} kasus belum diverifikasi ustadz, ${galat} galat penyedia.\n\n| Kelompok | Lulus |\n|---|---|\n${kelBaris.join('\n')}\n\n| Kasus | Hasil | Cek gagal | Catatan |\n|---|---|---|---|\n${baris.join('\n')}\n`);
}
process.exit(berhenti || !dinilai.length ? 2 : laju >= min ? 0 : 1);
