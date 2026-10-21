// POST /api/session: membuat atau menyegarkan profil pengguna setelah login Google.
import { route, authenticate, ensureProfile } from '../src/platform.js';

export default route(async (req) => {
  await ensureProfile(await authenticate(req));
  return { ok: true };
});
