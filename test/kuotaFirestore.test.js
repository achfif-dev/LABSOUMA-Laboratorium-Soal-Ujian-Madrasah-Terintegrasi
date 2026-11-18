// Hemat kuota baca Firestore (paket gratis 50.000 baca/hari): cache peran, cache daftar riwayat, cache dasbor, dan galat jelas saat kuota habis.
import test from 'node:test';
import assert from 'node:assert/strict';
import { __setFirebaseForTest, authenticateAuthor, authenticateAdmin, kosongkanCachePeran, firebaseError, denganBatasWaktu, kuotaHabis } from '../src/platform.js';
import { daftarRiwayat, kosongkanCacheRiwayat } from '../src/configBackup.js';
import handlerStats, { kosongkanCacheDasbor } from '../src/rute/admin-stats.js';
import { fakeDb } from './_fakeDb.js';

// Firestore tiruan yang menghitung berapa kali users/{uid} dibaca.
function mk(data, { gagal = null } = {}) {
  const db = fakeDb(data); const hitung = { users: 0, koleksi: 0 };
  const doc = db.doc.bind(db); const collection = db.collection.bind(db);
  db.doc = (p) => { const r = doc(p); if (p.startsWith('users/')) { const g = r.get; r.get = async () => { hitung.users++; if (gagal && gagal.on) throw gagal.err; return g(); }; } return r; };
  db.collection = (n) => { const c = collection(n); const g = c.get.bind(c); c.get = async () => { hitung.koleksi++; return g(); }; const o = c.orderBy.bind(c); c.orderBy = (...a) => { const q = o(...a); const l = q.limit.bind(q); q.limit = (n2) => { const q2 = l(n2); const s = q2.select.bind(q2); q2.select = (...f) => { const q3 = s(...f); const g3 = q3.get.bind(q3); q3.get = async () => { hitung.koleksi++; return g3(); }; return q3; }; return q2; }; return q; }; return c; };
  return { fb: { db, auth: { verifyIdToken: async (t) => ({ uid: t.replace('tok_', 'u_') }) }, FieldValue: {} }, hitung };
}
const req = (tok, body = {}) => ({ method: 'POST', headers: { authorization: 'Bearer ' + tok }, body });
const mkRes = () => { const r = { h: {}, setHeader(k, v) { r.h[k] = v; }, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; };

test('peran pengguna dibaca sekali lalu dipakai dari cache untuk permintaan berikutnya', async () => {
  const { fb, hitung } = mk({ 'users/u_a': { role: 'penyusun' } }); __setFirebaseForTest(fb);
  try {
    for (let i = 0; i < 5; i++) assert.equal((await authenticateAuthor(req('tok_a'))).role, 'penyusun');
    assert.equal(hitung.users, 1);
    kosongkanCachePeran('u_a'); await authenticateAuthor(req('tok_a')); assert.equal(hitung.users, 2);
  } finally { __setFirebaseForTest(null); }
});

test('ROLE_CACHE_SECONDS=0 menonaktifkan cache peran', async () => {
  const { fb, hitung } = mk({ 'users/u_a': { role: 'admin' } }); __setFirebaseForTest(fb); process.env.ROLE_CACHE_SECONDS = '0';
  try { await authenticateAdmin(req('tok_a')); await authenticateAdmin(req('tok_a')); assert.equal(hitung.users, 2); }
  finally { delete process.env.ROLE_CACHE_SECONDS; __setFirebaseForTest(null); }
});

test('Firestore gagal (kuota habis): peran terakhir yang diketahui tetap dipakai; tanpa cache -> galat 503 jelas', async () => {
  const gagal = { on: false, err: Object.assign(new Error('8 RESOURCE_EXHAUSTED: Quota exceeded'), { code: 8 }) };
  const { fb } = mk({ 'users/u_a': { role: 'editor' } }, { gagal }); __setFirebaseForTest(fb);
  process.env.ROLE_CACHE_SECONDS = '0.001'; // kedaluwarsa hampir seketika, tetapi masih "usang tapi dikenal"
  try {
    await authenticateAuthor(req('tok_a')); // terisi
    await new Promise((r) => setTimeout(r, 10));
    gagal.on = true;
    assert.equal((await authenticateAuthor(req('tok_a'))).role, 'editor'); // jatuh ke cache lama
    kosongkanCachePeran();
    await assert.rejects(authenticateAuthor(req('tok_a')), (e) => e.code === 8);
    const e = firebaseError(gagal.err);
    assert.equal(e.status, 503); assert.equal(e.code, 'FIRESTORE_QUOTA'); assert.ok(e.retryAfter > 0); assert.match(e.message, /15\.00 WIB/);
  } finally { delete process.env.ROLE_CACHE_SECONDS; __setFirebaseForTest(null); }
});

test('kuotaHabis mengenali kode gRPC 8, resource-exhausted, dan pesan Quota exceeded', () => {
  assert.ok(kuotaHabis({ code: 8 })); assert.ok(kuotaHabis({ code: 'resource-exhausted' })); assert.ok(kuotaHabis(new Error('Quota exceeded.')));
  assert.ok(!kuotaHabis({ code: 5 })); assert.ok(!kuotaHabis(null));
});

test('denganBatasWaktu: janji lambat ditolak 503 (bukan menggantung sampai 504)', async () => {
  await assert.rejects(denganBatasWaktu(new Promise(() => {}), 20), (e) => e.status === 503 && e.code === 'FIRESTORE_LAMBAT');
  assert.equal(await denganBatasWaktu(Promise.resolve(7), 20), 7);
});

test('daftarRiwayat memakai cache; segarkan:true dan perubahan membuangnya', async () => {
  const data = { 'configRiwayatApp/a': { tipe: 'otomatis', dibuatAt: '2026-01-01', ringkas: {} } };
  const { fb, hitung } = mk(data); __setFirebaseForTest(fb); kosongkanCacheRiwayat();
  try {
    const a = await daftarRiwayat('app'); const b = await daftarRiwayat('app');
    assert.equal(hitung.koleksi, 1); assert.deepEqual(a, b);
    await daftarRiwayat('app', { segarkan: true }); assert.equal(hitung.koleksi, 2);
    await daftarRiwayat('ai'); assert.equal(hitung.koleksi, 3); // jenis lain punya cache sendiri
  } finally { kosongkanCacheRiwayat(); __setFirebaseForTest(null); }
});

test('/api/admin-stats: hasil di-cache di server; segarkan:true melewati cache', async () => {
  const { fb, hitung } = mk({ 'users/u_admin': { role: 'admin' } }); __setFirebaseForTest(fb); kosongkanCacheDasbor();
  try {
    const r1 = mkRes(); await handlerStats(req('tok_admin', { ringkas: true }), r1); assert.equal(r1.code, 200);
    const sebelum = hitung.users;
    const r2 = mkRes(); await handlerStats(req('tok_admin', { ringkas: true }), r2); assert.equal(r2.code, 200);
    assert.deepEqual(r2.body, r1.body);
    assert.equal(hitung.users, sebelum); // peran dari cache, dasbor dari cache: tanpa baca baru
  } finally { kosongkanCacheDasbor(); __setFirebaseForTest(null); }
});
