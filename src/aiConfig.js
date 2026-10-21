// Pengaturan AI yang bisa diubah admin dari aplikasi (tanpa mengubah environment variable atau redeploy).
// Disimpan di Firestore config/ai (hanya Admin SDK yang bisa mengakses; aturan Firestore menolak klien).
// Kunci API dienkripsi dan TIDAK pernah dikirim ke browser: hanya 4 karakter terakhir yang ditampilkan.
// Urutan prioritas: pengaturan admin -> environment variable -> bawaan kode.
import { ApiError, setRuntimeAi, toApiError, getClient, getModel, provider as envProvider, DEFAULT_MODELS } from './soalService.js';
import { masterKey, encryptSecret, decryptSecret } from './secrets.js';
import { firestoreAdmin } from './platform.js';

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
  let doc = null;
  try { doc = await bacaDoc(); } catch (e) { console.error('[aiConfig] gagal membaca config/ai, memakai environment:', e?.code ?? e?.message); }
  const v = resolveAi(doc);
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
    modelBawaan: DEFAULT_MODELS, kunci,
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

export async function simpanAi(user, body, { now = () => new Date().toISOString() } = {}) {
  const inp = validateConfigInput(body);
  const { db } = await firestoreAdmin();
  const ref = db.doc(DOC);
  const snap = await ref.get();
  const cur = snap.exists ? snap.data() : {};
  const next = { provider: cur.provider || '', models: { ...(cur.models || {}) }, keys: { ...(cur.keys || {}) } };
  const who = user.email || user.uid;
  if (inp.provider) next.provider = inp.provider;
  for (const [p, m] of Object.entries(inp.models)) { if (m) next.models[p] = m; else delete next.models[p]; }
  const mk = Object.keys(inp.keys).length ? masterKey() : null;
  for (const [p, plain] of Object.entries(inp.keys)) {
    next.keys[p] = { enc: encryptSecret(plain, mk, `ai:${p}`), last4: plain.slice(-4), updatedBy: who, updatedAt: now() };
  }
  for (const p of inp.hapus) delete next.keys[p];
  next.updatedBy = who; next.updatedAt = now();
  await ref.set(next);
  invalidateAiConfig();
  return statusAi();
}

/** Satu panggilan kecil ke AI aktif untuk memastikan penyedia, model, dan kunci berfungsi. */
export async function ujiAi() {
  await loadAiConfig({ force: true });
  const client = await getClient();
  const t0 = Date.now();
  try {
    const msg = await client.messages.create({
      model: getModel(), max_tokens: 200, system: 'Panggil alat ping dengan ok=true.',
      tools: [{ name: 'ping', description: 'Uji koneksi.', input_schema: { type: 'object', additionalProperties: false, required: ['ok'], properties: { ok: { type: 'boolean' } } } }],
      tool_choice: { type: 'any' }, messages: [{ role: 'user', content: 'ping' }],
    });
    const ok = (msg.content || []).some((b) => b.type === 'tool_use');
    if (!ok) throw new ApiError(502, 'AI_BAD_OUTPUT', 'AI membalas tetapi tidak memanggil alat uji. Coba model lain.');
  } catch (e) { throw toApiError(e); }
  return { ok: true, provider: envProvider(), model: getModel(), ms: Date.now() - t0 };
}
