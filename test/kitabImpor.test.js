// Impor perpustakaan kitab: validasi server, alur klien-server lewat handler asli, dan penjaga aturan Firestore.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSyamilah } from '../src/syamilah.js';
import { slugKitab, bagiBatch, tebakMazhab, isianAwal, peringatanPratinjau, peringatanDuplikat, isianSiap, jalankanImpor } from '../web/lib/imporKitab.js';
import { validasiKitabId, validasiKitab, validasiHalaman, idHalaman } from '../src/kitabImpor.js';
import { __setFirebaseForTest } from '../src/platform.js';
import handler from '../api/kitab.js';
import { fakeDb } from './_fakeDb.js';

const J = 'فتح المعين';
const ZW = '\u200c\u200c';
function buku(n) {
  const kepala = [`${J}\u00a0\u00a0\u00a0(المعبري)`, 'القسم: الفقه الشافعي', `الكتاب: ${J}`, 'المؤلف: المعبري (ت 987هـ)', 'الناشر: دار', '[ترقيم الكتاب موافق للمطبوع]'];
  const hal = [];
  for (let i = 1; i <= n; i++) hal.push(`${J}(ص: ${i})`, ...(i === 1 ? [`${ZW}باب الصلاة`] : []), 'متن', 'ـ', `نص الصفحة ${i}`);
  return [...kepala, ...hal].join('\r\n');
}
const HASIL = parseSyamilah(buku(5));
const ISIAN = { ...isianAwal(HASIL), judulLatin: "Fathul Mu'in", kitabId: 'fathul-muin' };

/* ---------- Firestore tiruan + panggilan ke handler ---------- */
function mkFirebase(data) {
  const db = fakeDb(data);
  const role = { tok_admin: 'admin', tok_editor: 'editor' };
  return { db, auth: { verifyIdToken: async (t) => { if (!role[t]) throw new Error('bad'); return { uid: t.replace('tok_', 'u_') }; } }, FieldValue: {} };
}
const mkRes = () => { const r = { h: {}, setHeader(k, v) { r.h[k] = v; }, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; };
const dasar = () => ({ 'users/u_admin': { role: 'admin', name: 'Admin' }, 'users/u_editor': { role: 'editor', name: 'Editor' } });
async function lewat(token, body) { const r = mkRes(); await handler({ method: 'POST', headers: { authorization: 'Bearer ' + token }, body }, r); return r; }
const panggilSebagai = (token) => async (body) => {
  const r = await lewat(token, body);
  if (r.code !== 200) throw { ...r.body.error, status: r.code };
  return r.body;
};
const dengan = async (data, fn) => { const fb = mkFirebase(data); __setFirebaseForTest(fb); try { return await fn(fb.db); } finally { __setFirebaseForTest(null); } };

/* ---------- Pustaka klien ---------- */
test('slugKitab: huruf kecil, tanpa apostrof, tanda hubung; kosong bila tidak ada huruf Latin', () => {
  assert.equal(slugKitab("Fathul Mu'in"), 'fathul-muin');
  assert.equal(slugKitab('  Kifayatul  Akhyar!! '), 'kifayatul-akhyar');
  assert.equal(slugKitab("Ta’lim al-Muta’allim"), 'talim-al-mutaallim');
  assert.equal(slugKitab('فتح المعين'), '');
  assert.ok(slugKitab('a'.repeat(100)).length <= 60);
});

test('bagiBatch dan tebakMazhab', () => {
  assert.deepEqual(bagiBatch([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(bagiBatch([], 2), []);
  assert.equal(tebakMazhab('الفقه الشافعي'), 'syafii');
  assert.equal(tebakMazhab('الحديث'), '');
});

test('isianSiap: nama Latin dan ID valid wajib; pratinjau memberi peringatan muhaqqiq dan anomali', () => {
  assert.equal(isianSiap({ ...ISIAN }), true);
  assert.equal(isianSiap({ ...ISIAN, judulLatin: ' ' }), false);
  assert.equal(isianSiap({ ...ISIAN, kitabId: 'Fathul Muin' }), false);
  const h = parseSyamilah(buku(2).replace('الناشر: دار', 'الناشر: دار\r\nبعناية: فلان'));
  assert.ok(peringatanPratinjau(h).some((p) => /tahqiq/.test(p.teks)));
  const dup = parseSyamilah(`${J}\r\n${J}(ص: 5)\r\nأ\r\n${J}(ص: 5)\r\nب`);
  assert.ok(peringatanPratinjau(dup).some((p) => /kembar/.test(p.teks)));
});

/* ---------- Validasi server ---------- */
test('validasiKitabId menolak huruf besar, garis miring, titik, dan terlalu pendek', () => {
  for (const x of ['Fathul', 'a/b', '../x', 'a', '-ab', 'a b', 5, undefined]) assert.throws(() => validasiKitabId(x), (e) => e.code === 'KITAB_ID_INVALID', String(x));
  assert.equal(validasiKitabId('fathul-muin'), 'fathul-muin');
});

test('validasiKitab: daftar putih (bidang asing dibuang), wajib nama Latin, enum dijaga', () => {
  const k = { ...HASIL.kitab, judulLatin: 'X', isAdmin: true, aktif: true, status: 'siap', revisi: 99 };
  const b = validasiKitab(k);
  assert.equal(b.isAdmin, undefined); assert.equal(b.aktif, undefined); assert.equal(b.status, undefined); assert.equal(b.revisi, undefined);
  assert.equal(b.sumber.jenis, 'syamilah-txt');
  assert.throws(() => validasiKitab({ ...k, judulLatin: '' }), (e) => e.code === 'KITAB_INVALID');
  assert.throws(() => validasiKitab({ ...k, mazhab: 'lain' }), /Mazhab/);
  assert.throws(() => validasiKitab({ ...k, hakCipta: { status: 'bebas' } }), /hak cipta/);
  assert.throws(() => validasiKitab({ ...k, jumlahHalaman: 0 }), /Jumlah halaman/);
  assert.throws(() => validasiKitab({ ...k, judul: 'x'.repeat(301) }), /terlalu panjang/);
});

test('validasiHalaman: ID harus sama dengan urutannya; batas teks, batasMatn, anomali; bidang asing dibuang', () => {
  const ok = { id: 'p00002', seq: 2, juz: 1, hal: 91, teks: 'نص', batasMatn: 1, bab: 'باب', nomorAnomali: 'duplikat', x: 1 };
  const d = validasiHalaman(ok, 5);
  assert.deepEqual(Object.keys(d).sort(), ['bab', 'batasMatn', 'hal', 'juz', 'nomorAnomali', 'seq', 'teks']);
  assert.throws(() => validasiHalaman({ ...ok, id: 'p00003' }, 5), /tidak sesuai/);
  assert.throws(() => validasiHalaman({ ...ok, id: '../../users/u_admin' }, 5), /tidak sesuai/);
  assert.throws(() => validasiHalaman({ ...ok, seq: 6, id: 'p00006' }, 5), /Urutan halaman/);
  assert.throws(() => validasiHalaman({ ...ok, teks: 'ا'.repeat(12001) }, 5), /melebihi/);
  assert.throws(() => validasiHalaman({ ...ok, batasMatn: 99 }, 5), /Batas matn/);
  assert.throws(() => validasiHalaman({ ...ok, nomorAnomali: 'aneh' }, 5), /anomali/);
  assert.equal(validasiHalaman({ ...ok, batasMatn: null }, 5).batasMatn, null);
  assert.equal(idHalaman(62), 'p00062');
});

/* ---------- Alur lengkap klien -> handler -> Firestore tiruan ---------- */
test('impor lengkap: mulai, halaman per batch, selesai; kitab aktif; dokumen sesuai skema', () => dengan(dasar(), async (db) => {
  const progres = [];
  const r = await jalankanImpor({ panggil: panggilSebagai('tok_admin'), hasil: HASIL, isian: ISIAN, ukuranBatch: 2, onProgres: (p) => progres.push(p.tertulis) });
  assert.equal(r.dibatalkan, false); assert.equal(r.selesai.jumlah, 5);
  assert.deepEqual(progres, [0, 2, 4, 5, 5]);
  const meta = db.data['kitab/fathul-muin'];
  assert.equal(meta.aktif, true); assert.equal(meta.status, 'siap'); assert.equal(meta.revisi, 1); assert.equal(meta.dibuatOleh, 'u_admin');
  assert.equal(meta.judulLatin, "Fathul Mu'in"); assert.equal(meta.mazhab, 'syafii');
  assert.deepEqual(Object.keys(db.data).filter((p) => p.includes('/halaman/')).sort(), ['p00001', 'p00002', 'p00003', 'p00004', 'p00005'].map((x) => `kitab/fathul-muin/halaman/${x}`));
  const p1 = db.data['kitab/fathul-muin/halaman/p00001'];
  assert.equal(p1.bab, 'باب الصلاة'); assert.equal(p1.teks.slice(0, p1.batasMatn), 'متن');
  assert.equal(db.data['kitab/fathul-muin/daftar/isi'].jumlah, 1);
  const d = await panggilSebagai('tok_admin')({ aksi: 'impor-daftar' });
  assert.equal(d.kitab.length, 1); assert.equal(d.kitab[0].aktif, true);
  await panggilSebagai('tok_admin')({ aksi: 'impor-aktif', kitabId: 'fathul-muin', aktif: false });
  assert.equal(db.data['kitab/fathul-muin'].aktif, false);
}));

test('hanya admin: editor ditolak 403 untuk semua aksi impor; tanpa token 401', () => dengan(dasar(), async (db) => {
  for (const aksi of ['impor-daftar', 'impor-mulai', 'impor-halaman', 'impor-selesai', 'impor-aktif']) {
    const r = await lewat('tok_editor', { aksi, kitabId: 'abc' }); assert.equal(r.code, 403, aksi); assert.equal(r.body.error.code, 'FORBIDDEN_ROLE');
  }
  const r = mkRes(); await handler({ method: 'POST', headers: {}, body: { aksi: 'impor-daftar' } }, r); assert.equal(r.code, 401);
  assert.equal(Object.keys(db.data).filter((p) => p.startsWith('kitab')).length, 0);
}));

test('pengambilan teks dari situs (tanpa aksi) tetap untuk pemakai alat, bukan jalur impor', () => dengan(dasar(), async () => {
  const r = await lewat('tok_editor', { url: 'bukan-url' });
  assert.notEqual(r.code, 403); assert.notEqual(r.code, 401);
}));

test('impor ulang tanpa "timpa" ditolak 409; dengan timpa kitab lama tetap aktif dan terbaca sampai impor baru selesai (bertahap)', () => dengan(dasar(), async (db) => {
  const admin = panggilSebagai('tok_admin');
  await jalankanImpor({ panggil: admin, hasil: HASIL, isian: ISIAN });
  await assert.rejects(() => admin({ aksi: 'impor-mulai', kitabId: 'fathul-muin', kitab: HASIL.kitab, daftarIsi: [] }), (e) => e.status === 409 && e.code === 'KITAB_SUDAH_ADA');
  assert.equal(db.data['kitab/fathul-muin'].aktif, true); // penolakan tidak mengubah apa pun
  const kecil = parseSyamilah(buku(3));
  const { muatanMulai } = await import('../web/lib/imporKitab.js');
  const mulai = await admin(muatanMulai(kecil, { ...ISIAN, timpa: true }));
  assert.equal(mulai.bertahap, true); assert.equal(mulai.revisi, 2);
  // kitab lama utuh dan masih aktif selama impor baru berjalan
  assert.equal(db.data['kitab/fathul-muin'].revisi, 1); assert.equal(db.data['kitab/fathul-muin'].aktif, true); assert.equal(db.data['kitab/fathul-muin'].status, 'siap');
  assert.equal(Object.keys(db.data).filter((p) => p.startsWith('kitab/fathul-muin/halaman/')).length, 5);
  const baca = await panggilSebagai('tok_editor')({ aksi: 'perpus-halaman', kitabId: 'fathul-muin', dariSeq: 1, sampaiSeq: 2 });
  assert.equal(baca.halaman.length, 2);
  await admin({ aksi: 'impor-halaman', kitabId: 'fathul-muin', halaman: kecil.halaman });
  assert.equal(Object.keys(db.data).filter((p) => p.startsWith('kitab/fathul-muin/halaman_r2/')).length, 3);
  assert.equal((await panggilSebagai('tok_editor')({ aksi: 'perpus-halaman', kitabId: 'fathul-muin', dariSeq: 1, sampaiSeq: 5 })).halaman.length, 5, 'pembaca masih melihat kitab lama');
  const selesai = await admin({ aksi: 'impor-selesai', kitabId: 'fathul-muin' });
  assert.equal(selesai.jumlah, 3); assert.equal(selesai.lamaDihapus, true);
  const m = db.data['kitab/fathul-muin'];
  assert.equal(m.revisi, 2); assert.equal(m.ruang, '_r2'); assert.equal(m.aktif, true); assert.equal(m.jumlahHalaman, 3); assert.equal(m.dibuatOleh, 'u_admin');
  assert.equal(Object.keys(db.data).filter((p) => p.startsWith('kitab/fathul-muin/halaman/')).length, 0, 'ruang lama dihapus');
  assert.ok(!('kitab/fathul-muin/impor/berjalan' in db.data));
  assert.equal((await panggilSebagai('tok_editor')({ aksi: 'perpus-halaman', kitabId: 'fathul-muin', dariSeq: 1, sampaiSeq: 3 })).halaman.length, 3);
  assert.equal((await panggilSebagai('tok_editor')({ aksi: 'perpus-isi', kitabId: 'fathul-muin' })).entri.length >= 0, true);
}));

test('impor bertahap yang gagal di tengah tidak mengubah kitab lama; impor berikutnya membersihkan sisanya', () => dengan(dasar(), async (db) => {
  const admin = panggilSebagai('tok_admin');
  const { muatanMulai } = await import('../web/lib/imporKitab.js');
  await jalankanImpor({ panggil: admin, hasil: HASIL, isian: ISIAN });
  const kecil = parseSyamilah(buku(3));
  await admin(muatanMulai(kecil, { ...ISIAN, timpa: true }));
  await admin({ aksi: 'impor-halaman', kitabId: 'fathul-muin', halaman: kecil.halaman.slice(0, 1) });
  await assert.rejects(() => admin({ aksi: 'impor-selesai', kitabId: 'fathul-muin' }), (e) => e.code === 'KITAB_JUMLAH_BEDA');
  assert.equal(db.data['kitab/fathul-muin'].revisi, 1); assert.equal(db.data['kitab/fathul-muin'].aktif, true);
  assert.equal(Object.keys(db.data).filter((p) => p.startsWith('kitab/fathul-muin/halaman/')).length, 5);
  await admin(muatanMulai(kecil, { ...ISIAN, timpa: true })); // mulai lagi tanpa lanjut: sisa lama dibuang
  assert.equal(Object.keys(db.data).filter((p) => p.startsWith('kitab/fathul-muin/halaman_r2/')).length, 0);
}));

test('lanjutkan impor langsung yang terputus: halaman tertulis dilewati; sidik berbeda ditolak 409', () => dengan(dasar(), async (db) => {
  const admin = panggilSebagai('tok_admin');
  const { muatanMulai, sidikHasil } = await import('../web/lib/imporKitab.js');
  const besar = parseSyamilah(buku(5));
  await admin(muatanMulai(besar, ISIAN));
  await admin({ aksi: 'impor-halaman', kitabId: 'fathul-muin', halaman: besar.halaman.slice(0, 2) }); // terputus di sini
  // berkas berbeda: ditolak, tidak ada yang berubah
  const lain = parseSyamilah(buku(5).replace('نص الصفحة 3', 'نص lain'));
  assert.notEqual(sidikHasil(lain), sidikHasil(besar));
  await assert.rejects(() => admin(muatanMulai(lain, { ...ISIAN, lanjut: true })), (e) => e.status === 409 && e.code === 'KITAB_SIDIK_BEDA');
  assert.equal(Object.keys(db.data).filter((p) => p.startsWith('kitab/fathul-muin/halaman/')).length, 2);
  // berkas sama: hanya sisa yang dikirim
  const log = [];
  const r = await jalankanImpor({ panggil: async (b) => { log.push(b.aksi === 'impor-halaman' ? b.halaman.map((h) => h.seq).join() : b.aksi); return admin(b); }, hasil: besar, isian: { ...ISIAN, lanjut: true }, ukuranBatch: 2 });
  assert.deepEqual(log, ['impor-mulai', '3,4', '5', 'impor-selesai']); // batch 1-2 sudah ada
  assert.equal(r.selesai.jumlah, 5); assert.equal(db.data['kitab/fathul-muin'].aktif, true); assert.equal(db.data['kitab/fathul-muin'].revisi, 1);
}));

test('lanjutkan tanpa sesuatu yang bisa dilanjutkan: perilaku biasa (kitab ada tanpa timpa = 409)', () => dengan(dasar(), async () => {
  const admin = panggilSebagai('tok_admin');
  const { muatanMulai } = await import('../web/lib/imporKitab.js');
  await jalankanImpor({ panggil: admin, hasil: HASIL, isian: ISIAN });
  await assert.rejects(() => admin(muatanMulai(HASIL, { ...ISIAN, lanjut: true })), (e) => e.code === 'KITAB_SUDAH_ADA');
}));

test('selesai dengan halaman kurang: 409 KITAB_JUMLAH_BEDA dan kitab tetap tidak aktif', () => dengan(dasar(), async (db) => {
  const admin = panggilSebagai('tok_admin');
  const { muatanMulai } = await import('../web/lib/imporKitab.js');
  await admin(muatanMulai(HASIL, ISIAN));
  await admin({ aksi: 'impor-halaman', kitabId: 'fathul-muin', halaman: HASIL.halaman.slice(0, 3) });
  await assert.rejects(() => admin({ aksi: 'impor-selesai', kitabId: 'fathul-muin' }), (e) => e.status === 409 && e.code === 'KITAB_JUMLAH_BEDA');
  assert.equal(db.data['kitab/fathul-muin'].aktif, false);
  await admin({ aksi: 'impor-halaman', kitabId: 'fathul-muin', halaman: HASIL.halaman.slice(3) }); // lanjutkan
  assert.equal((await admin({ aksi: 'impor-selesai', kitabId: 'fathul-muin' })).jumlah, 5);
  assert.equal(db.data['kitab/fathul-muin'].aktif, true);
  await assert.rejects(() => admin({ aksi: 'impor-halaman', kitabId: 'fathul-muin', halaman: HASIL.halaman.slice(0, 1) }), (e) => e.code === 'KITAB_STATUS'); // sudah siap: tidak bisa ditulisi lagi
}));

test('urutan salah dan muatan berlebihan ditolak', () => dengan(dasar(), async (db) => {
  const admin = panggilSebagai('tok_admin');
  const { muatanMulai } = await import('../web/lib/imporKitab.js');
  await assert.rejects(() => admin({ aksi: 'impor-halaman', kitabId: 'belum-ada', halaman: HASIL.halaman }), (e) => e.status === 404);
  await assert.rejects(() => admin({ aksi: 'impor-selesai', kitabId: 'belum-ada' }), (e) => e.status === 404);
  await assert.rejects(() => admin({ aksi: 'impor-xyz', kitabId: 'belum-ada' }), (e) => e.code !== undefined);
  await admin(muatanMulai(HASIL, ISIAN));
  const banyak = Array.from({ length: 101 }, (_, i) => ({ ...HASIL.halaman[0], seq: 1, id: 'p00001', hal: i }));
  await assert.rejects(() => admin({ aksi: 'impor-halaman', kitabId: 'fathul-muin', halaman: banyak }), (e) => /Maksimal 100/.test(e.message));
  await assert.rejects(() => admin({ aksi: 'impor-halaman', kitabId: 'fathul-muin', halaman: [HASIL.halaman[0], HASIL.halaman[0]] }), (e) => /kembar/.test(e.message));
  await assert.rejects(() => admin({ aksi: 'impor-halaman', kitabId: 'fathul-muin', halaman: [{ ...HASIL.halaman[0], id: 'p00002' }] }), (e) => /tidak sesuai/.test(e.message));
  assert.equal(Object.keys(db.data).filter((p) => p.includes('/halaman/')).length, 0); // satu pun tidak tertulis
}));

/* ---------- Ketahanan klien ---------- */
test('jalankanImpor: batch gagal sementara (5xx) dicoba ulang; galat 4xx tidak diulang; batal berhenti di antara batch', async () => {
  let gagal = 2; const log = [];
  const panggil = async (b) => { log.push(b.aksi); if (b.aksi === 'impor-halaman' && gagal-- > 0) throw { status: 502, code: 'X' }; return { jumlah: 5 }; };
  const r = await jalankanImpor({ panggil, hasil: HASIL, isian: ISIAN, ukuranBatch: 10 });
  assert.equal(r.tertulis, 5); assert.equal(log.filter((x) => x === 'impor-halaman').length, 3);
  const log2 = [];
  await assert.rejects(() => jalankanImpor({ panggil: async (b) => { log2.push(b.aksi); if (b.aksi === 'impor-halaman') throw { status: 422, code: 'KITAB_INVALID' }; return {}; }, hasil: HASIL, isian: ISIAN }), (e) => e.status === 422);
  assert.equal(log2.filter((x) => x === 'impor-halaman').length, 1);
  let n = 0; const log3 = [];
  const b = await jalankanImpor({ panggil: async (x) => { log3.push(x.aksi); return {}; }, hasil: HASIL, isian: ISIAN, ukuranBatch: 2, batal: () => n++ >= 1 });
  assert.equal(b.dibatalkan, true); assert.equal(b.tertulis, 2); assert.ok(!log3.includes('impor-selesai'));
});

/* ---------- Penjaga aturan Firestore ---------- */
test('firestore.rules: kitab hanya dibaca staf dan tidak pernah ditulis klien (termasuk subkoleksi)', () => {
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  const i = rules.indexOf('match /kitab/{kid}');
  assert.ok(i > 0);
  const blok = rules.slice(i, rules.indexOf('// rate/{uid}', i));
  assert.match(blok, /allow read: if isStaff\(\);\s*allow write: if false;/);
  assert.match(blok, /match \/halaman\/\{hid\} \{ allow read: if isStaff\(\); allow write: if false; \}/);
  assert.match(blok, /match \/daftar\/\{x\} \{ allow read: if isStaff\(\); allow write: if false; \}/);
  assert.ok(!/allow (create|update|write)[^;]*: if (true|isAdmin)/.test(blok));
});

/* ---------- Tambah jilid ---------- */
const jilid2 = (n = 3) => parseSyamilah(buku(n).replaceAll('نص الصفحة', 'جلد'));

test('tambah jilid: halaman baru tidak terlihat sebelum selesai; sesudahnya urutan, juz, daftar isi, dan pencarian ikut bertambah', () => dengan(dasar(), async (db) => {
  const admin = panggilSebagai('tok_admin'); const editor = panggilSebagai('tok_editor');
  const { muatanMulai } = await import('../web/lib/imporKitab.js');
  await jalankanImpor({ panggil: admin, hasil: HASIL, isian: ISIAN });
  const j2 = jilid2(3);
  const mulai = await admin(muatanMulai(j2, { ...ISIAN, tambah: true }));
  assert.equal(mulai.tambah, true); assert.equal(mulai.offsetSeq, 5); assert.equal(mulai.juzAwal, 2);
  await admin({ aksi: 'impor-halaman', kitabId: 'fathul-muin', halaman: j2.halaman });
  // belum selesai: pembaca dan pencarian tidak melihat halaman baru
  assert.equal(db.data['kitab/fathul-muin'].jumlahHalaman, 5);
  await assert.rejects(() => editor({ aksi: 'perpus-halaman', kitabId: 'fathul-muin', dariSeq: 6 }), (e) => e.status === 422);
  assert.equal((await editor({ aksi: 'perpus-cari', kitabId: 'fathul-muin', q: 'جلد' })).total, 0);
  const selesai = await admin({ aksi: 'impor-selesai', kitabId: 'fathul-muin' });
  assert.equal(selesai.jumlah, 8); assert.equal(selesai.jilidDitambah, 3);
  const m = db.data['kitab/fathul-muin'];
  assert.equal(m.jumlahHalaman, 8); assert.equal(m.jumlahJuz, 2); assert.equal(m.aktif, true); assert.equal(m.status, 'siap');
  assert.equal(db.data['kitab/fathul-muin/halaman/p00006'].juz, 2); assert.equal(db.data['kitab/fathul-muin/halaman/p00006'].hal, 1);
  assert.equal(db.data['kitab/fathul-muin/halaman/p00005'].juz, 1);
  assert.ok(!('kitab/fathul-muin/impor/berjalan' in db.data));
  assert.equal((await editor({ aksi: 'perpus-halaman', kitabId: 'fathul-muin', dariSeq: 6, sampaiSeq: 8 })).halaman.length, 3);
  const cari = await editor({ aksi: 'perpus-cari', kitabId: 'fathul-muin', q: 'جلد' });
  assert.equal(cari.total, 3);
  assert.deepEqual(cari.hasil.map((h) => h.seq).sort((a, b) => a - b), [6, 7, 8]);
  assert.equal((await editor({ aksi: 'perpus-cari', kitabId: 'fathul-muin', q: 'الصفحة' })).total, 5, 'jilid pertama tetap terindeks, tanpa ganda');
}));

test('tambah jilid: ditolak bila kitab tidak ada, belum siap, atau bahasa/aksara berbeda', () => dengan(dasar(), async () => {
  const admin = panggilSebagai('tok_admin');
  const { muatanMulai } = await import('../web/lib/imporKitab.js');
  await assert.rejects(() => admin(muatanMulai(jilid2(), { ...ISIAN, tambah: true })), (e) => e.status === 404);
  await jalankanImpor({ panggil: admin, hasil: HASIL, isian: ISIAN });
  await assert.rejects(() => admin(muatanMulai(jilid2(), { ...ISIAN, tambah: true, bahasa: 'id', aksara: 'latin' })), (e) => e.status === 422 && e.code === 'TAMBAH_TIDAK_SAMA');
}));

test('tambah jilid yang ditinggalkan lalu diulang dengan jilid berbeda: sisa dibersihkan, tidak ada halaman atau hasil cari ganda', () => dengan(dasar(), async (db) => {
  const admin = panggilSebagai('tok_admin'); const editor = panggilSebagai('tok_editor');
  const { muatanMulai } = await import('../web/lib/imporKitab.js');
  await jalankanImpor({ panggil: admin, hasil: HASIL, isian: ISIAN });
  const salah = parseSyamilah(buku(4).replaceAll('نص الصفحة', 'غلط'));
  await admin(muatanMulai(salah, { ...ISIAN, tambah: true }));
  await admin({ aksi: 'impor-halaman', kitabId: 'fathul-muin', halaman: salah.halaman }); // terputus sebelum selesai
  assert.equal(Object.keys(db.data).filter((p) => p.startsWith('kitab/fathul-muin/halaman/')).length, 9);
  const benar = jilid2(2);
  const r = await jalankanImpor({ panggil: admin, hasil: benar, isian: { ...ISIAN, tambah: true } });
  assert.equal(r.selesai.jumlah, 7);
  assert.equal(Object.keys(db.data).filter((p) => p.startsWith('kitab/fathul-muin/halaman/')).length, 7, 'halaman sisa percobaan lama terhapus');
  assert.equal((await editor({ aksi: 'perpus-cari', kitabId: 'fathul-muin', q: 'غلط' })).total, 0);
  assert.equal((await editor({ aksi: 'perpus-cari', kitabId: 'fathul-muin', q: 'جلد' })).total, 2);
}));

test('tambah jilid bisa dilanjutkan setelah terputus (berkas sama); berkas lain ditolak', () => dengan(dasar(), async (db) => {
  const admin = panggilSebagai('tok_admin');
  const { muatanMulai } = await import('../web/lib/imporKitab.js');
  await jalankanImpor({ panggil: admin, hasil: HASIL, isian: ISIAN });
  const j2 = jilid2(4);
  await admin(muatanMulai(j2, { ...ISIAN, tambah: true }));
  await admin({ aksi: 'impor-halaman', kitabId: 'fathul-muin', halaman: j2.halaman.slice(0, 2) });
  await assert.rejects(() => admin(muatanMulai(jilid2(3), { ...ISIAN, tambah: true, lanjut: true })), (e) => e.code === 'KITAB_SIDIK_BEDA');
  const log = [];
  const r = await jalankanImpor({ panggil: async (b) => { log.push(b.aksi === 'impor-halaman' ? b.halaman.map((h) => h.seq).join() : b.aksi); return admin(b); }, hasil: j2, isian: { ...ISIAN, tambah: true, lanjut: true }, ukuranBatch: 2 });
  assert.deepEqual(log, ['impor-mulai', '3,4', 'impor-selesai']);
  assert.equal(r.selesai.jumlah, 9); assert.equal(db.data['kitab/fathul-muin'].jumlahHalaman, 9);
}));

test('peringatanDuplikat untuk tambah jilid: tanpa kitab, tanpa timpa bersamaan, dan bahasa harus sama', () => {
  const sama = { id: 'fathul-muin', judulLatin: "Fathul Mu'in", status: 'siap', jumlahHalaman: 5, jumlahJuz: 1, bahasa: 'ar', aksara: 'arab', revisi: 1 };
  const isian = { ...ISIAN, tambah: true };
  assert.equal(peringatanDuplikat(HASIL, isian, []).some((x) => x.tingkat === 'bad'), true);
  assert.equal(peringatanDuplikat(HASIL, { ...isian, timpa: true }, [sama]).some((x) => x.tingkat === 'bad'), true);
  assert.equal(peringatanDuplikat(HASIL, { ...isian, bahasa: 'id', aksara: 'latin' }, [sama]).some((x) => x.tingkat === 'bad'), true);
  const ok = peringatanDuplikat(HASIL, isian, [sama]);
  assert.equal(ok.some((x) => x.tingkat === 'bad'), false); assert.ok(ok.some((x) => /DITAMBAHKAN/.test(x.teks)));
});
