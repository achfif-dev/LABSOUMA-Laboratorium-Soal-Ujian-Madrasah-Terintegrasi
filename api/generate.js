// POST /api/generate: menyusun soal baru dengan AI.
import { route, authenticateStaff, enforceAi, withRefund, GLOBAL_AI_ID } from '../src/platform.js';
import { loadAiConfig } from '../src/aiConfig.js';
import { muatTingkatKustom } from '../src/appConfig.js';
import { generateSoal, validateInput, getModel } from '../src/soalService.js';
import { periksaKutipan, bidangDariAI } from '../src/kutipan.js';
import { periksaSikap } from '../src/sikap.js';

export default route(async (req) => {
  const u = await authenticateStaff(req);
  await muatTingkatKustom(); // tingkat buatan admin ikut dikenali validasi
  const input = validateInput(req.body); // tolak input cacat sebelum menghabiskan kuota
  await loadAiConfig(); // pengaturan AI dari admin (kunci, model, penyedia); sebelum menghitung kuota
  await enforceAi(u.uid); // batas per pengguna + plafon harian seluruh madrasah
  const soal = await withRefund(u.uid, () => generateSoal(req.body), [GLOBAL_AI_ID]); // gagal di sisi server/AI: kuota dikembalikan
  // Gratis, tanpa AI: cocokkan kutipan Arab dan periksa nada soal. Uji jawab buta dipanggil klien lewat /api/assist (aksi cekbuta).
  const bidang = bidangDariAI(soal);
  return { soal, model: getModel(), verifikasi: periksaKutipan(bidang, input.teks), sikap: periksaSikap(bidang) };
});
