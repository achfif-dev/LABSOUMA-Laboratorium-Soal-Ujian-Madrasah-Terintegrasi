import test from 'node:test';
import assert from 'node:assert/strict';
import { __setFirebaseForTest } from '../src/platform.js';
import { invalidateAppConfig } from '../src/appConfig.js';
import { invalidateTampilan, bacaTampilan } from '../src/tampilan.js';
import appConfigHandler from '../src/rute/app-config.js';
import { fakeDb } from './_fakeDb.js';

function pasang() {
  const db = fakeDb({ 'users/a': { role: 'admin' }, 'users/p': { role: 'penyusun' }, 'users/z': { role: 'pending' } });
  const tokens = { adm: { uid: 'a', email: 'a@x.id' }, pen: { uid: 'p' }, tamu: { uid: 'z' } };
  __setFirebaseForTest({ data: db.data, auth: { verifyIdToken: async (t) => { if (!tokens[t]) throw new Error('bad'); return tokens[t]; } }, FieldValue: { serverTimestamp: () => 'TS' }, db });
  invalidateAppConfig(); invalidateTampilan();
  return db;
}
const mk = () => ({ h: {}, setHeader(k, v) { this.h[k] = v; }, status(c) { this.code = c; return this; }, json(o) { this.body = o; return this; } });
const kirim = async (token, body) => { const res = mk(); await appConfigHandler({ method: 'POST', headers: token ? { authorization: 'Bearer ' + token } : {}, body }, res); return res; };

test('tampilan: semua pengguna aktif membaca (bawaan bila belum diatur); hanya admin menyimpan; masukan dinormalkan sebelum disimpan', async () => {
  const db = pasang();
  try {
    let r = await kirim('pen', { aksi: 'baca' }); assert.equal(r.code, 200); assert.deepEqual(r.body.tampilan, { templat: 'zamrud', ganti: {} });
    r = await kirim('tamu', { aksi: 'baca' }); assert.equal(r.code, 403);
    r = await kirim('pen', { aksi: 'tampilansimpan', tampilan: { templat: 'marun' } }); assert.equal(r.code, 403);
    r = await kirim(null, { aksi: 'tampilansimpan', tampilan: { templat: 'marun' } }); assert.equal(r.code, 401);
    r = await kirim('adm', { aksi: 'tampilansimpan' }); assert.equal(r.code, 400);
    r = await kirim('adm', { aksi: 'tampilansimpan', tampilan: 'x' }); assert.equal(r.code, 400);
    r = await kirim('adm', { aksi: 'tampilansimpan', tampilan: { templat: 'samudra', ganti: { lebar: 'lebar', sudut: 'bulat', huruf: 'comic', warnaUtama: '#ABCDEF', x: '<script>' } } });
    assert.equal(r.code, 200); assert.deepEqual(r.body.tampilan, { templat: 'samudra', ganti: { lebar: 'lebar', warnaUtama: '#abcdef' } });
    assert.deepEqual(db.data['config/tampilan'].tampilan, r.body.tampilan); assert.equal(db.data['config/tampilan'].updatedBy, 'a@x.id');
    r = await kirim('pen', { aksi: 'baca' }); assert.deepEqual(r.body.tampilan, { templat: 'samudra', ganti: { lebar: 'lebar', warnaUtama: '#abcdef' } }, 'pengguna lain langsung melihat (cache dibuang saat simpan)');
    r = await kirim('adm', { aksi: 'tampilansimpan', tampilan: { templat: 'zamrud' } }); assert.deepEqual(r.body.tampilan, { templat: 'zamrud', ganti: {} }, 'kembali ke bawaan = simpan template bawaan');
  } finally { __setFirebaseForTest(null); invalidateTampilan(); }
});

test('tampilan: data rusak di Firestore atau Firestore gagal -> tampilan bawaan, tidak melempar', async () => {
  const db = pasang(); db.data['config/tampilan'] = { tampilan: { templat: 'x', ganti: { warnaUtama: '</style><script>' } } };
  try {
    assert.deepEqual(await bacaTampilan({ now: Date.now() }), { templat: 'zamrud', ganti: {} });
    invalidateTampilan(); __setFirebaseForTest({ db: { doc: () => ({ get: async () => { throw new Error('unavailable'); } }) } });
    assert.deepEqual(await bacaTampilan(), { templat: 'zamrud', ganti: {} });
  } finally { __setFirebaseForTest(null); invalidateTampilan(); }
});
