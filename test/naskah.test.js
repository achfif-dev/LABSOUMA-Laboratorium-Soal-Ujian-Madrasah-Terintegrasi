// Naskah ujian format IMDA (Dawr I-IV): web/lib/naskah.js dan web/lib/naskahDocx.js, mengikuti FORMAT_SOAL_IMDA_I..IV.docx.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as D from 'docx';
import JSZip from 'jszip';
import { BENTUK_TEMPLATE, ringkasBagian, ringkasDawr, catatanTemplate, PRESET_DAWR, DAFTAR_DAWR, MAKS_NILAI, susunNaskah, judulBagian, judulDawr, kataNilai, dawrSah, bagianDari, namaBerkasNaskah, rujukanHalaman, jawabanKunci, akhiriTanya, META_AWAL } from '../web/lib/naskah.js';
import { buatNaskah } from '../web/lib/naskahDocx.js';

const pg = (pertanyaan, o = ['x', 'y', 'z'], kunci = 'A', hal = '') => ({ bentuk: 'pilgan', pertanyaan, opsi: { A: o[0], B: o[1], C: o[2], D: o[3] || '', E: o[4] || '' }, kunci, hal });
const isi = (pertanyaan, hal = '') => ({ bentuk: 'isian', pertanyaan, jawaban: 'jawab ' + pertanyaan, opsi: {}, hal });
const ura = (pertanyaan, hal = '') => ({ bentuk: 'uraian', pertanyaan, jawaban: 'uraian ' + pertanyaan, opsi: {}, hal });
const penuh = (dawr) => {
  const [a, b, c] = PRESET_DAWR[dawr].bagian.map((x) => x.n);
  return [...Array.from({ length: a }, (_, i) => pg('P' + i, ['1', '2', '3'], 'B', String(i + 1))), ...Array.from({ length: b }, (_, i) => isi('I' + i, String(i + 1))), ...Array.from({ length: c }, (_, i) => ura('U' + i, String(i + 1)))];
};

test('preset mengikuti keempat template: jumlah nomor dan nilai per nomor, total selalu 100', () => {
  const ringkas = (d) => PRESET_DAWR[d].bagian.map((b) => `${b.kode}:${b.n}x${b.nilai}`).join(' ');
  assert.equal(ringkas(1), 'a:5x5 b:5x7 c:5x8');
  assert.equal(ringkas(2), 'a:7x4 b:6x5 c:7x6');
  assert.equal(ringkas(3), 'a:5x5 b:5x7 c:5x8');
  assert.equal(ringkas(4), 'a:7x4 b:6x5 c:7x6');
  for (const p of DAFTAR_DAWR) assert.equal(p.bagian.reduce((n, b) => n + b.n * b.nilai, 0), MAKS_NILAI, p.label);
});

test('judul sama dengan teks template (ejaan "اربعة" tanpa hamza dan pemisah bagian ج tidak diubah)', () => {
  assert.equal(judulBagian('a', 4), 'أ – إختر إحدى الأجوبة الصحيحة مما بين القوسين ( لكل رقم اربعة نتائج )');
  assert.equal(judulBagian('a', 5), 'أ – إختر إحدى الأجوبة الصحيحة مما بين القوسين ( لكل رقم خمسة نتائج )');
  assert.equal(judulBagian('b', 7), 'ب – إملاء الفراغ الآتية بأجوبة صحيحة ( لكل رقم سبعة نتائج )');
  assert.equal(judulBagian('b', 5), 'ب – إملاء الفراغ الآتية بأجوبة صحيحة ( لكل رقم خمسة نتائج )');
  assert.equal(judulBagian('c', 8), 'ج - أجب أسئلة التالية إجابة صحيحة ( لكل رقم ثمانية نتائج )');
  assert.equal(judulBagian('c', 6), 'ج - أجب أسئلة التالية إجابة صحيحة ( لكل رقم ستة نتائج )');
  assert.deepEqual([1, 2, 3, 4].map(judulDawr), ['الامتحان في الدور الأول', 'الامتحان في الدور الثاني', 'الامتحان في الدور الثالث', 'الامتحان في الدور الرابع']);
  assert.equal(kataNilai(11), '11'); assert.equal(kataNilai(0), '0');
});

test('dawrSah: nilai tidak dikenal kembali ke Dawr I', () => {
  assert.equal(dawrSah('3'), 3); assert.equal(dawrSah(4), 4);
  for (const v of [0, 5, 'x', null, undefined, '__proto__']) assert.equal(dawrSah(v), 1, String(v));
});

test('bentuk soal dipetakan ke bagian; Benar-Salah tidak punya bagian', () => {
  assert.equal(bagianDari(pg('a')), 'a'); assert.equal(bagianDari({ bentuk: 'lanjutan' }), 'a');
  assert.equal(bagianDari(isi('a')), 'b'); assert.equal(bagianDari(ura('a')), 'c');
  assert.equal(bagianDari({ bentuk: 'benarsalah' }), null);
  assert.equal(bagianDari({}), 'a'); // tanpa bentuk dianggap pilihan ganda
});

test('susunNaskah: naskah penuh bernilai 100 tanpa peringatan di semua Dawr', () => {
  for (const d of [1, 2, 3, 4]) {
    const n = susunNaskah(penuh(d), d);
    assert.equal(n.total, 100, 'dawr ' + d); assert.deepEqual(n.peringatan, [], 'dawr ' + d); assert.equal(n.tidakDipakai.length, 0);
    assert.deepEqual(n.bagian.map((b) => b.butir.length), PRESET_DAWR[d].bagian.map((b) => b.n));
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
  assert.equal(namaBerkasNaskah({ dawr: 2, mapel: 'Fiqh' }, false), 'naskah-ujian-dawr-2-fiqh.docx');
  assert.equal(namaBerkasNaskah({ dawr: 3, mapel: 'Fiqh' }, true), 'naskah-ujian-dawr-3-fiqh-kunci.docx');
  assert.equal(namaBerkasNaskah({ dawr: 4, mapel: 'فقه' }, false), 'naskah-ujian-dawr-4.docx'); // Arab tidak dipakai di nama berkas
  assert.equal(namaBerkasNaskah({ dawr: 9, mapel: '../../etc' }, false), 'naskah-ujian-dawr-1-etc.docx');
  assert.equal(namaBerkasNaskah(null, false), 'naskah-ujian-dawr-1.docx');
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

test('kop mengikuti template asli: Arial tebal, kotak data bergaris ganda tebal-tipis, garis ganda di bawah judul, kotak nomor', async () => {
  const n = susunNaskah(penuh(1), 1);
  const { xml } = await bongkar(buatNaskah(D, n, { ...META_AWAL, mapel: 'حديث' }, { kunci: false, logo: LOGO }));
  const kop = xml.slice(0, xml.lastIndexOf('</w:tbl>') + 8); // badan naskah tidak memuat tabel, jadi tabel terakhir menutup kop
  assert.match(kop, /w:ascii="Arial"/); // template memakai Arial pada kop
  assert.doesNotMatch(kop, /w:ascii="Traditional Arabic"/);
  assert.match(kop, /<w:sz w:val="44"\/>/); assert.match(kop, /<w:sz w:val="32"\/>/); // judul 22 pt dan nama madrasah 16 pt
  assert.match(kop, /<w:(top|bottom|left|right) w:val="thickThinSmallGap" w:color="000000" w:sz="26"\/>/); // kotak data 3,25 pt
  assert.match(kop, /<w:bottom w:val="double" w:color="000000" w:sz="\d+"\/>/); // garis ganda di bawah judul
  assert.equal((kop.match(/<w:bdr /g) || []).length, 3); // tiga kotak nomor
  assert.equal((kop.match(/<w:tbl>/g) || []).length, 2); // tabel kop + tabel kotak data (bersarang)
  // sel dalam kotak data tidak boleh menimpa garis kotak dengan border "none" (cacat kop lama)
  const dalam = kop.slice(kop.indexOf('<w:tbl>', kop.indexOf('<w:tbl>') + 1));
  assert.doesNotMatch(dalam, /<w:tcBorders>/);
});

test('DOCX kunci: huruf opsi benar, jawaban tertulis, dan ص + halaman berwarna merah; ada keterangan di kaki', async () => {
  const n = susunNaskah(penuh(1), 1);
  const { xml, kaki } = await bongkar(buatNaskah(D, n, {}, { kunci: true }));
  const merah = [...xml.matchAll(/<w:r>(?:(?!<\/w:r>).)*?w:val="FF0000"(?:(?!<\/w:r>).)*?<\/w:r>/gs)].map((m) => teksDari(m[0]));
  assert.ok(merah.includes('ب- ')); // pilgan: kunci B
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
  assert.match(app, /buatNaskah\(D, naskah, nm, \{ kunci, logo \}\)/);
  assert.match(app, /fetch\('\/logo-madrasah\.png'\)/);
  assert.ok(LOGO.length > 1000 && LOGO.subarray(1, 4).toString() === 'PNG');
});

test('mode template di form: bentuk yang tersedia, ringkasan Dawr, dan nilai per bagian mengikuti preset', () => {
  assert.deepEqual([...BENTUK_TEMPLATE].sort(), ['isian', 'lanjutan', 'pilgan', 'uraian']); // Benar–Salah tidak ada di template
  assert.equal(ringkasDawr(1), 'أ 5×5 + ب 5×7 + ج 5×8 = 100');
  assert.equal(ringkasDawr(2), 'أ 7×4 + ب 6×5 + ج 7×6 = 100');
  assert.equal(ringkasDawr('x'), ringkasDawr(1)); // Dawr tidak sah jatuh ke Dawr I, sama seperti ekspor
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
  assert.ok(c.some((t) => t.includes('4')) && c.some((t) => t.includes('Narasi')) && c.some((t) => t.includes('ص')));
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
