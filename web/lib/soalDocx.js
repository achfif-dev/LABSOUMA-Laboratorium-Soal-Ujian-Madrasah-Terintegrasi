// Pembaca naskah ujian format Dauri (IMDA) dari berkas Word (.docx) buatan di luar aplikasi. Fungsi murni, TANPA dependensi:
// pembuka ZIP memakai DecompressionStream bawaan browser dan Node 22, XML dibaca dengan pemindai sendiri (tanpa DOMParser),
// jadi modul yang sama jalan di browser dan di tes.
//
// Format yang dikenali (sama dengan keluaran Export "Naskah Ujian IMDA", web/lib/naskahDocx.js, dan berkas contoh FORMAT_SOAL_IMDA_I..IV):
//   judul     "الامتحان في الدور الأول"                                   -> nomor Dauri
//   bagian أ  "أ – إختر إحدى الأجوبة الصحيحة مما بين القوسين ( لكل رقم خمسة نتائج )"
//             butir: "1- (     ) kalimat soal (أ-xxx ب-yyy ج-zzz)"          -> pilgan / lanjutan; huruf opsi MERAH = kunci
//   bagian ب  "ب – إملاء الفراغ الآتية بأجوبة صحيحة ( ... )"
//             butir: "1- kalimat soal [jawaban merah] .......... ص 12"     -> isian
//   bagian ج  "ج - أجب أسئلة التالية إجابة صحيحة ( ... )"
//             butir: "1- kalimat soal ؟ [jawaban merah] .......... ص 12"   -> uraian (jawab singkat)
//   "ص <angka>" = halaman kitab; paragraf "نص الكتاب: ..." di bawah butir = kutipan kitab (naskah kunci).
// Teks soal boleh Pegon/Arab/Latin; isinya disalin apa adanya, tidak diterjemahkan.
//
// Keluaran selalu "terbaca apa adanya + peringatan": tidak ada yang dikarang. Yang tidak terbaca dibiarkan kosong dan dilaporkan.
import { PRESET_DAURI } from './naskah.js';

export const MAKS_BERKAS = 5 * 1024 * 1024;      // ukuran berkas .docx
export const MAKS_XML = 20 * 1024 * 1024;        // ukuran document.xml setelah dibuka (penangkal zip bomb)
export const MAKS_BUTIR = 100;

/* ------------------------------------------------------------------ ZIP */

const u16 = (b, o) => b[o] | (b[o + 1] << 8);
const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

async function inflasi(data, maks) {
  if (typeof DecompressionStream !== 'function') throw new Error('Browser ini belum bisa membuka berkas Word. Perbarui browser Anda (Chrome, Edge, Firefox, atau Safari versi terbaru).');
  const ds = new DecompressionStream('deflate-raw');
  const w = ds.writable.getWriter();
  w.write(data).catch(() => {}); w.close().catch(() => {});
  const r = ds.readable.getReader();
  const bagian = []; let total = 0;
  for (;;) {
    const { value, done } = await r.read();
    if (done) break;
    total += value.length;
    if (total > maks) { await r.cancel().catch(() => {}); throw new Error('Isi berkas Word terlalu besar setelah dibuka. Berkas ditolak.'); }
    bagian.push(value);
  }
  const out = new Uint8Array(total); let o = 0;
  for (const b of bagian) { out.set(b, o); o += b.length; }
  return out;
}

/** Baca satu entri ZIP menurut nama. @param {Uint8Array} b  @returns {Promise<Uint8Array|null>} null bila tidak ada */
export async function bacaEntriZip(b, nama, maks = MAKS_XML) {
  let e = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 65535); i--) if (u32(b, i) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('Berkas ini bukan dokumen Word (.docx) yang valid.');
  const jumlah = u16(b, e + 10); let p = u32(b, e + 16);
  for (let n = 0; n < jumlah; n++) {
    if (p + 46 > b.length || u32(b, p) !== 0x02014b50) throw new Error('Struktur berkas Word rusak.');
    const metode = u16(b, p + 10); const cs = u32(b, p + 20); const us = u32(b, p + 24);
    const pj = u16(b, p + 28); const ex = u16(b, p + 30); const kom = u16(b, p + 32); const lokal = u32(b, p + 42);
    const nm = new TextDecoder().decode(b.subarray(p + 46, p + 46 + pj));
    p += 46 + pj + ex + kom;
    if (nm !== nama) continue;
    if (us > maks) throw new Error('Isi berkas Word terlalu besar setelah dibuka. Berkas ditolak.');
    if (lokal + 30 > b.length || u32(b, lokal) !== 0x04034b50) throw new Error('Struktur berkas Word rusak.');
    const awal = lokal + 30 + u16(b, lokal + 26) + u16(b, lokal + 28);
    const data = b.subarray(awal, awal + cs);
    if (metode === 0) return data.slice();
    if (metode === 8) return inflasi(data, maks);
    throw new Error('Cara pemampatan berkas Word tidak didukung.');
  }
  return null;
}

/* ------------------------------------------------------------------ XML */

const ENTITAS = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const dekode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, k) => {
  if (k[0] === '#') { try { return String.fromCodePoint(k[1].toLowerCase() === 'x' ? parseInt(k.slice(2), 16) : Number(k.slice(1))); } catch { return ''; } }
  return ENTITAS[k.toLowerCase()];
});
const BIDI = /[​-‏‪-‮⁦-⁩﻿]/g;

/** Merah menurut kode warna Word: R tinggi, G dan B rendah (FF0000, C00000, E00000, ...). */
export function warnaMerah(hex) {
  const m = /^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || ''));
  if (!m) return false;
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x, 16));
  return r >= 0xb0 && g <= 0x70 && b <= 0x70 && r - Math.max(g, b) >= 0x60;
}

/**
 * Paragraf isi dokumen (word/document.xml) beserta tanda merah per karakter. Paragraf di dalam kotak teks (kop naskah) dipisahkan
 * ke `kotak` agar tidak tercampur dengan isi soal; versi cadangan `mc:Fallback` dilewati; teks yang dihapus (`w:delText`) tidak dibaca.
 * @returns {{paragraf: {teks:string, merah:Uint8Array, nomorOtomatis:boolean}[], kotak:string[]}}
 */
export function bacaParagraf(xml) {
  const paragraf = []; const kotak = [];
  const re = /<(\/?)([A-Za-z0-9_]+:[A-Za-z0-9_]+)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|([^<]+)/g;
  let m;
  let kotakDalam = 0; let fallback = 0;
  let p = null; let dalamPPr = false; let dalamRPr = false; let dalamT = false; let dalamRun = false;
  let merahRun = false; const tumpukanKotak = [];
  const mulaiP = () => ({ teks: '', merah: [], nomorOtomatis: false });
  const tutupP = () => {
    if (!p) return;
    const teks = p.teks;
    if (kotakDalam > 0) { if (teks.replace(BIDI, '').trim()) kotak.push(teks.replace(BIDI, '').replace(/\s+/g, ' ').trim()); }
    else paragraf.push({ teks, merah: Uint8Array.from(p.merah), nomorOtomatis: p.nomorOtomatis });
    p = null;
  };
  const tulis = (s, merah) => { if (!p) return; for (let i = 0; i < s.length; i++) p.merah.push(merah ? 1 : 0); p.teks += s; };
  const attr = (a, nama) => { const x = new RegExp(`\\b${nama}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(a); return x ? (x[1] ?? x[2]) : ''; };
  while ((m = re.exec(xml))) {
    if (m[5] !== undefined) { // teks di antara tag: hanya dibaca di dalam <w:t>
      if (dalamT && fallback === 0) tulis(dekode(m[5]).replace(BIDI, ''), merahRun);
      continue;
    }
    const tutup = m[1] === '/'; const nama = m[2]; const a = m[3]; const sendiri = m[4] === '/';
    switch (nama) {
      case 'mc:Fallback': fallback += tutup ? -1 : (sendiri ? 0 : 1); break;
      case 'w:txbxContent':
        if (fallback > 0 || sendiri) break;
        if (tutup) { tutupP(); kotakDalam = Math.max(0, kotakDalam - 1); p = tumpukanKotak.pop() || null; } else { tumpukanKotak.push(p); p = null; kotakDalam++; }
        break;
      case 'w:p': if (fallback > 0) break; if (tutup) tutupP(); else if (!sendiri) { tutupP(); p = mulaiP(); } break;
      case 'w:pPr': dalamPPr = !tutup && !sendiri; break;
      case 'w:numPr': if (!tutup && p && dalamPPr) p.nomorOtomatis = true; break;
      case 'w:numId': if (p && dalamPPr && attr(a, 'w:val') === '0') p.nomorOtomatis = false; break;
      case 'w:r': dalamRun = !tutup && !sendiri; if (!dalamRun) { merahRun = false; dalamRPr = false; } else merahRun = false; break;
      case 'w:rPr': dalamRPr = !tutup && !sendiri; break;
      case 'w:color': if (!tutup && dalamRPr && dalamRun && !dalamPPr) merahRun = merahRun || warnaMerah(attr(a, 'w:val')); break;
      case 'w:highlight': if (!tutup && dalamRPr && dalamRun && !dalamPPr && /^red$/i.test(attr(a, 'w:val'))) merahRun = true; break;
      case 'w:t': dalamT = !tutup && !sendiri; break;
      case 'w:tab': if (!tutup && dalamRun && fallback === 0) tulis('\t', false); break;
      case 'w:br': case 'w:cr': if (!tutup && dalamRun && fallback === 0) tulis(' ', false); break;
      case 'w:noBreakHyphen': if (!tutup && dalamRun && fallback === 0) tulis('-', merahRun); break;
      default: break;
    }
  }
  tutupP();
  return { paragraf, kotak };
}

/* --------------------------------------------------------- Penguraian Dauri */

const ANGKA_ARAB = /[٠-٩۰-۹]/g;
/** Angka Arab-Indic dan Persia diganti angka Latin; panjang teks tetap (indeks tidak bergeser). */
export const keAngkaLatin = (s) => String(s).replace(ANGKA_ARAB, (c) => String(c.charCodeAt(0) >= 0x06f0 ? c.charCodeAt(0) - 0x06f0 : c.charCodeAt(0) - 0x0660));
const rapikan = (s) => String(s).replace(/[\t ]+/g, ' ').replace(/\s+/g, ' ').trim();

const KATA_ANGKA = { واحد: 1, واحدة: 1, اثنان: 2, اثنين: 2, اثنتان: 2, ثلاثة: 3, ثلاث: 3, اربعة: 4, أربعة: 4, اربع: 4, أربع: 4, خمسة: 5, خمس: 5, ستة: 6, ست: 6, سبعة: 7, سبع: 7, ثمانية: 8, ثمان: 8, ثماني: 8, تسعة: 9, تسع: 9, عشرة: 10, عشر: 10 };
const NAMA_DAURI = { الأول: 1, الاول: 1, الثاني: 2, الثالث: 3, الرابع: 4 };
const harakat = (s) => String(s).replace(/[ً-ٰٟۖ-ۭـ]/g, '');

export const nilaiDariKata = (s) => {
  const t = keAngkaLatin(harakat(s)).trim();
  if (/^\d+$/.test(t)) return Number(t);
  return Object.hasOwn(KATA_ANGKA, t) ? KATA_ANGKA[t] : null;
};

/** Kode bagian dari baris judul ('a' | 'b' | 'c') atau null. Butir bernomor tidak pernah dianggap judul. */
export function bagianDariJudul(teks) {
  const t = harakat(keAngkaLatin(rapikan(teks)));
  if (!t || /^\d{1,3}\s*[-–.)]/.test(t)) return null;
  const nilai = /لكل\s+رقم\s+(\S+)/.exec(t);
  const kode = /[اإأ]خ?ت?ر[  ]/.test(t + ' ') && /الأجوبة|الاجوبة|القوسين|اجوبة/.test(t) ? 'a'
    : /[اإأ]ملاء|[اإأ]ملأ|الفراغ/.test(t) ? 'b'
      : /[اإأ]جب[  ]/.test(t + ' ') && /[اإأ]سئلة|اسئلة|السؤال|إجابة|اجابة/.test(t) ? 'c' : null;
  if (!kode) return null;
  return { kode, nilai: nilai ? nilaiDariKata(nilai[1]) : null };
}

const RE_NOMOR = /^\s*(\d{1,3})\s*[-–.)ـ]+\s*/;
const RE_HAL = /(?:^|\s)(?:ص|صفحة)\s*[:.]?\s*([0-9\u0660-\u0669\u06f0-\u06f9]{1,4}|[ivxlc]{1,6})?\s*$/i;
const RE_KUTIPAN = /^\s*نص\s+الكتاب\s*[:：]\s*/;
const HURUF = [['A', 'أ|ا|إ'], ['B', 'ب'], ['C', 'ج'], ['D', 'د'], ['E', 'هـ|ه|هــ']];

/** Pisahkan opsi "أ-xxx ب-yyy ج-zzz" menurut urutan huruf. Mengembalikan [{k, awal, mulaiTeks, akhir}] atau null bila أ tidak ditemukan. */
function potongOpsi(s) {
  const tanda = []; let dari = 0;
  for (const [k, pola] of HURUF) {
    const re = new RegExp(`(?:^|[\\s(])(${pola})\\s*[-–]\\s*`, 'g'); re.lastIndex = dari;
    const m = re.exec(s);
    if (!m) { if (k === 'A') return null; break; }
    tanda.push({ k, awal: m.index + m[0].indexOf(m[1]), mulaiTeks: re.lastIndex });
    dari = re.lastIndex;
  }
  tanda.forEach((t, i) => { t.akhir = i + 1 < tanda.length ? tanda[i + 1].awal : s.length; });
  return tanda;
}

/** Bagian merah dari rentang [dari, sampai) pada `merah` (Uint8Array), tanpa menghitung spasi. */
const pecahMerah = (teks, merah, dari, sampai) => {
  let n = 0; let m = 0;
  for (let i = dari; i < sampai; i++) { if (/\s/.test(teks[i])) continue; n++; if (merah[i]) m++; }
  return { n, m };
};

const potongRentang = (teks, merah, dari, sampai) => ({ teks: teks.slice(dari, sampai), merah: merah.slice(dari, sampai) });

/** Teks merah (digabung) dan sisanya dari satu rentang. */
function pisahMerah(teks, merah) {
  let ya = ''; let tidak = '';
  for (let i = 0; i < teks.length; i++) { if (merah[i]) ya += teks[i]; else tidak += teks[i]; }
  return { merah: rapikan(ya), hitam: rapikan(tidak) };
}

const tanpaBlank = (s) => s.replace(/^\s*[(\[]\s*[._…\s]*[)\]]\s*/, '');

/** Penanda "lanjutan": kalimat menggantung dengan titik-titik. */
const adaTitik = (s) => /(?:\.{3,}|…|_{3,}|…)/.test(s);

/**
 * Urai satu butir menurut bagiannya.
 * @param {'a'|'b'|'c'} kode  @param {{teks:string, merah:Uint8Array}} p  paragraf SETELAH nomor dibuang
 */
function uraiButir(kode, p) {
  const peringatan = [];
  let { teks, merah } = p;
  const buang = (n) => { teks = teks.slice(n); merah = merah.slice(n); };
  const potongAkhir = (n) => { teks = teks.slice(0, teks.length - n); merah = merah.slice(0, merah.length - n); };

  // Halaman kitab di ujung baris (setelah tab/pengisi).
  let hal = '';
  const mh = RE_HAL.exec(teks);
  if (mh) { hal = keAngkaLatin(mh[1] || ''); potongAkhir(mh[0].length); }
  // Pengisi di ujung baris (tab, garis bawah, atau titik-titik >= 4): bukan bagian kalimat soal. Isian/uraian saja; di pilgan titik-titik milik kalimat.
  if (kode !== 'a') {
    const sp = /[\t\s]+$/.exec(teks); if (sp) potongAkhir(sp[0].length);
    // Garis jawaban: garis bawah di semua bentuk, titik-titik hanya di uraian (di isian titik-titik adalah bagian kalimat: tempat kosong).
    const pg = (kode === 'c' ? /[_.…]{4,}$/ : /_{4,}$/).exec(teks); if (pg) potongAkhir(pg[0].length);
    const sp2 = /[\t\s]+$/.exec(teks); if (sp2) potongAkhir(sp2[0].length);
  }
  { const lead = /^\s*/.exec(teks)[0].length; if (lead) buang(lead); }

  if (kode === 'a') {
    const bl = /^\s*[(\[]\s*[._…\s]*[)\]]\s*/.exec(teks); if (bl) buang(bl[0].length);
    // Kelompok opsi: kurung terakhir yang diawali "أ-"; cadangan: penanda أ- pertama tanpa kurung.
    let kurung = -1;
    for (let i = teks.length - 1; i >= 0; i--) if (teks[i] === '(' && /^\(\s*[اأإ]\s*[-–]/.test(teks.slice(i))) { kurung = i; break; }
    let awalOpsi; let tutupKurung = false;
    if (kurung >= 0) { awalOpsi = kurung + 1; tutupKurung = true; } else { const x = /(?:^|\s)[اأإ]\s*[-–]/.exec(teks); awalOpsi = x ? x.index + (x[0].length - x[0].trimStart().length) : -1; }
    if (awalOpsi < 0) return { pertanyaan: rapikan(teks), opsi: {}, kunci: '', hal, peringatan: ['opsi (أ- ب- ج-) tidak ditemukan'], kunciDari: '' };
    let akhirOpsi = teks.length;
    if (tutupKurung) { const c = teks.lastIndexOf(')'); if (c > kurung) akhirOpsi = c; }
    const pertanyaanTeks = teks.slice(0, tutupKurung ? kurung : awalOpsi);
    const grup = teks.slice(awalOpsi, akhirOpsi);
    const grupMerah = merah.slice(awalOpsi, akhirOpsi);
    const tanda = potongOpsi(grup);
    const opsi = {}; const merahOpsi = {};
    if (!tanda || tanda.length < 2) peringatan.push('kurang dari dua opsi terbaca');
    for (const t of tanda || []) {
      const isi = potongRentang(grup, grupMerah, t.mulaiTeks, t.akhir);
      opsi[t.k] = rapikan(isi.teks);
      const huruf = pecahMerah(grup, grupMerah, t.awal, t.mulaiTeks); const badan = pecahMerah(grup, grupMerah, t.mulaiTeks, t.akhir);
      const markerMerah = huruf.n > 0 && huruf.m / huruf.n >= 0.5;
      const badanMerah = badan.n > 0 && badan.m / badan.n >= 0.5;
      merahOpsi[t.k] = markerMerah || badanMerah;
    }
    const calon = Object.keys(merahOpsi).filter((k) => merahOpsi[k]);
    let kunci = ''; let kunciDari = '';
    if (calon.length === 1) { kunci = calon[0]; kunciDari = 'merah'; }
    else if (calon.length > 1) peringatan.push(`lebih dari satu opsi bertanda merah (${calon.join(', ')}): kunci dikosongkan`);
    // Kalimat soal: hitam saja; bila seluruhnya merah (pewarnaan tidak lazim) dianggap bukan tanda kunci.
    const q = potongRentang(teks, merah, 0, pertanyaanTeks.length);
    return { pertanyaan: rapikan(q.teks), opsi, kunci, hal, peringatan, kunciDari };
  }

  // Isian dan uraian: teks merah = jawaban, sisanya kalimat soal.
  const { n, m } = pecahMerah(teks, merah, 0, teks.length);
  let soal = teks; let jawaban = '';
  if (m > 0 && m / Math.max(1, n) <= 0.8) { const x = pisahMerah(teks, merah); soal = x.hitam; jawaban = x.merah; }
  else if (m > 0) peringatan.push('seluruh kalimat berwarna merah: dianggap pewarnaan biasa, jawaban dikosongkan');
  return { pertanyaan: rapikan(soal), opsi: {}, kunci: '', jawaban, hal, peringatan, kunciDari: jawaban ? 'merah' : '' };
}

const bentukBagian = (kode, pertanyaan) => (kode === 'b' ? 'isian' : kode === 'c' ? 'uraian' : (adaTitik(pertanyaan) ? 'lanjutan' : 'pilgan'));

/** Aksara dominan teks soal: 'arab' (Arab/Pegon/Jawi), 'latin', atau 'campur'. */
export function aksaraDominan(daftar) {
  let ar = 0; let la = 0;
  for (const s of daftar) for (const ch of String(s)) { if (/[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(ch)) ar++; else if (/[A-Za-z]/.test(ch)) la++; }
  if (ar + la === 0) return 'latin';
  const r = ar / (ar + la);
  return r >= 0.8 ? 'arab' : r <= 0.2 ? 'latin' : 'campur';
}

/**
 * Urai paragraf menjadi butir Dauri. @returns {{meta:object, butir:object[], peringatan:string[], adaKunci:boolean, nilai:{a,b,c}}}
 * butir: {bagian, no, bentuk, pertanyaan, opsi, kunci, jawaban, hal, kutipan, kunciDari, catatan:string[]}
 */
export function uraiNaskah({ paragraf, kotak = [] }) {
  const peringatan = [];
  const butir = []; const nilai = { a: null, b: null, c: null };
  let dawr = null; let bagian = null; let terakhir = null; let mentahTerakhir = null; let tanpaDikenal = 0; let urutOtomatis = 0;
  let adaJudulBagian = false;

  for (const par of paragraf) {
    const t = rapikan(par.teks);
    if (!t) continue;
    const mentah = keAngkaLatin(par.teks);
    const nm = RE_NOMOR.exec(mentah);

    // Judul naskah ("الامتحان في الدور الأول"): hanya sebelum butir pertama.
    if (!butir.length && dawr === null && !nm) {
      const md = /الدور\s+(\S+)/.exec(harakat(keAngkaLatin(t)));
      if (md) { const k = md[1]; const d = Object.hasOwn(NAMA_DAURI, k) ? NAMA_DAURI[k] : (/^[1-4]$/.test(k) ? Number(k) : null); if (d !== null) { dawr = d; continue; } }
    }

    const j = bagianDariJudul(t);
    if (j) { bagian = j.kode; nilai[j.kode] = j.nilai; adaJudulBagian = true; terakhir = null; urutOtomatis = 0; continue; }

    const kt = RE_KUTIPAN.exec(t);
    if (kt) { if (terakhir) terakhir.kutipan = rapikan(t.slice(kt[0].length)); else tanpaDikenal++; continue; }

    // Butir: nomor diketik atau nomor otomatis Word.
    if (nm || par.nomorOtomatis) {
      const awal = nm ? nm[0].length : 0;
      const sisa = { teks: par.teks.slice(awal), merah: par.merah.slice(awal) };
      const no = nm ? Number(nm[1]) : ++urutOtomatis;
      let kode = bagian;
      if (!kode) kode = /(?:^|\s|\()[اأإ]\s*[-–]/.test(sisa.teks) ? 'a' : /؟|\?/.test(sisa.teks) ? 'c' : 'b';
      const r = uraiButir(kode, sisa);
      terakhir = { bagian: kode, no, bentuk: bentukBagian(kode, r.pertanyaan), pertanyaan: r.pertanyaan, opsi: r.opsi, kunci: r.kunci, jawaban: r.jawaban || '', hal: r.hal || '', kutipan: '', kunciDari: r.kunciDari, catatan: r.peringatan };
      mentahTerakhir = sisa;
      butir.push(terakhir);
      continue;
    }

    // Lanjutan baris untuk butir pilihan yang opsinya belum lengkap (Enter di tengah opsi): gabungkan dengan teks mentah butir itu.
    if (terakhir && terakhir.bagian === 'a' && mentahTerakhir && Object.keys(terakhir.opsi).length < 2) {
      const gab = { teks: `${mentahTerakhir.teks} ${par.teks}`, merah: Uint8Array.from([...mentahTerakhir.merah, 0, ...par.merah]) };
      const r = uraiButir('a', gab);
      if (Object.keys(r.opsi).length >= 2) {
        Object.assign(terakhir, { pertanyaan: r.pertanyaan, opsi: r.opsi, kunci: r.kunci, kunciDari: r.kunciDari, hal: r.hal || terakhir.hal, catatan: r.peringatan, bentuk: bentukBagian('a', r.pertanyaan) });
        mentahTerakhir = gab; continue;
      }
    }
    if (butir.length || adaJudulBagian) tanpaDikenal++;
  }

  if (!butir.length) peringatan.push('Tidak ada butir soal bernomor yang terbaca. Pastikan berkas memakai format naskah Dauri (nomor "1- ", bagian أ ب ج).');
  if (butir.length > MAKS_BUTIR) peringatan.push(`Terbaca ${butir.length} butir; maksimal ${MAKS_BUTIR} per berkas. Pecah berkasnya.`);
  if (tanpaDikenal) peringatan.push(`${tanpaDikenal} baris di luar format butir diabaikan (judul tambahan, catatan, atau baris yang tidak bernomor). Periksa pratinjau bila ada soal yang hilang.`);
  if (!adaJudulBagian && butir.length) peringatan.push('Judul bagian (أ ب ج) tidak ditemukan; bagian ditebak dari bentuk butir.');

  // Cocokkan dengan template Dauri.
  const dauri = dawr !== null ? dawr : null;
  if (dauri === null && butir.length) peringatan.push('Nomor Dauri tidak terbaca dari judul. Pilih Dauri di bawah.');
  const preset = PRESET_DAURI[dauri || 1];
  for (const p of preset.bagian) {
    const n = butir.filter((x) => x.bagian === p.kode).length;
    if (dauri !== null && n !== p.n) peringatan.push(`Bagian ${p.kode === 'a' ? 'أ' : p.kode === 'b' ? 'ب' : 'ج'}: ${n} butir terbaca, template ${preset.label} memuat ${p.n}.`);
    if (dauri !== null && nilai[p.kode] !== null && nilai[p.kode] !== p.nilai) peringatan.push(`Bagian ${p.kode === 'a' ? 'أ' : p.kode === 'b' ? 'ب' : 'ج'}: nilai per nomor di berkas ${nilai[p.kode]}, template ${preset.label} ${p.nilai}.`);
  }
  // Nomor ganda atau melompat dalam satu bagian.
  for (const kode of ['a', 'b', 'c']) {
    const no = butir.filter((x) => x.bagian === kode).map((x) => x.no);
    if (no.some((x, i) => x !== i + 1)) peringatan.push(`Bagian ${kode === 'a' ? 'أ' : kode === 'b' ? 'ب' : 'ج'}: nomor tidak berurutan (${no.join(', ')}). Periksa pratinjau.`);
  }
  for (const b of butir) {
    const huruf = { a: 'أ', b: 'ب', c: 'ج' }[b.bagian];
    for (const c of b.catatan) peringatan.push(`Bagian ${huruf} no. ${b.no}: ${c}.`);
    if (!b.pertanyaan) peringatan.push(`Bagian ${huruf} no. ${b.no}: kalimat soal kosong.`);
  }
  const adaKunci = butir.some((b) => b.kunci || b.jawaban);
  const tanpaKunci = butir.filter((b) => (b.bagian === 'a' ? !b.kunci : !b.jawaban)).length;
  if (butir.length && !adaKunci) peringatan.push('Tidak ada tanda kunci (warna merah) di berkas. Unggah juga naskah kuncinya, atau isi kunci di pratinjau.');
  else if (tanpaKunci) peringatan.push(`${tanpaKunci} butir belum punya kunci/jawaban. Lengkapi di pratinjau.`);

  // Kop (kotak teks): mapel dan kelas, bila ada.
  const meta = { dawr: dauri, mapel: '', kelas: '', nilai };
  for (const x of kotak) {
    const a = /المادة\s*[:：]?\s*(.+)$/.exec(x); if (a && !meta.mapel) meta.mapel = rapikan(a[1]).slice(0, 60);
    const b = /الفص[ـ]?ل\s*[:：]?\s*([^\[\]]+?)(?:\s*[\[\]]|$)/.exec(harakat(x)); if (b && !meta.kelas) meta.kelas = rapikan(b[1]).slice(0, 20);
  }
  meta.aksara = aksaraDominan(butir.map((b) => `${b.pertanyaan} ${Object.values(b.opsi).join(' ')}`));
  return { meta, butir: butir.slice(0, MAKS_BUTIR), peringatan, adaKunci, nilai };
}

/** Baca berkas .docx (ArrayBuffer atau Uint8Array) menjadi hasil uraian. Melempar Error berpesan Indonesia bila berkas tidak sah. */
export async function bacaDocxSoal(buf) {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  if (b.length > MAKS_BERKAS) throw new Error(`Berkas terlalu besar (maksimal ${Math.round(MAKS_BERKAS / 1048576)} MB).`);
  if (b.length < 22 || b[0] !== 0x50 || b[1] !== 0x4b) throw new Error('Berkas ini bukan dokumen Word (.docx). Simpan dulu sebagai .docx (bukan .doc atau PDF).');
  const doc = await bacaEntriZip(b, 'word/document.xml');
  if (!doc) throw new Error('Berkas ini tidak berisi dokumen Word (word/document.xml tidak ada).');
  return uraiNaskah(bacaParagraf(new TextDecoder('utf-8').decode(doc)));
}

/**
 * Gabungkan kunci dari naskah kunci (berkas kedua) ke naskah peserta. Butir dicocokkan menurut (bagian, nomor), dan hanya bila
 * kalimat soalnya sama (setelah dirapikan) agar kunci dari naskah lain tidak tertukar. Yang sudah terisi di naskah pertama tidak ditimpa.
 * @returns {{butir:object[], terpakai:number, tidakCocok:string[]}}
 */
export function gabungKunci(utama, kunci) {
  const norm = (s) => harakat(String(s || '')).replace(/[\s ]+/g, ' ').replace(/[؟?.:،,!]+/g, '').trim();
  const peta = new Map((kunci || []).map((b) => [`${b.bagian}${b.no}`, b]));
  let terpakai = 0; const tidakCocok = [];
  const butir = utama.map((b) => {
    const k = peta.get(`${b.bagian}${b.no}`);
    if (!k) return b;
    if (norm(k.pertanyaan) !== norm(b.pertanyaan)) { tidakCocok.push(`${{ a: 'أ', b: 'ب', c: 'ج' }[b.bagian]} no. ${b.no}`); return b; }
    const baru = { ...b };
    let pakai = false;
    if (!baru.kunci && k.kunci) { baru.kunci = k.kunci; baru.kunciDari = 'naskah-kunci'; pakai = true; }
    if (!baru.jawaban && k.jawaban) { baru.jawaban = k.jawaban; baru.kunciDari = 'naskah-kunci'; pakai = true; }
    if (!baru.hal && k.hal) { baru.hal = k.hal; pakai = true; }
    if (!baru.kutipan && k.kutipan) { baru.kutipan = k.kutipan; pakai = true; }
    if (pakai) terpakai++;
    return baru;
  });
  return { butir, terpakai, tidakCocok };
}
