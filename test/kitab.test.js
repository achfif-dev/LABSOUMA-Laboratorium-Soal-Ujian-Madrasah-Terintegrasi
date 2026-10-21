import test from 'node:test';
import assert from 'node:assert/strict';
import { parseKitabUrl, htmlToArabicText, parseTitle, fetchKitab, findByClass, stripComments, stripElements, neutralizeStrayLt, DEFAULT_HOSTS } from '../src/kitabFetch.js';

const ISI = 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ وَالصَّلَاةُ وَالسَّلَامُ عَلَى أَشْرَفِ الْمُرْسَلِينَ';
const PAGE = `<!doctype html><html><head><title>ص3 - الفواكه العذاب - تقريظ - المكتبة الشاملة.</title><script>var x="مرحبا بكم في الموقع الإلكتروني للمكتبة";</script></head>
<body><nav><a>الرئيسية</a> <a>كتب مختارة من المكتبة الشاملة</a></nav>
<div class="nass margin-top-10"><div class="inner"><p>${ISI}</p></div><p>&#1605;&#1585;&#1581;&#1576;&#1575; &#1576;&#1603;&#1605;</p><p>[1]</p></div>
<div class="hamesh"><p>حاشية من المحقق لا تدخل في النص الأصلي للكتاب أبدا</p></div>
<footer>جميع الحقوق محفوظة للمكتبة الشاملة الإلكترونية</footer></body></html>`;

const resp = (body, { status = 200, type = 'text/html; charset=utf-8', location } = {}) => ({
  status, headers: { get: (k) => ({ 'content-type': type, location }[k.toLowerCase()] ?? null) }, text: async () => body,
});

test('parseKitabUrl: izinkan domain terdaftar, tolak yang lain', () => {
  assert.equal(parseKitabUrl('https://shamela.ws/book/1/3#x', DEFAULT_HOSTS).href, 'https://shamela.ws/book/1/3');
  assert.equal(parseKitabUrl('https://www.shamela.ws/book/1/3', DEFAULT_HOSTS).hostname, 'www.shamela.ws');
  for (const bad of ['https://evil.com/shamela.ws', 'https://shamela.ws.evil.com/x', 'https://user:pw@shamela.ws/x', 'https://shamela.ws:8443/x', 'https://127.0.0.1/x', 'bukan url', 'file:///etc/passwd']) {
    assert.throws(() => parseKitabUrl(bad, DEFAULT_HOSTS), (e) => ['URL_INVALID', 'URL_NOT_ALLOWED'].includes(e.code), bad);
  }
});

test('htmlToArabicText: ambil isi .nass, buang menu, skrip, catatan kaki, footer', () => {
  const { title, teks } = htmlToArabicText(PAGE);
  assert.match(title, /^ص3/);
  assert.ok(teks.includes(ISI));
  assert.ok(teks.includes('مرحبا بكم')); // entitas numerik terdekode
  assert.ok(!teks.includes('الرئيسية'));
  assert.ok(!teks.includes('حاشية من المحقق'));
  assert.ok(!teks.includes('جميع الحقوق'));
  assert.ok(!teks.includes('[1]')); // bukan Arab
  assert.equal(findByClass('<div class="nass"><div>a</div><div>b</div></div><div>c</div>', 'nass')[0].inner, '<div>a</div><div>b</div>');
});

test('htmlToArabicText: tanpa .nass memakai cadangan (baris Arab panjang saja)', () => {
  const { teks } = htmlToArabicText(`<body><p>قائمة</p><p>${ISI}</p><p>English paragraph that is long enough to pass length</p></body>`);
  assert.equal(teks, ISI);
});

test('parseTitle', () => {
  assert.deepEqual(parseTitle('ص3 - الفواكه العذاب - تقريظ - المكتبة الشاملة.'), { hal: '3', nama: 'الفواكه العذاب' });
  assert.deepEqual(parseTitle('Judul biasa'), { hal: '', nama: '' });
});

test('fetchKitab: sukses, redirect ke domain luar ditolak, error situs', async () => {
  const ok = await fetchKitab('https://shamela.ws/book/1/3', { fetchImpl: async () => resp(PAGE) });
  assert.equal(ok.hal, '3'); assert.equal(ok.nama, 'الفواكه العذاب'); assert.equal(ok.terpotong, false); assert.ok(ok.teks.includes(ISI));

  await assert.rejects(fetchKitab('https://shamela.ws/x', { fetchImpl: async () => resp('', { status: 302, location: 'https://evil.com/steal' }) }), { code: 'URL_NOT_ALLOWED' });
  const hops = []; 
  const r = await fetchKitab('https://shamela.ws/a', { fetchImpl: async (u) => { hops.push(u); return hops.length === 1 ? resp('', { status: 301, location: '/book/1/3' }) : resp(PAGE); } });
  assert.equal(r.url, 'https://shamela.ws/book/1/3');

  await assert.rejects(fetchKitab('https://shamela.ws/x', { fetchImpl: async () => resp('x', { status: 404 }) }), { code: 'SUMBER_NOT_FOUND' });
  await assert.rejects(fetchKitab('https://shamela.ws/x', { fetchImpl: async () => resp('x', { status: 403 }) }), { code: 'SUMBER_BLOCKED' });
  await assert.rejects(fetchKitab('https://shamela.ws/x', { fetchImpl: async () => resp('%PDF', { type: 'application/pdf' }) }), { code: 'SUMBER_BUKAN_TEKS' });
  await assert.rejects(fetchKitab('https://shamela.ws/x', { fetchImpl: async () => resp('<html><body><p>English only</p></body></html>') }), { code: 'TEKS_TIDAK_DITEMUKAN' });
  await assert.rejects(fetchKitab('https://shamela.ws/x', { maxBytes: 100, fetchImpl: async () => resp(PAGE) }), { code: 'SUMBER_TOO_LARGE' });
  await assert.rejects(fetchKitab('https://shamela.ws/x', { fetchImpl: async () => { throw new Error('ECONNRESET'); } }), { code: 'SUMBER_ERROR' });
});

test('fetchKitab: teks panjang dipotong di batas baris dan ditandai', async () => {
  const long = Array.from({ length: 400 }, () => `<p>${ISI}</p>`).join('');
  const r = await fetchKitab('https://shamela.ws/x', { fetchImpl: async () => resp(`<div class="nass">${long}</div>`) });
  assert.equal(r.terpotong, true);
  assert.ok(r.teks.length <= 6000);
  assert.ok(r.teks.endsWith('الْمُرْسَلِينَ'));
});

test('fetchKitab: timeout menjadi 504', async () => {
  const slow = (u, { signal }) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(Object.assign(new Error('a'), { name: 'AbortError' }))));
  await assert.rejects(fetchKitab('https://shamela.ws/x', { timeoutMs: 20, fetchImpl: slow }), { code: 'SUMBER_TIMEOUT', status: 504 });
});

test('pembersih HTML: perilaku tetap benar (komentar, elemen bersarang, tag rusak)', () => {
  assert.equal(stripComments('a<!-- x -->b<!--y-->c'), 'abc');
  assert.equal(stripComments('a<!-- tak tertutup b'), 'a');
  assert.equal(stripElements('a<nav>x</nav>b<SCRIPT>y</script >c'), 'abc');
  assert.equal(stripElements('a<nav>tak tertutup'), 'a<nav>tak tertutup'); // tanpa penutup: dibiarkan
  assert.equal(stripElements('<nav><nav>x</nav>sisa</nav>'), 'sisa</nav>'); // sama seperti perilaku semula
  assert.equal(neutralizeStrayLt('<p>a</p> 1 < 2 <b'), '<p>a</p> 1 &lt; 2 &lt;b');
});

test('htmlToArabicText: HTML jahat 2 MB selesai cepat (waktu linear, bukan kuadratik)', () => {
  const MB = 2_000_000;
  const rep = (s) => s.repeat(Math.floor(MB / s.length));
  const jahat = ['<body>' + rep('<nav '), '<body>' + rep('<!-- '), '<body>' + rep('<title>'), '<div class=\"nass\">' + rep('<div '), rep('<div class=\"nass\">') + 'x', rep('<script>a<b ')];
  for (const html of jahat) {
    const t = Date.now();
    htmlToArabicText(html);
    assert.ok(Date.now() - t < 5000, `terlalu lambat: ${html.slice(0, 25)}`); // sebelum perbaikan: puluhan detik sampai menit
  }
});

import { normalisasiUrl, bangunUrlHalaman, __kosongkanCache } from '../src/kitabFetch.js';

test('normalisasiUrl: tambah https, rapikan tanda baca dan spasi', () => {
  assert.equal(normalisasiUrl('shamela.ws/book/823/5'), 'https://shamela.ws/book/823/5');
  assert.equal(normalisasiUrl('  "https://shamela.ws/book/823/5".  '), 'https://shamela.ws/book/823/5');
  assert.equal(normalisasiUrl('http://shamela.ws/book/1'), 'https://shamela.ws/book/1');
  assert.equal(parseKitabUrl('al-maktaba.org/book/1/2', DEFAULT_HOSTS).hostname, 'al-maktaba.org');
  assert.throws(() => parseKitabUrl('javascript:alert(1)', DEFAULT_HOSTS), (e) => e.code === 'URL_INVALID' || e.code === 'URL_NOT_ALLOWED');
  assert.throws(() => parseKitabUrl('evil.com/book/1/2', DEFAULT_HOSTS), (e) => e.code === 'URL_NOT_ALLOWED');
});

test('bangunUrlHalaman: tautan kitab + nomor halaman', () => {
  assert.equal(bangunUrlHalaman('https://shamela.ws/book/823', 5), 'https://shamela.ws/book/823/5');
  assert.equal(bangunUrlHalaman('shamela.ws/book/823/9/', '12'), 'https://shamela.ws/book/823/12');
  assert.equal(bangunUrlHalaman('https://shamela.ws/book/823', 0), null);
  assert.equal(bangunUrlHalaman('https://shamela.ws/lain', 3), null);
});

test('fetchKitab: coba ulang sekali pada galat 5xx dan memakai cache untuk halaman yang sama', async () => {
  __kosongkanCache();
  let n = 0;
  const impl = async () => { n++; return n === 1 ? resp('', { status: 503 }) : resp(PAGE); };
  const a = await fetchKitab('shamela.ws/book/9/1', { fetchImpl: impl, retryDelayMs: 1 });
  assert.ok(a.teks.includes(ISI)); assert.equal(n, 2);
  const b = await fetchKitab('https://shamela.ws/book/9/1', { fetchImpl: impl, retryDelayMs: 1 });
  assert.equal(b.dariCache, true); assert.equal(n, 2);
});

test('fetchKitab: 403 memberi petunjuk salin manual', async () => {
  __kosongkanCache();
  await assert.rejects(fetchKitab('https://shamela.ws/book/9/2', { fetchImpl: async () => resp('', { status: 403 }) }), (e) => e.code === 'SUMBER_BLOCKED' && /tab baru/.test(e.message));
});

import { beforeEach } from 'node:test';
beforeEach(() => __kosongkanCache()); // cache antar tes tidak boleh saling memengaruhi
