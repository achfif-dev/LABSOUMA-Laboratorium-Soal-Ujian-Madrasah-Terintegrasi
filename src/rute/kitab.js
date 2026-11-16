// POST /api/kitab:
//  - tanpa `aksi`: mengambil satu halaman teks kitab dari situs perpustakaan online yang diizinkan (semua peran pemakai alat).
//  - `aksi` berawalan "impor-": impor perpustakaan kitab dari ekspor Syamilah. Khusus admin (src/kitabImpor.js).
//  - `aksi` "impor-ocr": OCR satu halaman PDF pindai dengan AI. Khusus admin, batas laju sendiri (src/kitabOcr.js).
//  - `aksi` "perpus-koreksi" / "perpus-riwayat": mengoreksi teks satu halaman kitab dan melihat riwayatnya. Khusus editor dan admin (src/kitabKoreksi.js).
//  - `aksi` "perpus-nomor" / "perpus-nomor-riwayat": menyesuaikan nomor halaman cetak kitab dengan kitab cetak dan melihat riwayatnya. Khusus editor dan admin (src/kitabNomor.js).
//  - `aksi` "perpus-batas-baca" / "perpus-batas-simpan": draf tanda batas halaman cetak di dalam teks (editor dan admin). "perpus-batas-mulai" / "perpus-batas-tulis": menerapkan draf menjadi halaman baru di ruang baru (admin; src/kitabBatas.js); peralihan memakai "impor-selesai".
//  - `aksi` "perpus-isi-usul" / "perpus-isi-ai" / "perpus-isi-simpan" / "perpus-isi-riwayat": membuat dan menyunting daftar isi kitab. Khusus editor dan admin (src/kitabIsi.js).
//    "perpus-isi-ai" = pemilahan kandidat judul dengan AI, bertahap per jendela halaman; tanpa kuota AI per pengguna, batas laju sendiri (seperti OCR).
//  - `aksi` berawalan "perpus-": membaca perpustakaan untuk pemilih kitab/bab/halaman. Semua peran pemakai alat (src/kitabBaca.js).
// Impor sengaja ada di sini, bukan berkas api/ baru: jumlah fungsi Vercel Hobby dibatasi 12 dan api/ sudah berisi 11.
import { route, authenticateAuthor, authenticateAdmin, authenticateReviewer, enforceRate, kitabLimitsFor, num } from '../platform.js';
import { fetchKitab, DEFAULT_HOSTS } from '../kitabFetch.js';
import { aksiImpor } from '../kitabImpor.js';
import { aksiBaca } from '../kitabBaca.js';
import { validasiIsiAi, validasiIsiUsul } from '../kitabIsi.js';
import { validasiNomor } from '../kitabNomor.js';
import { validasiBatas } from '../kitabBatas.js';
import { aksiOcr, validateFoto } from '../kitabOcr.js';
import { loadAiConfig } from '../aiConfig.js';
import { parseList } from '../access.js';

const LIMIT_IMPOR = { perMinute: 60, perDay: 600 }; // satu kitab = sekitar 10 panggilan
const LIMIT_KOREKSI = { perMinute: 30, perDay: 1500 }; // satu koreksi = satu panggilan; pembatas laju menulis satu dokumen per panggilan
const LIMIT_NOMOR = { perMinute: 10, perDay: num('LIMIT_NOMOR_PER_DAY', 25) }; // satu proses = sampai sekitar 265 penulisan Firestore (kuota tulis Spark), jadi harian lebih ketat dari koreksi
const LIMIT_BATAS_SIMPAN = { perMinute: 20, perDay: num('LIMIT_BATAS_SIMPAN_PER_DAY', 400) }; // draf = satu dokumen per simpan (kuota tulis Spark); layar menyimpan otomatis dengan jeda
const LIMIT_BATAS_TULIS = { perMinute: 20, perDay: num('LIMIT_BATAS_TULIS_PER_DAY', 200) };   // satu panggilan = sampai 100 halaman + indeks; satu kitab = sekitar 7 panggilan
const LIMIT_ISI_AI = { perMinute: num('LIMIT_ISI_AI_PER_MINUTE', 15), perDay: num('LIMIT_ISI_AI_PER_DAY', 600) }; // satu kitab = sekitar 10 sampai 15 panggilan
const LIMIT_ISI_USUL = { perMinute: 6, perDay: num('LIMIT_ISI_USUL_PER_DAY', 20) };   // satu usulan membaca seluruh halaman kitab (ratusan dokumen), jadi lebih ketat

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
  if (aksi === 'perpus-nomor' || aksi === 'perpus-nomor-riwayat') {
    const u = await authenticateReviewer(req);
    if (aksi === 'perpus-nomor') {
      validasiNomor(req.body); // masukan cacat ditolak sebelum menghitung batas laju
      await enforceRate(`${u.uid}_kitabnomor`, LIMIT_NOMOR, { pesanHarian: 'Batas penyesuaian nomor halaman harian tercapai. Lanjutkan besok, atau naikkan LIMIT_NOMOR_PER_DAY di pengaturan server.' });
    }
    return aksiBaca(req.body, { uid: u.uid, role: u.role, nama: u.name || u.email || '' });
  }
  if (aksi === 'perpus-batas-baca' || aksi === 'perpus-batas-simpan') {
    const u = await authenticateReviewer(req);
    if (aksi === 'perpus-batas-simpan') {
      validasiBatas(req.body); // bentuk cacat ditolak sebelum menghitung batas laju
      await enforceRate(`${u.uid}_kitabbatas`, LIMIT_BATAS_SIMPAN, { pesanHarian: 'Batas penyimpanan draf batas halaman harian tercapai. Lanjutkan besok, atau naikkan LIMIT_BATAS_SIMPAN_PER_DAY di pengaturan server.' });
    }
    return aksiBaca(req.body, { uid: u.uid, role: u.role, nama: u.name || u.email || '' });
  }
  if (aksi === 'perpus-batas-mulai' || aksi === 'perpus-batas-tulis') {
    const u = await authenticateAdmin(req);
    await enforceRate(`${u.uid}_kitabbatas${aksi === 'perpus-batas-mulai' ? 'mulai' : 'tulis'}`, aksi === 'perpus-batas-mulai' ? { perMinute: 3, perDay: 10 } : LIMIT_BATAS_TULIS, { pesanHarian: 'Batas penerapan batas halaman cetak harian tercapai. Lanjutkan besok, atau naikkan LIMIT_BATAS_TULIS_PER_DAY di pengaturan server.' });
    return aksiBaca(req.body, { uid: u.uid, role: 'admin', nama: u.name || u.email || '' });
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
    if (aksi === 'perpus-isi-usul') validasiIsiUsul(req.body); // masukan cacat ditolak sebelum menghitung batas laju
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
