// Cadangan dan riwayat konfigurasi (config/app dan config/ai) di Firestore.
//
// Masalah yang dijawab: kesalahan manusia oleh admin (menimpa, menghapus tingkat/kitab, menekan "Pulihkan bawaan").
// Sebelumnya setiap Simpan menimpa dokumen tanpa jejak, dan "Pulihkan bawaan" menghapus dokumen sehingga konfigurasi buatan
// madrasah hilang selamanya dan diganti daftar bawaan kode. Sekarang:
//   1. Setiap perubahan (simpan, reset, pulihkan) lebih dulu menyimpan KEADAAN SEBELUMNYA sebagai cadangan otomatis, dalam
//      operasi atomik yang sama dengan perubahannya (transaksi): tidak ada perubahan tanpa cadangan.
//   2. Admin bisa menandai konfigurasi yang sudah benar sebagai "titik pulih" bernama. Titik pulih tidak pernah dipangkas otomatis.
//      Cadangan otomatis dibatasi (BATAS_RIWAYAT.otomatis), dan admin bisa menghapus cadangan mana pun satu per satu atau membersihkan
//      cadangan otomatis sekaligus (titik pulih tidak ikut terhapus oleh pembersihan).
//   3. Pemulihan mengembalikan konfigurasi buatan madrasah (bukan bawaan kode), dan pemulihan itu sendiri juga dicadangkan
//      lebih dulu, jadi salah pulih pun bisa dibatalkan.
//
// Disimpan di koleksi tersendiri per jenis (configRiwayatApp, configRiwayatAi). Hanya Admin SDK yang bisa mengaksesnya;
// firestore.rules menolak klien. Kunci API TIDAK pernah masuk cadangan: rahasia hanya hidup di satu tempat (config/ai).
import { ApiError, cleanLine } from './soalService.js';
import { firestoreAdmin } from './platform.js';

export const JENIS = {
  app: { koleksi: 'configRiwayatApp', doc: 'config/app', nama: 'Konfigurasi aplikasi' },
  ai: { koleksi: 'configRiwayatAi', doc: 'config/ai', nama: 'Pengaturan AI' },
};
// otomatis: jumlah cadangan otomatis yang disimpan per jenis (lebih dari ini, yang tertua dibuang sendiri). Admin juga bisa menghapus satu per satu atau membersihkannya sekaligus.
export const BATAS_RIWAYAT = { otomatis: 10, titik: 20, nama: 80, daftar: 100 };
export const ALASAN = ['sebelum-simpan', 'sebelum-reset', 'sebelum-pulih', 'titik'];
const ID_OK = /^[A-Za-z0-9_-]{1,80}$/;
const MODEL_AI = ['gemini', 'anthropic'];
const bad = (m, code = 'RIWAYAT_INVALID', status = 422) => new ApiError(status, code, m);
const salin = (o) => JSON.parse(JSON.stringify(o));

export const cekJenis = (j) => { if (typeof j !== 'string' || !Object.hasOwn(JENIS, j)) throw bad('Jenis harus app atau ai.', 'BAD_REQUEST', 400); return j; };
export const cekId = (id) => { if (typeof id !== 'string' || !ID_OK.test(id)) throw bad('ID cadangan tidak valid.', 'BAD_REQUEST', 400); return id; };

/** JSON dengan kunci objek terurut: dua isi yang sama selalu menghasilkan teks yang sama, apa pun urutan kuncinya. */
export const kanon = (v) => JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : x));

/* ---------------------------------------------------------------- Bentuk data */

/** Dokumen Firestore -> isi cadangan. app: cfg; ai: penyedia, model, dan KETERSEDIAAN kunci (tanpa kunci/ciphertext). Tanpa isi -> null. */
export function dataDariDoc(jenis, doc) {
  if (!doc || typeof doc !== 'object') return null;
  if (jenis === 'app') return doc.cfg && typeof doc.cfg === 'object' ? salin(doc.cfg) : null;
  const models = {}; const kunci = {};
  for (const p of MODEL_AI) {
    const m = doc.models && doc.models[p]; if (typeof m === 'string' && m) models[p] = m;
    const k = doc.keys && doc.keys[p]; if (k && k.enc) kunci[p] = { last4: String(k.last4 || '') };
  }
  const provider = MODEL_AI.includes(doc.provider) ? doc.provider : '';
  if (!provider && !Object.keys(models).length && !Object.keys(kunci).length) return null;
  return { provider, models, kunci };
}

/** Ringkasan kecil untuk daftar riwayat (dihitung saat dicadangkan, jadi daftar tidak perlu memuat isi besar). */
export function ringkas(jenis, data) {
  if (jenis === 'app') {
    const d = data || {};
    const pen = (d.kitab || []).reduce((n, k) => n + ((k && k.penempatan) || []).length, 0);
    return { tingkat: (d.tingkat || []).length, mapel: (d.mapel || []).length, kitab: (d.kitab || []).length, penempatan: pen, sistemUjian: (d.sistemUjian || []).length };
  }
  const d = data || {};
  return { provider: d.provider || '', models: { ...(d.models || {}) }, kunciTersimpan: Object.keys(d.kunci || {}) };
}

/** Logika murni: susun dokumen riwayat. */
export function rakitRiwayat({ jenis, tipe = 'otomatis', alasan, nama = '', data, sumber = null, oleh = '', now }) {
  return {
    jenis, tipe, alasan, nama: cleanLine(nama, BATAS_RIWAYAT.nama), data, ringkas: ringkas(jenis, data),
    sumberOleh: (sumber && sumber.updatedBy) || '', sumberAt: (sumber && sumber.updatedAt) || '',
    dibuatOleh: oleh, dibuatAt: now,
  };
}

/* ------------------------------------------------------------ Perbandingan */

const peta = (arr) => new Map((Array.isArray(arr) ? arr : []).filter((x) => x && typeof x.nama === 'string').map((x) => [x.nama, x]));
const POTONG = 40;
function bandingDaftar(cadangan, sekarang) {
  const a = peta(cadangan); const b = peta(sekarang);
  const kembali = []; const hilang = []; const beda = [];
  for (const [n, v] of a) { if (!b.has(n)) kembali.push(n); else if (kanon(v) !== kanon(b.get(n))) beda.push(n); }
  for (const n of b.keys()) if (!a.has(n)) hilang.push(n);
  return {
    kembali: kembali.slice(0, POTONG), hilang: hilang.slice(0, POTONG), beda: beda.slice(0, POTONG),
    jumlah: { kembali: kembali.length, hilang: hilang.length, beda: beda.length },
  };
}

/**
 * Apa yang berubah bila `cadangan` dipulihkan menimpa `sekarang`.
 * kembali = ada di cadangan, tidak ada sekarang (akan muncul lagi); hilang = ada sekarang, tidak ada di cadangan (akan terhapus);
 * beda = ada di keduanya tetapi isinya berbeda (akan kembali ke isi cadangan).
 */
export function bandingkan(jenis, cadangan, sekarang) {
  if (jenis === 'app') {
    const a = cadangan || {}; const b = sekarang || {};
    const hasil = { tingkat: bandingDaftar(a.tingkat, b.tingkat), mapel: bandingDaftar(a.mapel, b.mapel), kitab: bandingDaftar(a.kitab, b.kitab), sistemUjianBeda: kanon(a.sistemUjian || []) !== kanon(b.sistemUjian || []) };
    hasil.sama = !hasil.sistemUjianBeda && ['tingkat', 'mapel', 'kitab'].every((k) => !hasil[k].jumlah.kembali && !hasil[k].jumlah.hilang && !hasil[k].jumlah.beda);
    return hasil;
  }
  const a = cadangan || {}; const b = sekarang || {};
  const model = MODEL_AI.filter((p) => ((a.models || {})[p] || '') !== ((b.models || {})[p] || '')).map((p) => ({ provider: p, cadangan: (a.models || {})[p] || '', sekarang: (b.models || {})[p] || '' }));
  const providerBeda = (a.provider || '') !== (b.provider || '');
  return { providerBeda, provider: { cadangan: a.provider || '', sekarang: b.provider || '' }, model, sama: !providerBeda && !model.length };
}

/* -------------------------------------------------------------- Firestore */

const kol = (db, jenis) => db.collection(JENIS[jenis].koleksi);
const idBaru = (now) => `${now.replace(/[^0-9]/g, '').slice(0, 17)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Siapkan cadangan keadaan sekarang untuk ditulis bersama perubahannya (di dalam transaksi pemanggil).
 * Mengembalikan { ref, doc } atau null bila tak ada yang perlu dicadangkan: dokumen belum ada (masih bawaan kode),
 * atau isinya sama persis dengan cadangan otomatis terakhir (mencegah menumpuk salinan kembar).
 */
export async function siapkanRiwayat(db, { jenis, tipe = 'otomatis', nama = '', alasan, docSaatIni, oleh, now }) {
  const data = dataDariDoc(jenis, docSaatIni);
  if (!data) return null;
  if (tipe === 'otomatis') {
    const terakhir = await kol(db, jenis).orderBy('dibuatAt', 'desc').limit(1).get();
    const t = terakhir.docs[0] && terakhir.docs[0].data();
    if (t && t.tipe === 'otomatis' && kanon(t.data) === kanon(data)) return null;
  }
  const id = idBaru(now);
  cacheDaftar.delete(jenis); // cadangan baru akan ditulis pemanggil
  return { ref: kol(db, jenis).doc(id), id, doc: rakitRiwayat({ jenis, tipe, alasan, nama, data, sumber: docSaatIni, oleh, now }) };
}

const UKURAN_BATCH = 400; // batas Firestore 500 operasi per batch; sisakan ruang
async function hapusBanyak(db, docs) {
  for (let i = 0; i < docs.length; i += UKURAN_BATCH) {
    const batch = db.batch(); docs.slice(i, i + UKURAN_BATCH).forEach((d) => batch.delete(d.ref)); await batch.commit();
  }
}

/** Buang cadangan OTOMATIS yang melewati batas (yang tertua dulu). Titik pulih tidak disentuh. Gagal tidak membatalkan apa pun. */
export async function pangkasRiwayat(jenis, { db: dbIn } = {}) {
  try {
    const db = dbIn || (await firestoreAdmin()).db;
    const semua = await kol(db, jenis).orderBy('dibuatAt', 'desc').select('tipe').get();
    const otomatis = semua.docs.filter((d) => d.data().tipe === 'otomatis');
    const lebih = otomatis.slice(BATAS_RIWAYAT.otomatis);
    cacheDaftar.delete(jenis);
    if (!lebih.length) return 0;
    await hapusBanyak(db, lebih);
    return lebih.length;
  } catch (e) { console.error('[configBackup] gagal memangkas riwayat:', e?.code ?? e?.message); return 0; }
}

/**
 * Pembersihan manual oleh admin: hapus cadangan OTOMATIS, sisakan `simpan` yang terbaru (0 = hapus semuanya).
 * Titik pulih tidak pernah ikut terhapus. Berbeda dengan pangkasRiwayat, galat di sini dilaporkan ke admin.
 */
export async function bersihkanOtomatis(jenis, simpanMasuk) {
  const simpan = Number(simpanMasuk);
  if (!Number.isInteger(simpan) || simpan < 0 || simpan > BATAS_RIWAYAT.otomatis) throw bad(`Jumlah yang disisakan harus bilangan bulat 0 sampai ${BATAS_RIWAYAT.otomatis}.`, 'BAD_REQUEST', 400);
  const { db } = await firestoreAdmin();
  const semua = await kol(db, jenis).orderBy('dibuatAt', 'desc').select('tipe').get();
  const otomatis = semua.docs.filter((d) => d.data().tipe === 'otomatis');
  const buang = otomatis.slice(simpan);
  cacheDaftar.delete(jenis);
  if (buang.length) await hapusBanyak(db, buang);
  return { dihapus: buang.length, sisa: otomatis.length - buang.length };
}

// Daftar riwayat dibaca admin tiap membuka tab konfigurasi (sampai ~30 dokumen per jenis). Disimpan di memori beberapa saat;
// setiap perubahan (cadangan baru, pangkas, hapus, titik) membuangnya, jadi admin tetap melihat data terbaru di instance ini.
const TTL_DAFTAR_MS = 5 * 60 * 1000;
const cacheDaftar = new Map(); // jenis -> { at, value }
export const kosongkanCacheRiwayat = () => cacheDaftar.clear();

/** Daftar riwayat terbaru dulu, tanpa isi besar. `segarkan: true` melewati cache. */
export async function daftarRiwayat(jenis, { segarkan = false, now = Date.now() } = {}) {
  const c = cacheDaftar.get(jenis);
  if (!segarkan && c && now - c.at < TTL_DAFTAR_MS) return c.value;
  const { db } = await firestoreAdmin();
  const snap = await kol(db, jenis).orderBy('dibuatAt', 'desc').limit(BATAS_RIWAYAT.daftar).select('tipe', 'alasan', 'nama', 'ringkas', 'sumberOleh', 'sumberAt', 'dibuatOleh', 'dibuatAt').get();
  const value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  cacheDaftar.set(jenis, { at: now, value });
  return value;
}

export async function bacaRiwayat(jenis, id) {
  const { db } = await firestoreAdmin();
  const s = await kol(db, jenis).doc(cekId(id)).get();
  if (!s.exists) throw bad('Cadangan tidak ditemukan. Mungkin sudah dipangkas atau dihapus.', 'RIWAYAT_NOT_FOUND', 404);
  return { id, ...s.data() };
}

/** Tandai konfigurasi yang TERSIMPAN di server sekarang sebagai titik pulih bernama. */
export async function buatTitik(user, jenis, namaMasuk, { now = () => new Date().toISOString() } = {}) {
  const nama = cleanLine(namaMasuk, BATAS_RIWAYAT.nama);
  if (!nama) throw bad('Beri nama titik pulih, mis. "Setelan awal tahun ajaran 2026/2027".');
  const { db } = await firestoreAdmin();
  const cur = await db.doc(JENIS[jenis].doc).get();
  const docSaatIni = cur.exists ? cur.data() : null;
  if (!dataDariDoc(jenis, docSaatIni)) throw bad(jenis === 'app' ? 'Belum ada konfigurasi buatan madrasah yang tersimpan (masih memakai bawaan aplikasi). Simpan konfigurasi dulu.' : 'Belum ada pengaturan AI yang tersimpan di menu ini.');
  const ada = await kol(db, jenis).orderBy('dibuatAt', 'desc').select('tipe').get();
  if (ada.docs.filter((d) => d.data().tipe === 'titik').length >= BATAS_RIWAYAT.titik) throw bad(`Titik pulih maksimal ${BATAS_RIWAYAT.titik}. Hapus yang tidak dipakai dulu.`);
  const r = await siapkanRiwayat(db, { jenis, tipe: 'titik', nama, alasan: 'titik', docSaatIni, oleh: user.email || user.uid, now: now() });
  await r.ref.set(r.doc);
  cacheDaftar.delete(jenis);
  return { id: r.id, ...r.doc };
}

/** Hapus satu cadangan (otomatis atau titik pulih) atas permintaan admin. Isi konfigurasi yang sedang berlaku tidak tersentuh. */
export async function hapusRiwayat(jenis, id) {
  const { db } = await firestoreAdmin();
  const ref = kol(db, jenis).doc(cekId(id));
  const s = await ref.get();
  if (!s.exists) throw bad('Cadangan tidak ditemukan. Mungkin sudah dipangkas atau dihapus.', 'RIWAYAT_NOT_FOUND', 404);
  const tipe = s.data().tipe; // dibaca sebelum dihapus
  await ref.delete();
  cacheDaftar.delete(jenis);
  return { ok: true, tipe };
}
