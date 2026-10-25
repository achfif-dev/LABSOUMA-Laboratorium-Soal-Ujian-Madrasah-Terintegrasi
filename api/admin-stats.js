// POST /api/admin-stats: data dasbor admin (pemakaian AI per pengguna, sisa kuota harian). Khusus admin.
// Body {ringkas:true}: hanya dua plafon bersama (murah, dipakai untuk penanda di menu). {semua:true}: sertakan pengguna yang belum memakai AI hari ini.
import { route, authenticateAdmin } from '../src/platform.js';
import { ambilDasbor } from '../src/adminStats.js';

export default route(async (req) => {
  await authenticateAdmin(req);
  const b = (req.body && typeof req.body === 'object') ? req.body : {};
  return ambilDasbor({ semua: b.semua === true, ringkas: b.ringkas === true });
});
