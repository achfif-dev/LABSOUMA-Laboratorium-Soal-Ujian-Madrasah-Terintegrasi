// Komponen teks kitab bersorot: render SSR dan pemakaian di Bank Soal, tampilan Ustadz, dan kartu Review.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

let vite; let M;
before(async () => {
  globalThis.window ??= globalThis; globalThis.document ??= { visibilityState: 'visible' };
  vite = await createServer({ root: process.cwd(), server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
  M = await vite.ssrLoadModule('/web/TeksKitabSorot.jsx');
});
after(async () => { if (vite) await vite.close(); });
const h = (el) => renderToString(el).replace(/<!-- -->/g, '');
const Q = { teks: 'والصيد مصدر أطلق هنا. (وشرائط تعليمها) أي الجوارحِ (أربعةٌ): أحدها أن يكون لها معلِّم، والثاني أن تسترسل.', pembahasan: 'Kutipan kitab: وشرائط تعليمها أي الجوارح أربعة', opsi: { A: 'salah satunya harus terbiasa استرسل ketika dilepaskan' } };

test('TeksKitabSorot: bagian yang dikutip dibungkus <mark>, ada tombol lompat berlabel bidang, dan keterangan', () => {
  const a = h(React.createElement(M.TeksKitabSorot, { q: Q }));
  assert.match(a, /<mark[^>]*data-rujukan="0"[^>]*>وشرائط تعليمها\) أي الجوارحِ \(أربعةٌ<\/mark>/);
  assert.match(a, /<button[^>]*>Pembahasan<\/button>/); assert.match(a, /Rujukan soal:/); assert.match(a, /dikutip oleh soal atau pembahasan/);
  assert.match(a, /max-h-72 overflow-y-auto/); assert.match(a, /dir="rtl" lang="ar"/);
  assert.match(a, /underline decoration-warn/); assert.ok(!/decoration-dashed/.test(a), 'cocok persis: garis penuh, bukan putus-putus');
});

test('TeksKitabSorot: mode halaman tanpa batas tinggi; kutipan mirip bergaris putus; kutipan hilang dilaporkan', () => {
  const mirip = h(React.createElement(M.TeksKitabSorot, { q: { ...Q, pembahasan: 'وشرائط تعليمها أي الجوارح خمسة' }, gulir: 'halaman', kelas: 'ar' }));
  assert.ok(!/max-h-72/.test(mirip)); assert.match(mirip, /decoration-dashed/); assert.match(mirip, /\(mirip\)/); assert.match(mirip, /hanya mirip, periksa manual/);
  const hilang = h(React.createElement(M.TeksKitabSorot, { q: { ...Q, pembahasan: 'هذا كلام لا يوجد أصلا في النص أبدا' } }));
  assert.ok(!/<mark/.test(hilang)); assert.match(hilang, /1 kutipan \(Pembahasan\) tidak ditemukan di teks ini/);
});

test('TeksKitabLipat: tertutup tidak menghitung sorotan; bukaAwal menampilkannya; anak (sumber) ikut', () => {
  const tutup = h(React.createElement(M.TeksKitabLipat, { q: Q }));
  assert.match(tutup, /Lihat teks kitab/); assert.ok(!/<mark/.test(tutup));
  const buka = h(React.createElement(M.TeksKitabLipat, { q: Q, bukaAwal: true }, React.createElement('p', null, 'Sumber: contoh')));
  assert.match(buka, /<details[^>]*open/); assert.match(buka, /<mark/); assert.match(buka, /Sumber: contoh/);
});

test('Bank Soal, tampilan Ustadz, dan kartu Review memakai teks kitab bersorot', () => {
  assert.match(readFileSync('web/BankTab.jsx', 'utf8'), /<TeksKitabLipat q=\{q\}>/);
  assert.match(readFileSync('web/AppUstadz.jsx', 'utf8'), /<TeksKitabLipat q=\{q\} \/>/);
  assert.match(readFileSync('web/ReviewTab.jsx', 'utf8'), /<TeksKitabSorot q=\{q\} gulir="halaman" kelas="ar" \/>/);
});
