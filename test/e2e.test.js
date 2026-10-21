// Uji ujung-ke-ujung di tingkat handler: autentikasi, kuota (pengguna + global), panggilan AI (fetch palsu), hasil.
import test from 'node:test';
import assert from 'node:assert/strict';
import { __setFirebaseForTest } from '../src/platform.js';
import { invalidateAiConfig } from '../src/aiConfig.js';
import generateHandler from '../api/generate.js';
import assistHandler from '../api/assist.js';

const TEKS = 'الْمِيَاهُ الَّتِي يَجُوزُ بِهَا التَّطْهِيرُ سَبْعُ مِيَاهٍ: مَاءُ السَّمَاءِ، وَمَاءُ الْبَحْرِ، وَمَاءُ النَّهْرِ';
const SOAL = { stimulus: '', pertanyaan: 'Berapa macam air yang boleh dipakai bersuci?', pilihan_a: 'Tiga macam', pilihan_b: 'Lima macam', pilihan_c: 'Tujuh macam', pilihan_d: 'Sembilan macam', pilihan_e: 'Sebelas macam',
  kunci_jawaban: 'C', pembahasan: 'Teks: الْمِيَاهُ الَّتِي يَجُوزُ بِهَا التَّطْهِيرُ سَبْعُ مِيَاهٍ', indikator_kisi_kisi: 'Peserta didik dapat menyebutkan jumlah air suci.' };

function fakeFirebase() {
  const store = { 'users/u1': { role: 'penyusun' } };
  const ref = (path) => ({ path, get: async () => ({ exists: path in store, data: () => store[path] }) });
  return { store, auth: { verifyIdToken: async (t) => { if (t !== 'tok') throw new Error('bad'); return { uid: 'u1' }; } }, FieldValue: {},
    db: { doc: ref, runTransaction: async (fn) => fn({ get: (r) => r.get(), set: (r, v) => { store[r.path] = v; } }) } };
}
const mkRes = () => { const r = { h: {}, setHeader(k, v) { r.h[k] = v; }, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; };
const req = (body) => ({ method: 'POST', headers: { authorization: 'Bearer tok' }, body });
const gemini = (json, status = 200) => async () => ({ ok: status < 400, status, headers: { get: () => null }, json: async () => json });
const panggil = (name, args) => gemini({ candidates: [{ finishReason: 'STOP', content: { parts: [{ functionCall: { name, args } }] } }] });

async function jalan(fetchImpl, fn) {
  const saved = { fetch: globalThis.fetch, k: process.env.GEMINI_API_KEY, p: process.env.AI_PROVIDER };
  const fb = fakeFirebase();
  process.env.AI_PROVIDER = 'gemini'; process.env.GEMINI_API_KEY = 'kunci-' + Math.random(); // kunci baru: klien bersama dibuat ulang
  globalThis.fetch = fetchImpl; __setFirebaseForTest(fb); invalidateAiConfig();
  try { await fn(fb); } finally {
    globalThis.fetch = saved.fetch; __setFirebaseForTest(null); invalidateAiConfig();
    process.env.GEMINI_API_KEY = saved.k ?? ''; process.env.AI_PROVIDER = saved.p ?? '';
  }
}
const BODY = { teks: TEKS, tingkat: 'MA', level: 'L1', nama: 'Safinatun Naja', mapel: 'Fiqih' };

test('generate: sukses mengembalikan soal, verifikasi kutipan, sikap; kuota pengguna dan global terhitung', async () => {
  await jalan(panggil('buat_soal', SOAL), async (fb) => {
    const res = mkRes(); await generateHandler(req(BODY), res);
    assert.equal(res.code, 200, JSON.stringify(res.body));
    assert.equal(res.body.soal.kunci_jawaban.length, 1);
    assert.ok(res.body.verifikasi && res.body.sikap.status === 'aman');
    assert.equal(fb.store['rate/u1'].dayCount, 1);
    assert.equal(fb.store['rate/global_ai'].dayCount, 1);
  });
});

test('generate: blokir keamanan penyedia -> AI_MENOLAK (422) dengan pesan jelas', async () => {
  await jalan(gemini({ promptFeedback: { blockReason: 'SAFETY' } }), async () => {
    const res = mkRes(); await generateHandler(req(BODY), res);
    assert.equal(res.code, 422); assert.equal(res.body.error.code, 'AI_MENOLAK');
  });
});

test('generate: AI error 503 mengembalikan kuota pengguna dan global', async () => {
  await jalan(gemini({ error: { message: 'overloaded' } }, 503), async (fb) => {
    const res = mkRes(); await generateHandler(req(BODY), res);
    assert.equal(res.code, 503);
    assert.equal(fb.store['rate/u1'].dayCount, 0);
    assert.equal(fb.store['rate/global_ai'].dayCount, 0);
  });
});

test('assist cekbuta: sepakat bila jawaban sama dengan kunci, beda bila tidak; kunci tidak dikirim ke model', async () => {
  const soal = { stimulus: '', pertanyaan: SOAL.pertanyaan, opsi: { A: 'Tiga macam', B: 'Lima macam', C: 'Tujuh macam', D: 'Sembilan macam', E: 'Sebelas macam' }, kunci: 'C', pembahasan: 'RAHASIA-PEMBAHASAN' };
  let terkirim = '';
  const spy = (jawaban) => async (url, opt) => { terkirim = opt.body; return panggil('jawab_soal', { jawaban, alasan: 'r' })(url, opt); };
  await jalan(spy('C'), async () => {
    const res = mkRes(); await assistHandler(req({ ...BODY, aksi: 'cekbuta', soal }), res);
    assert.equal(res.code, 200, JSON.stringify(res.body)); assert.equal(res.body.hasil.status, 'sepakat');
    assert.ok(!terkirim.includes('RAHASIA-PEMBAHASAN'));
  });
  await jalan(spy('B'), async () => {
    const res = mkRes(); await assistHandler(req({ ...BODY, aksi: 'cekbuta', soal }), res);
    assert.equal(res.body.hasil.status, 'beda');
  });
});

test('assist: aksi tidak dikenal (termasuk nama prototipe) ditolak', async () => {
  await jalan(gemini({}), async () => {
    for (const aksi of ['hapus', 'constructor', '__proto__']) {
      const res = mkRes(); await assistHandler(req({ ...BODY, aksi }), res);
      assert.equal(res.code, 400, aksi);
    }
  });
});
