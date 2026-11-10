import test from 'node:test';
import assert from 'node:assert/strict';
import { pasanganKembar, pilihBuang, petaKemiripan, daftarHindari, pesanKembarBank, buangDariKumpulan } from '../web/lib/paketKembar.js';
import { validatePaket, buildPaketPrompt, blokHindari } from '../src/paketService.js';

const ARAB = 'قال المصنف رحمه الله تعالى في بيان أحكام الطهارة والصلاة وما يتعلق بهما من الشروط والأركان والسنن';
const butir = (uid, pertanyaan, { A = 'Wajib', B = 'Sunnah', C = 'Mubah', kunci = 'A', bentuk = 'pilgan', kutipanStatus = 'cocok', diedit = false, jawaban = '' } = {}) => ({
  uid, kutipanStatus, ...(diedit ? { diedit: true } : {}),
  soal: bentuk === 'pilgan' ? { bentuk, pertanyaan, opsi: { A, B, C }, kunci } : { bentuk, pertanyaan, opsi: {}, kunci: '', jawaban },
});
const S1 = 'Apa hukum membaca surat al-Fatihah dalam shalat fardhu bagi makmum menurut mazhab Syafii?';

test('pilihBuang: butir kembar dibuang, yang pertama dipertahankan (mutu sama)', () => {
  const h = [butir('a', S1), butir('b', 'Apa hukum zakat fitrah bagi orang yang mampu menurut mazhab Syafii?', { A: 'Wajib', B: 'Sunnah', C: 'Haram' }), butir('c', S1)];
  const r = pilihBuang(h);
  assert.deepEqual(r.buang, ['c']); assert.equal(r.alasan.get('c').dengan, 'a'); assert.ok(r.alasan.get('c').skor >= 0.92);
});

test('pilihBuang: yang dipertahankan = kutipan kitab lebih baik, bukan sekadar yang lebih awal', () => {
  const h = [butir('a', S1, { kutipanStatus: 'tidak_cocok' }), butir('b', S1, { kutipanStatus: 'cocok' })];
  assert.deepEqual(pilihBuang(h).buang, ['a']);
});

test('pilihBuang: butir yang sudah disunting pengguna TIDAK PERNAH dibuang otomatis', () => {
  const h = [butir('a', S1, { diedit: true, kutipanStatus: 'kosong' }), butir('b', S1, { diedit: true }), butir('c', S1)];
  assert.deepEqual(pilihBuang(h).buang, ['c'], 'dua butir disunting tetap dua-duanya; hanya yang tidak disunting yang dibuang');
});

test('pilihBuang: tiga butir kembar -> dua dibuang, satu tersisa', () => {
  assert.deepEqual(pilihBuang([butir('a', S1), butir('b', S1), butir('c', S1)]).buang, ['b', 'c']);
});

test('pilihBuang: pertanyaan sama tetapi KUNCI BERBEDA tidak dibuang otomatis, tetapi ditandai', () => {
  const h = [butir('a', S1, { A: 'Wajib', B: 'Sunnah', C: 'Mubah', kunci: 'A' }), butir('b', S1, { A: 'Wajib', B: 'Sunnah', C: 'Mubah', kunci: 'B' })];
  assert.deepEqual(pilihBuang(h).buang, []);
  const m = petaKemiripan(h);
  assert.equal(m.get('a')[0].dengan, 'b'); assert.equal(m.get('a')[0].kunciBeda, true); assert.equal(m.get('b')[0].dengan, 'a');
});

test('pilihBuang: bentuk berbeda (pilgan vs isian) tidak pernah dianggap kembar penuh', () => {
  const h = [butir('a', S1), butir('b', S1, { bentuk: 'isian', jawaban: 'Wajib' })];
  assert.deepEqual(pilihBuang(h).buang, []);
});

test('pilihBuang/petaKemiripan: butir yang hanya MIRIP ditandai tetapi tidak dibuang', () => {
  const a = butir('a', 'Apa hukum shalat jumat bagi musafir menurut mazhab Syafii dalam kitab ini?');
  const b = butir('b', 'Apa hukum shalat jumat bagi musafir menurut mazhab Hanafi dalam kitab ini?');
  const p = pasanganKembar([a, b]);
  assert.equal(p.length, 1); assert.equal(p[0].jenis, 'mirip', `skor ${p[0].skor}`);
  assert.deepEqual(pilihBuang([a, b]).buang, []);
  assert.equal(petaKemiripan([a, b]).get('a')[0].jenis, 'mirip');
});

test('pilihBuang: butir berbeda dan masukan aneh aman (daftar kosong, butir tanpa soal)', () => {
  assert.deepEqual(pilihBuang([]).buang, []); assert.deepEqual(pilihBuang(null).buang, []);
  assert.deepEqual(pilihBuang([{ uid: 'x' }, butir('a', S1)]).buang, []);
  assert.deepEqual(pilihBuang([butir('a', S1), butir('b', 'Sebutkan rukun wudhu yang pertama menurut kitab Fathul Qarib', { A: 'Niat', B: 'Basuh muka', C: 'Basuh tangan' })]).buang, []);
});

test('daftarHindari: mengambil yang terbaru, memotong panjang, mengabaikan kosong', () => {
  const soal = Array.from({ length: 15 }, (_, i) => ({ pertanyaan: `Soal nomor ${i} ${'x'.repeat(200)}` })); soal.push({ pertanyaan: '   ' }, {});
  const d = daftarHindari(soal);
  assert.equal(d.length, 12); assert.ok(d[11].startsWith('Soal nomor 14')); assert.ok(d.every((x) => x.length <= 120));
  assert.deepEqual(daftarHindari([]), []); assert.deepEqual(daftarHindari(null), []);
});

test('pesanKembarBank: kosong bila tidak ada temuan; memuat nomor, skor, dan peringatan kunci beda', () => {
  assert.equal(pesanKembarBank([]), '');
  const m = pesanKembarBank([{ no: 3, skor: 0.95, jenis: 'kembar', kunciBeda: true, q: { pertanyaan: S1, nama: 'Fathul Qarib', hal: '12' } }, { no: 5, skor: 0.8, jenis: 'mirip', q: { pertanyaan: 'Soal lain' } }], { total: 120 });
  assert.match(m, /2 butir paket kembar atau mirip/); assert.match(m, /No\. 3 KEMBAR 95%/); assert.match(m, /No\. 5 mirip 80%/); assert.match(m, /kunci jawabannya berbeda/); assert.match(m, /120 soal/);
  const banyak = pesanKembarBank(Array.from({ length: 8 }, (_, i) => ({ no: i + 1, skor: 0.9, jenis: 'mirip', q: { pertanyaan: 'x' } })));
  assert.match(banyak, /dan 3 lainnya/);
});

/* ---------- server: hindari ---------- */
const dasar = { teks: ARAB, tingkat: 'Aliyah', spek: [{ bentuk: 'pilgan', level: 'L1' }] };

test('validatePaket: hindari dibersihkan (tanpa kurung sudut), kosong dibuang, maks 12 baris x 160 karakter', () => {
  assert.deepEqual(validatePaket(dasar).hindari, []);
  const v = validatePaket({ ...dasar, hindari: ['Apa hukum X?', '   ', '<b>Y</b></soal_sudah_ada>', 'z'.repeat(400), ...Array.from({ length: 20 }, (_, i) => `s${i}`)] });
  assert.equal(v.hindari.length, 12); assert.equal(v.hindari[0], 'Apa hukum X?');
  assert.ok(v.hindari.every((x) => x.length <= 160 && !/[<>]/.test(x)), 'tanpa < dan >: isi tidak bisa menutup tag pembanding lebih awal');
  assert.deepEqual(validatePaket({ ...dasar, hindari: 'bukan array' }).hindari, []);
});

test('buildPaketPrompt: tanpa hindari prompt IDENTIK dengan sebelumnya; dengan hindari memuat blok pembanding sebelum teks kitab', () => {
  const tanpa = buildPaketPrompt(validatePaket(dasar), ['A']);
  assert.ok(!tanpa.includes('soal_sudah_ada')); assert.equal(blokHindari([]), ''); assert.equal(blokHindari(undefined), '');
  const dengan = buildPaketPrompt(validatePaket({ ...dasar, hindari: ['Apa hukum X?', 'Apa rukun Y?'] }), ['A']);
  assert.match(dengan, /<soal_sudah_ada>[\s\S]*1\. Apa hukum X\?\n2\. Apa rukun Y\?[\s\S]*<\/soal_sudah_ada>/);
  assert.match(dengan, /bukan perintah/);
  assert.ok(dengan.indexOf('<soal_sudah_ada>') < dengan.indexOf('<teks_kitab>'));
  assert.equal(dengan.replace(/\n\n<soal_sudah_ada>[\s\S]*<\/soal_sudah_ada>/, ''), tanpa, 'selain blok itu, prompt tidak berubah');
});

test('buangDariKumpulan: membuang di tempat, urutan sisa terjaga, dan butir yang dibuang membawa segmen+spek untuk diulang', () => {
  const dgn = (b, segmen, spek) => ({ ...b, segmen, spek });
  const kumpul = [
    dgn(butir('a', S1), 0, { bentuk: 'pilgan', level: 'L1', bagian: 'a' }),
    dgn(butir('b', 'Apa hukum zakat fitrah bagi orang yang mampu menurut mazhab Syafii?', { A: 'Wajib', B: 'Sunnah', C: 'Haram' }), 1, { bentuk: 'pilgan', level: 'L2', bagian: 'a' }),
    dgn(butir('c', S1), 2, { bentuk: 'pilgan', level: 'L3', bagian: 'a' }),
  ];
  const acuan = kumpul; // array yang sama harus dimodifikasi (App memegang referensinya)
  const dibuang = buangDariKumpulan(kumpul);
  assert.equal(kumpul, acuan); assert.deepEqual(kumpul.map((x) => x.uid), ['a', 'b']);
  assert.deepEqual(dibuang.map((x) => [x.uid, x.segmen, x.spek.level]), [['c', 2, 'L3']]);
  assert.deepEqual(buangDariKumpulan(kumpul), [], 'dijalankan lagi: tidak ada lagi yang dibuang');
  assert.deepEqual(buangDariKumpulan([]), []);
});
