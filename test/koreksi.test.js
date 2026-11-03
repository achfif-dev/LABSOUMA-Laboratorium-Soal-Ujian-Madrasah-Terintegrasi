// Koreksi teks halaman kitab oleh editor/admin: server (src/kitabKoreksi.js, /api/kitab aksi perpus-koreksi dan perpus-riwayat) dan logika murni (web/lib/koreksi.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSyamilah } from '../src/syamilah.js';
import { jalankanImpor, isianAwal } from '../web/lib/imporKitab.js';
import { __setFirebaseForTest } from '../src/platform.js';
import { kosongkanSimpananCari } from '../src/kitabCari.js';
import { aksiKoreksi } from '../src/kitabKoreksi.js';
import { bersihkanTeksKoreksi, gabungMatnSyarah, bagianSunting, hasilSunting, bedaTeks, ringkasBeda, MAKS_TEKS_KOREKSI } from '../web/lib/koreksi.js';
import { buatPemuat } from '../web/lib/perpus.js';
import handler from '../api/kitab.js';
import { fakeDb } from './_fakeDb.js';

const J = 'فتح المعين'; const ZW = '‌‌';
function buku() { // 6 halaman, tiap halaman: matn "متن N" + syarah "شرح الصفحة N" (pemisah tatwil)
  const kep = [`${J}   (المعبري)`, 'القسم: الفقه الشافعي', `الكتاب: ${J}`, 'المؤلف: المعبري (ت 987هـ)'];
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
  __setFirebaseForTest(f); kosongkanSimpananCari();
  try {
    await jalankanImpor({ panggil: sebagai('tok_admin'), hasil: HASIL, isian: { ...isianAwal(HASIL), judulLatin: "Fathul Mu'in", kitabId: 'fathul-muin' } });
    return await fn(f.db);
  } finally { __setFirebaseForTest(null); kosongkanSimpananCari(); }
}
const hal = async (u, seq) => (await u({ aksi: 'perpus-halaman', kitabId: 'fathul-muin', dariSeq: seq })).halaman[0];
const K = { aksi: 'perpus-koreksi', kitabId: 'fathul-muin' };

/* ---------- Server ---------- */
test('hanya editor dan admin yang boleh mengoreksi dan melihat riwayat; penyusun, ustadz, tanpa token ditolak', () => siapkan(async (db) => {
  for (const t of ['tok_penyusun', 'tok_ustadz']) {
    assert.equal((await lewat(t, { ...K, seq: 1, rev: 0, matn: 'x', syarah: 'y' })).code, 403, t);
    assert.equal((await lewat(t, { aksi: 'perpus-riwayat', kitabId: 'fathul-muin', seq: 1 })).code, 403, t);
  }
  { const r = mkRes(); await handler({ method: 'POST', headers: {}, body: { ...K, seq: 1, rev: 0, matn: 'x', syarah: 'y' } }, r); assert.equal(r.code, 401); }
  assert.equal(db.data['kitab/fathul-muin/halaman/p00001'].teks.includes('متن 1'), true); // tidak ada yang tertulis
  const r = await sebagai('tok_editor')({ ...K, seq: 1, rev: 0, matn: 'متن 1 مصحح', syarah: 'شرح الصفحة 1' });
  assert.equal(r.ok, true);
  // lapis kedua: modul menolak sendiri bila dipanggil tanpa peran yang sah
  await assert.rejects(() => aksiKoreksi({ seq: 1, rev: 0 }, 'fathul-muin', db.data['kitab/fathul-muin'], { uid: 'x', role: 'penyusun' }), (e) => e.status === 403);
  await assert.rejects(() => aksiKoreksi({ seq: 1, rev: 0 }, 'fathul-muin', db.data['kitab/fathul-muin'], null), (e) => e.status === 403);
}));

test('koreksi halaman bermatn: teks dan batas matn dihitung ulang, rev naik, riwayat dan penghitung tercatat; pembacaan berikutnya memakai teks baru', () => siapkan(async (db) => {
  const u = sebagai('tok_editor');
  const sebelum = await hal(u, 2);
  assert.equal(sebelum.rev, undefined); assert.equal(sebelum.dikoreksi, undefined);
  const r = await u({ ...K, seq: 2, rev: 0, matn: '  متن ٢ المصحح  ', syarah: 'شرح\r\nالصفحة 2 المصحح', catatan: 'cocokkan hal. 2' });
  assert.equal(r.ok, true); assert.equal(r.tidakBerubah, false);
  assert.equal(r.halaman.teks, 'متن ٢ المصحح\nشرح\nالصفحة 2 المصحح');
  assert.equal(r.halaman.batasMatn, 'متن ٢ المصحح'.length);
  assert.equal(r.halaman.rev, 1); assert.equal(r.halaman.dikoreksi, true); assert.equal(r.halaman.diverifikasi, undefined);
  const tersimpan = db.data['kitab/fathul-muin/halaman/p00002'];
  assert.equal(tersimpan.seq, 2); assert.equal(tersimpan.hal, 2); assert.equal(tersimpan.rev, 1);
  assert.equal(tersimpan.dikoreksi.oleh, 'u_editor'); assert.equal(tersimpan.dikoreksi.nama, 'Nama editor'); assert.equal(tersimpan.dikoreksi.jumlah, 1);
  const riw = Object.entries(db.data).filter(([k]) => k.startsWith('kitab/fathul-muin/koreksi/'));
  assert.equal(riw.length, 1);
  assert.equal(riw[0][1].teksLama, sebelum.teks); assert.equal(riw[0][1].teksBaru, tersimpan.teks); assert.equal(riw[0][1].catatan, 'cocokkan hal. 2'); assert.equal(riw[0][1].jenis, 'koreksi');
  assert.equal(db.data['kitab/fathul-muin'].koreksi, 1);
  const baca = await hal(sebagai('tok_penyusun'), 2); // semua peran membaca versi koreksi
  assert.equal(baca.teks, tersimpan.teks); assert.equal(baca.rev, 1);
  // halaman lain tidak tersentuh
  assert.equal((await hal(u, 3)).rev, undefined);
}));

test('bentrok: rev lama ditolak 409 tanpa menulis apa pun; rev terbaru diterima', () => siapkan(async (db) => {
  const a = sebagai('tok_editor'); const b = sebagai('tok_admin');
  await a({ ...K, seq: 3, rev: 0, matn: 'A', syarah: 'B' });
  const sebelum = JSON.stringify(db.data['kitab/fathul-muin/halaman/p00003']);
  await assert.rejects(() => b({ ...K, seq: 3, rev: 0, matn: 'C', syarah: 'D' }), (e) => e.status === 409 && e.code === 'KOREKSI_BENTROK');
  assert.equal(JSON.stringify(db.data['kitab/fathul-muin/halaman/p00003']), sebelum);
  assert.equal(Object.keys(db.data).filter((k) => k.startsWith('kitab/fathul-muin/koreksi/')).length, 1);
  assert.equal(db.data['kitab/fathul-muin'].koreksi, 1);
  const r = await b({ ...K, seq: 3, rev: 1, matn: 'C', syarah: 'D' });
  assert.equal(r.halaman.rev, 2); assert.equal(db.data['kitab/fathul-muin/halaman/p00003'].dikoreksi.jumlah, 2);
}));

test('tanpa perubahan tidak menulis; "cocok" saja mencatat verifikasi tanpa menaikkan penghitung atau menyentuh indeks; teks berubah tanpa cocok mencabut verifikasi', () => siapkan(async (db) => {
  const u = sebagai('tok_editor');
  const p = await hal(u, 4); const { matn, syarah } = bagianSunting(p);
  const n = await u({ ...K, seq: 4, rev: 0, matn, syarah });
  assert.equal(n.tidakBerubah, true); assert.equal(n.halaman.rev, undefined);
  assert.equal(Object.keys(db.data).filter((k) => k.startsWith('kitab/fathul-muin/koreksi/')).length, 0);
  const v = await u({ ...K, seq: 4, rev: 0, matn, syarah, cocok: true });
  assert.equal(v.tidakBerubah, false); assert.equal(v.halaman.diverifikasi, true); assert.equal(v.halaman.dikoreksi, undefined); assert.equal(v.halaman.teks, p.teks);
  assert.equal(db.data['kitab/fathul-muin'].koreksi, undefined);
  const jejak = Object.values(db.data).filter((x) => x && x.jenis);
  assert.deepEqual(jejak.map((x) => x.jenis), ['verifikasi']);
  const v2 = await u({ ...K, seq: 4, rev: 1, matn, syarah, cocok: true }); // sudah terverifikasi: tidak ada yang baru
  assert.equal(v2.tidakBerubah, true);
  const ubah = await u({ ...K, seq: 4, rev: 1, matn: matn + ' ثم', syarah });
  assert.equal(ubah.halaman.diverifikasi, undefined); assert.equal(ubah.halaman.dikoreksi, true);
  assert.equal(db.data['kitab/fathul-muin'].koreksi, 1);
  const ubah2 = await u({ ...K, seq: 4, rev: 2, matn: matn + ' ثم ثم', syarah, cocok: true });
  assert.equal(ubah2.halaman.diverifikasi, true);
}));

test('bentuk halaman tersimpan menentukan isian: halaman tanpa pemisah memakai teks; halaman bermatn memakai matn+syarah', () => siapkan(async (db) => {
  const u = sebagai('tok_editor');
  await assert.rejects(() => u({ ...K, seq: 1, rev: 0, teks: 'x' }), (e) => e.status === 422 && e.code === 'KOREKSI_INVALID');
  db.data['kitab/fathul-muin/halaman/p00005'].batasMatn = null; db.data['kitab/fathul-muin/halaman/p00005'].teks = 'سطر واحد';
  await assert.rejects(() => u({ ...K, seq: 5, rev: 0, matn: 'a', syarah: 'b' }), (e) => e.status === 422);
  await assert.rejects(() => u({ ...K, seq: 5, rev: 0 }), (e) => e.status === 422);
  const r = await u({ ...K, seq: 5, rev: 0, teks: 'سطر\r\nمصحح ' });
  assert.equal(r.halaman.teks, 'سطر\nمصحح'); assert.equal(r.halaman.batasMatn, null);
  // matn kosong: seluruh teks = syarah, batas 0 (sama dengan parser)
  const k = await u({ ...K, seq: 1, rev: 0, matn: '', syarah: 'شرح فقط' });
  assert.equal(k.halaman.teks, 'شرح فقط'); assert.equal(k.halaman.batasMatn, 0);
}));

test('validasi masukan: urutan, rev, jenis data, panjang, catatan, kitab tak aktif', () => siapkan(async (db) => {
  const u = sebagai('tok_editor');
  for (const bad of [{ seq: 0 }, { seq: 7 }, { seq: '1' }, { seq: 1, rev: -1 }, { seq: 1, rev: 1.5 }, { seq: 1, rev: 0, matn: 5, syarah: 'x' }, { seq: 1, rev: 0, matn: 'x', syarah: null },
    { seq: 1, rev: 0, matn: 'x'.repeat(MAKS_TEKS_KOREKSI), syarah: 'y' }, { seq: 1, rev: 0, matn: 'x', syarah: 'y', catatan: 'c'.repeat(301) }, { seq: 1, rev: 0, matn: 'x', syarah: 'y', catatan: 5 },
    { seq: 1, rev: 0, matn: 'x', syarah: 'y', cocok: 'ya' }]) {
    await assert.rejects(() => u({ ...K, rev: 0, matn: 'x', syarah: 'y', ...bad }), (e) => e.status === 422, JSON.stringify(bad).slice(0, 80));
  }
  assert.equal(db.data['kitab/fathul-muin'].koreksi, undefined);
  await assert.rejects(() => u({ ...K, kitabId: '../users', seq: 1, rev: 0, matn: 'x', syarah: 'y' }), (e) => e.code === 'KITAB_ID_INVALID');
  await assert.rejects(() => u({ ...K, kitabId: 'tidak-ada', seq: 1, rev: 0, matn: 'x', syarah: 'y' }), (e) => e.status === 404);
  await sebagai('tok_admin')({ aksi: 'impor-aktif', kitabId: 'fathul-muin', aktif: false });
  await assert.rejects(() => u({ ...K, seq: 1, rev: 0, matn: 'x', syarah: 'y' }), (e) => e.status === 404 && e.code === 'KITAB_TIDAK_ADA');
}));

test('impor ulang yang mengalihkan ruang di tengah koreksi: ditolak 409 KITAB_BERUBAH, tidak menulis ke ruang lama', () => siapkan(async (db) => {
  const m = db.data['kitab/fathul-muin'];
  const basi = { ...m }; // metadata yang dibaca pemanggil sebelum impor ulang selesai
  db.data['kitab/fathul-muin'] = { ...m, ruang: '_r2', revisi: 2 };
  await assert.rejects(() => aksiKoreksi({ seq: 1, rev: 0, matn: 'x', syarah: 'y' }, 'fathul-muin', basi, { uid: 'u_editor', role: 'editor' }), (e) => e.status === 409 && e.code === 'KITAB_BERUBAH');
  assert.equal(db.data['kitab/fathul-muin/halaman/p00001'].rev, undefined);
}));

test('pencarian: indeks ikut berubah dan simpanan memori tidak dipakai lagi (kata lama hilang, kata baru ditemukan); kitab tanpa indeks tidak menghalangi koreksi', () => siapkan(async (db) => {
  const u = sebagai('tok_editor');
  const cari = (q) => u({ aksi: 'perpus-cari', kitabId: 'fathul-muin', q });
  assert.equal((await cari('الصفحة 2')).total, 1); // memuat indeks ke memori proses
  assert.equal((await cari('خطأ')).total, 0);
  await u({ ...K, seq: 2, rev: 0, matn: 'متن 2', syarah: 'شرح خطأ ٢' });
  assert.equal((await cari('خطأ')).total, 1);
  assert.equal((await cari('خطأ')).hasil[0].seq, 2);
  assert.equal((await cari('الصفحة 2')).total, 0);
  assert.equal((await cari('الصفحة 3')).total, 1); // halaman lain tetap
  // indeks belum ada (kitab lama): koreksi tetap berhasil dan pembangunan indeks nanti memakai teks yang sudah benar
  for (const k of Object.keys(db.data)) if (k.startsWith('kitab/fathul-muin/cari/')) delete db.data[k];
  kosongkanSimpananCari();
  const r = await u({ ...K, seq: 3, rev: 0, matn: 'متن 3', syarah: 'كلمة جديدة' });
  assert.equal(r.ok, true);
  let c = await cari('كلمة جديدة');
  for (let i = 0; i < 20 && !c.siap; i++) c = await cari('كلمة جديدة');
  assert.equal(c.total, 1); assert.equal(c.hasil[0].seq, 3);
}));

test('riwayat: terbaru dulu, memuat teks lama dan baru; halaman tanpa koreksi kosong; batas 10; hanya halaman yang diminta', () => siapkan(async (db) => {
  const u = sebagai('tok_editor');
  assert.deepEqual(await u({ aksi: 'perpus-riwayat', kitabId: 'fathul-muin', seq: 2 }), { riwayat: [], jumlah: 0 });
  for (let i = 0; i < 12; i++) { await u({ ...K, seq: 2, rev: i, matn: `متن نسخة ${i}`, syarah: 'ش', catatan: `v${i}` }); await new Promise((s) => setTimeout(s, 2)); }
  await u({ ...K, seq: 3, rev: 0, matn: 'لا', syarah: 'ش' });
  const r = await sebagai('tok_admin')({ aksi: 'perpus-riwayat', kitabId: 'fathul-muin', seq: 2 });
  assert.equal(r.jumlah, 12); assert.equal(r.riwayat.length, 10);
  assert.equal(r.riwayat[0].catatan, 'v11'); assert.equal(r.riwayat[0].teksBaru, 'متن نسخة 11\nش'); assert.equal(r.riwayat[0].teksLama, 'متن نسخة 10\nش'); assert.equal(r.riwayat[0].namaOleh, 'Nama editor');
  assert.equal(r.riwayat[0].batasMatnBaru, 'متن نسخة 11'.length);
  assert.equal(r.riwayat[9].catatan, 'v2');
  await assert.rejects(() => u({ aksi: 'perpus-riwayat', kitabId: 'fathul-muin', seq: 99 }), (e) => e.status === 422);
}));

test('impor-daftar menampilkan jumlah koreksi supaya admin diperingatkan sebelum "timpa"', () => siapkan(async () => {
  await sebagai('tok_editor')({ ...K, seq: 1, rev: 0, matn: 'a', syarah: 'b' });
  const d = await sebagai('tok_admin')({ aksi: 'impor-daftar' });
  assert.equal(d.kitab.find((k) => k.id === 'fathul-muin').koreksi, 1);
}));

test('pemuat klien: koreksi memperbarui simpanan halaman; lupakan membuangnya', async () => {
  const simpanan = { daftar: null, isi: new Map(), halaman: new Map() };
  const panggilan = [];
  const pem = buatPemuat(async (b) => { panggilan.push(b); return b.aksi === 'perpus-koreksi' ? { ok: true, halaman: { seq: b.seq, hal: 7, juz: 1, teks: b.teks, batasMatn: null, rev: b.rev + 1 } } : { riwayat: [], jumlah: 0 }; }, simpanan);
  simpanan.halaman.set('k:7', { seq: 7, teks: 'lama' });
  const r = await pem.koreksi('k', 7, { rev: 0, teks: 'baru' });
  assert.equal(r.halaman.rev, 1); assert.equal(simpanan.halaman.get('k:7').teks, 'baru');
  assert.deepEqual(panggilan[0], { aksi: 'perpus-koreksi', kitabId: 'k', seq: 7, rev: 0, teks: 'baru' });
  await pem.riwayat('k', 7); assert.deepEqual(panggilan[1], { aksi: 'perpus-riwayat', kitabId: 'k', seq: 7 });
  pem.lupakan('k', 7); assert.equal(simpanan.halaman.has('k:7'), false);
});

/* ---------- Logika murni ---------- */
test('bersihkanTeksKoreksi: baris baru seragam, karakter kendali dan penanda arah dibuang, huruf Arab dan ZWNJ tidak diubah', () => {
  assert.equal(bersihkanTeksKoreksi('  a\r\nb\rc\u0000\u0007‮⁧d﻿ \n'), 'a\nb\ncd');
  const arab = 'بِسْمِ ٱللَّهِ‌الرَّحْمَٰنِ'; // urutan harakat asli tidak boleh disusun ulang (tanpa normalisasi Unicode)
  assert.equal(bersihkanTeksKoreksi(arab), arab);
  assert.equal(bersihkanTeksKoreksi(null), ''); assert.equal(bersihkanTeksKoreksi(undefined), '');
  assert.equal(bersihkanTeksKoreksi('a\tb\nc'), 'a\tb\nc');
});

test('gabungMatnSyarah, bagianSunting, hasilSunting saling mengembalikan (sama dengan susunan parser Syamilah)', () => {
  assert.deepEqual(gabungMatnSyarah('م', 'ش'), { teks: 'م\nش', batasMatn: 1 });
  assert.deepEqual(gabungMatnSyarah('', 'ش'), { teks: 'ش', batasMatn: 0 });
  assert.deepEqual(gabungMatnSyarah('م', ''), { teks: 'م', batasMatn: 1 });
  const p = { teks: 'متن\nشرح', batasMatn: 3 };
  assert.deepEqual(bagianSunting(p), { terpisah: true, matn: 'متن', syarah: 'شرح' });
  assert.deepEqual(hasilSunting(p, { matn: 'متن', syarah: 'شرح' }), { teks: p.teks, batasMatn: 3 });
  assert.deepEqual(bagianSunting({ teks: 'x', batasMatn: null }), { terpisah: false, teks: 'x' });
  assert.deepEqual(hasilSunting({ teks: 'x', batasMatn: null }, { teks: ' y \r\n' }), { teks: 'y', batasMatn: null });
});

test('bedaTeks: potongan menyusun kembali kedua teks; hitungan kata; kasus tepi dan teks besar', () => {
  const susun = (pot, j) => pot.filter((x) => x.j === 'sama' || x.j === j).map((x) => x.t).join('');
  const a = 'قال الشيخ رحمه الله تعالى في كتابه'; const b = 'قال الشيخ رضي الله عنه في كتابه الكبير';
  const d = bedaTeks(a, b);
  assert.equal(susun(d, 'hapus'), a); assert.equal(susun(d, 'tambah'), b);
  assert.deepEqual(ringkasBeda(d), { hapus: 2, tambah: 3 }); // hapus: رحمه تعالى; tambah: رضي عنه الكبير ("الله" sama)
  assert.deepEqual(bedaTeks('sama', 'sama'), [{ t: 'sama', j: 'sama' }]);
  assert.deepEqual(bedaTeks('', 'baru'), [{ t: 'baru', j: 'tambah' }]);
  assert.deepEqual(bedaTeks('lama', ''), [{ t: 'lama', j: 'hapus' }]);
  assert.deepEqual(bedaTeks('', ''), []);
  const besar = (n, g) => Array.from({ length: n }, (_, i) => (i % 97 === 0 ? g + i : 'ك' + i)).join(' ');
  const t0 = Date.now(); const dd = bedaTeks(besar(3000, 'x'), besar(3000, 'y'));
  assert.equal(susun(dd, 'hapus'), besar(3000, 'x')); assert.equal(susun(dd, 'tambah'), besar(3000, 'y'));
  assert.ok(Date.now() - t0 < 3000);
});
