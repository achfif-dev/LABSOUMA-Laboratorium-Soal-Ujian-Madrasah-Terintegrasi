import test from 'node:test';
import assert from 'node:assert/strict';
import { olahPiksel } from '../web/lib/olahGambar.js';
import { jalankanOcr } from '../web/lib/ocrPdf.js';

/** Halaman sintetis RGBA: latar `kertas`, lalu baris "teks" (balok tinta) pada tinggi tertentu. derau = amplitudo acak deterministik. */
function halaman({ w = 400, h = 560, kertas = [255, 255, 255], tinta = [20, 20, 20], baris = [], derau = 0, bintik = 0 } = {}) {
  const d = new Uint8ClampedArray(w * h * 4); let seed = 12345;
  const acak = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (let i = 0; i < w * h; i++) {
    const n = derau ? (acak() - 0.5) * 2 * derau : 0;
    d[i * 4] = kertas[0] + n; d[i * 4 + 1] = kertas[1] + n; d[i * 4 + 2] = kertas[2] + n; d[i * 4 + 3] = 255;
  }
  for (const y0 of baris) for (let y = y0; y < y0 + 12 && y < h; y++) for (let x = 40; x < w - 40; x++) { if (((x >> 1) + y) % 3 === 0) continue; const k = (y * w + x) * 4; d[k] = tinta[0]; d[k + 1] = tinta[1]; d[k + 2] = tinta[2]; }
  for (let b = 0; b < bintik; b++) { const k = (Math.floor(acak() * w * h)) * 4; d[k] = d[k + 1] = d[k + 2] = 60; }
  return d;
}
const barisPenuh = Array.from({ length: 30 }, (_, i) => 30 + i * 17);

test('olahPiksel: halaman teks biasa tidak dianggap kosong dan menjadi abu-abu (R=G=B, alfa penuh)', () => {
  const d = halaman({ baris: barisPenuh });
  const r = olahPiksel(d);
  assert.equal(r.kosong, false); assert.ok(r.tinta > 0.05, `tinta ${r.tinta}`);
  for (let i = 0; i < d.length; i += 4 * 997) { assert.equal(d[i], d[i + 1]); assert.equal(d[i + 1], d[i + 2]); assert.equal(d[i + 3], 255); }
});

test('olahPiksel: kertas menguning + tinta pucat diratakan: latar jadi putih, tinta menjadi gelap', () => {
  const d = halaman({ kertas: [225, 205, 150], tinta: [150, 130, 90], baris: barisPenuh, derau: 6 });
  const sebelum = (d[0] * 77 + d[1] * 150 + d[2] * 29) >> 8; // abu-abu latar sebelum diolah
  assert.ok(sebelum < 215, 'latar semula tidak putih');
  const r = olahPiksel(d);
  assert.equal(r.kosong, false);
  let jumlah = 0; for (let y = 0; y < 20; y++) for (let xx = 0; xx < 400; xx++) jumlah += d[(y * 400 + xx) * 4]; // baris atas = latar murni
  const rata = jumlah / (20 * 400);
  assert.ok(rata >= 235, `latar harus nyaris putih, rata-rata ${rata.toFixed(1)}`);
  let gelapTerendah = 255; for (let y = 30; y < 42; y++) for (let xx = 41; xx < 360; xx++) gelapTerendah = Math.min(gelapTerendah, d[(y * 400 + xx) * 4]);
  assert.ok(gelapTerendah < 60, `tinta harus menjadi gelap, terendah ${gelapTerendah}`);
});

test('olahPiksel: halaman putih polos, putih berderau, dan abu polos dianggap kosong', () => {
  assert.equal(olahPiksel(halaman({})).kosong, true);
  assert.equal(olahPiksel(halaman({ derau: 8 })).kosong, true);
  assert.equal(olahPiksel(halaman({ kertas: [200, 200, 200], derau: 5 })).kosong, true);
});

test('olahPiksel: teks sangat pudar (kontras rendah) TIDAK dianggap kosong: salah-lewati lebih buruk daripada salah-panggil', () => {
  for (const [kertas, tinta] of [[[245, 245, 245], [205, 205, 205]], [[240, 240, 240], [215, 215, 215]], [[235, 225, 190], [190, 175, 140]]]) {
    const d = halaman({ kertas, tinta, baris: barisPenuh, derau: 3 });
    const r = olahPiksel(d);
    assert.equal(r.kosong, false, `kertas ${kertas} tinta ${tinta}: tinta ${r.tinta}`);
  }
});

test('olahPiksel: bintik debu jarang pada halaman putih tetap kosong, tetapi satu baris teks tidak', () => {
  assert.equal(olahPiksel(halaman({ derau: 4, bintik: 30 })).kosong, true);
  const satuBaris = olahPiksel(halaman({ baris: [200], derau: 4 }));
  assert.equal(satuBaris.kosong, false, `satu baris teks harus lolos (tinta ${satuBaris.tinta})`);
});

test('olahPiksel: masukan kosong aman; hasil selalu dibatasi 0..255', () => {
  assert.equal(olahPiksel(new Uint8ClampedArray(0)).kosong, true);
  const d = halaman({ kertas: [250, 250, 250], tinta: [0, 0, 0], baris: barisPenuh, derau: 30 });
  olahPiksel(d); for (let i = 0; i < d.length; i++) assert.ok(d[i] >= 0 && d[i] <= 255);
});

/* ---------- jalankanOcr: halaman kosong dan pengatur laju ---------- */
test('jalankanOcr: gambar bertanda kosong tidak memanggil AI, dihitung dilewati+kosong, dan TIDAK disimpan', async () => {
  const dipanggil = []; const disimpan = [];
  const r = await jalankanOcr({
    indeks: [0, 1, 2], konkuren: 1,
    ambilGambar: async (i) => (i === 1 ? { mime: 'image/jpeg', data: '', kosong: true } : { mime: 'image/jpeg', data: `g${i}` }),
    panggil: async ({ data }) => { dipanggil.push(data); return { teks: `T-${data}` }; },
    simpanan: { ambil: async () => undefined, simpan: async (i, v) => { disimpan.push(i); void v; } },
  });
  assert.deepEqual(dipanggil, ['g0', 'g2']); assert.equal(r.dilewati, 1); assert.deepEqual(r.kosong, [1]); assert.deepEqual(r.gagal, []);
  assert.deepEqual(disimpan.sort(), [0, 2], 'halaman yang dilewati tidak ikut disimpan (salah deteksi tidak boleh menempel)');
});

test('jalankanOcr: pengatur laju memesan slot berjarak sama untuk semua pekerja serentak', async () => {
  // Jam dibekukan di 0: setiap `tidur(ms)` berarti "menunggu sampai slot ke-n". Slot harus 5000, 10000, 15000, ... (12 panggilan/menit), tiap pekerja satu slot berbeda.
  const tunggu = []; let panggilan = 0;
  const r = await jalankanOcr({
    indeks: [0, 1, 2, 3, 4, 5], konkuren: 3, maksPerMenit: 12,
    sekarang: () => 0, tidur: async (ms) => { tunggu.push(ms); },
    ambilGambar: async (i) => ({ mime: 'image/jpeg', data: `g${i}` }),
    panggil: async () => { panggilan++; return { teks: 'ok' }; },
  });
  assert.equal(r.teks.size, 6); assert.equal(panggilan, 6);
  assert.deepEqual(tunggu.sort((a, b) => a - b), [5000, 10000, 15000, 20000, 25000], 'panggilan pertama langsung; lima berikutnya masing-masing 5000 ms lebih lambat');
});

test('jalankanOcr: tanpa maksPerMenit tidak ada tidur tambahan (perilaku lama terjaga)', async () => {
  let tidur = 0;
  await jalankanOcr({ indeks: [0, 1, 2], konkuren: 2, tidur: async () => { tidur++; }, ambilGambar: async (i) => ({ mime: 'image/jpeg', data: `g${i}` }), panggil: async () => ({ teks: 'ok' }) });
  assert.equal(tidur, 0);
});

test('jalankanOcr: pembatalan saat menunggu slot menghentikan tanpa memanggil AI', async () => {
  let t = 0; let dipanggil = 0; let batalSetelah = false;
  const r = await jalankanOcr({
    indeks: [0, 1], konkuren: 1, maksPerMenit: 6, sekarang: () => t,
    tidur: async (ms) => { t += ms; batalSetelah = true; }, batal: () => batalSetelah,
    ambilGambar: async (i) => ({ mime: 'image/jpeg', data: `g${i}` }),
    panggil: async () => { dipanggil++; return { teks: 'ok' }; },
  });
  assert.equal(r.dibatalkan, true); assert.equal(dipanggil, 1, 'hanya panggilan pertama (belum ada tidur) yang lolos');
});

/* ---------- alur lengkap: PDF pindai dengan halaman kosong ---------- */
import { bacaDokumenKitab } from '../web/lib/dokumenKitab.js';
import { peringatanPratinjau } from '../web/lib/imporKitab.js';
const ISI_ARAB = 'قال المصنف رحمه الله تعالى في بيان أحكام الطهارة والصلاة وما يتعلق بهما من الشروط والأركان';
test('bacaDokumenKitab: halaman kosong dilewati tanpa panggilan AI, tercatat di laporan, dan muncul sebagai peringatan', async () => {
  const buka = async () => ({
    jumlah: 5, teksSemua: async ({ onProgres = () => {} } = {}) => { onProgres(1, 1); return { teks: ['', '', '', '', ''], judulUkuran: [[], [], [], [], []] }; },
    outline: async () => [], meta: async () => ({ judul: '', pengarang: '' }), tutup() {},
    gambarHalaman: async (i) => (i === 1 || i === 4 ? { mime: 'image/jpeg', data: '', kosong: true } : { mime: 'image/jpeg', data: `p${i}` }),
  });
  const dipanggil = [];
  const h = await bacaDokumenKitab({ nama: 'k.pdf', buffer: new ArrayBuffer(8), bukaPdf: buka, ocr: { panggil: async ({ data }) => { dipanggil.push(data); return { teks: `${ISI_ARAB} ${data}`, kualitas: 'jelas' }; } } });
  assert.deepEqual(dipanggil.sort(), ['p0', 'p2', 'p3']);
  assert.equal(h.laporan.ocr.dicoba, 5); assert.equal(h.laporan.ocr.dilewati, 2); assert.equal(h.laporan.ocr.berhasil, 3); assert.equal(h.laporan.ocr.kosong, 2);
  const w = peringatanPratinjau(h, null).map((x) => x.teks);
  assert.ok(w.some((t) => /2 halaman PDF tampak kosong.*dilewati tanpa memanggil AI/.test(t)), 'peringatan pelewatan muncul');
});
