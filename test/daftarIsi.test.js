// Penyuntingan daftar isi kitab oleh editor/admin: logika murni (web/lib/daftarIsi.js) dan server (src/kitabIsi.js; /api/kitab aksi perpus-isi-*).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSyamilah } from '../src/syamilah.js';
import { jalankanImpor, isianAwal } from '../web/lib/imporKitab.js';
import { __setFirebaseForTest } from '../src/platform.js';
import { kosongkanSimpananCari } from '../src/kitabCari.js';
import { aksiIsiSimpan } from '../src/kitabIsi.js';
import { rapikanJudul, rapikanEntri, periksaEntri, bedaDaftar, usulDariHalaman, gabungUsul, MAKS_ENTRI_ISI } from '../web/lib/daftarIsi.js';
import { buatPemuat } from '../web/lib/perpus.js';
import handler from '../api/kitab.js';
import { fakeDb } from './_fakeDb.js';

const J = 'فتح المعين'; const ZW = '‌‌';
function buku() { // 6 halaman (nomor cetak 1,2,2,3,4,5); judul "باب الصلاة" di halaman 1 dan "فصل" di halaman 4
  const kep = [`${J}   (المعبري)`, 'القسم: الفقه الشافعي', `الكتاب: ${J}`, 'المؤلف: المعبري (ت 987هـ)'];
  const nomor = [1, 2, 2, 3, 4, 5];
  const isi = nomor.flatMap((n, i) => [`${J}(ص: ${n})`, ...(i === 0 ? [`${ZW}باب الصلاة`] : []), ...(i === 3 ? [`${ZW}فصل في الأذان`] : []), `متن ${i + 1}`, 'ـ', `شرح الصفحة ${i + 1}`]);
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
const S = { aksi: 'perpus-isi-simpan', kitabId: 'fathul-muin' };
const DAFTAR = 'kitab/fathul-muin/daftar/isi';

/* ---------- Logika murni ---------- */
test('rapikanJudul: spasi, ZWNJ, NBSP, penanda arah, dan butir "•" dirapikan; huruf dan harakat Arab tidak diubah', () => {
  assert.equal(rapikanJudul('  •  ‌‌باب  الصَّلَاة ‫'), 'باب الصَّلَاة');
  assert.equal(rapikanJudul(null), '');
});

test('rapikanEntri: urut menurut halaman, urutan di halaman yang sama tetap, judul dirapikan', () => {
  const r = rapikanEntri([{ judul: 'ب', level: 2, seq: 3 }, { judul: ' أ ', level: 1, seq: 1 }, { judul: 'ج', level: 3, seq: 3 }, { judul: 'د', level: 2, seq: 2 }]);
  assert.deepEqual(r.map((e) => e.judul), ['أ', 'د', 'ب', 'ج']);
  assert.deepEqual(rapikanEntri('bukan larik'), []);
});

test('periksaEntri: judul kosong/panjang, level, halaman di luar kitab, bukan bilangan bulat, dan batas jumlah menjadi galat; judul ganda hanya peringatan', () => {
  const ok = { judul: 'باب', level: 2, seq: 2 };
  assert.equal(periksaEntri([ok], 6).galat.length, 0);
  const g = (e) => periksaEntri([e], 6).galat.map((x) => x.pesan).join('|');
  assert.match(g({ ...ok, judul: '' }), /Judul belum diisi/);
  assert.match(g({ ...ok, judul: 'x'.repeat(301) }), /terlalu panjang/);
  assert.match(g({ ...ok, level: 5 }), /Level/);
  assert.match(g({ ...ok, level: '2' }), /Level/);
  assert.match(g({ ...ok, seq: 0 }), /Urutan halaman/);
  assert.match(g({ ...ok, seq: 7 }), /Urutan halaman/);
  assert.match(g({ ...ok, seq: 1.5 }), /Urutan halaman/);
  assert.match(g({ ...ok, seq: NaN }), /Urutan halaman/);
  assert.equal(periksaEntri(Array.from({ length: MAKS_ENTRI_ISI + 1 }, () => ok), 6).galat.some((x) => /terlalu panjang/.test(x.pesan)), true);
  const dobel = periksaEntri([ok, ok], 6);
  assert.equal(dobel.galat.length, 0); assert.equal(dobel.peringatan.length, 1); assert.equal(dobel.peringatan[0].i, 2);
});

test('bedaDaftar: tambah, hapus, ubah judul (halaman sama), ubah level', () => {
  const lama = [{ judul: 'أ', level: 1, seq: 1 }, { judul: 'ب', level: 2, seq: 2 }, { judul: 'ج', level: 2, seq: 3 }];
  assert.deepEqual(bedaDaftar(lama, lama), { tambah: 0, hapus: 0, ubah: 0 });
  assert.deepEqual(bedaDaftar(lama, [...lama, { judul: 'د', level: 2, seq: 5 }]), { tambah: 1, hapus: 0, ubah: 0 });
  assert.deepEqual(bedaDaftar(lama, lama.slice(0, 2)), { tambah: 0, hapus: 1, ubah: 0 });
  assert.deepEqual(bedaDaftar(lama, [lama[0], { judul: 'ب!', level: 2, seq: 2 }, lama[2]]), { tambah: 0, hapus: 0, ubah: 1 });
  assert.deepEqual(bedaDaftar(lama, [lama[0], { ...lama[1], level: 3 }, lama[2]]), { tambah: 0, hapus: 0, ubah: 1 });
  assert.deepEqual(bedaDaftar([], lama), { tambah: 3, hapus: 0, ubah: 0 });
});

test('usulDariHalaman: baris judul pendek di teks dan perubahan `bab` menjadi usulan; kalimat biasa tidak', () => {
  const u = usulDariHalaman([
    { seq: 2, juz: 1, hal: 2, teks: 'باب الزكاة\nوهذا نص عادي طويل يبدأ بكلمة ثم يستمر في الكلام حتى ينتهي هنا.' },
    { seq: 1, juz: 1, hal: 1, teks: 'مقدمة', bab: 'مقدمة' },
    { seq: 3, juz: 1, hal: 3, teks: 'متن', bab: 'فصل في الأذان' },
    { seq: 4, juz: 1, hal: 4, teks: 'متن', bab: 'فصل في الأذان' }, // bab tidak berubah: tidak diulang
    { seq: 5, juz: 1, hal: 5, teks: 'باب كذا وكذا في هذا الكتاب كما قال العلماء في هذا الموضع من الكلام.' }, // diakhiri titik = kalimat
  ]);
  assert.deepEqual(u.map((e) => [e.seq, e.judul, e.level]), [[1, 'مقدمة', 1], [2, 'باب الزكاة', 2], [3, 'فصل في الأذان', 3]]);
  assert.equal(u[0].hal, 1);
});

test('gabungUsul: hanya yang belum ada (halaman + judul) yang ditambah, hasil terurut', () => {
  const lama = [{ judul: 'أ', level: 2, seq: 3 }];
  const g = gabungUsul(lama, [{ judul: 'أ', level: 2, seq: 3 }, { judul: 'ب', level: 2, seq: 1 }]);
  assert.equal(g.ditambah, 1); assert.deepEqual(g.entri.map((e) => e.judul), ['ب', 'أ']);
});

/* ---------- Server ---------- */
test('hanya editor dan admin yang boleh membuat usulan, menyimpan, dan melihat riwayat; penyusun, ustadz, tanpa token ditolak', () => siapkan(async (db) => {
  const sebelum = JSON.stringify(db.data[DAFTAR]);
  for (const t of ['tok_penyusun', 'tok_ustadz']) {
    for (const b of [{ aksi: 'perpus-isi-usul', kitabId: 'fathul-muin' }, { ...S, entri: [], rev: 0 }, { aksi: 'perpus-isi-riwayat', kitabId: 'fathul-muin' }]) assert.equal((await lewat(t, b)).code, 403, `${t} ${b.aksi}`);
  }
  { const r = mkRes(); await handler({ method: 'POST', headers: {}, body: { ...S, entri: [], rev: 0 } }, r); assert.equal(r.code, 401); }
  assert.equal(JSON.stringify(db.data[DAFTAR]), sebelum);
  for (const t of ['tok_editor', 'tok_admin']) assert.equal((await lewat(t, { aksi: 'perpus-isi-usul', kitabId: 'fathul-muin' })).code, 200, t);
  // lapis kedua: modul menolak sendiri bila dipanggil tanpa peran yang sah
  await assert.rejects(() => aksiIsiSimpan({ entri: [], rev: 0 }, 'fathul-muin', db.data['kitab/fathul-muin'], { uid: 'x', role: 'penyusun' }), (e) => e.status === 403);
  await assert.rejects(() => aksiIsiSimpan({ entri: [], rev: 0 }, 'fathul-muin', db.data['kitab/fathul-muin'], null), (e) => e.status === 403);
}));

test('simpan: daftar diganti, juz dan hal diisi server dari halaman, rev naik, riwayat dan penghitung tercatat, pembaca langsung melihat daftar baru', () => siapkan(async (db) => {
  const editor = sebagai('tok_editor');
  const awal = await editor({ aksi: 'perpus-isi', kitabId: 'fathul-muin' });
  assert.equal(awal.rev, 0); assert.equal(awal.entri.length, 2);
  const r = await editor({ ...S, rev: 0, catatan: ' cocok dengan cetakan ', entri: [
    { judul: '  باب الطهارة ', level: 2, seq: 3, juz: 99, hal: 99999 }, // juz/hal dari klien diabaikan
    { judul: 'مقدمة', level: 1, seq: 1 },
  ] });
  assert.equal(r.ok, true); assert.equal(r.rev, 1); assert.equal(r.tidakBerubah, false);
  assert.deepEqual(r.entri.map((e) => [e.seq, e.judul, e.level, e.juz, e.hal]), [[1, 'مقدمة', 1, 1, 1], [3, 'باب الطهارة', 2, 1, 2]]);
  const d = db.data[DAFTAR];
  assert.equal(d.jumlah, 2); assert.equal(d.suntingRev, 1); assert.equal(d.disuntingNama, 'Nama editor'); assert.equal(d.revisi, 1);
  const baca = await sebagai('tok_ustadz')({ aksi: 'perpus-isi', kitabId: 'fathul-muin' });
  assert.deepEqual(baca.entri.map((e) => e.judul), ['مقدمة', 'باب الطهارة']); assert.equal(baca.rev, 1);
  const riw = Object.entries(db.data).filter(([p]) => p.startsWith('kitab/fathul-muin/isiRiwayat/'));
  assert.equal(riw.length, 1);
  const [, h] = riw[0];
  assert.equal(h.oleh, 'u_editor'); assert.equal(h.catatan, 'cocok dengan cetakan'); assert.equal(h.revDari, 0); assert.equal(h.jumlahLama, 2); assert.equal(h.jumlahBaru, 2);
  assert.deepEqual(h.entriLama.map((e) => e.judul), awal.entri.map((e) => e.judul));
  assert.equal(db.data['kitab/fathul-muin'].isiDisunting, 1);
}));

test('simpan tanpa perubahan: tidak menulis apa pun (rev, riwayat, penghitung tetap)', () => siapkan(async (db) => {
  const editor = sebagai('tok_editor');
  const { entri } = await editor({ aksi: 'perpus-isi', kitabId: 'fathul-muin' });
  const r = await editor({ ...S, rev: 0, entri: entri.map(({ judul, level, seq }) => ({ judul, level, seq })) });
  assert.equal(r.tidakBerubah, true); assert.equal(r.rev, 0);
  assert.equal(db.data[DAFTAR].suntingRev, undefined);
  assert.equal(Object.keys(db.data).some((p) => p.includes('isiRiwayat')), false);
  assert.equal(db.data['kitab/fathul-muin'].isiDisunting, undefined);
}));

test('kitab tanpa daftar isi: editor bisa membuatnya dari nol, dan bisa dikosongkan lagi', () => siapkan(async (db) => {
  delete db.data[DAFTAR];
  const editor = sebagai('tok_admin');
  const kosong = await editor({ aksi: 'perpus-isi', kitabId: 'fathul-muin' });
  assert.deepEqual(kosong.entri, []); assert.equal(kosong.rev, 0);
  const r = await editor({ ...S, rev: 0, entri: [{ judul: 'باب', level: 2, seq: 2 }] });
  assert.equal(r.rev, 1); assert.equal(r.entri[0].hal, 2);
  const k = await editor({ ...S, rev: 1, entri: [] });
  assert.equal(k.rev, 2); assert.equal(db.data[DAFTAR].jumlah, 0);
  assert.equal(Object.keys(db.data).filter((p) => p.includes('isiRiwayat')).length, 2);
}));

test('bentrok: rev lama ditolak 409 dan tidak ada yang tertulis; setelah memuat ulang berhasil', () => siapkan(async (db) => {
  const editor = sebagai('tok_editor'); const admin = sebagai('tok_admin');
  await admin({ ...S, rev: 0, entri: [{ judul: 'أ', level: 1, seq: 1 }] });
  const sebelum = JSON.stringify(db.data[DAFTAR]);
  const r = await lewat('tok_editor', { ...S, rev: 0, entri: [{ judul: 'ب', level: 1, seq: 1 }] });
  assert.equal(r.code, 409); assert.equal(r.body.error.code, 'ISI_BENTROK');
  assert.equal(JSON.stringify(db.data[DAFTAR]), sebelum);
  assert.equal(Object.keys(db.data).filter((p) => p.includes('isiRiwayat')).length, 1);
  assert.equal((await editor({ ...S, rev: 1, entri: [{ judul: 'ب', level: 1, seq: 1 }] })).rev, 2);
}));

test('isian tidak sah ditolak 422 tanpa menulis: halaman di luar kitab, judul kosong, level, larik, rev, catatan terlalu panjang', () => siapkan(async (db) => {
  const sebelum = JSON.stringify(db.data[DAFTAR]);
  const salah = [
    { entri: [{ judul: 'باب', level: 2, seq: 7 }] }, { entri: [{ judul: 'باب', level: 2, seq: 0 }] }, { entri: [{ judul: '  ', level: 2, seq: 1 }] },
    { entri: [{ judul: 'باب', level: 9, seq: 1 }] }, { entri: [{ judul: 'باب', level: 2, seq: '1' }] }, { entri: [null] }, { entri: 'x' }, { entri: undefined },
    { entri: [], rev: -1 }, { entri: [], rev: 1.5 }, { entri: [], rev: 'a' }, { entri: [{ judul: 'باب', level: 2, seq: 1 }], catatan: 'x'.repeat(301) }, { entri: [{ judul: 'باب', level: 2, seq: 1 }], catatan: 5 },
  ];
  for (const b of salah) { const r = await lewat('tok_editor', { ...S, rev: 0, ...b }); assert.equal(r.code, 422, JSON.stringify(b)); }
  assert.equal(JSON.stringify(db.data[DAFTAR]), sebelum);
  assert.equal(Object.keys(db.data).some((p) => p.includes('isiRiwayat')), false);
}));

test('kitab diimpor ulang di tengah penyuntingan: ditolak 409 KITAB_BERUBAH, daftar di ruang lama tidak disentuh', () => siapkan(async (db) => {
  const meta = { ...db.data['kitab/fathul-muin'] };
  const f = fb({}); f.db = fakeDb({ ...db.data, 'kitab/fathul-muin': { ...meta, revisi: (meta.revisi || 1) + 1 } });
  __setFirebaseForTest(f);
  await assert.rejects(() => aksiIsiSimpan({ entri: [{ judul: 'باب', level: 2, seq: 1 }], rev: 0 }, 'fathul-muin', meta, { uid: 'u', role: 'editor', nama: 'x' }), (e) => e.status === 409 && e.code === 'KITAB_BERUBAH');
  assert.equal(JSON.stringify(f.db.data[DAFTAR]), JSON.stringify(db.data[DAFTAR]));
}));

test('usulan dari teks kitab: tidak menulis, menemukan judul bab hasil impor', () => siapkan(async (db) => {
  const tanpaRate = () => JSON.stringify(Object.fromEntries(Object.entries(db.data).filter(([p]) => !p.startsWith('rate/'))));
  const sebelum = tanpaRate();
  const r = await sebagai('tok_editor')({ aksi: 'perpus-isi-usul', kitabId: 'fathul-muin' });
  assert.equal(r.dibaca, 6); assert.equal(r.terpotong, false);
  assert.deepEqual(r.usul.map((e) => [e.seq, e.judul]), [[1, 'باب الصلاة'], [4, 'فصل في الأذان']]);
  assert.equal(tanpaRate(), sebelum);
}));

test('riwayat: terbaru dulu, memuat daftar sebelum perubahan, dan daftar lama bisa dikembalikan (menjadi versi baru, bukan menghapus riwayat)', () => siapkan(async (db) => {
  const editor = sebagai('tok_editor');
  const { entri: asal } = await editor({ aksi: 'perpus-isi', kitabId: 'fathul-muin' });
  await editor({ ...S, rev: 0, entri: [{ judul: 'أ', level: 1, seq: 1 }] });
  await new Promise((s) => setTimeout(s, 5));
  await editor({ ...S, rev: 1, catatan: 'kedua', entri: [{ judul: 'أ', level: 1, seq: 1 }, { judul: 'ب', level: 2, seq: 2 }] });
  const r = await editor({ aksi: 'perpus-isi-riwayat', kitabId: 'fathul-muin' });
  assert.equal(r.jumlah, 2); assert.equal(r.riwayat[0].catatan, 'kedua'); assert.deepEqual(r.riwayat[0].ringkas, { tambah: 1, hapus: 0, ubah: 0 });
  assert.deepEqual(r.riwayat[1].entriLama.map((e) => e.judul), asal.map((e) => e.judul));
  const pulih = await editor({ ...S, rev: 2, catatan: 'dikembalikan', entri: r.riwayat[1].entriLama.map(({ judul, level, seq }) => ({ judul, level, seq })) });
  assert.deepEqual(pulih.entri.map((e) => e.judul), asal.map((e) => e.judul)); assert.equal(pulih.rev, 3);
  assert.equal((await editor({ aksi: 'perpus-isi-riwayat', kitabId: 'fathul-muin' })).jumlah, 3);
}));

test('daftar isi terlalu besar tidak diarsipkan seluruhnya (hanya jumlahnya), tetapi tetap tersimpan', () => siapkan(async (db) => {
  const besar = Array.from({ length: 2500 }, (_, i) => ({ judul: `${'باب'.repeat(90)} ${i}`, level: 2, seq: 1 + (i % 6), juz: 1, hal: 1 }));
  db.data[DAFTAR] = { entri: besar, jumlah: besar.length, revisi: 1 };
  const r = await sebagai('tok_editor')({ ...S, rev: 0, entri: [{ judul: 'أ', level: 1, seq: 1 }] });
  assert.equal(r.ok, true);
  const h = Object.entries(db.data).find(([p]) => p.includes('isiRiwayat'))[1];
  assert.equal(h.entriLama, null); assert.equal(h.jumlahLama, 2500);
  const riw = await sebagai('tok_editor')({ aksi: 'perpus-isi-riwayat', kitabId: 'fathul-muin' });
  assert.equal(riw.riwayat[0].entriLama, null);
}));

test('pemuat klien: isiSimpan memperbarui simpanan, isiUsul dan isiRiwayat memanggil aksi yang benar', async () => {
  const panggilan = [];
  const pem = buatPemuat(async (b) => { panggilan.push(b.aksi); return b.aksi === 'perpus-isi-simpan' ? { ok: true, entri: [{ judul: 'x', level: 1, seq: 1 }], rev: 4 } : { ok: true }; });
  pem.simpanan.isi.set('k', { kitab: { id: 'k' }, entri: [], rev: 3 });
  await pem.isiSimpan('k', { entri: [], rev: 3 });
  assert.deepEqual(pem.simpanan.isi.get('k'), { kitab: { id: 'k' }, entri: [{ judul: 'x', level: 1, seq: 1 }], rev: 4 });
  await pem.isiUsul('k'); await pem.isiRiwayat('k');
  assert.deepEqual(panggilan, ['perpus-isi-simpan', 'perpus-isi-usul', 'perpus-isi-riwayat']);
});
