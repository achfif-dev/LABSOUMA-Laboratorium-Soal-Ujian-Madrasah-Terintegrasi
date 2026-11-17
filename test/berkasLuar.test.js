import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { simpanPaket, hapusPaket, pulihkanNaskah, siapkanAsli } from '../src/soalLuarService.js';
import { MAKS_ASLI, UKURAN_POTONGAN, potongBase64, gabungPotongan, serialisasiLuar, buatBackupLuar, periksaBackupLuar, cadanganLuarTerbaru, namaBerkasLuar, NAMA_CADANGAN_LUAR, byteKeBase64, base64KeByte, adalahBase64, ukuranDariBase64 } from '../web/lib/berkasLuar.js';

const SEKARANG = Date.parse('2026-11-16T02:00:00Z');
const A = (no) => ({ bagian: 'a', no, bentuk: 'pilgan', pertanyaan: `عدد ركعات المغرب ${no}`, opsi: { A: 'اثنان', B: 'ثلاث', C: 'أربع' }, kunci: 'B', hal: '12' });
const META = { dawr: 1, mapel: 'Fiqih', tingkat: 'MTs', kelas: 'VII', periode: 'UAS', tahun: '1447', kitab: 'Safinatun Naja' };
const VER = { oleh: 'Ust. Ahmad', tanggal: '2026-11-10', catatan: 'Sudah dikoreksi', pernyataan: true };
const FV = { serverTimestamp: () => '<ts>' };
const sha = (b) => createHash('sha256').update(b).digest('hex');

/** docx tiruan: awalan ZIP "PK" + isi acak sebesar n byte. */
const docx = (n) => { const b = Buffer.alloc(n, 7); b[0] = 0x50; b[1] = 0x4b; return b; };

/** Firestore tiruan dengan subkoleksi dan batch (create gagal ALREADY_EXISTS; atomik). */
function dbTiruan() {
  const toko = new Map(); // path -> data
  const ref = (path) => ({
    path, id: path.split('/').pop(),
    collection: (n) => koleksi(`${path}/${n}`),
    async get() { return { exists: toko.has(path), data: () => structuredClone(toko.get(path)) }; },
    async create(d) { if (toko.has(path)) { const e = new Error('6 ALREADY_EXISTS'); e.code = 6; throw e; } toko.set(path, structuredClone(d)); },
    async delete() { toko.delete(path); },
  });
  const koleksi = (path) => ({
    doc: (id) => ref(`${path}/${id}`),
    async get() { const docs = [...toko.keys()].filter((k) => k.startsWith(`${path}/`) && !k.slice(path.length + 1).includes('/')).map((k) => ({ ref: ref(k), id: k.split('/').pop(), data: () => structuredClone(toko.get(k)) })); return { docs }; },
  });
  return {
    toko,
    collection: (n) => koleksi(n),
    batch() {
      const ops = [];
      return {
        create: (r, d) => ops.push(['create', r, d]), set: (r, d) => ops.push(['set', r, d]), delete: (r) => ops.push(['delete', r]),
        async commit() {
          for (const [t, r] of ops) if (t === 'create' && toko.has(r.path)) { const e = new Error('6 ALREADY_EXISTS'); e.code = 6; throw e; }
          for (const [t, r, d] of ops) { if (t === 'delete') toko.delete(r.path); else toko.set(r.path, structuredClone(d)); }
        },
      };
    },
  };
}
const body = (berkas, o = {}) => ({ aksi: 'simpan', meta: META, verifikasi: VER, butir: [A(1), A(2)], berkas, ...o });
const penulis = { uid: 'u1', nama: 'Editor Satu', role: 'editor' };

test('simpan dengan naskah asli: potongan base64 tersimpan, sidik dihitung server, dapat digabung kembali persis sama', async () => {
  const db = dbTiruan(); const asli = docx(1_000_000);
  const r = await simpanPaket(db, FV, { body: body({ nama: 'FIQH.docx', ukuran: asli.length, sha256: sha(asli), isi: asli.toString('base64') }), ...penulis }, SEKARANG);
  assert.equal(r.asliTersimpan, true);
  const d = db.toko.get(`soalLuar/${r.id}`);
  assert.deepEqual(d.berkas, { nama: 'FIQH.docx', ukuran: asli.length, sha256: sha(asli), tersimpan: true, potongan: Math.ceil((asli.length * 4 / 3) / UKURAN_POTONGAN) });
  assert.ok(!('isi' in d.berkas), 'base64 tidak ikut di dokumen utama');
  const ps = [...db.toko.entries()].filter(([k]) => k.startsWith(`soalLuar/${r.id}/berkas/`)).map(([, v]) => v);
  assert.equal(ps.length, d.berkas.potongan); assert.ok(ps.every((p) => p.b64.length <= UKURAN_POTONGAN));
  assert.ok(Buffer.from(base64KeByte(gabungPotongan(ps))).equals(asli));
});

test('simpan tanpa isi, terlalu besar, bukan ZIP, base64 rusak, atau sidik tidak cocok', async () => {
  const db = dbTiruan();
  const r = await simpanPaket(db, FV, { body: body({ nama: 'x.docx', ukuran: 10 }), ...penulis }, SEKARANG);
  assert.equal(r.asliTersimpan, false); assert.equal(db.toko.get(`soalLuar/${r.id}`).berkas.tersimpan, false);
  assert.throws(() => siapkanAsli({ isi: docx(MAKS_ASLI + 10).toString('base64') }), { code: 'SOAL_LUAR_INVALID' });
  assert.throws(() => siapkanAsli({ isi: Buffer.from('hello world!').toString('base64') }), /bukan berkas \.docx/);
  assert.throws(() => siapkanAsli({ isi: 'bukan base64!!' }), /base64/);
  assert.throws(() => siapkanAsli({ isi: docx(100).toString('base64'), sha256: 'a'.repeat(64) }), /Sidik/);
  assert.equal(siapkanAsli({ isi: docx(100).toString('base64'), sha256: 'bukan-hex' }).berkas.sha256, sha(docx(100)), 'sidik klien yang cacat diganti hitungan server');
});

test('duplikat: batch gagal utuh, tidak ada potongan yatim; hapus membuang potongan', async () => {
  const db = dbTiruan(); const asli = docx(700_000); const b = body({ nama: 'a.docx', isi: asli.toString('base64') });
  const r = await simpanPaket(db, FV, { body: b, ...penulis }, SEKARANG);
  const sebelum = db.toko.size;
  await assert.rejects(() => simpanPaket(db, FV, { body: b, ...penulis }, SEKARANG), { code: 'SOAL_LUAR_DUPLIKAT' });
  assert.equal(db.toko.size, sebelum);
  await hapusPaket(db, { id: r.id, uid: 'u1', role: 'editor' });
  assert.equal(db.toko.size, 0, 'dokumen dan semua potongan terhapus');
});

test('cadangan: serialisasi, bentuk berkas, pemeriksaan, nama dan urutan', () => {
  const ts = { toDate: () => new Date('2026-11-16T02:00:00Z') };
  const s = serialisasiLuar('lx1', { judul: 'x', createdAt: ts, updatedAt: ts, kisi: { sumber: 'ai', diubahAt: ts } }, 'QUJD');
  assert.equal(s.createdAt, '2026-11-16T02:00:00.000Z'); assert.equal(s.kisi.diubahAt, '2026-11-16T02:00:00.000Z'); assert.equal(s.berkasB64, 'QUJD');
  const c = buatBackupLuar({ naskah: [s, { ...s, berkasB64: '' }], oleh: 'a@b.c', now: new Date('2026-11-17T01:00:00Z') });
  assert.deepEqual(c.jumlah, { naskah: 2, asli: 1 });
  assert.equal(periksaBackupLuar(JSON.parse(JSON.stringify(c))).naskah.length, 2);
  assert.throws(() => periksaBackupLuar({ format: 'labsouma-backup', versi: 1, soal: [] }), /bukan cadangan Bank Soal Manual/);
  assert.throws(() => periksaBackupLuar({ format: c.format, versi: 9, naskah: [] }), /Versi/);
  assert.throws(() => periksaBackupLuar({ format: c.format, versi: 1 }), /rusak/);
  const nama = namaBerkasLuar(new Date(2026, 10, 17, 8, 5)); assert.equal(nama, 'labsouma-soalluar-2026-11-17-0805.json'); assert.ok(NAMA_CADANGAN_LUAR.test(nama));
  const urut = cadanganLuarTerbaru([{ name: 'labsouma-soalluar-2026-11-16-0900.json' }, { name: 'labsouma-backup-2026-11-17-0900.json' }, { name: nama }]);
  assert.deepEqual(urut.map((f) => f.name), [nama, 'labsouma-soalluar-2026-11-16-0900.json'], 'cadangan soal biasa tidak tercampur');
});

test('helper base64: bulat pergi-pulang untuk biner, ukuran, potong-gabung, potongan tak runtut ditolak', () => {
  const b = Buffer.from(Array.from({ length: 5000 }, (_, i) => i % 256)); const b64 = byteKeBase64(b);
  assert.ok(adalahBase64(b64)); assert.equal(ukuranDariBase64(b64), b.length);
  assert.ok(Buffer.from(base64KeByte(b64)).equals(b));
  const ps = potongBase64(b64, 100).map((x, n) => ({ n, b64: x }));
  assert.equal(gabungPotongan([...ps].reverse()), b64);
  assert.equal(gabungPotongan(ps.slice(1)), null); assert.equal(gabungPotongan([]), null);
});

test('pemulihan: cadangan -> naskah kembali persis (teks, verifikasi, pencatat, kisi, asli); lewati vs timpa; isi diubah ditolak', async () => {
  const db1 = dbTiruan(); const asli = docx(900_000);
  const r = await simpanPaket(db1, FV, { body: body({ nama: 'FIQH.docx', isi: asli.toString('base64') }), ...penulis }, SEKARANG);
  // "cadangan": baca dari db1 seperti BackupTab
  const d = db1.toko.get(`soalLuar/${r.id}`);
  const ps = [...db1.toko.entries()].filter(([k]) => k.startsWith(`soalLuar/${r.id}/berkas/`)).map(([, v]) => v);
  const entri = JSON.parse(JSON.stringify(serialisasiLuar(r.id, { ...d, createdAt: new Date('2026-11-16T02:00:00Z') }, gabungPotongan(ps))));
  const db2 = dbTiruan();
  const x = await pulihkanNaskah(db2, FV, { naskah: entri, mode: 'lewati', uid: 'admin1' }, SEKARANG + 86400000);
  assert.deepEqual([x.hasil, x.asli, x.tanpaAsli], ['ditulis', true, false]);
  const p = db2.toko.get(`soalLuar/${r.id}`);
  assert.equal(p.hash, d.hash); assert.deepEqual(p.butir, d.butir); assert.deepEqual(p.verifikasi, d.verifikasi); assert.equal(p.verifikasi.dicatatOleh, 'u1');
  assert.equal(p.createdByName, 'Editor Satu'); assert.equal(p.dipulihkan.oleh, 'admin1'); assert.equal(p.berkas.sha256, sha(asli));
  const ps2 = [...db2.toko.entries()].filter(([k]) => k.startsWith(`soalLuar/${r.id}/berkas/`)).map(([, v]) => v);
  assert.ok(Buffer.from(base64KeByte(gabungPotongan(ps2))).equals(asli));
  assert.equal((await pulihkanNaskah(db2, FV, { naskah: entri, mode: 'lewati', uid: 'admin1' }, SEKARANG)).hasil, 'dilewati');
  assert.equal((await pulihkanNaskah(db2, FV, { naskah: entri, mode: 'timpa', uid: 'admin1' }, SEKARANG)).hasil, 'ditulis');
  assert.equal([...db2.toko.keys()].filter((k) => k.includes('/berkas/')).length, ps2.length, 'timpa tidak menggandakan potongan');
  // diubah: isi soal diutak-atik atau id dipalsukan
  const ubah = structuredClone(entri); ubah.butir[0].kunci = 'A';
  await assert.rejects(() => pulihkanNaskah(dbTiruan(), FV, { naskah: ubah, mode: 'lewati', uid: 'a' }, SEKARANG), /tidak cocok dengan id/);
  await assert.rejects(() => pulihkanNaskah(dbTiruan(), FV, { naskah: { ...entri, id: 'lx' + '0'.repeat(28) }, mode: 'lewati', uid: 'a' }, SEKARANG), /tidak cocok dengan id/);
  await assert.rejects(() => pulihkanNaskah(dbTiruan(), FV, { naskah: { ...entri, id: '../x' }, mode: 'lewati', uid: 'a' }, SEKARANG), { code: 'SOAL_LUAR_INVALID' });
  await assert.rejects(() => pulihkanNaskah(dbTiruan(), FV, { naskah: { ...entri, berkasB64: Buffer.from('bukan zip!').toString('base64') }, mode: 'lewati', uid: 'a' }, SEKARANG), /bukan berkas \.docx|Sidik/);
  // cadangan yang mengaku punya asli tetapi tidak membawanya: tetap dipulihkan, ditandai
  const tanpa = { ...entri, berkasB64: '' };
  const y = await pulihkanNaskah(dbTiruan(), FV, { naskah: tanpa, mode: 'lewati', uid: 'a' }, SEKARANG);
  assert.equal(y.tanpaAsli, true);
});
