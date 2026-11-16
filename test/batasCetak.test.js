// Batas halaman cetak di dalam teks: logika murni (web/lib/batasCetak.js) dan server (src/kitabBatas.js; aksi perpus-batas-* dan peralihan lewat impor-selesai).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSyamilah } from '../src/syamilah.js';
import { jalankanImpor, isianAwal } from '../web/lib/imporKitab.js';
import { __setFirebaseForTest } from '../src/platform.js';
import { kosongkanSimpananCari } from '../src/kitabCari.js';
import { aksiBatasMulai } from '../src/kitabBatas.js';
import { barisKalimat, awalDi, cocokAwal, periksaTanda, rencanaBatas, ratakan, petaSeqBaru, teksPotongan, kompakkan, bukaKompak, ringkasTanda } from '../web/lib/batasCetak.js';
import { _uji as ujiDaftar } from '../src/daftarKitab.js';
import handler from '../src/rute/kitab.js';
import { fakeDb } from './_fakeDb.js';

const J = 'فتح المعين'; const ZW = '‌‌';
function buku() { // 5 halaman digital, tiap halaman tiga baris; nomor cetak asli 1..5; judul bab di halaman 1 dan 3
  const kep = [`${J}   (المعبري)`, 'القسم: الفقه الشافعي', `الكتاب: ${J}`, 'المؤلف: المعبري (ت 987هـ)'];
  const isi = [1, 2, 3, 4, 5].flatMap((n) => [`${J}(ص: ${n})`, ...(n === 1 ? [`${ZW}باب الصلاة`] : []), ...(n === 3 ? [`${ZW}باب الزكاة`] : []), `الجملة الأولى من الصفحة ${n}.`, `الجملة الثانية من الصفحة ${n}.`, `الجملة الثالثة من الصفحة ${n}.`]);
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
const K = 'fathul-muin'; const admin = () => sebagai('tok_admin'); const editor = () => sebagai('tok_editor');
const teksAsli = async (seq) => (await editor()({ aksi: 'perpus-halaman', kitabId: K, dariSeq: seq })).halaman[0].teks;
/** Tanda pada baris ke-`baris` (1-based) halaman `seq`. */
async function tandaDi(seq, baris, hal, juz) { const t = await teksAsli(seq); const b = barisKalimat(t)[baris - 1]; return { seq, off: b.mulai, hal, ...(juz ? { juz } : {}), awal: awalDi(t, b.mulai) }; }
async function tandaContoh() { // A(1,b1)=10 B(1,b3)=11 C(2,b2)=12 D(3,b2)=13 E(4,b1)=14 -> 6 halaman: 5 potongan + halaman 5 disalin
  return [await tandaDi(1, 1, 10), await tandaDi(1, 3, 11), await tandaDi(2, 2, 12), await tandaDi(3, 2, 13), await tandaDi(4, 1, 14)];
}
const simpanDraf = (tanda, rev = 0) => editor()({ aksi: 'perpus-batas-simpan', kitabId: K, tanda, rev });
async function terapkan(sebagaiAdmin = admin()) {
  const m = await sebagaiAdmin({ aksi: 'perpus-batas-mulai', kitabId: K }); let r;
  do { r = await sebagaiAdmin({ aksi: 'perpus-batas-tulis', kitabId: K }); } while (!r.selesai);
  await sebagaiAdmin({ aksi: 'impor-selesai', kitabId: K });
  return { mulai: m, tulis: r };
}
const semuaHalaman = async (n) => (await Promise.all(Array.from({ length: Math.ceil(n / 10) }, (_, i) => editor()({ aksi: 'perpus-halaman', kitabId: K, dariSeq: i * 10 + 1, sampaiSeq: Math.min(n, i * 10 + 10) })))).flatMap((r) => r.halaman);

/* ---------- Logika murni ---------- */
test('barisKalimat: tiap baris dan tiap kalimat jadi satu baris dengan posisi awal yang tepat', () => {
  const t = 'الأول. الثاني؟ الثالث\n\n  الرابع';
  const b = barisKalimat(t);
  assert.deepEqual(b.map((x) => x.teks), ['الأول.', 'الثاني؟', 'الثالث', 'الرابع']);
  for (const x of b) assert.equal(t.slice(x.mulai, x.mulai + x.teks.length), x.teks);
  assert.deepEqual(barisKalimat(''), []); assert.deepEqual(barisKalimat('   \n  '), []);
  assert.equal(barisKalimat('3.14 adalah pi').length, 1, 'titik di tengah angka bukan akhir kalimat');
  assert.equal(barisKalimat('satu. dua').length, 2);
});

test('awalDi dan cocokAwal: penjaga posisi tahan beda spasi, menolak teks yang bergeser', () => {
  const t = 'سطر  أول\nسطر ثان هنا';
  const a = awalDi(t, 10); assert.ok(a.length > 0);
  assert.equal(cocokAwal(t, 10, a), true);
  assert.equal(cocokAwal('x' + t, 10, a), false);
  assert.equal(cocokAwal(t, 3, ''), true, 'tanpa penjaga selalu cocok');
});

test('periksaTanda: mengurutkan, membersihkan, dan menolak yang cacat', () => {
  assert.deepEqual(periksaTanda([{ seq: 2, off: 5, hal: 7, awal: ' a  b ' }, { seq: 1, off: 0, hal: 6, juz: 2, bocor: 1 }], 5).tanda, [{ seq: 1, off: 0, hal: 6, juz: 2, awal: '' }, { seq: 2, off: 5, hal: 7, awal: 'a b' }]);
  for (const x of [null, [{ seq: 0, off: 0, hal: 1 }], [{ seq: 6, off: 0, hal: 1 }], [{ seq: 1, off: -1, hal: 1 }], [{ seq: 1, off: 0, hal: 100000 }], [{ seq: 1, off: 0, hal: 1, juz: 100 }], [{ seq: 1, off: 0, hal: 1 }, { seq: 1, off: 0, hal: 2 }], [{ seq: 1, off: 0, hal: 1, awal: 5 }], [null]]) assert.ok(periksaTanda(x, 5).galat, JSON.stringify(x));
});

test('rencanaBatas: salin sebelum dan sesudah, potong di antara; jumlah dan peta daftar isi', () => {
  const tanda = periksaTanda([{ seq: 2, off: 0, hal: 30 }, { seq: 2, off: 40, hal: 31 }, { seq: 4, off: 10, hal: 32 }], 6).tanda;
  const r = rencanaBatas(tanda, 6);
  assert.equal(r.jumlah, 1 + 3 + 2); // halaman 1 disalin; 3 potongan; halaman 5 dan 6 disalin
  const h = ratakan(r.rencana);
  assert.deepEqual(h.map((x) => (x.j === 'salin' ? `s${x.seq}` : `p${x.dari}-${x.sampai}`)), ['s1', 'p2,0-2,40', 'p2,40-4,10', 'p4,10-4,', 's5', 's6']);
  assert.deepEqual([...petaSeqBaru(h, 6)].map(([a, b]) => `${a}>${b}`), ['1>1', '2>2', '3>3', '4>3', '5>5', '6>6']);
  assert.deepEqual(bukaKompak(JSON.parse(JSON.stringify(kompakkan(r.rencana)))), r.rencana, 'bentuk padat bisa dibuka kembali');
  assert.match(rencanaBatas([], 6).galat, /Belum ada tanda/);
});

test('rencanaBatas: tanda pertama bukan di awal halaman menyisakan potongan awal dengan nomor aslinya', () => {
  const r = rencanaBatas(periksaTanda([{ seq: 1, off: 7, hal: 9 }], 3).tanda, 3);
  assert.equal(r.jumlah, 4); const h = ratakan(r.rencana);
  assert.deepEqual([h[0].hal, h[0].dari, h[0].sampai], [null, [1, 0], [1, 7]]);
  assert.deepEqual([h[1].hal, h[1].dari, h[1].sampai], [9, [1, 7], [1, null]]);
  assert.deepEqual(ringkasTanda(periksaTanda([{ seq: 1, off: 7, hal: 9 }], 3).tanda, 3), { jumlahBaru: 4, jumlahLama: 3, selisih: 1, dariSeq: 1, sampaiSeq: 1, jumlahTanda: 1 });
});

test('teksPotongan: dalam satu halaman, melintasi halaman, sampai akhir halaman; bagian kosong dibuang', () => {
  const T = { 1: 'aaa bbb', 2: 'ccc', 3: 'ddd eee' }; const d = (q) => T[q];
  assert.equal(teksPotongan({ dari: [1, 4], sampai: [1, null] }, d).teks, 'bbb');
  assert.equal(teksPotongan({ dari: [1, 4], sampai: [3, 4] }, d).teks, 'bbb\nccc\nddd');
  assert.equal(teksPotongan({ dari: [1, 0], sampai: [3, 0] }, d).teks, 'aaa bbb\nccc', 'tanda di awal halaman = berakhir di halaman sebelumnya');
  assert.deepEqual(teksPotongan({ dari: [1, 4], sampai: [3, 4] }, d).seqs, [1, 2, 3]);
});

/* ---------- Server ---------- */
test('peran: penyusun dan ustadz ditolak; editor boleh menyimpan draf tetapi tidak menerapkan; tanpa token 401', () => siapkan(async () => {
  for (const t of ['tok_penyusun', 'tok_ustadz']) for (const a of ['perpus-batas-baca', 'perpus-batas-simpan', 'perpus-batas-mulai', 'perpus-batas-tulis']) assert.equal((await lewat(t, { aksi: a, kitabId: K, tanda: [], rev: 0 })).code, 403, `${t} ${a}`);
  { const r = mkRes(); await handler({ method: 'POST', headers: {}, body: { aksi: 'perpus-batas-baca', kitabId: K } }, r); assert.equal(r.code, 401); }
  assert.equal((await simpanDraf(await tandaContoh())).ok, true);
  for (const a of ['perpus-batas-mulai', 'perpus-batas-tulis']) assert.equal((await lewat('tok_editor', { aksi: a, kitabId: K })).code, 403, a);
}));

test('draf: simpan, baca, bentrok 409, tanda cacat 422 tanpa memakai jatah laju', () => siapkan(async (db) => {
  const tanda = await tandaContoh();
  assert.deepEqual(await editor()({ aksi: 'perpus-batas-baca', kitabId: K }), { tanda: [], rev: 0, usang: false });
  assert.equal((await simpanDraf(tanda, 0)).rev, 1);
  const b = await editor()({ aksi: 'perpus-batas-baca', kitabId: K }); assert.equal(b.rev, 1); assert.equal(b.tanda.length, 5); assert.equal(b.disimpanOleh, 'Nama editor');
  await assert.rejects(() => simpanDraf(tanda, 0), (e) => e.status === 409 && e.code === 'BATAS_BENTROK');
  assert.equal((await simpanDraf(tanda.slice(0, 2), 1)).rev, 2);
  const jatah = () => db.data['rate/u_editor_kitabbatas'].dayCount; const sebelum = jatah();
  for (const x of [[{ seq: 1, off: 0, hal: -1 }], 'bukan larik', [{ seq: 1, off: 0, hal: 1 }, { seq: 1, off: 0, hal: 2 }]]) await assert.rejects(() => simpanDraf(x, 2), (e) => e.status === 422);
  assert.equal(jatah(), sebelum, 'cacat bentuk ditolak sebelum jatah laju dihitung');
  await assert.rejects(() => simpanDraf([{ seq: 99, off: 0, hal: 1 }], 2), (e) => e.status === 422); // urutan di luar kitab baru diketahui server
  assert.equal((await editor()({ aksi: 'perpus-batas-baca', kitabId: K })).rev, 2, 'yang ditolak tidak menulis apa pun');
}));

test('terapkan: lima tanda menjadi enam halaman cetak; teks, nomor, daftar isi, anomali, dan pencarian mengikuti', () => siapkan(async (db) => {
  const asli = []; for (let s = 1; s <= 5; s++) asli.push(await teksAsli(s));
  await simpanDraf(await tandaContoh());
  const m = await admin()({ aksi: 'perpus-batas-mulai', kitabId: K });
  assert.deepEqual([m.jumlahLama, m.jumlahBaru, m.grup], [5, 6, 1]);
  // selama berjalan kitab lama tetap aktif dan terbaca
  assert.equal((await editor()({ aksi: 'perpus-halaman', kitabId: K, dariSeq: 5 })).kitab.jumlahHalaman, 5);
  assert.ok(db.data[`kitab/${K}/impor/berjalan`].batas);
  const t = await admin()({ aksi: 'perpus-batas-tulis', kitabId: K }); assert.deepEqual([t.tertulis, t.selesai], [6, true]);
  assert.equal((await admin()({ aksi: 'perpus-batas-tulis', kitabId: K })).tertulis, 0, 'panggilan ulang sesudah selesai tidak menulis lagi');
  await admin()({ aksi: 'impor-selesai', kitabId: K });

  const h = await semuaHalaman(6);
  assert.deepEqual(h.map((p) => p.hal), [10, 11, 12, 13, 14, 5]);
  const baris = (s) => asli[s - 1].split('\n');
  assert.equal(h[0].teks, `${baris(1)[0]}\n${baris(1)[1]}`);
  assert.equal(h[1].teks, `${baris(1)[2]}\n${baris(2)[0]}`);
  assert.equal(h[2].teks, `${baris(2)[1]}\n${baris(2)[2]}\n${baris(3)[0]}`);
  assert.equal(h[3].teks, `${baris(3)[1]}\n${baris(3)[2]}`);
  assert.equal(h[4].teks, asli[3]); assert.equal(h[5].teks, asli[4]);
  assert.ok(h.every((p) => p.batasMatn === null || p.batasMatn === undefined));
  assert.equal(h[5].nomorAnomali, 'mundur', 'halaman 5 disalin apa adanya: nomornya 5 sesudah 14'); assert.equal(h[1].nomorAnomali, undefined);
  // metadata dan daftar isi
  const meta = db.data[`kitab/${K}`];
  assert.equal(meta.jumlahHalaman, 6); assert.equal(meta.ruang, '_r2'); assert.equal(meta.revisi, 2); assert.equal(meta.halamanVirtual, false); assert.equal(meta.penomoranSesuaiCetak, true);
  const isi = await editor()({ aksi: 'perpus-isi', kitabId: K });
  assert.deepEqual(isi.entri.map((e) => [e.seq, e.hal]), [[1, 10], [3, 12]]); // judul halaman 1 -> halaman cetak 10; judul halaman 3 -> halaman cetak 12 (memuat awal halaman digital 3)
  // ruang lama terhapus; pencarian memakai nomor baru tanpa membangun indeks lagi
  assert.equal(Object.keys(db.data).filter((p) => p.startsWith(`kitab/${K}/halaman/`)).length, 0);
  const c = await editor()({ aksi: 'perpus-cari', kitabId: K, q: 'الجملة الثانية من الصفحة 2' });
  assert.equal(c.siap, true); assert.equal(c.hasil[0].hal, 12);
  // cari menurut nomor cetak baru
  assert.deepEqual((await editor()({ aksi: 'perpus-halaman', kitabId: K, hal: 13 })).halaman.map((p) => p.seq), [4]);
  // daftar kitab untuk pemilih memuat jumlah halaman baru
  assert.equal((await editor()({ aksi: 'perpus-daftar' })).kitab[0].jumlahHalaman, 6);
}));

test('tanda pertama di tengah halaman: potongan awal memakai nomor aslinya', () => siapkan(async () => {
  const asli2 = (await teksAsli(2)).split('\n');
  await simpanDraf([await tandaDi(2, 2, 20)]);
  const r = await terapkan(); assert.equal(r.mulai.jumlahBaru, 6);
  const h = await semuaHalaman(6);
  assert.deepEqual(h.map((p) => p.hal), [1, 2, 20, 3, 4, 5]);
  assert.equal(h[1].teks, asli2[0]); assert.equal(h[2].teks, `${asli2[1]}\n${asli2[2]}`);
}));

test('tanpa draf: mulai 422 dan tulis 404; draf yang sudah dipakai menjadi usang (409) dan tidak terbaca lagi', () => siapkan(async () => {
  await assert.rejects(() => admin()({ aksi: 'perpus-batas-mulai', kitabId: K }), (e) => e.status === 422 && e.code === 'BATAS_KOSONG');
  await assert.rejects(() => admin()({ aksi: 'perpus-batas-tulis', kitabId: K }), (e) => e.status === 404 && e.code === 'BATAS_TIDAK_ADA');
  await simpanDraf(await tandaContoh()); await terapkan();
  const b = await editor()({ aksi: 'perpus-batas-baca', kitabId: K }); assert.deepEqual([b.tanda.length, b.usang, b.rev], [0, true, 1]);
  await assert.rejects(() => admin()({ aksi: 'perpus-batas-mulai', kitabId: K }), (e) => e.status === 409 && e.code === 'BATAS_USANG');
  assert.equal((await simpanDraf([await tandaDi(1, 1, 5)], 1)).rev, 2, 'draf usang boleh ditimpa dengan tanda baru');
}));

test('teks yang dikoreksi sesudah penandaan menggeser posisi: penjaga menolak, kitab lama tidak berubah', () => siapkan(async (db) => {
  await simpanDraf(await tandaContoh());
  const p2 = (await editor()({ aksi: 'perpus-halaman', kitabId: K, dariSeq: 2 })).halaman[0];
  await editor()({ aksi: 'perpus-koreksi', kitabId: K, seq: 2, rev: p2.rev || 0, teks: `سطر مضاف\n${p2.teks}` });
  await admin()({ aksi: 'perpus-batas-mulai', kitabId: K });
  await assert.rejects(() => admin()({ aksi: 'perpus-batas-tulis', kitabId: K }), (e) => e.status === 422 && e.code === 'BATAS_BERGESER' && /halaman cetak 12/.test(e.message));
  assert.equal(db.data[`kitab/${K}`].jumlahHalaman, 5); assert.equal(db.data[`kitab/${K}`].ruang, undefined);
  assert.equal((await editor()({ aksi: 'perpus-halaman', kitabId: K, dariSeq: 5 })).halaman.length, 1, 'kitab lama tetap terbaca');
}));

test('kitab berubah di tengah penerapan: 409; mulai lagi membersihkan sisa dan bisa diselesaikan', () => siapkan(async (db) => {
  await simpanDraf(await tandaContoh());
  await admin()({ aksi: 'perpus-batas-mulai', kitabId: K });
  const p5 = (await editor()({ aksi: 'perpus-halaman', kitabId: K, dariSeq: 5 })).halaman[0];
  await editor()({ aksi: 'perpus-koreksi', kitabId: K, seq: 5, rev: p5.rev || 0, teks: `${p5.teks} (dikoreksi)` });
  await assert.rejects(() => admin()({ aksi: 'perpus-batas-tulis', kitabId: K }), (e) => e.status === 409 && e.code === 'KITAB_BERUBAH');
  await admin()({ aksi: 'perpus-batas-mulai', kitabId: K });
  assert.equal(Object.keys(db.data).filter((p) => p.startsWith(`kitab/${K}/halaman_r2/`)).length, 0, 'sisa percobaan dibersihkan');
  let r; do { r = await admin()({ aksi: 'perpus-batas-tulis', kitabId: K }); } while (!r.selesai);
  await admin()({ aksi: 'impor-selesai', kitabId: K });
  assert.match((await semuaHalaman(6))[5].teks, /dikoreksi/, 'koreksi teks ikut terbawa pada halaman yang disalin');
}));

test('impor ulang atau penambahan jilid yang belum selesai menolak penerapan (409)', () => siapkan(async (db) => {
  await simpanDraf(await tandaContoh());
  db.data[`kitab/${K}/impor/berjalan`] = { revisi: 2, ruang: '_r2', kitab: {}, jumlahHalaman: 3 };
  await assert.rejects(() => admin()({ aksi: 'perpus-batas-mulai', kitabId: K }), (e) => e.status === 409 && e.code === 'IMPOR_BERJALAN');
  assert.ok(db.data[`kitab/${K}/impor/berjalan`], 'job lain tidak disentuh');
}));

test('halaman cetak yang kelewat panjang (tanda terlewat) ditolak dengan petunjuk lokasinya', () => siapkan(async (db) => {
  const tanda = [await tandaDi(2, 1, 20), await tandaDi(4, 1, 21)];
  db.data[`kitab/${K}/halaman/p00003`].teks = 'ك'.repeat(13000);
  await simpanDraf(tanda); await admin()({ aksi: 'perpus-batas-mulai', kitabId: K });
  await assert.rejects(() => admin()({ aksi: 'perpus-batas-tulis', kitabId: K }), (e) => e.status === 422 && /maksimal 12000/.test(e.message) && /urutan 2 dan 4/.test(e.message));
}));

test('mulai langsung memanggil modul: hanya admin', () => siapkan(async (db) => {
  await assert.rejects(() => aksiBatasMulai({}, K, db.data[`kitab/${K}`], { uid: 'x', role: 'editor' }), (e) => e.status === 403);
  await assert.rejects(() => aksiBatasMulai({}, K, db.data[`kitab/${K}`], null), (e) => e.status === 403);
}));

test('penyuntingan tanda di layar: tambah, ganti di posisi sama, hapus, dan usulan nomor', async () => {
  const { tambahTanda, hapusTanda, adaTanda, usulHal } = await import('../web/lib/batasCetak.js');
  let d = [];
  d = tambahTanda(d, { seq: 3, off: 10, hal: 12, awal: '' }); d = tambahTanda(d, { seq: 1, off: 0, hal: 10, awal: '' }); d = tambahTanda(d, { seq: 3, off: 10, hal: 99, awal: '' });
  assert.deepEqual(d.map((x) => [x.seq, x.hal]), [[1, 10], [3, 99]]);
  assert.equal(adaTanda(d, 3, 10).hal, 99); assert.equal(adaTanda(d, 3, 11), null);
  assert.deepEqual(hapusTanda(d, 1, 0).map((x) => x.seq), [3]);
  assert.equal(usulHal(d, 2, 5, 7), 11, 'nomor tanda sebelumnya + 1'); assert.equal(usulHal(d, 1, 0, 7), 7, 'tanpa tanda sebelumnya: nomor halaman itu sekarang'); assert.equal(usulHal([], 1, 0), 1);
  assert.equal(usulHal([{ seq: 1, off: 0, hal: 99999 }], 2, 0), 99999);
});

test('pemuat klien: batasTerapkan menjalankan mulai, tulis, dan impor-selesai, lalu membuang simpanan kitab itu', () => siapkan(async () => {
  const { buatPemuat } = await import('../web/lib/perpus.js');
  const pem = buatPemuat(admin());
  await pem.isi(K); await pem.halaman(K, 1, 5, 5); await pem.daftar();
  const b0 = await pem.batasBaca(K); const s = await pem.batasSimpan(K, { tanda: await tandaContoh(), rev: b0.rev }); assert.equal(s.rev, 1);
  const langkah = []; const r = await pem.batasTerapkan(K, { kemajuan: (x) => langkah.push(x.tahap) });
  assert.deepEqual([r.jumlahLama, r.jumlahBaru], [5, 6]); assert.deepEqual(langkah, ['mulai', 'tulis', 'selesai']);
  assert.equal(pem.simpanan.halaman.size, 0); assert.equal(pem.simpanan.isi.has(K), false); assert.equal(pem.simpanan.daftar, null);
  assert.equal((await pem.isi(K)).kitab.jumlahHalaman, 6);
}));
