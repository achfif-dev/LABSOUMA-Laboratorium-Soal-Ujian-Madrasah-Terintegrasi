import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeminiClient, toGeminiSchema } from '../src/gemini.js';
import { TOOL_SOAL, TOOL_TOLAK, generateSoal, toApiError } from '../src/soalService.js';

const reply = (json, { status = 200, headers = {} } = {}) => ({ ok: status < 400, status, headers: { get: (k) => headers[k.toLowerCase()] ?? null }, json: async () => json });
const TEKS = 'الْمِيَاهُ الَّتِي يَجُوزُ بِهَا التَّطْهِيرُ سَبْعُ مِيَاهٍ: مَاءُ السَّمَاءِ، وَمَاءُ الْبَحْرِ، وَمَاءُ النَّهْرِ';
const soal = { stimulus: 's', pertanyaan: 'q?', pilihan_a: 'a', pilihan_b: 'b', pilihan_c: 'c', pilihan_d: 'd', pilihan_e: 'e', kunci_jawaban: 'C', pembahasan: 'p', indikator_kisi_kisi: 'Peserta didik dapat x' };

test('toGeminiSchema: tipe huruf besar, additionalProperties dibuang, enum dan items tetap', () => {
  const g = toGeminiSchema(TOOL_SOAL.input_schema);
  assert.equal(g.type, 'OBJECT');
  assert.equal(g.additionalProperties, undefined);
  assert.equal(g.properties.kunci_jawaban.type, 'STRING');
  assert.deepEqual(g.properties.kunci_jawaban.enum, ['A', 'B', 'C', 'D', 'E']);
  assert.deepEqual(g.required.slice(0, 2), ['stimulus', 'pertanyaan']);
  const arr = toGeminiSchema({ type: 'array', items: { type: 'object', additionalProperties: false, properties: { a: { type: 'string' } } } });
  assert.equal(arr.items.type, 'OBJECT'); assert.equal(arr.items.additionalProperties, undefined);
});

test('create: permintaan memakai kunci di header, mode ANY, dan hasil functionCall dipetakan', async () => {
  let seen;
  const c = createGeminiClient({ apiKey: 'KUNCI', fetchImpl: async (url, init) => { seen = { url, init }; return reply({ candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, text: 'mikir' }, { functionCall: { name: 'buat_soal', args: soal } }] } }] }); } });
  const r = await c.messages.create({ model: 'gemini-3.8-flash', max_tokens: 3000, system: 'SYS', tools: [TOOL_SOAL, TOOL_TOLAK], messages: [{ role: 'user', content: 'halo' }] });
  assert.deepEqual(r, { stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'buat_soal', input: soal }] });
  assert.match(seen.url, /models\/gemini-3\.8-flash:generateContent$/);
  assert.ok(!seen.url.includes('KUNCI'));
  assert.equal(seen.init.headers['x-goog-api-key'], 'KUNCI');
  const body = JSON.parse(seen.init.body);
  assert.equal(body.toolConfig.functionCallingConfig.mode, 'ANY');
  assert.equal(body.systemInstruction.parts[0].text, 'SYS');
  assert.equal(body.contents[0].role, 'user');
  assert.equal(body.tools[0].functionDeclarations.length, 2);
  assert.ok(body.generationConfig.maxOutputTokens >= 8192);
});

test('create: MAX_TOKENS, tanpa functionCall, dan error HTTP dipetakan', async () => {
  const mk = (resp) => createGeminiClient({ apiKey: 'k', sleep: async () => {}, fetchImpl: async () => resp });
  const args = { model: 'm', max_tokens: 10, system: '', tools: [TOOL_TOLAK], messages: [{ role: 'user', content: 'x' }] };
  assert.equal((await mk(reply({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [] } }] })).messages.create(args)).stop_reason, 'max_tokens');
  const none = await mk(reply({ candidates: [{ finishReason: 'STOP', content: { parts: [] } }] })).messages.create(args);
  assert.deepEqual(none, { stop_reason: 'end_turn', content: [] });
  const blok = await mk(reply({ promptFeedback: { blockReason: 'SAFETY' } })).messages.create(args);
  assert.deepEqual(blok, { stop_reason: 'refusal', content: [] }); // diblokir keamanan: bukan hasil kosong biasa

  const e429 = await mk(reply({ error: { message: 'quota', details: [{ retryDelay: '34.2s' }] } }, { status: 429 })).messages.create(args).catch((e) => e);
  assert.equal(toApiError(e429).code, 'RATE_LIMIT'); assert.equal(toApiError(e429).retryAfter, 35);
  const eKey = await mk(reply({ error: { message: 'API key not valid. Please pass a valid API key.' } }, { status: 400 })).messages.create(args).catch((e) => e);
  assert.equal(toApiError(eKey).code, 'SERVER_AUTH');
  const e503 = await mk(reply({ error: { message: 'overloaded' } }, { status: 503 })).messages.create(args).catch((e) => e);
  assert.equal(toApiError(e503).code, 'AI_OVERLOADED');
  const net = await createGeminiClient({ apiKey: 'k', fetchImpl: async () => { throw new Error('x'); } }).messages.create(args).catch((e) => e);
  assert.equal(toApiError(net).code, 'AI_UNREACHABLE');
  const slow = await createGeminiClient({ apiKey: 'k', timeoutMs: 10, fetchImpl: (u, { signal }) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(Object.assign(new Error('a'), { name: 'AbortError' })))) }).messages.create(args).catch((e) => e);
  assert.equal(toApiError(slow).code, 'AI_TIMEOUT');
});

test('generateSoal bekerja penuh lewat adapter Gemini', async () => {
  const c = createGeminiClient({ apiKey: 'k', fetchImpl: async () => reply({ candidates: [{ finishReason: 'STOP', content: { parts: [{ functionCall: { name: 'buat_soal', args: soal } }] } }] }) });
  const r = await generateSoal({ teks: TEKS, tingkat: 'MA', level: 'L3' }, { client: c });
  assert.equal(r.kunci_jawaban, 'C');
});

test('getClient memilih penyedia dari environment', async () => {
  const { getClient, getModel, provider } = await import('../src/soalService.js');
  const saved = { ...process.env };
  try {
    delete process.env.GEMINI_API_KEY; delete process.env.AI_MODEL; process.env.AI_PROVIDER = 'gemini';
    assert.equal(provider(), 'gemini'); assert.equal(getModel(), 'gemini-3.8-flash');
    await assert.rejects(getClient(), { code: 'SERVER_NOT_CONFIGURED', message: /GEMINI_API_KEY/ });
    process.env.AI_PROVIDER = 'anthropic'; assert.equal(getModel(), 'claude-sonnet-5-5');
    await assert.rejects(getClient(), { code: 'SERVER_NOT_CONFIGURED', message: /ANTHROPIC_API_KEY/ });
    process.env.AI_PROVIDER = 'lain';
    await assert.rejects(getClient(), { code: 'SERVER_NOT_CONFIGURED', message: /AI_PROVIDER/ });
    process.env.AI_MODEL = 'gemini-3.5-flash-lite'; assert.equal(getModel(), 'gemini-3.5-flash-lite');
  } finally { for (const k of ['AI_PROVIDER', 'AI_MODEL', 'GEMINI_API_KEY']) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } }
});

test('create: 503 sesaat dicoba ulang lalu berhasil; 503 terus-menerus berhenti setelah 3 percobaan', async () => {
  const args = { model: 'm', max_tokens: 10, system: '', tools: [TOOL_SOAL], messages: [{ role: 'user', content: 'x' }] };
  const ok = reply({ candidates: [{ finishReason: 'STOP', content: { parts: [{ functionCall: { name: 'buat_soal', args: soal } }] } }] });
  const sibuk = reply({ error: { message: 'The model is overloaded' } }, { status: 503 });

  let n = 0; const waits = [];
  const c1 = createGeminiClient({ apiKey: 'k', sleep: async (ms) => { waits.push(ms); }, fetchImpl: async () => (++n < 3 ? sibuk : ok) });
  assert.equal((await c1.messages.create(args)).stop_reason, 'tool_use');
  assert.equal(n, 3); assert.deepEqual(waits, [800, 1600]);

  let m = 0;
  const c2 = createGeminiClient({ apiKey: 'k', sleep: async () => {}, fetchImpl: async () => { m++; return sibuk; } });
  const e = await c2.messages.create(args).catch((x) => x);
  assert.equal(m, 3); assert.equal(toApiError(e).code, 'AI_OVERLOADED');

  let k = 0; // kesalahan klien (kunci salah, kuota) tidak dicoba ulang
  const c3 = createGeminiClient({ apiKey: 'k', sleep: async () => {}, fetchImpl: async () => { k++; return reply({ error: { message: 'quota' } }, { status: 429 }); } });
  await c3.messages.create(args).catch(() => {});
  assert.equal(k, 1);
});

test('gemini: blokir keamanan dipetakan ke stop_reason refusal, bukan hasil kosong', async () => {
  const mk = (json) => createGeminiClient({ apiKey: 'k', fetchImpl: async () => ({ ok: true, status: 200, headers: new Map(), json: async () => json }) });
  const args = { model: 'm', max_tokens: 100, system: 's', tools: [], messages: [{ role: 'user', content: 'x' }] };
  assert.equal((await mk({ promptFeedback: { blockReason: 'SAFETY' } }).messages.create(args)).stop_reason, 'refusal');
  assert.equal((await mk({ candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }] }).messages.create(args)).stop_reason, 'refusal');
});

test('gemini: percobaan ulang tidak melampaui anggaran waktu total', async () => {
  let n = 0; let t = 0; const realNow = Date.now; Date.now = () => t;
  try {
    const c = createGeminiClient({ apiKey: 'k', budgetMs: 45_000, sleep: async () => { t += 800; },
      fetchImpl: async () => { n++; t += 18_000; return { ok: false, status: 503, headers: new Map(), json: async () => ({}) }; } });
    await c.messages.create({ model: 'm', max_tokens: 1, system: 's', tools: [], messages: [{ role: 'user', content: 'x' }] }).catch(() => {});
    assert.ok(n <= 2, `terlalu banyak percobaan: ${n}`);
  } finally { Date.now = realNow; }
});
