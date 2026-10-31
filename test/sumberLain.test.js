// Impor dari sumber selain ekspor Syamilah (web/lib/sumberLain.js lewat web/lib/dokumenKitab.js). Murni: tanpa DOM, tanpa pdfjs (teks PDF disuntik).
import test from 'node:test';
import assert from 'node:assert/strict';
import { bacaDokumenKitab, bolehVirtual } from '../web/lib/dokumenKitab.js';
import { teksHalamanPdf, parsePdf } from '../web/lib/sumberLain.js';
import { namaBerkasZip, bacaBerkasZip } from '../web/lib/docx.js';
import { peringatanPratinjau } from '../web/lib/imporKitab.js';

const ar = (n, ulang = 30) => `هذا نص عربي رقم ${n} يتكلم عن الطهارة والصلاة وأحكامهما في الفقه. `.repeat(ulang);

test('JSON: nomor "hal" dipakai apa adanya sebagai nomor cetak; daftar isi dibaca; halaman berjalan', async () => {
  const h = await bacaDokumenKitab({ nama: 'k.json', teks: JSON.stringify({ judul: 'كتاب', halaman: [{ hal: 5, teks: ar(1) }, { hal: 6, teks: ar(2) }, { hal: 7, teks: ar(3) }], daftarIsi: [{ judul: 'باب الطهارة', hal: 6 }] }) });
  assert.deepEqual(h.halaman.map((p) => p.hal), [5, 6, 7]);
  assert.equal(h.kitab.penomoranSesuaiCetak, true); assert.equal(h.kitab.halamanVirtual, false); assert.equal(h.kitab.sumber.jenis, 'json');
  assert.equal(h.daftarIsi[0].seq, 2); assert.equal(h.halaman[1].bab, 'باب الطهارة');
});

test('JSON rusak atau bentuk salah: pesan jelas, tanpa melempar galat mentah', async () => {
  await assert.rejects(bacaDokumenKitab({ nama: 'k.json', teks: '{bukan json' }), (e) => e.kode === 'JSON_RUSAK');
  await assert.rejects(bacaDokumenKitab({ nama: 'k.json', teks: '{"halaman": []}' }), (e) => e.kode === 'JSON_FORMAT');
  await assert.rejects(bacaDokumenKitab({ nama: 'k.json', teks: '{"halaman": [{"hal": 1}]}' }), (e) => e.kode === 'JSON_FORMAT');
});

test('teks tanpa penanda: ditolak dengan petunjuk, lalu mode virtual membaginya dan menandai kitab virtual', async () => {
  const teks = [ar(1), ar(2), ar(3), ar(4)].join('\n');
  const e = await bacaDokumenKitab({ nama: 'k.txt', teks }).catch((x) => x);
  assert.ok(bolehVirtual(e), 'galat harus menawarkan mode virtual'); assert.match(e.message, /halaman virtual|Bagi halaman otomatis/);
  const h = await bacaDokumenKitab({ nama: 'k.txt', teks, virtual: true, halAwal: 10 });
  assert.equal(h.kitab.halamanVirtual, true); assert.equal(h.kitab.penomoranSesuaiCetak, false);
  assert.ok(h.halaman.length >= 2); assert.equal(h.halaman[0].hal, 10);
  assert.ok(h.halaman.every((p) => p.teks.length <= 6000), 'tiap halaman muat di batas Penyusunan Soal');
  assert.ok(peringatanPratinjau(h).some((p) => /BUKAN nomor cetak/.test(p.teks)), 'admin diperingatkan');
});

test('teks dengan penanda [ص N] tidak memicu mode virtual walau diminta (nomor cetak asli diutamakan)', async () => {
  const h = await bacaDokumenKitab({ nama: 'k.txt', teks: `[ص 10]\n${ar(1)}\n[ص 11]\n${ar(2)}`, virtual: true });
  assert.ok(!h.kitab.halamanVirtual, 'nomor cetak asli, bukan virtual'); assert.deepEqual(h.halaman.map((p) => p.hal), [10, 11]);
});

test('HTML: judul h1-h6 menjadi daftar isi; tanpa penanda perlu mode virtual', async () => {
  const html = `<html><head><style>x{}</style></head><body><h1>كتاب الطهارة</h1><p>${ar(1)}</p><h2>باب الصلاة</h2><p>${ar(2)}</p><p>${ar(3)}</p></body></html>`;
  await assert.rejects(bacaDokumenKitab({ nama: 'k.html', teks: html }), (e) => bolehVirtual(e));
  const h = await bacaDokumenKitab({ nama: 'k.html', teks: html, virtual: true });
  assert.equal(h.kitab.halamanVirtual, true); assert.ok(h.daftarIsi.length >= 2);
  assert.ok(!/<|style/.test(h.halaman.map((p) => p.teks).join('')), 'tag dan CSS tidak ikut');
});

test('PDF: halaman PDF + nomor awal; PDF pindai ditolak dengan petunjuk OCR', async () => {
  const h = await bacaDokumenKitab({ nama: 'k.pdf', buffer: new ArrayBuffer(8), halAwal: 7, bacaPdf: async () => [ar(1), ar(2), ar(3)] });
  assert.deepEqual(h.halaman.map((p) => p.hal), [7, 8, 9]); assert.equal(h.kitab.sumber.jenis, 'pdf'); assert.equal(h.kitab.halamanVirtual, false);
  assert.ok(peringatanPratinjau(h).some((p) => /urutan halaman PDF/.test(p.teks)));
  await assert.rejects(bacaDokumenKitab({ nama: 's.pdf', buffer: new ArrayBuffer(8), bacaPdf: async () => ['', '', ''] }), (e) => e.kode === 'PDF_TANPA_TEKS' && /OCR/.test(e.message));
});

test('teksHalamanPdf: baris disusun dari atas ke bawah; PDF kosong tidak melempar', () => {
  const it = (str, y, x = 100) => ({ str, transform: [1, 0, 0, 1, x, y], width: str.length * 5, height: 12 });
  const t = teksHalamanPdf([it('الثاني', 600), it('الأول', 700)]);
  assert.ok(t.indexOf('الأول') < t.indexOf('الثاني'), 'baris atas lebih dulu');
  assert.equal(teksHalamanPdf([]), '');
  assert.throws(() => parsePdf([], {}));
});

test('ZIP: namaBerkasZip membaca daftar nama; bukan ZIP menghasilkan larik kosong (dasar pemeriksaan EPUB)', async () => {
  assert.deepEqual(namaBerkasZip(new ArrayBuffer(10)), []);
  assert.deepEqual(namaBerkasZip(new TextEncoder().encode('bukan zip sama sekali, hanya teks biasa yang cukup panjang').buffer), []);
  // ZIP minimal (satu berkas, disimpan tanpa kompresi) dibuat tangan agar tes tidak bergantung pada pustaka.
  const nama = new TextEncoder().encode('a.txt'); const isi = new TextEncoder().encode('halo');
  const lh = new Uint8Array(30 + nama.length + isi.length); const dl = new DataView(lh.buffer);
  dl.setUint32(0, 0x04034b50, true); dl.setUint32(18, isi.length, true); dl.setUint32(22, isi.length, true); dl.setUint16(26, nama.length, true); lh.set(nama, 30); lh.set(isi, 30 + nama.length);
  const cd = new Uint8Array(46 + nama.length); const dc = new DataView(cd.buffer);
  dc.setUint32(0, 0x02014b50, true); dc.setUint32(20, isi.length, true); dc.setUint32(24, isi.length, true); dc.setUint16(28, nama.length, true); dc.setUint32(42, 0, true); cd.set(nama, 46);
  const ek = new Uint8Array(22); const de = new DataView(ek.buffer);
  de.setUint32(0, 0x06054b50, true); de.setUint16(8, 1, true); de.setUint16(10, 1, true); de.setUint32(12, cd.length, true); de.setUint32(16, lh.length, true);
  const zip = new Uint8Array(lh.length + cd.length + ek.length); zip.set(lh, 0); zip.set(cd, lh.length); zip.set(ek, lh.length + cd.length);
  assert.deepEqual(namaBerkasZip(zip.buffer), ['a.txt']);
  assert.equal(new TextDecoder().decode(await bacaBerkasZip(zip.buffer, 'a.txt')), 'halo');
});
