// Pemilih kitab otomatis Tanya Kitab: bagian murni (web/lib/pilihKitab.js) dan sambungannya ke server (tanyaKitab tanpa kitabIds).
import test from 'node:test';
import assert from 'node:assert/strict';
import { pilihKitabOtomatis, kodeFanKitab, sebutKitab, catatanPilihan } from '../web/lib/pilihKitab.js';
import { MAKS_KITAB_OTOMATIS, MAKS_KITAB_TANYA } from '../web/lib/telaahKitab.js';
import { tanyaKitab } from '../src/telaahKitab.js';
import { __setFirebaseForTest } from '../src/platform.js';
import { fakeDb } from './_fakeDb.js';

const K = (id, judulLatin, fan = '', judul = '') => ({ id, judulLatin, judul, fan });
const PERPUS = [
  K('ajurrumiyyah', 'Al-Ajurrumiyyah', 'Nahwu', 'الآجرومية'),
  K('fathul-muin', "Fathul Mu'in", 'Fiqih', 'فتح المعين'),
  K('fathul-qarib', 'Fathul Qarib', 'Fiqih Ibadah', 'فتح القريب'),
  K('jawahirul', 'Jawahirul Kalamiyyah', 'Akidah'),
  K('kifayatul', 'Kifayatul Akhyar', ''),
  K('waraqat', 'Al-Waraqat', 'Ushul Fiqih'),
];

test('batas otomatis lebih longgar dari pilihan manual, dan pilihan manual tetap 4', () => {
  assert.equal(MAKS_KITAB_OTOMATIS, 6); assert.equal(MAKS_KITAB_TANYA, 4);
});

test('kodeFanKitab: kata khas menang atas "fiqih" umum; "Ushul Fiqih" bukan fiqih ibadah', () => {
  assert.deepEqual([...kodeFanKitab('Fiqih Ibadah')], [['fiqh_ibadah', 10]]);
  assert.equal(kodeFanKitab('Fiqih').get('fiqh_ibadah'), 6); assert.equal(kodeFanKitab('Fiqih').get('faraidh'), 6);
  assert.deepEqual([...kodeFanKitab('Ushul Fiqih')], [['ushul', 10]]);
  assert.equal(kodeFanKitab('').size, 0); assert.equal(kodeFanKitab('Lain-lain').size, 0);
  assert.ok(kodeFanKitab('نحو وصرف').has('nahwu'));
});

test('sebutKitab: nama utuh (Latin tanpa spasi/apostrof, atau Arab) kuat; kata khas pertama lemah; tanpa nama kosong', () => {
  assert.equal(sebutKitab(PERPUS[1], "bagaimana menurut fathul muin tentang zakat"), 'kuat');
  assert.equal(sebutKitab(PERPUS[1], "Fathul Mu'in bab zakat"), 'kuat');
  assert.equal(sebutKitab(PERPUS[1], 'ما قال فتح المعين في الزكاة'), 'kuat');
  assert.equal(sebutKitab(PERPUS[1], 'apa kata fathul tentang zakat'), 'lemah');
  assert.equal(sebutKitab(PERPUS[1], 'berapa nisab zakat sapi'), '');
});

test('pilihKitabOtomatis: nama kitab disebut -> hanya kitab itu', () => {
  const r = pilihKitabOtomatis(PERPUS, 'Apa kata Kifayatul Akhyar tentang zakat sapi?');
  assert.deepEqual(r.ids, ['kifayatul']); assert.equal(r.dasar, 'nama');
});

test('pilihKitabOtomatis: bidang ilmu pertanyaan memilih kitab sefan, kitab tanpa fan ikut sebagai pelengkap, kitab lain tidak', () => {
  const r = pilihKitabOtomatis(PERPUS, 'Berapa nisab zakat sapi?');
  assert.equal(r.dasar, 'fan'); assert.ok(r.fan.startsWith('fiqh'));
  assert.ok(r.ids.includes('fathul-qarib') && r.ids.includes('fathul-muin'), 'fiqih ikut');
  assert.ok(!r.ids.includes('ajurrumiyyah') && !r.ids.includes('jawahirul') && !r.ids.includes('waraqat'), 'nahwu, akidah, dan ushul tidak ikut');
  assert.ok(r.ids.includes('kifayatul'), 'fan kosong = belum diketahui, tetap ikut');
  assert.equal(r.ids[0], 'fathul-qarib', 'fan khas (10) di atas fiqih umum (6)');
});

test('pilihKitabOtomatis: tanpa isyarat -> urutan abjad (dinyatakan), tidak ada kitab sefan -> dinyatakan', () => {
  const tanpa = pilihKitabOtomatis(PERPUS, 'tolong jelaskan');
  assert.equal(tanpa.dasar, 'tanpa_isyarat'); assert.deepEqual(tanpa.ids, PERPUS.map((k) => k.id));
  const banyak = Array.from({ length: 10 }, (_, i) => K('k' + i, 'Kitab ' + i));
  assert.equal(pilihKitabOtomatis(banyak, 'tolong jelaskan').ids.length, MAKS_KITAB_OTOMATIS);
  const sepi = pilihKitabOtomatis([K('a', 'Aaa', 'Nahwu'), K('b', 'Bbb', 'Akidah')], 'Berapa nisab zakat sapi?');
  assert.equal(sepi.dasar, 'tidak_sefan'); assert.deepEqual(sepi.ids, ['a', 'b']);
});

test('pilihKitabOtomatis: isian fan yang tidak dikenali tidak menyingkirkan kitab; kitab beda bidang paling akhir', () => {
  const p = [K('n', 'Nnn', 'Nahwu'), K('u', 'Uuu', 'Hukum Islam'), K('f', 'Fff', 'Fiqih')];
  const r = pilihKitabOtomatis(p, 'Berapa nisab zakat sapi?');
  assert.equal(r.dasar, 'fan'); assert.deepEqual(r.ids, ['f', 'u']);
  const t = pilihKitabOtomatis([K('n', 'Nnn', 'Nahwu'), K('u', 'Uuu', 'Hukum Islam')], 'Berapa nisab zakat sapi?');
  assert.equal(t.dasar, 'tidak_sefan'); assert.deepEqual(t.ids, ['u', 'n']);
});

test('pilihKitabOtomatis: deterministik, daftar kosong aman, dan catatan hanya bila ada kitab yang tidak ikut', () => {
  assert.deepEqual(pilihKitabOtomatis(PERPUS, 'Berapa nisab zakat sapi?'), pilihKitabOtomatis(PERPUS, 'Berapa nisab zakat sapi?'));
  assert.deepEqual(pilihKitabOtomatis([], 'zakat').ids, []); assert.deepEqual(pilihKitabOtomatis(null, 'zakat').ids, []);
  const r = pilihKitabOtomatis(PERPUS, 'Berapa nisab zakat sapi?');
  assert.match(catatanPilihan(r, r.ids.length), /bidang ilmu/);
  assert.equal(catatanPilihan({ ...r, jumlahAktif: r.ids.length }, r.ids.length), '', 'semua kitab aktif ikut: tidak perlu catatan');
  assert.match(catatanPilihan(pilihKitabOtomatis(PERPUS, 'tolong jelaskan'), 3), /menurut abjad/);
});

/* ---------- sambungan ke server ---------- */
const kitabDok = (id, judulLatin, fan) => [`kitab/${id}`, { aktif: true, status: 'siap', judulLatin, judul: judulLatin, fan, jumlahHalaman: 10, jumlahJuz: 1, bahasa: 'ar', aksara: 'arab' }];
const klienRencana = (...kueri) => ({ messages: { create: async () => ({ stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'rencana_cari', input: { kueri } }] }) } });

test('tanyaKitab tanpa kitabIds: mencari kitab yang dipilih otomatis, bukan empat pertama menurut abjad', async () => {
  const data = Object.fromEntries([
    kitabDok('a-nahwu', 'Al-Ajurrumiyyah', 'Nahwu'), kitabDok('b-akidah', 'Bidayatul', 'Akidah'), kitabDok('c-tafsir', 'Cahaya', 'Tafsir'),
    kitabDok('d-sharaf', 'Dasar Sharaf', 'Sharaf'), kitabDok('e-akidah2', 'Elok', 'Akidah'), kitabDok('z-fiqih', 'Zubad Fiqih', 'Fiqih Ibadah'),
  ]);
  const db = fakeDb(data); __setFirebaseForTest({ db, auth: {}, FieldValue: {} });
  try {
    const dicari = [];
    const r = await tanyaKitab({ pertanyaan: 'Berapa nisab zakat sapi?' }, { client: klienRencana('زكاة البقر'), cari: async (id) => { dicari.push(id); return { siap: true, halaman: [] }; } });
    assert.deepEqual(dicari, ['z-fiqih'], 'kitab fiqih di urutan abjad terakhir tetap dicari; kitab nahwu dkk. tidak dibuka');
    assert.equal(r.status, 'tidak_ditemukan'); assert.match(r.catatan, /bidang ilmu/); assert.match(r.catatanKitab, /1 dari 6 kitab aktif/);
    assert.deepEqual(r.kitabDicari.map((k) => k.id), ['z-fiqih']);
  } finally { __setFirebaseForTest(null); }
});

/* ---------- penunjuk isi lintas kitab ---------- */
import { pilihGabungan, MAKS_KITAB_ISI } from '../web/lib/pilihKitab.js';
const AWAL = { ids: ['a', 'b', 'c'], dasar: 'tanpa_isyarat', fan: '', jumlahAktif: 12 };
const peringkat = (...s) => s.map(([id, skor]) => ({ id, skor, halaman: [] }));

test('pilihGabungan: tanpa penunjuk, belum dibangun, atau tak ada yang cocok -> pilihan awal apa adanya', () => {
  assert.equal(pilihGabungan(null, AWAL), AWAL);
  assert.equal(pilihGabungan({ siap: false, alasan: 'belum_dibangun' }, AWAL), AWAL);
  assert.equal(pilihGabungan({ siap: true, kitab: [], tidakTerindeks: [] }, AWAL), AWAL);
});

test('pilihGabungan: kitab menurut isi didahulukan, kitab pilihan awal yang belum terindeks tetap ikut, dibatasi maksimum', () => {
  const g = { siap: true, kitab: peringkat(['x', 10], ['y', 8], ['z', 0.5]), tidakTerindeks: ['b', 'q'] };
  const r = pilihGabungan(g, AWAL);
  assert.deepEqual(r.ids, ['x', 'y', 'b']); assert.equal(r.dasar, 'isi'); assert.equal(r.belumTerindeks, 2); assert.equal(r.jumlahAktif, 12);
  const penuh = pilihGabungan({ siap: true, kitab: peringkat(['k1', 9], ['k2', 9], ['k3', 9], ['k4', 9], ['k5', 9]), tidakTerindeks: ['a', 'b', 'c'] }, AWAL);
  assert.equal(MAKS_KITAB_ISI, 4); assert.equal(penuh.ids.length, 6); assert.deepEqual(penuh.ids.slice(0, 4), ['k1', 'k2', 'k3', 'k4']);
  assert.match(catatanPilihan(r, r.ids.length), /seluruh isi perpustakaan: 3 dari 12 kitab aktif\. 2 kitab aktif belum masuk indeks isi/);
});
