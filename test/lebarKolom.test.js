import test from 'node:test';
import assert from 'node:assert/strict';
import { lebarKolom, panjangSoal } from '../web/lib/lebarKolom.js';

test('lebarKolom: panjang sama menghasilkan 50/50', () => {
  const r = lebarKolom(500, 500);
  assert.equal(r.kiri, 0.5); assert.equal(r.kanan, 0.5);
  assert.equal(r.css, 'minmax(0, 0.5fr) minmax(0, 0.5fr)');
});

test('lebarKolom: sisi yang lebih panjang mendapat kolom lebih lebar', () => {
  assert.ok(lebarKolom(900, 300).kiri > 0.5);
  assert.ok(lebarKolom(300, 900).kiri < 0.5);
});

test('lebarKolom: dibatasi 30% sampai 70%', () => {
  assert.equal(lebarKolom(100000, 200).kiri, 0.7);
  assert.equal(lebarKolom(200, 100000).kiri, 0.3);
  assert.equal(lebarKolom(100000, 200).kanan, 0.3);
});

test('lebarKolom: sisi kosong atau pendek tidak membuat lebar ekstrem (lantai)', () => {
  const a = lebarKolom(0, 0); assert.equal(a.kiri, 0.5);
  const b = lebarKolom(10, 60); assert.equal(b.kiri, 0.5);   // keduanya di bawah lantai 150
  const c = lebarKolom(undefined, null); assert.equal(c.kiri, 0.5);
});

test('lebarKolom: jumlah kiri dan kanan selalu 1', () => {
  for (const [a, b] of [[123, 987], [5000, 40], [1, 1], [333, 334]]) {
    const r = lebarKolom(a, b); assert.ok(Math.abs(r.kiri + r.kanan - 1) < 1e-9);
  }
});

test('lebarKolom: batas dan lantai bisa diatur', () => {
  assert.equal(lebarKolom(100000, 200, { max: 0.6 }).kiri, 0.6);
  assert.equal(lebarKolom(1000, 100, { lantai: 1000 }).kiri, 0.5);
});

test('panjangSoal: menjumlah semua bagian yang tampil, tahan data kosong', () => {
  assert.equal(panjangSoal(null), 0);
  assert.equal(panjangSoal({}), 0);
  const q = { stimulus: 'abc', pertanyaan: 'de', opsi: { A: 'x', B: 'yy', C: '', D: undefined }, pembahasan: 'fghi', jawaban: '', rubrik: '  ' };
  assert.equal(panjangSoal(q), 3 + 2 + 1 + 2 + 4);
});
