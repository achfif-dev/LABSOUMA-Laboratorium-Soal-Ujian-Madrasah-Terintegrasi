// POST /api/kitab:
//  - tanpa `aksi`: mengambil satu halaman teks kitab dari situs perpustakaan online yang diizinkan (semua peran pemakai alat).
//  - `aksi` berawalan "impor-": impor perpustakaan kitab dari ekspor Syamilah. Khusus admin (src/kitabImpor.js).
//  - `aksi` berawalan "perpus-": membaca perpustakaan untuk pemilih kitab/bab/halaman. Semua peran pemakai alat (src/kitabBaca.js).
// Impor sengaja ada di sini, bukan berkas api/ baru: jumlah fungsi Vercel Hobby dibatasi 12 dan api/ sudah berisi 11.
import { route, authenticateAuthor, authenticateAdmin, enforceRate, kitabLimitsFor } from '../src/platform.js';
import { fetchKitab, DEFAULT_HOSTS } from '../src/kitabFetch.js';
import { aksiImpor } from '../src/kitabImpor.js';
import { aksiBaca } from '../src/kitabBaca.js';
import { parseList } from '../src/access.js';

const LIMIT_IMPOR = { perMinute: 60, perDay: 600 }; // satu kitab = sekitar 10 panggilan

export default route(async (req) => {
  const aksi = req.body && typeof req.body === 'object' ? req.body.aksi : undefined;
  if (typeof aksi === 'string' && aksi.startsWith('impor-')) {
    const u = await authenticateAdmin(req);
    await enforceRate(`${u.uid}_kitabimpor`, LIMIT_IMPOR);
    return aksiImpor(req.body, u.uid);
  }
  if (typeof aksi === 'string' && aksi.startsWith('perpus-')) {
    await authenticateAuthor(req);
    return aksiBaca(req.body);
  }
  const u = await authenticateAuthor(req);
  await enforceRate(`${u.uid}_kitab`, kitabLimitsFor(u.role));
  const hosts = parseList(process.env.KITAB_ALLOWED_HOSTS) ;
  const sumber = await fetchKitab(req.body && req.body.url, { allowedHosts: hosts.length ? hosts : DEFAULT_HOSTS });
  return { sumber };
});
