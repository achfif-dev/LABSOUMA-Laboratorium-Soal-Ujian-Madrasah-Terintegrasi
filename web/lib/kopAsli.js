// Kop naskah ujian yang meniru kop template asli (FIQH.docx) apa adanya.
//
// Struktur template (diukur dari XML aslinya):
//   - Satu grup gambar Word mengambang (wpg) sebesar 7.087.870 x 659.130 EMU, dipasang di paragraf judul pertama, berisi:
//       garis ganda tebal 3 pt di bawah judul, kotak data bergaris tebal-tipis 3,25 pt (flowChartProcess) berisi dua paragraf
//       (nama/kelas dan nomor/mata pelajaran), serta tiga kotak kecil tempat nomor peserta, dan logo di kanan.
//   - Tiga paragraf judul Arial tebal: "الامتحان في الدور ..." 16 pt, nama madrasah 16 pt, baris pesantren dan tahun ajaran 10 pt
//     (angka tahun 12 pt), huruf Arab dan Latin sama-sama Arial. Baris pertama membawa jangkar grup dan run spasi 22 pt yang menentukan
//     tinggi barisnya; run spasi di awal tiap baris juga sama dengan template (Word menaruhnya di sisi kanan, sehingga teks tidak menimpa logo).
//
// Perbedaan yang disengaja dari template, dan alasannya:
//   1. Logo berupa gambar PNG mengambang di titik yang sama dengan logo WMF di dalam grup template (docx tidak dapat menaruh gambar
//      di dalam grup, dan WMF tidak tampil di semua aplikasi).
//   2. 50 spasi penutup pada paragraf kotak data dibuang: tidak terlihat, tetapi membuat baris terlipat di LibreOffice.
// Semua ukuran lain (EMU, twip, ketebalan garis, font, ukuran huruf) sama dengan template.

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
  + ' xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"'
  + ' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"'
  + ' xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"'
  + ' xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"'
  + ' xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';

// Ukuran grup dan posisi logo, dalam EMU (dari wp:anchor dan a:xfrm template).
export const GRUP = Object.freeze({
  lebar: 7087870, tinggi: 659130, geserH: 29210, geserV: 43815,
  logoX: (10959 - 613) * 635, logoLebar: 816 * 635, logoTinggi: 1025 * 635,   // satuan anak grup: 1 unit = 635 EMU
});
export const LOGO_H = GRUP.geserH + GRUP.logoX;   // jarak logo dari tepi kolom
export const LOGO_V = GRUP.geserV;                // jarak logo dari puncak paragraf

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- run di dalam kotak data: Arial 11 pt tebal, seperti gaya Normal template ---------- */
const FONT_KOTAK = '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>';
const rKotak = (teks, { tebal = true, rtl = true, bawah = false, tab = 0, tabSesudah = false } = {}) => {
  const rpr = `<w:rPr>${FONT_KOTAK}${tebal ? '<w:b/><w:bCs/>' : ''}<w:sz w:val="22"/><w:szCs w:val="22"/>${bawah ? '<w:u w:val="dotted"/>' : ''}${rtl ? '<w:rtl/>' : ''}</w:rPr>`;
  const tabs = '<w:tab/>'.repeat(tab);
  const isi = teks === '' ? '' : `<w:t xml:space="preserve">${esc(teks)}</w:t>`;
  return `<w:r>${rpr}${tabSesudah ? isi + tabs : tabs + isi}</w:r>`;
};
// Spasi sesudah 10 pt dan jarak baris 1,15 diwarisi template dari gaya Normal; di sini ditulis eksplisit supaya baris kedua (nomor) turun sejajar dengan kotak nomor.
const pKotak = (runs) => '<w:p><w:pPr><w:bidi/><w:spacing w:after="200" w:line="276" w:lineRule="auto"/><w:rPr>' + FONT_KOTAK + '<w:b/><w:bCs/><w:sz w:val="22"/><w:szCs w:val="22"/><w:rtl/></w:rPr></w:pPr>' + runs.join('') + '</w:p>';

// Isi kotak data, urutan run sama dengan template: [الاسم : ____ الفصـل : kelas ] [ tingkat] dan [الرقم : المادة : mapel].
// Parser XML docx-js membuang run yang hanya berisi spasi, jadi spasi digabung ke run tetangganya (tampilannya sama).
function isiKotak(meta) {
  const baris1 = [
    rKotak('الاسم'), rKotak(': ', { tab: 1 }),
    rKotak('_________', { tebal: false, bawah: true }),
    rKotak('الفصـل', { tab: 1 }), rKotak('', { tab: 1 }), rKotak(': '),
    // Kurung ditulis berurutan '[' lalu ']' pada run LTR (tidak dicerminkan), sehingga tampil "kelas [ ] tingkat" dengan '[' di sisi kelas
    // baik di Word maupun LibreOffice; mengandalkan pencerminan otomatis membuat hasilnya berbeda antar aplikasi.
    rKotak(`${meta.kelas} `), rKotak('[     ', { rtl: false }), rKotak('] ', { rtl: false }), rKotak(meta.tingkat),
  ];
  const baris2 = [
    rKotak('الرقم'), rKotak('', { tab: 1 }), rKotak(':'), rKotak('', { tab: 1 }),
    rKotak('المادة', { tab: 1 }), rKotak('', { tab: 1 }), rKotak(': '), rKotak(meta.mapel || ''),
  ];
  return pKotak(baris1) + pKotak(baris2);
}

/* ---------- bentuk di dalam grup (koordinat anak grup: asal 613,794; ukuran 11162 x 1038) ---------- */
const hitam = '<a:solidFill><a:srgbClr val="000000"/></a:solidFill>';
const putih = '<a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>';
const kotakKecil = (id, x) => `<wps:wsp><wps:cNvPr id="${id}" name="Nomor ${id}"/><wps:cNvSpPr><a:spLocks/></wps:cNvSpPr><wps:spPr bwMode="auto"><a:xfrm><a:off x="${x}" y="1520"/><a:ext cx="357" cy="207"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${putih}<a:ln w="9525">${hitam}<a:miter lim="800000"/><a:headEnd/><a:tailEnd/></a:ln></wps:spPr><wps:bodyPr rot="0" vert="horz" wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="t" anchorCtr="0" upright="1"><a:noAutofit/></wps:bodyPr></wps:wsp>`;

function grupXml(meta) {
  const garis = `<wps:wsp><wps:cNvPr id="302" name="Garis judul"/><wps:cNvCnPr><a:cxnSpLocks/></wps:cNvCnPr><wps:spPr bwMode="auto"><a:xfrm flipV="1"><a:off x="5862" y="1832"/><a:ext cx="5901" cy="0"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:noFill/><a:ln w="38100" cmpd="dbl">${hitam}<a:round/><a:headEnd/><a:tailEnd/></a:ln></wps:spPr><wps:bodyPr/></wps:wsp>`;
  const kotak = `<wps:wsp><wps:cNvPr id="304" name="Kotak data"/><wps:cNvSpPr><a:spLocks/></wps:cNvSpPr><wps:spPr bwMode="auto"><a:xfrm><a:off x="613" y="893"/><a:ext cx="5150" cy="963"/></a:xfrm><a:prstGeom prst="flowChartProcess"><a:avLst/></a:prstGeom>${putih}<a:ln w="41275" cmpd="thickThin">${hitam}<a:miter lim="800000"/><a:headEnd/><a:tailEnd/></a:ln><a:effectLst/></wps:spPr><wps:txbx><w:txbxContent>${isiKotak(meta)}</w:txbxContent></wps:txbx><wps:bodyPr rot="0" vert="horz" wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="t" anchorCtr="0" upright="1"><a:noAutofit/></wps:bodyPr></wps:wsp>`;
  const sub = `<wpg:grpSp><wpg:cNvPr id="303" name="Kotak isian"/><wpg:cNvGrpSpPr><a:grpSpLocks/></wpg:cNvGrpSpPr><wpg:grpSpPr bwMode="auto"><a:xfrm><a:off x="613" y="869"/><a:ext cx="5150" cy="963"/><a:chOff x="613" y="893"/><a:chExt cx="5150" cy="963"/></a:xfrm></wpg:grpSpPr>${kotak}${kotakKecil(305, 4389)}${kotakKecil(306, 3621)}${kotakKecil(307, 4005)}</wpg:grpSp>`;
  return `<wpg:wgp><wpg:cNvGrpSpPr><a:grpSpLocks/></wpg:cNvGrpSpPr><wpg:grpSpPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="${GRUP.lebar}" cy="${GRUP.tinggi}"/><a:chOff x="613" y="794"/><a:chExt cx="11162" cy="1038"/></a:xfrm></wpg:grpSpPr>${garis}${sub}</wpg:wgp>`;
}

/** Run jangkar: berisi seluruh grup gambar (kotak data, nomor, garis ganda). Dipasang di paragraf judul pertama. */
export function runGrup(meta) {
  return `<w:r ${NS}><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:bCs/><w:noProof/><w:color w:val="000000"/><w:sz w:val="44"/><w:szCs w:val="44"/></w:rPr>`
    + '<mc:AlternateContent><mc:Choice Requires="wpg"><w:drawing>'
    + `<wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251656704" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">`
    + `<wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>${GRUP.geserH}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${GRUP.geserV}</wp:posOffset></wp:positionV>`
    + `<wp:extent cx="${GRUP.lebar}" cy="${GRUP.tinggi}"/><wp:effectExtent l="19050" t="0" r="17780" b="26670"/><wp:wrapNone/><wp:docPr id="301" name="Kop naskah"/><wp:cNvGraphicFramePr/>`
    + `<a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup">${grupXml(meta)}</a:graphicData></a:graphic>`
    + '</wp:anchor></w:drawing></mc:Choice></mc:AlternateContent></w:r>';
}
