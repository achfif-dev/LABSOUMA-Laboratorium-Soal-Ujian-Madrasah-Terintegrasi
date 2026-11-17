import test from 'node:test';
import assert from 'node:assert/strict';
import { kandidatRapikan, hapusKandidat, MIN_SIMPAN } from '../web/lib/rapikanCadangan.js';

const f = (name, id = name) => ({ id, name });
const berkas = [
  f('labsouma-backup-2026-11-01-0900.json'), f('labsouma-backup-2026-11-17-0900.json'), f('labsouma-backup-2026-11-10-0900.json'), f('labsouma-backup-2026-10-01-0900.json'),
  f('labsouma-soalluar-2026-11-01-0900.json'), f('labsouma-soalluar-2026-11-17-0900.json'), f('labsouma-soalluar-2026-10-01-0900.json'),
  f('labsouma-soal-saya-2026-11-17.json'), f('catatan.txt'), f('labsouma-backup-2026-11-17-0900.json.bak'), { name: 'labsouma-backup-2026-01-01-0900.json' }, null,
];

test('kandidat: yang lebih tua dari N terbaru menurut nama; jenis tidak tercampur; berkas lain, Soal Saya, tanpa id, dan nama mirip tidak disentuh', () => {
  assert.deepEqual(kandidatRapikan(berkas, 'soal', 2).map((x) => x.name), ['labsouma-backup-2026-11-01-0900.json', 'labsouma-backup-2026-10-01-0900.json']);
  assert.deepEqual(kandidatRapikan(berkas, 'luar', 2).map((x) => x.name), ['labsouma-soalluar-2026-10-01-0900.json']);
  assert.deepEqual(kandidatRapikan(berkas, 'soal', 5), []);
  const semua = [...kandidatRapikan(berkas, 'soal', 2), ...kandidatRapikan(berkas, 'luar', 2)].map((x) => x.name);
  assert.ok(!semua.some((n) => /soal-saya|catatan|\.bak/.test(n)));
});

test('pengaman: yang terbaru tidak pernah ikut, jumlah simpan di bawah minimum dinaikkan, nilai ngawur tidak menghapus apa pun', () => {
  const l = Array.from({ length: 6 }, (_, i) => f(`labsouma-backup-2026-11-0${i + 1}-0900.json`));
  for (const n of [0, 1, -5]) { const k = kandidatRapikan(l, 'soal', n).map((x) => x.name); assert.equal(k.length, l.length - MIN_SIMPAN); assert.ok(!k.includes('labsouma-backup-2026-11-06-0900.json') && !k.includes('labsouma-backup-2026-11-05-0900.json')); }
  for (const n of [NaN, 'abc', Infinity]) assert.deepEqual(kandidatRapikan(l, 'soal', n), [], `simpan=${n}`);
  assert.deepEqual(kandidatRapikan(l, 'lain', 2), []); assert.deepEqual(kandidatRapikan(null, 'soal', 2), []);
  assert.equal(kandidatRapikan(l, 'soal', '3').length, 3, 'angka dalam teks (dari <select>) diterima');
});

test('hapusKandidat: satu gagal tidak menghentikan yang lain; token kedaluwarsa dilempar ulang', async () => {
  const dihapus = [];
  const drive = { hapus: async (id) => { if (id === 'b') throw new Error('x'); dihapus.push(id); } };
  const r = await hapusKandidat(drive, [f('a'), f('b'), f('c')]);
  assert.deepEqual(dihapus, ['a', 'c']); assert.deepEqual(r, { dihapus: 2, gagal: ['b'] });
  await assert.rejects(() => hapusKandidat({ hapus: async () => { const e = new Error('t'); e.code = 'DRIVE_TOKEN'; throw e; } }, [f('a')]), { code: 'DRIVE_TOKEN' });
});
