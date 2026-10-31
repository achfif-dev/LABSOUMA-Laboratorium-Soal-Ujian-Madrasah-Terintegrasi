// Mutu teks kitab hasil impor (tanpa DOM, tanpa Node API): (1) pemeriksa yang mencari ciri teks rusak sebelum kitab masuk perpustakaan,
// dan (2) pembersih judul berjalan / nomor halaman yang menempel di awal-akhir tiap halaman PDF.
//
// Mengapa perlu: parser memastikan BENTUK (halaman, nomor, bab), bukan ISI. PDF dengan pemetaan huruf buruk menghasilkan huruf terpisah,
// urutan terbalik, atau karakter pengganti; semuanya lolos parser dan baru ketahuan setelah soal dibuat dari teks itu. Nomor halaman dan judul berjalan
// yang ikut tersimpan mengotori teks yang dikutip ke soal dan hasil pencarian.

const HURUF_ARAB = /[ء-يٱٮ-ۓ]/g;
const HURUF_LATIN = /[A-Za-z]/g;
const KONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const MOJIBAKE = /[ØÙÚÛÃÂ][\u0080-¿]/g;
const PUA = /[-]/g;
const HARAKAT = /[ً-ْٰـ]/g;
const hitung = (s, re) => (s.match(re) || []).length;

// Kata paling umum dalam bentuk lurus dan terbalik (PDF "visual order" membalik urutan huruf tiap kata).
const LURUS = new Set(['في', 'من', 'على', 'الله', 'التي', 'الذي', 'هذا', 'ذلك', 'عن', 'إلى', 'الى', 'قال', 'ولا']);
const TERBALIK = new Set(['يف', 'نم', 'ىلع', 'هللا', 'يتلا', 'يذلا', 'اذه', 'كلذ', 'نع', 'ىلإ', 'ىلا', 'لاق', 'الو']);

/**
 * Periksa isi halaman. Murni; tidak mengubah masukan.
 * @param {{teks:string}[]} halaman
 * @returns {{tingkat:'bad'|'warn', kode:string, teks:string}[]}
 */
export function periksaKualitasTeks(halaman) {
  const temuan = []; const tambah = (tingkat, kode, teks) => temuan.push({ tingkat, kode, teks });
  if (!Array.isArray(halaman)) return temuan;
  const n = halaman.length; if (!n) return temuan;
  const semua = halaman.map((h) => h.teks || '');
  const gabung = semua.join('\n');
  const total = gabung.length; if (!total) return temuan;
  const arab = hitung(gabung, HURUF_ARAB); const latin = hitung(gabung, HURUF_LATIN);

  const mojibake = hitung(gabung, MOJIBAKE);
  if (mojibake >= 20) tambah('bad', 'mojibake', `Teks tampak salah dekode (${mojibake} urutan karakter seperti "Ø§Ù"). Berkas kemungkinan bukan UTF-8; simpan ulang sebagai UTF-8 lalu impor lagi.`);
  const pengganti = hitung(gabung, /�/g) + hitung(gabung, PUA);
  if (pengganti / total > 0.005) tambah('bad', 'pengganti', `${pengganti.toLocaleString('id-ID')} karakter pengganti/tak dikenal (${(100 * pengganti / total).toFixed(1)}% teks): pemetaan huruf di sumbernya rusak (umum pada PDF). Teks ini tidak layak dijadikan rujukan soal.`);
  else if (pengganti >= 5) tambah('warn', 'pengganti', `${pengganti} karakter pengganti/tak dikenal tersebar di teks. Periksa halaman terkait di pembaca setelah impor.`);
  const kontrol = hitung(gabung, KONTROL);
  if (kontrol) tambah('warn', 'kontrol', `${kontrol} karakter kontrol tak terlihat ditemukan di teks. Sebaiknya dibersihkan dari berkas sumber.`);

  if (arab + latin >= 200) {
    const nisbah = arab / (arab + latin);
    if (nisbah < 0.25) tambah('bad', 'bukan-arab', `Hanya ${Math.round(nisbah * 100)}% huruf berupa huruf Arab. Berkas ini mungkin bukan kitab berbahasa Arab, atau teks Arabnya tidak terbaca.`);
    else if (nisbah < 0.7) tambah('warn', 'sedikit-arab', `${Math.round((1 - nisbah) * 100)}% huruf berupa huruf Latin. Wajar bila kitab ini memuat terjemah atau catatan Latin; bila tidak, periksa hasil bacanya.`);
  }

  // Kata (token) Arab: huruf terpisah, kata menempel, urutan huruf terbalik.
  const kataArab = gabung.split(/\s+/).map((t) => t.replace(/[^\u0621-\u064A\u0671\u066E-\u06D3]/g, '')).filter(Boolean);
  if (kataArab.length >= 200) {
    const tunggal = kataArab.filter((t) => t.length === 1 && t !== 'و').length;
    if (tunggal / kataArab.length > 0.2) tambah('bad', 'huruf-terpisah', `${Math.round(100 * tunggal / kataArab.length)}% kata hanya satu huruf: huruf-huruf terpisah-pisah (ciri PDF dengan pemetaan huruf buruk). Coba ekspor ulang, atau pakai sumber lain.`);
    const panjang = kataArab.filter((t) => t.length >= 22).length;
    if (panjang / kataArab.length > 0.01) tambah('warn', 'kata-menempel', `${panjang} kata berukuran tidak wajar (22 huruf atau lebih): spasi antarkata kemungkinan hilang saat ekstraksi.`);
    let lurus = 0; let balik = 0;
    for (const t of kataArab) { if (LURUS.has(t)) lurus++; else if (TERBALIK.has(t)) balik++; }
    if (balik >= 10 && balik > lurus * 0.5) tambah('bad', 'terbalik', `Urutan huruf dalam kata tampak terbalik (kata seperti "يف" dan "نم" lebih banyak dari "في" dan "من"): ciri PDF berurutan visual. Teks akan tak terbaca dan tak bisa dicari.`);
  }

  // Halaman: hampir kosong, ganda persis, sangat pendek.
  if (n >= 10) {
    const hampirKosong = semua.filter((t) => t.trim().length < 20).length;
    if (hampirKosong / n > 0.2 && hampirKosong >= 5) tambah('warn', 'hampir-kosong', `${hampirKosong} dari ${n} halaman (${Math.round(100 * hampirKosong / n)}%) hampir kosong (kurang dari 20 karakter): sampul, halaman gambar, atau teks gagal terbaca.`);
    const rata = total / n;
    if (rata < 150 && hampirKosong / n <= 0.2) tambah('warn', 'pendek', `Rata-rata halaman hanya ${Math.round(rata)} karakter. Pemisahan halaman mungkin keliru (terlalu sering terbelah).`);
  }
  const lihat = new Map(); for (const t of semua) { const k = t.trim(); if (k.length >= 50) lihat.set(k, (lihat.get(k) || 0) + 1); }
  const ganda = [...lihat.values()].filter((c) => c > 1).reduce((a, c) => a + c - 1, 0);
  if (ganda >= 3) tambah('warn', 'ganda', `${ganda} halaman berisi teks yang sama persis dengan halaman lain. Kemungkinan berkas memuat halaman yang tercetak dua kali, atau penanda halaman tidak ikut terpisah.`);

  const berulang = deteksiBarisBerulang(semua);
  if (berulang.atas.length || berulang.bawah.length) {
    const contoh = [...berulang.atas, ...berulang.bawah].filter((k) => k !== NOMOR).slice(0, 3).map((k) => `«${k.slice(0, 40)}»`).join(', ');
    if (contoh) tambah('warn', 'baris-berulang', `Baris yang sama berulang di awal atau akhir banyak halaman: ${contoh}. Itu biasanya judul berjalan atau nomor halaman yang ikut tersimpan dan akan mengotori kutipan serta hasil pencarian.`);
  }
  return temuan;
}

/* ------------------------------------------------------------------ header/footer berulang dan nomor halaman */
export const NOMOR = '#nomor';
const DIGIT = /[0-9٠-٩۰-۹]+/g;
const ANGKA_INDIA = '٠١٢٣٤٥٦٧٨٩'; const ANGKA_FARSI = '۰۱۲۳۴۵۶۷۸۹';
const keAngka = (s) => String(s).replace(/[٠-٩]/g, (d) => ANGKA_INDIA.indexOf(d)).replace(/[۰-۹]/g, (d) => ANGKA_FARSI.indexOf(d));
const RE_NOMOR_SAJA = /^[\s\-–—_.()[\]{}«»*•·]*([0-9٠-٩۰-۹]{1,5})[\s\-–—_.()[\]{}«»*•·]*$/;

/** Kunci perbandingan baris: angka diganti '#', spasi dirapatkan; baris hanya-angka (nomor halaman) = NOMOR. Baris panjang (isi) dan kosong = null. */
export function kunciBaris(baris) {
  const b = String(baris).replace(/[​-‏‪-‮⁦-⁩﻿]/g, '').replace(/[ً-ْٰـ]/g, '').trim();
  if (!b || b.length > 80) return null;
  if (RE_NOMOR_SAJA.test(b)) return NOMOR;
  return b.replace(DIGIT, '#').replace(/\s+/g, ' ');
}

const barisTak = (teks) => teks.split('\n').map((t, i) => ({ t, i })).filter((x) => x.t.trim());

/**
 * Baris yang berulang di jendela atas/bawah halaman (default 2 baris) pada >= `nisbah` halaman (minimal 3 halaman, kitab minimal 6 halaman).
 * @returns {{atas:string[], bawah:string[]}} kunci baris
 */
export function deteksiBarisBerulang(teksPerHalaman, { jendela = 2, nisbah = 0.3, minHalaman = 6 } = {}) {
  const n = teksPerHalaman.length; if (n < minHalaman) return { atas: [], bawah: [] };
  const cacahAtas = new Map(); const cacahBawah = new Map();
  for (const teks of teksPerHalaman) {
    const b = barisTak(teks);
    const atas = new Set(b.slice(0, jendela).map((x) => kunciBaris(x.t)).filter(Boolean));
    const bawah = new Set(b.slice(-jendela).map((x) => kunciBaris(x.t)).filter(Boolean));
    for (const k of atas) cacahAtas.set(k, (cacahAtas.get(k) || 0) + 1);
    for (const k of bawah) cacahBawah.set(k, (cacahBawah.get(k) || 0) + 1);
  }
  const lolos = (m) => [...m.entries()].filter(([, c]) => c >= Math.max(3, nisbah * n)).map(([k]) => k);
  return { atas: lolos(cacahAtas), bawah: lolos(cacahBawah) };
}

/**
 * Buang judul berjalan dan nomor halaman dari awal/akhir tiap halaman, dan baca nomor cetak dari nomor yang dibuang bila konsisten.
 * Hanya baris di jendela atas/bawah yang dibuang; baris isi di tengah halaman tidak disentuh.
 * @param {string[]} teksPerHalaman
 * @returns {{halaman:string[], dibuang:number, contoh:string[], nomor:null|{offset:number, dukungan:number, bertanda:number}}}
 *   nomor.offset: nomor cetak halaman ke-1 (indeks 0) = offset, halaman ke-i = offset + i. `dukungan` = bagian halaman bernomor yang cocok (0-1).
 */
export function bersihkanEkorKepala(teksPerHalaman, opsi = {}) {
  const jendela = opsi.jendela || 2;
  const { atas, bawah } = deteksiBarisBerulang(teksPerHalaman, opsi);
  const sasaranAtas = new Set(atas); const sasaranBawah = new Set(bawah);
  if (!sasaranAtas.size && !sasaranBawah.size) return { halaman: teksPerHalaman.slice(), dibuang: 0, contoh: [], nomor: null };
  let dibuang = 0; const contoh = new Set(); const bernomor = [];
  const halaman = teksPerHalaman.map((teks, idx) => {
    const lines = teks.split('\n'); const b = barisTak(teks); const hapus = new Set(); let nomorHal = null;
    for (const x of b.slice(0, jendela)) { const k = kunciBaris(x.t); if (k && sasaranAtas.has(k)) { hapus.add(x.i); if (k === NOMOR) nomorHal = nomorHal ?? parseInt(keAngka(RE_NOMOR_SAJA.exec(x.t.trim())[1]), 10); else contoh.add(x.t.trim()); } }
    for (const x of b.slice(-jendela)) { const k = kunciBaris(x.t); if (k && sasaranBawah.has(k)) { hapus.add(x.i); if (k === NOMOR) nomorHal = nomorHal ?? parseInt(keAngka(RE_NOMOR_SAJA.exec(x.t.trim())[1]), 10); else contoh.add(x.t.trim()); } }
    if (nomorHal !== null && Number.isFinite(nomorHal)) bernomor.push({ idx, nomor: nomorHal });
    dibuang += hapus.size;
    return lines.filter((_, i) => !hapus.has(i)).join('\n').replace(/^\n+|\n+$/g, '').replace(/\n{3,}/g, '\n\n');
  });
  // Nomor cetak: selisih (nomor - indeks) yang paling sering; dipakai hanya bila >= 70% halaman bernomor sepakat dan >= 50% halaman memuat nomor.
  let nomor = null;
  if (bernomor.length >= Math.max(5, teksPerHalaman.length * 0.5)) {
    const cacah = new Map(); for (const { idx, nomor: v } of bernomor) cacah.set(v - idx, (cacah.get(v - idx) || 0) + 1);
    const [offset, sama] = [...cacah.entries()].sort((a, c) => c[1] - a[1])[0];
    if (sama / bernomor.length >= 0.7 && offset + teksPerHalaman.length - 1 <= 99999 && offset >= -9999) nomor = { offset, dukungan: +(sama / bernomor.length).toFixed(3), bertanda: bernomor.length };
  }
  return { halaman, dibuang, contoh: [...contoh].slice(0, 5), nomor };
}

/** Ringkasan temuan mutu untuk layar impor (format sama dengan peringatanPratinjau). */
export const peringatanKualitas = (halaman) => periksaKualitasTeks(halaman).map(({ tingkat, teks }) => ({ tingkat, teks }));
