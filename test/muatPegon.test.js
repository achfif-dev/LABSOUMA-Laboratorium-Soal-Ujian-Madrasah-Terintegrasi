// Mesin Pegon (±250 KB) dimuat malas: tidak lagi dipasang oleh globals.js, melainkan oleh muatPegon() (window.Pegon terpasang setelah dimuat).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';

let vite; let MP; let UI;
before(async () => {
  globalThis.window ??= globalThis; globalThis.document ??= { visibilityState: 'visible' };
  delete globalThis.Pegon;
  vite = await createServer({ root: process.cwd(), server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
  MP = await vite.ssrLoadModule('/web/lib/muatPegon.js');
  UI = await vite.ssrLoadModule('/web/ui.jsx');
});
after(async () => { if (vite) await vite.close(); });
const h = React.createElement;

test('globals.js dan bundel awal tidak lagi mengimpor pegon.js secara statis', () => {
  const g = readFileSync(new URL('../web/globals.js', import.meta.url), 'utf8');
  assert.doesNotMatch(g, /pegon\.js/); assert.doesNotMatch(g, /Pegon:/);
  for (const f of ['App.jsx', 'ui.jsx', 'ExportTab.jsx', 'main.jsx', 'lib/dasar.js', 'lib/exportBuilders.js']) {
    assert.doesNotMatch(readFileSync(new URL(`../web/${f}`, import.meta.url), 'utf8'), /from '(\.\/|\.\/lib\/)pegon\.js'/, f);
  }
  assert.match(readFileSync(new URL('../web/lib/muatPegon.js', import.meta.url), 'utf8'), /import\('\.\/pegon\.js'\)/);
});

test('sebelum dimuat: window.Pegon kosong, pegonSiap false, komponen terbungkus menampilkan "Memuat"', () => {
  assert.equal(window.Pegon, undefined); assert.equal(MP.pegonSiap(), false);
  const Dalam = () => h('p', null, 'ISI-PEGON');
  const html = renderToString(h(UI.denganPegon(Dalam)));
  assert.match(html, /Memuat mesin Pegon/); assert.doesNotMatch(html, /ISI-PEGON/);
});

test('kamus bersama yang tiba sebelum mesin dimuat ditahan lalu diterapkan setelah dimuat', async () => {
  MP.kamusBersamaMasuk([{ id: 'arab_tawakkul', jenis: 'arab', kata: 'tawakkul', arab: 'توكل' }]); // tidak boleh melempar walau mesin belum ada
  const [a, b] = [MP.muatPegon(), MP.muatPegon()];
  assert.equal(a, b, 'pemuatan bersama: satu janji untuk semua pemanggil');
  const P = await a;
  assert.equal(window.Pegon, P); assert.equal(MP.pegonSiap(), true);
  assert.equal(typeof P.convertTextEjaan, 'function');
  assert.equal(P.kamus.bersama().arab.tawakkul, 'توكل');
  assert.equal(await MP.muatPegon(), P, 'panggilan berikutnya langsung mengembalikan mesin yang sama');
});

test('setelah dimuat: kamus bersama langsung diterapkan dan komponen terbungkus dirender', () => {
  MP.kamusBersamaMasuk([{ id: 'arab_amanah', jenis: 'arab', kata: 'amanah', arab: 'امانة' }]);
  assert.equal(window.Pegon.kamus.bersama().arab.amanah, 'امانة');
  const Dalam = () => h('p', null, 'ISI-PEGON');
  assert.match(renderToString(h(UI.denganPegon(Dalam))), /ISI-PEGON/);
  window.Pegon.kamus.muatBersama([]);
});
