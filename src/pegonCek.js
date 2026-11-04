// Pemeriksa deterministik atas keluaran AI Pegon: gratis, tanpa AI, dan berjalan di server maupun tes.
// Tujuannya satu: AI boleh MEMPERBAIKI hasil mesin, tetapi tidak boleh menghilangkan kata, membocorkan huruf Latin,
// mengubah kutipan Arab/angka, atau "mengubah diam-diam" kata yang tidak ia laporkan. Semua pemeriksaan murni (tanpa jaringan).

export const TANDA = '⚠';
const ARAB_HURUF = '\\u0600-\\u06FF\\u0750-\\u077F\\uFB50-\\uFDFF\\uFE70-\\uFEFF';
const ARAB_RUN = new RegExp(`[${ARAB_HURUF}][${ARAB_HURUF}\\s]*[${ARAB_HURUF}]`, 'g');
const LATIN_KATA = /[A-Za-z\u00C0-\u024F]{2,}/g;
const ANGKA = /\d+(?:[.,]\d+)*/g;
const TANDA_BACA = /[\u060C\u061B\u061F.,;:!?()"'\u201C\u201D\u00AB\u00BB\u2018\u2019[\]{}]/g;

const str = (v) => String(v ?? '');
const rapat = (t) => str(t).replace(/\s+/g, ' ').trim();

/** Buang tanda ⚠ (beserta spasi sesudahnya). */
export const tanpaTanda = (t) => str(t).replace(/\u26A0\uFE0F?\s*/g, '');
/** ⚠ ditempelkan ke kata sesudahnya, supaya perataan kata tidak menganggapnya kata tersendiri. */
const rekatTanda = (t) => str(t).replace(/\u26A0\uFE0F?\s+/g, TANDA);
/** Pecah teks menjadi [kata, pemisah, kata, ...]; indeks genap = kata, ganjil = spasi/baris baru. */
const pecah = (t) => str(t).split(/(\s+)/);
const inti = (tok) => tanpaTanda(tok).replace(TANDA_BACA, '').trim();

export const tokenKata = (t) => pecah(tanpaTanda(t)).filter((x, i) => i % 2 === 0 && x);

/** Kata Latin berhuruf >= 2 pada teks (huruf kecil, unik). */
const kataLatin = (t) => new Set((tanpaTanda(t).match(LATIN_KATA) || []).map((x) => x.toLowerCase()));

function hitung(daftar) {
  const m = new Map();
  for (const x of daftar) m.set(x, (m.get(x) || 0) + 1);
  return m;
}

/**
 * Periksa hasil AI terhadap teks Latin dan hasil mesin.
 * Kembalian: { masalah: [{ kode, berat, pesan }], berat: boolean }.
 * berat = true berarti hasil AI TIDAK boleh dipakai apa adanya (kata hilang, huruf Latin bocor, kutipan Arab/angka berubah).
 */
export function periksaKeluaran({ latin, mesin, pegon }) {
  const masalah = [];
  const tambah = (kode, berat, pesan) => masalah.push({ kode, berat, pesan });
  const ai = tanpaTanda(pegon);
  const m = tanpaTanda(mesin);

  // 1) Jumlah kata: AI tidak boleh membuang atau menggandakan kata.
  const nM = tokenKata(m).length;
  const nA = tokenKata(ai).length;
  if (nM >= 3) {
    const r = nA / nM;
    if (r < 0.75 || r > 1.35) tambah('JUMLAH_KATA', true, `Jumlah kata hasil AI (${nA}) jauh berbeda dari hasil mesin (${nM}). Ada kata yang hilang atau bertambah.`);
    else if (nA !== nM) tambah('JUMLAH_KATA_BEDA', false, `Jumlah kata hasil AI (${nA}) sedikit berbeda dari hasil mesin (${nM}).`);
  } else if (Math.abs(nA - nM) >= 2) {
    tambah('JUMLAH_KATA', true, `Jumlah kata hasil AI (${nA}) berbeda dari hasil mesin (${nM}).`);
  }

  // 2) Huruf Latin tidak boleh bocor ke hasil Pegon (kecuali bagian terlindung yang memang sudah Latin pada hasil mesin: URL, kode, nominal).
  const bolehLatin = kataLatin(m);
  const bocor = [...kataLatin(ai)].filter((w) => !bolehLatin.has(w));
  if (bocor.length) tambah('LATIN_BOCOR', true, `Ada kata Latin pada hasil AI yang tidak ada pada hasil mesin: ${bocor.slice(0, 5).join(', ')}.`);

  // 3) Kutipan Arab pada teks sumber harus utuh.
  const arabAsli = (str(latin).match(ARAB_RUN) || []).map(rapat).filter((x) => x.length >= 2);
  const aiRapat = rapat(ai);
  const hilang = arabAsli.filter((x) => !aiRapat.includes(x));
  if (hilang.length) tambah('ARAB_ASLI_BERUBAH', true, `Aksara Arab pada teks sumber berubah atau hilang (${hilang.length} bagian).`);

  // 4) Angka (termasuk nominal dan desimal) tidak boleh berubah.
  const angkaM = hitung(m.match(ANGKA) || []);
  const angkaA = hitung(ai.match(ANGKA) || []);
  const angkaHilang = [...angkaM].filter(([k, v]) => (angkaA.get(k) || 0) < v).map(([k]) => k);
  if (angkaHilang.length) tambah('ANGKA_BERUBAH', true, `Angka berubah atau hilang: ${angkaHilang.slice(0, 5).join(', ')}.`);

  // 5) Standar al-Qolam: NG satu huruf (ڠ), NY = پ. Hanya peringatan (bisa sah pada serapan Arab tertentu).
  const pecahNg = (x) => (x.match(/\u0646[\u06AC\u06AF]/g) || []).length;
  if (pecahNg(ai) > pecahNg(m)) tambah('NG_TERPECAH', false, 'Ada “ng” yang ditulis nun + gaf, bukan satu huruf ڠ.');
  if (/[\u06BD\u0767]/.test(ai) && !/[\u06BD\u0767]/.test(m)) tambah('NY_SALAH', false, 'Huruf ny ditulis ڽ; standar al-Qolam memakai پ.');

  return { masalah, berat: masalah.some((x) => x.berat) };
}

const sama = (a, b) => inti(a) === inti(b);

/**
 * Jaga perubahan liar. Bila kata hasil AI bisa disejajarkan satu-satu dengan hasil mesin, perubahan HANYA diterima kalau
 * AI melaporkannya (perubahan[].ke cocok) dengan alasan. Perubahan tanpa laporan dikembalikan ke hasil mesin, tanda ⚠ tetap.
 * Bila jumlah kata berbeda, tidak ada yang dikembalikan (selaras = false).
 */
export function jagaPerubahan({ mesin, pegon, perubahan = [] }) {
  const P = pecah(rekatTanda(pegon));
  const M = pecah(rekatTanda(mesin));
  const tokP = P.filter((_, i) => i % 2 === 0 && P[i] !== '');
  const tokM = M.filter((_, i) => i % 2 === 0 && M[i] !== '');
  const lapor = (Array.isArray(perubahan) ? perubahan : []).filter((x) => x && str(x.ke).trim() && str(x.alasan).trim());
  if (!tokP.length || tokP.length !== tokM.length) return { teks: str(pegon).trim(), diterima: [], dikembalikan: [], selaras: false };

  const diterima = []; const dikembalikan = [];
  let k = -1;
  const keluar = P.map((bagian, i) => {
    if (i % 2 === 1 || bagian === '') return bagian;
    k++;
    const asal = tokM[k];
    const bertanda = bagian.startsWith(TANDA);
    const baru = tanpaTanda(bagian);
    if (baru === tanpaTanda(asal)) return bagian;
    const l = lapor.find((x) => sama(x.ke, baru) || (sama(x.dari, tanpaTanda(asal)) && inti(x.ke).includes(inti(baru))));
    if (l) { diterima.push({ no: k + 1, dari: tanpaTanda(asal), ke: baru, alasan: str(l.alasan).trim().slice(0, 300), jenis: str(l.jenis).slice(0, 30) }); return bagian; }
    dikembalikan.push({ no: k + 1, dari: tanpaTanda(asal), ke: baru });
    return (bertanda ? TANDA : '') + tanpaTanda(asal);
  });
  return { teks: keluar.join('').trim(), diterima, dikembalikan, selaras: true };
}

/**
 * Bagi teks panjang menjadi paling banyak 4 bagian per baris agar tiap panggilan AI tidak terpotong (max_tokens).
 * Hanya bila jumlah baris Latin dan hasil mesin sama; selain itu satu bagian utuh.
 */
export function bagiBagian(latin, mesin, { minimal = 1800, maksBagian = 4 } = {}) {
  const L = str(latin).split('\n');
  const M = str(mesin).split('\n');
  if (str(latin).length <= minimal || L.length !== M.length) return [{ latin: str(latin), mesin: str(mesin) }];
  const target = Math.max(minimal, Math.ceil(str(latin).length / 3));
  const hasil = [];
  let a = []; let b = []; let n = 0;
  for (let i = 0; i < L.length; i++) {
    if (a.length && n + L[i].length > target) { hasil.push({ latin: a.join('\n'), mesin: b.join('\n') }); a = []; b = []; n = 0; }
    a.push(L[i]); b.push(M[i]); n += L[i].length + 1;
  }
  if (a.length) hasil.push({ latin: a.join('\n'), mesin: b.join('\n') });
  return hasil.length > maksBagian ? [{ latin: str(latin), mesin: str(mesin) }] : hasil;
}
