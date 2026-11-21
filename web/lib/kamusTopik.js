// Kamus TOPIK untuk pencarian halaman Tanya Kitab (pelengkap kamusIlmu.js, yang berisi arti istilah): bagian MURNI (tanpa AI, tanpa jaringan), dipakai server (src/telaahKitab.js) dan tes.
//   1. cariTopik      : entri kamus yang cocok dengan pertanyaan (sebutan Indonesia ATAU istilah Arab), paling banyak 4 entri.
//   2. barisTopik     : entri jadi baris petunjuk untuk AI perencana (nama topik di kitab + kata isi khas).
//   3. kueriTopik     : kueri pencarian tambahan (varian berbobot rendah) dari entri yang cocok.
//   4. fanTopik     : bidang ilmu yang paling mungkin, dari entri yang cocok.
//   5. KELUARGA_TOPIK : keluarga kata (bentuk kata/sinonim sejati) untuk perluasKueri di penelaahan.js.
// Kamus hanya memuat NAMA dan KATA KUNCI. Tidak memuat isi hukum, jadi tidak pernah menjadi sumber jawaban.
import { normalCari, siapkanKueri } from './cariKitab.js';
import { FIQH_TEKS, KELUARGA_FIQH } from './kamusTopikFiqh.js';
import { ILMU_TEKS, KELUARGA_ILMU } from './kamusTopikIlmu.js';

export const FAN_TOPIK = {
  fiqh_ibadah: 'Fiqih ibadah (thaharah, shalat, zakat, puasa, haji)',
  fiqh_muamalat: 'Fiqih muamalat',
  munakahat: 'Fiqih munakahat (nikah, talak, iddah)',
  jinayat: 'Jinayat, hudud, dan peradilan',
  faraidh: 'Faraidh (waris)',
  akidah: 'Akidah/Tauhid',
  tasawuf: 'Tasawuf',
  akhlak: 'Akhlak dan adab',
  ushul: 'Ushul fiqih',
  qawaid: 'Qawaid fiqhiyyah',
  balaghah: 'Balaghah',
  nahwu: 'Nahwu',
  sharaf: 'Sharaf',
  tafsir: 'Tafsir',
  ulumul_quran: 'Ulumul Qur\'an',
  tajwid: 'Tajwid',
  mustalah: 'Mustalah hadits',
  hadits: 'Hadits dan syarahnya',
  sirah: 'Sirah dan tarikh',
  mantiq: 'Mantiq',
  mazhab: 'Istilah mazhab dan kitab',
};
export const DAFTAR_FAN_TOPIK = Object.keys(FAN_TOPIK);
export const sahFanTopik = (f) => (DAFTAR_FAN_TOPIK.includes(f) ? f : '');

const n = (s) => normalCari(s);
const bagi = (s) => String(s || '').split(';').map((x) => x.trim()).filter(Boolean);

// Sebutan Indonesia: huruf kecil, apostrof dibuang (musta'mal = mustamal), selain huruf/angka/Arab menjadi spasi.
const idn = (s) => String(s || '').toLowerCase().replace(/['’`´‘]/g, '').replace(/[^a-z0-9\u0600-\u06FF]+/g, ' ').trim();
// Akhiran -nya/-lah/-kah/-pun dibuang agar "zakatnya sapi" = "zakat sapi" (sisa harus >= 4 huruf).
const tanpaAkhiran = (w) => { const m = /^([a-z]{4,}?)(nya|lah|kah|pun)$/.exec(w); return m ? m[1] : w; };
const tokenIdn = (s) => idn(s).split(' ').filter(Boolean).map(tanpaAkhiran);
const tanpaAl = (s) => String(s).split(' ').map((w) => (w.startsWith('ال') && w.length > 4 ? w.slice(2) : w)).join(' ');

// Sebutan SATU kata yang juga kata Indonesia biasa: tidak boleh memicu entri sendirian (tetap berlaku sebagai bagian frasa, mis. "sifat dua puluh").
const ALIAS_UMUM = new Set(['hal', 'sifat', 'jumlah', 'sebab', 'syarat', 'wajib', 'sah', 'batal', 'sunnah', 'sunah', 'haram', 'makruh', 'mubah', 'sama', 'jam', 'diam', 'marah', 'malu', 'pahala', 'siksa',
  'nikmat', 'hadiah', 'perang', 'kesimpulan', 'objek', 'subjek', 'perintah', 'larangan', 'pemberian', 'pengecualian', 'kebiasaan', 'hawa', 'ringkas', 'kerabat', 'lapar', 'ali', 'umar', 'utsman', 'kekal', 'perlombaan', 'lomba', 'upah']);

const KATA_UMUM_ARAB = new Set(['باب', 'فصل', 'كتاب', 'مسأله', 'مساله', 'حكم', 'الله', 'علم', 'قال', 'ذلك', 'هذا', 'ثم', 'وهو', 'الذي']);

export function parseTopik(teks, sumber = '') {
  const hasil = [];
  String(teks || '').split('\n').forEach((baris, i) => {
    const b = baris.trim();
    if (!b || b.startsWith('#')) return;
    const bagian = b.split('|').map((s) => s.trim());
    if (bagian.length !== 4) throw new Error(`Kamus ${sumber} baris ${i + 1}: harus 4 kolom dipisah |`);
    const [fan, indo, arab, isi] = bagian;
    if (!FAN_TOPIK[fan]) throw new Error(`Kamus ${sumber} baris ${i + 1}: fan tidak dikenal (${fan})`);
    const e = { fan, indo: bagi(indo), arab: bagi(arab), isi: bagi(isi) };
    if (!e.indo.length || !e.arab.length || !e.isi.length) throw new Error(`Kamus ${sumber} baris ${i + 1}: ada kolom kosong`);
    e.indoToken = e.indo.map(tokenIdn).filter((t) => t.length && !(t.length === 1 && ALIAS_UMUM.has(t[0])));
    e.arabNorm = e.arab.map((a) => tanpaAl(n(a)));
    hasil.push(e);
  });
  return hasil;
}

export const TOPIK = [...parseTopik(FIQH_TEKS, 'fiqh'), ...parseTopik(ILMU_TEKS, 'ilmu')];

const unik = (daftar) => { const l = new Set(); const h = []; for (const f of daftar) { const k = [...new Set(f.map((w) => String(w).trim()).filter(Boolean))]; if (k.length >= 2) { const kunci = k.map(n).join('|'); if (!l.has(kunci)) { l.add(kunci); h.push(k); } } } return h; };
export const KELUARGA_TOPIK = unik([...KELUARGA_FIQH, ...KELUARGA_ILMU]);

/** Skor satu sebutan Indonesia terhadap token pertanyaan: frasa utuh bernilai lebih; kata berjauhan (<= panjang+1 langkah) tetap dihitung. Memakai jendela TERDEKAT, bukan kemunculan pertama. */
function skorIndo(alias, tokQ) {
  if (!alias.length) return 0;
  const posisi = alias.map((a) => tokQ.reduce((l, t, i) => (t === a ? [...l, i] : l), []));
  if (posisi.some((l) => !l.length)) return 0;
  if (alias.length === 1) return 2;
  let terbaik = Infinity;
  const jelajah = (k, lo, hi) => {
    if (k === posisi.length) { terbaik = Math.min(terbaik, hi - lo); return; }
    for (const p of posisi[k]) jelajah(k + 1, Math.min(lo, p), Math.max(hi, p));
  };
  jelajah(0, Infinity, -Infinity);
  if (terbaik > alias.length + 1) return 0;
  return alias.length * 2 + (terbaik === alias.length - 1 ? 1 : 0);
}

function skorArab(e, padQ) {
  let best = 0;
  for (const a of e.arabNorm) {
    const kata = a.split(' ').filter(Boolean);
    if (!kata.length) continue;
    if (kata.length === 1 && (kata[0].length < 4 || KATA_UMUM_ARAB.has(kata[0]))) continue;
    if (padQ.includes(` ${a} `)) best = Math.max(best, kata.length * 2 + 1);
  }
  return best;
}

/**
 * Entri kamus yang cocok dengan teks pertanyaan (Indonesia dan/atau Arab). Deterministik; paling banyak `maks` entri, skor tertinggi dulu.
 * @param {string} teks
 * @param {number} [maks]
 */
export function cariTopik(teks, maks = 4) {
  const t = String(teks || '').slice(0, 1500);
  const tokQ = tokenIdn(t);
  const padQ = ` ${tanpaAl(n(t))} `;
  const skor = [];
  TOPIK.forEach((e, i) => {
    let s = 0;
    for (const a of e.indoToken) s = Math.max(s, skorIndo(a, tokQ));
    s = Math.max(s, skorArab(e, padQ));
    if (s > 0) skor.push({ e, s, i });
  });
  skor.sort((a, b) => b.s - a.s || a.i - b.i);
  // Entri yang skornya jauh di bawah yang terbaik biasanya cocok karena satu kata umum (mis. "wajib", "sifat"): dibuang sebagai derau.
  const batas = skor.length ? skor[0].s * 0.5 : 0;
  return skor.filter((x) => x.s >= batas).slice(0, maks).map((x) => ({ ...x.e, skor: x.s }));
}

/** Baris petunjuk untuk AI perencana. Bukan sumber jawaban. */
export function barisTopik(entri) {
  return (entri || []).map((e) => `- ${e.indo[0]} [${FAN_TOPIK[e.fan]}] -> istilah kitab: ${e.arab.slice(0, 4).join(' | ')}; kata isi khas: ${e.isi.slice(0, 5).join('، ')}`);
}

const ujung = (frasa) => { const k = siapkanKueri(frasa).kata; return k[k.length - 1] || ''; };

/**
 * Kueri tambahan (larik kata normal) dari entri yang cocok: istilah utama, istilah kedua, pasangan (kata akhir istilah + kata isi pertama), pasangan dua kata isi.
 * Diambil bergiliran dari tiap entri; paling banyak `maks`; tidak mengulang kueri `sudah`.
 */
export function kueriTopik(entri, { maks = 4, sudah = [] } = {}) {
  const lihat = new Set((sudah || []).map((q) => (q || []).join(' ')));
  const putaran = (entri || []).map((e) => {
    const c = [];
    const tambah = (frasa) => { const k = siapkanKueri(Array.isArray(frasa) ? frasa.join(' ') : frasa).kata; if (k.length) c.push(k.slice(0, 4)); };
    tambah(e.arab[0]);
    if (e.isi[0] && e.isi[1]) tambah([e.isi[0], e.isi[1]]);
    if (e.arab[1]) tambah(e.arab[1]);
    if (e.isi[0]) tambah([ujung(e.arab[0]), e.isi[0]]);
    return c;
  });
  const hasil = [];
  for (let r = 0; hasil.length < maks && putaran.some((c) => c.length > r); r++) {
    for (const c of putaran) {
      if (hasil.length >= maks) break;
      const q = c[r]; if (!q) continue;
      const k = q.join(' '); if (lihat.has(k)) continue;
      lihat.add(k); hasil.push(q);
    }
  }
  return hasil;
}

/** Fan yang paling mungkin dari entri yang cocok ('' bila tidak ada). */
export function fanTopik(entri) {
  const hitung = new Map();
  for (const e of entri || []) hitung.set(e.fan, (hitung.get(e.fan) || 0) + (e.skor || 1));
  let best = ''; let skor = 0;
  for (const [f, s] of hitung) if (s > skor) { best = f; skor = s; }
  return best;
}
