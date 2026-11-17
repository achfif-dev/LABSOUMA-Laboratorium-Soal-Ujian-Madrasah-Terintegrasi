// POST /api/soal-luar: Bank Soal Manual (naskah Dauri yang disusun dan diverifikasi di luar aplikasi), src/soalLuarService.js.
//  - aksi "kisi"   : analisis kisi-kisi dengan AI untuk satu kelompok butir (penyusun, editor, admin; memakai kuota AI tim).
//  - aksi "simpan" : simpan naskah beserta pernyataan verifikasi luar. Hanya editor dan admin (yang berwenang menyatakan verifikasi).
//  - aksi "kisi-simpan": ubah level, bab, dan indikator naskah tersimpan (pencatatnya atau admin).
//  - aksi "hapus"  : hapus naskah beserta salinan aslinya (pencatatnya atau admin).
//  - aksi "pulihkan": pulihkan satu naskah dari cadangan Drive (khusus admin).
// Pembacaan daftar naskah lewat Firestore langsung (aturan: semua staf boleh membaca, tidak ada yang boleh menulis dari klien).
import { route, authenticateAuthor, authenticateReviewer, authenticateAdmin, enforceAi, enforceRate, withRefund, aiPool, firestoreAdmin, num } from '../platform.js';
import { loadAiConfig } from '../aiConfig.js';
import { ApiError, getModel } from '../soalService.js';
import { analisisKisi, validasiKisi, simpanPaket, ubahKisi, hapusPaket, pulihkanNaskah } from '../soalLuarService.js';

export default route(async (req) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const aksi = body.aksi;
  if (aksi === 'kisi') {
    const u = await authenticateAuthor(req);
    if (u.role === 'ustadz') throw new ApiError(403, 'FORBIDDEN_ROLE', 'Bank Soal Manual tidak tersedia untuk peran Ustadz.');
    validasiKisi(body); // tolak masukan cacat sebelum menghabiskan kuota AI
    await loadAiConfig();
    await enforceAi(u.uid, u.role);
    const hasil = await withRefund(u.uid, () => analisisKisi(body), [aiPool(u.role).id]);
    return { aksi, hasil, model: getModel() };
  }
  if (aksi === 'simpan' || aksi === 'kisi-simpan' || aksi === 'hapus') {
    const u = await authenticateReviewer(req);
    await enforceRate(`${u.uid}_soalluar`, { perMinute: num('LIMIT_SOAL_LUAR_PER_MINUTE', 10), perDay: num('LIMIT_SOAL_LUAR_PER_DAY', 200) }, { pesanHarian: 'Batas penyimpanan Bank Soal Manual hari ini tercapai. Lanjutkan besok.' });
    const { db, FieldValue } = await firestoreAdmin();
    const nama = u.name || u.email || '';
    if (aksi === 'simpan') return { aksi, ...(await simpanPaket(db, FieldValue, { body, uid: u.uid, nama, role: u.role })) };
    if (aksi === 'kisi-simpan') return { aksi, ...(await ubahKisi(db, FieldValue, { id: body.id, kisi: body.kisi, sumber: body.sumber, model: body.model, uid: u.uid, role: u.role })) };
    return { aksi, ...(await hapusPaket(db, { id: body.id, uid: u.uid, role: u.role })) };
  }
  if (aksi === 'pulihkan') { // dari cadangan Drive (web/BackupTab.jsx), satu naskah per permintaan karena batas ukuran permintaan
    const u = await authenticateAdmin(req);
    const { db, FieldValue } = await firestoreAdmin();
    return { aksi, ...(await pulihkanNaskah(db, FieldValue, { naskah: body.naskah, mode: body.mode === 'timpa' ? 'timpa' : 'lewati', uid: u.uid })) };
  }
  throw new ApiError(400, 'BAD_REQUEST', 'Aksi harus kisi, simpan, kisi-simpan, hapus, atau pulihkan.');
});
