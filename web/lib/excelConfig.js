// Impor dan ekspor konfigurasi lewat Excel (.xlsx): template yang bisa diunduh, pembaca berkas, dan penggabung ke konfigurasi.
// Murni (tanpa React) supaya bisa diuji di Node. Hasil impor TIDAK langsung disimpan: ia dimasukkan ke editor Konfigurasi
// sebagai perubahan yang belum disimpan, lalu server memvalidasi ulang (sanitizeAppConfig) saat admin menekan Simpan.
import { DEFAULT_SISTEM_UJIAN, KODE_OK, BATAS_UJIAN } from './ujian.js';

export const LEMBAR = { petunjuk: 'Petunjuk', tingkat: 'Tingkat', sistem: 'Sistem Ujian', mapel: 'Mapel', kitab: 'Kitab', penempatan: 'Penempatan' };
export const KOLOM = {
  tingkat: ['Kunci', 'Label', 'Label Arab', 'Singkatan', 'Kelas', 'Sistem Ujian', 'Aktif'],
  sistem: ['ID Sistem', 'Nama Sistem', 'Kode Periode', 'Nama Periode'],
  mapel: ['Nama', 'Tingkat', 'Aktif'],
  kitab: ['Nama', 'Nama Arab', 'Pengarang', 'Pengarang Arab', 'Mapel', 'Tautan', 'Tingkat', 'Aktif'],
  penempatan: ['Kitab', 'Tingkat', 'Kelas', 'Kode Periode', 'Cakupan'],
};
const WAJIB = { tingkat: ['kunci'], sistem: ['idsistem', 'kodeperiode', 'namaperiode'], mapel: ['nama'], kitab: ['nama'], penempatan: ['kitab', 'tingkat', 'kelas'] };
const MAKS_BARIS = 2000;
const MAKS_BYTE = 5_000_000;
const HURUF_ARAB = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const AWAL_CONTOH = /^\(contoh\)/i;
const BATAS = { tingkat: 40, kelas: 20, jmlKelas: 12, singkat: 10, mapel: 60, kitab: 120, pengarang: 100, tautan: 300 };

const kunciKolom = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const teks = (v) => {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return '';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v).replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim();
};
const daftar = (v) => teks(v).split(/[,،;\n]/).map((x) => x.trim()).filter(Boolean);
const aktifDari = (v) => {
  const t = teks(v).toLowerCase();
  if (!t) return { nilai: true };
  if (['ya', 'y', 'true', '1', 'aktif', 'yes'].includes(t)) return { nilai: true };
  if (['tidak', 'tdk', 'n', 'no', 'false', '0', 'nonaktif', 'non-aktif'].includes(t)) return { nilai: false };
  return { galat: `nilai "${teks(v)}" pada kolom Aktif tidak dikenal (isi Ya atau Tidak)` };
};
const salin = (o) => JSON.parse(JSON.stringify(o));
const ya = (b) => (b === false ? 'Tidak' : 'Ya');

/* ------------------------------------------------------------------ Menulis */

const H = (v) => ({ value: v, fontWeight: 'bold', backgroundColor: '#d9ead3' });
const lembar = (nama, kolom, baris, lebar) => ({
  sheet: nama,
  data: [kolom.map(H), ...baris],
  columns: lebar.map((width) => ({ width })),
  stickyRowsCount: 1,
});

const PETUNJUK = [
  'PETUNJUK PENGISIAN KONFIGURASI LABSOUMA',
  '',
  'Cara pakai: isi lembar-lembar di bawah ini, simpan sebagai .xlsx, lalu di aplikasi buka menu Konfigurasi > Impor dari Excel.',
  'Hasil impor TIDAK langsung disimpan. Ia masuk ke layar Konfigurasi sebagai perubahan; periksa dulu, lalu tekan Simpan konfigurasi.',
  'Versi sebelumnya otomatis masuk ke Cadangan & Riwayat, jadi kesalahan bisa dikembalikan.',
  '',
  'Aturan umum:',
  '- Baris pertama tiap lembar adalah judul kolom. Jangan diubah namanya; urutan kolom boleh berbeda.',
  '- Baris yang diawali (contoh) diabaikan. Hapus awalan itu bila ingin memakai baris tersebut.',
  '- Lembar yang tidak ada atau kosong sama sekali tidak mengubah apa pun. Cukup isi lembar yang ingin diubah.',
  '- Kolom Aktif: isi Ya atau Tidak (kosong = Ya).',
  '- Kolom yang berisi banyak nilai (Kelas, Tingkat) dipisah koma, mis. VII, VIII, IX.',
  '',
  'Lembar Tingkat: Kunci dipakai pada setiap soal dan tidak bisa diubah setelah disimpan. Kelas maksimal 12 per tingkat. Sistem Ujian diisi ID sistem dari lembar Sistem Ujian.',
  'Lembar Sistem Ujian: satu baris = satu periode ujian. Baris dengan ID Sistem yang sama membentuk satu sistem; urutan baris = urutan ujian. Kode Periode huruf kecil, angka, atau tanda hubung (maks. 20 karakter) dan unik di seluruh lembar.',
  'Lembar Mapel: kolom Tingkat berisi Kunci tingkat; kosong = semua tingkat.',
  'Lembar Kitab: Nama Arab dan Pengarang Arab harus berhuruf Arab (harakat boleh). Tautan hanya diterima dari situs kitab yang diizinkan aplikasi; selain itu dikosongkan saat disimpan. Tingkat kosong = semua tingkat.',
  'Lembar Penempatan: satu baris = satu kitab di satu kelas pada satu periode. Kode Periode kosong = semua periode kelas itu. Cakupan = bagian materi (opsional). Kitab yang tidak disebut di lembar ini tidak diubah penempatannya.',
  '',
  'Saat impor, pilih cara: "Tambah & perbarui" (nama yang sama diperbarui, yang baru ditambahkan, yang lain dibiarkan) atau "Ganti seluruh daftar" (daftar di lembar itu menggantikan yang ada).',
];

const BARIS_CONTOH = {
  tingkat: [['(contoh) Wustha', 'Wustha (Wst)', 'الوسطى', 'Wst', 'VII, VIII, IX', 'semester', 'Ya']],
  sistem: [['(contoh) semester', 'Semester', 'sem1-uts', 'UTS Semester 1 (Ganjil)'], ['(contoh) semester', 'Semester', 'sem1-uas', 'UAS Semester 1 (Ganjil)']],
  mapel: [['(contoh) Fiqih', 'Wustha, Aliyah', 'Ya']],
  kitab: [['(contoh) Safinatun Naja', 'سفينة النجا', 'Salim bin Sumair al-Hadhrami', 'سالم بن سمير الحضرمي', 'Fiqih', 'https://shamela.ws/book/12345', 'Wustha', 'Ya']],
  penempatan: [['(contoh) Safinatun Naja', 'Wustha', 'VII', 'sem1-uts', 'Bab Thaharah'], ['(contoh) Safinatun Naja', 'Wustha', 'VII', '', '']],
};

function barisDariKonfigurasi(cfg) {
  const sistem = (cfg.sistemUjian && cfg.sistemUjian.length ? cfg.sistemUjian : DEFAULT_SISTEM_UJIAN);
  const b = {
    tingkat: (cfg.tingkat || []).map((t) => [t.nama, t.label || '', t.labelArab || '', t.singkat || '', (t.kelas || []).join(', '), t.sistemUjian || '', ya(t.aktif)]),
    sistem: sistem.flatMap((s) => s.periode.map((p) => [s.id, s.label, p.kode, p.label])),
    mapel: (cfg.mapel || []).map((m) => [m.nama, (m.tingkat || []).join(', '), ya(m.aktif)]),
    kitab: (cfg.kitab || []).map((k) => [k.nama, k.namaArab || '', k.pengarang || '', k.pengarangArab || '', k.mapel || '', k.tautan || '', (k.tingkat || []).join(', '), ya(k.aktif)]),
    penempatan: [],
  };
  for (const k of cfg.kitab || []) {
    for (const p of k.penempatan || []) {
      if (!(p.periode || []).length) b.penempatan.push([k.nama, p.tingkat, p.kelas, '', '']);
      else for (const y of p.periode) b.penempatan.push([k.nama, p.tingkat, p.kelas, y.kode, y.cakupan || '']);
    }
  }
  return b;
}

/** Lembar kerja Excel. `cfg` diberikan -> berisi konfigurasi sekarang (untuk disunting lalu diimpor lagi); tanpa `cfg` -> template dengan baris contoh. */
export async function buatBerkas(cfg = null) {
  const { default: writeExcelFile } = await import('write-excel-file/universal');
  const b = cfg ? barisDariKonfigurasi(cfg) : BARIS_CONTOH;
  const nilai = (v) => (v === '' || v === undefined ? null : v);
  const bersih = (rows) => rows.map((r) => r.map(nilai));
  const sheets = [
    { sheet: LEMBAR.petunjuk, data: PETUNJUK.map((t, i) => [{ value: t || null, fontWeight: i === 0 ? 'bold' : undefined, wrap: true }]), columns: [{ width: 120 }] },
    lembar(LEMBAR.tingkat, KOLOM.tingkat, bersih(b.tingkat), [18, 24, 20, 12, 24, 16, 8]),
    lembar(LEMBAR.sistem, KOLOM.sistem, bersih(b.sistem), [18, 20, 16, 34]),
    lembar(LEMBAR.mapel, KOLOM.mapel, bersih(b.mapel), [28, 36, 8]),
    lembar(LEMBAR.kitab, KOLOM.kitab, bersih(b.kitab), [30, 30, 32, 32, 18, 36, 24, 8]),
    lembar(LEMBAR.penempatan, KOLOM.penempatan, bersih(b.penempatan), [30, 16, 10, 16, 30]),
  ];
  return writeExcelFile(sheets).toBlob();
}
export const buatTemplate = () => buatBerkas(null);
export const ekspor = (cfg) => buatBerkas(cfg);

/* ------------------------------------------------------------------ Membaca */

/** Satu lembar -> baris objek berkunci kolom ternormalisasi, beserta nomor baris Excel-nya. */
function bacaLembar(nama, data, galat) {
  const k = nama === LEMBAR.tingkat ? 'tingkat' : nama === LEMBAR.sistem ? 'sistem' : nama === LEMBAR.mapel ? 'mapel' : nama === LEMBAR.kitab ? 'kitab' : 'penempatan';
  if (!Array.isArray(data) || !data.length) return null;
  const kepala = data[0].map(kunciKolom);
  const hilang = WAJIB[k].filter((w) => !kepala.includes(w));
  if (hilang.length) {
    const asli = Object.fromEntries(KOLOM[k].map((c) => [kunciKolom(c), c]));
    galat.push(`Lembar "${nama}": kolom ${hilang.map((h) => `"${asli[h]}"`).join(', ')} tidak ditemukan di baris pertama.`);
    return null;
  }
  if (data.length - 1 > MAKS_BARIS) { galat.push(`Lembar "${nama}": maksimal ${MAKS_BARIS} baris.`); return null; }
  const baris = [];
  for (let i = 1; i < data.length; i++) {
    const sel = data[i] || [];
    const o = { _baris: i + 1 };
    kepala.forEach((h, j) => { if (h && !(h in o)) o[h] = sel[j]; });
    const isi = kepala.some((h) => h && teks(o[h]) !== '');
    if (!isi) continue;
    const pertama = sel.map(teks).find((x) => x !== '') || '';
    if (AWAL_CONTOH.test(pertama)) continue;
    baris.push(o);
  }
  return baris;
}

const potong = (v, maks, ket, baris, peringatan) => {
  if (v.length > maks) { peringatan.push(`${ket} baris ${baris}: lebih dari ${maks} karakter, akan dipotong saat disimpan.`); return v.slice(0, maks); }
  return v;
};

/**
 * Baca berkas .xlsx (Blob/ArrayBuffer). Mengembalikan { bagian, galat, peringatan, lembarDibaca }.
 * `galat` tidak kosong = jangan diterapkan. `bagian` hanya memuat lembar yang ada isinya.
 */
export async function bacaExcel(sumber) {
  const galat = []; const peringatan = []; const bagian = {}; const dibaca = [];
  const blob = sumber instanceof Blob ? sumber : new Blob([sumber]);
  if (blob.size > MAKS_BYTE) return { bagian, galat: ['Berkas terlalu besar (maksimal 5 MB).'], peringatan, lembarDibaca: dibaca };
  let lembars;
  try {
    const { default: readExcelFile } = await import('read-excel-file/universal');
    lembars = await readExcelFile(blob);
  } catch (e) {
    return { bagian, galat: ['Berkas tidak bisa dibaca. Pastikan formatnya .xlsx (bukan .xls atau .csv) dan tidak rusak.'], peringatan, lembarDibaca: dibaca };
  }
  const peta = new Map(lembars.map((l) => [String(l.sheet).trim().toLowerCase(), l.data]));
  const ambil = (nama) => { const d = peta.get(nama.toLowerCase()); return d ? bacaLembar(nama, d, galat) : null; };

  // Tingkat
  const rT = ambil(LEMBAR.tingkat);
  if (rT && rT.length) {
    const lihat = new Set(); const hasil = [];
    for (const r of rT) {
      const ket = `Lembar "Tingkat" baris ${r._baris}`;
      const nama = teks(r.kunci);
      if (!nama) { galat.push(`${ket}: Kunci kosong.`); continue; }
      if (nama.length > BATAS.tingkat) { galat.push(`${ket}: Kunci lebih dari ${BATAS.tingkat} karakter.`); continue; }
      if (lihat.has(nama.toLowerCase())) { galat.push(`${ket}: Kunci "${nama}" tercatat dua kali.`); continue; }
      lihat.add(nama.toLowerCase());
      const a = aktifDari(r.aktif); if (a.galat) { galat.push(`${ket}: ${a.galat}.`); continue; }
      const labelArab = teks(r.labelarab);
      if (labelArab && !HURUF_ARAB.test(labelArab)) { galat.push(`${ket}: Label Arab harus berhuruf Arab.`); continue; }
      const kelas = []; for (const x of daftar(r.kelas)) if (!kelas.some((y) => y.toLowerCase() === x.toLowerCase())) kelas.push(potong(x, BATAS.kelas, ket, r._baris, peringatan));
      if (kelas.length > BATAS.jmlKelas) { galat.push(`${ket}: kelas maksimal ${BATAS.jmlKelas} per tingkat.`); continue; }
      hasil.push({ nama, label: potong(teks(r.label), BATAS.tingkat, ket, r._baris, peringatan), labelArab: labelArab.normalize('NFKC'), singkat: potong(teks(r.singkatan), BATAS.singkat, ket, r._baris, peringatan), kelas, sistemUjian: teks(r.sistemujian).toLowerCase(), aktif: a.nilai });
    }
    bagian.tingkat = hasil; dibaca.push(LEMBAR.tingkat);
  }

  // Sistem ujian
  const rS = ambil(LEMBAR.sistem);
  if (rS && rS.length) {
    const urut = []; const peta2 = new Map(); const kodeSemua = new Map();
    for (const r of rS) {
      const ket = `Lembar "Sistem Ujian" baris ${r._baris}`;
      const id = teks(r.idsistem).toLowerCase(); const kode = teks(r.kodeperiode).toLowerCase();
      const labelS = teks(r.namasistem); const labelP = teks(r.namaperiode);
      if (!KODE_OK.test(id)) { galat.push(`${ket}: ID Sistem "${teks(r.idsistem)}" tidak valid (huruf kecil, angka, tanda hubung; maks. ${BATAS_UJIAN.kode} karakter).`); continue; }
      if (!KODE_OK.test(kode)) { galat.push(`${ket}: Kode Periode "${teks(r.kodeperiode)}" tidak valid (huruf kecil, angka, tanda hubung; maks. ${BATAS_UJIAN.kode} karakter).`); continue; }
      if (!labelP) { galat.push(`${ket}: Nama Periode kosong.`); continue; }
      if (kodeSemua.has(kode)) { galat.push(`${ket}: Kode Periode "${kode}" sudah dipakai di baris ${kodeSemua.get(kode)}. Setiap kode harus unik di seluruh lembar.`); continue; }
      kodeSemua.set(kode, r._baris);
      let s = peta2.get(id);
      if (!s) { if (!labelS) { galat.push(`${ket}: Nama Sistem kosong untuk ID "${id}".`); continue; } s = { id, label: potong(labelS, BATAS_UJIAN.labelSistem, ket, r._baris, peringatan), periode: [] }; peta2.set(id, s); urut.push(s); }
      if (s.periode.length >= BATAS_UJIAN.periode) { galat.push(`${ket}: sistem "${id}" maksimal ${BATAS_UJIAN.periode} periode.`); continue; }
      s.periode.push({ kode, label: potong(labelP, BATAS_UJIAN.labelPeriode, ket, r._baris, peringatan) });
    }
    if (urut.length > BATAS_UJIAN.sistem) galat.push(`Lembar "Sistem Ujian": maksimal ${BATAS_UJIAN.sistem} sistem.`);
    bagian.sistemUjian = urut; dibaca.push(LEMBAR.sistem);
  }

  // Mapel
  const rM = ambil(LEMBAR.mapel);
  if (rM && rM.length) {
    const lihat = new Set(); const hasil = [];
    for (const r of rM) {
      const ket = `Lembar "Mapel" baris ${r._baris}`;
      const nama = teks(r.nama);
      if (!nama) { galat.push(`${ket}: Nama kosong.`); continue; }
      if (lihat.has(nama.toLowerCase())) { galat.push(`${ket}: Mapel "${nama}" tercatat dua kali.`); continue; }
      lihat.add(nama.toLowerCase());
      const a = aktifDari(r.aktif); if (a.galat) { galat.push(`${ket}: ${a.galat}.`); continue; }
      hasil.push({ nama: potong(nama, BATAS.mapel, ket, r._baris, peringatan), tingkat: daftar(r.tingkat), aktif: a.nilai });
    }
    bagian.mapel = hasil; dibaca.push(LEMBAR.mapel);
  }

  // Kitab
  const rK = ambil(LEMBAR.kitab);
  if (rK && rK.length) {
    const lihat = new Set(); const hasil = [];
    for (const r of rK) {
      const ket = `Lembar "Kitab" baris ${r._baris}`;
      const nama = teks(r.nama);
      if (!nama) { galat.push(`${ket}: Nama kosong.`); continue; }
      if (lihat.has(nama.toLowerCase())) { galat.push(`${ket}: Kitab "${nama}" tercatat dua kali.`); continue; }
      lihat.add(nama.toLowerCase());
      const a = aktifDari(r.aktif); if (a.galat) { galat.push(`${ket}: ${a.galat}.`); continue; }
      const namaArab = teks(r.namaarab).normalize('NFKC'); const pengArab = teks(r.pengarangarab).normalize('NFKC');
      if (namaArab && !HURUF_ARAB.test(namaArab)) { galat.push(`${ket}: Nama Arab harus berhuruf Arab.`); continue; }
      if (pengArab && !HURUF_ARAB.test(pengArab)) { galat.push(`${ket}: Pengarang Arab harus berhuruf Arab.`); continue; }
      const tautan = teks(r.tautan);
      if (tautan && !/^(https:\/\/|[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$))/i.test(tautan)) peringatan.push(`${ket}: Tautan tampak bukan alamat situs; akan dikosongkan saat disimpan.`);
      hasil.push({
        nama: potong(nama, BATAS.kitab, ket, r._baris, peringatan), namaArab, pengarang: potong(teks(r.pengarang), BATAS.pengarang, ket, r._baris, peringatan), pengarangArab: pengArab,
        mapel: potong(teks(r.mapel), BATAS.mapel, ket, r._baris, peringatan), tautan: potong(tautan, BATAS.tautan, ket, r._baris, peringatan), tingkat: daftar(r.tingkat), aktif: a.nilai,
      });
    }
    bagian.kitab = hasil; dibaca.push(LEMBAR.kitab);
  }

  // Penempatan: { kitab(lowercase) -> [{ tingkat, kelas, periode:[{kode,cakupan}] }] }
  const rP = ambil(LEMBAR.penempatan);
  if (rP && rP.length) {
    const peta3 = new Map();
    for (const r of rP) {
      const ket = `Lembar "Penempatan" baris ${r._baris}`;
      const kitab = teks(r.kitab); const tingkat = teks(r.tingkat); const kelas = teks(r.kelas);
      if (!kitab || !tingkat || !kelas) { galat.push(`${ket}: Kitab, Tingkat, dan Kelas wajib diisi.`); continue; }
      const kode = teks(r.kodeperiode).toLowerCase();
      if (kode && !KODE_OK.test(kode)) { galat.push(`${ket}: Kode Periode "${kode}" tidak valid.`); continue; }
      const kk = kitab.toLowerCase();
      const daftarK = peta3.get(kk) || { nama: kitab, baris: [] }; peta3.set(kk, daftarK);
      let p = daftarK.baris.find((x) => x.tingkat.toLowerCase() === tingkat.toLowerCase() && x.kelas.toLowerCase() === kelas.toLowerCase());
      if (!p) { p = { tingkat, kelas, periode: [], semua: false, _baris: r._baris }; daftarK.baris.push(p); }
      if (!kode) p.semua = true;
      else if (!p.periode.some((y) => y.kode === kode)) p.periode.push({ kode, cakupan: potong(teks(r.cakupan), BATAS_UJIAN.cakupan, ket, r._baris, peringatan) });
    }
    for (const dk of peta3.values()) for (const p of dk.baris) {
      if (p.semua && p.periode.length) peringatan.push(`Lembar "Penempatan": ${dk.nama} / ${p.tingkat} ${p.kelas} punya baris tanpa kode periode sekaligus baris dengan kode. Yang dipakai hanya periode yang tertulis.`);
    }
    bagian.penempatan = peta3; dibaca.push(LEMBAR.penempatan);
  }

  if (!dibaca.length && !galat.length) galat.push('Tidak ada lembar yang dikenali atau semua lembar kosong. Pakai template dari tombol Unduh template.');
  return { bagian, galat, peringatan, lembarDibaca: dibaca };
}

/* ---------------------------------------------------------------- Menggabung */

const ciSama = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

/**
 * Terapkan hasil bacaExcel ke konfigurasi bentuk server (`cfg` dari susun()). mode: 'gabung' | 'ganti'.
 * Mengembalikan { config, ringkasan[], peringatan[] }. Tidak mengubah `cfg`. Validasi akhir tetap di server saat Simpan.
 */
export function gabungkan(cfg, bagian, mode = 'gabung') {
  const out = salin(cfg); const ringkasan = []; const peringatan = [];
  const ganti = mode === 'ganti';
  const hitung = (nama, lama, baru) => {
    const n = baru.length; const diperbarui = baru.filter((b) => lama.some((l) => ciSama(l, b))).length;
    return `${nama}: ${n} baris (${diperbarui} memperbarui yang ada, ${n - diperbarui} baru)${ganti ? '; daftar lama diganti seluruhnya' : ''}.`;
  };

  if (bagian.sistemUjian) {
    const lama = out.sistemUjian || [];
    ringkasan.push(hitung('Sistem Ujian', lama.map((s) => s.id), bagian.sistemUjian.map((s) => s.id)));
    if (ganti) out.sistemUjian = salin(bagian.sistemUjian);
    else { const l = [...lama]; for (const s of salin(bagian.sistemUjian)) { const i = l.findIndex((x) => ciSama(x.id, s.id)); if (i >= 0) l[i] = s; else l.push(s); } out.sistemUjian = l; }
  }
  const idSistem = (out.sistemUjian && out.sistemUjian.length ? out.sistemUjian : DEFAULT_SISTEM_UJIAN).map((s) => s.id);

  if (bagian.tingkat) {
    const lama = out.tingkat || [];
    ringkasan.push(hitung('Tingkat', lama.map((t) => t.nama), bagian.tingkat.map((t) => t.nama)));
    const baru = bagian.tingkat.map((t) => {
      const ada = lama.find((x) => ciSama(x.nama, t.nama));
      const nama = ada ? ada.nama : t.nama; // kunci yang sudah ada tidak berubah huruf besar-kecilnya
      let sis = t.sistemUjian || (ada && ada.sistemUjian) || idSistem[0];
      if (!idSistem.includes(sis)) { peringatan.push(`Tingkat "${nama}": sistem ujian "${sis}" tidak ada; dipakai "${idSistem[0]}".`); sis = idSistem[0]; }
      return { nama, label: t.label || (ada && ada.label) || nama, labelArab: t.labelArab, singkat: t.singkat || (ada && ada.singkat) || '', kelas: t.kelas, sistemUjian: sis, aktif: t.aktif };
    });
    if (ganti) out.tingkat = baru;
    else { const l = [...lama]; for (const t of baru) { const i = l.findIndex((x) => ciSama(x.nama, t.nama)); if (i >= 0) l[i] = t; else l.push(t); } out.tingkat = l; }
    const hapus = lama.filter((l) => !out.tingkat.some((t) => t.nama === l.nama)).map((l) => l.nama);
    if (hapus.length) peringatan.push(`Tingkat ${hapus.map((h) => `"${h}"`).join(', ')} dihapus dari daftar. Soal lama tetap tersimpan, tetapi tingkat itu tidak bisa difilter lagi. Menonaktifkan biasanya lebih aman.`);
  }
  const namaTingkat = (out.tingkat || []).map((t) => t.nama);
  const cocokkanTingkat = (daftarNama, ket) => {
    const hasil = [];
    for (const n of daftarNama) {
      const t = namaTingkat.find((x) => ciSama(x, n));
      if (!t) { peringatan.push(`${ket}: tingkat "${n}" tidak ada di daftar Tingkat; dilewati.`); continue; }
      if (!hasil.includes(t)) hasil.push(t);
    }
    return daftarNama.length ? hasil : [...namaTingkat];
  };

  if (bagian.mapel) {
    const lama = out.mapel || [];
    ringkasan.push(hitung('Mapel', lama.map((m) => m.nama), bagian.mapel.map((m) => m.nama)));
    const baru = bagian.mapel.map((m) => ({ nama: m.nama, tingkat: cocokkanTingkat(m.tingkat, `Mapel "${m.nama}"`), aktif: m.aktif }));
    if (ganti) out.mapel = baru;
    else { const l = [...lama]; for (const m of baru) { const i = l.findIndex((x) => ciSama(x.nama, m.nama)); if (i >= 0) l[i] = m; else l.push(m); } out.mapel = l; }
  }

  if (bagian.kitab) {
    const lama = out.kitab || [];
    ringkasan.push(hitung('Kitab', lama.map((k) => k.nama), bagian.kitab.map((k) => k.nama)));
    const baru = bagian.kitab.map((k) => {
      const ada = lama.find((x) => ciSama(x.nama, k.nama));
      return { nama: ada ? ada.nama : k.nama, namaArab: k.namaArab, pengarang: k.pengarang, pengarangArab: k.pengarangArab, mapel: k.mapel, tautan: k.tautan, tingkat: cocokkanTingkat(k.tingkat, `Kitab "${k.nama}"`), penempatan: ada ? ada.penempatan || [] : [], aktif: k.aktif };
    });
    if (ganti) out.kitab = baru;
    else { const l = [...lama]; for (const k of baru) { const i = l.findIndex((x) => ciSama(x.nama, k.nama)); if (i >= 0) l[i] = k; else l.push(k); } out.kitab = l; }
  }

  if (bagian.penempatan) {
    let dipasang = 0;
    for (const [kk, dk] of bagian.penempatan) {
      const kitab = (out.kitab || []).find((k) => ciSama(k.nama, kk));
      if (!kitab) { peringatan.push(`Penempatan: kitab "${dk.nama}" tidak ada di daftar Kitab; barisnya dilewati.`); continue; }
      const pen = [];
      for (const p of dk.baris) {
        const ket = `Penempatan "${kitab.nama}" / ${p.tingkat} ${p.kelas}`;
        const t = (out.tingkat || []).find((x) => ciSama(x.nama, p.tingkat));
        if (!t) { peringatan.push(`${ket}: tingkat tidak ada; dilewati.`); continue; }
        if (!kitab.tingkat.includes(t.nama)) { peringatan.push(`${ket}: kitab ini tidak dipakai di tingkat ${t.nama} (kolom Tingkat pada lembar Kitab); dilewati.`); continue; }
        const kelas = (t.kelas || []).find((x) => ciSama(x, p.kelas));
        if (!kelas) { peringatan.push(`${ket}: kelas tidak ada pada tingkat ${t.nama}; dilewati.`); continue; }
        const sis = (out.sistemUjian && out.sistemUjian.length ? out.sistemUjian : DEFAULT_SISTEM_UJIAN).find((s) => s.id === t.sistemUjian) || DEFAULT_SISTEM_UJIAN[0];
        const kodeSah = sis.periode.map((y) => y.kode);
        const periode = [];
        for (const y of p.periode) {
          if (!kodeSah.includes(y.kode)) { peringatan.push(`${ket}: kode periode "${y.kode}" bukan bagian dari sistem ${sis.label}; dilewati.`); continue; }
          periode.push({ kode: y.kode, cakupan: y.cakupan });
        }
        if (p.periode.length && !periode.length) continue; // semua kodenya salah: jangan diam-diam menjadi "semua periode"
        const semua = periode.length ? periode : kodeSah.map((kode) => ({ kode, cakupan: '' }));
        pen.push({ tingkat: t.nama, kelas, periode: semua });
      }
      kitab.penempatan = pen; dipasang++;
    }
    ringkasan.push(`Penempatan: ${dipasang} kitab diatur ulang penempatannya.`);
  }

  if (bagian.kitab && (out.mapel || []).length) {
    const namaM = new Set(out.mapel.map((m) => m.nama.toLowerCase()));
    const asing = [...new Set(bagian.kitab.map((k) => k.mapel).filter((m) => m && !namaM.has(m.toLowerCase())))];
    if (asing.length) peringatan.push(`Mapel pada lembar Kitab yang tidak ada di daftar Mapel: ${asing.slice(0, 8).map((m) => `"${m}"`).join(', ')}${asing.length > 8 ? ', ...' : ''}. Kitab tetap diimpor, tetapi tambahkan mapelnya agar muncul di pilihan.`);
  }
  return { config: out, ringkasan, peringatan };
}
