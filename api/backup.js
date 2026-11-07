// POST /api/backup: pendukung cadangan soal ke Google Drive.
// aksi "info": editor dan admin (Client ID Drive). aksi "hitung": editor dan admin (jumlah soal, untuk cadangan inkremental). aksi "pulihkan", "bersihriwayat", dan "pangkasriwayat": khusus admin (pulihkan menulis soal dari cadangan; bersihriwayat menghapus riwayat versi milik soal yang sudah dihapus).
import { route, authenticateReviewer, authenticateAdmin, firestoreAdmin } from '../src/platform.js';
import { ApiError } from '../src/soalService.js';
import { infoBackup, pulihkanSoal, hitungSoal } from '../src/backup.js';
import { bersihkanRiwayatYatim, pangkasRiwayat } from '../src/riwayat.js';

export default route(async (req) => {
  const aksi = req.body && req.body.aksi;
  if (aksi === 'info') { await authenticateReviewer(req); return infoBackup(); }
  if (aksi === 'pulihkan') { const u = await authenticateAdmin(req); return pulihkanSoal(u, req.body); }
  if (aksi === 'bersihriwayat') { await authenticateAdmin(req); const { db } = await firestoreAdmin(); return bersihkanRiwayatYatim(db, { hapus: req.body.hapus === true }); }
  if (aksi === 'pangkasriwayat') { await authenticateAdmin(req); const { db } = await firestoreAdmin(); return pangkasRiwayat(db, { simpan: req.body.simpan, hapus: req.body.hapus === true }); }
  if (aksi === 'hitung') { await authenticateReviewer(req); return hitungSoal(); }
  throw new ApiError(400, 'BAD_REQUEST', 'Aksi harus info, hitung, pulihkan, bersihriwayat, atau pangkasriwayat.');
});
