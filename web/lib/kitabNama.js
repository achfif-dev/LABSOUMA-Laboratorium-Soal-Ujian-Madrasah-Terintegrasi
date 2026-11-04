// Satu sumber kebenaran untuk "apakah dua nama menunjuk kitab/bab yang sama". Fungsi murni, tanpa dependensi.
// Dipakai: Susun Soal, Paket Dauri, Fokus & Kisi-kisi (web/App.jsx), pemilih perpustakaan (web/lib/perpus.js), dan kisi-kisi (web/lib/kisi.js).
// Sebelumnya tiga tab memakai tiga definisi berbeda (huruf kecil persis, a-z0-9 tanpa spasi, dan normBab), sehingga kitab/bab yang sama
// bisa dianggap berbeda dan batas materi (cakupan) diam-diam tidak berlaku.

const HARAKAT = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
const KURUNG = /[(（\[][^)）\]]*[)）\]]/g;
const KURUNG_ISI = /[(（\[]([^)）\]]*)[)）\]]/g;
const LABEL_BAB = new Set(['bab', 'kitab', 'fasal', 'fashl', 'fasl', 'pasal', 'باب', 'كتاب', 'فصل']);

/** Samakan penulisan: buang harakat/tatwil, satukan bentuk huruf Arab, huruf kecil, buang apostrof dan tanda baca. */
export function lipat(s) {
  return String(s || '').normalize('NFKC').replace(HARAKAT, '')
    .replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .toLowerCase().replace(/[’ʼ'`‘]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

const rapat = (s) => lipat(s).replace(/ /g, '');

/**
 * Kunci-kunci (alias) sebuah nama kitab: nama utuh, nama tanpa keterangan dalam kurung, isi kurung, dan nama tanpa awalan "al-"
 * (hanya bila awalan itu terpisah, supaya "Alfiyyah" tidak terpotong). Spasi dan tanda baca tidak berpengaruh.
 */
export function aliasKitab(nama) {
  const mentah = String(nama || '').trim();
  const hasil = new Set();
  const tambah = (v) => { const k = rapat(v); if (k) hasil.add(k); };
  tambah(mentah);
  const luar = mentah.replace(KURUNG, ' ').trim();
  tambah(luar);
  for (const m of mentah.matchAll(KURUNG_ISI)) tambah(m[1]);
  for (const v of [mentah, luar]) {
    const t = v.replace(/^(al|ال)[\s\-‐‑–]+/i, '');
    if (t !== v) { const k = rapat(t); if (k.length >= 4) hasil.add(k); }
  }
  return hasil;
}

/** Apakah dua nama menunjuk kitab yang sama? */
export function samaKitab(a, b) {
  const x = aliasKitab(a); if (!x.size) return false;
  for (const k of aliasKitab(b)) if (x.has(k)) return true;
  return false;
}

/** Cari kitab di katalog Konfigurasi: ejaan persis (abaikan huruf besar dan spasi tepi) didahulukan, baru kecocokan longgar. */
export function cariKitabDi(katalog, nama) {
  const daftar = Array.isArray(katalog) ? katalog : [];
  const t = String(nama || '').trim().toLowerCase();
  if (!t) return undefined;
  return daftar.find((k) => String(k.nama || '').trim().toLowerCase() === t) || daftar.find((k) => samaKitab(k.nama, nama));
}

/**
 * Kunci nama bab: awalan "Bab/Kitab/Fasal/باب/كتاب/فصل" dan keterangan dalam kurung dibuang, "dl" disamakan dengan "dh" (wudlu = wudhu).
 * Bila setelah dibuang tidak ada yang tersisa, dipakai kunci tanpa pembuangan.
 */
export function kunciBab(s) {
  const penuh = lipat(s);
  if (!penuh) return '';
  const kata = lipat(String(s).replace(KURUNG, ' ')).split(' ').filter(Boolean);
  while (kata.length > 1 && LABEL_BAB.has(kata[0])) kata.shift();
  const sisa = kata.length === 1 && LABEL_BAB.has(kata[0]) ? '' : kata.join(' ').replace(/dl/g, 'dh');
  return sisa || penuh;
}

export const samaBabKunci = (a, b) => { const x = kunciBab(a); return !!x && x === kunciBab(b); };
