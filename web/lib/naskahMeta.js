// Opsi dropdown "Pengaturan Naskah Ujian" (tab Export) yang diturunkan dari Konfigurasi: tingkat, kelas, mata pelajaran, dan tahun ajaran hijriah.
// Fungsi murni tanpa dependensi, dipakai browser dan tes.
//
// Konfigurasi menyimpan nama Latin (mapel, kelas Romawi), sedangkan kop naskah berbahasa Arab. Jadi tiap pilihan membawa dua nilai:
//   kunci : nama di Konfigurasi (dipakai untuk menyambung dropdown: tingkat -> kelas dan mapel)
//   arab  : teks yang dicetak di naskah. Usulan otomatis; pengguna tetap bisa mengubahnya di kolom teks Arab.
// Usulan Arab mata pelajaran adalah titik awal, mohon ditinjau ustadz/guru mapel (sama seperti nama Arab kitab bawaan di appConfig.js).

const arr = (v) => (Array.isArray(v) ? v : []);
const teks = (v) => (typeof v === 'string' ? v.trim() : '');
const ADA_ARAB = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
export const adaHurufArab = (s) => ADA_ARAB.test(String(s || ''));

/* ---------- Tahun ajaran hijriah ---------- */

/** Bulan hijriah ke-10 (Syawal): awal tahun ajaran pesantren/madrasah diniyah. Sebelum Syawal, tahun ajaran berjalan dimulai tahun hijriah sebelumnya. */
export const BULAN_AWAL_TAHUN_AJARAN = 10;

/** Tahun dan bulan hijriah (Umm al-Qura) untuk satu tanggal. Mengembalikan null bila runtime tidak mendukung kalender hijriah. */
export function hijriahDari(tanggal = new Date()) {
  try {
    const bagian = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(tanggal);
    const ambil = (t) => Number((bagian.find((p) => p.type === t) || {}).value);
    const tahun = ambil('year'); const bulan = ambil('month');
    return Number.isInteger(tahun) && tahun > 1300 && bulan >= 1 && bulan <= 12 ? { tahun, bulan } : null;
  } catch (e) { return null; }
}

/** Format tahun ajaran sama dengan nilai awal naskah: "1447 – 1448". */
export const formatTahunAjaran = (mulai) => `${mulai} – ${mulai + 1}`;

/** Tahun mulai tahun ajaran yang sedang berjalan (mis. 1447 untuk "1447 – 1448"); null bila kalender hijriah tidak tersedia. */
export function tahunAjaranBerjalan(tanggal = new Date()) {
  const h = hijriahDari(tanggal);
  if (!h) return null;
  return h.bulan >= BULAN_AWAL_TAHUN_AJARAN ? h.tahun : h.tahun - 1;
}

/**
 * Opsi dropdown tahun ajaran: dua tahun ajaran sebelumnya, yang berjalan, dan satu berikutnya (terbaru di atas).
 * `tersimpan` (nilai yang sudah ada di naskah, mis. dari draf) selalu ikut agar tidak hilang diam-diam.
 */
export function opsiTahunAjaran(tanggal = new Date(), tersimpan = '') {
  const kini = tahunAjaranBerjalan(tanggal);
  const daftar = kini === null ? [] : [kini + 1, kini, kini - 1, kini - 2].map(formatTahunAjaran);
  const lama = teks(tersimpan);
  if (lama && !daftar.includes(lama)) daftar.push(lama);
  return daftar;
}

/** Tahun ajaran bawaan: yang sedang berjalan; bila kalender tidak tersedia, `cadangan`. */
export const tahunAjaranBawaan = (tanggal = new Date(), cadangan = '') => { const k = tahunAjaranBerjalan(tanggal); return k === null ? cadangan : formatTahunAjaran(k); };

/* ---------- Tingkat ---------- */

/**
 * Teks Arab tingkat untuk kop. Template memakai bentuk sifat ("الثانوي"), sedangkan Konfigurasi menyimpan nama lembaga ("المدرسة الثانوية"):
 * awalan "المدرسة" dibuang dan akhiran "ية" diubah menjadi "ي". Label Arab lain (mis. "المرحلة") dipakai apa adanya.
 */
export function arabTingkat(t) {
  const a = teks(t && t.labelArab).replace(/\s+/g, ' ');
  if (!a) return '';
  const m = /^المدرسة\s+(\S+)$/.exec(a);
  if (!m) return a;
  return m[1].replace(/ية$/, 'ي');
}

/** Tingkat aktif dari Konfigurasi: [{ kunci, label, arab }]. `kunciTambahan` (nilai tersimpan yang sudah tidak aktif) tetap ditawarkan. */
export function opsiTingkat(cfg, kunciTambahan = '') {
  const semua = arr(cfg && cfg.tingkat).filter((t) => t && t.nama);
  const hasil = semua.filter((t) => t.aktif !== false || t.nama === kunciTambahan);
  return hasil.map((t) => ({ kunci: t.nama, label: t.label || t.nama, arab: arabTingkat(t) }));
}

/* ---------- Kelas ---------- */

const ORDINAL = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر'];
const ROMAWI = { I: 1, V: 5, X: 10 };

/** Angka kelas dari "VII", "7", atau "Kelas 7"; 0 bila tidak dikenali. */
export function angkaKelas(label) {
  const s = teks(label).replace(/^kelas\s+/i, '').toUpperCase();
  if (/^\d{1,2}$/.test(s)) return Number(s);
  if (!/^[IVX]+$/.test(s)) return 0;
  let n = 0;
  for (let i = 0; i < s.length; i++) { const a = ROMAWI[s[i]]; const b = ROMAWI[s[i + 1]] || 0; n += a < b ? -a : a; }
  return n;
}

/** Kelas ke ordinal Arab ("VII" -> "السابع"). Kelas di luar 1-12 atau tak dikenali -> '' (pengguna mengisi sendiri). */
export const arabKelas = (label) => ORDINAL[angkaKelas(label)] || '';

/**
 * Kelas milik satu tingkat sesuai Konfigurasi: [{ kunci, arab }]. Kelas Romawi di Konfigurasi berlanjut antar tingkat
 * (MTs VII-IX), sedangkan kop memakai urutan di dalam tingkat ("الأول" untuk kelas pertama tingkat itu), jadi ordinal dihitung dari posisi.
 */
export function opsiKelas(kelasTingkat, kunciTambahan = '') {
  const daftar = arr(kelasTingkat).filter((k) => typeof k === 'string' && k);
  const hasil = daftar.map((k, i) => ({ kunci: k, arab: ORDINAL[i + 1] || arabKelas(k) }));
  const lama = teks(kunciTambahan);
  if (lama && !daftar.includes(lama)) hasil.push({ kunci: lama, arab: arabKelas(lama) });
  return hasil;
}

/* ---------- Mata pelajaran ---------- */

// Usulan nama Arab untuk mapel bawaan Konfigurasi (kunci sudah dinormalisasi lewat kunciMapel). Mapel dengan `namaArab` di Konfigurasi didahulukan.
const KAMUS_MAPEL = {
  fiqih: 'فقه', akidah: 'عقيدة', akhlak: 'أخلاق', 'tarikhski': 'تاريخ الإسلام', 'quranhadits': 'القرآن والحديث', 'bahasaarab': 'اللغة العربية',
  tajwid: 'تجويد', nahwu: 'نحو', sharaf: 'صرف', hadits: 'حديث', 'ilmuhadits': 'مصطلح الحديث', tafsir: 'تفسير', 'ilmutafsir': 'علوم التفسير',
  'ushulfiqih': 'أصول الفقه', faraidh: 'فرائض', 'ilmukalam': 'علم الكلام', 'akhlaktasawuf': 'الأخلاق والتصوف', balaghah: 'بلاغة', mantiq: 'منطق',
};
const kunciMapel = (nama) => String(nama || '').toLowerCase().replace(/[^a-z]/g, '');

/** Nama Arab mapel: `namaArab` dari Konfigurasi bila ada, lalu usulan bawaan, lalu '' (isi sendiri). */
export function arabMapel(cfg, nama) {
  const m = arr(cfg && cfg.mapel).find((x) => x && x.nama === nama);
  const dariCfg = teks(m && m.namaArab);
  if (dariCfg && adaHurufArab(dariCfg)) return dariCfg;
  return KAMUS_MAPEL[kunciMapel(nama)] || '';
}

/** Mapel aktif untuk satu tingkat (semua tingkat bila `tingkat` kosong): [{ kunci, arab }]. Nilai tersimpan yang tak ada lagi tetap ikut. */
export function opsiMapel(cfg, tingkat = '', kunciTambahan = '') {
  const cocok = arr(cfg && cfg.mapel).filter((m) => m && m.nama && m.aktif !== false && (!tingkat || arr(m.tingkat).includes(tingkat)));
  const nama = [...new Set(cocok.map((m) => m.nama))];
  const lama = teks(kunciTambahan);
  if (lama && !nama.includes(lama)) nama.push(lama);
  return nama.map((n) => ({ kunci: n, arab: arabMapel(cfg, n) }));
}

/* ---------- Penyelarasan dengan pilihan di filter Export ---------- */

/**
 * Menyelaraskan pengaturan naskah dengan filter Export (mapel, tingkat, kelas). Hanya filter yang terisi yang dipakai;
 * "Semua" membiarkan pilihan naskah apa adanya. Tingkat yang berganti mengosongkan kelas dan mapel yang tidak lagi cocok.
 * Teks Arab yang sudah diubah manual tidak ditimpa kecuali pilihannya sendiri berganti.
 */
export function selaraskanDenganFilter(cfg, meta, filter) {
  let m = { ...meta };
  const f = filter || {};
  if (f.tingkat && f.tingkat !== m.tingkatKey) m = pilihTingkat(cfg, m, f.tingkat);
  if (f.kelas && f.kelas !== m.kelasKey) m = pilihKelas(cfg, m, f.kelas);
  if (f.mapel && f.mapel !== m.mapelKey) m = pilihMapel(cfg, m, f.mapel);
  return m;
}

const kelasDi = (cfg, tingkat) => arr(arr(cfg && cfg.tingkat).find((t) => t && t.nama === tingkat)?.kelas);

/** Memilih tingkat: teks Arab ikut, kelas dan mapel yang tidak termasuk tingkat itu dikosongkan. */
export function pilihTingkat(cfg, meta, kunci) {
  const t = arr(cfg && cfg.tingkat).find((x) => x && x.nama === kunci);
  const m = { ...meta, tingkatKey: t ? t.nama : '', tingkat: t ? arabTingkat(t) : meta.tingkat };
  // Pilihan yang tidak termasuk tingkat baru dikosongkan bersama teks Arabnya, agar kop tidak membawa kelas/mapel tingkat lain.
  if (m.kelasKey && !kelasDi(cfg, m.tingkatKey).includes(m.kelasKey)) { m.kelasKey = ''; m.kelas = ''; }
  if (m.mapelKey && m.tingkatKey && !opsiMapel(cfg, m.tingkatKey).some((o) => o.kunci === m.mapelKey)) { m.mapelKey = ''; m.mapelLatin = ''; m.mapel = ''; }
  return m;
}

/** Memilih kelas (kunci dari Konfigurasi); '' membiarkan teks Arab apa adanya. Teks lama tidak dipertahankan bila usulan Arab tidak ada (jangan membawa kelas lain). */
export function pilihKelas(cfg, meta, kunci) {
  const o = opsiKelas(kelasDi(cfg, meta.tingkatKey)).find((x) => x.kunci === kunci)
    || (kunci ? { kunci, arab: arabKelas(kunci) } : null);
  return { ...meta, kelasKey: o ? o.kunci : '', kelas: o ? o.arab : meta.kelas };
}

/** Memilih mapel (kunci dari Konfigurasi). `mapelLatin` dipakai untuk nama berkas, karena teks Arab tidak masuk nama berkas. */
export function pilihMapel(cfg, meta, kunci) {
  if (!kunci) return { ...meta, mapelKey: '', mapelLatin: '' };
  return { ...meta, mapelKey: kunci, mapelLatin: kunci, mapel: arabMapel(cfg, kunci) };
}
