// Dasbor admin: pemakaian AI per pengguna dan sisa kuota harian, dibaca dari dokumen rate/{id} yang ditulis enforceRate.
// Hitungan di rate/{id} bersih (sudah dikurangi pengembalian kuota) dan hanya menyimpan HARI INI: tidak ada riwayat harian.
// Logika murni (bangunDasbor) dipisah dari pembacaan Firestore (ambilDasbor) supaya mudah diuji.
import { dayKeyWib, detikSampaiResetWib } from './access.js';
import { aiLimits, globalAiLimits, ustadzLimits, globalUstadzLimits, GLOBAL_AI_ID, GLOBAL_USTADZ_ID, firestoreAdmin } from './platform.js';

export const AMBANG_WASPADA = 0.8;
const MAKS_BARIS = 300;
const TIM = ['penyusun', 'editor', 'admin'];

export const pemakaianHariIni = (state, now) =>
  (state && state.dayKey === dayKeyWib(now) && Number.isFinite(state.dayCount) ? Math.max(0, state.dayCount) : 0);

export function statusKuota(dipakai, batas) {
  if (!(batas > 0) || dipakai >= batas) return 'habis';
  return dipakai >= Math.ceil(batas * AMBANG_WASPADA) ? 'hampir' : 'aman';
}

const ringkasHitung = (dipakai, batas) => ({
  dipakai, batas, sisa: Math.max(0, batas - dipakai),
  persen: batas > 0 ? Math.min(100, Math.round((dipakai / batas) * 100)) : 100,
  status: statusKuota(dipakai, batas),
});

/** Id dokumen rate yang bukan milik satu pengguna untuk AI (plafon bersama, kitab, sesi). */
const bukanAiPengguna = (id) => id === GLOBAL_AI_ID || id === GLOBAL_USTADZ_ID || id.endsWith('_kitab') || id.endsWith('_session');

/**
 * @param {{rate: Record<string, object>, users: Record<string, {name?:string,email?:string,role?:string}>, now: number, semua?: boolean, ringkas?: boolean}} o
 * rate: id dokumen -> isi; users: uid -> profil (hanya yang diketahui).
 */
export function bangunDasbor({ rate, users, now, semua = false, ringkas = false, batas }) {
  const b = batas || { tim: { global: globalAiLimits(), user: aiLimits() }, ustadz: { global: globalUstadzLimits(), user: ustadzLimits() } };
  const kolam = [
    { id: GLOBAL_AI_ID, label: 'Tim (penyusun, editor, admin)', env: 'LIMIT_GLOBAL_PER_DAY', ...ringkasHitung(pemakaianHariIni(rate[GLOBAL_AI_ID], now), b.tim.global.perDay) },
    { id: GLOBAL_USTADZ_ID, label: 'Ustadz', env: 'LIMIT_USTADZ_GLOBAL_PER_DAY', ...ringkasHitung(pemakaianHariIni(rate[GLOBAL_USTADZ_ID], now), b.ustadz.global.perDay) },
  ];
  const peringatanKolam = kolam.filter((k) => k.status !== 'aman').length;
  const dasar = { hari: dayKeyWib(now), resetDalamDetik: detikSampaiResetWib(now), kolam, peringatan: peringatanKolam };
  if (ringkas) return dasar;

  const baris = [];
  const ids = new Set(Object.keys(rate).filter((id) => !bukanAiPengguna(id)));
  if (semua) for (const uid of Object.keys(users)) ids.add(uid);
  for (const uid of ids) {
    const u = users[uid] || {};
    const role = typeof u.role === 'string' ? u.role : '';
    const batasUser = (role === 'ustadz' ? b.ustadz.user : b.tim.user).perDay;
    const dipakai = pemakaianHariIni(rate[uid], now);
    if (!semua && dipakai === 0) continue;
    if (semua && !TIM.includes(role) && role !== 'ustadz' && dipakai === 0) continue; // pending/nonaktif tanpa pemakaian: tidak relevan
    baris.push({ uid, nama: u.name || u.email || uid, email: u.email || '', role, ...ringkasHitung(dipakai, batasUser) });
  }
  baris.sort((x, y) => y.persen - x.persen || y.dipakai - x.dipakai || x.nama.localeCompare(y.nama));
  const terpotong = baris.length > MAKS_BARIS;
  const habis = baris.filter((r) => r.status === 'habis').length;
  return { ...dasar, peringatan: peringatanKolam + (habis > 0 ? 1 : 0), pengguna: baris.slice(0, MAKS_BARIS), terpotong, penggunaHabis: habis, totalHariIni: baris.reduce((n, r) => n + r.dipakai, 0) };
}

const bacaBanyak = async (db, refs) => {
  if (!refs.length) return [];
  if (typeof db.getAll === 'function') return db.getAll(...refs);
  return Promise.all(refs.map((r) => r.get()));
};

/** Membaca Firestore (Admin SDK). `ringkas`: hanya dua dokumen plafon (2 baca); penuh: dokumen rate hari ini + profil pemakainya. */
export async function ambilDasbor({ semua = false, ringkas = false, now = Date.now() } = {}) {
  const { db } = await firestoreAdmin();
  const rate = {};
  const globals = await bacaBanyak(db, [db.doc(`rate/${GLOBAL_AI_ID}`), db.doc(`rate/${GLOBAL_USTADZ_ID}`)]);
  [GLOBAL_AI_ID, GLOBAL_USTADZ_ID].forEach((id, i) => { if (globals[i] && globals[i].exists) rate[id] = globals[i].data(); });
  if (ringkas) return bangunDasbor({ rate, users: {}, now, ringkas: true });

  // Hanya dokumen yang aktif hari ini (satu filter sama-dengan, tanpa indeks gabungan): biaya baca mengikuti jumlah pemakai aktif.
  const hariIni = await db.collection('rate').where('dayKey', '==', dayKeyWib(now)).limit(1000).get();
  hariIni.docs.forEach((d) => { rate[d.id] = d.data(); });

  const users = {};
  if (semua) {
    const snap = await db.collection('users').limit(1000).get();
    snap.docs.forEach((d) => { users[d.id] = d.data(); });
  } else {
    const uids = Object.keys(rate).filter((id) => !bukanAiPengguna(id)).slice(0, 1000);
    const docs = await bacaBanyak(db, uids.map((uid) => db.doc(`users/${uid}`)));
    docs.forEach((d, i) => { if (d && d.exists) users[uids[i]] = d.data(); });
  }
  return bangunDasbor({ rate, users, now, semua });
}
