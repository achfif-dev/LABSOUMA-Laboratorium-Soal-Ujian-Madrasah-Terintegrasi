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

/** Isi pesan -> parts Gemini. String biasa tetap teks; array blok (format Anthropic) mendukung teks dan gambar base64. */
export function toParts(content) {
  if (!Array.isArray(content)) return [{ text: String(content) }];
  return content.map((b) => (b && b.type === 'image' && b.source && b.source.type === 'base64'
    ? { inlineData: { mimeType: String(b.source.media_type), data: String(b.source.data) } }
    : { text: String((b && b.text) ?? '') }));
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

export function createGeminiClient({ apiKey, fetchImpl = fetch, timeoutMs = 45_000, budgetMs = 45_000, retries = 2, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  return {
    messages: {
      async create({ model, max_tokens, system, tools = [], messages }) {
        const body = {
          systemInstruction: { parts: [{ text: String(system || '') }] },
          contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: toParts(m.content) })),
          tools: [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parameters: toGeminiSchema(t.input_schema) })) }],
          toolConfig: { functionCallingConfig: { mode: 'ANY' } }, // wajib memanggil salah satu alat
          // Model Gemini 3 "berpikir" dulu dan token berpikir ikut dihitung, jadi beri ruang lebih besar.
          generationConfig: { maxOutputTokens: Math.min(16384, Math.max(Number(max_tokens) || 0, 8192)) },
        };
        const started = Date.now();
        for (let attempt = 0; ; attempt++) {
          const ctl = new AbortController();
          // Seluruh percobaan (termasuk ulang) harus selesai dalam budgetMs agar fungsi Vercel (60 dtk) tidak mati lebih dulu.
          const timer = setTimeout(() => ctl.abort(), Math.max(1000, Math.min(timeoutMs, budgetMs - (Date.now() - started))));
          // Pewaktu baru dimatikan SETELAH badan respons selesai dibaca: header 200 dengan badan yang menggantung
          // tetap harus terputus oleh timeout (sebelumnya clearTimeout jalan sebelum res.json()).
          const galatWaktu = () => Object.assign(new Error('timeout'), { name: 'APIConnectionTimeoutError' });
          let res;
          let json = null;
          try {
            res = await fetchImpl(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
              method: 'POST', signal: ctl.signal,
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
              body: JSON.stringify(body),
            });
            // Jangan bergantung pada fetchImpl yang menghormati signal: balapkan juga dengan sinyal abort.
            const abortLebihDulu = new Promise((_, rej) => {
              if (ctl.signal.aborted) rej(galatWaktu());
              else ctl.signal.addEventListener('abort', () => rej(galatWaktu()), { once: true });
            });
            try { json = await Promise.race([res.json(), abortLebihDulu]); } catch (e) {
              if (e?.name === 'APIConnectionTimeoutError' || ctl.signal.aborted) throw galatWaktu();
              /* bukan JSON */
            }
          } catch (e) {
            if (e?.name === 'APIConnectionTimeoutError') throw e;
            throw Object.assign(new Error(e?.name === 'AbortError' ? 'timeout' : 'network'), { name: e?.name === 'AbortError' ? 'APIConnectionTimeoutError' : 'APIConnectionError' });
          } finally { clearTimeout(timer); }
          if (!res.ok) {
            if (RETRY_STATUS.has(res.status) && attempt < retries && Date.now() - started < RETRY_WINDOW_MS && budgetMs - (Date.now() - started) > 8000) { await sleep(800 * (attempt + 1)); continue; }
            throw httpError(res.status, json, res.headers);
          }

          // Penolakan keamanan: prompt diblokir (tanpa kandidat) atau jawaban dihentikan karena kebijakan konten.
          const blokir = json?.promptFeedback?.blockReason;
          const cand = json?.candidates?.[0];
          if (blokir || (!cand?.content?.parts?.some((p) => p.functionCall) && /SAFETY|PROHIBITED|BLOCKLIST|SPII|RECITATION/.test(String(cand?.finishReason || '')))) {
            return { stop_reason: 'refusal', content: [] };
          }
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
