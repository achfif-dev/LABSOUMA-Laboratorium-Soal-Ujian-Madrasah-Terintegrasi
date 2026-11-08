// Pemeriksa tulisan Latin sebelum dipegonkan (web/lib/periksaTulisan.js) dan pendukungnya di mesin Pegon.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { periksaTulisan, kelompokkan, terapkan, terapkanPasti, saranSorotan } from '../web/lib/periksaTulisan.js';
import { kamus, kunciKamus, dikenalSebagaiArab, adaKataIndonesia, convertText } from '../src/pegon.js';

kamus.impor(readFileSync(new URL('../docs/kamus-serapan-arab-kitab-pesantren.json', import.meta.url), 'utf8'));
const opsi = () => ({ kunci: kunciKamus(), dikenalArab: dikenalSebagaiArab, indonesia: adaKataIndonesia });
const cek = (t) => periksaTulisan(t, opsi());
const kode = (t) => cek(t).map((x) => x.kode);

test('teks bersih tidak menghasilkan peringatan', () => {
  assert.deepEqual(cek('Hukum shalat berjamaah adalah sunnah muakkadah menurut mazhab Syafii.'), []);
  assert.deepEqual(cek('Siapakah yang menulis kitab Fathul Qarib? Jawab: Abu Syuja.'), []);
});

test('singkatan tidak baku, ejaan tidak baku, dan kata depan disambung terdeteksi dengan saran yang benar', () => {
  const r = cek('tdk sah krn diatas kapal, dimana tempatnya');
  const map = Object.fromEntries(r.map((x) => [x.dari.toLowerCase(), x.saran]));
  assert.equal(map.tdk, 'tidak'); assert.equal(map.krn, 'karena'); assert.equal(map.diatas, 'di atas'); assert.equal(map.dimana, 'di mana');
  assert.equal(r.find((x) => x.dari === 'dimana').tingkat, 'periksa', 'dimana bisa penghubung: tidak otomatis');
  assert.equal(r.find((x) => x.dari === 'tdk').pasti, true);
  assert.equal(cek('Karna itu').find((x) => x.kode === 'TIDAK_BAKU').saran, 'Karena', 'huruf kapital awal dipertahankan');
  assert.equal(cek('SHOLAT').find((x) => x.kode === 'TIDAK_BAKU').saran, 'SHALAT');
});

test('di + kata kerja yang seharusnya awalan, kata ganda, kurung dan kutip tidak seimbang', () => {
  assert.equal(cek('soal itu di ambil dari kitab').find((x) => x.kode === 'AWALAN_DI').saran, 'diambil');
  assert.deepEqual(kode('tempat di Makkah'), [], 'di sebagai kata depan tidak diganggu');
  assert.ok(kode('yang yang diminta').includes('KATA_GANDA'));
  assert.ok(kode('(fathul qarib').includes('KURUNG'));
  assert.ok(kode('ia berkata "halo').includes('KUTIP'));
});

test('spasi: ganda, sebelum tanda, tanpa spasi sesudah tanda, karakter tak terlihat; URL tidak disentuh', () => {
  const t = 'kata  ganda ,lalu kata,tanpa spasi\u00A0di sini\u200Bsatu';
  const r = cek(t);
  for (const k of ['SPASI_GANDA', 'SPASI_SEBELUM_TANDA', 'SPASI_SESUDAH_TANDA', 'SPASI_ANEH']) assert.ok(r.some((x) => x.kode === k), k);
  assert.equal(terapkanPasti(t, r), 'kata ganda, lalu kata, tanpa spasi di sinisatu');
  assert.deepEqual(cek('lihat https://contoh.id/a,b dan www.contoh.id/x,y').filter((x) => x.kode.startsWith('SPASI')), []);
  assert.deepEqual(cek('Nilai 2,5 dan Rp1.000,00').filter((x) => x.kode.startsWith('SPASI')), []);
});

test('mirip kata kamus: salah ketik kata serapan Arab disarankan; kata Indonesia dan kata dikenal tidak diganggu', () => {
  const r = cek('shalatt wajibb mukallaf');
  const s = Object.fromEntries(r.filter((x) => x.kode === 'MIRIP_KAMUS').map((x) => [x.dari, x.saran]));
  assert.equal(s.shalatt, 'shalat'); assert.equal(s.wajibb, 'wajib');
  assert.equal(r.find((x) => x.dari === 'shalatt').tingkat, 'periksa');
  assert.deepEqual(cek('membaca menulis berbicara pembelajaran').filter((x) => x.kode === 'MIRIP_KAMUS'), []);
  assert.deepEqual(cek('shalat wajib mukalaf').filter((x) => x.kode === 'MIRIP_KAMUS'), []);
  assert.deepEqual(cek('Abu Syuja dan Fatimah').filter((x) => x.kode === 'MIRIP_KAMUS'), [], 'nama berhuruf kapital tidak disaran');
});

test('terapkan: satu kelompok sekaligus, dari belakang, dan item yang sudah usang dilewati', () => {
  const t = 'tdk dan tdk lagi';
  const k = kelompokkan(cek(t).filter((x) => x.kode === 'SINGKATAN'));
  assert.equal(k.length, 1); assert.equal(k[0].items.length, 2);
  assert.equal(terapkan(t, k[0].items), 'tidak dan tidak lagi');
  const r = cek(t);
  assert.equal(terapkan('xyz dan lain', r), 'xyz dan lain', 'teks sudah berubah: item tidak cocok, tidak ada yang ditimpa');
  assert.equal(terapkan('soal ini di ambil', cek('soal ini di ambil')), 'soal ini diambil');
  assert.equal(terapkan('(abc', cek('(abc')), '(abc', 'peringatan tanpa saran tidak mengubah teks');
});

test('akibat nyata pada Pegon: perbaikan mengubah hasil konversi menjadi benar', () => {
  const salah = 'sholat diatas kapal'; const benar = terapkan(salah, cek(salah));
  assert.equal(benar, 'shalat di atas kapal');
  assert.notEqual(convertText(salah).pegon, convertText(benar).pegon);
  assert.ok(convertText(benar).pegon.startsWith('صلاة '));
});

test('adaKataIndonesia: akar KBBI dengan imbuhan dikenali; saranSorotan menjelaskan tindakan', () => {
  for (const w of ['membaca', 'menulis', 'berbicara', 'dibicarakan', 'pembelajaran', 'mempelajari']) assert.equal(adaKataIndonesia(w), true, w);
  assert.equal(adaKataIndonesia('shalatt'), false);
  assert.match(saranSorotan('kemungkinan serapan Arab yang belum ada di kamus'), /kamus/);
  assert.match(saranSorotan('ada bunyi e — cek pepet/keras'), /keras atau pepet/);
});
