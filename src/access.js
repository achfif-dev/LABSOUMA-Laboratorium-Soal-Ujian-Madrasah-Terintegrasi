// Logika murni (mudah diuji): peran, domain email, dan batas pemakaian per pengguna.

export const STAFF = ['penyusun', 'editor', 'admin'];
// Peran yang boleh memakai alat bantu AI. 'ustadz' SENGAJA tidak masuk STAFF: STAFF mewakili hak membaca bank soal
// (firestore.rules isStaff). Ustadz hanya memakai alat (generate, telaah, Pegon, ekspor) dan tidak pernah menyentuh koleksi `soal`.
export const AUTHORS = [...STAFF, 'ustadz'];

export const parseList = (s) =>
  String(s || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);

/** Admin pertama ditentukan dari ADMIN_EMAILS, hanya jika email Google sudah terverifikasi. */
export const initialRole = (email, verified, admins) =>
  verified && admins.includes(String(email || '').toLowerCase()) ? 'admin' : 'pending';

/**
 * Pengguna yang sudah punya profil hanya diangkat dari ADMIN_EMAILS bila perannya masih 'pending'.
 * Admin yang sengaja diturunkan atau dinonaktifkan lewat aplikasi tidak diangkat lagi saat login.
 */
export const shouldPromote = (currentRole, wantedRole) => wantedRole === 'admin' && currentRole === 'pending';

/** Jika ALLOWED_EMAIL_DOMAIN diisi (mis. "madrasahku.sch.id"), hanya email domain itu yang boleh masuk. */
export const domainAllowed = (email, domain) => {
  const d = String(domain || '').trim().toLowerCase().replace(/^@/, '');
  if (!d) return true;
  return String(email || '').toLowerCase().endsWith('@' + d);
};

const WIB = 7 * 3600 * 1000;

/**
 * Keputusan batas pemakaian. `state` = dokumen rate/{uid} sebelumnya (boleh kosong).
 * Mengembalikan {ok:true, state} atau {ok:false, code, retryAfter}.
 */
export function rateDecision(state, now, { perMinute, perDay }) {
  const s = { minStart: 0, minCount: 0, dayKey: '', dayCount: 0, ...(state || {}) };
  const dayKey = new Date(now + WIB).toISOString().slice(0, 10); // hari menurut WIB
  if (s.dayKey !== dayKey) { s.dayKey = dayKey; s.dayCount = 0; }
  if (now - s.minStart >= 60_000) { s.minStart = now; s.minCount = 0; }

  if (s.dayCount >= perDay) {
    const nextMidnight = Math.floor((now + WIB) / 86_400_000) * 86_400_000 + 86_400_000 - WIB;
    return { ok: false, code: 'RATE_LIMIT_DAILY', retryAfter: Math.ceil((nextMidnight - now) / 1000) };
  }
  if (s.minCount >= perMinute) {
    return { ok: false, code: 'RATE_LIMIT_LOCAL', retryAfter: Math.max(1, Math.ceil((s.minStart + 60_000 - now) / 1000)) };
  }
  s.minCount += 1;
  s.dayCount += 1;
  return { ok: true, state: s };
}

/**
 * Kegagalan di sisi server/AI (>= 500, atau batas permintaan dari penyedia AI) tidak menghabiskan kuota pengguna.
 * Penolakan karena isi teks (mis. TEKS_TIDAK_MEMADAI, 422) tetap dihitung karena AI sudah dipakai.
 */
export const refundable = (err) => !!err && (Number(err.status) >= 500 || err.code === 'RATE_LIMIT');

/** Kembalikan satu hitungan kuota pada dokumen rate/{uid}. Mengembalikan state baru, atau null bila tak ada yang perlu diubah. */
export function refundState(state, now) {
  if (!state) return null;
  const s = { ...state };
  const dayKey = new Date(now + WIB).toISOString().slice(0, 10);
  if (s.dayKey === dayKey && s.dayCount > 0) s.dayCount -= 1;
  if (now - s.minStart < 60_000 && s.minCount > 0) s.minCount -= 1;
  return s;
}
