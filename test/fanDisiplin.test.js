// Ekstrak fakta, terjemah, dan analisis di Baca Kitab: disiplin baca mengikuti FAN KITAB dan isi teks, bukan mata pelajaran form Susun Soal.
// Mapel form hanya "tujuan soal" di metadata; AI dilarang menolak teks karena disiplinnya berbeda dari mapel itu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ekstrakFakta, verifikasiFakta, JENIS_FAKTA, TOOL_FAKTA } from '../src/faktaService.js';
import { terjemahTeks } from '../src/assistService.js';
import { skorCocok } from '../web/lib/rencanaSoal.js';

const TEKS = 'وَاعْلَمْ أَنَّ الْوَاجِبَ عَلَى الْمُكَلَّفِ أَنْ يَعْرِفَ مَا يَجِبُ لِلَّهِ تَعَالَى وَمَا يَسْتَحِيلُ عَلَيْهِ وَمَا يَجُوزُ فِي حَقِّهِ، وَهَذِهِ الْعَقِيدَةُ هِيَ أُمُّ الْبَرَاهِينِ وَهِيَ مِنْ عِلْمِ التَّوْحِيدِ';
const fake = (content) => { const calls = []; return { calls, messages: { create: async (r) => { calls.push(r); return { stop_reason: 'tool_use', content }; } } }; };
const fakta = { fakta: 'Mukallaf wajib mengetahui yang wajib, mustahil, dan jaiz bagi Allah.', kutipan: 'أَنَّ الْوَاجِبَ عَلَى الْمُكَلَّفِ أَنْ يَعْرِفَ مَا يَجِبُ لِلَّهِ تَعَالَى', jenis: 'sifat', tingkat_cocok: 'L1', pengecoh: ['Mukallaf cukup mengetahui yang wajib saja'] };
const kitabTauhid = { judulLatin: 'Syarh Umm al-Barahin', fan: 'Tauhid', otoritas: { status: 'muktamad', akidah: '', catatan: '' } };

test('ekstrakFakta: kitab fan Tauhid + mapel form Fiqih -> panduan disiplin akidah, mapel hanya tujuan soal', async () => {
  const c = fake([{ type: 'tool_use', name: 'daftar_fakta', input: { fakta: [fakta] } }]);
  const r = await ekstrakFakta({ teks: TEKS, nama: 'Syarh Umm al-Barahin', mapel: 'Fiqih', tingkat: 'Tsanawiyah (MTs)', _kitab: kitabTauhid }, { client: c });
  assert.equal(r.fakta.length, 1); assert.equal(r.fakta[0].jenis, 'sifat');
  const user = c.calls[0].messages[0].content;
  assert.match(user, /AKIDAH\/TAUHID/);
  assert.doesNotMatch(user, /<panduan_disiplin>\s*FIQIH:/);
  assert.match(user, /Mapel tujuan soal \(hanya informasi, bukan batas isi teks\): Fiqih/);
  assert.match(c.calls[0].system, /Dilarang memanggil tolak_teks karena disiplin teks/);
});

test('ekstrakFakta: kitab fan Fiqih tetap memakai panduan fiqih', async () => {
  const c = fake([{ type: 'tool_use', name: 'daftar_fakta', input: { fakta: [fakta] } }]);
  await ekstrakFakta({ teks: TEKS, mapel: 'Akidah', _kitab: { judulLatin: 'Fathul Qarib', fan: 'Fiqih' } }, { client: c });
  assert.match(c.calls[0].messages[0].content, /FIQIH:/);
});

test('ekstrakFakta: tanpa fan kitab (teks ditempel), disiplin dihitung dari isi teks, bukan dari mapel form', async () => {
  const c = fake([{ type: 'tool_use', name: 'daftar_fakta', input: { fakta: [fakta] } }]);
  await ekstrakFakta({ teks: TEKS, mapel: 'Fiqih' }, { client: c });
  const user = c.calls[0].messages[0].content;
  assert.match(user, /<panduan_disiplin>\s*AKIDAH/);
});

test('terjemahTeks: kitab tauhid + mapel Fiqih juga tidak dipaksa ke disiplin fiqih', async () => {
  const c = fake([{ type: 'tool_use', name: 'hasil_terjemah', input: { terjemah: 'Ketahuilah ...', poin_inti: ['a', 'b'], istilah: [], catatan_baca: [] } }]);
  await terjemahTeks({ teks: TEKS, mapel: 'Fiqih', _kitab: kitabTauhid }, { client: c });
  assert.match(c.calls[0].messages[0].content, /AKIDAH\/TAUHID/);
  assert.match(c.calls[0].system, /JANGAN menolak teks karena disiplinnya/);
});

test('jenis fakta non-fiqh sah, tidak jatuh ke "hukum", dan tercantum di skema alat', () => {
  for (const j of ['sifat', 'rukun', 'kaidah', 'kisah', 'adab']) assert.ok(JENIS_FAKTA.includes(j));
  assert.deepEqual(TOOL_FAKTA.input_schema.properties.fakta.items.properties.jenis.enum, JENIS_FAKTA);
  const v = verifikasiFakta(fakta, TEKS);
  assert.equal(v.jenis, 'sifat');
  assert.equal(verifikasiFakta({ ...fakta, jenis: 'ngawur' }, TEKS).jenis, 'hukum');
});

test('rencanaSoal: jenis sifat/kaidah dikenali (skor lebih baik daripada jenis tak dikenal)', () => {
  assert.ok(skorCocok({ jenis: 'sifat', tingkat_cocok: 'L1' }, 'L1') < skorCocok({ jenis: 'tidak_ada', tingkat_cocok: 'L1' }, 'L1'));
  assert.ok(skorCocok({ jenis: 'kaidah', tingkat_cocok: 'L3' }, 'L3') < 9);
});
