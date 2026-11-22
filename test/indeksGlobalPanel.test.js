// Panel admin indeks lintas kitab: render SSR (keadaan awal) dan pemakaian di layar Perpustakaan.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

let vite; let Panel;
before(async () => {
  globalThis.window ??= globalThis; globalThis.document ??= { visibilityState: 'visible' };
  vite = await createServer({ root: process.cwd(), server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
  Panel = (await vite.ssrLoadModule('/web/IndeksGlobalPanel.jsx')).default;
});
after(async () => { if (vite) await vite.close(); });
const Btn = ({ children, disabled, onClick, kind }) => React.createElement('button', { disabled, onClick, 'data-kind': kind }, children);
const h = (props) => renderToString(React.createElement(Panel, { Btn, ErrorBox: () => null, callApi: async () => ({}), apiErr: (e) => e, toast: () => {}, ...props })).replace(/<!-- -->/g, '');

test('panel indeks lintas kitab dirender: judul, tombol dinonaktifkan sampai status termuat, penjelasan', () => {
  const a = h({});
  assert.match(a, /Indeks pencarian lintas kitab/); assert.match(a, /Memuat status indeks/); assert.match(a, /<button[^>]*disabled/); assert.match(a, /Bangun indeks/);
  assert.match(a, /Untuk apa indeks ini/); assert.match(a, /Kitab yang belum masuk indeks tetap ikut dicari/);
});

test('KitabImpor memasang panel indeks lintas kitab', async () => {
  const { readFileSync } = await import('node:fs');
  const s = readFileSync('web/KitabImpor.jsx', 'utf8');
  assert.match(s, /import IndeksGlobalPanel from '\.\/IndeksGlobalPanel\.jsx'/); assert.match(s, /<IndeksGlobalPanel Btn=\{Btn\}/);
});
