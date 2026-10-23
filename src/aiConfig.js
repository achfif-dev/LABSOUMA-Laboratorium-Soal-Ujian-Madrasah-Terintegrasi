// Pengaturan AI yang bisa diubah admin dari aplikasi (tanpa mengubah environment variable atau redeploy).
// Disimpan di Firestore config/ai (hanya Admin SDK yang bisa mengakses; aturan Firestore menolak klien).
// Kunci API dienkripsi dan TIDAK pernah dikirim ke browser: hanya 4 karakter terakhir yang ditampilkan.
// Urutan prioritas: pengaturan admin -> environment variable -> bawaan kode.
import { ApiError, setRuntimeAi, toApiError, createClientFor, DEFAULT_MODELS, MODEL_PRESETS } from './soalService.js';
import { masterKey, encryptSecret, decryptSecret } from './secrets.js';
import { firestoreAdmin } from './platform.js';
import { siapkanRiwayat, pangkasRiwayat, bacaRiwayat, bandingkan, dataDariDoc } from './configBackup.js';

export const PROVIDERS = ['gemini', 'anthropic'];
const ENV_KEY = { gemini: 'GEMINI_API_KEY', anthropic: 'ANTHROPIC_API_KEY' };
const DOC = 'config/ai';
const TTL_MS = 60_000;

let cache = null; // { at, value }
export const invalidateAiConfig = () => { cache = null; };

const envKeyFor = (p, env) => String(env[ENV_KEY[p]] || '').trim();

/** Logika murni: gabungkan dokumen konfigurasi dan environment menjadi pengaturan aktif. */
export function resolveAi(doc, env = process.env, key = null) {
  const d = doc || {};
  const p = PROVIDERS.includes(d.provider) ? d.provider : (PROVIDERS.includes(String(env.AI_PROVIDER || 'gemini').trim().toLowerCase()) ? String(env.AI_PROVIDER || 'gemini').trim().toLowerCase() : 'gemini');
  const envModel = p === String(env.AI_PROVIDER || 'gemini').trim().toLowerCase() ? env.AI_MODEL : '';
  const model = (d.models && d.models[p]) || envModel || DEFAULT_MODELS[p];
  let apiKey = ''; let sumberKunci = null; let peringatan = '';
  const enc = d.keys && d.keys[p] && d.keys[p].enc;
  if (enc) {
    try { apiKey = decryptSecret(enc, key || masterKey(env), `ai:${p}`); sumberKunci = 'konfigurasi'; }
    catch { peringatan = 'Kunci tersimpan tidak bisa dibuka (kunci enkripsi server berubah). Masukkan ulang kunci di Pengaturan AI.'; }
  }
  if (!apiKey && envKeyFor(p, env)) { apiKey = envKeyFor(p, env); sumberKunci = 'environment'; }
  return { provider: p, model, apiKey, sumberKunci, peringatan };
}

async function bacaDoc() {
  const { db } = await firestoreAdmin();
  const snap = await db.doc(DOC).get();
  return snap.exists ? snap.data() : null;
}

/** Dipanggil di awal setiap rute AI. Membaca Firestore paling sering sekali per menit per instance. */
export async function loadAiConfig({ force = false, now = Date.now() } = {}) {
  if (!force && cache && now - cache.at < TTL_MS) { setRuntimeAi(cache.value); return cache.value; }
  let doc = null; let galatBaca = '';
  try { doc = await bacaDoc(); } catch (e) { galatBaca = String(e?.code ?? e?.message ?? 'tak diketahui'); console.error('[aiConfig] gagal membaca config/ai, memakai environment:', galatBaca); }
  const v = { ...resolveAi(doc), galatBaca };
  cache = { at: now, value: v };
  setRuntimeAi(v);
  return v;
}

/* ---------------------------------------------------------------- Admin */

const maskLast4 = (s) => (s ? `••••${s.slice(-4)}` : '');

export async function statusAi() {
  const doc = (await bacaDoc()) || {};
  const aktif = resolveAi(doc);
  const kunci = {};
  for (const p of PROVIDERS) {
    const k = doc.keys && doc.keys[p];
    kunci[p] = {
      tersimpan: !!(k && k.enc), last4: k ? k.last4 || '' : '', diubahOleh: k ? k.updatedBy || '' : '', diubahAt: k && k.updatedAt && k.updatedAt.toDate ? k.updatedAt.toDate().toISOString() : (k && k.updatedAt) || null,
      envAda: !!envKeyFor(p, process.env),
    };
  }
  return {
    provider: aktif.provider, models: { gemini: (doc.models && doc.models.gemini) || '', anthropic: (doc.models && doc.models.anthropic) || '' },
    modelBawaan: DEFAULT_MODELS, modelPilihan: MODEL_PRESETS, kunci,
    enkripsi: { sumber: String(process.env.CONFIG_ENCRYPTION_KEY || '').trim() ? 'env' : 'turunan' },
    aktif: { provider: aktif.provider, model: aktif.model, sumberKunci: aktif.sumberKunci, peringatan: aktif.peringatan },
  };
}

const KEY_RE = /^[\x21-\x7E]{20,400}$/; // ASCII tercetak, tanpa spasi
const MODEL_RE = /^[A-Za-z0-9._:/-]{1,80}$/;

export function validateConfigInput(b) {
  if (!b || typeof b !== 'object') throw new ApiError(400, 'BAD_REQUEST', 'Isi permintaan tidak valid.');
  const out = { models: {}, keys: {}, hapus: [] };
  if (b.provider !== undefined) {
    if (!PROVIDERS.includes(b.provider)) throw new ApiError(422, 'CONFIG_INVALID', 'Penyedia harus gemini atau anthropic.');
    out.provider = b.provider;
  }
  for (const p of PROVIDERS) {
    const m = b.models && b.models[p];
    if (m !== undefined && m !== '') {
      if (!MODEL_RE.test(String(m).trim())) throw new ApiError(422, 'CONFIG_INVALID', `Nama model ${p} tidak valid.`);
      out.models[p] = String(m).trim();
    } else if (m === '') out.models[p] = '';
    const k = b.keys && b.keys[p];
    if (k !== undefined && k !== '') {
      const t = String(k).trim();
      if (!KEY_RE.test(t)) throw new ApiError(422, 'CONFIG_INVALID', `Kunci ${p} tidak valid: 20–400 karakter, tanpa spasi.`);
      out.keys[p] = t;
    }
  }
  for (const p of Array.isArray(b.hapus) ? b.hapus : []) if (PROVIDERS.includes(p)) out.hapus.push(p);
  return out;
}

/**
 * Ubah config/ai dalam satu transaksi bersama cadangan keadaan sebelumnya (penyedia dan model; kunci API tidak ikut dicadangkan).
 * `ubah(cur)` mengembalikan dokumen baru.
 */
async function ubahAiDenganCadangan(user, alasan, ubah, { now = () => new Date().toISOString() } = {}) {
  const { db } = await firestoreAdmin();
  const ref = db.doc(DOC);
  const oleh = user.email || user.uid; const waktu = now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.exists ? snap.data() : null;
    const baru = ubah(cur || {}, { oleh, waktu });
    const cad = await siapkanRiwayat(db, { jenis: 'ai', alasan, docSaatIni: cur, oleh, now: waktu });
    if (cad) tx.set(cad.ref, cad.doc);
    tx.set(ref, baru);
  });
  await pangkasRiwayat('ai');
  invalidateAiConfig();
}

export async function simpanAi(user, body, opts = {}) {
  const inp = validateConfigInput(body);
  await ubahAiDenganCadangan(user, 'sebelum-simpan', (cur, { oleh: who, waktu }) => {
    const next = { provider: cur.provider || '', models: { ...(cur.models || {}) }, keys: { ...(cur.keys || {}) } };
    if (inp.provider) next.provider = inp.provider;
    for (const [p, m] of Object.entries(inp.models)) { if (m) next.models[p] = m; else delete next.models[p]; }
    const mk = Object.keys(inp.keys).length ? masterKey() : null;
    for (const [p, plain] of Object.entries(inp.keys)) {
      next.keys[p] = { enc: encryptSecret(plain, mk, `ai:${p}`), last4: plain.slice(-4), updatedBy: who, updatedAt: waktu };
    }
    for (const p of inp.hapus) delete next.keys[p];
    next.updatedBy = who; next.updatedAt = waktu;
    return next;
  }, opts);
  return statusAi();
}

/** Kembalikan penyedia dan model dari cadangan. Kunci API tidak disentuh (tidak ada di cadangan). Keadaan sekarang dicadangkan lebih dulu. */
export async function pulihkanAi(user, id, opts = {}) {
  const r = await bacaRiwayat('ai', id);
  const d = r.data || {};
  const provider = PROVIDERS.includes(d.provider) ? d.provider : '';
  const models = {};
  for (const p of PROVIDERS) { const m = d.models && d.models[p]; if (typeof m === 'string' && MODEL_RE.test(m)) models[p] = m; }
  await ubahAiDenganCadangan(user, 'sebelum-pulih', (cur, { oleh, waktu }) => ({ ...cur, provider, models, keys: { ...(cur.keys || {}) }, updatedBy: oleh, updatedAt: waktu, dipulihkanDari: r.id }), opts);
  return statusAi();
}

/** Ringkasan perubahan bila cadangan ini dipulihkan. */
export async function lihatAi(id) {
  const r = await bacaRiwayat('ai', id);
  const sekarang = dataDariDoc('ai', await bacaDoc());
  const { data: _d, ...meta } = r;
  return { meta, dapatDipulihkan: true, alasanTolak: '', perubahan: bandingkan('ai', r.data, sekarang || {}) };
}

/* ------------------------------------------------------------ Uji koneksi */

const UJI_MS = 30_000;
const NAMA = { gemini: 'Google Gemini', anthropic: 'Anthropic Claude' };
const TOOL_PING = { name: 'ping', description: 'Uji koneksi.', input_schema: { type: 'object', additionalProperties: false, required: ['ok'], properties: { ok: { type: 'boolean' } } } };

/**
 * Tahap 1 (tanpa memanggil AI, tidak memakai kuota): tentukan penyedia, model, dan kunci yang akan diuji.
 * `body.draft` (opsional) = isian formulir yang BELUM disimpan: { provider, models, keys }. Tidak ada yang ditulis ke Firestore.
 */
export async function siapkanUji(body = {}, { baca = bacaDoc, env = process.env } = {}) {
  const inp = validateConfigInput(body.draft && typeof body.draft === 'object' ? body.draft : {});
  let doc = null; let galatBaca = '';
  try { doc = await baca(); } catch (e) { galatBaca = String(e?.code ?? e?.message ?? 'tak diketahui'); }
  const merged = { ...(doc || {}), models: { ...((doc && doc.models) || {}) } };
  if (inp.provider) merged.provider = inp.provider;
  for (const [p, m] of Object.entries(inp.models)) { if (m) merged.models[p] = m; else delete merged.models[p]; }
  const aktif = resolveAi(merged, env);
  let { apiKey, sumberKunci } = aktif;
  const draf = !!(inp.provider || Object.keys(inp.models).length || Object.keys(inp.keys).length);
  if (inp.keys[aktif.provider]) { apiKey = inp.keys[aktif.provider]; sumberKunci = 'draf'; }
  const catatan = [];
  if (galatBaca) {
    if (!apiKey) throw new ApiError(500, 'CONFIG_READ_FAILED', `Pengaturan AI di Firestore tidak bisa dibaca (${galatBaca}), dan environment variable juga tidak berisi kunci ${NAMA[aktif.provider]}. Periksa FIREBASE_SERVICE_ACCOUNT dan Cloud Firestore API, atau isi GEMINI_API_KEY/ANTHROPIC_API_KEY di Vercel.`);
    catatan.push(`Pengaturan tersimpan tidak bisa dibaca (${galatBaca}); uji memakai environment variable.`);
  }
  if (!apiKey) {
    throw new ApiError(422, 'AI_KEY_MISSING', aktif.peringatan || `Kunci ${NAMA[aktif.provider]} belum ada. Tempel kunci di kolomnya (boleh diuji dulu sebelum disimpan), atau isi ${ENV_KEY[aktif.provider]} di Vercel.`);
  }
  if (aktif.peringatan) catatan.push(aktif.peringatan);
  return { provider: aktif.provider, model: aktif.model, apiKey, sumberKunci, draf, catatan };
}

/** Ubah galat panggilan uji menjadi pesan yang menunjuk penyebabnya (khusus admin, jadi boleh lebih rinci dari pesan pengguna). */
export function diagnosaUji(e, r) {
  if (e instanceof ApiError) return e;
  const nama = NAMA[r.provider];
  const status = e && e.status;
  const mentah = String((e && e.message) || '').split(r.apiKey).join('•••').replace(/\s+/g, ' ').slice(0, 220);
  const rinci = mentah ? ` Rincian dari penyedia: ${mentah}` : '';
  const h = e && e.headers;
  const ra = Number(typeof h?.get === 'function' ? h.get('retry-after') : h?.['retry-after']);
  const retryAfter = Number.isFinite(ra) && ra > 0 ? Math.ceil(ra) : undefined;
  if (status === 401 || status === 403) return new ApiError(502, 'AI_TEST_KEY', `${nama} menolak kunci API. Periksa salinan kunci (tanpa spasi), pastikan belum dicabut, dan API-nya aktif di proyek kunci itu.${rinci}`);
  if (status === 404) return new ApiError(502, 'AI_MODEL_NOT_FOUND', `Model "${r.model}" tidak ditemukan di ${nama} atau belum boleh dipakai kunci ini. Pilih salah satu tombol model di bawah atau ketik nama model yang benar.${rinci}`);
  if (status === 429) return new ApiError(429, 'RATE_LIMIT', `${nama} membatasi permintaan: kuota atau laju kunci ini tercapai. Tunggu lalu coba lagi, atau cek kuota di konsol penyedia.${rinci}`, { retryAfter: retryAfter ?? 30 });
  if (status === 400) return new ApiError(502, 'AI_TEST_REJECTED', `${nama} menolak permintaan uji. Biasanya nama model salah untuk jenis kunci ini.${rinci}`);
  if (status === 529 || (status >= 500 && status < 600)) return new ApiError(503, 'AI_OVERLOADED', `${nama} sedang bermasalah atau sibuk. Coba lagi sebentar lagi.${rinci}`, { retryAfter: retryAfter ?? 15 });
  if (e && (e.name === 'APIConnectionTimeoutError' || e.name === 'APIUserAbortError')) return new ApiError(504, 'AI_TIMEOUT', `Tidak ada balasan dari ${nama} dalam ${UJI_MS / 1000} detik. Coba lagi, atau pilih model yang lebih ringan.`);
  if (e && e.name === 'APIConnectionError') return new ApiError(503, 'AI_UNREACHABLE', `Server tidak dapat menjangkau ${nama}. Coba lagi.${rinci}`);
  return toApiError(e);
}

/** Tahap 2: satu panggilan kecil ke penyedia untuk memastikan kunci, model, dan pemanggilan alat berfungsi. */
export async function jalankanUji(r, { client } = {}) {
  const t0 = Date.now();
  try {
    const c = client || (await createClientFor(r.provider, r.apiKey, UJI_MS));
    const msg = await c.messages.create({
      model: r.model, max_tokens: 200, system: 'Panggil alat ping dengan ok=true.',
      tools: [TOOL_PING], tool_choice: { type: 'any' }, messages: [{ role: 'user', content: 'ping' }],
    });
    if (msg && msg.stop_reason === 'refusal') throw new ApiError(502, 'AI_MENOLAK', 'AI menolak permintaan uji karena kebijakan konten penyedia. Coba model lain.');
    const ok = (msg.content || []).some((b) => b.type === 'tool_use');
    if (!ok) throw new ApiError(502, 'AI_BAD_OUTPUT', 'AI membalas tetapi tidak memanggil alat uji. Model ini mungkin tidak mendukung pemanggilan alat; coba model lain.');
  } catch (e) { throw diagnosaUji(e, r); }
  return { ok: true, provider: r.provider, model: r.model, ms: Date.now() - t0, sumberKunci: r.sumberKunci, draf: r.draf, catatan: r.catatan };
}
