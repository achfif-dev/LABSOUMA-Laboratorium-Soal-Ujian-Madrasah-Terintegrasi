// POST /api/session: membuat atau menyegarkan profil pengguna setelah login Google.
// Dibatasi per pengguna: setiap panggilan menulis ke Firestore (lastLoginAt), jadi tanpa batas satu akun bisa
// menghabiskan kuota tulis harian dan melumpuhkan semua pengguna.
import { route, authenticate, ensureProfile, enforceRate, num } from '../src/platform.js';

export const sessionLimits = () => ({ perMinute: num('LIMIT_SESSION_PER_MINUTE', 6), perDay: num('LIMIT_SESSION_PER_DAY', 200) });

export default route(async (req) => {
  const u = await authenticate(req);
  await enforceRate(`${u.uid}_session`, sessionLimits(), { pesanHarian: 'Terlalu banyak permintaan masuk hari ini. Coba lagi besok.' });
  await ensureProfile(u);
  return { ok: true };
});
