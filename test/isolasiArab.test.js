import test from 'node:test';
import assert from 'node:assert/strict';
import { isolasiArab } from '../web/lib/isolasiArab.js';

test('isolasiArab membungkus tiap rangkaian huruf Arab dan membiarkan teks Latin', () => {
  assert.equal(isolasiArab('أ 5×5 + ب 5×7'), '\u2068أ\u2069 5×5 + \u2068ب\u2069 5×7');
  assert.equal(isolasiArab('Dauri I'), 'Dauri I');
  assert.equal(isolasiArab('الأول'), '\u2068الأول\u2069');
});
test('isolasiArab tahan nilai kosong', () => {
  assert.equal(isolasiArab(null), '');
  assert.equal(isolasiArab(undefined), '');
  assert.equal(isolasiArab(0), '0');
});
