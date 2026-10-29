// Impor perpustakaan kitab ke Firestore (khusus admin, lewat Admin SDK). Skema: docs/SKEMA-KITAB.md (v2).
// Alur: impor-mulai (metadata + daftar isi, kitab belum aktif) -> impor-halaman (<= 100 halaman per panggilan) -> impor-selesai
// (jumlah dihitung ulang di server; baru aktif bila cocok). Klien dianggap tidak tepercaya: semua bidang divalidasi dan
// ditulis ulang dari daftar putih, hasil parse klien tidak pernah disalin mentah.
import { ApiError } from './soalService.js';
import { firestoreAdmin } from './platform.js';

export const MAKS_HALAMAN_PER_PANGGILAN = 100;
export const MAKS_TEKS_HALAMAN = 12000;
export const MAKS_HALAMAN_KITAB = 5000;
export const MAKS_DAFTAR_ISI = 3000;
const MAKS_BATCH = 400;
export const MAZHAB = ['', 'syafii', 'hanafi', 'maliki', 'hanbali'];
export const STATUS_HAK_CIPTA = ['belum-dicek', 'domain-publik', 'izin'];
const BENTUK_MATN = ['pemisah-tatwil', 'tanpa-pemisah'];
const ANOMALI = ['duplikat', 'mundur', 'lompat'];
const RE_ID = /^[a-z0-9][a-z0-9-]{1,59}$/;

const tolak = (kode, pesan, status = 422) => { throw new ApiError(status, kode, pesan); };
const str = (v, maks, nama, { wajib = false } = {}) => {
  if (v === undefined || v === null || v === '') { if (wajib) tolak('KITAB_INVALID', `${nama} wajib diisi.`); return ''; }
  if (typeof v !== 'string') tolak('KITAB_INVALID', `${nama} harus berupa teks.`);
  if (v.length > maks) tolak('KITAB_INVALID', `${nama} terlalu panjang (maksimal ${maks} karakter).`);
  return v;
};
const bil = (v, min, maks, nama, { boleh_null = false } = {}) => {
  if ((v === null || v === undefined) && boleh_null) return null;
  if (!Number.isInteger(v) || v < min || v > maks) tolak('KITAB_INVALID', `${nama} harus bilangan bulat ${min}-${maks}.`);
  return v;
};

export const idHalaman = (seq) => `p${String(seq).padStart(5, '0')}`;

export function validasiKitabId(id) {
  if (typeof id !== 'string' || !RE_ID.test(id)) tolak('KITAB_ID_INVALID', 'ID kitab hanya huruf kecil, angka, dan tanda hubung (2-60 karakter), mis. fathul-muin.');
  return id;
}

/** Metadata kitab dari klien -> objek bersih. Bidang yang tidak dikenal dibuang. */
export function validasiKitab(k) {
  if (!k || typeof k !== 'object') tolak('KITAB_INVALID', 'Metadata kitab kosong.');
  const edisi = k.edisi && typeof k.edisi === 'object' ? k.edisi : {};
  const hak = k.hakCipta && typeof k.hakCipta === 'object' ? k.hakCipta : {};
  const sumber = k.sumber && typeof k.sumber === 'object' ? k.sumber : {};
  const mazhab = str(k.mazhab, 20, 'Mazhab');
  if (!MAZHAB.includes(mazhab)) tolak('KITAB_INVALID', 'Mazhab tidak dikenal.');
  const status = str(hak.status || 'belum-dicek', 20, 'Status hak cipta');
  if (!STATUS_HAK_CIPTA.includes(status)) tolak('KITAB_INVALID', 'Status hak cipta tidak dikenal.');
  const bentuk = str(k.bentukMatn, 30, 'Bentuk matn', { wajib: true });
  if (!BENTUK_MATN.includes(bentuk)) tolak('KITAB_INVALID', 'Bentuk matn tidak dikenal.');
  return {
    judul: str(k.judul, 300, 'Judul', { wajib: true }),
    judulLatin: str(k.judulLatin, 150, 'Nama kitab (Latin)', { wajib: true }),
    pengarang: str(k.pengarang, 400, 'Pengarang'),
    wafatH: bil(k.wafatH ?? null, 1, 2000, 'Tahun wafat', { boleh_null: true }),
    fan: str(k.fan, 80, 'Fan'),
    mazhab,
    edisi: { penerbit: str(edisi.penerbit, 400, 'Penerbit'), muhaqqiq: str(edisi.muhaqqiq, 400, 'Muhaqqiq'), cetakan: str(edisi.cetakan, 400, 'Cetakan') },
    jumlahHalaman: bil(k.jumlahHalaman, 1, MAKS_HALAMAN_KITAB, 'Jumlah halaman'),
    jumlahJuz: bil(k.jumlahJuz, 1, 99, 'Jumlah juz'),
    penomoranSesuaiCetak: k.penomoranSesuaiCetak === true,
    bentukMatn: bentuk,
    berharakat: k.berharakat === true,
    hakCipta: { status, catatan: str(hak.catatan, 600, 'Catatan hak cipta') },
    sumber: { jenis: 'syamilah-txt', pengunggah: str(sumber.pengunggah, 200, 'Pengunggah'), tanggalSyamilah: str(sumber.tanggalSyamilah, 100, 'Tanggal Syamilah') },
    formatParser: bil(k.formatParser ?? 1, 1, 99, 'Versi parser'),
  };
}

export function validasiDaftarIsi(arr) {
  if (!Array.isArray(arr)) tolak('KITAB_INVALID', 'Daftar isi harus berupa larik.');
  if (arr.length > MAKS_DAFTAR_ISI) tolak('KITAB_INVALID', `Daftar isi terlalu panjang (maksimal ${MAKS_DAFTAR_ISI} entri).`);
  return arr.map((e, i) => {
    if (!e || typeof e !== 'object') tolak('KITAB_INVALID', `Entri daftar isi ke-${i + 1} tidak valid.`);
    return { judul: str(e.judul, 300, 'Judul daftar isi', { wajib: true }), level: bil(e.level, 1, 4, 'Level'), juz: bil(e.juz, 1, 99, 'Juz'), hal: bil(e.hal, 0, 99999, 'Halaman'), seq: bil(e.seq, 1, MAKS_HALAMAN_KITAB, 'Urutan') };
  });
}

/** Satu halaman -> dokumen bersih. `id` WAJIB sama dengan idHalaman(seq): klien tidak boleh memilih kunci lain. */
export function validasiHalaman(h, jumlahHalaman) {
  if (!h || typeof h !== 'object') tolak('KITAB_INVALID', 'Halaman tidak valid.');
  const seq = bil(h.seq, 1, jumlahHalaman, 'Urutan halaman');
  if (h.id !== idHalaman(seq)) tolak('KITAB_INVALID', `ID halaman ${seq} tidak sesuai urutannya.`);
  const teks = typeof h.teks === 'string' ? h.teks : tolak('KITAB_INVALID', `Teks halaman ${seq} harus berupa teks.`);
  if (teks.length > MAKS_TEKS_HALAMAN) tolak('KITAB_INVALID', `Teks halaman ${seq} melebihi ${MAKS_TEKS_HALAMAN} karakter.`);
  const doc = { seq, juz: bil(h.juz, 1, 99, 'Juz'), hal: bil(h.hal, 0, 99999, 'Halaman'), teks, batasMatn: bil(h.batasMatn ?? null, 0, teks.length, 'Batas matn', { boleh_null: true }) };
  if (h.bab !== undefined && h.bab !== '') doc.bab = str(h.bab, 300, 'Bab');
  if (h.nomorAnomali !== undefined) { if (!ANOMALI.includes(h.nomorAnomali)) tolak('KITAB_INVALID', 'Jenis anomali nomor tidak dikenal.'); doc.nomorAnomali = h.nomorAnomali; }
  return doc;
}

async function hitung(col) {
  if (typeof col.count === 'function') return (await col.count().get()).data().count;
  return (await col.select().get()).docs.length;
}

async function hapusHalaman(db, kid) {
  const snap = await db.collection(`kitab/${kid}/halaman`).select().get();
  for (let i = 0; i < snap.docs.length; i += MAKS_BATCH) {
    const b = db.batch();
    snap.docs.slice(i, i + MAKS_BATCH).forEach((d) => b.delete(d.ref));
    await b.commit();
  }
  return snap.docs.length;
}

const ringkasMeta = (id, d) => ({
  id, judul: d.judul, judulLatin: d.judulLatin, pengarang: d.pengarang, jumlahHalaman: d.jumlahHalaman, status: d.status,
  aktif: d.aktif === true, revisi: d.revisi || 1, hakCipta: d.hakCipta?.status || 'belum-dicek', bentukMatn: d.bentukMatn, diubahAt: d.diubahAt || '',
});

/** Satu pintu untuk semua aksi impor. `uid` = admin yang memanggil. */
export async function aksiImpor(body, uid, { sekarang = () => new Date().toISOString() } = {}) {
  const b = body && typeof body === 'object' ? body : {};
  const { db } = await firestoreAdmin();
  const metaRef = (kid) => db.doc(`kitab/${kid}`);

  if (b.aksi === 'impor-daftar') {
    const snap = await db.collection('kitab').get();
    return { kitab: snap.docs.slice(0, 200).map((d) => ringkasMeta(d.id, d.data())) };
  }

  const kid = validasiKitabId(b.kitabId);
  const ref = metaRef(kid);
  const ada = await ref.get();

  if (b.aksi === 'impor-mulai') {
    if (ada.exists && b.timpa !== true) tolak('KITAB_SUDAH_ADA', `Kitab "${kid}" sudah ada. Centang "timpa" untuk mengimpor ulang (halaman lama dihapus).`, 409);
    const kitab = validasiKitab(b.kitab);
    const daftar = validasiDaftarIsi(b.daftarIsi);
    const terhapus = ada.exists ? await hapusHalaman(db, kid) : 0;
    const revisi = ada.exists ? (ada.data().revisi || 1) + 1 : 1;
    const t = sekarang();
    await ref.set({ ...kitab, status: 'mengimpor', aktif: false, revisi, dibuatOleh: ada.exists ? (ada.data().dibuatOleh || uid) : uid, dibuatAt: ada.exists ? (ada.data().dibuatAt || t) : t, diubahAt: t, diubahOleh: uid });
    await db.doc(`kitab/${kid}/daftar/isi`).set({ entri: daftar, jumlah: daftar.length, revisi });
    return { ok: true, kitabId: kid, revisi, halamanDihapus: terhapus };
  }

  if (!ada.exists) tolak('KITAB_TIDAK_ADA', 'Kitab belum dimulai. Jalankan impor-mulai dulu.', 404);
  const meta = ada.data();

  if (b.aksi === 'impor-halaman') {
    if (meta.status !== 'mengimpor') tolak('KITAB_STATUS', 'Kitab ini tidak sedang diimpor. Mulai ulang dengan "timpa".', 409);
    if (!Array.isArray(b.halaman) || !b.halaman.length) tolak('KITAB_INVALID', 'Larik halaman kosong.');
    if (b.halaman.length > MAKS_HALAMAN_PER_PANGGILAN) tolak('KITAB_INVALID', `Maksimal ${MAKS_HALAMAN_PER_PANGGILAN} halaman per panggilan.`);
    const docs = b.halaman.map((h) => validasiHalaman(h, meta.jumlahHalaman));
    if (new Set(docs.map((d) => d.seq)).size !== docs.length) tolak('KITAB_INVALID', 'Ada urutan halaman kembar dalam satu panggilan.');
    const bt = db.batch();
    docs.forEach((d) => bt.set(db.doc(`kitab/${kid}/halaman/${idHalaman(d.seq)}`), d));
    await bt.commit();
    return { ok: true, tertulis: docs.length };
  }

  if (b.aksi === 'impor-selesai') {
    if (meta.status === 'siap') return { ok: true, jumlah: meta.jumlahHalaman, sudah: true };
    if (meta.status !== 'mengimpor') tolak('KITAB_STATUS', 'Kitab ini tidak sedang diimpor.', 409);
    const n = await hitung(db.collection(`kitab/${kid}/halaman`));
    if (n !== meta.jumlahHalaman) tolak('KITAB_JUMLAH_BEDA', `Halaman tersimpan ${n}, seharusnya ${meta.jumlahHalaman}. Kitab belum diaktifkan; ulangi impor dengan "timpa".`, 409);
    await ref.set({ ...meta, status: 'siap', aktif: true, diubahAt: sekarang(), diubahOleh: uid });
    return { ok: true, jumlah: n };
  }

  if (b.aksi === 'impor-aktif') {
    if (typeof b.aktif !== 'boolean') tolak('KITAB_INVALID', 'Nilai aktif harus true atau false.');
    if (meta.status !== 'siap') tolak('KITAB_STATUS', 'Hanya kitab yang impornya selesai yang bisa diaktifkan atau disembunyikan.', 409);
    await ref.set({ ...meta, aktif: b.aktif, diubahAt: sekarang(), diubahOleh: uid });
    return { ok: true, aktif: b.aktif };
  }

  return tolak('AKSI_TIDAK_DIKENAL', 'Aksi impor tidak dikenal.', 400);
}
