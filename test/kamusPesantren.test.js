import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { kamus, convertText, kalibrasiOk } from '../src/pegon.js';

const berkas = readFileSync(new URL('../docs/kamus-serapan-arab-kitab-pesantren.json', import.meta.url), 'utf8');
const data = JSON.parse(berkas);

test('kamus serapan kitab pesantren: seluruh entri lolos impor (tidak ada yang dilewati) dan jumlahnya cocok dengan _meta', () => {
  const r = kamus.impor(berkas);
  assert.equal(r.lewat, 0);
  assert.equal(r.masuk, Object.keys(data.arabic).length);
  assert.equal(r.masuk, data._meta.jumlah);
  assert.ok(r.masuk >= 600);
});

test('kamus serapan kitab pesantren: layak masuk kamus bersama (bentukEntri) dan tiap kata dipegonkan persis seperti isinya', () => {
  kamus.impor(berkas);
  for (const [k, v] of Object.entries(data.arabic)) {
    assert.ok(!/[’']/.test(k), `${k}: kunci tidak boleh beraposisi apostrof (mesin membuangnya saat mencari)`);
    assert.equal(kamus.bentukEntri({ jenis: 'arab', kata: k, arab: v }).ok, true, k);
    assert.equal(convertText(k).pegon, v, k);
  }
});

test('kamus serapan kitab pesantren: tidak memakai kata Indonesia sehari-hari yang artinya lain (ayah, ahad, kutub, mani, madah, asma, sahabat)', () => {
  for (const k of ['ayah', 'ahad', 'kutub', 'mani', 'madah', 'asma', 'sahabat', 'dam', 'mal', 'umm']) assert.equal(Object.hasOwn(data.arabic, k), false, k);
  kamus.impor(berkas);
  assert.notEqual(convertText('ayah').pegon, 'آية');
});

test('kamus serapan kitab pesantren: kalibrasi mesin tetap lulus, tidak ada kunci yang sudah ada di kamus bawaan', () => {
  kamus.impor(berkas);
  assert.equal(kalibrasiOk(), true);
  const bawaan = kamus.bawaan().arab;
  for (const k of Object.keys(data.arabic)) assert.equal(Object.hasOwn(bawaan, k), false, `${k} sudah ada di kamus bawaan`);
});

test('singkatan: saw/swt dan bentuk bertitik dipegonkan sebagai kalimat penuh; yang ambigu ditandai; kata biasa (ra, as-Syafii) tidak tersentuh', () => {
  kamus.impor(berkas);
  const p = (t) => convertText(t);
  assert.equal(p('Rasulullah saw.').pegon, 'رسول الله صلى الله عليه وسلم.');
  assert.equal(p('Nabi s.a.w. bersabda').pegon.startsWith('نبي صلى الله عليه وسلم'), true);
  assert.equal(p('Allah swt').pegon, 'الله سبحانه وتعالى');
  const ra = p('Abu Bakar r.a. berkata');
  assert.ok(ra.pegon.includes('رضي الله عنه') && ra.details.some((d) => d.latin === 'r.a' && d.flagged), 'r.a. ditandai (jenis kelamin/jumlah)');
  assert.ok(p('Imam Syafii r.h. berkata').pegon.includes('رحمه الله'));
  assert.ok(p('Nabi Ibrahim a.s.').pegon.includes('عليه السلام'));
  assert.equal(p('H.R. Bukhari').pegon.startsWith('رواه '), true);
  assert.ok(p('Q.S. Al-Baqarah ayat 2').pegon.startsWith('سورة البقرة'));
  assert.equal(p('as-Syafii').pegon, 'الشافعي');
  assert.ok(!p('ra opo').pegon.includes('رضي'), '"ra" tanpa titik adalah kata Jawa, bukan radhiyallahu');
  assert.ok(!p('kata a.b.c').pegon.includes('عليه'), 'rangkaian huruf-titik lain tidak diubah');
});

test('majemuk bertanda hubung dan kunci beraposisi: ahlus-sunnah, bish-shawab, a\u2019lam vs alam, ma\u2019na vs mana', () => {
  kamus.impor(berkas);
  assert.equal(convertText('ahlus-sunnah').pegon, 'أهل السنة');
  assert.equal(convertText('wallahu a\u2019lam bish-shawab').pegon, 'والله أعلم بالصواب');
  assert.equal(convertText("a'lam").pegon, 'أعلم');
  assert.notEqual(convertText('alam').pegon, 'أعلم');
  assert.equal(convertText("ma'na").pegon, 'معنى');
  assert.notEqual(convertText('mana').pegon, 'معنى');
  assert.equal(convertText('masing-masing').pegon, 'ماسيڠ-ماسيڠ', 'reduplikasi biasa tetap');
});

test('kamus 1.2: nama surah, doa/naht, dan ejaan KBBI terbaca sebagai serapan Arab', () => {
  kamus.impor(berkas);
  const arab = (t) => convertText(t).pegon;
  assert.equal(arab('Al-Baqarah'), 'البقرة');
  assert.equal(arab('Ar-Rahman'), 'الرحمن');
  assert.equal(arab('basmalah'), 'بسملة');
  assert.equal(arab('hauqalah'), 'حوقلة');
  assert.equal(arab('assalamualaikum warahmatullahi wabarakatuh'), 'السلام عليكم ورحمة الله وبركاته');
  assert.equal(arab('sallallahu alaihi wasallam'), 'صلى الله عليه وسلم');
  assert.equal(arab('insyaallah'), 'إن شاء الله');
  assert.equal(arab('ijmak'), 'إجماع');
  assert.equal(arab('wudu'), 'وضوء');
  for (const k of ['raja', 'dam', 'mani', 'sunan', 'ahad', 'rami', 'wasi', 'muhrim']) assert.equal(Object.hasOwn(data.arabic, k), false, `${k}: kata Indonesia sehari-hari yang artinya lain`);
  for (const [k, v] of Object.entries(data.arabic)) assert.ok(v.length > 0 && !v.startsWith(' '), k);
});
