import test from 'node:test';
import assert from 'node:assert/strict';
import { bersihkanSoal } from '../src/backup.js';

const dasar = {
  id: 's1', tingkat: 'Tsanawiyah', mapel: 'Fiqih', level: 'L2', nama: 'Safinah', juz: '', hal: '1', teks: 'x', stimulus: '', pertanyaan: 'q?',
  indikator: '', pembahasan: 'p', sumberUrl: '', opsi: { A: 'a', B: 'b', C: 'c', D: '', E: '' }, kunci: 'A',
  ai: { dibuat: false, model: '', verifikasi: '', buta: '' }, status: 'pending', catatan: '', authorUid: 'u1', authorName: 'Ust. A',
  createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z',
};
const E = (o = {}) => ({ tahap: 1, uid: 'e1', nama: 'Editor 1', hasil: 'lolos', at: 1760000000000, ...o });

test('pemulihan mempertahankan tahap dan jejak tinjauan alur bertingkat', () => {
  const { data } = bersihkanSoal({ ...dasar, tahap: 2, tinjauan: [E({ catatan: 'ok, lanjut' })] });
  assert.equal(data.tahap, 2);
  assert.deepEqual(data.tinjauan, [E({ catatan: 'ok, lanjut' })]);
});

test('soal tanpa alur bertingkat tetap sama persis (tidak ada kolom tahap/tinjauan)', () => {
  const { data } = bersihkanSoal(dasar);
  assert.ok(!('tahap' in data) && !('tinjauan' in data));
});

test('tahap di luar 1..3 dan entri tinjauan rusak dibuang tanpa menggagalkan soal', () => {
  const { data } = bersihkanSoal({ ...dasar, tahap: 9, tinjauan: [E(), null, 'x', E({ hasil: 'hapus' }), E({ tahap: 7 }), E({ uid: 5 })] });
  assert.ok(!('tahap' in data));
  assert.equal(data.tinjauan.length, 1);
});

test('jejak dibatasi 20 terakhir dan catatan 300 karakter', () => {
  const banyak = Array.from({ length: 25 }, (_, i) => E({ at: i, catatan: 'c'.repeat(400) }));
  const { data } = bersihkanSoal({ ...dasar, tinjauan: banyak });
  assert.equal(data.tinjauan.length, 20);
  assert.equal(data.tinjauan[0].at, 5);
  assert.equal(data.tinjauan[0].catatan.length, 300);
});
