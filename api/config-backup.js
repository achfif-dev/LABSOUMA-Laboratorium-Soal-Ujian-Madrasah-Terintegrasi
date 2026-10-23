// POST /api/config-backup (khusus admin): cadangan dan riwayat konfigurasi, agar kesalahan admin bisa dikembalikan ke
// konfigurasi buatan madrasah (bukan bawaan aplikasi). jenis: "app" (tingkat, mapel, kitab, sistem ujian) atau "ai" (penyedia dan model).
// aksi: daftar | lihat | titik (tandai konfigurasi sekarang) | pulihkan | hapus (hanya titik pulih).
import { route, authenticateAdmin } from '../src/platform.js';
import { ApiError } from '../src/soalService.js';
import { cekJenis, daftarRiwayat, buatTitik, hapusTitik, BATAS_RIWAYAT } from '../src/configBackup.js';
import { pulihkanApp, lihatApp } from '../src/appConfig.js';
import { pulihkanAi, lihatAi } from '../src/aiConfig.js';

export default route(async (req) => {
  const u = await authenticateAdmin(req);
  const b = req.body || {};
  const jenis = cekJenis(b.jenis);
  switch (b.aksi) {
    case 'daftar': return { riwayat: await daftarRiwayat(jenis), batas: BATAS_RIWAYAT };
    case 'lihat': return jenis === 'app' ? lihatApp(b.id) : lihatAi(b.id);
    case 'titik': return buatTitik(u, jenis, b.nama);
    case 'pulihkan': return jenis === 'app' ? pulihkanApp(u, b.id) : pulihkanAi(u, b.id);
    case 'hapus': return hapusTitik(jenis, b.id);
    default: throw new ApiError(400, 'BAD_REQUEST', 'Aksi harus daftar, lihat, titik, pulihkan, atau hapus.');
  }
});
