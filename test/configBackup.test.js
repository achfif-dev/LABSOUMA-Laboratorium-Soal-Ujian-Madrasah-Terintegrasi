import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fakeDb } from './_fakeDb.js';
import { DEFAULT_APP_CONFIG, simpanApp, resetApp, pulihkanApp, lihatApp, bacaAplikasi, invalidateAppConfig } from '../src/appConfig.js';
import { simpanAi, pulihkanAi, lihatAi, statusAi, invalidateAiConfig } from '../src/aiConfig.js';
import { dataDariDoc, ringkas, bandingkan, kanon, buatTitik, hapusTitik, daftarRiwayat, BATAS_RIWAYAT } from '../src/configBackup.js';
import { __setFirebaseForTest } from '../src/platform.js';
import handler from '../api/config-backup.js';

const salin = (o) => JSON.parse(JSON.stringify(o));
const ADM = { uid: 'a', email: 'admin@x.id' };
const ADM2 = { uid: 'b', email: 'admin2@x.id' };
const jam = () => { let i = 0; return () => new Date(Date.UTC(2026, 9, 23, 3, 0, ++i)).toISOString(); }; // waktu naik tiap panggilan, untuk urutan cadangan
const siap = (extra = {}) => {
  const db = fakeDb({ 'users/a': { role: 'admin' }, 'users/p': { role: 'penyusun' }, ...extra });
  __setFirebaseForTest({ db, data: db.data, auth: { verifyIdToken: async (t) => ({ adm: { uid: 'a', email: 'admin@x.id' }, pen: { uid: 'p' } }[t] || (() => { throw new Error('bad'); })()) }, FieldValue: {} });
  invalidateAppConfig(); invalidateAiConfig();
  return db;
};
const cfg = (...namaMapel) => { const c = salin(DEFAULT_APP_CONFIG); c.mapel = namaMapel.map((n) => ({ nama: n, tingkat: ['Aliyah'] })); c.kitab = [{ nama: 'Fathul Qarib', mapel: namaMapel[0] }]; return c; };
const riwayat = (db, kol = 'configRiwayatApp') => Object.entries(db.data).filter(([p]) => p.startsWith(kol + '/')).map(([p, v]) => ({ id: p.split('/')[1], ...v })).sort((a, b) => (a.dibuatAt < b.dibuatAt ? -1 : 1));

test('fungsi murni: kanon tidak peduli urutan kunci; dataDariDoc tidak pernah memuat kunci API; bandingkan menunjuk perbedaan', () => {
  assert.equal(kanon({ a: 1, b: { c: 2, d: 3 } }), kanon({ b: { d: 3, c: 2 }, a: 1 }));
  assert.notEqual(kanon([1, 2]), kanon([2, 1]));
  const d = dataDariDoc('ai', { provider: 'gemini', models: { gemini: 'm-1', anthropic: '' }, keys: { gemini: { enc: 'v1.RAHASIA.x.y', last4: 'ABCD' } } });
  assert.deepEqual(d, { provider: 'gemini', models: { gemini: 'm-1' }, kunci: { gemini: { last4: 'ABCD' } } });
  assert.ok(!JSON.stringify(d).includes('RAHASIA'));
  assert.equal(dataDariDoc('ai', {}), null); assert.equal(dataDariDoc('app', null), null); assert.equal(dataDariDoc('app', { x: 1 }), null);
  assert.deepEqual(ringkas('app', { tingkat: [1, 2], mapel: [1], kitab: [{ penempatan: [1, 2] }, {}], sistemUjian: [1] }), { tingkat: 2, mapel: 1, kitab: 2, penempatan: 2, sistemUjian: 1 });
  const a = { tingkat: [{ nama: 'MI' }], mapel: [{ nama: 'Fiqih', aktif: true }, { nama: 'Nahwu' }], kitab: [{ nama: 'K1' }], sistemUjian: [] };
  const b = { tingkat: [{ nama: 'MI' }], mapel: [{ nama: 'Fiqih', aktif: false }, { nama: 'Baru' }], kitab: [], sistemUjian: [] };
  const df = bandingkan('app', a, b);
  assert.deepEqual(df.mapel.kembali, ['Nahwu']); assert.deepEqual(df.mapel.hilang, ['Baru']); assert.deepEqual(df.mapel.beda, ['Fiqih']);
  assert.deepEqual(df.kitab.kembali, ['K1']); assert.equal(df.sama, false);
  assert.equal(bandingkan('app', a, a).sama, true);
});

test('simpan: keadaan SEBELUMNYA dicadangkan; simpan pertama (masih bawaan kode) tidak membuat cadangan; simpan kembar tidak menumpuk', async () => {
  const db = siap(); const now = jam();
  await simpanApp(ADM, { config: cfg('Fiqih') }, { now });
  assert.equal(riwayat(db).length, 0); // sebelumnya bawaan kode: tidak ada yang perlu dicadangkan
  await simpanApp(ADM2, { config: cfg('Fiqih', 'Nahwu') }, { now });
  let r = riwayat(db);
  assert.equal(r.length, 1);
  assert.equal(r[0].tipe, 'otomatis'); assert.equal(r[0].alasan, 'sebelum-simpan');
  assert.deepEqual(r[0].data.mapel.map((m) => m.nama), ['Fiqih']); // isi sebelum diubah
  assert.equal(r[0].sumberOleh, 'admin@x.id'); assert.equal(r[0].dibuatOleh, 'admin2@x.id'); // siapa yang membuatnya vs siapa yang menimpanya
  assert.deepEqual(r[0].ringkas, { tingkat: 3, mapel: 1, kitab: 1, penempatan: 0, sistemUjian: 2 });
  await simpanApp(ADM, { config: cfg('Fiqih', 'Nahwu') }, { now }); // isi sama: cadangan baru (keadaan 'Fiqih,Nahwu') dibuat sekali
  await simpanApp(ADM, { config: cfg('Fiqih', 'Nahwu', 'Tajwid') }, { now }); // cadangan terakhir sudah sama dengan keadaan sekarang: tidak dobel
  assert.equal(riwayat(db).length, 2);
});

test('SKENARIO UTAMA: salah hapus lalu "Pulihkan bawaan": konfigurasi buatan madrasah kembali dari cadangan, bukan bawaan aplikasi', async () => {
  const db = siap(); const now = jam();
  const buatan = cfg('Fiqih', 'Nahwu'); buatan.kitab = [{ nama: 'Kitab Madrasah Kami', mapel: 'Fiqih', namaArab: 'كتاب' }, { nama: 'Fathul Qarib', mapel: 'Fiqih' }];
  await simpanApp(ADM, { config: buatan }, { now });
  const sebelum = (await bacaAplikasi()).config;
  assert.ok(sebelum.kitab.some((k) => k.nama === 'Kitab Madrasah Kami'));
  // human error: admin menekan "Pulihkan bawaan"
  const r = await resetApp(ADM, { now });
  assert.equal(r.kustom, false);
  assert.equal(r.config.mapel.length, DEFAULT_APP_CONFIG.mapel.length); // aplikasi kembali ke bawaan kode
  const cad = riwayat(db);
  assert.equal(cad.length, 1); assert.equal(cad[0].alasan, 'sebelum-reset');
  // pemulihan: kembali ke setelan buatan madrasah
  const p = await pulihkanApp(ADM, cad[0].id, { now });
  assert.equal(p.kustom, true);
  assert.deepEqual(p.config, sebelum); // persis sama dengan sebelum kecelakaan
  assert.equal(db.data['config/app'].dipulihkanDari, cad[0].id);
});

test('pulihkan itu sendiri dicadangkan: salah pilih cadangan bisa dibatalkan', async () => {
  const db = siap(); const now = jam();
  await simpanApp(ADM, { config: cfg('A') }, { now });
  await simpanApp(ADM, { config: cfg('B') }, { now }); // cadangan #1 = A
  const a = riwayat(db)[0];
  await pulihkanApp(ADM, a.id, { now }); // kembali ke A; B dicadangkan
  assert.deepEqual((await bacaAplikasi()).config.mapel.map((m) => m.nama), ['A']);
  const b = riwayat(db).find((x) => x.alasan === 'sebelum-pulih');
  assert.deepEqual(b.data.mapel.map((m) => m.nama), ['B']);
  await pulihkanApp(ADM, b.id, { now }); // batalkan: kembali ke B
  assert.deepEqual((await bacaAplikasi()).config.mapel.map((m) => m.nama), ['B']);
});

test('gagal = tidak ada yang berubah: input tidak valid, bentrok versi, dan cadangan yang gagal ditulis tidak menyisakan setengah perubahan', async () => {
  const db = siap(); const now = jam();
  await simpanApp(ADM, { config: cfg('A') }, { now });
  const awal = salin(db.data['config/app']);
  await assert.rejects(simpanApp(ADM, { config: { mapel: [] } }, { now }), { code: 'CONFIG_INVALID' });
  assert.deepEqual(db.data['config/app'], awal); assert.equal(riwayat(db).length, 0);
  // cadangan tidak bisa dibuat -> simpan ikut gagal (fail closed)
  const asli = db.collection; db.collection = () => { throw new Error('firestore mati'); };
  await assert.rejects(simpanApp(ADM, { config: cfg('B') }, { now }));
  db.collection = asli;
  assert.deepEqual(db.data['config/app'], awal);
});

test('bentrok admin: basisAt usang ditolak 409 tanpa menimpa; basisAt cocok atau tidak dikirim tetap diterima', async () => {
  const db = siap(); const now = jam();
  let r = await simpanApp(ADM, { config: cfg('A'), basisAt: null }, { now }); // dokumen belum ada, klien melihat null
  const basis1 = r.diubahAt; assert.ok(basis1);
  await simpanApp(ADM2, { config: cfg('B'), basisAt: basis1 }, { now }); // admin 2 menyimpan dengan basis benar
  await assert.rejects(simpanApp(ADM, { config: cfg('C'), basisAt: basis1 }, { now }), (e) => e.status === 409 && e.code === 'CONFIG_CONFLICT' && /admin2@x\.id/.test(e.message));
  assert.deepEqual((await bacaAplikasi()).config.mapel.map((m) => m.nama), ['B']); // pekerjaan admin 2 selamat
  await simpanApp(ADM, { config: cfg('D') }, { now }); // klien lama tanpa basisAt tetap jalan
  assert.deepEqual((await bacaAplikasi()).config.mapel.map((m) => m.nama), ['D']);
});

test('pemangkasan: cadangan otomatis dibatasi, titik pulih tidak pernah ikut terbuang', async () => {
  const db = siap(); const now = jam();
  await simpanApp(ADM, { config: cfg('Awal') }, { now });
  const t = await buatTitik(ADM, 'app', '  Setelan awal tahun ajaran  ', { now });
  assert.equal(t.nama, 'Setelan awal tahun ajaran'); assert.equal(t.tipe, 'titik');
  for (let i = 0; i < BATAS_RIWAYAT.otomatis + 8; i++) await simpanApp(ADM, { config: cfg(i % 2 ? 'X' + i : 'Y' + i) }, { now });
  const r = riwayat(db);
  assert.equal(r.filter((x) => x.tipe === 'otomatis').length, BATAS_RIWAYAT.otomatis);
  assert.equal(r.filter((x) => x.tipe === 'titik').length, 1);
  assert.deepEqual((await pulihkanApp(ADM, t.id, { now })).config.mapel.map((m) => m.nama), ['Awal']); // titik masih bisa dipulihkan
});

test('titik pulih: wajib bernama, butuh konfigurasi tersimpan, dibatasi jumlahnya; hanya titik yang boleh dihapus manual', async () => {
  const db = siap(); const now = jam();
  await assert.rejects(buatTitik(ADM, 'app', 'x', { now }), { code: 'RIWAYAT_INVALID', message: /Belum ada konfigurasi/ });
  await simpanApp(ADM, { config: cfg('A') }, { now });
  await assert.rejects(buatTitik(ADM, 'app', '   ', { now }), { message: /nama/ });
  for (let i = 0; i < BATAS_RIWAYAT.titik; i++) await buatTitik(ADM, 'app', 'T' + i, { now });
  await assert.rejects(buatTitik(ADM, 'app', 'kelebihan', { now }), { message: /maksimal/ });
  await simpanApp(ADM, { config: cfg('B') }, { now });
  const oto = riwayat(db).find((x) => x.tipe === 'otomatis');
  await assert.rejects(hapusTitik('app', oto.id), { message: /Hanya titik pulih/ });
  const titik = riwayat(db).find((x) => x.tipe === 'titik');
  assert.deepEqual(await hapusTitik('app', titik.id), { ok: true });
  assert.equal(riwayat(db).filter((x) => x.tipe === 'titik').length, BATAS_RIWAYAT.titik - 1);
  await assert.rejects(hapusTitik('app', 'tidak-ada'), { status: 404 });
  await assert.rejects(hapusTitik('app', '../config/app'), { status: 400 }); // id berbentuk path ditolak
});

test('cadangan yang rusak atau tak lagi sah ditolak saat dipulihkan dan tidak mengubah apa pun', async () => {
  const db = siap(); const now = jam();
  await simpanApp(ADM, { config: cfg('A') }, { now });
  const awal = salin(db.data['config/app']);
  db.data['configRiwayatApp/rusak1'] = { jenis: 'app', tipe: 'otomatis', alasan: 'sebelum-simpan', data: { mapel: [], tingkat: [], kitab: [] }, dibuatAt: '2026-01-01T00:00:00.000Z' };
  await assert.rejects(pulihkanApp(ADM, 'rusak1', { now }), { code: 'CONFIG_INVALID' });
  assert.deepEqual(db.data['config/app'], awal);
  const l = await lihatApp('rusak1'); assert.equal(l.dapatDipulihkan, false); assert.match(l.alasanTolak, /mata pelajaran/);
  await assert.rejects(pulihkanApp(ADM, 'tidak-ada', { now }), { status: 404 });
});

test('lihat: ringkasan apa yang akan kembali, hilang, atau berubah dibanding konfigurasi sekarang', async () => {
  const db = siap(); const now = jam();
  await simpanApp(ADM, { config: cfg('Fiqih', 'Nahwu') }, { now });
  await simpanApp(ADM, { config: cfg('Fiqih', 'Tajwid') }, { now });
  const id = riwayat(db)[0].id;
  const l = await lihatApp(id);
  assert.equal(l.dapatDipulihkan, true); assert.equal(l.meta.alasan, 'sebelum-simpan'); assert.ok(!('data' in l.meta));
  assert.deepEqual(l.perubahan.mapel.kembali, ['Nahwu']); assert.deepEqual(l.perubahan.mapel.hilang, ['Tajwid']);
});

test('Pengaturan AI: simpan dicadangkan TANPA kunci API; pulihkan mengembalikan penyedia dan model, kunci tetap', async () => {
  const db = siap(); const now = jam();
  process.env.CONFIG_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  const KUNCI = 'AIzaSyFAKEFAKEFAKEFAKEFAKE1234567890';
  await simpanAi(ADM, { provider: 'gemini', models: { gemini: 'model-benar' }, keys: { gemini: KUNCI } }, { now });
  await simpanAi(ADM, { models: { gemini: 'model-salah-ketik' } }, { now }); // human error
  const r = riwayat(db, 'configRiwayatAi');
  assert.equal(r.length, 1); assert.equal(r[0].data.models.gemini, 'model-benar'); assert.deepEqual(r[0].data.kunci, { gemini: { last4: KUNCI.slice(-4) } });
  assert.ok(!JSON.stringify(r).includes('v1.') && !JSON.stringify(r).includes(KUNCI) && !JSON.stringify(r).includes('enc')); // tidak ada ciphertext maupun kunci
  const l = await lihatAi(r[0].id); assert.deepEqual(l.perubahan.model, [{ provider: 'gemini', cadangan: 'model-benar', sekarang: 'model-salah-ketik' }]);
  const st = await pulihkanAi(ADM, r[0].id, { now });
  assert.equal(st.models.gemini, 'model-benar'); assert.equal(st.kunci.gemini.tersimpan, true); assert.equal(st.kunci.gemini.last4, KUNCI.slice(-4));
  assert.ok(riwayat(db, 'configRiwayatAi').some((x) => x.alasan === 'sebelum-pulih'));
  delete process.env.CONFIG_ENCRYPTION_KEY;
});

test('/api/config-backup: hanya admin; jenis dan id divalidasi; alur daftar, titik, pulihkan, hapus', async () => {
  const db = siap(); const now = jam();
  const rq = (token, body) => ({ method: 'POST', headers: token ? { authorization: 'Bearer ' + token } : {}, body });
  const mk = () => ({ h: {}, setHeader(k, v) { this.h[k] = v; }, status(c) { this.code = c; return this; }, json(o) { this.body = o; return this; } });
  const jalan = async (token, body) => { const res = mk(); await handler(rq(token, body), res); return res; };
  assert.equal((await jalan(null, { jenis: 'app', aksi: 'daftar' })).code, 401);
  assert.equal((await jalan('pen', { jenis: 'app', aksi: 'daftar' })).code, 403);
  assert.equal((await jalan('adm', { jenis: 'lain', aksi: 'daftar' })).code, 400);
  assert.equal((await jalan('adm', { jenis: 'app', aksi: 'x' })).code, 400);
  await simpanApp(ADM, { config: cfg('A') }, { now }); await simpanApp(ADM, { config: cfg('B') }, { now });
  let res = await jalan('adm', { jenis: 'app', aksi: 'daftar' });
  assert.equal(res.code, 200); assert.equal(res.body.riwayat.length, 1); assert.ok(!('data' in res.body.riwayat[0])); // daftar tanpa isi besar
  const id = res.body.riwayat[0].id;
  res = await jalan('adm', { jenis: 'app', aksi: 'titik', nama: 'Setelan benar' }); assert.equal(res.code, 200); assert.equal(res.body.tipe, 'titik');
  res = await jalan('adm', { jenis: 'app', aksi: 'lihat', id }); assert.equal(res.code, 200); assert.equal(res.body.dapatDipulihkan, true);
  res = await jalan('adm', { jenis: 'app', aksi: 'pulihkan', id }); assert.equal(res.code, 200); assert.deepEqual(res.body.config.mapel.map((m) => m.nama), ['A']);
  res = await jalan('adm', { jenis: 'app', aksi: 'hapus', id }); assert.equal(res.code, 422); // cadangan otomatis tidak bisa dihapus manual
  res = await jalan('adm', { jenis: 'app', aksi: 'pulihkan', id: '../x' }); assert.equal(res.code, 400);
  assert.ok((await daftarRiwayat('app')).length >= 3);
});

test('firestore.rules: koleksi riwayat tertutup untuk klien; ada tes untuk kedua koleksi', () => {
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  for (const k of ['configRiwayatApp', 'configRiwayatAi']) assert.match(rules, new RegExp(`match /${k}/\\{doc\\}\\s*\\{\\s*allow read, write: if false;`));
});
