// Menjaga arsitektur "satu fungsi Vercel" (lihat api/gateway.js): jumlah fungsi menentukan "Function Storage".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import handler, { RUTE, namaRute } from '../api/gateway.js';

const akar = join(dirname(fileURLToPath(import.meta.url)), '..');
const mkRes = () => ({ h: {}, setHeader(k, v) { this.h[k] = v; }, status(c) { this.code = c; return this; }, json(o) { this.body = o; return this; } });

function berkasJs(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? berkasJs(p) : (/\.(js|jsx)$/.test(e.name) ? [p] : []);
  });
}

test('api/ hanya berisi gateway.js (tiap berkas di api/ = satu bundle fungsi = Function Storage bertambah)', () => {
  assert.deepEqual(readdirSync(join(akar, 'api')), ['gateway.js']);
});

test('tabel RUTE cocok persis dengan berkas di src/rute/', () => {
  const diDisk = readdirSync(join(akar, 'src/rute')).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)).sort();
  assert.deepEqual(Object.keys(RUTE).sort(), diDisk);
});

test('setiap rute di tabel bisa dimuat dan mengekspor handler default (req, res)', async () => {
  for (const [nama, muat] of Object.entries(RUTE)) {
    const m = await muat();
    assert.equal(typeof m.default, 'function', `rute ${nama} tidak punya export default`);
  }
});

test('setiap /api/<nama> yang dipanggil klien (web/) terdaftar di tabel RUTE', () => {
  const dipakai = new Set();
  for (const f of berkasJs(join(akar, 'web'))) {
    for (const m of readFileSync(f, 'utf8').matchAll(/['"`]\/api\/([a-z0-9-]+)/g)) dipakai.add(m[1]);
  }
  assert.ok(dipakai.size >= 5, 'pemindaian klien seharusnya menemukan rute');
  for (const nama of dipakai) assert.ok(Object.hasOwn(RUTE, nama), `klien memanggil /api/${nama} tetapi tidak ada di RUTE`);
});

test('vercel.json: rewrite /api/:route -> gateway, satu pola fungsi, ignoreCommand ada', () => {
  const v = JSON.parse(readFileSync(join(akar, 'vercel.json'), 'utf8'));
  assert.deepEqual(v.rewrites, [{ source: '/api/:route', destination: '/api/gateway?route=:route' }]);
  assert.equal(v.functions['api/*.js'].maxDuration, 60);
  assert.ok(v.functions['api/*.js'].excludeFiles);
  assert.equal(v.ignoreCommand, 'sh scripts/vercel-ignore.sh');
});

test('namaRute: dari query (string/array), cadangan dari path, selain itu kosong', () => {
  assert.equal(namaRute({ query: { route: 'session' } }), 'session');
  assert.equal(namaRute({ query: { route: ['kitab', 'x'] } }), 'kitab');
  assert.equal(namaRute({ url: '/api/assist?x=1' }), 'assist');
  assert.equal(namaRute({ url: '/api/config-backup/' }), 'config-backup');
  assert.equal(namaRute({ url: '/lain/assist' }), '');
  assert.equal(namaRute({}), '');
});

test('rute tidak dikenal (termasuk nama bawaan Object) = 404 JSON seragam, tanpa cache', async () => {
  for (const q of [undefined, 'tidak-ada', '__proto__', 'constructor', 'toString', 'gateway']) {
    const res = mkRes();
    await handler({ method: 'GET', headers: {}, query: q === undefined ? {} : { route: q } }, res);
    assert.equal(res.code, 404, `route=${q}`);
    assert.equal(res.body.error.code, 'NOT_FOUND');
    assert.equal(res.h['Cache-Control'], 'no-store');
  }
});

test('meneruskan ke handler rute: lewat ?route= dan lewat path asli; metode salah tetap 405', async () => {
  const awal = process.env.FIREBASE_WEB_CONFIG;
  process.env.FIREBASE_WEB_CONFIG = JSON.stringify({ apiKey: 'k', projectId: 'p' });
  try {
    for (const req of [{ method: 'GET', headers: {}, query: { route: 'config' } }, { method: 'GET', headers: {}, url: '/api/config' }]) {
      const res = mkRes();
      await handler(req, res);
      assert.equal(res.code, 200);
      assert.deepEqual(res.body, { apiKey: 'k', projectId: 'p' });
    }
    const salah = mkRes();
    await handler({ method: 'POST', headers: {}, query: { route: 'config' } }, salah);
    assert.equal(salah.code, 405);
    assert.equal(salah.body.error.code, 'METHOD_NOT_ALLOWED');
  } finally {
    if (awal === undefined) delete process.env.FIREBASE_WEB_CONFIG; else process.env.FIREBASE_WEB_CONFIG = awal;
  }
});

/* ---------------------------------------------------------- scripts/vercel-ignore.sh */
const git = spawnSync('git', ['--version']);
test('vercel-ignore.sh: lewati bila hanya docs/test berubah, lanjut bila kode berubah atau tanpa pembanding', { skip: git.status !== 0 && 'git tidak tersedia' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'ign-'));
  const sh = (cmd, args) => spawnSync(cmd, args, { cwd: dir, encoding: 'utf8' });
  const commit = (msg) => { sh('git', ['add', '-A']); sh('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', msg]); };
  const tulis = (rel, isi) => { mkdirSync(dirname(join(dir, rel)), { recursive: true }); writeFileSync(join(dir, rel), isi); };
  try {
    sh('git', ['init', '-q']);
    mkdirSync(join(dir, 'scripts'));
    writeFileSync(join(dir, 'scripts/vercel-ignore.sh'), readFileSync(join(akar, 'scripts/vercel-ignore.sh')));
    tulis('src/a.js', '1'); tulis('docs/a.md', '1'); commit('awal');
    assert.equal(sh('sh', ['scripts/vercel-ignore.sh']).status, 1, 'tanpa HEAD^ harus build');
    tulis('docs/a.md', '2'); tulis('test/x.test.js', 'x'); tulis('README.md', 'r'); commit('docs');
    assert.equal(sh('sh', ['scripts/vercel-ignore.sh']).status, 0, 'hanya docs/test harus dilewati');
    tulis('src/a.js', '2'); commit('kode');
    assert.equal(sh('sh', ['scripts/vercel-ignore.sh']).status, 1, 'src berubah harus build');
    tulis('vercel.json', '{}'); commit('konfigurasi');
    assert.equal(sh('sh', ['scripts/vercel-ignore.sh']).status, 1, 'vercel.json berubah harus build');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
