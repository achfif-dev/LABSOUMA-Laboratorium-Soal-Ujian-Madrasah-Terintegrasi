// Integrasi antartab: Susun Soal (bebas dan Paket Dauri), konfigurasi kitab/penempatan, perpustakaan, serta Fokus & Kisi-kisi.
// Menjaga empat hal: (a) batas materi sampai ke AI untuk soal bebas, (b) paket membawa bab dan tautan perpustakaan,
// (c) kisi-kisi tidak menggabungkan bab sama-nama lintas kitab, (d) satu definisi "kitab/bab yang sama" di semua tab.
import test from 'node:test';
import assert from 'node:assert/strict';
import { sumberWeb } from './_sumberWeb.js';
import { readFileSync } from 'node:fs';
import { validateInput, buildUserPrompt, systemPromptFor } from '../src/soalService.js';
import { samaKitab, cariKitabDi, kunciBab } from '../web/lib/kitabNama.js';
import { namaUntukForm } from '../web/lib/perpus.js';
import { buatKisi, analisisCakupan, samaBab } from '../src/kisi.js';
import { tautanPaket } from '../web/lib/paket.js';

const app = sumberWeb;
const TEKS = 'بسم الله الرحمن الرحيم. باب الطهارة: الوضوء واجب قبل الصلاة ولا تصح الصلاة بغير طهارة.';
const dasar = { teks: TEKS, tingkat: 'aliyah', level: 'L1', nama: 'Fathul Qarib', mapel: 'Fiqih' };

/* ---------------------------------------------------------------- (a) batas materi soal bebas */
test('(a) validateInput meneruskan cakupan dan ujian; prompt memuatnya; aturan CAKUPAN ada di system prompt', () => {
  const i = validateInput({ ...dasar, cakupan: 'Kitab Thaharah,\nbab wudhu <x>', ujian: 'UTS Semester 1' });
  assert.ok(i.cakupan.length > 0 && !/[<>\n]/.test(i.cakupan), 'cakupan dibersihkan seperti isian satu baris lain');
  const p = buildUserPrompt(i, 'A');
  assert.match(p, /Cakupan ujian \(batas materi dari Konfigurasi\): Kitab Thaharah/);
  assert.match(p, /Ujian: UTS Semester 1/);
  assert.match(systemPromptFor('pilgan'), /CAKUPAN\. Bila <metadata> memuat "Cakupan ujian"/);
});

test('(a) tanpa cakupan prompt tidak berubah dan tidak memuat baris cakupan', () => {
  const p = buildUserPrompt(validateInput(dasar), 'A');
  assert.doesNotMatch(p, /Cakupan ujian/);
  assert.doesNotMatch(p, /\nUjian:/);
});

test('(a) cakupan dibatasi 200 karakter di server', () => {
  assert.equal(validateInput({ ...dasar, cakupan: 'x'.repeat(500) }).cakupan.length, 200);
});

test('(a) Compose mengirim cakupan dan ujian ke /api/generate', () => {
  const i = app.indexOf("fetch('/api/generate'"); assert.ok(i > 0);
  const badan = app.slice(i, i + 900);
  assert.match(badan, /cakupan: cakupanTerpilih/);
  assert.match(badan, /ujian: form\.periode \? Uj\.labelPeriode/);
});

/* ---------------------------------------------------------------- (d) satu definisi kitab/bab yang sama */
test('(d) samaKitab: spasi, apostrof, huruf besar, kurung, dan awalan al- tidak membedakan', () => {
  assert.ok(samaKitab('Fathul Qarib', 'fathul  qarib'));
  assert.ok(samaKitab('Fathul Qarib', 'Fathulqarib'));
  assert.ok(samaKitab("Ta'lim al-Muta'allim", 'Talim al-Mutaallim'));
  assert.ok(samaKitab('Taqrib (Matan Abu Syuja)', 'Taqrib'));
  assert.ok(samaKitab('Taqrib (Matan Abu Syuja)', 'Matan Abu Syuja'));
  assert.ok(samaKitab('Al-Hikam', 'Hikam'));
  assert.ok(samaKitab('فتح القريب', 'فَتْحُ القريب'));
});

test('(d) samaKitab tidak terlalu longgar', () => {
  assert.ok(!samaKitab('Fathul Qarib', 'Fathul Mu\'in'));
  assert.ok(!samaKitab('Alfiyyah Ibnu Malik', 'Fiyyah Ibnu Malik')); // "Al" tanpa pemisah bukan awalan
  assert.ok(!samaKitab('', 'Fathul Qarib'));
  assert.ok(!samaKitab('', ''));
  assert.ok(!samaKitab('Safinatun Naja', 'Fathul Qarib'));
});

test('(d) cariKitabDi mendahulukan ejaan persis, lalu kecocokan longgar', () => {
  const kat = [{ nama: 'Taqrib (Matan Abu Syuja)', id: 1 }, { nama: 'Taqrib', id: 2 }];
  assert.equal(cariKitabDi(kat, 'taqrib').id, 2);
  assert.equal(cariKitabDi(kat, 'Matan Abu Syuja').id, 1);
  assert.equal(cariKitabDi(kat, 'Kitab lain'), undefined);
  assert.equal(cariKitabDi(kat, ''), undefined);
  assert.equal(cariKitabDi(null, 'x'), undefined);
});

test('(d) perpustakaan memakai definisi yang sama: ejaan katalog dipakai sehingga cakupan berlaku', () => {
  const kat = [{ nama: 'Taqrib (Matan Abu Syuja)' }, { nama: 'Fathul Qarib' }];
  assert.equal(namaUntukForm('Taqrib', kat), 'Taqrib (Matan Abu Syuja)');
  assert.equal(namaUntukForm('Fathulqarib', kat), 'Fathul Qarib');
  assert.equal(namaUntukForm('Kitab Baru', kat), 'Kitab Baru');
});

test('(d) kunciBab/samaBab: awalan Bab/Kitab/باب, kurung, dan dl/dh tidak membedakan', () => {
  assert.ok(samaBab('Bab Thaharah', 'Thaharah'));
  assert.ok(samaBab('Kitab Thaharah', 'Bab Thaharah'));
  assert.ok(samaBab('Bab Wudlu', 'Bab Wudhu'));
  assert.ok(samaBab('باب الطهارة', 'الطهارة'));
  assert.ok(samaBab('Bab Thaharah (bersuci)', 'Bab Thaharah'));
  assert.ok(!samaBab('Bab Thaharah', 'Bab Shalat'));
  assert.ok(!samaBab('Bab', ''));
  assert.equal(kunciBab('Bab'), 'bab'); // hanya label: jangan jadi kosong (soal tetap punya bab)
});

/* ---------------------------------------------------------------- (c) kisi-kisi per kitab */
const soal = (nama, bab, hal, extra = {}) => ({ nama, bab, hal, level: 'L1', mapel: 'Fiqih', tingkat: 'Tsanawiyah', kelas: 'VII', indikator: 'Peserta didik dapat menjelaskan x', ...extra });

test('(c) bab sama di dua kitab menjadi dua kelompok dengan rentang halaman masing-masing', () => {
  const k = buatKisi([soal('Safinatun Naja', 'Bab Thaharah', '8'), soal('Fathul Qarib', 'Bab Thaharah', '120'), soal('Fathul Qarib', 'Thaharah', '124')]);
  assert.equal(k.kelompok.length, 2);
  const sn = k.kelompok.find((g) => g.rujukan.startsWith('Safinatun Naja'));
  const fq = k.kelompok.find((g) => g.rujukan.startsWith('Fathul Qarib'));
  assert.equal(sn.rujukan, 'Safinatun Naja, hal. 8');
  assert.equal(fq.rujukan, 'Fathul Qarib, hal. 120–124');
  assert.equal(fq.jumlah, 2); // "Bab Thaharah" dan "Thaharah" satu bab
  assert.ok(!k.kelompok.some((g) => /\//.test(g.rujukan)), 'tidak ada rujukan gabungan lintas kitab');
});

test('(c) ejaan kitab berbeda tetap satu kelompok; total dan bobot tetap utuh', () => {
  const k = buatKisi([soal('Taqrib (Matan Abu Syuja)', 'Bab Shalat', '30'), soal('Taqrib', 'Bab Shalat', '31')]);
  assert.equal(k.kelompok.length, 1);
  assert.equal(k.kelompok[0].jumlah, 2);
  assert.equal(k.kelompok[0].bobot, 100);
});

test('(c) soal tanpa bab per kitab: rentang halaman tidak tercampur, tanpaBab dihitung benar', () => {
  const k = buatKisi([soal('Safinatun Naja', '', '8'), soal('Fathul Qarib', '', '120'), soal('Fathul Qarib', 'Bab Shalat', '130')]);
  const belum = k.kelompok.filter((g) => g.bab === 'Belum ditandai bab');
  assert.equal(belum.length, 2);
  assert.equal(k.tanpaBab, 2);
  assert.ok(belum.every((g) => !/\//.test(g.rujukan)));
  assert.equal(k.kelompok[k.kelompok.length - 1].bab, 'Belum ditandai bab', 'kelompok tanpa bab tetap paling akhir');
});

test('(c) urutan dan prioritas dari saran berlaku walau penulisan bab berbeda', () => {
  const k = buatKisi([soal('Fathul Qarib', 'Thaharah', '8'), soal('Fathul Qarib', 'Bab Shalat', '30')], { urutanBab: ['Bab Shalat', 'Bab Thaharah'], prioritas: { 'Bab Shalat': 'inti' } });
  assert.deepEqual(k.kelompok.map((g) => g.bab), ['Bab Shalat', 'Thaharah']);
  assert.equal(k.kelompok[0].prioritas, 'inti');
});

test('(c) analisisCakupan mencocokkan "Bab Wudlu" dengan saran "Bab Wudhu" dan "باب الطهارة" dengan "الطهارة"', () => {
  const r = analisisCakupan([{ nama: 'Bab Wudhu', prioritas: 'inti', alokasi: 2 }, { nama: 'الطهارة', prioritas: 'penting', alokasi: 1 }], [{ bab: 'Bab Wudlu' }, { bab: 'Wudhu' }, { bab: 'باب الطهارة' }]);
  assert.equal(r.baris[0].jumlah, 2); assert.equal(r.baris[0].status, 'cukup');
  assert.equal(r.baris[1].jumlah, 1);
  assert.equal(r.diluarSaran.length, 0);
  assert.deepEqual(r.intiKosong, []);
});

test('(c) kunci React kelompok kisi tidak lagi hanya nama bab', () => {
  assert.doesNotMatch(app, /kisi\.kelompok\.map\(\(g\) => \(\s*<div key=\{g\.bab\}>/);
});

/* ---------------------------------------------------------------- (b) paket membawa bab dan tautan perpustakaan */
const hal = (kitabId, ...seqs) => seqs.map((s) => ({ id: `${kitabId}:${s}`, nama: 'Fathul Qarib', teks: 'x', hal: String(s), juz: '1' }));

test('(b) tautanPaket: bab dirapikan; semua halaman dari satu kitab -> kitabId, halId, halIdAkhir', () => {
  const t = tautanPaket({ bab: '  Bab   Thaharah ', perpus: hal('fathul-qarib', 12, 13, 14) });
  assert.deepEqual(t, { bab: 'Bab Thaharah', kitabId: 'fathul-qarib', halId: 'p00012', halIdAkhir: 'p00014' });
});

test('(b) tautanPaket: satu halaman -> tanpa halIdAkhir; tanpa bab -> tanpa kunci bab', () => {
  assert.deepEqual(tautanPaket({ perpus: hal('fathul-qarib', 7) }), { kitabId: 'fathul-qarib', halId: 'p00007' });
});

test('(b) tautanPaket: tanpa tautan bila materi campuran, lintas kitab, foto, atau rentang melebihi batas rujukan', () => {
  assert.deepEqual(tautanPaket({ bab: 'B', perpus: hal('fathul-qarib', 1), teksManual: 'teks tempelan' }), { bab: 'B' });
  assert.deepEqual(tautanPaket({ bab: 'B', perpus: hal('fathul-qarib', 1), foto: [{ id: 'f' }] }), { bab: 'B' });
  assert.deepEqual(tautanPaket({ bab: 'B', perpus: [...hal('fathul-qarib', 1), ...hal('safinatun-naja', 2)] }), { bab: 'B' });
  assert.deepEqual(tautanPaket({ bab: 'B', perpus: hal('fathul-qarib', 1, 22) }), { bab: 'B' }); // 22 halaman > 20
  assert.deepEqual(tautanPaket({ perpus: [{ id: 'rusak' }] }), {});
  assert.deepEqual(tautanPaket({}), {});
  assert.deepEqual(tautanPaket(), {});
});

test('(b) hasil tautanPaket lolos aturan bentuk Firestore (bab <= 120, id halaman p+5 angka, halId butuh kitabId)', () => {
  const t = tautanPaket({ bab: 'x'.repeat(300), perpus: hal('fathul-qarib', 3, 4) });
  assert.equal(t.bab.length, 120);
  assert.match(t.kitabId, /^[a-z0-9][a-z0-9-]{1,59}$/);
  assert.match(t.halId, /^p[0-9]{5}$/); assert.match(t.halIdAkhir, /^p[0-9]{5}$/);
});

test('(b) Paket Dauri: input bab, ikut draf, ikut disimpan, dan diteruskan ke simpanPaket', () => {
  assert.match(app, /id="pk-bab"/);
  assert.match(app, /bab: S\(d\.bab, 120\)/);
  assert.match(app, /tautan: PK\.tautanPaket\(\{ bab, perpus, teksManual: teks, foto \}\)/);
  assert.match(app, /if \(meta\.tautan\) Object\.assign\(c, meta\.tautan\)/);
});

test('(b) aturan Firestore mengizinkan kolom yang kini ditulis paket (bab, kitabId, halId, halIdAkhir) pada soal baru', () => {
  const r = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  for (const k of ['bab', 'kitabId', 'halId', 'halIdAkhir', 'paket', 'cakupan']) assert.ok(r.includes(`'${k}'`), `rules memuat ${k}`);
});
