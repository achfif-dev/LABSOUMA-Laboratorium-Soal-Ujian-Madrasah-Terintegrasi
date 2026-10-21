// POST /api/assist: terjemah teks, analisis teks, telaah dan perbaikan soal.
import { route, authenticateStaff, enforceRate, aiLimits } from '../src/platform.js';
import { loadAiConfig } from '../src/aiConfig.js';
import { ApiError, validateInput, getModel } from '../src/soalService.js';
import { terjemahTeks, analisisTeks, telaahSoal, validateTeks } from '../src/assistService.js';
import { periksaKutipan, bidangDariAI, bidangDariSoal } from '../src/kutipan.js';

const ASSIST = { terjemah: terjemahTeks, analisis: analisisTeks, telaah: telaahSoal };

export default route(async (req) => {
  const u = await authenticateStaff(req);
  const aksi = req.body && req.body.aksi;
  const run = ASSIST[aksi];
  if (!run) throw new ApiError(400, 'BAD_REQUEST', 'Aksi harus terjemah, analisis, atau telaah.');
  let teks;
  if (aksi === 'telaah') teks = validateInput(req.body).teks; else teks = validateTeks(req.body).teks;
  await loadAiConfig(); // pengaturan AI dari admin (kunci, model, penyedia); sebelum menghitung kuota
  await enforceRate(u.uid, aiLimits());
  const hasil = await run(req.body);
  if (aksi === 'telaah') {
    // Gratis, tanpa AI: periksa kutipan pada naskah asli dan pada perbaikan dari AI.
    hasil.verifikasi_naskah = periksaKutipan(bidangDariSoal(req.body.soal), teks);
    hasil.verifikasi_perbaikan = periksaKutipan(bidangDariAI(hasil.perbaikan), teks);
  }
  return { aksi, hasil, model: getModel() };
});
