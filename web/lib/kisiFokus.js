// Kisi-kisi dua jenis untuk naskah Bank Soal Manual. Fungsi murni (tanpa AI, jaringan, DOM), dipakai browser, server, dan tes.
//
//   UMUM  : cakupan dan bobot per materi pokok (bab), bentuk soal, dan level kemampuan. Tidak ada nomor soal, kalimat soal, indikator butir,
//           jawaban, atau halaman. Menggambarkan "apa saja yang diujikan dan seberapa besar", seperti kisi-kisi ujian pada umumnya.
//   FOKUS : arah belajar murid per bab: topik-topik yang perlu dipelajari dan rentang bacaan yang LEBAR. Bukan bocoran:
//           - topik (`fokus`) ditulis satu tingkat lebih luas dari butir, dan butir serumpun berbagi topik yang sama;
//           - topik diperiksa kode: bila memuat jawaban, angka jawaban, atau salinan kalimat soal, dibuang (`bocor`);
//           - tidak ada nomor soal, bentuk, level, atau jumlah per topik; urutan topik diurutkan abjad, bukan menurut nomor soal;
//           - rentang halaman per BAB (bukan per soal) dan dilebarkan (`rentangAman`), sehingga tidak menunjuk satu halaman.
//   Kisi-kisi rinci per nomor (indikator butir) tetap ada di web/lib/kisi.js untuk guru dan TIDAK dibagikan ke murid.
import { PRESET_DAURI, dauriSah, BAGIAN } from './naskah.js';
import { BELUM, namaLevel, normBab } from './kisi.js';
import { kunciBab } from './kitabNama.js';

export const MAKS_FOKUS_PER_BAB = 8;
const LEVEL = ['L1', 'L2', 'L3'];
const KET_LEVEL = {
  L1: 'Ingatan: mengingat dan menyebutkan fakta, definisi, atau ketentuan.',
  L2: 'Aplikasi: menjelaskan, menentukan, dan menerapkan ketentuan pada keadaan tertentu.',
  L3: 'HOTS: membandingkan, menganalisis, dan menyimpulkan.',
};
const LABEL_BENTUK = { a: 'Pilihan (memilih jawaban yang benar)', b: 'Isian (melengkapi kalimat)', c: 'Uraian (menjawab singkat)' };

const angkaLatin = (s) => String(s || '').replace(/[٠-٩۰-۹]/g, (c) => String(c.charCodeAt(0) >= 0x06f0 ? c.charCodeAt(0) - 0x06f0 : c.charCodeAt(0) - 0x0660));
const kata = (s) => normBab(angkaLatin(s)).split(' ').filter(Boolean);

/**
 * Apakah teks fokus berpotensi membocorkan butir? Benar bila fokus memuat: angka yang ada di jawaban, jawaban utuh (>= 3 huruf),
 * dua kata berurutan dari jawaban, atau tiga kata berurutan dari kalimat soal. Pemeriksaan sengaja agresif: fokus yang dibuang bisa
 * diisi ulang guru, bocoran tidak bisa ditarik kembali.
 */
export function bocor(fokus, b) {
  const f = kata(fokus);
  if (!f.length || !b) return false;
  const padat = ` ${f.join(' ')} `;
  const rahasia = [b.jawaban, b.opsi && b.kunci ? b.opsi[b.kunci] : '', b.kutipan];
  for (const r of rahasia) {
    const t = kata(r);
    if (!t.length) continue;
    if (t.some((x) => /^\d+$/.test(x) && f.includes(x))) return true;
    if (t.join('').length >= 3 && padat.includes(` ${t.join(' ')} `)) return true;
    for (let i = 0; i + 1 < t.length; i++) if (t[i].length + t[i + 1].length >= 6 && padat.includes(` ${t[i]} ${t[i + 1]} `)) return true;
  }
  const q = kata(b.pertanyaan);
  for (let i = 0; i + 2 < q.length; i++) if (padat.includes(` ${q[i]} ${q[i + 1]} ${q[i + 2]} `)) return true;
  return false;
}

/** Butir yang fokusnya terdeteksi bocor: [{bagian, no}]. Dipakai pratinjau untuk memperingatkan guru yang mengetik fokus sendiri. */
export const fokusBocor = (butir) => (butir || []).filter((b) => String(b.fokus || '').trim() && bocor(b.fokus, b)).map((b) => ({ bagian: b.bagian, no: b.no }));

/**
 * Rentang bacaan yang dilebarkan: halaman dilebarkan 1 ke tiap sisi; nomor hadits ("ح1017") dibulatkan keluar ke kelipatan 10.
 * Satu butir tunggal pun tidak menunjuk satu halaman atau satu hadits. Nilai bukan angka diabaikan.
 */
export function rentangAman(hals) {
  const v = [...new Set((hals || []).map((h) => angkaLatin(String(h || '').trim())).filter(Boolean))];
  const hal = v.filter((x) => /^\d+$/.test(x)).map(Number);
  const hadits = v.filter((x) => /^ح\d+$/.test(x)).map((x) => Number(x.slice(1)));
  const out = [];
  if (hal.length) out.push(`hal. ${Math.max(1, Math.min(...hal) - 1)}–${Math.max(...hal) + 1}`);
  if (hadits.length) out.push(`hadits no. ${Math.floor(Math.min(...hadits) / 10) * 10}–${Math.ceil((Math.max(...hadits) + 1) / 10) * 10}`);
  return out.join('; ');
}

/** Kelompokkan butir per bab (kunci bab sama = satu kelompok), urut menurut jumlah nilai terbesar lalu abjad. */
function kelompokBab(butir, nilaiBagian) {
  const peta = new Map();
  for (const b of butir) {
    const nama = String(b.bab || '').trim() || BELUM;
    const k = nama === BELUM ? '' : kunciBab(nama);
    if (!peta.has(k)) peta.set(k, { bab: nama, butir: [] });
    peta.get(k).butir.push(b);
  }
  const total = butir.reduce((n, b) => n + (nilaiBagian[b.bagian] || 0), 0);
  return [...peta.entries()].map(([k, g]) => {
    const poin = g.butir.reduce((n, b) => n + (nilaiBagian[b.bagian] || 0), 0);
    return { kunci: k, bab: g.bab, butir: g.butir, poin, bobot: total ? Math.round((poin / total) * 1000) / 10 : 0 };
  }).sort((a, b) => (a.kunci === '' ? 1 : 0) - (b.kunci === '' ? 1 : 0) || b.poin - a.poin || normBab(a.bab).localeCompare(normBab(b.bab)));
}

const metaPaket = (paket) => ({
  judul: String(paket.judul || '').trim(), mapel: paket.mapel || '', tingkat: paket.tingkat || '', kelas: paket.kelas || '', kitab: paket.kitab || '',
  ujian: PRESET_DAURI[dauriSah(paket.dawr)].label, periode: paket.periode || '', tahun: paket.tahun || '',
});
const nilaiPerBagian = (paket) => Object.fromEntries(PRESET_DAURI[dauriSah(paket.dawr)].bagian.map((p) => [p.kode, p.nilai]));

/**
 * Kisi-kisi umum. Hanya agregat: tidak membawa teks soal, indikator butir, kunci, atau halaman.
 * @returns {{meta, bagian:{kode,huruf,label,jumlah,nilai,poin}[], kelompok:{bab,jumlah,poin,bobot,level:string[],bentuk:string[]}[], perLevel, totalSoal, totalPoin, tanpaBab:number}}
 */
export function buatKisiUmum(paket) {
  const butir = Array.isArray(paket && paket.butir) ? paket.butir : [];
  const preset = PRESET_DAURI[dauriSah(paket && paket.dawr)];
  const nilai = nilaiPerBagian(paket || {});
  const bagian = preset.bagian.map((p) => { const n = butir.filter((b) => b.bagian === p.kode).length; return { kode: p.kode, huruf: BAGIAN[p.kode].huruf, label: LABEL_BENTUK[p.kode], jumlah: n, nilai: p.nilai, poin: n * p.nilai }; });
  const kelompok = kelompokBab(butir, nilai).map((g) => {
    const adaLevel = LEVEL.filter((l) => g.butir.some((b) => (LEVEL.includes(b.level) ? b.level : 'L1') === l));
    const adaBentuk = ['a', 'b', 'c'].filter((k) => g.butir.some((b) => b.bagian === k));
    return { bab: g.bab === BELUM ? 'Materi lainnya' : g.bab, jumlah: g.butir.length, poin: g.poin, bobot: g.bobot, level: adaLevel.map(namaLevel), bentuk: adaBentuk.map((k) => BAGIAN[k].huruf) };
  });
  const perLevel = { L1: 0, L2: 0, L3: 0 };
  for (const b of butir) perLevel[LEVEL.includes(b.level) ? b.level : 'L1']++;
  return {
    meta: metaPaket(paket || {}), bagian, kelompok, perLevel, totalSoal: butir.length, totalPoin: bagian.reduce((n, b) => n + b.poin, 0),
    tanpaBab: butir.filter((b) => !String(b.bab || '').trim()).length,
  };
}

/** Prioritas bab menurut bobot nilainya: tiga jenjang kasar (bukan angka), supaya tidak membocorkan jumlah soal per topik. */
export const prioritasDariBobot = (bobot) => (bobot >= 30 ? 'Fokus utama' : bobot >= 15 ? 'Penting' : 'Pendukung');

/**
 * Lembar fokus belajar. Per bab: prioritas kasar, rentang bacaan yang dilebarkan, dan topik belajar (unik, abjad, maksimal MAKS_FOKUS_PER_BAB).
 * Topik yang bocor (`bocor`) dibuang dan dihitung di `dibuang` agar guru tahu bahwa ada yang perlu ditulis ulang.
 */
export function buatKisiKhusus(paket) {
  const butir = Array.isArray(paket && paket.butir) ? paket.butir : [];
  const nilai = nilaiPerBagian(paket || {});
  let dibuang = 0; let tanpaFokus = 0;
  const kelompok = kelompokBab(butir, nilai).map((g) => {
    const lihat = new Set(); const topik = [];
    for (const b of g.butir) {
      const t = String(b.fokus || '').replace(/\s+/g, ' ').trim();
      if (!t) { tanpaFokus++; continue; }
      if (bocor(t, b)) { dibuang++; continue; }
      const k = normBab(t);
      if (!lihat.has(k)) { lihat.add(k); topik.push(t); }
    }
    topik.sort((a, b) => normBab(a).localeCompare(normBab(b)));
    return { bab: g.bab === BELUM ? 'Materi lainnya' : g.bab, prioritas: prioritasDariBobot(g.bobot), rentang: rentangAman(g.butir.map((b) => b.hal)), topik: topik.slice(0, MAKS_FOKUS_PER_BAB) };
  });
  return { meta: { ...metaPaket(paket || {}), kitab: (paket && paket.kitab) || '' }, kelompok, dibuang, tanpaFokus, kosong: kelompok.every((g) => !g.topik.length) };
}

/* ------------------------------------------------------------- Keluaran teks */
const csvEsc = (s) => `"${String(s == null ? '' : s).replace(/"/g, '""')}"`;

export function kisiUmumKeCsv(u) {
  const rows = [['Materi Pokok', 'Jumlah Soal', 'Bobot (%)', 'Level Kemampuan', 'Bagian']];
  for (const g of u.kelompok) rows.push([g.bab, g.jumlah, g.bobot, g.level.join('; '), g.bentuk.join(' ')]);
  return `﻿${rows.map((r) => r.map(csvEsc).join(',')).join('\n')}\n`;
}

export function kisiKhususKeCsv(k) {
  const rows = [['Materi Pokok', 'Prioritas', 'Bacaan', 'Fokus Belajar']];
  for (const g of k.kelompok) rows.push([g.bab, g.prioritas, g.rentang, g.topik.join(' | ')]);
  return `﻿${rows.map((r) => r.map(csvEsc).join(',')).join('\n')}\n`;
}

export function kisiKhususKeTeks(k) {
  const m = k.meta; const out = [];
  out.push(`LEMBAR FOKUS BELAJAR ${[m.mapel, m.ujian, m.kelas && `kelas ${m.kelas}`].filter(Boolean).join(' · ')}`.trim());
  if (m.kitab) out.push(`Kitab: ${m.kitab}`);
  out.push('');
  k.kelompok.forEach((g, i) => {
    out.push(`${i + 1}. ${g.bab} (${g.prioritas})`);
    if (g.rentang) out.push(`   Baca: ${[m.kitab, g.rentang].filter(Boolean).join(', ')}`);
    if (g.topik.length) for (const t of g.topik) out.push(`   - ${t}`); else out.push('   - Pelajari seluruh pembahasan bab ini.');
    out.push('');
  });
  return `${out.join('\n')}\n`;
}

/* ---------------------------------------------------------------------- DOCX */
/**
 * Susun dokumen Word. `D` = pustaka docx (modul `docx`; di browser lewat muatDocx). mode: 'umum' | 'fokus' | 'lengkap'.
 * Kisi-kisi umum dan lembar fokus sama-sama aman dibagikan ke murid; keduanya tidak memuat soal, kunci, atau nomor soal.
 */
export function buatKisiFokusDocx(D, paket, mode = 'lengkap') {
  const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, TableLayoutType } = D;
  const T = (text, o = {}) => new TextRun({ text: String(text ?? ''), font: 'Calibri', size: 22, ...o });
  const P = (kids, o = {}) => new Paragraph({ children: Array.isArray(kids) ? kids : [kids], spacing: { after: 80 }, ...o });
  const tengah = (text, o = {}) => P(T(text, o), { alignment: AlignmentType.CENTER });
  const garis = { style: BorderStyle.SINGLE, size: 6, color: '0F6B4F' };
  const borders = { top: garis, bottom: garis, left: garis, right: garis };
  const TOTAL = 9706;
  const sel = (isi, { w = 100, fill, bold, color, span } = {}) => new TableCell({
    borders, width: { size: Math.round((TOTAL * w) / 100), type: WidthType.DXA }, columnSpan: span, shading: fill ? { fill } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [P(T(isi, { bold, color, size: 20 }))],
  });
  const kepala = (teks, w) => sel(teks, { w, bold: true, fill: '0F6B4F', color: 'FFFFFF' });
  const tabel = (kolom, baris) => new Table({
    width: { size: TOTAL, type: WidthType.DXA }, columnWidths: kolom.map((w) => Math.round((TOTAL * w) / 100)), layout: TableLayoutType.FIXED,
    rows: [new TableRow({ tableHeader: true, children: kolom.map((w, i) => kepala(baris[0][i], w)) }), ...baris.slice(1).map((r) => new TableRow({ children: r.map((c, i) => sel(c, { w: kolom[i] })) }))],
  });
  const tanggal = new Date().toLocaleDateString('id-ID', { dateStyle: 'long' });
  const kids = [];
  const meta = metaPaket(paket);
  const identitas = (judul) => {
    kids.push(tengah(judul, { bold: true, size: 30 }));
    for (const [k, v] of [['Mata pelajaran', meta.mapel], ['Tingkat / kelas', [meta.tingkat, meta.kelas && `kelas ${meta.kelas}`].filter(Boolean).join(' ')], ['Ujian', [meta.ujian, meta.periode].filter(Boolean).join(' ')], ['Kitab', meta.kitab]]) {
      if (v) kids.push(P([T(`${k}: `, { bold: true }), T(v)], { spacing: { after: 30 } }));
    }
    kids.push(P(T('')));
  };

  if (mode !== 'fokus') {
    const u = buatKisiUmum(paket);
    identitas('KISI-KISI UMUM');
    kids.push(P(T('Bentuk soal dan bobot nilai', { bold: true, size: 24 }), { keepNext: true }));
    kids.push(tabel([10, 50, 20, 20], [['Bagian', 'Bentuk soal', 'Jumlah soal', 'Nilai tiap soal'], ...u.bagian.map((b) => [b.huruf, b.label, String(b.jumlah), String(b.nilai)])]));
    kids.push(P(T('')));
    kids.push(P(T('Cakupan materi', { bold: true, size: 24 }), { keepNext: true }));
    kids.push(tabel([46, 14, 14, 26], [['Materi pokok', 'Jumlah soal', 'Bobot', 'Kemampuan yang diukur'], ...u.kelompok.map((g) => [g.bab, String(g.jumlah), `${g.bobot}%`, g.level.join(', ')])]));
    kids.push(P(T('')));
    kids.push(P(T('Keterangan kemampuan', { bold: true, size: 24 }), { keepNext: true }));
    for (const l of LEVEL) if (u.perLevel[l]) kids.push(P(T(`${namaLevel(l)}. ${KET_LEVEL[l]}`), { indent: { left: 300 }, spacing: { after: 30 } }));
    kids.push(P(T('Kisi-kisi umum menggambarkan cakupan dan bobot ujian, bukan daftar soal. Arah belajar yang lebih terperinci ada pada Lembar Fokus Belajar.', { italics: true, color: '555555' }), { spacing: { before: 120 } }));
  }

  if (mode !== 'umum') {
    const k = buatKisiKhusus(paket);
    const awal = mode === 'fokus' ? {} : { pageBreakBefore: true };
    kids.push(new Paragraph({ children: [T('LEMBAR FOKUS BELAJAR', { bold: true, size: 30 })], alignment: AlignmentType.CENTER, spacing: { after: 60 }, ...awal }));
    kids.push(tengah([meta.mapel, meta.ujian, meta.kelas && `kelas ${meta.kelas}`].filter(Boolean).join(' · '), { size: 22 }));
    kids.push(P(T('Pelajari bagian-bagian berikut di kitabmu, dimulai dari yang paling utama. Topik di bawah adalah arah belajar, bukan daftar soal: pahami seluruh pembahasannya, jangan menghafal satu-satu.', { italics: true })));
    k.kelompok.forEach((g, i) => {
      kids.push(P([T(`${i + 1}. ${g.bab}`, { bold: true, size: 24 }), T(`  (${g.prioritas})`, { color: '0F6B4F', bold: true })], { keepNext: true, spacing: { before: 160, after: 40 } }));
      if (g.rentang) kids.push(P(T(`Baca: ${[meta.kitab, g.rentang].filter(Boolean).join(', ')}`, { color: '555555' }), { keepNext: true, spacing: { after: 40 } }));
      if (g.topik.length) for (const t of g.topik) kids.push(P(T(`•  ${t}`), { indent: { left: 400 }, spacing: { after: 30 } }));
      else kids.push(P(T('•  Pelajari seluruh pembahasan bab ini.'), { indent: { left: 400 }, spacing: { after: 30 } }));
    });
  }
  kids.push(P(T(`Dibuat dengan LABSOUMA · ${tanggal}`, { size: 18, color: '777777' }), { spacing: { before: 240 } }));
  return new Document({ sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: kids }] });
}
