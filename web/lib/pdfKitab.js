// Alur membaca PDF kitab: teks per halaman + penanda buku + judul menurut ukuran huruf + metadata -> (opsional) OCR AI untuk halaman pindai/rusak -> parsePdf.
// Dipanggil dari bacaDokumenKitab. Tanpa DOM: pembuka PDF (`bukaPdf`) dan pemanggil OCR (`ocr.panggil`) dioper dari luar, sehingga bisa diuji.
import { ErrorSyamilah } from './syamilah.js';
import { parsePdf } from './sumberLain.js';
import { nilaiHalamanPdf } from './kualitasKitab.js';
import { jalankanOcr, MAKS_HALAMAN_OCR } from './ocrPdf.js';

/**
 * @param {object} o
 * @param {string} o.nama @param {ArrayBuffer} o.buffer @param {number} o.halAwal @param {boolean} o.halAwalEksplisit
 * @param {Function} [o.bacaPdf]  antarmuka lama (uji/injeksi): ArrayBuffer -> string[] | { teks, outline?, judulUkuran?, meta? }. Tanpa OCR.
 * @param {Function} [o.bukaPdf]  pembuka sesi PDF (bawaan: web/lib/bacaPdf.js, dimuat malas)
 * @param {(p:{tahap:'teks'|'ocr', n:number, total:number})=>void} [o.onProgres] @param {()=>boolean} [o.batal]
 * @param {'auto'|'tutup'} [o.kolom]  'auto' (bawaan) membaca halaman dua kolom prosa per kolom; 'tutup' = tetap per baris (mis. nazham). @param {boolean} [o.paragraf]  gabungkan baris visual menjadi paragraf (bawaan ya)
 * @param {{mode?:'perlu'|'semua', panggil:Function, simpanan?:object, konkuren?:number, tidur?:Function}|null} [o.ocr]  bila diisi, halaman bernilai kosong/rusak (atau semua, mode 'semua') dibaca dengan OCR AI
 */
export async function bacaPdfKitab({ nama = '', buffer, halAwal = 1, halAwalEksplisit = false, bacaPdf = null, bukaPdf = null, onProgres = () => {}, batal = () => false, ocr = null, kolom = 'auto', paragraf = true }) {
  const dasar = { halAwal, halAwalEksplisit, namaBerkas: nama };
  if (bacaPdf) {
    const r = await bacaPdf(buffer); const d = Array.isArray(r) ? { teks: r } : (r || {});
    return parsePdf(d.teks, { ...dasar, outline: d.outline, judulUkuran: d.judulUkuran, meta: d.meta });
  }
  const buka = bukaPdf || (await import('./bacaPdf.js')).bukaPdf;
  const sesi = await buka(buffer);
  try {
    const { teks, judulUkuran, halamanDuaKolom, barisDigabung } = await sesi.teksSemua({ onProgres: (n, total) => onProgres({ tahap: 'teks', n, total }), batal, kolom, paragraf });
    const [outline, meta] = await Promise.all([sesi.outline(), sesi.meta()]);
    const dioCr = []; let laporanOcr = null;
    if (ocr) {
      const mode = ocr.mode === 'semua' ? 'semua' : 'perlu';
      const sasaran = teks.map((t, i) => (mode === 'semua' || nilaiHalamanPdf(t) !== 'teks' ? i : -1)).filter((i) => i >= 0);
      if (sasaran.length > MAKS_HALAMAN_OCR) throw new ErrorSyamilah('OCR_TERLALU_BANYAK', `${sasaran.length} halaman perlu OCR, melebihi batas ${MAKS_HALAMAN_OCR} per impor. Pecah PDF per jilid lalu impor satu per satu.`);
      if (sasaran.length) {
        const r = await jalankanOcr({ indeks: sasaran, ambilGambar: (i) => sesi.gambarHalaman(i), panggil: ocr.panggil, konkuren: ocr.konkuren, tidur: ocr.tidur, simpanan: ocr.simpanan || null, batal, onProgres: (n, total) => onProgres({ tahap: 'ocr', n, total }) });
        if (r.dibatalkan) throw new ErrorSyamilah('DIBATALKAN', 'Pembacaan dibatalkan.');
        for (const [i, t] of r.teks) { teks[i] = t; dioCr.push(i); }
        laporanOcr = { dicoba: sasaran.length, dariSimpanan: r.dariSimpanan, berhasil: r.teks.size, kosong: r.kosong.length, gagal: r.gagal, kuotaHabis: r.kuotaHabis, buruk: [...r.kualitas.values()].filter((k) => k === 'buruk').length, sedang: [...r.kualitas.values()].filter((k) => k === 'sedang').length };
      }
    }
    let hasil;
    try { hasil = parsePdf(teks, { ...dasar, outline, judulUkuran, meta, ocr: dioCr }); }
    catch (e) {
      if (laporanOcr && e instanceof ErrorSyamilah && e.kode === 'PDF_TANPA_TEKS') {
        throw new ErrorSyamilah('OCR_GAGAL', `OCR tidak menghasilkan teks yang cukup (${laporanOcr.gagal.length} halaman gagal${laporanOcr.gagal[0] ? `, mis.: ${laporanOcr.gagal[0].pesan}` : ''}${laporanOcr.kuotaHabis ? '; kuota OCR harian habis' : ''}). Coba lagi nanti atau gunakan sumber lain.`);
      }
      throw e;
    }
    if (laporanOcr) hasil.laporan.ocr = laporanOcr;
    hasil.laporan.halamanDuaKolom = halamanDuaKolom || 0; hasil.laporan.barisDigabung = barisDigabung || 0;
    return hasil;
  } finally { sesi.tutup(); }
}
