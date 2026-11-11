import test from 'node:test';
import assert from 'node:assert/strict';
import { faktaTerikatDari, peringatanLevel, pilihFaktaBerikut, faktaBasi } from '../web/lib/fakta.js';

const F = (id, jenis, tingkat_cocok) => ({ id, fakta: `fakta ${id}`, kutipan: 'واجبة على كل مسلم', jenis, tingkat_cocok, pengecoh: ['x'], kutipanStatus: 'lolos' });
const DAFTAR = [F('f1', 'definisi', 'L1'), F('f2', 'syarat', 'L3'), F('f3', 'hukum', 'L2')];

test('faktaTerikatDari: hanya fakta, kutipan, pengecoh yang dikirim ke server', () => {
  assert.deepEqual(faktaTerikatDari(DAFTAR[0]), { fakta: 'fakta f1', kutipan: 'واجبة على كل مسلم', pengecoh: ['x'] });
  assert.equal(faktaTerikatDari(null), null);
  assert.deepEqual(faktaTerikatDari({ fakta: 'a', kutipan: 'b' }).pengecoh, []);
});

test('peringatanLevel: kosong bila level sama; ada bila level berbeda dari yang paling cocok (tidak mengubah level)', () => {
  assert.equal(peringatanLevel(DAFTAR[0], 'L1'), '');
  assert.match(peringatanLevel(DAFTAR[0], 'L3'), /lebih cocok untuk L1/);
  assert.match(peringatanLevel(DAFTAR[2], 'L1'), /lebih cocok untuk L2/);
  assert.equal(peringatanLevel(null, 'L1'), '');
  assert.equal(peringatanLevel(DAFTAR[0], ''), '');
});

test('pilihFaktaBerikut: tidak mengulang fakta yang sudah dipakai, dan memilih yang paling cocok dengan level', () => {
  const a = pilihFaktaBerikut(DAFTAR, [], { bentuk: 'pilgan', level: 'L3' }, () => 0.5);
  assert.equal(a.fakta.id, 'f2'); assert.equal(a.habis, false);
  const b = pilihFaktaBerikut(DAFTAR, ['f2'], { bentuk: 'pilgan', level: 'L3' }, () => 0.5);
  assert.notEqual(b.fakta.id, 'f2'); assert.equal(b.habis, false);
});

test('pilihFaktaBerikut: semua terpakai -> tetap memilih satu dan menandai habis', () => {
  const r = pilihFaktaBerikut(DAFTAR, ['f1', 'f2', 'f3'], { bentuk: 'pilgan', level: 'L1' }, () => 0.5);
  assert.equal(r.habis, true); assert.ok(r.fakta);
  assert.deepEqual(pilihFaktaBerikut([], [], { bentuk: 'pilgan', level: 'L1' }), { fakta: null, habis: false });
});

test('faktaBasi: true hanya bila teks sekarang berbeda dari teks saat ekstrak', () => {
  const st = { data: { fakta: DAFTAR }, teks: 'abc' };
  assert.equal(faktaBasi(st, 'abc'), false);
  assert.equal(faktaBasi(st, 'abcd'), true);
  assert.equal(faktaBasi({ loading: true }, 'abc'), false);
  assert.equal(faktaBasi(null, 'abc'), false);
});
