// Render sungguhan (SSR) pemilih kitab dan dua layar yang memakainya (Penyusunan Soal, Paket Dauri): tidak gagal dirender, pemilih muncul,
// dan perilaku "perpustakaan kosong" jelas. Tidak menguji interaksi di browser.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

let vite; let App; let Pemilih; let SIMPANAN;
before(async () => {
  globalThis.window ??= globalThis; globalThis.document ??= { visibilityState: 'visible' };
  vite = await createServer({ root: process.cwd(), server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
  App = await vite.ssrLoadModule('/web/App.jsx');
  const m = await vite.ssrLoadModule('/web/PemilihKitab.jsx'); Pemilih = m.default; SIMPANAN = m.SIMPANAN;
});
after(async () => { if (vite) await vite.close(); });
const h = (C, props) => renderToString(React.createElement(C, props)).replace(/<!-- -->/g, '');
const Btn = ({ children, ...p }) => React.createElement('button', p, children);
const ErrorBox = ({ e }) => React.createElement('p', null, e && e.message);
const dasar = { Btn, ErrorBox, callApi: async () => ({}), apiErr: (e) => e, katalog: [], mode: 'form', onPakai() {} };

test('PemilihKitab: memuat daftar; daftar terisi tampil sebagai pilihan; perpustakaan kosong memberi petunjuk', () => {
  SIMPANAN.daftar = null;
  assert.match(h(Pemilih, dasar), /Memuat daftar kitab/);
  SIMPANAN.daftar = [{ id: 'fathul-muin', judulLatin: "Fathul Mu'in", jumlahHalaman: 673 }, { id: 'fathul-qarib', judulLatin: 'Fathul Qarib', jumlahHalaman: 329 }];
  const t = h(Pemilih, dasar);
  assert.match(t, /Dari Perpustakaan/); assert.match(t, /Fathul Mu&#x27;in \(673 hal\.\)/); assert.match(t, /Fathul Qarib \(329 hal\.\)/); assert.match(t, /Pilih kitab dari perpustakaan/);
  SIMPANAN.daftar = [];
  assert.match(h(Pemilih, dasar), /Perpustakaan kitab masih kosong/);
  SIMPANAN.daftar = null;
});

test('Penyusunan Soal dan Paket Dauri dirender dengan pemilih perpustakaan di dalamnya', () => {
  SIMPANAN.daftar = [{ id: 'fathul-muin', judulLatin: "Fathul Mu'in", jumlahHalaman: 673 }];
  const compose = h(App.Compose, { form: App.emptyForm(), setForm() {}, editingId: null, onSave() {}, onSend() {}, onReset() {}, toast() {} });
  assert.match(compose, /Rujukan Kitab/); assert.match(compose, /Dari Perpustakaan/); assert.match(compose, /Ambil teks dari tautan/);
  const paket = h(App.PaketDauri, { toast() {}, onSimpan() {}, onBukaBank() {} });
  assert.match(paket, /Paket Dauri/); assert.match(paket, /Dari Perpustakaan/); assert.match(paket, /Tempel teks kitab/);
  SIMPANAN.daftar = null;
});
