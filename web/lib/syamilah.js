// Parser ekspor Maktabah Syamilah (.txt Unicode UTF-8) -> kitab + halaman + daftar isi.
// Murni (tanpa dependensi, tanpa API Node) supaya browser (unggah admin) dan server memakai satu sumber.
// Dirancang dari DUA berkas nyata: Fathul Mu'in (matn Qurratul 'Ain + syarah, tanpa harakat) dan
// Fathul Qarib (matn Abu Syuja' dalam kurung, berharakat). Aturan di bawah menyebut bukti dari berkas itu.
//
// Temuan format yang membentuk kode ini:
//  1. Penanda halaman = baris yang diakhiri "(ص: N)" dan diawali judul kitab (diulang di setiap halaman).
//  2. Nomor halaman BUKAN kunci unik: Fathul Mu'in punya 35 nomor kembar dan 2 nomor mundur
//     (mis. 91,91 ; 332,239,333 ; 534,523,534). Maka kunci dokumen = urutan (seq), nomor cetak hanya label.
//  3. Judul bab = baris berawalan dua ZWNJ (U+200C), di Fathul Qarib diberi "•" di depannya. Baris berawalan ZWNJ
//     tidak selalu judul (butir bernomor matn juga memakainya), jadi tanpa tanda "•" harus berawalan kata kunci bab.
//  4. Fathul Mu'in: satu baris tatwil murni (ـ) memisah matn (atas) dari syarah (bawah) pada tiap halaman.
//  5. Catatan kaki tahqiq: blok di akhir halaman, setelah baris kosong, bernomor 1,2,.. ("1 في نسخة..." atau "(1) ...").
//     Rujukan takhrij sisipan "[البخاري رقم: 1 ...]" adalah tambahan muhaqqiq, bukan teks pengarang.

export const FORMAT_VERSI = 1;
export const KATA_KUNCI_BAB = /^(مقدمة|مدخل|كتاب|باب|فصل|فرع|تتمة|خاتمة)/;

export class ErrorSyamilah extends Error {
  constructor(kode, pesan) { super(pesan); this.name = 'ErrorSyamilah'; this.kode = kode; }
}

const ANGKA_INDIA = '٠١٢٣٤٥٦٧٨٩';
export const keAngka = (s) => String(s).replace(/[٠-٩]/g, (d) => String(ANGKA_INDIA.indexOf(d)));
export const rapikan = (s) => String(s).replace(/[\u00a0\u200c]/g, ' ').replace(/\s+/g, ' ').trim();

const RE_MARKER = /^(.*?)\(\s*(?:ج\s*:?\s*([0-9٠-٩]+)\s*[-–،,]?\s*)?ص\s*:\s*([0-9٠-٩]+)\s*\)\s*$/;
const RE_JUDUL = /^\s*(•)?\s*\u200c\u200c\s*(.*\S)\s*$/;
const RE_PEMISAH = /^\u0640+\s*$/;
const RE_CATATAN = /^\s*(?:\((\d{1,3})\)|(\d{1,3}))\s+\S/;
export const RE_TAKHRIJ = /[ \u00a0]*\[[^\]\n]*رقم\s*:[^\]\n]*\]/g;
const RE_PENGISI = /^[\s.\u00b7\u2026\u2022*_\-0\u0660]+$/; // baris titik-titik, nol, "…", "* * *" (penanda matn dipotong)
export const HARAKAT = /[\u064B-\u0652\u0670]/g;
export const HURUF = /[\u0621-\u064A]/g;

export const MEDAN = {
  'القسم': 'fan', 'الكتاب': 'judulPanjang', 'المؤلف': 'pengarang', 'بعناية': 'muhaqqiq', 'تحقيق': 'muhaqqiq', 'المحقق': 'muhaqqiq',
  'الناشر': 'penerbit', 'الطبعة': 'cetakan', 'عدد الأجزاء': 'jumlahJuz', 'عدد الصفحات': 'jumlahHalamanCetak',
  'أعده للشاملة': 'pengunggah', 'تاريخ النشر بالشاملة': 'tanggalSyamilah',
};

/** Baca kepala berkas (baris sebelum penanda halaman pertama). */
export function parseKepala(baris) {
  const k = {};
  const first = rapikan(baris[0] || '');
  const mj = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(String(baris[0] || '').replace(/\u00a0/g, ' ').trim());
  k.judul = rapikan(mj ? mj[1] : first);
  if (mj) k.pengarangRingkas = rapikan(mj[2]);
  for (const b of baris.slice(1)) {
    const m = /^\s*([^:]{2,30}):\s*(.*\S)\s*$/.exec(b);
    if (m && MEDAN[m[1].trim()]) k[MEDAN[m[1].trim()]] = rapikan(m[2]);
    if (/ترقيم الكتاب موافق للمطبوع/.test(b)) k.penomoranSesuaiCetak = true;
  }
  const w = /\(\s*(?:ت|المتوفى\s*:?)\s*([0-9٠-٩]{2,4})\s*هـ?\s*\)/.exec(k.pengarang || '');
  if (w) k.wafatH = +keAngka(w[1]);
  if (k.jumlahJuz) k.jumlahJuz = +keAngka(k.jumlahJuz) || 1;
  if (k.jumlahHalamanCetak) k.jumlahHalamanCetak = +keAngka(k.jumlahHalamanCetak) || null;
  return k;
}

function levelJudul(j, bullet) {
  if (/^(مقدمة|مدخل|كتاب)/.test(j)) return 1;
  if (/^باب/.test(j)) return 2;
  if (/^فصل/.test(j)) return 3;
  return bullet ? 4 : 3;
}

/** Buang blok catatan kaki di akhir halaman (bernomor mulai 1, didahului baris kosong). */
function potongCatatanKaki(ls) {
  let akhir = ls.length;
  while (akhir > 0 && !ls[akhir - 1].trim()) akhir--;
  let awal = akhir;
  while (awal > 0 && ls[awal - 1].trim()) awal--;
  if (awal === 0 || awal === akhir) return { isi: ls, nomor: [] };
  const nomor = [];
  for (let i = awal; i < akhir; i++) {
    const m = RE_CATATAN.exec(ls[i]);
    if (!nomor.length) {
      if (!m || +(m[1] || m[2]) !== 1) return { isi: ls, nomor: [] }; // blok pertama harus bernomor 1
      nomor.push(1);
    } else if (m && +(m[1] || m[2]) === nomor.length + 1) nomor.push(nomor.length + 1);
    // baris lain = lanjutan catatan sebelumnya
  }
  return { isi: ls.slice(0, awal), nomor };
}

function buangRujukanSisipan(teks, nomor) {
  let t = teks;
  for (const n of nomor) {
    t = t.replace(new RegExp(`\\(${n}\\)`, 'g'), '');
    t = t.replace(new RegExp(`(?<=[\\u0621-\\u064A\\u064B-\\u0652])${n}(?=[\\s.،:؛)]|$)`, 'g'), '');
  }
  return t;
}

function prosesHalaman(barisMentah) {
  const judul = [];
  let ls = [];
  for (const b of barisMentah) {
    const m = RE_JUDUL.exec(b);
    if (m) {
      const j = rapikan(m[2]);
      if ((m[1] && j) || (KATA_KUNCI_BAB.test(j) && j.length <= 120)) { judul.push({ judul: j, level: levelJudul(j, !!m[1]) }); continue; }
    }
    ls.push(b);
  }
  const kaki = potongCatatanKaki(ls);
  ls = kaki.isi;
  let pemisah = -1;
  ls = ls.map((b) => b.replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '').replace(/\u00a0/g, ' ').replace(/[ \t]+$/g, ''));
  ls.forEach((b, i) => { if (pemisah < 0 && RE_PEMISAH.test(b)) pemisah = i; });
  const bersih = (arr) => {
    const keluar = [];
    for (const b of arr) {
      if (RE_PEMISAH.test(b)) continue;
      if (b.trim() && RE_PENGISI.test(b)) continue;
      keluar.push(b);
    }
    return keluar.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  };
  let matn = null; let syarh;
  if (pemisah >= 0) { matn = bersih(ls.slice(0, pemisah)); syarh = bersih(ls.slice(pemisah + 1)); }
  else syarh = bersih(ls);
  let rujukan = 0;
  const hapus = (s) => { const n = s.replace(RE_TAKHRIJ, () => { rujukan++; return ''; }); return buangRujukanSisipan(n, kaki.nomor); };
  if (matn !== null) matn = hapus(matn);
  syarh = hapus(syarh);
  let teks; let batasMatn = null;
  if (matn !== null) { teks = matn && syarh ? `${matn}\n${syarh}` : (matn || syarh); batasMatn = matn.length; }
  else teks = syarh;
  return { teks, batasMatn, judul, catatanKaki: kaki.nomor.length, rujukanDibuang: rujukan };
}

/**
 * Parse satu berkas ekspor Syamilah.
 * @returns {{kitab:object, halaman:object[], daftarIsi:object[], laporan:object}}
 */
export function parseSyamilah(mentah, opsi = {}) {
  const semua = String(mentah ?? '').replace(/^\ufeff/, '').replace(/\r\n?/g, '\n').split('\n');
  let awalan = null; const penanda = [];
  for (let i = 0; i < semua.length; i++) {
    const m = RE_MARKER.exec(semua[i]);
    if (!m) continue;
    const a = rapikan(m[1]);
    if (awalan === null) awalan = a; else if (a !== awalan) continue; // "(ص: 5)" di akhir kalimat isi bukan penanda
    penanda.push({ i, juz: m[2] ? +keAngka(m[2]) : 1, hal: +keAngka(m[3]) });
  }
  if (!penanda.length) throw new ErrorSyamilah('TANPA_PENANDA', 'Tidak ada penanda halaman "(ص: N)". Pastikan berkas hasil ekspor Syamilah (UTF-8) dan bukan salinan tempel.');

  const kepala = parseKepala(semua.slice(0, penanda[0].i));
  const halaman = []; const daftarIsi = [];
  const laporan = { anomali: { duplikat: 0, mundur: 0, lompat: 0 }, halamanTanpaPemisah: 0, catatanKakiDibuang: 0, rujukanDibuang: 0, halamanKosong: 0, daftarAnomali: [] };
  let babAktif = ''; let prev = null; let totalChar = 0; let harakat = 0; let huruf = 0; let terpanjang = 0; let denganPemisah = 0;

  penanda.forEach((p, k) => {
    const akhir = k + 1 < penanda.length ? penanda[k + 1].i : semua.length;
    const h = prosesHalaman(semua.slice(p.i + 1, akhir));
    const seq = k + 1;
    let anomali = null;
    if (prev) {
      if (p.hal === prev.hal && p.juz === prev.juz) anomali = 'duplikat';
      else if (p.juz === prev.juz && p.hal < prev.hal) anomali = 'mundur';
      else if (p.juz === prev.juz && p.hal > prev.hal + 1) anomali = 'lompat';
    }
    if (anomali) { laporan.anomali[anomali]++; laporan.daftarAnomali.push({ seq, juz: p.juz, hal: p.hal, prevHal: prev.hal, jenis: anomali }); }
    for (const j of h.judul) {
      daftarIsi.push({ judul: j.judul, level: j.level, juz: p.juz, hal: p.hal, seq });
      if (j.level <= 3) babAktif = j.judul;
    }
    const doc = { id: `p${String(seq).padStart(5, '0')}`, seq, juz: p.juz, hal: p.hal, teks: h.teks, batasMatn: h.batasMatn };
    if (babAktif) doc.bab = babAktif;
    if (anomali) doc.nomorAnomali = anomali;
    if (!h.teks) laporan.halamanKosong++;
    if (h.batasMatn === null) laporan.halamanTanpaPemisah++; else denganPemisah++;
    laporan.catatanKakiDibuang += h.catatanKaki; laporan.rujukanDibuang += h.rujukanDibuang;
    totalChar += h.teks.length; terpanjang = Math.max(terpanjang, h.teks.length);
    harakat += (h.teks.match(HARAKAT) || []).length; huruf += (h.teks.match(HURUF) || []).length;
    halaman.push(doc); prev = p;
  });

  const kitab = {
    judul: kepala.judul, judulLatin: opsi.judulLatin || '', pengarang: kepala.pengarang || kepala.pengarangRingkas || '',
    wafatH: kepala.wafatH ?? null, fan: kepala.fan || '', mazhab: opsi.mazhab || '',
    edisi: { penerbit: kepala.penerbit || '', muhaqqiq: kepala.muhaqqiq || '', cetakan: kepala.cetakan || '' },
    jumlahHalaman: halaman.length, jumlahJuz: kepala.jumlahJuz || Math.max(...penanda.map((p) => p.juz)),
    penomoranSesuaiCetak: !!kepala.penomoranSesuaiCetak,
    bentukMatn: denganPemisah / halaman.length > 0.5 ? 'pemisah-tatwil' : 'tanpa-pemisah',
    berharakat: huruf ? harakat / huruf > 0.02 : false,
    hakCipta: { status: 'belum-dicek', catatan: kepala.muhaqqiq ? `Ada muhaqqiq: ${kepala.muhaqqiq}. Teks pengarang klasik domain publik; hasil tahqiq/judul/catatan kaki edisi bisa dilindungi.` : '' },
    sumber: { jenis: 'syamilah-txt', pengunggah: kepala.pengunggah || '', tanggalSyamilah: kepala.tanggalSyamilah || '' },
    formatParser: FORMAT_VERSI, aktif: true, revisi: 1,
  };
  if (opsi.kitabId) kitab.id = opsi.kitabId;

  const ukuranBytes = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(halaman.map((x) => x.teks).join('')).length : totalChar * 2;
  Object.assign(laporan, {
    jumlahHalaman: halaman.length, halPertama: penanda[0].hal, halTerakhir: penanda[penanda.length - 1].hal,
    judulTerdeteksi: daftarIsi.length, totalKarakter: totalChar, halamanTerpanjang: terpanjang, ukuranBytes,
    halamanMelebihiBatas: halaman.filter((x) => x.teks.length > (opsi.batasTeks || 12000)).map((x) => x.seq),
    nisbahHarakat: huruf ? +(harakat / huruf).toFixed(4) : 0,
    selisihDenganKepala: kepala.jumlahHalamanCetak ? halaman.length - kepala.jumlahHalamanCetak : null,
  });
  return { kitab, halaman, daftarIsi, laporan };
}

/** Ambil rentang halaman dari hasil parse (untuk tes dan pratinjau). */
export const ambilTeks = (hasil, dariSeq, sampaiSeq = dariSeq) => hasil.halaman.filter((h) => h.seq >= dariSeq && h.seq <= sampaiSeq).map((h) => h.teks).join('\n');
