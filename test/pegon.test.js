import test from 'node:test';
import assert from 'node:assert/strict';
import { convertText, kamus, kalibrasiOk } from '../src/pegon.js';
import { perkuatPegon, fotoPegon, validateFoto, validatePegon } from '../src/pegonService.js';
import { toParts } from '../src/gemini.js';

const fake = (content) => { const calls = []; return { calls, messages: { create: async (r) => { calls.push(r); return { stop_reason: 'tool_use', content }; } } }; };
const tool = (name, input) => [{ type: 'tool_use', name, input }];
const B64 = 'A'.repeat(200);

test('mesin Pegon: kalibrasi master prompt tetap cocok', () => {
  assert.equal(kalibrasiOk(), true);
});

test('mesin Pegon: kata bernama sama dengan properti Object tidak bocor ke hasil', () => {
  for (const w of ['constructor', 'toString', 'valueOf', '__proto__', 'hasOwnProperty']) {
    const { pegon } = convertText(w);
    assert.doesNotMatch(pegon, /function|native code|\[object/i, w);
    assert.match(pegon, /[\u0600-\u06FF]/, w);
  }
});

test('mesin Pegon: aksara Arab di teks sumber tidak diubah, koma dan tanda tanya diarabkan', () => {
  const { pegon } = convertText('hukum الماء, apa?');
  assert.ok(pegon.includes('الماء'));
  assert.ok(pegon.includes('،') && pegon.includes('؟'));
});

test('kamus: entri tak valid ditolak, impor melewati entri buruk tanpa menggagalkan sisanya', () => {
  assert.equal(kamus.tambahArab('__proto__', 'علم').ok, false);
  assert.equal(kamus.tambahArab('x', '<img onerror=1>').ok, false);
  assert.equal(kamus.tambahE('', 'keras').ok, false);
  const r = kamus.impor('{"arabic":{"tawakalku":"توكلكم","bad<":"x"},"keras":["rekenku"]}');
  assert.deepEqual(r, { masuk: 2, lewat: 1 });
  assert.equal(kamus.kustom().arab.tawakalku, 'توكلكم');
  assert.throws(() => kamus.impor('bukan json'));
  kamus.hapusArab('tawakalku'); kamus.hapusE('rekenku');
  assert.equal(kamus.kosong(), true);
});

test('pegon AI: input divalidasi sebelum memanggil AI, keluaran dinormalisasi', async () => {
  const c = fake(tool('hasil_pegon', { pegon: ' كتاب ', peringatan: [{ kata: 'kitab', catatan: 'cek' }, { kata: '', catatan: '' }] }));
  const r = await perkuatPegon({ teks: 'kitab fiqih', hasilMesin: 'كتاب فقه' }, { client: c });
  assert.equal(r.pegon, 'كتاب');
  assert.equal(r.peringatan.length, 1);
  assert.match(c.calls[0].messages[0].content, /<teks_latin>/);
  assert.match(c.calls[0].system, /al-Qolam/);
  await assert.rejects(perkuatPegon({ teks: 'الماء', hasilMesin: 'x' }, { client: c }), { code: 'TEKS_KOSONG' });
  await assert.rejects(perkuatPegon({ teks: 'kitab', hasilMesin: '' }, { client: c }), { code: 'TEKS_KOSONG' });
  assert.equal(c.calls.length, 1);
  await assert.rejects(perkuatPegon({ teks: 'kitab', hasilMesin: 'x' }, { client: fake(tool('hasil_pegon', { pegon: '' })) }), { code: 'AI_BAD_OUTPUT' });
  assert.throws(() => validatePegon({ teks: 'a'.repeat(7000), hasilMesin: 'x' }), { code: 'TEKS_TOO_LONG' });
});

test('pegon foto: gambar divalidasi dan dikirim sebagai blok gambar', async () => {
  assert.throws(() => validateFoto({ gambar: { mime: 'image/gif', data: B64 } }), { code: 'GAMBAR_TIDAK_DIDUKUNG' });
  assert.throws(() => validateFoto({ gambar: { mime: 'image/png', data: 'bukan base64!!' } }), { code: 'GAMBAR_TIDAK_VALID' });
  assert.throws(() => validateFoto({ gambar: { mime: 'image/png', data: 'A'.repeat(3_000_001) } }), { code: 'GAMBAR_TERLALU_BESAR' });
  assert.throws(() => validateFoto({}), { code: 'BAD_REQUEST' });
  const c = fake(tool('hasil_pegon_foto', { latin: 'kitab', pegon: 'كتاب', peringatan: [] }));
  const r = await fotoPegon({ gambar: { mime: 'image/jpeg', data: B64 } }, { client: c });
  assert.deepEqual([r.latin, r.pegon], ['kitab', 'كتاب']);
  const isi = c.calls[0].messages[0].content;
  assert.equal(isi[0].type, 'image');
  assert.equal(isi[0].source.media_type, 'image/jpeg');
  await assert.rejects(fotoPegon({ gambar: { mime: 'image/png', data: B64 } }, { client: fake(tool('hasil_pegon_foto', { latin: '', pegon: 'x' })) }), { code: 'AI_BAD_OUTPUT' });
});

test('adapter Gemini: teks biasa tetap teks, blok gambar menjadi inlineData', () => {
  assert.deepEqual(toParts('halo'), [{ text: 'halo' }]);
  assert.deepEqual(toParts([{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'QUJD' } }, { type: 'text', text: 'baca' }]),
    [{ inlineData: { mimeType: 'image/png', data: 'QUJD' } }, { text: 'baca' }]);
});
