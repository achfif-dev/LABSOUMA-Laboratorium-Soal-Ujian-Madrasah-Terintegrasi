// Penyesuaian nomor halaman cetak kitab oleh editor/admin: logika murni (web/lib/nomorHalaman.js) dan server (src/kitabNomor.js, /api/kitab aksi perpus-nomor dan perpus-nomor-riwayat).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSyamilah } from '../src/syamilah.js';
import { jalankanImpor, isianAwal } from '../web/lib/imporKitab.js';
import { __setFirebaseForTest } from '../src/platform.js';
import { kosongkanSimpananCari } from '../src/kitabCari.js';
import { aksiNomor } from '../src/kitabNomor.js';
import { periksaOp, hitungNomor, anomaliNomor, tempelNomor, pratinjauKasar, jendelaBaca, MAKS_NOMOR_PER_PANGGILAN } from '../web/lib/nomorHalaman.js';
import { buatPemuat } from '../web/lib/perpus.js';
import { _uji as ujiDaftar } from '../src/daftarKitab.js';
import handler from '../src/rute/kitab.js';
import { fakeDb } from './_fakeDb.js';

const J = 'فتح المعين'; const ZW = '‌‌';
function buku() { // 6 halaman; nomor cetak 1,2,2,3,4,5 (seq 3 kembar dengan seq 2), judul bab di halaman 1
  const kep = [`${J}   (المعبري)`, 'القسم: الفقه الشافعي', `الكتاب: ${J}`, 'المؤلف: المعبري (ت 987هـ)'];
  const nomor = [1, 2, 2, 3, 4, 5];
  const isi = nomor.flatMap((n, i) => [`${J}(ص: ${n})`, ...(i === 0 ? [`${ZW}باب الصلاة`] : []), `متن ${i + 1}`, 'ـ', `شرح الصفحة ${i + 1}`]);
  return [...kep, ...isi].join('\r\n');
}
const HASIL = parseSyamilah(buku());
const mkRes = () => { const r = { h: {}, setHeader(k, v) { r.h[k] = v; }, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; };
const fb = (data) => ({ db: fakeDb(data), auth: { verifyIdToken: async (t) => ({ uid: t.replace('tok_', 'u_'), name: 'Nama ' + t.replace('tok_', '') }) }, FieldValue: {} });
const lewat = async (token, body) => { const r = mkRes(); await handler({ method: 'POST', headers: { authorization: 'Bearer ' + token }, body }, r); return r; };
const sebagai = (token) => async (body) => { const r = await lewat(token, body); if (r.code !== 200) throw { ...r.body.error, status: r.code }; return r.body; };
async function siapkan(fn) {
  const f = fb({ 'users/u_admin': { role: 'admin' }, 'users/u_editor': { role: 'editor' }, 'users/u_penyusun': { role: 'penyusun' }, 'users/u_ustadz': { role: 'ustadz' } });
  __setFirebaseForTest(f); kosongkanSimpananCari(); ujiDaftar.reset();
  try {
    await jalankanImpor({ panggil: sebagai('tok_admin'), hasil: HASIL, isian: { ...isianAwal(HASIL), judulLatin: "Fathul Mu'in", kitabId: 'fathul-muin' } });
    return await fn(f.db);
  } finally { __setFirebaseForTest(null); kosongkanSimpananCari(); ujiDaftar.reset(); }
}
const K = 'fathul-muin'; const HAL = (db, s) => db.data[`kitab/${K}/halaman/p${String(s).padStart(5, '0')}`];
const labels = (db) => [1, 2, 3, 4, 5, 6].map((s) => HAL(db, s).hal);
let nOp = 0; const op = () => `op-uji-${String(++nOp).padStart(6, '0')}`;
const N = (jenis, lain) => ({ aksi: 'perpus-nomor', kitabId: K, op: op(), jenis, ...lain });

/* ---------- Logika murni ---------- */
const hal = (seq, h, extra = {}) => ({ seq, hal: h, juz: 1, ...extra });

test('periksaOp: menolak masukan cacat dengan pesan yang bisa dibaca', () => {
  assert.ok(periksaOp(null, 6).galat);
  assert.match(periksaOp({ jenis: 'lain', dari: 1 }, 6).galat, /satu|geser|urut/);
  assert.ok(periksaOp({ jenis: 'geser', dari: 0, selisih: 1 }, 6).galat);
  assert.ok(periksaOp({ jenis: 'geser', dari: 1, sampai: 7, selisih: 1 }, 6).galat);
  assert.ok(periksaOp({ jenis: 'geser', dari: 4, sampai: 3, selisih: 1 }, 6).galat);
  assert.match(periksaOp({ jenis: 'geser', dari: 1, sampai: 2, selisih: 0 }, 6).galat, /selain 0/);
  assert.ok(periksaOp({ jenis: 'geser', dari: 1, sampai: 2, selisih: 1.5 }, 6).galat);
  assert.ok(periksaOp({ jenis: 'urut', dari: 1, sampai: 2, mulai: -1 }, 6).galat);
  assert.ok(periksaOp({ jenis: 'urut', dari: 1, sampai: 2, mulai: 100000 }, 6).galat);
  assert.ok(periksaOp({ jenis: 'satu', dari: 1, sampai: 2, hal: 5 }, 6).galat);
  assert.ok(periksaOp({ jenis: 'satu', dari: 1, hal: 5, juz: 0 }, 6).galat);
  assert.ok(periksaOp({ jenis: 'satu', dari: 1, hal: '5' }, 6).galat);
  assert.match(periksaOp({ jenis: 'geser', dari: 1, sampai: 1000, selisih: 1 }, 5000).galat, new RegExp(String(MAKS_NOMOR_PER_PANGGILAN)));
  assert.deepEqual(periksaOp({ jenis: 'geser', dari: 1, sampai: 3, selisih: -2, juz: 2, ekstra: 'dibuang' }, 6).op, { jenis: 'geser', dari: 1, sampai: 3, selisih: -2, juz: 2 });
  assert.deepEqual(periksaOp({ jenis: 'satu', dari: 2, hal: 0 }, 6).op, { jenis: 'satu', dari: 2, sampai: 2, hal: 0 });
});

test('hitungNomor geser: semua nomor bergeser, nomor kembar bawaan tetap, halaman sesudah rentang dinilai ulang', () => {
  const h = [hal(1, 1), hal(2, 2), hal(3, 2, { nomorAnomali: 'duplikat' }), hal(4, 3), hal(5, 4)];
  const r = hitungNomor(h, { jenis: 'geser', dari: 1, sampai: 3, selisih: 30 });
  assert.deepEqual(r.ubah.filter((u) => u.labelBerubah).map((u) => [u.seq, u.hal]), [[1, 31], [2, 32], [3, 32]]);
  assert.equal(r.jumlahLabel, 3); assert.equal(r.akhir, 3); assert.equal(r.halTerakhir, 32);
  const sesudah = r.ubah.find((u) => u.seq === 4); // 3 sesudah 32: sekarang mundur; ini bukan perubahan nomor halaman 4
  assert.equal(sesudah.labelBerubah, false); assert.equal(sesudah.nomorAnomali, 'mundur');
  assert.equal(r.ubah.find((u) => u.seq === 3).nomorAnomali, 'duplikat'); // tetap kembar
});

test('hitungNomor urut: nomori ulang berurutan, bagian halaman terbelah ikut nomor bagian pertama, anomali hilang', () => {
  const h = [hal(1, 5), hal(2, 9, { potongan: { ke: 1, dari: 2 } }), hal(3, 9, { potongan: { ke: 2, dari: 2 } }), hal(4, 9), hal(5, 20, { nomorAnomali: 'lompat' })];
  const r = hitungNomor(h, { jenis: 'urut', dari: 1, sampai: 5, mulai: 100 });
  assert.deepEqual(r.ubah.filter((u) => u.labelBerubah).map((u) => u.hal), [100, 101, 101, 102, 103]);
  assert.equal(r.halTerakhir, 103);
  assert.ok(r.ubah.every((u) => !u.nomorAnomali), 'tidak ada anomali sesudah dinomori ulang');
});

test('hitungNomor satu: bagian terbelah ikut; mulai dari bagian lanjutan ditolak; rentang kosong dan melewati batas ditolak', () => {
  const h = [hal(1, 5), hal(2, 6, { potongan: { ke: 1, dari: 3 } }), hal(3, 6, { potongan: { ke: 2, dari: 3 } }), hal(4, 6, { potongan: { ke: 3, dari: 3 } }), hal(5, 7)];
  const r = hitungNomor(h, { jenis: 'satu', dari: 2, sampai: 2, hal: 40 });
  assert.deepEqual(r.ubah.filter((u) => u.labelBerubah).map((u) => [u.seq, u.hal]), [[2, 40], [3, 40], [4, 40]]);
  assert.equal(r.akhir, 4);
  assert.equal(r.ubah.find((u) => u.seq === 5).nomorAnomali, 'mundur'); // 7 sesudah 40
  assert.match(hitungNomor(h, { jenis: 'satu', dari: 3, sampai: 3, hal: 1 }).galat, /bagian pertamanya \(urutan 2\)/);
  assert.match(hitungNomor(h, { jenis: 'geser', dari: 1, sampai: 2, selisih: -6 }).galat, /batas nomor halaman/);
  assert.match(hitungNomor(h, { jenis: 'geser', dari: 1, sampai: 2, selisih: 99999 }).galat, /batas nomor halaman/);
  assert.match(hitungNomor([hal(1, 1)], { jenis: 'geser', dari: 1, sampai: 2, selisih: 1 }).galat, /urutan 2 tidak ditemukan/);
});

test('hitungNomor juz: juz bisa diganti; awal jilid baru yang nomornya kecil bukan anomali', () => {
  const h = [hal(1, 50), hal(2, 51), hal(3, 52)];
  const r = hitungNomor(h, { jenis: 'urut', dari: 2, sampai: 3, mulai: 1, juz: 2 });
  assert.deepEqual(r.ubah.map((u) => [u.seq, u.hal, u.juz, u.nomorAnomali]), [[2, 1, 2, null], [3, 2, 2, null]]);
  assert.equal(anomaliNomor({ hal: 3, juz: 1 }, { hal: 3, juz: 2 }), null);
  assert.equal(anomaliNomor({ hal: 3, juz: 1 }, { hal: 3, juz: 1 }), 'duplikat');
});

test('pratinjauKasar dan jendelaBaca', () => {
  assert.deepEqual(pratinjauKasar({ jenis: 'geser', selisih: 30 }, { hal: 1 }, { hal: 400 }), { awal: 31, akhir: 430 });
  assert.deepEqual(pratinjauKasar({ jenis: 'urut', mulai: 7 }, { hal: 1 }, null), { awal: 7, akhir: null });
  assert.equal(pratinjauKasar({ jenis: 'satu', hal: 1 }, null, null), null);
  assert.deepEqual(jendelaBaca(1, 5, 6), { dari: 1, sampai: 6 });
  assert.deepEqual(jendelaBaca(10, 20, 500), { dari: 9, sampai: 32 });
});

test('tempelNomor: halaman dan daftar isi di simpanan memakai nomor baru, teks tetap, tanda anomali dicabut', () => {
  const kunci = (id, s) => `${id}:${s}`;
  const simpanan = { halaman: new Map([[kunci('k', 2), { seq: 2, hal: 2, juz: 1, teks: 'x', nomorAnomali: 'duplikat', rev: 3 }], [kunci('k', 3), { seq: 3, hal: 3, juz: 1, teks: 'y' }]]), isi: new Map([['k', { rev: 1, entri: [{ judul: 'a', seq: 2, hal: 2, juz: 1 }, { judul: 'b', seq: 3, hal: 3, juz: 1 }] }]]) };
  const isiLama = simpanan.isi.get('k');
  tempelNomor(simpanan, 'k', [{ seq: 2, hal: 12, juz: 1, nomorAnomali: null }, { seq: 9, hal: 5, juz: 1, nomorAnomali: null }], kunci);
  assert.deepEqual(simpanan.halaman.get(kunci('k', 2)), { seq: 2, hal: 12, juz: 1, teks: 'x', rev: 3 });
  assert.equal(simpanan.halaman.get(kunci('k', 3)).hal, 3);
  assert.equal(simpanan.halaman.has(kunci('k', 9)), false);
  assert.notEqual(simpanan.isi.get('k'), isiLama, 'objek baru supaya layar tergambar ulang');
  assert.deepEqual(simpanan.isi.get('k').entri.map((e) => e.hal), [12, 3]);
  assert.equal(simpanan.isi.get('k').rev, 1);
});

/* ---------- Server ---------- */
test('hanya editor dan admin; penyusun, ustadz, tanpa token ditolak sebelum ada yang tertulis', () => siapkan(async (db) => {
  const sebelum = labels(db);
  for (const t of ['tok_penyusun', 'tok_ustadz']) {
    assert.equal((await lewat(t, N('geser', { dari: 1, sampai: 6, selisih: 5 }))).code, 403, t);
    assert.equal((await lewat(t, { aksi: 'perpus-nomor-riwayat', kitabId: K })).code, 403, t);
  }
  { const r = mkRes(); await handler({ method: 'POST', headers: {}, body: N('geser', { dari: 1, sampai: 6, selisih: 5 }) }, r); assert.equal(r.code, 401); }
  assert.deepEqual(labels(db), sebelum);
  // lapis kedua: modul menolak sendiri
  await assert.rejects(() => aksiNomor({ op: op(), jenis: 'geser', dari: 1, sampai: 2, selisih: 1 }, K, db.data[`kitab/${K}`], { uid: 'x', role: 'penyusun' }), (e) => e.status === 403);
  await assert.rejects(() => aksiNomor({ op: op(), jenis: 'geser', dari: 1, sampai: 2, selisih: 1 }, K, db.data[`kitab/${K}`], null), (e) => e.status === 403);
  assert.equal((await sebagai('tok_editor')(N('geser', { dari: 1, sampai: 6, selisih: 5 }))).ok, true);
}));

test('masukan cacat ditolak 422 tanpa menulis apa pun; yang cacat bentuknya bahkan tidak memakai jatah batas laju', () => siapkan(async (db) => {
  const tanpaRate = () => JSON.stringify(Object.fromEntries(Object.entries(db.data).filter(([p]) => !p.startsWith('rate/'))));
  const sebelum = tanpaRate(); const e = sebagai('tok_editor');
  const tolak422 = (b) => assert.rejects(() => e(b), (x) => x.status === 422, JSON.stringify(b).slice(0, 80));
  // cacat bentuk: ditolak di rute sebelum batas laju dihitung
  for (const b of [
    N('geser', { dari: 1, sampai: 6, selisih: 0 }), N('urut', { dari: 1, sampai: 3, mulai: -4 }), N('pulih', { riwayatId: '../../x' }),
    { ...N('geser', { dari: 1, sampai: 3, selisih: 1 }), op: 'x' }, { ...N('geser', { dari: 1, sampai: 3, selisih: 1 }), catatan: 'x'.repeat(301) },
  ]) await tolak422(b);
  assert.equal(db.data['rate/u_editor_kitabnomor'], undefined);
  // cacat yang baru diketahui server (rute tidak tahu jumlah halaman kitab): tetap 422 dan tidak menulis apa pun selain penghitung laju
  for (const b of [N('geser', { dari: 1, sampai: 7, selisih: 1 }), N('geser', { dari: 1, sampai: 3, selisih: 99999 })]) await tolak422(b);
  assert.equal(tanpaRate(), sebelum);
}));

test('geser: halaman, daftar isi, indeks cari, dan metadata ikut berubah dalam satu proses; teks dan rev tidak berubah', () => siapkan(async (db) => {
  const e = sebagai('tok_editor');
  const teks = HAL(db, 4).teks; const isiLama = db.data[`kitab/${K}/daftar/isi`].entri.map((x) => ({ ...x }));
  assert.equal(HAL(db, 3).nomorAnomali, 'duplikat');
  const r = await e(N('geser', { dari: 1, sampai: 6, selisih: 30, catatan: 'cetakan Dar al-Fikr' }));
  assert.equal(r.ok, true); assert.equal(r.jumlah, 6); assert.equal(r.akhir, 6); assert.equal(r.halTerakhir, 35);
  assert.deepEqual(labels(db), [31, 32, 32, 33, 34, 35]);
  assert.equal(HAL(db, 4).teks, teks); assert.equal(HAL(db, 4).rev, undefined, 'rev koreksi teks tidak naik');
  assert.equal(HAL(db, 3).nomorAnomali, 'duplikat', 'nomor kembar bawaan kitab tetap kembar');
  assert.equal(HAL(db, 4).nomorDisunting.nama, 'Nama editor');
  // daftar isi: label mengikuti, judul dan suntingRev tidak berubah
  const isi = db.data[`kitab/${K}/daftar/isi`]; assert.deepEqual(isi.entri.map((x) => x.hal), isiLama.map((x) => x.hal + 30)); assert.deepEqual(isi.entri.map((x) => x.judul), isiLama.map((x) => x.judul)); assert.equal(isi.suntingRev, undefined);
  // indeks cari: h dan j
  const potongan = Object.entries(db.data).filter(([p]) => p.startsWith(`kitab/${K}/cari/c`)).map(([, v]) => v);
  assert.ok(potongan.length > 0); assert.deepEqual(potongan.flatMap((x) => x.h), [31, 32, 32, 33, 34, 35]);
  // metadata dan riwayat
  assert.equal(db.data[`kitab/${K}`].nomorDisunting, 1);
  const rw = db.data[`kitab/${K}/nomorRiwayat/${r.riwayatId}`];
  assert.deepEqual(rw.lama.map((x) => x[1]), [1, 2, 2, 3, 4, 5]); assert.deepEqual(rw.baru.map((x) => x[1]), [31, 32, 32, 33, 34, 35]); assert.equal(rw.catatan, 'cetakan Dar al-Fikr');
  // dibaca lewat server: cari menurut nomor cetak baru
  const u = sebagai('tok_ustadz');
  assert.deepEqual((await u({ aksi: 'perpus-halaman', kitabId: K, hal: 33 })).halaman.map((p) => p.seq), [4]);
  assert.deepEqual((await u({ aksi: 'perpus-halaman', kitabId: K, hal: 3 })).halaman, []);
}));

test('pencarian teks tidak memakai nomor lama dari simpanan memori sesudah nomor disesuaikan', () => siapkan(async () => {
  const e = sebagai('tok_editor');
  let c = await e({ aksi: 'perpus-cari', kitabId: K, q: 'الصفحة 4' }); // membangun dan menyimpan indeks di memori
  assert.equal(c.hasil[0].hal, 3);
  await e(N('geser', { dari: 1, sampai: 6, selisih: 100 }));
  c = await e({ aksi: 'perpus-cari', kitabId: K, q: 'الصفحة 4' });
  assert.equal(c.hasil[0].hal, 103, 'kunci simpanan memuat penghitung nomorDisunting');
}));

test('urut memperbaiki nomor kembar: tanda anomali halaman itu hilang', () => siapkan(async (db) => {
  const r = await sebagai('tok_editor')(N('urut', { dari: 1, sampai: 6, mulai: 1 }));
  assert.deepEqual(labels(db), [1, 2, 3, 4, 5, 6]); assert.equal(r.jumlah, 4); // seq 1 dan 2 sudah benar
  assert.equal(HAL(db, 3).nomorAnomali, undefined);
  assert.ok(r.halaman.some((p) => p.seq === 3 && p.nomorAnomali === null));
}));

test('satu pada halaman cetak yang dibagi: bagian lanjutan ikut; mulai dari bagian lanjutan ditolak 422', () => siapkan(async (db) => {
  db.data[`kitab/${K}/halaman/p00002`].potongan = { ke: 1, dari: 2 }; db.data[`kitab/${K}/halaman/p00003`].potongan = { ke: 2, dari: 2 };
  const e = sebagai('tok_editor');
  await assert.rejects(() => e(N('satu', { dari: 3, hal: 50 })), (x) => x.status === 422 && /bagian pertamanya/.test(x.message));
  const r = await e(N('satu', { dari: 2, hal: 50 }));
  assert.equal(r.akhir, 3); assert.deepEqual(labels(db), [1, 50, 50, 3, 4, 5]);
  assert.equal(HAL(db, 3).nomorAnomali, undefined); assert.equal(HAL(db, 4).nomorAnomali, 'mundur');
}));

test('ulangan dengan kunci op yang sama (jaringan putus) tidak menggeser dua kali; op baru tetap diproses', () => siapkan(async (db) => {
  const e = sebagai('tok_editor'); const b = N('geser', { dari: 1, sampai: 6, selisih: 10 });
  const r1 = await e(b); assert.equal(r1.tidakBerubah, false);
  const r2 = await e(b); assert.equal(r2.diulang, true); assert.equal(r2.tidakBerubah, true);
  assert.deepEqual(labels(db), [11, 12, 12, 13, 14, 15]); assert.equal(db.data[`kitab/${K}`].nomorDisunting, 1);
  assert.equal((await e({ ...b, op: op() })).jumlah, 6); assert.deepEqual(labels(db), [21, 22, 22, 23, 24, 25]);
}));

test('nomor yang sudah sesuai: tidak ada penulisan dan tidak ada riwayat', () => siapkan(async (db) => {
  const e = sebagai('tok_editor');
  const r = await e(N('urut', { dari: 1, sampai: 2, mulai: 1 }));
  assert.equal(r.tidakBerubah, true); assert.equal(r.jumlah, 0);
  assert.equal(db.data[`kitab/${K}`].nomorDisunting, undefined);
  assert.equal(Object.keys(db.data).some((p) => p.includes('/nomorRiwayat/')), false);
}));

test('hasil di luar batas nomor, atau melewati halaman: ditolak seluruhnya, tidak ada yang tertulis', () => siapkan(async (db) => {
  const tanpaRate = () => JSON.stringify(Object.fromEntries(Object.entries(db.data).filter(([p]) => !p.startsWith('rate/')))); // penghitung batas laju memang bertambah
  const sebelum = tanpaRate();
  await assert.rejects(() => sebagai('tok_editor')(N('geser', { dari: 1, sampai: 6, selisih: -3 })), (x) => x.status === 422 && /batas nomor halaman/.test(x.message));
  assert.equal(tanpaRate(), sebelum);
}));

test('pulih: mengembalikan nomor lama, lalu tidak bisa dipulihkan dua kali; tidak bisa bila nomor sudah diubah lagi', () => siapkan(async (db) => {
  const e = sebagai('tok_editor');
  const a = await e(N('geser', { dari: 1, sampai: 6, selisih: 30 }));
  const b = await e(N('geser', { dari: 2, sampai: 3, selisih: 5 }));
  await assert.rejects(() => e({ aksi: 'perpus-nomor', kitabId: K, op: op(), jenis: 'pulih', riwayatId: a.riwayatId }), (x) => x.status === 409 && x.code === 'NOMOR_BERUBAH');
  const p1 = await e({ aksi: 'perpus-nomor', kitabId: K, op: op(), jenis: 'pulih', riwayatId: b.riwayatId });
  assert.equal(p1.ok, true); assert.equal(p1.jenis, 'pulih'); assert.deepEqual(labels(db), [31, 32, 32, 33, 34, 35]);
  await assert.rejects(() => e({ aksi: 'perpus-nomor', kitabId: K, op: op(), jenis: 'pulih', riwayatId: b.riwayatId }), (x) => x.status === 409 && x.code === 'NOMOR_SUDAH_DIPULIHKAN');
  await e({ aksi: 'perpus-nomor', kitabId: K, op: op(), jenis: 'pulih', riwayatId: a.riwayatId });
  assert.deepEqual(labels(db), [1, 2, 2, 3, 4, 5]); assert.equal(HAL(db, 3).nomorAnomali, 'duplikat');
  const potongan = Object.entries(db.data).filter(([p]) => p.startsWith(`kitab/${K}/cari/c`)).flatMap(([, v]) => v.h); assert.deepEqual(potongan, [1, 2, 2, 3, 4, 5]);
  await assert.rejects(() => e({ aksi: 'perpus-nomor', kitabId: K, op: op(), jenis: 'pulih', riwayatId: '20260101000000_zzzzz' }), (x) => x.status === 404);
}));

test('riwayat: terbaru di atas, memuat contoh nomor lama dan baru, menandai yang sudah dipulihkan', () => siapkan(async () => {
  const e = sebagai('tok_editor');
  const a = await e(N('geser', { dari: 1, sampai: 6, selisih: 30 }));
  await new Promise((r) => setTimeout(r, 5));
  const b = await e(N('urut', { dari: 1, sampai: 6, mulai: 1, catatan: 'rapikan' }));
  await new Promise((r) => setTimeout(r, 5));
  await e({ aksi: 'perpus-nomor', kitabId: K, op: op(), jenis: 'pulih', riwayatId: b.riwayatId });
  const r = await e({ aksi: 'perpus-nomor-riwayat', kitabId: K });
  assert.equal(r.jumlah, 3); assert.equal(r.riwayat[0].jenis, 'pulih'); assert.equal(r.riwayat[1].jenis, 'urut'); assert.equal(r.riwayat[1].dipulihkan, true); assert.equal(r.riwayat[2].id, a.riwayatId);
  assert.deepEqual(r.riwayat[2].sampel.awal, { seq: 1, dari: 1, jadi: 31 }); assert.deepEqual(r.riwayat[2].parameter, { selisih: 30 });
}));

test('sesuaiCetak hanya admin; menghapus peringatan halaman virtual dan daftar kitab langsung mengikutinya', () => siapkan(async (db) => {
  db.data[`kitab/${K}`].halamanVirtual = true;
  const daftar0 = await sebagai('tok_editor')({ aksi: 'perpus-daftar' }); assert.equal(daftar0.kitab[0].halamanVirtual, true);
  await assert.rejects(() => sebagai('tok_editor')(N('geser', { dari: 1, sampai: 6, selisih: 5, sesuaiCetak: true })), (x) => x.status === 403);
  assert.equal(db.data[`kitab/${K}`].halamanVirtual, true);
  const r = await sebagai('tok_admin')(N('geser', { dari: 1, sampai: 6, selisih: 5, sesuaiCetak: true }));
  assert.equal(r.sesuaiCetak, true); assert.equal(db.data[`kitab/${K}`].halamanVirtual, false); assert.equal(db.data[`kitab/${K}`].penomoranSesuaiCetak, true);
  const daftar1 = await sebagai('tok_editor')({ aksi: 'perpus-daftar' }); assert.equal(daftar1.kitab[0].halamanVirtual, false);
}));

test('impor-daftar melaporkan penghitung nomorDisunting (peringatan sebelum "timpa")', () => siapkan(async () => {
  await sebagai('tok_editor')(N('geser', { dari: 1, sampai: 6, selisih: 5 }));
  const d = await sebagai('tok_admin')({ aksi: 'impor-daftar' });
  assert.equal(d.kitab.find((k) => k.id === K).nomorDisunting, 1);
}));

test('pemuat klien: pem.nomor menempel ke simpanan sehingga halaman dan daftar isi yang sudah dibaca langsung bernomor baru', () => siapkan(async () => {
  const pem = buatPemuat(sebagai('tok_editor'));
  const sebelum = await pem.halaman(K, 1, 6, 6); assert.deepEqual(sebelum.map((p) => p.hal), [1, 2, 2, 3, 4, 5]);
  const isi = await pem.isi(K);
  await pem.nomor(K, { op: op(), jenis: 'geser', dari: 1, sampai: 6, selisih: 7 });
  const sesudah = await pem.halaman(K, 1, 6, 6);
  assert.deepEqual(sesudah.map((p) => p.hal), [8, 9, 9, 10, 11, 12]); assert.equal(sesudah[3].teks, sebelum[3].teks);
  assert.equal(pem.simpanan.isi.get(K).entri[0].hal, isi.entri[0].hal + 7);
  const lagi = await pem.nomorRiwayat(K); assert.equal(lagi.jumlah, 1);
}));
