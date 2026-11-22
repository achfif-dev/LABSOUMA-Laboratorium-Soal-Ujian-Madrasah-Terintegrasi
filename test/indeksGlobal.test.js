// Indeks pencarian lintas kitab: bagian murni (web/lib/indeksGlobal.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  N_BUCKET, MAKS_ISTILAH_KUERI, batang, istilahHalaman, istilahKitab, bucketDari, idBucket, kelompokBucket, kodeSegmen, bacaBatang, buangNomor, byteUtf8,
  gabungBucket, istilahKueri, peringkatKitab, pilihDariPeringkat,
} from '../web/lib/indeksGlobal.js';
import { normalCari } from '../web/lib/cariKitab.js';

test('batang: awalan Arab menempel dibuang bila sisa >= 3 huruf, kata pendek utuh', () => {
  for (const w of ['الكتاب', 'كتاب', 'بالكتاب', 'وبالكتاب', 'والكتاب']) assert.equal(batang(w), 'كتاب', w);
  assert.equal(batang('للصلاه'), 'صلاه'); assert.equal(batang('وصلاه'), 'صلاه');
  assert.equal(batang('بيع'), 'بيع', 'ب adalah huruf akar: sisa 2 huruf tidak boleh dipotong');
  assert.equal(batang('والبيع'), 'بيع');
  assert.equal(batang('الله'), 'الله'); assert.equal(batang(''), ''); assert.equal(batang(undefined), '');
  assert.equal(batang('zakat'), 'zakat');
});

test('istilahHalaman: batang + jumlah kemunculan; angka dan kata sangat pendek dilewati', () => {
  const t = normalCari('وبالكتاب والصلاة للصلاة الصَّلَاةُ 123 في و');
  assert.deepEqual([...istilahHalaman(t)].sort(), [['صلاه', 3], ['كتاب', 1]].sort());
  assert.equal(istilahHalaman('').size, 0); assert.equal(istilahHalaman(null).size, 0);
});

test('istilahKitab: kata umum (> 30% halaman) hanya dibuang pada kitab >= 50 halaman', () => {
  const buat = (n) => Array.from({ length: n }, (_, i) => ({ s: i + 1, t: `قال شيخنا مسئله${i}` }));
  const kecil = istilahKitab(buat(10)); assert.ok(kecil.istilah.has('قال'), 'kitab kecil: tidak ada kata umum'); assert.equal(kecil.dibuangUmum, 0);
  const besar = istilahKitab(buat(60)); assert.ok(!besar.istilah.has('قال') && !besar.istilah.has('شيخنا')); assert.ok(besar.istilah.has('مسئله7')); assert.equal(besar.halaman, 60); assert.equal(besar.dibuangUmum, 2);
  const kembar = istilahKitab([{ s: 1, t: 'زكاه' }, { s: 1, t: 'زكاه زكاه' }, { s: 2, t: 'زكاه' }]);
  assert.deepEqual(kembar.istilah.get('زكاه'), [[1, 1], [2, 1]], 'seq kembar dibuang, urut menaik');
});

test('kodeSegmen/bacaBatang: bolak-balik tepat, selisih dan jumlah kemunculan, segmen cacat dilewati', () => {
  const seg = kodeSegmen(35, [[1, 1], [3, 2], [40, 1], [5000, 1295]]);
  assert.deepEqual(bacaBatang(seg), [{ no: 35, seq: 1, tf: 1 }, { no: 35, seq: 3, tf: 2 }, { no: 35, seq: 40, tf: 1 }, { no: 35, seq: 5000, tf: 1295 }]);
  const dua = `${seg}|${kodeSegmen(2, [[7, 3]])}`; assert.equal(bacaBatang(dua).length, 5);
  assert.deepEqual(bacaBatang('rusak|~1,2|5~|zz~0'), [], 'cacat: tanpa pemisah, tanpa nomor, selisih 0');
  assert.deepEqual(bacaBatang(''), []); assert.deepEqual(bacaBatang(null), []);
});

test('buangNomor menghapus hanya segmen kitab itu', () => {
  const str = `${kodeSegmen(1, [[1, 1]])}|${kodeSegmen(2, [[2, 1]])}|${kodeSegmen(3, [[3, 1]])}`;
  assert.deepEqual(bacaBatang(buangNomor(str, new Set([2]))).map((x) => x.no), [1, 3]);
  assert.equal(buangNomor(kodeSegmen(1, [[1, 1]]), new Set([1])), '');
});

test('bucketDari: deterministik, dalam rentang, dan cukup merata', () => {
  assert.equal(bucketDari('زكاه'), bucketDari('زكاه')); assert.equal(idBucket(7), 'b0007'); assert.equal(idBucket(1023), 'b1023');
  const hitung = new Array(N_BUCKET).fill(0);
  for (let i = 0; i < 20000; i++) { const b = bucketDari(`كلمه${i}x${(i * 7919) % 1013}`); assert.ok(b >= 0 && b < N_BUCKET); hitung[b]++; }
  assert.ok(Math.max(...hitung) < (20000 / N_BUCKET) * 3, 'tidak ada bucket yang membengkak');
  const kel = kelompokBucket(new Map([['زكاه', [[1, 1]]], ['بقر', [[2, 1]]]])); assert.equal([...kel.values()].reduce((n, m) => n + m.size, 0), 2);
});

test('byteUtf8 sama dengan Buffer', () => {
  for (const s of ['abc', 'زكاة', 'a😀b', '']) assert.equal(byteUtf8(s), Buffer.byteLength(s));
});

test('gabungBucket: idempoten, menimpa segmen kitab yang sama, membuang nomor usang, dan membuang kata yang kosong', () => {
  const tambah = (no, kata) => ({ no, istilah: new Map(Object.entries(kata)) });
  const a = gabungBucket({}, [tambah(1, { زكاه: [[1, 1], [4, 2]] }), tambah(2, { زكاه: [[9, 1]], بقر: [[9, 1]] })]);
  assert.deepEqual(bacaBatang(a.data['زكاه']).map((x) => `${x.no}:${x.seq}`), ['1:1', '1:4', '2:9']);
  const dua = gabungBucket(a.data, [tambah(1, { زكاه: [[1, 1], [4, 2]] }), tambah(2, { زكاه: [[9, 1]], بقر: [[9, 1]] })]);
  assert.deepEqual(dua.data, a.data, 'menjalankan penggabungan yang sama dua kali tidak mengubah apa pun');
  const ganti = gabungBucket(a.data, [tambah(1, { زكاه: [[2, 1]] })]);
  assert.deepEqual(bacaBatang(ganti.data['زكاه']).filter((x) => x.no === 1).map((x) => x.seq), [2], 'segmen lama kitab 1 diganti, bukan ditumpuk');
  const usang = gabungBucket(a.data, [], new Set([2]));
  assert.ok(!('بقر' in usang.data), 'kata yang hanya dimiliki kitab usang hilang'); assert.deepEqual(bacaBatang(usang.data['زكاه']).map((x) => x.no), [1, 1]);
});

test('gabungBucket: melebihi batas byte memotong segmen BARU yang terbesar, isi lama utuh', () => {
  const lama = { قديم: kodeSegmen(9, [[1, 1], [2, 1]]) };
  const besar = new Map(); for (let i = 0; i < 200; i++) besar.set(`كلمه${i}`, Array.from({ length: 20 }, (_, j) => [j + 1, 1]));
  const r = gabungBucket(lama, [{ no: 3, istilah: besar }], new Set(), { maksByte: 1500 });
  assert.ok(r.terpotong > 0); assert.ok(r.byte <= 1500, `byte ${r.byte}`); assert.equal(r.data['قديم'], lama['قديم']);
  assert.equal(r.byte, byteUtf8(JSON.stringify(r.data)));
});

test('istilahKueri: batang unik, bobot tertinggi menang, varian lebih ringan, kata pendek/angka dibuang, dibatasi', () => {
  const r = istilahKueri([['زكاه', 'البقر', '12', 'في']], [['بقر', 'نصاب']]);
  assert.deepEqual(r, [{ stem: 'زكاه', bobot: 1 }, { stem: 'بقر', bobot: 1 }, { stem: 'نصاب', bobot: 0.5 }]);
  assert.deepEqual(istilahKueri(null, null), []);
  const banyak = [Array.from({ length: 60 }, (_, i) => `كلمه${i}`)]; assert.equal(istilahKueri(banyak).length, MAKS_ISTILAH_KUERI);
});

test('peringkatKitab: kelengkapan kata mengalahkan ketebalan kitab; kitab di luar idDariNo diabaikan', () => {
  const tebal = Array.from({ length: 500 }, (_, i) => ({ no: 1, seq: i + 1, tf: 1 }));
  const posting = new Map([
    ['زكاه', [...tebal, { no: 2, seq: 10, tf: 2 }, { no: 2, seq: 11, tf: 1 }, { no: 9, seq: 1, tf: 50 }]],
    ['بقر', [{ no: 2, seq: 10, tf: 1 }, { no: 2, seq: 11, tf: 1 }, { no: 9, seq: 1, tf: 50 }]],
  ]);
  const istilah = [{ stem: 'زكاه', bobot: 1 }, { stem: 'بقر', bobot: 1 }, { stem: 'غائب', bobot: 1 }];
  const r = peringkatKitab(posting, istilah, { idDariNo: new Map([[1, 'tebal'], [2, 'lengkap']]), totalHalaman: 1000 });
  assert.deepEqual(r.kitab.map((k) => k.id), ['lengkap', 'tebal'], 'no 9 tidak terdaftar: tidak ikut');
  assert.equal(r.istilahAda, 2); assert.equal(r.istilahTotal, 3);
  assert.deepEqual(r.kitab[0].halaman.map((h) => h.seq).sort((a, b) => a - b), [10, 11]);
  assert.deepEqual(peringkatKitab(new Map(), istilah, { idDariNo: new Map([[1, 'a']]), totalHalaman: 10 }).kitab, []);
});

test('pilihDariPeringkat: batas rasio terhadap skor teratas dan jumlah maksimum', () => {
  const k = [{ id: 'a', skor: 10 }, { id: 'b', skor: 3 }, { id: 'c', skor: 2.4 }, { id: 'd', skor: 0.1 }];
  assert.deepEqual(pilihDariPeringkat(k), ['a', 'b']); assert.deepEqual(pilihDariPeringkat(k, { rasio: 0.2 }), ['a', 'b', 'c']);
  assert.deepEqual(pilihDariPeringkat(k, { rasio: 0, maks: 2 }), ['a', 'b']); assert.deepEqual(pilihDariPeringkat([]), []); assert.deepEqual(pilihDariPeringkat(null), []);
});
