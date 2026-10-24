// Peran Ustadz: pemakai alat bantu (AI, Pegon, ekspor) tanpa akses ke bank soal, dengan kuota dan kolam harian sendiri.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STAFF, AUTHORS } from '../src/access.js';
import { __setFirebaseForTest, authenticateAuthor, authenticateStaff, enforceAi, aiPool, kitabLimitsFor, GLOBAL_AI_ID, GLOBAL_USTADZ_ID } from '../src/platform.js';
import { invalidateAiConfig } from '../src/aiConfig.js';
import generateHandler from '../api/generate.js';
import backupHandler from '../api/backup.js';
import appConfigHandler from '../api/app-config.js';
import configBackupHandler from '../api/config-backup.js';
import aiConfigHandler from '../api/ai-config.js';
import kitabHandler from '../api/kitab.js';

const TEKS = 'الْمِيَاهُ الَّتِي يَجُوزُ بِهَا التَّطْهِيرُ سَبْعُ مِيَاهٍ: مَاءُ السَّمَاءِ، وَمَاءُ الْبَحْرِ، وَمَاءُ النَّهْرِ';
const SOAL = { stimulus: '', pertanyaan: 'Berapa macam air yang boleh dipakai bersuci?', pilihan_a: 'Tiga macam', pilihan_b: 'Lima macam', pilihan_c: 'Tujuh macam', pilihan_d: 'Sembilan macam', pilihan_e: 'Sebelas macam',
  kunci_jawaban: 'C', pembahasan: 'Teks: الْمِيَاهُ الَّتِي يَجُوزُ بِهَا التَّطْهِيرُ سَبْعُ مِيَاهٍ', indikator_kisi_kisi: 'Peserta didik dapat menyebutkan jumlah air suci.' };
const BODY = { teks: TEKS, tingkat: 'MA', level: 'L1', nama: 'Safinatun Naja', mapel: 'Fiqih' };

const ROLES = { tu: 'ustadz', tp: 'penyusun', te: 'editor', ta: 'admin', tw: 'pending', tn: 'nonaktif' };
function fakeFirebase() {
  const store = Object.fromEntries(Object.entries(ROLES).map(([t, role]) => [`users/${t}`, { role }]));
  const ref = (path) => ({ path, get: async () => ({ exists: path in store, data: () => store[path] }) });
  return { store, auth: { verifyIdToken: async (t) => { if (!ROLES[t]) throw new Error('bad'); return { uid: t }; } }, FieldValue: {},
    db: { doc: ref, runTransaction: async (fn) => fn({ get: (r) => r.get(), set: (r, v) => { store[r.path] = v; } }) } };
}
const mkRes = () => { const r = { h: {}, setHeader(k, v) { r.h[k] = v; }, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; };
const req = (token, body) => ({ method: 'POST', headers: { authorization: 'Bearer ' + token }, body });
const gemini = (json) => async () => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => json });
const OK = gemini({ candidates: [{ finishReason: 'STOP', content: { parts: [{ functionCall: { name: 'simpan_soal', args: SOAL } }] } }] });

async function jalan(fn, fetchImpl = OK, env = {}) {
  const saved = { fetch: globalThis.fetch, k: process.env.GEMINI_API_KEY, p: process.env.AI_PROVIDER };
  const fb = fakeFirebase();
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  process.env.AI_PROVIDER = 'gemini'; process.env.GEMINI_API_KEY = 'kunci-' + Math.random();
  globalThis.fetch = fetchImpl; __setFirebaseForTest(fb); invalidateAiConfig();
  try { await fn(fb); } finally {
    globalThis.fetch = saved.fetch; __setFirebaseForTest(null); invalidateAiConfig();
    process.env.GEMINI_API_KEY = saved.k ?? ''; process.env.AI_PROVIDER = saved.p ?? '';
    for (const k of Object.keys(env)) delete process.env[k];
  }
}

test('ustadz TIDAK termasuk STAFF (hak baca bank); AUTHORS = STAFF + ustadz', () => {
  assert.ok(!STAFF.includes('ustadz'));
  assert.deepEqual(AUTHORS, [...STAFF, 'ustadz']);
});

test('authenticateAuthor: ustadz, penyusun, editor, admin lolos dengan role; pending/nonaktif/tak berprofil ditolak', async () => {
  await jalan(async () => {
    for (const [t, role] of Object.entries(ROLES)) {
      if (['ustadz', 'penyusun', 'editor', 'admin'].includes(role)) assert.equal((await authenticateAuthor(req(t))).role, role);
      else await assert.rejects(authenticateAuthor(req(t)), { code: 'FORBIDDEN_ROLE', status: 403 });
    }
    // authenticateStaff tetap menolak ustadz (dipakai untuk hak setara baca bank)
    await assert.rejects(authenticateStaff(req('tu')), { code: 'FORBIDDEN_ROLE' });
  });
});

test('kolam AI terpisah: ustadz memakai global_ai_ustadz, tim memakai global_ai; plafon ustadz tidak menghabiskan kuota tim', async () => {
  await jalan(async (fb) => {
    await enforceAi('tu', 'ustadz'); await enforceAi('x', 'ustadz');
    await assert.rejects(enforceAi('y', 'ustadz'), (e) => e.code === 'RATE_LIMIT_DAILY' && /ustadz/.test(e.message));
    assert.equal(fb.store[`rate/${GLOBAL_USTADZ_ID}`].dayCount, 2);
    assert.equal(fb.store['rate/y'].dayCount, 0, 'hitungan pengguna dikembalikan saat plafon penuh');
    await enforceAi('tp', 'penyusun'); // kolam tim masih lapang
    assert.equal(fb.store[`rate/${GLOBAL_AI_ID}`].dayCount, 1);
  }, OK, { LIMIT_USTADZ_GLOBAL_PER_DAY: '2' });
});

test('batas per pengguna ustadz lebih kecil dari tim dan dapat diatur lewat env', async () => {
  assert.equal(aiPool('ustadz').user.perDay, 15);
  assert.equal(aiPool('penyusun').user.perDay, 60);
  assert.equal(aiPool(undefined).id, GLOBAL_AI_ID);
  assert.deepEqual([kitabLimitsFor('ustadz').perDay, kitabLimitsFor('editor').perDay], [50, 200]);
  await jalan(async () => {
    await enforceAi('tu', 'ustadz'); await enforceAi('tu', 'ustadz');
    await assert.rejects(enforceAi('tu', 'ustadz'), { code: 'RATE_LIMIT_DAILY' });
  }, OK, { LIMIT_USTADZ_PER_DAY: '2' });
});

test('/api/generate: ustadz boleh; kuota tercatat di kolam ustadz, bukan kolam tim', async () => {
  await jalan(async (fb) => {
    const res = mkRes(); await generateHandler(req('tu', BODY), res);
    assert.equal(res.code, 200, JSON.stringify(res.body));
    assert.ok(res.body.soal);
    assert.equal(fb.store[`rate/${GLOBAL_USTADZ_ID}`].dayCount, 1);
    assert.equal(fb.store[`rate/${GLOBAL_AI_ID}`], undefined);
  });
});

test('/api/generate: AI error 503 mengembalikan kuota pengguna dan kolam ustadz', async () => {
  await jalan(async (fb) => {
    const res = mkRes(); await generateHandler(req('tu', BODY), res);
    assert.ok(res.code >= 500);
    assert.equal(fb.store['rate/tu'].dayCount, 0);
    assert.equal(fb.store[`rate/${GLOBAL_USTADZ_ID}`].dayCount, 0);
  }, async () => ({ ok: false, status: 503, headers: { get: () => null }, json: async () => ({ error: { message: 'overloaded' } }) }));
});

test('/api/generate dan /api/kitab: pending dan nonaktif ditolak 403', async () => {
  await jalan(async () => {
    for (const t of ['tw', 'tn']) {
      for (const h of [generateHandler, kitabHandler]) { const res = mkRes(); await h(req(t, BODY), res); assert.equal(res.code, 403); }
    }
  });
});

test('endpoint khusus tim ditolak untuk ustadz: backup, simpan/reset konfigurasi, riwayat konfigurasi, pengaturan AI', async () => {
  await jalan(async () => {
    const cek = async (h, body) => { const res = mkRes(); await h(req('tu', body), res); assert.equal(res.code, 403, JSON.stringify(res.body)); assert.equal(res.body.error.code, 'FORBIDDEN_ROLE'); };
    await cek(backupHandler, { aksi: 'info' });
    await cek(backupHandler, { aksi: 'pulihkan' });
    await cek(appConfigHandler, { aksi: 'simpan', config: {} });
    await cek(appConfigHandler, { aksi: 'reset' });
    await cek(configBackupHandler, { aksi: 'daftar', jenis: 'app' });
    await cek(aiConfigHandler, { aksi: 'baca' });
  });
});

/* ---- Aturan Firestore: tidak ada jalan masuk ustadz ke bank soal ---- */
const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const fungsi = (nama) => { const m = new RegExp('function ' + nama + '\\(\\)[^\\n]*').exec(rules); assert.ok(m, nama); return m[0]; };

test('firestore.rules: isStaff, isReviewer, isAdmin tidak menyebut ustadz', () => {
  for (const f of ['isStaff', 'isReviewer', 'isAdmin']) assert.doesNotMatch(fungsi(f), /ustadz/, f);
  assert.match(fungsi('isUstadz'), /role\(\) == 'ustadz'/);
});

test('firestore.rules: isUstadz hanya dipakai membaca kamusPegon; blok soal dan users tidak memberi ustadz akses', () => {
  const pakai = [...rules.matchAll(/isUstadz\(\)/g)].length;
  assert.equal(pakai, 2, 'satu definisi + satu pemakaian (kamusPegon read)'); 
  const soal = rules.slice(rules.indexOf('match /soal/{id}'), rules.indexOf('match /kamusPegon/{id}'));
  assert.doesNotMatch(soal, /ustadz/i);
  const users = rules.slice(rules.indexOf('match /users/{uid}'), rules.indexOf('match /soal/{id}'));
  assert.match(users, /'admin', 'ustadz', 'nonaktif'/, 'admin dapat memberi peran ustadz');
  assert.match(users, /allow list: if isAdmin\(\);/);
  const kamus = rules.slice(rules.indexOf('match /kamusPegon/{id}'), rules.indexOf('match /config/{doc}'));
  assert.match(kamus, /allow read: if isStaff\(\) \|\| isUstadz\(\);/);
  assert.match(kamus, /allow create, update: if isReviewer\(\)/);
});
