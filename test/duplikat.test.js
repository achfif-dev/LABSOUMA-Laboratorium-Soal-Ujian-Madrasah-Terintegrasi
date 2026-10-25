// Deteksi soal kembar atau mirip saat menyimpan (web/lib/duplikat.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalisasi, bandingkan, cari, pesanKonfirmasi, AMBANG_MIRIP, AMBANG_KEMBAR } from '../web/lib/duplikat.js';

const pg = (pertanyaan, opsi, kunci, ekstra = {}) => ({ pertanyaan, opsi: { A: opsi[0] || '', B: opsi[1] || '', C: opsi[2] || '', D: opsi[3] || '', E: opsi[4] || '' }, kunci, ...ekstra });
const MAGHRIB = pg('Berapa rakaat shalat Maghrib?', ['2', '3', '4', '5', '6'], 'B');

test('normalisasi: harakat, variasi alif/ya/ta marbutah, huruf besar, tanda baca, dan titik isian disamakan', () => {
  assert.equal(normalisasi('الْمِيَاهُ  الطَّاهِرَةُ'), normalisasi('المياه الطاهره'));
  assert.equal(normalisasi('أحمد'), normalisasi('احمد'));
  assert.equal(normalisasi('Syarat SHALAT ada .....'), 'syarat shalat ada _');
  assert.equal(normalisasi('Syarat shalat ada ........'), 'syarat shalat ada _');
  assert.equal(normalisasi('  Apa   itu "wudhu"?  '), 'apa itu wudhu');
  assert.equal(normalisasi(null), '');
});

test('soal identik adalah kembar (skor 1); urutan opsi diacak tetap kembar', () => {
  const r = bandingkan(MAGHRIB, MAGHRIB);
  assert.equal(r.skor, 1); assert.equal(r.jenis, 'kembar');
  const acak = pg('Berapa rakaat shalat Maghrib?', ['6', '5', '4', '3', '2'], 'D');
  assert.equal(bandingkan(MAGHRIB, acak).jenis, 'kembar');
  assert.equal(bandingkan(MAGHRIB, acak).kunciBeda, false); // kunci berbeda huruf tetapi teks jawabannya sama (3)
});

test('perbedaan huruf besar, tanda baca, dan harakat tidak menghindarkan dari deteksi', () => {
  const a = pg('الْمَاءُ الْمُطْلَقُ هُوَ', ['الطاهر', 'النجس'], 'A', { bentuk: 'lanjutan' });
  const b = pg('الماء المطلق هو ....', ['الطاهر', 'النجس'], 'A', { bentuk: 'lanjutan' });
  assert.equal(bandingkan(a, b).jenis, 'kembar');
});

test('kalimat tanya yang diparafrase terdeteksi mirip, bukan kembar', () => {
  const r = bandingkan(MAGHRIB, pg('Shalat Maghrib terdiri dari berapa rakaat?', ['2', '3', '4', '5', '6'], 'B'));
  assert.equal(r.jenis, 'mirip');
  assert.ok(r.skor >= AMBANG_MIRIP && r.skor < AMBANG_KEMBAR);
});

test('soal berbeda pokok bahasan tidak ditandai', () => {
  assert.equal(bandingkan(MAGHRIB, pg('Apa syarat sah shalat?', ['Islam', 'Suci', 'Berakal', 'Baligh', 'Menutup aurat'], 'B')).jenis, '');
  assert.equal(bandingkan(pg('Berapa rakaat shalat Subuh?', ['1', '2', '3', '4', '5'], 'B'), MAGHRIB).jenis, 'mirip'); // hanya satu kata berbeda: tetap layak ditanyakan
});

test('pertanyaan sama tetapi kunci berbeda ditandai kunciBeda', () => {
  const r = bandingkan(MAGHRIB, pg('Berapa rakaat shalat Maghrib?', ['2', '3', '4', '5', '6'], 'C'));
  assert.equal(r.jenis, 'kembar'); assert.equal(r.kunciBeda, true);
});

test('bentuk lain: isian memakai jawaban, benar-salah memakai pernyataan dan kunci, bentuk berbeda diturunkan skornya', () => {
  const i1 = { bentuk: 'isian', pertanyaan: 'Syarat sah shalat ada ..... perkara.', jawaban: 'delapan', opsi: {}, kunci: '' };
  const i2 = { bentuk: 'isian', pertanyaan: 'Syarat sah shalat ada ........ perkara', jawaban: '8', opsi: {}, kunci: '' };
  const r = bandingkan(i1, i2);
  assert.equal(r.jenis, 'mirip'); assert.equal(r.kunciBeda, true); // pertanyaan sama, jawaban "delapan" vs "8"
  const bs1 = { bentuk: 'benarsalah', pertanyaan: 'Air laut sah untuk bersuci.', opsi: { A: 'Benar', B: 'Salah' }, kunci: 'A' };
  const bs2 = { ...bs1, kunci: 'B' };
  const rb = bandingkan(bs1, bs2);
  assert.equal(rb.jenis, 'kembar'); assert.equal(rb.kunciBeda, true);
  const lain = bandingkan(bs1, { bentuk: 'isian', pertanyaan: 'Air laut sah untuk bersuci.', jawaban: 'benar', opsi: {}, kunci: '' });
  assert.ok(lain.skor < 1 && lain.skor <= 0.85); assert.equal(lain.kunciBeda, false);
});

test('cari: terurut dari yang paling mirip, maks. tiga, mengabaikan soal yang sedang disunting dan soal tanpa pertanyaan', () => {
  const daftar = [
    { id: 'x1', ...pg('Shalat Maghrib terdiri dari berapa rakaat?', ['2', '3', '4', '5', '6'], 'B') },
    { id: 'x2', ...MAGHRIB },
    { id: 'x3', ...pg('Apa hukum wudhu?', ['a', 'b', 'c', 'd', 'e'], 'A') },
    { id: 'x4', ...MAGHRIB },
    { id: 'x5', ...MAGHRIB },
  ];
  const h = cari(MAGHRIB, daftar);
  assert.equal(h.length, 3); assert.equal(h[0].skor, 1);
  assert.ok(h.every((x) => x.q.id !== 'x3'));
  assert.deepEqual(cari(MAGHRIB, daftar, { abaikanId: 'x2', maks: 10 }).map((x) => x.q.id).sort(), ['x1', 'x4', 'x5']);
  assert.deepEqual(cari({ pertanyaan: '   ', opsi: {} }, daftar), []);
  assert.deepEqual(cari(MAGHRIB, []), []);
  assert.deepEqual(cari(MAGHRIB, null), []);
  assert.deepEqual(cari(MAGHRIB, [null, undefined, {}]), []);
});

test('pesanKonfirmasi: persentase, jenis, kitab/halaman/status/penulis, peringatan kunci, cakupan; mode lokal tanpa status dan penulis', () => {
  const lama = { id: 'q9', ...MAGHRIB, nama: 'Safinatun Naja', hal: '12', status: 'pending', authorName: 'Ust. Ahmad' };
  const hasil = cari(MAGHRIB, [lama]);
  const t = pesanKonfirmasi(hasil, { total: 41 });
  assert.match(t, /KEMBAR dengan soal yang sudah ada/);
  assert.match(t, /• 100%: Berapa rakaat shalat Maghrib\?/);
  assert.match(t, /Safinatun Naja · hal\. 12 · Menunggu review · oleh Ust\. Ahmad/);
  assert.match(t, /Dibandingkan dengan 41 soal/);
  assert.match(t, /Tetap simpan\?$/);
  const beda = cari(MAGHRIB, [{ ...lama, kunci: 'C' }]);
  assert.match(pesanKonfirmasi(beda), /kunci jawabannya berbeda/);
  const lokal = pesanKonfirmasi(hasil, { lokal: true });
  assert.doesNotMatch(lokal, /Menunggu review|oleh Ust/);
  assert.match(pesanKonfirmasi(cari(MAGHRIB, [{ ...lama, pertanyaan: 'Shalat Maghrib terdiri dari berapa rakaat?' }])), /MIRIP dengan/);
  const panjang = cari(MAGHRIB, [{ ...MAGHRIB, id: 'z', pertanyaan: 'Berapa rakaat shalat Maghrib? ' + 'x'.repeat(500) }], { mirip: 0.1 });
  assert.ok(pesanKonfirmasi(panjang).split('\n').every((b) => b.length < 220));
});

test('cukup cepat untuk ratusan soal (dipanggil saat menyimpan)', () => {
  const daftar = Array.from({ length: 1500 }, (_, i) => ({ id: 'q' + i, ...pg(`Pertanyaan nomor ${i} tentang bab ${i % 17} dalam kitab fiqih dan hukum bersuci`, ['a' + i, 'b', 'c', 'd', 'e'], 'A') }));
  const t0 = Date.now();
  cari(MAGHRIB, daftar);
  assert.ok(Date.now() - t0 < 1500, 'terlalu lambat: ' + (Date.now() - t0) + ' ms');
});
