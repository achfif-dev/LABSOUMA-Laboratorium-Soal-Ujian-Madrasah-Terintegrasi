import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticate, authenticateStaff, ensureProfile, enforceRate, route, __setFirebaseForTest } from '../src/platform.js';
import configHandler from '../api/config.js';
import generateHandler from '../api/generate.js';

/* Firestore palsu minimal: doc(path).get(), runTransaction(tx.get/set/update) */
function fakeFirebase({ users = {}, tokens = {} } = {}) {
  const store = { ...Object.fromEntries(Object.entries(users).map(([k, v]) => [`users/${k}`, v])) };
  const ref = (path) => ({ path, get: async () => ({ exists: path in store, data: () => store[path] }) });
  return {
    store,
    auth: { verifyIdToken: async (t) => { if (!tokens[t]) throw new Error('bad'); return tokens[t]; } },
    FieldValue: { serverTimestamp: () => 'TS' },
    db: {
      doc: ref,
      runTransaction: async (fn) => fn({ get: async (r) => r.get(), set: (r, v) => { store[r.path] = v; }, update: (r, v) => { store[r.path] = { ...store[r.path], ...v }; } }),
    },
  };
}
const req = (token, extra = {}) => ({ method: 'POST', headers: token ? { authorization: 'Bearer ' + token } : {}, body: {}, ...extra });
const mkRes = () => ({ h: {}, setHeader(k, v) { this.h[k] = v; }, status(c) { this.code = c; return this; }, json(o) { this.body = o; return this; } });

test('authenticate: tanpa token atau token salah = 401', async () => {
  __setFirebaseForTest(fakeFirebase({ tokens: { good: { uid: 'u1' } } }));
  await assert.rejects(authenticate(req(null)), { code: 'AUTH_REQUIRED', status: 401 });
  await assert.rejects(authenticate(req('bad')), { code: 'AUTH_REQUIRED' });
  assert.equal((await authenticate(req('good'))).uid, 'u1');
});

test('authenticateStaff: hanya penyusun/editor/admin', async () => {
  __setFirebaseForTest(fakeFirebase({ tokens: { a: { uid: 'a' }, b: { uid: 'b' }, c: { uid: 'c' }, d: { uid: 'd' } }, users: { a: { role: 'penyusun' }, b: { role: 'pending' }, c: { role: 'nonaktif' } } }));
  assert.equal((await authenticateStaff(req('a'))).uid, 'a');
  for (const t of ['b', 'c', 'd']) await assert.rejects(authenticateStaff(req(t)), { code: 'FORBIDDEN_ROLE', status: 403 });
});

test('ensureProfile: admin dari ADMIN_EMAILS, pending untuk lainnya, domain dan verifikasi dicek', async () => {
  const f = fakeFirebase(); __setFirebaseForTest(f);
  process.env.ADMIN_EMAILS = 'Kepala@Gmail.com';
  try {
    await ensureProfile({ uid: 'k', email: 'kepala@gmail.com', email_verified: true, name: 'Kepala' });
    await ensureProfile({ uid: 'g', email: 'guru@gmail.com', email_verified: true });
    assert.equal(f.store['users/k'].role, 'admin'); assert.equal(f.store['users/g'].role, 'pending');
    f.store['users/g'].role = 'penyusun';
    await ensureProfile({ uid: 'g', email: 'guru@gmail.com', email_verified: true });
    assert.equal(f.store['users/g'].role, 'penyusun'); // login ulang tidak menurunkan/mengubah peran
    await assert.rejects(ensureProfile({ uid: 'x', email: 'x@gmail.com', email_verified: false }), { code: 'EMAIL_NOT_VERIFIED' });
    process.env.ALLOWED_EMAIL_DOMAIN = 'madrasahku.sch.id';
    await assert.rejects(ensureProfile({ uid: 'y', email: 'y@gmail.com', email_verified: true }), { code: 'DOMAIN_NOT_ALLOWED' });
    await ensureProfile({ uid: 'z', email: 'z@madrasahku.sch.id', email_verified: true });
  } finally { delete process.env.ADMIN_EMAILS; delete process.env.ALLOWED_EMAIL_DOMAIN; }
});

test('enforceRate: menolak setelah batas, menyimpan hitungan', async () => {
  __setFirebaseForTest(fakeFirebase());
  const lim = { perMinute: 2, perDay: 10 };
  await enforceRate('u', lim); await enforceRate('u', lim);
  await assert.rejects(enforceRate('u', lim), { code: 'RATE_LIMIT_LOCAL', status: 429 });
  await enforceRate('lain', lim);
});

test('route: 405 dan galat seragam, tanpa cache', async () => {
  const res = mkRes();
  await generateHandler({ method: 'GET', headers: {} }, res);
  assert.equal(res.code, 405); assert.equal(res.h.Allow, 'POST'); assert.equal(res.h['Cache-Control'], 'no-store');
  __setFirebaseForTest(fakeFirebase());
  const r2 = mkRes();
  await generateHandler(req(null), r2);
  assert.equal(r2.code, 401); assert.equal(r2.body.error.code, 'AUTH_REQUIRED');
});

test('generate: peran pending ditolak sebelum AI dipanggil', async () => {
  __setFirebaseForTest(fakeFirebase({ tokens: { t: { uid: 'p' } }, users: { p: { role: 'pending' } } }));
  const res = mkRes();
  await generateHandler(req('t', { body: { teks: 'x' } }), res);
  assert.equal(res.code, 403); assert.equal(res.body.error.code, 'FORBIDDEN_ROLE');
});

test('api/config: mengembalikan konfigurasi web, atau 500 bila belum diisi', async () => {
  delete process.env.FIREBASE_WEB_CONFIG;
  const bad = mkRes(); await configHandler({ method: 'GET', headers: {} }, bad);
  assert.equal(bad.code, 500); assert.equal(bad.body.error.code, 'SERVER_NOT_CONFIGURED');
  process.env.FIREBASE_WEB_CONFIG = JSON.stringify({ apiKey: 'k', projectId: 'p', authDomain: 'p.firebaseapp.com' });
  try { const ok = mkRes(); await configHandler({ method: 'GET', headers: {} }, ok); assert.equal(ok.code, 200); assert.equal(ok.body.projectId, 'p'); }
  finally { delete process.env.FIREBASE_WEB_CONFIG; }
});
