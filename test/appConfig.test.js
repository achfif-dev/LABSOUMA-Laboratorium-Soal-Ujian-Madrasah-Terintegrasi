import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_APP_CONFIG, sanitizeAppConfig, resolveAppConfig, bacaAplikasi, simpanApp, resetApp, invalidateAppConfig, TINGKAT_NAMA } from '../src/appConfig.js';
import { __setFirebaseForTest } from '../src/platform.js';
import appConfigHandler from '../api/app-config.js';

function fakeFirebase({ users = {}, tokens = {} } = {}) {
  const data = Object.fromEntries(Object.entries(users).map(([k, v]) => [`users/${k}`, v]));
  const ref = (path) => ({
    path,
    get: async () => ({ exists: path in data, data: () => data[path] }),
    set: async (v) => { data[path] = JSON.parse(JSON.stringify(v)); },
    delete: async () => { delete data[path]; },
  });
  return { data, auth: { verifyIdToken: async (t) => { if (!tokens[t]) throw new Error('bad'); return tokens[t]; } }, FieldValue: { serverTimestamp: () => 'TS' }, db: { doc: ref } };
}
const salin = (o) => JSON.parse(JSON.stringify(o));

test('bawaan: lolos validasi sendiri, nama tingkat sesuai aturan Firestore, tanpa nama ganda, kitab menunjuk mapel yang ada', () => {
  const c = sanitizeAppConfig(DEFAULT_APP_CONFIG);
  assert.deepEqual(c.tingkat.map((t) => t.nama), ['Ibtidaiyah', 'Tsanawiyah', 'Aliyah']);
  assert.deepEqual(TINGKAT_NAMA, ['Ibtidaiyah', 'Tsanawiyah', 'Aliyah']);
  const mapel = new Set(c.mapel.map((m) => m.nama));
  for (const k of c.kitab) assert.ok(mapel.has(k.mapel), `mapel "${k.mapel}" untuk kitab ${k.nama} tidak ada di daftar mapel`);
  // nama lama yang sudah dipakai soal tersimpan tidak boleh hilang dari bawaan
  for (const lama of ['Fiqih', 'Akidah', 'Akhlak', 'Tarikh (SKI)', "Qur'an Hadits", 'Bahasa Arab', 'Lainnya']) assert.ok(mapel.has(lama), lama);
  const kitab = new Set(c.kitab.map((k) => k.nama));
  for (const lama of ['Fathul Qarib', 'Kifayatul Akhyar', 'Safinatun Naja', 'Taqrib (Matan Abu Syuja)', "Arba'in Nawawi", 'Riyadhus Shalihin', "Ta'lim al-Muta'allim", 'Aqidatul Awam']) assert.ok(kitab.has(lama), lama);
});

test('sanitize: membersihkan isian, membuang tingkat asing, dan menolak data yang merusak', () => {
  const c = salin(DEFAULT_APP_CONFIG);
  c.mapel.push({ nama: '  Ilmu <b>Falak</b>  ', tingkat: ['Aliyah', 'Tidak Ada'] });
  const out = sanitizeAppConfig(c);
  const falak = out.mapel.find((m) => m.nama.includes('Falak'));
  assert.equal(falak.nama, 'Ilmu bFalak/b'); // tanda < > dibuang oleh cleanLine
  assert.deepEqual(falak.tingkat, ['Aliyah']);

  const dobel = salin(DEFAULT_APP_CONFIG); dobel.mapel.push({ nama: 'fiqih' });
  assert.throws(() => sanitizeAppConfig(dobel), { code: 'CONFIG_INVALID', message: /dua kali/ });
  const kosong = salin(DEFAULT_APP_CONFIG); kosong.kitab.push({ nama: '   ' });
  assert.throws(() => sanitizeAppConfig(kosong), { code: 'CONFIG_INVALID', message: /tanpa nama/ });
  const nonaktif = salin(DEFAULT_APP_CONFIG); nonaktif.tingkat.forEach((t) => { t.aktif = false; });
  assert.throws(() => sanitizeAppConfig(nonaktif), { code: 'CONFIG_INVALID', message: /tingkat/ });
  const tanpaMapel = salin(DEFAULT_APP_CONFIG); tanpaMapel.mapel.forEach((m) => { m.aktif = false; });
  assert.throws(() => sanitizeAppConfig(tanpaMapel), { code: 'CONFIG_INVALID', message: /mata pelajaran/ });
  const kebanyakan = salin(DEFAULT_APP_CONFIG); kebanyakan.kitab = Array.from({ length: 401 }, (_, i) => ({ nama: `K${i}` }));
  assert.throws(() => sanitizeAppConfig(kebanyakan), { code: 'CONFIG_INVALID', message: /maksimal/ });
  assert.throws(() => sanitizeAppConfig(null), { code: 'CONFIG_INVALID' });
  assert.throws(() => sanitizeAppConfig('x'), { code: 'CONFIG_INVALID' });
});

test('sanitize: tingkat tak bisa ditambah/diganti nama; label dan kelas kosong kembali ke bawaan', () => {
  const out = sanitizeAppConfig({ tingkat: [{ nama: 'Ula', label: 'Ula' }, { nama: 'Aliyah', label: '', kelas: [] }], mapel: [{ nama: 'Fiqih' }], kitab: [] });
  assert.deepEqual(out.tingkat.map((t) => t.nama), ['Ibtidaiyah', 'Tsanawiyah', 'Aliyah']);
  const ma = out.tingkat.find((t) => t.nama === 'Aliyah');
  assert.equal(ma.label, 'Aliyah (MA)'); assert.deepEqual(ma.kelas, ['X', 'XI', 'XII']);
});

test('resolveAppConfig: dokumen rusak atau kosong jatuh ke bawaan', () => {
  assert.equal(resolveAppConfig(null).mapel.length, DEFAULT_APP_CONFIG.mapel.length);
  assert.equal(resolveAppConfig({ cfg: { mapel: [] } }).mapel.length, DEFAULT_APP_CONFIG.mapel.length);
  const ok = resolveAppConfig({ cfg: { tingkat: [], mapel: [{ nama: 'Fiqih' }], kitab: [] } });
  assert.deepEqual(ok.mapel.map((m) => m.nama), ['Fiqih']);
});

test('simpan, baca, cache, dan reset', async () => {
  const f = fakeFirebase(); __setFirebaseForTest(f); invalidateAppConfig();
  let r = await bacaAplikasi(); assert.equal(r.kustom, false);
  const c = salin(DEFAULT_APP_CONFIG); c.mapel = [{ nama: 'Fiqih', tingkat: ['Aliyah'] }]; c.kitab = [{ nama: 'Fathul Qarib', mapel: 'Fiqih' }];
  r = await simpanApp({ uid: 'a', email: 'a@x.id' }, { config: c });
  assert.equal(r.kustom, true); assert.equal(r.diubahOleh, 'a@x.id'); assert.deepEqual(r.config.mapel.map((m) => m.nama), ['Fiqih']);
  assert.ok(f.data['config/app'].cfg);
  r = await resetApp(); assert.equal(r.kustom, false); assert.equal(f.data['config/app'], undefined);
  assert.equal(r.config.mapel.length, DEFAULT_APP_CONFIG.mapel.length);
});

test('Firestore gagal: memakai bawaan dan tidak menyimpan hasil gagal di cache', async () => {
  const f = fakeFirebase(); f.db.doc = () => ({ get: async () => { throw Object.assign(new Error('mati'), { code: 'unavailable' }); } });
  __setFirebaseForTest(f); invalidateAppConfig();
  const r = await bacaAplikasi();
  assert.equal(r.kustom, false); assert.equal(r.galatBaca, 'unavailable'); assert.ok(r.config.mapel.length > 0);
  __setFirebaseForTest(fakeFirebase());
  const r2 = await bacaAplikasi(); assert.equal(r2.galatBaca, undefined); // tidak terkunci pada hasil gagal
});

test('/api/app-config: semua peran aktif boleh baca; hanya admin boleh simpan dan reset', async () => {
  const f = fakeFirebase({ tokens: { adm: { uid: 'a', email: 'a@x.id' }, pen: { uid: 'p' }, tamu: { uid: 'z' } }, users: { a: { role: 'admin' }, p: { role: 'penyusun' }, z: { role: 'pending' } } });
  __setFirebaseForTest(f); invalidateAppConfig();
  const rq = (token, body) => ({ method: 'POST', headers: token ? { authorization: 'Bearer ' + token } : {}, body });
  const mk = () => ({ h: {}, setHeader(k, v) { this.h[k] = v; }, status(c) { this.code = c; return this; }, json(o) { this.body = o; return this; } });
  let res = mk(); await appConfigHandler(rq(null, { aksi: 'baca' }), res); assert.equal(res.code, 401);
  res = mk(); await appConfigHandler(rq('tamu', { aksi: 'baca' }), res); assert.equal(res.code, 403);
  res = mk(); await appConfigHandler(rq('pen', { aksi: 'baca' }), res); assert.equal(res.code, 200); assert.ok(res.body.config.kitab.length > 0);
  res = mk(); await appConfigHandler(rq('pen', { aksi: 'simpan', config: DEFAULT_APP_CONFIG }), res); assert.equal(res.code, 403);
  res = mk(); await appConfigHandler(rq('pen', { aksi: 'reset' }), res); assert.equal(res.code, 403);
  res = mk(); await appConfigHandler(rq('adm', { aksi: 'simpan', config: { mapel: [] } }), res); assert.equal(res.code, 422);
  res = mk(); await appConfigHandler(rq('adm', { aksi: 'simpan', config: DEFAULT_APP_CONFIG }), res); assert.equal(res.code, 200); assert.equal(res.body.kustom, true);
  res = mk(); await appConfigHandler(rq('adm', { aksi: 'hapus' }), res); assert.equal(res.code, 400);
  res = mk(); await appConfigHandler(rq('adm', { aksi: 'reset' }), res); assert.equal(res.code, 200); assert.equal(res.body.kustom, false);
});

import { sanitizeAppConfig as sanitasiTautan, DEFAULT_APP_CONFIG as CFG_TAUTAN } from '../src/appConfig.js';

test('katalog kitab: tautan hanya https di situs kitab yang diizinkan', () => {
  const ke = (tautan) => sanitasiTautan({ ...CFG_TAUTAN, kitab: [{ nama: 'X', tautan }] }).kitab[0].tautan;
  assert.equal(ke('https://shamela.ws/book/823/'), 'https://shamela.ws/book/823');
  assert.equal(ke('shamela.ws/book/823?x=1'), 'https://shamela.ws/book/823');
  assert.equal(ke('https://evil.com/book/1'), '');
  assert.equal(ke('javascript:alert(1)'), '');
  assert.equal(ke('https://shamela.ws.evil.com/book/1'), '');
  assert.equal(ke(undefined), '');
});
