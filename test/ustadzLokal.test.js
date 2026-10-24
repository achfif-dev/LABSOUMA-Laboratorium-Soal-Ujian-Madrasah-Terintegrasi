// Peran Ustadz, sisi klien: penyimpanan "Soal Saya" di perangkat dan catatan wajib pada setiap ekspor.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createSoalSaya, CATATAN_USTADZ, KUNCI, MAKS_SOAL, NAMA_BERKAS } from '../src/ustadz.js';
import { createDraftStore } from '../src/draft.js';
import * as Bt from '../src/bentuk.js';
import * as Pegon from '../src/pegon.js';
import * as Kisi from '../src/kisi.js';

const require = createRequire(import.meta.url);
let docx = null; let JSZip = null;
try { docx = require('docx'); JSZip = require('jszip'); } catch (e) { /* paket tidak terpasang: tes DOCX dilewati */ }

class Mem { // localStorage tiruan
  constructor() { this.m = new Map(); }
  get length() { return this.m.size; }
  key(i) { return [...this.m.keys()][i] ?? null; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { if (this.penuh) throw new Error('QuotaExceededError'); this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
// Pembentuk soal seperti normalForm di App.jsx: hanya string pada tempatnya.
const normal = (x) => {
  const o = x && typeof x === 'object' ? x : {};
  const str = (v) => (typeof v === 'string' ? v : '');
  return { pertanyaan: str(o.pertanyaan), teks: str(o.teks), kunci: ['A', 'B', 'C', 'D', 'E'].includes(o.kunci) ? o.kunci : '', pembahasan: str(o.pembahasan) };
};
const baru = (storage = new Mem(), t0 = 1_700_000_000_000) => {
  let t = t0; let n = 0;
  const st = createSoalSaya({ storage, normal, now: () => t, newId: () => 'id' + (++n) });
  st.setUser('u1');
  return { st, storage, maju: (ms) => { t += ms; } };
};
const SOAL = { pertanyaan: 'Berapa air suci?', teks: 'مَاءُ الْبَحْرِ', kunci: 'C', pembahasan: 'Tujuh.' };

test('simpan, list (terbaru dulu), perbarui dengan id, hapus', () => {
  const { st, maju } = baru();
  const a = st.simpan({ ...SOAL, pertanyaan: 'A' }); maju(1000);
  const b = st.simpan({ ...SOAL, pertanyaan: 'B' }); maju(1000);
  assert.deepEqual(st.list().map((x) => x.isi.pertanyaan), ['B', 'A']);
  st.simpan({ ...SOAL, pertanyaan: 'A2' }, a.id);
  assert.deepEqual(st.list().map((x) => x.isi.pertanyaan), ['A2', 'B']);
  assert.equal(st.list().length, 2, 'memperbarui tidak menggandakan');
  assert.ok(st.hapus(b.id).ok);
  assert.deepEqual(st.list().map((x) => x.id), [a.id]);
});

test('id yang tidak ada (mis. draf menunjuk soal yang sudah dihapus) membuat soal baru, bukan galat', () => {
  const { st } = baru();
  const r = st.simpan(SOAL, 'hilang');
  assert.ok(r.ok); assert.notEqual(r.id, 'hilang'); assert.equal(st.list().length, 1);
});

test('dipisah per akun, dan tidak kedaluwarsa (berbeda dengan draf otomatis 30 hari)', () => {
  const { st, storage, maju } = baru();
  st.simpan(SOAL);
  const lain = createSoalSaya({ storage, normal }); lain.setUser('u2');
  assert.equal(lain.list().length, 0);
  maju(400 * 24 * 3600 * 1000);
  assert.equal(st.list().length, 1);
});

test('pembersih draf otomatis (purgeExpired, clearAll) TIDAK menyentuh Soal Saya', () => {
  const { st, storage, maju } = baru();
  st.simpan(SOAL);
  assert.ok(!KUNCI.startsWith('labsouma:v1:'), 'awalan harus berbeda dari awalan draf');
  let t = Date.now();
  const draf = createDraftStore({ storage, now: () => t + 400 * 24 * 3600 * 1000 });
  draf.setUser('u1'); // menjalankan purgeExpired
  assert.equal(st.list().length, 1, 'purgeExpired menghapus Soal Saya');
  draf.saveNow('form', { a: 1 }); draf.clearAll();
  assert.equal(st.list().length, 1, 'clearAll menghapus Soal Saya');
  maju(0);
});

test('ekspor lalu impor di perangkat lain mengembalikan soal yang sama', () => {
  const { st } = baru();
  st.simpan({ ...SOAL, pertanyaan: 'A' }); st.simpan({ ...SOAL, pertanyaan: 'B' });
  const berkas = JSON.parse(st.ekspor());
  assert.equal(berkas.app, NAMA_BERKAS); assert.equal(berkas.catatan, CATATAN_USTADZ);
  const { st: st2 } = baru();
  const r = st2.impor(st.ekspor());
  assert.deepEqual([r.ok, r.tambah, r.perbarui, r.lewati], [true, 2, 0, 0]);
  assert.deepEqual(st2.list().map((x) => x.isi.pertanyaan).sort(), ['A', 'B']);
  const lagi = st2.impor(st.ekspor()); // impor ulang tidak menggandakan
  assert.deepEqual([lagi.tambah, lagi.perbarui, lagi.lewati], [0, 0, 2]);
  assert.equal(st2.list().length, 2);
});

test('impor: berkas yang lebih baru menimpa, yang lebih lama dilewati', () => {
  const a = baru(); const idA = a.st.simpan({ ...SOAL, pertanyaan: 'lama' }).id;
  const cad = JSON.parse(a.st.ekspor());
  a.maju(5000); a.st.simpan({ ...SOAL, pertanyaan: 'baru' }, idA);
  const r1 = a.st.impor(JSON.stringify(cad)); // cadangan lebih tua dari yang ada
  assert.deepEqual([r1.perbarui, r1.lewati], [0, 1]);
  assert.equal(a.st.list()[0].isi.pertanyaan, 'baru');
  cad.soal[0].updatedAt += 99999;
  const r2 = a.st.impor(JSON.stringify(cad));
  assert.equal(r2.perbarui, 1); assert.equal(a.st.list()[0].isi.pertanyaan, 'lama');
});

test('impor menolak berkas asing dan memperlakukan isinya sebagai data tak tepercaya', () => {
  const { st } = baru();
  assert.equal(st.impor('bukan json').reason, 'bukan-json');
  assert.equal(st.impor('{"a":1}').reason, 'bukan-berkas-soal-saya');
  assert.equal(st.impor(JSON.stringify({ app: NAMA_BERKAS, v: 2, soal: [] })).reason, 'bukan-berkas-soal-saya');
  const jahat = { app: NAMA_BERKAS, v: 1, soal: [
    { id: 'x1', updatedAt: 5, isi: { pertanyaan: { toString: 1 }, kunci: 'Z', teks: '<img onerror=x>', evil: 'y', __proto__: { polluted: 1 } } },
    { id: '', isi: SOAL }, null, 'teks', { isi: SOAL }, { id: 'x'.repeat(100), isi: SOAL },
    { id: 'ok', updatedAt: 'bukan angka', isi: SOAL },
  ] };
  const r = st.impor(JSON.stringify(jahat));
  assert.ok(r.ok); assert.equal(r.tambah, 2); assert.equal(r.lewati, 5);
  const x1 = st.list().find((x) => x.id === 'x1').isi;
  assert.deepEqual(Object.keys(x1).sort(), ['kunci', 'pembahasan', 'pertanyaan', 'teks']);
  assert.equal(x1.pertanyaan, ''); assert.equal(x1.kunci, '');
  assert.equal(({}).polluted, undefined);
  assert.equal(st.list().find((x) => x.id === 'ok').updatedAt, 0);
});

test('batas jumlah soal; penyimpanan penuh atau diblokir melaporkan alasan tanpa melempar dan tanpa merusak data lama', () => {
  const { st, storage } = baru();
  const r0 = st.simpan(SOAL); assert.ok(r0.ok);
  storage.penuh = true;
  assert.equal(st.simpan(SOAL).reason, 'ditolak');
  assert.equal(st.hapus(r0.id).reason, 'ditolak');
  storage.penuh = false;
  assert.equal(st.list().length, 1, 'data lama selamat');
  const besar = baru();
  const kosong = { app: NAMA_BERKAS, v: 1, soal: Array.from({ length: MAKS_SOAL + 5 }, (_, i) => ({ id: 'i' + i, updatedAt: i, isi: SOAL })) };
  const r = besar.st.impor(JSON.stringify(kosong));
  assert.equal(r.tambah, MAKS_SOAL); assert.equal(r.lewati, 5);
  assert.equal(besar.st.simpan(SOAL).reason, 'terlalu-banyak');
  const tanpa = createSoalSaya({ storage: null, normal }); tanpa.setUser('u');
  assert.equal(tanpa.tersedia, false); assert.equal(tanpa.simpan(SOAL).reason, 'tidak-tersedia'); assert.deepEqual(tanpa.list(), []);
  const rusak = baru(); rusak.storage.setItem(KUNCI + 'u1', '{bukan json'); assert.deepEqual(rusak.st.list(), []);
});

/* ---- Catatan wajib pada ekspor ---- */
const html = readFileSync(new URL('../web/App.jsx', import.meta.url), 'utf8');
const a = html.indexOf('const optsOf = '); const b = html.indexOf('const FORMATS = [');
const LEVEL = [{ v: 'L1', label: 'L1' }, { v: 'L2', label: 'L2' }, { v: 'L3', label: 'L3' }];
const B = new Function('Bt', 'KEYS', 'LEVEL', 'window', `${html.slice(a, b)}\nreturn { buildGift, buildMoodleXml, buildCsvForms, buildCsvRdm, buildDocx };`)(Bt, ['A', 'B', 'C', 'D', 'E'], LEVEL, { docx, Pegon });
const kosong = { A: '', B: '', C: '', D: '', E: '' };
const dasar = { tingkat: 'MA', mapel: 'Fiqih', level: 'L2', nama: 'Fathul Qarib', juz: '', hal: '10', teks: 'مَاءُ الْبَحْرِ', pembahasan: 'Dasarnya tujuh air suci.', indikator: 'x' };
const QS = [
  { ...dasar, stimulus: 'Santri di pantai.', pertanyaan: 'Air manakah yang sah?', opsi: { A: 'Air kelapa', B: 'Air laut', C: 'Air teh', D: 'Air mawar', E: 'Air jeruk' }, kunci: 'B' },
  { ...dasar, bentuk: 'uraian', pertanyaan: 'Jelaskan syarat qashar!', opsi: kosong, kunci: '', jawaban: 'Dua marhalah.', rubrik: 'skor 4' },
];

test('GIFT dan Moodle XML: catatan masuk sebagai komentar dan tidak merusak sintaks', () => {
  const g = B.buildGift(QS, CATATAN_USTADZ);
  assert.ok(g.startsWith('// LABSOUMA, format Moodle GIFT\n// ' + CATATAN_USTADZ + '\n'));
  assert.ok(g.trimEnd().endsWith('// ' + CATATAN_USTADZ));
  assert.equal(B.buildGift(QS), B.buildGift(QS, ''), 'tanpa catatan: keluaran lama tidak berubah');
  assert.ok(!B.buildGift(QS).includes('belum ditelaah'));
  const x = B.buildMoodleXml(QS, CATATAN_USTADZ);
  assert.match(x, /^<\?xml[^>]*\?>\n<!-- Soal latihan[^>]*-->\n<quiz>/);
  assert.ok(!/--[^>]*--/.test(x.replace(/<!--[\s\S]*?-->/, '')), 'tidak ada komentar liar');
  assert.ok(!B.buildMoodleXml(QS).includes('belum ditelaah'));
});

test('CSV: catatan menjadi kolom terakhir di setiap baris, jumlah baris tidak bertambah', () => {
  for (const [fn, jml] of [[B.buildCsvForms, 'forms'], [B.buildCsvRdm, 'rdm']]) {
    const tanpa = fn(QS).trim().split('\n'); const dengan = fn(QS, CATATAN_USTADZ).trim().split('\n');
    assert.equal(dengan.length, tanpa.length, jml);
    assert.match(dengan[0], /,"Catatan"$/, jml);
    for (const baris of dengan.slice(1)) assert.ok(baris.endsWith(',"' + CATATAN_USTADZ + '"'), jml);
    assert.ok(!tanpa.join('\n').includes('belum ditelaah'));
  }
});

const bacaZip = async (blob) => { const z = await JSZip.loadAsync(Buffer.from(await blob.arrayBuffer())); const f = async (n) => (z.file(n) ? z.file(n).async('string') : null); return { z, doc: await f('word/document.xml'), kaki: await f('word/footer1.xml') }; };

test('DOCX (semua mode): catatan di bawah judul dan di kaki halaman; tanpa catatan tidak ada kaki', { skip: !docx || !JSZip }, async () => {
  for (const mode of ['daftar', 'kartu', 'pegon', 'pegonlatin']) {
    const ada = await bacaZip(await B.buildDocx(QS, mode, CATATAN_USTADZ));
    assert.ok(ada.doc.includes('belum ditelaah tim editor'), mode + ': isi');
    assert.ok(ada.kaki && ada.kaki.includes('belum ditelaah tim editor'), mode + ': kaki halaman');
    assert.ok(ada.doc.indexOf('belum ditelaah') < ada.doc.indexOf('Air manakah') || mode.startsWith('pegon'), mode + ': di atas soal');
    const tanpa = await bacaZip(await B.buildDocx(QS, mode));
    assert.ok(!tanpa.doc.includes('belum ditelaah') && !tanpa.kaki, mode + ': tanpa catatan tidak berubah');
  }
});

test('kisi-kisi: catatan di DOCX (isi + kaki), CSV, dan teks; tanpa catatan tidak berubah', { skip: !docx || !JSZip }, async () => {
  const soal = QS.map((q, i) => ({ ...q, bab: 'Bab Air', id: 's' + i }));
  const kisi = Kisi.buatKisi(soal, { judul: 'Latihan' });
  for (const mode of ['kisi', 'fokus', 'lengkap']) {
    const d = await bacaZip(await docx.Packer.toBlob(Kisi.buatKisiDocx(docx, kisi, mode, CATATAN_USTADZ)));
    assert.ok(d.doc.includes('belum ditelaah') && d.kaki.includes('belum ditelaah'), mode);
    const t = await bacaZip(await docx.Packer.toBlob(Kisi.buatKisiDocx(docx, kisi, mode)));
    assert.ok(!t.doc.includes('belum ditelaah') && !t.kaki, mode + ' tanpa');
  }
  assert.ok(Kisi.kisiKeCsv(kisi, CATATAN_USTADZ).includes('"Catatan","' + CATATAN_USTADZ));
  assert.ok(Kisi.kisiKeTeks(kisi, CATATAN_USTADZ).trimEnd().endsWith('Catatan: ' + CATATAN_USTADZ));
  assert.equal(Kisi.kisiKeCsv(kisi), Kisi.kisiKeCsv(kisi, ''));
  assert.equal(Kisi.kisiKeTeks(kisi), Kisi.kisiKeTeks(kisi, ''));
});

test('catatan memuat penjelasan yang jujur dan tidak memuat karakter berbahaya untuk komentar XML/CSV', () => {
  assert.match(CATATAN_USTADZ, /belum ditelaah tim editor/);
  assert.ok(!/--|<|>|&/.test(CATATAN_USTADZ));
});

/* ---- Penjaga struktur: layar Ustadz tidak boleh menyentuh bank soal atau pengguna ---- */
const mulai = html.indexOf('function AppUstadz(');
const akhir = html.indexOf('/* ---------- Backup ke Google Drive');
const blokUstadz = html.slice(mulai, akhir);

test('AppUstadz: hanya lima tab, tanpa akses ke koleksi soal/users, dan kamus hanya dibaca', () => {
  assert.ok(mulai > 0 && akhir > mulai);
  const ids = [...blokUstadz.matchAll(/\{ id: '([a-z]+)', label:/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['compose', 'saya', 'export', 'fokus', 'pegon']);
  assert.match(blokUstadz, /const ID_TAB = \['compose', 'saya', 'export', 'fokus', 'pegon'\];/);
  assert.doesNotMatch(blokUstadz, /collection\('soal'\)|collection\('users'\)|doc\('users|\bcol\./, 'tidak boleh membaca atau menulis bank/pengguna');
  assert.doesNotMatch(blokUstadz, /\/api\/(backup|config-backup|ai-config)/);
  assert.doesNotMatch(blokUstadz, /aksi: '(simpan|reset|pulihkan)'/);
  assert.match(blokUstadz, /canShare: false/);
  assert.equal([...blokUstadz.matchAll(/collection\('([^']+)'\)/g)].map((m) => m[1]).join(','), 'kamusPegon');
});

test('Root mengarahkan peran ustadz ke AppUstadz, dan hanya peran itu', () => {
  assert.match(html, /if \(profile\.role === 'ustadz'\) return <AppUstadz user=\{user\} profile=\{profile\} \/>;\n  return <App user=\{user\} profile=\{profile\} \/>;/);
  assert.match(html, /ustadz: 'Ustadz'/);
});
