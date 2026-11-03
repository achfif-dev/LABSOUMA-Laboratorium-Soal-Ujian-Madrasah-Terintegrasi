// Interaksi koreksi teks x tambah jilid x impor ulang bertahap: indeks pencarian dan simpanan harus tetap benar.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSyamilah } from '../src/syamilah.js';
import { jalankanImpor, isianAwal, muatanMulai } from '../web/lib/imporKitab.js';
import { __setFirebaseForTest } from '../src/platform.js';
import { kosongkanSimpananCari } from '../src/kitabCari.js';
import handler from '../api/kitab.js';
import { fakeDb } from './_fakeDb.js';

const J = 'فتح المعين';
const buku = (awalan, n) => [`${J}   (المعبري)`, 'القسم: الفقه الشافعي', `الكتاب: ${J}`, 'المؤلف: المعبري (ت 987هـ)', '[ترقيم الكتاب موافق للمطبوع]',
  ...Array.from({ length: n }, (_, i) => [`${J}(ص: ${i + 1})`, `${awalan} ${i + 1}`]).flat()].join('\r\n');
const mkRes = () => { const r = { h: {}, setHeader(k, v) { r.h[k] = v; }, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; };
const sebagai = (token) => async (body) => { const r = mkRes(); await handler({ method: 'POST', headers: { authorization: 'Bearer ' + token }, body }, r); if (r.code !== 200) throw { ...r.body.error, status: r.code }; return r.body; };
async function siapkan(fn) {
  const db = fakeDb({ 'users/u_admin': { role: 'admin' }, 'users/u_editor': { role: 'editor' } });
  __setFirebaseForTest({ db, auth: { verifyIdToken: async (t) => ({ uid: t.replace('tok_', 'u_'), name: t }) }, FieldValue: {} }); kosongkanSimpananCari();
  try { return await fn(db); } finally { __setFirebaseForTest(null); kosongkanSimpananCari(); }
}
const ISIAN = (h) => ({ ...isianAwal(h), judulLatin: "Fathul Mu'in", kitabId: 'fathul-muin' });
const cari = (u, q) => u({ aksi: 'perpus-cari', kitabId: 'fathul-muin', q });

test('koreksi pada halaman jilid tambahan: indeks pencarian ikut berubah dan halaman lama tak tersentuh', () => siapkan(async (db) => {
  const admin = sebagai('tok_admin'); const editor = sebagai('tok_editor');
  const j1 = parseSyamilah(buku('الجزء الأول', 4)); const j2 = parseSyamilah(buku('الجزء الثاني', 3));
  await jalankanImpor({ panggil: admin, hasil: j1, isian: ISIAN(j1) });
  await jalankanImpor({ panggil: admin, hasil: j2, isian: { ...ISIAN(j2), tambah: true } });
  assert.equal(db.data['kitab/fathul-muin'].jumlahHalaman, 7);
  assert.equal((await cari(editor, 'الثاني')).total, 3);
  const hal6 = (await editor({ aksi: 'perpus-halaman', kitabId: 'fathul-muin', dariSeq: 6 })).halaman[0];
  const r = await editor({ aksi: 'perpus-koreksi', kitabId: 'fathul-muin', seq: 6, rev: 0, teks: 'الجزء الثالث المصحح 2' });
  assert.equal(r.ok, true);
  assert.equal((await cari(editor, 'الثالث')).total, 1, 'ejaan baru ditemukan');
  assert.equal((await cari(editor, 'الثاني')).total, 2, 'ejaan lama di halaman itu tak ditemukan lagi, halaman lain utuh');
  assert.equal((await cari(editor, 'الأول')).total, 4, 'jilid pertama tak tersentuh');
  assert.equal(hal6.seq, 6);
}));

test('koreksi di kitab lama (indeks belum dibangun) dan sesudah impor ulang bertahap: tidak merusak indeks baru', () => siapkan(async (db) => {
  const admin = sebagai('tok_admin'); const editor = sebagai('tok_editor');
  const a = parseSyamilah(buku('الأصل', 3));
  await jalankanImpor({ panggil: admin, hasil: a, isian: ISIAN(a) });
  await editor({ aksi: 'perpus-koreksi', kitabId: 'fathul-muin', seq: 2, rev: 0, teks: 'الأصل المصحح' });
  const b = parseSyamilah(buku('البديل', 3));
  await jalankanImpor({ panggil: admin, hasil: b, isian: { ...ISIAN(b), timpa: true } });
  assert.equal(db.data['kitab/fathul-muin'].koreksi, undefined, 'impor ulang membuang penghitung koreksi');
  assert.equal((await cari(editor, 'البديل')).total, 3);
  assert.equal((await cari(editor, 'الأصل')).total, 0, 'indeks lama tak ikut');
  // koreksi sesudah peralihan menulis ke ruang baru
  const r = await editor({ aksi: 'perpus-koreksi', kitabId: 'fathul-muin', seq: 1, rev: 0, teks: 'البديل المنقح' });
  assert.equal(r.ok, true);
  assert.ok(Object.keys(db.data).some((p) => p.startsWith('kitab/fathul-muin/halaman_r2/')));
  assert.equal((await cari(editor, 'المنقح')).total, 1);
}));
