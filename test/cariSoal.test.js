import test from 'node:test';
import assert from 'node:assert/strict';
import { normalisasi, saring } from '../web/lib/cariSoal.js';

const S = [
  { id: 1, pertanyaan: 'Apa hukum Wudhu bagi orang yang berhadats?', opsi: { A: 'Wajib', B: 'Sunnah' }, teks: 'الطَّهَارَةُ شَرْطٌ لِلصَّلَاةِ', nama: 'Safinatun Naja', mapel: 'Fiqih' },
  { id: 2, pertanyaan: 'Sebutkan rukun iman', opsi: { A: 'Enam' }, teks: 'الإِيمَانُ بِاللهِ', nama: 'Aqidatul Awam', mapel: 'Akidah', authorName: 'Ust. Hadi' },
];

test('normalisasi: harakat, alif, ya, ta marbuthah', () => {
  assert.equal(normalisasi('الطَّهَارَةُ'), normalisasi('الطهارة'));
  assert.equal(normalisasi('إيمان'), normalisasi('ايمان'));
  assert.equal(normalisasi('مدرسة'), normalisasi('مدرسه'));
});

test('saring: Latin tanpa peka huruf, Arab tanpa harakat, AND antarkata, opsi dan penulis ikut dicari', () => {
  assert.equal(saring(S, '').length, 2);
  assert.deepEqual(saring(S, 'WUDHU').map((q) => q.id), [1]);
  assert.deepEqual(saring(S, 'الطهارة').map((q) => q.id), [1]);
  assert.deepEqual(saring(S, 'الايمان').map((q) => q.id), [2]);
  assert.deepEqual(saring(S, 'fiqih wajib').map((q) => q.id), [1]);
  assert.deepEqual(saring(S, 'fiqih enam').map((q) => q.id), []);
  assert.deepEqual(saring(S, 'hadi').map((q) => q.id), [2]);
});
