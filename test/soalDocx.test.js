import test from 'node:test';
import assert from 'node:assert/strict';
import { bacaDocxSoal, bacaParagraf, uraiNaskah, gabungKunci, bagianDariJudul, nilaiDariKata, warnaMerah, keAngkaLatin, aksaraDominan, bacaEntriZip, MAKS_BERKAS } from '../web/lib/soalDocx.js';
import { run, par, parOtomatis, kop, dokumen, docx, zip } from './_buatDocx.js';
import { judulBagian, judulDauri } from '../web/lib/naskah.js';

// Judul bagian dipakai persis seperti keluaran Export (web/lib/naskah.js), jadi uji ini sekaligus menjaga kecocokan dengan format Dauri.
const J_A = judulBagian('a', 5); const J_B = judulBagian('b', 7); const J_C = judulBagian('c', 8);

/** Butir pilihan seperti web/lib/naskahDocx.js: "no- (     ) soal (أ-x ب-y ج-z)"; huruf kunci merah bila kunci. */
const pilihan = (no, soal, opsi, kunci, hal) => par(run(`${no}- `), run('(     )'), run(' '), run(`${soal} `), run('('),
  ...['أ', 'ب', 'ج'].flatMap((h, i) => [run(`${h}-`, { merah: kunci === 'ABC'[i] }), run(opsi[i] + (i < 2 ? ' ' : ''))]), run(')'), ...(hal !== undefined ? [run('  '), run(`ص ${hal}`, { merah: true })] : []));
const isian = (no, soal, jawaban, hal) => par(run(`${no}- `), run(soal), ...(jawaban ? [run(' '), run(jawaban, { merah: true })] : []), run('', { tab: true }), ...(hal !== undefined ? [run(`ص ${hal}`, { merah: true })] : []));

const naskah = ({ kunci = true } = {}) => dokumen(
  kop('الاسم : ____ الفصـل : الأول', 'الرقم : المادة : الفقه'),
  par(run(judulDauri(1), { bold: true })),
  par(run(J_A, { bold: true })),
  pilihan(1, 'عدد ركعات المغرب', ['اثنان', 'ثلاث', 'أربع'], kunci ? 'B' : '', kunci ? 12 : undefined),
  pilihan(2, 'شروط الصلاة ......', ['خمسة', 'ستة', 'سبعة'], kunci ? 'A' : '', kunci ? 13 : undefined),
  par(run(J_B, { bold: true })),
  isian(1, 'فرائض الوضوء ......', kunci ? 'ستة' : '', kunci ? 5 : undefined),
  isian(2, 'الصلاة المفروضة في اليوم والليلة', kunci ? 'خمس' : '', kunci ? 6 : undefined),
  par(run(J_C, { bold: true })),
  isian(1, 'ما هي شروط صحة الوضوء ؟', kunci ? 'الإسلام والتمييز' : '', kunci ? 7 : undefined),
  ...(kunci ? [par(run('نص الكتاب: ', { merah: true }), run('شروط الوضوء الإسلام والتمييز', { merah: true }))] : []),
);

test('format Dauri: butir, bagian, kunci merah, halaman, kutipan, mapel dan kelas dari kop', async () => {
  const r = await bacaDocxSoal(docx(naskah()));
  assert.equal(r.meta.dawr, 1);
  assert.equal(r.meta.mapel, 'الفقه'); assert.equal(r.meta.kelas, 'الأول');
  assert.deepEqual(r.butir.map((b) => `${b.bagian}${b.no}:${b.bentuk}`), ['a1:pilgan', 'a2:lanjutan', 'b1:isian', 'b2:isian', 'c1:uraian']);
  const [a1, a2, b1, b2, c1] = r.butir;
  assert.equal(a1.pertanyaan, 'عدد ركعات المغرب'); assert.deepEqual(a1.opsi, { A: 'اثنان', B: 'ثلاث', C: 'أربع' });
  assert.equal(a1.kunci, 'B'); assert.equal(a1.hal, '12'); assert.equal(a1.kunciDari, 'merah');
  assert.equal(a2.kunci, 'A'); assert.equal(a2.bentuk, 'lanjutan');
  assert.equal(b1.pertanyaan, 'فرائض الوضوء ......'); assert.equal(b1.jawaban, 'ستة'); assert.equal(b1.hal, '5');
  assert.equal(b2.jawaban, 'خمس');
  assert.equal(c1.pertanyaan, 'ما هي شروط صحة الوضوء ؟'); assert.equal(c1.jawaban, 'الإسلام والتمييز'); assert.equal(c1.hal, '7');
  assert.equal(c1.kutipan, 'شروط الوضوء الإسلام والتمييز');
  assert.equal(r.adaKunci, true); assert.equal(r.meta.aksara, 'arab');
  assert.deepEqual(r.nilai, { a: 5, b: 7, c: 8 });
  assert.ok(r.peringatan.some((x) => /Bagian أ: 2 butir terbaca, template Dauri I memuat 5/.test(x)), 'jumlah butir dibandingkan dengan template Dauri');
  assert.ok(!r.peringatan.some((x) => /kop|Kelas|الفقه/.test(x)), 'isi kop tidak dianggap butir');
});

test('teks kotak kop tidak masuk isi soal dan teks cadangan (mc:Fallback) tidak terbaca dua kali', () => {
  const { paragraf, kotak } = bacaParagraf(naskah());
  assert.ok(!paragraf.some((p) => /الاسم|المادة/.test(p.teks)));
  assert.equal(kotak.length, 2, 'dua baris kop, tanpa salinan Fallback');
});

test('naskah peserta tanpa kunci: butir terbaca, kunci kosong, ada peringatan', async () => {
  const r = await bacaDocxSoal(docx(naskah({ kunci: false })));
  assert.equal(r.butir.length, 5); assert.equal(r.adaKunci, false);
  assert.ok(r.butir.every((b) => !b.kunci && !b.jawaban));
  assert.ok(r.peringatan.some((x) => /Tidak ada tanda kunci/.test(x)));
  assert.equal(r.butir[0].pertanyaan, 'عدد ركعات المغرب');
});

test('gabungKunci: kunci dari naskah kunci masuk ke naskah peserta; soal beda tidak tertukar; yang sudah ada tidak ditimpa', async () => {
  const peserta = (await bacaDocxSoal(docx(naskah({ kunci: false })))).butir;
  const kunci = (await bacaDocxSoal(docx(naskah()))).butir;
  const g = gabungKunci(peserta, kunci);
  assert.equal(g.terpakai, 5); assert.deepEqual(g.tidakCocok, []);
  assert.equal(g.butir[0].kunci, 'B'); assert.equal(g.butir[0].kunciDari, 'naskah-kunci'); assert.equal(g.butir[2].jawaban, 'ستة'); assert.equal(g.butir[4].kutipan, 'شروط الوضوء الإسلام والتمييز');
  const lain = kunci.map((b, i) => (i === 1 ? { ...b, pertanyaan: 'soal yang sama sekali berbeda', kunci: 'C' } : b));
  const g2 = gabungKunci(peserta, lain);
  assert.equal(g2.butir[1].kunci, ''); assert.deepEqual(g2.tidakCocok, ['أ no. 2']);
  const sudah = peserta.map((b, i) => (i === 0 ? { ...b, kunci: 'A' } : b));
  assert.equal(gabungKunci(sudah, kunci).butir[0].kunci, 'A');
});

test('berkas dengan ZIP tanpa pemampatan, entri lain, dan nomor Arab-Indic dibaca juga', async () => {
  const xml = dokumen(par(run(judulDauri(2))), par(run(J_A)),
    par(run('١- '), run('(     ) سؤال '), run('('), run('أ-', { merah: true }), run('واحد '), run('ب-'), run('اثنان '), run('ج-'), run('ثلاثة'), run(')'), run('  ص ١٥')));
  const r = await bacaDocxSoal(docx(xml, { mampat: 'simpan' }));
  assert.equal(r.meta.dawr, 2); assert.equal(r.butir[0].no, 1); assert.equal(r.butir[0].kunci, 'A'); assert.equal(r.butir[0].hal, '15');
  assert.equal(r.butir[0].pertanyaan, 'سؤال');
  assert.equal(keAngkaLatin('١٢۳'), '123');
});

test('nomor otomatis Word (w:numPr) dihitung berurutan per bagian', async () => {
  const xml = dokumen(par(run(J_B)), parOtomatis('kalimat satu ......'), parOtomatis('kalimat dua ......'));
  const r = await bacaDocxSoal(docx(xml));
  assert.deepEqual(r.butir.map((b) => [b.bagian, b.no, b.pertanyaan]), [['b', 1, 'kalimat satu ......'], ['b', 2, 'kalimat dua ......']]);
});

test('teks Latin: opsi Latin dengan huruf Arab أ ب ج tetap terbaca; aksara latin terdeteksi', async () => {
  const xml = dokumen(par(run(J_A)), par(run('1- '), run('(     ) Berapa rakaat shalat Maghrib? '), run('('), run('أ-', { merah: true }), run('2 '), run('ب-'), run('3 '), run('ج-'), run('4'), run(')')));
  const r = await bacaDocxSoal(docx(xml));
  assert.equal(r.butir[0].pertanyaan, 'Berapa rakaat shalat Maghrib?'); assert.equal(r.butir[0].kunci, 'A'); assert.equal(r.meta.aksara, 'latin');
  assert.equal(aksaraDominan(['abc', 'سلام']), 'campur');
});

test('dua opsi merah = kunci dikosongkan dengan peringatan; seluruh kalimat isian merah bukan jawaban', async () => {
  const xml = dokumen(par(run(J_A)), par(run('1- '), run('soal '), run('('), run('أ-x ', { merah: true }), run('ب-y ', { merah: true }), run('ج-z'), run(')')),
    par(run(J_B)), par(run('1- '), run('seluruh kalimat merah', { merah: true }), run('', { tab: true })));
  const r = await bacaDocxSoal(docx(xml));
  assert.equal(r.butir[0].kunci, ''); assert.ok(r.peringatan.some((x) => /lebih dari satu opsi bertanda merah/.test(x)));
  assert.equal(r.butir[1].jawaban, ''); assert.equal(r.butir[1].pertanyaan, 'seluruh kalimat merah');
});

test('opsi terpotong baris (Enter di tengah opsi) digabung kembali', () => {
  const p = (teks) => ({ teks, merah: new Uint8Array(teks.length), nomorOtomatis: false });
  const r = uraiNaskah({ paragraf: [p(J_A), p('1- ( ) soal (أ-satu'), p('ب-dua ج-tiga)')] });
  assert.deepEqual(r.butir[0].opsi, { A: 'satu', B: 'dua', C: 'tiga' }); assert.equal(r.butir[0].pertanyaan, 'soal');
});

test('judul bagian: dikenali dengan harakat dan tanpa kata "لكل رقم"; butir bernomor bukan judul; nilai dari kata', () => {
  assert.equal(bagianDariJudul(J_A).kode, 'a'); assert.equal(bagianDariJudul(J_A).nilai, 5);
  assert.equal(bagianDariJudul(J_B).kode, 'b'); assert.equal(bagianDariJudul(J_B).nilai, 7);
  assert.equal(bagianDariJudul(J_C).kode, 'c'); assert.equal(bagianDariJudul(J_C).nilai, 8);
  assert.equal(bagianDariJudul('ب – إملاء الفراغ الآتية').kode, 'b');
  assert.equal(bagianDariJudul('1- أجب أسئلة التالية'), null);
  assert.equal(bagianDariJudul('النحو والصرف'), null);
  assert.equal(nilaiDariKata('ثمانية'), 8); assert.equal(nilaiDariKata('٧'), 7); assert.equal(nilaiDariKata('لا'), null);
});

test('warnaMerah: merah murni dan gelap diterima; hitam, abu, biru, oranye ditolak', () => {
  for (const x of ['FF0000', 'C00000', 'E00000', 'ff0000']) assert.ok(warnaMerah(x), x);
  for (const x of ['000000', '555555', '0000FF', 'FFC000', 'auto', '', undefined]) assert.ok(!warnaMerah(x), String(x));
});

test('berkas bukan docx, kosong, atau ZIP tanpa document.xml ditolak dengan pesan jelas', async () => {
  await assert.rejects(() => bacaDocxSoal(new Uint8Array([1, 2, 3])), /bukan dokumen Word/);
  await assert.rejects(() => bacaDocxSoal(new TextEncoder().encode('%PDF-1.4 ' + 'x'.repeat(100))), /bukan dokumen Word/);
  await assert.rejects(() => bacaDocxSoal(zip({ 'a.txt': 'x' })), /tidak berisi dokumen Word/);
  await assert.rejects(() => bacaDocxSoal(new Uint8Array(MAKS_BERKAS + 1)), /terlalu besar/);
});

test('zip bomb: document.xml yang membengkak melewati batas ditolak', async () => {
  const b = zip({ 'word/document.xml': '<a>' + 'x'.repeat(5000) + '</a>' });
  await assert.rejects(() => bacaEntriZip(b, 'word/document.xml', 1000), /terlalu besar/);
  assert.ok(await bacaEntriZip(b, 'word/document.xml', 10000));
});

test('masukan hostile: XML berisi entitas, tag aneh, dan teks sangat panjang tidak menggantung atau melempar', async () => {
  const jahat = dokumen(par(run(J_A)), par(run('1- ')).replace('</w:p>', '<w:r><w:t>&lt;script&gt;alert(1)&lt;/script&gt; &#x41; &#66; </w:t></w:r></w:p>'), '<w:p><w:r><w:t>tak ditutup', par(run('2- ' + 'a'.repeat(200000))));
  const t0 = Date.now();
  const r = await bacaDocxSoal(docx(jahat));
  assert.ok(Date.now() - t0 < 3000, 'waktu proses wajar');
  assert.equal(r.butir[0].pertanyaan.startsWith('<script>alert(1)</script> A B'), true, 'entitas didekode menjadi teks biasa, bukan HTML');
});

test('naskah kosong: tanpa butir -> peringatan, tanpa melempar', async () => {
  const r = await bacaDocxSoal(docx(dokumen(par(run('dokumen biasa tanpa soal')))));
  assert.equal(r.butir.length, 0); assert.ok(r.peringatan.some((x) => /Tidak ada butir soal bernomor/.test(x)));
});
