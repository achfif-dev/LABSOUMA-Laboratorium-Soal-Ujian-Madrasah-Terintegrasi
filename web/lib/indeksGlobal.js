// Indeks pencarian LINTAS KITAB (kata -> kitab dan halaman). Bagian MURNI (tanpa AI, tanpa Firestore, tanpa Node API): dipakai server (src/kitabGlobal.js) dan tes.
//
// Fungsinya PENUNJUK, bukan pengganti pencarian per kitab: dari kata kunci pertanyaan, indeks ini menunjukkan kitab mana di seluruh perpustakaan yang paling
// banyak memuatnya. Pencarian halaman yang teliti tetap dilakukan indeks per kitab (src/kitabCari.js) hanya pada kitab yang ditunjuk. Jadi biaya satu pertanyaan
// tidak bertambah menurut jumlah kitab: membaca beberapa dokumen bucket (kata yang dicari), bukan seluruh teks tiap kitab.
//
// Bentuk simpanan: kata dipotong menjadi BATANG (awalan Arab menempel dibuang), batang di-hash ke salah satu N_BUCKET dokumen. Satu dokumen bucket =
//   { v, n, d: JSON({ batang: "no~d,dx2,d|no2~d,d" }) }  no = nomor kitab (base36), d = selisih nomor urut halaman (base36), x = jumlah kemunculan bila > 1.
// `d` sengaja satu string (bukan peta Firestore) agar Firestore tidak membuat indeks untuk tiap kata dan dokumen tetap kecil.
import { normalCari } from './cariKitab.js';

export const VERSI_GLOBAL = 1;
export const N_BUCKET = 1024;
export const MAKS_BYTE_BUCKET = 900_000;     // batas Firestore 1 MiB per dokumen; sisakan ruang untuk bidang lain
export const MAKS_ISTILAH_KUERI = 24;        // kata (batang) per pertanyaan = paling banyak sekian pembacaan bucket
const BATAS_UMUM = 0.3;                      // batang yang muncul di > 30% halaman sebuah kitab = kata umum (قال, في, ...): tidak membedakan, tidak diindeks
const MIN_HALAMAN_UMUM = 50;                 // aturan kata umum hanya untuk kitab dengan setidaknya sekian halaman
const MAKS_TF = 1295;

const AWAL_AL = /^[وف]?[بلك]?ال/;            // (wa|fa)? (bi|li|ka)? al
const AWAL_LIL = /^[وف]?لل/;                 // (wa|fa)? li + al yang melebur: للصلاة
/** Batang kata normal: awalan Arab yang menempel dibuang bila sisanya masih >= 3 huruf. Satu fungsi untuk indeks DAN kueri, jadi keduanya selalu cocok. */
export function batang(w) {
  const s = String(w || '');
  const m = AWAL_AL.exec(s); if (m && s.length - m[0].length >= 3) return s.slice(m[0].length);
  const l = AWAL_LIL.exec(s); if (l && s.length - l[0].length >= 3) return s.slice(l[0].length);
  if ((s[0] === 'و' || s[0] === 'ف') && s.length >= 5) return s.slice(1);
  return s;
}
const layak = (s) => s.length >= 3 && !/^\d+$/.test(s);

/** Teks halaman SUDAH normal -> Map<batang, jumlah kemunculan>. */
export function istilahHalaman(teksNormal) {
  const hasil = new Map();
  for (const w of String(teksNormal || '').split(' ')) {
    if (w.length < 2) continue;
    const s = batang(w); if (!layak(s)) continue;
    hasil.set(s, (hasil.get(s) || 0) + 1);
  }
  return hasil;
}

/**
 * Halaman terindeks sebuah kitab [{ s: seq, t: teks normal }] -> { istilah: Map<batang, [[seq, tf], ...]> (urut seq), halaman, dibuangUmum }.
 */
export function istilahKitab(halaman) {
  const daftar = (halaman || []).filter((p) => p && Number.isInteger(p.s)).sort((a, b) => a.s - b.s);
  const istilah = new Map();
  const dilihat = new Set();
  for (const p of daftar) {
    if (dilihat.has(p.s)) continue; dilihat.add(p.s);
    for (const [s, tf] of istilahHalaman(p.t)) { if (!istilah.has(s)) istilah.set(s, []); istilah.get(s).push([p.s, Math.min(tf, MAKS_TF)]); }
  }
  let dibuangUmum = 0;
  if (dilihat.size >= MIN_HALAMAN_UMUM) for (const [s, ps] of istilah) if (ps.length > BATAS_UMUM * dilihat.size) { istilah.delete(s); dibuangUmum++; }
  return { istilah, halaman: dilihat.size, dibuangUmum };
}

/** Bucket (0..N_BUCKET-1) sebuah batang: FNV-1a 32-bit, deterministik di semua mesin. */
export function bucketDari(stem) {
  let h = 0x811c9dc5;
  for (let i = 0; i < stem.length; i++) { h ^= stem.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h % N_BUCKET;
}
export const idBucket = (i) => `b${String(i).padStart(4, '0')}`;

/** Map<batang, pasangan> -> Map<bucket, Map<batang, pasangan>>. */
export function kelompokBucket(istilah) {
  const keluar = new Map();
  for (const [s, ps] of istilah) { const b = bucketDari(s); if (!keluar.has(b)) keluar.set(b, new Map()); keluar.get(b).set(s, ps); }
  return keluar;
}

const b36 = (n) => n.toString(36);
/** Segmen satu kitab untuk satu batang: "no~selisih[,selisih...]"; pasangan [seq, tf] harus menaik menurut seq. */
export function kodeSegmen(no, pasangan) {
  let sebelum = 0;
  return `${b36(no)}~${pasangan.map(([seq, tf]) => { const d = seq - sebelum; sebelum = seq; return b36(d) + (tf > 1 ? `x${b36(Math.min(tf, MAKS_TF))}` : ''); }).join(',')}`;
}
/** String batang -> [{ no, seq, tf }]. Segmen cacat dilewati. */
export function bacaBatang(str) {
  const keluar = [];
  for (const seg of String(str || '').split('|')) {
    const i = seg.indexOf('~'); if (i <= 0) continue;
    const no = parseInt(seg.slice(0, i), 36); if (!Number.isInteger(no)) continue;
    let seq = 0;
    for (const it of seg.slice(i + 1).split(',')) {
      if (!it) continue;
      const x = it.indexOf('x');
      const d = parseInt(x < 0 ? it : it.slice(0, x), 36); const tf = x < 0 ? 1 : parseInt(it.slice(x + 1), 36);
      if (!Number.isInteger(d) || d < 1 || !Number.isInteger(tf)) break;
      seq += d; keluar.push({ no, seq, tf });
    }
  }
  return keluar;
}
/** Buang semua segmen milik kitab bernomor di `nomor` (Set). Mengembalikan string baru ('' bila habis). */
export function buangNomor(str, nomor) {
  return String(str || '').split('|').filter((seg) => { const i = seg.indexOf('~'); return i > 0 && !nomor.has(parseInt(seg.slice(0, i), 36)); }).join('|');
}

/** Ukuran UTF-8 (byte) sebuah string tanpa Node API. */
export function byteUtf8(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); n += c < 0x80 ? 1 : c < 0x800 ? 2 : (c >= 0xd800 && c <= 0xdbff) ? (i++, 4) : 3; }
  return n;
}

/**
 * Menggabungkan isi lama sebuah bucket dengan kitab yang ditambahkan. Idempoten: segmen lama milik kitab yang sama dibuang dulu, jadi menjalankan
 * penggabungan yang sama dua kali menghasilkan isi yang sama. `buang` = nomor kitab usang yang ikut dibersihkan.
 * Bila hasilnya melebihi MAKS_BYTE_BUCKET, segmen BARU dengan halaman terbanyak dibuang (kitab itu ditandai terpotong), isi lama tidak disentuh.
 * @param {Object<string,string>} lama  { batang: string }
 * @param {{no:number, istilah:Map<string, number[][]>}[]} tambahan
 * @returns {{data:Object<string,string>, byte:number, terpotong:number}}
 */
export function gabungBucket(lama, tambahan = [], buang = new Set(), { maksByte = MAKS_BYTE_BUCKET } = {}) {
  const hapus = new Set([...buang, ...tambahan.map((x) => x.no)]);
  const data = {};
  for (const [s, str] of Object.entries(lama || {})) { const sisa = hapus.size ? buangNomor(str, hapus) : str; if (sisa) data[s] = sisa; }
  const baru = [];
  for (const { no, istilah } of tambahan) for (const [s, ps] of istilah) { const seg = kodeSegmen(no, ps); data[s] = data[s] ? `${data[s]}|${seg}` : seg; baru.push({ s, seg }); }
  let byte = byteUtf8(JSON.stringify(data)); let terpotong = 0;
  if (byte > maksByte) {
    baru.sort((a, b) => b.seg.length - a.seg.length);
    for (const { s, seg } of baru) {
      if (byte <= maksByte - 8) break; // selisih pembulatan koma/titik dua; ukuran pasti dihitung ulang sesudah loop
      const sisa = data[s] === seg ? '' : data[s].slice(0, data[s].length - seg.length - 1);
      byte -= byteUtf8(JSON.stringify(s)) + byteUtf8(JSON.stringify(data[s])) + 1 - (sisa ? byteUtf8(JSON.stringify(s)) + byteUtf8(JSON.stringify(sisa)) + 1 : 0);
      if (sisa) data[s] = sisa; else delete data[s];
      terpotong++;
    }
    byte = byteUtf8(JSON.stringify(data));
  }
  return { data, byte, terpotong };
}

/**
 * Kata kunci pertanyaan (kueri utama bobot 1, varian bobot 0.5; larik kata normal seperti di Tanya Kitab) -> [{ stem, bobot }] unik, bobot tertinggi dulu.
 */
export function istilahKueri(kuerian, varian = []) {
  const peta = new Map();
  const tambah = (qs, bobot) => { for (const q of qs || []) for (const w of q || []) { const s = batang(normalCari(w)); if (layak(s)) peta.set(s, Math.max(peta.get(s) || 0, bobot)); } };
  tambah(kuerian, 1); tambah(varian, 0.5);
  return [...peta].map(([stem, bobot]) => ({ stem, bobot })).sort((a, b) => b.bobot - a.bobot).slice(0, MAKS_ISTILAH_KUERI);
}

/**
 * Peringkat kitab untuk satu pertanyaan. Skor halaman = jumlah (bobot x idf x tf/(tf+1,5)) kata yang ada, dikali kelengkapan kata; skor kitab = jumlah 3 halaman terbaiknya
 * (bukan jumlah semua halaman, supaya kitab tebal tidak menang hanya karena tebal).
 * @param {Map<string, {no:number,seq:number,tf:number}[]>} posting  batang -> kemunculan (dari bacaBatang, semua kitab)
 * @param {{stem:string,bobot:number}[]} istilah
 * @param {{idDariNo:Map<number,string>, totalHalaman:number}} konteks  hanya kitab pada idDariNo yang dihitung (kitab nonaktif/usang diabaikan)
 */
export function peringkatKitab(posting, istilah, { idDariNo, totalHalaman }) {
  const sah = (ps) => (ps || []).filter((p) => idDariNo.has(p.no));
  const ada = []; const halaman = new Map();
  for (const t of istilah) {
    const ps = sah(posting.get(t.stem)); if (!ps.length) continue;
    ada.push(t);
    const idf = Math.log(1 + Math.max(1, totalHalaman) / ps.length);
    for (const p of ps) {
      const kunci = p.no * 1_000_000 + p.seq; const h = halaman.get(kunci) || { no: p.no, seq: p.seq, skor: 0, cocok: 0 };
      h.skor += t.bobot * idf * (p.tf / (p.tf + 1.5)); h.cocok++; halaman.set(kunci, h);
    }
  }
  const perKitab = new Map();
  for (const h of halaman.values()) {
    const skor = h.skor * (0.5 + h.cocok / ada.length);
    if (!perKitab.has(h.no)) perKitab.set(h.no, []);
    perKitab.get(h.no).push({ seq: h.seq, skor });
  }
  const kitab = [...perKitab].map(([no, hs]) => {
    hs.sort((a, b) => b.skor - a.skor || a.seq - b.seq);
    return { id: idDariNo.get(no), no, skor: hs.slice(0, 3).reduce((n, x) => n + x.skor, 0), halaman: hs.slice(0, 3) };
  }).sort((a, b) => b.skor - a.skor || a.no - b.no);
  return { kitab, istilahAda: ada.length, istilahTotal: istilah.length };
}

/** Kitab yang layak dibuka: skor paling sedikit `rasio` dari skor teratas, paling banyak `maks`. */
export function pilihDariPeringkat(kitab, { maks = 4, rasio = 0.25 } = {}) {
  if (!kitab || !kitab.length) return [];
  const batas = kitab[0].skor * rasio;
  return kitab.filter((k) => k.skor >= batas).slice(0, maks).map((k) => k.id);
}
