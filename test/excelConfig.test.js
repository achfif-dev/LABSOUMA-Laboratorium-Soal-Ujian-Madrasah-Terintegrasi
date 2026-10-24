import test from 'node:test';
import assert from 'node:assert/strict';
import writeExcelFile from 'write-excel-file/universal';
import { buatTemplate, ekspor, bacaExcel, gabungkan, LEMBAR, KOLOM } from '../web/lib/excelConfig.js';
import { DEFAULT_APP_CONFIG, sanitizeAppConfig } from '../src/appConfig.js';

const H = (c) => c;
const xlsx = (sheets) => writeExcelFile(Object.entries(sheets).map(([sheet, data]) => ({ sheet, data }))).toBlob();
const dasar = () => sanitizeAppConfig(DEFAULT_APP_CONFIG);

test('ekspor lalu impor (ganti) menghasilkan konfigurasi yang sama setelah divalidasi server', async () => {
  const cfg = dasar();
  cfg.kitab[0].penempatan = [{ tingkat: 'Ibtidaiyah', kelas: 'I', periode: [{ kode: 'sem1-uts', cakupan: 'Bab Thaharah' }, { kode: 'sem1-uas', cakupan: '' }] }];
  const { galat, bagian, peringatan } = await bacaExcel(await ekspor(cfg));
  assert.deepEqual(galat, []); assert.deepEqual(peringatan, []);
  const { config } = gabungkan(cfg, bagian, 'ganti');
  assert.deepEqual(sanitizeAppConfig(config), cfg);
});

test('template tanpa isi: baris (contoh) diabaikan, bukan galat', async () => {
  const r = await bacaExcel(await buatTemplate());
  assert.deepEqual(r.galat.length, 1); // semua lembar kosong setelah contoh dibuang
  assert.match(r.galat[0], /Tidak ada lembar/);
});

test('gabung: memperbarui yang ada, menambah yang baru, menjaga yang lain dan penempatan lama', async () => {
  const cfg = dasar();
  cfg.kitab.find((k) => k.nama === 'Safinatun Naja').penempatan = [{ tingkat: 'Ibtidaiyah', kelas: 'II', periode: [{ kode: 'sem1-uts', cakupan: 'x' }] }];
  const f = await xlsx({
    Kitab: [KOLOM.kitab, ['safinatun naja', 'سفينة النجا', 'Salim', '', 'Fiqih', '', 'Ibtidaiyah', 'Ya'], ['Kitab Baru', '', 'Penulis', '', 'Fiqih', '', '', 'Tidak']],
    Mapel: [KOLOM.mapel, ['Mapel Baru', 'Aliyah', 'Ya']],
  });
  const r = await bacaExcel(f); assert.deepEqual(r.galat, []);
  const { config } = gabungkan(cfg, r.bagian, 'gabung');
  const s = sanitizeAppConfig(config);
  assert.equal(s.kitab.length, cfg.kitab.length + 1);
  const saf = s.kitab.find((k) => k.nama === 'Safinatun Naja');
  assert.deepEqual(saf.tingkat, ['Ibtidaiyah']); assert.equal(saf.pengarang, 'Salim');
  assert.equal(saf.penempatan[0].kelas, 'II'); // penempatan lama dipertahankan
  assert.equal(s.kitab.find((k) => k.nama === 'Kitab Baru').aktif, false);
  assert.deepEqual(s.kitab.find((k) => k.nama === 'Kitab Baru').tingkat, s.tingkat.map((t) => t.nama)); // kosong = semua
  assert.deepEqual(s.mapel.find((m) => m.nama === 'Mapel Baru').tingkat, ['Aliyah']);
  assert.equal(s.mapel.length, cfg.mapel.length + 1);
});

test('lembar Penempatan: kode periode salah dan kelas tak dikenal jadi peringatan, bukan "semua periode" diam-diam', async () => {
  const cfg = dasar();
  const f = await xlsx({ Penempatan: [KOLOM.penempatan,
    ['Safinatun Naja', 'Ibtidaiyah', 'I', 'sem1-uts', 'Bab 1'], ['Safinatun Naja', 'Ibtidaiyah', 'II', 'kode-ngawur', ''],
    ['Safinatun Naja', 'Ibtidaiyah', 'XII', '', ''], ['Kitab Tak Ada', 'Ibtidaiyah', 'I', '', '']] });
  const r = await bacaExcel(f); assert.deepEqual(r.galat, []);
  const { config, peringatan } = gabungkan(cfg, r.bagian, 'gabung');
  const pen = config.kitab.find((k) => k.nama === 'Safinatun Naja').penempatan;
  assert.deepEqual(pen, [{ tingkat: 'Ibtidaiyah', kelas: 'I', periode: [{ kode: 'sem1-uts', cakupan: 'Bab 1' }] }]);
  assert.equal(peringatan.length, 3);
});

test('galat jelas per lembar dan baris: kolom hilang, duplikat, Aktif salah, Arab salah, kode sistem tidak valid', async () => {
  const f = await xlsx({
    Tingkat: [['Kunci', 'Label', 'Label Arab', 'Aktif'], ['Wustha', 'W', 'latin', 'Ya'], ['wustha', 'W2', '', 'Ya'], ['Ulya', 'U', '', 'mungkin']],
    'Sistem Ujian': [KOLOM.sistem, ['sem', 'Semester', 'Kode Besar', 'UTS']],
    Mapel: [['Nama Mapel'], ['x']],
  });
  const r = await bacaExcel(f);
  const j = r.galat.join('\n');
  assert.match(j, /Tingkat" baris 2: Label Arab harus berhuruf Arab/);
  assert.match(j, /Tingkat" baris 3: Kunci "wustha" tercatat dua kali/);
  assert.match(j, /Tingkat" baris 4: nilai "mungkin"/);
  assert.match(j, /Sistem Ujian" baris 2: Kode Periode "Kode Besar" tidak valid/);
  assert.match(j, /Lembar "Mapel": kolom "Nama" tidak ditemukan/);
});

test('urutan kolom bebas, judul kolom tak peka huruf besar-kecil; berkas bukan xlsx ditolak dengan pesan ramah', async () => {
  const f = await xlsx({ mapel: [['aktif', 'NAMA', 'tingkat'], ['Tidak', 'Fiqih X', '']] });
  const r = await bacaExcel(f); assert.deepEqual(r.galat, []);
  assert.deepEqual(r.bagian.mapel, [{ nama: 'Fiqih X', tingkat: [], aktif: false }]);
  const buruk = await bacaExcel(new Blob(['bukan xlsx']));
  assert.match(buruk.galat[0], /tidak bisa dibaca/);
});

test('tingkat baru lewat Excel, lalu mapel/kitab merujuknya; sistem ujian tak dikenal jatuh ke sistem pertama dengan peringatan', async () => {
  const cfg = dasar();
  const f = await xlsx({
    Tingkat: [KOLOM.tingkat, ['Wustha', 'Wustha (Wst)', '', 'Wst', 'VII, VIII', 'tidak-ada', 'Ya']],
    Mapel: [KOLOM.mapel, ['Fiqih', 'Wustha', 'Ya']],
  });
  const r = await bacaExcel(f);
  const { config, peringatan } = gabungkan(cfg, r.bagian, 'gabung');
  const s = sanitizeAppConfig(config);
  assert.equal(s.tingkat.length, 4); assert.equal(s.tingkat[3].sistemUjian, 'semester');
  assert.deepEqual(s.mapel.find((m) => m.nama === 'Fiqih').tingkat, ['Wustha']);
  assert.ok(peringatan.some((p) => /sistem ujian "tidak-ada"/.test(p)));
});
