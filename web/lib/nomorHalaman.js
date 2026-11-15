// Penyesuaian nomor halaman cetak kitab (tanpa React; dipakai server src/kitabNomor.js dan layar web/PenyuntingNomor.jsx, jadi aturannya satu sumber).
// Masalah yang dijawab: nomor `hal` hasil impor mengikuti cetakan lain (ekspor Syamilah) atau hanya dibagi otomatis (halamanVirtual), sedangkan
// kitab yang dipegang madrasah cetakan berbeda. Editor dan admin menyesuaikan `hal` (dan `juz`) supaya "Hal. N" di aplikasi sama dengan kitab di tangan.
//
// Tiga cara (semuanya bekerja pada rentang urutan `seq`, bukan pada nomor cetak, karena nomor cetak tidak unik):
//   satu  : satu halaman cetak diberi nomor `hal`
//   geser : seluruh nomor di rentang ditambah `selisih` (mis. +30 bila kitab cetak mulai hal. 31 sedangkan di sini hal. 1); nomor kembar/mundur asli tetap
//   urut  : rentang dinomori ulang berurutan mulai `mulai` (memperbaiki nomor kembar, mundur, dan lompat)
// `pulih` dan `tetap` dipakai server untuk mengembalikan nomor dari riwayat (tidak diterima langsung dari klien).
// Halaman cetak yang terlalu panjang dibagi beberapa bagian (`potongan {ke, dari}`; seq berbeda, `hal` sama): bagian ke-2 dan seterusnya
// selalu ikut bagian pertamanya, jadi satu halaman cetak tidak pernah terbelah menjadi dua nomor.

export const MAKS_NOMOR_PER_PANGGILAN = 250; // halaman per proses; menjaga satu transaksi Firestore (maks 500 penulisan), batas waktu fungsi Vercel Hobby (10 detik), dan kuota tulis Spark
export const MAKS_HAL_NOMOR = 99999;         // sama dengan batas `hal` saat impor (src/kitabImpor.js)
export const MAKS_JUZ_NOMOR = 99;
export const MAKS_CATATAN_NOMOR = 300;
export const LUAS_TEPI = 12;                 // halaman yang dibaca setelah rentang untuk menyertakan bagian halaman cetak yang terbelah
export const JENIS_NOMOR = ['satu', 'geser', 'urut'];
export const LABEL_JENIS_NOMOR = { satu: 'satu halaman', geser: 'geser nomor', urut: 'urutkan nomor', pulih: 'pemulihan', tetap: 'pemulihan' };
export const RE_ID_OP = /^[A-Za-z0-9_-]{8,40}$/;
export const RE_ID_RIWAYAT_NOMOR = /^\d{10,20}_[a-z0-9]{1,8}$/;

const bulat = (v, min, maks) => Number.isInteger(v) && v >= min && v <= maks;
const bagianLanjut = (p) => !!(p && p.potongan && p.potongan.ke > 1);

/**
 * Masukan klien -> { op } yang sudah bersih, atau { galat } berisi pesan untuk pemakai.
 * @param {object} b  { jenis, dari, sampai?, hal?, selisih?, mulai?, juz? }
 */
export function periksaOp(b, jumlahHalaman) {
  if (!b || typeof b !== 'object') return { galat: 'Permintaan tidak valid.' };
  if (!JENIS_NOMOR.includes(b.jenis)) return { galat: 'Cara penyesuaian harus "satu", "geser", atau "urut".' };
  if (!bulat(b.dari, 1, jumlahHalaman)) return { galat: `Urutan awal harus bilangan bulat 1-${jumlahHalaman}.` };
  const sampai = b.sampai === undefined ? b.dari : b.sampai;
  if (!bulat(sampai, b.dari, jumlahHalaman)) return { galat: `Urutan akhir harus bilangan bulat ${b.dari}-${jumlahHalaman}.` };
  if (sampai - b.dari + 1 > MAKS_NOMOR_PER_PANGGILAN) return { galat: `Maksimal ${MAKS_NOMOR_PER_PANGGILAN} halaman per proses. Kerjakan bagian berikutnya sebagai proses terpisah.` };
  if (b.jenis === 'satu' && sampai !== b.dari) return { galat: 'Cara "satu halaman" hanya untuk satu urutan.' };
  const op = { jenis: b.jenis, dari: b.dari, sampai };
  if (b.juz !== undefined && b.juz !== null) {
    if (!bulat(b.juz, 1, MAKS_JUZ_NOMOR)) return { galat: `Juz harus bilangan bulat 1-${MAKS_JUZ_NOMOR}.` };
    op.juz = b.juz;
  }
  if (b.jenis === 'satu') {
    if (!bulat(b.hal, 0, MAKS_HAL_NOMOR)) return { galat: `Nomor halaman harus bilangan bulat 0-${MAKS_HAL_NOMOR}.` };
    op.hal = b.hal;
  } else if (b.jenis === 'geser') {
    if (!bulat(b.selisih, -MAKS_HAL_NOMOR, MAKS_HAL_NOMOR) || b.selisih === 0) return { galat: 'Selisih harus bilangan bulat selain 0.' };
    op.selisih = b.selisih;
  } else {
    if (!bulat(b.mulai, 0, MAKS_HAL_NOMOR)) return { galat: `Nomor awal harus bilangan bulat 0-${MAKS_HAL_NOMOR}.` };
    op.mulai = b.mulai;
  }
  return { op };
}

/** Jenis anomali nomor sebuah halaman terhadap halaman sebelumnya, atau null. Aturan sama dengan impor, kecuali pergantian juz (awal jilid boleh mulai lagi dari kecil). */
export function anomaliNomor(h, prev) {
  if (!prev || bagianLanjut(h) || h.hal === null || h.hal === undefined) return null;
  if (h.juz !== prev.juz) return null;
  if (h.hal === prev.hal) return 'duplikat';
  if (h.hal < prev.hal) return 'mundur';
  if (h.hal > prev.hal + 1) return 'lompat';
  return null;
}

/**
 * Menghitung nomor baru. `halaman` = halaman yang terbaca (urutan naik) dan HARUS memuat seq dari-1 (bila ada) sampai sampai+LUAS_TEPI (bila ada).
 * @returns {{galat:string}|{ubah:object[], akhir:number, jumlahLabel:number, halTerakhir:number|null}}
 *   `ubah` = halaman yang berubah (nomor, juz, atau tanda anomali) beserta nilai lamanya; `akhir` = urutan terakhir yang ikut (bagian terbelah disertakan);
 *   `jumlahLabel` = berapa halaman yang nomor/juz-nya berubah; `halTerakhir` = nomor cetak halaman terakhir di rentang setelah perubahan.
 */
export function hitungNomor(halaman, op) {
  const peta = new Map(halaman.map((h) => [h.seq, h]));
  let dari = op.dari; let akhir = op.sampai;
  if (op.jenis === 'tetap') {
    const seqs = op.tetapan.map((t) => t[0]);
    dari = Math.min(...seqs); akhir = Math.max(...seqs);
  }
  for (let s = dari; s <= akhir; s++) if (!peta.has(s)) return { galat: `Halaman urutan ${s} tidak ditemukan.` };
  if (op.jenis !== 'tetap') {
    if (bagianLanjut(peta.get(dari))) {
      const p = peta.get(dari).potongan;
      return { galat: `Urutan ${dari} adalah bagian ke-${p.ke} dari satu halaman cetak yang dibagi. Mulailah dari bagian pertamanya (urutan ${dari - p.ke + 1}).` };
    }
    while (bagianLanjut(peta.get(akhir + 1))) akhir++; // bagian terbelah ikut halaman cetaknya
  }

  const baru = new Map(); // seq -> { hal, juz }
  const sasaran = []; for (let s = dari; s <= akhir; s++) sasaran.push(peta.get(s));
  if (op.jenis === 'tetap') {
    for (const [s, hal, juz] of op.tetapan) baru.set(s, { hal, juz });
  } else {
    let sekarang = op.jenis === 'urut' ? op.mulai : 0;
    sasaran.forEach((h, i) => {
      let hal;
      if (op.jenis === 'satu') hal = op.hal;
      else if (op.jenis === 'geser') hal = h.hal + op.selisih;
      else { if (i > 0 && !bagianLanjut(h)) sekarang++; hal = sekarang; }
      baru.set(h.seq, { hal, juz: op.juz !== undefined ? op.juz : h.juz });
    });
    for (const [s, v] of baru) if (!bulat(v.hal, 0, MAKS_HAL_NOMOR)) return { galat: `Hasilnya melewati batas nomor halaman (0-${MAKS_HAL_NOMOR}) pada urutan ${s}: nomor ${v.hal}.` };
  }

  const nilai = (h) => (baru.has(h.seq) ? { ...h, ...baru.get(h.seq) } : h);
  const ubah = []; let jumlahLabel = 0;
  const cek = (h, prev) => {
    const n = nilai(h); const a = anomaliNomor(n, prev ? nilai(prev) : null);
    const labelBerubah = n.hal !== h.hal || n.juz !== h.juz;
    if (!labelBerubah && (a || null) === (h.nomorAnomali || null)) return;
    if (labelBerubah) jumlahLabel++;
    ubah.push({ seq: h.seq, hal: n.hal, juz: n.juz, nomorAnomali: a, halLama: h.hal, juzLama: h.juz, anomaliLama: h.nomorAnomali || null, labelBerubah });
  };
  for (let s = dari; s <= akhir; s++) cek(peta.get(s), peta.get(s - 1));
  if (peta.has(akhir + 1)) cek(peta.get(akhir + 1), peta.get(akhir)); // halaman sesudah rentang: hubungannya dengan halaman terakhir ikut berubah
  const terakhir = nilai(peta.get(akhir));
  return { ubah, akhir, jumlahLabel, halTerakhir: terakhir.hal };
}

/** Rentang seq yang harus dibaca server untuk sebuah masukan: dari-1 sampai sampai+LUAS_TEPI (dipotong ke batas kitab). */
export const jendelaBaca = (dari, sampai, jumlahHalaman) => ({ dari: Math.max(1, dari - 1), sampai: Math.min(jumlahHalaman, sampai + LUAS_TEPI) });

/** Perkiraan untuk pratinjau di layar (tanpa membaca seluruh rentang): halaman pertama dan terakhir bila hanya ada dua titik itu. */
export function pratinjauKasar(op, awal, akhir) {
  if (!awal) return null;
  if (op.jenis === 'satu') return { awal: op.hal, akhir: op.hal };
  if (op.jenis === 'geser') return { awal: awal.hal + op.selisih, akhir: akhir ? akhir.hal + op.selisih : null };
  return { awal: op.mulai, akhir: null }; // urut: halaman terakhir bergantung pada bagian halaman yang terbelah; dihitung server
}

/**
 * Menempelkan hasil server ke simpanan klien (halaman dan daftar isi yang sudah dibaca), supaya pembaca dan pemilih kitab langsung memakai nomor baru
 * tanpa membaca ulang. `halaman` = [{ seq, hal, juz, nomorAnomali }]. `kunci(kitabId, seq)` = kunci simpanan halaman (web/lib/perpus.js).
 */
export function tempelNomor(simpanan, kitabId, halaman, kunci) {
  const baru = new Map(halaman.map((h) => [h.seq, h]));
  for (const h of halaman) {
    const k = kunci(kitabId, h.seq); const lama = simpanan.halaman.get(k);
    if (!lama) continue;
    const { nomorAnomali, ...tanpa } = lama;
    simpanan.halaman.set(k, { ...tanpa, hal: h.hal, juz: h.juz, ...(h.nomorAnomali ? { nomorAnomali: h.nomorAnomali } : {}) });
  }
  const isi = simpanan.isi.get(kitabId);
  if (isi && Array.isArray(isi.entri)) simpanan.isi.set(kitabId, { ...isi, entri: isi.entri.map((e) => (baru.has(e.seq) ? { ...e, hal: baru.get(e.seq).hal, juz: baru.get(e.seq).juz } : e)) });
}
