// POST /api/config-backup (khusus admin): cadangan dan riwayat konfigurasi, agar kesalahan admin bisa dikembalikan ke
// konfigurasi buatan madrasah (bukan bawaan aplikasi). jenis: "app" (tingkat, mapel, kitab, sistem ujian) atau "ai" (penyedia dan model).
// aksi: daftar | lihat | titik (tandai konfigurasi sekarang) | pulihkan | hapus (satu cadangan, otomatis atau titik pulih) |
// bersih (hapus cadangan otomatis sekaligus, sisakan `simpan` terbaru; titik pulih tidak tersentuh).
import { route, authenticateAdmin } from '../platform.js';
import { ApiError } from '../soalService.js';
import { cekJenis, daftarRiwayat, buatTitik, hapusRiwayat, bersihkanOtomatis, BATAS_RIWAYAT } from '../configBackup.js';
import { pulihkanApp, lihatApp } from '../appConfig.js';
import { pulihkanAi, lihatAi } from '../aiConfig.js';

export default route(async (req) => {
  const u = await authenticateAdmin(req);
  const b = req.body || {};
  const jenis = cekJenis(b.jenis);
  switch (b.aksi) {
    case 'daftar': return { riwayat: await daftarRiwayat(jenis), batas: BATAS_RIWAYAT };
    case 'lihat': return jenis === 'app' ? lihatApp(b.id) : lihatAi(b.id);
    case 'titik': return buatTitik(u, jenis, b.nama);
    case 'pulihkan': return jenis === 'app' ? pulihkanApp(u, b.id) : pulihkanAi(u, b.id);
    case 'hapus': return hapusRiwayat(jenis, b.id);
    case 'bersih': return bersihkanOtomatis(jenis, b.simpan);
    default: throw new ApiError(400, 'BAD_REQUEST', 'Aksi harus daftar, lihat, titik, pulihkan, hapus, atau bersih.');
  }
});
