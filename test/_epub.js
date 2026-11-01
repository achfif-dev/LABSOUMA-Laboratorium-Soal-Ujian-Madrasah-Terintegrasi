// Pembuat EPUB uji: ZIP sungguhan (deflate) tanpa pustaka. { nama: isi } -> ArrayBuffer.
import { deflateRawSync, crc32 } from 'node:zlib';
const enc = new TextEncoder();
export function buatZip(berkas, { simpan = false } = {}) {
  const bagian = []; const pusat = []; let offset = 0;
  for (const [nama, isi] of Object.entries(berkas)) {
    const n = enc.encode(nama); const data = typeof isi === 'string' ? enc.encode(isi) : isi;
    const kompres = simpan ? data : deflateRawSync(data); const crc = crc32(data);
    const lh = Buffer.alloc(30 + n.length); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(simpan ? 0 : 8, 8);
    lh.writeUInt32LE(crc >>> 0, 14); lh.writeUInt32LE(kompres.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(n.length, 26); n.forEach((b, i) => { lh[30 + i] = b; });
    const cd = Buffer.alloc(46 + n.length); cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(0x0800, 8); cd.writeUInt16LE(simpan ? 0 : 8, 10);
    cd.writeUInt32LE(crc >>> 0, 16); cd.writeUInt32LE(kompres.length, 20); cd.writeUInt32LE(data.length, 24); cd.writeUInt16LE(n.length, 28); cd.writeUInt32LE(offset, 42); n.forEach((b, i) => { cd[46 + i] = b; });
    bagian.push(lh, Buffer.from(kompres)); pusat.push(cd); offset += lh.length + kompres.length;
  }
  const cdTotal = pusat.reduce((s, b) => s + b.length, 0); const ek = Buffer.alloc(22);
  ek.writeUInt32LE(0x06054b50, 0); ek.writeUInt16LE(pusat.length, 8); ek.writeUInt16LE(pusat.length, 10); ek.writeUInt32LE(cdTotal, 12); ek.writeUInt32LE(offset, 16);
  const semua = Buffer.concat([...bagian, ...pusat, ek]);
  return semua.buffer.slice(semua.byteOffset, semua.byteOffset + semua.length);
}
const kutip = (q) => (v) => `${q}${v}${q}`;
/** bab: [{ file, html, nonLinear?, props? }]; opsi: { kutip: '"'|"'", judul, pengarang, nav } */
export function buatEpub(bab, { q = '"', judul = 'كتاب الاختبار', pengarang = 'المؤلف', navHtml = null, tambahan = {}, opfExtra = '' } = {}) {
  const k = kutip(q);
  const manifest = bab.map((b, i) => `<item id=${k('c' + i)} href=${k(b.file)} media-type=${k('application/xhtml+xml')}${b.props ? ` properties=${k(b.props)}` : ''}/>`).join('');
  const spine = bab.map((b, i) => `<itemref idref=${k('c' + i)}${b.nonLinear ? ` linear=${k('no')}` : ''}/>`).join('');
  const opf = `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${judul}</dc:title><dc:creator>${pengarang}</dc:creator>${opfExtra}</metadata><manifest>${manifest}${navHtml ? `<item id=${k('nav')} href=${k('nav.xhtml')} media-type=${k('application/xhtml+xml')} properties=${k('nav')}/>` : ''}</manifest><spine>${spine}</spine></package>`;
  const berkas = { mimetype: 'application/epub+zip', 'META-INF/container.xml': `<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path=${k('OEBPS/content.opf')} media-type=${k('application/oebps-package+xml')}/></rootfiles></container>`, 'OEBPS/content.opf': opf, ...tambahan };
  for (const b of bab) berkas[`OEBPS/${b.file}`] = `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>x</title></head><body>${b.html}</body></html>`;
  if (navHtml) berkas['OEBPS/nav.xhtml'] = navHtml;
  return buatZip(berkas);
}
