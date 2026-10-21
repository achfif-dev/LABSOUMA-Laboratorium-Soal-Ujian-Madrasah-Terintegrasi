// POST /api/generate: menyusun soal baru dengan AI.
import { route, authenticateStaff, enforceRate, aiLimits } from '../src/platform.js';
import { generateSoal, validateInput, getModel } from '../src/soalService.js';
import { periksaKutipan, bidangDariAI } from '../src/kutipan.js';

export default route(async (req) => {
  const u = await authenticateStaff(req);
  const input = validateInput(req.body); // tolak input cacat sebelum menghabiskan kuota
  await enforceRate(u.uid, aiLimits());
  const soal = await generateSoal(req.body);
  // Gratis, tanpa AI: cocokkan kutipan Arab pada soal dengan teks kitab yang dikirim.
  return { soal, model: getModel(), verifikasi: periksaKutipan(bidangDariAI(soal), input.teks) };
});
