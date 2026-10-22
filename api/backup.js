// POST /api/backup: pendukung cadangan soal ke Google Drive.
// aksi "info": editor dan admin (Client ID Drive). aksi "pulihkan": khusus admin (menulis soal dari cadangan lewat Admin SDK).
import { route, authenticateReviewer, authenticateAdmin } from '../src/platform.js';
import { ApiError } from '../src/soalService.js';
import { infoBackup, pulihkanSoal } from '../src/backup.js';

export default route(async (req) => {
  const aksi = req.body && req.body.aksi;
  if (aksi === 'info') { await authenticateReviewer(req); return infoBackup(); }
  if (aksi === 'pulihkan') { const u = await authenticateAdmin(req); return pulihkanSoal(u, req.body); }
  throw new ApiError(400, 'BAD_REQUEST', 'Aksi harus info atau pulihkan.');
});
