import test from 'node:test';
import assert from 'node:assert/strict';
import { bacaMatriks, analisis, korelasi, hasilKeCsv, kategoriKesukaran, kategoriDayaBeda } from '../web/lib/analisisButir.js';

// 20 siswa x 3 butir. Butir 1 membedakan siswa kuat/lemah, butir 2 terbalik (kunci diduga salah), butir 3 benar semua.
const siswa = (kuat) => (kuat ? ['1', '0', '1'] : ['0', '1', '1']);
const data = [...Array(10).fill(0).map(() => siswa(true)), ...Array(10).fill(0).map(() => siswa(false))];
// Beri variasi total: siswa kuat 2 benar, lemah 2 benar -> samakan; tambah butir pembeda agar total berbeda.
const dataTotal = data.map((r, i) => (i < 10 ? [...r, '1', '1'] : [...r, '0', '0']));

test('bacaMatriks: deteksi judul dan kolom nama, pemisah tab/koma/titik koma', () => {
  const a = bacaMatriks('Nama\tB1\tB2\nAli\t1\t0\nBudi\t0\t1');
  assert.equal(a.judul, true); assert.equal(a.kolomNama, true); assert.deepEqual(a.sel, [['1', '0'], ['0', '1']]);
  const b = bacaMatriks('1;0;1\n0;1;1');
  assert.equal(b.judul, false); assert.equal(b.kolomNama, false); assert.equal(b.sel.length, 2);
  assert.deepEqual(bacaMatriks('').sel, []);
});

test('analisis skor 0/1: kesukaran, daya beda positif dan negatif, saran memeriksa kunci', () => {
  const h = analisis(dataTotal);
  assert.deepEqual(h.galat, []);
  assert.equal(h.n, 20);
  const [b1, b2, b3] = h.butir;
  assert.equal(b1.p, 0.5); assert.equal(b1.d, 1); assert.equal(b1.dayaBeda, 'Sangat baik');
  assert.equal(b2.d, -1); assert.equal(b2.status, 'periksa');
  assert.ok(b2.saran.some((s) => /negatif/i.test(s)));
  assert.equal(b3.p, 1); assert.ok(b3.saran.some((s) => /mudah/i.test(s)));
  assert.equal(b3.d, 0);
});

test('analisis jawaban huruf: butuh kunci yang cocok; kelompok atas memilih bukan kunci -> curiga kunci', () => {
  const kuat = ['B', 'A', 'C'];
  const lemah = ['A', 'A', 'D'];
  const sel = [...Array(10).fill(kuat), ...Array(10).fill(lemah)];
  assert.match(analisis(sel, ['A', 'A']).galat.join(' '), /Jumlah kunci/);
  assert.match(analisis(sel, ['A', 'A', 'Z']).galat.join(' '), /huruf A sampai E/);
  const h = analisis(sel, ['A', 'A', 'C']);
  assert.deepEqual(h.galat, []);
  assert.ok(h.butir[0].saran.some((s) => /periksa apakah kunci salah/.test(s)));
  assert.equal(h.butir[0].sebaran.A, 10);
  // soal 4 opsi (A-D): E tidak dituduh pengecoh mati
  assert.ok(!h.butir[0].pengecohMati.includes('E'));
});

test('analisis menolak data terlalu sedikit atau bercampur, dan memperingatkan N kecil', () => {
  assert.match(analisis([['1'], ['0']]).galat.join(' '), /Minimal 5 siswa/);
  assert.match(analisis([['1', 'A'], ['0', 'B'], ['1', 'C'], ['0', 'D'], ['1', 'A']], ['A', 'A']).galat.join(' '), /bercampur/);
  assert.match(analisis(dataTotal).peringatan.join(' '), /20 siswa/);
});

test('KR-20 tinggi untuk data konsisten; null bila skor tidak bervariasi', () => {
  const konsisten = [...Array(15).fill(['1', '1', '1', '1']), ...Array(15).fill(['0', '0', '0', '0'])];
  assert.ok(analisis(konsisten).kr20 > 0.9);
  assert.equal(analisis(Array(30).fill(['1', '1'])).kr20, null);
});

test('korelasi, kategori, dan CSV (BOM, kutip)', () => {
  assert.equal(korelasi([1, 2, 3], [2, 4, 6]).toFixed(3), '1.000');
  assert.equal(korelasi([1, 1, 1], [1, 2, 3]), 0);
  assert.equal(kategoriKesukaran(0.2), 'Sukar'); assert.equal(kategoriKesukaran(0.5), 'Sedang'); assert.equal(kategoriKesukaran(0.8), 'Mudah');
  assert.equal(kategoriDayaBeda(-0.1), 'Negatif'); assert.equal(kategoriDayaBeda(0.35), 'Baik');
  const csv = hasilKeCsv(analisis(dataTotal));
  assert.ok(csv.startsWith('\ufeffNo,')); assert.equal(csv.split('\r\n').length, 6);
});
