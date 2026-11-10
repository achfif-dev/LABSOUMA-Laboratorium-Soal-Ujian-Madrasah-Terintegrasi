// Otoritas kitab di sisi server: kode murni ada di web/lib/otoritas.js (satu sumber dengan klien); di sini pencarian metadata kitab.
// Nilai otoritas SELALU dibaca dari Firestore lewat kitabId, tidak pernah dari isian klien: klien bisa saja berbohong soal status kitab.
import { firestoreAdmin } from './platform.js';
import { validasiKitabId, dokDaftarIsi } from './kitabImpor.js';

export * from '../web/lib/otoritas.js';

/**
 * Metadata kitab untuk prompt, atau null (id kosong/cacat/tidak ada, atau Firestore gagal).
 * Sengaja tidak melempar: soal tetap bisa dibuat dari teks tempelan, hanya tanpa arahan otoritas.
 */
export async function muatKitabOtoritas(kitabId) {
  if (typeof kitabId !== 'string' || !kitabId) return null;
  let kid;
  try { kid = validasiKitabId(kitabId); } catch { return null; }
  try {
    const { db } = await firestoreAdmin();
    const snap = await db.doc(`kitab/${kid}`).get();
    if (!snap.exists) return null;
    const d = snap.data();
    return { id: kid, judul: d.judul, judulLatin: d.judulLatin, pengarang: d.pengarang, wafatH: d.wafatH, fan: d.fan, mazhab: d.mazhab, otoritas: d.otoritas };
  } catch { return null; }
}

/**
 * Daftar isi kitab (judul, level, juz, hal) untuk peta bab di prompt cakupan, atau []. Seperti muatKitabOtoritas: tidak melempar.
 * Hanya dipanggil bila permintaan membawa cakupan, jadi permintaan tanpa cakupan tidak menambah pembacaan Firestore.
 */
export async function muatPetaIsi(kitabId) {
  if (typeof kitabId !== 'string' || !kitabId) return [];
  try {
    const kid = validasiKitabId(kitabId);
    const { db } = await firestoreAdmin();
    const meta = await db.doc(`kitab/${kid}`).get();
    if (!meta.exists) return [];
    const isi = await db.doc(dokDaftarIsi(kid, meta.data())).get();
    const entri = isi.exists && Array.isArray(isi.data().entri) ? isi.data().entri : [];
    return entri.filter((e) => e && typeof e.judul === 'string').slice(0, 400).map((e) => ({ judul: e.judul, level: e.level, juz: e.juz, hal: e.hal }));
  } catch { return []; }
}

/** Salinan badan permintaan dengan `_kitab` (dan `_isi` bila ada cakupan) dari server. Selalu menimpa: kiriman klien tidak pernah dipercaya. */
export async function denganKitab(body) {
  const b = body && typeof body === 'object' ? body : {};
  return { ...b, _kitab: await muatKitabOtoritas(b.kitabId), _isi: b.cakupan ? await muatPetaIsi(b.kitabId) : [] };
}
