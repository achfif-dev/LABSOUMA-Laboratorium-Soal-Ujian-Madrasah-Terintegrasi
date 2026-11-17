// Merapikan cadangan lama di folder Drive "LABSOUMA Backup". Fungsi murni; sumber tunggal untuk browser (web/BackupTab.jsx) dan tes.
//
// Pengaman: hanya berkas bernama pola cadangan (soal biasa atau Bank Soal Manual) yang pernah dipertimbangkan; berkas lain di folder (termasuk
// cadangan "Soal Saya" milik ustadz, yang punya aturan simpan 14 hari sendiri) tidak pernah masuk daftar hapus. Yang terbaru SELALU dipertahankan
// (paling sedikit MIN_SIMPAN): setiap cadangan berkas lengkap, jadi yang terbaru sudah memuat semua soal, termasuk soal terarsip.
import { NAMA_BERKAS_CADANGAN } from './drive.js';
import { NAMA_CADANGAN_LUAR } from './berkasLuar.js';

export const MIN_SIMPAN = 2;
export const SIMPAN_PILIHAN = [2, 3, 5, 10, 30];
export const SIMPAN_AWAL = 5;
export const POLA = { soal: NAMA_BERKAS_CADANGAN, luar: NAMA_CADANGAN_LUAR };

const jumlahSimpan = (n) => { const x = Math.floor(Number(n)); return Number.isFinite(x) ? Math.max(MIN_SIMPAN, x) : null; };

/**
 * Berkas cadangan jenis `jenis` ('soal' | 'luar') di luar `simpan` terbaru. Urutan menurut nama (memuat tanggal dan jam), bukan waktu ubah Drive,
 * karena waktu ubah ikut berubah bila berkas ditimpa atau dipulihkan. `simpan` tidak sah -> tidak ada yang dihapus.
 */
export function kandidatRapikan(files, jenis, simpan = SIMPAN_AWAL) {
  const pola = POLA[jenis]; const n = jumlahSimpan(simpan);
  if (!pola || n === null) return [];
  const l = (files || []).filter((f) => f && f.id && pola.test(String(f.name || ''))).sort((a, b) => (a.name < b.name ? 1 : a.name > b.name ? -1 : 0));
  return l.slice(n);
}

/** Hapus kandidat satu per satu; kegagalan satu berkas tidak menghentikan yang lain. Token kedaluwarsa/cabut (DRIVE_TOKEN) dilempar ulang. */
export async function hapusKandidat(drive, daftar) {
  let dihapus = 0; const gagal = [];
  for (const f of daftar) {
    try { await drive.hapus(f.id); dihapus++; } catch (e) { if (e && e.code === 'DRIVE_TOKEN') throw e; gagal.push(f.name); }
  }
  return { dihapus, gagal };
}
