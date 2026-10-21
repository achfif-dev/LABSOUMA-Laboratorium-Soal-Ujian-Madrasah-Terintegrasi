// Penghubung server: Firebase Admin (login + Firestore), pembungkus rute, batas pemakaian.
// firebase-admin dimuat saat dibutuhkan agar modul ini tetap bisa diuji tanpa paketnya.
import { ApiError, toApiError } from './soalService.js';
import { STAFF, parseList, initialRole, domainAllowed, rateDecision } from './access.js';

export const num = (name, def) => { const n = Number(process.env[name]); return Number.isFinite(n) && n > 0 ? n : def; };
export const aiLimits = () => ({ perMinute: num('LIMIT_PER_MINUTE', 5), perDay: num('LIMIT_PER_DAY', 60) });
export const kitabLimits = () => ({ perMinute: num('LIMIT_KITAB_PER_MINUTE', 10), perDay: num('LIMIT_KITAB_PER_DAY', 200) });

/* ------------------------------------------------------------- Firebase Admin */
let fb = null;
export const __setFirebaseForTest = (x) => { fb = x; };

function serviceAccount() {
  const raw = String(process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
  if (!raw) throw new ApiError(500, 'SERVER_NOT_CONFIGURED', 'Server belum dikonfigurasi: FIREBASE_SERVICE_ACCOUNT belum diisi.');
  try {
    return JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
  } catch {
    throw new ApiError(500, 'SERVER_NOT_CONFIGURED', 'FIREBASE_SERVICE_ACCOUNT bukan JSON atau base64 yang valid.');
  }
}

async function firebase() {
  if (fb) return fb;
  const [{ initializeApp, cert, getApps }, { getAuth }, { getFirestore, FieldValue }] = await Promise.all([
    import('firebase-admin/app'), import('firebase-admin/auth'), import('firebase-admin/firestore'),
  ]);
  const app = getApps()[0] || initializeApp({ credential: cert(serviceAccount()) });
  fb = { auth: getAuth(app), db: getFirestore(app), FieldValue };
  return fb;
}

/* ------------------------------------------------------------- Autentikasi */
const AUTH_MSG = 'Sesi berakhir. Masuk lagi dengan akun Google Anda.';

export async function authenticate(req) {
  const m = /^Bearer (.+)$/.exec(req.headers?.authorization || '');
  if (!m) throw new ApiError(401, 'AUTH_REQUIRED', AUTH_MSG);
  const { auth } = await firebase();
  try {
    return await auth.verifyIdToken(m[1]);
  } catch {
    throw new ApiError(401, 'AUTH_REQUIRED', AUTH_MSG);
  }
}

/** Login valid DAN peran aktif (penyusun, editor, admin). */
export async function authenticateStaff(req) {
  const u = await authenticate(req);
  const { db } = await firebase();
  const snap = await db.doc(`users/${u.uid}`).get();
  if (!snap.exists || !STAFF.includes(snap.data().role)) {
    throw new ApiError(403, 'FORBIDDEN_ROLE', 'Akun Anda belum disetujui admin untuk memakai fitur ini.');
  }
  return u;
}

/** Membuat/menyegarkan dokumen users/{uid}. Admin pertama berasal dari ADMIN_EMAILS. */
export async function ensureProfile(u) {
  if (!u.email || !u.email_verified) throw new ApiError(403, 'EMAIL_NOT_VERIFIED', 'Email akun Google Anda belum terverifikasi.');
  const domain = process.env.ALLOWED_EMAIL_DOMAIN || '';
  if (!domainAllowed(u.email, domain)) {
    throw new ApiError(403, 'DOMAIN_NOT_ALLOWED', `Hanya akun dengan email @${domain.replace(/^@/, '')} yang boleh masuk.`);
  }
  const wanted = initialRole(u.email, u.email_verified, parseList(process.env.ADMIN_EMAILS));
  const { db, FieldValue } = await firebase();
  const ref = db.doc(`users/${u.uid}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const profile = { email: u.email, name: u.name || u.email, photoURL: u.picture || '', lastLoginAt: FieldValue.serverTimestamp() };
    if (!snap.exists) tx.set(ref, { ...profile, role: wanted, createdAt: FieldValue.serverTimestamp() });
    else tx.update(ref, wanted === 'admin' && snap.data().role !== 'admin' ? { ...profile, role: 'admin' } : profile);
  });
}

/** Batas per pengguna di semua instance (Firestore: rate/{docId}). */
export async function enforceRate(docId, limits) {
  const { db } = await firebase();
  const ref = db.doc(`rate/${docId}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = rateDecision(snap.data(), Date.now(), limits);
    if (!d.ok) {
      const msg = d.code === 'RATE_LIMIT_DAILY'
        ? 'Kuota harian Anda untuk fitur ini habis. Coba lagi besok.'
        : `Terlalu banyak permintaan. Coba lagi dalam ${d.retryAfter} detik.`;
      throw new ApiError(429, d.code, msg, { retryAfter: d.retryAfter });
    }
    tx.set(ref, d.state);
  });
}

/* ------------------------------------------------------------------ Rute */
/** Galat Firebase/Firestore (kode gRPC atau pesan khas) -> pesan yang menunjuk penyebabnya. */
export function firebaseError(e) {
  const code = e?.code;
  const msg = String(e?.message || '');
  if (code === 5 || code === 'not-found' || /NOT_FOUND/.test(msg)) {
    return new ApiError(500, 'FIRESTORE_NOT_FOUND', 'Database Firestore belum dibuat atau berada di proyek lain. Buat Firestore di Firebase Console (Build > Firestore Database > Create database) dan pastikan kunci akun layanan berasal dari proyek yang sama.');
  }
  if (code === 7 || code === 'permission-denied' || /PERMISSION_DENIED|has not been used|is disabled/.test(msg)) {
    return new ApiError(500, 'FIRESTORE_PERMISSION', 'Akun layanan tidak diizinkan memakai Firestore. Aktifkan "Cloud Firestore API" di Google Cloud Console untuk proyek ini, lalu coba lagi.');
  }
  if (/app\/invalid-credential|invalid_grant|Failed to parse private key|Invalid PEM|DECODER/.test(msg + ' ' + code)) {
    return new ApiError(500, 'SERVER_CREDENTIAL', 'Kunci akun layanan (FIREBASE_SERVICE_ACCOUNT) tidak valid atau sudah dihapus. Buat kunci baru dan perbarui di Vercel.');
  }
  if (/Cannot find (package|module)/.test(msg)) {
    return new ApiError(500, 'SERVER_DEPENDENCY', 'Paket firebase-admin tidak terpasang di server. Pastikan package.json ikut ter-push dan deploy ulang.');
  }
  return null;
}

/** Galat polos tanpa status/nama SDK AI = masalah sisi server sendiri: tampilkan ringkasan agar mudah dilacak. */
export function serverError(e) {
  if (!e || typeof e !== 'object' || e.status || /^API/.test(String(e.name || ''))) return null;
  const msg = String(e.message || '').replace(/\s+/g, ' ').slice(0, 220);
  if (!msg) return null;
  return new ApiError(500, 'SERVER_ERROR', `Galat di server: ${msg}`);
}

export function sendError(res, e) {
  const err = e instanceof ApiError ? e : (firebaseError(e) || serverError(e) || toApiError(e));
  if (!(e instanceof ApiError)) console.error('[api] error tak terduga:', e?.code ?? e?.status, e?.message); // jangan bocorkan ke klien
  if (err.retryAfter) res.setHeader('Retry-After', String(err.retryAfter));
  return res.status(err.status).json({ error: { code: err.code, message: err.message, ...(err.retryAfter ? { retryAfter: err.retryAfter } : {}) } });
}

/** Membungkus handler: metode, tanpa cache, galat seragam. `fn(req)` mengembalikan objek JSON. */
export const route = (fn, { method = 'POST' } = {}) => async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method !== method) { res.setHeader('Allow', method); throw new ApiError(405, 'METHOD_NOT_ALLOWED', `Gunakan metode ${method}.`); }
    return res.status(200).json(await fn(req));
  } catch (e) {
    return sendError(res, e);
  }
};
