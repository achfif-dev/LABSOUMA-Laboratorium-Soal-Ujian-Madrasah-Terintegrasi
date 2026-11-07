// Pembuat berkas ekspor (DOCX, Moodle GIFT/XML, CSV) dan daftar FORMATS. Murni (tanpa React); docx dimuat malas lewat muatDocx.
import { muatDocx } from './muatDocx.js';
import { muatPegon } from './muatPegon.js';
import { FileCode, FileSpreadsheet, FileText, Languages, Layers } from 'lucide-react';
import { Bt, KEYS, csvEsc, fullQ, levelLabel, optsOf, umpanUraian } from './dasar.js';

const giftEsc = (s) => String(s || '').replace(/([\\~=#{}:])/g, '\\$1').replace(/\r?\n/g, ' '); // "\\" ikut di-escape (GIFT memakainya sebagai pelepas)

const xmlEsc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Bentuk non-pilihan di format Moodle: benar-salah -> {TRUE}/{FALSE}, isian -> jawaban singkat, uraian -> esai (tanpa jawaban otomatis).
// Format GIFT dan Moodle XML untuk bentuk baru ini belum diuji di Moodle sungguhan; coba impor beberapa soal dulu.
const giftJawaban = (q) => {
  const b = Bt.bentukDari(q);
  if (b === 'benarsalah') return q.kunci === 'A' ? 'TRUE' : 'FALSE';
  if (b === 'isian') return String(q.jawaban || '').split(/\s*\/\s*/).filter(Boolean).map((x) => '=' + giftEsc(x)).join(' ');
  return '';
};

const buildGift = (qs, catatan = '') =>
  '// LABSOUMA, format Moodle GIFT\n' + (catatan ? `// ${catatan}\n` : '') + '\n' +
  qs.map((q, i) => {
    const b = Bt.bentukDari(q);
    const o = optsOf(q);
    const kepala = `// ${q.mapel} | ${q.tingkat}${q.kelas ? ' kelas ' + q.kelas : ''}${q.ujian ? ' | ' + q.ujian : ''} | ${levelLabel(q.level)} | ${Bt.BENTUK[b].label} | ${q.nama || '-'} hal. ${q.hal || '-'}\n` +
      `::Soal ${i + 1} ${q.mapel}::${giftEsc(fullQ(q))}`;
    if (b === 'benarsalah' || b === 'isian') return `${kepala}{${giftJawaban(q)}####${giftEsc(q.pembahasan)}}`;
    if (b === 'uraian') return `${kepala}{####${giftEsc(umpanUraian(q))}}`;
    return `${kepala}{\n` +
      o.map((k) => `${k === q.kunci ? '=' : '~'}${giftEsc(q.opsi[k])}`).join('\n') +
      `\n####${giftEsc(q.pembahasan)}\n}`;
  }).join('\n\n') + '\n' + (catatan ? `\n// ${catatan}\n` : '');

const buildMoodleXml = (qs, catatan = '') =>
  '<?xml version="1.0" encoding="UTF-8"?>\n' + (catatan ? `<!-- ${xmlEsc(catatan)} -->\n` : '') + '<quiz>\n' +
  qs.map((q, i) => {
    const b = Bt.bentukDari(q);
    const tipe = b === 'benarsalah' ? 'truefalse' : b === 'isian' ? 'shortanswer' : b === 'uraian' ? 'essay' : 'multichoice';
    const kepala = `  <question type="${tipe}">\n    <name><text>Soal ${i + 1} ${xmlEsc(q.mapel)}</text></name>\n` +
      `    <questiontext format="html"><text><![CDATA[<p>${xmlEsc(fullQ(q))}</p>]]></text></questiontext>\n` +
      `    <generalfeedback format="html"><text><![CDATA[${xmlEsc(b === 'uraian' ? q.pembahasan : q.pembahasan)}]]></text></generalfeedback>\n` +
      '    <defaultgrade>1</defaultgrade>\n';
    if (b === 'benarsalah') {
      return kepala + `    <penalty>1</penalty>\n    <answer fraction="${q.kunci === 'A' ? 100 : 0}" format="moodle_auto_format"><text>true</text></answer>\n    <answer fraction="${q.kunci === 'B' ? 100 : 0}" format="moodle_auto_format"><text>false</text></answer>\n  </question>`;
    }
    if (b === 'isian') {
      return kepala + '    <usecase>0</usecase>\n' +
        String(q.jawaban || '').split(/\s*\/\s*/).filter(Boolean).map((x) => `    <answer fraction="100" format="moodle_auto_format"><text>${xmlEsc(x)}</text></answer>`).join('\n') + '\n  </question>';
    }
    if (b === 'uraian') {
      return kepala + '    <responseformat>editor</responseformat>\n    <responserequired>1</responserequired>\n    <responsefieldlines>10</responsefieldlines>\n' +
        `    <graderinfo format="html"><text><![CDATA[${xmlEsc(`Jawaban model: ${q.jawaban || '-'}${q.rubrik ? ' | Pedoman penskoran: ' + q.rubrik : ''}`)}]]></text></graderinfo>\n  </question>`;
    }
    return kepala + '    <single>true</single>\n    <shuffleanswers>1</shuffleanswers>\n    <answernumbering>ABCD</answernumbering>\n' +
      optsOf(q).map((k) => `    <answer fraction="${k === q.kunci ? 100 : 0}" format="html"><text>${xmlEsc(q.opsi[k])}</text></answer>`).join('\n') +
      '\n  </question>';
  }).join('\n') + '\n</quiz>\n';

// Google Forms: kolom Kunci Jawaban berisi huruf (pilihan), Benar/Salah, atau jawaban bertulis (isian/uraian). Pedoman skor uraian ikut di Pembahasan.
// Catatan wajib (peran Ustadz) masuk sebagai kolom terakhir 'Catatan', bukan baris tambahan, supaya tidak terbaca sebagai soal saat diimpor.
const buildCsvForms = (qs, catatan = '') =>
  '\uFEFF' + ['Pertanyaan', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', 'Opsi E', 'Kunci Jawaban', 'Pembahasan', ...(catatan ? ['Catatan'] : [])].map(csvEsc).join(',') + '\n' +
  qs.map((q) => [fullQ(q), ...KEYS.map((k) => q.opsi[k]), Bt.kunciTeks(q), Bt.bentukDari(q) === 'uraian' ? umpanUraian(q) : q.pembahasan, ...(catatan ? [catatan] : [])].map(csvEsc).join(',')).join('\n') + '\n';

const buildCsvRdm = (qs, catatan = '') =>
  '\uFEFF' + ['No', 'Tingkat', 'Mapel', 'Level', 'Stimulus', 'Pertanyaan', 'A', 'B', 'C', 'D', 'E', 'Kunci', 'Pembahasan', 'Kitab', 'Kitab (Arab)', 'Juz', 'Halaman', 'Indikator', 'Kelas', 'Ujian', 'Bab', 'Bentuk', 'Jawaban', 'Rubrik', 'Paket', 'Dauri', 'Batas materi', 'No. paket', ...(catatan ? ['Catatan'] : [])].map(csvEsc).join(',') + '\n' +
  qs.map((q, i) => [i + 1, q.tingkat, q.mapel, levelLabel(q.level), q.stimulus, q.pertanyaan, ...KEYS.map((k) => q.opsi[k]), Bt.kunciTeks(q), q.pembahasan, q.nama, q.namaArab, q.juz, q.hal, q.indikator, q.kelas, q.ujian, q.bab, Bt.BENTUK[Bt.bentukDari(q)].label, q.jawaban, q.rubrik, q.paket, q.dawr, q.cakupan, q.urut, ...(catatan ? [catatan] : [])].map(csvEsc).join(',')).join('\n') + '\n';

const buildDocx = async (qs, mode, catatan = '', ejaan = 'alqolam') => {
  const D = await muatDocx();
  await muatPegon(); // mesin Pegon dimuat malas; ekspor Pegon dan Naskah memakainya lewat window.Pegon
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } = D;
  const T = (text, o = {}) => new TextRun({ text: String(text || ''), font: 'Calibri', size: 24, ...o });
  const P = (children, o = {}) => new Paragraph({ children: Array.isArray(children) ? children : [children], spacing: { after: 100 }, ...o });
  const AR = (text, size = 40) => new Paragraph({ bidirectional: true, spacing: { after: 120 }, children: [new TextRun({ text: String(text || ''), font: 'Traditional Arabic', size, rightToLeft: true })] });
  const kids = [];
  const komen = []; // komentar Word (hanya mode Pegon)
  const date = new Date().toLocaleDateString('id-ID', { dateStyle: 'long' });
  kids.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [T(mode === 'kartu' ? 'KARTU SOAL' : 'NASKAH SOAL', { bold: true, size: 32 })] }));
  kids.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [T(`LABSOUMA · ${qs.length} soal · ${date}`, { size: 20, color: '555555' })] }));
  const border = { style: BorderStyle.SINGLE, size: 6, color: '0F6B4F' };
  const borders = { top: border, bottom: border, left: border, right: border };

  if (mode === 'pegon' || mode === 'pegonlatin') {
    // Teks soal dialihaksarakan dengan mesin Pegon (aksara Arab, angka, nominal, URL tidak diubah). Kata yang diragukan
    // mesin disorot kuning dan, bila pustaka mendukung, diberi komentar Word berisi alasannya.
    // 'pegonlatin' menambahkan baris Latin asli (abu-abu) di bawah tiap paragraf Pegon agar mudah diperiksa.
    const dua = mode === 'pegonlatin';
    const FONT = 'Traditional Arabic';
    const un = (h) => String(h || '').replace(/<br>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    const bisaKomen = !!(D.CommentRangeStart && D.CommentRangeEnd && D.CommentReference);
    const runs = (text, o = {}) => {
      const { html } = window.Pegon.convertTextEjaan(String(text || '').replace(/\s*\n+\s*/g, ' '), ejaan);
      const out = []; const re = /<span class="flag"(?: title="([^"]*)")?[^>]*>(.*?)<\/span>/g; let last = 0, m;
      const push = (t, flag, note) => {
        if (!t) return;
        const run = new TextRun({ text: un(t), font: FONT, size: 32, rightToLeft: true, ...(flag ? { highlight: 'yellow' } : {}), ...o });
        if (flag && bisaKomen) {
          const id = komen.length;
          komen.push({ id, author: 'Pegonizer', initials: 'PG', date: new Date(), children: [new Paragraph({ children: [new TextRun({ text: un(note) || 'perlu diperiksa' })] })] });
          out.push(new D.CommentRangeStart(id), run, new D.CommentRangeEnd(id), new TextRun({ children: [new D.CommentReference(id)] }));
        } else out.push(run);
      };
      while ((m = re.exec(html))) { push(html.slice(last, m.index)); push(m[2], true, m[1]); last = re.lastIndex; }
      push(html.slice(last));
      return out;
    };
    const RP = (children, o = {}) => new Paragraph({ bidirectional: true, spacing: { after: 120 }, children, ...o });
    const LP = (t, o = {}) => new Paragraph({ spacing: { after: 120 }, children: [T(t, { size: 20, color: '777777', italics: true })], ...o });
    const adaLatin = (t) => /[A-Za-z]/.test(t); // baris Arab murni tidak perlu diulang
    const baris = (t) => String(t || '').split(/\n+/).map((x) => x.trim()).filter(Boolean);
    const HURUF = { A: 'أ', B: 'ب', C: 'ج', D: 'د', E: 'ه' };
    const NUM = (t, o = {}) => new TextRun({ text: t, font: FONT, size: 32, rightToLeft: true, ...o });
    // Satu entri per baris sumber: stimulus dan pertanyaan tetap paragraf terpisah, baris baru dipertahankan.
    const blok = (items, awalan, o = {}, oLatin = {}) => {
      items.forEach((ln, idx) => {
        kids.push(RP([...(idx === 0 && awalan ? [awalan] : []), ...runs(ln)], o));
        if (dua && adaLatin(ln)) kids.push(LP(ln, oLatin));
      });
    };
    kids.length = 0;
    kids.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [T(dua ? 'NASKAH SOAL (PEGON + LATIN)' : 'NASKAH SOAL (PEGON)', { bold: true, size: 32 })] }));
    kids.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [T(`LABSOUMA · ${qs.length} soal · ${date} · kata bersorot kuning perlu diperiksa${bisaKomen ? ' (lihat komentar)' : ''}`, { size: 20, color: '555555' })] }));
    qs.forEach((q, i) => {
      const items = [...baris(q.stimulus), ...baris(q.pertanyaan)];
      blok(items, NUM(`${i + 1}. `, { bold: true }), { keepNext: true });
      optsOf(q).forEach((k) => {
        kids.push(RP([NUM(`${HURUF[k]}. `), ...runs(q.opsi[k])], { indent: { start: 400 } }));
        if (dua) kids.push(LP(`${k}. ${q.opsi[k]}`, { indent: { left: 400 } }));
      });
      kids.push(P(T('')));
    });
    kids.push(new Paragraph({ pageBreakBefore: true, bidirectional: true, spacing: { after: 160 }, children: runs('Kunci jawaban dan pembahasan', { bold: true }) }));
    qs.forEach((q, i) => {
      const lines = baris(q.pembahasan);
      const bt = Bt.bentukDari(q);
      const kLabel = bt === 'pilgan' || bt === 'lanjutan' ? (HURUF[q.kunci] || q.kunci) : bt === 'benarsalah' ? Bt.kunciTeks(q) : '';
      if (Bt.BENTUK[bt].jawaban) {
        kids.push(RP([NUM(`${i + 1}. `, { bold: true }), ...runs(bt === 'uraian' ? 'Jawaban model:' : 'Jawaban:', { bold: true }), ...runs(' ' + (q.jawaban || ''))]));
        if (bt === 'uraian' && q.rubrik) { kids.push(RP(runs('Pedoman penskoran:', { bold: true }), { indent: { start: 400 } })); baris(q.rubrik).forEach((ln) => kids.push(RP(runs(ln), { indent: { start: 400 } }))); }
        lines.forEach((ln) => { kids.push(RP(runs(ln), { indent: { start: 400 } })); if (dua && adaLatin(ln)) kids.push(LP(ln, { indent: { left: 400 } })); });
      } else {
        kids.push(RP([NUM(`${i + 1}. ${kLabel}  `, { bold: true }), ...(lines[0] ? runs(lines[0]) : [])]));
        if (dua && lines[0] && adaLatin(lines[0])) kids.push(LP(lines[0]));
      }
      (Bt.BENTUK[bt].jawaban ? [] : lines.slice(1)).forEach((ln) => { kids.push(RP(runs(ln), { indent: { start: 400 } })); if (dua && adaLatin(ln)) kids.push(LP(ln, { indent: { left: 400 } })); });
      const kecil = { size: 26, color: '555555' };
      if (q.nama) kids.push(RP(runs(`Rujukan: ${q.nama}${q.juz ? ', juz ' + q.juz : ''}${q.hal ? ', hal. ' + q.hal : ''}`, kecil), { indent: { start: 400 } }));
      if (q.namaArab) kids.push(AR(q.namaArab, 28));
      if (q.indikator) kids.push(RP(runs(`Indikator: ${q.indikator}`, kecil), { indent: { start: 400 } }));
      if (q.teks) kids.push(AR(q.teks));
    });
  } else if (mode === 'daftar') {
    qs.forEach((q, i) => {
      kids.push(P([T(`${i + 1}. `, { bold: true }), T(fullQ(q))], { keepNext: true }));
      optsOf(q).forEach((k) => kids.push(P(T(`${k}. ${q.opsi[k]}`), { indent: { left: 400 } })));
      kids.push(P(T('')));
    });
    kids.push(new Paragraph({ pageBreakBefore: true, children: [T('KUNCI JAWABAN & PEMBAHASAN', { bold: true, size: 28 })], spacing: { after: 160 } }));
    qs.forEach((q, i) => {
      const bt = Bt.bentukDari(q);
      kids.push(P([T(`${i + 1}. ${bt === 'uraian' ? '' : Bt.kunciTeks(q)}`, { bold: true }), T(`  ${q.pembahasan}`)]));
      if (bt === 'uraian') {
        kids.push(P([T('Jawaban model: ', { bold: true }), T(q.jawaban)], { indent: { left: 400 } }));
        if (q.rubrik) kids.push(P([T('Pedoman penskoran: ', { bold: true }), T(q.rubrik)], { indent: { left: 400 } }));
      }
      if (q.nama) kids.push(P(T(`Rujukan: ${q.nama}${q.juz ? ', juz ' + q.juz : ''}${q.hal ? ', hal. ' + q.hal : ''}`, { size: 20, color: '555555', italics: true }), { indent: { left: 400 } }));
      if (q.namaArab) kids.push(AR(q.namaArab, 32));
    });
  } else {
    qs.forEach((q, i) => {
      const cell = (children, shade) => new TableCell({ borders, margins: { top: 100, bottom: 100, left: 160, right: 160 }, width: { size: 100, type: WidthType.PERCENTAGE }, shading: shade ? { fill: shade } : undefined, children });
      const rows = [
        new TableRow({ children: [cell([P(T(`No. ${i + 1}  |  ${q.mapel}  |  ${q.tingkat}${q.kelas ? ' kelas ' + q.kelas : ''}${q.ujian ? '  |  ' + q.ujian : ''}  |  ${levelLabel(q.level)}${Bt.bentukDari(q) !== 'pilgan' ? '  |  ' + Bt.BENTUK[Bt.bentukDari(q)].label : ''}`, { bold: true, color: 'FFFFFF' }))], '0F6B4F')] }),
        new TableRow({ children: [cell([
          ...(q.stimulus ? [P(T(q.stimulus, { italics: true }))] : []),
          P(T(q.pertanyaan, { bold: true })),
          ...optsOf(q).map((k) => P(T(`${k}. ${q.opsi[k]}`), { indent: { left: 300 } })),
        ])] }),
        new TableRow({ children: [cell([
          ...(Bt.BENTUK[Bt.bentukDari(q)].jawaban
            ? [P([T(Bt.bentukDari(q) === 'uraian' ? 'Jawaban model: ' : 'Jawaban: ', { bold: true }), T(q.jawaban, { bold: true, color: '0F6B4F' })]), ...(q.rubrik ? [P([T('Pedoman penskoran: ', { bold: true }), T(q.rubrik)])] : [])]
            : [P([T('Kunci: ', { bold: true }), T(Bt.kunciTeks(q), { bold: true, color: '0F6B4F' })])]),
          P([T('Pembahasan: ', { bold: true }), T(q.pembahasan)]),
          ...(q.indikator ? [P([T('Indikator: ', { bold: true }), T(q.indikator)])] : []),
        ], 'E2F1E9')] }),
        new TableRow({ children: [cell([
          P(T(`Rujukan: ${q.nama || '-'}${q.juz ? ', juz ' + q.juz : ''}${q.hal ? ', hal. ' + q.hal : ''}`, { size: 20, color: '555555' })),
          ...(q.namaArab ? [AR(q.namaArab, 32)] : []),
          ...(q.teks ? [AR(q.teks)] : []),
        ])] }),
      ];
      kids.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
      kids.push(P(T('')));
    });
  }
  // Catatan wajib (peran Ustadz): satu baris di bawah judul dan di kaki setiap halaman. Judul dan subjudul selalu dua paragraf pertama di semua mode.
  const kaki = catatan && D.Footer ? { footers: { default: new D.Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [T(catatan, { size: 18, italics: true, color: '555555' })] })] }) } } : {};
  if (catatan) kids.splice(2, 0, new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [T(catatan, { size: 20, italics: true, color: '8A4B00' })] }));
  const doc = new Document({ ...(komen.length ? { comments: { children: komen } } : {}), sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, ...kaki, children: kids }] });
  return Packer.toBlob(doc);
};

const FORMATS = [
  { id: 'pegon', label: 'Soal Pegon (DOCX)', sub: 'Teks soal ditulis Pegon, kata ragu disorot', icon: Languages, ext: 'docx' },
  { id: 'pegonlatin', label: 'Soal Pegon + Latin (DOCX)', sub: 'Pegon dengan baris Latin asli di bawahnya, untuk diperiksa', icon: Languages, ext: 'docx' },
  { id: 'docx',  label: 'Word (DOCX)',        sub: 'Naskah soal + kunci jawaban',   icon: FileText,        ext: 'docx' },
  { id: 'naskah', label: 'Naskah Ujian IMDA (DOCX)', sub: 'Template Dauri I–IV: tiga bagian, total nilai 100', icon: FileText, ext: 'docx' },
  { id: 'kartu', label: 'Kartu Soal (DOCX)',  sub: 'Satu kartu per soal, ada teks kitab', icon: Layers,    ext: 'docx' },
  { id: 'gift',  label: 'Moodle GIFT',        sub: 'Impor via Question bank',       icon: FileCode,        ext: 'txt', build: buildGift },
  { id: 'mxml',  label: 'Moodle XML',         sub: 'Disimpan sebagai .txt, ganti ke .xml', icon: FileCode, ext: 'txt', build: buildMoodleXml },
  { id: 'gforms', label: 'CSV Google Forms',  sub: 'Pertanyaan, opsi, kunci',       icon: FileSpreadsheet, ext: 'csv', build: buildCsvForms },
  { id: 'rdm',   label: 'CSV RDM / Excel',    sub: 'Semua kolom metadata',          icon: FileSpreadsheet, ext: 'csv', build: buildCsvRdm },
];

export { giftEsc, xmlEsc, giftJawaban, buildGift, buildMoodleXml, buildCsvForms, buildCsvRdm, buildDocx, FORMATS };
