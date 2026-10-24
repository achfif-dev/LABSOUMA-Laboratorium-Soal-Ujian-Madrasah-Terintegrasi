// POST /api/app-config: konfigurasi aplikasi (tingkat, mata pelajaran, katalog kitab).
// aksi "baca": semua pengguna aktif. aksi "simpan" dan "reset": khusus admin.
import { route, authenticateAuthor, authenticateAdmin } from '../src/platform.js';
import { ApiError } from '../src/soalService.js';
import { bacaAplikasi, simpanApp, resetApp } from '../src/appConfig.js';

export default route(async (req) => {
  const aksi = req.body && req.body.aksi;
  const u = aksi === 'baca' ? await authenticateAuthor(req) : await authenticateAdmin(req);
  if (aksi === 'baca') return bacaAplikasi();
  if (aksi === 'simpan') return simpanApp(u, req.body);
  if (aksi === 'reset') return resetApp();
  throw new ApiError(400, 'BAD_REQUEST', 'Aksi harus baca, simpan, atau reset.');
});
