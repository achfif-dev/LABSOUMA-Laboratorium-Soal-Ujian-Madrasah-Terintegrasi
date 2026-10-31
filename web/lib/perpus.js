// Pemilih kitab/bab/halaman dari perpustakaan (tanpa React): pencocokan katalog, pemotongan matn/syarah, penggabungan teks dan nomor halaman,
// serta pemuat halaman dengan simpanan memori. Server: src/kitabBaca.js. Layar: web/PemilihKitab.jsx.
export const MAKS_TEKS_SOAL = 6000; // batas teks per soal (Penyusunan Soal)
export const MAKS_HAL_FORM = 20;    // panjang kolom hal di aturan Firestore
export const MAKS_BAB_FORM = 120;
export const MAKS_NAMA_FORM = 120;
const JENDELA = 5;                  // halaman yang diambil sekaligus agar pindah halaman terasa cepat

const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');

/** Nama kitab untuk form: bila katalog Konfigurasi punya kitab yang sama (abaikan huruf besar, apostrof, spasi), pakai ejaan katalog supaya cakupan materinya berlaku. */
export function namaUntukForm(judulLatin, katalog = []) {
  const n = norm(judulLatin);
  const k = n ? katalog.find((x) => norm(x.nama) === n) : null;
  return String((k ? k.nama : judulLatin) || '').slice(0, MAKS_NAMA_FORM);
}

export const labelEntri = (e) => `${'– '.repeat(Math.max(0, (e.level || 1) - 1))}${e.judul}${e.hal ? ` (hal. ${e.hal})` : ''}`;

/** Bagian halaman: 'semua' | 'matn' | 'syarah'. Bila batas matn tidak diketahui, selalu seluruh teks. */
export function bagianTeks(p, bagian = 'semua') {
  if (bagian === 'semua' || p.batasMatn === null || p.batasMatn === undefined) return p.teks;
  return bagian === 'matn' ? p.teks.slice(0, p.batasMatn).trim() : p.teks.slice(p.batasMatn).trim();
}

export const gabungTeks = (halaman, bagian = 'semua') => halaman.map((p) => bagianTeks(p, bagian)).filter(Boolean).join('\n');

/** "31", "31-33", atau '' dari nomor-nomor cetak (nomor cetak tidak selalu menaik, jadi ambil terkecil sampai terbesar). */
export function rentangHal(...daftar) {
  const n = daftar.flatMap((x) => String(x ?? '').match(/\d+/g) || []).map(Number);
  if (!n.length) return '';
  const a = Math.min(...n); const b = Math.max(...n);
  return (a === b ? String(a) : `${a}-${b}`).slice(0, MAKS_HAL_FORM);
}

/**
 * Isian Rujukan Kitab dari halaman terpilih.
 * @param {{kitab:object, halaman:object[], bagian?:string, babNama?:string, katalog?:object[], tambah?:boolean, sekarang?:{nama?:string,juz?:string,hal?:string,bab?:string,teks?:string}}} a
 * @returns {{nama:string, juz:string, hal:string, bab:string, teks:string, panjang:number}}
 */
export function isianRujukan({ kitab, halaman, bagian = 'semua', babNama = '', katalog = [], tambah = false, sekarang = {} }) {
  const baru = gabungTeks(halaman, bagian);
  const teks = tambah && String(sekarang.teks || '').trim() ? `${String(sekarang.teks).trim()}\n${baru}` : baru;
  const babHalaman = babNama || (halaman.find((p) => p.bab) || {}).bab || '';
  return {
    nama: namaUntukForm(kitab.judulLatin, katalog),
    juz: String(halaman[0].juz),
    hal: rentangHal(tambah ? sekarang.hal : '', ...halaman.map((p) => p.hal)),
    bab: (tambah && sekarang.bab ? sekarang.bab : babHalaman).slice(0, MAKS_BAB_FORM),
    teks, panjang: teks.length,
  };
}

/** Rentang urutan halaman suatu entri daftar isi: dari seq-nya sampai sebelum judul berikutnya yang setingkat atau lebih tinggi. */
export function rentangBab(entri, i, jumlahHalaman) {
  const e = entri[i]; if (!e) return null;
  const j = entri.findIndex((x, k) => k > i && x.level <= e.level && x.seq > e.seq);
  return { awal: e.seq, akhir: j < 0 ? jumlahHalaman : Math.max(e.seq, entri[j].seq - 1) };
}

/**
 * Pemuat dengan simpanan memori. `panggil(body)` = callApi('/api/kitab', body). Satu instans per layar sudah cukup;
 * `simpanan` bisa dibagi antarinstans (daftar kitab dan daftar isi tidak berubah selama sesi, kecuali admin mengimpor ulang).
 */
export function buatPemuat(panggil, simpanan = { daftar: null, isi: new Map(), halaman: new Map() }) {
  const kunci = (id, seq) => `${id}:${seq}`;
  return {
    simpanan,
    async daftar(paksa = false) {
      if (!simpanan.daftar || paksa) simpanan.daftar = (await panggil({ aksi: 'perpus-daftar' })).kitab;
      return simpanan.daftar;
    },
    async isi(kitabId) {
      if (!simpanan.isi.has(kitabId)) simpanan.isi.set(kitabId, await panggil({ aksi: 'perpus-isi', kitabId }));
      return simpanan.isi.get(kitabId);
    },
    /** Halaman dari urutan `dari` sampai `sampai` (inklusif). Yang belum ada di simpanan diambil dalam satu panggilan. */
    async halaman(kitabId, dari, sampai = dari, jumlahHalaman = Infinity) {
      const akhir = Math.min(sampai, jumlahHalaman);
      const perlu = []; for (let s = dari; s <= akhir; s++) if (!simpanan.halaman.has(kunci(kitabId, s))) perlu.push(s);
      if (perlu.length) {
        const awal = perlu[0]; const ujung = Math.min(Math.max(perlu[perlu.length - 1], awal + JENDELA - 1), jumlahHalaman, awal + 9);
        const r = await panggil({ aksi: 'perpus-halaman', kitabId, dariSeq: awal, sampaiSeq: ujung });
        for (const p of r.halaman) simpanan.halaman.set(kunci(kitabId, p.seq), p);
      }
      const hasil = []; for (let s = dari; s <= akhir; s++) { const p = simpanan.halaman.get(kunci(kitabId, s)); if (p) hasil.push(p); }
      return hasil;
    },
    /** Pencarian teks di satu kitab (server: src/kitabCari.js). Hasil `{ siap:false, kemajuan }` berarti indeks kitab lama sedang dibangun: panggil lagi. */
    cari(kitabId, { q, mode = 'frasa', lewati = 0 }) { return panggil({ aksi: 'perpus-cari', kitabId, q, mode, lewati }); },
    async cariHal(kitabId, hal) {
      const r = await panggil({ aksi: 'perpus-halaman', kitabId, hal });
      for (const p of r.halaman) simpanan.halaman.set(kunci(kitabId, p.seq), p);
      return r.halaman;
    },
  };
}
