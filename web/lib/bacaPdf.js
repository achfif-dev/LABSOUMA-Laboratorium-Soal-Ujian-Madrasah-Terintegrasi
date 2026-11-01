// Membaca PDF di peramban (pdfjs-dist, dimuat malas supaya tidak membebani layar lain). Satu "sesi" membuka dokumen sekali, lalu dipakai untuk:
// teks per halaman + calon judul menurut ukuran huruf, penanda buku (daftar isi bawaan PDF), metadata, dan gambar halaman untuk OCR.
// Sesi WAJIB ditutup (tutup()): dokumen dan halaman yang tak dilepas menahan memori, terutama di ponsel.
import { ErrorSyamilah } from './syamilah.js';
import { rincianHalamanPdf, normalArab } from './sumberLain.js';

export const MAKS_HALAMAN_PDF = 3000;
export const MAKS_B64_GAMBAR = 2_900_000; // di bawah batas server (MAX_GAMBAR_B64 = 3.000.000)
const MAKS_ENTRI_OUTLINE = 3000;
let pustaka = null;
async function muatPdfjs() {
  if (pustaka) return pustaka;
  const [m, worker] = await Promise.all([import('pdfjs-dist/build/pdf.js'), import('pdfjs-dist/build/pdf.worker.min.js?url')]);
  const lib = m.default && m.default.getDocument ? m.default : m;
  lib.GlobalWorkerOptions.workerSrc = worker.default;
  pustaka = lib; return lib;
}
const dibatalkan = () => new ErrorSyamilah('DIBATALKAN', 'Pembacaan dibatalkan.');

// Judul metadata PDF sering sampah ("Microsoft Word - bab1.docx", "Untitled"); hanya dipakai bila tampak seperti judul sungguhan.
const RE_JUDUL_SAMPAH = /^(untitled|microsoft word|microsoft powerpoint|adobe|document|doc\d*|scan\w*|image\w*)\b|\.(docx?|pdf|indd|pub|tmp|txt)$/i;
export const bersihkanMeta = (info) => {
  const i = info && typeof info === 'object' ? info : {};
  const t = normalArab(i.Title || '').slice(0, 300); const a = normalArab(i.Author || '').slice(0, 400);
  return { judul: t.length >= 3 && !RE_JUDUL_SAMPAH.test(t) ? t : '', pengarang: a.length >= 3 && !RE_JUDUL_SAMPAH.test(a) ? a : '' };
};

/** Penanda buku PDF (pohon) -> daftar datar [{ judul, level (1-3), indeks (0-based) }]. Entri yang tujuannya tak terbaca dilewati. */
export async function bacaOutline(doc) {
  let akar; try { akar = await doc.getOutline(); } catch { return []; }
  if (!Array.isArray(akar)) return [];
  const hasil = [];
  const indeksDari = async (dest) => {
    try {
      let d = dest; if (typeof d === 'string') d = await doc.getDestination(d);
      if (!Array.isArray(d) || !d.length) return null;
      const ref = d[0];
      if (Number.isInteger(ref)) return ref;
      if (ref && typeof ref === 'object') return await doc.getPageIndex(ref);
    } catch { /* tujuan rusak: lewati */ }
    return null;
  };
  const jalan = async (daftar, dalam) => {
    for (const o of daftar) {
      if (hasil.length >= MAKS_ENTRI_OUTLINE) return;
      const judul = normalArab((o && o.title) || ''); const indeks = o ? await indeksDari(o.dest) : null;
      if (judul && Number.isInteger(indeks) && indeks >= 0 && indeks < doc.numPages) hasil.push({ judul: judul.slice(0, 300), level: Math.min(3, dalam), indeks });
      if (o && Array.isArray(o.items) && o.items.length) await jalan(o.items, dalam + 1);
    }
  };
  await jalan(akar, 1);
  return hasil;
}

/**
 * Buka PDF. @param {ArrayBuffer} buffer (pdf.js memindahkan isinya ke worker: jangan dipakai lagi sesudahnya) @param {{pustaka?:object}} [opsi] `pustaka` hanya untuk uji.
 * @returns {Promise<{jumlah:number, teksSemua:Function, outline:Function, meta:Function, gambarHalaman:Function, tutup:Function}>}
 */
export async function bukaPdf(buffer, { pustaka: lib = null } = {}) {
  let doc;
  try { doc = await (lib || await muatPdfjs()).getDocument({ data: new Uint8Array(buffer), isEvalSupported: false }).promise; }
  catch (e) { throw new ErrorSyamilah('PDF_RUSAK', e && e.name === 'PasswordException' ? 'PDF dilindungi kata sandi.' : 'Berkas PDF tidak bisa dibuka (rusak atau bukan PDF).'); }
  if (doc.numPages > MAKS_HALAMAN_PDF) { try { doc.destroy(); } catch { /* abaikan */ } throw new ErrorSyamilah('PDF_TERLALU_BESAR', `PDF berisi ${doc.numPages} halaman (maksimal ${MAKS_HALAMAN_PDF}). Pecah per jilid lalu impor satu per satu.`); }
  return {
    jumlah: doc.numPages,
    /** @returns {Promise<{teks:string[], judulUkuran:{teks:string,rasio:number}[][]}>} */
    async teksSemua({ onProgres = () => {}, batal = () => false } = {}) {
      const teks = []; const judulUkuran = [];
      for (let i = 1; i <= doc.numPages; i++) {
        if (batal()) throw dibatalkan();
        const hal = await doc.getPage(i);
        try { const r = rincianHalamanPdf((await hal.getTextContent()).items); teks.push(r.teks); judulUkuran.push(r.judul); }
        finally { try { hal.cleanup(); } catch { /* abaikan */ } }
        onProgres(i, doc.numPages);
      }
      return { teks, judulUkuran };
    },
    outline: () => bacaOutline(doc),
    async meta() { try { return bersihkanMeta((await doc.getMetadata()).info); } catch { return { judul: '', pengarang: '' }; } },
    /** Gambar halaman (0-based) sebagai JPEG base64 untuk OCR. Resolusi dan mutu diturunkan bertahap sampai muat di batas server. */
    async gambarHalaman(indeks, { lebar = 1600, mutu = 0.82 } = {}) {
      const hal = await doc.getPage(indeks + 1);
      const kanvas = document.createElement('canvas');
      try {
        const dasar = hal.getViewport({ scale: 1 });
        let skala = Math.min(3, Math.max(0.5, lebar / dasar.width)); let q = mutu;
        for (let coba = 0; coba < 4; coba++) {
          const vp = hal.getViewport({ scale: skala });
          kanvas.width = Math.ceil(vp.width); kanvas.height = Math.ceil(vp.height);
          const ctx = kanvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, kanvas.width, kanvas.height);
          await hal.render({ canvasContext: ctx, viewport: vp }).promise;
          const data = kanvas.toDataURL('image/jpeg', q).split(',')[1] || '';
          if (data.length <= MAKS_B64_GAMBAR) return { mime: 'image/jpeg', data };
          skala *= 0.8; q = Math.max(0.55, q - 0.08);
        }
        throw new ErrorSyamilah('GAMBAR_TERLALU_BESAR', `Halaman PDF ke-${indeks + 1} terlalu besar untuk dikirim ke OCR.`);
      } finally { kanvas.width = 0; kanvas.height = 0; try { hal.cleanup(); } catch { /* abaikan */ } }
    },
    tutup() { try { doc.destroy(); } catch { /* abaikan */ } },
  };
}

/** @param {ArrayBuffer} buffer @param {(n:number,total:number)=>void} [onProgres] @returns {Promise<string[]>} teks tiap halaman PDF (antarmuka lama, dipertahankan) */
export async function teksPerHalamanPdf(buffer, onProgres = () => {}) {
  const sesi = await bukaPdf(buffer);
  try { return (await sesi.teksSemua({ onProgres })).teks; } finally { sesi.tutup(); }
}
