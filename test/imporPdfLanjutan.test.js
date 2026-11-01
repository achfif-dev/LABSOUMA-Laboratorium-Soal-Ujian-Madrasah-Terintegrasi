// Peningkatan impor PDF: penanda buku, judul menurut ukuran huruf, metadata, penilaian halaman, OCR AI untuk PDF pindai, dan jalur server impor-ocr.
import test from 'node:test';
import assert from 'node:assert/strict';
import { rincianHalamanPdf, teksHalamanPdf, parsePdf } from '../web/lib/sumberLain.js';
import { nilaiHalamanPdf } from '../web/lib/kualitasKitab.js';
import { bukaPdf, bacaOutline, bersihkanMeta } from '../web/lib/bacaPdf.js';
import { jalankanOcr } from '../web/lib/ocrPdf.js';
import { bacaDokumenKitab } from '../web/lib/dokumenKitab.js';
import { validasiKitab, validasiHalaman, JENIS_SUMBER } from '../src/kitabImpor.js';
import { aksiOcr } from '../src/kitabOcr.js';
import { ErrorSyamilah } from '../web/lib/syamilah.js';

const it = (str, y, h = 12, x = 100, width = 60) => ({ str, transform: [h, 0, 0, h, x, y], width });
const ISI = 'قال المصنف رحمه الله تعالى في بيان أحكام الطهارة والصلاة وما يتعلق بهما من الشروط والأركان';
const halamanTeks = (n) => Array.from({ length: n }, (_, i) => `${ISI} ${'كلمة '.repeat(10)}${i}`);

/* ---------- ukuran huruf -> calon judul ---------- */
test('rincianHalamanPdf: baris berhuruf lebih besar jadi calon judul; teks sama dengan teksHalamanPdf', () => {
  const items = [it('باب الطهارة', 700, 24), it(ISI, 670), it(ISI + ' ثانيا', 655), it(ISI + ' ثالثا', 640), it('1234', 100, 24)];
  const r = rincianHalamanPdf(items);
  assert.equal(r.teks, teksHalamanPdf(items));
  assert.deepEqual(r.judul.map((j) => j.teks), ['باب الطهارة']);
  assert.ok(r.judul[0].rasio >= 1.9);
});
test('rincianHalamanPdf: halaman pendek (sampul, < 3 baris) dan baris angka besar tidak jadi judul', () => {
  assert.deepEqual(rincianHalamanPdf([it('كتاب', 700, 30), it('الطهارة', 600, 12)]).judul, []);
  assert.deepEqual(rincianHalamanPdf([it('٣٤', 700, 30), it(ISI, 650), it(ISI, 630), it(ISI, 610)]).judul, []);
  assert.deepEqual(rincianHalamanPdf([]), { teks: '', judul: [], duaKolom: false, digabung: 0 });
});

/* ---------- penilaian per halaman ---------- */
test('nilaiHalamanPdf: kosong, rusak (pengganti, terbalik, huruf terpisah), dan teks baik', () => {
  assert.equal(nilaiHalamanPdf(''), 'kosong');
  assert.equal(nilaiHalamanPdf('  12  \n'), 'kosong');
  assert.equal(nilaiHalamanPdf(ISI), 'teks');
  assert.equal(nilaiHalamanPdf('\ue001\ue002\ue003'.repeat(10) + ISI), 'rusak');
  const terbalik = Array.from({ length: 20 }, () => 'يف نم ىلع اذه').join(' ') + ' ' + ISI;
  assert.equal(nilaiHalamanPdf(terbalik), 'rusak');
  const terpisah = Array.from({ length: 40 }, () => 'ب ت ث ج').join(' ');
  assert.equal(nilaiHalamanPdf(terpisah), 'rusak');
});

/* ---------- parsePdf: penanda buku, ukuran huruf, metadata, OCR ---------- */
test('parsePdf: penanda buku (>= 3 entri) menjadi daftar isi; level mengikuti kedalaman', () => {
  const outline = [{ judul: 'المقدمة', level: 1, indeks: 0 }, { judul: 'باب الطهارة', level: 1, indeks: 3 }, { judul: 'فصل في الوضوء', level: 2, indeks: 5 }, { judul: 'rusak', level: 1, indeks: 999 }];
  const h = parsePdf(halamanTeks(12), { outline, namaBerkas: 'x.pdf' });
  assert.deepEqual(h.daftarIsi.map((d) => [d.judul, d.seq, d.level]), [['المقدمة', 1, 1], ['باب الطهارة', 4, 1], ['فصل في الوضوء', 6, 2]]);
  assert.equal(h.laporan.judulSumber, 'penanda-buku');
  assert.equal(h.halaman[4].bab, 'باب الطهارة');
});
test('parsePdf: outline kurang dari 3 entri diabaikan; judul ukuran huruf dipakai, dan hanya bila barisnya masih ada di halaman', () => {
  const hal = halamanTeks(12); hal[2] = 'باب الصلاة\n' + hal[2];
  const judulUkuran = hal.map(() => []); judulUkuran[2] = [{ teks: 'باب الصلاة', rasio: 1.8 }, { teks: 'baris yang hilang', rasio: 2 }];
  const h = parsePdf(hal, { outline: [{ judul: 'a b c', level: 1, indeks: 1 }], judulUkuran });
  const j = h.daftarIsi.filter((d) => d.seq === 3);
  assert.equal(j.length, 1); assert.equal(j[0].level, 1);
  assert.ok(!h.daftarIsi.some((d) => d.judul === 'baris yang hilang'));
});
test('parsePdf: metadata dipakai sebagai nama dan pengarang awal; tanpa opsi baru perilaku lama tetap', () => {
  const h = parsePdf(halamanTeks(8), { namaBerkas: 'berkas.pdf', meta: { judul: 'فتح المعين', pengarang: 'زين الدين المليباري' } });
  assert.equal(h.kitab.judul, 'فتح المعين'); assert.equal(h.kitab.pengarang, 'زين الدين المليباري');
  const lama = parsePdf(halamanTeks(8), { namaBerkas: 'berkas.pdf' });
  assert.equal(lama.kitab.judul, 'berkas'); assert.equal(lama.kitab.sumber.jenis, 'pdf'); assert.equal(lama.format, 'pdf'); assert.equal(lama.kitab.ocrHalaman, 0);
});
test('parsePdf: halaman OCR ditandai, jenis sumber pdf-ocr, dan halaman bermasalah yang belum di-OCR dilaporkan', () => {
  const hal = halamanTeks(10); hal[4] = ''; hal[7] = '';
  const sebelum = parsePdf(hal, {});
  assert.deepEqual(sebelum.laporan.halamanPerluOcr, [4, 7]); assert.equal(sebelum.format, 'pdf');
  const hal2 = hal.slice(); hal2[4] = ISI + ' من OCR';
  const h = parsePdf(hal2, { ocr: [4] });
  assert.equal(h.format, 'pdf-ocr'); assert.equal(h.kitab.sumber.jenis, 'pdf-ocr'); assert.equal(h.kitab.ocrHalaman, 1);
  assert.equal(h.halaman[4].ocr, true); assert.equal(h.halaman[3].ocr, undefined);
  assert.deepEqual(h.laporan.halamanPerluOcr, [7]);
});
test('parsePdf: PDF pindai penuh ditolak PDF_TANPA_TEKS dan menyertakan jumlah halaman yang perlu OCR', () => {
  assert.throws(() => parsePdf(['', '', '', ''], {}), (e) => e.kode === 'PDF_TANPA_TEKS' && e.halamanPerluOcr === 4 && /OCR/.test(e.message));
});

/* ---------- sesi PDF dengan pdf.js tiruan ---------- */
function pdfTiruan({ halaman, outline = null, info = {}, tujuan = {} }) {
  const dilepas = { cleanup: 0, destroy: 0 };
  const doc = {
    numPages: halaman.length,
    getPage: async (n) => ({ getTextContent: async () => ({ items: halaman[n - 1] }), cleanup: () => { dilepas.cleanup++; }, getViewport: ({ scale }) => ({ width: 600 * scale, height: 800 * scale }) }),
    getOutline: async () => outline, getDestination: async (nama) => tujuan[nama] || null, getPageIndex: async (ref) => ref.num, getMetadata: async () => ({ info }),
    destroy: () => { dilepas.destroy++; },
  };
  return { lib: { getDocument: () => ({ promise: Promise.resolve(doc) }) }, dilepas };
}
test('bukaPdf: teks, penanda buku (tujuan bernama dan langsung), metadata, dan halaman dilepas', async () => {
  const baris = (teks) => [it(teks, 700, 24), it(ISI, 650), it(ISI, 630), it(ISI, 610)];
  const { lib, dilepas } = pdfTiruan({
    halaman: [baris('باب أول'), baris('باب ثان'), baris('باب ثالث')],
    outline: [{ title: 'الباب الأول', dest: [{ num: 0 }], items: [{ title: 'فصل', dest: 'nama1', items: [] }] }, { title: 'rusak', dest: 'tidak-ada', items: [] }, { title: 'خارج', dest: [{ num: 99 }], items: [] }],
    tujuan: { nama1: [{ num: 2 }] }, info: { Title: 'Microsoft Word - a.docx', Author: 'المؤلف الفاضل' },
  });
  const sesi = await bukaPdf(new ArrayBuffer(8), { pustaka: lib });
  const proses = []; const { teks, judulUkuran } = await sesi.teksSemua({ onProgres: (n, t) => proses.push([n, t]) });
  assert.equal(teks.length, 3); assert.deepEqual(proses, [[1, 3], [2, 3], [3, 3]]); assert.equal(judulUkuran[1][0].teks, 'باب ثان');
  assert.deepEqual(await sesi.outline(), [{ judul: 'الباب الأول', level: 1, indeks: 0 }, { judul: 'فصل', level: 2, indeks: 2 }]);
  assert.deepEqual(await sesi.meta(), { judul: '', pengarang: 'المؤلف الفاضل' }); // judul sampah dibuang
  sesi.tutup(); assert.equal(dilepas.cleanup, 3); assert.equal(dilepas.destroy, 1);
});
test('bukaPdf: dibatalkan di tengah jalan; PDF terlalu besar ditolak dan dilepas', async () => {
  const { lib } = pdfTiruan({ halaman: [[it(ISI, 700)], [it(ISI, 700)], [it(ISI, 700)]] });
  const sesi = await bukaPdf(new ArrayBuffer(8), { pustaka: lib });
  let n = 0; await assert.rejects(sesi.teksSemua({ batal: () => ++n > 1 }), (e) => e.kode === 'DIBATALKAN');
  const besar = pdfTiruan({ halaman: new Array(3001).fill([]) });
  await assert.rejects(bukaPdf(new ArrayBuffer(8), { pustaka: besar.lib }), (e) => e.kode === 'PDF_TERLALU_BESAR');
  assert.equal(besar.dilepas.destroy, 1);
  assert.deepEqual(await bacaOutline({ numPages: 1, getOutline: async () => { throw new Error('x'); } }), []);
  assert.deepEqual(bersihkanMeta(null), { judul: '', pengarang: '' });
});

/* ---------- OCR ---------- */
const gambar = async (i) => ({ mime: 'image/jpeg', data: `img${i}` });
test('jalankanOcr: semua halaman terbaca; halaman tanpa teks Arab dihitung kosong, bukan gagal', async () => {
  const hasil = await jalankanOcr({ indeks: [3, 1, 2, 1], ambilGambar: gambar, panggil: async ({ data }) => { if (data === 'img2') { const e = new Error('x'); e.code = 'TEKS_TIDAK_MEMADAI'; throw e; } return { teks: `T-${data}`, kualitas: 'jelas' }; } });
  assert.deepEqual([...hasil.teks.entries()].sort(), [[1, 'T-img1'], [3, 'T-img3']]); assert.deepEqual(hasil.kosong, [2]); assert.deepEqual(hasil.gagal, []);
});
test('jalankanOcr: 429 ditunggu lalu diulang; kuota harian habis menghentikan semuanya', async () => {
  let gagalSekali = true; const tunggu = [];
  const a = await jalankanOcr({ indeks: [0], ambilGambar: gambar, tidur: async (ms) => { tunggu.push(ms); }, panggil: async () => { if (gagalSekali) { gagalSekali = false; const e = new Error('sibuk'); e.status = 429; e.retryAfter = 5; throw e; } return { teks: 'ok' }; } });
  assert.equal(a.teks.get(0), 'ok'); assert.deepEqual(tunggu, [5000]);
  let dipanggil = 0;
  const b = await jalankanOcr({ indeks: [0, 1, 2, 3, 4, 5], konkuren: 1, ambilGambar: gambar, panggil: async () => { dipanggil++; const e = new Error('habis'); e.status = 429; e.code = 'RATE_LIMIT_DAILY'; throw e; } });
  assert.equal(b.kuotaHabis, true); assert.equal(dipanggil, 1); assert.equal(b.gagal.length, 1);
});
test('jalankanOcr: galat lain mencatat halaman gagal tanpa menghentikan halaman lain; pembatalan berhenti', async () => {
  const r = await jalankanOcr({ indeks: [0, 1, 2], konkuren: 1, ambilGambar: gambar, panggil: async ({ data }) => { if (data === 'img1') { const e = new Error('AI menolak'); e.status = 422; e.code = 'AI_MENOLAK'; throw e; } return { teks: 'ok' }; } });
  assert.deepEqual([...r.teks.keys()], [0, 2]); assert.deepEqual(r.gagal, [{ indeks: 1, pesan: 'AI menolak' }]);
  let n = 0; const b = await jalankanOcr({ indeks: [0, 1, 2, 3, 4], konkuren: 1, ambilGambar: gambar, panggil: async () => ({ teks: 'ok' }), batal: () => n++ >= 2 });
  assert.equal(b.dibatalkan, true); assert.ok(b.teks.size < 5);
});

/* ---------- alur lengkap lewat bacaDokumenKitab ---------- */
function sesiTiruan(halamanTeks, { gagalGambar = false } = {}) {
  return async () => ({ jumlah: halamanTeks.length, teksSemua: async ({ onProgres = () => {} } = {}) => { onProgres(1, 1); return { teks: halamanTeks.slice(), judulUkuran: halamanTeks.map(() => []) }; }, outline: async () => [], meta: async () => ({ judul: '', pengarang: '' }),
    gambarHalaman: async (i) => { if (gagalGambar) throw new Error('kanvas gagal'); return { mime: 'image/jpeg', data: `p${i}` }; }, tutup() { this.ditutup = true; } });
}
test('bacaDokumenKitab: PDF pindai penuh gagal tanpa OCR, berhasil dengan OCR, dan hasilnya bertanda OCR', async () => {
  const pindai = ['', '', '', '', '', ''];
  await assert.rejects(bacaDokumenKitab({ nama: 's.pdf', buffer: new ArrayBuffer(8), bukaPdf: sesiTiruan(pindai) }), (e) => e.kode === 'PDF_TANPA_TEKS' && e.halamanPerluOcr === 6);
  const proses = [];
  const h = await bacaDokumenKitab({ nama: 's.pdf', buffer: new ArrayBuffer(8), bukaPdf: sesiTiruan(pindai), onProgres: (p) => proses.push(p.tahap), ocr: { mode: 'perlu', panggil: async ({ data }) => ({ teks: `${ISI} ${data}`, kualitas: 'sedang' }) } });
  assert.equal(h.format, 'pdf-ocr'); assert.equal(h.halaman.length, 6); assert.ok(h.halaman.every((p) => p.ocr === true));
  assert.equal(h.laporan.ocr.berhasil, 6); assert.equal(h.laporan.ocr.sedang, 6); assert.ok(proses.includes('ocr'));
});
test('bacaDokumenKitab: mode perlu hanya membaca halaman bermasalah; teks lapisan PDF yang baik dipertahankan', async () => {
  const hal = halamanTeks(8); hal[2] = ''; const dipanggil = [];
  const h = await bacaDokumenKitab({ nama: 'c.pdf', buffer: new ArrayBuffer(8), bukaPdf: sesiTiruan(hal), ocr: { panggil: async ({ data }) => { dipanggil.push(data); return { teks: ISI + ' OCR' }; } } });
  assert.deepEqual(dipanggil, ['p2']); assert.equal(h.laporan.ocr.dicoba, 1);
  assert.deepEqual(h.halaman.map((p) => !!p.ocr), [false, false, true, false, false, false, false, false]);
  assert.ok(h.halaman[0].teks.includes('0'));
});
test('bacaDokumenKitab: OCR yang gagal total memberi pesan OCR_GAGAL; pembatalan memberi DIBATALKAN; sesi selalu ditutup', async () => {
  let sesi; const buka = (hal, o) => async (b) => { sesi = await sesiTiruan(hal, o)(b); return sesi; };
  await assert.rejects(bacaDokumenKitab({ nama: 'g.pdf', buffer: new ArrayBuffer(8), bukaPdf: buka(['', '', '', ''], { gagalGambar: true }), ocr: { panggil: async () => ({ teks: 'x' }) } }), (e) => e.kode === 'OCR_GAGAL' && /kanvas gagal/.test(e.message));
  assert.equal(sesi.ditutup, true);
  await assert.rejects(bacaDokumenKitab({ nama: 'g.pdf', buffer: new ArrayBuffer(8), bukaPdf: buka(['', '', '', ''], {}), batal: () => true, ocr: { panggil: async () => ({ teks: ISI }) } }), (e) => e instanceof ErrorSyamilah && e.kode === 'DIBATALKAN');
  assert.equal(sesi.ditutup, true);
});
test('bacaDokumenKitab: antarmuka bacaPdf lama (string[]) dan bentuk objek baru tetap jalan', async () => {
  const lama = await bacaDokumenKitab({ nama: 'l.pdf', buffer: new ArrayBuffer(8), bacaPdf: async () => halamanTeks(8) });
  assert.equal(lama.format, 'pdf');
  const baru = await bacaDokumenKitab({ nama: 'b.pdf', buffer: new ArrayBuffer(8), bacaPdf: async () => ({ teks: halamanTeks(8), outline: [{ judul: 'أ', level: 1, indeks: 0 }, { judul: 'ب', level: 1, indeks: 2 }, { judul: 'ج', level: 1, indeks: 4 }] }) });
  assert.equal(baru.daftarIsi.length, 3);
});

/* ---------- server ---------- */
test('server: pdf-ocr dan penanda OCR lolos validasi; nilai lain ditolak', () => {
  assert.ok(JENIS_SUMBER.includes('pdf-ocr'));
  const meta = { judul: 'ج', judulLatin: 'J', jumlahHalaman: 3, jumlahJuz: 1, bentukMatn: 'tanpa-pemisah', ocrHalaman: 2, sumber: { jenis: 'pdf-ocr' } };
  assert.equal(validasiKitab(meta).ocrHalaman, 2); assert.equal(validasiKitab({ ...meta, ocrHalaman: undefined }).ocrHalaman, 0);
  assert.throws(() => validasiKitab({ ...meta, ocrHalaman: -1 }), { code: 'KITAB_INVALID' });
  const h = { id: 'p00001', seq: 1, juz: 1, hal: 1, teks: 'x', batasMatn: null };
  assert.equal(validasiHalaman({ ...h, ocr: true }, 3).ocr, true); assert.equal('ocr' in validasiHalaman({ ...h, ocr: 'ya' }, 3), false); assert.equal('ocr' in validasiHalaman(h, 3), false);
});
test('server: aksiOcr memanggil pembaca foto kitab dan meringkas hasilnya; gambar cacat ditolak sebelum AI', async () => {
  const gam = { mime: 'image/jpeg', data: 'A'.repeat(200) }; let dipanggil = 0;
  const client = { messages: { create: async () => { dipanggil++; return { stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'hasil_foto_kitab', input: { teks: ISI, kualitas: 'jelas', ragu: [{ kata: 'قال', catatan: 'buram' }] } }] }; } } };
  const r = await aksiOcr({ gambar: gam }, { client });
  assert.deepEqual(r, { teks: ISI, kualitas: 'jelas', jumlahRagu: 1 }); assert.equal(dipanggil, 1);
  await assert.rejects(aksiOcr({}, { client }), { code: 'BAD_REQUEST' }); assert.equal(dipanggil, 1);
});

/* ================= tahap 2: dua kolom, paragraf, ligatur, OCR Latin/Pegon ================= */
import { cariTalang, lipatBaris, perbaikiLigatur } from '../web/lib/sumberLain.js';

const dua = (str, x, y, w, h = 12) => ({ str, transform: [h, 0, 0, h, x, y], width: w });
// halaman dua kolom prosa: 20 baris, kolom kanan x 310-530, kolom kiri x 50-270, talang 40 satuan; ditambah judul selebar halaman
function halamanDuaKolom() {
  const items = [dua('باب الطهارة في بيان أحكام المياه والنجاسات وما يتعلق بهما', 50, 790, 480, 12)];
  for (let i = 1; i <= 20; i++) { const y = 760 - i * 18; items.push(dua(`${ISI} R${i}`, 310, y, 220), dua(`${ISI} L${i}`, 50, y, 220)); }
  return items;
}
test('dua kolom prosa: dibaca per kolom (kanan dulu untuk Arab), judul selebar halaman tetap di atas; mode tutup tetap per baris', () => {
  const items = halamanDuaKolom();
  assert.ok(cariTalang(items.map((u) => ({ s: u.str, x: u.transform[4], y: u.transform[5], h: u.transform[3], w: u.width }))) !== null);
  const r = rincianHalamanPdf(items, { kolom: 'auto' });
  assert.equal(r.duaKolom, true);
  const t = r.teks; const pos = (k) => t.indexOf(k);
  assert.ok(pos('باب الطهارة') < pos('R1')); assert.ok(pos('R1') < pos('R20')); assert.ok(pos('R20') < pos('L1')); assert.ok(pos('L1') < pos('L20'));
  const lama = rincianHalamanPdf(items, { kolom: 'tutup' });
  assert.equal(lama.duaKolom, false); assert.ok(lama.teks.indexOf('L1') < lama.teks.indexOf('R2')); // per baris: R1 L1 R2 L2 ...
});
test('nazham (dua syatr per baris, syatr pendek) TIDAK dibaca per kolom', () => {
  const items = []; for (let i = 1; i <= 20; i++) { const y = 760 - i * 18; items.push(dua(`شطر أول ${i}`, 260, y, 190), dua(`شطر ثان ${i}`, 50, y, 190)); }
  const r = rincianHalamanPdf(items, { kolom: 'auto' });
  assert.equal(r.duaKolom, false); assert.ok(r.teks.indexOf('ثان 1') < r.teks.indexOf('أول 2'));
});
test('halaman satu kolom, atau terlalu sedikit baris, tidak dianggap dua kolom', () => {
  const satu = []; for (let i = 1; i <= 30; i++) satu.push(dua(`${ISI} ${i}`, 50, 760 - i * 18, 480));
  assert.equal(rincianHalamanPdf(satu, { kolom: 'auto' }).duaKolom, false);
  const sedikit = []; for (let i = 1; i <= 6; i++) sedikit.push(dua(`${ISI} R${i}`, 310, 760 - i * 18, 220), dua(`${ISI} L${i}`, 50, 760 - i * 18, 220));
  assert.equal(rincianHalamanPdf(sedikit, { kolom: 'auto' }).duaKolom, false);
});

const kata = (i) => `${'كلمة '.repeat(3)}${i}`;
const baris14 = () => { // 14 baris Arab (tepi kanan x = 500); paragraf A = baris 2-6 (baris 6 pendek, mulai dari tepi kanan), paragraf B = baris 7-10 (baris 7 menjorok 30, baris 10 pendek)
  const L = (i, w = 400, x = 100) => dua(kata(i), x, 760 - i * 18, w);
  return [L(0), L(1), L(2), L(3), L(4), L(5), L(6, 150, 350), L(7, 370, 100), L(8), L(9), L(10, 100, 400), L(11), L(12), L(13)];
};
test('paragraf: baris terisi penuh digabung sampai baris pendek; menjorok memulai paragraf baru; dua baris awal dan akhir tak disentuh', () => {
  const r = rincianHalamanPdf(baris14(), { paragraf: true });
  const baris = r.teks.split('\n');
  assert.equal(baris.length, 7); assert.equal(r.digabung, 7);
  assert.ok(baris[2].includes('2') && baris[2].includes('6') && !baris[2].includes('7'));
  assert.ok(baris[3].includes('7') && baris[3].includes('10'));
  assert.ok(baris[0].endsWith('0') && baris[1].endsWith('1') && baris[6].endsWith('13'));
  assert.equal(rincianHalamanPdf(baris14(), { paragraf: false }).teks.split('\n').length, 14);
});
test('paragraf: baris bercelah lebar (syair) dan baris judul tidak digabung', () => {
  const syair = []; for (let i = 0; i < 14; i++) syair.push(dua(kata(i), 350, 760 - i * 18, 150), dua(kata(i), 100, 760 - i * 18, 150));
  assert.equal(rincianHalamanPdf(syair, { paragraf: true }).teks.split('\n').length, 14);
  const b = baris14(); b[5] = dua('فصل في الوضوء والغسل', 100, 760 - 5 * 18, 400);
  const t = rincianHalamanPdf(b, { paragraf: true }).teks.split('\n');
  assert.ok(t.some((x) => x.startsWith('فصل في الوضوء') && !x.includes('كلمة')));
});
test('paragraf Latin: kata terpotong tanda hubung disambung', () => {
  const L = (s, i) => dua(s, 100, 760 - i * 18, 400);
  const items = [L('Judul', 0), L('Pengantar', 1), L('Bab satu', 2), L('permulaan uraian tentang infor-', 3), L('masi yang sangat penting bagi kita', 4), L('baris kelima yang panjang sekali', 5), L('baris keenam', 6), L('baris ketujuh', 7), L('akhir satu', 8), L('akhir dua', 9)];
  const t = rincianHalamanPdf(items, { paragraf: true }).teks;
  assert.ok(t.includes('informasi yang sangat')); assert.ok(!t.includes('infor-'));
});
test('lipatBaris: halaman kurang dari 6 baris dibiarkan', () => {
  const b = [{ teks: 'a b c d e f g', tinggi: 12, jeda: false, x0: 0, x1: 100, celahMaks: 0 }, { teks: 'h i j k l m n', tinggi: 12, jeda: false, x0: 0, x1: 100, celahMaks: 0 }];
  assert.deepEqual(lipatBaris(b, true), { baris: b, digabung: 0 });
});

test('ligatur: NUL yang berdiri sendiri diganti menurut konteks; yang menempel pada huruf dibiarkan', () => {
  assert.deepEqual(perbaikiLigatur('قال المصنف رحمه \u0000 تعالى'), { teks: 'قال المصنف رحمه الله تعالى', jumlah: 1 });
  assert.equal(perbaikiLigatur('قال النبي \u0000 في الحديث').teks, 'قال النبي صلى الله عليه وسلم في الحديث');
  assert.equal(perbaikiLigatur('قال رسول الله \u0000.').teks, 'قال رسول الله صلى الله عليه وسلم.');
  assert.equal(perbaikiLigatur('محمدٍ \u0000').teks, 'محمدٍ صلى الله عليه وسلم');
  const menempel = perbaikiLigatur('كلمة\u0000ما'); assert.equal(menempel.jumlah, 0); assert.ok(menempel.teks.includes('\u0000'));
  assert.deepEqual(perbaikiLigatur('tanpa nul'), { teks: 'tanpa nul', jumlah: 0 });
});
test('parsePdf: ligatur diperbaiki dan dilaporkan', () => {
  const hal = halamanTeks(8); hal[1] = `${ISI} رحمه \u0000 تعالى`; hal[5] = `${ISI} قال النبي \u0000 كذا`;
  const h = parsePdf(hal, {});
  assert.equal(h.laporan.ligaturDiperbaiki, 2); assert.ok(h.halaman.every((p) => !p.teks.includes('\u0000')));
  assert.ok(h.halaman[5].teks.includes('صلى الله عليه وسلم'));
});

test('bukaPdf.teksSemua meneruskan opsi kolom dan paragraf dan menghitung halaman dua kolom', async () => {
  const { lib } = pdfTiruan({ halaman: [halamanDuaKolom(), halamanDuaKolom()] });
  const sesi = await bukaPdf(new ArrayBuffer(8), { pustaka: lib });
  const a = await sesi.teksSemua({ kolom: 'auto' }); assert.equal(a.halamanDuaKolom, 2);
  const b = await sesi.teksSemua({ kolom: 'tutup' }); assert.equal(b.halamanDuaKolom, 0);
  const c = await bacaDokumenKitab({ nama: 'k.pdf', buffer: new ArrayBuffer(8), bukaPdf: async () => sesi, kolom: 'auto' });
  assert.equal(c.laporan.halamanDuaKolom, 2);
});

/* ---------- OCR Latin dan Pegon ---------- */
const LATIN = 'Pendidikan akhlak di madrasah dimulai dari keteladanan guru dan pembiasaan sehari-hari di lingkungan sekolah.';
const PEGON = 'ڠاڤا ڤرڠكاسن سكولاه كڠ ديسوسون دادي ساتو بوكو ڤلاجرن اكلاق';
const klien = (teks, kualitas = 'jelas') => { const panggilan = []; return { panggilan, messages: { create: async (r) => { panggilan.push(r); return { stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'hasil_foto_kitab', input: { teks, kualitas, ragu: [] } }] }; } } }; };
const GAM = { mime: 'image/jpeg', data: 'A'.repeat(200) };
test('OCR Latin: petunjuk Latin dikirim ke AI dan hasil Latin diterima', async () => {
  const c = klien(LATIN);
  const r = await aksiOcr({ gambar: GAM, aksara: 'latin' }, { client: c });
  assert.deepEqual(r, { teks: LATIN, kualitas: 'jelas', jumlahRagu: 0 });
  assert.match(JSON.stringify(c.panggilan[0]), /berhuruf Latin/); assert.match(JSON.stringify(c.panggilan[0]), /image/);
});
test('OCR Pegon: petunjuk Pegon, tidak boleh dialihaksarakan; hasil beraksara Arab diterima', async () => {
  const c = klien(PEGON);
  const r = await aksiOcr({ gambar: GAM, aksara: 'pegon' }, { client: c });
  assert.equal(r.teks, PEGON); assert.match(JSON.stringify(c.panggilan[0]), /Pegon/); assert.match(JSON.stringify(c.panggilan[0]), /mengalihaksarakan/);
});
test('OCR: aksara yang tidak cocok dengan hasil dianggap halaman tanpa teks (TEKS_TIDAK_MEMADAI); aksara tak dikenal ditolak sebelum AI', async () => {
  await assert.rejects(aksiOcr({ gambar: GAM, aksara: 'latin' }, { client: klien(ISI) }), { code: 'TEKS_TIDAK_MEMADAI' });
  await assert.rejects(aksiOcr({ gambar: GAM, aksara: 'pegon' }, { client: klien(LATIN) }), { code: 'TEKS_TIDAK_MEMADAI' });
  await assert.rejects(aksiOcr({ gambar: GAM, aksara: 'latin' }, { client: klien('pendek') }), { code: 'TEKS_TIDAK_MEMADAI' });
  const c = klien(LATIN);
  await assert.rejects(aksiOcr({ gambar: GAM, aksara: 'cina' }, { client: c }), { code: 'OCR_AKSARA_INVALID' }); assert.equal(c.panggilan.length, 0);
  await assert.rejects(aksiOcr({ aksara: 'latin' }, { client: c }), { code: 'BAD_REQUEST' }); assert.equal(c.panggilan.length, 0);
});
