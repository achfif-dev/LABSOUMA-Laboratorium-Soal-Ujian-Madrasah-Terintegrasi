// SATU-SATUNYA fungsi Vercel di proyek ini. Semua rute /api/<nama> dialihkan ke sini oleh `rewrites` di vercel.json,
// lalu diteruskan ke handler di src/rute/<nama>.js.
//
// Mengapa digabung: Vercel membangun SETIAP berkas di api/ menjadi bundle terpisah, dan tiap bundle menyalin seluruh
// dependency yang dipakai (firebase-admin + turunannya, puluhan paket). Dengan 11 fungsi, satu deployment = 11 salinan,
// dan metrik "Function Storage" (batas 10 GB di Hobby) habis dalam beberapa puluh deployment. Dengan satu fungsi,
// salinannya satu. JANGAN menambah berkas lain di api/ (setiap berkas = satu bundle lagi); tambahkan rute baru di
// src/rute/ lalu daftarkan di tabel di bawah. test/gateway.test.js menjaga keduanya tetap selaras.
//
// Handler dimuat malas (import() per rute): cold start hanya membayar modul rute yang dipanggil, sama seperti sebelumnya.
import { sendError } from '../src/platform.js';
import { ApiError } from '../src/soalService.js';

export const RUTE = {
  'admin-stats': () => import('../src/rute/admin-stats.js'),
  'ai-config': () => import('../src/rute/ai-config.js'),
  'app-config': () => import('../src/rute/app-config.js'),
  'assist': () => import('../src/rute/assist.js'),
  'backup': () => import('../src/rute/backup.js'),
  'config-backup': () => import('../src/rute/config-backup.js'),
  'config': () => import('../src/rute/config.js'),
  'drive-client': () => import('../src/rute/drive-client.js'),
  'generate': () => import('../src/rute/generate.js'),
  'kitab': () => import('../src/rute/kitab.js'),
  'session': () => import('../src/rute/session.js'),
};

/** Nama rute dari ?route= (diisi rewrite), dengan cadangan membaca path asli /api/<nama>. */
export function namaRute(req) {
  const q = req?.query?.route;
  const dariQuery = Array.isArray(q) ? q[0] : q;
  if (dariQuery) return String(dariQuery);
  const m = /^\/api\/([a-z0-9-]+)\/?$/i.exec(String(req?.url || '').split('?')[0]);
  return m ? m[1] : '';
}

export default async function handler(req, res) {
  const nama = namaRute(req);
  const muat = Object.hasOwn(RUTE, nama) ? RUTE[nama] : null;
  if (!muat) {
    res.setHeader('Cache-Control', 'no-store');
    return sendError(res, new ApiError(404, 'NOT_FOUND', 'Rute API tidak ditemukan.'));
  }
  const { default: handlerRute } = await muat();
  return handlerRute(req, res);
}
