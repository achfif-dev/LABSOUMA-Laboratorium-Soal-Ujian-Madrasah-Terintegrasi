// Indeks pencarian LINTAS KITAB (aksi admin `impor-indeks-global`, dan penunjuk kitab di Tanya Kitab). Logika murni ada di web/lib/indeksGlobal.js.
//
// Simpanan: cariGlobal/_peta (nomor kitab, status) + cariGlobal/b0000..b1023 (bucket kata). Hanya server (Admin SDK) yang membaca dan menulis; tanpa aturan Firestore = tertutup bagi klien.
// Membangun: satu putaran membangun sampai MAKS_KITAB_SWEEP kitab sekaligus, lalu menyapu bucket SEKALI (baca + tulis per bucket yang tersentuh), bukan sekali per kitab;
//   sapuan dibagi menjadi beberapa panggilan bila waktunya tidak cukup dan kemajuannya tersimpan di _peta.sapuan.
//   Kitab yang indeks per kitabnya belum jadi ikut dibangun bertahap (src/kitabCari.js) dan dilaporkan `menunggu`; admin mengulang sampai selesai.
//   Aman diulang: nomor kitab ditetapkan dulu di _peta, penggabungan bucket membuang segmen lama kitab yang sama (idempoten), dan satu kunci mencegah dua pembangunan bersamaan.
// Mencari: baca bucket kata kunci saja (paling banyak MAKS_ISTILAH_KUERI dokumen, sebagian dari memori), lalu peringkat kitab. Kitab yang belum/tidak lagi sesuai indeks dilaporkan
//   `tidakTerindeks` supaya pemanggil tetap memakai cara lain untuk kitab itu (tidak ada kitab yang menghilang dari pencarian hanya karena indeks belum dibangun).
import { daftarAktif } from './daftarKitab.js';
import { halamanTerindeks } from './kitabCari.js';
import {
  VERSI_GLOBAL, N_BUCKET, idBucket, bucketDari, istilahKitab, kelompokBucket, gabungBucket, istilahKueri, bacaBatang, peringkatKitab,
} from '../web/lib/indeksGlobal.js';

export const KOLEKSI_GLOBAL = 'cariGlobal';
export const ANGGARAN_TOTAL_MS = 8000;     // waktu satu panggilan pembangunan; sapuan bucket yang belum selesai diteruskan panggilan berikutnya
export const MAKS_KITAB_SWEEP = 3;
const KUNCI_MS = 150_000;                  // kunci pembangunan kedaluwarsa bila panggilan sebelumnya mati di tengah jalan
const KONKUREN = 24;
const TTL_PETA_MS = 60_000;
const TTL_BUCKET_MS = 5 * 60_000;
const MAKS_BUCKET_MEMORI = 300;

const refPeta = (db) => db.doc(`${KOLEKSI_GLOBAL}/_peta`);
const refBucket = (db, i) => db.doc(`${KOLEKSI_GLOBAL}/${idBucket(i)}`);
const petaKosong = () => ({ v: VERSI_GLOBAL, berikutnya: 1, kitab: {}, usang: [] });
let simpanan = new WeakMap(); // db -> { peta:{at,data}, bucket: Map<i,{at,data}> }
const ruang = (db) => { if (!simpanan.has(db)) simpanan.set(db, { peta: null, bucket: new Map() }); return simpanan.get(db); };

/** Kitab aktif yang indeks globalnya belum ada, belum selesai, atau tidak lagi sesuai jumlah halamannya. */
export function perluBangun(peta, aktif) {
  const kitab = (peta && peta.kitab) || {};
  return (aktif || []).filter((k) => { const e = kitab[k.id]; return !e || e.status !== 'siap' || e.halaman !== k.jumlahHalaman; });
}

export async function bacaPeta(db, { sekarang = Date.now, segar = false } = {}) {
  const r = ruang(db); const t = sekarang();
  if (!segar && r.peta && t - r.peta.at < TTL_PETA_MS) return r.peta.data;
  const s = await refPeta(db).get();
  const data = s.exists ? s.data() : null;
  r.peta = { at: t, data };
  return data;
}

const ambilBucket = async (db, i, sekarang) => {
  const r = ruang(db); const t = sekarang(); const c = r.bucket.get(i);
  if (c && t - c.at < TTL_BUCKET_MS) return { data: c.data, dariMemori: true };
  const s = await refBucket(db, i).get();
  let data = {};
  if (s.exists) { try { data = JSON.parse(s.data().d || '{}'); } catch { data = {}; } }
  r.bucket.set(i, { at: t, data });
  while (r.bucket.size > MAKS_BUCKET_MEMORI) r.bucket.delete(r.bucket.keys().next().value);
  return { data, dariMemori: false };
};

/** Menjalankan `fn` untuk tiap butir dengan paling banyak `n` yang berjalan bersamaan. */
async function kolam(butir, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, butir.length) }, async () => { while (i < butir.length) { const x = butir[i++]; await fn(x); } }));
}

/** Ringkasan untuk layar admin: berapa kitab aktif yang sudah terindeks dan yang masih menunggu. */
export async function statusGlobal(db, { sekarang = Date.now } = {}) {
  const aktif = await daftarAktif(db, { sekarang });
  const peta = await bacaPeta(db, { sekarang, segar: true });
  const menunggu = perluBangun(peta, aktif);
  return { total: aktif.length, terindeks: aktif.length - menunggu.length, menunggu: menunggu.map((k) => k.judulLatin || k.id), sibuk: !!(peta && peta.kunci && sekarang() - peta.kunci.at < KUNCI_MS), ada: !!peta };
}

/**
 * Satu panggilan pembangunan, dibatasi `anggaran` ms (sengaja jauh di bawah maxDuration; batas waktu fungsi Vercel Hobby tidak pasti). Sapuan bucket BISA DILANJUTKAN:
 * kemajuan disimpan di `_peta.sapuan`, panggilan berikutnya meneruskan dari bucket yang belum disapu. Kitab baru ditandai `siap` hanya setelah seluruh sapuannya selesai;
 * sebelum itu kitab itu diabaikan pencarian (status `membangun`), jadi sapuan yang setengah jalan tidak pernah memberi hasil setengah matang.
 * Mengembalikan { selesai, dibangun[], menunggu[], sapuan?:{selesai,total}, total, terindeks, baca, tulis, terpotong } atau { sibuk:true, ... }.
 * `selesai` = tidak ada lagi kitab aktif yang perlu dibangun.
 */
export async function bangunGlobal(db, { sekarang = Date.now, anggaran = ANGGARAN_TOTAL_MS, konkuren = KONKUREN, maksKitab = MAKS_KITAB_SWEEP } = {}) {
  const mulai = sekarang();
  const aktif = await daftarAktif(db, { sekarang });
  // 1. kunci + penetapan nomor kitab (satu transaksi)
  const awal = await db.runTransaction(async (tx) => {
    const s = await tx.get(refPeta(db));
    const peta = s.exists ? s.data() : petaKosong();
    if (peta.kunci && sekarang() - peta.kunci.at < KUNCI_MS) return { sibuk: true };
    const pending = perluBangun(peta, aktif);
    for (const k of pending) {
      const e = peta.kitab[k.id];
      if (e && e.status === 'siap') peta.usang.push(e.no);     // isi berubah: nomor lama tidak lagi dihitung dan dibersihkan pada sapuan
      if (!e || e.status === 'siap') peta.kitab[k.id] = { no: peta.berikutnya++, halaman: k.jumlahHalaman, status: 'membangun', at: sekarang() };
      else peta.kitab[k.id] = { ...e, halaman: k.jumlahHalaman };
    }
    peta.kunci = { at: sekarang() };
    tx.set(refPeta(db), peta);
    return { peta, pending };
  });
  if (awal.sibuk) return { sibuk: true, ...(await statusGlobal(db, { sekarang })) };

  const { peta, pending } = awal;
  const lepas = async (ubah = {}) => { // tulis ulang peta tanpa kunci, digabung dengan keadaan terbaru
    await db.runTransaction(async (tx) => {
      const s = await tx.get(refPeta(db)); const p = s.exists ? s.data() : petaKosong();
      const baru = { ...p, ...ubah, kitab: { ...p.kitab, ...(ubah.kitab || {}) } }; delete baru.kunci;
      if (!baru.sapuan) delete baru.sapuan;
      tx.set(refPeta(db), baru);
    });
    ruang(db).peta = null;
  };
  let baca = 0; let tulis = 0; let terpotong = 0; const menunggu = []; const batch = [];
  if (!pending.length) { await lepas({ sapuan: null }); return { selesai: true, dibangun: [], menunggu, ...(await statusGlobal(db, { sekarang })), baca, tulis, terpotong }; } // tidak ada yang perlu dibangun
  try {
    // 2. kitab yang disapu: sapuan yang tertunda diteruskan dengan kitab yang sama; bila tidak ada, ambil sampai maksKitab kitab yang menunggu
    const lanjut = peta.sapuan && Array.isArray(peta.sapuan.ids) && peta.sapuan.ids.every((id) => pending.some((k) => k.id === id)) ? peta.sapuan : null;
    const calon = lanjut ? pending.filter((k) => lanjut.ids.includes(k.id)) : pending;
    for (const k of calon) {
      if (!lanjut && (batch.length >= maksKitab || (batch.length && sekarang() - mulai > anggaran * 0.4))) break; // sapuan yang diteruskan harus memuat kitab yang sama: tanpa batas waktu baca
      const dok = await db.doc(`kitab/${k.id}`).get();
      if (!dok.exists || dok.data().aktif !== true || dok.data().status !== 'siap') continue;
      const m = dok.data();
      const r = await halamanTerindeks(db, k.id, m, { sekarang });
      if (!r.siap) { menunggu.push({ id: k.id, judul: k.judulLatin || k.id, kemajuan: r.kemajuan }); continue; }
      const { istilah, dibuangUmum } = istilahKitab(r.halaman);
      batch.push({ id: k.id, no: peta.kitab[k.id].no, halaman: k.jumlahHalaman, kel: kelompokBucket(istilah), jumlahIstilah: istilah.size, dibuangUmum });
    }
    if (!batch.length) { await lepas({ sapuan: null }); return { selesai: false, dibangun: [], menunggu, ...(await statusGlobal(db, { sekarang })), baca, tulis, terpotong }; }

    // 3. sapuan bucket: dari `berikutnya` sampai anggaran habis (paling sedikit satu gelombang, supaya selalu ada kemajuan)
    const buang = new Set(peta.usang || []);
    const dipakai = new Set(); for (const b of batch) for (const i of b.kel.keys()) dipakai.add(i);
    const sasaran = buang.size ? Array.from({ length: N_BUCKET }, (_, i) => i) : [...dipakai].sort((a, b) => a - b);
    const sama = lanjut && lanjut.ids.length === batch.length && lanjut.ids.every((id) => batch.some((b) => b.id === id)) && lanjut.jumlah === sasaran.length;
    let berikutnya = sama ? lanjut.berikutnya : 0;
    do {
      const gelombang = sasaran.slice(berikutnya, berikutnya + konkuren);
      await kolam(gelombang, konkuren, async (i) => {
        const tambahan = batch.filter((b) => b.kel.has(i)).map((b) => ({ no: b.no, istilah: b.kel.get(i) }));
        const s = await refBucket(db, i).get(); baca++;
        if (!tambahan.length && !s.exists) return;
        let lama = {}; if (s.exists) { try { lama = JSON.parse(s.data().d || '{}'); } catch { lama = {}; } }
        const h = gabungBucket(lama, tambahan, buang); terpotong += h.terpotong;
        await refBucket(db, i).set({ v: VERSI_GLOBAL, n: Object.keys(h.data).length, d: JSON.stringify(h.data) }); tulis++;
        ruang(db).bucket.delete(i);
      });
      berikutnya += gelombang.length;
    } while (berikutnya < sasaran.length && sekarang() - mulai < anggaran);

    if (berikutnya < sasaran.length) { // belum selesai: simpan kemajuan, kitab tetap `membangun`
      await lepas({ sapuan: { ids: batch.map((b) => b.id), berikutnya, jumlah: sasaran.length } });
      return { selesai: false, dibangun: [], menunggu, sapuan: { selesai: berikutnya, total: sasaran.length }, ...(await statusGlobal(db, { sekarang })), baca, tulis, terpotong };
    }
    // 4. tandai selesai (usang hanya dibersihkan bila SEMUA bucket disapu)
    const kitab = {}; for (const b of batch) kitab[b.id] = { no: b.no, halaman: b.halaman, status: 'siap', at: sekarang(), istilah: b.jumlahIstilah, umum: b.dibuangUmum, ...(terpotong ? { terpotong } : {}) };
    await lepas({ kitab, sapuan: null, ...(buang.size && sasaran.length === N_BUCKET ? { usang: [] } : {}) });
  } catch (e) { try { await lepas(); } catch { /* kunci kedaluwarsa sendiri */ } throw e; }
  const st = await statusGlobal(db, { sekarang });
  return { selesai: st.menunggu.length === 0, dibangun: batch.map((b) => b.id), menunggu, ...st, baca, tulis, terpotong };
}

/**
 * Menunjuk kitab untuk satu pertanyaan dari seluruh perpustakaan.
 * @param {string[][]} kuerian  larik kata normal (kueri utama dari rencana pencarian)
 * @param {string[][]} [varian]  kueri tambahan berbobot rendah
 * @returns {{siap:true, kitab:{id,skor,halaman}[], istilahAda, istilahTotal, tidakTerindeks:string[], bacaan:number}|{siap:false, alasan:string, tidakTerindeks?:string[]}}
 */
export async function cariLintasKitab(db, kuerian, varian = [], { sekarang = Date.now } = {}) {
  const peta = await bacaPeta(db, { sekarang });
  if (!peta || !Object.keys(peta.kitab || {}).length) return { siap: false, alasan: 'belum_dibangun' };
  const aktif = await daftarAktif(db, { sekarang });
  const idDariNo = new Map(); const tidakTerindeks = []; let totalHalaman = 0;
  for (const k of aktif) {
    const e = peta.kitab[k.id];
    if (e && e.status === 'siap' && e.halaman === k.jumlahHalaman) { idDariNo.set(e.no, k.id); totalHalaman += k.jumlahHalaman; } else tidakTerindeks.push(k.id);
  }
  if (!idDariNo.size) return { siap: false, alasan: 'belum_terindeks', tidakTerindeks };
  const istilah = istilahKueri(kuerian, varian);
  if (!istilah.length) return { siap: false, alasan: 'tanpa_istilah', tidakTerindeks };
  const bucket = [...new Set(istilah.map((t) => bucketDari(t.stem)))];
  const dok = new Map(); let bacaan = 0;
  await kolam(bucket, KONKUREN, async (i) => { const r = await ambilBucket(db, i, sekarang); if (!r.dariMemori) bacaan++; dok.set(i, r.data); });
  const posting = new Map();
  for (const t of istilah) { const str = (dok.get(bucketDari(t.stem)) || {})[t.stem]; if (str) posting.set(t.stem, bacaBatang(str)); }
  const r = peringkatKitab(posting, istilah, { idDariNo, totalHalaman });
  return { siap: true, kitab: r.kitab, istilahAda: r.istilahAda, istilahTotal: r.istilahTotal, tidakTerindeks, bacaan };
}

export const _uji = { reset: () => { simpanan = new WeakMap(); } };
