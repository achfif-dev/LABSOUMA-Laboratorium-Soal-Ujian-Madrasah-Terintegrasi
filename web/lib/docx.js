// Pembaca .docx tanpa dependensi (browser dan Node): membuka ZIP lewat DecompressionStream, lalu mengambil paragraf dari word/document.xml.
// Hanya yang dibutuhkan impor kitab: teks per paragraf, tingkat judul (gaya Heading1..9), dan apakah paragraf seluruhnya tebal.
// Tidak membaca tabel bersarang, catatan kaki Word, gambar, atau komentar (pada berkas Syamilah yang diuji, semuanya kosong).
import { ErrorSyamilah } from './syamilah.js';

const u32 = (dv, o) => dv.getUint32(o, true);
const u16 = (dv, o) => dv.getUint16(o, true);

// Batas ukuran isi SESUDAH dibuka: berkas ZIP kecil bisa mengembang ratusan kali lipat ("zip bomb") dan mematikan peramban ponsel.
// document.xml kitab tebal (ribuan halaman) kira-kira 30-60 MB; 150 MB memberi ruang lega.
export const MAKS_BYTE_DIBUKA = 150 * 1024 * 1024;
const terlaluBesar = (maks) => new ErrorSyamilah('DOCX_TERLALU_BESAR', `Isi berkas setelah dibuka melebihi ${Math.round(maks / 1048576)} MB, terlalu besar untuk dibaca di peramban. Pecah per jilid atau simpan sebagai .txt UTF-8.`);

async function inflasi(data, maks = MAKS_BYTE_DIBUKA) {
  if (typeof DecompressionStream === 'undefined') throw new ErrorSyamilah('DOCX_TIDAK_DIDUKUNG', 'Peramban ini belum bisa membuka .docx. Perbarui peramban, atau simpan kitab sebagai .txt UTF-8.');
  const pembaca = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const bagian = []; let total = 0;
  for (;;) {
    const { done, value } = await pembaca.read();
    if (done) break;
    total += value.byteLength;
    if (total > maks) { try { await pembaca.cancel(); } catch { /* abaikan */ } throw terlaluBesar(maks); }
    bagian.push(value);
  }
  const hasil = new Uint8Array(total); let o = 0;
  for (const c of bagian) { hasil.set(c, o); o += c.byteLength; }
  return hasil;
}

/** Ambil satu berkas dari ZIP (metode simpan atau deflate). Mengembalikan Uint8Array, atau null bila tidak ada. */
export async function bacaBerkasZip(buffer, nama, { maks = MAKS_BYTE_DIBUKA } = {}) {
  const b = new Uint8Array(buffer); const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let e = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (u32(dv, i) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new ErrorSyamilah('DOCX_RUSAK', 'Berkas bukan .docx yang valid (bukan arsip ZIP).');
  let n = u16(dv, e + 10); let p = u32(dv, e + 16);
  const dec = new TextDecoder();
  for (; n > 0 && p + 46 <= b.length && u32(dv, p) === 0x02014b50; n--) {
    const metode = u16(dv, p + 10); const ukuranKompres = u32(dv, p + 20); const ukuranAsli = u32(dv, p + 24); const lh = u32(dv, p + 42);
    const pn = u16(dv, p + 28); const px = u16(dv, p + 30); const pk = u16(dv, p + 32);
    const nm = dec.decode(b.subarray(p + 46, p + 46 + pn));
    if (nm === nama) {
      if (ukuranKompres === 0xffffffff || lh === 0xffffffff) throw new ErrorSyamilah('DOCX_RUSAK', 'Berkas terlalu besar (ZIP64 tidak didukung).');
      if (u32(dv, lh) !== 0x04034b50) throw new ErrorSyamilah('DOCX_RUSAK', 'Berkas .docx rusak (header lokal).');
      const mulai = lh + 30 + u16(dv, lh + 26) + u16(dv, lh + 28);
      const data = b.subarray(mulai, mulai + ukuranKompres);
      if (ukuranAsli !== 0xffffffff && ukuranAsli > maks) throw terlaluBesar(maks); // ukuran yang diumumkan arsip; tetap dijaga lagi saat membuka karena bisa dipalsukan
      if (metode === 0) { if (data.length > maks) throw terlaluBesar(maks); return data; }
      if (metode === 8) return inflasi(data, maks);
      throw new ErrorSyamilah('DOCX_RUSAK', `Metode kompresi ZIP ${metode} tidak didukung.`);
    }
    p += 46 + pn + px + pk;
  }
  return null;
}

/** Daftar nama berkas di dalam ZIP (array string; kosong bila bukan ZIP). Dipakai pembaca EPUB untuk memastikan arsipnya sah sebelum diurai. */
export function namaBerkasZip(buffer) {
  const b = new Uint8Array(buffer); if (b.length < 22) return [];
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let e = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (u32(dv, i) === 0x06054b50) { e = i; break; }
  if (e < 0) return [];
  const hasil = []; const dec = new TextDecoder();
  let n = u16(dv, e + 10); let p = u32(dv, e + 16);
  for (; n > 0 && p + 46 <= b.length && u32(dv, p) === 0x02014b50; n--) {
    const pn = u16(dv, p + 28); const px = u16(dv, p + 30); const pk = u16(dv, p + 32);
    hasil.push(dec.decode(b.subarray(p + 46, p + 46 + pn)));
    p += 46 + pn + px + pk;
  }
  return hasil;
}

const ENTITAS = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const dekode = (s) => s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-z]+);/g, (m, k) => {
  if (k[0] === '#') { const c = k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10); return Number.isFinite(c) && c > 0 && c <= 0x10ffff ? String.fromCodePoint(c) : m; }
  return k in ENTITAS ? ENTITAS[k] : m;
});
const RE_PARAGRAF = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
const RE_RUN = /<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g;
const RE_TEKS = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\s*\/>|<w:br\s+w:type="page"\s*\/?>|<w:br\s*\/>/g;
const TEBAL = /<w:b(?:\s+w:val="(?:1|true|on)")?\s*\/>/;

// Word menyimpan kotak teks dua kali: `mc:Choice` (bentuk modern) dan `mc:Fallback` (salinan untuk Word lama). Hanya Choice yang dibaca, supaya teksnya tidak ganda.
const buangFallback = (xml) => xml.replace(/<mc:Fallback\b[^>]*>[\s\S]*?<\/mc:Fallback>/g, '');
const SEKSI_BERIKUT = /<w:sectPr\b[\s\S]*?<\/w:sectPr>/;
const JEDA = { teks: '', tingkat: 0, tebal: false, jeda: true };

/**
 * document.xml -> [{ teks, tingkat, tebal }]. `tingkat` 0 = paragraf biasa, 1..9 = Heading1..9.
 * Pemisah halaman Word (`w:br w:type="page"`, `w:pageBreakBefore`, akhir seksi "halaman berikutnya") menjadi entri `{ teks:'', jeda:true }`:
 * dokumen hasil konversi PDF ke Word biasanya tidak punya penanda `[ص N]`, tetapi punya pemisah halaman asli.
 */
export function paragrafDariXml(xml) {
  const hasil = [];
  for (const p of buangFallback(xml).match(RE_PARAGRAF) || []) {
    const gaya = /<w:pStyle\s+w:val="Heading(\d)"/.exec(p);
    const ppr = (/<w:pPr>[\s\S]*?<\/w:pPr>/.exec(p) || [''])[0];
    if (/<w:pageBreakBefore\b(?![^>]*w:val="(?:0|false|off)")/.test(ppr)) hasil.push({ ...JEDA });
    let teks = ''; let tebalChar = 0; let total = 0; let adaJeda = false;
    const tutupParagraf = () => { hasil.push({ teks, tingkat: gaya ? Number(gaya[1]) : 0, tebal: total > 0 && tebalChar / total >= 0.95 }); teks = ''; tebalChar = 0; total = 0; };
    for (const r of p.match(RE_RUN) || []) {
      let t = '';
      for (const m of r.matchAll(RE_TEKS)) {
        if (m[1] !== undefined) t += dekode(m[1]);
        else if (m[0].startsWith('<w:tab')) t += '\t';
        else if (/w:type/.test(m[0])) { // pemisah halaman di tengah paragraf: tutup bagian sebelumnya, lanjutkan di halaman berikutnya
          if (t) { teks += t; const n0 = t.replace(/\s/g, '').length; total += n0; if (TEBAL.test((/<w:rPr>[\s\S]*?<\/w:rPr>/.exec(r) || [''])[0])) tebalChar += n0; t = ''; }
          if (teks) tutupParagraf();
          hasil.push({ ...JEDA }); adaJeda = true;
        } else t += '\n';
      }
      if (!t) continue;
      teks += t; const n = t.replace(/\s/g, '').length; total += n;
      if (TEBAL.test((/<w:rPr>[\s\S]*?<\/w:rPr>/.exec(r) || [''])[0])) tebalChar += n;
    }
    if (teks || !adaJeda) tutupParagraf();
    const seksi = SEKSI_BERIKUT.exec(ppr);
    if (seksi && !/<w:type\s+w:val="continuous"/.test(seksi[0])) hasil.push({ ...JEDA });
  }
  return hasil;
}

/** ArrayBuffer .docx -> paragraf. */
export async function bacaDocx(buffer, opsi = {}) {
  const data = await bacaBerkasZip(buffer, 'word/document.xml', opsi);
  if (!data) throw new ErrorSyamilah('DOCX_RUSAK', 'Berkas ini bukan dokumen Word (word/document.xml tidak ditemukan).');
  return paragrafDariXml(new TextDecoder('utf-8').decode(data));
}
