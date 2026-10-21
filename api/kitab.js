// POST /api/kitab: mengambil satu halaman teks kitab dari situs perpustakaan online yang diizinkan.
import { route, authenticateStaff, enforceRate, kitabLimits } from '../src/platform.js';
import { fetchKitab, DEFAULT_HOSTS } from '../src/kitabFetch.js';
import { parseList } from '../src/access.js';

export default route(async (req) => {
  const u = await authenticateStaff(req);
  await enforceRate(`${u.uid}_kitab`, kitabLimits());
  const hosts = parseList(process.env.KITAB_ALLOWED_HOSTS) ;
  const sumber = await fetchKitab(req.body && req.body.url, { allowedHosts: hosts.length ? hosts : DEFAULT_HOSTS });
  return { sumber };
});
