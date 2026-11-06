// Tab Export dipisah ke web/ExportTab.jsx (dimuat malas); pembuat berkas ke web/lib/exportBuilders.js; konstanta murni ke web/lib/dasar.js.
// Tes ini memastikan modul-modul itu terhubung benar (render sungguhan) dan tidak ada impor melingkar ke App.jsx.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { Writable } from 'node:stream';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';

let vite; let ExportTab; let UI; let EB; let DS;
before(async () => {
  globalThis.window ??= globalThis; globalThis.document ??= { visibilityState: 'visible' };
  vite = await createServer({ root: process.cwd(), server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
  ExportTab = (await vite.ssrLoadModule('/web/ExportTab.jsx')).default; // dimuat tanpa App.jsx lebih dulu
  UI = await vite.ssrLoadModule('/web/ui.jsx');
  EB = await vite.ssrLoadModule('/web/lib/exportBuilders.js');
  DS = await vite.ssrLoadModule('/web/lib/dasar.js');
});
after(async () => { if (vite) await vite.close(); });
const render = (C, props) => new Promise((ok, gagal) => {
  let out = '';
  const w = new Writable({ write(c, _e, cb) { out += c.toString(); cb(); } });
  w.on('finish', () => ok(out.replace(/<!-- -->/g, '')));
  const s = renderToPipeableStream(React.createElement(C, props), { onAllReady() { s.pipe(w); }, onError: gagal });
});

test('modul dasar, pembuat berkas, dan pembantu bersama mengekspor yang dibutuhkan', () => {
  for (const k of ['KEYS', 'LEVEL', 'STATUS', 'TINGKAT', 'MAPEL', 'FALLBACK_CFG', 'Bt', 'Draft', 'bacaPref', 'optsOf', 'fullQ', 'mapelUntuk']) assert.ok(DS[k], `dasar.${k}`);
  for (const k of ['buildGift', 'buildMoodleXml', 'buildCsvForms', 'buildCsvRdm', 'buildDocx', 'FORMATS']) assert.ok(EB[k], `exportBuilders.${k}`);
  for (const k of ['AppCfgCtx', 'useCfg', 'CatatanCtx', 'AlurCtx', 'useAlur', 'Filters', 'applyFilter', 'labelPaket']) assert.ok(UI[k], `ui.${k}`);
  assert.equal(EB.FORMATS.map((f) => f.id).join(','), 'pegon,pegonlatin,docx,naskah,kartu,gift,mxml,gforms,rdm');
});

test('tab Export dirender: daftar format dan penyaring tampil', async () => {
  const q = [{ id: 's1', status: 'approved', tingkat: 'Tsanawiyah', mapel: 'Fiqih', level: 'L2', nama: 'Fathul Qarib', pertanyaan: 'Air manakah yang sah?', opsi: { A: 'a', B: 'b', C: '', D: '', E: '' }, kunci: 'A' }];
  const html = await render(ExportTab, { all: q, toast: () => {} });
  assert.match(html, /Moodle GIFT/); assert.match(html, /CSV Google Forms/); assert.match(html, /Word \(DOCX\)/);
});

test('tidak ada impor melingkar ke App.jsx dari modul turunan', () => {
  for (const f of ['ui.jsx', 'ExportTab.jsx', 'AdminKonfigurasi.jsx', 'lib/exportBuilders.js', 'lib/dasar.js']) {
    assert.doesNotMatch(readFileSync(new URL(`../web/${f}`, import.meta.url), 'utf8'), /from '(\.\.?\/)+App\.jsx'/, f);
  }
  assert.match(readFileSync(new URL('../web/App.jsx', import.meta.url), 'utf8'), /const Export = lazyPanel\(\(\) => import\('\.\/ExportTab\.jsx'\)\)/);
});
