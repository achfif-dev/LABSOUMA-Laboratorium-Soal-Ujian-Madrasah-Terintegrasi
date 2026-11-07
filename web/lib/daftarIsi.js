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
/**
 * Usulan daftar isi dari teks halaman (tidak menulis apa pun; editor meninjau dulu). Dua sumber:
 *  1. baris pendek di teks halaman yang berawalan kata kunci judul (باب، فصل، كتاب، مقدمة، "Bab 3"), dan
 *  2. perubahan `bab` pada halaman (kitab hasil impor Syamilah menyimpan judul sebagai `bab`, bukan di teks).
 * `halaman` = [{ seq, juz, hal, teks, bab? }] dalam urutan apa pun.
 */
export function usulDariHalaman(halaman) {
  const urut = [...halaman].sort((a, b) => a.seq - b.seq);
  const hasil = []; let babSebelum = '';
  for (const p of urut) {
    const dihalaman = new Set();
    for (const baris of String(p.teks || '').split('\n')) {
      const j = rapikanJudul(baris);
      if (!j || j.length > 80 || j.split(' ').length > 10 || AKHIR_KALIMAT.test(j) || !KATA_KUNCI_BAB.test(j)) continue;
      if (dihalaman.has(j)) continue; dihalaman.add(j);
      hasil.push({ judul: j, level: levelKata(j), juz: p.juz, hal: p.hal, seq: p.seq });
    }
    const bab = rapikanJudul(p.bab);
    if (bab && bab !== babSebelum) {
      babSebelum = bab;
      if (!dihalaman.has(bab) && bab.length <= MAKS_JUDUL_ISI) hasil.push({ judul: bab, level: levelKata(bab), juz: p.juz, hal: p.hal, seq: p.seq });
    }
  }
  return hasil;
}

/** Gabungkan usulan ke daftar yang ada: hanya yang belum ada (halaman + judul sama) yang ditambah. -> { entri, ditambah } */
export function gabungUsul(lama, usul) {
  const ada = new Set((lama || []).map((e) => `${e.seq}|${e.judul}`));
  const baru = usul.filter((e) => !ada.has(`${e.seq}|${e.judul}`));
  return { entri: rapikanEntri([...(lama || []), ...baru]), ditambah: baru.length };
}
