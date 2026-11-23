// Menyorot di teks kitab bagian yang dikutip soal dan pembahasan, supaya pemeriksa tidak perlu menyisir ratusan kata untuk menemukan dasarnya.
// Murni (tanpa AI, tanpa jaringan), memakai normalisasi dan pencocokan yang sama dengan pemeriksa kutipan (kutipan.js): yang disorot adalah persis yang
// dinyatakan "cocok" atau "mirip" oleh lencana kutipan. Hanya untuk tampilan: teks asli tidak diubah, rangkaian semua segmen sama persis dengan teks asli.
import { normalisasi, ekstrakKutipan, ekstrakKutipanLatin, sumberLatin, cocokkan, LABEL_BIDANG, MIN_KATA, TOLERANSI_MIRIP } from './kutipan.js';

// Satu "kata" = rangkaian huruf/angka/harakat/tatwil/karakter lebar-nol. Pemisahnya sama dengan normalisasi(): tanda baca dan spasi.
const KATA = /[\p{L}\p{M}\p{N}\u0640\u200b-\u200f\u202a-\u202e\u2066-\u2069\u061c\ufeff]+/gu;

/** Teks asli -> [{ n: kata ternormalisasi, a, b }] dengan a..b = rentang karakter pada teks asli. Urutan n sama dengan normalisasi(teks).split(' '). */
export function tokenBerposisi(teks) {
  const s = String(teks == null ? '' : teks);
  const hasil = [];
  for (const m of s.matchAll(KATA)) {
    const n = normalisasi(m[0]);
    if (!n) continue;
    for (const bagian of n.split(' ')) if (bagian) hasil.push({ n: bagian, a: m.index, b: m.index + m[0].length });
  }
  return hasil;
}

function semuaPosisi(q, tok) {
  const keluar = [];
  for (let i = 0; i + q.length <= tok.length; i++) {
    let ok = true;
    for (let j = 0; j < q.length; j++) if (tok[i + j] !== q[j]) { ok = false; break; }
    if (ok) keluar.push(i);
  }
  return keluar;
}

/**
 * Menandai bagian teks kitab yang dikutip bidang-bidang soal.
 * @param {string} teks  teks kitab sumber (asli, berharakat)
 * @param {Record<string,string>} bidang  bentuk `bidangDariSoal(q)`: pembahasan, stimulus, pertanyaan, A..E, jawaban, rubrik
 * @returns {{
 *   segmen: {t:string, sorot:null|{id:number, jenis:'cocok'|'mirip', label:string[]}}[],
 *   rentang: {id:number, jenis:'cocok'|'mirip', label:string[], kutipan:string[], awal:number, akhir:number}[],
 *   tidakDitemukan: {label:string, kutipan:string}[], latin:boolean }}
 */
export function sorotSoal(teks, bidang, { minKata = MIN_KATA, toleransi = TOLERANSI_MIRIP, maksKemunculan = 3 } = {}) {
  const t = String(teks == null ? '' : teks);
  const tok = tokenBerposisi(t); const norm = tok.map((x) => x.n);
  const latin = sumberLatin(t);
  const ambil = latin ? ekstrakKutipanLatin : ekstrakKutipan;
  const mentah = []; const tidakDitemukan = [];
  Object.entries(bidang || {}).forEach(([nama, isi], urut) => {
    for (const k of ambil(isi, minKata)) {
      const label = LABEL_BIDANG[nama] || nama;
      const q = k.norm.split(' ');
      const persis = norm.length ? semuaPosisi(q, norm).slice(0, maksKemunculan) : [];
      if (persis.length) { for (const i of persis) mentah.push({ aw: i, ak: i + q.length, jenis: 'cocok', label, kutipan: k.mentah, urut }); continue; }
      const r = norm.length ? cocokkan(q, norm) : null;
      if (r && r.akhir > r.awal && r.jarak <= Math.max(1, Math.floor(q.length * toleransi)) && r.jarak < q.length / 2) mentah.push({ aw: r.awal, ak: r.akhir, jenis: 'mirip', label, kutipan: k.mentah, urut });
      else tidakDitemukan.push({ label, kutipan: k.mentah });
    }
  });
  // Gabungkan rentang yang bersinggungan (kutipan yang sama di beberapa bidang, atau saling tumpang tindih) jadi satu penanda.
  mentah.sort((x, y) => x.aw - y.aw || y.ak - x.ak);
  const gabung = [];
  for (const r of mentah) {
    const akhir = gabung[gabung.length - 1];
    if (akhir && r.aw <= akhir.ak) {
      akhir.ak = Math.max(akhir.ak, r.ak);
      if (r.jenis === 'cocok') akhir.jenis = 'cocok';
      akhir.sumber.push(r);
    } else gabung.push({ aw: r.aw, ak: r.ak, jenis: r.jenis, sumber: [r] });
  }
  // Label dan kutipan sebuah penanda diurutkan menurut urutan bidang pada soal (pembahasan, lalu opsi A, B, ...), bukan menurut letaknya di teks.
  const unik = (daftar) => [...new Set(daftar)];
  const rentang = gabung.map((g, i) => {
    const urut = [...g.sumber].sort((x, y) => x.urut - y.urut);
    return { id: i, jenis: g.jenis, label: unik(urut.map((x) => x.label)), kutipan: unik(urut.map((x) => x.kutipan)), awal: tok[g.aw].a, akhir: tok[g.ak - 1].b };
  });
  const segmen = []; let kursor = 0;
  for (const r of rentang) {
    if (r.awal > kursor) segmen.push({ t: t.slice(kursor, r.awal), sorot: null });
    segmen.push({ t: t.slice(r.awal, r.akhir), sorot: { id: r.id, jenis: r.jenis, label: r.label } });
    kursor = r.akhir;
  }
  if (kursor < t.length || !segmen.length) segmen.push({ t: t.slice(kursor), sorot: null });
  return { segmen, rentang, tidakDitemukan, latin };
}
