// UI tahap 1 dan 3: render SSR (tidak gagal dirender, teks kunci muncul) dan kelengkapan pemetaan label terhadap semua status yang bisa dikembalikan server.
// Tidak menguji interaksi di browser (klik, jaringan).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import { verifikasiPoin, ringkasVerifikasi } from '../web/lib/telaahKitab.js';
import { periksaSoalDenganTeks } from '../web/lib/periksaRujukan.js';

let vite; let Tanya; let Periksa;
before(async () => {
  globalThis.window ??= globalThis; globalThis.document ??= { visibilityState: 'visible' };
  vite = await createServer({ root: process.cwd(), server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
  Tanya = await vite.ssrLoadModule('/web/TanyaKitab.jsx'); Periksa = await vite.ssrLoadModule('/web/PeriksaRujukan.jsx');
});
after(async () => { if (vite) await vite.close(); });
const h = (C, props) => renderToString(React.createElement(C, props)).replace(/<!-- -->/g, '');
const Btn = ({ children, ...p }) => React.createElement('button', p, children);
const ErrorBox = ({ e }) => React.createElement('p', null, e && e.message);
const dasar = { Btn, ErrorBox, callApi: async () => ({}), apiErr: (e) => e };

test('TanyaKitab dan PeriksaRujukan dirender: judul, peringatan "bukan fatwa", tombol', () => {
  const a = h(Tanya.default, dasar);
  assert.match(a, /Tanya kitab/); assert.match(a, /bukan fatwa/); assert.match(a, /Semua kitab aktif \(maksimal 4\)/); assert.match(a, /name="tk-mode"[^>]*checked/, 'bawaan: semua kitab aktif terpilih'); assert.match(a, /<button[^>]*disabled/, 'tombol Tanya nonaktif sebelum ada pertanyaan');
  const b = h(Periksa.default, { ...dasar, soal: { kitabId: 'fathul-muin', halId: 'p00002' } });
  assert.match(b, /Periksa dengan halaman rujukan/);
});

test('setiap status yang bisa dikembalikan server punya label dan banner', () => {
  const halaman = new Map([['H1', { teks: 'نواقض الوضوء أربعة الخارج من أحد السبيلين' }]]);
  const statusPoin = new Set(verifikasiPoin([
    { halaman_id: 'H1', kutipan: 'نواقض الوضوء أربعة الخارج' }, { halaman_id: 'H1', kutipan: 'نواقض الوضوء خمسة الخارج من أحد' },
    { halaman_id: 'H1', kutipan: 'يجب سجود التلاوة عند كل آية' }, { halaman_id: 'H1', kutipan: 'x' }, { halaman_id: 'H9', kutipan: 'يجب سجود التلاوة عند كل آية' },
  ], halaman).map((p) => p.status));
  for (const s of statusPoin) assert.ok(Tanya.LABEL_VERIFIKASI[s], `label untuk ${s}`);
  const ringkas = new Set([ringkasVerifikasi([], false).status, ringkasVerifikasi([{ status: 'cocok' }], true).status, ringkasVerifikasi([{ status: 'cocok' }, { status: 'tidak_cocok' }], true).status, ringkasVerifikasi([{ status: 'tidak_cocok' }], true).status, ringkasVerifikasi([{ status: 'mirip' }], true).status]);
  for (const s of ringkas) assert.ok(Tanya.BANNER_STATUS[s], `banner untuk ${s}`);
  const soal = { bentuk: 'pilgan', kunci: 'A', opsi: { A: 'x', B: 'y' } };
  for (const t of ['x', 'نواقض الوضوء أربعة']) assert.ok(Periksa.LABEL_PERIKSA[periksaSoalDenganTeks(soal, t).status]);
});

test('soalUntukPeriksa hanya meneruskan bidang yang dibaca server dan memberi bawaan aman', () => {
  const s = Periksa.soalUntukPeriksa({ kunci: 'B', opsi: { A: 'a' }, rahasia: 'jangan', ai: { x: 1 } });
  assert.deepEqual(Object.keys(s).sort(), ['bentuk', 'halId', 'halIdAkhir', 'jawaban', 'kitabId', 'kunci', 'opsi', 'pembahasan', 'pertanyaan', 'rubrik', 'stimulus'].sort());
  assert.equal(s.bentuk, 'pilgan'); assert.equal('rahasia' in s, false);
});
