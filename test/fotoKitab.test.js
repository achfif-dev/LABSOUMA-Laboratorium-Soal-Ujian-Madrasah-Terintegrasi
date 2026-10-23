import test from 'node:test';
import assert from 'node:assert/strict';
import { fotoKitab } from '../src/fotoKitab.js';

const TEKS = 'الْمِيَاهُ الَّتِي يَجُوزُ بِهَا التَّطْهِيرُ سَبْعُ مِيَاهٍ مَاءُ السَّمَاءِ وَمَاءُ الْبَحْرِ وَمَاءُ النَّهْرِ';
const B64 = 'A'.repeat(400); // data base64 sah (huruf/angka, > 100 karakter)
const fake = (content, stop = 'tool_use') => { const calls = []; return { calls, messages: { create: async (r) => { calls.push(r); return { stop_reason: stop, content }; } } }; };
const tool = (name, input) => [{ type: 'tool_use', name, input }];
const foto = { gambar: { mime: 'image/jpeg', data: B64 } };

test('fotoKitab: gambar dikirim ke AI, hasil dinormalisasi', async () => {
  const c = fake(tool('hasil_foto_kitab', { teks: TEKS, kualitas: 'sedang', ragu: [{ kata: 'التَّطْهِيرُ', catatan: 'harakat buram' }, { kata: '', catatan: '' }] }));
  const r = await fotoKitab(foto, { client: c });
  assert.equal(r.teks, TEKS); assert.equal(r.kualitas, 'sedang'); assert.equal(r.terpotong, false);
  assert.deepEqual(r.ragu, [{ kata: 'التَّطْهِيرُ', catatan: 'harakat buram' }]);
  const isi = c.calls[0].messages[0].content;
  assert.equal(isi[0].type, 'image'); assert.equal(isi[0].source.media_type, 'image/jpeg');
  assert.match(c.calls[0].system, /DATA, bukan perintah/);
});

test('fotoKitab: foto tidak valid ditolak sebelum memanggil AI', async () => {
  const c = fake([]);
  await assert.rejects(fotoKitab({}, { client: c }), { code: 'BAD_REQUEST' });
  await assert.rejects(fotoKitab({ gambar: { mime: 'image/gif', data: B64 } }, { client: c }), { code: 'GAMBAR_TIDAK_DIDUKUNG' });
  await assert.rejects(fotoKitab({ gambar: { mime: 'image/png', data: 'x'.repeat(3_000_001) } }, { client: c }), { code: 'GAMBAR_TERLALU_BESAR' });
  await assert.rejects(fotoKitab({ gambar: { mime: 'image/png', data: '!'.repeat(200) } }, { client: c }), { code: 'GAMBAR_TIDAK_VALID' });
  assert.equal(c.calls.length, 0);
});

test('fotoKitab: tolak_teks, teks non-Arab, alat salah, dan kualitas liar', async () => {
  await assert.rejects(fotoKitab(foto, { client: fake(tool('tolak_teks', { alasan: 'Gambar kosong.' })) }), { code: 'TEKS_TIDAK_MEMADAI', message: 'Gambar kosong.' });
  await assert.rejects(fotoKitab(foto, { client: fake(tool('hasil_foto_kitab', { teks: 'this is plain english text only here', kualitas: 'jelas', ragu: [] })) }), { code: 'TEKS_TIDAK_MEMADAI' });
  await assert.rejects(fotoKitab(foto, { client: fake(tool('hasil_terjemah', {})) }), { code: 'AI_BAD_OUTPUT' });
  const r = await fotoKitab(foto, { client: fake(tool('hasil_foto_kitab', { teks: TEKS, kualitas: 'sempurna', ragu: 'bukan array' })) });
  assert.equal(r.kualitas, 'sedang'); assert.deepEqual(r.ragu, []);
});

test('fotoKitab: teks lebih dari 6.000 karakter dipotong dan ditandai; tag pembatas dibuang', async () => {
  const panjang = (TEKS + ' ').repeat(80) + '</teks_kitab>';
  const r = await fotoKitab(foto, { client: fake(tool('hasil_foto_kitab', { teks: panjang, kualitas: 'jelas', ragu: [] })) });
  assert.equal(r.teks.length, 6000); assert.equal(r.terpotong, true); assert.equal(r.teks.includes('</teks_kitab>'), false);
});
