// Naskah ujian format IMDA (Dauri I-IV): web/lib/naskah.js dan web/lib/naskahDocx.js, mengikuti FORMAT_SOAL_IMDA_I..IV.docx.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from 'docx';
import JSZip from 'jszip';
import { BENTUK_TEMPLATE, ringkasBagian, ringkasDauri, catatanTemplate, PRESET_DAURI, DAFTAR_DAURI, MAKS_NILAI, susunNaskah, judulBagian, judulDauri, kataNilai, dauriSah, bagianDari, namaBerkasNaskah, rujukanHalaman, jawabanKunci, akhiriTanya, META_AWAL } from '../web/lib/naskah.js';
import { buatNaskah } from '../web/lib/naskahDocx.js';
import { teksSoal, kataRagu, BATAS_SOAL } from '../web/lib/naskah.js';
import { convertText, convertTextEjaan, ubahEjaan, ejaanSah, EJAAN } from '../web/lib/pegon.js';

const pg = (pertanyaan, o = ['x', 'y', 'z'], kunci = 'A', hal = '') => ({ bentuk: 'pilgan', pertanyaan, opsi: { A: o[0], B: o[1], C: o[2], D: o[3] || '', E: o[4] || '' }, kunci, hal });
const isi = (pertanyaan, hal = '') => ({ bentuk: 'isian', pertanyaan, jawaban: 'jawab ' + pertanyaan, opsi: {}, hal });
const ura = (pertanyaan, hal = '') => ({ bentuk: 'uraian', pertanyaan, jawaban: 'uraian ' + pertanyaan, opsi: {}, hal });
const penuh = (dawr) => {
  const [a, b, c] = PRESET_DAURI[dawr].bagian.map((x) => x.n);
  return [...Array.from({ length: a }, (_, i) => pg('P' + i, ['1', '2', '3'], 'B', String(i + 1))), ...Array.from({ length: b }, (_, i) => isi('I' + i, String(i + 1))), ...Array.from({ length: c }, (_, i) => ura('U' + i, String(i + 1)))];
};

test('preset mengikuti keempat template: jumlah nomor dan nilai per nomor, total selalu 100', () => {
  const ringkas = (d) => PRESET_DAURI[d].bagian.map((b) => `${b.kode}:${b.n}x${b.nilai}`).join(' ');
  assert.equal(ringkas(1), 'a:5x5 b:5x7 c:5x8');
  assert.equal(ringkas(2), 'a:7x4 b:6x5 c:7x6');
  assert.equal(ringkas(3), 'a:5x5 b:5x7 c:5x8');
  assert.equal(ringkas(4), 'a:7x4 b:6x5 c:7x6');
  for (const p of DAFTAR_DAURI) assert.equal(p.bagian.reduce((n, b) => n + b.n * b.nilai, 0), MAKS_NILAI, p.label);
});

test('judul sama dengan teks template (ejaan "اربعة" tanpa hamza dan pemisah bagian ج tidak diubah)', () => {
  assert.equal(judulBagian('a', 4), 'أ – إختر إحدى الأجوبة الصحيحة مما بين القوسين ( لكل رقم اربعة نتائج )');
  assert.equal(judulBagian('a', 5), 'أ – إختر إحدى الأجوبة الصحيحة مما بين القوسين ( لكل رقم خمسة نتائج )');
  assert.equal(judulBagian('b', 7), 'ب – إملاء الفراغ الآتية بأجوبة صحيحة ( لكل رقم سبعة نتائج )');
  assert.equal(judulBagian('b', 5), 'ب – إملاء الفراغ الآتية بأجوبة صحيحة ( لكل رقم خمسة نتائج )');
  assert.equal(judulBagian('c', 8), 'ج - أجب أسئلة التالية إجابة صحيحة ( لكل رقم ثمانية نتائج )');
  assert.equal(judulBagian('c', 6), 'ج - أجب أسئلة التالية إجابة صحيحة ( لكل رقم ستة نتائج )');
  assert.deepEqual([1, 2, 3, 4].map(judulDauri), ['الامتحان في الدور الأول', 'الامتحان في الدور الثاني', 'الامتحان في الدور الثالث', 'الامتحان في الدور الرابع']);
  assert.equal(kataNilai(11), '11'); assert.equal(kataNilai(0), '0');
});

test('dauriSah: nilai tidak dikenal kembali ke Dauri I', () => {
  assert.equal(dauriSah('3'), 3); assert.equal(dauriSah(4), 4);
  for (const v of [0, 5, 'x', null, undefined, '__proto__']) assert.equal(dauriSah(v), 1, String(v));
});

test('bentuk soal dipetakan ke bagian; Benar-Salah tidak punya bagian', () => {
  assert.equal(bagianDari(pg('a')), 'a'); assert.equal(bagianDari({ bentuk: 'lanjutan' }), 'a');
  assert.equal(bagianDari(isi('a')), 'b'); assert.equal(bagianDari(ura('a')), 'c');
  assert.equal(bagianDari({ bentuk: 'benarsalah' }), null);
  assert.equal(bagianDari({}), 'a'); // tanpa bentuk dianggap pilihan ganda
});

test('susunNaskah: naskah penuh bernilai 100 tanpa peringatan di semua Dauri', () => {
  for (const d of [1, 2, 3, 4]) {
    const n = susunNaskah(penuh(d), d);
    assert.equal(n.total, 100, 'dawr ' + d); assert.deepEqual(n.peringatan, [], 'dawr ' + d); assert.equal(n.tidakDipakai.length, 0);
    assert.deepEqual(n.bagian.map((b) => b.butir.length), PRESET_DAURI[d].bagian.map((b) => b.n));
    assert.ok(n.bagian.every((b) => b.butir.every((x, i) => x.no === i + 1 && x.q)));
  }
});

test('susunNaskah: nomor kosong tetap ada, nilai dihitung dari yang terisi, peringatan jelas', () => {
  const n = susunNaskah([pg('P1', ['1', '2', '3'], 'A', '3'), isi('I1', '4')], 2);
  assert.equal(n.bagian[0].butir.length, 7); assert.equal(n.bagian[0].terisi, 1); assert.equal(n.bagian[0].kurang, 6);
  assert.equal(n.total, 1 * 4 + 1 * 5);
  assert.ok(n.peringatan.some((t) => /Bagian أ: 1 dari 7 nomor terisi/.test(t)));
  assert.ok(n.peringatan.some((t) => /Total nilai naskah 9 dari 100/.test(t)));
  assert.equal(susunNaskah([], 1).total, 0);
  assert.equal(susunNaskah(null, 1).bagian.length, 3);
});

test('susunNaskah: kelebihan soal dan bentuk di luar template masuk tidakDipakai dengan alasan; urutan pilihan dipertahankan', () => {
  const soal = [...penuh(1), pg('KELEBIHAN'), { bentuk: 'benarsalah', pertanyaan: 'BS', opsi: { A: 'Benar', B: 'Salah' }, kunci: 'A' }];
  const n = susunNaskah(soal, 1);
  assert.equal(n.tidakDipakai.length, 2);
  assert.match(n.tidakDipakai[0].alasan, /Bagian أ sudah penuh \(5 nomor\)/);
  assert.match(n.tidakDipakai[1].alasan, /Benar–Salah tidak ada di template/);
  assert.deepEqual(n.bagian[0].butir.map((x) => x.q.pertanyaan), ['P0', 'P1', 'P2', 'P3', 'P4']);
});

test('susunNaskah: peringatan opsi lebih dari tiga dan soal tanpa halaman kitab', () => {
  const n = susunNaskah([pg('Lima opsi', ['1', '2', '3', '4', '5'], 'A', '')], 1);
  assert.ok(n.peringatan.some((t) => /punya 5 opsi, template aslinya 3/.test(t)));
  assert.ok(n.peringatan.some((t) => /1 soal belum punya halaman kitab/.test(t)));
});

test('rujukanHalaman, jawabanKunci, akhiriTanya, namaBerkasNaskah', () => {
  assert.equal(rujukanHalaman({ hal: ' 12 ' }), 'ص 12'); assert.equal(rujukanHalaman({}), 'ص'); assert.equal(rujukanHalaman(null), 'ص');
  assert.deepEqual(jawabanKunci(pg('a', ['س', 'ص', 'ع'], 'B')), { huruf: 'ب', teks: 'ص' });
  assert.equal(jawabanKunci(isi('a')).teks, 'jawab a');
  assert.equal(akhiriTanya('ما هو'), 'ما هو ؟'); assert.equal(akhiriTanya('ما هو؟'), 'ما هو؟'); assert.equal(akhiriTanya(''), '');
  assert.equal(namaBerkasNaskah({ dawr: 2, mapel: 'Fiqh' }, false), 'naskah-ujian-dauri-2-fiqh.docx');
  assert.equal(namaBerkasNaskah({ dawr: 3, mapel: 'Fiqh' }, true), 'naskah-ujian-dauri-3-fiqh-kunci.docx');
  assert.equal(namaBerkasNaskah({ dawr: 4, mapel: 'فقه' }, false), 'naskah-ujian-dauri-4.docx'); // Arab tidak dipakai di nama berkas
  assert.equal(namaBerkasNaskah({ dawr: 9, mapel: '../../etc' }, false), 'naskah-ujian-dauri-1-etc.docx');
  assert.equal(namaBerkasNaskah(null, false), 'naskah-ujian-dauri-1.docx');
});

/* ------------------------------------------------------------ DOCX */
const LOGO = readFileSync(new URL('../public/logo-madrasah.png', import.meta.url));
async function bongkar(doc) {
  const zip = await JSZip.loadAsync(await D.Packer.toBuffer(doc));
  const baca = async (n) => (zip.file(n) ? zip.file(n).async('string') : '');
  const footers = Object.keys(zip.files).filter((n) => /^word\/footer\d*\.xml$/.test(n));
  return { zip, xml: await baca('word/document.xml'), kaki: (await Promise.all(footers.map(baca))).join(''), media: Object.keys(zip.files).filter((n) => n.startsWith('word/media/')) };
}
const teksDari = (xml) => [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('');

test('DOCX peserta: kop, tiga judul bagian, F4, tanpa unsur merah dan tanpa kunci', async () => {
  const n = susunNaskah(penuh(2), 2);
  const { xml, kaki, media } = await bongkar(buatNaskah(D, n, { ...META_AWAL, mapel: 'فقه' }, { kunci: false, logo: LOGO }));
  const t = teksDari(xml);
  assert.ok(t.includes('الامتحان في الدور الثاني')); assert.ok(t.includes('بالمدرسة الدينية السلفية المعارف'));
  assert.ok(t.includes('السنة الدراسة 1446 – 1447'));
  assert.ok(t.includes('المادة') && t.includes('فقه')); // label dan titik dua kini di kolom terpisah agar sejajar dengan baris Nama/Nomor
  for (const b of n.bagian) assert.ok(t.includes(b.judul), b.kode);
  assert.match(xml, /<w:pgSz w:w="12240" w:h="18720"/);
  assert.doesNotMatch(xml, /w:val="FF0000"/);
  assert.doesNotMatch(xml, /<w:t[^>]*>ص( \d+)?<\/w:t>/); // penanda "ص" (halaman kitab) hanya di naskah kunci; huruf ص di kata judul tidak dihitung
  assert.ok(!t.includes('jawab I0') && !t.includes('uraian U0')); // jawaban tidak bocor
  assert.ok(kaki.includes('L@b I'));
  assert.ok(media.some((m) => /\.png$/.test(m)));
});

test('kop sama dengan template asli (FIQH.docx): grup gambar Word, kotak data tebal-tipis, tiga kotak nomor, garis ganda, Arial 16/16/10 pt', async () => {
  const n = susunNaskah(penuh(1), 1);
  const { xml } = await bongkar(buatNaskah(D, n, { ...META_AWAL, mapel: 'حديث' }, { kunci: false, logo: LOGO }));
  const kop = xml.slice(0, xml.lastIndexOf('<w:p>', xml.indexOf('أ – إختر'))); // kop = semua paragraf sebelum judul bagian pertama
  assert.doesNotMatch(xml, /<undefined/); // pembungkus tanpa nama dari ImportedXmlComponent membuat Word menolak berkas
  assert.doesNotMatch(xml, /<w:tbl>/); // kop asli bukan tabel
  assert.match(kop, /<mc:AlternateContent><mc:Choice Requires="wpg">/);
  assert.match(kop, /<wp:extent cx="7087870" cy="659130"\/>/); // ukuran grup sama dengan template
  assert.match(kop, /<wp:posOffset>29210<\/wp:posOffset>/); assert.match(kop, /<wp:posOffset>43815<\/wp:posOffset>/);
  assert.match(kop, /prst="flowChartProcess"/); assert.match(kop, /<a:ln w="41275" cmpd="thickThin">/); // kotak data 3,25 pt tebal-tipis
  assert.match(kop, /<a:ln w="38100" cmpd="dbl">/); // garis ganda 3 pt di bawah judul
  assert.equal((kop.match(/<a:ext cx="357" cy="207"\/>/g) || []).length, 3); // tiga kotak nomor
  assert.match(kop, /<a:ext cx="5150" cy="963"\/>/); // kotak data selebar 5150 unit
  assert.match(kop, /w:ascii="Arial"/); assert.match(kop, /w:cs="Arial"/); // huruf Arab kop juga Arial, bukan Traditional Arabic
  assert.doesNotMatch(kop, /w:ascii="Traditional Arabic"/);
  for (const sz of [44, 32, 24, 20, 22]) assert.match(kop, new RegExp(`<w:sz w:val="${sz}"/>`), `sz ${sz}`); // spasi 22 pt, judul 16 pt, tahun 12 pt, pesantren 10 pt, kotak data 11 pt
  assert.equal((kop.match(/<w:bidi\/><w:spacing w:after="200" w:line="276" w:lineRule="auto"\/>/g) || []).length, 2); // dua paragraf kotak data: spasi bawaan Normal template
  // kurung tidak bergantung pada pencerminan otomatis: '[' lebih dulu (sisi kelas), lalu ']' (sisi tingkat), keduanya run LTR
  assert.ok(kop.indexOf('>[     <') > 0 && kop.indexOf('>[     <') < kop.indexOf('>] <'));
  assert.match(kop, /<w:jc w:val="right"\/>/); // dua baris judul pertama rata kanan biasa
  assert.match(kop, /<w:ind w:right="57"\/>/); // baris tahun dua arah dengan indentasi 57 seperti template
  const t = teksDari(kop);
  for (const s of ['الامتحان في الدور الأول', 'بالمدرسة الدينية السلفية المعارف', 'الاسم', 'الفصـل', 'الرقم', 'المادة', 'حديث', 'الثانوي', '_________']) assert.ok(t.includes(s), s);
  assert.match(kop, /<wp:positionH relativeFrom="column"><wp:posOffset>6598920<\/wp:posOffset>/); // logo mengambang tepat di titik logo template (29210 + 6569710 EMU)
  assert.ok(kop.indexOf('<pic:pic') > kop.indexOf('</mc:AlternateContent>')); // logo di luar grup (docx tidak dapat menaruh gambar di dalam grup)
});

test('kop: isi dari luar (kelas, tingkat, mapel, tahun) lolos escape XML dan spasi di kotak data tidak hilang', async () => {
  const n = susunNaskah(penuh(2), 2);
  const { xml } = await bongkar(buatNaskah(D, n, { kelas: 'الثاني', tingkat: 'الثانوي', mapel: '<b>&"x"</b>', tahun: '1447 – 1448' }, { kunci: false }));
  assert.ok(!xml.includes('<b>')); assert.ok(teksDari(xml).includes('&lt;b&gt;&amp;&quot;x&quot;&lt;/b&gt;') || teksDari(xml).includes('&lt;b&gt;&amp;"x"&lt;/b&gt;'));
  assert.ok(teksDari(xml).includes('الثاني ')); // spasi sesudah kelas dan antara kurung ] [ dipertahankan
  assert.match(xml, /<w:t xml:space="preserve">\[     <\/w:t>/);
  assert.ok(teksDari(xml).includes('1447 – 1448'));
});

test('DOCX kunci: huruf opsi benar, jawaban tertulis, dan ص + halaman berwarna merah; ada keterangan di kaki', async () => {
  const n = susunNaskah(penuh(1), 1);
  const { xml, kaki } = await bongkar(buatNaskah(D, n, {}, { kunci: true }));
  const merah = [...xml.matchAll(/<w:r>(?:(?!<\/w:r>).)*?w:val="FF0000"(?:(?!<\/w:r>).)*?<\/w:r>/gs)].map((m) => teksDari(m[0]));
  assert.ok(merah.includes('ب-')); // pilgan: kunci B, ditulis "ب-3" tanpa spasi seperti contoh template
  assert.ok(merah.some((x) => x === 'ص 1') && merah.some((x) => x === 'ص 5'));
  assert.ok(merah.includes('jawab I0') && merah.includes('uraian U0'));
  assert.ok(merah.length >= 5 + 5 + 5 + 5 + 5);
  assert.ok(kaki.includes('NASKAH KUNCI'));
});

test('DOCX tanpa logo tetap jadi; isi dari luar tidak merusak XML; Arab dan Latin dalam satu soal', async () => {
  const jahat = pg('Soal <b>&</b> "kutip" \u0001 dan ما هو؟', ['<x>', '&y', '"z"'], 'A', '1');
  const { xml, media } = await bongkar(buatNaskah(D, susunNaskah([jahat], 1), { mapel: '<script>', baris1: 'A&B' }, { kunci: true }));
  assert.equal(media.length, 0);
  assert.ok(teksDari(xml).includes('Soal &lt;b&gt;&amp;&lt;/b&gt;'));
  assert.ok(!xml.includes('<script>')); assert.ok(!xml.includes('\u0001'));
});

test('DOCX: nomor kosong dibiarkan sebagai baris isian (naskah sebagian tetap bisa dicetak)', async () => {
  const { xml } = await bongkar(buatNaskah(D, susunNaskah([], 4), {}, { kunci: false }));
  const t = teksDari(xml);
  for (let i = 1; i <= 7; i++) assert.ok(t.includes(`${i}- `));
  assert.match(xml, /w:leader="dot"/); assert.match(xml, /w:leader="underscore"/);
});

/* ------------------------------------------------------------ pemasangan di UI */
const app = readFileSync(new URL('../web/App.jsx', import.meta.url), 'utf8');
test('penjaga: format Naskah ada di tab Export dan logo tersedia di public/', () => {
  assert.match(app, /id: 'naskah', label: 'Naskah Ujian IMDA \(DOCX\)'/);
  assert.match(app, /NK\.susunNaskah\(chosen, nm\.dawr\)/);
  assert.match(app, /buatNaskah\(D, naskah, nm, \{ kunci, logo, pegon: nkUbah/);
  assert.match(app, /NK\.kataRagu\(naskah, nkUbah/); // kata yang diragukan mesin Pegon ditampilkan sebelum unduh
  assert.match(app, /fetch\('\/logo-madrasah\.png'\)/);
  assert.ok(LOGO.length > 1000 && LOGO.subarray(1, 4).toString() === 'PNG');
});

test('mode template di form: bentuk yang tersedia, ringkasan Dauri, dan nilai per bagian mengikuti preset', () => {
  assert.deepEqual([...BENTUK_TEMPLATE].sort(), ['isian', 'lanjutan', 'pilgan', 'uraian']); // Benar–Salah tidak ada di template
  assert.equal(ringkasDauri(1), 'أ 5×5 + ب 5×7 + ج 5×8 = 100');
  assert.equal(ringkasDauri(2), 'أ 7×4 + ب 6×5 + ج 7×6 = 100');
  assert.equal(ringkasDauri('x'), ringkasDauri(1)); // Dauri tidak sah jatuh ke Dauri I, sama seperti ekspor
  const b = ringkasBagian(4, 'b');
  assert.deepEqual([b.huruf, b.n, b.nilai], ['ب', 6, 5]);
  assert.equal(b.judul, judulBagian('b', 5));
  assert.equal(ringkasBagian(1, 'z'), null);
});

test('catatan template: soal yang sudah sesuai tanpa catatan; penyimpangan dicatat dengan awalan bagian', () => {
  assert.deepEqual(catatanTemplate(pg('Soal', ['1', '2', '3'], 'A', '11'), 1), []);
  assert.deepEqual(catatanTemplate(isi('Syarat ada ..... perkara', '5'), 1), []);
  // empat opsi, ada narasi, halaman kosong
  const c = catatanTemplate({ ...pg('Soal', ['1', '2', '3', '4']), stimulus: 'Narasi singkat' }, 1);
  assert.equal(c.length, 3);
  assert.ok(c.every((t) => t.startsWith('Bagian أ: ')));
  assert.ok(c.some((t) => t.includes('4')) && c.some((t) => t.includes('tidak dicetak')) && c.some((t) => t.includes('ص')));
  // narasi dinyalakan: catatan berubah menjadi peringatan bahwa narasi dicetak di depan kalimat soal
  assert.ok(catatanTemplate({ ...pg('Soal', ['1', '2', '3']), stimulus: 'Narasi singkat', hal: '1' }, 1, { narasi: true }).some((t) => t.includes('akan dicetak di depan')));
  // kurang dari tiga opsi
  assert.ok(catatanTemplate(pg('Soal', ['1', '2', ''], 'A', '1'), 1).some((t) => t.includes('baru 2')));
  // soal panjang
  assert.ok(catatanTemplate(pg('x'.repeat(300), ['1', '2', '3'], 'A', '1'), 1).some((t) => t.includes('±')));
  // isian/uraian tanpa jawaban
  assert.ok(catatanTemplate({ bentuk: 'isian', pertanyaan: 'Syarat ..... perkara', jawaban: '', opsi: {}, hal: '2' }, 1).some((t) => t.startsWith('Bagian ب: ') && t.includes('Jawaban')));
  assert.ok(catatanTemplate({ bentuk: 'uraian', pertanyaan: 'Jelaskan', jawaban: '', opsi: {}, hal: '2' }, 3).some((t) => t.startsWith('Bagian ج: ')));
  // Benar–Salah: satu catatan tegas, tanpa awalan bagian
  const bs = catatanTemplate({ bentuk: 'benarsalah', pertanyaan: 'Pernyataan', kunci: 'A', opsi: {}, hal: '1' }, 1);
  assert.equal(bs.length, 1); assert.ok(bs[0].includes('Benar–Salah'));
});

/* ------------------------------------------------------------ Pegon dan ringkas (naskah mengikuti contoh FIQH.docx) */
const ubahPegon = (t) => convertText(t).pegon;
const ARAB_SAJA = /^[\u0600-\u06FF\u0750-\u077F\s\d.,:;!?()\-–—\u061F\u060C\u066B\u066C"'“”‘’…_/\\\[\]|*@]*$/;

test('teksSoal: hanya pertanyaan; narasi ikut hanya bila dinyalakan', () => {
  const q = { ...pg('Apa yang disebut nazar?'), stimulus: 'Narasi  panjang\nbaris dua' };
  assert.equal(teksSoal(q), 'Apa yang disebut nazar?');
  assert.equal(teksSoal(q, { narasi: true }), 'Narasi panjang baris dua Apa yang disebut nazar?');
  assert.equal(teksSoal(null), ''); assert.equal(teksSoal({}), '');
});

test('DOCX Pegon: kalimat soal, opsi, dan jawaban kunci ditulis Pegon; tak ada huruf Latin tersisa di badan naskah', async () => {
  const soal = [pg('Ibadah haji dan umrah dapat dilakukan dengan berapa macam cara?', ['dua', 'tiga', 'empat'], 'B', '12'), isi('Syarat sah salat adalah ..... perkara', '3'), { bentuk: 'uraian', pertanyaan: 'Apa yang disebut nazar?', jawaban: 'Mewajibkan diri', opsi: {}, hal: '4' }];
  const n = susunNaskah(soal, 1);
  const peserta = await bongkar(buatNaskah(D, n, { ...META_AWAL, mapel: 'فقه' }, { kunci: false, logo: LOGO, pegon: ubahPegon }));
  const t = teksDari(peserta.xml);
  assert.ok(t.includes(ubahPegon('Ibadah haji dan umrah dapat dilakukan dengan berapa macam cara?')));
  assert.ok(t.includes(ubahPegon('tiga')) && t.includes(ubahPegon('Apa yang disebut nazar?')));
  const badan = t.replace(/&\w+;/g, '').replace(/L@b I/g, ''); // entitas XML (&quot; di kop) dan penanda kaki bukan teks soal
  assert.ok(!/[A-Za-z]/.test(badan), 'masih ada huruf Latin: ' + (badan.match(/[A-Za-z]+/g) || []).join(','));
  const kunci = await bongkar(buatNaskah(D, n, { ...META_AWAL, mapel: 'فقه' }, { kunci: true, pegon: ubahPegon }));
  assert.ok(teksDari(kunci.xml).includes(ubahPegon('Mewajibkan diri'))); // jawaban uraian di naskah kunci juga Pegon
  assert.ok(!/Mewajibkan/.test(teksDari(kunci.xml)));
});

test('DOCX tanpa fungsi Pegon: teks dicetak apa adanya (perilaku lama); fungsi yang gagal tidak menggagalkan unduhan', async () => {
  const n = susunNaskah([pg('Apa itu nazar', ['a', 'b', 'c'], 'A', '1')], 1);
  assert.ok(teksDari((await bongkar(buatNaskah(D, n, {}, {}))).xml).includes('Apa itu nazar'));
  const rusak = await bongkar(buatNaskah(D, n, {}, { pegon: () => { throw new Error('mesin rusak'); } }));
  assert.ok(teksDari(rusak.xml).includes('Apa itu nazar'));
  const kosong = await bongkar(buatNaskah(D, n, {}, { pegon: () => '' }));
  assert.ok(teksDari(kosong.xml).includes('Apa itu nazar'));
});

test('DOCX ringkas: narasi tidak dicetak bawaan, dicetak bila dinyalakan; opsi ditulis "أ-opsi" satu baris seperti contoh', async () => {
  const q = { ...pg('Soal inti', ['satu', 'dua', 'tiga'], 'A', '1'), stimulus: 'NARASI-PANJANG' };
  const n = susunNaskah([q], 1);
  const tanpa = teksDari((await bongkar(buatNaskah(D, n, {}, {}))).xml);
  assert.ok(!tanpa.includes('NARASI-PANJANG') && tanpa.includes('Soal inti'));
  assert.ok(tanpa.includes('أ-satu ب-dua ج-tiga)')); assert.ok(!tanpa.includes('أ- satu')); // nomor yang belum terisi tetap memakai kerangka kosong "(أ- ب- ج-)"
  const dengan = teksDari((await bongkar(buatNaskah(D, n, {}, { narasi: true }))).xml);
  assert.ok(dengan.includes('NARASI-PANJANG Soal inti'));
});

test('kataRagu: kata serapan Arab yang belum ada di kamus dilaporkan sekali; kata di kamus tidak', () => {
  const n = susunNaskah([pg('Hukum mengulangi sai setelah tawaf ifadhah adalah', ['makruh', 'sunah', 'haram'], 'A', '1'), isi('Waktu khiyar syarat ..... hari', '3')], 1);
  const ragu = kataRagu(n, convertText).map((x) => x.kata);
  assert.ok(ragu.includes('ifadhah') && ragu.includes('khiyar'));
  assert.ok(!ragu.includes('hukum') && !ragu.includes('Hukum') && !ragu.includes('sunah'));
  assert.equal(new Set(ragu).size, ragu.length);
  assert.deepEqual(kataRagu(n, null), []); assert.deepEqual(kataRagu(null, convertText), []);
});

test('catatan ringkas: opsi dan kalimat soal yang melebihi contoh template diberi catatan; soal sependek contoh tanpa catatan', () => {
  assert.deepEqual(catatanTemplate(pg('Ibadah haji dan umrah dapat dilakukan dengan berapa macam cara?', ['2', '3', '4'], 'B', '12'), 1), []);
  assert.ok(catatanTemplate(pg('Soal', ['x'.repeat(60), 'b', 'c'], 'A', '1'), 1).some((t) => t.includes('opsi lebih dari')));
  assert.ok(catatanTemplate(pg('k'.repeat(BATAS_SOAL + 1), ['1', '2', '3'], 'A', '1'), 1).some((t) => t.includes('±')));
  assert.ok(!catatanTemplate({ ...pg('Soal pendek', ['1', '2', '3'], 'A', '1'), stimulus: 'n'.repeat(400) }, 1).some((t) => t.includes('±'))); // narasi tak dicetak, jadi tak dihitung
});

test('ejaan klasik: p/v = ف, c = ج, g = ك, ng = غ, ngg = غك, ny/nya = ني/نيا; al-Qolam tetap bawaan; hasil lain sama persis', () => {
  const lat = 'Yang paling penting dengan orang pergi, sungguh vokal cara nyata.';
  const q = convertTextEjaan(lat, 'alqolam'); const k = convertTextEjaan(lat, 'klasik');
  assert.equal(q.pegon, convertText(lat).pegon);
  assert.ok(/[ڤڬڠچپ]/.test(q.pegon) && !/[ڤڬڠچپ]/.test(k.pegon));
  const tanpaHamzah = (s) => s.replace(/[أإ]/g, 'ا');
  assert.equal(tanpaHamzah(k.pegon), tanpaHamzah(ubahEjaan(q.pegon, 'klasik'))); // beda hanya di hamzah awal kata
  const kl = (w) => convertTextEjaan(w, 'klasik').pegon;
  assert.equal(kl('yang'), 'ياغ'); assert.equal(kl('dengan'), 'دغان'); assert.equal(kl('paling'), 'فاليغ');
  assert.equal(kl('juga'), 'جوكا'); assert.equal(kl('cara'), 'جارا'); assert.equal(kl('orang'), 'اوراغ'); // alif polos tanpa hamzah, sama dengan contoh FIQH.docx
  assert.equal(kl('bertanggung'), 'برتاغكوغ'); assert.equal(kl('meninggalkan'), 'منيغكالكن'); // ngg = غك, persis contoh
  assert.equal(kl('tanya'), 'تانيا'); assert.equal(kl('penjual'), 'فنجوال');
  assert.equal(k.details.length, q.details.length); assert.ok(k.details.every((d) => !/[ڤڬڠچپ]/.test(d.pegon)));
  assert.equal(ejaanSah('x'), 'alqolam'); assert.deepEqual(Object.keys(EJAAN), ['alqolam', 'klasik']);
});

test('DOCX naskah dengan ejaan klasik tidak memuat huruf ڤ ڬ ڠ چ پ', async () => {
  const n = susunNaskah([pg('Yang paling penting dengan orang', ['pergi', 'gagal', 'pintu'], 'A', '1')], 1);
  const { xml } = await bongkar(buatNaskah(D, n, {}, { pegon: (t) => convertTextEjaan(t, 'klasik').pegon }));
  assert.ok(!/[ڤڬڠچپ]/.test(xml)); assert.ok(teksDari(xml).includes('فاليغ'));
});

test('penjaga: ejaan Pegon dipasang di tab Pegonizer, pratinjau Pegonkan, dan ekspor Soal Pegon (bukan hanya Naskah Ujian)', () => {
  assert.match(app, /function useEjaan\(\)/);
  assert.match(app, /P\.convertTextEjaan\(latin, ejaan\)/); // tab Pegonizer
  assert.match(app, /P\.ubahEjaan\(d\.hasil\.pegon, ejaan\)/); // hasil AI (foto dan perkuat) ikut ejaan
  assert.match(app, /P\.convertTextEjaan\(String\(teks\), ejaan\)/); // pratinjau Pegonkan
  assert.match(app, /buildDocx = async \(qs, mode, catatan = '', ejaan = 'alqolam'\)/); assert.match(app, /'daftar', catatan, ejaanTersimpan\(\)\)/); // ekspor DOCX Soal Pegon
  assert.doesNotMatch(app, /window\.Pegon\.convertText\(/); // tidak ada jalur Pegon yang melewati pilihan ejaan
});
