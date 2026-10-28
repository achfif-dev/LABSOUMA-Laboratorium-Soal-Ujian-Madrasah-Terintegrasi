// Mencocokkan Teks Kitab pada soal dengan halaman sumbernya (sumberUrl), di server saat persetujuan.
// Gerbang kutipan (src/review.js) hanya memastikan kutipan ada di `teks`; ini memeriksa `teks` itu sendiri terhadap kitab.
// BATAS: teks gabungan beberapa halaman (mode "tambahkan") hanya punya satu sumberUrl, jadi ketidakcocokan sebagian wajar dan
// TIDAK mewajibkan alasan. Yang diwajibkan hanya bila teks hampir seluruhnya tidak ada di halaman sumber.
import { normalisasi, cocokkan } from './kutipan.js';
import { fetchKitab, DEFAULT_HOSTS } from './kitabFetch.js';

export const MIN_KATA_BARIS = 3;
export const AMBANG_TIDAK_COCOK = 0.5; // rasio baris cocok di bawah ini = hampir seluruhnya tidak ditemukan
const TOLERANSI = 0.15;

/** Hitung baris teks soal (>= 3 kata) yang ditemukan, persis atau mirip (selisih <= 15% kata), di teks halaman. */
export function bandingkanDenganSumber(teksSoal, teksHalaman) {
  const gudang = ` ${normalisasi(teksHalaman)} `;
  const tokenKitab = gudang.trim().split(' ').filter(Boolean);
  let total = 0; let cocok = 0;
  for (const baris of String(teksSoal || '').split(/\n+/)) {
    const norm = normalisasi(baris);
    const q = norm ? norm.split(' ') : [];
    if (q.length < MIN_KATA_BARIS) continue;
    total++;
    if (gudang.includes(` ${norm} `)) { cocok++; continue; }
    const r = cocokkan(q, tokenKitab);
    if (r.jarak <= Math.max(1, Math.floor(q.length * TOLERANSI)) && r.jarak < q.length / 2) cocok++;
  }
  return { total, cocok, tidak: total - cocok, rasio: total ? cocok / total : 0 };
}

/**
 * @returns {Promise<{status:'cocok'|'sebagian'|'tidak_cocok'|'tanpa_sumber'|'tidak_terjangkau'|'tanpa_teks', total:number, cocok:number}>}
 * Gagal mengambil halaman (diblokir, waktu habis, situs tak didukung) = 'tidak_terjangkau', bukan kesimpulan bahwa teks palsu.
 */
export async function periksaSumber(q, { ambil = fetchKitab, hosts = DEFAULT_HOSTS } = {}) {
  const kosong = { total: 0, cocok: 0 };
  if (!String((q && q.teks) || '').trim()) return { status: 'tanpa_teks', ...kosong };
  const url = String((q && q.sumberUrl) || '').trim();
  if (!url) return { status: 'tanpa_sumber', ...kosong };
  let halaman;
  try { halaman = await ambil(url, { allowedHosts: hosts }); } catch { return { status: 'tidak_terjangkau', ...kosong }; }
  const b = bandingkanDenganSumber(q.teks, halaman && halaman.teks);
  if (!b.total) return { status: 'tanpa_teks', ...kosong };
  const ringkas = { total: b.total, cocok: b.cocok };
  if (b.rasio === 1) return { status: 'cocok', ...ringkas };
  if (b.rasio >= AMBANG_TIDAK_COCOK) return { status: 'sebagian', ...ringkas };
  if (halaman && halaman.terpotong) return { status: 'tidak_terjangkau', ...ringkas }; // halaman terlalu panjang dipotong: kesimpulan tidak sah
  return { status: 'tidak_cocok', ...ringkas };
}
