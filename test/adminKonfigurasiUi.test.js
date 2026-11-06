// Tab admin (Konfigurasi dan Pengaturan AI) dipisah ke web/AdminKonfigurasi.jsx dan dimuat malas.
// Render sungguhan (SSR): tiap komponen tampil tanpa error, dan impor melingkar ke App.jsx tidak merusak pemuatan modul.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { Writable } from 'node:stream';
import { createServer } from 'vite';

let vite; let M; let UI;
before(async () => {
  globalThis.window ??= globalThis; globalThis.document ??= { visibilityState: 'visible' };
  vite = await createServer({ root: process.cwd(), server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
  M = await vite.ssrLoadModule('/web/AdminKonfigurasi.jsx'); // berkas ini tidak boleh bergantung pada App.jsx (tanpa impor melingkar)
  UI = await vite.ssrLoadModule('/web/ui.jsx');
});
after(async () => { if (vite) await vite.close(); });
const hSiap = (C, props) => new Promise((ok, gagal) => {
  let out = '';
  const w = new Writable({ write(c, _e, cb) { out += c.toString(); cb(); } });
  w.on('finish', () => ok(out.replace(/<!-- -->/g, '')));
  const s = renderToPipeableStream(React.createElement(C, props), { onAllReady() { s.pipe(w); }, onError: gagal });
});
const T = ['Ibtidaiyah', 'Tsanawiyah', 'Aliyah'];
const cfg = {
  tingkat: T.map((n) => ({ nama: n, label: n, singkat: '', kelas: [], aktif: true })),
  mapel: [{ nama: 'Fiqih', tingkat: T, aktif: true }],
  kitab: [{ nama: 'Fathul Qarib', pengarang: '', mapel: '', tingkat: T, aktif: true }],
};

test('modul admin mengekspor empat komponen, dan pembantu bersama tersedia dari ui.jsx', () => {
  for (const k of ['AiConfig', 'AppCfgAdmin', 'AlurEditorAdmin', 'PemeliharaanAdmin']) assert.equal(typeof M[k], 'function', k);
  for (const k of ['Btn', 'Label', 'Section', 'ErrorBox', 'callApi', 'apiErr', 'simpanBerkas', 'useDraftSync', 'Uj', 'Draft']) assert.ok(UI[k], `ui.${k}`);
});

test('AiConfig, PemeliharaanAdmin, AlurEditorAdmin, dan AppCfgAdmin dirender tanpa error', async () => {
  const noop = () => {};
  assert.ok((await hSiap(M.AiConfig, { toast: noop })).length > 100);
  assert.ok((await hSiap(M.PemeliharaanAdmin, { toast: noop })).length > 50);
  const alur = (await import('../web/lib/alurSoal.js')).ALUR_BAWAAN;
  assert.ok((await hSiap(M.AlurEditorAdmin, { alur, mapel: cfg.mapel, onSaved: noop, toast: noop })).length > 50);
  const html = await hSiap(M.AppCfgAdmin, { cfg, kustom: false, diubahAt: null, onSaved: noop, toast: noop });
  assert.match(html, /Fathul Qarib/); assert.match(html, /Ibtidaiyah/);
});

test('AdminKonfigurasi tidak mengimpor App.jsx, dan App.jsx membungkus empat komponen admin lewat lazyPanel (tidak diimpor statis)', async () => {
  const { readFileSync } = await import('node:fs');
  const app = readFileSync(new URL('../web/App.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /^import .*AdminKonfigurasi/m);
  assert.doesNotMatch(readFileSync(new URL('../web/AdminKonfigurasi.jsx', import.meta.url), 'utf8'), /from '\.\/App\.jsx'/);
  assert.doesNotMatch(readFileSync(new URL('../web/ui.jsx', import.meta.url), 'utf8'), /from '\.\/App\.jsx'/);
  for (const k of ['AiConfig', 'AppCfgAdmin', 'AlurEditorAdmin', 'PemeliharaanAdmin']) assert.match(app, new RegExp(`const ${k} = lazyPanel\\(`));
});
