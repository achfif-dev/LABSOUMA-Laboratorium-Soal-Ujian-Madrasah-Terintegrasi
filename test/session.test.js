import test from 'node:test';
import assert from 'node:assert/strict';
import { __setFirebaseForTest } from '../src/platform.js';
import sessionHandler from '../api/session.js';

function fakeFirebase() {
  const store = {};
  const ref = (path) => ({ path, get: async () => ({ exists: path in store, data: () => store[path] }) });
  return {
    store,
    auth: { verifyIdToken: async () => ({ uid: 'u1', email: 'guru@gmail.com', email_verified: true }) },
    FieldValue: { serverTimestamp: () => 'TS' },
    db: { doc: ref, runTransaction: async (fn) => fn({ get: async (r) => r.get(), set: (r, v) => { store[r.path] = v; }, update: (r, v) => { store[r.path] = { ...store[r.path], ...v }; } }) },
  };
}
const mkRes = () => ({ h: {}, setHeader(k, v) { this.h[k] = v; }, status(c) { this.code = c; return this; }, json(o) { this.body = o; return this; } });
const req = { method: 'POST', headers: { authorization: 'Bearer t' }, body: {} };

test('/api/session dibatasi per pengguna: panggilan berulang ditolak 429 dan tidak menulis profil lagi', async () => {
  const f = fakeFirebase(); __setFirebaseForTest(f);
  process.env.LIMIT_SESSION_PER_MINUTE = '3';
  try {
    for (let i = 0; i < 3; i++) { const r = mkRes(); await sessionHandler(req, r); assert.equal(r.code, 200); }
    f.store['users/u1'].lastLoginAt = 'SEBELUM';
    const r = mkRes(); await sessionHandler(req, r);
    assert.equal(r.code, 429);
    assert.equal(r.body.error.code, 'RATE_LIMIT_LOCAL');
    assert.equal(f.store['users/u1'].lastLoginAt, 'SEBELUM'); // ditolak sebelum menulis
  } finally { delete process.env.LIMIT_SESSION_PER_MINUTE; }
});
