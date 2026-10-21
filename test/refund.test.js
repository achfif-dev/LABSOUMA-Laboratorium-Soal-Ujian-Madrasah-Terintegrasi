import test from 'node:test';
import assert from 'node:assert/strict';
import { refundable, refundState, rateDecision } from '../src/access.js';
import { ApiError } from '../src/soalService.js';
import { __setFirebaseForTest, enforceRate, withRefund } from '../src/platform.js';

const LIM = { perMinute: 5, perDay: 60 };
const WIB = 7 * 3600 * 1000;

test('refundable: hanya kegagalan server/AI, bukan penolakan isi teks atau kuota lokal', () => {
  assert.equal(refundable(new ApiError(503, 'AI_OVERLOADED', 'x')), true);
  assert.equal(refundable(new ApiError(504, 'AI_TIMEOUT', 'x')), true);
  assert.equal(refundable(new ApiError(502, 'AI_BAD_OUTPUT', 'x')), true);
  assert.equal(refundable(new ApiError(500, 'SERVER_AUTH', 'x')), true);
  assert.equal(refundable(new ApiError(429, 'RATE_LIMIT', 'x')), true); // batas dari penyedia AI
  assert.equal(refundable(new ApiError(422, 'TEKS_TIDAK_MEMADAI', 'x')), false);
  assert.equal(refundable(new ApiError(429, 'RATE_LIMIT_DAILY', 'x')), false);
  assert.equal(refundable(new ApiError(403, 'FORBIDDEN_ROLE', 'x')), false);
  assert.equal(refundable(null), false);
});

test('refundState: mengurangi satu hitungan, tidak pernah di bawah nol, dan menghormati pergantian hari/menit', () => {
  const now = Date.UTC(2026, 9, 21, 5, 0, 0);
  const used = rateDecision(null, now, LIM).state; // 1 pemakaian
  const back = refundState(used, now + 1000);
  assert.deepEqual([back.minCount, back.dayCount], [0, 0]);
  assert.deepEqual([refundState(back, now + 2000).minCount, refundState(back, now + 2000).dayCount], [0, 0]);
  const nextDay = refundState(used, now + 86_400_000); // hari dan menit sudah berganti
  assert.deepEqual([nextDay.minCount, nextDay.dayCount], [used.minCount, used.dayCount]);
  assert.equal(refundState(undefined, now), null);
});

function fakeDb() {
  const data = {};
  const ref = (path) => ({ path, get: async () => ({ exists: path in data, data: () => data[path] }) });
  return { data, db: { doc: ref, runTransaction: async (fn) => fn({ get: (r) => r.get(), set: (r, v) => { data[r.path] = v; } }) } };
}

test('withRefund: AI gagal di sisi server mengembalikan kuota, penolakan isi teks tidak', async () => {
  const f = fakeDb(); __setFirebaseForTest({ db: f.db, auth: {}, FieldValue: {} });
  try {
    await enforceRate('u1', LIM);
    assert.equal(f.data['rate/u1'].dayCount, 1);
    await assert.rejects(withRefund('u1', async () => { throw new ApiError(503, 'AI_OVERLOADED', 'sibuk'); }), (e) => e.code === 'AI_OVERLOADED');
    assert.equal(f.data['rate/u1'].dayCount, 0);

    await enforceRate('u1', LIM);
    await assert.rejects(withRefund('u1', async () => { throw new ApiError(422, 'TEKS_TIDAK_MEMADAI', 'x'); }), (e) => e.code === 'TEKS_TIDAK_MEMADAI');
    assert.equal(f.data['rate/u1'].dayCount, 1); // tetap dihitung

    assert.equal(await withRefund('u1', async () => 'ok'), 'ok');
    assert.equal(f.data['rate/u1'].dayCount, 1); // sukses: tidak dikembalikan
  } finally { __setFirebaseForTest(null); }
});
