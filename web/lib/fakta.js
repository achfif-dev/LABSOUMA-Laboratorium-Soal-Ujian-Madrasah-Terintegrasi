// Penghubung antarmuka dengan pipeline soal (src/faktaService.js, web/lib/rencanaSoal.js). Fungsi murni, tanpa jaringan dan tanpa DOM.
import { rencanaKisi, skorCocok } from './rencanaSoal.js';

/** Fakta hasil ekstrak -> bentuk yang dikirim ke /api/generate sebagai `faktaTerikat` (hanya yang dibutuhkan server). */
export function faktaTerikatDari(f) {
  if (!f || typeof f !== 'object') return null;
  return { fakta: String(f.fakta || ''), kutipan: String(f.kutipan || ''), pengecoh: Array.isArray(f.pengecoh) ? f.pengecoh.map(String) : [] };
}

/** Peringatan bila level yang dipilih pengguna berbeda dari level yang paling cocok untuk fakta itu; '' bila sama. Tidak mengubah pilihan pengguna. */
export function peringatanLevel(f, level) {
  if (!f || !level || !f.tingkat_cocok || f.tingkat_cocok === level) return '';
  return skorCocok(f, level) >= 10 ? `Fakta ini lebih cocok untuk ${f.tingkat_cocok}; soal ${level} darinya bisa terasa dangkal atau dipaksakan.` : '';
}

/**
 * Pilih fakta berikutnya yang BELUM dipakai untuk satu soal (bentuk, level), memakai kisi-kisi oleh kode.
 * @returns {{fakta: object|null, habis: boolean}} habis=true bila semua fakta sudah dipakai (lalu dipilih yang paling cocok, ditandai).
 */
export function pilihFaktaBerikut(daftar, terpakai, { bentuk, level }, rand = Math.random) {
  if (!Array.isArray(daftar) || !daftar.length) return { fakta: null, habis: false };
  const pakai = new Set(terpakai || []);
  const sisa = daftar.filter((f) => !pakai.has(f.id));
  const habis = sisa.length === 0;
  const { rencana } = rencanaKisi(habis ? daftar : sisa, [{ bentuk, level }], rand);
  const id = rencana[0] && rencana[0].faktaId;
  return { fakta: (habis ? daftar : sisa).find((f) => f.id === id) || null, habis };
}

/** Teks berubah sejak fakta diekstrak: kutipan dasar bisa tidak berlaku lagi (server memeriksa ulang dan menolak). */
export const faktaBasi = (state, teksSekarang) => !!(state && state.data && state.teks !== teksSekarang);
