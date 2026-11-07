// Penyuntingan daftar isi kitab oleh editor/admin (tanpa React; dipakai server src/kitabIsi.js dan layar web/DaftarIsiEditor.jsx, jadi aturannya satu sumber).
// Masalah yang dijawab: daftar isi hasil impor bisa keliru (judul salah baca, level salah, halaman salah) atau tidak ada sama sekali (PDF/OCR, berkas tanpa
// judul bertanda). Editor atau admin memperbaikinya di dalam aplikasi, dengan jejak siapa mengubah apa dan jalan kembali.
import { KATA_KUNCI_BAB, levelKata } from './syamilah.js';

export const MAKS_ENTRI_ISI = 3000;   // sama dengan MAKS_DAFTAR_ISI (src/kitabImpor.js)
export const MAKS_JUDUL_ISI = 300;    // sama dengan batas judul saat impor
export const MAKS_CATATAN_ISI = 300;
export const LABEL_LEVEL = { 1: 'Kitab / pengantar', 2: 'Bab', 3: 'Fasal', 4: 'Sub-judul' };

// Karakter kendali dan penanda arah tersemat dibuang; ZWNJ dan NBSP menjadi spasi (sama dengan parser Syamilah: rapikan).
const KENDALI = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‎‏‪-‮⁦-⁩﻿]/g;
/** Judul hasil ketikan/tempel -> bentuk simpanan. Tidak mengubah huruf atau harakat Arab. */
export const rapikanJudul = (s) => String(s ?? '').replace(KENDALI, '').replace(/[ ‌]/g, ' ').replace(/\s+/g, ' ').replace(/^[•\s]+/, '').trim();

const bulatDalam = (v, min, maks) => Number.isInteger(v) && v >= min && v <= maks;

/**
 * Entri dari layar/permintaan -> bentuk baku: judul dirapikan, urut menurut halaman (urutan antar-entri di halaman yang sama tetap).
 * `juz` dan `hal` ikut dibawa bila ada; server yang menentukan nilai akhirnya dari halaman kitab.
 */
export function rapikanEntri(entri) {
  const larik = Array.isArray(entri) ? entri : [];
  return larik.map((e, i) => ({ i, e: e && typeof e === 'object' ? e : {} }))
    .map(({ i, e }) => ({ i, judul: typeof e.judul === 'string' ? rapikanJudul(e.judul) : '', level: e.level, seq: e.seq, ...(Number.isInteger(e.juz) ? { juz: e.juz } : {}), ...(Number.isInteger(e.hal) ? { hal: e.hal } : {}) }))
    .sort((a, b) => (Number.isInteger(a.seq) && Number.isInteger(b.seq) ? a.seq - b.seq : 0) || a.i - b.i)
    .map(({ i, ...sisa }) => sisa);
}

/**
 * Memeriksa entri (sudah dirapikan). `galat` menghalangi simpan; `peringatan` hanya ditampilkan.
 * Setiap butir menyebut nomor entri (mulai 1) dalam urutan yang diberikan.
 */
export function periksaEntri(entri, jumlahHalaman) {
  const galat = []; const peringatan = [];
  if (!Array.isArray(entri)) return { galat: [{ i: 0, pesan: 'Daftar isi harus berupa larik.' }], peringatan };
  if (entri.length > MAKS_ENTRI_ISI) galat.push({ i: 0, pesan: `Daftar isi terlalu panjang (maksimal ${MAKS_ENTRI_ISI} judul).` });
  const lihat = new Set();
  entri.forEach((e, k) => {
    const i = k + 1;
    if (!e || typeof e !== 'object') { galat.push({ i, pesan: 'Judul tidak valid.' }); return; }
    if (typeof e.judul !== 'string' || !e.judul) galat.push({ i, pesan: 'Judul belum diisi.' });
    else if (e.judul.length > MAKS_JUDUL_ISI) galat.push({ i, pesan: `Judul terlalu panjang (maksimal ${MAKS_JUDUL_ISI} karakter).` });
    else if (e.judul.length > 120) peringatan.push({ i, pesan: 'Judul sangat panjang; pastikan ini judul, bukan kalimat isi.' });
    if (!bulatDalam(e.level, 1, 4)) galat.push({ i, pesan: 'Level harus 1 sampai 4.' });
    if (!bulatDalam(e.seq, 1, jumlahHalaman)) galat.push({ i, pesan: `Urutan halaman harus bilangan bulat 1-${jumlahHalaman}.` });
    const kunci = `${e.seq}|${e.judul}`;
    if (lihat.has(kunci)) peringatan.push({ i, pesan: 'Judul yang sama sudah ada di halaman ini.' }); else lihat.add(kunci);
  });
  return { galat, peringatan };
}

/** Ringkasan beda dua daftar: { tambah, hapus, ubah }. Identitas entri = halaman + judul; judul diganti di halaman yang sama dihitung "ubah"; level diganti juga "ubah". */
export function bedaDaftar(lama, baru) {
  const kunci = (e) => `${e.seq}|${e.judul}`;
  const sisaLama = new Map();
  for (const e of lama || []) { const k = kunci(e); sisaLama.set(k, [...(sisaLama.get(k) || []), e]); }
  let ubah = 0; const tambahan = [];
  for (const e of baru || []) {
    const k = kunci(e); const ada = sisaLama.get(k);
    if (ada && ada.length) { const l = ada.shift(); if (l.level !== e.level) ubah++; } else tambahan.push(e);
  }
  const hapusan = [...sisaLama.values()].flat();
  // judul diganti pada halaman yang sama = satu "ubah", bukan satu hapus + satu tambah
  for (let a = tambahan.length - 1; a >= 0; a--) {
    const j = hapusan.findIndex((h) => h.seq === tambahan[a].seq);
    if (j >= 0) { hapusan.splice(j, 1); tambahan.splice(a, 1); ubah++; }
  }
  return { tambah: tambahan.length, hapus: hapusan.length, ubah };
}

const AKHIR_KALIMAT = /[.!?؟]$/;
const HARAKAT = /[ً-ٰٟـ]/g;
/** Bentuk perbandingan judul: tanpa harakat, tatwil, tanda baca, dan spasi; variasi alif/ya/ta marbuthah disamakan. Dipakai mencocokkan judul dari AI ke baris sumbernya dan mendeteksi header berulang. */
export const normalJudul = (s) => String(s ?? '').normalize('NFKC').replace(HARAKAT, '').replace(/[آأإ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
// Kata kunci judul Arab (boleh berawalan "ال", boleh berharakat), ditambah kata kunci Latin dari parser Syamilah. Kata harus utuh: "باب" ya, "بابك" bukan.
const KATA_ARAB = /^(?:ال)?(?:مقدمة|مدخل|كتاب|باب|فصل|فرع|تتمة|خاتمة|مبحث|مطلب)(?![ء-ي])/;
// Aturan Syamilah (KATA_KUNCI_BAB) tidak menuntut kata utuh, jadi hanya dipakai untuk judul Latin; judul Arab memakai KATA_ARAB.
const kunci = (t) => (/[\u0600-\u06FF]/.test(t) ? KATA_ARAB.test(String(t).replace(HARAKAT, '')) : KATA_KUNCI_BAB.test(t));
/** Level judul dari kata kuncinya: 1 = kitab/pengantar/penutup, 2 = bab, 3 = fasal/mabhats, 4 = mathlab/far'/tatimmah. Judul Latin memakai aturan parser Syamilah (1 sampai 3). */
export function levelUsul(t) {
  const a = String(t).replace(HARAKAT, '');
  if (/^(?:ال)?(?:مقدمة|مدخل|كتاب|خاتمة)(?![ء-ي])/.test(a)) return 1;
  if (/^(?:ال)?باب(?![ء-ي])/.test(a)) return 2;
  if (/^(?:ال)?(?:فصل|مبحث)(?![ء-ي])/.test(a)) return 3;
  if (/^(?:ال)?(?:مطلب|فرع|تتمة)(?![ء-ي])/.test(a)) return 4;
  return levelKata(t);
}
/** Buang penanda halaman "(ص: 12)", kurung siku pembungkus, dan titik dua/koma di ujung judul. Angka di ujung TIDAK dibuang ("Bab 3", "الباب 2" adalah bagian judul). */
export function bersihkanJudul(j) {
  return rapikanJudul(String(j).replace(/[\(\[]?\s*(?:ج\s*:?\s*[0-9٠-٩]+\s*[-,،]?\s*)?ص\s*:?\s*[0-9٠-٩]+\s*[\)\]]?\s*$/, '').replace(/^\[\s*(.+?)\s*\]$/, '$1').replace(/[:：،,;؛]+$/, ''));
}
const kataBanyak = (t) => t.split(' ').length;

/**
 * Baris pendek yang muncul di banyak halaman = header/footer halaman (judul kitab, nama bab berjalan), bukan judul bab.
 * `ambang` = jumlah halaman minimal. Mengembalikan himpunan bentuk normalJudul. Satu lintasan; biaya sebanding dengan jumlah baris pendek.
 */
export function barisBerulang(halaman, ambang) {
  const hitung = new Map();
  for (const p of halaman) {
    const pada = new Set();
    for (const baris of String(p.teks || '').split('\n')) {
      const j = rapikanJudul(baris);
      if (j.length < 2 || j.length > 100) continue;
      const n = normalJudul(j); if (n) pada.add(n);
    }
    for (const n of pada) hitung.set(n, (hitung.get(n) || 0) + 1);
  }
  const hasil = new Set();
  for (const [n, c] of hitung) if (c >= ambang) hasil.add(n);
  return hasil;
}
/**
 * Panjang baris khas isi kitab: median panjang baris yang panjangnya >= 20 karakter. null bila terlalu sedikit baris (kurang dari 10).
 * Teks hasil OCR Arab mempertahankan baris cetak (sekitar 40 sampai 90 karakter per baris), sedangkan teks Syamilah dan OCR Latin/Pegon berupa paragraf utuh.
 * Pada teks berbaris cetak, "baris pendek" tidak lagi berarti judul: judul dikenali karena JAUH lebih pendek dari baris khas, dan baris berkata kunci yang selebar baris
 * biasa ("كتاب الله تعالى وسنة رسوله ...") adalah lanjutan kalimat, bukan judul.
 */
export function ukuranBarisKhas(halaman) {
  const p = [];
  for (const h of halaman) for (const b of String(h.teks || '').split('\n')) { const n = rapikanJudul(b).length; if (n >= 20) p.push(n); }
  if (p.length < 10) return null;
  p.sort((a, b) => a - b); return p[p.length >> 1];
}
const BARIS_CETAK_MAKS = 90; // median sampai sebesar ini dianggap teks berbaris cetak
/** Ambang header berulang untuk seluruh kitab (n halaman): sedikitnya 5 halaman dan 8% dari kitab. */
const ambangKitab = (n) => Math.max(5, Math.ceil(n * 0.08));
const TITIK_POTONG = /[:：.،؟?!]|\s[-–—]\s/;

/**
 * Usulan daftar isi dari teks halaman, tanpa AI (gratis, satu lintasan; editor meninjau dulu). Sumber:
 *  1. `kata-kunci`: baris pendek berawalan kata kunci judul (باب، فصل، كتاب، مقدمة، مبحث، مطلب...; boleh berharakat atau berawalan "ال"; "Bab 3" untuk Latin),
 *  2. `potong`: baris panjang berawalan kata kunci, judulnya dipotong di titik dua/titik/tanda pisah pertama ("باب الوضوء: يجب ..."),
 *  3. `bab`: perubahan `bab` pada halaman (kitab hasil impor Syamilah menyimpan judul sebagai `bab`, bukan di teks).
 * Header berulang (baris yang sama di banyak halaman) dan judul yang sama persis di halaman berurutan dibuang.
 * `halaman` = [{ seq, juz, hal, teks, bab? }] dalam urutan apa pun.
 */
export function usulDariHalaman(halaman) {
  const urut = [...halaman].sort((a, b) => a.seq - b.seq);
  const berulang = barisBerulang(urut, ambangKitab(urut.length));
  const khas = ukuranBarisKhas(urut); const berbaris = khas !== null && khas <= BARIS_CETAK_MAKS;
  const batasPendek = berbaris ? Math.max(35, Math.round(khas * 0.75)) : 80; // teks berbaris cetak (OCR Arab): judul harus jelas lebih pendek dari baris biasa
  const hasil = []; let babSebelum = ''; let terakhir = null;
  const catat = (e) => {
    const n = normalJudul(e.judul);
    if (terakhir && terakhir.n === n && e.seq - terakhir.seq <= 1) return false; // judul sama di halaman berurutan: lanjutan, bukan judul baru
    terakhir = { n, seq: e.seq }; hasil.push(e); return true;
  };
  for (const p of urut) {
    const dihalaman = new Set();
    for (const baris of String(p.teks || '').split('\n')) {
      const j = rapikanJudul(baris);
      if (!j || !kunci(j)) continue;
      let calon = null; let sumber = 'kata-kunci';
      if (j.length <= batasPendek) { if (kataBanyak(j) <= 10 && !AKHIR_KALIMAT.test(j)) calon = bersihkanJudul(j); } // pendek tetapi berbentuk kalimat: bukan judul
      else if (!berbaris) {
        const t = TITIK_POTONG.exec(j.slice(0, 81));
        if (t && t.index >= 4) { calon = bersihkanJudul(j.slice(0, t.index)); sumber = 'potong'; }
      }
      if (!calon || calon.length < 2 || !kunci(calon)) continue;
      const n = normalJudul(calon);
      if (!n || berulang.has(n) || dihalaman.has(n)) continue;
      dihalaman.add(n);
      catat({ judul: calon, level: levelUsul(calon), juz: p.juz, hal: p.hal, seq: p.seq, sumber });
    }
    const bab = bersihkanJudul(p.bab || '');
    if (bab && bab !== babSebelum) {
      babSebelum = bab;
      if (!dihalaman.has(normalJudul(bab)) && bab.length <= MAKS_JUDUL_ISI) catat({ judul: bab, level: levelUsul(bab), juz: p.juz, hal: p.hal, seq: p.seq, sumber: 'bab' });
    }
  }
  return hasil;
}

/**
 * Kandidat judul untuk dipilah AI (src/kitabIsi.js, aksi perpus-isi-ai): bukan hanya yang berkata kunci. Baris pendek tanpa tanda akhir kalimat ikut
 * (judul kitab tanpa kata "باب" juga ada, mis. "الطهارة"), dengan awal baris berikutnya sebagai konteks. Header berulang di jendela ini dibuang.
 * AI cukup memilih NOMOR kandidat, jadi judul selalu persis dari teks sumber dan keluaran AI kecil.
 * Bila lebih dari `maks`, yang berkata kunci didahulukan, lalu yang terpendek. -> { kandidat: [{ id, seq, juz, hal, teks, lanjut, kunci }], terpotong, bentuk: 'baris' | 'paragraf' }
 */
export function kandidatJudul(halaman, { maks = 250 } = {}) {
  const urut = [...halaman].sort((a, b) => a.seq - b.seq);
  const berulang = barisBerulang(urut, Math.max(3, Math.ceil(urut.length * 0.25)));
  const khas = ukuranBarisKhas(urut); const berbaris = khas !== null && khas <= BARIS_CETAK_MAKS;
  const maksPendek = berbaris ? Math.max(25, Math.round(khas * 0.55)) : 100; const maksKata = berbaris ? 8 : 14; const maksKunci = berbaris ? Math.max(35, Math.round(khas * 0.75)) : 160;
  let semua = [];
  for (const p of urut) {
    const baris = String(p.teks || '').split('\n').map(rapikanJudul);
    const lihat = new Set();
    baris.forEach((j, k) => {
      if (j.length < 2 || j.length > maksKunci || !/\p{L}/u.test(j)) return;
      const isKunci = kunci(j);
      if (!isKunci && (j.length > maksPendek || kataBanyak(j) > maksKata || AKHIR_KALIMAT.test(j))) return;
      const n = normalJudul(j); if (!n || berulang.has(n) || lihat.has(n)) return; lihat.add(n);
      const lanjut = baris.slice(k + 1).find(Boolean) || '';
      semua.push({ seq: p.seq, juz: p.juz, hal: p.hal, teks: j, lanjut: lanjut.slice(0, 60), kunci: isKunci, urut: semua.length });
    });
    const bab = bersihkanJudul(p.bab || '');
    if (bab && !lihat.has(normalJudul(bab)) && bab.length <= MAKS_JUDUL_ISI && !semua.some((e) => e.seq <= p.seq && e.dariBab === bab)) {
      // judul dari `bab` hanya dicatat saat berubah dibanding halaman sebelumnya
      const sebelum = urut[urut.indexOf(p) - 1];
      if (!sebelum || bersihkanJudul(sebelum.bab || '') !== bab) semua.push({ seq: p.seq, juz: p.juz, hal: p.hal, teks: bab, lanjut: '', kunci: true, dariBab: bab, urut: semua.length });
    }
  }
  const terpotong = semua.length > maks;
  if (terpotong) semua = [...semua].sort((a, b) => (b.kunci - a.kunci) || a.teks.length - b.teks.length || a.urut - b.urut).slice(0, maks).sort((a, b) => a.urut - b.urut);
  return { kandidat: semua.map(({ urut: _u, dariBab: _d, ...e }, i) => ({ id: i + 1, ...e })), terpotong, bentuk: berbaris ? 'baris' : 'paragraf' };
}

/**
 * Memeriksa pilihan AI terhadap kandidat dan menjadikannya entri daftar isi. AI hanya boleh memilih nomor kandidat yang ada;
 * `judul` dari AI (bila ada, untuk memotong judul dari baris panjang) harus bagian dari baris sumber (dibandingkan lewat normalJudul), kalau tidak dipakai baris utuh.
 * -> { entri: [{ judul, level, juz, hal, seq, sumber: 'ai' }], ditolak } (`ditolak` = pilihan yang nomornya tidak ada atau ganda)
 */
export function entriDariPilihanAi(pilih, kandidat) {
  const peta = new Map(kandidat.map((k) => [k.id, k])); const dipakai = new Set(); let ditolak = 0; const entri = [];
  for (const x of Array.isArray(pilih) ? pilih : []) {
    const k = x && Number.isInteger(x.id) ? peta.get(x.id) : null;
    if (!k || dipakai.has(k.id)) { ditolak++; continue; }
    dipakai.add(k.id);
    let judul = bersihkanJudul(k.teks);
    if (typeof x.judul === 'string') { const t = bersihkanJudul(x.judul); const nt = normalJudul(t); if (t.length >= 2 && nt && normalJudul(k.teks).includes(nt)) judul = t; }
    if (!judul || judul.length > MAKS_JUDUL_ISI) { ditolak++; continue; }
    entri.push({ judul, level: Number.isInteger(x.level) && x.level >= 1 && x.level <= 4 ? x.level : levelUsul(judul), juz: k.juz, hal: k.hal, seq: k.seq, sumber: 'ai' });
  }
  return { entri, ditolak };
}

/** Gabungkan usulan ke daftar yang ada: hanya yang belum ada (halaman + judul sama) yang ditambah. -> { entri, ditambah } */
export function gabungUsul(lama, usul) {
  const ada = new Set((lama || []).map((e) => `${e.seq}|${e.judul}`));
  const baru = usul.filter((e) => !ada.has(`${e.seq}|${e.judul}`));
  return { entri: rapikanEntri([...(lama || []), ...baru]), ditambah: baru.length };
}
