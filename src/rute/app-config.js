// POST /api/app-config: konfigurasi aplikasi (tingkat, mata pelajaran, katalog kitab).
// aksi "baca": semua pengguna aktif (menyertakan pengaturan alur editor). aksi "simpan", "reset", "alursimpan", dan "tampilansimpan": khusus admin.
import { route, authenticateAuthor, authenticateAdmin } from '../platform.js';
import { ApiError } from '../soalService.js';
import { bacaAplikasi, simpanApp, resetApp } from '../appConfig.js';
import { bacaAlur, simpanAlur } from '../alurEditor.js';
import { bacaTampilan, simpanTampilan } from '../tampilan.js';

export default route(async (req) => {
  const aksi = req.body && req.body.aksi;
  const u = aksi === 'baca' ? await authenticateAuthor(req) : await authenticateAdmin(req);
  if (aksi === 'baca') return { ...(await bacaAplikasi()), alur: await bacaAlur(), tampilan: await bacaTampilan() };
  if (aksi === 'tampilansimpan') return { tampilan: await simpanTampilan(u, req.body) };
  if (aksi === 'alursimpan') return { alur: await simpanAlur(u, req.body) };
  if (aksi === 'simpan') return simpanApp(u, req.body);
  if (aksi === 'reset') return resetApp();
  throw new ApiError(400, 'BAD_REQUEST', 'Aksi harus baca, simpan, reset, alursimpan, atau tampilansimpan.');
});
