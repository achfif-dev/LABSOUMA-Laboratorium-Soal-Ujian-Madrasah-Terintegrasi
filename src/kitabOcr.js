// OCR satu halaman PDF kitab pindai untuk impor perpustakaan (khusus admin, dipanggil dari api/kitab.js aksi "impor-ocr").
// Memakai pembaca foto kitab yang sama (src/fotoKitab.js): salin setia, lewati nomor halaman/header/catatan kaki, tandai kata meragukan.
// Berbeda dengan /api/assist aksi fotokitab: TIDAK memakai kuota AI per pengguna (satu kitab bisa ratusan halaman dan akan menghabiskan kuota harian
// admin); gantinya batas laju sendiri di api/kitab.js (LIMIT_OCR_PER_MINUTE, LIMIT_OCR_PER_DAY). Hanya teks Arab: pembaca ini menolak teks tanpa huruf Arab.
import { fotoKitab } from './fotoKitab.js';
import { validateFoto } from './pegonService.js';

export { validateFoto };

/** @returns {Promise<{teks:string, kualitas:'jelas'|'sedang'|'buruk', jumlahRagu:number}>} */
export async function aksiOcr(body, deps = {}) {
  const r = await fotoKitab({ gambar: body && body.gambar, penuh: true }, deps);
  return { teks: r.teks, kualitas: r.kualitas, jumlahRagu: r.ragu.length };
}
