// Bentuk soal: satu sumber kebenaran untuk server (src/bentuk.js) dan browser (window.Bentuk).
// Fungsi murni, tanpa dependensi.
//
// Model data (kompatibel dengan soal lama):
//   bentuk  : 'pilgan' (bawaan; bila kosong/tidak dikenal) | 'lanjutan' | 'benarsalah' | 'isian' | 'uraian'
//   opsi    : {A..E}  dipakai pilgan, lanjutan (A-E) dan benarsalah (A = "Benar", B = "Salah")
//   kunci   : huruf opsi; kosong untuk isian dan uraian
//   jawaban : kunci jawaban bertulis (isian: jawaban singkat; uraian: jawaban model)
//   rubrik  : pedoman penskoran (uraian saja)
// Soal tanpa field `bentuk` selalu dibaca sebagai pilihan ganda.

export const BENTUK = {
  pilgan: {
    id: 'pilgan', label: 'Pilihan ganda', singkat: 'Pilgan', opsi: ['A', 'B', 'C', 'D', 'E'], jawaban: false, rubrik: false,
    ket: 'Kalimat tanya dengan lima opsi, satu kunci.',
    contoh: 'Berapa rakaat shalat Maghrib?',
  },
  lanjutan: {
    id: 'lanjutan', label: 'Melanjutkan (pilihan)', singkat: 'Lanjutan', opsi: ['A', 'B', 'C', 'D', 'E'], jawaban: false, rubrik: false,
    ket: 'Kalimat dibiarkan menggantung (.....); opsi adalah kelanjutannya.',
    contoh: 'Seorang musafir boleh mengqashar shalat apabila ......',
  },
  benarsalah: {
    id: 'benarsalah', label: 'Benar–Salah', singkat: 'B/S', opsi: ['A', 'B'], jawaban: false, rubrik: false,
    ket: 'Pernyataan yang dinilai Benar atau Salah menurut teks.',
    contoh: 'Shalat Maghrib terdiri dari empat rakaat.',
  },
  isian: {
    id: 'isian', label: 'Melanjutkan (isian)', singkat: 'Isian', opsi: [], jawaban: true, rubrik: false,
    ket: 'Kalimat dengan titik-titik yang diisi sendiri oleh peserta didik.',
    contoh: 'Syarat sah shalat ada ..... perkara.',
  },
  uraian: {
    id: 'uraian', label: 'Uraian', singkat: 'Uraian', opsi: [], jawaban: true, rubrik: true,
    ket: 'Pertanyaan terbuka; jawaban model dan pedoman penskoran disertakan.',
    contoh: 'Jelaskan syarat-syarat seorang musafir boleh mengqashar shalat!',
  },
};
export const BENTUK_IDS = Object.keys(BENTUK);
export const OPSI_BENARSALAH = { A: 'Benar', B: 'Salah' };

// Urutan = yang paling dianjurkan lebih dulu. Ini saran pedagogis awal (bisa diubah di sini), bukan pembatasan:
// semua bentuk tetap bisa dipilih di tingkat mana pun, dan tingkat buatan admin mendapat semua bentuk.
export const BENTUK_PER_TINGKAT = {
  mi: ['lanjutan', 'benarsalah', 'isian', 'pilgan'],
  mts: ['pilgan', 'lanjutan', 'isian', 'uraian', 'benarsalah'],
  ma: ['pilgan', 'uraian', 'isian', 'lanjutan'],
};
const ALIAS_TINGKAT = { mi: 'mi', ibtidaiyah: 'mi', mts: 'mts', tsanawiyah: 'mts', ma: 'ma', aliyah: 'ma' };

/** Id bentuk yang sah, atau 'pilgan' bila kosong/tidak dikenal. */
export const bentukDari = (q) => {
  const b = String(q && typeof q === 'object' ? q.bentuk : q || '').trim().toLowerCase();
  return Object.hasOwn(BENTUK, b) ? b : 'pilgan';
};
/** Seperti bentukDari, tetapi nilai yang diisi dan tidak dikenal mengembalikan null (untuk validasi masukan). */
export const bentukSah = (v) => {
  const b = String(v ?? '').trim().toLowerCase();
  if (!b) return 'pilgan';
  return Object.hasOwn(BENTUK, b) ? b : null;
};
export const punyaOpsi = (b) => BENTUK[bentukDari(b)].opsi.length > 0;
export const kunciOpsi = (b) => BENTUK[bentukDari(b)].opsi;

/** Bentuk yang dianjurkan untuk satu tingkat (kunci MI/MTs/MA atau namanya). Tingkat tak dikenal: semua bentuk. */
export function bentukUntukTingkat(tingkat) {
  const nama = String(tingkat || '').trim().toLowerCase().replace(/\s*\(.*\)\s*$/, '');
  const k = Object.hasOwn(ALIAS_TINGKAT, nama) ? ALIAS_TINGKAT[nama] : undefined; // hasOwn: "constructor"/"__proto__" bukan tingkat
  return k ? BENTUK_PER_TINGKAT[k] : BENTUK_IDS;
}
export const dianjurkan = (tingkat, b) => bentukUntukTingkat(tingkat).includes(bentukDari(b));

/** Opsi yang ikut ditampilkan/diekspor untuk soal `q` (hanya yang terisi dan sesuai bentuknya). */
export function opsiTerpakai(q) {
  const o = (q && q.opsi) || {};
  return kunciOpsi(q).filter((k) => String(o[k] || '').trim());
}

/** Teks kunci untuk ekspor dan tampilan: huruf (pilgan/lanjutan), Benar/Salah, atau jawaban bertulis. */
export function kunciTeks(q) {
  const b = bentukDari(q);
  if (b === 'benarsalah') return OPSI_BENARSALAH[q.kunci] || '';
  if (BENTUK[b].jawaban) return String(q.jawaban || '').trim();
  return String(q.kunci || '');
}

/** Pilihan ganda tanpa awalan huruf? Bentuk berpenanda: kalimat harus memuat titik-titik. */
export const PENANDA_RE = /\.{3,}|…|_{3,}/;
export const adaPenanda = (s) => PENANDA_RE.test(String(s || ''));

/** Perbaiki isi soal sesuai bentuknya sebelum disimpan: opsi dan kunci mengikuti bentuk. */
export function selaraskan(q) {
  const b = bentukDari(q);
  const o = { ...((q && q.opsi) || {}) };
  const out = { ...q, bentuk: b };
  if (b === 'benarsalah') { out.opsi = { A: OPSI_BENARSALAH.A, B: OPSI_BENARSALAH.B, C: '', D: '', E: '' }; if (!['A', 'B'].includes(out.kunci)) out.kunci = ''; }
  else if (!punyaOpsi(b)) { out.opsi = { A: '', B: '', C: '', D: '', E: '' }; out.kunci = ''; }
  else out.opsi = { A: o.A || '', B: o.B || '', C: o.C || '', D: o.D || '', E: o.E || '' };
  if (!BENTUK[b].jawaban) out.jawaban = '';
  if (!BENTUK[b].rubrik) out.rubrik = '';
  return out;
}

/** Daftar masalah (teks Indonesia) yang menghalangi soal dikirim ke editor; kosong bila layak. */
export function periksaSoal(q) {
  const b = bentukDari(q); const e = [];
  const t = (v) => String(v || '').trim();
  if (!t(q.pertanyaan)) e.push(b === 'benarsalah' ? 'Pernyataan belum diisi.' : 'Pertanyaan belum diisi.');
  if ((b === 'lanjutan' || b === 'isian') && t(q.pertanyaan) && !adaPenanda(q.pertanyaan)) e.push('Kalimat belum memuat titik-titik (.....) tempat melanjutkan.');
  if (b === 'pilgan' || b === 'lanjutan') {
    const terisi = opsiTerpakai(q);
    if (terisi.length < 2) e.push('Isi minimal dua opsi jawaban.');
    if (!q.kunci) e.push('Pilih kunci jawaban.');
    else if (!t((q.opsi || {})[q.kunci])) e.push(`Opsi ${q.kunci} kosong, tetapi dipilih sebagai kunci.`);
  } else if (b === 'benarsalah') {
    if (!['A', 'B'].includes(q.kunci)) e.push('Tentukan pernyataan ini Benar atau Salah.');
  } else {
    if (!t(q.jawaban)) e.push(b === 'uraian' ? 'Jawaban model belum diisi.' : 'Jawaban isian belum diisi.');
    if (b === 'uraian' && !t(q.rubrik)) e.push('Pedoman penskoran belum diisi.');
  }
  if (!t(q.pembahasan)) e.push('Pembahasan atau dalil pendukung belum diisi.');
  return e;
}
