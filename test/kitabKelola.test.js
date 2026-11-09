// Kelola kitab dari aplikasi: hapus (impor-hapus), sunting data (impor-ubah), sisa kitab yang dihapus lewat Firebase console, dan ringkasan daftar kitab.
import test from 'node:test';
import assert from 'node:assert/strict';
import { __setFirebaseForTest } from '../src/platform.js';
import handler from '../api/kitab.js';
import { DOK_RINGKAS } from '../src/daftarKitab.js';
import { fakeDb } from './_fakeDb.js';

function mkFirebase(data) {
  const db = fakeDb(data);
  const role = { tok_admin: 'admin', tok_editor: 'editor' };
  return { db, auth: { verifyIdToken: async (t) => { if (!role[t]) throw new Error('bad'); return { uid: t.replace('tok_', 'u_') }; } }, FieldValue: {} };
}
const mkRes = () => { const r = { h: {}, setHeader(k, v) { r.h[k] = v; }, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; };
const lewat = async (token, body) => { const r = mkRes(); await handler({ method: 'POST', headers: { authorization: 'Bearer ' + token }, body }, r); return r; };
const admin = async (body) => { const r = await lewat('tok_admin', body); if (r.code !== 200) throw Object.assign(new Error(r.body.error.message), { ...r.body.error, status: r.code }); return r.body; };
const dengan = async (data, fn) => { const fb = mkFirebase({ 'users/u_admin': { role: 'admin', name: 'Admin' }, 'users/u_editor': { role: 'editor', name: 'Editor' }, ...data }); __setFirebaseForTest(fb); try { return await fn(fb.db); } finally { __setFirebaseForTest(null); } };

const meta = (o = {}) => ({ judul: 'فتح المعين', judulLatin: "Fathul Mu'in", pengarang: 'المليباري', fan: 'فقه', mazhab: 'syafii', jumlahHalaman: 2, jumlahJuz: 1, bentukMatn: 'tanpa-pemisah', status: 'siap', aktif: true, revisi: 1,
  edisi: { penerbit: 'Dar', muhaqqiq: '', cetakan: '' }, hakCipta: { status: 'belum-dicek', catatan: '' }, otoritas: { status: 'muktamad', akidah: 'aswaja', catatan: 'ok' }, ...o });
function seedKitab(id, o = {}) {
  return {
    [`kitab/${id}`]: meta(o),
    [`kitab/${id}/halaman/p00001`]: { seq: 1, teks: 'a' }, [`kitab/${id}/halaman/p00002`]: { seq: 2, teks: 'b' },
    [`kitab/${id}/cari/c00001`]: { x: 1 }, [`kitab/${id}/cari/meta`]: { status: 'siap' },
    [`kitab/${id}/daftar/isi`]: { entri: [], jumlah: 0 },
    [`kitab/${id}/koreksi/k1`]: { seq: 1 }, [`kitab/${id}/otoritasRiwayat/r1`]: { oleh: 'u_admin' },
    [`kitab/${id}/halaman_r2/p00001`]: { seq: 1 }, // sisa impor ulang
  };
}
const milik = (db, id) => Object.keys(db.data).filter((p) => p === `kitab/${id}` || p.startsWith(`kitab/${id}/`));

test('impor-hapus: butuh konfirmasi ID; lalu kitab, semua subkoleksi, dan ringkasan daftar hilang; kitab lain utuh', () => dengan({ ...seedKitab('rusak'), ...seedKitab('baik') }, async (db) => {
  await assert.rejects(admin({ aksi: 'impor-hapus', kitabId: 'rusak' }), (e) => e.status === 422 && e.code === 'KONFIRMASI_SALAH');
  await assert.rejects(admin({ aksi: 'impor-hapus', kitabId: 'rusak', konfirmasi: 'baik' }), (e) => e.status === 422);
  assert.equal(milik(db, 'rusak').length, 9);
  db.data[DOK_RINGKAS] = { versi: 1, at: Date.now(), kitab: [{ id: 'rusak' }] };
  const r = await admin({ aksi: 'impor-hapus', kitabId: 'rusak', konfirmasi: 'rusak' });
  assert.equal(r.ok, true); assert.equal(r.halamanDihapus, 3); assert.equal(r.adaDokumen, true);
  assert.deepEqual(milik(db, 'rusak'), []);          // termasuk halaman_r2, cari, daftar, koreksi, otoritasRiwayat
  assert.equal(milik(db, 'baik').length, 9);
  assert.equal(DOK_RINGKAS in db.data, false);        // ringkasan dibuang: pembaca tidak lagi menampilkan kitab itu
  const daftar = await admin({ aksi: 'perpus-daftar' });
  assert.deepEqual(daftar.kitab.map((k) => k.id), ['baik']);
}));

test('impor-hapus: kitab yang impornya rusak (status mengimpor, tidak aktif) juga bisa dihapus', () => dengan(seedKitab('setengah', { status: 'mengimpor', aktif: false }), async (db) => {
  await admin({ aksi: 'impor-hapus', kitabId: 'setengah', konfirmasi: 'setengah' });
  assert.deepEqual(milik(db, 'setengah'), []);
}));

test('impor-hapus: melaporkan soal yang masih menautkan kitab (teks soal tidak ikut dihapus)', () => dengan({ ...seedKitab('xx'), 'soal/s1': { kitabId: 'xx', teks: 'salinan' }, 'soal/s2': { kitabId: 'lain' } }, async (db) => {
  const r = await admin({ aksi: 'impor-hapus', kitabId: 'xx', konfirmasi: 'xx' });
  assert.equal(r.soalTerkait, 1); assert.ok(db.data['soal/s1'] && db.data['soal/s2']);
}));

test('hapus lewat console meninggalkan sisa: impor-daftar cariSisa menemukannya, impor-hapus membersihkannya', () => dengan(seedKitab('hantu'), async (db) => {
  delete db.data['kitab/hantu']; // yang dilakukan Firebase console: hanya dokumen induk, subkoleksi tertinggal
  assert.ok(Object.keys(db.data).some((p) => p.startsWith('kitab/hantu/')));
  assert.deepEqual((await admin({ aksi: 'impor-daftar' })).sisa, undefined); // tanpa permintaan, tidak menghitung pembacaan tambahan
  const d = await admin({ aksi: 'impor-daftar', cariSisa: true });
  assert.deepEqual(d.kitab, []); assert.deepEqual(d.sisa, ['hantu']);
  const r = await admin({ aksi: 'impor-hapus', kitabId: 'hantu', konfirmasi: 'hantu' });
  assert.equal(r.adaDokumen, false); assert.equal(r.halamanDihapus, 3);
  assert.deepEqual(milik(db, 'hantu'), []);
  assert.deepEqual((await admin({ aksi: 'impor-daftar', cariSisa: true })).sisa, []);
}));

test('impor ulang ke ID yang dulu dihapus lewat console tidak bercampur dengan halaman lama', () => dengan({ 'kitab/baru/halaman/p00009': { seq: 9, teks: 'lama' }, 'kitab/baru/cari/c00009': { x: 1 } }, async (db) => {
  const kitab = { judul: 'ب', judulLatin: 'Baru', bentukMatn: 'tanpa-pemisah', jumlahHalaman: 1, jumlahJuz: 1 };
  await admin({ aksi: 'impor-mulai', kitabId: 'baru', kitab, daftarIsi: [] });
  assert.equal('kitab/baru/halaman/p00009' in db.data, false); assert.equal('kitab/baru/cari/c00009' in db.data, false);
}));

test('impor-ubah: mengganti data kitab tanpa menyentuh isi, status, revisi, atau otoritas; ringkasan dibuang', () => dengan(seedKitab('fm'), async (db) => {
  db.data[DOK_RINGKAS] = { versi: 1, at: Date.now(), kitab: [{ id: 'fm', judulLatin: 'Lama' }] };
  await admin({ aksi: 'impor-ubah', kitabId: 'fm', kitab: { judul: 'فتح المعين بشرح قرة العين', judulLatin: "Fathul Mu'in (syarah)", pengarang: 'Zainuddin al-Malibari', wafatH: 987, fan: 'Fikih', mazhab: 'syafii', edisi: { penerbit: 'Dar Ibn Hazm', muhaqqiq: '', cetakan: '1' }, hakCipta: { status: 'domain-publik', catatan: 'wafat > 70 th' } } });
  const m = db.data['kitab/fm'];
  assert.equal(m.judulLatin, "Fathul Mu'in (syarah)"); assert.equal(m.pengarang, 'Zainuddin al-Malibari'); assert.equal(m.wafatH, 987); assert.equal(m.hakCipta.status, 'domain-publik'); assert.equal(m.edisi.penerbit, 'Dar Ibn Hazm');
  assert.equal(m.status, 'siap'); assert.equal(m.aktif, true); assert.equal(m.revisi, 1); assert.equal(m.jumlahHalaman, 2); assert.equal(m.otoritas.status, 'muktamad'); assert.equal(m.diubahOleh, 'u_admin');
  assert.equal(db.data['kitab/fm/halaman/p00001'].teks, 'a');
  assert.equal(DOK_RINGKAS in db.data, false);
  const d = await admin({ aksi: 'perpus-daftar' });
  assert.equal(d.kitab[0].judulLatin, "Fathul Mu'in (syarah)"); assert.equal(d.kitab[0].pengarang, 'Zainuddin al-Malibari');
  const l = (await admin({ aksi: 'impor-daftar' })).kitab[0];
  assert.equal(l.wafatH, 987); assert.equal(l.edisi.cetakan, '1'); assert.equal(l.hakCiptaCatatan, 'wafat > 70 th'); // bahan form sunting
}));

test('impor-ubah: menolak masukan cacat dan kitab yang tidak ada', () => dengan(seedKitab('fm'), async (db) => {
  const ok = { judul: 'ب', judulLatin: 'B', mazhab: '', hakCipta: { status: 'belum-dicek' } };
  for (const [kitab, kode] of [[{ ...ok, judulLatin: '' }, 'KITAB_INVALID'], [{ ...ok, judul: '' }, 'KITAB_INVALID'], [{ ...ok, mazhab: 'xyz' }, 'KITAB_INVALID'], [{ ...ok, wafatH: 0 }, 'KITAB_INVALID'], [{ ...ok, hakCipta: { status: 'bebas' } }, 'KITAB_INVALID'], [null, 'KITAB_INVALID']]) {
    await assert.rejects(admin({ aksi: 'impor-ubah', kitabId: 'fm', kitab }), (e) => e.status === 422 && e.code === kode);
  }
  await assert.rejects(admin({ aksi: 'impor-ubah', kitabId: 'tidak-ada', kitab: ok }), (e) => e.status === 404);
  assert.equal(db.data['kitab/fm'].judulLatin, "Fathul Mu'in"); // tidak ada yang berubah
}));

test('impor-ubah saat impor ulang bertahap berjalan: perubahan ikut ke metadata run supaya tidak tertimpa saat peralihan', () => dengan({ ...seedKitab('fm'), 'kitab/fm/impor/berjalan': { revisi: 2, ruang: '_r2', kitab: { judulLatin: "Fathul Mu'in", pengarang: 'lama' }, jumlahHalaman: 2 } }, async (db) => {
  await admin({ aksi: 'impor-ubah', kitabId: 'fm', kitab: { judul: 'ب', judulLatin: 'Baru', pengarang: 'Baru', mazhab: '', hakCipta: { status: 'belum-dicek' } } });
  assert.equal(db.data['kitab/fm/impor/berjalan'].kitab.pengarang, 'Baru'); assert.equal(db.data['kitab/fm/impor/berjalan'].kitab.judulLatin, 'Baru');
}));

test('hanya admin: editor ditolak 403 untuk impor-ubah dan impor-hapus', () => dengan(seedKitab('fm'), async (db) => {
  for (const aksi of ['impor-ubah', 'impor-hapus']) { const r = await lewat('tok_editor', { aksi, kitabId: 'fm', konfirmasi: 'fm', kitab: {} }); assert.equal(r.code, 403, aksi); }
  assert.equal(milik(db, 'fm').length, 9);
}));

test('Segarkan (segarkanBaca) membuang ringkasan daftar: perubahan di luar aplikasi tampil di pembaca tanpa menunggu 15 menit', () => dengan(seedKitab('a'), async (db) => {
  const d1 = await admin({ aksi: 'perpus-daftar' }); assert.deepEqual(d1.kitab.map((k) => k.id), ['a']); assert.ok(DOK_RINGKAS in db.data);
  delete db.data['kitab/a']; // hapus lewat console
  const stale = await admin({ aksi: 'perpus-daftar' }); assert.deepEqual(stale.kitab.map((k) => k.id), ['a']); // masih basi: itulah gejala awal
  await admin({ aksi: 'impor-daftar', segarkanBaca: true });
  assert.equal(DOK_RINGKAS in db.data, false);
  // memori instance 60 detik pada server nyata dilewati di sini karena tiap tes memakai instance Firestore baru; di produksi batalkanDaftar juga membersihkannya
}));
