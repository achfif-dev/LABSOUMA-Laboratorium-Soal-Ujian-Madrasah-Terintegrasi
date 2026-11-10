// Butir kembar/mirip di DALAM satu paket Dauri. Fungsi murni (tanpa DOM), dipakai PaketDauri di web/App.jsx dan tes.
//
// Latar: setiap segmen materi disusun lewat panggilan AI terpisah, dan AI di panggilan ke-3 tidak tahu soal apa yang sudah dibuat di
// panggilan ke-1. Jadi dua butir yang sama (atau hampir sama) bisa masuk satu paket. Perbandingan memakai bandingkan() dari duplikat.js
// (kemiripan KATA, bukan makna: dua soal bermakna sama tetapi berbeda kata bisa lolos).
//
// Prinsip kehati-hatian (salah-buang lebih buruk daripada salah-biarkan):
//   - Hanya butir KEMBAR (skor >= AMBANG_KEMBAR, bentuk sama) yang boleh dibuang otomatis; yang MIRIP hanya ditandai.
//   - Butir yang sudah disunting pengguna tidak pernah dibuang otomatis.
//   - Pasangan yang pertanyaannya sama tetapi KUNCI JAWABANNYA BEDA tidak dibuang otomatis: salah satunya bisa keliru, pengguna yang memutuskan.
import { bandingkan, AMBANG_KEMBAR, AMBANG_MIRIP } from './duplikat.js';

const PERINGKAT_KUTIPAN = { cocok: 3, mirip: 2, tidak_cocok: 1, kosong: 0 };
/** Mutu butir untuk memilih yang dipertahankan: disunting pengguna > kutipan kitab cocok > mirip > tidak cocok. Seri: yang lebih awal. */
const mutu = (x) => (x && x.diedit ? 100 : 0) + (PERINGKAT_KUTIPAN[x && x.kutipanStatus] || 0) * 10;

/**
 * Semua pasangan butir kembar/mirip.
 * @param {{uid:string, soal:object}[]} hasil
 * @returns {{a:number, b:number, skor:number, jenis:'kembar'|'mirip', kunciBeda:boolean}[]} indeks a < b
 */
export function pasanganKembar(hasil, { mirip = AMBANG_MIRIP, kembar = AMBANG_KEMBAR } = {}) {
  const out = [];
  const daftar = hasil || [];
  for (let a = 0; a < daftar.length; a++) {
    if (!daftar[a] || !daftar[a].soal) continue;
    for (let b = a + 1; b < daftar.length; b++) {
      if (!daftar[b] || !daftar[b].soal) continue;
      const r = bandingkan(daftar[a].soal, daftar[b].soal, { mirip, kembar });
      if (r.jenis) out.push({ a, b, skor: r.skor, jenis: r.jenis, kunciBeda: r.kunciBeda });
    }
  }
  return out;
}

/**
 * Butir yang aman dibuang otomatis. Dari tiap kelompok kembar, yang dipertahankan = bermutu paling tinggi (seri: paling awal).
 * @returns {{buang: string[], alasan: Map<string,{dengan:string, skor:number}>}} `buang` = uid, urut seperti di `hasil`
 */
export function pilihBuang(hasil, opsi) {
  const daftar = hasil || [];
  const kembar = daftar.map(() => new Map()); // indeks -> Map(indeks lain -> skor), hanya pasangan KEMBAR tanpa kunci berbeda
  for (const p of pasanganKembar(daftar, opsi)) {
    if (p.jenis !== 'kembar' || p.kunciBeda) continue;
    kembar[p.a].set(p.b, p.skor); kembar[p.b].set(p.a, p.skor);
  }
  const urutan = daftar.map((_, i) => i).sort((i, j) => mutu(daftar[j]) - mutu(daftar[i]) || i - j);
  const simpan = []; const buang = new Set(); const alasan = new Map();
  for (const i of urutan) {
    const k = simpan.find((j) => kembar[i].has(j));
    if (k === undefined || (daftar[i] && daftar[i].diedit)) { simpan.push(i); continue; } // tidak kembar dengan yang dipertahankan, atau disunting pengguna
    buang.add(i); alasan.set(daftar[i].uid, { dengan: daftar[k].uid, skor: kembar[i].get(k) });
  }
  return { buang: daftar.filter((_, i) => buang.has(i)).map((x) => x.uid), alasan };
}

/**
 * Membuang butir kembar dari `kumpul` DI TEMPAT (array dipakai bersama oleh alur pembuatan paket) dan mengembalikan butir yang dibuang,
 * urut seperti semula. Butir yang dibuang membawa `segmen` dan `spek` asalnya, jadi pemanggil bisa membuatkan penggantinya.
 */
export function buangDariKumpulan(kumpul, opsi) {
  const { buang } = pilihBuang(kumpul, opsi);
  if (!buang.length) return [];
  const set = new Set(buang); const dibuang = [];
  for (let i = kumpul.length - 1; i >= 0; i--) if (set.has(kumpul[i].uid)) dibuang.unshift(...kumpul.splice(i, 1));
  return dibuang;
}

/**
 * Untuk tampilan: uid -> daftar butir lain yang kembar/mirip dengannya (kedua arah).
 * @returns {Map<string, {dengan:string, skor:number, jenis:string, kunciBeda:boolean}[]>}
 */
export function petaKemiripan(hasil, opsi) {
  const daftar = hasil || []; const peta = new Map();
  const tambah = (uid, m) => { if (!peta.has(uid)) peta.set(uid, []); peta.get(uid).push(m); };
  for (const p of pasanganKembar(daftar, opsi)) {
    tambah(daftar[p.a].uid, { dengan: daftar[p.b].uid, skor: p.skor, jenis: p.jenis, kunciBeda: p.kunciBeda });
    tambah(daftar[p.b].uid, { dengan: daftar[p.a].uid, skor: p.skor, jenis: p.jenis, kunciBeda: p.kunciBeda });
  }
  return peta;
}

/**
 * Kalimat soal yang dikirim ke AI sebagai "sudah ada, jangan diulang" (dibatasi agar prompt tidak membengkak).
 * Diambil dari yang terbaru karena segmen berdekatan paling mungkin membahas hal yang sama.
 * @param {{pertanyaan?:string}[]} soalList
 */
export function daftarHindari(soalList, maks = 12, panjang = 120) {
  const t = (soalList || []).map((s) => String((s && s.pertanyaan) || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  return t.slice(-maks).map((s) => (s.length > panjang ? s.slice(0, panjang - 1) + '…' : s));
}

/**
 * Pesan konfirmasi simpan untuk butir paket yang kembar/mirip dengan soal yang SUDAH ADA di bank. '' bila tidak ada.
 * @param {{no:number|string, skor:number, jenis:string, kunciBeda?:boolean, q:{pertanyaan?:string, nama?:string, hal?:string}}[]} temuan
 */
export function pesanKembarBank(temuan, { total = 0, maksBaris = 5 } = {}) {
  if (!temuan || !temuan.length) return '';
  const potong = (s, n) => { const x = String(s || '').replace(/\s+/g, ' ').trim(); return x.length > n ? x.slice(0, n - 1) + '…' : x; };
  const baris = temuan.slice(0, maksBaris).map((h) => `• No. ${h.no} ${h.jenis === 'kembar' ? 'KEMBAR' : 'mirip'} ${Math.round(h.skor * 100)}% dengan: ${potong(h.q && h.q.pertanyaan, 90)}${h.q && (h.q.nama || h.q.hal) ? `\n  (${[h.q.nama, h.q.hal && `hal. ${h.q.hal}`].filter(Boolean).join(' · ')})` : ''}`);
  let s = `${temuan.length} butir paket kembar atau mirip dengan soal yang sudah ada di bank:\n\n${baris.join('\n')}`;
  if (temuan.length > maksBaris) s += `\n… dan ${temuan.length - maksBaris} lainnya.`;
  if (temuan.some((h) => h.kunciBeda)) s += '\n\nPerhatian: ada yang pertanyaannya hampir sama tetapi kunci jawabannya berbeda. Periksa mana yang benar.';
  if (total) s += `\n\n(Dibandingkan dengan ${total} soal.)`;
  return s;
}
