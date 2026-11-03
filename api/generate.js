// POST /api/generate: menyusun soal baru dengan AI.
import { route, authenticateAuthor, enforceAi, withRefund, aiPool } from '../src/platform.js';
import { loadAiConfig } from '../src/aiConfig.js';
import { muatTingkatKustom } from '../src/appConfig.js';
import { generateSoal, validateInput, getModel } from '../src/soalService.js';
import { periksaKutipan, bidangDariAI } from '../src/kutipan.js';
import { periksaSikap } from '../src/sikap.js';
import { denganKitab, peringatanOtoritas } from '../src/otoritas.js';

export default route(async (req) => {
  const u = await authenticateAuthor(req);
  await muatTingkatKustom(); // tingkat buatan admin ikut dikenali validasi
  const body = await denganKitab(req.body); // otoritas kitab dibaca server dari perpustakaan lewat kitabId; isian klien tidak dipercaya
  const input = validateInput(body); // tolak input cacat sebelum menghabiskan kuota
  await loadAiConfig(); // pengaturan AI dari admin (kunci, model, penyedia); sebelum menghitung kuota
  await enforceAi(u.uid, u.role); // batas per pengguna + plafon harian seluruh madrasah
  const soal = await withRefund(u.uid, () => generateSoal(body), [aiPool(u.role).id]); // gagal di sisi server/AI: kuota dikembalikan
  // Gratis, tanpa AI: cocokkan kutipan Arab dan periksa nada soal. Uji jawab buta dipanggil klien lewat /api/assist (aksi cekbuta).
  const bidang = bidangDariAI(soal);
  return { soal, model: getModel(), verifikasi: periksaKutipan(bidang, input.teks), sikap: periksaSikap(bidang), peringatanOtoritas: peringatanOtoritas(body._kitab) };
});
