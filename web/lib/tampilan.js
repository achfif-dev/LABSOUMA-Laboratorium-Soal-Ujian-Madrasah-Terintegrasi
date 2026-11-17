// Template dan penyesuaian tampilan aplikasi yang diatur admin. Fungsi murni (tanpa DOM kecuali terapkanTampilan, yang menerima `doc`);
// dipakai browser (web/App.jsx, web/TampilanAdmin.jsx, web/main.jsx), server (src/tampilan.js), dan tes.
//
// Model tersimpan: { templat: 'zamrud', ganti: { huruf, sudut, kepadatan, header, kartu, lebar, nav, mode, warnaUtama } }.
// `ganti` hanya memuat yang berbeda dari template; sisanya mengikuti template. Template ZAMRUD = tampilan bawaan aplikasi dan tidak
// menghasilkan CSS tambahan sama sekali (tampilan lama tidak berubah sedikit pun bila admin tidak memilih apa-apa).
//
// Cara menerapkan: (1) atribut data-* pada <html> untuk bentuk (nav, mode), (2) satu elemen <style id="tampilan-kustom"> berisi variabel warna,
// huruf, sudut, kepadatan, lebar, header, dan kartu. Semua warna template diuji kontrasnya (test/tampilan.test.js), dan warna utama buatan admin
// diturunkan otomatis dengan jaminan kontras WCAG AA (turunkanWarna), jadi admin tidak bisa membuat teks tak terbaca.

/* --------------------------------------------------------------- Warna */
const hex2 = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
export const HEX = /^#[0-9a-fA-F]{6}$/;
export const keRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const keHex = ([r, g, b]) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;
export const campur = (a, b, t) => { const x = keRgb(a); const y = keRgb(b); return keHex(x.map((v, i) => v * (1 - t) + y[i] * t)); };
const lin = (v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
export const luminans = (h) => { const [r, g, b] = keRgb(h); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
export const kontras = (a, b) => { const l1 = luminans(a); const l2 = luminans(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };

/** Geser `fg` ke arah `ke` (#000 atau #fff) selangkah demi selangkah sampai kontrasnya terhadap `bg` mencapai `min`. */
function pastikanKontras(fg, bg, min, ke) {
  let w = fg;
  for (let i = 0; i < 40 && kontras(w, bg) < min; i++) w = campur(w, ke, 0.08);
  return kontras(w, bg) >= min ? w : ke;
}

/**
 * Turunkan seluruh keluarga warna merek dari satu warna utama. Jaminan (diuji): teks tombol di atas warna merek, teks di atas latar lembut,
 * dan teks di atas kepala (header) semuanya kontras >= 4,5:1 di mode terang maupun gelap.
 */
export function turunkanWarna(hex, dasar) {
  const h = HEX.test(String(hex)) ? hex.toLowerCase() : '#0d6b4e';
  const T = dasar.terang; const G = dasar.gelap;
  // Warna merek dipakai sebagai teks di atas latar dan permukaan template, dan sebagai latar tombol berteks putih: penuhi semuanya.
  const brandT = [T.bg, T.surface, '#ffffff'].reduce((w, bg) => pastikanKontras(w, bg, 4.5, '#000000'), h);
  const softT = campur(brandT, T.surface, 0.9);
  const headT = pastikanKontras(campur(h, '#000000', 0.55), '#ffffff', 7, '#000000');
  const brandG = [G.bg, G.surface].reduce((w, bg) => pastikanKontras(w, bg, 4.5, '#ffffff'), h);
  const fgG = kontras('#04100b', brandG) >= 4.5 ? '#04100b' : '#000000';
  const softG = campur(brandG, G.surface, 0.8);
  const headG = campur(h, '#000000', 0.72);
  return {
    terang: { brand: brandT, 'brand-fg': '#ffffff', soft: softT, 'soft-ink': pastikanKontras(brandT, softT, 7, '#000000'), head: headT, 'head-ink': '#ffffff', ring: `${keRgb(brandT).join(',')}` },
    gelap: { brand: brandG, 'brand-fg': fgG, soft: softG, 'soft-ink': pastikanKontras(brandG, softG, 7, '#ffffff'), head: headG, 'head-ink': '#ffffff', ring: `${keRgb(brandG).join(',')}` },
  };
}

/* ------------------------------------------------------------ Template */
const STATUS_T = { warn: '#7a5200', 'warn-bg': '#fcf1d6', bad: '#a3231c', 'bad-bg': '#fbe6e3', ok: '#0b5c3f', 'ok-bg': '#d9f0e3' };
const STATUS_G = { warn: '#f0c75a', 'warn-bg': '#33290d', bad: '#f19a93', 'bad-bg': '#3a1815', ok: '#7fe0b3', 'ok-bg': '#123a29' };
const rgba = (hex, a) => `rgba(${keRgb(hex).join(',')},${a})`;
const T = (o) => ({ ...STATUS_T, ...o, ring: rgba(o.brand, 0.28) });
const G = (o) => ({ ...STATUS_G, ...o, ring: rgba(o.brand, 0.35) });

const AWAL = { huruf: 'jakarta', hurufArab: 'amiri', sudut: 'sedang', kepadatan: 'normal', header: 'pola', kartu: 'bayangan', lebar: 'standar', nav: 'menu', subtab: 'kapsul', mode: 'ikuti' };

/**
 * Palet lengkap (terang dan gelap) dari tiga warna: `brand` (merek), `tint` (rona netral untuk latar, garis, dan teks), `accent` (hiasan).
 * Netral diturunkan dengan campuran, teks redup digeser sampai kontras >= 4,6:1, dan keluarga merek memakai turunkanWarna, jadi semua pasangan
 * teks-latar memenuhi WCAG AA (diuji untuk setiap template).
 */
function paletTurunan({ brand, tint, accent, kertas = '#ffffff' }) {
  const bgT = campur('#ffffff', tint, 0.06); const inkT = campur('#000000', tint, 0.14);
  const bgG = campur('#000000', tint, 0.09); const surfG = campur('#000000', tint, 0.15); const inkG = campur('#ffffff', tint, 0.1);
  const d = turunkanWarna(brand, { terang: { bg: bgT, surface: kertas }, gelap: { bg: bgG, surface: surfG } });
  return {
    terang: T({ bg: bgT, surface: kertas, ink: inkT, mute: pastikanKontras(campur(tint, '#000000', 0.45), bgT, 4.6, '#000000'), line: campur('#ffffff', tint, 0.2), ...d.terang, accent }),
    gelap: G({ bg: bgG, surface: surfG, ink: inkG, mute: pastikanKontras(campur(inkG, bgG, 0.4), surfG, 4.6, '#ffffff'), line: campur('#000000', tint, 0.3), ...d.gelap, accent }),
  };
}

export const KATEGORI = [
  { id: 'bawaan', label: 'Bawaan', deskripsi: 'Tampilan asli aplikasi.' },
  { id: 'minimalis', label: 'Minimalis', deskripsi: 'Sedikit hiasan, banyak ruang kosong, garis tipis.' },
  { id: 'profesional', label: 'Profesional', deskripsi: 'Rapi dan padat untuk kerja harian dengan banyak data.' },
  { id: 'modern', label: 'Modern', deskripsi: 'Warna segar, sudut membulat, kesan kekinian.' },
  { id: 'klasik', label: 'Klasik', deskripsi: 'Huruf berkaki dan warna hangat bernuansa kitab.' },
  { id: 'aksesibel', label: 'Nyaman dibaca', deskripsi: 'Dirancang agar nyaman dibaca lama dan oleh mata lelah.' },
];

export const TEMPLAT = {
  zamrud: {
    kategori: 'bawaan', label: 'Zamrud', deskripsi: 'Tampilan bawaan: hijau madrasah, menu buka-tutup di atas.', ...AWAL,
    terang: T({ bg: '#f4f7f5', surface: '#ffffff', ink: '#0f1f18', mute: '#53675d', line: '#dbe5df', brand: '#0d6b4e', 'brand-fg': '#ffffff', soft: '#e6f2ec', 'soft-ink': '#0a4d38', head: '#0a4535', 'head-ink': '#ecf7f1', accent: '#b8923a' }),
    gelap: G({ bg: '#0b130f', surface: '#121e18', ink: '#e6efe9', mute: '#98ada2', line: '#25382e', brand: '#3fbf8f', 'brand-fg': '#04231a', soft: '#173228', 'soft-ink': '#92e2c1', head: '#0a2a20', 'head-ink': '#e5f4ec', accent: '#d9b45f' }),
  },
  samudra: {
    kategori: 'profesional', label: 'Samudra', deskripsi: 'Biru tenang dan bersih; menu dan sub-tab berjajar ke bawah di sisi kiri pada layar lebar.', ...AWAL, sudut: 'bulat', nav: 'samping', subtab: 'kiri',
    terang: T({ bg: '#f3f6fb', surface: '#ffffff', ink: '#0f1a2b', mute: '#4f5e78', line: '#d9e1ee', brand: '#1d4ed8', 'brand-fg': '#ffffff', soft: '#e5ecfb', 'soft-ink': '#173a9c', head: '#14306b', 'head-ink': '#eaf0ff', accent: '#d99a14' }),
    gelap: G({ bg: '#0a1020', surface: '#111a2e', ink: '#e6ecf8', mute: '#9aa8c2', line: '#25324d', brand: '#6ea0ff', 'brand-fg': '#061230', soft: '#17243f', 'soft-ink': '#a9c6ff', head: '#0c1a3a', 'head-ink': '#e5eeff', accent: '#e8bd56' }),
  },
  tosca: {
    kategori: 'modern', label: 'Tosca', deskripsi: 'Hijau kebiruan yang segar, sudut membulat, tanpa pola di kepala.', ...AWAL, sudut: 'bulat', header: 'polos',
    terang: T({ bg: '#f2f8f8', surface: '#ffffff', ink: '#0c1f21', mute: '#4a6466', line: '#d6e6e7', brand: '#0f766e', 'brand-fg': '#ffffff', soft: '#e0f2f1', 'soft-ink': '#0a524c', head: '#0b4f4a', 'head-ink': '#e6f7f5', accent: '#c58a1f' }),
    gelap: G({ bg: '#081414', surface: '#0f1f1f', ink: '#e3f1f0', mute: '#92adab', line: '#213a3a', brand: '#3ccfc0', 'brand-fg': '#032420', soft: '#12312f', 'soft-ink': '#98ebe1', head: '#082826', 'head-ink': '#e0f5f3', accent: '#dcb257' }),
  },
  marun: {
    kategori: 'klasik', label: 'Marun Klasik', deskripsi: 'Marun dan emas dengan huruf berkaki dan sudut tegas, kesan kitab klasik.', ...AWAL, huruf: 'serif', sudut: 'tajam',
    terang: T({ bg: '#f8f4f1', surface: '#fffdfb', ink: '#261512', mute: '#6a5650', line: '#e6dad3', brand: '#8a1f2d', 'brand-fg': '#ffffff', soft: '#f6e6e6', 'soft-ink': '#6b1521', head: '#5e1420', 'head-ink': '#fbeeee', accent: '#c9a24a' }),
    gelap: G({ bg: '#150d0c', surface: '#1f1413', ink: '#f2e8e5', mute: '#b9a39d', line: '#3a2623', brand: '#e58a96', 'brand-fg': '#2a0a10', soft: '#321b1d', 'soft-ink': '#f4b9c1', head: '#2a0d12', 'head-ink': '#f8e6e8', accent: '#d9b45f' }),
  },
  pasir: {
    kategori: 'klasik', label: 'Pasir & Emas', deskripsi: 'Krem hangat dan cokelat emas, huruf berkaki, kartu bergaris.', ...AWAL, huruf: 'serif', kartu: 'garis',
    terang: T({ bg: '#faf6ee', surface: '#fffefb', ink: '#231c0f', mute: '#625638', line: '#e8dec7', brand: '#8a5a00', 'brand-fg': '#ffffff', soft: '#f6ecd3', 'soft-ink': '#5e3d00', head: '#4a3300', 'head-ink': '#fbf1d9', accent: '#b8923a' }),
    gelap: G({ bg: '#14100a', surface: '#1e1810', ink: '#f2eadb', mute: '#b8a98a', line: '#3a2f1e', brand: '#e8b84a', 'brand-fg': '#2a1b00', soft: '#33280f', 'soft-ink': '#f5d98f', head: '#2a1f08', 'head-ink': '#f8ecd0', accent: '#e8bd56' }),
  },
  grafit: {
    kategori: 'profesional', label: 'Grafit Netral', deskripsi: 'Abu-abu netral, rapat dan lebar untuk banyak data; menu dan sub-tab di sisi kiri.', ...AWAL, huruf: 'sistem', kepadatan: 'ringkas', header: 'polos', kartu: 'garis', lebar: 'lebar', nav: 'samping', subtab: 'kiri',
    terang: T({ bg: '#f5f6f8', surface: '#ffffff', ink: '#12161c', mute: '#515b68', line: '#dcdfe5', brand: '#334155', 'brand-fg': '#ffffff', soft: '#e8ebf0', 'soft-ink': '#1f2937', head: '#1f2937', 'head-ink': '#f1f5f9', accent: '#b8923a' }),
    gelap: G({ bg: '#0d1015', surface: '#151a21', ink: '#e6e9ee', mute: '#9aa3b0', line: '#262d37', brand: '#9fb3cc', 'brand-fg': '#0b1320', soft: '#1c2430', 'soft-ink': '#c7d4e6', head: '#10151c', 'head-ink': '#e6e9ee', accent: '#d9b45f' }),
  },
  kontras: {
    kategori: 'aksesibel', label: 'Kontras Tinggi', deskripsi: 'Hitam-putih dengan huruf besar dan lega; mudah dibaca di layar redup atau oleh mata lelah.', ...AWAL, huruf: 'sistem', kepadatan: 'lega', kartu: 'garis', header: 'polos',
    terang: T({ bg: '#ffffff', surface: '#ffffff', ink: '#000000', mute: '#2b2b2b', line: '#6b6b6b', brand: '#0a3bd0', 'brand-fg': '#ffffff', soft: '#e8eeff', 'soft-ink': '#06279a', head: '#000000', 'head-ink': '#ffffff', accent: '#8a5a00', warn: '#5c3d00', bad: '#8a0f09', ok: '#064a2f' }),
    gelap: G({ bg: '#000000', surface: '#0b0b0b', ink: '#ffffff', mute: '#d0d0d0', line: '#8a8a8a', brand: '#8fb4ff', 'brand-fg': '#000000', soft: '#14213f', 'soft-ink': '#c9daff', head: '#000000', 'head-ink': '#ffffff', accent: '#ffd36b' }),
  },
  putih: {
    kategori: 'minimalis', label: 'Putih Bersih', deskripsi: 'Putih dan abu-abu tipis, kartu hanya bergaris, konten dipersempit agar fokus; sub-tab bergaris bawah.', ...AWAL, huruf: 'inter', header: 'polos', kartu: 'garis', lebar: 'sempit', subtab: 'garis',
    ...paletTurunan({ brand: '#1f2937', tint: '#64748b', accent: '#94a3b8' }),
  },
  kertas: {
    kategori: 'minimalis', label: 'Kertas', deskripsi: 'Krem pucat seperti halaman buku, huruf berkaki, tanpa bayangan; tenang untuk membaca soal.', ...AWAL, huruf: 'lora', sudut: 'tajam', header: 'polos', kartu: 'garis', lebar: 'sempit', subtab: 'garis',
    ...paletTurunan({ brand: '#44403c', tint: '#8b7355', accent: '#a8a29e', kertas: '#fffdf8' }),
  },
  satuwarna: {
    kategori: 'minimalis', label: 'Satu Warna', deskripsi: 'Netral dengan satu aksen biru; menu berupa rel ikon ramping di kiri agar layar lega.', ...AWAL, huruf: 'inter', header: 'polos', kartu: 'garis', nav: 'rel',
    ...paletTurunan({ brand: '#2563eb', tint: '#475569', accent: '#93c5fd' }),
  },
  korporat: {
    kategori: 'profesional', label: 'Korporat', deskripsi: 'Biru baja dan emas tipis, huruf teknis, rapat dan lebar; menu serta sub-tab ke bawah di kiri.', ...AWAL, huruf: 'ibmplex', kepadatan: 'ringkas', kartu: 'garis', lebar: 'lebar', nav: 'samping', subtab: 'kiri',
    ...paletTurunan({ brand: '#0f4c81', tint: '#475569', accent: '#c9a227' }),
  },
  safir: {
    kategori: 'klasik', label: 'Safir Klasik', deskripsi: 'Biru safir tua dan emas, huruf berkaki tegas, sudut tajam; kesan resmi dan berwibawa.', ...AWAL, huruf: 'merriweather', sudut: 'tajam',
    ...paletTurunan({ brand: '#1e3a8a', tint: '#3b4a6b', accent: '#c9a24a' }),
  },
  zaitun: {
    kategori: 'klasik', label: 'Zaitun', deskripsi: 'Hijau zaitun yang teduh dengan huruf berkaki; hangat dan tidak mencolok.', ...AWAL, huruf: 'lora',
    ...paletTurunan({ brand: '#4d6b1f', tint: '#6b7a3a', accent: '#b8923a' }),
  },
  violet: {
    kategori: 'modern', label: 'Violet', deskripsi: 'Ungu segar, sudut membulat, huruf geometris; menu dan sub-tab di kiri.', ...AWAL, huruf: 'poppins', sudut: 'bulat', header: 'polos', nav: 'samping', subtab: 'kiri',
    ...paletTurunan({ brand: '#6d28d9', tint: '#7c6fb0', accent: '#f59e0b' }),
  },
  senja: {
    kategori: 'modern', label: 'Senja', deskripsi: 'Jingga hangat dan huruf ramah, sudut membulat; rel ikon di kiri, sub-tab bergaris bawah.', ...AWAL, huruf: 'nunito', sudut: 'bulat', header: 'polos', nav: 'rel', subtab: 'garis',
    ...paletTurunan({ brand: '#c2410c', tint: '#b08968', accent: '#fbbf24' }),
  },
  mawar: {
    kategori: 'modern', label: 'Mawar', deskripsi: 'Merah muda tua yang tegas dan ceria, huruf geometris, sudut membulat.', ...AWAL, huruf: 'poppins', sudut: 'bulat',
    ...paletTurunan({ brand: '#be123c', tint: '#b0708a', accent: '#fda4af' }),
  },
  malam: {
    kategori: 'modern', label: 'Malam', deskripsi: 'Selalu gelap, biru langit di atas hitam kebiruan; nyaman di ruangan redup. Menu dan sub-tab di kiri.', ...AWAL, huruf: 'inter', sudut: 'bulat', header: 'polos', kartu: 'garis', nav: 'samping', subtab: 'kiri', mode: 'gelap',
    ...paletTurunan({ brand: '#0284c7', tint: '#5b6b8c', accent: '#38bdf8' }),
  },
  nyaman: {
    kategori: 'aksesibel', label: 'Nyaman Mata', deskripsi: 'Huruf Atkinson yang sangat jelas, lega, krem lembut tanpa silau; cocok untuk membaca lama.', ...AWAL, huruf: 'atkinson', kepadatan: 'lega', header: 'polos', kartu: 'garis',
    ...paletTurunan({ brand: '#1f5f8b', tint: '#8a8366', accent: '#d4a017', kertas: '#fffef9' }),
  },
};
export const URUTAN_TEMPLAT = ['zamrud', 'putih', 'kertas', 'satuwarna', 'samudra', 'korporat', 'grafit', 'tosca', 'violet', 'senja', 'mawar', 'malam', 'marun', 'pasir', 'safir', 'zaitun', 'kontras', 'nyaman'];
export const TEMPLAT_AWAL = 'zamrud';

/* ------------------------------------------------------------- Huruf */
// `famili` = nama keluarga tanpa jenis generik; `generik` ditaruh PALING AKHIR supaya huruf Arab tidak jatuh ke font bawaan peramban sebelum
// sampai ke pilihan huruf Arab. `google` = parameter family Google Fonts (dimuat hanya bila dipilih; null = sudah dimuat index.html atau font sistem).
// CSP vercel.json sudah mengizinkan fonts.googleapis.com dan fonts.gstatic.com.
export const HURUF_LATIN = {
  jakarta: { label: 'Plus Jakarta Sans (bawaan)', famili: "'Plus Jakarta Sans'", generik: 'sans-serif', google: null },
  inter: { label: 'Inter (bersih, netral)', famili: "'Inter'", generik: 'sans-serif', google: 'Inter:wght@400;500;600;700;800' },
  nunito: { label: 'Nunito (ramah, membulat)', famili: "'Nunito'", generik: 'sans-serif', google: 'Nunito:wght@400;500;600;700;800' },
  poppins: { label: 'Poppins (modern, geometris)', famili: "'Poppins'", generik: 'sans-serif', google: 'Poppins:wght@400;500;600;700;800' },
  ibmplex: { label: 'IBM Plex Sans (teknis, rapi)', famili: "'IBM Plex Sans'", generik: 'sans-serif', google: 'IBM+Plex+Sans:wght@400;500;600;700' },
  atkinson: { label: 'Atkinson Hyperlegible (sangat jelas dibaca)', famili: "'Atkinson Hyperlegible'", generik: 'sans-serif', google: 'Atkinson+Hyperlegible:wght@400;700' },
  sistem: { label: 'Huruf sistem perangkat (tanpa unduhan)', famili: "system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial", generik: 'sans-serif', google: null },
  lora: { label: 'Lora (berkaki, buku)', famili: "'Lora'", generik: 'serif', google: 'Lora:wght@400;500;600;700' },
  merriweather: { label: 'Merriweather (berkaki, tegas)', famili: "'Merriweather'", generik: 'serif', google: 'Merriweather:wght@400;700' },
  serif: { label: 'Berkaki sistem (Georgia, tanpa unduhan)', famili: "Georgia,'Times New Roman','Noto Serif'", generik: 'serif', google: null },
};
export const HURUF_ARAB = {
  amiri: { label: 'Amiri (naskh klasik, bawaan)', famili: "'Amiri','Scheherazade New','Traditional Arabic'", generik: 'serif', google: null },
  scheherazade: { label: 'Scheherazade New (naskh besar, lega)', famili: "'Scheherazade New','Amiri','Traditional Arabic'", generik: 'serif', google: null },
  naskh: { label: 'Noto Naskh Arabic (naskh modern)', famili: "'Noto Naskh Arabic','Amiri'", generik: 'serif', google: 'Noto+Naskh+Arabic:wght@400;500;600;700' },
  kufi: { label: 'Noto Kufi Arabic (kufi modern, tanpa ornamen)', famili: "'Noto Kufi Arabic','Amiri'", generik: 'sans-serif', google: 'Noto+Kufi+Arabic:wght@400;500;600;700' },
  sistem: { label: 'Huruf Arab sistem perangkat (tanpa unduhan)', famili: "'Traditional Arabic','Geeza Pro','Segoe UI',Tahoma", generik: 'serif', google: null },
};

/* ------------------------------------------------------------ Pilihan */
export const OPSI = {
  huruf: { label: 'Huruf teks (Latin)', nilai: Object.fromEntries(Object.entries(HURUF_LATIN).map(([k, v]) => [k, v.label])) },
  hurufArab: { label: 'Huruf Arab', nilai: Object.fromEntries(Object.entries(HURUF_ARAB).map(([k, v]) => [k, v.label])) },
  nav: { label: 'Letak menu utama', nilai: { menu: 'Menu buka-tutup di kepala (bawaan)', samping: 'Menu tetap di sisi kiri (layar lebar)', rel: 'Rel ikon ramping di sisi kiri (layar lebar)' } },
  subtab: { label: 'Letak sub-tab', nilai: { kapsul: 'Kapsul di kepala (bawaan)', garis: 'Tab bergaris bawah di kepala', kiri: 'Daftar ke bawah di menu kiri (layar lebar)' } },
  sudut: { label: 'Sudut kartu dan tombol', nilai: { tajam: 'Tegas', sedang: 'Sedang (bawaan)', bulat: 'Membulat' } },
  kepadatan: { label: 'Kepadatan', nilai: { ringkas: 'Rapat', normal: 'Normal (bawaan)', lega: 'Lega (huruf lebih besar)' } },
  header: { label: 'Kepala halaman', nilai: { pola: 'Berpola dan bergaris emas (bawaan)', polos: 'Polos' } },
  kartu: { label: 'Panel isi', nilai: { bayangan: 'Berbayang (bawaan)', garis: 'Hanya garis tepi' } },
  lebar: { label: 'Lebar konten', nilai: { sempit: 'Sempit', standar: 'Standar (bawaan)', lebar: 'Lebar' } },
  mode: { label: 'Mode warna', nilai: { ikuti: 'Ikuti pengaturan perangkat (bawaan)', terang: 'Selalu terang', gelap: 'Selalu gelap' } },
};
export const KUNCI_OPSI = Object.keys(OPSI);
export const TAMPILAN_BAWAAN = Object.freeze({ templat: TEMPLAT_AWAL, ganti: Object.freeze({}) });

/** Rapikan masukan tak tepercaya (dari server atau localStorage) menjadi bentuk sah. Tidak pernah melempar. */
export function normalisasiTampilan(m) {
  const o = m && typeof m === 'object' && !Array.isArray(m) ? m : {};
  const templat = Object.hasOwn(TEMPLAT, o.templat) ? o.templat : TEMPLAT_AWAL;
  const g = o.ganti && typeof o.ganti === 'object' && !Array.isArray(o.ganti) ? o.ganti : {};
  const ganti = {};
  for (const k of KUNCI_OPSI) if (typeof g[k] === 'string' && Object.hasOwn(OPSI[k].nilai, g[k]) && g[k] !== TEMPLAT[templat][k]) ganti[k] = g[k];
  if (typeof g.warnaUtama === 'string' && HEX.test(g.warnaUtama)) ganti.warnaUtama = g.warnaUtama.toLowerCase();
  return { templat, ganti };
}

/** Pengaturan efektif = template + penyesuaian. Warna sudah final (turunan warna utama ikut). */
export function efektif(m) {
  const n = normalisasiTampilan(m); const t = TEMPLAT[n.templat];
  const e = { templat: n.templat, warnaUtama: n.ganti.warnaUtama || '' };
  for (const k of KUNCI_OPSI) e[k] = n.ganti[k] || t[k];
  if (e.subtab === 'kiri' && e.nav !== 'samping') e.nav = 'samping'; // sub-tab di kiri hidup di menu samping penuh (rel ikon terlalu sempit)
  let terang = t.terang; let gelap = t.gelap;
  if (e.warnaUtama) { const d = turunkanWarna(e.warnaUtama, t); terang = { ...terang, ...d.terang }; gelap = { ...gelap, ...d.gelap }; }
  return { ...e, terang, gelap };
}

/** Apakah pengaturan sama dengan tampilan bawaan aplikasi (tanpa CSS tambahan)? */
export const adalahBawaan = (m) => { const n = normalisasiTampilan(m); return n.templat === TEMPLAT_AWAL && !Object.keys(n.ganti).length; };

/* ------------------------------------------------------------- CSS */
const RADIUS = { tajam: { md: '2px', lg: '3px', xl: '4px', '2xl': '6px', px: '4px', kartuLogin: '8px' }, bulat: { md: '.5rem', lg: '.75rem', xl: '1rem', '2xl': '1.5rem', px: '14px', kartuLogin: '28px' } };
const ROOT_PX = { ringkas: '14.5px', lega: '17px' };
const LEBAR = { sempit: '56rem', lebar: '88rem' };
const VARS = ['bg', 'surface', 'ink', 'mute', 'line', 'brand', 'brand-fg', 'soft', 'soft-ink', 'head', 'head-ink', 'accent', 'warn', 'warn-bg', 'bad', 'bad-bg', 'ok', 'ok-bg'];
const blokWarna = (p, gelap) => `${VARS.map((k) => `--${k}:${p[k]}`).join(';')};--ring:${p.ring.startsWith('rgba') ? p.ring : `rgba(${p.ring},${gelap ? '.35' : '.28'})`};--shadow-sm:${gelap ? '0 1px 2px rgba(0,0,0,.35)' : '0 1px 2px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.05)'};--shadow-md:${gelap ? '0 6px 18px rgba(0,0,0,.4)' : '0 4px 14px rgba(15,23,42,.09), 0 1px 3px rgba(15,23,42,.06)'}`;

/** CSS tambahan untuk pengaturan `m`; string kosong bila sama dengan bawaan. Semua nilai berasal dari tabel tetap (tidak ada teks bebas dari admin selain HEX yang divalidasi). */
export function cssTampilan(m) {
  if (adalahBawaan(m)) return '';
  const e = efektif(m); const c = [];
  const warna = e.templat !== TEMPLAT_AWAL || e.warnaUtama;
  if (warna) {
    c.push(`:root,:root[data-theme="light"]{${blokWarna(e.terang, false)};color-scheme:light}`);
    c.push(`@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${blokWarna(e.gelap, true)};color-scheme:dark}}`);
    c.push(`:root[data-theme="dark"]{${blokWarna(e.gelap, true)};color-scheme:dark}`);
  }
  if (e.huruf !== 'jakarta' || e.hurufArab !== 'amiri') {
    const L = HURUF_LATIN[e.huruf]; const A = HURUF_ARAB[e.hurufArab];
    // Huruf Latin lebih dulu, lalu pilihan huruf Arab (untuk aksara Arab di teks bercampur), baru jenis generik.
    c.push(`body,.font-sans,[dir="auto"],.sel-ar,.sel-ar option{font-family:${L.famili},${A.famili},${L.generik}}`);
  }
  if (e.hurufArab !== 'amiri') {
    const A = HURUF_ARAB[e.hurufArab];
    c.push(`html [lang="ar"],html [dir="rtl"],html .ar,html .ar-sm,html .ar-nama,html .ar-input,html input[dir="rtl"],html textarea[dir="rtl"],html select[dir="rtl"]{font-family:${A.famili},${A.generik}}`);
  }
  const r = RADIUS[e.sudut];
  if (r) c.push(`:root{--r-md:${r.md};--r-lg:${r.lg};--r-xl:${r.xl};--r-2xl:${r['2xl']}}.field{border-radius:${r.px}}.login-card{border-radius:${r.kartuLogin}}`);
  if (ROOT_PX[e.kepadatan]) c.push(`html{font-size:${ROOT_PX[e.kepadatan]}}`);
  if (LEBAR[e.lebar]) c.push(`html .max-w-6xl{max-width:${LEBAR[e.lebar]}}`);
  if (e.header === 'polos') c.push('.pattern{background-image:none;background-color:var(--head);border-bottom-width:0}');
  if (e.kartu === 'garis') c.push('.rounded-2xl.border.bg-surface:not(.border-dashed),.rounded-2xl.border.bg-surface:not(.border-dashed):hover{box-shadow:none}');
  return c.join('\n');
}

/** Atribut data-* pada <html>: hanya yang perlu dibaca JavaScript atau CSS bentuk. */
export function atributTampilan(m) {
  const e = efektif(m);
  return { 'data-nav': e.nav, 'data-subtab': e.subtab, 'data-templat': e.templat, 'data-tema-paksa': e.mode === 'ikuti' ? null : (e.mode === 'terang' ? 'light' : 'dark') };
}

export const ID_STYLE = 'tampilan-kustom';
export const ID_FONT = 'tampilan-font';

/** Alamat stylesheet Google Fonts untuk huruf pilihan yang belum dimuat index.html; '' bila tidak ada yang perlu diunduh. */
export function urlHuruf(m) {
  const e = efektif(m);
  const fam = [HURUF_LATIN[e.huruf].google, HURUF_ARAB[e.hurufArab].google].filter(Boolean);
  return fam.length ? `https://fonts.googleapis.com/css2?${fam.map((f) => `family=${f}`).join('&')}&display=swap` : '';
}
export const KUNCI_CACHE = 'labsouma-tampilan:v1';

/** Pasang ke dokumen. `doc` = document (disuntikkan agar bisa diuji dengan tiruan). */
export function terapkanTampilan(m, doc = (typeof document !== 'undefined' ? document : null)) {
  if (!doc) return;
  const css = cssTampilan(m); const a = atributTampilan(m); const root = doc.documentElement;
  let el = doc.getElementById(ID_STYLE);
  if (css) { if (!el) { el = doc.createElement('style'); el.id = ID_STYLE; doc.head.appendChild(el); } if (el.textContent !== css) el.textContent = css; } else if (el) el.remove();
  root.setAttribute('data-nav', a['data-nav']); root.setAttribute('data-subtab', a['data-subtab']); root.setAttribute('data-templat', a['data-templat']);
  if (a['data-tema-paksa']) root.setAttribute('data-theme', a['data-tema-paksa']); else root.removeAttribute('data-theme');
  const href = urlHuruf(m); let ln = doc.getElementById(ID_FONT);
  if (href) { if (!ln) { ln = doc.createElement('link'); ln.id = ID_FONT; ln.rel = 'stylesheet'; doc.head.appendChild(ln); } if (ln.href !== href) ln.href = href; } else if (ln) ln.remove();
  const meta = doc.querySelector && doc.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', efektif(m).terang.head);
}

/** Salinan terakhir di perangkat ini: dipakai untuk menerapkan tampilan sebelum login dan saat memuat, agar tidak berkedip. Aman dari galat penyimpanan. */
export function bacaCache(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  try { return normalisasiTampilan(JSON.parse((storage && storage.getItem(KUNCI_CACHE)) || 'null')); } catch (e) { return normalisasiTampilan(null); }
}
export function tulisCache(m, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  try { if (storage) storage.setItem(KUNCI_CACHE, JSON.stringify(normalisasiTampilan(m))); } catch (e) { /* penyimpanan penuh/diblokir: abaikan */ }
}
