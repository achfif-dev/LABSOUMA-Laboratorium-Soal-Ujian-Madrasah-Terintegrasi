import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { masterKey, encryptSecret, decryptSecret } from '../src/secrets.js';
import {
  resolveAi, validateConfigInput, statusAi, simpanAi, loadAiConfig, invalidateAiConfig, ujiAi,
} from '../src/aiConfig.js';
import { __setFirebaseForTest, authenticateAdmin } from '../src/platform.js';
import { setRuntimeAi, getModel, provider, getClient } from '../src/soalService.js';
import aiConfigHandler from '../api/ai-config.js';

const KEY32 = randomBytes(32);
const KUNCI_GEMINI = 'AIzaSyFAKEFAKEFAKEFAKEFAKE1234567890';
const KUNCI_CLAUDE = 'sk-ant-api03-FAKEFAKEFAKEFAKEFAKE-9876';

function fakeFirebase({ users = {}, tokens = {}, store = {} } = {}) {
  const data = { ...Object.fromEntries(Object.entries(users).map(([k, v]) => [`users/${k}`, v])), ...store };
  const ref = (path) => ({
    path,
    get: async () => ({ exists: path in data, data: () => data[path] }),
    set: async (v) => { data[path] = JSON.parse(JSON.stringify(v)); },
  });
  return {
    data,
    auth: { verifyIdToken: async (t) => { if (!tokens[t]) throw new Error('bad'); return tokens[t]; } },
    FieldValue: { serverTimestamp: () => 'TS' },
    db: { doc: ref, runTransaction: async (fn) => fn({ get: async (r) => r.get(), set: (r, v) => { data[r.path] = v; }, update() {} }) },
  };
}
const withEnv = async (vars, fn) => {
  const saved = { ...process.env };
  for (const k of ['AI_PROVIDER', 'AI_MODEL', 'GEMINI_API_KEY', 'ANTHROPIC_API_KEY', 'CONFIG_ENCRYPTION_KEY']) delete process.env[k];
  Object.assign(process.env, { FIREBASE_SERVICE_ACCOUNT: 'dummy-service-account-secret', ...vars });
  try { await fn(); } finally {
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
    setRuntimeAi(null); invalidateAiConfig();
  }
};

/* ----------------------------------------------------------------- secrets */
test('secrets: enkripsi-dekripsi bolak-balik, ciphertext tidak memuat teks asli', () => {
  const blob = encryptSecret(KUNCI_GEMINI, KEY32, 'ai:gemini');
  assert.ok(!blob.includes(KUNCI_GEMINI));
  assert.equal(decryptSecret(blob, KEY32, 'ai:gemini'), KUNCI_GEMINI);
  assert.notEqual(encryptSecret(KUNCI_GEMINI, KEY32, 'ai:gemini'), blob); // IV acak
});

test('secrets: kunci salah, data diubah, atau AAD berbeda ditolak', () => {
  const blob = encryptSecret('rahasia-rahasia-rahasia', KEY32, 'ai:gemini');
  assert.throws(() => decryptSecret(blob, randomBytes(32), 'ai:gemini'));
  assert.throws(() => decryptSecret(blob, KEY32, 'ai:anthropic')); // dipindah ke slot lain
  const parts = blob.split('.'); parts[3] = Buffer.from('xxxxxxxxxxxxxxxxxxxxxxx').toString('base64');
  assert.throws(() => decryptSecret(parts.join('.'), KEY32, 'ai:gemini'));
  assert.throws(() => decryptSecret('sampah', KEY32));
});

test('secrets: masterKey dari CONFIG_ENCRYPTION_KEY atau diturunkan dari FIREBASE_SERVICE_ACCOUNT', () => {
  const k = randomBytes(32).toString('base64');
  assert.equal(masterKey({ CONFIG_ENCRYPTION_KEY: k }).toString('base64'), k);
  const a = masterKey({ FIREBASE_SERVICE_ACCOUNT: 'abc' }); const b = masterKey({ FIREBASE_SERVICE_ACCOUNT: 'abc' });
  assert.equal(a.length, 32); assert.deepEqual(a, b);
  assert.notDeepEqual(a, masterKey({ FIREBASE_SERVICE_ACCOUNT: 'abd' }));
  assert.throws(() => masterKey({ CONFIG_ENCRYPTION_KEY: 'pendek' }), { code: 'SERVER_NOT_CONFIGURED' });
  assert.throws(() => masterKey({}), { code: 'SERVER_NOT_CONFIGURED' });
});

/* ----------------------------------------------------------------- resolve */
test('resolveAi: tanpa konfigurasi = perilaku lama (environment)', () => {
  const r = resolveAi(null, { AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'env-key-env-key-env-key', AI_MODEL: 'claude-x' });
  assert.deepEqual([r.provider, r.model, r.apiKey, r.sumberKunci], ['anthropic', 'claude-x', 'env-key-env-key-env-key', 'environment']);
  const g = resolveAi(null, {});
  assert.deepEqual([g.provider, g.model, g.apiKey], ['gemini', 'gemini-3.8-flash', '']);
});

test('resolveAi: konfigurasi admin menimpa environment, AI_MODEL env tidak bocor ke penyedia lain', () => {
  const doc = { provider: 'anthropic', models: {}, keys: { anthropic: { enc: encryptSecret(KUNCI_CLAUDE, KEY32, 'ai:anthropic') } } };
  const r = resolveAi(doc, { AI_PROVIDER: 'gemini', AI_MODEL: 'gemini-3.5-flash-lite', GEMINI_API_KEY: 'g'.repeat(25) }, KEY32);
  assert.equal(r.provider, 'anthropic');
  assert.equal(r.model, 'claude-sonnet-5-5'); // bukan model Gemini dari env
  assert.equal(r.apiKey, KUNCI_CLAUDE); assert.equal(r.sumberKunci, 'konfigurasi');
});

test('resolveAi: kunci tersimpan tak bisa dibuka -> pakai environment dan beri peringatan', () => {
  const doc = { provider: 'gemini', keys: { gemini: { enc: encryptSecret(KUNCI_GEMINI, randomBytes(32), 'ai:gemini') } } };
  const r = resolveAi(doc, { GEMINI_API_KEY: 'k'.repeat(25) }, KEY32);
  assert.equal(r.apiKey, 'k'.repeat(25)); assert.equal(r.sumberKunci, 'environment'); assert.match(r.peringatan, /Masukkan ulang/);
  const tanpaEnv = resolveAi(doc, {}, KEY32);
  assert.equal(tanpaEnv.apiKey, ''); assert.match(tanpaEnv.peringatan, /Masukkan ulang/);
});

/* -------------------------------------------------------------- validasi */
test('validateConfigInput: menerima yang valid, menolak penyedia/model/kunci yang cacat', () => {
  const ok = validateConfigInput({ provider: 'gemini', models: { gemini: 'gemini-3.8-flash' }, keys: { gemini: KUNCI_GEMINI }, hapus: ['anthropic', 'lain'] });
  assert.equal(ok.provider, 'gemini'); assert.equal(ok.keys.gemini, KUNCI_GEMINI); assert.deepEqual(ok.hapus, ['anthropic']);
  assert.throws(() => validateConfigInput({ provider: 'openai' }), { code: 'CONFIG_INVALID' });
  assert.throws(() => validateConfigInput({ models: { gemini: 'model dengan spasi' } }), { code: 'CONFIG_INVALID' });
  assert.throws(() => validateConfigInput({ keys: { gemini: 'pendek' } }), { code: 'CONFIG_INVALID' });
  assert.throws(() => validateConfigInput({ keys: { gemini: 'ada spasi di tengah kunci ini ya' } }), { code: 'CONFIG_INVALID' });
  assert.throws(() => validateConfigInput(null), { code: 'BAD_REQUEST' });
  assert.equal(validateConfigInput({ keys: { gemini: '' } }).keys.gemini, undefined); // kosong = tidak diubah
});

/* ----------------------------------------------------------- simpan/status */
test('simpanAi: kunci tersimpan terenkripsi, status hanya menampilkan 4 karakter terakhir', () => withEnv({}, async () => {
  const f = fakeFirebase(); __setFirebaseForTest(f);
  const st = await simpanAi({ uid: 'a1', email: 'admin@x.id' }, { provider: 'gemini', models: { gemini: 'gemini-3.8-flash' }, keys: { gemini: KUNCI_GEMINI } });
  const raw = JSON.stringify(f.data['config/ai']);
  assert.ok(!raw.includes(KUNCI_GEMINI), 'kunci tidak boleh tersimpan sebagai teks biasa');
  assert.equal(f.data['config/ai'].keys.gemini.last4, KUNCI_GEMINI.slice(-4));
  assert.equal(f.data['config/ai'].keys.gemini.updatedBy, 'admin@x.id');
  const out = JSON.stringify(st);
  assert.ok(!out.includes(KUNCI_GEMINI) && !out.includes('enc'), 'status tidak boleh membocorkan kunci/ciphertext');
  assert.equal(st.kunci.gemini.tersimpan, true); assert.equal(st.kunci.gemini.last4, KUNCI_GEMINI.slice(-4));
  assert.equal(st.kunci.anthropic.tersimpan, false);
  assert.equal(st.aktif.sumberKunci, 'konfigurasi');
}));

test('simpanAi: tanpa kunci baru, kunci lama dipertahankan; hapus menghapusnya; model kosong = kembali ke bawaan', () => withEnv({}, async () => {
  const f = fakeFirebase(); __setFirebaseForTest(f);
  const u = { uid: 'a1', email: 'admin@x.id' };
  await simpanAi(u, { keys: { gemini: KUNCI_GEMINI, anthropic: KUNCI_CLAUDE }, models: { gemini: 'm-1' } });
  await simpanAi(u, { provider: 'anthropic' }); // hanya ganti penyedia
  assert.ok(f.data['config/ai'].keys.gemini.enc && f.data['config/ai'].keys.anthropic.enc);
  assert.equal(f.data['config/ai'].models.gemini, 'm-1');
  await simpanAi(u, { models: { gemini: '' }, hapus: ['gemini'] });
  assert.equal(f.data['config/ai'].keys.gemini, undefined);
  assert.equal(f.data['config/ai'].models.gemini, undefined);
  assert.equal(f.data['config/ai'].provider, 'anthropic');
}));

/* ------------------------------------------------------- pemuatan runtime */
test('loadAiConfig: mengatur penyedia/model/kunci aktif dan klien dibuat ulang saat kunci berganti', () => withEnv({}, async () => {
  const f = fakeFirebase(); __setFirebaseForTest(f);
  await simpanAi({ uid: 'a1', email: 'a@x.id' }, { provider: 'gemini', models: { gemini: 'gemini-uji' }, keys: { gemini: KUNCI_GEMINI } });
  await loadAiConfig({ force: true });
  assert.equal(provider(), 'gemini'); assert.equal(getModel(), 'gemini-uji');
  const c1 = await getClient(); assert.equal(await getClient(), c1); // dipakai ulang
  await simpanAi({ uid: 'a1', email: 'a@x.id' }, { keys: { gemini: 'AIzaSyKUNCIBARUKUNCIBARU123456' } });
  await loadAiConfig({ force: true });
  assert.notEqual(await getClient(), c1); // kunci berganti -> klien baru
}));

test('loadAiConfig: cache 60 detik (satu bacaan), dan jatuh ke environment bila Firestore gagal', () => withEnv({ GEMINI_API_KEY: 'env-env-env-env-env-env-1' }, async () => {
  let reads = 0;
  const f = fakeFirebase(); const orig = f.db.doc;
  f.db.doc = (p) => { const r = orig(p); const g = r.get; r.get = async () => { reads++; return g(); }; return r; };
  __setFirebaseForTest(f);
  const t = 1_000_000;
  await loadAiConfig({ force: true, now: t }); await loadAiConfig({ now: t + 30_000 }); await loadAiConfig({ now: t + 59_000 });
  assert.equal(reads, 1);
  await loadAiConfig({ now: t + 61_000 });
  assert.equal(reads, 2);
  const rusak = fakeFirebase(); rusak.db.doc = () => ({ get: async () => { throw new Error('firestore mati'); } });
  __setFirebaseForTest(rusak); invalidateAiConfig();
  const v = await loadAiConfig({ force: true });
  assert.equal(v.apiKey, 'env-env-env-env-env-env-1'); assert.equal(v.sumberKunci, 'environment');
}));

test('ujiAi: memakai klien aktif dan melaporkan hasil; galat penyedia dipetakan ke pesan aman', () => withEnv({}, async () => {
  const f = fakeFirebase(); __setFirebaseForTest(f);
  await simpanAi({ uid: 'a1' }, { provider: 'gemini', keys: { gemini: KUNCI_GEMINI } });
  const saved = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: true, status: 200, headers: new Headers(), json: async () => ({ candidates: [{ content: { parts: [{ functionCall: { name: 'ping', args: { ok: true } } }] } }] }) });
    const r = await ujiAi(); assert.equal(r.ok, true); assert.equal(r.provider, 'gemini');
    // klien Gemini menyimpan fetch saat dibuat, jadi buat ulang dengan kunci baru agar memakai fetch palsu berikutnya
    await simpanAi({ uid: 'a1' }, { keys: { gemini: 'AIzaSyKUNCISALAHKUNCISALAH12345' } });
    globalThis.fetch = async () => ({ ok: false, status: 400, headers: new Headers(), json: async () => ({ error: { message: 'API key not valid' } }) });
    await assert.rejects(ujiAi(), { code: 'SERVER_AUTH' });
  } finally { globalThis.fetch = saved; }
}));

/* ----------------------------------------------------------------- endpoint */
test('authenticateAdmin dan /api/ai-config: hanya admin', () => withEnv({}, async () => {
  const f = fakeFirebase({ tokens: { adm: { uid: 'a', email: 'a@x.id' }, pen: { uid: 'p' }, anon: { uid: 'z' } }, users: { a: { role: 'admin' }, p: { role: 'penyusun' } } });
  __setFirebaseForTest(f);
  const rq = (token, body) => ({ method: 'POST', headers: token ? { authorization: 'Bearer ' + token } : {}, body });
  await assert.rejects(authenticateAdmin(rq('pen')), { code: 'FORBIDDEN_ROLE', status: 403 });
  await assert.rejects(authenticateAdmin(rq('anon')), { code: 'FORBIDDEN_ROLE' });
  const mk = () => ({ h: {}, setHeader(k, v) { this.h[k] = v; }, status(c) { this.code = c; return this; }, json(o) { this.body = o; return this; } });
  let res = mk(); await aiConfigHandler(rq('pen', { aksi: 'status' }), res); assert.equal(res.code, 403);
  res = mk(); await aiConfigHandler(rq(null, { aksi: 'status' }), res); assert.equal(res.code, 401);
  res = mk(); await aiConfigHandler(rq('adm', { aksi: 'status' }), res); assert.equal(res.code, 200);
  assert.equal(res.body.kunci.gemini.tersimpan, false);
  res = mk(); await aiConfigHandler(rq('adm', { aksi: 'simpan', keys: { gemini: KUNCI_GEMINI } }), res); assert.equal(res.code, 200);
  assert.ok(!JSON.stringify(res.body).includes(KUNCI_GEMINI));
  res = mk(); await aiConfigHandler(rq('adm', { aksi: 'simpan', keys: { gemini: 'x' } }), res); assert.equal(res.code, 422);
  res = mk(); await aiConfigHandler(rq('adm', { aksi: 'hapus-semua' }), res); assert.equal(res.code, 400);
}));
