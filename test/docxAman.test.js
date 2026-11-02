// Pembaca .docx: pemisah halaman Word, kotak teks ganda (mc:Fallback), dan batas ukuran isi setelah dibuka (zip bomb).
import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync, crc32 } from 'node:zlib';
import { paragrafDariXml, bacaBerkasZip, bacaDocx } from '../web/lib/docx.js';
import { parseDocxHalaman, jumlahJedaHalaman } from '../web/lib/sumberLain.js';
import { bacaDokumenKitab } from '../web/lib/dokumenKitab.js';

// ZIP minimal berisi satu berkas (metode deflate), cukup untuk pembaca kita.
function zip(nama, isi, { ukuranAsliPalsu } = {}) {
  const data = Buffer.from(isi); const kompres = deflateRawSync(data); const n = Buffer.from(nama);
  const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(8, 8); lh.writeUInt32LE(crc32(data) >>> 0, 14); lh.writeUInt32LE(kompres.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(n.length, 26);
  const cd = Buffer.alloc(46); cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(8, 10); cd.writeUInt32LE(crc32(data) >>> 0, 16); cd.writeUInt32LE(kompres.length, 20); cd.writeUInt32LE(ukuranAsliPalsu ?? data.length, 24); cd.writeUInt16LE(n.length, 28); cd.writeUInt32LE(0, 42);
  const awalCd = lh.length + n.length + kompres.length;
  const e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(1, 8); e.writeUInt16LE(1, 10); e.writeUInt32LE(cd.length + n.length, 12); e.writeUInt32LE(awalCd, 16);
  const b = Buffer.concat([lh, n, kompres, cd, n, e]); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}
const bungkus = (isi) => `<w:document><w:body>${isi}</w:body></w:document>`;
const P = (t, ekstra = '') => `<w:p>${ekstra}<w:r><w:t>${t}</w:t></w:r></w:p>`;
const JEDA_P = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

test('pemisah halaman Word (w:br page, pageBreakBefore, akhir seksi) menjadi entri jeda; seksi "continuous" bukan jeda', () => {
  const xml = bungkus(
    P('satu') + JEDA_P + P('dua') +
    P('tiga', '<w:pPr><w:pageBreakBefore/></w:pPr>') +
    `<w:p><w:pPr><w:sectPr><w:type w:val="nextPage"/></w:sectPr></w:pPr><w:r><w:t>empat</w:t></w:r></w:p>` +
    `<w:p><w:pPr><w:sectPr><w:type w:val="continuous"/></w:sectPr></w:pPr><w:r><w:t>lima</w:t></w:r></w:p>`,
  );
  const p = paragrafDariXml(xml);
  assert.equal(jumlahJedaHalaman(p), 3); // w:br page, pageBreakBefore, akhir seksi nextPage
  assert.deepEqual(p.filter((x) => !x.jeda && x.teks).map((x) => x.teks), ['satu', 'dua', 'tiga', 'empat', 'lima']);
});

test('pemisah di tengah paragraf memisahkan teks sebelum dan sesudahnya', () => {
  const p = paragrafDariXml(bungkus('<w:p><w:r><w:t>akhir A</w:t></w:r><w:r><w:br w:type="page"/></w:r><w:r><w:t>awal B</w:t></w:r></w:p>'));
  assert.deepEqual(p.map((x) => (x.jeda ? '|' : x.teks)), ['akhir A', '|', 'awal B']);
});

test('kotak teks: hanya mc:Choice dibaca, salinan mc:Fallback dibuang (tidak ganda)', () => {
  const kotak = (t) => `<w:txbxContent><w:p><w:r><w:t>${t}</w:t></w:r></w:p></w:txbxContent>`;
  const p = paragrafDariXml(bungkus(`<w:p><w:r><mc:AlternateContent><mc:Choice>${kotak('kotak')}</mc:Choice><mc:Fallback>${kotak('kotak')}</mc:Fallback></mc:AlternateContent></w:r></w:p>`));
  assert.equal(p.filter((x) => x.teks === 'kotak').length, 1);
});

test('dokumen tanpa pemisah: tidak ada entri jeda dan paragraf kosong tetap seperti semula', () => {
  const p = paragrafDariXml(bungkus(P('a') + '<w:p></w:p>' + P('b')));
  assert.equal(p.length, 3); assert.equal(jumlahJedaHalaman(p), 0);
});

test('parseDocxHalaman: satu halaman Word = satu halaman kitab, nomor dari halAwal, halaman kosong di ujung dibuang', () => {
  const p = paragrafDariXml(bungkus(P('باب الصلاة') + P('نص الصفحة الأولى') + JEDA_P + P('نص الصفحة الثانية') + JEDA_P + JEDA_P));
  const h = parseDocxHalaman(p, { halAwal: 7 });
  assert.equal(h.format, 'docx-halaman'); assert.equal(h.kitab.sumber.jenis, 'docx-halaman');
  assert.equal(h.halaman.length, 2); assert.deepEqual(h.halaman.map((x) => x.hal), [7, 8]);
  assert.equal(h.kitab.halamanVirtual, false); assert.equal(h.kitab.penomoranSesuaiCetak, false);
  assert.ok(h.daftarIsi.some((e) => e.judul === 'باب الصلاة' && e.seq === 1));
});

test('bacaDokumenKitab .docx tanpa penanda: ditolak, tetapi galat memuat jumlah jeda; dengan halamanWord diterima', async () => {
  const xml = bungkus(P('نص الصفحة الأولى من الكتاب') + JEDA_P + P('نص الصفحة الثانية من الكتاب') + JEDA_P + P('نص الصفحة الثالثة من الكتاب'));
  const buffer = zip('word/document.xml', xml);
  await assert.rejects(() => bacaDokumenKitab({ nama: 'k.docx', buffer }), (e) => e.kode === 'TANPA_PENANDA' && e.jedaHalaman === 2);
  const h = await bacaDokumenKitab({ nama: 'k.docx', buffer, halamanWord: true });
  assert.equal(h.format, 'docx-halaman'); assert.equal(h.halaman.length, 3);
});

test('batas ukuran isi setelah dibuka: berkas yang mengembang melebihi batas ditolak', async () => {
  const besar = zip('word/document.xml', 'a'.repeat(2_000_000)); // terkompresi kecil, mengembang 2 MB
  await assert.rejects(() => bacaBerkasZip(besar, 'word/document.xml', { maks: 1_000_000 }), (e) => e.kode === 'DOCX_TERLALU_BESAR');
  assert.equal((await bacaBerkasZip(besar, 'word/document.xml', { maks: 3_000_000 })).length, 2_000_000);
  // ukuran yang diumumkan arsip dipalsukan kecil: tetap tertangkap saat dibuka
  const palsu = zip('word/document.xml', 'a'.repeat(2_000_000), { ukuranAsliPalsu: 10 });
  await assert.rejects(() => bacaDocx(palsu, { maks: 1_000_000 }), (e) => e.kode === 'DOCX_TERLALU_BESAR');
  // ukuran diumumkan melebihi batas: ditolak sebelum dibuka
  const umum = zip('word/document.xml', 'a'.repeat(50), { ukuranAsliPalsu: 900_000_000 });
  await assert.rejects(() => bacaBerkasZip(umum, 'word/document.xml'), (e) => e.kode === 'DOCX_TERLALU_BESAR');
});
