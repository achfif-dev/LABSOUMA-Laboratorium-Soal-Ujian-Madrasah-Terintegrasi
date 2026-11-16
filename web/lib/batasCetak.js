// Batas halaman cetak di dalam teks kitab (tanpa React; dipakai server src/kitabBatas.js dan layar web/PenandaBatasCetak.jsx, jadi aturannya satu sumber).
// Masalah yang dijawab: jumlah teks per halaman digital tidak sama dengan per halaman cetak (ada yang banyak, ada yang sedikit), jadi menggeser nomor tidak cukup.
// Penyunting menandai KALIMAT tempat tiap halaman cetak dimulai; halaman cetak itu berlanjut sampai tanda berikutnya. Tanda disimpan sebagai draf (tidak mengubah kitab),
// lalu "Terapkan" menyusun ulang halaman: satu halaman digital = satu halaman cetak.
//
// Tanda = { seq, off, hal, juz?, awal }: halaman cetak `hal` mulai pada karakter ke-`off` teks halaman digital `seq`; `awal` = beberapa huruf pertama di sana
// (penjaga: bila teks halaman itu dikoreksi sesudah penandaan dan posisinya bergeser, penerapan berhenti dengan pesan yang jelas, bukan memotong di tempat yang salah).
// Aturan penyusunan (tanda diurutkan menurut seq lalu off):
//   - halaman digital sebelum tanda pertama disalin apa adanya; teks sebelum tanda pertama pada halamannya sendiri menjadi satu halaman (nomor aslinya);
//   - dari tanda pertama sampai tanda terakhir, batas halaman digital HILANG: teks mengalir, dipotong hanya di tanda;
//   - tanda terakhir berlaku sampai akhir halaman digitalnya; halaman digital sesudahnya disalin apa adanya. Tandai juga awal halaman cetak berikutnya bila ingin menutupnya.
// Halaman hasil potongan tidak memisahkan matn dan syarah (`batasMatn: null`); halaman yang disalin tetap utuh.
import { anomaliNomor, MAKS_HAL_NOMOR, MAKS_JUZ_NOMOR } from './nomorHalaman.js';

export const MAKS_TEKS_HALAMAN_CETAK = 12000; // sama dengan MAKS_TEKS_HALAMAN (src/kitabImpor.js)

export const MAKS_TANDA = 6000;
export const MAKS_AWAL_TANDA = 16;
export const MAKS_HALAMAN_HASIL = 5000;   // sama dengan MAKS_HALAMAN_KITAB (src/kitabImpor.js)
export const TEKS_PANJANG = 6000;          // di atas ini teks satu halaman tidak muat dalam satu soal (batas Penyusunan Soal): hanya peringatan

const AKHIR_KALIMAT = /[.!?؟۔…؛]/;
const bulat = (v, min, maks) => Number.isInteger(v) && v >= min && v <= maks;
const rapat = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/** Teks satu halaman -> baris yang bisa diketuk: tiap baris, dipecah lagi sesudah tanda akhir kalimat. `mulai` = posisi karakter pertama baris di teks asli. */
export function barisKalimat(teks) {
  const t = String(teks ?? ''); const hasil = [];
  let i = 0;
  while (i < t.length) {
    while (i < t.length && /\s/.test(t[i])) i++;
    if (i >= t.length) break;
    let j = i;
    while (j < t.length && t[j] !== '\n') {
      j++;
      if (AKHIR_KALIMAT.test(t[j - 1]) && (j >= t.length || /\s/.test(t[j]))) break;
    }
    hasil.push({ mulai: i, teks: t.slice(i, j).trim() });
    i = j;
  }
  return hasil;
}

/** Penjaga posisi: `awal` yang disimpan untuk teks yang ada di posisi `off`. */
export const awalDi = (teks, off) => rapat(String(teks ?? '').slice(off, off + MAKS_AWAL_TANDA * 3)).slice(0, MAKS_AWAL_TANDA);
export const cocokAwal = (teks, off, awal) => !awal || rapat(String(teks ?? '').slice(off, off + MAKS_AWAL_TANDA * 3)).startsWith(awal);

/**
 * Masukan klien -> { tanda } bersih dan terurut, atau { galat }.
 * @param {object[]} daftar [{ seq, off, hal, juz?, awal? }]
 */
export function periksaTanda(daftar, jumlahHalaman) {
  if (!Array.isArray(daftar)) return { galat: 'Daftar tanda harus berupa larik.' };
  if (daftar.length > MAKS_TANDA) return { galat: `Terlalu banyak tanda (maksimal ${MAKS_TANDA}).` };
  const tanda = [];
  for (const [i, x] of daftar.entries()) {
    if (!x || typeof x !== 'object') return { galat: `Tanda ke-${i + 1} tidak valid.` };
    if (!bulat(x.seq, 1, jumlahHalaman)) return { galat: `Tanda ke-${i + 1}: urutan halaman harus 1-${jumlahHalaman}.` };
    if (!bulat(x.off, 0, MAKS_TEKS_HALAMAN_CETAK)) return { galat: `Tanda ke-${i + 1}: posisi teks tidak valid.` };
    if (!bulat(x.hal, 0, MAKS_HAL_NOMOR)) return { galat: `Tanda ke-${i + 1}: nomor halaman cetak harus 0-${MAKS_HAL_NOMOR}.` };
    if (x.juz !== undefined && x.juz !== null && !bulat(x.juz, 1, MAKS_JUZ_NOMOR)) return { galat: `Tanda ke-${i + 1}: juz harus 1-${MAKS_JUZ_NOMOR}.` };
    if (x.awal !== undefined && typeof x.awal !== 'string') return { galat: `Tanda ke-${i + 1}: penjaga posisi harus berupa teks.` };
    tanda.push({ seq: x.seq, off: x.off, hal: x.hal, ...(x.juz ? { juz: x.juz } : {}), awal: rapat(x.awal).slice(0, MAKS_AWAL_TANDA) });
  }
  tanda.sort((a, b) => a.seq - b.seq || a.off - b.off);
  for (let i = 1; i < tanda.length; i++) if (tanda[i].seq === tanda[i - 1].seq && tanda[i].off === tanda[i - 1].off) return { galat: `Dua tanda di posisi yang sama (urutan ${tanda[i].seq}).` };
  return { tanda };
}

/**
 * Rencana halaman hasil, urut. Setiap butir: { j:'salin', seq, n } (n halaman digital berturut-turut disalin apa adanya)
 *  atau { j:'potong', dari:[seq,off], sampai:[seq,off|null], hal, juz, awal } (`sampai` off null = akhir halaman digital itu; hal/juz null = ikut halaman asal).
 * @returns {{rencana:object[], jumlah:number}|{galat:string}}
 */
export function rencanaBatas(tanda, jumlahHalaman) {
  if (!tanda.length) return { galat: 'Belum ada tanda batas halaman cetak.' };
  const rencana = []; let jumlah = 0;
  const salin = (seq, n) => { if (n > 0) { rencana.push({ j: 'salin', seq, n }); jumlah += n; } };
  const potong = (dari, sampai, hal, juz, awal) => { rencana.push({ j: 'potong', dari, sampai, hal, juz, awal: awal || '' }); jumlah++; };
  const t1 = tanda[0]; const tm = tanda[tanda.length - 1];
  salin(1, t1.seq - 1);
  if (t1.off > 0) potong([t1.seq, 0], [t1.seq, t1.off], null, null, '');
  tanda.forEach((t, i) => {
    const n = tanda[i + 1];
    potong([t.seq, t.off], n ? [n.seq, n.off] : [t.seq, null], t.hal, t.juz || null, t.awal);
  });
  salin(tm.seq + 1, jumlahHalaman - tm.seq);
  if (jumlah > MAKS_HALAMAN_HASIL) return { galat: `Hasilnya ${jumlah} halaman, melebihi batas ${MAKS_HALAMAN_HASIL} per kitab.` };
  return { rencana, jumlah };
}

/** Rencana -> daftar datar per halaman hasil: [{ idx (1-based), j:'salin', seq } | { idx, j:'potong', ... }]. */
export function ratakan(rencana) {
  const hasil = [];
  for (const r of rencana) {
    if (r.j === 'salin') for (let k = 0; k < r.n; k++) hasil.push({ idx: hasil.length + 1, j: 'salin', seq: r.seq + k });
    else hasil.push({ idx: hasil.length + 1, ...r });
  }
  return hasil;
}

/** Posisi awal tiap halaman hasil, dipakai memetakan halaman digital lama ke halaman hasil (daftar isi). */
const awalHasil = (h) => (h.j === 'salin' ? [h.seq, 0] : h.dari);
const sebelum = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1]); // a <= b

/** seq lama -> idx halaman hasil yang memuat AWAL halaman lama itu. */
export function petaSeqBaru(hasil, jumlahHalaman) {
  const peta = new Map(); let k = 0;
  for (let s = 1; s <= jumlahHalaman; s++) {
    while (k + 1 < hasil.length && sebelum(awalHasil(hasil[k + 1]), [s, 0])) k++;
    peta.set(s, hasil[k].idx);
  }
  return peta;
}

/**
 * Teks sebuah halaman hasil bertipe potong. `teksDi(seq)` = teks halaman digital asli. Kembali { teks, seqs } (halaman asli yang dipakai) atau { galat }.
 */
export function teksPotongan(h, teksDi) {
  const [a, oa] = h.dari; const [b, ob] = h.sampai; const bagian = [];
  if (a === b) bagian.push(String(teksDi(a)).slice(oa, ob === null ? undefined : ob));
  else {
    bagian.push(String(teksDi(a)).slice(oa));
    for (let s = a + 1; s < b; s++) bagian.push(String(teksDi(s)));
    bagian.push(String(teksDi(b)).slice(0, ob === null ? undefined : ob));
  }
  const seqs = []; for (let s = a; s <= b; s++) seqs.push(s);
  return { teks: bagian.map((x) => x.trim()).filter(Boolean).join('\n').trim(), seqs };
}

/** Ringkasan dari tanda saja (tanpa membaca teks): berapa halaman hasil dan berapa halaman digital yang terlibat. */
export function ringkasTanda(tanda, jumlahHalaman) {
  const r = rencanaBatas(tanda, jumlahHalaman);
  if (r.galat) return { galat: r.galat };
  const t1 = tanda[0]; const tm = tanda[tanda.length - 1];
  return { jumlahBaru: r.jumlah, jumlahLama: jumlahHalaman, selisih: r.jumlah - jumlahHalaman, dariSeq: t1.seq, sampaiSeq: tm.seq, jumlahTanda: tanda.length };
}

/** Tanda anomali nomor untuk halaman hasil berurutan (sama dengan penghitungan di web/lib/nomorHalaman.js). Mengubah larik di tempat. */
export function tandaiAnomali(halaman) {
  halaman.forEach((h, i) => { const a = anomaliNomor(h, i ? halaman[i - 1] : null); if (a) h.nomorAnomali = a; else delete h.nomorAnomali; });
  return halaman;
}

/* ---- bentuk padat rencana untuk disimpan di dokumen job (maks 1 MiB per dokumen Firestore) ---- */
/** [{j:'salin',seq,n}] -> [[0,seq,n]]; potong -> [1, seqA, offA, seqB, offB|-1, hal|-1, juz|0, awal] */
export const kompakkan = (rencana) => rencana.map((r) => (r.j === 'salin' ? [0, r.seq, r.n] : [1, r.dari[0], r.dari[1], r.sampai[0], r.sampai[1] === null ? -1 : r.sampai[1], r.hal === null ? -1 : r.hal, r.juz || 0, r.awal || '']));
export const bukaKompak = (padat) => padat.map((x) => (x[0] === 0 ? { j: 'salin', seq: x[1], n: x[2] }
  : { j: 'potong', dari: [x[1], x[2]], sampai: [x[3], x[4] < 0 ? null : x[4]], hal: x[5] < 0 ? null : x[5], juz: x[6] || null, awal: x[7] || '' }));

/* ---- penyuntingan daftar tanda di layar ---- */
const urutTanda = (a, b) => a.seq - b.seq || a.off - b.off;
/** Tambah (atau ganti bila posisinya sama) satu tanda; hasilnya terurut. Tidak mengubah larik asal. */
export const tambahTanda = (daftar, t) => [...daftar.filter((x) => !(x.seq === t.seq && x.off === t.off)), t].sort(urutTanda);
export const hapusTanda = (daftar, seq, off) => daftar.filter((x) => !(x.seq === seq && x.off === off));
export const adaTanda = (daftar, seq, off) => daftar.find((x) => x.seq === seq && x.off === off) || null;
/** Usulan nomor untuk tanda di posisi (seq, off): nomor tanda sebelumnya + 1; tanpa tanda sebelumnya, `halHalaman` (nomor halaman digital itu sekarang) bila ada. */
export function usulHal(daftar, seq, off, halHalaman) {
  const sebelumnya = [...daftar].filter((x) => x.seq < seq || (x.seq === seq && x.off < off)).sort(urutTanda).pop();
  if (sebelumnya) return Math.min(MAKS_HAL_NOMOR, sebelumnya.hal + 1);
  return Number.isInteger(halHalaman) ? halHalaman : 1;
}
