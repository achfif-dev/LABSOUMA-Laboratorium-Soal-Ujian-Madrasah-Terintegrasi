// Analisis butir soal dari hasil ujian: tingkat kesukaran (p), daya beda (D, kelompok atas-bawah 27%), korelasi butir-total,
// fungsi pengecoh (bila jawaban huruf), dan reliabilitas KR-20. Fungsi murni: tanpa DOM, tanpa Firestore.

const DATA = /^(?:[01]|[A-Ea-e]|)$/;
const SEL_HURUF = /^[A-Ea-e]$/;

/** Teks tempelan (dari Excel/Sheets: tab; atau CSV: koma/titik koma) menjadi baris sel. */
export function bacaMatriks(teks) {
  const baris = String(teks || '').replace(/\r/g, '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (!baris.length) return { sel: [], judul: false, kolomNama: false };
  const pisah = baris[0].includes('\t') ? '\t' : baris[0].includes(';') ? ';' : ',';
  let sel = baris.map((l) => l.split(pisah).map((c) => c.trim()));
  // Baris judul: baris pertama yang berisi sel bukan data (bukan 0/1/A-E/kosong).
  const judul = sel.length > 1 && sel[0].some((c) => !DATA.test(c));
  if (judul) sel = sel.slice(1);
  // Kolom nama: kolom pertama yang berisi sel bukan data pada salah satu baris.
  const kolomNama = sel.length > 0 && sel.some((r) => !DATA.test(r[0] ?? ''));
  if (kolomNama) sel = sel.map((r) => r.slice(1));
  return { sel, judul, kolomNama };
}

const rata = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

/** Korelasi Pearson; 0 bila salah satu variabel tidak bervariasi. */
export function korelasi(x, y) {
  const n = x.length; if (n < 2) return 0;
  const mx = rata(x); const my = rata(y);
  let sxy = 0; let sxx = 0; let syy = 0;
  for (let i = 0; i < n; i++) { const a = x[i] - mx; const b = y[i] - my; sxy += a * b; sxx += a * a; syy += b * b; }
  return sxx === 0 || syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
}

export const kategoriKesukaran = (p) => (p < 0.3 ? 'Sukar' : p > 0.7 ? 'Mudah' : 'Sedang');
export const kategoriDayaBeda = (d) => (d < 0 ? 'Negatif' : d >= 0.4 ? 'Sangat baik' : d >= 0.3 ? 'Baik' : d >= 0.2 ? 'Cukup' : 'Jelek');

/**
 * @param {string[][]} sel  baris = siswa, kolom = butir. Nilai 0/1, atau huruf A-E (butuh `kunci`). Kosong = tidak menjawab (salah).
 * @param {string[]} [kunci] kunci per butir (huruf), wajib bila sel berisi huruf.
 * @returns {{galat:string[], peringatan:string[], n:number, butir:object[], kr20:number|null, rataSkor:number}}
 */
export function analisis(sel, kunci = []) {
  const galat = []; const peringatan = [];
  const n = sel.length; const m = n ? Math.max(...sel.map((r) => r.length)) : 0;
  if (n < 5) galat.push('Minimal 5 siswa agar analisis berarti (disarankan 30 ke atas).');
  if (!m) galat.push('Tidak ada kolom butir.');
  const huruf = sel.some((r) => r.some((c) => SEL_HURUF.test(c)));
  const biner = sel.some((r) => r.some((c) => c === '0' || c === '1'));
  if (huruf && biner) galat.push('Data bercampur angka 0/1 dan huruf A-E. Pakai salah satu saja.');
  const k = kunci.map((x) => String(x || '').trim().toUpperCase());
  if (huruf && !galat.length) {
    if (k.length !== m) galat.push(`Jumlah kunci (${k.length}) harus sama dengan jumlah butir (${m}).`);
    else if (k.some((x) => !/^[A-E]$/.test(x))) galat.push('Kunci harus huruf A sampai E, satu per butir.');
  }
  if (galat.length) return { galat, peringatan, n, butir: [], kr20: null, rataSkor: 0 };
  if (n < 30) peringatan.push(`Hanya ${n} siswa: angka daya beda dan kesukaran belum stabil. Anggap sebagai petunjuk, bukan keputusan.`);

  // Jumlah opsi dianggap = huruf tertinggi yang muncul di seluruh data atau kunci (soal 4 opsi tidak dituduh punya pengecoh E yang mati).
  const hurufTertinggi = huruf ? Math.max(...sel.flat().concat(k).filter((c) => SEL_HURUF.test(c)).map((c) => c.toUpperCase().charCodeAt(0) - 64)) : 0;
  const OPSI = ['A', 'B', 'C', 'D', 'E'].slice(0, Math.max(hurufTertinggi, 2));
  const kosong = (c) => c === undefined || c === '';
  const skor = sel.map((r) => Array.from({ length: m }, (_, j) => {
    const c = r[j];
    if (kosong(c)) return 0;
    return huruf ? (String(c).toUpperCase() === k[j] ? 1 : 0) : Number(c);
  }));
  const total = skor.map((r) => r.reduce((a, b) => a + b, 0));
  const urut = skor.map((_, i) => i).sort((a, b) => total[b] - total[a]);
  const g = Math.max(1, Math.round(0.27 * n));
  const atas = urut.slice(0, g); const bawah = urut.slice(n - g);

  const butir = Array.from({ length: m }, (_, j) => {
    const kol = skor.map((r) => r[j]);
    const p = rata(kol);
    const d = (atas.reduce((a, i) => a + skor[i][j], 0) - bawah.reduce((a, i) => a + skor[i][j], 0)) / g;
    const rbt = korelasi(kol, total.map((t, i) => t - kol[i])); // total tanpa butir itu sendiri
    const b = { no: j + 1, p, d, r: rbt, kesukaran: kategoriKesukaran(p), dayaBeda: kategoriDayaBeda(d), saran: [] };
    if (huruf) {
      const hitung = { A: 0, B: 0, C: 0, D: 0, E: 0, kosong: 0 }; const hAtas = { A: 0, B: 0, C: 0, D: 0, E: 0 };
      sel.forEach((r, i) => { const c = String(r[j] ?? '').toUpperCase(); if (hitung[c] !== undefined && c !== '') { hitung[c]++; if (atas.includes(i)) hAtas[c]++; } else hitung.kosong++; });
      b.kunci = k[j]; b.sebaran = hitung;
      b.pengecohMati = OPSI.filter((o) => o !== k[j] && hitung[o] / n < 0.05);
      const salahAtas = OPSI.filter((o) => o !== k[j] && hAtas[o] > hAtas[k[j]]);
      if (salahAtas.length) b.saran.push(`Kelompok atas lebih banyak memilih ${salahAtas.join('/')} daripada kunci ${k[j]}: periksa apakah kunci salah.`);
    }
    if (d < 0) b.saran.push('Daya beda negatif: siswa lemah lebih sering benar daripada siswa kuat. Periksa kunci dan kalimat soal.');
    else if (d < 0.2) b.saran.push('Daya beda rendah: revisi soal atau buang.');
    if (p > 0.9) b.saran.push('Terlalu mudah (hampir semua benar).');
    if (p < 0.1) b.saran.push('Terlalu sukar (hampir semua salah): periksa kunci dan materi yang sudah diajarkan.');
    if (b.pengecohMati && b.pengecohMati.length) b.saran.push(`Pengecoh ${b.pengecohMati.join(', ')} hampir tidak dipilih: ganti dengan yang lebih menarik.`);
    b.status = b.saran.length ? (d < 0 || p < 0.1 ? 'periksa' : 'revisi') : 'pertahankan';
    return b;
  });

  const sumPQ = butir.reduce((a, b) => a + b.p * (1 - b.p), 0);
  const mt = rata(total); const varT = total.reduce((a, t) => a + (t - mt) ** 2, 0) / n;
  const kr20 = m > 1 && varT > 0 ? (m / (m - 1)) * (1 - sumPQ / varT) : null;
  return { galat, peringatan, n, butir, kr20, rataSkor: rata(total) / m };
}

export const labelKr20 = (r) => (r === null ? 'tidak dapat dihitung' : r >= 0.8 ? 'tinggi' : r >= 0.6 ? 'cukup' : 'rendah');

const q = (v) => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function hasilKeCsv(h) {
  const kepala = ['No', 'Kesukaran (p)', 'Kategori', 'Daya beda (D)', 'Kategori', 'Korelasi butir-total', 'Status', 'Saran'];
  const baris = h.butir.map((b) => [b.no, b.p.toFixed(2), b.kesukaran, b.d.toFixed(2), b.dayaBeda, b.r.toFixed(2), b.status, b.saran.join(' ')]);
  return '\ufeff' + [kepala, ...baris].map((r) => r.map(q).join(',')).join('\r\n');
}
