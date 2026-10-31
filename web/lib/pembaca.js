// Logika murni pembaca kitab (web/PembacaKitab.jsx): ukuran huruf, lebar kolom, pengaturan yang diingat di perangkat, dan pembantu daftar isi.
import { bagianTeks } from './perpus.js';
import { RE_KITAB_ID } from './rujukan.js';

export const UKURAN_HURUF = [20, 24, 28, 32, 38, 44, 52, 60]; // px; bawaan indeks 3 = 32px (besar, untuk dibaca di layar lebar atau diproyeksikan)
export const LEBAR_BACA = {
  sedang: { label: 'Sedang', kelas: 'max-w-3xl' },
  lebar: { label: 'Lebar', kelas: 'max-w-5xl' },
  penuh: { label: 'Penuh', kelas: 'max-w-none' },
};
export const KUNCI_PREF = 'labsouma-baca:v1';
const BAWAAN = { ukuran: 3, lebar: 'lebar', lembar: 1, bagian: 'semua', terakhir: {} };
const BAGIAN = ['semua', 'matn', 'syarah'];

/** Pengaturan dari data mentah (total: tidak pernah melempar; nilai tak sah jatuh ke bawaan). */
export function bersihkanPengaturan(x) {
  const o = x && typeof x === 'object' ? x : {};
  const terakhir = {};
  if (o.terakhir && typeof o.terakhir === 'object') {
    for (const [k, v] of Object.entries(o.terakhir).slice(0, 200)) if (RE_KITAB_ID.test(k) && Number.isInteger(v) && v >= 1 && v <= 99999) terakhir[k] = v;
  }
  return {
    ukuran: Number.isInteger(o.ukuran) && o.ukuran >= 0 && o.ukuran < UKURAN_HURUF.length ? o.ukuran : BAWAAN.ukuran,
    lebar: typeof o.lebar === 'string' && o.lebar in LEBAR_BACA ? o.lebar : BAWAAN.lebar,
    lembar: o.lembar === 2 ? 2 : 1,
    bagian: BAGIAN.includes(o.bagian) ? o.bagian : BAWAAN.bagian,
    terakhir,
  };
}

const gudang = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } };
export function pengaturanBaca(st = gudang()) {
  try { return bersihkanPengaturan(st ? JSON.parse(st.getItem(KUNCI_PREF) || 'null') : null); } catch { return bersihkanPengaturan(null); }
}
export function simpanPengaturanBaca(p, st = gudang()) {
  try { if (st) st.setItem(KUNCI_PREF, JSON.stringify(bersihkanPengaturan(p))); return true; } catch { return false; } // penyimpanan penuh/ditolak: pengaturan tetap berlaku selama sesi
}

/** Indeks entri daftar isi yang memuat urutan `kursor`: entri terakhir yang `seq`-nya <= kursor. -1 bila belum ada judul. */
export function entriAktif(entri, kursor) {
  let a = -1;
  for (let i = 0; i < (entri || []).length; i++) { if (entri[i].seq <= kursor) a = i; else break; }
  return a;
}

/** Saring judul daftar isi (abaikan harakat dan huruf besar). Mengembalikan indeks aslinya agar entri aktif tetap bisa ditandai. */
const tanpaHarakat = (s) => String(s || '').normalize('NFKC').replace(/[\u064B-\u0652\u0670\u0640]/g, '').toLowerCase();
export function saringEntri(entri, q) {
  const kata = tanpaHarakat(q).trim();
  const semua = (entri || []).map((e, i) => ({ e, i }));
  return kata ? semua.filter(({ e }) => tanpaHarakat(e.judul).includes(kata)) : semua;
}

/** Batas urutan awal tampilan agar `jumlah` halaman selalu muat di dalam kitab. */
export const kursorSah = (k, total, jumlah = 1) => Math.min(Math.max(1, Math.trunc(k) || 1), Math.max(1, (total || 1) - jumlah + 1));

/** Teks untuk ditempel ke tempat lain: isi halaman diikuti rujukan satu baris. */
export function teksSalinan(kitab, halaman, bagian = 'semua') {
  if (!halaman || !halaman.length) return '';
  const isi = halaman.map((p) => bagianTeks(p, bagian)).filter(Boolean).join('\n\n');
  const nomor = halaman.length > 1 ? `${halaman[0].hal}–${halaman[halaman.length - 1].hal}` : String(halaman[0].hal);
  return `${isi}\n\n— ${(kitab && (kitab.judulLatin || kitab.judul)) || ''}, hal. ${nomor}`;
}

const LABEL_JENIS = { 'syamilah-txt': 'ekspor Syamilah .txt', 'syamilah-docx': 'ekspor Syamilah .docx', 'teks-penanda': 'teks bertanda halaman', pdf: 'PDF', epub: 'EPUB', html: 'HTML', json: 'JSON', 'teks-virtual': 'teks tanpa penanda' };
export const labelSumberJenis = (j) => LABEL_JENIS[j] || String(j || '');
