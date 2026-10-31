// Impor kitab dari .docx / teks dengan penanda halaman sisip "[ص N]" (web/lib/docx.js, penandaSisip.js, dokumenKitab.js).
// Fixture dibuat dari struktur berkas nyata Hasyiyah ad-Dasuqi (.docx ekspor Syamilah #8703): daftar isi "(ص N)", judul bergaya Heading,
// label tebal "[حاشية الدسوقي]" berulang, tatwil sebelum kaf, penanda di tengah kalimat. Uji berkas nyata: set KITAB_DASUQI_DOCX=/jalur/berkas.docx.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { paragrafDariXml, bacaDocx, bacaBerkasZip } from '../web/lib/docx.js';
import { parsePenandaSisip, paragrafDariTeks } from '../web/lib/penandaSisip.js';
import { bacaDokumenKitab, FORMAT_LABEL } from '../web/lib/dokumenKitab.js';
import { ErrorSyamilah } from '../web/lib/syamilah.js';
import { validasiKitab } from '../src/kitabImpor.js';

const biasa = (teks) => ({ teks, tingkat: 0, tebal: false });
const tebal = (teks) => ({ teks, tingkat: 0, tebal: true });
const judul = (teks, tingkat = 1) => ({ teks, tingkat, tebal: true });
const KEPALA = [
  biasa('حاشية الدسوقي على أم البراهين'), biasa('الكتاب: حاشية الدسوقي على أم البراهين'), biasa('المؤلف: محمد الدسوقي المالـكي (المتوفى: ١٢٣٠ هـ)'),
  biasa('الناشر: مطبعة عيسى'), biasa('رقم الكتاب في المكتبة الشاملة: ٨٧٠٣'), biasa('الطابع الزمني: ٢٠٢١-١٠-١٩'), biasa('[ترقيم الكتاب موافق للمطبوع]'),
  tebal('المحتويات'), tebal('١. خطبة الكتاب  (ص ٥)'), tebal('٢. باب الصفات  (ص ٧)'),
];
const LABEL = '[حاشية الدسوقي]';
// halaman 5..10, tiap halaman: penanda + teks + label tebal + hasyiyah. Penanda 9 di tengah kalimat; "[ص: ٧٥]" ayat; "[ص ٧٥]" melompat sendirian.
function badan() {
  return [
    judul('١. خطبة الكتاب'), biasa('[ص ٥] كلام الصفحة الأولى لـكن'), tebal(LABEL), biasa('(قوله: أ) شرح أول'),
    biasa('[ص ٦] قرأ سورة [ص: ٧٥] آية'), tebal(LABEL), biasa('(قوله: ب) شرح ثان'),
    biasa('[ص ٧]'), judul('٢. باب الصفات'), biasa('كلام الصفحة السابعة'), tebal(LABEL), biasa('(قوله: ج)'),
    biasa('[ص ٨] كلام قبل [ص ٧٥] ويتصل [ص ٩] كلام بعد'), tebal(LABEL), biasa('(قوله: د)'),
    biasa('[ص ١٠] آخر'), tebal(LABEL), biasa('(قوله: هـ)'), biasa('(١) تعليق المحقق'),
  ];
}
const HASIL = () => parsePenandaSisip([...KEPALA, ...badan()], { jenis: 'syamilah-docx' });

test('parsePenandaSisip: halaman menurut penanda sisip, nomor cetak, tanpa anomali', () => {
  const h = HASIL();
  assert.deepEqual(h.halaman.map((x) => x.hal), [5, 6, 7, 8, 9, 10]);
  assert.deepEqual(h.halaman.map((x) => x.id), ['p00001', 'p00002', 'p00003', 'p00004', 'p00005', 'p00006']);
  assert.equal(h.laporan.anomali.duplikat + h.laporan.anomali.mundur + h.laporan.anomali.lompat, 0);
  assert.ok(h.halaman.every((x) => x.batasMatn === null));
  assert.equal(h.laporan.format, 'penanda-sisip');
});

test('penanda di tengah kalimat memotong halaman di tempatnya; penanda ayat "[ص: ٧٥]" dan penanda yang melompat sendirian tetap teks', () => {
  const h = HASIL();
  assert.match(h.halaman[3].teks, /^كلام قبل \[ص ٧٥\] ويتصل/); // halaman 8 berhenti tepat sebelum penanda 9
  assert.ok(!h.halaman[3].teks.includes('كلام بعد'));
  assert.match(h.halaman[4].teks, /^كلام بعد/);
  assert.match(h.halaman[1].teks, /\[ص: ٧٥\]/); // ayat surat Shad: bukan halaman
});

test('label lapisan berulang dibuang dan dilaporkan; tatwil dalam kata dibuang; catatan kaki ekor dibuang', () => {
  const h = HASIL();
  assert.equal(h.laporan.labelDibuang, 5); assert.equal(h.laporan.labelLapisan, LABEL);
  assert.ok(h.halaman.every((x) => !x.teks.includes(LABEL)));
  assert.match(h.halaman[0].teks, /لكن/); assert.ok(!h.halaman[0].teks.includes('\u0640'));
  // "(١) ..." di ekor halaman 10 tanpa rujukan sisip "(١)" di teksnya: tidak dibuang (bisa butir bernomor), tetapi dilaporkan
  assert.match(h.halaman[5].teks, /تعليق المحقق/); assert.deepEqual(h.laporan.catatanTertinggal.map((x) => x.hal), [10]);
});

test('daftar isi: judul bergaya Heading, nomor halaman dari Daftar Isi di depan, bab aktif dibawa ke halaman berikutnya', () => {
  const h = HASIL();
  assert.deepEqual(h.daftarIsi.map((e) => [e.judul, e.level, e.hal, e.seq]), [['خطبة الكتاب', 1, 5, 1], ['باب الصفات', 1, 7, 3]]);
  assert.equal(h.laporan.judulCocokDaftarIsi, 2);
  assert.equal(h.halaman[1].bab, 'خطبة الكتاب'); assert.equal(h.halaman[2].bab, 'باب الصفات'); assert.equal(h.halaman[5].bab, 'باب الصفات');
});

test('kepala kitab: judul, pengarang dan wafat dari "(المتوفى: …)", penerbit, rujukan Syamilah, jenis sumber', () => {
  const k = HASIL().kitab;
  assert.equal(k.judul, 'حاشية الدسوقي على أم البراهين'); assert.equal(k.wafatH, 1230); assert.equal(k.edisi.penerbit, 'مطبعة عيسى');
  assert.equal(k.sumber.rujukan, 'Syamilah #8703'); assert.equal(k.sumber.jenis, 'syamilah-docx'); assert.equal(k.penomoranSesuaiCetak, true);
  assert.equal(k.jumlahHalaman, 6); assert.equal(k.bentukMatn, 'tanpa-pemisah'); assert.equal(k.hakCipta.status, 'belum-dicek');
});

test('catatan "(1)" di ekor halaman: dibuang hanya bila ada rujukan sisip "(1)" di teks; bila tidak, dilaporkan dan dibiarkan', () => {
  const dengan = parsePenandaSisip([...KEPALA, biasa('[ص ٥] كلام (١) ثم'), biasa('[ص ٦] ب'), biasa('(١) هامش المحقق')]);
  assert.equal(dengan.halaman.length, 2); // "(١) هامش" milik halaman 6 yang tidak punya rujukan sisip
  assert.equal(dengan.laporan.catatanKakiDibuang, 0); assert.deepEqual(dengan.laporan.catatanTertinggal.map((x) => x.hal), [6]);
  assert.match(dengan.halaman[1].teks, /هامش المحقق/);
  const benar = parsePenandaSisip([...KEPALA, biasa('[ص ٥] كلام (١) ثم'), biasa('(١) هامش المحقق')]);
  assert.equal(benar.laporan.catatanKakiDibuang, 1); assert.ok(!benar.halaman[0].teks.includes('هامش')); assert.ok(!benar.halaman[0].teks.includes('(١)'));
});

test('nomor halaman kembar dan mundur ditandai tanpa menimpa halaman (kunci = urutan)', () => {
  const h = parsePenandaSisip([...KEPALA, biasa('[ص ٥] أ'), biasa('[ص ٦] ب'), biasa('[ص ٦] ج'), biasa('[ص ٨] د')]);
  assert.deepEqual(h.halaman.map((x) => x.nomorAnomali ?? null), [null, null, 'duplikat', 'lompat']);
  assert.equal(new Set(h.halaman.map((x) => x.id)).size, 4);
});

test('tanpa penanda halaman: ditolak (TANPA_PENANDA), tidak menebak', () => {
  assert.throws(() => parsePenandaSisip([biasa('نص بلا penanda'), biasa('سطر آخر')]), (e) => e instanceof ErrorSyamilah && e.kode === 'TANPA_PENANDA');
});

test('bacaDokumenKitab (txt): ekspor Syamilah lama dikenali; teks dengan [ص N] dikenali; selain itu ditolak dengan petunjuk format', async () => {
  const J = 'فتح المعين';
  const syamilah = `${J}\n${J}(ص: 1)\nنص أول\n${J}(ص: 2)\nنص ثان`;
  const a = await bacaDokumenKitab({ nama: 'a.txt', teks: syamilah });
  assert.equal(a.format, 'txt-syamilah'); assert.equal(a.halaman.length, 2);
  const b = await bacaDokumenKitab({ nama: 'b.txt', teks: 'عنوان\n[ص ٣] نص أول\n[ص ٤] نص ثان' });
  assert.equal(b.format, 'txt-penanda-sisip'); assert.deepEqual(b.halaman.map((x) => x.hal), [3, 4]);
  const dariByte = await bacaDokumenKitab({ nama: 'c.txt', buffer: new TextEncoder().encode('[ص ١] أ\n[ص ٢] ب').buffer });
  assert.equal(dariByte.halaman.length, 2);
  await assert.rejects(() => bacaDokumenKitab({ nama: 'd.txt', teks: 'hasil convert PDF tanpa penanda halaman sama sekali' }), (e) => e.kode === 'TANPA_PENANDA' && /\[ص N\]/.test(e.message));
  assert.ok(FORMAT_LABEL['docx-penanda-sisip'] && FORMAT_LABEL['txt-syamilah'] && FORMAT_LABEL['txt-penanda-sisip']);
});

test('pembaca .docx: paragraf, gaya Heading, dan paragraf tebal dari berkas Word sungguhan (ZIP + deflate)', async () => {
  const doc = new Document({ sections: [{ children: [
    new Paragraph({ children: [new TextRun('الكتاب: اختبار')] }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: '١. خطبة الكتاب', bold: true })] }),
    new Paragraph({ children: [new TextRun({ text: LABEL, bold: true })] }),
    new Paragraph({ children: [new TextRun('[ص ٥] كلام & "اختبار" <نص>')] }),
  ] }] });
  const buf = await Packer.toBuffer(doc);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const p = await bacaDocx(ab);
  assert.deepEqual(p.map((x) => x.teks), ['الكتاب: اختبار', '١. خطبة الكتاب', LABEL, '[ص ٥] كلام & "اختبار" <نص>']);
  assert.deepEqual(p.map((x) => x.tingkat), [0, 1, 0, 0]);
  assert.deepEqual(p.map((x) => x.tebal), [false, true, true, false]);
  assert.equal(await bacaBerkasZip(ab, 'tidak/ada.xml'), null);
});

test('bacaDokumenKitab (docx): jalur penuh dari berkas Word ke halaman; berkas rusak dan docx tanpa penanda ditolak dengan pesan jelas', async () => {
  const para = (t, o = {}) => new Paragraph({ ...(o.h ? { heading: HeadingLevel.HEADING_1 } : {}), children: [new TextRun({ text: t, bold: !!o.b })] });
  const doc = new Document({ sections: [{ children: [para('الكتاب: اختبار'), para('المؤلف: فلان (المتوفى: ٩٠٠ هـ)'), para('[ص ١] أ'), para('١. باب', { h: 1, b: 1 }), para('[ص ٢] ب')] }] });
  const buf = await Packer.toBuffer(doc); const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const h = await bacaDokumenKitab({ nama: 'k.docx', buffer: ab });
  assert.equal(h.format, 'docx-penanda-sisip'); assert.equal(h.halaman.length, 2); assert.equal(h.kitab.wafatH, 900); assert.equal(h.kitab.sumber.jenis, 'syamilah-docx');
  assert.deepEqual(h.daftarIsi.map((e) => [e.judul, e.hal]), [['باب', 1]]);
  await assert.rejects(() => bacaDokumenKitab({ nama: 'x.docx', buffer: new TextEncoder().encode('bukan zip').buffer }), (e) => e.kode === 'DOCX_RUSAK');
  await assert.rejects(() => bacaDokumenKitab({ nama: 'y.docx' }), (e) => e.kode === 'DOCX_RUSAK');
  const kosong = await Packer.toBuffer(new Document({ sections: [{ children: [para('teks biasa tanpa penanda')] }] }));
  await assert.rejects(() => bacaDokumenKitab({ nama: 'z.docx', buffer: kosong.buffer.slice(kosong.byteOffset, kosong.byteOffset + kosong.byteLength) }), (e) => e.kode === 'TANPA_PENANDA');
});

test('server: sumber.jenis hanya tiga nilai yang dikenal; rujukan sumber disimpan; hasil parse docx lolos validasiKitab', () => {
  const k = HASIL().kitab;
  const b = validasiKitab({ ...k, judulLatin: 'Hasyiyah Dasuqi' });
  assert.equal(b.sumber.jenis, 'syamilah-docx'); assert.equal(b.sumber.rujukan, 'Syamilah #8703');
  assert.throws(() => validasiKitab({ ...k, judulLatin: 'X', sumber: { ...k.sumber, jenis: 'lain' } }), /Jenis sumber/);
  assert.equal(validasiKitab({ ...k, judulLatin: 'X', sumber: { jenis: 'teks-penanda' } }).sumber.jenis, 'teks-penanda');
  assert.equal(validasiKitab({ ...k, judulLatin: 'X', sumber: undefined }).sumber.jenis, 'syamilah-txt');
});

test('berkas nyata (opsional, KITAB_DASUQI_DOCX): 261 halaman, hal. 5-265 menaik, tanpa anomali, tanpa sisa tatwil/penanda/label',
  { skip: !(process.env.KITAB_DASUQI_DOCX && existsSync(process.env.KITAB_DASUQI_DOCX)) }, async () => {
    const buf = readFileSync(process.env.KITAB_DASUQI_DOCX);
    const h = await bacaDokumenKitab({ nama: 'dasuqi.docx', buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) });
    assert.equal(h.halaman.length, 261); assert.equal(h.halaman[0].hal, 5); assert.equal(h.halaman.at(-1).hal, 265);
    assert.equal(h.laporan.anomali.duplikat + h.laporan.anomali.mundur + h.laporan.anomali.lompat, 0);
    assert.ok(h.halaman.every((x) => !/[\u0621-\u064A]\u0640[\u0621-\u064A]/.test(x.teks) && !/\[ص\s*[٠-٩\d]+\]/.test(x.teks) && !x.teks.includes('[حاشية الدسوقي]')));
    assert.equal(h.laporan.halamanMelebihiBatas.length, 0);
  });
