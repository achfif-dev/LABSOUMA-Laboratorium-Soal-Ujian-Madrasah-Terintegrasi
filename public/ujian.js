// Kelas, sistem ujian (semester / catur wulan), dan penempatan kitab per kelas per periode ujian.
// Fungsi murni tanpa dependensi. Satu sumber kebenaran:
//  - server  : import dari src/ujian.js (src/appConfig.js)
//  - browser : dimuat lewat <script type="module"> di index.html -> window.Ujian
//
// Model data (disimpan di config/app lewat src/appConfig.js):
//   cfg.sistemUjian = [{ id, label, periode: [{ kode, label }] }]       daftar sistem ujian; nama dan periodenya bisa diubah admin
//   cfg.tingkat[i]  = { nama, ..., kelas: ['VII', ...], sistemUjian: id } kelas milik tingkat; sistem ujian yang dipakai tingkat itu
//   cfg.kitab[i]    = { ..., tingkat: [...], penempatan: [{ tingkat, kelas, periode: [{ kode, cakupan }] }] }
//
// Aturan penempatan kitab (sengaja kompatibel dengan konfigurasi lama):
//   - Tingkat ada di kitab.tingkat tetapi tidak punya entri penempatan  -> kitab berlaku untuk SEMUA kelas dan periode tingkat itu.
//   - Tingkat punya entri penempatan                                     -> kitab hanya berlaku untuk kelas yang tercantum.
//   - Entri kelas dengan `periode` kosong                                -> semua periode kelas itu.
//   - Entri kelas dengan `periode` terisi                                -> hanya periode yang tercantum (cakupan = bagian materi, opsional).

export const BATAS_UJIAN = { sistem: 4, periode: 6, labelSistem: 40, labelPeriode: 60, kode: 20, cakupan: 120, penempatan: 60 };
export const KODE_OK = /^[a-z0-9][a-z0-9-]{0,19}$/;

/** Bawaan: semester lengkap dengan tengah semester (4 ujian) dan catur wulan (3 ujian). Nama bisa diubah admin. */
export const DEFAULT_SISTEM_UJIAN = [
  {
    id: 'semester', label: 'Semester',
    periode: [
      { kode: 'sem1-uts', label: 'UTS Semester 1 (Ganjil)' },
      { kode: 'sem1-uas', label: 'UAS Semester 1 (Ganjil)' },
      { kode: 'sem2-uts', label: 'UTS Semester 2 (Genap)' },
      { kode: 'sem2-uas', label: 'UAS Semester 2 (Genap)' },
    ],
  },
  {
    id: 'caturwulan', label: 'Catur Wulan',
    periode: [
      { kode: 'cw1', label: 'Ujian Catur Wulan 1' },
      { kode: 'cw2', label: 'Ujian Catur Wulan 2' },
      { kode: 'cw3', label: 'Ujian Catur Wulan 3' },
    ],
  },
];

const arr = (v) => (Array.isArray(v) ? v : []);
const obj = (v) => (v && typeof v === 'object' ? v : {});
const salin = (o) => JSON.parse(JSON.stringify(o));

/** Daftar sistem ujian dari konfigurasi; konfigurasi lama (tanpa sistemUjian) memakai bawaan. */
export const daftarSistem = (cfg) => { const l = arr(obj(cfg).sistemUjian).filter((s) => s && s.id); return l.length ? l : salin(DEFAULT_SISTEM_UJIAN); };

const cariTingkat = (cfg, tingkat) => arr(obj(cfg).tingkat).find((t) => t && t.nama === tingkat) || null;

/** Kelas milik satu tingkat, sesuai urutan di konfigurasi. */
export const kelasUntuk = (cfg, tingkat) => arr((cariTingkat(cfg, tingkat) || {}).kelas).filter((k) => typeof k === 'string' && k);

/** Sistem ujian yang dipakai tingkat; bila belum ditentukan, sistem pertama. */
export function sistemUntuk(cfg, tingkat) {
  const list = daftarSistem(cfg);
  const id = (cariTingkat(cfg, tingkat) || {}).sistemUjian;
  return list.find((s) => s.id === id) || list[0] || null;
}

/** Periode ujian (berurutan) untuk satu tingkat. */
export const periodeUntuk = (cfg, tingkat) => arr((sistemUntuk(cfg, tingkat) || {}).periode);

/** Label periode. Kode yang sudah tidak ada di sistem tingkat dicari di sistem lain, terakhir kembali ke kodenya sendiri. */
export function labelPeriode(cfg, tingkat, kode) {
  if (!kode) return '';
  const p = periodeUntuk(cfg, tingkat).find((x) => x.kode === kode);
  if (p) return p.label;
  for (const s of daftarSistem(cfg)) { const q = arr(s.periode).find((x) => x.kode === kode); if (q) return q.label; }
  return kode;
}

export const labelSistem = (cfg, tingkat) => (sistemUntuk(cfg, tingkat) || {}).label || '';

/** Entri penempatan satu kitab pada satu tingkat. */
export const penempatanKitab = (kitab, tingkat) => arr(obj(kitab).penempatan).filter((p) => p && p.tingkat === tingkat);

/**
 * Apakah kitab layak ditawarkan untuk pilihan ini? Kelas/periode boleh kosong (belum dipilih): kitab tetap ditawarkan
 * selama ia dipakai di tingkat itu. Tidak memeriksa `aktif` dan mapel (itu urusan pemanggil).
 */
export function kitabCocok(k, { tingkat = '', kelas = '', periode = '' } = {}) {
  if (!tingkat) return true;
  if (!arr(k.tingkat).includes(tingkat)) return false;
  const pet = penempatanKitab(k, tingkat);
  if (!pet.length || !kelas) return true;
  const p = pet.find((x) => x.kelas === kelas);
  if (!p) return false;
  const per = arr(p.periode);
  return !periode || !per.length || per.some((x) => x.kode === periode);
}

/** Cakupan materi (teks bebas dari admin) untuk kitab pada kelas dan periode tertentu; '' bila tidak ada. */
export function cakupanKitab(k, tingkat, kelas, periode) {
  const p = penempatanKitab(k, tingkat).find((x) => x.kelas === kelas);
  const per = p ? arr(p.periode).find((x) => x.kode === periode) : null;
  return per && per.cakupan ? per.cakupan : '';
}

/** Ringkasan teks penempatan satu kitab, satu baris per tingkat: "MTs · Kelas VII: UTS 1, UAS 1 | Kelas VIII: semua periode". */
export function ringkasPenempatan(cfg, k) {
  return arr(k.tingkat).map((nama) => {
    const t = cariTingkat(cfg, nama); const judul = (t && (t.singkat || t.label)) || nama;
    const pet = penempatanKitab(k, nama);
    if (!pet.length) return `${judul}: semua kelas dan periode`;
    return `${judul} · ` + pet.map((p) => {
      const per = arr(p.periode);
      return `Kelas ${p.kelas}: ${per.length ? per.map((x) => labelPeriode(cfg, nama, x.kode)).join(', ') : 'semua periode'}`;
    }).join(' | ');
  });
}

/** Ada soal/pilihan yang merujuk kelas yang sudah tidak ada di konfigurasi tingkat? Untuk peringatan di menu Konfigurasi. */
export function penempatanYatim(cfg, k) {
  return arr(k.penempatan).filter((p) => p && (
    !kelasUntuk(cfg, p.tingkat).includes(p.kelas)
    || !arr(p.periode).every((x) => periodeUntuk(cfg, p.tingkat).some((y) => y.kode === x.kode))));
}
