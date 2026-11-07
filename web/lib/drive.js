// Cadangan soal dan kitab ke Google Drive. Sumber tunggal untuk browser (web/App.jsx) dan tes (src/drive.js).
//
// Rancangan:
//  - Berjalan di browser dengan token OAuth milik PENGGUNA (scope drive.file: hanya berkas yang dibuat aplikasi ini), jadi tidak ada
//    rahasia di server dan berkas masuk ke Drive akun yang dipilih pengguna.
//  - Token tidak pernah disimpan di localStorage; pemanggil menyediakan ambilToken().
//  - Cadangan baru dianggap berhasil setelah berkas diunduh kembali dari Drive dan isinya IDENTIK dengan yang dikirim.

export const FOLDER = 'LABSOUMA Backup';
export const SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const FORMAT = 'labsouma-backup';
export const VERSI = 1;
const MIME_FOLDER = 'application/vnd.google-apps.folder';
const BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

export class DriveError extends Error {
  constructor(code, message, status) { super(message); this.name = 'DriveError'; this.code = code; this.status = status; }
}

/* ------------------------------------------------------------ Format cadangan */

const iso = (v) => {
  if (v && typeof v.toDate === 'function') { try { return v.toDate().toISOString(); } catch (e) { return null; } }
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
  return typeof v === 'string' ? v : null;
};

/** Dokumen Firestore -> objek JSON biasa (Timestamp menjadi teks ISO). */
export function serialisasiSoal(id, data) {
  const o = { id, ...(data || {}) };
  for (const k of ['createdAt', 'updatedAt', 'reviewedAt']) if (k in o) o[k] = iso(o[k]);
  return o;
}

export function buatBackup({ soal, config, kustom, oleh, now = new Date(), jenis = 'penuh', dasar = '', penuhSejak = '' }) {
  const cfg = config && typeof config === 'object' ? config : null;
  return {
    format: FORMAT, versi: VERSI, dibuat: now.toISOString(), oleh: String(oleh || ''),
    // Berkas selalu LENGKAP (semua soal) supaya bisa dipulihkan sendiri. `jenis` hanya mencatat cara membuatnya:
    // 'penuh' = semua soal dibaca dari Firestore; 'inkremental' = berkas `dasar` digabung dengan soal yang berubah sejak itu.
    jenis: jenis === 'inkremental' ? 'inkremental' : 'penuh', dasar: String(dasar || ''), penuhSejak: String(penuhSejak || now.toISOString()),
    jumlah: { soal: soal.length, kitab: cfg && Array.isArray(cfg.kitab) ? cfg.kitab.length : 0 },
    konfigurasiKustom: !!kustom,
    konfigurasi: cfg,
    soal,
  };
}

const dua = (n) => String(n).padStart(2, '0');
export const namaBerkas = (d = new Date()) => `labsouma-backup-${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}-${dua(d.getHours())}${dua(d.getMinutes())}.json`;

// Cadangan Soal Saya (peran Ustadz): satu berkas per hari, ditimpa bila disimpan lagi di hari yang sama; hari-hari sebelumnya tetap ada.
export const PREFIKS_SOAL_SAYA = 'labsouma-soal-saya-';
export const SIMPAN_SOAL_SAYA = 14;
export const namaSoalSaya = (d = new Date()) => `${PREFIKS_SOAL_SAYA}${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}.json`;
export const adalahSoalSaya = (nama) => /^labsouma-soal-saya-\d{4}-\d{2}-\d{2}\.json$/.test(String(nama || ''));
/** Berkas Soal Saya terbaru dulu (nama memuat tanggal), berkas lain di folder diabaikan. */
export const soalSayaTerbaru = (files) => (files || []).filter((f) => f && adalahSoalSaya(f.name)).sort((a, b) => (a.name < b.name ? 1 : a.name > b.name ? -1 : 0));
/** Berkas Soal Saya di luar `simpan` terbaru: kandidat dihapus. */
export const soalSayaLama = (files, simpan = SIMPAN_SOAL_SAYA) => soalSayaTerbaru(files).slice(simpan);

/** Periksa berkas cadangan yang dibaca dari Drive atau komputer. Melempar Error berpesan Indonesia bila bukan cadangan LABSOUMA yang didukung. */
export function periksaBackup(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj) || obj.format !== FORMAT) throw new Error('Berkas ini bukan cadangan LABSOUMA.');
  if (obj.versi !== VERSI) throw new Error(`Versi cadangan ${obj.versi} tidak didukung aplikasi ini (didukung: ${VERSI}).`);
  if (!Array.isArray(obj.soal)) throw new Error('Cadangan rusak: daftar soal tidak ada.');
  const cfg = obj.konfigurasi && typeof obj.konfigurasi === 'object' && !Array.isArray(obj.konfigurasi) ? obj.konfigurasi : null;
  return {
    dibuat: typeof obj.dibuat === 'string' ? obj.dibuat : '', oleh: typeof obj.oleh === 'string' ? obj.oleh : '',
    jenis: obj.jenis === 'inkremental' ? 'inkremental' : 'penuh', penuhSejak: typeof obj.penuhSejak === 'string' ? obj.penuhSejak : '',
    soal: obj.soal, konfigurasi: cfg, jumlahKitab: cfg && Array.isArray(cfg.kitab) ? cfg.kitab.length : 0,
  };
}

const ms = (v) => { const t = Date.parse(v); return Number.isNaN(t) ? null : t; };

/** Soal yang boleh diarsipkan (dihapus dari Firestore setelah cadangan terverifikasi): hanya yang Disetujui dan lama tidak diubah. */
export function kandidatArsip(soal, { hari, now = Date.now() }) {
  const batas = now - Number(hari) * 86_400_000;
  return soal.filter((q) => q && q.status === 'approved' && ms(q.updatedAt) !== null && ms(q.updatedAt) < batas);
}

/* ------------------------------------------------------------ Cadangan inkremental */
// Membaca SEMUA soal tiap cadangan memakan jatah baca harian Spark (satu dokumen = satu bacaan). Inkremental: unduh cadangan terakhir dari Drive
// (tidak memakai Firestore), baca dari Firestore hanya soal dengan updatedAt lebih baru, lalu gabungkan. Penghapusan tidak tercatat di updatedAt,
// jadi hasil gabungan diperiksa terhadap jumlah dokumen di server: selisih = ada yang dihapus -> cadangan penuh.
export const NAMA_BERKAS_CADANGAN = /^labsouma-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/;
export const HARI_PENUH_MAKS = 30;      // paling lama sejak cadangan penuh terakhir; lebih dari itu dipaksa penuh
export const MARGIN_JAM_MS = 15 * 60_000; // selisih jam perangkat dan server

/** Berkas cadangan terbaru di daftar Drive (nama memuat tanggal dan jam), atau null. */
export function cadanganTerbaru(files) {
  const l = (files || []).filter((f) => f && NAMA_BERKAS_CADANGAN.test(String(f.name || ''))).sort((a, b) => (a.name < b.name ? 1 : a.name > b.name ? -1 : 0));
  return l[0] || null;
}

/** Layak dijadikan dasar? `dasar` = hasil periksaBackup. Alasan penolakan dikembalikan untuk ditampilkan. */
export function layakInkremental(dasar, { now = Date.now() } = {}) {
  if (!dasar) return { ok: false, alasan: 'Belum ada cadangan sebelumnya.' };
  const dibuat = ms(dasar.dibuat);
  if (dibuat === null) return { ok: false, alasan: 'Cadangan terakhir tidak memuat waktu pembuatan.' };
  const penuh = ms(dasar.penuhSejak) ?? dibuat;
  if (now - penuh > HARI_PENUH_MAKS * 86_400_000) return { ok: false, alasan: `Cadangan penuh terakhir lebih dari ${HARI_PENUH_MAKS} hari lalu.` };
  if (dibuat > now + MARGIN_JAM_MS) return { ok: false, alasan: 'Waktu cadangan terakhir di masa depan (jam perangkat tidak cocok).' };
  return { ok: true, alasan: '' };
}

/** Batas bawah updatedAt untuk dibaca dari Firestore (ISO): waktu cadangan dasar dikurangi margin jam. */
export const batasUbah = (dasar) => new Date(ms(dasar.dibuat) - MARGIN_JAM_MS).toISOString();

/** Gabungkan soal dasar dengan soal yang berubah (menurut id; yang berubah menang). Hasil terurut menurut id. */
export function gabungInkremental(soalDasar, soalUbah) {
  const peta = new Map();
  for (const q of soalDasar || []) if (q && typeof q.id === 'string') peta.set(q.id, q);
  for (const q of soalUbah || []) if (q && typeof q.id === 'string') peta.set(q.id, q);
  return [...peta.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Pecah daftar menjadi potongan berukuran tetap. */
export function potong(daftar, n) { const out = []; for (let i = 0; i < daftar.length; i += n) out.push(daftar.slice(i, i + n)); return out; }

/* ------------------------------------------------------------ Klien Google Drive */

function galatDrive(status, body) {
  let pesan = ''; let alasan = '';
  try { const j = JSON.parse(body); pesan = (j.error && j.error.message) || ''; alasan = (j.error && ((j.error.errors && j.error.errors[0] && j.error.errors[0].reason) || j.error.status)) || ''; } catch (e) { /* bukan JSON */ }
  const kunci = `${alasan} ${pesan}`;
  if (status === 401) return new DriveError('DRIVE_TOKEN', 'Izin Google Drive berakhir. Ulangi; jendela izin akan muncul lagi.', status);
  if (status === 403 && /accessNotConfigured|has not been used|SERVICE_DISABLED|is disabled/i.test(kunci)) return new DriveError('DRIVE_API_OFF', 'Google Drive API belum diaktifkan di proyek Google Cloud ini. Admin perlu mengaktifkannya (lihat README, bagian Backup).', status);
  if (status === 403 && /storageQuotaExceeded|quotaExceeded/i.test(kunci)) return new DriveError('DRIVE_PENUH', 'Penyimpanan Google Drive akun ini penuh. Kosongkan ruang atau pilih akun lain.', status);
  if (status === 403 && /rateLimit|userRateLimit/i.test(kunci)) return new DriveError('DRIVE_RATE', 'Terlalu banyak permintaan ke Google Drive. Tunggu sebentar lalu ulangi.', status);
  if (status === 403) return new DriveError('DRIVE_DITOLAK', 'Google Drive menolak permintaan ini' + (pesan ? ': ' + pesan : '.'), status);
  if (status === 404) return new DriveError('DRIVE_TIDAK_ADA', 'Berkas atau folder tidak ditemukan di Google Drive (mungkin sudah dihapus).', status);
  return new DriveError('DRIVE_ERROR', `Google Drive mengembalikan galat ${status}.`, status);
}

const kutip = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

/** ambilToken(): Promise<string> token OAuth aktif. fetchImpl bisa diganti untuk tes. */
export function buatDrive({ ambilToken, fetchImpl }) {
  const f = fetchImpl || ((...a) => fetch(...a));
  const api = async (url, init = {}) => {
    const token = await ambilToken();
    const res = await f(url, { ...init, headers: { ...(init.headers || {}), Authorization: 'Bearer ' + token } });
    if (!res.ok) throw galatDrive(res.status, await res.text().catch(() => ''));
    return res;
  };
  const qs = (o) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return {
    /** Folder "LABSOUMA Backup" milik aplikasi ini; dibuat bila belum ada. */
    async siapkanFolder() {
      const q = `mimeType='${MIME_FOLDER}' and name='${kutip(FOLDER)}' and trashed=false`;
      const r = await (await api(`${BASE}/files?${qs({ q, fields: 'files(id,name)', pageSize: 1, spaces: 'drive' })}`)).json();
      if (r.files && r.files[0]) return r.files[0].id;
      const c = await (await api(`${BASE}/files?${qs({ fields: 'id' })}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: FOLDER, mimeType: MIME_FOLDER }) })).json();
      return c.id;
    },
    async unggah(folderId, nama, isi) {
      const batas = 'labsouma' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      const meta = JSON.stringify({ name: nama, parents: [folderId], mimeType: 'application/json' });
      const body = `--${batas}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${batas}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${isi}\r\n--${batas}--`;
      const r = await api(`${UPLOAD}/files?${qs({ uploadType: 'multipart', fields: 'id,name,size,webViewLink' })}`, { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${batas}` }, body });
      return r.json();
    },
    async unduh(id) { return (await api(`${BASE}/files/${encodeURIComponent(id)}?alt=media`)).text(); },
    /** Cari satu berkas menurut nama di dalam folder (hanya berkas buatan aplikasi ini yang terlihat dengan scope drive.file). */
    async cari(folderId, nama) {
      const q = `'${kutip(folderId)}' in parents and name='${kutip(nama)}' and trashed=false`;
      const r = await (await api(`${BASE}/files?${qs({ q, fields: 'files(id,name,webViewLink)', pageSize: 1, spaces: 'drive' })}`)).json();
      return (r.files && r.files[0]) || null;
    },
    /** Ganti isi berkas yang sudah ada (ID tetap). */
    async perbarui(id, isi) {
      const r = await api(`${UPLOAD}/files/${encodeURIComponent(id)}?${qs({ uploadType: 'media', fields: 'id,name,size,webViewLink' })}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json; charset=UTF-8' }, body: isi });
      return r.json();
    },
    async hapus(id) { await api(`${BASE}/files/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
    async daftar(folderId) {
      const q = `'${kutip(folderId)}' in parents and trashed=false`;
      const r = await (await api(`${BASE}/files?${qs({ q, orderBy: 'modifiedTime desc', pageSize: 50, fields: 'files(id,name,size,modifiedTime,webViewLink)' })}`)).json();
      return r.files || [];
    },
  };
}
