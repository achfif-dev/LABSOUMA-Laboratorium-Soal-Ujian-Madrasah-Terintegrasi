// Koreksi teks halaman kitab (tanpa React; dipakai server src/kitabKoreksi.js dan layar web/PembacaKitab.jsx, jadi aturannya satu sumber).
// Masalah yang dijawab: teks hasil OCR AI (atau ekspor lain) keliru pada huruf/harakat, dan editor atau admin yang mencocokkannya dengan kitab asli
// perlu memperbaikinya di tempat, dengan jejak siapa mengubah apa dan jalan kembali.

export const MAKS_TEKS_KOREKSI = 12000; // sama dengan MAKS_TEKS_HALAMAN (src/kitabImpor.js)
export const MAKS_CATATAN_KOREKSI = 300;

// Karakter yang hampir selalu ikut tertempel dari web/PDF dan merusak arah atau pencarian: NUL dan kendali C0 (selain tab dan baris baru), BOM,
// penanda arah tersemat (LRE/RLE/PDF/LRO/RLO, LRI/RLI/FSI/PDI). ZWNJ dan ZWJ SENGAJA dibiarkan: perlu pada aksara Pegon/Persia.
const TAK_DIINGINKAN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F﻿‪-‮⁦-⁩]/g;

/** Teks hasil ketikan/tempel -> bentuk simpanan: baris baru seragam, karakter kendali dibuang, ujung dipangkas. Tidak mengubah huruf Arab (tanpa normalisasi Unicode). */
export const bersihkanTeksKoreksi = (s) => String(s ?? '').replace(/\r\n?/g, '\n').replace(TAK_DIINGINKAN, '').trim();

/** Halaman ber-matn: `matn` dan `syarah` -> { teks, batasMatn }. Sama dengan cara parser Syamilah menyusunnya (matn + baris baru + syarah; batas = panjang matn). */
export function gabungMatnSyarah(matn, syarah) {
  const m = bersihkanTeksKoreksi(matn); const s = bersihkanTeksKoreksi(syarah);
  return { teks: m && s ? `${m}\n${s}` : (m || s), batasMatn: m.length };
}

/** Halaman tersimpan -> bagian yang disunting. `batasMatn` null = satu kotak teks. */
export function bagianSunting(p) {
  if (p.batasMatn === null || p.batasMatn === undefined) return { terpisah: false, teks: p.teks };
  return { terpisah: true, matn: p.teks.slice(0, p.batasMatn).trim(), syarah: p.teks.slice(p.batasMatn).trim() };
}

/** Isi sunting -> { teks, batasMatn } yang akan disimpan (batasMatn null untuk halaman tanpa pemisah). */
export function hasilSunting(p, isi) {
  if (p.batasMatn === null || p.batasMatn === undefined) return { teks: bersihkanTeksKoreksi(isi.teks), batasMatn: null };
  return gabungMatnSyarah(isi.matn, isi.syarah);
}

/* ------------------------------------------------------------------ beda teks (per kata) */
const pecahKata = (s) => String(s || '').match(/\s+|[^\s]+/gu) || [];
const BATAS_DP = 16_000_000; // sel tabel LCS (Uint16: 32 MB paling besar; halaman 12.000 karakter hanya ±4.000 token); di atas ini beda kasar (awalan/akhiran sama dibuang, sisanya dianggap diganti)

/**
 * Beda dua teks per kata (spasi ikut sebagai token). Mengembalikan potongan berurutan { t, j } dengan j: 'sama' | 'hapus' | 'tambah'.
 * Awalan dan akhiran yang sama dibuang dulu, sisanya dengan LCS; bila terlalu besar, sisa tengah dianggap satu hapus + satu tambah.
 */
export function bedaTeks(lama, baru) {
  const a = pecahKata(lama); const b = pecahKata(baru);
  let i0 = 0; while (i0 < a.length && i0 < b.length && a[i0] === b[i0]) i0++;
  let a1 = a.length; let b1 = b.length;
  while (a1 > i0 && b1 > i0 && a[a1 - 1] === b[b1 - 1]) { a1--; b1--; }
  const hasil = [];
  const dorong = (j, t) => { if (!t) return; const l = hasil[hasil.length - 1]; if (l && l.j === j) l.t += t; else hasil.push({ t, j }); };
  dorong('sama', a.slice(0, i0).join(''));
  const A = a.slice(i0, a1); const B = b.slice(i0, b1);
  if (A.length && B.length && A.length * B.length <= BATAS_DP) {
    const w = B.length + 1; const tab = new Uint16Array((A.length + 1) * w);
    for (let i = A.length - 1; i >= 0; i--) for (let k = B.length - 1; k >= 0; k--) tab[i * w + k] = A[i] === B[k] ? tab[(i + 1) * w + k + 1] + 1 : Math.max(tab[(i + 1) * w + k], tab[i * w + k + 1]);
    let i = 0; let k = 0;
    while (i < A.length && k < B.length) {
      if (A[i] === B[k]) { dorong('sama', A[i]); i++; k++; }
      else if (tab[(i + 1) * w + k] >= tab[i * w + k + 1]) { dorong('hapus', A[i]); i++; }
      else { dorong('tambah', B[k]); k++; }
    }
    while (i < A.length) dorong('hapus', A[i++]);
    while (k < B.length) dorong('tambah', B[k++]);
  } else { dorong('hapus', A.join('')); dorong('tambah', B.join('')); }
  dorong('sama', a.slice(a1).join(''));
  return hasil;
}

/** Jumlah kata yang dihapus dan ditambah dari hasil `bedaTeks` (spasi tidak dihitung). */
export function ringkasBeda(potongan) {
  const kata = (t) => (String(t).match(/[^\s]+/gu) || []).length;
  return potongan.reduce((r, x) => (x.j === 'hapus' ? { ...r, hapus: r.hapus + kata(x.t) } : x.j === 'tambah' ? { ...r, tambah: r.tambah + kata(x.t) } : r), { hapus: 0, tambah: 0 });
}
