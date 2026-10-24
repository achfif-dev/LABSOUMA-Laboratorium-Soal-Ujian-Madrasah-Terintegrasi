// POST /api/assist: terjemah teks, baca foto kitab (fotokitab), analisis teks, telaah dan perbaikan soal, uji jawab buta, saran bab penting, serta bantuan AI Pegon.
import { route, authenticateAuthor, enforceAi, withRefund, aiPool } from '../src/platform.js';
import { loadAiConfig } from '../src/aiConfig.js';
import { muatTingkatKustom } from '../src/appConfig.js';
import { ApiError, validateInput, getModel } from '../src/soalService.js';
import { terjemahTeks, analisisTeks, telaahSoal, validateTeks } from '../src/assistService.js';
import { cekButa } from '../src/cekButa.js';
import { sarankanBab, validateBab } from '../src/babService.js';
import { perkuatPegon, fotoPegon, validatePegon, validateFoto } from '../src/pegonService.js';
import { fotoKitab } from '../src/fotoKitab.js';
import { periksaKutipan, bidangDariAI, bidangDariSoal } from '../src/kutipan.js';
import { periksaSikap } from '../src/sikap.js';

const ASSIST = {
  terjemah: terjemahTeks,
  analisis: analisisTeks,
  telaah: telaahSoal,
  cekbuta: (body) => { const v = validateInput(body); return cekButa(body.soal, v.teks, { tingkat: body.tingkat, bentuk: v.bentuk }); },
  pegon: perkuatPegon,
  pegonfoto: fotoPegon,
  fotokitab: fotoKitab, // OCR teks Arab dari foto halaman kitab fisik
  bab: sarankanBab, // saran bab penting untuk diujikan (haluan Aswaja); daftar isi opsional, bukan teks Arab wajib
};

export default route(async (req) => {
  const u = await authenticateAuthor(req);
  const aksi = req.body && req.body.aksi;
  const run = Object.hasOwn(ASSIST, aksi) ? ASSIST[aksi] : null;
  if (!run) throw new ApiError(400, 'BAD_REQUEST', 'Aksi harus terjemah, analisis, telaah, cekbuta, bab, pegon, pegonfoto, atau fotokitab.');
  await muatTingkatKustom(); // tingkat buatan admin ikut dikenali validasi
  let teks;
  if (aksi === 'pegon') validatePegon(req.body); // teks Latin, bukan Arab: jangan lewat validateTeks
  else if (aksi === 'pegonfoto' || aksi === 'fotokitab') validateFoto(req.body);
  else if (aksi === 'bab') validateBab(req.body); // nama kitab + daftar isi (Arab atau Latin); tolak input cacat sebelum menghabiskan kuota
  else if (aksi === 'telaah' || aksi === 'cekbuta') teks = validateInput(req.body).teks; else teks = validateTeks(req.body).teks;
  await loadAiConfig(); // pengaturan AI dari admin (kunci, model, penyedia); sebelum menghitung kuota
  await enforceAi(u.uid, u.role);
  const hasil = await withRefund(u.uid, () => run(req.body), [aiPool(u.role).id]); // gagal di sisi server/AI: kuota dikembalikan
  if (aksi === 'telaah') {
    // Gratis, tanpa AI: periksa kutipan pada naskah asli dan pada perbaikan dari AI.
    hasil.verifikasi_naskah = periksaKutipan(bidangDariSoal(req.body.soal), teks);
    hasil.verifikasi_perbaikan = periksaKutipan(bidangDariAI(hasil.perbaikan), teks);
    hasil.sikap_perbaikan = periksaSikap(bidangDariAI(hasil.perbaikan));
  }
  return { aksi, hasil, model: getModel() };
});
