// POST /api/drive-client: Client ID OAuth Google Drive (bersifat publik) untuk semua peran pemakai alat AI, termasuk Ustadz.
// Dipisah dari /api/backup (khusus editor/admin) agar Ustadz tidak mendapat akses ke cadangan bank soal atau pemulihan.
import { route, authenticateAuthor } from '../src/platform.js';

export default route(async (req) => {
  await authenticateAuthor(req);
  return { driveClientId: String(process.env.GOOGLE_DRIVE_CLIENT_ID || '').trim() };
});
