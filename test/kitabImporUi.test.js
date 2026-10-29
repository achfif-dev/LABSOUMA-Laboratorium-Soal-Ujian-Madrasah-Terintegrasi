// Render sungguhan (SSR) layar impor perpustakaan kitab: tidak gagal dirender dan teks penting muncul. Tidak menguji interaksi di browser.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

let vite; let KitabImpor;
before(async () => {
  globalThis.window ??= globalThis; globalThis.document ??= { visibilityState: 'visible' };
  vite = await createServer({ root: process.cwd(), server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
  KitabImpor = (await vite.ssrLoadModule('/web/KitabImpor.jsx')).default;
});
after(async () => { if (vite) await vite.close(); });

const Btn = ({ children, ...p }) => React.createElement('button', p, children);
const ErrorBox = ({ e }) => React.createElement('p', null, e && e.message);

test('KitabImpor: render awal tanpa galat; ada petunjuk, pemilih berkas, dan tombol segarkan', () => {
  const html = renderToString(React.createElement(KitabImpor, { Btn, ErrorBox, callApi: async () => ({ kitab: [] }), apiErr: (e) => e, toast() {} })).replace(/<!-- -->/g, '');
  assert.match(html, /Perpustakaan kitab/);
  assert.match(html, /Pilih berkas \.txt Syamilah/);
  assert.match(html, /type="file"/);
  assert.match(html, /Segarkan/);
  assert.ok(!/Impor ke perpustakaan/.test(html), 'tombol impor baru muncul setelah berkas dipilih');
});
