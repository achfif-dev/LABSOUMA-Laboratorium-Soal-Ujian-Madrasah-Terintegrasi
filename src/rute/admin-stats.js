// POST /api/admin-stats: data dasbor admin (pemakaian AI per pengguna, sisa kuota harian). Khusus admin.
// Body {ringkas:true}: hanya dua plafon bersama (murah, dipakai untuk penanda di menu). {semua:true}: sertakan pengguna yang belum memakai AI hari ini.
// Hasil disimpan di memori instance beberapa detik: dasbor penuh memindai dokumen rate hari ini (+ users), jadi banyak
// penyegaran/tab terbuka tidak boleh melipatgandakan pembacaan. Body {segarkan:true} melewati cache (tombol Muat ulang).
import { route, authenticateAdmin } from '../platform.js';
import { ambilDasbor } from '../adminStats.js';

export const TTL_DASBOR_MS = { ringkas: 5 * 60 * 1000, penuh: 90 * 1000 };
const cache = new Map(); // 'ringkas' | 'penuh' | 'semua' -> { at, value }
export const kosongkanCacheDasbor = () => cache.clear();

export default route(async (req) => {
  await authenticateAdmin(req);
  const b = (req.body && typeof req.body === 'object') ? req.body : {};
  const mode = b.ringkas === true ? 'ringkas' : (b.semua === true ? 'semua' : 'penuh');
  const now = Date.now();
  const c = cache.get(mode);
  if (b.segarkan !== true && c && now - c.at < (mode === 'ringkas' ? TTL_DASBOR_MS.ringkas : TTL_DASBOR_MS.penuh)) return c.value;
  const value = await ambilDasbor({ semua: b.semua === true, ringkas: b.ringkas === true, now });
  cache.set(mode, { at: now, value });
  return value;
});
