// Halaman cetak yang terlalu panjang (mis. kitab Ghayatul Wushul: satu halaman > 12.000 karakter) dipecah otomatis, nomor cetak tetap.
import test from 'node:test';
import assert from 'node:assert/strict';
import { potongTeks, pecahHalamanPanjang, BATAS_PECAH, BATAS_WAJAR } from '../web/lib/pecahHalaman.js';
import { bacaDokumenKitab } from '../web/lib/dokumenKitab.js';
import { jalankanImpor, isianAwal, peringatanPratinjau } from '../web/lib/imporKitab.js';
import { buatPemuat, isianRujukan } from '../web/lib/perpus.js';
import { validasiHalaman } from '../src/kitabImpor.js';
import { __setFirebaseForTest } from '../src/platform.js';
import handler from '../api/kitab.js';
import { fakeDb } from './_fakeDb.js';

const rapat = (s) => s.replace(/\s+/g, ' ').trim();
const paragraf = (n, kata = 60) => Array.from({ length: n }, (_, i) => `فقرة ${i} ${'كلمة '.repeat(kata)}`.trim()).join('\n');
const halaman = (seq, hal, teks, ekstra = {}) => ({ id: `p${String(seq).padStart(5, '0')}`, seq, juz: 1, hal, teks, batasMatn: null, ...ekstra });
const hasil = (hs, ekstra = {}) => ({ kitab: { judul: 'ك', jumlahHalaman: hs.length }, halaman: hs, daftarIsi: [], laporan: { anomali: {}, daftarAnomali: [], halamanMelebihiBatas: [], jumlahHalaman: hs.length }, ...ekstra });

test('potongTeks: tiap bagian <= maks, ukuran seimbang, isi utuh, dipotong di batas baris', () => {
  const t = paragraf(40); // sekitar 12.300 karakter
  const r = potongTeks(t, 6000);
  assert.equal(r.length, 3);
  assert.ok(r.every((x) => x.teks.length <= 6000));
  assert.ok(Math.max(...r.map((x) => x.teks.length)) - Math.min(...r.map((x) => x.teks.length)) < 1500, 'seimbang, bukan 6000+6000+sisa kecil');
  assert.equal(rapat(r.map((x) => x.teks).join(' ')), rapat(t));
  assert.ok(r.every((x, i) => t.slice(x.mulai, x.mulai + x.teks.length) === x.teks && (i === 0 || t[x.mulai - 1].match(/\s/))), 'mulai menunjuk posisi sebenarnya di teks asal');
  assert.ok(r.slice(0, -1).every((x) => /كلمة$/.test(x.teks)), 'berhenti di akhir baris, bukan di tengah kata');
});

test('potongTeks: tanpa baris -> akhir kalimat; tanpa spasi sama sekali -> potong keras; teks pendek tidak diubah', () => {
  const kalimat = Array.from({ length: 300 }, (_, i) => `هذه جملة رقم ${i} فيها كلام كثير.`).join(' ');
  const a = potongTeks(kalimat, 3000);
  assert.ok(a.length >= 2 && a.every((x) => x.teks.length <= 3000)); assert.ok(a.slice(0, -1).every((x) => /\.$/.test(x.teks)));
  const keras = 'ا'.repeat(13000); const b = potongTeks(keras, 6000);
  assert.ok(b.every((x) => x.teks.length <= 6000)); assert.equal(b.map((x) => x.teks).join(''), keras);
  assert.deepEqual(potongTeks('نص قصير', 6000), [{ mulai: 0, teks: 'نص قصير' }]);
});

test('pecahHalamanPanjang: hal tetap, seq dan id dinomori ulang, potongan ke/dari, daftar isi dan anomali dipetakan', () => {
  const panjang = paragraf(40);
  const h = hasil([halaman(1, 10, 'أول'), halaman(2, 11, panjang, { nomorAnomali: 'lompat', bab: 'باب' }), halaman(3, 12, 'ثالث')]);
  h.daftarIsi = [{ judul: 'باب', level: 2, juz: 1, hal: 11, seq: 2 }, { judul: 'فصل', level: 3, juz: 1, hal: 12, seq: 3 }];
  h.laporan.daftarAnomali = [{ seq: 2, juz: 1, hal: 11, prevHal: 10, jenis: 'lompat' }];
  const salinan = JSON.stringify(h);
  const r = pecahHalamanPanjang(h);
  assert.equal(JSON.stringify(h), salinan, 'masukan tidak diubah');
  assert.deepEqual(r.halaman.map((x) => [x.seq, x.id, x.hal]), [[1, 'p00001', 10], [2, 'p00002', 11], [3, 'p00003', 11], [4, 'p00004', 11], [5, 'p00005', 12]]);
  assert.deepEqual(r.halaman.map((x) => x.potongan ?? null), [null, { ke: 1, dari: 3 }, { ke: 2, dari: 3 }, { ke: 3, dari: 3 }, null]);
  assert.deepEqual(r.halaman.map((x) => x.nomorAnomali ?? null), [null, 'lompat', null, null, null]); // hanya bagian pertama
  assert.ok(r.halaman.slice(1, 4).every((x) => x.bab === 'باب'));
  assert.deepEqual(r.daftarIsi.map((e) => e.seq), [2, 5]);
  assert.equal(r.laporan.daftarAnomali[0].seq, 2);
  assert.equal(r.kitab.jumlahHalaman, 5); assert.equal(r.laporan.jumlahHalaman, 5); assert.equal(r.laporan.jumlahHalamanAsli, 3);
  assert.deepEqual(r.laporan.halamanDipecah, [{ hal: 11, juz: 1, panjang: panjang.length, bagian: 3 }]);
  assert.equal(r.laporan.halamanPanjang[0].hal, 11);
  assert.ok(r.laporan.halamanTerpanjang <= BATAS_PECAH); assert.deepEqual(r.laporan.halamanMelebihiBatas, []);
});

test('batasMatn dihitung ulang per bagian (teks.slice(0, batasMatn) tetap matn)', () => {
  const t = paragraf(40); const batas = 5000; // matn = 5.000 karakter pertama
  const r = pecahHalamanPanjang(hasil([halaman(1, 7, t, { batasMatn: batas })]));
  for (const p of r.halaman) { const awal = t.indexOf(p.teks.slice(0, 30)); const bm = Math.min(Math.max(batas - awal, 0), p.teks.length); assert.ok(Math.abs(p.batasMatn - bm) <= 2, `bagian ${p.potongan.ke}`); }
  assert.ok(r.halaman[0].batasMatn > 0 && r.halaman.at(-1).batasMatn === 0);
});

test('halaman 6.000-30.000 dipecah; di atas BATAS_WAJAR TIDAK dipecah dan tetap ditandai melebihi batas (penanda halaman hilang?)', () => {
  const r = pecahHalamanPanjang(hasil([halaman(1, 1, 'ا '.repeat(3000)), halaman(2, 2, paragraf(250)), halaman(3, 3, 'نص')]));
  assert.equal(r.halaman.filter((x) => x.hal === 1).length, 1); // tepat 6.000: tidak dipecah
  assert.ok(paragraf(250).length > BATAS_WAJAR);
  assert.equal(r.halaman.filter((x) => x.hal === 2).length, 1); assert.deepEqual(r.laporan.halamanMelebihiBatas, [2]);
  assert.deepEqual(r.laporan.halamanDipecah, []);
  const w = peringatanPratinjau({ kitab: { bentukMatn: 'tanpa-pemisah', edisi: {} }, laporan: { ...r.laporan, halamanKosong: 0, halamanTanpaPemisah: 3, anomali: { duplikat: 0, mundur: 0, lompat: 0 }, judulTerdeteksi: 1 } });
  const bad = w.find((x) => x.tingkat === 'bad'); assert.ok(bad); assert.match(bad.teks, /hal\. 2 \(\d/); assert.match(bad.teks, /penanda halaman hilang/);
});

test('kitab tanpa halaman panjang tidak berubah sama sekali', () => {
  const h = hasil([halaman(1, 1, 'أ'), halaman(2, 2, 'ب')]);
  const r = pecahHalamanPanjang(h);
  assert.deepEqual(r.halaman, h.halaman); assert.deepEqual(r.laporan.halamanDipecah, []);
});

test('alur penuh: halaman 14.000 karakter dari berkas -> dipecah -> impor lewat server -> terbaca di pemilih sebagai bagian 1/3..3/3', async () => {
  const J = 'غاية الوصول';
  const teks = [`${J}\n`, `${J}(ص: 1)`, 'نص أول', `${J}(ص: 2)`, paragraf(46, 60), `${J}(ص: 3)`, 'نص ثالث'].join('\n');
  const h = await bacaDokumenKitab({ nama: 'g.txt', teks });
  assert.equal(h.halaman.length, 5); assert.deepEqual(h.halaman.map((x) => x.hal), [1, 2, 2, 2, 3]);
  assert.ok(h.halaman.every((x) => x.teks.length <= 6000)); assert.equal(h.laporan.halamanDipecah[0].hal, 2);
  const w = peringatanPratinjau(h); assert.ok(w.some((x) => x.tingkat === 'warn' && /dipecah/.test(x.teks)) && !w.some((x) => x.tingkat === 'bad'));

  const fb = { db: fakeDb({ 'users/u_admin': { role: 'admin' }, 'users/u_p': { role: 'penyusun' } }), auth: { verifyIdToken: async (t) => ({ uid: t === 'a' ? 'u_admin' : 'u_p' }) }, FieldValue: {} };
  __setFirebaseForTest(fb);
  try {
    const sebagai = (t) => async (b) => { const r = { h: {}, setHeader() {}, status(c) { r.code = c; return r; }, json(x) { r.body = x; return r; } }; await handler({ method: 'POST', headers: { authorization: 'Bearer ' + t }, body: b }, r); if (r.code !== 200) throw { ...r.body.error, status: r.code }; return r.body; };
    const r = await jalankanImpor({ panggil: sebagai('a'), hasil: h, isian: { ...isianAwal(h), judulLatin: 'Ghayatul Wushul', kitabId: 'ghayatul-wushul' } });
    assert.equal(r.selesai.jumlah, 5);
    assert.deepEqual(fb.db.data['kitab/ghayatul-wushul/halaman/p00003'].potongan, { ke: 2, dari: 3 });
    const pem = buatPemuat(sebagai('p'));
    const cari = await pem.cariHal('ghayatul-wushul', 2); assert.deepEqual(cari.map((p) => p.potongan.ke), [1, 2, 3]); // pemilih menandai ini halaman yang dipecah
    const pil = isianRujukan({ kitab: { judulLatin: 'Ghayatul Wushul' }, halaman: cari.slice(0, 1) });
    assert.equal(pil.hal, '2'); assert.ok(pil.panjang <= 6000); // satu bagian muat di Penyusunan Soal
    const semua = isianRujukan({ kitab: { judulLatin: 'x' }, halaman: cari }); assert.equal(semua.hal, '2'); assert.ok(semua.panjang > 6000); // ketiganya sekaligus sengaja ditolak pemilih (batas 6.000)
  } finally { __setFirebaseForTest(null); }
});

test('server: validasi potongan', () => {
  const ok = { id: 'p00002', seq: 2, juz: 1, hal: 2, teks: 'ن', batasMatn: null, potongan: { ke: 2, dari: 3 } };
  assert.deepEqual(validasiHalaman(ok, 5).potongan, { ke: 2, dari: 3 });
  assert.equal(validasiHalaman({ ...ok, potongan: undefined }, 5).potongan, undefined);
  for (const bad of [{ ke: 4, dari: 3 }, { ke: 0, dari: 3 }, { ke: 1, dari: 1 }, { ke: 1, dari: 100 }, 'x', null]) assert.throws(() => validasiHalaman({ ...ok, potongan: bad }, 5), (e) => e.code === 'KITAB_INVALID', JSON.stringify(bad));
  assert.ok(BATAS_WAJAR > BATAS_PECAH);
});
