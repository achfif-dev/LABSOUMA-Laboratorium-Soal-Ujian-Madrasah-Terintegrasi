// POST /api/backup: pendukung cadangan soal ke Google Drive.
// aksi "info": editor dan admin (Client ID Drive). aksi "pulihkan" dan "bersihriwayat": khusus admin (pulihkan menulis soal dari cadangan; bersihriwayat menghapus riwayat versi milik soal yang sudah dihapus).
import { route, authenticateReviewer, authenticateAdmin, firestoreAdmin } from '../src/platform.js';
import { ApiError } from '../src/soalService.js';
import { infoBackup, pulihkanSoal } from '../src/backup.js';
import { bersihkanRiwayatYatim } from '../src/riwayat.js';

export default route(async (req) => {
  const aksi = req.body && req.body.aksi;
  if (aksi === 'info') { await authenticateReviewer(req); return infoBackup(); }
  if (aksi === 'pulihkan') { const u = await authenticateAdmin(req); return pulihkanSoal(u, req.body); }
  if (aksi === 'bersihriwayat') { await authenticateAdmin(req); const { db } = await firestoreAdmin(); return bersihkanRiwayatYatim(db, { hapus: req.body.hapus === true }); }
  throw new ApiError(400, 'BAD_REQUEST', 'Aksi harus info, pulihkan, atau bersihriwayat.');
});
