// Otoritas kitab di sisi server: kode murni ada di web/lib/otoritas.js (satu sumber dengan klien); di sini pencarian metadata kitab.
// Nilai otoritas SELALU dibaca dari Firestore lewat kitabId, tidak pernah dari isian klien: klien bisa saja berbohong soal status kitab.
import { firestoreAdmin } from './platform.js';
import { validasiKitabId } from './kitabImpor.js';

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

/** Salinan badan permintaan dengan `_kitab` dari server. Selalu menimpa: `_kitab` kiriman klien tidak pernah dipercaya. */
export async function denganKitab(body) {
  const b = body && typeof body === 'object' ? body : {};
  return { ...b, _kitab: await muatKitabOtoritas(b.kitabId) };
}
