// POST /api/generate: menyusun soal baru dengan AI.
import { route, authenticateStaff, enforceRate, aiLimits } from '../src/platform.js';
import { generateSoal, validateInput, getModel } from '../src/soalService.js';

export default route(async (req) => {
  const u = await authenticateStaff(req);
  validateInput(req.body); // tolak input cacat sebelum menghabiskan kuota
  await enforceRate(u.uid, aiLimits());
  return { soal: await generateSoal(req.body), model: getModel() };
});
