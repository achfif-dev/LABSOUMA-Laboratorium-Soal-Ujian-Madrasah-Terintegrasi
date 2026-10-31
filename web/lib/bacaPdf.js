// Membaca lapisan teks PDF di peramban (pdfjs-dist, dimuat malas supaya tidak membebani layar lain). Hasilnya teks per halaman PDF,
// siap diberikan ke parsePdf (web/lib/sumberLain.js). PDF pindai (tanpa lapisan teks) ditolak oleh parsePdf dengan petunjuk OCR.
import { ErrorSyamilah } from './syamilah.js';
import { teksHalamanPdf } from './sumberLain.js';

export const MAKS_HALAMAN_PDF = 3000;
let pustaka = null;
async function muatPdfjs() {
  if (pustaka) return pustaka;
  const [m, worker] = await Promise.all([import('pdfjs-dist/build/pdf.js'), import('pdfjs-dist/build/pdf.worker.min.js?url')]);
  const lib = m.default && m.default.getDocument ? m.default : m;
  lib.GlobalWorkerOptions.workerSrc = worker.default;
  pustaka = lib; return lib;
}

/** @param {ArrayBuffer} buffer @param {(n:number,total:number)=>void} [onProgres] @returns {Promise<string[]>} teks tiap halaman PDF */
export async function teksPerHalamanPdf(buffer, onProgres = () => {}) {
  let doc;
  try { doc = await (await muatPdfjs()).getDocument({ data: new Uint8Array(buffer), isEvalSupported: false }).promise; }
  catch (e) { throw new ErrorSyamilah('PDF_RUSAK', e && e.name === 'PasswordException' ? 'PDF dilindungi kata sandi.' : 'Berkas PDF tidak bisa dibuka (rusak atau bukan PDF).'); }
  if (doc.numPages > MAKS_HALAMAN_PDF) throw new ErrorSyamilah('PDF_TERLALU_BESAR', `PDF berisi ${doc.numPages} halaman (maksimal ${MAKS_HALAMAN_PDF}). Pecah per jilid lalu impor satu per satu.`);
  const hasil = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const isi = await (await doc.getPage(i)).getTextContent();
    hasil.push(teksHalamanPdf(isi.items));
    onProgres(i, doc.numPages);
  }
  return hasil;
}
