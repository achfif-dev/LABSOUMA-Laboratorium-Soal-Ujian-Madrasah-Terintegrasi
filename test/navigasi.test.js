// Navigasi dua tingkat (web/lib/navigasi.js) dan penjaga struktur di web/App.jsx.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NAV_GRUP, SUB_LABEL, grupDariTab, bangunNav, tujuanGrup } from '../web/lib/navigasi.js';

const tab = (id, n) => ({ id, label: 'L-' + id, ...(n !== undefined ? { n } : {}) });
const PENYUSUN = ['compose', 'paket', 'bank', 'export', 'fokus', 'pegon', 'analisis'].map((i) => tab(i));
const EDITOR = [...['compose', 'paket'].map((i) => tab(i)), tab('review', 5), ...['bank', 'export', 'fokus', 'pegon', 'analisis', 'backup'].map((i) => tab(i))];
const ADMIN = [...EDITOR, tab('dasbor', 2), tab('users'), tab('cfg'), tab('ai')];

test('setiap tab terdaftar tepat di satu grup dan punya label pendek', () => {
  const semua = NAV_GRUP.flatMap((g) => g.tabs);
  assert.equal(new Set(semua).size, semua.length, 'ada tab di dua grup');
  assert.equal(semua.length, 13);
  for (const id of semua) assert.ok(SUB_LABEL[id], `label pendek ${id} hilang`);
  assert.equal(grupDariTab('analisis').id, 'ujian');
  assert.equal(grupDariTab('tidak-ada'), null);
});

test('penyusun: 3 grup (Susun, Bank Soal, Ujian), tanpa Review dan tanpa Kelola', () => {
  const nav = bangunNav(PENYUSUN);
  assert.deepEqual(nav.map((g) => g.id), ['susun', 'bank', 'ujian']);
  assert.deepEqual(nav[1].items.map((t) => t.id), ['bank']);
  assert.deepEqual(nav[0].items.map((t) => t.id), ['compose', 'paket', 'pegon']);
});

test('editor: 4 grup; Kelola hanya Backup Drive; lencana Bank Soal = soal menunggu review', () => {
  const nav = bangunNav(EDITOR);
  assert.deepEqual(nav.map((g) => g.id), ['susun', 'bank', 'ujian', 'kelola']);
  assert.deepEqual(nav[3].items.map((t) => t.id), ['backup']);
  assert.equal(nav[1].lencana, 5);
  assert.deepEqual(nav[1].items.map((t) => t.id), ['review', 'bank']);
});

test('admin: 13 tab menjadi 4 grup; lencana Kelola = peringatan kuota; urutan sub-tab mengikuti grup', () => {
  const nav = bangunNav(ADMIN);
  assert.equal(nav.length, 4);
  assert.equal(nav.reduce((n, g) => n + g.items.length, 0), 13);
  assert.equal(nav[3].lencana, 2);
  assert.deepEqual(nav[3].items.map((t) => t.id), ['backup', 'dasbor', 'users', 'cfg', 'ai']);
  assert.equal(nav[0].lencana, 0);
});

test('tab yang belum terdaftar di grup tidak hilang: masuk "Lainnya"', () => {
  const nav = bangunNav([...PENYUSUN, tab('baru')]);
  assert.equal(nav.at(-1).id, 'lainnya'); assert.deepEqual(nav.at(-1).items.map((t) => t.id), ['baru']);
});

test('tujuanGrup: sub-tab terakhir dipakai bila masih tersedia, selain itu yang pertama', () => {
  const nav = bangunNav(ADMIN); const ujian = nav[2];
  assert.equal(tujuanGrup(ujian, {}), 'fokus');
  assert.equal(tujuanGrup(ujian, { ujian: 'analisis' }), 'analisis');
  assert.equal(tujuanGrup(ujian, { ujian: 'review' }), 'fokus'); // bukan anggota grup ini
  assert.equal(tujuanGrup(bangunNav(PENYUSUN)[1], { bank: 'review' }), 'bank'); // penyusun tak punya Review
  assert.equal(tujuanGrup(ujian, undefined), 'fokus');
});

const APP_SEMUA = readFileSync(new URL('../web/App.jsx', import.meta.url), 'utf8');
const APP = APP_SEMUA.slice(0, APP_SEMUA.indexOf('function AppUstadz')); // aplikasi utama saja; menu Ustadz (5 tab) sengaja tidak diubah
test('App.jsx: menu memakai grup, Review hanya untuk editor/admin, #analisis dipulihkan, sub-tab diingat di setTab', () => {
  assert.ok(APP_SEMUA.includes('function AppUstadz') && APP.length > 100000, 'penanda pemisah aplikasi Ustadz hilang');
  assert.match(APP, /NV\.bangunNav\(TABS\)/);
  assert.match(APP, /\.\.\.\(canReview \? \[\{ id: 'review'/);
  assert.match(APP, /'pegon', 'analisis'\]\.includes\(h\)/);
  assert.match(APP, /\(canReview && \['review', 'backup'\]\.includes\(h\)\)/);
  assert.match(APP, /terakhirRef\.current\[g\.id\] = id/);
  assert.doesNotMatch(APP, /\{TABS\.map\(\(t\) => \(\s*<button key=\{t\.id\} type="button" onClick=\{\(\) => pilihTab\(t\.id\)\}[^]*?\{ROLE_LABEL\[profile\.role\]\}/, 'menu utama tidak lagi mendaftar semua tab');
});
