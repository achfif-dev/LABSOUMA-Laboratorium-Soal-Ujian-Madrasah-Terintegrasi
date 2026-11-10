// Penyuntingan daftar isi kitab oleh editor/admin: logika murni (web/lib/daftarIsi.js) dan server (src/kitabIsi.js; /api/kitab aksi perpus-isi-*).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSyamilah } from '../src/syamilah.js';
import { jalankanImpor, isianAwal } from '../web/lib/imporKitab.js';
import { __setFirebaseForTest } from '../src/platform.js';
import { kosongkanSimpananCari } from '../src/kitabCari.js';
import { aksiIsiSimpan, aksiIsiAi, validasiIsiAi, JUMLAH_AI_MAKS, TOOL_DAFTAR_ISI } from '../src/kitabIsi.js';
import { toGeminiSchema } from '../src/gemini.js';
import { rapikanJudul, rapikanEntri, periksaEntri, bedaDaftar, usulDariHalaman, gabungUsul, MAKS_ENTRI_ISI, levelUsul, bersihkanJudul, kandidatJudul, entriDariPilihanAi, normalJudul, ukuranBarisKhas } from '../web/lib/daftarIsi.js';
import { buatPemuat } from '../web/lib/perpus.js';
import handler from '../src/rute/kitab.js';
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

/* ---------- Mesin aturan yang diperkuat ---------- */
test('levelUsul dan kata kunci: berharakat, berawalan "ال", tingkat 1-4; kata yang hanya mirip ("بابك") bukan judul', () => {
  assert.deepEqual(['مقدمة', 'كِتَابُ الطَّهَارَةِ', 'خاتمة', 'بَابُ الْوُضُوءِ', 'الباب الأول', 'فصل', 'الفصل الثاني', 'مبحث', 'مطلب', 'الفرع', 'تتمة'].map(levelUsul), [1, 1, 1, 2, 2, 3, 3, 3, 4, 4, 4]);
  assert.equal(levelUsul('Bab 3'), 2); assert.equal(levelUsul('Pendahuluan'), 1);
  const u = usulDariHalaman([
    { seq: 1, juz: 1, hal: 1, teks: 'بَابُ الطَّهَارَةِ\nنص' }, { seq: 2, juz: 1, hal: 2, teks: 'الفصل الأول\nنص' }, { seq: 3, juz: 1, hal: 3, teks: 'المطلب الثاني\nنص' },
    { seq: 4, juz: 1, hal: 4, teks: 'بابك\nكتابه\nفصلت\nنص' },
  ]);
  assert.deepEqual(u.map((e) => [e.seq, e.judul, e.level]), [[1, 'بَابُ الطَّهَارَةِ', 2], [2, 'الفصل الأول', 3], [3, 'المطلب الثاني', 4]]);
});

test('bersihkanJudul: penanda halaman, kurung siku, titik dua dibuang; nomor judul tetap ("Bab 3")', () => {
  assert.equal(bersihkanJudul('باب الوضوء (ص: 12)'), 'باب الوضوء');
  assert.equal(bersihkanJudul('فصل في الغسل:'), 'فصل في الغسل');
  assert.equal(bersihkanJudul('[باب الصلاة]'), 'باب الصلاة');
  assert.equal(bersihkanJudul('Bab 3'), 'Bab 3'); assert.equal(bersihkanJudul('الباب 2'), 'الباب 2');
});

test('header berulang dibuang: baris berkata kunci yang sama di banyak halaman bukan judul; judul unik tetap', () => {
  const hal = Array.from({ length: 10 }, (_, i) => ({ seq: i + 1, juz: 1, hal: i + 1, teks: `${i < 6 ? 'باب الطهارة\n' : ''}${i === 2 ? 'فصل في الغسل\n' : ''}نص ${i}` }));
  assert.deepEqual(usulDariHalaman(hal).map((e) => e.judul), ['فصل في الغسل']);
});

test('baris panjang berawalan kata kunci dipotong di titik dua; kalimat yang berakhir titik tidak; judul sama di halaman berurutan tidak digandakan', () => {
  const panjang = 'باب الوضوء: يجب على المكلف أن يتوضأ قبل الصلاة إذا كان محدثا وهذا الحكم متفق عليه بين الفقهاء';
  assert.ok(panjang.length > 80);
  const u = usulDariHalaman([{ seq: 1, juz: 1, hal: 1, teks: panjang }, { seq: 2, juz: 1, hal: 2, teks: 'باب الوضوء' }, { seq: 5, juz: 1, hal: 5, teks: 'باب الوضوء' }]);
  assert.deepEqual(u.map((e) => [e.seq, e.judul, e.sumber]), [[1, 'باب الوضوء', 'potong'], [5, 'باب الوضوء', 'kata-kunci']]);
});

/* ---------- Kandidat dan pilihan AI ---------- */
test('kandidatJudul: baris pendek dan berkata kunci jadi kandidat dengan konteks; kalimat panjang tidak; nomor berurutan', () => {
  const panjang = 'هذه جملة طويلة جدا من متن الكتاب تتكلم عن حكم من الأحكام الفقهية وتستمر في الكلام حتى تتجاوز الحد المعقول لطول العنوان بكثير.';
  const { kandidat, terpotong } = kandidatJudul([{ seq: 1, juz: 1, hal: 7, teks: `باب الصلاة\nيجب على المكلف كذا\nالطهارة\n${panjang}`, bab: 'باب الصلاة' }]);
  assert.equal(terpotong, false);
  assert.deepEqual(kandidat.map((k) => [k.id, k.teks, k.kunci]), [[1, 'باب الصلاة', true], [2, 'يجب على المكلف كذا', false], [3, 'الطهارة', false]]);
  assert.equal(kandidat[0].lanjut, 'يجب على المكلف كذا'); assert.equal(kandidat[0].hal, 7);
});

test('kandidatJudul: judul dari `bab` hanya saat berubah; melebihi batas mendahulukan kata kunci; header berulang dibuang', () => {
  const hal = [{ seq: 1, juz: 1, hal: 1, teks: 'x', bab: 'باب أ' }, { seq: 2, juz: 1, hal: 2, teks: 'x', bab: 'باب أ' }, { seq: 3, juz: 1, hal: 3, teks: 'x', bab: 'باب ب' }];
  assert.deepEqual(kandidatJudul(hal).kandidat.filter((k) => k.teks.startsWith('باب')).map((k) => [k.seq, k.teks]), [[1, 'باب أ'], [3, 'باب ب']]);
  const banyak = [{ seq: 1, juz: 1, hal: 1, teks: Array.from({ length: 20 }, (_, i) => `سطر قصير ${'ا'.repeat(i + 1)}`).join('\n') + '\nفصل في كذا' }];
  const r = kandidatJudul(banyak, { maks: 5 });
  assert.equal(r.terpotong, true); assert.equal(r.kandidat.length, 5); assert.ok(r.kandidat.some((k) => k.teks === 'فصل في كذا'));
  assert.deepEqual(r.kandidat.map((k) => k.id), [1, 2, 3, 4, 5]);
  const rutin = Array.from({ length: 4 }, (_, i) => ({ seq: i + 1, juz: 1, hal: i + 1, teks: `فتح المعين\nمتن فريد ${i}` }));
  assert.equal(kandidatJudul(rutin).kandidat.some((k) => k.teks === 'فتح المعين'), false);
});

test('entriDariPilihanAi: hanya nomor yang ada, tanpa ganda; judul sebagian harus bagian dari baris sumber; level bawaan dari kata kunci', () => {
  const kand = [{ id: 1, seq: 3, juz: 1, hal: 3, teks: 'باب الوضوء: وهو غسل أعضاء مخصوصة' }, { id: 2, seq: 4, juz: 1, hal: 4, teks: 'الطهارة' }];
  const { entri, ditolak } = entriDariPilihanAi([
    { id: 1, level: 2, judul: 'باب الوضوء' }, { id: 1, level: 2 }, { id: 99, level: 2 }, { id: 2, level: 7 }, { id: 'x', level: 2 }, null,
  ], kand);
  assert.equal(ditolak, 4);
  assert.deepEqual(entri.map((e) => [e.seq, e.judul, e.level, e.sumber]), [[3, 'باب الوضوء', 2, 'ai'], [4, 'الطهارة', 3, 'ai']]);
  // judul karangan (bukan bagian baris sumber) diabaikan: dipakai baris utuh
  assert.equal(entriDariPilihanAi([{ id: 2, level: 1, judul: 'عنوان مختلف تماما' }], kand).entri[0].judul, 'الطهارة');
  assert.equal(normalJudul('بَابُ الْوُضُوءِ'), normalJudul('باب الوضوء'));
});

/* ---------- Server: pemilahan AI ---------- */
const klienAi = (pilih) => { const log = []; return { log, messages: { create: async (a) => { log.push(a); return { stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'hasil_daftar_isi', input: { pilih: typeof pilih === 'function' ? pilih(a.messages[0].content) : pilih } }] }; } } }; };
const pilihKunci = (prompt) => [...prompt.matchAll(/^#(\d+) \| hal\. \d+ \| \[kata-kunci\] (.+?)(?: \|\| |$)/gm)].map((m) => ({ id: Number(m[1]), level: /^باب/.test(m[2]) ? 2 : 3 }));
const AI_PENGGUNA = { uid: 'u_editor', role: 'editor', nama: 'E' };
const tanpaRate = (db) => JSON.stringify(Object.fromEntries(Object.entries(db.data).filter(([p]) => !p.startsWith('rate/'))));

test('perpus-isi-ai: kandidat dikirim ke AI, pilihan menjadi usulan bersumber "ai", tidak menulis apa pun', () => siapkan(async (db) => {
  const sebelum = tanpaRate(db); const c = klienAi(pilihKunci);
  const r = await aksiIsiAi({ dari: 1 }, 'fathul-muin', db.data['kitab/fathul-muin'], AI_PENGGUNA, { client: c });
  assert.equal(r.dipanggilAi, true); assert.equal(c.log.length, 1);
  assert.deepEqual(r.entri.map((e) => [e.seq, e.judul, e.level, e.sumber]), [[1, 'باب الصلاة', 2, 'ai'], [4, 'فصل في الأذان', 3, 'ai']]);
  assert.equal(r.dari, 1); assert.equal(r.sampai, 6); assert.ok(r.kandidat >= 2);
  assert.match(c.log[0].messages[0].content, /<kandidat>[\s\S]*#\d+ \| hal\. 1 \| \[kata-kunci\] باب الصلاة/);
  assert.ok(c.log[0].tool_choice && c.log[0].tools.some((t) => t.name === 'hasil_daftar_isi'));
  assert.equal(tanpaRate(db), sebelum);
}));

test('perpus-isi-ai: jendela halaman, konteks judul sebelumnya dikirim, nomor ngawur dari AI dibuang dan dihitung', () => siapkan(async (db) => {
  const c = klienAi((p) => [...pilihKunci(p), { id: 999, level: 2 }]);
  const r = await aksiIsiAi({ dari: 4, jumlah: 3, sebelumnya: [{ judul: 'باب الصلاة', level: 2 }] }, 'fathul-muin', db.data['kitab/fathul-muin'], AI_PENGGUNA, { client: c });
  assert.equal(r.dari, 4); assert.equal(r.sampai, 6); assert.deepEqual(r.entri.map((e) => e.seq), [4]); assert.equal(r.ditolak, 1);
  assert.match(c.log[0].messages[0].content, /level 2: باب الصلاة/);
  assert.doesNotMatch(c.log[0].messages[0].content, /متن 1/); // halaman 1-3 tidak ikut
}));

test('perpus-isi-ai: jendela tanpa kandidat tidak memanggil AI sama sekali', () => siapkan(async (db) => {
  for (let q = 1; q <= 6; q++) db.data[`kitab/fathul-muin/halaman/p${String(q).padStart(5, '0')}`] = { ...db.data[`kitab/fathul-muin/halaman/p${String(q).padStart(5, '0')}`], bab: '', teks: 'هذه جملة طويلة جدا من متن الكتاب تتكلم عن حكم من الأحكام الفقهية وتستمر في الكلام حتى تتجاوز الحد المعقول لطول العنوان بكثير.' };
  const c = klienAi([]);
  const r = await aksiIsiAi({ dari: 1 }, 'fathul-muin', db.data['kitab/fathul-muin'], AI_PENGGUNA, { client: c });
  assert.deepEqual([r.dipanggilAi, r.kandidat, r.entri.length, c.log.length], [false, 0, 0, 0]);
}));

test('perpus-isi-ai: alat salah 502, penolakan AI 422, halaman awal di luar kitab 422, peran lain 403', () => siapkan(async (db) => {
  const m = db.data['kitab/fathul-muin'];
  const salah = { messages: { create: async () => ({ stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'hasil_lain', input: {} }] }) } };
  await assert.rejects(() => aksiIsiAi({ dari: 1 }, 'fathul-muin', m, AI_PENGGUNA, { client: salah }), (e) => e.status === 502 && e.code === 'AI_BAD_OUTPUT');
  const tolakAi = { messages: { create: async () => ({ stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'tolak_teks', input: { alasan: 'bukan kitab' } }] }) } };
  await assert.rejects(() => aksiIsiAi({ dari: 1 }, 'fathul-muin', m, AI_PENGGUNA, { client: tolakAi }), (e) => e.status === 422 && e.code === 'TEKS_TIDAK_MEMADAI');
  await assert.rejects(() => aksiIsiAi({ dari: 7 }, 'fathul-muin', m, AI_PENGGUNA, { client: klienAi([]) }), (e) => e.status === 422 && e.code === 'ISI_AI_INVALID');
  for (const u of [{ uid: 'x', role: 'penyusun' }, { uid: 'x', role: 'ustadz' }, null]) await assert.rejects(() => aksiIsiAi({ dari: 1 }, 'fathul-muin', m, u, { client: klienAi([]) }), (e) => e.status === 403);
}));

test('validasiIsiAi: batas halaman, jumlah, dan judul sebelumnya; bawaan dari=1 jumlah=maksimum', () => {
  assert.deepEqual(validasiIsiAi({}), { dari: 1, jumlah: JUMLAH_AI_MAKS, sebelumnya: [] });
  for (const b of [{ dari: 0 }, { dari: 1.5 }, { dari: '1' }, { jumlah: 0 }, { jumlah: JUMLAH_AI_MAKS + 1 }, { sebelumnya: 'x' }, { sebelumnya: Array.from({ length: 9 }, () => ({ judul: 'a', level: 1 })) },
    { sebelumnya: [{ judul: '', level: 1 }] }, { sebelumnya: [{ judul: 'a', level: 9 }] }, { sebelumnya: [null] }, { sebelumnya: [{ judul: 'x'.repeat(301), level: 1 }] }]) {
    assert.throws(() => validasiIsiAi(b), (e) => e.status === 422 && e.code === 'ISI_AI_INVALID', JSON.stringify(b));
  }
});

test('/api/kitab perpus-isi-ai: ustadz dan penyusun 403, tanpa token 401, masukan cacat 422 sebelum batas laju terhitung', () => siapkan(async (db) => {
  for (const t of ['tok_ustadz', 'tok_penyusun']) assert.equal((await lewat(t, { aksi: 'perpus-isi-ai', kitabId: 'fathul-muin', dari: 1 })).code, 403, t);
  { const r = mkRes(); await handler({ method: 'POST', headers: {}, body: { aksi: 'perpus-isi-ai', kitabId: 'fathul-muin', dari: 1 } }, r); assert.equal(r.code, 401); }
  const r = await lewat('tok_editor', { aksi: 'perpus-isi-ai', kitabId: 'fathul-muin', dari: 0 });
  assert.equal(r.code, 422); assert.equal(r.body.error.code, 'ISI_AI_INVALID');
  assert.equal(Object.keys(db.data).some((p) => p.includes('kitabisiai')), false);
}));

test('pemuat klien: isiAi memanggil aksi perpus-isi-ai dengan jendela dan konteks', async () => {
  let b0; const pem = buatPemuat(async (b) => { b0 = b; return { ok: true }; });
  await pem.isiAi('k', { dari: 61, jumlah: 60, sebelumnya: [{ judul: 'x', level: 2 }] });
  assert.deepEqual(b0, { aksi: 'perpus-isi-ai', kitabId: 'k', dari: 61, jumlah: 60, sebelumnya: [{ judul: 'x', level: 2 }] });
  await pem.isiAi('k', { dari: 1 }); assert.deepEqual(b0, { aksi: 'perpus-isi-ai', kitabId: 'k', dari: 1 });
});

/* ---------- Kitab hasil OCR AI: teks berbaris cetak ---------- */
// OCR Arab (src/fotoKitab.js) mempertahankan baris cetak, jadi tiap halaman berisi puluhan baris sepanjang 50-60 karakter.
function halamanOcr() {
  const dasar = ['قال الإمام رحمه الله تعالى في هذه المسألة', 'وذهب جمهور الفقهاء إلى أن الحكم كما ذكرنا', 'ودليلهم في ذلك ما ورد عن النبي صلى الله عليه', 'وسلم في الحديث الصحيح الذي رواه الشيخان وغيرهما'];
  return Array.from({ length: 6 }, (_, i) => {
    const baris = Array.from({ length: 26 }, (_, k) => `${dasar[k % 4]} ${i}${k}`);
    if (i === 1) baris.splice(5, 0, 'باب الوضوء');
    if (i === 3) baris.splice(9, 0, 'فصل في الغسل');
    if (i === 2) baris.splice(7, 0, 'كتاب الله تعالى وسنة رسوله صلى الله عليه وسلم'); // lanjutan kalimat yang kebetulan berawalan "كتاب"
    return { seq: i + 1, juz: 1, hal: i + 1, teks: baris.join('\n') };
  });
}
test('ukuranBarisKhas: median baris panjang; null bila baris terlalu sedikit', () => {
  const m = ukuranBarisKhas(halamanOcr()); assert.ok(m >= 40 && m <= 70, String(m));
  assert.equal(ukuranBarisKhas([{ seq: 1, teks: 'باب\nفصل' }]), null);
});

test('teks OCR berbaris cetak: mesin aturan hanya mengambil judul sungguhan, bukan lanjutan kalimat berawalan kata kunci', () => {
  assert.deepEqual(usulDariHalaman(halamanOcr()).map((e) => [e.seq, e.judul]), [[2, 'باب الوضوء'], [4, 'فصل في الغسل']]);
});

test('teks OCR berbaris cetak: kandidat AI hanya baris yang jauh lebih pendek dari baris biasa, jadi tidak membengkak', () => {
  const r = kandidatJudul(halamanOcr());
  assert.equal(r.bentuk, 'baris');
  const teks = r.kandidat.map((k) => k.teks);
  assert.ok(teks.includes('باب الوضوء') && teks.includes('فصل في الغسل'));
  assert.equal(teks.some((t) => t.startsWith('كتاب الله')), false);
  assert.ok(r.kandidat.length <= 4, `kandidat ${r.kandidat.length} dari ${6 * 26} baris`);
  assert.equal(kandidatJudul([{ seq: 1, teks: 'باب الصلاة\nنص' }]).bentuk, 'paragraf');
});

test('alat AI daftar isi aman untuk Gemini: tidak ada enum pada tipe non-string (penyebab "Permintaan ke AI ditolak"), baik mentah maupun setelah adaptor', () => {
  const periksa = (sk, jalur = '') => {
    if (Array.isArray(sk.enum)) assert.equal(sk.type === 'string' || sk.type === 'STRING', true, `enum pada tipe ${sk.type} di ${jalur}`);
    for (const [k, v] of Object.entries(sk.properties || {})) periksa(v, `${jalur}.${k}`);
    if (sk.items) periksa(sk.items, `${jalur}[]`);
  };
  periksa(TOOL_DAFTAR_ISI.input_schema); periksa(toGeminiSchema(TOOL_DAFTAR_ISI.input_schema));
  assert.equal(toGeminiSchema(TOOL_DAFTAR_ISI.input_schema).properties.pilih.items.properties.level.type, 'INTEGER');
});

test('level di luar 1-4 dari AI dikembalikan ke level dari kata kunci (karena skema tidak lagi membatasi enum)', () => {
  const kand = [{ id: 1, seq: 1, juz: 1, hal: 1, teks: 'باب الصلاة' }, { id: 2, seq: 2, juz: 1, hal: 2, teks: 'فصل في الأذان' }, { id: 3, seq: 3, juz: 1, hal: 3, teks: 'مطلب' }];
  const { entri } = entriDariPilihanAi([{ id: 1, level: 0 }, { id: 2, level: 5 }, { id: 3, level: 2.5 }], kand);
  assert.deepEqual(entri.map((e) => e.level), [2, 3, 4]);
});
