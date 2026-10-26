// Pembuat DOCX naskah ujian format IMDA (kertas F4, kanan-ke-kiri). Menerima modul `docx` sebagai argumen (window.docx di browser,
// paket docx di tes) dan mengembalikan objek Document; pemanggil yang mengemasnya (Packer).
//   kunci:false -> naskah untuk peserta: nomor, soal, garis jawaban; tanpa unsur merah.
//   kunci:true  -> naskah pengoreksi: huruf opsi benar, jawaban tertulis, dan "ص <halaman kitab>" berwarna merah, seperti contoh template.
//   pegon:fn    -> fungsi alih aksara Latin ke Pegon (mis. t => window.Pegon.convertText(t).pegon). Dipakai untuk kalimat soal, opsi, dan
//                  jawaban kunci; tanpa fungsi ini teks dicetak apa adanya. Kop sudah berbahasa Arab dan tidak diubah.
//   narasi:true -> narasi/stimulus ikut dicetak di depan kalimat soal. Bawaan false: template hanya satu kalimat soal per nomor.
import { HURUF_OPSI, META_AWAL, judulDawr, rujukanHalaman, jawabanKunci, akhiriTanya, teksSoal } from './naskah.js';
import { bentukDari, opsiTerpakai } from './bentuk.js';

const AR = 'Traditional Arabic';
const LATIN = 'Times New Roman';
const KOP = 'Arial';               // kop template memakai Arial, bukan Traditional Arabic
const MERAH = 'FF0000';
const LEBAR_ISI = 11197;           // 12240 - 476 - 567 (margin template)
const LEBAR_KOTAK = 5150;          // kotak data kiri, sama dengan kotak template (5150 twip)
const LEBAR_JARAK = 60;            // celah antara kotak dan garis judul
const LEBAR_LOGO = 830;
const LEBAR_JUDUL = LEBAR_ISI - LEBAR_KOTAK - LEBAR_JARAK - LEBAR_LOGO;
const LEBAR_KOTAK_DALAM = 5000;
const GARIS_KOTAK = { style: 'thickThinSmallGap', size: 26, color: '000000' }; // garis ganda tebal-tipis 3,25 pt seperti kotak template
const POSISI_TAB = 11055;          // tab rata kanan dengan garis pengisi, sama dengan template
const adaArab = (s) => /[\u0600-\u06FF\u0750-\u077F]/.test(String(s));
const bersih = (s) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/\s*\n\s*/g, ' ').trim();

export function buatNaskah(D, naskah, metaMasuk = {}, { kunci = false, logo = null, pegon = null, narasi = false } = {}) {
  const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun, Footer, AlignmentType, TabStopType, LeaderType, LineRuleType, TableLayoutType, VerticalAlign, Tab, HeightRule } = D;
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
  // Teks isi soal: dibersihkan, lalu ditulis Pegon bila fungsi alih aksara diberikan. Kegagalan mesin tidak boleh menggagalkan unduhan.
  const tulis = (s) => {
    const t = bersih(s);
    if (!t || typeof pegon !== 'function') return t;
    try { const r = pegon(t); return typeof r === 'string' && r.trim() ? bersih(r) : t; } catch (e) { return t; }
  };

  /* ---------- kop ----------
   * Meniru kop template (FORMAT_SOAL_IMDA_*.docx): font Arial tebal (judul 22 pt, madrasah 16 pt, pesantren dan tahun 10 pt),
   * logo di kanan, garis ganda tipis di bawah judul, dan kotak data di kiri dengan garis ganda tebal-tipis 3,25 pt.
   * Template memakai grup VML mengambang; di sini dipakai tabel biasa supaya tampil sama di Word dan LibreOffice dan tetap bisa diedit. */
  const tanpa = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const tanpaGaris = { top: tanpa, bottom: tanpa, left: tanpa, right: tanpa };
  const garisGanda = { style: BorderStyle.DOUBLE, size: 12, color: '000000' };
  const K = (text, o = {}) => new TextRun({
    text: String(text ?? ''), font: KOP, size: o.size || 22, bold: true, boldComplexScript: true,
    rightToLeft: o.rtl ?? adaArab(text), ...(o.border ? { border: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 0 } } : {}),
  });
  const barisKop = (children, o = {}) => new Paragraph({ spacing: { before: 0, after: 0, line: 240, lineRule: LineRuleType.AUTO }, ...o, children });
  const sel = (w, children, o = {}) => new TableCell({
    width: { size: w, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 0, bottom: 0, left: 20, right: 20 }, // tanpa `borders`: garis luar kotak datang dari tabel
    children: [barisKop(children, { bidirectional: true })], ...o,
  });
  const rapat = () => new Paragraph({ spacing: { before: 0, after: 0, line: 20, lineRule: LineRuleType.EXACT }, children: [new TextRun({ text: '', size: 2 })] });

  // Judul: dua baris pertama rata kanan biasa (seperti template), baris tahun dua arah supaya tanda kutip dan angka tidak terbalik.
  const logoCell = new TableCell({
    width: { size: LEBAR_LOGO, type: WidthType.DXA }, verticalAlign: VerticalAlign.TOP, margins: { top: 0, bottom: 0, left: 0, right: 0 }, borders: { ...tanpaGaris, bottom: garisGanda },
    children: [new Paragraph({ bidirectional: true, spacing: { before: 0, after: 40 }, children: logo ? [new ImageRun({ type: 'png', data: logo, transformation: { width: 54, height: 68 }, altText: { title: 'Logo', description: 'Logo madrasah', name: 'logo' } })] : [] })],
  });
  const judulCell = new TableCell({
    width: { size: LEBAR_JUDUL, type: WidthType.DXA }, verticalAlign: VerticalAlign.TOP, margins: { top: 0, bottom: 40, left: 0, right: 40 },
    borders: { ...tanpaGaris, bottom: garisGanda },
    children: [
      barisKop([K(judulDawr(naskah.dawr), { size: 44, rtl: true })], { alignment: AlignmentType.RIGHT }),
      barisKop([K(meta.baris1, { size: 32, rtl: true })], { alignment: AlignmentType.RIGHT }),
      barisKop([K(`" ${meta.baris2}  السنة الدراسة `, { size: 19, rtl: true }), K(meta.tahun, { size: 19, rtl: true }), K(' هـــ "', { size: 19, rtl: true })], { bidirectional: true }),
    ],
  });
  const jarak = new TableCell({ width: { size: LEBAR_JARAK, type: WidthType.DXA }, borders: tanpaGaris, children: [rapat()] });

  // Kotak data: dua baris, tujuh kolom (label, titik dua, isian, pemisah, label, titik dua, isian) supaya sejajar antarbaris.
  const kotakNomor = () => [0, 1, 2].flatMap((i) => [K('\u00A0'.repeat(6), { size: 22, rtl: true, border: true }), ...(i < 2 ? [K('\u00A0', { size: 8, rtl: true })] : [])]);
  const kolom = [640, 140, 1420, 120, 700, 140, 1840];
  const baris = (isi) => new TableRow({ height: { value: 481, rule: HeightRule.ATLEAST }, children: isi.map((c, i) => sel(kolom[i], c)) });
  const kotakData = new Table({
    visuallyRightToLeft: true, layout: TableLayoutType.FIXED, width: { size: LEBAR_KOTAK_DALAM, type: WidthType.DXA }, columnWidths: kolom,
    borders: { top: GARIS_KOTAK, bottom: GARIS_KOTAK, left: GARIS_KOTAK, right: GARIS_KOTAK, insideHorizontal: tanpa, insideVertical: tanpa },
    rows: [
      baris([[K('الاسم')], [K(':')], [K('_'.repeat(11), { rtl: true })], [], [K('الفصـل')], [K(':')], [K(`${meta.kelas} [   ] ${meta.tingkat}`)]]),
      baris([[K('الرقم')], [K(':')], kotakNomor(), [], [K('المادة')], [K(':')], [K(meta.mapel || '')]]),
    ],
  });
  const kotakCell = new TableCell({
    width: { size: LEBAR_KOTAK, type: WidthType.DXA }, verticalAlign: VerticalAlign.BOTTOM, borders: tanpaGaris, margins: { top: 0, bottom: 0, left: 0, right: 0 },
    children: [kotakData, rapat()],
  });
  const header = new Table({
    visuallyRightToLeft: true, layout: TableLayoutType.FIXED, width: { size: LEBAR_ISI, type: WidthType.DXA }, columnWidths: [LEBAR_LOGO, LEBAR_JUDUL, LEBAR_JARAK, LEBAR_KOTAK],
    borders: { ...tanpaGaris, insideHorizontal: tanpa, insideVertical: tanpa },
    rows: [new TableRow({ children: [logoCell, judulCell, jarak, kotakCell] })],
  });

  /* ---------- butir soal ---------- */
  const pilihan = (no, q) => {
    const huruf = q ? Object.keys(HURUF_OPSI).filter((k) => opsiTerpakai(q).includes(k)) : ['A', 'B', 'C'];
    const kunciHuruf = q ? q.kunci : '';
    const runs = [N(`${no}- `), N('(     )'), N(' ')];
    if (q) runs.push(T(tulis(teksSoal(q, { narasi })) + ' '));
    runs.push(N('('));
    huruf.forEach((k, i) => {
      runs.push(N(`${HURUF_OPSI[k]}-`, merah(k === kunciHuruf)));   // seperti contoh: "أ-2 ب-3 ج-4", tanpa spasi setelah tanda hubung
      if (q) runs.push(T(tulis(q.opsi[k]) + (i < huruf.length - 1 ? ' ' : '')));
      else if (i < huruf.length - 1) runs.push(N(' '));
    });
    runs.push(N(')'));
    if (kunci) runs.push(N('  '), N(q ? rujukanHalaman(q) : 'ص', { color: MERAH }));
    return P(runs);
  };
  const isian = (no, q, garisLeader, tanya) => {
    const runs = [N(`${no}- `)];
    if (q) { const soal = tulis(teksSoal(q, { narasi })); runs.push(T(tanya ? akhiriTanya(soal) : soal)); }
    else if (tanya) runs.push(N(' ؟'));
    if (kunci && q) { const j = tulis(jawabanKunci(q).teks); if (j) runs.push(N(' '), T(j, { color: MERAH })); }
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
