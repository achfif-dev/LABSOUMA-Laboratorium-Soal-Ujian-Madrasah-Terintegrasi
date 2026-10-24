import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { kamus } from '../src/pegon.js';

// Tidak ada emulator Firestore di CI, jadi yang bisa dijaga di sini: pola regex di firestore.rules harus
// sama dengan pola di mesin, dan struktur aturan kamusPegon (siapa boleh apa) tidak diam-diam berubah.
const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const blok = rules.slice(rules.indexOf('match /kamusPegon/{id}'), rules.indexOf('match /config/{doc}'));
const [reKata, reArab] = [...blok.matchAll(/matches\("([^"]+)"\)/g)].map((m) => new RegExp(m[1]));

test('aturan kamusPegon: pola kata dan ejaan Arab sama dengan validasi mesin', () => {
  assert.ok(reKata && reArab, 'dua pola regex harus ditemukan di firestore.rules');
  const kata = ['ilmu', "i'tidal", 'ruku\u2019', 'a-b', 'x'.repeat(40), 'x'.repeat(41), '', 'Ilmu', 'a b', '<b>', 'ilmu1', '__proto__', 'a/b', 'k\u02bcb'];
  for (const k of kata) {
    const mesin = kamus.bentukEntri({ jenis: 'suf', kata: k }).ok; // mesin menurunkan huruf besar dulu; aturan menolak huruf besar mentah (klien selalu mengirim huruf kecil)
    const aturan = reKata.test(k) && !['__proto__', 'constructor', 'prototype'].includes(k);
    if (k === k.toLowerCase()) assert.equal(mesin, aturan, `kata ${JSON.stringify(k)}`);
    else assert.equal(aturan, false, `aturan harus menolak huruf besar mentah: ${k}`);
  }
  const arab = ['علم', 'ڠڤڽ', 'عَلْم', 'علم دين', 'علم-دين', 'a', 'علم<', 'علم\u200d', 'ﻋﻠﻢ', '٣', 'ا'.repeat(60), 'ا'.repeat(61), '', ' '];
  for (const a of arab) {
    const mesin = kamus.bentukEntri({ jenis: 'arab', kata: 'ilmu', arab: a }).ok;
    const aturan = reArab.test(a);
    // mesin memangkas spasi tepi sebelum memeriksa; padankan dengan perilaku yang sama
    assert.equal(mesin, reArab.test(a.trim()), `arab ${JSON.stringify(a)}`);
    if (a === a.trim()) assert.equal(mesin, aturan, `arab ${JSON.stringify(a)}`);
  }
});

test('aturan kamusPegon: baca untuk staf, tulis hanya editor/admin, id terikat ke isi', () => {
  assert.match(blok, /allow read: if isStaff\(\) \|\| isUstadz\(\);/);
  assert.match(blok, /allow create, update: if isReviewer\(\) && validEntry\(\);/);
  assert.match(blok, /allow delete: if isReviewer\(\);/);
  assert.match(blok, /id == d\(\)\.jenis \+ '_' \+ d\(\)\.kata/);
  assert.match(blok, /updatedByUid == request\.auth\.uid/);
  assert.match(blok, /updatedAt == request\.time/);
  assert.doesNotMatch(blok, /isAdmin\(\)\s*\|\|/, 'tidak ada jalur tulis lain yang melonggarkan');
  assert.doesNotMatch(blok, /allow (write|read, write)/);
});
