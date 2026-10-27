// Pembuat DOCX naskah ujian format IMDA (kertas F4, kanan-ke-kiri). Menerima modul `docx` sebagai argumen (window.docx di browser,
// paket docx di tes) dan mengembalikan objek Document; pemanggil yang mengemasnya (Packer).
//   kunci:false -> naskah untuk peserta: nomor, soal, garis jawaban; tanpa unsur merah.
//   kunci:true  -> naskah pengoreksi: huruf opsi benar, jawaban tertulis, dan "ص <halaman kitab>" berwarna merah, seperti contoh template.
//   pegon:fn    -> fungsi alih aksara Latin ke Pegon (mis. t => window.Pegon.convertText(t).pegon). Dipakai untuk kalimat soal, opsi, dan
//                  jawaban kunci; tanpa fungsi ini teks dicetak apa adanya. Kop sudah berbahasa Arab dan tidak diubah (lihat kopAsli.js).
//   kutipan:true (bawaan, hanya di naskah kunci) -> teks kitab Arab yang menjadi dasar kunci dicetak merah di bawah tiap nomor.
//   narasi:true -> narasi/stimulus ikut dicetak di depan kalimat soal. Bawaan false: template hanya satu kalimat soal per nomor.
import { HURUF_OPSI, META_AWAL, judulDawr, rujukanHalaman, jawabanKunci, akhiriTanya, teksSoal, kutipanKunci } from './naskah.js';
import { bentukDari, opsiTerpakai } from './bentuk.js';
import { runGrup, LOGO_H, LOGO_V, GRUP } from './kopAsli.js';

const AR = 'Traditional Arabic';
const LATIN = 'Times New Roman';
const MERAH = 'FF0000';
const LEBAR_ISI = 11197;           // 12240 - 476 - 567 (margin template)
const POSISI_TAB = 11055;          // tab rata kanan dengan garis pengisi, sama dengan template
const adaArab = (s) => /[\u0600-\u06FF\u0750-\u077F]/.test(String(s));
const bersih = (s) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/\s*\n\s*/g, ' ').trim();

export function buatNaskah(D, naskah, metaMasuk = {}, { kunci = false, logo = null, pegon = null, narasi = false, kutipan = true } = {}) {
  const { Document, Paragraph, TextRun, BorderStyle, ImageRun, Footer, AlignmentType, TabStopType, LeaderType, LineRuleType, Tab, ImportedXmlComponent, HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType } = D;
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
   * Meniru kop template asli (FIQH.docx): grup gambar Word berisi kotak data bergaris tebal-tipis, tiga kotak nomor dan garis ganda,
   * ditambah tiga paragraf judul Arial tebal (16 pt, 16 pt, 10 pt). Rinciannya ada di kopAsli.js. */
  // fromXmlString membungkus hasilnya dalam elemen tanpa nama (tertulis <undefined> di XML dan membuat Word menolak berkas);
  // komponen sebenarnya adalah anak pertama pembungkus itu.
  const xml = (s) => { const w = ImportedXmlComponent.fromXmlString(s); return w.root && w.root[0] ? w.root[0] : w; };
  const barisKop = (children, o = {}) => new Paragraph({ spacing: { before: 0, after: 0, line: 240, lineRule: LineRuleType.AUTO }, ...o, children });
  const logoRun = logo ? [new ImageRun({
    type: 'png', data: logo, altText: { title: 'Logo', description: 'Logo madrasah', name: 'logo' },
    transformation: { width: GRUP.logoLebar / 9525, height: GRUP.logoTinggi / 9525 },
    floating: {
      horizontalPosition: { relative: HorizontalPositionRelativeFrom.COLUMN, offset: LOGO_H },
      verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, offset: LOGO_V },
      wrap: { type: TextWrappingType.NONE }, allowOverlap: true, behindDocument: false,
    },
  })] : [];
  // Run judul: Arial tebal hitam untuk huruf Arab maupun Latin (template: rFonts ascii/hAnsi Arial, cs Arial dari bawaan dokumen).
  const J = (text, size, { rtl = true } = {}) => new TextRun({ text, font: { ascii: 'Arial', hAnsi: 'Arial', cs: 'Arial' }, bold: true, boldComplexScript: true, color: '000000', size, rightToLeft: rtl });
  const kop = [
    // Baris 1: jangkar grup, logo, run spasi 22 pt (menentukan tinggi baris) lalu judul 16 pt; rata kanan, bukan paragraf dua arah.
    barisKop([xml(runGrup(meta)), ...logoRun, J('  ', 44), J('  ', 44, { rtl: false }), J(' '.repeat(17), 44), J(judulDawr(naskah.dawr), 32)], { alignment: AlignmentType.RIGHT }),
    barisKop([J(' '.repeat(17), 32), J(` ${meta.baris1}`, 32), J('   ', 32)], { alignment: AlignmentType.RIGHT }),
    // Baris 3 dua arah supaya tanda kutip dan angka tidak terbalik; angka tahun 12 pt, selebihnya 10 pt.
    barisKop([J(' '.repeat(15) + `" ${meta.baris2}  السنة الدراسة `, 20), J(meta.tahun, 24), J(' هـــ "', 24)], { bidirectional: true, indent: { right: 57 } }),
  ];

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
      // Naskah kunci: dasar jawaban dari kitab (Arab apa adanya, tidak lewat mesin Pegon), satu paragraf kecil merah di bawah nomor.
      const dasar = kunci && kutipan && q ? kutipanKunci(q) : '';
      if (dasar) body.push(P([N('نص الكتاب: ', { color: MERAH, size: 24 }), N(dasar, { color: MERAH, size: 24 })], { indent: { right: 360 } }));
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
      children: [...kop, ...body],
    }],
  });
}

export { LEBAR_ISI };
export const bentukNaskah = bentukDari;
