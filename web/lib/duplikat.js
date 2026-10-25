// Deteksi soal kembar atau mirip saat menyimpan. Fungsi murni, sumber tunggal untuk browser (web/App.jsx) dan tes.
//
// Cara kerja: soal dinormalisasi (harakat dan variasi huruf Arab dibuang, titik isian "....." disamakan), lalu isi pertanyaan
// (stimulus + pertanyaan) dibandingkan dengan koefisien Dice pada kata dan pasangan kata, ditambah opsi atau jawaban sesuai bentuk soal.
// Ini perbandingan KATA, bukan makna: dua soal yang bermakna sama tetapi berbeda kata bisa lolos. Ambang bisa diubah di bawah.
import { bentukDari } from './bentuk.js';

export const AMBANG_MIRIP = 0.7;
export const AMBANG_KEMBAR = 0.92;

export function normalisasi(s) {
  return String(s ?? '').normalize('NFKC')
    .replace(/\p{M}+/gu, '').replace(/\u0640/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .toLowerCase()
    .replace(/\.{2,}|_{2,}/g, ' _ ')
    .replace(/[^\p{L}\p{N}_]+/gu, ' ').trim().replace(/\s+/g, ' ');
}
// Titik isian (_) hanya penanda format: "ada ....." dan "ada" dianggap sama saat membandingkan.
const kata = (s) => { const n = normalisasi(s); return n ? n.split(' ').filter((t) => t !== '_') : []; };
const pasangan = (t) => { if (t.length < 2) return t; const o = []; for (let i = 0; i < t.length - 1; i++) o.push(t[i] + ' ' + t[i + 1]); return o; };
const dice = (a, b) => {
  const x = new Set(a); const y = new Set(b);
  if (!x.size || !y.size) return 0;
  let k = 0; for (const t of x) if (y.has(t)) k++;
  return (2 * k) / (x.size + y.size);
};
const kemiripanTeks = (a, b) => {
  const ta = kata(a); const tb = kata(b);
  if (!ta.length || !tb.length) return 0;
  if (ta.join(' ') === tb.join(' ')) return 1;
  return 0.5 * dice(ta, tb) + 0.5 * dice(pasangan(ta), pasangan(tb));
};

const KEYS = ['A', 'B', 'C', 'D', 'E'];
const adaOpsi = (b) => b === 'pilgan' || b === 'lanjutan';
const tokenOpsi = (q) => KEYS.flatMap((k) => kata((q.opsi || {})[k]));
// Teks jawaban yang benar, dipakai untuk mendeteksi "pertanyaan sama, kunci berbeda".
const teksKunci = (q, b) => {
  if (adaOpsi(b)) return normalisasi((q.opsi || {})[q.kunci] || '');
  if (b === 'benarsalah') return q.kunci === 'A' ? 'benar' : q.kunci === 'B' ? 'salah' : '';
  return normalisasi(q.jawaban || '');
};

/** Perbandingan dua soal. Mengembalikan { skor (0..1), jenis: 'kembar'|'mirip'|'', kunciBeda }. */
export function bandingkan(a, b, { mirip = AMBANG_MIRIP, kembar = AMBANG_KEMBAR } = {}) {
  const ba = bentukDari(a && a.bentuk); const bb = bentukDari(b && b.bentuk);
  const sPertanyaan = kemiripanTeks(`${a.stimulus || ''} ${a.pertanyaan || ''}`, `${b.stimulus || ''} ${b.pertanyaan || ''}`);
  let skor;
  if (ba !== bb) skor = sPertanyaan * 0.85;
  else if (adaOpsi(ba)) skor = 0.75 * sPertanyaan + 0.25 * dice(tokenOpsi(a), tokenOpsi(b));
  else if (ba === 'isian' || ba === 'uraian') skor = 0.75 * sPertanyaan + 0.25 * kemiripanTeks(a.jawaban, b.jawaban);
  else skor = sPertanyaan; // benar-salah: opsinya selalu sama, jadi hanya pernyataannya yang membedakan
  skor = Math.round(skor * 1000) / 1000;
  const ka = teksKunci(a, ba); const kb = teksKunci(b, bb);
  const kunciBeda = skor >= mirip && ba === bb && !!ka && !!kb && dice(kata(ka), kata(kb)) < 0.5;
  return { skor, jenis: skor >= kembar ? 'kembar' : skor >= mirip ? 'mirip' : '', kunciBeda };
}

/**
 * Cari soal kembar/mirip untuk `baru` di antara `daftar` (soal lain yang sudah ada). Hasil terurut dari yang paling mirip.
 * `abaikanId`: soal yang sedang disunting (tidak dibandingkan dengan dirinya sendiri).
 */
export function cari(baru, daftar, { abaikanId = '', maks = 3, mirip = AMBANG_MIRIP, kembar = AMBANG_KEMBAR } = {}) {
  if (!baru || !kata(baru.pertanyaan).length) return [];
  const out = [];
  for (const q of daftar || []) {
    if (!q || (abaikanId && q.id === abaikanId)) continue;
    const r = bandingkan(baru, q, { mirip, kembar });
    if (r.jenis) out.push({ q, ...r });
  }
  return out.sort((x, y) => y.skor - x.skor).slice(0, maks);
}

const STATUS = { draft: 'Draft', pending: 'Menunggu review', approved: 'Disetujui', revision: 'Perlu revisi' };
const potong = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };

/** Teks konfirmasi (window.confirm) untuk hasil `cari`. `total` = jumlah soal yang dibandingkan, supaya cakupannya jujur. `lokal`: Soal Saya (tanpa status dan penulis). */
export function pesanKonfirmasi(hasil, { total = 0, lokal = false } = {}) {
  const kembar = hasil.some((h) => h.jenis === 'kembar');
  const baris = hasil.map((h) => {
    const q = h.q;
    const ket = [q.nama, q.hal && `hal. ${q.hal}`, !lokal && STATUS[q.status], !lokal && q.authorName ? `oleh ${q.authorName}` : ''].filter(Boolean).join(' · ');
    return `• ${Math.round(h.skor * 100)}%: ${potong(q.pertanyaan, 110)}\n  (${ket})`;
  });
  let s = `Soal ini ${kembar ? 'KEMBAR' : 'MIRIP'} dengan soal yang sudah ada:\n\n${baris.join('\n')}`;
  if (hasil.some((h) => h.kunciBeda)) s += '\n\nPerhatian: pertanyaannya hampir sama tetapi kunci jawabannya berbeda. Periksa mana yang benar.';
  if (total) s += `\n\n(Dibandingkan dengan ${total} soal.)`;
  return s + '\n\nTetap simpan?';
}
