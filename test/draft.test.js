import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraftStore, PREFIX, TTL_MS, MAX_CHARS } from '../src/draft.js';

// localStorage tiruan, cukup untuk getItem/setItem/removeItem/key/length.
function memStorage({ penuh = false } = {}) {
  const m = new Map();
  return {
    m,
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { if (penuh) throw new Error('QuotaExceededError'); m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}
// Penunda palsu: tidak menunggu waktu nyata.
function jam() {
  let t = 1_000_000; const tugas = new Map(); let id = 0;
  return {
    now: () => t, maju: (ms) => { t += ms; },
    setTimer: (fn) => { tugas.set(++id, fn); return id; },
    clearTimer: (i) => { tugas.delete(i); },
    jalankan: () => { const a = [...tugas.values()]; tugas.clear(); a.forEach((f) => f()); },
    antre: () => tugas.size,
  };
}
const buat = (opt = {}) => {
  const s = opt.storage || memStorage(); const j = jam();
  const d = createDraftStore({ storage: s, now: j.now, setTimer: j.setTimer, clearTimer: j.clearTimer });
  d.setUser('u1');
  return { s, j, d };
};

test('save ditunda: baru tertulis setelah timer atau flush, tetapi read langsung melihat nilai terbaru', () => {
  const { s, j, d } = buat();
  d.save('form', { pertanyaan: 'a' });
  assert.equal(s.m.size, 0, 'belum ditulis ke penyimpanan');
  assert.deepEqual(d.read('form'), { pertanyaan: 'a' });
  d.save('form', { pertanyaan: 'ab' });
  assert.equal(j.antre(), 1, 'ketikan beruntun memakai satu timer');
  j.jalankan();
  assert.equal(s.m.size, 1);
  assert.deepEqual(d.read('form'), { pertanyaan: 'ab' });
});

test('flush menulis sisa yang tertunda (pagehide)', () => {
  const { s, d } = buat();
  d.save('a', 1); d.save('b', 2);
  assert.equal(d.flush(), true);
  assert.equal(s.m.size, 2);
});

test('kunci dipisah per akun', () => {
  const { s, d } = buat();
  d.saveNow('form', { x: 1 });
  d.setUser('u2');
  assert.equal(d.read('form'), null, 'akun lain tidak melihat draf akun pertama');
  d.saveNow('form', { x: 2 });
  assert.ok([...s.m.keys()].every((k) => k.startsWith(PREFIX)));
  d.setUser('u1');
  assert.deepEqual(d.read('form'), { x: 1 });
});

test('tanpa akun, tidak ada yang ditulis atau dibaca', () => {
  const s = memStorage();
  const d = createDraftStore({ storage: s });
  d.save('form', { x: 1 }); d.saveNow('form', { x: 1 });
  assert.equal(d.flush(), true);
  assert.equal(s.m.size, 0);
  assert.equal(d.read('form'), null);
});

test('draf kedaluwarsa dibuang saat dibaca dan saat setUser', () => {
  const { s, j, d } = buat();
  d.saveNow('lama', { x: 1 });
  j.maju(TTL_MS + 1);
  assert.equal(d.read('lama'), null);
  assert.equal(s.m.size, 0, 'entri usang ikut dihapus');
  d.saveNow('lama2', 1); j.maju(TTL_MS + 1);
  d.setUser('u1');
  assert.equal(s.m.size, 0, 'purgeExpired menyapu yang usang');
});

test('data rusak atau versi lain dianggap tidak ada, bukan galat', () => {
  const { s, d } = buat();
  s.m.set(PREFIX + 'u1:a', '{bukan json');
  s.m.set(PREFIX + 'u1:b', JSON.stringify({ v: 99, t: 1, d: 1 }));
  s.m.set(PREFIX + 'u1:c', JSON.stringify({ v: 1, t: 'x', d: 1 }));
  for (const n of ['a', 'b', 'c']) assert.equal(d.read(n), null);
  assert.equal(s.m.size, 0);
});

test('penyimpanan penuh: tidak melempar, melaporkan gagal lewat onStatus', () => {
  const { d } = buat({ storage: memStorage({ penuh: true }) });
  const log = []; d.onStatus((x) => log.push(x));
  assert.equal(d.saveNow('form', { x: 1 }), false);
  assert.deepEqual(log.map((x) => [x.ok, x.reason]), [[false, 'ditolak']]);
});

test('terlalu besar ditolak tanpa menyentuh penyimpanan', () => {
  const { s, d } = buat();
  const log = []; d.onStatus((x) => log.push(x));
  assert.equal(d.saveNow('besar', 'x'.repeat(MAX_CHARS + 1)), false);
  assert.equal(s.m.size, 0);
  assert.equal(log[0].reason, 'terlalu-besar');
});

test('remove menghapus draf dan membatalkan tulisan tertunda untuk nama itu saja', () => {
  const { s, j, d } = buat();
  d.saveNow('a', 1);
  d.save('a', 2); d.save('b', 3);
  d.remove('a');
  j.jalankan(); d.flush();
  assert.equal(d.read('a'), null, 'penulisan tertunda tidak menghidupkan lagi draf yang sudah dihapus');
  assert.equal(d.read('b'), 3);
  assert.equal(s.m.size, 1);
});

test('clearAll hanya menghapus draf akun sendiri', () => {
  const { s, d } = buat();
  d.saveNow('a', 1);
  s.m.set('lain:kunci', 'tetap');
  d.setUser('u2'); d.saveNow('a', 9);
  d.setUser('u1'); d.clearAll();
  assert.equal(d.read('a'), null);
  assert.equal(s.m.get('lain:kunci'), 'tetap');
  d.setUser('u2');
  assert.equal(d.read('a'), 9);
});

test('ganti akun menulis dulu sisa draf akun sebelumnya', () => {
  const { s, d } = buat();
  d.save('form', { x: 1 });
  d.setUser('u2');
  assert.ok(s.m.has(PREFIX + 'u1:form'));
});

test('storage null (diblokir browser): semua operasi aman dan diam', () => {
  const d = createDraftStore({ storage: null }); d.setUser('u1');
  d.save('a', 1); d.saveNow('a', 1); d.remove('a'); d.clearAll(); d.purgeExpired();
  assert.equal(d.read('a'), null);
  assert.equal(d.flush(), true);
});
