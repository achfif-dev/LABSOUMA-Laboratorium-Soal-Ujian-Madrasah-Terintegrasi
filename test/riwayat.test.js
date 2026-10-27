import test from 'node:test';
import assert from 'node:assert/strict';
import { potretSoal, bidangBerubah, adaPerubahan, buatRiwayat, ringkasBeda, BIDANG_RIWAYAT } from '../web/lib/riwayat.js';

const soal = { id: 'x', pertanyaan: 'Apa?', opsi: { A: 'a', B: 'b' }, kunci: 'A', status: 'draft', authorUid: 'u1', updatedAt: { seconds: 1 }, teks: undefined, ai: { dibuat: false, model: '', verifikasi: '', buta: '' } };

test('potretSoal: hanya bidang isi, tanpa id/penulis/waktu, tanpa undefined, salinan terpisah', () => {
  const p = potretSoal(soal);
  assert.deepEqual(Object.keys(p).sort(), ['ai', 'kunci', 'opsi', 'pertanyaan', 'status']);
  p.opsi.A = 'diubah';
  assert.equal(soal.opsi.A, 'a');
  assert.ok(Object.keys(potretSoal(soal)).every((k) => BIDANG_RIWAYAT.includes(k)));
});

test('bidangBerubah / adaPerubahan: mendeteksi perubahan bersarang, mengabaikan kosong vs tidak ada', () => {
  const b = { ...soal, opsi: { A: 'a', B: 'B baru' } };
  assert.deepEqual(bidangBerubah(potretSoal(soal), potretSoal(b)), ['opsi']);
  assert.equal(adaPerubahan(soal, { ...soal }), false);
  assert.equal(adaPerubahan(soal, { ...soal, kunci: 'B' }), true);
  assert.equal(adaPerubahan({ ...soal, rubrik: '' }, soal), false); // '' dan tidak ada dianggap sama
});

test('buatRiwayat dan ringkasBeda', () => {
  const r = buatRiwayat(soal, { uid: 'u2', nama: 'Ust. A' }, 'WAKTU');
  assert.deepEqual(Object.keys(r).sort(), ['at', 'namaOleh', 'oleh', 'snapshot']);
  assert.equal(r.at, 'WAKTU'); assert.equal(r.oleh, 'u2');
  assert.equal(ringkasBeda(potretSoal(soal), potretSoal({ ...soal, kunci: 'B', pertanyaan: 'Siapa?' })), 'Pertanyaan, Kunci');
  assert.equal(ringkasBeda(potretSoal(soal), potretSoal(soal)), 'tanpa perubahan isi');
});
