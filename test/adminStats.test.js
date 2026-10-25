// Dasbor admin: pemakaian AI per pengguna dan sisa kuota harian (src/adminStats.js, api/admin-stats.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { bangunDasbor, statusKuota, pemakaianHariIni, ambilDasbor } from '../src/adminStats.js';
import { dayKeyWib, detikSampaiResetWib } from '../src/access.js';
import { __setFirebaseForTest, GLOBAL_AI_ID, GLOBAL_USTADZ_ID } from '../src/platform.js';
import handler from '../api/admin-stats.js';
import { fakeDb } from './_fakeDb.js';

const NOW = Date.UTC(2026, 9, 25, 5, 0, 0); // 12.00 WIB, 25 Okt 2026
const HARI = '2026-10-25';
const KEMARIN = '2026-10-24';
const BATAS = { tim: { global: { perDay: 1000 }, user: { perDay: 60 } }, ustadz: { global: { perDay: 300 }, user: { perDay: 15 } } };
const rate = (dayCount, dayKey = HARI) => ({ dayKey, dayCount, minStart: 0, minCount: 0 });

test('kunci hari dan waktu reset mengikuti WIB', () => {
  assert.equal(dayKeyWib(NOW), HARI);
  assert.equal(dayKeyWib(Date.UTC(2026, 9, 25, 17, 0, 0)), '2026-10-26'); // 00.00 WIB berikutnya
  assert.equal(detikSampaiResetWib(NOW), 12 * 3600);
});

test('statusKuota: aman, hampir (>= 80%), habis (>= batas atau batas nol)', () => {
  assert.equal(statusKuota(0, 60), 'aman');
  assert.equal(statusKuota(47, 60), 'aman');
  assert.equal(statusKuota(48, 60), 'hampir');
  assert.equal(statusKuota(60, 60), 'habis');
  assert.equal(statusKuota(61, 60), 'habis');
  assert.equal(statusKuota(0, 0), 'habis');
});

test('pemakaianHariIni: hitungan hari lain, rusak, atau kosong dianggap nol', () => {
  assert.equal(pemakaianHariIni(rate(7), NOW), 7);
  assert.equal(pemakaianHariIni(rate(7, KEMARIN), NOW), 0);
  assert.equal(pemakaianHariIni(undefined, NOW), 0);
  assert.equal(pemakaianHariIni({ dayKey: HARI, dayCount: 'x' }, NOW), 0);
  assert.equal(pemakaianHariIni(rate(-3), NOW), 0);
});

test('bangunDasbor ringkas: hanya dua plafon dan jumlah peringatan', () => {
  const d = bangunDasbor({ rate: { [GLOBAL_AI_ID]: rate(850), [GLOBAL_USTADZ_ID]: rate(10) }, users: {}, now: NOW, ringkas: true, batas: BATAS });
  assert.equal(d.kolam.length, 2);
  assert.equal(d.kolam[0].status, 'hampir'); assert.equal(d.kolam[0].sisa, 150); assert.equal(d.kolam[0].env, 'LIMIT_GLOBAL_PER_DAY');
  assert.equal(d.kolam[1].status, 'aman');
  assert.equal(d.peringatan, 1);
  assert.equal(d.pengguna, undefined);
  assert.equal(d.resetDalamDetik, 12 * 3600);
});

test('bangunDasbor: per pengguna memakai batas peran, mengurutkan dari yang paling penuh, mengabaikan id kitab/sesi dan hari lalu', () => {
  const users = {
    a: { name: 'Ust. Ahmad', email: 'a@x.id', role: 'penyusun' },
    b: { name: 'Ust. Budi', email: 'b@x.id', role: 'ustadz' },
    c: { name: 'Ust. Cahyo', email: 'c@x.id', role: 'editor' },
    d: { name: 'Ust. Dadang', email: 'd@x.id', role: 'penyusun' },
  };
  const d = bangunDasbor({
    now: NOW, batas: BATAS, users,
    rate: { a: rate(30), b: rate(15), c: rate(60), d: rate(5, KEMARIN), a_kitab: rate(99), a_session: rate(99), [GLOBAL_AI_ID]: rate(105), [GLOBAL_USTADZ_ID]: rate(300) },
  });
  assert.deepEqual(d.pengguna.map((r) => r.uid), ['c', 'b', 'a']); // d (hitungan kemarin) tidak muncul; c dan b sama-sama 100%, c dulu karena lebih banyak dipakai
  const b = d.pengguna.find((r) => r.uid === 'b');
  assert.equal(b.batas, 15); assert.equal(b.status, 'habis'); assert.equal(b.sisa, 0);
  const a = d.pengguna.find((r) => r.uid === 'a');
  assert.equal(a.batas, 60); assert.equal(a.sisa, 30); assert.equal(a.persen, 50); assert.equal(a.status, 'aman');
  assert.equal(d.penggunaHabis, 2);
  assert.equal(d.totalHariIni, 105);
  assert.equal(d.kolam[1].status, 'habis'); assert.equal(d.kolam[1].sisa, 0);
  assert.equal(d.peringatan, 2); // plafon ustadz habis + ada pengguna kena batas
});

test('bangunDasbor: pengguna tanpa profil tetap tampil dengan uid; semua=true menambah yang belum memakai tetapi bukan pending/nonaktif', () => {
  const users = { u1: { name: 'Ust. Satu', role: 'penyusun' }, u2: { name: 'Ust. Dua', role: 'ustadz' }, u3: { name: 'Baru', role: 'pending' }, u4: { name: 'Off', role: 'nonaktif' } };
  const hanyaAktif = bangunDasbor({ rate: { hantu: rate(3), u1: rate(1) }, users, now: NOW, batas: BATAS });
  assert.deepEqual(hanyaAktif.pengguna.map((r) => r.uid).sort(), ['hantu', 'u1']);
  assert.equal(hanyaAktif.pengguna.find((r) => r.uid === 'hantu').nama, 'hantu');
  const semua = bangunDasbor({ rate: { u1: rate(1) }, users, now: NOW, batas: BATAS, semua: true });
  assert.deepEqual(semua.pengguna.map((r) => r.uid).sort(), ['u1', 'u2']);
  assert.equal(semua.pengguna.find((r) => r.uid === 'u2').dipakai, 0);
});

/* ---------- Firestore tiruan + handler ---------- */
function mkFirebase(data) {
  const db = fakeDb(data);
  const role = { tok_admin: 'admin', tok_editor: 'editor', tok_ustadz: 'ustadz' };
  return { db, auth: { verifyIdToken: async (t) => { if (!role[t]) throw new Error('bad'); return { uid: t.replace('tok_', 'u_') }; } }, FieldValue: {} };
}
const mkRes = () => { const r = { h: {}, setHeader(k, v) { r.h[k] = v; }, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; };
const req = (token, body) => ({ method: 'POST', headers: { authorization: 'Bearer ' + token }, body });
const sekarang = () => Date.now();

function dataDasar() {
  const hari = dayKeyWib(sekarang());
  return {
    'users/u_admin': { role: 'admin', name: 'Admin', email: 'admin@x.id' },
    'users/u_editor': { role: 'editor', name: 'Editor', email: 'e@x.id' },
    'users/u_ustadz': { role: 'ustadz', name: 'Ust. Hasan', email: 'h@x.id' },
    'users/u_idle': { role: 'penyusun', name: 'Tidak Aktif', email: 'i@x.id' },
    'rate/u_editor': { dayKey: hari, dayCount: 50, minStart: 0, minCount: 0 },
    'rate/u_ustadz': { dayKey: hari, dayCount: 15, minStart: 0, minCount: 0 },
    'rate/u_ustadz_kitab': { dayKey: hari, dayCount: 40, minStart: 0, minCount: 0 },
    'rate/u_admin_session': { dayKey: hari, dayCount: 3, minStart: 0, minCount: 0 },
    'rate/u_idle': { dayKey: '2020-01-01', dayCount: 59, minStart: 0, minCount: 0 },
    [`rate/${GLOBAL_AI_ID}`]: { dayKey: hari, dayCount: 900, minStart: 0, minCount: 0 },
  };
}

test('ambilDasbor membaca dokumen rate hari ini dan profil pemakainya saja', async () => {
  __setFirebaseForTest(mkFirebase(dataDasar()));
  try {
    const d = await ambilDasbor({ now: sekarang() });
    assert.deepEqual(d.pengguna.map((r) => r.uid).sort(), ['u_editor', 'u_ustadz']);
    assert.equal(d.pengguna.find((r) => r.uid === 'u_ustadz').status, 'habis');
    assert.equal(d.pengguna.find((r) => r.uid === 'u_editor').nama, 'Editor');
    assert.equal(d.kolam[0].dipakai, 900); assert.equal(d.kolam[0].status, 'hampir');
    assert.equal(d.kolam[1].dipakai, 0);
    const lengkap = await ambilDasbor({ now: sekarang(), semua: true });
    assert.ok(lengkap.pengguna.some((r) => r.uid === 'u_idle' && r.dipakai === 0)); // sudah ada dokumen rate hari lain: dipakai 0
  } finally { __setFirebaseForTest(null); }
});

test('/api/admin-stats: hanya admin; editor dan ustadz ditolak; tanpa token 401; ringkas hanya dua plafon', async () => {
  __setFirebaseForTest(mkFirebase(dataDasar()));
  try {
    for (const tok of ['tok_editor', 'tok_ustadz']) { const r = mkRes(); await handler(req(tok, {}), r); assert.equal(r.code, 403, tok); assert.equal(r.body.error.code, 'FORBIDDEN_ROLE'); }
    { const r = mkRes(); await handler({ method: 'POST', headers: {}, body: {} }, r); assert.equal(r.code, 401); }
    { const r = mkRes(); await handler({ method: 'GET', headers: { authorization: 'Bearer tok_admin' } }, r); assert.equal(r.code, 405); }
    { const r = mkRes(); await handler(req('tok_admin', {}), r); assert.equal(r.code, 200); assert.equal(r.h['Cache-Control'], 'no-store'); assert.ok(Array.isArray(r.body.pengguna)); }
    { const r = mkRes(); await handler(req('tok_admin', { ringkas: true }), r); assert.equal(r.code, 200); assert.equal(r.body.pengguna, undefined); assert.equal(r.body.kolam.length, 2); }
    { const r = mkRes(); await handler(req('tok_admin', undefined), r); assert.equal(r.code, 200); } // tanpa body
  } finally { __setFirebaseForTest(null); }
});
