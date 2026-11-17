// Logika murni alat AI di pembaca kitab (web/AlatTeksKitab.jsx, web/PembacaKitab.jsx): teks yang dipilih atau halaman yang tampil -> cakupan teks,
// pemeriksaan kelayakan untuk AI, dan kiriman ke Penyusunan Soal. Tanpa React/DOM agar bisa diuji (test/pilihanBaca.test.js).
import { MAKS_TEKS_SOAL, MAKS_BAB_FORM, namaUntukForm, rentangHal, bagianTeks } from './perpus.js';
import { gabungRujukan, rujukanDariHalaman, RUJUKAN_KOSONG } from './rujukan.js';
import { bahasaOtomatis, hitungAksara } from './bahasa.js';

export const MAKS_TEKS_AI = MAKS_TEKS_SOAL; // 6.000: sama dengan batas server (src/soalService.js MAKS_TEKS) dan kolom Teks Kitab
const MIN_HURUF = 15;                         // sama dengan pemeriksaan di Penyusunan Soal: kurang dari ini bukan satu kalimat lengkap

/** Teks hasil blok layar: buang penanda arah/lebar-nol dan rapikan spasi. Huruf dan harakat TIDAK diubah (kutipan diperiksa terhadap teks ini). */
export function bersihkanPilihan(s) {
  return String(s ?? '')
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\u00a0]+/g, ' ')
    .split('\n').map((l) => l.trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Alasan teks tidak layak untuk terjemah/analisis/fakta (teks Arab), atau null. Cermin pemeriksaan di Penyusunan Soal; server tetap penentu. */
export function masalahTeksArab(teks) {
  if (bahasaOtomatis(teks) !== 'ar') return 'Terjemah, analisis, dan ekstrak fakta hanya tersedia untuk teks Arab.';
  const h = hitungAksara(teks);
  if (h.total < MIN_HURUF) return 'Teks terlalu pendek. Blok minimal satu kalimat lengkap.';
  if (h.arab / h.total < 0.6) return 'Teks terdeteksi campuran Arab dan huruf lain. Blok satu bagian saja.';
  return null;
}

/**
 * Cakupan teks yang akan dikerjakan alat AI.
 * @param {{pilihan?:{teks:string, seqs:number[]}|null, halaman:object[], bagian?:string}} a
 *   pilihan = hasil blok layar (seqs = urutan halaman yang disentuh blok); tanpa pilihan, cakupan = halaman yang sedang tampil.
 * @returns {{mode:'pilihan'|'halaman'|'kosong', teks:string, panjang:number, halaman:object[], terlaluPanjang:boolean}}
 */
export function susunCakupan({ pilihan = null, halaman = [], bagian = 'semua' } = {}) {
  const tampil = (Array.isArray(halaman) ? halaman : []).filter((p) => p && typeof p.teks === 'string');
  const pil = pilihan ? bersihkanPilihan(pilihan.teks) : '';
  if (pil) {
    const seqs = new Set((pilihan.seqs || []).filter(Number.isInteger));
    const dipakai = tampil.filter((p) => seqs.has(p.seq));
    return { mode: 'pilihan', teks: pil, panjang: pil.length, halaman: dipakai.length ? dipakai : tampil, terlaluPanjang: pil.length > MAKS_TEKS_AI };
  }
  const teks = bersihkanPilihan(tampil.map((p) => bagianTeks(p, bagian)).filter(Boolean).join('\n'));
  if (!teks) return { mode: 'kosong', teks: '', panjang: 0, halaman: tampil, terlaluPanjang: false };
  return { mode: 'halaman', teks, panjang: teks.length, halaman: tampil, terlaluPanjang: teks.length > MAKS_TEKS_AI };
}

/** Pesan untuk pengguna bila cakupan belum bisa dikirim ke AI (terjemah/analisis/fakta), atau null. */
export function masalahCakupan(c) {
  if (!c || c.mode === 'kosong') return 'Halaman belum memuat teks.';
  if (c.terlaluPanjang) return `Teks ${c.panjang.toLocaleString('id-ID')} karakter, melebihi batas ${MAKS_TEKS_AI.toLocaleString('id-ID')}. Blok sebagian teks saja.`;
  return masalahTeksArab(c.teks);
}

/** Urutan halaman yang disentuh sebuah blok layar, dari nilai `data-seq` simpul awal dan akhir blok (simpul di luar halaman = null). */
export function urutanDariSimpul(awal, akhir) {
  const a = Number.parseInt(awal, 10); const b = Number.parseInt(akhir, 10);
  const ok = (n) => Number.isInteger(n) && n >= 1;
  if (ok(a) && ok(b)) { const lo = Math.min(a, b); const hi = Math.max(a, b); return Array.from({ length: Math.min(hi - lo + 1, 20) }, (_, i) => lo + i); }
  if (ok(a)) return [a];
  if (ok(b)) return [b];
  return [];
}

/**
 * Kiriman ke Penyusunan Soal: isian Rujukan Kitab dari cakupan. Rujukan (kitabId, halId, halIdAkhir) mencakup halaman tempat teks berada,
 * sehingga tautan "Buka di kitab" dan pemeriksa rujukan tetap bekerja walau yang dikirim hanya sebagian halaman.
 */
export function kirimanDariCakupan({ kitab, kitabId, cakupan, katalog = [], babNama = '' }) {
  const hal = cakupan.halaman;
  if (!kitab || !hal.length || !cakupan.teks) return null;
  return {
    nama: namaUntukForm(kitab.judulLatin, katalog),
    juz: String(hal[0].juz ?? ''),
    hal: rentangHal(...hal.map((p) => p.hal)),
    bab: String(babNama || (hal.find((p) => p.bab) || {}).bab || '').slice(0, MAKS_BAB_FORM),
    teks: cakupan.teks,
    rujukan: rujukanDariHalaman(kitabId, hal),
    sebagian: cakupan.mode === 'pilihan',
  };
}

/**
 * Terapkan kiriman ke form soal. Hanya kolom Rujukan Kitab yang berubah; naskah soal tidak disentuh (sama dengan pemilih perpustakaan).
 * tambah = sambung ke teks yang sudah ada (lanjutan bahasan); gagal bila hasilnya melebihi batas teks atau kitabnya berbeda dan tidak dikonfirmasi.
 * @returns {{form:object}|{galat:string}}
 */
export function terapkanKiriman(form, k, { tambah = false } = {}) {
  if (!k) return { galat: 'Tidak ada teks untuk dikirim.' };
  const lama = String(form.teks || '').trim();
  if (tambah && lama) {
    const teks = `${lama}\n${k.teks}`;
    if (teks.length > MAKS_TEKS_AI) return { galat: `Gabungan teks ${teks.length.toLocaleString('id-ID')} karakter, melebihi batas ${MAKS_TEKS_AI.toLocaleString('id-ID')}. Kirim tanpa menambahkan, atau blok teks yang lebih pendek.` };
    return {
      form: {
        ...form, nama: k.nama, juz: form.juz || k.juz, hal: rentangHal(form.hal, k.hal), bab: form.bab || k.bab, teks,
        ...gabungRujukan({ kitabId: form.kitabId, halId: form.halId, halIdAkhir: form.halIdAkhir }, k.rujukan),
        ai: { ...form.ai, buta: '' },
      },
    };
  }
  return {
    form: { ...form, nama: k.nama, juz: k.juz, hal: k.hal, bab: k.bab, teks: k.teks, sumberUrl: '', ...(k.rujukan || RUJUKAN_KOSONG), ai: { ...form.ai, buta: '' } },
  };
}

/** Menambahkan teks dari kitab lain ke teks yang sudah ada mencampur dua kitab dalam satu soal: perlu konfirmasi. */
export const campurKitab = (form, k) => !!(String(form.teks || '').trim() && String(form.nama || '').trim() && k && form.nama.trim().toLowerCase() !== String(k.nama).toLowerCase());
