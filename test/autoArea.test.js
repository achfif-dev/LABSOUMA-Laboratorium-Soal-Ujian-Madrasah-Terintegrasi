import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sumberWeb } from './_sumberWeb.js';

const baca = (f) => readFileSync(new URL(`../web/${f}`, import.meta.url), 'utf8');
const ui = baca('ui.jsx');
const app = sumberWeb; // App.jsx dipecah ke beberapa berkas

test('AutoArea: dihitung ulang saat isi, lebar, dan font berubah; tinggi minimum dari rows', () => {
  assert.match(ui, /const AutoArea = /);
  assert.match(ui, /useLayoutEffect\(fit, \[value, fit\]\)/);
  assert.match(ui, /ResizeObserver/);
  assert.match(ui, /document\.fonts/);
  assert.match(ui, /resize-none overflow-hidden/);
});

test('Naskah Soal: semua isian teks panjang memakai AutoArea, bukan textarea statis', () => {
  for (const id of ['stimulus', 'pertanyaan', 'jawaban', 'rubrik', 'pembahasan', 'indikator']) {
    assert.ok(app.includes(`<AutoArea id="${id}"`), `isian ${id} harus AutoArea`);
    assert.ok(!app.includes(`<textarea id="${id}"`), `isian ${id} tidak boleh textarea statis`);
  }
});

test('Opsi jawaban: terlipat ke bawah (tidak terpotong), tetap satu baris logis', () => {
  assert.match(app, /<AutoArea satuBaris id=\{'opsi-' \+ k\}/);
  assert.ok(!app.includes("<input id={'opsi-' + k}"));
  assert.match(ui, /e\.key === 'Enter'/);
});

test('Batas panjang isian Naskah Soal sama dengan firestore.rules (agar simpan tidak gagal diam-diam)', () => {
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  for (const [id, n] of [['stimulus', 3000], ['pertanyaan', 2000], ['pembahasan', 4000], ['indikator', 1000]]) {
    assert.ok(app.includes(`<AutoArea id="${id}" maxLength={${n}}`), `${id} harus maxLength ${n}`);
    assert.ok(rules.includes(`x.${id}.size() <= ${n}`), `aturan ${id} berubah, sesuaikan maxLength`);
  }
});
