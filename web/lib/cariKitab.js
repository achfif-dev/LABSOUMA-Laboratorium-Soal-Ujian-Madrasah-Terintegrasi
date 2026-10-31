// Pencarian teks di dalam satu kitab (tab Baca Kitab). Murni (tanpa DOM, tanpa Node API): dipakai klien (menyorot kata) dan server (src/kitabCari.js).
//
// Prinsip: teks Arab dicari dalam bentuk NORMAL (tanpa harakat dan tatwil, alif/ya/ta marbutah disatukan, tanda baca jadi spasi), sehingga
// "الصلاة" cocok dengan "الصَّلَاةُ" dan "الصلاه". Kecocokan memakai substring, jadi "كتاب" ikut menemukan "الكتاب" dan "بالكتاب" (awalan Arab menempel).
//
// Indeks: Firestore tidak punya pencarian teks penuh dan membaca 5.000 halaman per pencarian menghabiskan kuota. Maka teks normal tiap kitab disimpan
// sebagai dokumen potongan (<= MAKS_KARAKTER_POTONGAN karakter) di kitab/{id}/cari/*: satu pencarian = sekitar 20-40 pembacaan, bukan ribuan.
export const VERSI_INDEKS = 1;
export const GRUP_HALAMAN = 100;                 // halaman per grup indeks (sama dengan MAKS_HALAMAN_PER_PANGGILAN impor, agar potongan sejajar dengan batch impor)
export const MAKS_KARAKTER_POTONGAN = 250000;    // 250 ribu karakter Arab = sekitar 500 KB, aman di bawah batas 1 MiB per dokumen Firestore
export const MAKS_PANJANG_KUERI = 100;
export const MAKS_KATA_KUERI = 8;
export const HASIL_PER_HALAMAN = 50;
export const MODE_CARI = ['frasa', 'kata'];      // frasa = urutan kata persis; kata = semua kata ada di halaman yang sama (urutan bebas)

const NOL_LEBAR = /[​-‏‪-‮⁦-⁩﻿]/g;
const PENANDA_BACA = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭـ]/g; // harakat, tanda Quran, tatwil
const INDIA = '٠١٢٣٤٥٦٧٨٩';
const FARSI = '۰۱۲۳۴۵۶۷۸۹';

/** Bentuk normal untuk mencari. Total (tidak melempar); hasil hanya huruf/angka dipisah satu spasi. */
export function normalCari(s) {
  return String(s ?? '').normalize('NFKC').replace(NOL_LEBAR, '').replace(PENANDA_BACA, '')
    .replace(/[آأإٱ]/g, 'ا')   // آ أ إ ٱ -> ا
    .replace(/ى/g, 'ي')                        // ى -> ي
    .replace(/ئ/g, 'ي')                        // ئ -> ي
    .replace(/ؤ/g, 'و')                        // ؤ -> و
    .replace(/ة/g, 'ه')                        // ة -> ه
    .replace(/ک/g, 'ك').replace(/ی/g, 'ي') // ک ی (Persia/Urdu) -> ك ي
    .replace(/[٠-٩]/g, (d) => String(INDIA.indexOf(d))).replace(/[۰-۹]/g, (d) => String(FARSI.indexOf(d)))
    .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/** Kueri mentah -> { q, kata } normal; `q` kosong bila tidak ada huruf/angka. Kata di atas MAKS_KATA_KUERI dibuang. */
export function siapkanKueri(mentah) {
  const q = normalCari(String(mentah ?? '').slice(0, MAKS_PANJANG_KUERI * 2));
  const kata = q ? q.split(' ').slice(0, MAKS_KATA_KUERI) : [];
  return { q: kata.join(' '), kata };
}

const hitungKemunculan = (t, k) => { let n = 0; for (let i = t.indexOf(k); i >= 0; i = t.indexOf(k, i + k.length)) n++; return n; };

/**
 * Cocokkan satu halaman (teks SUDAH normal). mode 'frasa': seluruh kueri berurutan; 'kata': setiap kata ada. Tidak cocok = null.
 * @returns {{jumlah:number, posisi:number, panjang:number}|null}  posisi/panjang = kemunculan pertama (untuk cuplikan)
 */
export function cocokkanHalaman(teksNormal, { q, kata }, mode = 'frasa') {
  if (!q || !teksNormal) return null;
  if (mode === 'kata' && kata.length > 1) {
    let jumlah = 0; let posisi = -1; let panjang = 0;
    for (const k of kata) {
      const i = teksNormal.indexOf(k); if (i < 0) return null;
      jumlah += hitungKemunculan(teksNormal, k);
      if (posisi < 0 || i < posisi) { posisi = i; panjang = k.length; }
    }
    return { jumlah, posisi, panjang };
  }
  const i = teksNormal.indexOf(q); if (i < 0) return null;
  return { jumlah: hitungKemunculan(teksNormal, q), posisi: i, panjang: q.length };
}

/** Cuplikan di sekitar kecocokan, dipotong di batas kata. Mengembalikan teks dan posisi kecocokan di dalamnya. */
export function cuplikan(teksNormal, posisi, panjang, sekeliling = 60) {
  let a = Math.max(0, posisi - sekeliling); let b = Math.min(teksNormal.length, posisi + panjang + sekeliling);
  if (a > 0) { const s = teksNormal.indexOf(' ', a); if (s >= 0 && s < posisi) a = s + 1; }
  if (b < teksNormal.length) { const s = teksNormal.lastIndexOf(' ', b); if (s > posisi + panjang) b = s; }
  return { teks: teksNormal.slice(a, b), mulai: posisi - a, panjang, awalTerpotong: a > 0, akhirTerpotong: b < teksNormal.length };
}

/**
 * Cari di kumpulan halaman terindeks. `halaman` = [{ s: seq, h: hal, j: juz, t: teks normal }] (urutan bebas; seq kembar dibuang).
 * @returns {{total:number, hasil:object[], adaLagi:boolean}}  hasil urut menurut seq, dipotong HASIL_PER_HALAMAN mulai dari `lewati`
 */
export function cariDiHalaman(halaman, kueri, { mode = 'frasa', lewati = 0, batas = HASIL_PER_HALAMAN } = {}) {
  const lihat = new Set(); const cocok = [];
  for (const p of halaman) {
    if (lihat.has(p.s)) continue; lihat.add(p.s);
    const c = cocokkanHalaman(p.t, kueri, mode); if (c) cocok.push({ p, c });
  }
  cocok.sort((x, y) => x.p.s - y.p.s);
  const hasil = cocok.slice(lewati, lewati + batas).map(({ p, c }) => ({ seq: p.s, hal: p.h, juz: p.j, jumlah: c.jumlah, ...cuplikan(p.t, c.posisi, c.panjang) }));
  return { total: cocok.length, hasil, adaLagi: lewati + batas < cocok.length };
}

/* ------------------------------------------------------------------ indeks */

/**
 * Halaman -> dokumen potongan indeks. Pengelompokan menurut GRUP_HALAMAN (seq), lalu dipecah bila melebihi MAKS_KARAKTER_POTONGAN.
 * Penentu (deterministik): masukan yang sama selalu menghasilkan id yang sama, jadi menulis ulang batch yang sama menimpa dokumen yang sama.
 * @param {{seq:number, hal:number, juz:number, teks:string}[]} halaman  teks asli (dinormalkan di sini)
 * @returns {{id:string, data:{dari:number, sampai:number, s:number[], h:number[], j:number[], t:string[]}}[]}
 */
export function bangunPotongan(halaman, maks = MAKS_KARAKTER_POTONGAN) {
  const grup = new Map();
  for (const p of halaman) { const g = Math.floor((p.seq - 1) / GRUP_HALAMAN); if (!grup.has(g)) grup.set(g, []); grup.get(g).push(p); }
  const hasil = [];
  for (const g of [...grup.keys()].sort((a, b) => a - b)) {
    const isi = grup.get(g).sort((a, b) => a.seq - b.seq);
    let cur = null; let n = 0;
    const tutup = () => { if (cur) { cur.data.dari = cur.data.s[0]; cur.data.sampai = cur.data.s[cur.data.s.length - 1]; hasil.push(cur); } cur = null; n = 0; };
    for (const p of isi) {
      const t = normalCari(p.teks);
      if (cur && n + t.length > maks) tutup();
      if (!cur) cur = { id: idPotongan(p.seq), data: { dari: p.seq, sampai: p.seq, s: [], h: [], j: [], t: [] } };
      cur.data.s.push(p.seq); cur.data.h.push(p.hal); cur.data.j.push(p.juz); cur.data.t.push(t); n += t.length;
    }
    tutup();
  }
  return hasil;
}
export const idPotongan = (seqAwal) => `c${String(seqAwal).padStart(5, '0')}`;
export const RE_ID_POTONGAN = /^c\d{5}$/;

/** Dokumen potongan -> halaman terindeks untuk cariDiHalaman. Dokumen rusak (larik tak sama panjang) dilewati. */
export function halamanDariPotongan(data) {
  if (!data || !Array.isArray(data.s) || !Array.isArray(data.t) || data.s.length !== data.t.length) return [];
  return data.s.map((s, i) => ({ s, h: (data.h || [])[i] ?? 0, j: (data.j || [])[i] ?? 1, t: String(data.t[i] ?? '') }));
}

/* ------------------------------------------------------------------ penyorotan di teks asli (berharakat) */
const SELA_HARAKAT = '[\\u0610-\\u061A\\u064B-\\u065F\\u0670\\u06D6-\\u06ED\\u0640]*';
const KELAS = { 'ا': '[\\u0627\\u0622\\u0623\\u0625\\u0671]', 'ي': '[\\u064A\\u0649\\u0626\\u06CC]', 'ه': '[\\u0647\\u0629]', 'و': '[\\u0648\\u0624]', 'ك': '[\\u0643\\u06A9]' };
const polaKata = (k) => Array.from(k).map((c) => (KELAS[c] || (/[0-9]/.test(c) ? `[${c}${INDIA[+c]}${FARSI[+c]}]` : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).join(SELA_HARAKAT) + SELA_HARAKAT;

/**
 * RegExp yang menyorot kueri di teks ASLI: mengabaikan harakat/tatwil dan varian huruf. Mode 'frasa' = kata berurutan dengan tanda baca/spasi di antaranya;
 * 'kata' = salah satu kata. Mengembalikan null bila tidak ada yang disorot.
 */
export function regexSorot(kata, mode = 'frasa') {
  const daftar = (kata || []).filter(Boolean).slice(0, MAKS_KATA_KUERI);
  if (!daftar.length) return null;
  const pola = mode === 'kata' && daftar.length > 1 ? daftar.map(polaKata).join('|') : daftar.map(polaKata).join('[^\\p{L}\\p{N}]+');
  try { return new RegExp(pola, 'giu'); } catch { return null; }
}

/** Teks -> [{ t, m }] (m = bagian yang disorot). Tanpa regex atau tanpa kecocokan: satu bagian utuh. Maksimal `maks` sorotan. */
export function potongSorot(teks, re, maks = 400) {
  const s = String(teks ?? '');
  if (!re || !s) return [{ t: s, m: false }];
  const hasil = []; let akhir = 0; let n = 0;
  re.lastIndex = 0;
  for (let m = re.exec(s); m && n < maks; m = re.exec(s)) {
    if (!m[0]) { re.lastIndex++; continue; }
    if (m.index > akhir) hasil.push({ t: s.slice(akhir, m.index), m: false });
    hasil.push({ t: m[0], m: true }); akhir = m.index + m[0].length; n++;
  }
  if (akhir < s.length) hasil.push({ t: s.slice(akhir), m: false });
  return hasil.length ? hasil : [{ t: s, m: false }];
}

/** Sorot kata di cuplikan NORMAL dari server (posisi kecocokan pertama diketahui; kata lain dicari sendiri). */
export function potongCuplikan(c, kata, mode = 'frasa') {
  const s = c.teks; const rentang = [[c.mulai, c.mulai + c.panjang]];
  if (mode === 'kata') for (const k of kata || []) for (let i = s.indexOf(k); i >= 0; i = s.indexOf(k, i + k.length)) rentang.push([i, i + k.length]);
  rentang.sort((a, b) => a[0] - b[0]);
  const hasil = []; let akhir = 0;
  for (const [a, b] of rentang) {
    if (a < akhir) continue;
    if (a > akhir) hasil.push({ t: s.slice(akhir, a), m: false });
    hasil.push({ t: s.slice(a, b), m: true }); akhir = b;
  }
  if (akhir < s.length) hasil.push({ t: s.slice(akhir), m: false });
  return hasil;
}
