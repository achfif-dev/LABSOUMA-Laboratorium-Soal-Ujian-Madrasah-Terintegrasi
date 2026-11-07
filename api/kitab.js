// POST /api/kitab:
//  - tanpa `aksi`: mengambil satu halaman teks kitab dari situs perpustakaan online yang diizinkan (semua peran pemakai alat).
//  - `aksi` berawalan "impor-": impor perpustakaan kitab dari ekspor Syamilah. Khusus admin (src/kitabImpor.js).
//  - `aksi` "impor-ocr": OCR satu halaman PDF pindai dengan AI. Khusus admin, batas laju sendiri (src/kitabOcr.js).
//  - `aksi` "perpus-koreksi" / "perpus-riwayat": mengoreksi teks satu halaman kitab dan melihat riwayatnya. Khusus editor dan admin (src/kitabKoreksi.js).
//  - `aksi` "perpus-isi-usul" / "perpus-isi-ai" / "perpus-isi-simpan" / "perpus-isi-riwayat": membuat dan menyunting daftar isi kitab. Khusus editor dan admin (src/kitabIsi.js).
//    "perpus-isi-ai" = pemilahan kandidat judul dengan AI, bertahap per jendela halaman; tanpa kuota AI per pengguna, batas laju sendiri (seperti OCR).
//  - `aksi` berawalan "perpus-": membaca perpustakaan untuk pemilih kitab/bab/halaman. Semua peran pemakai alat (src/kitabBaca.js).
// Impor sengaja ada di sini, bukan berkas api/ baru: jumlah fungsi Vercel Hobby dibatasi 12 dan api/ sudah berisi 11.
import { route, authenticateAuthor, authenticateAdmin, authenticateReviewer, enforceRate, kitabLimitsFor, num } from '../src/platform.js';
import { fetchKitab, DEFAULT_HOSTS } from '../src/kitabFetch.js';
import { aksiImpor } from '../src/kitabImpor.js';
import { aksiBaca } from '../src/kitabBaca.js';
import { validasiIsiAi } from '../src/kitabIsi.js';
import { aksiOcr, validateFoto } from '../src/kitabOcr.js';
import { loadAiConfig } from '../src/aiConfig.js';
import { parseList } from '../src/access.js';

const LIMIT_IMPOR = { perMinute: 60, perDay: 600 }; // satu kitab = sekitar 10 panggilan
const LIMIT_KOREKSI = { perMinute: 30, perDay: 1500 }; // satu koreksi = satu panggilan; pembatas laju menulis satu dokumen per panggilan
const LIMIT_ISI_AI = { perMinute: num('LIMIT_ISI_AI_PER_MINUTE', 15), perDay: num('LIMIT_ISI_AI_PER_DAY', 600) }; // satu kitab = sekitar 10 sampai 15 panggilan
const LIMIT_ISI_USUL = { perMinute: 6, perDay: 100 };   // satu usulan membaca seluruh halaman kitab (ratusan dokumen), jadi lebih ketat

export default route(async (req) => {
  const aksi = req.body && typeof req.body === 'object' ? req.body.aksi : undefined;
  if (aksi === 'impor-ocr') {
    const u = await authenticateAdmin(req);
    validateFoto(req.body); // tolak gambar cacat sebelum menghitung batas laju
    await enforceRate(`${u.uid}_kitabocr`, { perMinute: num('LIMIT_OCR_PER_MINUTE', 20), perDay: num('LIMIT_OCR_PER_DAY', 1500) }, { pesanHarian: 'Batas OCR harian tercapai. Lanjutkan besok, atau naikkan LIMIT_OCR_PER_DAY di pengaturan server.' });
    await loadAiConfig(); // kunci, model, dan penyedia AI dari Konfigurasi admin
    return aksiOcr(req.body);
  }
  if (typeof aksi === 'string' && aksi.startsWith('impor-')) {
    const u = await authenticateAdmin(req);
    await enforceRate(`${u.uid}_kitabimpor`, LIMIT_IMPOR);
    return aksiImpor(req.body, u.uid);
  }
  if (aksi === 'perpus-koreksi' || aksi === 'perpus-riwayat') {
    const u = await authenticateReviewer(req);
    if (aksi === 'perpus-koreksi') await enforceRate(`${u.uid}_kitabkoreksi`, LIMIT_KOREKSI, { pesanHarian: 'Batas koreksi kitab harian tercapai. Lanjutkan besok.' });
    return aksiBaca(req.body, { uid: u.uid, role: u.role, nama: u.name || u.email || '' });
  }
  if (aksi === 'perpus-isi-ai') {
    const u = await authenticateReviewer(req);
    validasiIsiAi(req.body); // tolak masukan cacat sebelum menghitung batas laju
    await enforceRate(`${u.uid}_kitabisiai`, LIMIT_ISI_AI, { pesanHarian: 'Batas pemilahan daftar isi dengan AI harian tercapai. Lanjutkan besok, atau naikkan LIMIT_ISI_AI_PER_DAY di pengaturan server.' });
    await loadAiConfig(); // kunci, model, dan penyedia AI dari Konfigurasi admin
    return aksiBaca(req.body, { uid: u.uid, role: u.role, nama: u.name || u.email || '' });
  }
  if (aksi === 'perpus-isi-usul' || aksi === 'perpus-isi-simpan' || aksi === 'perpus-isi-riwayat') {
    const u = await authenticateReviewer(req);
    if (aksi === 'perpus-isi-usul') await enforceRate(`${u.uid}_kitabisiusul`, LIMIT_ISI_USUL, { pesanHarian: 'Batas usulan daftar isi harian tercapai. Lanjutkan besok.' });
    if (aksi === 'perpus-isi-simpan') await enforceRate(`${u.uid}_kitabisi`, LIMIT_KOREKSI, { pesanHarian: 'Batas penyuntingan daftar isi harian tercapai. Lanjutkan besok.' });
    return aksiBaca(req.body, { uid: u.uid, role: u.role, nama: u.name || u.email || '' });
  }
  if (typeof aksi === 'string' && aksi.startsWith('perpus-')) {
    await authenticateAuthor(req);
    return aksiBaca(req.body);
  }
  const u = await authenticateAuthor(req);
  await enforceRate(`${u.uid}_kitab`, kitabLimitsFor(u.role));
  const hosts = parseList(process.env.KITAB_ALLOWED_HOSTS) ;
  const sumber = await fetchKitab(req.body && req.body.url, { allowedHosts: hosts.length ? hosts : DEFAULT_HOSTS });
  return { sumber };
});
