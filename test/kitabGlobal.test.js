// Indeks pencarian lintas kitab di server (src/kitabGlobal.js): pembangunan lewat aksi admin, pencarian, kitab yang belum terindeks, dan sambungan ke Tanya Kitab.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSyamilah } from '../src/syamilah.js';
import { isianAwal, jalankanImpor } from '../web/lib/imporKitab.js';
import { __setFirebaseForTest } from '../src/platform.js';
import handler from '../src/rute/kitab.js';
import { tanyaKitab } from '../src/telaahKitab.js';
import { cariLintasKitab, statusGlobal, bangunGlobal, bacaPeta, _uji } from '../src/kitabGlobal.js';
import { N_BUCKET } from '../web/lib/indeksGlobal.js';
import { fakeDb } from './_fakeDb.js';

const ZW = '\u200c\u200c';
const buku = (judul, halaman) => [`${judul}\u00a0\u00a0\u00a0(المؤلف)`, 'القسم: عام', `الكتاب: ${judul}`, 'المؤلف: المؤلف (ت 900هـ)', 'الناشر: دار', '[ترقيم الكتاب موافق للمطبوع]',
  ...halaman.flatMap((t, i) => [`${judul}(ص: ${i + 1})`, ...(i === 0 ? [`${ZW}باب`] : []), 'متن', 'ـ', t])].join('\r\n');
const ISI = {
  'k-fiqih': ['باب الزكاة نصاب البقر ثلاثون فيها تبيع وأربعون فيها مسنة', 'نصاب الإبل خمس فيها شاة وعشر فيها شاتان', 'نصاب الغنم أربعون فيها شاة وزكاة الذهب عشرون مثقالا'],
  'k-nahwu': ['الفاعل مرفوع دائما والمفعول به منصوب وهذا باب الإعراب', 'المبتدأ والخبر مرفوعان وكان وأخواتها ترفع المبتدأ', 'إن وأخواتها تنصب المبتدأ وترفع الخبر'],
  'k-akidah': ['يجب على المكلف معرفة الله بصفاته الواجبة وهي عشرون صفة', 'الإيمان بالملائكة والكتب والرسل واليوم الآخر', 'القضاء والقدر وصفات الله تعالى السمعية'],
};
const isian = (id, fan = '') => { const h = parseSyamilah(buku(`كتاب ${id}`, ISI[id])); return { ...isianAwal(h), judulLatin: id, kitabId: id, fan }; };
const mkRes = () => { const r = { h: {}, setHeader(k, v) { r.h[k] = v; }, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; };
const dasar = () => ({ 'users/u_admin': { role: 'admin', name: 'Admin' }, 'users/u_editor': { role: 'editor', name: 'Editor' } });
const dengan = async (data, fn) => {
  const db = fakeDb(data); _uji.reset();
  __setFirebaseForTest({ db, auth: { verifyIdToken: async (t) => ({ uid: t.replace('tok_', 'u_') }) }, FieldValue: {} });
  try { return await fn(db); } finally { __setFirebaseForTest(null); }
};
const panggil = (tok) => async (body) => { const r = mkRes(); await handler({ method: 'POST', headers: { authorization: `Bearer ${tok}` }, body }, r); if (r.code !== 200) throw { ...r.body.error, status: r.code }; return r.body; };
const admin = panggil('tok_admin');
const impor = (id, fan) => jalankanImpor({ panggil: admin, hasil: parseSyamilah(buku(`كتاب ${id}`, ISI[id])), isian: isian(id, fan) });
const klienRencana = (...kueri) => ({ messages: { create: async () => ({ stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'rencana_cari', input: { kueri } }] }) } });

test('sebelum dibangun: status menyatakan kitab menunggu dan pencarian lintas kitab tidak siap', async () => {
  await dengan(dasar(), async (db) => {
    await impor('k-fiqih'); await impor('k-nahwu');
    const st = await admin({ aksi: 'impor-indeks-global' });
    assert.equal(st.total, 2); assert.equal(st.terindeks, 0); assert.equal(st.ada, false); assert.deepEqual(st.menunggu.sort(), ['k-fiqih', 'k-nahwu']);
    assert.deepEqual(await cariLintasKitab(db, [['زكاة']]), { siap: false, alasan: 'belum_dibangun' });
  });
});

test('bangun lewat aksi admin: semua kitab terindeks, kitab yang tepat menempati peringkat teratas', async () => {
  await dengan(dasar(), async (db) => {
    for (const id of Object.keys(ISI)) await impor(id);
    const r = await admin({ aksi: 'impor-indeks-global', bangun: true });
    assert.equal(r.selesai, true); assert.deepEqual(r.dibangun.sort(), Object.keys(ISI).sort()); assert.equal(r.terindeks, 3); assert.ok(r.tulis > 0 && r.tulis <= N_BUCKET);
    const peta = await bacaPeta(db, { segar: true });
    assert.deepEqual(Object.values(peta.kitab).map((e) => e.status), ['siap', 'siap', 'siap']); assert.equal(peta.kunci, undefined, 'kunci dilepas');
    const zakat = await cariLintasKitab(db, [['زكاة', 'البقر']], [['نصاب']]);
    assert.equal(zakat.siap, true); assert.equal(zakat.kitab[0].id, 'k-fiqih'); assert.deepEqual(zakat.tidakTerindeks, []); assert.ok(zakat.bacaan > 0 && zakat.bacaan <= 3);
    assert.equal((await cariLintasKitab(db, [['الفاعل', 'المفعول']])).kitab[0].id, 'k-nahwu');
    assert.equal((await cariLintasKitab(db, [['الإيمان', 'الملائكة']])).kitab[0].id, 'k-akidah');
    assert.deepEqual((await cariLintasKitab(db, [['كلمهغائبه']])).kitab, [], 'kata yang tidak ada di mana pun: tak satu kitab pun');
    assert.equal((await cariLintasKitab(db, [['في']])).alasan, 'tanpa_istilah');
    const lagi = await admin({ aksi: 'impor-indeks-global', bangun: true });
    assert.equal(lagi.selesai, true); assert.deepEqual(lagi.dibangun, []); assert.equal(lagi.tulis, 0, 'tidak ada yang perlu dibangun: tidak ada penulisan');
  });
});

test('kitab yang diimpor sesudah indeks dibangun dilaporkan belum terindeks, lalu dibangun sendiri tanpa merusak yang lama', async () => {
  await dengan(dasar(), async (db) => {
    await impor('k-fiqih'); await impor('k-nahwu');
    await admin({ aksi: 'impor-indeks-global', bangun: true });
    await impor('k-akidah');
    const sebelum = await cariLintasKitab(db, [['الإيمان']]); assert.deepEqual(sebelum.tidakTerindeks, ['k-akidah']);
    assert.equal((await statusGlobal(db)).terindeks, 2);
    const r = await admin({ aksi: 'impor-indeks-global', bangun: true });
    assert.deepEqual(r.dibangun, ['k-akidah']); assert.equal(r.selesai, true);
    const sesudah = await cariLintasKitab(db, [['الإيمان']], [], {}); assert.equal(sesudah.kitab[0].id, 'k-akidah'); assert.deepEqual(sesudah.tidakTerindeks, []);
    assert.equal((await cariLintasKitab(db, [['زكاة', 'البقر']])).kitab[0].id, 'k-fiqih', 'kitab lama tetap utuh');
  });
});

test('kitab yang dinonaktifkan tidak ikut peringkat', async () => {
  await dengan(dasar(), async (db) => {
    for (const id of Object.keys(ISI)) await impor(id);
    await admin({ aksi: 'impor-indeks-global', bangun: true });
    await admin({ aksi: 'impor-aktif', kitabId: 'k-fiqih', aktif: false });
    const r = await cariLintasKitab(db, [['زكاة', 'البقر']], [], { sekarang: () => Date.now() + 20 * 60_000 });
    assert.ok(!r.kitab.some((k) => k.id === 'k-fiqih'));
  });
});

test('kunci pembangunan: panggilan kedua saat kunci masih segar dijawab sibuk; kunci kedaluwarsa tidak menghalangi', async () => {
  await dengan(dasar(), async (db) => {
    await impor('k-fiqih');
    await db.doc('cariGlobal/_peta').set({ v: 1, berikutnya: 1, kitab: {}, usang: [], kunci: { at: Date.now() } });
    const sibuk = await admin({ aksi: 'impor-indeks-global', bangun: true }); assert.equal(sibuk.sibuk, true);
    await db.doc('cariGlobal/_peta').set({ v: 1, berikutnya: 1, kitab: {}, usang: [], kunci: { at: Date.now() - 10 * 60_000 } });
    assert.equal((await admin({ aksi: 'impor-indeks-global', bangun: true })).selesai, true);
  });
});

test('hanya admin yang boleh membangun atau melihat status indeks', async () => {
  await dengan(dasar(), async () => {
    await assert.rejects(() => panggil('tok_editor')({ aksi: 'impor-indeks-global' }), (e) => e.status === 403 || e.status === 401);
    await assert.rejects(() => panggil('tok_editor')({ aksi: 'impor-indeks-global', bangun: true }), (e) => e.status === 403 || e.status === 401);
  });
});

test('bangunGlobal: kitab yang indeks per kitabnya belum jadi dilaporkan menunggu, bukan membuat pembangunan gagal', async () => {
  await dengan(dasar(), async (db) => {
    await impor('k-fiqih');
    const r = await bangunGlobal(db, { maksKitab: 3 });
    assert.equal(typeof r.selesai, 'boolean'); assert.ok(Array.isArray(r.dibangun) && Array.isArray(r.menunggu));
  });
});

/* ---------- sambungan ke Tanya Kitab ---------- */
test('Tanya Kitab otomatis: tanpa indeks semua kitab tanpa fan dicari; sesudah indeks hanya kitab yang memuat kata kuncinya', async () => {
  await dengan(dasar(), async (db) => {
    for (const id of Object.keys(ISI)) await impor(id); // fan kosong: pilihan awal tidak bisa membedakan kitab
    const pertanyaan = { pertanyaan: 'Berapa nisab zakat sapi?' };
    const dicari = []; const cari = async (id) => { dicari.push(id); return { siap: true, halaman: [] }; };
    const awal = await tanyaKitab(pertanyaan, { client: klienRencana('زكاة البقر'), cari });
    assert.deepEqual(dicari.sort(), ['k-akidah', 'k-fiqih', 'k-nahwu'], 'tanpa indeks isi: pilihan awal (semua fan belum diketahui)');
    assert.ok(!/isi perpustakaan/.test(awal.catatanKitab || ''));

    await admin({ aksi: 'impor-indeks-global', bangun: true });
    dicari.length = 0;
    const baru = await tanyaKitab(pertanyaan, { client: klienRencana('زكاة البقر'), cari });
    assert.deepEqual(dicari, ['k-fiqih'], 'indeks isi menunjuk kitab fiqih saja');
    assert.deepEqual(baru.kitabDicari.map((k) => k.id), ['k-fiqih']); assert.match(baru.catatanKitab, /seluruh isi perpustakaan: 1 dari 3 kitab aktif/);
  });
});

test('Tanya Kitab: pengguna menyebut nama kitab -> indeks isi tidak dipakai; kegagalan indeks tidak menghentikan jawaban', async () => {
  await dengan(dasar(), async (db) => {
    for (const id of Object.keys(ISI)) await impor(id);
    await admin({ aksi: 'impor-indeks-global', bangun: true });
    const dicari = []; const cari = async (id) => { dicari.push(id); return { siap: true, halaman: [] }; };
    await tanyaKitab({ pertanyaan: 'Apa kata k-akidah tentang nisab zakat sapi?' }, { client: klienRencana('زكاة البقر'), cari });
    assert.deepEqual(dicari, ['k-akidah'], 'nama kitab disebut: hanya kitab itu');
    // rusakkan bucket: pencarian lintas kitab gagal, Tanya Kitab tetap berjalan dengan pilihan awal
    for (let i = 0; i < N_BUCKET; i++) await db.doc(`cariGlobal/b${String(i).padStart(4, '0')}`).set({ v: 1, n: 1, d: '{rusak' });
    _uji.reset(); dicari.length = 0;
    const r = await tanyaKitab({ pertanyaan: 'Berapa nisab zakat sapi?' }, { client: klienRencana('زكاة البقر'), cari });
    assert.equal(r.status, 'tidak_ditemukan'); assert.deepEqual(dicari.sort(), ['k-akidah', 'k-fiqih', 'k-nahwu']);
  });
});

/* ---------- sapuan bertahap ---------- */
const semuaBucket = async (db) => Object.fromEntries((await db.collection('cariGlobal').get()).docs.filter((d) => d.id !== '_peta').map((d) => [d.id, d.data().d]));

test('sapuan bertahap: anggaran habis -> kemajuan tersimpan, kitab diabaikan pencarian sampai selesai, hasil akhir sama dengan sekali jalan', async () => {
  let sekali;
  await dengan(dasar(), async (db) => { for (const id of Object.keys(ISI)) await impor(id); await bangunGlobal(db); sekali = await semuaBucket(db); });
  assert.ok(Object.keys(sekali).length > 20, 'ada cukup banyak bucket untuk dibagi');

  await dengan(dasar(), async (db) => {
    for (const id of Object.keys(ISI)) await impor(id);
    let putaran = 0; let r; let pernahSetengah = false;
    do {
      r = await bangunGlobal(db, { anggaran: 0, konkuren: 6 }); putaran++;
      if (!r.selesai) {
        pernahSetengah = true;
        assert.ok(r.sapuan && r.sapuan.selesai > 0 && r.sapuan.selesai < r.sapuan.total, 'kemajuan sapuan dilaporkan');
        assert.equal((await cariLintasKitab(db, [['زكاة']], [], { sekarang: () => Date.now() + 99 * 60_000 })).siap, false, 'kitab yang belum selesai disapu tidak dipakai pencarian');
      }
    } while (!r.selesai && putaran < 60);
    assert.ok(pernahSetengah && putaran > 1, 'dibagi menjadi beberapa panggilan'); assert.equal(r.selesai, true);
    assert.deepEqual(await semuaBucket(db), sekali, 'isi bucket identik dengan pembangunan sekali jalan');
    const peta = await bacaPeta(db, { segar: true }); assert.equal(peta.sapuan, undefined); assert.equal(peta.kunci, undefined);
    assert.equal((await cariLintasKitab(db, [['زكاة', 'البقر']])).kitab[0].id, 'k-fiqih');
  });
});

test('sapuan bertahap: kitab dinonaktifkan di tengah jalan -> sapuan dimulai ulang dengan kitab yang tersisa dan tetap selesai', async () => {
  await dengan(dasar(), async (db) => {
    for (const id of Object.keys(ISI)) await impor(id);
    const r1 = await bangunGlobal(db, { anggaran: 0, konkuren: 6 }); assert.equal(r1.selesai, false);
    await admin({ aksi: 'impor-aktif', kitabId: 'k-nahwu', aktif: false });
    let r; let n = 0; const jam = () => Date.now() + 99 * 60_000; // ringkasan daftar kitab kedaluwarsa
    do { r = await bangunGlobal(db, { anggaran: 0, konkuren: 6, sekarang: jam }); n++; } while (!r.selesai && n < 80);
    assert.equal(r.selesai, true);
    const peta = await bacaPeta(db, { segar: true, sekarang: jam });
    assert.equal(peta.kitab['k-fiqih'].status, 'siap'); assert.equal(peta.kitab['k-akidah'].status, 'siap'); assert.equal(peta.sapuan, undefined);
  });
});
