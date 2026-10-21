// GET /api/config: konfigurasi web Firebase (bersifat publik) dari environment variable.
import { route } from '../src/platform.js';
import { ApiError } from '../src/soalService.js';

export default route(async () => {
  let cfg;
  try { cfg = JSON.parse(process.env.FIREBASE_WEB_CONFIG || ''); } catch { cfg = null; }
  if (!cfg || !cfg.apiKey || !cfg.projectId) {
    throw new ApiError(500, 'SERVER_NOT_CONFIGURED', 'FIREBASE_WEB_CONFIG belum diisi atau bukan JSON yang valid.');
  }
  return cfg;
}, { method: 'GET' });
