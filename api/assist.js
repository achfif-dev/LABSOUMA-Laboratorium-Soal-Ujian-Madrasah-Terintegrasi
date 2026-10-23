// POST /api/assist: terjemah teks, analisis teks, telaah dan perbaikan soal, uji jawab buta, saran bab penting, serta bantuan AI Pegon.
import { route, authenticateStaff, enforceAi, withRefund, GLOBAL_AI_ID } from '../src/platform.js';
import { loadAiConfig } from '../src/aiConfig.js';
import { muatTingkatKustom } from '../src/appConfig.js';
import { ApiError, validateInput, getModel } from '../src/soalService.js';
import { terjemahTeks, analisisTeks, telaahSoal, validateTeks } from '../src/assistService.js';
import { cekButa } from '../src/cekButa.js';
import { sarankanBab, validateBab } from '../src/babService.js';
import { perkuatPegon, fotoPegon, validatePegon, validateFoto } from '../src/pegonService.js';
import { periksaKutipan, bidangDariAI, bidangDariSoal } from '../src/kutipan.js';
import { periksaSikap } from '../src/sikap.js';

const ASSIST = {
  terjemah: terjemahTeks,
  analisis: analisisTeks,
  telaah: telaahSoal,
  cekbuta: (body) => cekButa(body.soal, validateInput(body).teks, { tingkat: body.tingkat }),
  pegon: perkuatPegon,
  pegonfoto: fotoPegon,
  bab: sarankanBab, // saran bab penting untuk diujikan (haluan Aswaja); daftar isi opsional, bukan teks Arab wajib
};

export default route(async (req) => {
  const u = await authenticateStaff(req);
  const aksi = req.body && req.body.aksi;
  const run = Object.hasOwn(ASSIST, aksi) ? ASSIST[aksi] : null;
  if (!run) throw new ApiError(400, 'BAD_REQUEST', 'Aksi harus terjemah, analisis, telaah, cekbuta, bab, pegon, atau pegonfoto.');
  await muatTingkatKustom(); // tingkat buatan admin ikut dikenali validasi
  let teks;
  if (aksi === 'pegon') validatePegon(req.body); // teks Latin, bukan Arab: jangan lewat validateTeks
  else if (aksi === 'pegonfoto') validateFoto(req.body);
  else if (aksi === 'bab') validateBab(req.body); // nama kitab + daftar isi (Arab atau Latin); tolak input cacat sebelum menghabiskan kuota
  else if (aksi === 'telaah' || aksi === 'cekbuta') teks = validateInput(req.body).teks; else teks = validateTeks(req.body).teks;
  await loadAiConfig(); // pengaturan AI dari admin (kunci, model, penyedia); sebelum menghitung kuota
  await enforceAi(u.uid);
  const hasil = await withRefund(u.uid, () => run(req.body), [GLOBAL_AI_ID]); // gagal di sisi server/AI: kuota dikembalikan
  if (aksi === 'telaah') {
    // Gratis, tanpa AI: periksa kutipan pada naskah asli dan pada perbaikan dari AI.
    hasil.verifikasi_naskah = periksaKutipan(bidangDariSoal(req.body.soal), teks);
    hasil.verifikasi_perbaikan = periksaKutipan(bidangDariAI(hasil.perbaikan), teks);
    hasil.sikap_perbaikan = periksaSikap(bidangDariAI(hasil.perbaikan));
  }
  return { aksi, hasil, model: getModel() };
});
