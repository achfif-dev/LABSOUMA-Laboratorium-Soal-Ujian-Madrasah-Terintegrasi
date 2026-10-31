// Pembaca .docx tanpa dependensi (browser dan Node): membuka ZIP lewat DecompressionStream, lalu mengambil paragraf dari word/document.xml.
// Hanya yang dibutuhkan impor kitab: teks per paragraf, tingkat judul (gaya Heading1..9), dan apakah paragraf seluruhnya tebal.
// Tidak membaca tabel bersarang, catatan kaki Word, gambar, atau komentar (pada berkas Syamilah yang diuji, semuanya kosong).
import { ErrorSyamilah } from './syamilah.js';

const u32 = (dv, o) => dv.getUint32(o, true);
const u16 = (dv, o) => dv.getUint16(o, true);

async function inflasi(data) {
  if (typeof DecompressionStream === 'undefined') throw new ErrorSyamilah('DOCX_TIDAK_DIDUKUNG', 'Peramban ini belum bisa membuka .docx. Perbarui peramban, atau simpan kitab sebagai .txt UTF-8.');
  const s = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

/** Ambil satu berkas dari ZIP (metode simpan atau deflate). Mengembalikan Uint8Array, atau null bila tidak ada. */
export async function bacaBerkasZip(buffer, nama) {
  const b = new Uint8Array(buffer); const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let e = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (u32(dv, i) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new ErrorSyamilah('DOCX_RUSAK', 'Berkas bukan .docx yang valid (bukan arsip ZIP).');
  let n = u16(dv, e + 10); let p = u32(dv, e + 16);
  const dec = new TextDecoder();
  for (; n > 0 && p + 46 <= b.length && u32(dv, p) === 0x02014b50; n--) {
    const metode = u16(dv, p + 10); const ukuranKompres = u32(dv, p + 20); const lh = u32(dv, p + 42);
    const pn = u16(dv, p + 28); const px = u16(dv, p + 30); const pk = u16(dv, p + 32);
    const nm = dec.decode(b.subarray(p + 46, p + 46 + pn));
    if (nm === nama) {
      if (ukuranKompres === 0xffffffff || lh === 0xffffffff) throw new ErrorSyamilah('DOCX_RUSAK', 'Berkas terlalu besar (ZIP64 tidak didukung).');
      if (u32(dv, lh) !== 0x04034b50) throw new ErrorSyamilah('DOCX_RUSAK', 'Berkas .docx rusak (header lokal).');
      const mulai = lh + 30 + u16(dv, lh + 26) + u16(dv, lh + 28);
      const data = b.subarray(mulai, mulai + ukuranKompres);
      if (metode === 0) return data;
      if (metode === 8) return inflasi(data);
      throw new ErrorSyamilah('DOCX_RUSAK', `Metode kompresi ZIP ${metode} tidak didukung.`);
    }
    p += 46 + pn + px + pk;
  }
  return null;
}

const ENTITAS = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const dekode = (s) => s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-z]+);/g, (m, k) => {
  if (k[0] === '#') { const c = k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10); return Number.isFinite(c) && c > 0 && c <= 0x10ffff ? String.fromCodePoint(c) : m; }
  return k in ENTITAS ? ENTITAS[k] : m;
});
const RE_PARAGRAF = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
const RE_RUN = /<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g;
const RE_TEKS = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\s*\/>|<w:br\s*\/>/g;
const TEBAL = /<w:b(?:\s+w:val="(?:1|true|on)")?\s*\/>/;

/** document.xml -> [{ teks, tingkat, tebal }]. `tingkat` 0 = paragraf biasa, 1..9 = Heading1..9. */
export function paragrafDariXml(xml) {
  const hasil = [];
  for (const p of xml.match(RE_PARAGRAF) || []) {
    const gaya = /<w:pStyle\s+w:val="Heading(\d)"/.exec(p);
    let teks = ''; let tebalChar = 0; let total = 0;
    for (const r of p.match(RE_RUN) || []) {
      let t = '';
      for (const m of r.matchAll(RE_TEKS)) t += m[1] !== undefined ? dekode(m[1]) : (m[0].startsWith('<w:tab') ? '\t' : '\n');
      if (!t) continue;
      teks += t; const n = t.replace(/\s/g, '').length; total += n;
      if (TEBAL.test((/<w:rPr>[\s\S]*?<\/w:rPr>/.exec(r) || [''])[0])) tebalChar += n;
    }
    hasil.push({ teks, tingkat: gaya ? Number(gaya[1]) : 0, tebal: total > 0 && tebalChar / total >= 0.95 });
  }
  return hasil;
}

/** ArrayBuffer .docx -> paragraf. */
export async function bacaDocx(buffer) {
  const data = await bacaBerkasZip(buffer, 'word/document.xml');
  if (!data) throw new ErrorSyamilah('DOCX_RUSAK', 'Berkas ini bukan dokumen Word (word/document.xml tidak ditemukan).');
  return paragrafDariXml(new TextDecoder('utf-8').decode(data));
}
