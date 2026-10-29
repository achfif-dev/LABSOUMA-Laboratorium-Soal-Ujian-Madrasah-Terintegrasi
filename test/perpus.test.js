// Pemilih perpustakaan: pembacaan server (src/kitabBaca.js, /api/kitab aksi perpus-*) dan logika klien (web/lib/perpus.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSyamilah } from '../src/syamilah.js';
import { jalankanImpor, isianAwal } from '../web/lib/imporKitab.js';
import { namaUntukForm, labelEntri, bagianTeks, gabungTeks, rentangHal, isianRujukan, rentangBab, buatPemuat, MAKS_TEKS_SOAL } from '../web/lib/perpus.js';
import { __setFirebaseForTest } from '../src/platform.js';
import handler from '../api/kitab.js';
import { fakeDb } from './_fakeDb.js';

const J = 'فتح المعين'; const ZW = '\u200c\u200c';
function buku() { // 6 halaman; nomor cetak 3 kembar (hal 2 dan 2), bab di hal 1 dan 4
  const kep = [`${J}\u00a0\u00a0\u00a0(المعبري)`, 'القسم: الفقه الشافعي', `الكتاب: ${J}`, 'المؤلف: المعبري (ت 987هـ)'];
  const nomor = [1, 2, 2, 3, 4, 5];
  const isi = nomor.flatMap((n, i) => [`${J}(ص: ${n})`, ...(i === 0 ? [`${ZW}باب الصلاة`] : []), ...(i === 3 ? [`${ZW}فصل في الوضوء`] : []), `متن ${i + 1}`, 'ـ', `شرح الصفحة ${i + 1}`]);
  return [...kep, ...isi].join('\r\n');
}
const HASIL = parseSyamilah(buku());
const mkRes = () => { const r = { h: {}, setHeader(k, v) { r.h[k] = v; }, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; };
const fb = (data) => ({ db: fakeDb(data), auth: { verifyIdToken: async (t) => ({ uid: t.replace('tok_', 'u_') }) }, FieldValue: {} });
const lewat = async (token, body) => { const r = mkRes(); await handler({ method: 'POST', headers: { authorization: 'Bearer ' + token }, body }, r); return r; };
const sebagai = (token) => async (body) => { const r = await lewat(token, body); if (r.code !== 200) throw { ...r.body.error, status: r.code }; return r.body; };
async function siapkan(fn) {
  const f = fb({ 'users/u_admin': { role: 'admin' }, 'users/u_penyusun': { role: 'penyusun' }, 'users/u_ustadz': { role: 'ustadz' }, 'users/u_pending': { role: 'pending' } });
  __setFirebaseForTest(f);
  try {
    await jalankanImpor({ panggil: sebagai('tok_admin'), hasil: HASIL, isian: { ...isianAwal(HASIL), judulLatin: "Fathul Mu'in", kitabId: 'fathul-muin' } });
    return await fn(f.db);
  } finally { __setFirebaseForTest(null); }
}

/* ---------- Server ---------- */
test('perpus-*: penyusun dan ustadz boleh membaca; pending dan tanpa token ditolak; kitab nonaktif tidak terbaca', () => siapkan(async (db) => {
  for (const t of ['tok_penyusun', 'tok_ustadz']) { const d = await sebagai(t)({ aksi: 'perpus-daftar' }); assert.equal(d.kitab.length, 1); assert.equal(d.kitab[0].judulLatin, "Fathul Mu'in"); assert.equal(d.kitab[0].bentukMatn, 'pemisah-tatwil'); }
  assert.equal((await lewat('tok_pending', { aksi: 'perpus-daftar' })).code, 403);
  { const r = mkRes(); await handler({ method: 'POST', headers: {}, body: { aksi: 'perpus-daftar' } }, r); assert.equal(r.code, 401); }
  await sebagai('tok_admin')({ aksi: 'impor-aktif', kitabId: 'fathul-muin', aktif: false });
  assert.equal((await sebagai('tok_penyusun')({ aksi: 'perpus-daftar' })).kitab.length, 0);
  const r = await lewat('tok_penyusun', { aksi: 'perpus-isi', kitabId: 'fathul-muin' }); assert.equal(r.code, 404); assert.equal(r.body.error.code, 'KITAB_TIDAK_ADA');
  assert.equal((await lewat('tok_penyusun', { aksi: 'perpus-halaman', kitabId: 'fathul-muin', dariSeq: 1 })).code, 404);
}));

test('perpus-isi dan perpus-halaman menurut urutan: bentuk keluaran, batas 10, tidak membocorkan kitab belum selesai', () => siapkan(async (db) => {
  const u = sebagai('tok_penyusun');
  const isi = await u({ aksi: 'perpus-isi', kitabId: 'fathul-muin' });
  assert.deepEqual(isi.entri.map((e) => [e.judul, e.level, e.seq]), [['باب الصلاة', 2, 1], ['فصل في الوضوء', 3, 4]]);
  const r = await u({ aksi: 'perpus-halaman', kitabId: 'fathul-muin', dariSeq: 2, sampaiSeq: 4 });
  assert.deepEqual(r.halaman.map((p) => p.seq), [2, 3, 4]);
  assert.deepEqual(Object.keys(r.halaman[1]).sort(), ['batasMatn', 'bab', 'hal', 'id', 'juz', 'nomorAnomali', 'seq', 'teks'].sort());
  assert.equal(r.halaman[0].nomorAnomali, undefined); assert.equal(r.halaman[1].nomorAnomali, 'duplikat');
  assert.equal(r.halaman[2].bab, 'فصل في الوضوء');
  assert.equal((await u({ aksi: 'perpus-halaman', kitabId: 'fathul-muin', dariSeq: 6, sampaiSeq: 6 })).halaman.length, 1);
  for (const bad of [{ dariSeq: 0 }, { dariSeq: 7 }, { dariSeq: 'a' }, { dariSeq: 1, sampaiSeq: 99 }, { dariSeq: 3, sampaiSeq: 2 }, { hal: -1 }]) {
    await assert.rejects(() => u({ aksi: 'perpus-halaman', kitabId: 'fathul-muin', ...bad }), (e) => e.status === 422, JSON.stringify(bad));
  }
  await assert.rejects(() => u({ aksi: 'perpus-halaman', kitabId: '../users', dariSeq: 1 }), (e) => e.code === 'KITAB_ID_INVALID');
  await assert.rejects(() => u({ aksi: 'perpus-xyz', kitabId: 'fathul-muin' }), (e) => e.code === 'AKSI_TIDAK_DIKENAL');
  // kitab yang impornya belum selesai tidak boleh terbaca walaupun dokumennya ada
  await sebagai('tok_admin')({ aksi: 'impor-mulai', kitabId: 'setengah', kitab: { ...HASIL.kitab, judulLatin: 'Setengah' }, daftarIsi: [] });
  assert.equal((await u({ aksi: 'perpus-daftar' })).kitab.length, 1);
  await assert.rejects(() => u({ aksi: 'perpus-isi', kitabId: 'setengah' }), (e) => e.status === 404);
}));

test('perpus-halaman menurut nomor cetak: nomor kembar mengembalikan keduanya, urut menurut urutan', () => siapkan(async () => {
  const u = sebagai('tok_penyusun');
  const dua = await u({ aksi: 'perpus-halaman', kitabId: 'fathul-muin', hal: 2 });
  assert.deepEqual(dua.halaman.map((p) => p.seq), [2, 3]);
  assert.deepEqual((await u({ aksi: 'perpus-halaman', kitabId: 'fathul-muin', hal: 4 })).halaman.map((p) => p.seq), [5]);
  assert.deepEqual((await u({ aksi: 'perpus-halaman', kitabId: 'fathul-muin', hal: 999 })).halaman, []);
  assert.deepEqual((await u({ aksi: 'perpus-halaman', kitabId: 'fathul-muin', hal: 2, juz: 2 })).halaman, []);
}));

/* ---------- Klien ---------- */
test('namaUntukForm: ejaan katalog dipakai bila cocok (abaikan huruf besar, apostrof, spasi); selain itu nama Latin, maks 120', () => {
  const kat = [{ nama: "Fathul Mu'in" }, { nama: 'Safinatun Naja' }];
  assert.equal(namaUntukForm('fathul muin', kat), "Fathul Mu'in");
  assert.equal(namaUntukForm('Safinatun-Naja', kat), 'Safinatun Naja');
  assert.equal(namaUntukForm('Kifayatul Akhyar', kat), 'Kifayatul Akhyar');
  assert.equal(namaUntukForm('x'.repeat(200), []).length, 120);
  assert.equal(namaUntukForm('', kat), '');
});

test('bagianTeks dan gabungTeks: matn/syarah dipotong di batasMatn; batas tak diketahui -> seluruh teks', () => {
  const p = HASIL.halaman[0];
  assert.equal(bagianTeks(p, 'matn'), 'متن 1'); assert.equal(bagianTeks(p, 'syarah'), 'شرح الصفحة 1'); assert.equal(bagianTeks(p, 'semua'), p.teks);
  const tanpa = { teks: 'abc', batasMatn: null };
  assert.equal(bagianTeks(tanpa, 'matn'), 'abc'); assert.equal(bagianTeks(tanpa, 'syarah'), 'abc');
  assert.equal(gabungTeks(HASIL.halaman.slice(0, 2), 'matn'), 'متن 1\nمتن 2');
});

test('rentangHal: terkecil-terbesar, nomor kembar/mundur tidak merusak, maks 20 karakter', () => {
  assert.equal(rentangHal('', '31'), '31'); assert.equal(rentangHal('31', 32, 33), '31-33'); assert.equal(rentangHal('', 534, 523, 534), '523-534');
  assert.equal(rentangHal('', ''), ''); assert.equal(rentangHal(undefined, 7), '7'); assert.ok(rentangHal('1', 99999999999999999999999).length <= 20);
});

test('isianRujukan: ganti vs tambah; bab dipotong 120; nama mengikuti katalog; juz string', () => {
  const kitab = { judulLatin: 'Fathul Muin' };
  const a = isianRujukan({ kitab, halaman: HASIL.halaman.slice(0, 2), katalog: [{ nama: "Fathul Mu'in" }] });
  assert.equal(a.nama, "Fathul Mu'in"); assert.equal(a.juz, '1'); assert.equal(a.hal, '1-2'); assert.equal(a.bab, 'باب الصلاة');
  assert.equal(a.teks, `${HASIL.halaman[0].teks}\n${HASIL.halaman[1].teks}`);
  const t = isianRujukan({ kitab, halaman: [HASIL.halaman[4]], tambah: true, sekarang: { teks: 'lama', hal: '2', bab: 'bab lama' } });
  assert.equal(t.teks, `lama\n${HASIL.halaman[4].teks}`); assert.equal(t.hal, '2-4'); assert.equal(t.bab, 'bab lama');
  const kosong = isianRujukan({ kitab, halaman: [HASIL.halaman[4]], tambah: true, sekarang: { teks: '  ' } });
  assert.equal(kosong.teks, HASIL.halaman[4].teks);
  const panjang = isianRujukan({ kitab, halaman: [HASIL.halaman[0]], babNama: 'ب'.repeat(300) });
  assert.equal(panjang.bab.length, 120);
  assert.ok(MAKS_TEKS_SOAL === 6000);
});

test('rentangBab dan labelEntri', () => {
  const e = [{ judul: 'باب', level: 2, seq: 1, hal: 1 }, { judul: 'فصل أ', level: 3, seq: 4, hal: 3 }, { judul: 'فصل ب', level: 3, seq: 6, hal: 5 }, { judul: 'باب 2', level: 2, seq: 6, hal: 5 }];
  assert.deepEqual(rentangBab(e, 0, 9), { awal: 1, akhir: 5 }); // sampai sebelum judul setingkat berikutnya (seq 6)
  assert.deepEqual(rentangBab(e, 1, 9), { awal: 4, akhir: 5 });
  assert.deepEqual(rentangBab(e, 3, 9), { awal: 6, akhir: 9 });
  assert.equal(rentangBab(e, 9, 9), null);
  assert.equal(labelEntri(e[1]), '– – فصل أ (hal. 3)'); assert.equal(labelEntri(e[0]), '– باب (hal. 1)');
});

test('buatPemuat: daftar dan daftar isi disimpan; halaman diambil dalam jendela dan tidak diambil dua kali', () => siapkan(async () => {
  const log = []; const dasar = sebagai('tok_penyusun');
  const pem = buatPemuat(async (b) => { log.push(b.aksi + (b.dariSeq ? `:${b.dariSeq}-${b.sampaiSeq}` : '')); return dasar(b); });
  await pem.daftar(); await pem.daftar(); assert.equal(log.filter((x) => x === 'perpus-daftar').length, 1);
  await pem.isi('fathul-muin'); await pem.isi('fathul-muin'); assert.equal(log.filter((x) => x === 'perpus-isi').length, 1);
  const a = await pem.halaman('fathul-muin', 1, 1, 6); assert.deepEqual(a.map((p) => p.seq), [1]);
  assert.ok(log.includes('perpus-halaman:1-5')); // satu panggilan mengambil jendela 5 halaman
  const b = await pem.halaman('fathul-muin', 2, 4, 6); assert.deepEqual(b.map((p) => p.seq), [2, 3, 4]);
  assert.equal(log.filter((x) => x.startsWith('perpus-halaman')).length, 1); // tidak ada panggilan baru
  const c = await pem.halaman('fathul-muin', 5, 6, 6); assert.deepEqual(c.map((p) => p.seq), [5, 6]);
  assert.equal(log.filter((x) => x.startsWith('perpus-halaman')).length, 2);
  assert.deepEqual((await pem.cariHal('fathul-muin', 2)).map((p) => p.seq), [2, 3]);
}));

test('Paket Dauri: halaman perpustakaan sebagai sumber terpisah menghasilkan rujukan hal. per segmen dari nomor cetaknya', async () => {
  const PK = await import('../web/lib/paket.js');
  const sumber = [{ teks: '', hal: '' }, ...HASIL.halaman.map((p) => ({ teks: p.teks, hal: String(p.hal) }))];
  const r = PK.rencanaPaket({ dawr: 1, sumber, komposisi: { L1: 30, L2: 50, L3: 20 }, lanjutan: 0.4 });
  assert.equal(r.masalah, ''); assert.equal(r.segmen.length, 1);
  assert.match(r.segmen[0].hal, /^1.5$/); // halaman 1 sampai 5 (nomor cetak kembar 2,2 tidak mengganggu)
});
