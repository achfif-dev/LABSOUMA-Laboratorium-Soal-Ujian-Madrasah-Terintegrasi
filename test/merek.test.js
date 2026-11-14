// Merek aplikasi: nama, logo, dan footnote kredit hanya hidup di web/lib/merek.js; index.html (layar pembuka) diisi dari sana saat build.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MEREK, terapkanMerek } from '../web/lib/merek.js';

const baca = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('footnote kredit: teks persis sesuai permintaan pemilik aplikasi', () => {
  assert.equal(MEREK.kreditLatin, 'Powered By');
  assert.equal(MEREK.kreditArab, 'أحمد عفيف الدين');
  assert.equal(MEREK.nama, 'LABSOUMA'); assert.equal(MEREK.logo, '/logo.png');
});

test('terapkanMerek mengisi semua penanda di index.html dan tidak menyisakan %MEREK_', () => {
  const h = terapkanMerek(baca('index.html'));
  assert.equal(/%MEREK_/.test(h), false);
  assert.ok(h.includes('<title>LABSOUMA · Laboratorium Soal Ujian Madrasah Terintegrasi</title>'));
  assert.ok(h.includes('Powered By')); assert.ok(h.includes('أحمد عفيف الدين')); assert.ok(h.includes('src="/logo.png"'));
  assert.ok(h.indexOf('id="pembuka"') > h.indexOf('<div id="root">')); // layar pembuka ada DI DALAM #root: React menggantinya saat siap
});

test('terapkanMerek: nilai di-escape (tidak bisa menyisipkan HTML) dan penanda dikenali', () => {
  const h = terapkanMerek('<p>%MEREK_KREDIT_LATIN%</p><i>%MEREK_NAMA%</i>', { ...MEREK, kreditLatin: 'A <b>&</b> "B"', nama: 'X' });
  assert.equal(h, '<p>A &lt;b&gt;&amp;&lt;/b&gt; &quot;B&quot;</p><i>X</i>');
});

test('satu sumber: App.jsx tidak lagi menulis footnote atau nama kredit sendiri; layar memuat dipasang di titik muat utama', () => {
  const app = ['web/App.jsx', 'web/AppUstadz.jsx', 'web/panelMalas.jsx'].map(baca).join('\n'); // App.jsx dipecah: kaki ustadz di AppUstadz.jsx, panel malas di panelMalas.jsx
  assert.equal(app.includes('Powered By'), false); assert.equal(app.includes('أحمد عفيف الدين'), false);
  assert.equal((app.match(/<KreditKaki /g) || []).length, 2); // kaki aplikasi penyusun dan aplikasi ustadz
  assert.ok(app.includes('const Spinner = <LayarMuat />;'));   // memuat sesi/profil
  assert.ok(app.includes('<React.Suspense fallback={<LayarMuat ringkas />}>')); // panel yang dimuat malas
  const mk = baca('web/Merek.jsx');
  assert.ok(mk.includes('MEREK.kreditLatin') && mk.includes('MEREK.logo') && mk.includes('MEREK.nama'));
  assert.equal(mk.includes('Powered By'), false);
  assert.ok(baca('vite.config.js').includes('terapkanMerek'));
});
