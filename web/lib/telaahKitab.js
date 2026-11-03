// Tahap 1: tanya-jawab bersumber atas perpustakaan. Bagian murni (tanpa jaringan, tanpa AI): membersihkan rencana pencarian, dan MEMVERIFIKASI kutipan.
// Prinsip: jawaban AI hanya dianggap sah sejauh tiap butir dasarnya (kutipan Arab) benar-benar ada di halaman yang dikutip. Yang tidak cocok ditandai, bukan dipercaya.
import { siapkanKueri } from './cariKitab.js';
import { periksaKutipan, ekstrakKutipan, MIN_KATA } from './kutipan.js';
import { nisbahArab } from './bahasa.js';

export const MAKS_PERTANYAAN = 500;
export const MAKS_KITAB_TANYA = 4;     // kitab yang dicari per pertanyaan (tiap kitab = puluhan pembacaan Firestore bila indeksnya belum di memori)
export const MAKS_HALAMAN_JAWAB = 6;   // halaman yang dibacakan ke AI
export const MAKS_TEKS_HALAMAN = 3500; // karakter per halaman yang dikirim ke AI (verifikasi tetap memakai halaman utuh)
export const MAKS_KUERI = 4;
export const MAKS_KATA_PER_KUERI = 4;

/** Rencana AI (kueri berupa teks) -> larik larik kata normal. Kueri kosong dibuang; duplikat dibuang. */
export function bersihkanRencana(kueri) {
  const lihat = new Set(); const hasil = [];
  for (const k of (Array.isArray(kueri) ? kueri : []).slice(0, MAKS_KUERI * 2)) {
    const kata = siapkanKueri(String(k == null ? '' : k)).kata.slice(0, MAKS_KATA_PER_KUERI);
    const kunci = kata.join(' ');
    if (kata.length && !lihat.has(kunci)) { lihat.add(kunci); hasil.push(kata); }
    if (hasil.length >= MAKS_KUERI) break;
  }
  return hasil;
}

/** Pertanyaan yang sudah berbahasa Arab langsung jadi kueri (tanpa panggilan AI). */
export const pertanyaanArab = (q) => nisbahArab(String(q || '')) >= 0.5;

/**
 * Verifikasi tiap butir jawaban terhadap halaman yang dibacakan.
 * @param {{pernyataan:string, halaman_id:string, kutipan:string}[]} poin
 * @param {Map<string,{teks:string}>} halaman  id (mis. "H1") -> halaman (teks utuh)
 * @returns {Array<{pernyataan,kutipan,halamanId,status:'cocok'|'mirip'|'tidak_cocok'|'tanpa_kutipan'|'halaman_tidak_dikenal',dikoreksi?:boolean,terdekat?:string}>}
 */
export function verifikasiPoin(poin, halaman) {
  const periksa = (kutipan, teks) => {
    if (!ekstrakKutipan(kutipan, MIN_KATA).length) return { status: 'tanpa_kutipan' };
    const r = periksaKutipan({ kutipan }, teks);
    const d = r.detail || [];
    if (!d.length) return { status: 'tanpa_kutipan' };
    if (d.some((x) => x.status === 'tidak_ditemukan')) return { status: 'tidak_cocok', terdekat: (d.find((x) => x.terdekat) || {}).terdekat };
    return { status: d.some((x) => x.status === 'mirip') ? 'mirip' : 'cocok' };
  };
  return (Array.isArray(poin) ? poin : []).map((p) => {
    const kutipan = String((p && p.kutipan) || '').trim(); const pernyataan = String((p && p.pernyataan) || '').trim();
    const id = String((p && p.halaman_id) || '').trim();
    const dasar = { pernyataan, kutipan, halamanId: id };
    const sasaran = halaman.get(id);
    if (!sasaran) { // id tidak dikenal: cari di halaman lain yang dibacakan sebelum menyerah
      for (const [lain, h] of halaman) { const r = periksa(kutipan, h.teks); if (r.status === 'cocok' || r.status === 'mirip') return { ...dasar, halamanId: lain, status: r.status, dikoreksi: true }; }
      return { ...dasar, status: 'halaman_tidak_dikenal' };
    }
    const r = periksa(kutipan, sasaran.teks);
    if (r.status === 'tidak_cocok') { // AI keliru menyebut halamannya: kutipan yang benar-benar ada di halaman lain tetap sah, dengan rujukan dikoreksi
      for (const [lain, h] of halaman) { if (lain === id) continue; const r2 = periksa(kutipan, h.teks); if (r2.status === 'cocok' || r2.status === 'mirip') return { ...dasar, halamanId: lain, status: r2.status, dikoreksi: true }; }
    }
    return { ...dasar, status: r.status, ...(r.terdekat ? { terdekat: r.terdekat } : {}) };
  });
}

/** Status keseluruhan jawaban. `sah` = cocok atau mirip. Tanpa satu pun butir sah, jawaban tidak ditampilkan (gagal-tertutup). */
export function ringkasVerifikasi(poinTerverifikasi, cukup) {
  const hitung = { cocok: 0, mirip: 0, tidak_cocok: 0, lain: 0 };
  for (const p of poinTerverifikasi) { if (p.status === 'cocok') hitung.cocok++; else if (p.status === 'mirip') hitung.mirip++; else if (p.status === 'tidak_cocok') hitung.tidak_cocok++; else hitung.lain++; }
  const sah = hitung.cocok + hitung.mirip;
  let status;
  if (!cukup || !poinTerverifikasi.length) status = 'tidak_ditemukan';
  else if (!sah) status = 'tidak_terverifikasi';
  else if (sah === poinTerverifikasi.length && !hitung.mirip) status = 'terverifikasi';
  else status = 'sebagian';
  return { status, ...hitung, sah };
}
