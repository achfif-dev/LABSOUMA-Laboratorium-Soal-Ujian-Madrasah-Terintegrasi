import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bersihBatas, bersihKitabId, cocokkanKitabPerpus, kitabPerpusUntuk, selesaikanBatas, batasBisaDipakai, labelBatas, cakupanEfektif,
  periksaRujukanDalamBatas, halamanDiLuarBatas, jepitSeq, indeksBabDalamBatas, tetapkanUjung, CAKUPAN_MAKS,
} from '../web/lib/batasUjian.js';

const ISI = [
  { judul: 'Kitab Thaharah', level: 1, seq: 5, hal: 5 },
  { judul: 'Bab Wudhu', level: 2, seq: 6, hal: 6 },
  { judul: 'Bab Tayammum', level: 2, seq: 20, hal: 20 },
  { judul: 'Kitab Shalat', level: 1, seq: 31, hal: 31 },
  { judul: 'Bab Adzan', level: 2, seq: 32, hal: 32 },
];
const TOTAL = 60;
const PERPUS = [
  { id: 'fathul-qarib', judul: 'فتح القريب المجيب', judulLatin: 'Fathul Qarib', jumlahHalaman: 60 },
  { id: 'safinatun-naja', judul: 'سفينة النجا', judulLatin: 'Safinatun Naja', jumlahHalaman: 30 },
];

test('bersihBatas: bentuk sah dipertahankan, cacat dibuang', () => {
  assert.deepEqual(bersihBatas({ awal: { seq: 6, judul: ' Bab  Wudhu ' }, akhir: { seq: 20, judul: 'Bab Tayammum' } }), { awal: { seq: 6, judul: 'Bab Wudhu' }, akhir: { seq: 20, judul: 'Bab Tayammum' } });
  assert.deepEqual(bersihBatas({ awal: { seq: 3 }, akhir: { seq: 9 } }), { awal: { seq: 3 }, akhir: { seq: 9 } });
  assert.equal(bersihBatas(null), null);
  assert.equal(bersihBatas({ awal: { seq: 0 }, akhir: { seq: 9 } }), null);
  assert.equal(bersihBatas({ awal: { seq: 1.5 }, akhir: { seq: 9 } }), null);
  assert.equal(bersihBatas({ awal: { seq: 100000 }, akhir: { seq: 9 } }), null);
  assert.equal(bersihBatas({ awal: { seq: 9 }, akhir: { seq: 3 } }), null, 'tanpa judul dan terbalik = tidak sah');
  assert.notEqual(bersihBatas({ awal: { seq: 9, judul: 'A' }, akhir: { seq: 3, judul: 'B' } }), null, 'berjudul: urutan baru diketahui setelah daftar isi dibaca');
  assert.equal(bersihBatas({ awal: { seq: 3 } }), null);
});

test('bersihBatas: judul dibersihkan dari tanda < > dan dipotong', () => {
  const b = bersihBatas({ awal: { seq: 1, judul: '<b>Bab</b> ' + 'x'.repeat(300) }, akhir: { seq: 2 } });
  assert.ok(!/[<>]/.test(b.awal.judul)); assert.ok(b.awal.judul.length <= 120);
});

test('bersihKitabId', () => {
  assert.equal(bersihKitabId('fathul-qarib'), 'fathul-qarib');
  assert.equal(bersihKitabId('  fathul-qarib '), 'fathul-qarib');
  assert.equal(bersihKitabId('Fathul Qarib'), '');
  assert.equal(bersihKitabId('../x'), '');
  assert.equal(bersihKitabId(42), '');
});

test('cocokkanKitabPerpus: persis, longgar, ambigu, tidak ada', () => {
  assert.equal(cocokkanKitabPerpus(PERPUS, 'fathul qarib').id, 'fathul-qarib');
  assert.equal(cocokkanKitabPerpus(PERPUS, 'Fathul Qarib (Taqrib)').id, 'fathul-qarib', 'keterangan dalam kurung diabaikan');
  assert.equal(cocokkanKitabPerpus(PERPUS, 'سفينة النجا').id, 'safinatun-naja', 'nama Arab ikut dicocokkan');
  assert.equal(cocokkanKitabPerpus(PERPUS, 'Kitab Tidak Ada'), null);
  assert.equal(cocokkanKitabPerpus(PERPUS, ''), null);
  const kembar = [{ id: 'a-1', judulLatin: 'Fathul Muin' }, { id: 'a-2', judulLatin: 'Fathul Muin' }];
  assert.equal(cocokkanKitabPerpus(kembar, 'Fathul Muin'), null, 'dua kitab bernama sama: jangan menebak');
  assert.equal(cocokkanKitabPerpus([], 'x'), null);
  assert.equal(cocokkanKitabPerpus(undefined, 'x'), null);
});

test('kitabPerpusUntuk: tautan, tautan hilang, otomatis, manual', () => {
  assert.deepEqual(kitabPerpusUntuk({ nama: 'Apa saja', kitabId: 'safinatun-naja' }, PERPUS).sumber, 'tautan');
  assert.equal(kitabPerpusUntuk({ nama: 'Apa saja', kitabId: 'safinatun-naja' }, PERPUS).item.id, 'safinatun-naja');
  const hilang = kitabPerpusUntuk({ nama: 'Fathul Qarib', kitabId: 'sudah-dihapus' }, PERPUS);
  assert.equal(hilang.sumber, 'tautan-hilang'); assert.equal(hilang.item, null, 'tautan yang rusak tidak diam-diam jatuh ke pencocokan nama');
  const oto = kitabPerpusUntuk({ nama: 'Fathul Qarib' }, PERPUS);
  assert.equal(oto.sumber, 'otomatis'); assert.equal(oto.item.id, 'fathul-qarib');
  assert.deepEqual(kitabPerpusUntuk({ nama: 'Kitab Baru' }, PERPUS), { item: null, sumber: 'manual' });
  assert.deepEqual(kitabPerpusUntuk({ nama: 'Fathul Qarib' }, []), { item: null, sumber: 'manual' });
});

test('selesaikanBatas: bab awal sampai akhir bab akhir', () => {
  const r = selesaikanBatas({ awal: { seq: 6, judul: 'Bab Wudhu' }, akhir: { seq: 20, judul: 'Bab Tayammum' } }, ISI, TOTAL);
  assert.equal(r.status, 'ok'); assert.equal(r.awal, 6); assert.equal(r.akhir, 30, 'akhir bab Tayammum = sebelum Kitab Shalat (urutan 31)');
  assert.deepEqual(r.catatan, []);
});

test('selesaikanBatas: bab terakhir di kitab membentang sampai halaman terakhir', () => {
  const r = selesaikanBatas({ awal: { seq: 32, judul: 'Bab Adzan' }, akhir: { seq: 32, judul: 'Bab Adzan' } }, ISI, TOTAL);
  assert.equal(r.akhir, TOTAL);
});

test('selesaikanBatas: sinkron otomatis saat daftar isi bergeser', () => {
  const geser = ISI.map((e) => (e.seq >= 20 ? { ...e, seq: e.seq + 4 } : e)); // Tayammum kini di 24, Shalat di 35
  const r = selesaikanBatas({ awal: { seq: 6, judul: 'Bab Wudhu' }, akhir: { seq: 20, judul: 'Bab Tayammum' } }, geser, TOTAL);
  assert.equal(r.status, 'bergeser'); assert.equal(r.awal, 6); assert.equal(r.akhir, 34);
  assert.ok(r.catatan.length >= 1);
});

test('selesaikanBatas: judul cocok walau ejaan beda (wudlu = wudhu, awalan Bab dibuang)', () => {
  const r = selesaikanBatas({ awal: { seq: 6, judul: 'Wudlu' }, akhir: { seq: 6, judul: 'Wudlu' } }, ISI, TOTAL);
  assert.equal(r.status, 'ok'); assert.equal(r.awal, 6);
});

test('selesaikanBatas: judul hilang memakai posisi tersimpan dan diberi status hilang', () => {
  const tanpa = ISI.filter((e) => e.judul !== 'Bab Tayammum');
  const r = selesaikanBatas({ awal: { seq: 6, judul: 'Bab Wudhu' }, akhir: { seq: 20, judul: 'Bab Tayammum' } }, tanpa, TOTAL);
  assert.equal(r.status, 'hilang'); assert.equal(r.akhir, 20);
  assert.ok(r.catatan.some((c) => /Tayammum/.test(c)));
});

test('selesaikanBatas: judul kembar memilih yang terdekat dengan posisi tersimpan', () => {
  const kembar = [{ judul: 'Bab Puasa', level: 1, seq: 10 }, { judul: 'Bab Puasa', level: 1, seq: 40 }, { judul: 'Penutup', level: 1, seq: 50 }];
  const r = selesaikanBatas({ awal: { seq: 41, judul: 'Bab Puasa' }, akhir: { seq: 41, judul: 'Bab Puasa' } }, kembar, TOTAL);
  assert.equal(r.awal, 40); assert.equal(r.akhir, 49);
});

test('selesaikanBatas: tanpa judul = urutan apa adanya, dipotong ke jumlah halaman', () => {
  const r = selesaikanBatas({ awal: { seq: 10 }, akhir: { seq: 90 } }, [], TOTAL);
  assert.equal(r.status, 'tetap'); assert.equal(r.awal, 10); assert.equal(r.akhir, TOTAL);
  assert.ok(r.catatan.some((c) => /dipotong/.test(c)));
});

test('selesaikanBatas: terbalik dan di luar kitab tidak bisa dipakai', () => {
  const geser = [{ judul: 'A', level: 1, seq: 50 }, { judul: 'B', level: 1, seq: 12 }, { judul: 'C', level: 1, seq: 20 }];
  const t = selesaikanBatas({ awal: { seq: 5, judul: 'A' }, akhir: { seq: 5, judul: 'B' } }, geser, TOTAL);
  assert.equal(t.status, 'terbalik'); assert.equal(batasBisaDipakai(t), false);
  const k = selesaikanBatas({ awal: { seq: 80 }, akhir: { seq: 90 } }, [], TOTAL);
  assert.equal(k.status, 'kosong'); assert.equal(batasBisaDipakai(k), false);
  assert.equal(selesaikanBatas(null, ISI, TOTAL), null);
  assert.equal(batasBisaDipakai(null), false);
});

test('selesaikanBatas: daftar isi kosong dengan jangkar berjudul -> hilang, tetap bisa dipakai', () => {
  const r = selesaikanBatas({ awal: { seq: 6, judul: 'Bab Wudhu' }, akhir: { seq: 30, judul: 'Bab Tayammum' } }, [], TOTAL);
  assert.equal(r.status, 'hilang'); assert.equal(batasBisaDipakai(r), true); assert.equal(r.awal, 6); assert.equal(r.akhir, 30);
});

test('labelBatas dan cakupanEfektif: panjang selalu <= 120, teks admin didahulukan', () => {
  const r = selesaikanBatas({ awal: { seq: 6, judul: 'Bab Wudhu' }, akhir: { seq: 20, judul: 'Bab Tayammum' } }, ISI, TOTAL);
  assert.equal(labelBatas(r), 'Bab Wudhu s.d. Bab Tayammum (urutan 6–30)');
  assert.equal(cakupanEfektif('', r), 'Bab Wudhu s.d. Bab Tayammum (urutan 6–30)');
  assert.equal(cakupanEfektif('Thaharah dasar', r), 'Thaharah dasar [urutan 6–30]');
  const panjang = cakupanEfektif('x'.repeat(200), r);
  assert.ok(panjang.length <= CAKUPAN_MAKS); assert.ok(panjang.endsWith('[urutan 6–30]'));
  assert.equal(cakupanEfektif('Hanya teks', null), 'Hanya teks');
  assert.equal(cakupanEfektif('', null), '');
  const tanpaJudul = selesaikanBatas({ awal: { seq: 3 }, akhir: { seq: 3 } }, [], TOTAL);
  assert.equal(labelBatas(tanpaJudul), 'Halaman urutan 3');
  assert.equal(labelBatas(null), '');
  const bab = selesaikanBatas({ awal: { seq: 6, judul: 'Bab Wudhu' }, akhir: { seq: 6, judul: 'Bab Wudhu' } }, ISI, TOTAL);
  assert.equal(labelBatas(bab), 'Bab Wudhu (urutan 6–19)');
  const buruk = { awal: 9, akhir: 2, judulAwal: '', judulAkhir: '', status: 'terbalik', catatan: [] };
  assert.equal(cakupanEfektif('Teks admin', buruk), 'Teks admin', 'batas rusak tidak ikut dikirim ke AI');
});

test('periksaRujukanDalamBatas', () => {
  const r = selesaikanBatas({ awal: { seq: 6, judul: 'Bab Wudhu' }, akhir: { seq: 20, judul: 'Bab Tayammum' } }, ISI, TOTAL); // 6-30
  assert.equal(periksaRujukanDalamBatas(r, 'fathul-qarib', { kitabId: 'fathul-qarib', halId: 'p00010', halIdAkhir: 'p00012' }).ok, true);
  assert.equal(periksaRujukanDalamBatas(r, 'fathul-qarib', { kitabId: 'fathul-qarib', halId: 'p00030' }).ok, true, 'tepat di ujung batas');
  const luar = periksaRujukanDalamBatas(r, 'fathul-qarib', { kitabId: 'fathul-qarib', halId: 'p00028', halIdAkhir: 'p00033' });
  assert.equal(luar.ok, false); assert.match(luar.alasan, /urutan 28–33/); assert.match(luar.alasan, /6–30/);
  assert.equal(periksaRujukanDalamBatas(r, 'fathul-qarib', { kitabId: 'safinatun-naja', halId: 'p00001' }).ok, null, 'kitab lain: tidak diperiksa');
  assert.equal(periksaRujukanDalamBatas(r, 'fathul-qarib', { kitabId: '', halId: '' }).ok, null, 'teks tempelan: tidak bisa diperiksa dengan kode');
  assert.equal(periksaRujukanDalamBatas(null, 'fathul-qarib', { kitabId: 'fathul-qarib', halId: 'p00001' }).ok, null);
});

test('halamanDiLuarBatas (Paket Dauri)', () => {
  const r = { awal: 6, akhir: 30, status: 'ok' };
  const h = halamanDiLuarBatas(r, 'fathul-qarib', ['fathul-qarib:7', 'fathul-qarib:31', 'fathul-qarib:2', 'lain:99', 'rusak']);
  assert.equal(h.diperiksa, 3); assert.deepEqual(h.luar, [31, 2]);
  assert.deepEqual(halamanDiLuarBatas(null, 'x', ['x:1']), { diperiksa: 0, luar: [] });
});

test('jepitSeq dan indeksBabDalamBatas', () => {
  const r = { awal: 6, akhir: 30, status: 'ok' };
  assert.equal(jepitSeq(2, r), 6); assert.equal(jepitSeq(50, r), 30); assert.equal(jepitSeq(10, r), 10); assert.equal(jepitSeq(2, null), 2);
  assert.deepEqual(indeksBabDalamBatas(ISI, r), [1, 2], 'hanya bab yang MULAI di dalam batas');
  assert.deepEqual(indeksBabDalamBatas(ISI, null), [0, 1, 2, 3, 4]);
});

/* ---------------------------------------------------------------- Server: validasi konfigurasi */
import { DEFAULT_APP_CONFIG, sanitizeAppConfig } from '../src/appConfig.js';
import { batasKitab, cakupanKitab } from '../web/lib/ujian.js';

const salin = (o) => JSON.parse(JSON.stringify(o));
function cfgDengan(kitabExtra, periode) {
  const c = salin(DEFAULT_APP_CONFIG);
  const t = c.tingkat.find((x) => x.nama === 'Aliyah');
  const kelas = t.kelas[0]; const kode = c.sistemUjian.find((s) => s.id === t.sistemUjian).periode[0].kode;
  const k = c.kitab.find((x) => x.tingkat.includes('Aliyah'));
  Object.assign(k, kitabExtra);
  k.penempatan = [{ tingkat: 'Aliyah', kelas, periode: periode(kode) }];
  return { c, kitabNama: k.nama, kelas, kode };
}

test('server: kitabId dan batas tersimpan, dibersihkan, dan terbaca lewat batasKitab', () => {
  const { c, kitabNama, kelas, kode } = cfgDengan({ kitabId: ' fathul-qarib ' }, (kd) => [{ kode: kd, cakupan: 'Thaharah', batas: { awal: { seq: 6, judul: ' Bab  Wudhu ' }, akhir: { seq: 20, judul: 'Bab Tayammum' }, liar: 1 } }]);
  const out = sanitizeAppConfig(c);
  const k = out.kitab.find((x) => x.nama === kitabNama);
  assert.equal(k.kitabId, 'fathul-qarib');
  assert.deepEqual(batasKitab(k, 'Aliyah', kelas, kode), { awal: { seq: 6, judul: 'Bab Wudhu' }, akhir: { seq: 20, judul: 'Bab Tayammum' } });
  assert.equal(cakupanKitab(k, 'Aliyah', kelas, kode), 'Thaharah', 'cakupan teks tetap berjalan berdampingan');
});

test('server: batas cacat dibuang tanpa menolak seluruh konfigurasi; kitabId cacat dikosongkan', () => {
  const { c, kitabNama, kelas, kode } = cfgDengan({ kitabId: 'Bukan Id Sah!' }, (kd) => [{ kode: kd, cakupan: '', batas: { awal: { seq: 9 }, akhir: { seq: 3 } } }]);
  const out = sanitizeAppConfig(c);
  const k = out.kitab.find((x) => x.nama === kitabNama);
  assert.ok(!('kitabId' in k), 'kitabId kosong tidak ditulis (konfigurasi lama tetap persis sama)');
  assert.equal(batasKitab(k, 'Aliyah', kelas, kode), null);
});

test('server: konfigurasi lama tanpa kitabId/batas tidak berubah bentuk', () => {
  const out = sanitizeAppConfig(salin(DEFAULT_APP_CONFIG));
  for (const k of out.kitab) { assert.ok(!('kitabId' in k)); for (const p of k.penempatan) for (const y of p.periode) assert.ok(!('batas' in y)); }
});

test('server: batas ikut hilang bersama periodenya bila periode dibuang dari penempatan', () => {
  const { c, kitabNama, kelas } = cfgDengan({}, () => [{ kode: 'kode-tidak-ada', cakupan: 'x', batas: { awal: { seq: 1 }, akhir: { seq: 2 } } }]);
  const out = sanitizeAppConfig(c);
  const k = out.kitab.find((x) => x.nama === kitabNama);
  assert.deepEqual(k.penempatan.flatMap((p) => p.periode), []);
  assert.equal(batasKitab(k, 'Aliyah', kelas, 'kode-tidak-ada'), null);
});

test('tetapkanUjung (pencarian kalimat): ujung polos, ujung lain dipertahankan, tidak terbalik', () => {
  assert.deepEqual(tetapkanUjung(null, 'awal', 40), { awal: { seq: 40 }, akhir: { seq: 40 } }, 'belum ada batas: ujung lain sama dulu');
  assert.deepEqual(tetapkanUjung({ awal: { seq: 40 }, akhir: { seq: 40 } }, 'akhir', 55), { awal: { seq: 40 }, akhir: { seq: 55 } });
  assert.deepEqual(tetapkanUjung({ awal: { seq: 10 }, akhir: { seq: 30 } }, 'awal', 20), { awal: { seq: 20 }, akhir: { seq: 30 } }, 'ujung lain tetap');
  assert.deepEqual(tetapkanUjung({ awal: { seq: 10 }, akhir: { seq: 30 } }, 'awal', 50), { awal: { seq: 50 }, akhir: { seq: 50 } }, 'awal melewati akhir polos: akhir ikut pindah');
  assert.deepEqual(tetapkanUjung({ awal: { seq: 10 }, akhir: { seq: 30 } }, 'akhir', 5), { awal: { seq: 5 }, akhir: { seq: 5 } });
  const bab = { awal: { seq: 6, judul: 'Bab Wudhu' }, akhir: { seq: 20, judul: 'Bab Tayammum' } };
  assert.deepEqual(tetapkanUjung(bab, 'akhir', 25), { awal: bab.awal, akhir: { seq: 25 } }, 'campuran: awal dari bab, akhir dari pencarian');
  assert.deepEqual(tetapkanUjung(bab, 'awal', 50), { awal: { seq: 50 }, akhir: bab.akhir }, 'ujung berjudul tidak dipindah (urutannya baru diketahui setelah daftar isi dibaca)');
  assert.equal(tetapkanUjung(null, 'awal', 0), null); assert.equal(tetapkanUjung(null, 'tengah', 5), null);
  const campur = selesaikanBatas(tetapkanUjung(bab, 'akhir', 25), ISI, TOTAL);
  assert.equal(campur.awal, 6); assert.equal(campur.akhir, 25); assert.equal(campur.status, 'ok'); assert.equal(labelBatas(campur), 'Bab Wudhu (urutan 6–25)');
});
