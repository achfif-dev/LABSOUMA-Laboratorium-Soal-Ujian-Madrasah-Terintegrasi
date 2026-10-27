// Pembuat ekspor di web/App.jsx (GIFT, Moodle XML, CSV, DOCX) untuk semua bentuk soal.
// Kodenya diambil langsung dari web/App.jsx (bagian "Export builders") dan dijalankan di Node dengan pustaka docx asli.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as Bt from '../src/bentuk.js';
import * as Pegon from '../src/pegon.js';

const require = createRequire(import.meta.url);
const docx = require('docx');
const JSZip = require('jszip');
const html = readFileSync(new URL('../web/App.jsx', import.meta.url), 'utf8');
const a = html.indexOf('const optsOf = ');
const b = html.indexOf('const FORMATS = [');
assert.ok(a > 0 && b > a, 'bagian Export builders tidak ditemukan di index.html');
const LEVEL = [{ v: 'L1', label: 'L1 Ingatan' }, { v: 'L2', label: 'L2 Aplikasi' }, { v: 'L3', label: 'L3 HOTS' }];
const mk = new Function('Bt', 'KEYS', 'LEVEL', 'window', `${html.slice(a, b)}\nreturn { buildGift, buildMoodleXml, buildCsvForms, buildCsvRdm, buildDocx };`);
const B = mk(Bt, ['A', 'B', 'C', 'D', 'E'], LEVEL, { docx, Pegon });

const kosong = { A: '', B: '', C: '', D: '', E: '' };
const dasar = { tingkat: 'MA', mapel: 'Fiqih', level: 'L2', nama: 'Fathul Qarib', juz: '', hal: '10', teks: 'مَاءُ الْبَحْرِ', pembahasan: 'Dasarnya tujuh air suci.', indikator: 'Peserta didik dapat x' };
const SOAL = [
  { ...dasar, stimulus: 'Santri di pantai.', pertanyaan: 'Air manakah yang sah?', opsi: { A: 'Air kelapa', B: 'Air laut', C: 'Air teh', D: 'Air mawar', E: 'Air jeruk' }, kunci: 'B' },
  { ...dasar, bentuk: 'lanjutan', pertanyaan: 'Musafir boleh mengqashar bila .....', opsi: { A: 'bermukim', B: 'menempuh dua marhalah', C: 'di rumah', D: 'dekat', E: 'di kampung' }, kunci: 'B' },
  { ...dasar, bentuk: 'benarsalah', pertanyaan: 'Air laut sah untuk bersuci.', opsi: { A: 'Benar', B: 'Salah', C: '', D: '', E: '' }, kunci: 'A' },
  { ...dasar, bentuk: 'isian', pertanyaan: 'Air suci ada ..... macam.', opsi: kosong, kunci: '', jawaban: 'tujuh / 7' },
  { ...dasar, bentuk: 'uraian', pertanyaan: 'Jelaskan syarat qashar!', opsi: kosong, kunci: '', jawaban: 'Jarak dua marhalah dan bukan maksiat.', rubrik: '1) jarak (skor 2); 2) bukan maksiat (skor 2); Skor maksimal 4' },
];

test('GIFT: tiap bentuk memakai sintaks Moodle yang sesuai', () => {
  const g = B.buildGift(SOAL);
  assert.match(g, /::Soal 1 Fiqih::Santri di pantai\. Air manakah yang sah\?\{\n~Air kelapa\n=Air laut/); // pilihan ganda: persis seperti sebelumnya
  assert.match(g, /::Soal 3 Fiqih::Air laut sah untuk bersuci\.\{TRUE####/);
  assert.match(g, /::Soal 4 Fiqih::Air suci ada \.\.\.\.\. macam\.\{=tujuh =7####/);
  assert.match(g, /::Soal 5 Fiqih::Jelaskan syarat qashar!\{####.*Pedoman penskoran/);
});

test('Moodle XML: tipe pertanyaan mengikuti bentuk', () => {
  const x = B.buildMoodleXml(SOAL);
  assert.equal((x.match(/<question type="multichoice">/g) || []).length, 2);
  assert.match(x, /<question type="truefalse">[\s\S]*<answer fraction="100"[^>]*><text>true<\/text>/);
  assert.match(x, /<question type="shortanswer">[\s\S]*<text>tujuh<\/text>[\s\S]*<text>7<\/text>/);
  assert.match(x, /<question type="essay">[\s\S]*<graderinfo/);
  assert.equal((x.match(/<question /g) || []).length, (x.match(/<\/question>/g) || []).length);
});

test('CSV: kolom Kunci berisi huruf, Benar/Salah, atau jawaban; CSV lengkap memuat Bentuk, Jawaban, Rubrik', () => {
  const f = B.buildCsvForms(SOAL).split('\n');
  assert.match(f[1], /"B",/); assert.match(f[3], /"Benar"/); assert.match(f[4], /"tujuh \/ 7"/);
  const r = B.buildCsvRdm(SOAL);
  assert.match(r.split('\n')[0], /"Bentuk","Jawaban","Rubrik","Paket","Dawr","Batas materi","No. paket"$/);
  assert.match(r, /"Melanjutkan \(isian\)","tujuh \/ 7","","","","",""/);
  assert.match(r, /"Uraian","Jelaskan|"Uraian","Jarak dua marhalah/);
});

async function teksDocx(mode) {
  const blob = await B.buildDocx(SOAL, mode);
  const zip = await JSZip.loadAsync(Buffer.from(await blob.arrayBuffer()));
  return zip.file('word/document.xml').async('string');
}
test('DOCX (kartu, daftar): kunci/jawaban/rubrik tiap bentuk tampil', async () => {
  for (const mode of ['kartu', 'daftar']) {
    const x = await teksDocx(mode);
    assert.match(x, /Air laut/); assert.match(x, /tujuh \/ 7/); assert.match(x, /Pedoman penskoran/); assert.match(x, /Jarak dua marhalah/);
  }
  const kartu = await teksDocx('kartu');
  assert.match(kartu, /Melanjutkan \(isian\)/); assert.match(kartu, /Kunci: /);
});
test('DOCX Pegon (dengan/tanpa Latin): bentuk isian dan uraian tidak merusak ekspor', async () => {
  for (const mode of ['pegon', 'pegonlatin']) {
    const x = await teksDocx(mode);
    assert.ok(x.length > 1000);
    assert.match(x, /w:bidi/);
  }
});
