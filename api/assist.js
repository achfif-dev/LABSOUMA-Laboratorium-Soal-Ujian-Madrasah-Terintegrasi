// POST /api/assist: terjemah teks, analisis teks, telaah dan perbaikan soal.
import { route, authenticateStaff, enforceRate, aiLimits } from '../src/platform.js';
import { ApiError, validateInput, getModel } from '../src/soalService.js';
import { terjemahTeks, analisisTeks, telaahSoal, validateTeks } from '../src/assistService.js';

const ASSIST = { terjemah: terjemahTeks, analisis: analisisTeks, telaah: telaahSoal };

export default route(async (req) => {
  const u = await authenticateStaff(req);
  const aksi = req.body && req.body.aksi;
  const run = ASSIST[aksi];
  if (!run) throw new ApiError(400, 'BAD_REQUEST', 'Aksi harus terjemah, analisis, atau telaah.');
  if (aksi === 'telaah') validateInput(req.body); else validateTeks(req.body);
  await enforceRate(u.uid, aiLimits());
  return { aksi, hasil: await run(req.body), model: getModel() };
});
