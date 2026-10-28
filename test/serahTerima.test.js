import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rencanaPilihSoal, rencanaBukaPaket, FILTER_KOSONG } from '../web/lib/serahTerima.js';

test('rencanaPilihSoal: export dan fokus memakai nama draf berbeda, pilihan lama dipertahankan, id dibersihkan', () => {
  const e = rencanaPilihSoal('export', ['a', 'a', '', 5, 'b'], { fmt: 'docx', picked: ['x'] });
  assert.deepEqual(e.map((x) => x.nama), ['exportFilter', 'exportPrefs']);
  assert.deepEqual(e[1].nilai, { fmt: 'docx', picked: ['a', 'b'] });
  assert.deepEqual(e[0].nilai, FILTER_KOSONG);
  const f = rencanaPilihSoal('fokus', ['a'], null);
  assert.deepEqual(f.map((x) => x.nama), ['kisiFilter', 'kisiPrefs']);
  assert.deepEqual(f[1].nilai, { picked: ['a'] });
  assert.equal(rencanaPilihSoal('export', [], {}), null);
  assert.equal(rencanaPilihSoal('lain', ['a'], {}), null);
});

test('rencanaBukaPaket: filter paket tanpa batas status', () => {
  const r = rencanaBukaPaket('pk-1');
  assert.deepEqual(r, [{ nama: 'bankFilter', nilai: { mapel: '', tingkat: '', kelas: '', periode: '', status: '', paket: 'pk-1' } }]);
  assert.equal(rencanaBukaPaket(''), null);
});

test('nama draf yang disiapkan benar-benar dibaca tab tujuan di App.jsx', () => {
  const app = readFileSync(new URL('../web/App.jsx', import.meta.url), 'utf8');
  for (const n of ['exportFilter', 'exportPrefs', 'kisiFilter', 'kisiPrefs', 'bankFilter']) assert.ok(app.includes(`'${n}'`), `App.jsx tidak memakai draf ${n}`);
  assert.match(app, /const FAWAL = \{[^}]*paket: ''/); // Bank menyimpan filter paket; tanpa ini bacaPref membuangnya
});
