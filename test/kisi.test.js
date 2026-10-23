import test from 'node:test';
import assert from 'node:assert/strict';
import { normBab, ada, samaBab, rentangHal, untukMurid, buatKisi, fokusMurid, analisisCakupan, kisiKeCsv, kisiKeTeks, buatKisiDocx } from '../src/kisi.js';

const Q = (o) => ({ nama: 'Safinatun Naja', juz: '', hal: '3', bab: 'Bab Thaharah', level: 'L1', indikator: 'Peserta didik dapat menyebutkan syarat sah wudhu.', mapel: 'Fiqih', tingkat: 'Tsanawiyah', kelas: 'VII', ujian: 'UTS Semester 1',
  kunci: 'C', opsi: { A: 'RAHASIA-OPSI-A', B: 'b', C: 'RAHASIA-KUNCI-C', D: 'd', E: 'e' }, pembahasan: 'RAHASIA-PEMBAHASAN', pertanyaan: 'RAHASIA-PERTANYAAN', ...o });
const SOAL = [Q({}), Q({ hal: '5', level: 'L2', indikator: 'Peserta didik dapat menerapkan syarat wudhu pada kasus.' }), Q({ bab: 'Bab Shalat', hal: '12', level: 'L3', indikator: 'Peserta didik dapat menganalisis sebab batalnya shalat.' }), Q({ bab: '', hal: '', indikator: '' })];

test('normBab dan ada: harakat, bentuk huruf Arab, apostrof Latin, dan kecocokan sebagian kata bermakna', () => {
  assert.equal(normBab('بَابُ الطَّهَارَةِ'), normBab('باب الطهارة'));
  assert.equal(normBab("Fathul Mu'in"), normBab('fathul muin'));
  assert.ok(samaBab('  BAB Thaharah ', 'bab thaharah.'));
  assert.ok(ada('Bab Wudhu', 'Bab Wudhu dan syaratnya\nBab Shalat'));
  assert.ok(ada('Syarat sah wudhu', 'Bab Wudhu dan syaratnya\nBab Shalat'), '2 dari 3 kata bermakna');
  assert.equal(ada('Bab Haji', 'Bab Wudhu\nBab Shalat'), false, 'kata "bab" saja tidak cukup');
  assert.equal(ada('', 'abc'), false);
  assert.ok(ada('Bab Zakat', 'Kitab Zakat\nBab Puasa'), 'satu kata bermakna, kata utuh');
  assert.equal(ada('Bab Sah', 'Bab Shalat'), false, 'potongan kata lain tidak dihitung');
  assert.ok(ada('باب الطهارة', 'كتاب الطَّهَارَةِ\nباب الصلاة'));
});

test('rentangHal dan untukMurid', () => {
  assert.equal(rentangHal(['5', '3', '12']), '3–12'); assert.equal(rentangHal(['7', '7']), '7'); assert.equal(rentangHal(['', null]), '');
  assert.equal(rentangHal(['ii', 'iii', 'iv', 'v']), 'ii, iii, iv, dst.');
  assert.equal(untukMurid('Peserta didik dapat Menyebutkan syarat wudhu.'), 'Mampu menyebutkan syarat wudhu.');
  assert.equal(untukMurid(''), '');
});

test('buatKisi: pengelompokan per bab, nomor mengikuti urutan soal, bobot, level, soal tanpa bab terpisah di akhir', () => {
  const k = buatKisi(SOAL, { judul: 'UTS Fiqih' });
  assert.equal(k.meta.total, 4); assert.deepEqual(k.perLevel, { L1: 2, L2: 1, L3: 1 });
  assert.deepEqual(k.kelompok.map((g) => g.bab), ['Bab Thaharah', 'Bab Shalat', 'Belum ditandai bab']);
  const th = k.kelompok[0];
  assert.deepEqual(th.soal.map((s) => s.no), [1, 2]); assert.equal(th.bobot, 50); assert.equal(th.rujukan, 'Safinatun Naja, hal. 3–5');
  assert.equal(k.tanpaBab, 1); assert.equal(k.kelompok[2].soal[0].no, 4);
  assert.equal(k.meta.kelas, 'VII'); assert.deepEqual(k.meta.kitab, ['Safinatun Naja']);
  assert.equal(buatKisi([]).meta.total, 0);
});

test('buatKisi: urutan bab mengikuti saran AI (inti dulu) dan prioritas ikut terbawa', () => {
  const k = buatKisi(SOAL, { urutanBab: ['Bab Shalat', 'Bab Thaharah'], prioritas: { 'Bab Shalat': 'inti', 'bab thaharah': 'penting' } });
  assert.deepEqual(k.kelompok.map((g) => g.bab), ['Bab Shalat', 'Bab Thaharah', 'Belum ditandai bab']);
  assert.deepEqual(k.kelompok.map((g) => g.prioritas), ['inti', 'penting', '']);
});

test('kisi-kisi aman dibagikan: kunci, opsi, pertanyaan, dan pembahasan tidak pernah ikut keluar', () => {
  const k = buatKisi(SOAL, { judul: 'UTS' });
  const semua = JSON.stringify(k) + JSON.stringify(fokusMurid(k)) + kisiKeCsv(k) + kisiKeTeks(k);
  assert.doesNotMatch(semua, /RAHASIA/);
  assert.doesNotMatch(Object.keys(k.kelompok[0].soal[0]).join(','), /kunci|opsi|pembahasan|pertanyaan/);
});

test('fokusMurid: butir unik berbentuk "Mampu ...", rujukan dan bobot per bab', () => {
  const dua = [Q({}), Q({ hal: '4' }), Q({ indikator: 'Peserta didik dapat merinci rukun wudhu.' })];
  const f = fokusMurid(buatKisi(dua));
  assert.equal(f.length, 1); assert.deepEqual(f[0].butir, ['Mampu menyebutkan syarat sah wudhu.', 'Mampu merinci rukun wudhu.']); assert.equal(f[0].jumlah, 3);
});

test('analisisCakupan: bab inti kosong, kurang/cukup/lebih terhadap alokasi, bab di luar saran, soal tanpa bab', () => {
  const saran = [{ nama: 'Bab Thaharah', prioritas: 'inti', alokasi: 2 }, { nama: 'Bab Shalat', prioritas: 'inti', alokasi: 3 }, { nama: 'Bab Zakat', prioritas: 'inti', alokasi: 2 }, { nama: 'Bab Puasa', prioritas: 'pendukung', alokasi: 0 }];
  const r = analisisCakupan(saran, [...SOAL, Q({ bab: 'Bab Haji' })]);
  const s = Object.fromEntries(r.baris.map((b) => [b.nama, b.status]));
  assert.deepEqual(s, { 'Bab Thaharah': 'cukup', 'Bab Shalat': 'kurang', 'Bab Zakat': 'kosong', 'Bab Puasa': 'kosong' });
  assert.deepEqual(r.intiKosong, ['Bab Zakat']); assert.equal(r.tanpaBab, 1); assert.deepEqual(r.diluarSaran, [{ bab: 'Bab Haji', jumlah: 1 }]);
  assert.equal(analisisCakupan(saran, [Q({}), Q({}), Q({})]).baris[0].status, 'lebih');
  assert.equal(analisisCakupan([{ nama: 'Bab Thaharah' }], [Q({})]).baris[0].status, 'ada');
});

test('CSV dan teks: BOM, kutip ganda di-escape, ringkasan level', () => {
  const k = buatKisi([Q({ indikator: 'Peserta didik dapat membaca "niat" wudhu.' })]);
  const csv = kisiKeCsv(k);
  assert.ok(csv.startsWith('﻿"No Soal"')); assert.match(csv, /"Peserta didik dapat membaca ""niat"" wudhu\."/);
  assert.match(kisiKeTeks(k), /Ringkasan level: L1 1, L2 0, L3 0/);
});

let D = null; try { D = await import('docx'); } catch { /* paket docx tidak ada di CI: tes DOCX dilewati */ }
test('DOCX: dokumen kisi-kisi, lembar fokus, dan gabungan bisa dibangun dan dikemas', { skip: !D && 'paket docx tidak terpasang' }, async () => {
  const lib = D.default && D.default.Document ? D.default : D;
  const k = buatKisi(SOAL, { judul: 'UTS Fiqih', madrasah: 'MTs Contoh' });
  for (const mode of ['kisi', 'fokus', 'lengkap']) {
    const buf = await lib.Packer.toBuffer(buatKisiDocx(lib, k, mode));
    assert.equal(buf.slice(0, 2).toString(), 'PK'); assert.ok(buf.length > 2000, mode);
  }
});
