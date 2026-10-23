// Pemeriksa kutipan Arab: apakah kutipan di soal/pembahasan benar-benar ada di teks kitab sumber.
// Tanpa dependensi dan tanpa AI (gratis, tanpa kuota). Satu sumber kebenaran:
//  - server  : import dari src/kutipan.js (api/generate.js, api/assist.js)
//  - browser : dimuat lewat <script type="module"> di index.html -> window.Kutipan
//
// Cara kerja: kutipan = rangkaian kata Arab (>= MIN_KATA) yang tidak terputus huruf Latin.
// Teks dinormalisasi (harakat, tatwil, bentuk alif/ya/ta marbutah) lalu dicocokkan per kata
// dengan pencocokan substring aproksimasi (jarak edit tingkat kata, algoritma Sellers).

export const MIN_KATA = 3;       // kutipan lebih pendek dari ini dianggap istilah, bukan kutipan
export const TOLERANSI_MIRIP = 0.15; // selisih <= 15% jumlah kata (minimal 1 kata) = "mirip", perlu dicek manual

const ARAB = '\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF';
const RUN_ARAB = new RegExp(`[${ARAB}](?:[${ARAB}\\s\\u200c\\u200d])*`, 'g');
const HARAKAT = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u08D3-\u08FF]/g;

/** Normalisasi untuk pencocokan: buang harakat/tatwil, samakan variasi huruf, buang tanda baca. */
export function normalisasi(s) {
  return String(s == null ? '' : s)
    .normalize('NFKC')
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\u061c\ufeff]/g, '') // karakter arah/lebar-nol
    .replace(HARAKAT, '')
    .replace(/\u0640/g, '')                       // tatwil
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627') // آ أ إ ٱ -> ا
    .replace(/\u0649/g, '\u064A')                 // ى -> ي
    .replace(/\u0624/g, '\u0648')                 // ؤ -> و
    .replace(/\u0626/g, '\u064A')                 // ئ -> ي
    .replace(/\u0629/g, '\u0647')                 // ة -> ه
    .replace(/\u06A9/g, '\u0643').replace(/\u06CC/g, '\u064A') // ک ی (bentuk Persia) -> ك ي
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')            // tanda baca, kurung, simbol
    .replace(/\s+/g, ' ')
    .trim();
}

/** Seperti normalisasi(), tetapi harakat dipertahankan (untuk mendeteksi perbedaan harakat pada kutipan). */
export function normalisasiH(s) {
  return String(s == null ? '' : s)
    .normalize('NFKC')
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\u061c\ufeff]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064A').replace(/\u0624/g, '\u0648').replace(/\u0626/g, '\u064A').replace(/\u0629/g, '\u0647')
    .replace(/\u06A9/g, '\u0643').replace(/\u06CC/g, '\u064A')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
const ADA_HARAKAT = new RegExp(HARAKAT.source);
const tanpaHarakat = (w) => w.replace(HARAKAT, '');

/**
 * Bandingkan harakat kutipan dengan teks pada posisi yang sama. Hanya kata yang BERHARAKAT di kedua sisi yang dibandingkan
 * (teks tanpa harakat tidak bisa dibantah). Mengembalikan daftar kata berbeda pada posisi terbaik, [] bila cocok.
 */
export function bedaHarakat(kutipanH, q, tokenKitab, tokenKitabH) {
  if (kutipanH.length !== q.length || tokenKitabH.length !== tokenKitab.length) return [];
  let terbaik = null;
  for (let i = 0; i + q.length <= tokenKitab.length; i++) {
    let cocok = true;
    for (let w = 0; w < q.length; w++) if (tokenKitab[i + w] !== q[w]) { cocok = false; break; }
    if (!cocok) continue;
    const beda = [];
    for (let w = 0; w < q.length; w++) {
      const a = kutipanH[w]; const b = tokenKitabH[i + w];
      if (a !== b && ADA_HARAKAT.test(a) && ADA_HARAKAT.test(b) && tanpaHarakat(a) === tanpaHarakat(b)) beda.push({ kutipan: a, teks: b });
    }
    if (!terbaik || beda.length < terbaik.length) terbaik = beda;
    if (!beda.length) break;
  }
  return terbaik || [];
}

/** Ambil kutipan Arab (>= minKata kata) dari satu teks campuran Arab-Indonesia. */
export function ekstrakKutipan(teks, minKata = MIN_KATA) {
  const hasil = [];
  for (const m of String(teks || '').matchAll(RUN_ARAB)) {
    const mentah = m[0].trim();
    const norm = normalisasi(mentah);
    if (norm && norm.split(' ').length >= minKata) hasil.push({ mentah, norm });
  }
  return hasil;
}

/**
 * Pencocokan substring aproksimasi tingkat kata (Sellers).
 * @returns {{jarak:number, awal:number, akhir:number}} jarak edit minimum; jendela teks [awal, akhir)
 */
export function cocokkan(q, t) {
  const m = q.length;
  const n = t.length;
  let prevD = new Array(n + 1).fill(0);
  let prevS = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curD = new Array(n + 1);
    const curS = new Array(n + 1);
    curD[0] = i; curS[0] = 0;
    for (let j = 1; j <= n; j++) {
      let d = prevD[j - 1] + (q[i - 1] === t[j - 1] ? 0 : 1); let s = prevS[j - 1];
      if (prevD[j] + 1 < d) { d = prevD[j] + 1; s = prevS[j]; }
      if (curD[j - 1] + 1 < d) { d = curD[j - 1] + 1; s = curS[j - 1]; }
      curD[j] = d; curS[j] = s;
    }
    prevD = curD; prevS = curS;
  }
  let best = 0;
  for (let j = 1; j <= n; j++) if (prevD[j] < prevD[best]) best = j;
  return { jarak: prevD[best], awal: prevS[best], akhir: best };
}

export const LABEL_BIDANG = {
  pembahasan: 'Pembahasan', stimulus: 'Stimulus', pertanyaan: 'Pertanyaan', jawaban: 'Jawaban', rubrik: 'Pedoman penskoran',
  A: 'Opsi A', B: 'Opsi B', C: 'Opsi C', D: 'Opsi D', E: 'Opsi E',
};

/**
 * Periksa semua kutipan Arab pada bidang-bidang soal terhadap teks kitab.
 * @param {Record<string,string>} bidang  mis. { pembahasan, stimulus, pertanyaan, A..E }
 * @param {string} teks  teks kitab sumber
 * @returns {{status:'lolos'|'periksa'|'gagal'|'tanpa_teks', ringkas:{total,cocok,mirip,tidak_ditemukan}, detail:Array, peringatan:string[]}}
 */
export function periksaKutipan(bidang, teks, { minKata = MIN_KATA, toleransi = TOLERANSI_MIRIP } = {}) {
  const ringkas = { total: 0, cocok: 0, mirip: 0, tidak_ditemukan: 0 };
  const detail = [];
  const peringatan = [];
  const kitab = normalisasi(teks);
  if (!kitab) {
    return { status: 'tanpa_teks', ringkas, detail, peringatan: ['Teks kitab kosong, kutipan tidak bisa diperiksa.'] };
  }
  const tokenKitab = kitab.split(' ');
  const tokenKitabH = normalisasiH(teks).split(' ');
  const gudang = ` ${kitab} `; // jalur cepat untuk kecocokan persis

  for (const [nama, isi] of Object.entries(bidang || {})) {
    for (const k of ekstrakKutipan(isi, minKata)) {
      ringkas.total++;
      let status; let skor;
      let terdekat; let harakatBeda;
      if (gudang.includes(` ${k.norm} `)) {
        status = 'cocok'; skor = 1;
        // Kata sama tetapi harakat berbeda bisa mengubah hukum (nahwu/sharaf): tandai "mirip", bukan lolos.
        const hb = bedaHarakat(normalisasiH(k.mentah).split(' '), k.norm.split(' '), tokenKitab, tokenKitabH);
        if (hb.length) { status = 'mirip'; skor = 0.9; harakatBeda = hb; }
      } else {
        const q = k.norm.split(' ');
        const r = cocokkan(q, tokenKitab);
        skor = Math.max(0, 1 - r.jarak / q.length);
        // Satu kata yang berganti sudah cukup mengubah hukum, jadi selisih kecil tetap ditandai (bukan lolos).
        status = r.jarak <= Math.max(1, Math.floor(q.length * toleransi)) && r.jarak < q.length / 2 ? 'mirip' : 'tidak_ditemukan';
        terdekat = tokenKitab.slice(r.awal, r.akhir).join(' ');
      }
      ringkas[status]++;
      detail.push({ bidang: nama, label: LABEL_BIDANG[nama] || nama, kutipan: k.mentah, status, skor: Math.round(skor * 100) / 100, ...(terdekat ? { terdekat } : {}), ...(harakatBeda ? { bedaHarakat: harakatBeda } : {}) });
    }
  }

  const pembahasanAda = String((bidang || {}).pembahasan || '').trim();
  const kutipanPembahasan = detail.some((d) => d.bidang === 'pembahasan');
  if (pembahasanAda && !kutipanPembahasan) {
    peringatan.push('Pembahasan tidak memuat kutipan Arab dari teks kitab, padahal pembahasan seharusnya menyertakan dalilnya.');
  }
  const status = ringkas.tidak_ditemukan > 0 ? 'gagal' : (ringkas.mirip > 0 || peringatan.length ? 'periksa' : 'lolos');
  return { status, ringkas, detail, peringatan };
}

/* ---- Pemetaan bentuk data yang berbeda ke `bidang` ---- */

/** Soal keluaran AI (pilihan_a..e, pembahasan, stimulus, pertanyaan). */
export const bidangDariAI = (s) => ({
  pembahasan: s?.pembahasan, stimulus: s?.stimulus, pertanyaan: s?.pertanyaan,
  A: s?.pilihan_a, B: s?.pilihan_b, C: s?.pilihan_c, D: s?.pilihan_d, E: s?.pilihan_e,
  ...(s?.jawaban || s?.rubrik ? { jawaban: s?.jawaban, rubrik: s?.rubrik } : {}), // soal isian/uraian; bentuk lain tidak punya
});

/** Soal bentuk aplikasi/Firestore (opsi: {A..E}, pembahasan, stimulus, pertanyaan). */
export const bidangDariSoal = (q) => ({
  pembahasan: q?.pembahasan, stimulus: q?.stimulus, pertanyaan: q?.pertanyaan,
  A: q?.opsi?.A, B: q?.opsi?.B, C: q?.opsi?.C, D: q?.opsi?.D, E: q?.opsi?.E,
  ...(q?.jawaban || q?.rubrik ? { jawaban: q?.jawaban, rubrik: q?.rubrik } : {}),
});
