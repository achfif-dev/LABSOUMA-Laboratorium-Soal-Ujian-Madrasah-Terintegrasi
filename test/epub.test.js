// Impor EPUB: sebelumnya parseEpub tidak punya tes sama sekali. EPUB dibuat sungguhan (ZIP terkompresi) oleh test/_epub.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEpub, paragrafDariHtml } from '../web/lib/sumberLain.js';
import { bacaDokumenKitab, bolehVirtual } from '../web/lib/dokumenKitab.js';
import { peringatanPratinjau } from '../web/lib/imporKitab.js';
import { buatEpub, buatZip } from './_epub.js';

const ARAB = 'قال المصنف رحمه الله تعالى في بيان أحكام الطهارة والصلاة وما يتعلق بهما من الشروط والأركان والسنن';
const pb = (n, atr = 'title') => `<span epub:type="pagebreak" ${atr}="${n}"/>`;
const hal = (n, pbf = pb) => `${pbf(n)}<p>${ARAB} ${n}</p>`;
const sepuluh = (pbf) => Array.from({ length: 10 }, (_, i) => hal(i + 1, pbf)).join('');
const nomor = (h) => h.halaman.map((p) => p.hal);

test('EPUB dasar: nomor cetak dari pagebreak, judul dan pengarang dari OPF, sumber epub', async () => {
  const h = await parseEpub(buatEpub([{ file: 'a.xhtml', html: `<h1>باب الطهارة</h1>${sepuluh()}` }]));
  assert.equal(h.format, 'epub'); assert.deepEqual(nomor(h), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(h.kitab.judul, 'كتاب الاختبار'); assert.equal(h.kitab.pengarang, 'المؤلف'); assert.equal(h.kitab.sumber.jenis, 'epub');
  assert.ok(h.daftarIsi.some((d) => d.judul === 'باب الطهارة'));
});
test('EPUB: satu halaman cetak yang melintasi dua berkas tetap satu halaman', async () => {
  const h = await parseEpub(buatEpub([{ file: 'a.xhtml', html: Array.from({ length: 5 }, (_, i) => hal(i + 1)).join('') + `${pb(6)}<p>awal halaman enam ${ARAB}</p>` }, { file: 'b.xhtml', html: `<p>lanjutan halaman enam ${ARAB}</p>${Array.from({ length: 4 }, (_, i) => hal(i + 7)).join('')}` }]));
  assert.deepEqual(nomor(h), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.ok(h.halaman[5].teks.includes('awal halaman enam') && h.halaman[5].teks.includes('lanjutan halaman enam'));
});
test('EPUB: nomor halaman angka Arab-Hindi dan Persia terbaca (title, aria-label, id)', async () => {
  const arab = '٠١٢٣٤٥٦٧٨٩'; const parsi = '۰۱۲۳۴۵۶۷۸۹';
  const h1 = await parseEpub(buatEpub([{ file: 'a.xhtml', html: ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '١٠'].map((n) => hal(n)).join('') }]));
  assert.deepEqual(nomor(h1), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const h2 = await parseEpub(buatEpub([{ file: 'a.xhtml', html: Array.from({ length: 8 }, (_, i) => `<span role="doc-pagebreak" aria-label="ص ${parsi[i + 1]}"/><p>${ARAB} ${i}</p>`).join('') }]));
  assert.deepEqual(nomor(h2), [1, 2, 3, 4, 5, 6, 7, 8]);
  const h3 = await parseEpub(buatEpub([{ file: 'a.xhtml', html: Array.from({ length: 8 }, (_, i) => `<a epub:type="pagebreak" id="page_${arab[i + 1]}"></a><p>${ARAB} ${i}</p>`).join('') }]));
  assert.deepEqual(nomor(h3), [1, 2, 3, 4, 5, 6, 7, 8]);
});
test('EPUB: atribut berkutip tunggal (container.xml, OPF, pagebreak)', async () => {
  const h = await parseEpub(buatEpub([{ file: 'a.xhtml', html: Array.from({ length: 10 }, (_, i) => `<span epub:type='pagebreak' title='${i + 1}'/><p>${ARAB} ${i}</p>`).join('') }], { q: "'" }));
  assert.deepEqual(nomor(h), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});
test('EPUB: sel tabel (syair dua syatr) tidak menempel; dd/dt/aside tidak menyatukan paragraf', () => {
  const p = paragrafDariHtml('<table><tr><td>أحمد ربي الله خير مالك</td><td>مصليا على النبي وآله</td></tr></table>');
  assert.equal(p.length, 1); assert.ok(p[0].teks.includes('مالك مصليا'));
  assert.equal(paragrafDariHtml('<dl><dt>الكلمة</dt><dd>معناها</dd></dl>').length, 2);
});
test('EPUB: href berisi persen tak sah tidak menjatuhkan impor; bab hilang dilaporkan', async () => {
  const h = await parseEpub(buatEpub([{ file: 'a%ZZ.xhtml', html: sepuluh() }]));
  assert.equal(h.halaman.length, 10); assert.equal(h.laporan.babTakTerbaca, 0);
  const rusak = buatZip({ mimetype: 'application/epub+zip', 'META-INF/container.xml': `<container><rootfiles><rootfile full-path="c.opf"/></rootfiles></container>`, 'c.opf': `<package><metadata><dc:title>T</dc:title></metadata><manifest><item id="a" href="ada.xhtml" media-type="application/xhtml+xml"/><item id="b" href="hilang.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="a"/><itemref idref="b"/></spine></package>`, 'ada.xhtml': `<body>${sepuluh()}</body>` });
  const r = await parseEpub(rusak);
  assert.equal(r.laporan.babTakTerbaca, 1); assert.ok(peringatanPratinjau(r).some((w) => /1 bab yang tercantum di EPUB tidak terbaca/.test(w.teks)));
});
test('EPUB: dokumen navigasi (properties=nav) dan bab nav tidak masuk isi', async () => {
  const h = await parseEpub(buatEpub([{ file: 'toc.xhtml', props: 'nav', html: '<nav><ol><li>فهرس الكتاب الكامل</li></ol></nav>' }, { file: 'a.xhtml', html: sepuluh() }]), { virtual: true });
  assert.ok(!h.halaman.some((p) => p.teks.includes('فهرس الكتاب')));
});
test('EPUB: catatan kaki (aside footnote/endnote, doc-footnote) dibuang dan dihitung; tautan noteref ikut hilang', async () => {
  const body = `${pb(1)}<p>نص المتن الأول <a epub:type="noteref" href="#n1">[1]</a></p><aside epub:type="footnote" id="n1"><p>1- هذا هامش الصفحة</p></aside><p>وسط المتن <a role="doc-noteref" href="#n2">٢</a></p><aside role="doc-endnote" id="n2"><p>٢- هامش ثان</p></aside>${Array.from({ length: 8 }, (_, i) => hal(i + 2)).join('')}`;
  const h = await parseEpub(buatEpub([{ file: 'a.xhtml', html: body }]));
  const t = h.halaman[0].teks;
  assert.ok(t.includes('نص المتن الأول') && t.includes('وسط المتن')); assert.ok(!t.includes('هامش') && !t.includes('[1]'));
  assert.equal(h.laporan.catatanKakiDibuang, 2);
});
test('EPUB: teks sebelum penanda halaman pertama dilaporkan, bukan hilang senyap', async () => {
  const pengantar = `<p>${'مقدمة الناشر '.repeat(40)}</p>`;
  const h = await parseEpub(buatEpub([{ file: 'a.xhtml', html: pengantar + sepuluh() }]));
  assert.ok(h.laporan.teksSebelumPenanda >= 300); assert.ok(!h.halaman.some((p) => p.teks.includes('مقدمة الناشر')));
  assert.ok(peringatanPratinjau(h).some((w) => /sebelum penanda halaman pertama/.test(w.teks)));
  const bersih = await parseEpub(buatEpub([{ file: 'a.xhtml', html: sepuluh() }])); assert.equal(bersih.laporan.teksSebelumPenanda, 0);
});
test('EPUB tanpa pagebreak: ditolak dengan tawaran halaman virtual, atau dibagi otomatis bila diminta', async () => {
  const polos = { file: 'a.xhtml', html: `<h1>كتاب</h1>${Array.from({ length: 30 }, (_, i) => `<p>${ARAB} ${ARAB} ${i}</p>`).join('')}` };
  await assert.rejects(bacaDokumenKitab({ nama: 'x.epub', buffer: buatEpub([polos]) }), (e) => e.kode === 'TANPA_PENANDA' && bolehVirtual(e));
  const v = await bacaDokumenKitab({ nama: 'x.epub', buffer: buatEpub([polos]), virtual: true });
  assert.equal(v.format, 'epub-virtual'); assert.equal(v.kitab.halamanVirtual, true); assert.ok(v.halaman.length >= 2);
});
test('EPUB: DRM dikenali; pengaburan font bukan DRM; arsip rusak, bukan ZIP, dan tanpa container memberi galat berbahasa jelas', async () => {
  const dasar = { mimetype: 'application/epub+zip', 'META-INF/container.xml': `<container><rootfiles><rootfile full-path="c.opf"/></rootfiles></container>`, 'c.opf': `<package><manifest><item id="a" href="a.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="a"/></spine></package>`, 'a.xhtml': `<body>${sepuluh()}</body>` };
  const enc = (alg) => `<encryption><EncryptedData><EncryptionMethod Algorithm="${alg}"/></EncryptedData></encryption>`;
  await assert.rejects(parseEpub(buatZip({ ...dasar, 'META-INF/encryption.xml': enc('http://www.w3.org/2001/04/xmlenc#aes128-cbc') })), (e) => e.kode === 'EPUB_DRM');
  assert.equal((await parseEpub(buatZip({ ...dasar, 'META-INF/encryption.xml': enc('http://www.idpf.org/2008/embedding') }))).halaman.length, 10);
  await assert.rejects(parseEpub(new TextEncoder().encode('bukan zip sama sekali, hanya teks biasa yang cukup panjang').buffer), (e) => e.kode === 'EPUB_RUSAK');
  await assert.rejects(parseEpub(buatZip({ mimetype: 'x', 'a.txt': 'y' })), (e) => e.kode === 'EPUB_RUSAK');
  const utuh = new Uint8Array(buatZip(dasar)); const i = Buffer.from(utuh).indexOf(Buffer.from('a.xhtml')) + 7; // rusakkan data terkompresi berkas isi
  for (let k = i; k < i + 20; k++) utuh[k] = 0xff;
  await assert.rejects(parseEpub(utuh.buffer), (e) => e.kode === 'EPUB_RUSAK' && /tidak bisa dibuka/.test(e.message));
});
test('EPUB berisi gambar saja: pesan menjelaskan jalur OCR lewat PDF', async () => {
  const zip = buatZip({ mimetype: 'application/epub+zip', 'META-INF/container.xml': `<container><rootfiles><rootfile full-path="c.opf"/></rootfiles></container>`, 'c.opf': `<package><manifest><item id="a" href="a.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="a"/></spine></package>`, 'a.xhtml': '<body><img src="p1.jpg"/></body>', 'p1.jpg': new Uint8Array([1, 2, 3]) });
  await assert.rejects(parseEpub(zip), (e) => e.kode === 'TANPA_TEKS' && /gambar halaman/.test(e.message) && /OCR/.test(e.message));
});

/* ---------- EPUB hasil pindai Internet Archive (hocr-to-epub): format nyata dari berkas unggahan pengguna ---------- */
const NOTICE = { file: 'notice.html', html: '<div><p>This book was produced in EPUB format by the Internet Archive.</p><p>Created with hocr-to-epub (v.1.0.0)</p></div>' };
const ID_ARSIP = '<dc:identifier>Access URL: http://archive.org/details/contoh-kitab</dc:identifier>';
const marker = (p) => `<b>The text on this page is estimated to be only ${p}% accurate</b>`;
const lembar = (n, persen) => ({ file: `page_${n}.html`, html: `${persen ? marker(persen) : ''}<p>${ARAB} ${n}</p>` });
const NOMOR_LEMBAR = [0, 2, 3, 4, 6, 7, 8, 10];
const epubArsip = (persen, opsi = {}) => buatEpub([NOTICE, ...NOMOR_LEMBAR.map((n, i) => lembar(n, i === 0 ? null : persen[i % persen.length])), { file: 'page_11.html', html: marker(30) }], { opfExtra: ID_ARSIP, ...opsi });

test('EPUB Internet Archive: satu berkas = satu halaman bernomor lembar pindai; notice dan baris akurasi tidak masuk teks', async () => {
  const h = await parseEpub(epubArsip([34.5, 41.2, 28.0]));
  assert.equal(h.format, 'epub-ocr'); assert.equal(h.kitab.sumber.jenis, 'epub-ocr'); assert.equal(h.kitab.penomoranSesuaiCetak, false); assert.equal(h.kitab.halamanVirtual, false);
  assert.deepEqual(nomor(h), NOMOR_LEMBAR); // lembar page_11 hanya berisi baris akurasi: kosong, dilewati
  assert.equal(h.laporan.halamanPindaiKosong, 1);
  assert.ok(h.halaman.every((p) => p.ocr === true && !/estimated to be|Internet Archive/.test(p.teks)));
  assert.equal(h.kitab.ocrHalaman, 8); assert.equal(h.kitab.sumber.rujukan, 'archive.org/details/contoh-kitab');
  assert.deepEqual(h.laporan.anomali, { duplikat: 0, mundur: 0, lompat: 0 }); // lompatan nomor karena lembar kosong bukan anomali
});
test('EPUB Internet Archive: akurasi OCR diringkas dan diperingatkan keras bila median di bawah 70%', async () => {
  const h = await parseEpub(epubArsip([34.5, 41.2, 28.0]));
  const o = h.laporan.ocrAkurasi; assert.equal(o.bertanda, 8); assert.equal(o.rendah, 8); assert.equal(o.median, 34.5); assert.equal(o.min, 28); assert.equal(o.maks, 41.2);
  const w = peringatanPratinjau(h).map((x) => x.teks);
  assert.ok(w.some((t) => /OCR otomatis Internet Archive/.test(t) && /tidak layak dijadikan rujukan/.test(t)));
  assert.ok(w.some((t) => /nomor lembar pindai di Internet Archive/.test(t)));
  const bagus = await parseEpub(epubArsip([96.5, 91.0]));
  assert.ok(!peringatanPratinjau(bagus).some((x) => /tidak layak/.test(x.teks))); assert.ok(peringatanPratinjau(bagus).some((x) => /Periksa beberapa halaman/.test(x.teks)));
});
test('EPUB berkas page_N tanpa jejak archive.org TIDAK dianggap hasil pindai Internet Archive', async () => {
  const bab = NOMOR_LEMBAR.map((n) => lembar(n, 40));
  await assert.rejects(parseEpub(buatEpub(bab)), (e) => e.kode === 'TANPA_PENANDA');
});
test('EPUB Internet Archive lolos validasi server (nomor lembar 0 diizinkan, jenis epub-ocr dikenal)', async () => {
  const { validasiHalaman, validasiKitab, JENIS_SUMBER } = await import('../src/kitabImpor.js');
  const h = await parseEpub(epubArsip([34.5]));
  assert.ok(JENIS_SUMBER.includes('epub-ocr')); for (const p of h.halaman) validasiHalaman(p, h.halaman.length);
  assert.equal(validasiKitab({ ...h.kitab, judulLatin: 'Contoh', aksara: 'arab', bahasa: 'ar' }).sumber.jenis, 'epub-ocr');
});
