// Pembuat DOCX naskah ujian format IMDA (kertas F4, kanan-ke-kiri). Menerima modul `docx` sebagai argumen (window.docx di browser,
// paket docx di tes) dan mengembalikan objek Document; pemanggil yang mengemasnya (Packer).
//   kunci:false -> naskah untuk peserta: nomor, soal, garis jawaban; tanpa unsur merah.
//   kunci:true  -> naskah pengoreksi: huruf opsi benar, jawaban tertulis, dan "ص <halaman kitab>" berwarna merah, seperti contoh template.
import { HURUF_OPSI, META_AWAL, judulDawr, rujukanHalaman, jawabanKunci, akhiriTanya } from './naskah.js';
import { bentukDari, opsiTerpakai } from './bentuk.js';

const AR = 'Traditional Arabic';
const LATIN = 'Times New Roman';
const MERAH = 'FF0000';
const LEBAR_ISI = 11197;           // 12240 - 476 - 567 (margin template)
const POSISI_TAB = 11055;          // tab rata kanan dengan garis pengisi, sama dengan template
const adaArab = (s) => /[\u0600-\u06FF\u0750-\u077F]/.test(String(s));
const bersih = (s) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/\s*\n\s*/g, ' ').trim();

export function buatNaskah(D, naskah, metaMasuk = {}, { kunci = false, logo = null } = {}) {
  const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun, Footer, AlignmentType, TabStopType, LeaderType, LineRuleType, TableLayoutType, VerticalAlign, Tab } = D;
  const meta = { ...META_AWAL, ...(metaMasuk || {}) };

  const T = (text, o = {}) => {
    const s = bersih(text) === '' && text !== ' ' && !/^\s+$/.test(String(text ?? '')) ? '' : String(text ?? '').replace(/\n/g, ' ');
    const arab = o.rtl ?? adaArab(s) ?? true;
    return new TextRun({
      text: s, font: arab ? AR : LATIN, size: o.size || 32, bold: !!o.bold, boldComplexScript: !!o.bold,
      color: o.color, rightToLeft: arab, ...(o.border ? { border: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 0 } } : {}),
    });
  };
  // Penanda dan tanda baca selalu memakai font Arab kanan-ke-kiri agar urutannya sama dengan template.
  const N = (text, o = {}) => T(text, { rtl: true, ...o });
  const P = (children, o = {}) => new Paragraph({ bidirectional: true, spacing: { before: 0, after: 0, line: 400, lineRule: LineRuleType.EXACT }, children, ...o });
  const TAB = (leader) => ({ tabStops: [{ type: TabStopType.RIGHT, position: POSISI_TAB, leader }] });
  const merah = (cond, o = {}) => (kunci && cond ? { ...o, color: MERAH } : o);

  /* ---------- kop ---------- */
  const tanpaGaris = { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } };
  const garis = { style: BorderStyle.SINGLE, size: 26, color: '000000' };
  const kop = (children) => new Paragraph({ bidirectional: true, spacing: { before: 0, after: 0, line: 276 }, children });
  const logoCell = new TableCell({
    width: { size: 900, type: WidthType.DXA }, borders: tanpaGaris, verticalAlign: VerticalAlign.TOP,
    children: [new Paragraph({ bidirectional: true, children: logo ? [new ImageRun({ type: 'png', data: logo, transformation: { width: 54, height: 66 }, altText: { title: 'Logo', description: 'Logo madrasah', name: 'logo' } })] : [] })],
  });
  const judulCell = new TableCell({
    width: { size: 5700, type: WidthType.DXA }, verticalAlign: VerticalAlign.TOP,
    borders: { ...tanpaGaris, bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' } },
    children: [
      kop([N(judulDawr(naskah.dawr), { size: 44, bold: true })]),
      kop([N(meta.baris1, { size: 32, bold: true })]),
      kop([N(`" ${meta.baris2}  السنة الدراسة ${meta.tahun} هـ "`, { size: 20, bold: true })]),
    ],
  });
  const kotak = (n) => Array.from({ length: n }, (_, i) => [T('\u00A0\u00A0\u00A0\u00A0\u00A0', { rtl: true, size: 24, border: true }), ...(i < n - 1 ? [N(' ', { size: 24 })] : [])]).flat();
  const kotakCell = new TableCell({
    width: { size: 4597, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    borders: { top: garis, bottom: garis, left: garis, right: garis },
    children: [
      kop([N('الاسم : ', { size: 24, bold: true }), N('______________', { size: 24 }), N('   الفصل : ', { size: 24, bold: true }), T(`${meta.kelas} [   ] ${meta.tingkat}`, { size: 24, bold: true })]),
      kop([N('الرقم : ', { size: 24, bold: true }), ...kotak(3), N('      المادة : ', { size: 24, bold: true }), T(meta.mapel || '', { size: 24, bold: true })]),
    ],
  });
  const header = new Table({
    visuallyRightToLeft: true, layout: TableLayoutType.FIXED, width: { size: 900 + 5700 + 4597, type: WidthType.DXA }, columnWidths: [900, 5700, 4597],
    borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
    rows: [new TableRow({ children: [logoCell, judulCell, kotakCell] })],
  });

  /* ---------- butir soal ---------- */
  const pilihan = (no, q) => {
    const huruf = q ? Object.keys(HURUF_OPSI).filter((k) => opsiTerpakai(q).includes(k)) : ['A', 'B', 'C'];
    const kunciHuruf = q ? q.kunci : '';
    const runs = [N(`${no}- `), N('(     )'), N(' ')];
    if (q) runs.push(T(bersih([q.stimulus, q.pertanyaan].filter(Boolean).join(' ')) + ' '));
    runs.push(N('('));
    huruf.forEach((k, i) => {
      runs.push(N(`${HURUF_OPSI[k]}- `, merah(k === kunciHuruf)));
      if (q) runs.push(T(bersih(q.opsi[k]) + (i < huruf.length - 1 ? ' ' : '')));
      else if (i < huruf.length - 1) runs.push(N(' '));
    });
    runs.push(N(')'));
    if (kunci) runs.push(N('  '), N(q ? rujukanHalaman(q) : 'ص', { color: MERAH }));
    return P(runs);
  };
  const isian = (no, q, garisLeader, tanya) => {
    const runs = [N(`${no}- `)];
    if (q) runs.push(T(bersih(tanya ? akhiriTanya(bersih([q.stimulus, q.pertanyaan].filter(Boolean).join(' '))) : [q.stimulus, q.pertanyaan].filter(Boolean).join(' '))));
    else if (tanya) runs.push(N(' ؟'));
    if (kunci && q) { const j = jawabanKunci(q).teks; if (j) runs.push(N(' '), T(bersih(j), { color: MERAH })); }
    runs.push(new TextRun({ children: [new Tab()], font: AR, size: 32, rightToLeft: true }));
    if (kunci) runs.push(N(q ? rujukanHalaman(q) : 'ص', { color: MERAH }));
    return P(runs, TAB(garisLeader));
  };

  const body = [P([]), ];
  naskah.bagian.forEach((bg, i) => {
    if (i > 0) body.push(P([]));
    body.push(P([N(bg.judul, { bold: true })]));
    for (const { no, q } of bg.butir) {
      if (bg.kode === 'a') body.push(pilihan(no, q));
      else if (bg.kode === 'b') body.push(isian(no, q, LeaderType.DOT, false));
      else body.push(isian(no, q, LeaderType.UNDERSCORE, true));
    }
  });

  const kaki = [];
  if (meta.penanda) kaki.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: bersih(meta.penanda), font: LATIN, bold: true, size: 24 })] }));
  if (kunci) kaki.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NASKAH KUNCI (untuk pengoreksi, jangan dibagikan): merah = jawaban; ص = halaman kitab.', font: LATIN, size: 16, color: '555555' })] }));

  return new Document({
    creator: 'LABSOUMA', title: `Naskah ${judulDawr(naskah.dawr)}${kunci ? ' (kunci)' : ''}`,
    styles: { default: { document: { run: { font: AR, size: 32 } } } },
    sections: [{
      properties: { page: { size: { width: 12240, height: 18720 }, margin: { top: 737, right: 476, bottom: 567, left: 567, header: 709, footer: 709 } } },
      footers: { default: new Footer({ children: kaki.length ? kaki : [new Paragraph({ children: [] })] }) },
      children: [header, ...body],
    }],
  });
}

export { LEBAR_ISI };
export const bentukNaskah = bentukDari;
