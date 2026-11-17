// Template dan penyesuaian tampilan aplikasi (config/tampilan). Dokumen terpisah dari config/app dan config/alur supaya simpan/reset/pulihkan
// konfigurasi lain tidak menimpanya. Dibaca semua pengguna aktif lewat /api/app-config (aksi "baca"); ditulis admin (aksi "tampilansimpan").
// Seluruh masukan dirapikan oleh normalisasiTampilan (web/lib/tampilan.js): hanya template dan pilihan tetap serta warna #rrggbb yang lolos.
import { firestoreAdmin } from './platform.js';
import { ApiError } from './soalService.js';
import { normalisasiTampilan, TAMPILAN_BAWAAN } from '../web/lib/tampilan.js';

const DOC = 'config/tampilan';
const TTL_MS = 30_000;
let cache = null;
export const invalidateTampilan = () => { cache = null; };

/** Baca pengaturan tampilan. Gagal membaca bukan masalah keamanan: jatuh ke tampilan bawaan. */
export async function bacaTampilan({ now = Date.now() } = {}) {
  if (cache && now - cache.at < TTL_MS) return cache.value;
  try {
    const { db } = await firestoreAdmin();
    const s = await db.doc(DOC).get();
    const value = normalisasiTampilan(s.exists ? s.data().tampilan : null);
    cache = { at: now, value };
    return value;
  } catch (e) {
    console.error('[tampilan] gagal membaca config/tampilan:', String((e && (e.code || e.message)) || e));
    return normalisasiTampilan(TAMPILAN_BAWAAN);
  }
}

export async function simpanTampilan(user, body) {
  if (!body || typeof body !== 'object' || !body.tampilan || typeof body.tampilan !== 'object') throw new ApiError(400, 'BAD_REQUEST', 'Pengaturan tampilan tidak valid.');
  const tampilan = normalisasiTampilan(body.tampilan);
  const { db } = await firestoreAdmin();
  await db.doc(DOC).set({ tampilan, updatedBy: (user && (user.email || user.uid)) || '', updatedAt: new Date().toISOString() });
  invalidateTampilan();
  return tampilan;
}
