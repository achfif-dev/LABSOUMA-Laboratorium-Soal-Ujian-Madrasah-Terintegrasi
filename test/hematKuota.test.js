// Penghematan kuota Firestore Spark: daftar kitab berringkasan, cadangan inkremental, pemangkasan riwayat, pengecualian indeks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { daftarAktif, batalkanDaftar, DOK_RINGKAS, TTL_MEMORI_MS, TTL_DOKUMEN_MS, _uji } from '../src/daftarKitab.js';
import { pangkasRiwayat } from '../src/riwayat.js';
import * as V from '../web/lib/drive.js';

// Firestore tiruan kecil yang menghitung pembacaan dokumen.
function dbTiruan(kitab = {}) {
  const dok = new Map(); const st = { baca: 0, tulis: 0, hapus: 0 };
  const kolKitab = Object.entries(kitab);
  return {
    st, dok,
    doc: (p) => ({
      path: p,
      get: async () => { st.baca++; return { exists: dok.has(p), data: () => dok.get(p) }; },
      set: async (v) => { st.tulis++; dok.set(p, JSON.parse(JSON.stringify(v))); },
      delete: async () => { st.hapus++; dok.delete(p); },
    }),
    collection: (n) => ({ get: async () => { assert.equal(n, 'kitab'); st.baca += kolKitab.length; return { docs: kolKitab.map(([id, d]) => ({ id, data: () => d })) }; } }),
  };
}
const k = (judulLatin, extra = {}) => ({ judul: 'ج', judulLatin, jumlahHalaman: 10, bentukMatn: 'tanpa-pemisah', aktif: true, status: 'siap', ...extra });

test('daftarAktif: pembacaan pertama membaca koleksi lalu menulis ringkasan; berikutnya dari memori; kitab nonaktif/belum siap tidak ikut; terurut', async () => {
  _uji.reset();
  const db = dbTiruan({ b: k('Fathul Qarib'), a: k('Ghayatul Whusul'), x: k('Mati', { aktif: false }), y: k('Belum', { status: 'mengimpor' }) });
  let t = 1_000;
  const r1 = await daftarAktif(db, { sekarang: () => t });
  assert.deepEqual(r1.map((x) => x.id), ['b', 'a']);
  assert.equal(db.dok.has(DOK_RINGKAS), true);
  const bacaSetelahPertama = db.st.baca;
  await daftarAktif(db, { sekarang: () => t + TTL_MEMORI_MS - 1 });
  assert.equal(db.st.baca, bacaSetelahPertama, 'dalam TTL memori: nol pembacaan');
});

test('daftarAktif: memori kedaluwarsa -> 1 pembacaan dokumen ringkasan (bukan N kitab); ringkasan kedaluwarsa -> baca koleksi lagi', async () => {
  _uji.reset();
  const db = dbTiruan(Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`k${i}`, k(`Kitab ${String(i).padStart(3, '0')}`)])));
  let t = 0;
  await daftarAktif(db, { sekarang: () => t });
  assert.equal(db.st.baca, 101); // 1 (ringkasan tidak ada) + 100 (koleksi), sekali saja
  _uji.reset(); db.st.baca = 0; t += TTL_MEMORI_MS + 1; // instance baru / memori basi
  const r = await daftarAktif(db, { sekarang: () => t });
  assert.equal(r.length, 100);
  assert.equal(db.st.baca, 1, '100 kitab dibaca lewat 1 dokumen ringkasan');
  _uji.reset(); db.st.baca = 0; t += TTL_DOKUMEN_MS + 1;
  await daftarAktif(db, { sekarang: () => t });
  assert.equal(db.st.baca, 101, 'ringkasan kedaluwarsa: bangun ulang dari koleksi');
});

test('batalkanDaftar: menghapus ringkasan dan memori sehingga kitab yang baru diaktifkan langsung terlihat', async () => {
  _uji.reset();
  const sumber = { a: k('A', { aktif: false }) };
  const db = dbTiruan(sumber);
  assert.equal((await daftarAktif(db)).length, 0);
  sumber.a.aktif = true;
  assert.equal((await daftarAktif(db)).length, 0, 'masih dari cache');
  await batalkanDaftar(db);
  assert.equal(db.dok.has(DOK_RINGKAS), false);
  assert.equal((await daftarAktif(db)).length, 1);
});

test('daftarAktif: gagal menulis ringkasan tidak menggagalkan pembacaan; undefined dibersihkan', async () => {
  _uji.reset();
  const db = dbTiruan({ a: k('A', { pengarang: undefined }) });
  const asli = db.doc; db.doc = (p) => ({ ...asli(p), set: async () => { throw new Error('quota'); } });
  assert.equal((await daftarAktif(db)).length, 1);
});

// ---- cadangan inkremental ----
const soal = (id, updatedAt, extra = {}) => ({ id, updatedAt, status: 'draft', ...extra });

test('gabungInkremental: yang berubah menang, yang baru ditambah, terurut menurut id, tidak mengubah masukan', () => {
  const dasar = [soal('b', '2026-01-01T00:00:00.000Z', { kunci: 'A' }), soal('a', '2026-01-01T00:00:00.000Z')];
  const ubah = [soal('b', '2026-02-01T00:00:00.000Z', { kunci: 'C' }), soal('c', '2026-02-02T00:00:00.000Z')];
  const g = V.gabungInkremental(dasar, ubah);
  assert.deepEqual(g.map((q) => q.id), ['a', 'b', 'c']);
  assert.equal(g[1].kunci, 'C');
  assert.equal(dasar.length, 2); assert.equal(dasar[0].kunci, 'A');
});

test('selisih jumlah gabungan vs server = jumlah soal yang dihapus (dasar pembatalan inkremental)', () => {
  const dasar = [soal('a', 't'), soal('b', 't'), soal('c', 't')];
  const gabung = V.gabungInkremental(dasar, [soal('d', 't')]); // server: c dihapus, d baru -> 3 dokumen
  assert.notEqual(gabung.length, 3, 'gabungan 4 != server 3: harus penuh');
  assert.equal(V.gabungInkremental(dasar, [soal('b', 't2')]).length, 3, 'tanpa penghapusan: sama dengan server');
});

test('layakInkremental: menolak tanpa dasar, tanpa waktu, penuh terlalu lama, atau waktu di masa depan', () => {
  const now = Date.parse('2026-11-07T00:00:00Z');
  assert.equal(V.layakInkremental(null, { now }).ok, false);
  assert.equal(V.layakInkremental({ dibuat: '' }, { now }).ok, false);
  assert.equal(V.layakInkremental({ dibuat: '2026-11-01T00:00:00Z', penuhSejak: '2026-11-01T00:00:00Z' }, { now }).ok, true);
  assert.equal(V.layakInkremental({ dibuat: '2026-11-06T00:00:00Z', penuhSejak: '2026-09-01T00:00:00Z' }, { now }).ok, false, 'penuh terakhir > 30 hari');
  assert.equal(V.layakInkremental({ dibuat: '2026-11-06T00:00:00Z', penuhSejak: '' }, { now }).ok, true, 'cadangan lama tanpa penuhSejak: dianggap penuh pada dibuat');
  assert.equal(V.layakInkremental({ dibuat: '2027-01-01T00:00:00Z' }, { now }).ok, false);
});

test('batasUbah mundur 15 menit dari waktu cadangan dasar; cadanganTerbaru memilih berkas bernama cadangan paling baru, mengabaikan berkas lain', () => {
  assert.equal(V.batasUbah({ dibuat: '2026-11-01T10:15:00.000Z' }), '2026-11-01T10:00:00.000Z');
  const f = V.cadanganTerbaru([{ name: 'labsouma-backup-2026-10-01-0900.json' }, { name: 'labsouma-backup-2026-11-01-0800.json' }, { name: 'labsouma-soal-saya-2026-11-05.json' }, { name: 'catatan.txt' }]);
  assert.equal(f.name, 'labsouma-backup-2026-11-01-0800.json');
  assert.equal(V.cadanganTerbaru([]), null);
});

test('buatBackup mencatat jenis/dasar/penuhSejak dan periksaBackup membacanya (cadangan lama tanpa bidang = penuh)', () => {
  const now = new Date('2026-11-07T01:00:00Z');
  const c = V.buatBackup({ soal: [], config: null, oleh: 'a', now, jenis: 'inkremental', dasar: 'x.json', penuhSejak: '2026-11-01T00:00:00.000Z' });
  assert.equal(c.jenis, 'inkremental'); assert.equal(c.dasar, 'x.json');
  const p = V.periksaBackup(JSON.parse(JSON.stringify(c)));
  assert.equal(p.jenis, 'inkremental'); assert.equal(p.penuhSejak, '2026-11-01T00:00:00.000Z');
  const penuh = V.buatBackup({ soal: [], config: null, oleh: 'a', now });
  assert.equal(penuh.jenis, 'penuh'); assert.equal(penuh.penuhSejak, now.toISOString());
  const lama = V.periksaBackup({ format: V.FORMAT, versi: V.VERSI, dibuat: '2026-01-01T00:00:00Z', soal: [] });
  assert.equal(lama.jenis, 'penuh');
});

// ---- pemangkasan riwayat ----
function dbRiwayat(spec) { // spec: { soalId: [ms terbaru..] }
  const hapus = []; const docs = [];
  for (const [id, waktu] of Object.entries(spec)) waktu.forEach((ms, i) => docs.push({ path: `soal/${id}/riwayat/r${i}`, at: ms }));
  return {
    hapus,
    collectionGroup: () => { const q = { select: () => q, limit: () => q, get: async () => ({ docs: docs.map((d) => ({ ref: { path: d.path }, data: () => ({ at: d.at === null ? undefined : { toMillis: () => d.at } }) })) }) }; return q; },
    batch: () => { const b = { delete: (r) => hapus.push(r.path), commit: async () => {} }; return b; },
  };
}

test('pangkasRiwayat: menyisakan N versi terbaru per soal, menghapus sisanya; tanpa hapus hanya menghitung', async () => {
  const spec = { s1: [1, 2, 3, 4, 5], s2: [10, 20], s3: [7, 8, 9, 6] };
  const kering = dbRiwayat(spec);
  const r0 = await pangkasRiwayat(kering, { simpan: 3, hapus: false });
  assert.deepEqual({ t: r0.riwayatTotal, s: r0.soalDipangkas, k: r0.riwayatKelebihan, d: r0.dihapus }, { t: 11, s: 2, k: 3, d: 0 });
  assert.equal(kering.hapus.length, 0);
  const db = dbRiwayat(spec);
  const r = await pangkasRiwayat(db, { simpan: 3, hapus: true });
  assert.equal(r.dihapus, 3);
  // s1: waktu 1 dan 2 (r0, r1) tertua; s3: waktu 6 (r3) tertua
  assert.deepEqual(db.hapus.sort(), ['soal/s1/riwayat/r0', 'soal/s1/riwayat/r1', 'soal/s3/riwayat/r3'].sort());
});

test('pangkasRiwayat: batas simpan dijepit 3-50, bukan angka jatuh ke bawaan 10, dokumen tanpa waktu dianggap tertua', async () => {
  const spec = { s1: Array.from({ length: 12 }, (_, i) => i + 1) };
  assert.equal((await pangkasRiwayat(dbRiwayat(spec), { simpan: 0 })).simpan, 3);
  assert.equal((await pangkasRiwayat(dbRiwayat(spec), { simpan: 999 })).simpan, 50);
  assert.equal((await pangkasRiwayat(dbRiwayat(spec), { simpan: 'abc' })).simpan, 10);
  const db = dbRiwayat({ s1: [5, 6, null, 7] });
  await pangkasRiwayat(db, { simpan: 3, hapus: true });
  assert.deepEqual(db.hapus, ['soal/s1/riwayat/r2']);
});

// ---- pengecualian indeks ----
test('firestore.indexes.json: bidang teks panjang dikecualikan, bidang yang dipakai kueri TIDAK dikecualikan', () => {
  const j = JSON.parse(readFileSync(new URL('../firestore.indexes.json', import.meta.url), 'utf8'));
  const ov = j.fieldOverrides;
  const ada = (cg, f) => ov.some((o) => o.collectionGroup === cg && o.fieldPath === f && Array.isArray(o.indexes) && o.indexes.length === 0);
  for (const f of ['teks', 'bab']) { assert.ok(ada('halaman', f)); assert.ok(ada('halaman_r2', f)); assert.ok(ada('halaman_r12', f)); }
  for (const f of ['t', 's', 'h', 'j']) { assert.ok(ada('cari', f)); assert.ok(ada('cari_r2', f)); }
  for (const f of ['teks', 'pertanyaan', 'pembahasan', 'stimulus', 'opsi.A', 'opsi.E']) { assert.ok(ada('soal', f), `soal.${f}`); assert.ok(ada('riwayat', f.startsWith('opsi') ? `snapshot.${f}` : `snapshot.${f}`)); }
  // Kueri yang ada di kode (lihat grep where/orderBy): halaman.hal, cari.dari, soal.{tingkat,updatedAt,status,authorUid,nama}, riwayat.at, koreksi.seq.
  const dilarang = [['halaman', 'hal'], ['halaman', 'seq'], ['cari', 'dari'], ['soal', 'tingkat'], ['soal', 'updatedAt'], ['soal', 'status'], ['soal', 'authorUid'], ['soal', 'nama'], ['riwayat', 'at'], ['koreksi', 'seq']];
  for (const [cg, f] of dilarang) assert.equal(ov.some((o) => o.collectionGroup === cg && o.fieldPath === f), false, `${cg}.${f} dipakai kueri`);
  assert.equal(new Set(ov.map((o) => `${o.collectionGroup}/${o.fieldPath}`)).size, ov.length, 'tidak ada duplikat');
  assert.ok(j.indexes.some((i) => i.collectionGroup === 'soal'), 'indeks komposit soal tetap ada');
});
