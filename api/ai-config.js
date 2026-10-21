// POST /api/ai-config (khusus admin): lihat, ubah, dan uji pengaturan AI (penyedia, model, kunci API).
import { route, authenticateAdmin, enforceRate } from '../src/platform.js';
import { ApiError } from '../src/soalService.js';
import { statusAi, simpanAi, ujiAi } from '../src/aiConfig.js';

export default route(async (req) => {
  const u = await authenticateAdmin(req);
  const aksi = req.body && req.body.aksi;
  if (aksi === 'status') return statusAi();
  if (aksi === 'simpan') return simpanAi(u, req.body);
  if (aksi === 'uji') {
    await enforceRate(`${u.uid}_uji`, { perMinute: 3, perDay: 20 });
    return ujiAi();
  }
  throw new ApiError(400, 'BAD_REQUEST', 'Aksi harus status, simpan, atau uji.');
});
