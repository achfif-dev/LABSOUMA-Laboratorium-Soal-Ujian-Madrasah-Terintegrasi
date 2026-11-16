// Bank Soal Manual: naskah yang disusun di luar aplikasi dan SUDAH diverifikasi editor di luar aplikasi. Fungsi murni, dipakai browser,
// server (src/soalLuarService.js), dan tes.
//
// Mengapa koleksi tersendiri (`soalLuar`), bukan `soal`: soal di bank utama baru bisa Approved lewat gerbang server (periksa kutipan, uji buta,
// tahap editor). Naskah manual tidak lewat gerbang itu karena verifikasinya dilakukan di luar aplikasi; memaksanya masuk `soal` berarti
// memalsukan jejak audit (ai.verifikasi, tinjauan) atau menambah celah di aturan Firestore. Di sini yang dicatat adalah pernyataan verifikasi
// luar beserta siapa yang mencatatnya, dan koleksinya hanya bisa ditulis server.
import { BENTUK } from './bentuk.js';
import { PRESET_DAURI, dauriSah, BAGIAN } from './naskah.js';
import { BELUM } from './kisi.js';

export const KOLEKSI = 'soalLuar';
export const STATUS_VERIFIKASI = 'terverifikasi_luar';
export const LEVEL = ['L1', 'L2', 'L3'];
export const BAGIAN_KODE = ['a', 'b', 'c'];
export const BENTUK_BAGIAN = { a: ['pilgan', 'lanjutan'], b: ['isian'], c: ['uraian'] };
export const BATAS = Object.freeze({ butir: 100, pertanyaan: 2000, opsi: 1000, jawaban: 2000, kutipan: 700, bab: 120, indikator: 300, judul: 120, mapel: 60, tingkat: 40, kelas: 20, periode: 20, tahun: 20, kitab: 120, oleh: 120, catatan: 500, hal: 20 });
export const KUNCI_OPSI = ['A', 'B', 'C', 'D', 'E'];

const s = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
// Tanda < dan > sengaja dipertahankan (isi soal boleh memuatnya); aplikasi tidak pernah menyisipkan teks soal sebagai HTML mentah (React meloloskannya).
const t = s;

/**
 * Bersihkan dan periksa satu butir. @returns {{butir: object|null, galat: string[]}} `butir` null bila ada galat.
 * Galat berarti butir TIDAK boleh disimpan (mis. soal pilihan tanpa kunci); yang hanya kurang lengkap menjadi catatan di pratinjau, bukan di sini.
 */
export function bersihkanButir(x, idx = 0) {
  const galat = [];
  const lbl = `Butir ${idx + 1}`;
  const b = x && typeof x === 'object' ? x : {};
  const bagian = String(b.bagian || '');
  if (!BAGIAN_KODE.includes(bagian)) { return { butir: null, galat: [`${lbl}: bagian harus أ, ب, atau ج.`] }; }
  const no = Number(b.no);
  if (!Number.isInteger(no) || no < 1 || no > BATAS.butir) galat.push(`${lbl}: nomor tidak valid.`);
  const bentukOk = BENTUK_BAGIAN[bagian].includes(String(b.bentuk || '').toLowerCase()) ? String(b.bentuk).toLowerCase() : BENTUK_BAGIAN[bagian][0];
  const pertanyaan = t(b.pertanyaan, BATAS.pertanyaan);
  if (!pertanyaan) galat.push(`${lbl} (${BAGIAN[bagian].huruf} no. ${no}): kalimat soal kosong.`);
  const out = { bagian, no, bentuk: bentukOk, pertanyaan, opsi: {}, kunci: '', jawaban: '', rubrik: '', hal: s(b.hal, BATAS.hal), kutipan: t(b.kutipan, BATAS.kutipan),
    level: LEVEL.includes(b.level) ? b.level : '', bab: s(b.bab, BATAS.bab), indikator: s(b.indikator, BATAS.indikator), kisiSumber: ['ai', 'draf', 'manual'].includes(b.kisiSumber) ? b.kisiSumber : '' };
  if (bagian === 'a') {
    const o = b.opsi && typeof b.opsi === 'object' ? b.opsi : {};
    for (const k of KUNCI_OPSI) { const v = s(o[k], BATAS.opsi); if (v) out.opsi[k] = v; }
    const n = Object.keys(out.opsi).length;
    if (n < 2) galat.push(`${lbl} (${BAGIAN[bagian].huruf} no. ${no}): minimal dua opsi.`);
    const k = String(b.kunci || '').toUpperCase();
    if (!k) galat.push(`${lbl} (${BAGIAN[bagian].huruf} no. ${no}): kunci jawaban belum dipilih.`);
    else if (!Object.hasOwn(out.opsi, k)) galat.push(`${lbl} (${BAGIAN[bagian].huruf} no. ${no}): kunci ${k} tidak ada di opsi.`);
    else out.kunci = k;
  } else {
    out.jawaban = t(b.jawaban, BATAS.jawaban);
    out.rubrik = t(b.rubrik, BATAS.jawaban);
  }
  return { butir: galat.length ? null : out, galat };
}

/** Periksa seluruh paket. @returns {{butir: object[], galat: string[]}} */
export function bersihkanPaket(daftar) {
  const galat = []; const butir = [];
  if (!Array.isArray(daftar) || !daftar.length) return { butir: [], galat: ['Belum ada butir soal.'] };
  if (daftar.length > BATAS.butir) return { butir: [], galat: [`Maksimal ${BATAS.butir} butir per naskah.`] };
  daftar.forEach((x, i) => { const r = bersihkanButir(x, i); if (r.butir) butir.push(r.butir); galat.push(...r.galat); });
  const kunciNo = new Set();
  for (const b of butir) { const k = `${b.bagian}${b.no}`; if (kunciNo.has(k)) galat.push(`Nomor ${BAGIAN[b.bagian].huruf} no. ${b.no} muncul dua kali.`); kunciNo.add(k); }
  return { butir, galat };
}

const tanggalOk = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

/**
 * Metadata + pernyataan verifikasi luar. @param {object} m  @param {number} [sekarang]
 * @returns {{meta: object, verifikasi: object, galat: string[]}}
 */
export function bersihkanMeta(m, sekarang = Date.now()) {
  const x = m && typeof m === 'object' ? m : {};
  const galat = [];
  const dawr = Object.hasOwn(PRESET_DAURI, String(x.dawr)) ? Number(x.dawr) : null;
  if (dawr === null) galat.push('Nomor Dauri belum dipilih (1 sampai 4).');
  const meta = { dawr: dawr === null ? 1 : dauriSah(dawr), mapel: s(x.mapel, BATAS.mapel), tingkat: s(x.tingkat, BATAS.tingkat), kelas: s(x.kelas, BATAS.kelas), periode: s(x.periode, BATAS.periode), tahun: s(x.tahun, BATAS.tahun), kitab: s(x.kitab, BATAS.kitab), judul: s(x.judul, BATAS.judul), aksara: ['arab', 'latin', 'campur'].includes(x.aksara) ? x.aksara : 'campur' };
  if (!meta.mapel) galat.push('Mata pelajaran belum diisi.');
  if (!meta.tingkat) galat.push('Tingkat belum dipilih.');
  if (!meta.judul) meta.judul = `${PRESET_DAURI[meta.dawr].label} ${meta.mapel}${meta.kelas ? ` kelas ${meta.kelas}` : ''}`.trim().slice(0, BATAS.judul);
  const v = x.verifikasi && typeof x.verifikasi === 'object' ? x.verifikasi : {};
  const verifikasi = { oleh: s(v.oleh, BATAS.oleh), tanggal: String(v.tanggal || ''), catatan: s(v.catatan, BATAS.catatan), pernyataan: v.pernyataan === true };
  if (verifikasi.oleh.length < 2) galat.push('Nama editor yang memverifikasi di luar aplikasi belum diisi.');
  if (!tanggalOk(verifikasi.tanggal)) galat.push('Tanggal verifikasi belum diisi (format tahun-bulan-tanggal).');
  else if (Date.parse(`${verifikasi.tanggal}T00:00:00Z`) > sekarang + 2 * 86_400_000) galat.push('Tanggal verifikasi tidak boleh di masa depan.');
  if (!verifikasi.pernyataan) galat.push('Centang pernyataan bahwa naskah ini sudah diverifikasi editor di luar aplikasi.');
  return { meta, verifikasi, galat };
}

/* ------------------------------------------------------------- Kisi-kisi draf */

// Kata petunjuk level kognitif. Hanya menebak dari kata tanya/perintah; bukan pengganti penilaian guru, jadi hasilnya selalu berstatus "draf".
const RE_L3 = /(?:bandingkan|bedakan|analisis|simpulkan|evaluasi|nilai(?:lah)?\s+(?:apakah|benar)|mengapa\s+.*\s+berbeda|kasus|jika\s+.+\s+maka|qiyaskan)|(?:قارن|حلل|استنتج|ما الفرق|ما وجه)/i;
const RE_L2 = /(?:jelaskan|uraikan|mengapa|kenapa|bagaimana|terapkan|tentukan|hukum(?:nya)?|apa\s+sebab|sebutkan\s+alasan|berikan\s+contoh)|(?:اشرح|بين|علل|لماذا|كيف|ما\s+حكم|ما\s+سبب|مثل)/i;

/** Tebakan level dari kalimat soal dan bagiannya. Isian dan pilihan bawaan L1, uraian bawaan L2. */
export function levelDraf(b) {
  const q = String((b && b.pertanyaan) || '');
  if (RE_L3.test(q)) return 'L3';
  if (RE_L2.test(q)) return 'L2';
  return b && b.bagian === 'c' ? 'L2' : 'L1';
}

const KATA_KERJA = { pilgan: 'memilih jawaban yang tepat mengenai', lanjutan: 'melengkapi pernyataan mengenai', isian: 'mengisi bagian yang kosong mengenai', uraian: 'menjelaskan' };
const pokok = (q, n = 70) => {
  const x = String(q || '').replace(/[.…_]{2,}/g, ' ').replace(/[؟?!:،,]+/g, ' ').replace(/\s+/g, ' ').trim();
  return x.length > n ? `${x.slice(0, n - 1).trim()}…` : x;
};

/** Indikator draf tanpa AI: kata kerja menurut bentuk + pokok kalimat soal. Wajib ditinjau guru. */
export function indikatorDraf(b) {
  const bentuk = (b && BENTUK[b.bentuk]) ? b.bentuk : 'pilgan';
  const p = pokok(b && b.pertanyaan);
  return `Peserta didik dapat ${KATA_KERJA[bentuk]} ${p || 'materi pada soal ini'}.`.slice(0, BATAS.indikator);
}

/** Kisi-kisi draf untuk butir yang belum punya (level, bab, indikator). Tidak menimpa isian yang sudah ada. */
export function lengkapiKisiDraf(butir, { bab = '' } = {}) {
  return butir.map((b) => ({
    ...b,
    level: b.level || levelDraf(b),
    bab: b.bab || s(bab, BATAS.bab),
    indikator: b.indikator || indikatorDraf(b),
    kisiSumber: b.level && b.indikator ? (b.kisiSumber || 'manual') : 'draf',
  }));
}

/* ------------------------------------------------------------ Ke kisi-kisi umum */

/**
 * Butir bank manual -> bentuk "soal" yang dibaca web/lib/kisi.js (buatKisi). Nomor soal mengikuti urutan naskah (أ lalu ب lalu ج).
 * Kunci, opsi, dan jawaban tidak ikut: kisi-kisi aman dibagikan ke murid.
 */
export function butirUntukKisi(paket) {
  const urut = [...(paket.butir || [])].sort((a, b) => BAGIAN_KODE.indexOf(a.bagian) - BAGIAN_KODE.indexOf(b.bagian) || a.no - b.no);
  return urut.map((b) => ({
    nama: paket.kitab || '', juz: '', hal: b.hal || '', bab: b.bab || '', level: LEVEL.includes(b.level) ? b.level : 'L1', indikator: b.indikator || '',
    mapel: paket.mapel || '', tingkat: paket.tingkat || '', kelas: paket.kelas || '', ujian: PRESET_DAURI[dauriSah(paket.dawr)].label, bentuk: b.bentuk,
  }));
}

/** Ringkasan satu baris untuk daftar: "Dauri I · الفقه · 15 butir · أ 5 · ب 5 · ج 5". */
export function ringkasPaket(paket) {
  const n = (k) => (paket.butir || []).filter((b) => b.bagian === k).length;
  return `${PRESET_DAURI[dauriSah(paket.dawr)].label} · ${paket.mapel || '-'} · ${(paket.butir || []).length} butir · ${BAGIAN_KODE.map((k) => `${BAGIAN[k].huruf} ${n(k)}`).join(' · ')}`;
}

/** Butir yang kisi-kisinya masih draf otomatis atau kosong (perlu ditinjau guru sebelum kisi-kisi dibagikan). */
export const perluTinjauKisi = (butir) => (butir || []).filter((b) => !b.level || !b.indikator || b.kisiSumber === 'draf').length;

export { BELUM };
