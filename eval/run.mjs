// Evaluasi mutu AI terhadap kasus emas. BERJALAN DENGAN MODEL SUNGGUHAN (butuh kunci API, memakai kuota).
//   node eval/run.mjs [berkas.json] [--min=0.8] [--ulang=1]
// Tanpa terminal: GitHub Actions > "Evaluasi AI" > Run workflow. Ganti model/prompt -> jalankan ulang -> bandingkan.
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { generateSoal, getModel, provider } from '../src/soalService.js';
import { telaahSoal } from '../src/assistService.js';
import { cekButa, keBentukApp } from '../src/cekButa.js';
import { nilaiGenerate, nilaiTelaah } from './lib.mjs';

const arg = process.argv.slice(2);
const flag = (nama, def) => Number((arg.find((a) => a.startsWith(`--${nama}=`)) || `--${nama}=${def}`).split('=')[1]);
const berkas = arg.find((a) => !a.startsWith('--')) || new URL('./golden.json', import.meta.url).pathname;
const min = flag('min', 0.8);
const ulang = flag('ulang', 1); // jalankan tiap kasus N kali (variasi keluaran model)

let data;
try { data = JSON.parse(await readFile(berkas, 'utf8')); } catch (e) {
  console.error(`Tidak bisa membaca ${berkas}. Salin eval/golden.example.json menjadi eval/golden.json lalu isi kasus Anda.\n${e.message}`);
  process.exit(2);
}

const hasil = [];
for (const kasus of data.kasus) {
  for (let i = 1; i <= ulang; i++) {
    const t0 = Date.now();
    let nilai;
    try {
      if (kasus.jenis === 'telaah') {
        nilai = nilaiTelaah(kasus, await telaahSoal(kasus));
      } else {
        const soal = await generateSoal(kasus);
        const buta = await cekButa(keBentukApp(soal), kasus.teks, { tingkat: kasus.tingkat });
        nilai = nilaiGenerate(kasus, { soal, buta });
      }
    } catch (e) {
      nilai = { lulus: false, cek: {}, catatan: [`galat: ${e.code || e.name}: ${String(e.message).slice(0, 120)}`] };
    }
    hasil.push({ id: kasus.id, jenis: kasus.jenis || 'generate', percobaan: i, ms: Date.now() - t0, ...nilai });
    console.log(`${nilai.lulus ? 'LULUS' : 'GAGAL'} ${kasus.id}${ulang > 1 ? ` #${i}` : ''} ${nilai.catatan.join('; ')}`);
  }
}

const lulus = hasil.filter((h) => h.lulus).length;
const laju = lulus / Math.max(1, hasil.length);
const ringkas = { penyedia: provider(), model: getModel(), penguji: process.env.AI_VERIFY_MODEL || '(sama)', total: hasil.length, lulus, laju: Math.round(laju * 100) / 100, minimum: min, waktu: new Date().toISOString() };
console.log(`\n${lulus}/${hasil.length} lulus (${Math.round(laju * 100)}%) dengan ${ringkas.penyedia}/${ringkas.model}. Minimum ${Math.round(min * 100)}%.`);
await writeFile(new URL('./hasil.json', import.meta.url), JSON.stringify({ ringkas, hasil }, null, 2));

if (process.env.GITHUB_STEP_SUMMARY) {
  const baris = hasil.map((h) => `| ${h.id} | ${h.lulus ? 'lulus' : '**gagal**'} | ${Object.entries(h.cek).filter(([, v]) => !v).map(([k]) => k).join(', ') || '-'} | ${h.catatan.join('; ') || '-'} |`);
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Evaluasi AI: ${lulus}/${hasil.length} lulus (${ringkas.penyedia}/${ringkas.model})\n\n| Kasus | Hasil | Cek gagal | Catatan |\n|---|---|---|---|\n${baris.join('\n')}\n`);
}
process.exit(laju >= min ? 0 : 1);
