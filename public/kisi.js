// Kisi-kisi soal dan peta cakupan bab. Logika murni: tanpa AI, tanpa jaringan, tanpa DOM.
// Satu sumber untuk browser (window.Kisi) dan server/tes (src/kisi.js). Kisi-kisi dihitung dari soal yang sudah ada,
// jadi isinya tidak bisa "mengarang": setiap baris menunjuk ke soal nyata. Kunci jawaban, opsi, dan pembahasan
// TIDAK PERNAH ikut keluar, supaya kisi-kisi aman dibagikan kepada murid.

const HARAKAT = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
const STOP = new Set(['bab', 'باب', 'kitab', 'كتاب', 'fasal', 'fashl', 'fasl', 'فصل', 'pasal', 'tentang', 'fi', 'في', 'al', 'wa', 'dan']);

/** Samakan penulisan nama bab: buang harakat dan tatwil, satukan bentuk huruf Arab, huruf kecil, buang tanda baca dan apostrof. */
export function normBab(s) {
  return String(s || '').normalize('NFKC').replace(HARAKAT, '')
    .replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .toLowerCase().replace(/[’ʼ'`‘]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

/** Apakah `nama` (nama bab) tercantum di `korpus` (mis. daftar isi yang ditempel)? Cocok bila seluruh nama ada, satu kata bermakna ada sebagai kata utuh, atau >= 60% kata bermakna ada (nama 2 kata atau lebih). */
export function ada(nama, korpus) {
  const n = normBab(nama); const k = normBab(korpus);
  if (!n || !k) return false;
  if (k.includes(n)) return true;
  const kata = n.split(' ').filter((t) => t.length >= 3 && !STOP.has(t));
  if (kata.length === 1) return k.split(' ').includes(kata[0]); // satu kata bermakna (mis. "Zakat"): harus kata utuh, bukan potongan kata lain
  if (kata.length < 2) return false;
  return kata.filter((t) => k.includes(t)).length / kata.length >= 0.6;
}

export const samaBab = (a, b) => { const x = normBab(a); return !!x && x === normBab(b); };

const LV = ['L1', 'L2', 'L3'];
const LVL_NAMA = { L1: 'L1 Ingatan', L2: 'L2 Aplikasi', L3: 'L3 HOTS' };
export const namaLevel = (l) => LVL_NAMA[l] || String(l || '');
export const BELUM = 'Belum ditandai bab';

const angka = (v) => { const m = /^\s*(\d+)\s*$/.exec(String(v ?? '')); return m ? Number(m[1]) : null; };
const unik = (arr) => [...new Set(arr.filter(Boolean))];

/** Rentang halaman dari kumpulan nilai halaman: "8–12" bila semuanya angka, selain itu daftar singkat. */
export function rentangHal(hals) {
  const v = unik(hals.map((h) => String(h || '').trim()));
  if (!v.length) return '';
  const n = v.map(angka);
  if (n.every((x) => x !== null)) { const lo = Math.min(...n); const hi = Math.max(...n); return lo === hi ? String(lo) : `${lo}–${hi}`; }
  return v.slice(0, 3).join(', ') + (v.length > 3 ? ', dst.' : '');
}

const bersihIndikator = (t) => String(t || '').replace(/\s+/g, ' ').trim();

/** "Peserta didik dapat menyebutkan..." -> "Mampu menyebutkan..." untuk lembar murid. */
export const untukMurid = (t) => {
  const s = bersihIndikator(t).replace(/^peserta\s+didik\s+(dapat|mampu)\s+/i, '');
  return s ? 'Mampu ' + s.charAt(0).toLowerCase() + s.slice(1) : '';
};

/**
 * @param {Array} soal  soal (urutan = nomor soal): {nama, juz, hal, bab, level, indikator, mapel, tingkat, kelas, ujian}
 * @param {{judul?:string, madrasah?:string, urutanBab?:string[], prioritas?:Record<string,string>, tahunAjaran?:string}} [opt]
 *        urutanBab: nama bab menurut saran (bab inti lebih dulu); prioritas: nama bab -> inti|penting|pendukung
 */
export function buatKisi(soal, opt = {}) {
  const daftar = (Array.isArray(soal) ? soal : []).map((q, i) => ({ q, no: i + 1 }));
  const urutan = (opt.urutanBab || []).map(normBab);
  const prio = new Map(Object.entries(opt.prioritas || {}).map(([k, v]) => [normBab(k), v]));
  const grup = new Map();
  for (const { q, no } of daftar) {
    const bab = String(q.bab || '').trim() || BELUM;
    const kunci = bab === BELUM ? '' : normBab(bab);
    if (!grup.has(kunci)) grup.set(kunci, { bab, kitab: new Set(), juz: new Set(), hals: [], soal: [], perLevel: { L1: 0, L2: 0, L3: 0 } });
    const g = grup.get(kunci);
    if (q.nama) g.kitab.add(q.nama);
    if (q.juz) g.juz.add(q.juz);
    g.hals.push(q.hal);
    const level = LV.includes(q.level) ? q.level : 'L1';
    g.perLevel[level] += 1;
    g.soal.push({ no, level, bentuk: 'Pilihan ganda', indikator: bersihIndikator(q.indikator), hal: String(q.hal || '').trim() });
  }
  const total = daftar.length;
  const kelompok = [...grup.entries()].map(([kunci, g], idx) => {
    const juz = [...g.juz];
    const rujukan = [[...g.kitab].join(' / '), juz.length ? `juz ${juz.join(', ')}` : '', rentangHal(g.hals) ? `hal. ${rentangHal(g.hals)}` : ''].filter(Boolean).join(', ');
    const pos = urutan.indexOf(kunci);
    return {
      bab: g.bab, rujukan, jumlah: g.soal.length, perLevel: g.perLevel, soal: g.soal,
      bobot: total ? Math.round((g.soal.length / total) * 1000) / 10 : 0,
      prioritas: prio.get(kunci) || '', _urut: kunci === '' ? 1e9 : pos >= 0 ? pos : 1e6 + idx,
    };
  }).sort((a, b) => a._urut - b._urut).map(({ _urut, ...r }) => r);
  const perLevel = { L1: 0, L2: 0, L3: 0 };
  for (const g of kelompok) for (const l of LV) perLevel[l] += g.perLevel[l];
  const ambil = (f) => unik(daftar.map(({ q }) => q[f]));
  return {
    meta: {
      judul: String(opt.judul || '').trim(), madrasah: String(opt.madrasah || '').trim(), tahunAjaran: String(opt.tahunAjaran || '').trim(),
      mapel: ambil('mapel').join(', '), tingkat: ambil('tingkat').join(', '), kelas: ambil('kelas').join(', '), ujian: ambil('ujian').join(', '), kitab: ambil('nama'), total,
    },
    kelompok, perLevel,
    tanpaBab: kelompok.filter((g) => g.bab === BELUM).reduce((n, g) => n + g.jumlah, 0),
  };
}

/** Fokus belajar murid per bab: butir "Mampu ..." unik, rujukan halaman, dan jumlah soal. Tanpa kunci atau isi soal. */
export function fokusMurid(kisi) {
  return kisi.kelompok.map((g) => {
    const seen = new Set(); const butir = [];
    for (const s of g.soal) { const m = untukMurid(s.indikator); const k = normBab(m); if (m && !seen.has(k)) { seen.add(k); butir.push(m); } }
    return { bab: g.bab === BELUM ? 'Materi lainnya' : g.bab, rujukan: g.rujukan, jumlah: g.jumlah, bobot: g.bobot, prioritas: g.prioritas, butir };
  });
}

/**
 * Bandingkan bab saran AI dengan soal yang sudah ada.
 * @param {Array<{nama:string, prioritas?:string, alokasi?:number}>} saran
 * @param {Array} soal  soal dengan field bab
 */
export function analisisCakupan(saran, soal) {
  const hitung = new Map(); let tanpaBab = 0;
  for (const q of soal || []) {
    const k = normBab(q.bab);
    if (!k) { tanpaBab++; continue; }
    hitung.set(k, (hitung.get(k) || 0) + 1);
  }
  const dipakai = new Set();
  const baris = (saran || []).map((b) => {
    const k = normBab(b.nama); const jumlah = hitung.get(k) || 0; dipakai.add(k);
    const alokasi = Number.isInteger(b.alokasi) && b.alokasi > 0 ? b.alokasi : 0;
    let status = jumlah === 0 ? 'kosong' : 'ada';
    if (alokasi && jumlah > 0) status = jumlah < alokasi ? 'kurang' : jumlah === alokasi ? 'cukup' : 'lebih';
    return { nama: b.nama, prioritas: b.prioritas || '', alokasi, jumlah, status };
  });
  const diluarSaran = [...hitung.entries()].filter(([k]) => !dipakai.has(k)).map(([k, n]) => ({ bab: (soal.find((q) => normBab(q.bab) === k) || {}).bab || k, jumlah: n }));
  return { baris, tanpaBab, diluarSaran, intiKosong: baris.filter((b) => b.prioritas === 'inti' && b.jumlah === 0).map((b) => b.nama) };
}

/* ------------------------------------------------------------- Keluaran teks */
const csvEsc = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';

export function kisiKeCsv(kisi) {
  const rows = [['No Soal', 'Bab / Materi', 'Rujukan', 'Indikator Soal', 'Level', 'Bentuk Soal', 'Prioritas Bab']];
  for (const g of kisi.kelompok) for (const s of g.soal) rows.push([s.no, g.bab, g.rujukan, s.indikator, namaLevel(s.level), s.bentuk, g.prioritas]);
  return '﻿' + rows.map((r) => r.map(csvEsc).join(',')).join('\n') + '\n';
}

export function kisiKeTeks(kisi) {
  const m = kisi.meta; const out = [];
  out.push(`KISI-KISI ${m.judul || 'SOAL'}`.toUpperCase());
  for (const [k, v] of [['Madrasah', m.madrasah], ['Mata pelajaran', m.mapel], ['Tingkat/kelas', [m.tingkat, m.kelas && 'kelas ' + m.kelas].filter(Boolean).join(' ')], ['Ujian', m.ujian], ['Kitab', m.kitab.join('; ')], ['Jumlah soal', m.total]]) if (v) out.push(`${k}: ${v}`);
  out.push('');
  for (const g of kisi.kelompok) {
    out.push(`${g.bab}${g.prioritas ? ` [${g.prioritas}]` : ''} · ${g.jumlah} soal (${g.bobot}%)${g.rujukan ? ' · ' + g.rujukan : ''}`);
    for (const s of g.soal) out.push(`  No. ${s.no} · ${s.level} · ${s.indikator || '(indikator belum diisi)'}`);
    out.push('');
  }
  out.push(`Ringkasan level: L1 ${kisi.perLevel.L1}, L2 ${kisi.perLevel.L2}, L3 ${kisi.perLevel.L3}`);
  if (kisi.tanpaBab) out.push(`Catatan: ${kisi.tanpaBab} soal belum ditandai bab.`);
  return out.join('\n') + '\n';
}

/* ---------------------------------------------------------------------- DOCX */
/**
 * Susun dokumen Word. `D` = pustaka docx (window.docx di browser; paket docx di tes). Mengembalikan objek Document,
 * pemanggil yang memanggil Packer (toBlob di browser). Hanya memakai fitur dasar docx agar jalan di versi 8 dan 9.
 * @param {'kisi'|'fokus'|'lengkap'} mode
 */
export function buatKisiDocx(D, kisi, mode = 'lengkap') {
  const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, TableLayoutType } = D;
  const T = (text, o = {}) => new TextRun({ text: String(text ?? ''), font: 'Calibri', size: 22, ...o });
  const P = (kids, o = {}) => new Paragraph({ children: Array.isArray(kids) ? kids : [kids], spacing: { after: 80 }, ...o });
  const tengah = (text, o = {}) => P(T(text, o), { alignment: AlignmentType.CENTER });
  const m = kisi.meta;
  const kids = [];
  const garis = { style: BorderStyle.SINGLE, size: 6, color: '0F6B4F' };
  const borders = { top: garis, bottom: garis, left: garis, right: garis };
  // Lebar tetap dalam DXA (A4 11906 - margin 2 x 1100 = 9706): lebar persentase pada sel diabaikan LibreOffice dan membuat kolom sama lebar.
  const TOTAL = 9706; const KOLOM = [9, 61, 16, 14].map((x) => Math.round((TOTAL * x) / 100));
  const sel = (isi, { w, span, fill, bold, color } = {}) => new TableCell({
    borders, width: { size: Math.round((TOTAL * (w || 100)) / 100), type: WidthType.DXA }, columnSpan: span, shading: fill ? { fill } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [P(T(isi, { bold, color, size: 20 }))],
  });
  const tanggal = new Date().toLocaleDateString('id-ID', { dateStyle: 'long' });

  if (mode !== 'fokus') {
    kids.push(tengah(`KISI-KISI ${m.judul || 'SOAL'}`.toUpperCase(), { bold: true, size: 30 }));
    if (m.madrasah) kids.push(tengah(m.madrasah, { size: 22 }));
    for (const [k, v] of [['Mata pelajaran', m.mapel], ['Tingkat / kelas', [m.tingkat, m.kelas && 'kelas ' + m.kelas].filter(Boolean).join(' ')], ['Ujian', m.ujian], ['Kitab', m.kitab.join('; ')], ['Bentuk soal', 'Pilihan ganda (5 opsi)'], ['Jumlah soal', String(m.total)]]) {
      if (v) kids.push(P([T(`${k}: `, { bold: true }), T(v)], { spacing: { after: 30 } }));
    }
    kids.push(P(T('')));
    const rows = [new TableRow({ tableHeader: true, children: [
      sel('No. Soal', { w: 9, bold: true, fill: '0F6B4F', color: 'FFFFFF' }), sel('Indikator Soal', { w: 61, bold: true, fill: '0F6B4F', color: 'FFFFFF' }),
      sel('Level', { w: 16, bold: true, fill: '0F6B4F', color: 'FFFFFF' }), sel('Halaman', { w: 14, bold: true, fill: '0F6B4F', color: 'FFFFFF' })] })];
    for (const g of kisi.kelompok) {
      rows.push(new TableRow({ children: [sel(`${g.bab}${g.prioritas ? ` (${g.prioritas})` : ''}  ·  ${g.jumlah} soal (${g.bobot}%)${g.rujukan ? '  ·  ' + g.rujukan : ''}`, { span: 4, bold: true, fill: 'E2F1E9' })] }));
      for (const s of g.soal) rows.push(new TableRow({ children: [sel(String(s.no), { w: 9 }), sel(s.indikator || '(indikator belum diisi)', { w: 61 }), sel(namaLevel(s.level), { w: 16 }), sel(s.hal, { w: 14 })] }));
    }
    kids.push(new Table({ width: { size: TOTAL, type: WidthType.DXA }, columnWidths: KOLOM, layout: TableLayoutType.FIXED, rows }));
    kids.push(P(T('')));
    kids.push(P([T('Ringkasan level: ', { bold: true }), T(`L1 Ingatan ${kisi.perLevel.L1} · L2 Aplikasi ${kisi.perLevel.L2} · L3 HOTS ${kisi.perLevel.L3}`)]));
    if (kisi.tanpaBab) kids.push(P(T(`Catatan: ${kisi.tanpaBab} soal belum ditandai bab.`, { italics: true, color: '7A5200' })));
  }

  if (mode !== 'kisi') {
    const awal = mode === 'fokus' ? {} : { pageBreakBefore: true };
    kids.push(new Paragraph({ children: [T('LEMBAR FOKUS BELAJAR', { bold: true, size: 30 })], alignment: AlignmentType.CENTER, spacing: { after: 60 }, ...awal }));
    kids.push(tengah([m.mapel, m.ujian, m.kelas && 'kelas ' + m.kelas].filter(Boolean).join(' · '), { size: 22 }));
    kids.push(P(T('Pelajari bagian-bagian berikut di kitabmu. Jumlah soal menunjukkan seberapa besar bagian itu diujikan.', { italics: true })));
    fokusMurid(kisi).forEach((f, i) => {
      kids.push(P([T(`${i + 1}. ${f.bab}`, { bold: true, size: 24 }), ...(f.prioritas ? [T(`  (${f.prioritas})`, { color: '0F6B4F', bold: true })] : [])], { keepNext: true, spacing: { before: 160, after: 40 } }));
      if (f.rujukan) kids.push(P(T(`Baca: ${f.rujukan}`, { color: '555555' }), { keepNext: true, spacing: { after: 40 } }));
      kids.push(P(T(`Jumlah soal: ${f.jumlah} (${f.bobot}% dari ujian)`, { color: '555555' }), { spacing: { after: 40 } }));
      for (const b of f.butir) kids.push(P(T('•  ' + b), { indent: { left: 400 }, spacing: { after: 30 } }));
    });
  }
  kids.push(P(T(`Dibuat dengan LABSOUMA · ${tanggal}`, { size: 18, color: '777777' }), { spacing: { before: 240 } }));
  return new Document({ sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: kids }] });
}
