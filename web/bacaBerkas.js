import { muatDocx } from './lib/muatDocx.js';

/* ---------- App ---------- */
/* ---------- Pegonizer: alih aksara Latin ke Pegon (standar al-Qolam '24), mesin aturan di browser + bantuan AI lewat server ---------- */
// Pustaka berat dimuat malas dari paket npm (ikut dibundel Vite, dipisah jadi potongan sendiri); bukan lagi dari CDN.
const muatMammoth = async () => { const m = await import('mammoth/mammoth.browser.min.js'); return m.extractRawText ? m : m.default; };

const muatPdfjs = async () => {
  const [m, worker] = await Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'), import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')]);
  const lib = m.getDocument ? m : m.default;
  lib.GlobalWorkerOptions.workerSrc = worker.default;
  return lib;
};

export async function bacaFile(file) {
  const nama = file.name.toLowerCase();
  if (nama.endsWith('.docx')) {
    const mammoth = await muatMammoth();
    return { teks: (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value, arab: false };
  }
  if (file.type === 'application/pdf' || nama.endsWith('.pdf')) {
    const pdfjsLib = await muatPdfjs();
    const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
    const halaman = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const content = await (await doc.getPage(i)).getTextContent();
      let out = '', lastY = null, lastH = 12;
      for (const it of content.items) {
        const y = it.transform[5], h = Math.abs(it.transform[3]) || 12;
        if (lastY !== null && Math.abs(y - lastY) > 2) out += Math.abs(y - lastY) > lastH * 1.7 ? '\n\n' : ' ';
        out += it.str; lastY = y; lastH = h;
      }
      halaman.push(out.replace(/ {2,}/g, ' ').trim());
    }
    const teks = halaman.join('\n\n');
    return { teks, arab: /[\u0600-\u06ff\ufb50-\ufdff\ufe70-\ufeff]/.test(teks) };
  }
  throw { code: 'FILE', message: 'Format file tidak didukung. Gunakan .docx atau .pdf.' };
}

// Foto diperkecil di browser (maks. 1600 px bawaan, JPEG) agar muat dalam batas isi permintaan server.
export const siapkanFoto = (file, maksPx = 1600) => new Promise((res, rej) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const k = Math.min(1, maksPx / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    res({ mime: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.85).split(',')[1] });
  };
  img.onerror = () => { URL.revokeObjectURL(url); rej({ code: 'FILE', message: 'Foto tidak bisa dibaca. Coba foto lain.' }); };
  img.src = url;
});

export const pegonDocx = async (teks) => {
  const D = await muatDocx();
  const paras = String(teks || '').split(/\n+/).filter((p) => p.trim()).map((p) => new D.Paragraph({
    bidirectional: true, spacing: { after: 160 },
    children: [new D.TextRun({ text: p, font: 'Traditional Arabic', size: 36, rightToLeft: true })],
  }));
  return D.Packer.toBlob(new D.Document({ sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: paras }] }));
};
