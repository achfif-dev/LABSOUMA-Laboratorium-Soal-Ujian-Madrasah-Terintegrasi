import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { kamus, convertText, kalibrasiOk } from '../src/pegon.js';

const berkas = readFileSync(new URL('../docs/kamus-serapan-arab-kitab-pesantren.json', import.meta.url), 'utf8');
const data = JSON.parse(berkas);

test('kamus serapan kitab pesantren: seluruh entri lolos impor (tidak ada yang dilewati) dan jumlahnya cocok dengan _meta', () => {
  const r = kamus.impor(berkas);
  assert.equal(r.lewat, 0);
  assert.equal(r.masuk, Object.keys(data.arabic).length);
  assert.equal(r.masuk, data._meta.jumlah);
  assert.ok(r.masuk >= 600);
});

test('kamus serapan kitab pesantren: layak masuk kamus bersama (bentukEntri) dan tiap kata dipegonkan persis seperti isinya', () => {
  kamus.impor(berkas);
  for (const [k, v] of Object.entries(data.arabic)) {
    assert.ok(!/[’']/.test(k), `${k}: kunci tidak boleh beraposisi apostrof (mesin membuangnya saat mencari)`);
    assert.equal(kamus.bentukEntri({ jenis: 'arab', kata: k, arab: v }).ok, true, k);
    assert.equal(convertText(k).pegon, v, k);
  }
});

test('kamus serapan kitab pesantren: tidak memakai kata Indonesia sehari-hari yang artinya lain (ayah, ahad, kutub, mani, madah, asma, sahabat)', () => {
  for (const k of ['ayah', 'ahad', 'kutub', 'mani', 'madah', 'asma', 'sahabat', 'dam', 'mal', 'umm']) assert.equal(Object.hasOwn(data.arabic, k), false, k);
  kamus.impor(berkas);
  assert.notEqual(convertText('ayah').pegon, 'آية');
});

test('kamus serapan kitab pesantren: kalibrasi mesin tetap lulus, tidak ada kunci yang sudah ada di kamus bawaan', () => {
  kamus.impor(berkas);
  assert.equal(kalibrasiOk(), true);
  const bawaan = kamus.bawaan().arab;
  for (const k of Object.keys(data.arabic)) assert.equal(Object.hasOwn(bawaan, k), false, `${k} sudah ada di kamus bawaan`);
});
