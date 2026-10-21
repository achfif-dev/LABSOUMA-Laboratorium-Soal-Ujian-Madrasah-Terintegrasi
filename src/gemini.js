// Adapter Gemini (REST generateContent) yang meniru bentuk client.messages.create() milik Anthropic,
// sehingga seluruh layanan soal bisa dipakai dengan kedua penyedia AI tanpa perubahan.
// Tanpa dependensi: hanya fetch.

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Skema JSON Schema (Anthropic) -> Schema Gemini: tipe huruf besar, tanpa additionalProperties. */
export function toGeminiSchema(s) {
  if (Array.isArray(s)) return s.map(toGeminiSchema);
  if (!s || typeof s !== 'object') return s;
  const out = {};
  for (const [k, v] of Object.entries(s)) {
    if (k === 'additionalProperties') continue;
    if (k === 'type' && typeof v === 'string') out.type = v.toUpperCase();
    else if (k === 'properties') out.properties = Object.fromEntries(Object.entries(v).map(([pk, pv]) => [pk, toGeminiSchema(pv)]));
    else if (k === 'items') out.items = toGeminiSchema(v);
    else out[k] = v;
  }
  return out;
}

const retrySeconds = (json, headers) => {
  const h = Number(headers?.get?.('retry-after'));
  if (Number.isFinite(h) && h > 0) return Math.ceil(h);
  for (const d of json?.error?.details || []) {
    const m = /^(\d+(?:\.\d+)?)s$/.exec(String(d?.retryDelay || ''));
    if (m) return Math.ceil(Number(m[1]));
  }
  return undefined;
};

function httpError(status, json, headers) {
  const message = String(json?.error?.message || `Gemini membalas dengan kode ${status}`);
  let code = status;
  if (status === 400 && /api key/i.test(message)) code = 401; // kunci salah dikembalikan Gemini sebagai 400
  const err = new Error(message);
  err.status = code;
  const ra = retrySeconds(json, headers);
  err.headers = ra ? { 'retry-after': String(ra) } : {};
  return err;
}

// Google kadang membalas 500/502/503/504 sesaat ("model overloaded"). Coba ulang sebentar, tetapi hanya bila
// masih ada waktu: fungsi Vercel dibatasi 60 detik, jadi percobaan ulang berhenti setelah RETRY_WINDOW_MS.
const RETRY_STATUS = new Set([500, 502, 503, 504]);
const RETRY_WINDOW_MS = 20_000;

export function createGeminiClient({ apiKey, fetchImpl = fetch, timeoutMs = 55_000, retries = 2, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  return {
    messages: {
      async create({ model, max_tokens, system, tools = [], messages }) {
        const body = {
          systemInstruction: { parts: [{ text: String(system || '') }] },
          contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content) }] })),
          tools: [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parameters: toGeminiSchema(t.input_schema) })) }],
          toolConfig: { functionCallingConfig: { mode: 'ANY' } }, // wajib memanggil salah satu alat
          // Model Gemini 3 "berpikir" dulu dan token berpikir ikut dihitung, jadi beri ruang lebih besar.
          generationConfig: { maxOutputTokens: Math.min(16384, Math.max(Number(max_tokens) || 0, 8192)) },
        };
        const started = Date.now();
        for (let attempt = 0; ; attempt++) {
          const ctl = new AbortController();
          const timer = setTimeout(() => ctl.abort(), timeoutMs);
          let res;
          try {
            res = await fetchImpl(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
              method: 'POST', signal: ctl.signal,
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
              body: JSON.stringify(body),
            });
          } catch (e) {
            throw Object.assign(new Error(e?.name === 'AbortError' ? 'timeout' : 'network'), { name: e?.name === 'AbortError' ? 'APIConnectionTimeoutError' : 'APIConnectionError' });
          } finally { clearTimeout(timer); }

          let json = null;
          try { json = await res.json(); } catch { /* bukan JSON */ }
          if (!res.ok) {
            if (RETRY_STATUS.has(res.status) && attempt < retries && Date.now() - started < RETRY_WINDOW_MS) { await sleep(800 * (attempt + 1)); continue; }
            throw httpError(res.status, json, res.headers);
          }

          const cand = json?.candidates?.[0];
          const parts = cand?.content?.parts || [];
          const calls = parts.filter((p) => p.functionCall).map((p) => ({ type: 'tool_use', name: p.functionCall.name, input: p.functionCall.args || {} }));
          const stop_reason = cand?.finishReason === 'MAX_TOKENS' ? 'max_tokens' : calls.length ? 'tool_use' : 'end_turn';
          const content = calls.length ? calls : parts.filter((p) => p.text && !p.thought).map((p) => ({ type: 'text', text: p.text }));
          return { stop_reason, content };
        }
      },
    },
  };
}
