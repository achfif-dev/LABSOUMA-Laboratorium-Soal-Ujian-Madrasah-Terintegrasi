// Cadangan otomatis Soal Saya (peran Ustadz) ke Google Drive: web/lib/cadanganDrive.js, tambahan di web/lib/drive.js, api/drive-client.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buatDrive, namaSoalSaya, adalahSoalSaya, soalSayaTerbaru, soalSayaLama, SIMPAN_SOAL_SAYA, DriveError } from '../src/drive.js';
import { sidikDaftar, createPrefDrive, perluCadangan, cadangkanSoalSaya, daftarSoalSaya, KUNCI_PREF } from '../web/lib/cadanganDrive.js';
import { createSoalSaya, KUNCI } from '../src/ustadz.js';
import { createDraftStore } from '../src/draft.js';
import { __setFirebaseForTest } from '../src/platform.js';
import driveClientHandler from '../api/drive-client.js';

class Mem {
  constructor() { this.m = new Map(); }
  get length() { return this.m.size; }
  key(i) { return [...this.m.keys()][i] ?? null; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { if (this.penuh) throw new Error('QuotaExceededError'); this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}

/* ------------------------------------------------------------ nama berkas dan retensi */
test('nama berkas harian, pengenal, dan urutan terbaru dulu; berkas asing diabaikan', () => {
  assert.equal(namaSoalSaya(new Date(2026, 9, 5, 23, 59)), 'labsouma-soal-saya-2026-10-05.json');
  assert.equal(adalahSoalSaya('labsouma-soal-saya-2026-10-05.json'), true);
  for (const x of ['labsouma-backup-2026-10-05-0805.json', 'labsouma-soal-saya-2026-10-05.json.bak', 'labsouma-soal-saya-26-10-05.json', '../labsouma-soal-saya-2026-10-05.json', '', null]) assert.equal(adalahSoalSaya(x), false, String(x));
  const files = [{ name: 'labsouma-soal-saya-2026-10-01.json' }, { name: 'catatan.txt' }, { name: 'labsouma-soal-saya-2026-10-03.json' }, { name: 'labsouma-backup-2026-10-09-0000.json' }];
  assert.deepEqual(soalSayaTerbaru(files).map((f) => f.name), ['labsouma-soal-saya-2026-10-03.json', 'labsouma-soal-saya-2026-10-01.json']);
  assert.deepEqual(soalSayaLama(files, 1).map((f) => f.name), ['labsouma-soal-saya-2026-10-01.json']);
  assert.equal(SIMPAN_SOAL_SAYA, 14);
});

/* ------------------------------------------------------------ sidik dan preferensi */
const item = (id, updatedAt) => ({ id, updatedAt, createdAt: 1, isi: {} });

test('sidikDaftar: stabil terhadap urutan, berubah saat soal ditambah, diubah, atau dihapus', () => {
  const a = [item('a', 1), item('b', 2)];
  assert.equal(sidikDaftar(a), sidikDaftar([...a].reverse()));
  assert.notEqual(sidikDaftar(a), sidikDaftar([item('a', 1), item('b', 3)]));
  assert.notEqual(sidikDaftar(a), sidikDaftar([item('a', 1)]));
  assert.notEqual(sidikDaftar(a), sidikDaftar([...a, item('c', 1)]));
  assert.match(sidikDaftar([]), /^[0-9a-f]{8}$/);
});

test('perluCadangan: hanya bila aktif, ada soal, dan sidik berbeda dari cadangan terakhir', () => {
  const ok = { sidik: 'abc', waktu: 1, jumlah: 2, nama: '', link: '' };
  assert.equal(perluCadangan({ aktif: false, jumlah: 3, sidik: 'x', ok: null }), false);
  assert.equal(perluCadangan({ aktif: true, jumlah: 0, sidik: 'x', ok: null }), false);
  assert.equal(perluCadangan({ aktif: true, jumlah: 3, sidik: 'x', ok: null }), true);
  assert.equal(perluCadangan({ aktif: true, jumlah: 3, sidik: 'abc', ok }), false);
  assert.equal(perluCadangan({ aktif: true, jumlah: 3, sidik: 'baru', ok }), true);
});

test('preferensi: per akun, tahan data rusak, tautan tidak aman dibuang, kunci tidak bentrok dengan draf atau Soal Saya', () => {
  assert.ok(!KUNCI_PREF.startsWith('labsouma:v1:'));      // dibersihkan oleh draf otomatis bila di bawah awalan itu
  assert.ok(!KUNCI_PREF.startsWith(KUNCI) && !KUNCI.startsWith(KUNCI_PREF));
  const mem = new Mem(); let t = 1000;
  const p = createPrefDrive({ storage: mem, now: () => t });
  assert.equal(p.tersedia, false); assert.deepEqual(p.baca(), { aktif: false, ok: null });
  p.setUser('u1');
  assert.equal(p.aktifkan(), true);
  assert.equal(p.baca().aktif, true);
  p.catatBerhasil({ sidik: 'abc', jumlah: 4, nama: 'labsouma-soal-saya-2026-10-25.json', link: 'https://drive.google.com/file/d/1/view' });
  assert.deepEqual(p.baca().ok, { waktu: 1000, sidik: 'abc', jumlah: 4, nama: 'labsouma-soal-saya-2026-10-25.json', link: 'https://drive.google.com/file/d/1/view' });
  p.catatBerhasil({ sidik: 'abd', jumlah: 5, nama: 'x', link: 'javascript:alert(1)' });
  assert.equal(p.baca().ok.link, ''); assert.equal(p.baca().aktif, true);            // aktif tidak hilang
  p.matikan(); assert.equal(p.baca().aktif, false); assert.equal(p.baca().ok.sidik, 'abd'); // info cadangan terakhir tetap
  p.setUser('u2'); assert.deepEqual(p.baca(), { aktif: false, ok: null });          // akun lain di perangkat yang sama
  p.setUser('u1'); mem.setItem(KUNCI_PREF + 'u1', '{rusak'); assert.deepEqual(p.baca(), { aktif: false, ok: null });
  mem.setItem(KUNCI_PREF + 'u1', JSON.stringify({ v: 9, aktif: true })); assert.equal(p.baca().aktif, false);
  mem.penuh = true; assert.equal(p.aktifkan(), false);                              // penyimpanan penuh: tidak melempar
  assert.equal(createPrefDrive({ storage: null }).aktifkan(), false);
});

test('preferensi tidak ikut terhapus oleh pembersih draf otomatis', () => {
  const mem = new Mem(); const p = createPrefDrive({ storage: mem }); p.setUser('u1'); p.aktifkan();
  const draf = createDraftStore({ storage: mem }); draf.setUser('u1');
  assert.equal(typeof draf.purgeExpired, 'function'); assert.equal(typeof draf.clearAll, 'function');
  draf.purgeExpired(); draf.clearAll();
  assert.equal(p.baca().aktif, true);
});

/* ------------------------------------------------------------ klien Drive: cari, perbarui, hapus (lewat fetch palsu) */
function fetchPalsu() {
  const log = [];
  const f = async (url, init = {}) => {
    log.push({ url, init });
    const res = (status, body) => ({ ok: status < 300, status, json: async () => body, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });
    const u = new URL(url);
    if (u.pathname === '/drive/v3/files' && !init.method) return res(200, { files: [{ id: 'f1', name: 'labsouma-soal-saya-2026-10-25.json', webViewLink: 'https://drive.google.com/file/d/f1/view' }] });
    if (u.pathname === '/upload/drive/v3/files/f1' && init.method === 'PATCH') return res(200, { id: 'f1', name: 'labsouma-soal-saya-2026-10-25.json', webViewLink: 'https://drive.google.com/file/d/f1/view' });
    if (u.pathname === '/drive/v3/files/f1' && init.method === 'DELETE') return res(204, '');
    return res(404, { error: { message: 'x' } });
  };
  return { f, log };
}

test('Drive.cari: menyaring menurut folder dan nama (tanda kutip di-escape); perbarui memakai PATCH media dengan isi apa adanya; hapus memakai DELETE', async () => {
  const d = fetchPalsu();
  const drive = buatDrive({ ambilToken: async () => 'TKN', fetchImpl: d.f });
  const hit = await drive.cari("fo'lder", 'labsouma-soal-saya-2026-10-25.json');
  assert.equal(hit.id, 'f1');
  const q = decodeURIComponent(d.log[0].url);
  assert.match(q, /'fo\\'lder' in parents and name='labsouma-soal-saya-2026-10-25\.json' and trashed=false/);
  const isi = JSON.stringify({ catatan: 'بِسْمِ اللَّهِ\n"kutip"' });
  const r = await drive.perbarui('f1', isi);
  assert.equal(r.id, 'f1');
  const patch = d.log[1];
  assert.equal(patch.init.method, 'PATCH'); assert.equal(patch.init.body, isi);
  assert.match(patch.url, /uploadType=media/); assert.match(patch.init.headers['Content-Type'], /application\/json/);
  assert.equal(patch.init.headers.Authorization, 'Bearer TKN');
  await drive.hapus('f1');
  assert.equal(d.log[2].init.method, 'DELETE');
});

/* ------------------------------------------------------------ orkestrasi cadangan (Drive tiruan di memori) */
function driveMem(awal = []) {
  const berkas = new Map(awal.map((f, i) => [f.id || 'w' + i, { id: f.id || 'w' + i, name: f.name, isi: f.isi ?? '{}' }]));
  const log = []; let n = 0;
  return {
    berkas, log,
    async siapkanFolder() { log.push('folder'); return 'folder-1'; },
    async cari(folder, nama) { log.push('cari'); return [...berkas.values()].find((f) => f.name === nama) || null; },
    async unggah(folder, nama, isi) { log.push('unggah'); const id = 'n' + (++n); berkas.set(id, { id, name: nama, isi }); return { id, name: nama, webViewLink: `https://drive.google.com/file/d/${id}/view` }; },
    async perbarui(id, isi) { log.push('perbarui'); berkas.get(id).isi = isi; return { id, name: berkas.get(id).name, webViewLink: `https://drive.google.com/file/d/${id}/view` }; },
    async unduh(id) { log.push('unduh'); return berkas.get(id).isi; },
    async daftar() { log.push('daftar'); return [...berkas.values()].map((f) => ({ id: f.id, name: f.name, size: String(f.isi.length) })); },
    async hapus(id) { log.push('hapus:' + id); berkas.delete(id); },
  };
}
const HARI_INI = new Date(2026, 9, 25, 10, 0);

test('cadangkanSoalSaya: berkas baru diunggah dan diverifikasi; cadangan kedua di hari yang sama menimpa berkas itu, bukan membuat baru', async () => {
  const d = driveMem();
  const r1 = await cadangkanSoalSaya({ drive: d, isi: '{"a":1}', jumlah: 1, now: HARI_INI });
  assert.equal(r1.nama, 'labsouma-soal-saya-2026-10-25.json'); assert.match(r1.link, /^https:\/\/drive\.google\.com\//);
  assert.deepEqual(d.log.filter((x) => ['unggah', 'perbarui'].includes(x)), ['unggah']);
  const r2 = await cadangkanSoalSaya({ drive: d, isi: '{"a":2}', jumlah: 2, now: HARI_INI });
  assert.equal(r2.id, r1.id); assert.equal(d.berkas.size, 1); assert.equal(d.berkas.get(r1.id).isi, '{"a":2}');
  assert.deepEqual(d.log.filter((x) => ['unggah', 'perbarui'].includes(x)), ['unggah', 'perbarui']);
  assert.equal(r1.ukuran, 7);
});

test('cadangkanSoalSaya: hari berikutnya membuat berkas baru dan hari sebelumnya tetap ada', async () => {
  const d = driveMem([{ name: 'labsouma-soal-saya-2026-10-24.json', isi: '{"kemarin":1}' }]);
  await cadangkanSoalSaya({ drive: d, isi: '{"hari":1}', jumlah: 1, now: HARI_INI });
  assert.equal(d.berkas.size, 2);
  assert.ok([...d.berkas.values()].some((f) => f.name === 'labsouma-soal-saya-2026-10-24.json' && f.isi === '{"kemarin":1}'));
});

test('cadangkanSoalSaya: daftar kosong tidak menyentuh Drive sama sekali (tidak menimpa cadangan dengan berkas kosong)', async () => {
  const d = driveMem([{ name: 'labsouma-soal-saya-2026-10-25.json', isi: '{"penting":1}' }]);
  await assert.rejects(() => cadangkanSoalSaya({ drive: d, isi: '{}', jumlah: 0, now: HARI_INI }), (e) => e instanceof DriveError && e.code === 'CADANGAN_KOSONG');
  assert.deepEqual(d.log, []); assert.equal([...d.berkas.values()][0].isi, '{"penting":1}');
});

test('cadangkanSoalSaya: isi di Drive berbeda dari yang dikirim = gagal (DRIVE_VERIFIKASI)', async () => {
  const d = driveMem(); d.unduh = async () => 'ISI-LAIN';
  await assert.rejects(() => cadangkanSoalSaya({ drive: d, isi: '{"a":1}', jumlah: 1, now: HARI_INI }), (e) => e.code === 'DRIVE_VERIFIKASI');
});

test('retensi: hanya berkas Soal Saya di luar 14 terbaru dihapus; cadangan admin dan berkas lain tidak disentuh; gagal merapikan bukan kegagalan cadangan', async () => {
  const lama = Array.from({ length: 15 }, (_, i) => ({ name: `labsouma-soal-saya-2026-10-${String(i + 1).padStart(2, '0')}.json` })); // tgl 1..15
  const asing = [{ name: 'labsouma-backup-2026-09-01-0800.json' }, { name: 'catatan.txt' }];
  const d = driveMem([...lama, ...asing]);
  const r = await cadangkanSoalSaya({ drive: d, isi: '{"a":1}', jumlah: 1, now: HARI_INI }); // + hari ini (25) = 16 berkas Soal Saya
  assert.equal(r.dihapus, 2);
  const sisa = [...d.berkas.values()].map((f) => f.name);
  assert.ok(!sisa.includes('labsouma-soal-saya-2026-10-01.json') && !sisa.includes('labsouma-soal-saya-2026-10-02.json'));
  assert.ok(sisa.includes('labsouma-soal-saya-2026-10-03.json') && sisa.includes('labsouma-soal-saya-2026-10-25.json'));
  assert.ok(sisa.includes('labsouma-backup-2026-09-01-0800.json') && sisa.includes('catatan.txt'));
  const d2 = driveMem(lama); d2.hapus = async () => { throw new DriveError('DRIVE_DITOLAK', 'x'); };
  const r2 = await cadangkanSoalSaya({ drive: d2, isi: '{"a":1}', jumlah: 1, now: HARI_INI });
  assert.equal(r2.dihapus, 0); // cadangan tetap berhasil
});

test('galat Drive diteruskan apa adanya (token kedaluwarsa, Drive penuh)', async () => {
  const d = driveMem(); d.cari = async () => { throw new DriveError('DRIVE_TOKEN', 'kedaluwarsa', 401); };
  await assert.rejects(() => cadangkanSoalSaya({ drive: d, isi: '{}', jumlah: 1, now: HARI_INI }), (e) => e.code === 'DRIVE_TOKEN');
});

test('daftarSoalSaya: hanya berkas Soal Saya, terbaru dulu', async () => {
  const d = driveMem([{ name: 'labsouma-soal-saya-2026-10-01.json' }, { name: 'labsouma-backup-2026-10-09-0000.json' }, { name: 'labsouma-soal-saya-2026-10-20.json' }]);
  assert.deepEqual((await daftarSoalSaya(d)).map((f) => f.name), ['labsouma-soal-saya-2026-10-20.json', 'labsouma-soal-saya-2026-10-01.json']);
});

test('ujung ke ujung: ekspor Soal Saya -> Drive -> pemulihan ke perangkat baru memberi daftar yang sama', async () => {
  const normal = (x) => ({ pertanyaan: String((x && x.pertanyaan) || ''), nama: String((x && x.nama) || '') });
  const a = createSoalSaya({ storage: new Mem(), normal }); a.setUser('u1');
  a.simpan({ pertanyaan: 'سؤال أول', nama: 'Safinah' }); a.simpan({ pertanyaan: 'Soal kedua', nama: 'Fathul Qarib' });
  const d = driveMem();
  await cadangkanSoalSaya({ drive: d, isi: a.ekspor(), jumlah: a.list().length, now: HARI_INI });
  const baru = createSoalSaya({ storage: new Mem(), normal }); baru.setUser('u1'); // HP baru, tersimpan kosong
  const f = (await daftarSoalSaya(d))[0];
  const r = baru.impor(await d.unduh(f.id));
  assert.equal(r.ok, true); assert.equal(r.tambah, 2);
  assert.deepEqual(baru.list().map((x) => x.isi.pertanyaan).sort(), ['Soal kedua', 'سؤال أول'].sort());
  assert.equal(sidikDaftar(baru.list()), sidikDaftar(a.list())); // sidik sama: tidak dianggap "belum dicadangkan"
});

/* ------------------------------------------------------------ /api/drive-client */
function fakeFirebase() {
  const role = { tok_ustadz: 'ustadz', tok_penyusun: 'penyusun', tok_pending: 'pending', tok_nonaktif: 'nonaktif' };
  const store = Object.fromEntries(Object.entries(role).map(([t, r]) => ['users/' + t.replace('tok_', 'u_'), { role: r }]));
  const ref = (path) => ({ path, get: async () => ({ exists: path in store, data: () => store[path] }) });
  return { auth: { verifyIdToken: async (t) => { if (!role[t]) throw new Error('bad'); return { uid: t.replace('tok_', 'u_') }; } }, FieldValue: {}, db: { doc: ref } };
}
const mkRes = () => { const r = { h: {}, setHeader(k, v) { r.h[k] = v; }, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; };
const req = (token) => ({ method: 'POST', headers: { authorization: 'Bearer ' + token }, body: {} });

test('/api/drive-client: ustadz dan penyusun boleh; pending, nonaktif, dan tanpa login ditolak; nilai env dirapikan', async () => {
  __setFirebaseForTest(fakeFirebase());
  const saved = process.env.GOOGLE_DRIVE_CLIENT_ID;
  try {
    process.env.GOOGLE_DRIVE_CLIENT_ID = '  123-abc.apps.googleusercontent.com \n';
    for (const tok of ['tok_ustadz', 'tok_penyusun']) { const r = mkRes(); await driveClientHandler(req(tok), r); assert.equal(r.code, 200, tok); assert.equal(r.body.driveClientId, '123-abc.apps.googleusercontent.com'); assert.equal(r.h['Cache-Control'], 'no-store'); }
    for (const tok of ['tok_pending', 'tok_nonaktif']) { const r = mkRes(); await driveClientHandler(req(tok), r); assert.equal(r.code, 403, tok); }
    { const r = mkRes(); await driveClientHandler({ method: 'POST', headers: {}, body: {} }, r); assert.equal(r.code, 401); }
    delete process.env.GOOGLE_DRIVE_CLIENT_ID;
    { const r = mkRes(); await driveClientHandler(req('tok_ustadz'), r); assert.equal(r.code, 200); assert.equal(r.body.driveClientId, ''); }
  } finally { __setFirebaseForTest(null); if (saved === undefined) delete process.env.GOOGLE_DRIVE_CLIENT_ID; else process.env.GOOGLE_DRIVE_CLIENT_ID = saved; }
});

/* ------------------------------------------------------------ penjaga struktur App.jsx */
const html = readFileSync(new URL('../web/App.jsx', import.meta.url), 'utf8');
test('penjaga: Ustadz memakai /api/drive-client (bukan /api/backup); Dasbor hanya admin; /api/backup info tetap khusus tim', () => {
  const blok = html.slice(html.indexOf('function AppUstadz('), html.indexOf('/* ---------- Backup ke Google Drive'));
  assert.match(blok, /\/api\/drive-client/);
  assert.doesNotMatch(blok, /\/api\/backup|\/api\/admin-stats/);
  assert.match(html, /\{tab === 'dasbor' && isAdmin && <Dasbor /);
  assert.match(html, /\(isAdmin && \['dasbor', 'users', 'cfg', 'perpus', 'ai'\]\.includes\(h\)\)/);
  assert.match(readFileSync(new URL('../api/backup.js', import.meta.url), 'utf8'), /aksi === 'info'\) \{ await authenticateReviewer/);
});
