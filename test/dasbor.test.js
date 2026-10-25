// Ringkasan antrean review dan format tampilan Dasbor (web/lib/dasbor.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { ringkasAntrean, perluAlasan, tandaUmur, teksUmur, teksSisaWaktu, HARI_WASPADA, HARI_LEWAT } from '../web/lib/dasbor.js';

const NOW = Date.parse('2026-10-25T05:00:00Z');
const hariLalu = (n) => NOW - n * 86_400_000;
const ts = (ms) => ({ toMillis: () => ms }); // Timestamp Firestore tiruan
const q = (id, umur, ekstra = {}) => ({ id, pertanyaan: 'Soal ' + id, nama: 'Fathul Qarib', authorName: 'Ust. A', updatedAt: ts(hariLalu(umur)), ai: { verifikasi: 'lolos', buta: 'sepakat' }, ...ekstra });

test('perluAlasan mencerminkan aturan Firestore: kutipan gagal atau uji buta berbeda', () => {
  assert.equal(perluAlasan(q('a', 1, { ai: { verifikasi: 'gagal', buta: '' } })), true);
  assert.equal(perluAlasan(q('a', 1, { ai: { verifikasi: '', buta: 'beda' } })), true);
  assert.equal(perluAlasan(q('a', 1, { ai: { verifikasi: 'periksa', buta: 'sepakat' } })), false);
  assert.equal(perluAlasan({ pertanyaan: 'x' }), false); // soal lama tanpa jejak AI
  assert.equal(perluAlasan(null), false);
});

test('ringkasAntrean: kosong, urutan tertua dulu, ambang umur, per penyusun, perlu alasan', () => {
  assert.deepEqual(ringkasAntrean([], NOW), { total: 0, tertuaHari: 0, waspada: 0, lewat: 0, perluAlasan: 0, perPenyusun: [], tertua: [] });
  assert.equal(ringkasAntrean(undefined, NOW).total, 0);
  const daftar = [
    q('baru', 0.5), q('tiga', 3.2, { authorName: 'Ust. B' }), q('lama', 9, { ai: { verifikasi: 'gagal', buta: '' } }), q('dua', 2),
    q('tujuh', 7.1, { authorName: 'Ust. B' }), q('e1', 1), q('e2', 1.5),
  ];
  const r = ringkasAntrean(daftar, NOW);
  assert.equal(r.total, 7);
  assert.deepEqual(r.tertua.map((t) => t.id), ['lama', 'tujuh', 'tiga', 'dua', 'e2']); // lima tertua
  assert.ok(Math.abs(r.tertuaHari - 9) < 0.01);
  assert.equal(r.lewat, 2); assert.equal(r.waspada, 1); assert.equal(r.perluAlasan, 1);
  assert.deepEqual(r.perPenyusun, [{ nama: 'Ust. A', jumlah: 5 }, { nama: 'Ust. B', jumlah: 2 }]);
  assert.equal(r.tertua[0].perluAlasan, true);
});

test('ringkasAntrean: tanpa waktu ditaruh di belakang dan tidak merusak umur; teks panjang dipotong; penulis kosong diberi nama', () => {
  const r = ringkasAntrean([{ id: 'n', pertanyaan: 'x'.repeat(400), updatedAt: null }, q('b', 2)], NOW);
  assert.equal(r.tertua[0].id, 'b'); assert.equal(r.tertua[1].id, 'n');
  assert.equal(r.tertua[1].pertanyaan.length, 120);
  assert.equal(r.perPenyusun.find((p) => p.nama === 'Tanpa nama').jumlah, 1);
  assert.equal(ringkasAntrean([{ id: 'n', updatedAt: undefined }], NOW).tertuaHari, 0);
  assert.equal(ringkasAntrean([q('iso', 4, { updatedAt: new Date(hariLalu(4)).toISOString() })], NOW).waspada, 1); // tanggal ISO juga dipahami
});

test('tandaUmur, teksUmur, teksSisaWaktu', () => {
  assert.equal(tandaUmur(HARI_WASPADA - 0.01), 'baru'); assert.equal(tandaUmur(HARI_WASPADA), 'waspada');
  assert.equal(tandaUmur(HARI_LEWAT - 0.01), 'waspada'); assert.equal(tandaUmur(HARI_LEWAT), 'lewat');
  assert.equal(teksUmur(0), 'baru saja'); assert.equal(teksUmur(10 / 1440), '10 menit'); assert.equal(teksUmur(5 / 24), '5 jam'); assert.equal(teksUmur(3.9), '3 hari');
  assert.equal(teksSisaWaktu(12 * 3600), '12 jam 0 menit'); assert.equal(teksSisaWaktu(90), '1 menit'); assert.equal(teksSisaWaktu(5), '1 menit'); assert.equal(teksSisaWaktu(-4), '1 menit');
});
