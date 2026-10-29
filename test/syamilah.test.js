import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSyamilah, parseKepala, ErrorSyamilah, ambilTeks } from '../src/syamilah.js';

const J = 'فتح المعين بشرح قرة العين بمهمات الدين';
const KEPALA = [
  `${J}\u00a0\u00a0\u00a0(زين الدين المعبري)`, 'القسم: الفقه الشافعي', '',
  `الكتاب: ${J}`, 'المؤلف: زين الدين أحمد المعبري (ت 987هـ)', 'بعناية: فلان [ت 1438 هـ]', 'الناشر: دار بن حزم', 'الطبعة: الأولى',
  'عدد الأجزاء: 1', '[ترقيم الكتاب موافق للمطبوع]', 'تاريخ النشر بالشاملة: 8 ذو الحجة 1431',
];
const ZW = '\u200c\u200c';
const buat = (...hal) => [...KEPALA, ...hal.flatMap(([n, ...isi]) => [`${J}(ص: ${n})`, ...isi])].join('\r\n');

test('kepala: judul, pengarang, wafat, muhaqqiq, penomoran', () => {
  const k = parseKepala(KEPALA);
  assert.equal(k.judul, J);
  assert.equal(k.fan, 'الفقه الشافعي');
  assert.equal(k.wafatH, 987);
  assert.equal(k.muhaqqiq, 'فلان [ت 1438 هـ]');
  assert.equal(k.jumlahJuz, 1);
  assert.equal(k.penomoranSesuaiCetak, true);
});

test('halaman dipecah per penanda; kunci = urutan, bukan nomor cetak (nomor kembar tidak bertabrakan)', () => {
  const h = parseSyamilah(buat([91, 'نص أول'], [91, 'نص ثان'], [239, 'نص ثالث'], [333, 'نص رابع']));
  assert.equal(h.halaman.length, 4);
  assert.deepEqual(h.halaman.map((x) => x.id), ['p00001', 'p00002', 'p00003', 'p00004']);
  assert.equal(new Set(h.halaman.map((x) => x.id)).size, 4);
  assert.deepEqual(h.halaman.map((x) => x.nomorAnomali ?? null), [null, 'duplikat', 'lompat', 'lompat']);
  assert.equal(h.laporan.anomali.duplikat, 1);
  assert.equal(h.halaman[1].hal, 91);
});

test('nomor mundur ditandai; angka Arab-Hindi dibaca', () => {
  const h = parseSyamilah(buat(['٥٣٤', 'أ'], ['٥٢٣', 'ب'], ['٥٣٤', 'ج']));
  assert.deepEqual(h.halaman.map((x) => x.hal), [534, 523, 534]);
  assert.equal(h.halaman[1].nomorAnomali, 'mundur');
});

test('"(ص: N)" di akhir kalimat isi bukan penanda (awalan harus sama dengan penanda pertama)', () => {
  const h = parseSyamilah(buat([1, 'قال في الكتاب (ص: 5)', 'تتمة'], [2, 'نص']));
  assert.equal(h.halaman.length, 2);
  assert.match(h.halaman[0].teks, /\(ص: 5\)/);
});

test('pemisah tatwil: matn di atas, syarah di bawah, batasMatn menunjuk batasnya', () => {
  const h = parseSyamilah(buat([130, '', 'وكره فيها التفات', 'ـ', 'فمتى عدل عن رتبة', 'ويسن أن لا يجعل']));
  const p = h.halaman[0];
  assert.equal(p.batasMatn, 'وكره فيها التفات'.length);
  assert.equal(p.teks.slice(0, p.batasMatn), 'وكره فيها التفات');
  assert.equal(p.teks.slice(p.batasMatn).trim().split('\n')[0], 'فمتى عدل عن رتبة');
  assert.equal(h.kitab.bentukMatn, 'pemisah-tatwil');
});

test('halaman tanpa pemisah: batasMatn null dan dilaporkan', () => {
  const h = parseSyamilah(buat([1, 'ـ', 'أ'], [2, 'ب'], [3, 'ج']));
  assert.equal(h.halaman[1].batasMatn, null);
  assert.equal(h.laporan.halamanTanpaPemisah, 2);
  assert.equal(h.kitab.bentukMatn, 'tanpa-pemisah');
});

test('judul: berawalan "•"+ZWNJ selalu judul; hanya-ZWNJ harus berawalan kata kunci; butir bernomor bukan judul', () => {
  const h = parseSyamilah(buat(
    [10, `${ZW}باب الصلاة`, `${ZW}فصل في شروط الصلاة.`, `${ZW}1- أحدها: ماء مطلق فلا يرفع الحدث`, `•${ZW} السواك`, 'نص'],
    [11, `${ZW}(8) ومنقلة تنقل العظم`, 'نص آخر'],
  ));
  assert.deepEqual(h.daftarIsi.map((x) => [x.judul, x.level, x.hal]), [['باب الصلاة', 2, 10], ['فصل في شروط الصلاة.', 3, 10], ['السواك', 4, 10]]);
  assert.match(h.halaman[0].teks, /1- أحدها: ماء مطلق/); // butir tetap di teks, tanpa ZWNJ
  assert.ok(!h.halaman[0].teks.includes('\u200c'));
  assert.match(h.halaman[1].teks, /\(8\) ومنقلة/);
  assert.equal(h.halaman[1].bab, 'فصل في شروط الصلاة.'); // bab aktif dibawa ke halaman berikutnya
  assert.ok(!h.halaman[0].teks.includes('باب الصلاة'));
});

test('catatan kaki tahqiq di akhir halaman dibuang beserta penanda sisipannya (gaya "1 ..." dan "(1) ...")', () => {
  const a = parseSyamilah(buat([91, 'ـ', 'واعلم أيضا1 أنه يشترط', 'نص بعدها', '', '1 في نسخة: واعلم أنه', '']));
  assert.equal(a.laporan.catatanKakiDibuang, 1);
  assert.ok(!a.halaman[0].teks.includes('في نسخة'));
  assert.ok(!/أيضا1/.test(a.halaman[0].teks));
  assert.match(a.halaman[0].teks, /واعلم أيضا أنه يشترط/);
  const b = parseSyamilah(buat([80, 'هو «اللهم اهدني» (1) إلخ.', 'تتمة', '', '(1) وأكمله كما روي عن الحسن', '']));
  assert.equal(b.laporan.catatanKakiDibuang, 1);
  assert.ok(!b.halaman[0].teks.includes('وأكمله'));
  assert.ok(!b.halaman[0].teks.includes('(1)'));
});

test('blok akhir yang tidak dimulai nomor 1 (mis. daftar isi sharh) TIDAK dibuang', () => {
  const h = parseSyamilah(buat([5, 'سبعة أنواع', '', '(2) ودامية تدميه', '(3) وباضعة تقطع اللحم']));
  assert.equal(h.laporan.catatanKakiDibuang, 0);
  assert.match(h.halaman[0].teks, /ودامية/);
});

test('rujukan takhrij muhaqqiq "[X رقم: N]" dibuang; harakat/teks pengarang tetap', () => {
  const h = parseSyamilah(buat([1, 'لخبر: "إنما الأعمال بالنيات". [البخاري رقم: 1 مسلم رقم: 1907] وقال', 'سطر']));
  assert.equal(h.laporan.rujukanDibuang, 1);
  assert.ok(!h.halaman[0].teks.includes('رقم'));
  assert.match(h.halaman[0].teks, /إنما الأعمال بالنيات/);
});

test('baris pengisi matn terpotong (titik-titik, nol, …, * * *) dibuang', () => {
  const h = parseSyamilah(buat([1, '. . . . . .', 'ـ', '…', '0000000', 'نص asli', '* * *']));
  assert.equal(h.halaman[0].teks, 'نص asli');
});

test('NBSP -> spasi, \\r\\n ditangani, BOM dibuang', () => {
  const h = parseSyamilah('\ufeff' + buat([1, 'كلمة\u00a0كلمة']));
  assert.equal(h.halaman[0].teks, 'كلمة كلمة');
});

test('metadata kitab, laporan ukuran, berharakat', () => {
  const h = parseSyamilah(buat([1, 'قَالَ الشَّيْخُ'], [2, 'نص']), { kitabId: 'fathul-muin', judulLatin: "Fathul Mu'in" });
  assert.equal(h.kitab.id, 'fathul-muin');
  assert.equal(h.kitab.judulLatin, "Fathul Mu'in");
  assert.equal(h.kitab.wafatH, 987);
  assert.equal(h.kitab.hakCipta.status, 'belum-dicek');
  assert.match(h.kitab.hakCipta.catatan, /muhaqqiq/);
  assert.equal(h.laporan.jumlahHalaman, 2);
  assert.ok(h.laporan.ukuranBytes > 0);
  assert.equal(ambilTeks(h, 2), 'نص');
});

test('tanpa penanda halaman -> ErrorSyamilah TANPA_PENANDA (tidak menebak)', () => {
  assert.throws(() => parseSyamilah('نص عربي بلا penanda'), (e) => e instanceof ErrorSyamilah && e.kode === 'TANPA_PENANDA');
  assert.throws(() => parseSyamilah(''), ErrorSyamilah);
});
