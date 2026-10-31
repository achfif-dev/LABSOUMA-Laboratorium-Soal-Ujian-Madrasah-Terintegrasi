// Pencarian teks di dalam satu kitab (aksi `perpus-cari`). Logika pencocokan ada di web/lib/cariKitab.js (satu sumber dengan klien).
//
// Indeks = dokumen potongan kitab/{id}/cari/cNNNNN berisi teks normal beberapa halaman, ditambah kitab/{id}/cari/meta.
//  - Kitab yang diimpor sesudah fitur ini: potongan ditulis bersama halamannya (src/kitabImpor.js, satu batch), meta ditulis saat impor-selesai.
//  - Kitab lama (tanpa meta): indeks dibangun BERTAHAP saat pencarian pertama. Satu panggilan memproses sebanyak yang muat dalam ANGGARAN_MS
//    (fungsi Vercel Hobby dibatasi 10 detik), menyimpan kemajuan di meta, lalu menjawab { siap:false, kemajuan }. Klien mengulang sampai siap.
//    Menulis potongan yang sama dua kali aman (id deterministik), jadi dua pemakai yang membangun bersamaan tidak merusak apa pun.
// Hasil pembacaan potongan disimpan di memori proses (maks 2 kitab) supaya pencarian berikutnya tidak membaca Firestore lagi.
import { ApiError } from './soalService.js';
import { firestoreAdmin } from './platform.js';
import { idHalaman } from './kitabImpor.js';
import {
  VERSI_INDEKS, GRUP_HALAMAN, MODE_CARI, HASIL_PER_HALAMAN, RE_ID_POTONGAN, bangunPotongan, cariDiHalaman, halamanDariPotongan, siapkanKueri,
} from '../web/lib/cariKitab.js';

export const ANGGARAN_MS = 5500;
const MAKS_KARAKTER_SIMPANAN = 40_000_000; // kitab yang lebih besar dari ini tidak disimpan di memori (tetap bisa dicari, membaca ulang tiap kali)
const MAKS_KITAB_SIMPANAN = 2;
const MAKS_LEWATI = 5000;
const simpanan = new Map(); // `${kid}:${revisi}:${versi}` -> halaman terindeks
export const kosongkanSimpananCari = () => simpanan.clear();

const tolak = (status, kode, pesan) => { throw new ApiError(status, kode, pesan); };
const metaRef = (db, kid) => db.doc(`kitab/${kid}/cari/meta`);
const kunci = (kid, m) => `${kid}:${m.revisi || 1}:${VERSI_INDEKS}`;
const metaSiap = (cm, m) => !!cm && cm.status === 'siap' && cm.versi === VERSI_INDEKS && cm.revisi === (m.revisi || 1);

/** Membangun satu panggilan: grup halaman mulai `cm.berikutnya` sampai anggaran waktu habis. Mengembalikan meta indeks terbaru. */
async function bangunBertahap(db, kid, m, cm, { sekarang = Date.now, anggaran = ANGGARAN_MS } = {}) {
  const jumlahGrup = Math.ceil(m.jumlahHalaman / GRUP_HALAMAN);
  const baru = !cm || cm.versi !== VERSI_INDEKS || cm.revisi !== (m.revisi || 1);
  let g = baru ? 0 : (cm.berikutnya || 0);
  if (baru) { // indeks lama/usang: buang potongan lama agar tidak ada halaman ganda
    const lama = await db.collection(`kitab/${kid}/cari`).select().get();
    for (let i = 0; i < lama.docs.length; i += 400) { const b = db.batch(); lama.docs.slice(i, i + 400).forEach((d) => { if (d.id !== 'meta') b.delete(d.ref); }); await b.commit(); }
  }
  const mulai = sekarang();
  do { // minimal satu grup per panggilan, supaya anggaran waktu sekecil apa pun tetap membuat kemajuan
    const dari = g * GRUP_HALAMAN + 1; const sampai = Math.min(m.jumlahHalaman, dari + GRUP_HALAMAN - 1);
    const ids = []; for (let s = dari; s <= sampai; s++) ids.push(s);
    const snaps = await Promise.all(ids.map((s) => db.doc(`kitab/${kid}/halaman/${idHalaman(s)}`).get()));
    const halaman = snaps.filter((x) => x.exists).map((x) => x.data()).map((d) => ({ seq: d.seq, hal: d.hal, juz: d.juz, teks: d.teks }));
    const potongan = bangunPotongan(halaman);
    if (potongan.length) { const b = db.batch(); potongan.forEach((p) => b.set(db.doc(`kitab/${kid}/cari/${p.id}`), { ...p.data, revisi: m.revisi || 1 })); await b.commit(); }
    g++;
    await metaRef(db, kid).set({ versi: VERSI_INDEKS, revisi: m.revisi || 1, status: g >= jumlahGrup ? 'siap' : 'membangun', berikutnya: g, jumlahGrup, halaman: m.jumlahHalaman });
  } while (g < jumlahGrup && sekarang() - mulai < anggaran);
  return (await metaRef(db, kid).get()).data();
}

/** Muat semua halaman terindeks (dari memori bila ada). */
async function muatIndeks(db, kid, m) {
  const k = kunci(kid, m);
  if (simpanan.has(k)) { const v = simpanan.get(k); simpanan.delete(k); simpanan.set(k, v); return v.halaman; } // segarkan urutan pakai terakhir
  const snap = await db.collection(`kitab/${kid}/cari`).get();
  const halaman = [];
  for (const d of snap.docs) { if (RE_ID_POTONGAN.test(d.id)) { const x = d.data(); if (x.revisi === undefined || x.revisi === (m.revisi || 1)) halaman.push(...halamanDariPotongan(x)); } }
  const karakter = halaman.reduce((n, p) => n + p.t.length, 0);
  if (karakter <= MAKS_KARAKTER_SIMPANAN) {
    simpanan.set(k, { halaman });
    while (simpanan.size > MAKS_KITAB_SIMPANAN) simpanan.delete(simpanan.keys().next().value);
  }
  return halaman;
}

/**
 * Aksi `perpus-cari` (kitab sudah divalidasi aktif oleh pemanggil). Masukan: { q, mode?, lewati? }.
 * Keluaran: { siap:true, total, hasil:[{seq,hal,juz,jumlah,teks,mulai,panjang,awalTerpotong,akhirTerpotong}], adaLagi, kata, mode, q }
 *        atau { siap:false, kemajuan:{ selesai, total } } selama indeks kitab lama dibangun.
 */
export async function aksiCari(b, kid, m, opsi = {}) {
  const { db } = await firestoreAdmin();
  const mode = b.mode === undefined ? 'frasa' : b.mode;
  if (!MODE_CARI.includes(mode)) tolak(422, 'PERPUS_INVALID', 'Mode pencarian harus "frasa" atau "kata".');
  if (typeof b.q !== 'string') tolak(422, 'PERPUS_INVALID', 'Kata yang dicari harus berupa teks.');
  const kueri = siapkanKueri(b.q);
  if (!kueri.q) tolak(422, 'CARI_KOSONG', 'Ketik minimal satu huruf atau angka untuk dicari.');
  const lewati = b.lewati === undefined ? 0 : b.lewati;
  if (!Number.isInteger(lewati) || lewati < 0 || lewati > MAKS_LEWATI) tolak(422, 'PERPUS_INVALID', `Lewati harus bilangan bulat 0-${MAKS_LEWATI}.`);

  let cm = simpanan.has(kunci(kid, m)) ? { status: 'siap', versi: VERSI_INDEKS, revisi: m.revisi || 1 } : (await metaRef(db, kid).get()).data();
  if (!metaSiap(cm, m)) {
    cm = await bangunBertahap(db, kid, m, cm, opsi);
    if (!metaSiap(cm, m)) return { siap: false, kemajuan: { selesai: (cm && cm.berikutnya) || 0, total: Math.ceil(m.jumlahHalaman / GRUP_HALAMAN) } };
  }
  const halaman = await muatIndeks(db, kid, m);
  const r = cariDiHalaman(halaman, kueri, { mode, lewati, batas: HASIL_PER_HALAMAN });
  return { siap: true, ...r, kata: kueri.kata, mode, q: kueri.q, lewati };
}
