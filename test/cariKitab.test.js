// Pencarian teks kitab: normalisasi Arab, pencocokan, penyorotan di teks berharakat, indeks potongan, dan aksi server `perpus-cari`.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalCari, siapkanKueri, cocokkanHalaman, cuplikan, cariDiHalaman, bangunPotongan, halamanDariPotongan, regexSorot, potongSorot, potongCuplikan,
  GRUP_HALAMAN, MAKS_KATA_KUERI, VERSI_INDEKS,
} from '../web/lib/cariKitab.js';
import { aksiCari, kosongkanSimpananCari } from '../src/kitabCari.js';
import { jalankanImpor, isianAwal } from '../web/lib/imporKitab.js';
import { parseSyamilah } from '../src/syamilah.js';
import { __setFirebaseForTest } from '../src/platform.js';
import handler from '../api/kitab.js';
import { fakeDb } from './_fakeDb.js';

/* ---------- Normalisasi dan pencocokan ---------- */
test('normalCari: harakat, tatwil, varian alif/ya/ta marbutah, tanda baca, dan angka Arab disatukan', () => {
  assert.equal(normalCari('الصَّلَاةُ'), normalCari('الصلاه'));
  assert.equal(normalCari('أَحْمَد'), normalCari('احمد'));
  assert.equal(normalCari('إِلَى'), normalCari('الي'));
  assert.equal(normalCari('مُؤْمِن'), normalCari('مومن'));
  assert.equal(normalCari('المـــسـاجد'), 'المساجد');
  assert.equal(normalCari('قال: النووي، رحمه الله.'), 'قال النووي رحمه الله');
  assert.equal(normalCari('ص ١٢٣'), 'ص 123');
  assert.equal(normalCari('ﷲ'), 'الله'); // bentuk presentasi
  assert.equal(normalCari(null), ''); assert.equal(normalCari('... ،،'), '');
});
test('siapkanKueri: dibatasi jumlah kata, kosong bila tanpa huruf', () => {
  assert.deepEqual(siapkanKueri(' الصَّلَاةُ  والزكاة '), { q: 'الصلاه والزكاه', kata: ['الصلاه', 'والزكاه'] });
  assert.equal(siapkanKueri('!!! ؟؟').q, '');
  assert.equal(siapkanKueri('ا ب ج د ه و ز ح ط ي').kata.length, MAKS_KATA_KUERI);
});
test('cocokkanHalaman: frasa menuntut urutan, kata menuntut semuanya; substring menangkap awalan Arab', () => {
  const t = normalCari('باب الصلاة: الصلاة عماد الدين وبالكتاب والسنة');
  const k = (s) => siapkanKueri(s);
  assert.equal(cocokkanHalaman(t, k('الصلاة'), 'frasa').jumlah, 2);
  assert.ok(cocokkanHalaman(t, k('عماد الدين'), 'frasa'));
  assert.equal(cocokkanHalaman(t, k('الدين عماد'), 'frasa'), null);
  assert.ok(cocokkanHalaman(t, k('الدين عماد'), 'kata'));
  assert.equal(cocokkanHalaman(t, k('الدين زكاة'), 'kata'), null);
  assert.ok(cocokkanHalaman(t, k('كتاب'), 'frasa')); // "وبالكتاب"
  assert.equal(cocokkanHalaman('', k('كتاب')), null);
});
test('cuplikan: memotong di batas kata dan mencatat posisi kecocokan', () => {
  const t = normalCari('كلمة '.repeat(40) + 'المطلوب ' + 'كلمة '.repeat(40));
  const c = cuplikan(t, t.indexOf('المطلوب'), 7, 20);
  assert.equal(c.teks.slice(c.mulai, c.mulai + c.panjang), 'المطلوب');
  assert.ok(c.awalTerpotong && c.akhirTerpotong && c.teks.length < 80);
  assert.ok(!c.teks.startsWith(' ') && !c.teks.endsWith(' '));
});
test('cariDiHalaman: urut menurut seq, membuang seq kembar, paginasi dengan lewati', () => {
  const hal = []; for (let i = 1; i <= 120; i++) hal.push({ s: i, h: i + 10, j: 1, t: normalCari(i % 2 ? `halaman ${i} memuat zakat` : `halaman ${i}`) });
  hal.push({ ...hal[0] }); // dobel dari potongan yang tumpang tindih
  const r = cariDiHalaman(hal.reverse(), siapkanKueri('زكاة'), { batas: 50 });
  assert.equal(r.total, 0);
  const r2 = cariDiHalaman(hal, siapkanKueri('zakat'), { batas: 50 });
  assert.equal(r2.total, 60); assert.equal(r2.hasil.length, 50); assert.equal(r2.adaLagi, true);
  assert.deepEqual(r2.hasil.slice(0, 3).map((x) => x.seq), [1, 3, 5]);
  assert.equal(r2.hasil[0].hal, 11);
  const r3 = cariDiHalaman(hal, siapkanKueri('zakat'), { lewati: 50, batas: 50 });
  assert.equal(r3.hasil.length, 10); assert.equal(r3.adaLagi, false);
});

/* ---------- Penyorotan di teks asli ---------- */
test('regexSorot: menemukan kata di teks berharakat dan dengan varian huruf', () => {
  const asli = 'قَالَ النَّوَوِيُّ: الصَّلَاةُ عِمَادُ الدِّينِ، وَأَحْمَدُ رَوَاهُ.';
  const bagian = (kueri, mode) => potongSorot(asli, regexSorot(siapkanKueri(kueri).kata, mode)).filter((x) => x.m).map((x) => x.t);
  assert.deepEqual(bagian('الصلاه', 'frasa'), ['الصَّلَاةُ']);
  assert.deepEqual(bagian('احمد', 'frasa'), ['أَحْمَدُ']); // alif berhamzah cocok dengan ا
  assert.deepEqual(bagian('عماد الدين', 'frasa'), ['عِمَادُ الدِّينِ']);                              // dua kata, berspasi
  assert.deepEqual(bagian('النووي الصلاه', 'frasa'), ['النَّوَوِيُّ: الصَّلَاةُ']);                    // tanda baca di antara kata tidak menghalangi
  assert.equal(bagian('الدين عماد', 'frasa').length, 0);
  assert.deepEqual(bagian('الدين عماد', 'kata'), ['عِمَادُ', 'الدِّينِ']);
});
test('regexSorot/potongSorot: aman untuk masukan kosong dan tidak berputar pada kecocokan kosong', () => {
  assert.equal(regexSorot([], 'frasa'), null);
  assert.deepEqual(potongSorot('abc', null), [{ t: 'abc', m: false }]);
  assert.deepEqual(potongSorot('', regexSorot(['ا'])), [{ t: '', m: false }]);
  assert.equal(potongSorot('ا'.repeat(1000), regexSorot(['ا'])).filter((x) => x.m).length, 400); // batas sorotan
  assert.deepEqual(potongSorot('x a.b*(c y', regexSorot(siapkanKueri('a.b*(c').kata, 'frasa')).filter((x) => x.m).map((x) => x.t), ['a.b*(c']); // karakter regex dinetralkan oleh normalisasi; frasa = satu rentang
});
test('potongCuplikan: mode kata menyorot semua kata di cuplikan', () => {
  const t = normalCari('الصلاة عماد الدين والزكاة');
  const p = potongCuplikan({ teks: t, mulai: 0, panjang: 6 }, ['الصلاه', 'الدين'], 'kata');
  assert.deepEqual(p.filter((x) => x.m).map((x) => x.t), ['الصلاه', 'الدين']);
  assert.equal(p.map((x) => x.t).join(''), t);
});

/* ---------- Indeks potongan ---------- */
const hal = (n, teks = (i) => `نص الصفحة رقم ${i}`) => Array.from({ length: n }, (_, i) => ({ seq: i + 1, hal: i + 5, juz: 1, teks: teks(i + 1) }));
test('bangunPotongan: sejajar grup 100 halaman, id deterministik, dipecah menurut ukuran', () => {
  const a = bangunPotongan(hal(250));
  assert.deepEqual(a.map((p) => p.id), ['c00001', 'c00101', 'c00201']);
  assert.deepEqual(a.map((p) => [p.data.dari, p.data.sampai]), [[1, 100], [101, 200], [201, 250]]);
  assert.deepEqual(bangunPotongan(hal(250)), a, 'masukan sama -> keluaran sama');
  const b = bangunPotongan(hal(10, () => 'ا'.repeat(100)), 350);
  assert.deepEqual(b.map((p) => p.id), ['c00001', 'c00004', 'c00007', 'c00010']);
  assert.ok(b.every((p) => p.data.t.join('').length <= 350));
  assert.deepEqual(b.flatMap((p) => p.data.s), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});
test('halamanDariPotongan: melewati dokumen rusak', () => {
  assert.deepEqual(halamanDariPotongan({ s: [1, 2], t: ['a'] }), []);
  assert.deepEqual(halamanDariPotongan(null), []);
  assert.deepEqual(halamanDariPotongan({ s: [7], h: [3], j: [2], t: ['x'] }), [{ s: 7, h: 3, j: 2, t: 'x' }]);
});

/* ---------- Server ---------- */
const mkFirebase = (data) => {
  const db = fakeDb(data); const role = { tok_admin: 'admin', tok_editor: 'editor' };
  return { db, auth: { verifyIdToken: async (t) => { if (!role[t]) throw new Error('bad'); return { uid: t.replace('tok_', 'u_') }; } }, FieldValue: {} };
};
const mkRes = () => { const r = { h: {}, setHeader(k, v) { r.h[k] = v; }, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; };
const dasar = () => ({ 'users/u_admin': { role: 'admin', name: 'Admin' }, 'users/u_editor': { role: 'editor', name: 'Editor' } });
const panggil = (token) => async (body) => {
  const r = mkRes(); await handler({ method: 'POST', headers: { authorization: 'Bearer ' + token }, body }, r);
  if (r.code !== 200) throw { ...r.body.error, status: r.code };
  return r.body;
};
const dengan = async (data, fn) => { kosongkanSimpananCari(); const fb = mkFirebase(data); __setFirebaseForTest(fb); try { return await fn(fb.db); } finally { __setFirebaseForTest(null); } };
const kitabLama = (n, teks = (i) => `باب الزكاة ${i} ${i % 3 === 0 ? 'الصَّلَاةُ عِمَادُ الدِّينِ' : 'نص عادي'}`) => {
  const d = { ...dasar(), 'kitab/lama': { judul: 'كتاب', judulLatin: 'Lama', aktif: true, status: 'siap', jumlahHalaman: n, revisi: 1, bentukMatn: 'tanpa-pemisah' } };
  for (let i = 1; i <= n; i++) d[`kitab/lama/halaman/p${String(i).padStart(5, '0')}`] = { seq: i, juz: 1, hal: i + 3, teks: teks(i), batasMatn: null };
  return d;
};

test('impor baru menulis indeks bersama halaman, lalu perpus-cari menjawab tanpa membangun ulang', async () => {
  const J = 'فتح المعين';
  const isi = [`${J}   (المعبري)`, 'الكتاب: ' + J]; for (let i = 1; i <= 5; i++) isi.push(`${J}(ص: ${i})`, 'متن', 'ـ', i === 4 ? 'فصل في الصَّلَاةِ والزكاة' : `نص الصفحة ${i}`);
  const hasil = parseSyamilah(isi.join('\n'));
  await dengan(dasar(), async (db) => {
    await jalankanImpor({ panggil: panggil('tok_admin'), hasil, isian: { ...isianAwal(hasil), judulLatin: 'Fathul', kitabId: 'fathul' } });
    assert.ok(Object.keys(db.data).some((p) => /^kitab\/fathul\/cari\/c\d{5}$/.test(p)), 'potongan tertulis');
    assert.deepEqual(db.data['kitab/fathul/cari/meta'], { versi: VERSI_INDEKS, revisi: 1, status: 'siap', halaman: 5 });
    const r = await panggil('tok_editor')({ aksi: 'perpus-cari', kitabId: 'fathul', q: 'الصلاة' });
    assert.equal(r.siap, true); assert.equal(r.total, 1);
    assert.equal(r.hasil[0].seq, 4); assert.equal(r.hasil[0].hal, 4);
    assert.match(r.hasil[0].teks, /الصلاه/);
    assert.equal((await panggil('tok_editor')({ aksi: 'perpus-cari', kitabId: 'fathul', q: 'nihil' })).total, 0);
  });
});
test('impor ulang (timpa) membuang indeks lama dan mengganti isinya', async () => {
  const buat = (kata) => parseSyamilah(['T(X)', 'الكتاب: T', 'T(ص: 1)', 'متن', 'ـ', kata, 'T(ص: 2)', 'متن', 'ـ', 'صفحة'].join('\n'));
  await dengan(dasar(), async (db) => {
    const imp = (hasil, timpa) => jalankanImpor({ panggil: panggil('tok_admin'), hasil, isian: { ...isianAwal(hasil), judulLatin: 'T', kitabId: 'tt', timpa } });
    await imp(buat('البيع'), false);
    assert.equal((await panggil('tok_editor')({ aksi: 'perpus-cari', kitabId: 'tt', q: 'البيع' })).total, 1);
    await imp(buat('الإجارة'), true);
    assert.equal(db.data['kitab/tt/cari/meta'].revisi, 2);
    assert.equal((await panggil('tok_editor')({ aksi: 'perpus-cari', kitabId: 'tt', q: 'البيع' })).total, 0, 'isi lama tidak tersisa, juga di memori');
    assert.equal((await panggil('tok_editor')({ aksi: 'perpus-cari', kitabId: 'tt', q: 'الاجاره' })).total, 1);
  });
});
test('kitab lama tanpa indeks: dibangun bertahap, lalu siap, dan hasilnya benar', async () => {
  const data = kitabLama(250);
  await dengan(data, async (db) => {
    let r = await aksiCari({ q: 'الصلاة' }, 'lama', data['kitab/lama'], { anggaran: 0 });
    assert.deepEqual(r, { siap: false, kemajuan: { selesai: 1, total: 3 } });
    r = await aksiCari({ q: 'الصلاة' }, 'lama', data['kitab/lama'], { anggaran: 0 });
    assert.deepEqual(r.kemajuan, { selesai: 2, total: 3 });
    r = await aksiCari({ q: 'الصلاة' }, 'lama', data['kitab/lama'], { anggaran: 0 });
    assert.equal(r.siap, true); assert.equal(r.total, 83); // 3, 6, ..., 249
    assert.equal(r.hasil.length, 50); assert.equal(r.adaLagi, true); assert.deepEqual(r.hasil.slice(0, 2).map((x) => x.seq), [3, 6]);
    assert.equal(db.data['kitab/lama/cari/meta'].status, 'siap');
    r = await aksiCari({ q: 'الصلاة', lewati: 50 }, 'lama', data['kitab/lama']);
    assert.equal(r.hasil.length, 33); assert.equal(r.adaLagi, false);
  });
});
test('kitab lama: dengan anggaran waktu normal, kitab kecil langsung siap dalam satu panggilan', async () => {
  const data = kitabLama(30);
  await dengan(data, async () => {
    const r = await aksiCari({ q: 'الزكاة 7' }, 'lama', data['kitab/lama']);
    assert.equal(r.siap, true); assert.equal(r.total, 1); assert.equal(r.hasil[0].seq, 7);
    assert.equal((await aksiCari({ q: 'عماد الدين', mode: 'frasa' }, 'lama', data['kitab/lama'])).total, 10);
    assert.equal((await aksiCari({ q: 'الدين عماد', mode: 'frasa' }, 'lama', data['kitab/lama'])).total, 0);
    assert.equal((await aksiCari({ q: 'الدين عماد', mode: 'kata' }, 'lama', data['kitab/lama'])).total, 10);
  });
});
test('indeks usang (revisi berbeda) dibangun ulang tanpa halaman ganda', async () => {
  const data = kitabLama(10);
  data['kitab/lama/cari/meta'] = { versi: VERSI_INDEKS, revisi: 0, status: 'siap', halaman: 10 };
  data['kitab/lama/cari/c00001'] = { dari: 1, sampai: 1, s: [1], h: [1], j: [1], t: ['sisa lama yang usang'], revisi: 0 };
  await dengan(data, async (db) => {
    const r = await aksiCari({ q: 'usang' }, 'lama', data['kitab/lama']);
    assert.equal(r.siap, true); assert.equal(r.total, 0);
    assert.ok(!JSON.stringify(db.data['kitab/lama/cari/c00001']).includes('usang'));
  });
});
test('perpus-cari: validasi masukan, kitab nonaktif, dan peran', async () => {
  const data = kitabLama(5);
  await dengan(data, async () => {
    const cari = (b) => panggil('tok_editor')({ aksi: 'perpus-cari', kitabId: 'lama', ...b });
    await assert.rejects(cari({ q: '' }), (e) => e.code === 'CARI_KOSONG');
    await assert.rejects(cari({ q: '،،،' }), (e) => e.code === 'CARI_KOSONG');
    await assert.rejects(cari({}), (e) => e.code === 'PERPUS_INVALID');
    await assert.rejects(cari({ q: 'x', mode: 'regex' }), (e) => e.code === 'PERPUS_INVALID');
    await assert.rejects(cari({ q: 'x', lewati: -1 }), (e) => e.code === 'PERPUS_INVALID');
    await assert.rejects(cari({ q: 'x', lewati: '5' }), (e) => e.code === 'PERPUS_INVALID');
    await assert.rejects(cari({ q: 'x', kitabId: 'tidak-ada' }), (e) => e.code === 'KITAB_TIDAK_ADA');
    await assert.rejects(panggil('tok_salah')({ aksi: 'perpus-cari', kitabId: 'lama', q: 'x' }), (e) => e.status === 401);
    data['kitab/lama'].aktif = false;
    await assert.rejects(cari({ q: 'نص' }), (e) => e.code === 'KITAB_TIDAK_ADA');
  });
});
test('GRUP_HALAMAN sama dengan batas halaman per panggilan impor (potongan sejajar dengan batch)', async () => {
  const { MAKS_HALAMAN_PER_PANGGILAN } = await import('../src/kitabImpor.js');
  assert.equal(GRUP_HALAMAN, MAKS_HALAMAN_PER_PANGGILAN);
});
