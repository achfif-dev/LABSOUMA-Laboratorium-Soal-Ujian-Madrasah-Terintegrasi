// Pembantu tes: membuat berkas .docx minimal (ZIP + word/document.xml) tanpa pustaka luar, meniru keluaran pustaka `docx`
// yang dipakai web/lib/naskahDocx.js (paragraf dua arah, run `w:rtl`, `w:color`, `w:tab`, kotak teks kop dengan `mc:AlternateContent`).
import { deflateRawSync, crc32 } from 'node:zlib';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Satu run. o.merah -> warna FF0000; o.tab -> elemen <w:tab/>; o.bold. */
export const run = (teks, o = {}) => `<w:r><w:rPr><w:rFonts w:ascii="Traditional Arabic" w:cs="Traditional Arabic"/>${o.bold ? '<w:b/>' : ''}${o.merah ? `<w:color w:val="${o.warna || 'FF0000'}"/>` : ''}<w:sz w:val="32"/><w:rtl/></w:rPr>${o.tab ? '<w:tab/>' : `<w:t xml:space="preserve">${esc(teks)}</w:t>`}</w:r>`;
/** Paragraf dari daftar run (string XML) atau teks biasa. */
export const par = (...isi) => `<w:p><w:pPr><w:bidi/><w:spacing w:before="0" w:after="0"/></w:pPr>${isi.map((x) => (x.startsWith('<w:r') ? x : run(x))).join('')}</w:p>`;
export const parOtomatis = (...isi) => `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="3"/></w:numPr></w:pPr>${isi.map((x) => (x.startsWith('<w:r') ? x : run(x))).join('')}</w:p>`;

/** Paragraf jangkar kop: kotak teks (Choice) + cadangan VML (Fallback) berisi teks yang sama, seperti keluaran Word. */
export const kop = (...baris) => {
  const isi = baris.map((b) => `<w:p><w:r><w:t>${esc(b)}</w:t></w:r></w:p>`).join('');
  return `<w:p><w:r><mc:AlternateContent><mc:Choice Requires="wpg"><w:drawing><wp:anchor><a:graphic><a:graphicData><wps:wsp><wps:txbx><w:txbxContent>${isi}</w:txbxContent></wps:txbx></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></mc:Choice><mc:Fallback><w:pict><v:shape><v:textbox><w:txbxContent>${isi}</w:txbxContent></v:textbox></v:shape></w:pict></mc:Fallback></mc:AlternateContent></w:r></w:p>`;
};

export const dokumen = (...isi) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:wp="x" xmlns:a="x" xmlns:wps="x" xmlns:v="x"><w:body>${isi.join('')}</w:body></w:document>`;

/** ZIP minimal. `entri` = {nama: string|Uint8Array}; mampat 'deflate' (bawaan) atau 'simpan'. */
export function zip(entri, { mampat = 'deflate' } = {}) {
  const bagian = []; const pusat = []; let offset = 0;
  for (const [nama, isi] of Object.entries(entri)) {
    const data = Buffer.from(isi); const n = Buffer.from(nama);
    const deflate = mampat === 'deflate'; const kecil = deflate ? deflateRawSync(data) : data;
    const crc = crc32(data);
    const lokal = Buffer.alloc(30); lokal.writeUInt32LE(0x04034b50, 0); lokal.writeUInt16LE(20, 4); lokal.writeUInt16LE(0, 6); lokal.writeUInt16LE(deflate ? 8 : 0, 8);
    lokal.writeUInt32LE(crc, 14); lokal.writeUInt32LE(kecil.length, 18); lokal.writeUInt32LE(data.length, 22); lokal.writeUInt16LE(n.length, 26);
    bagian.push(lokal, n, kecil);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(deflate ? 8 : 0, 10);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(kecil.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(offset, 42);
    pusat.push(c, n);
    offset += lokal.length + n.length + kecil.length;
  }
  const pj = pusat.reduce((a, b) => a + b.length, 0);
  const e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(pusat.length / 2, 8); e.writeUInt16LE(pusat.length / 2, 10); e.writeUInt32LE(pj, 12); e.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...bagian, ...pusat, e]));
}

export const docx = (xml, opsi) => zip({ '[Content_Types].xml': '<Types/>', 'word/document.xml': xml }, opsi);
