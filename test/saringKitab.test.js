import test from 'node:test';
import assert from 'node:assert/strict';
import { opsiKitab, opsiBab, cocokKitabBab, kunciTeks, KOSONG } from '../web/lib/saringKitab.js';

const S = [
  { id: 1, nama: 'Safinatun Naja', bab: 'Bab 2 Wudhu' },
  { id: 2, nama: 'safinatun  naja ', bab: 'Bab 10 Shalat' },
  { id: 3, nama: 'Safinatun Naja', bab: 'Bab 2 Wudhu' },
  { id: 4, nama: 'Aqidatul Awam', bab: '' },
  { id: 5, nama: '', bab: 'Bab 1' },
];

test('opsiKitab: ejaan berbeda digabung, label = ejaan terbanyak, yang kosong di akhir', () => {
  const o = opsiKitab(S);
  assert.deepEqual(o.map((x) => [x.label, x.jumlah]), [['Aqidatul Awam', 1], ['Safinatun Naja', 3], ['(tanpa kitab)', 1]]);
  assert.equal(o[1].nilai, kunciTeks('Safinatun Naja'));
  assert.equal(o[2].nilai, KOSONG);
});

test('opsiBab: hanya bab dari kitab terpilih, urutan angka alami (2 sebelum 10)', () => {
  const k = kunciTeks('Safinatun Naja');
  assert.deepEqual(opsiBab(S, k).map((x) => x.label), ['Bab 2 Wudhu', 'Bab 10 Shalat']);
  assert.deepEqual(opsiBab(S, '').map((x) => x.label), ['Bab 1', 'Bab 2 Wudhu', 'Bab 10 Shalat', '(tanpa bab)']);
  assert.deepEqual(opsiBab(S, KOSONG).map((x) => x.label), ['Bab 1']);
});

test('cocokKitabBab: kosong = semua; kitab, bab, dan sentinel kosong', () => {
  const k = kunciTeks('Safinatun Naja');
  assert.deepEqual(S.filter((q) => cocokKitabBab(q, {})).length, 5);
  assert.deepEqual(S.filter((q) => cocokKitabBab(q, { kitab: k })).map((q) => q.id), [1, 2, 3]);
  assert.deepEqual(S.filter((q) => cocokKitabBab(q, { kitab: k, bab: kunciTeks('bab 2 wudhu') })).map((q) => q.id), [1, 3]);
  assert.deepEqual(S.filter((q) => cocokKitabBab(q, { kitab: KOSONG })).map((q) => q.id), [5]);
  assert.deepEqual(S.filter((q) => cocokKitabBab(q, { bab: KOSONG })).map((q) => q.id), [4]);
});

test('kunciTeks: Arab tanpa harakat dan spasi ganda', () => {
  assert.equal(kunciTeks('  الطَّهَارَةُ   كتاب '), kunciTeks('الطهارة كتاب'));
});
