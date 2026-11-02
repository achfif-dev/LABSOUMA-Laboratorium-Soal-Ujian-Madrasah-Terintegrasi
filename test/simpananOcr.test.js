// Titik simpan OCR: halaman yang sudah terbaca tidak dipanggil ulang setelah tab mati atau kuota habis.
import test from 'node:test';
import assert from 'node:assert/strict';
import { jalankanOcr } from '../web/lib/ocrPdf.js';
import { bukaSimpananOcr, kunciBerkas, UMUR_MAKS_MS } from '../web/lib/simpananOcr.js';

const memori = () => { const m = new Map(); return { m, ambil: async (i) => m.get(i), simpan: async (i, r) => { m.set(i, r); } }; };
const gambar = async () => ({ mime: 'image/jpeg', data: 'x' });

test('OCR menyimpan tiap halaman berhasil; jalan kedua hanya memanggil halaman yang belum ada', async () => {
  const s = memori(); const dipanggil = [];
  let n = 0;
  const panggil = async () => { n++; if (n === 3) throw { status: 400, code: 'X', message: 'gagal' }; return { teks: `teks ${n}`, kualitas: 'baik' }; };
  const r1 = await jalankanOcr({ indeks: [0, 1, 2, 3], ambilGambar: gambar, panggil, konkuren: 1, simpanan: s });
  assert.equal(r1.teks.size, 3); assert.equal(r1.gagal.length, 1);
  assert.equal(s.m.size, 3); // halaman gagal tidak disimpan
  const r2 = await jalankanOcr({ indeks: [0, 1, 2, 3], ambilGambar: gambar, panggil: async (g) => { dipanggil.push(1); return { teks: 'baru', kualitas: 'baik' }; }, konkuren: 1, simpanan: s });
  assert.equal(dipanggil.length, 1); assert.equal(r2.dariSimpanan, 3); assert.equal(r2.teks.size, 4);
  assert.equal(r2.teks.get(0), 'teks 1'); // hasil lama dipakai apa adanya (deterministik)
});

test('halaman kosong sah (TEKS_TIDAK_MEMADAI atau teks kosong) ikut disimpan dan tidak dipanggil ulang', async () => {
  const s = memori(); let n = 0;
  const panggil = async () => { n++; throw { status: 422, code: 'TEKS_TIDAK_MEMADAI', message: 'kosong' }; };
  const r1 = await jalankanOcr({ indeks: [5], ambilGambar: gambar, panggil, simpanan: s });
  assert.deepEqual(r1.kosong, [5]); assert.equal(s.m.get(5).teks, '');
  const r2 = await jalankanOcr({ indeks: [5], ambilGambar: gambar, panggil, simpanan: s });
  assert.equal(n, 1); assert.deepEqual(r2.kosong, [5]); assert.equal(r2.dariSimpanan, 1);
});

test('kuota harian habis: hasil sebelumnya aman di simpanan dan dipakai setelah kuota pulih', async () => {
  const s = memori(); let n = 0;
  const panggil = async () => { n++; if (n > 2) throw { status: 429, code: 'RATE_LIMIT_DAILY', message: 'habis' }; return { teks: 't' + n, kualitas: 'sedang' }; };
  const r1 = await jalankanOcr({ indeks: [0, 1, 2, 3, 4], ambilGambar: gambar, panggil, konkuren: 1, simpanan: s });
  assert.equal(r1.kuotaHabis, true); assert.equal(s.m.size, 2);
  const r2 = await jalankanOcr({ indeks: [0, 1, 2, 3, 4], ambilGambar: gambar, panggil: async () => ({ teks: 'lanjut', kualitas: 'sedang' }), konkuren: 1, simpanan: s });
  assert.equal(r2.dariSimpanan, 2); assert.equal(r2.teks.size, 5); assert.equal(r2.gagal.length, 0);
});

test('galat simpanan (penuh/rusak) tidak pernah menggagalkan OCR', async () => {
  const buruk = { ambil: async () => { throw new Error('rusak'); }, simpan: async () => { throw new Error('penuh'); } };
  const r = await jalankanOcr({ indeks: [0, 1], ambilGambar: gambar, panggil: async () => ({ teks: 'ok' }), simpanan: buruk });
  assert.equal(r.teks.size, 2); assert.equal(r.gagal.length, 0); assert.equal(r.dariSimpanan, 0);
});

test('tanpa simpanan: perilaku lama tidak berubah', async () => {
  const r = await jalankanOcr({ indeks: [0, 1], ambilGambar: gambar, panggil: async () => ({ teks: 'ok' }) });
  assert.equal(r.teks.size, 2); assert.equal(r.dariSimpanan, 0);
});

test('bukaSimpananOcr: null bila IndexedDB tidak ada; kunciBerkas memuat nama, ukuran, waktu ubah, aksara', async () => {
  assert.equal(await bukaSimpananOcr('k', { idb: null }), null);
  assert.equal(await bukaSimpananOcr('k', { idb: { open: () => { const r = {}; setTimeout(() => r.onerror && r.onerror(), 0); return r; } } }), null);
  assert.equal(kunciBerkas({ name: 'a.pdf', size: 10, lastModified: 5 }, 'arab'), 'a.pdf|10|5|arab');
  assert.ok(UMUR_MAKS_MS > 24 * 3600 * 1000);
});
