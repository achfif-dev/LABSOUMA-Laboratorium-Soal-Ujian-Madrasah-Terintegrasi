// Batas materi (cakupan) dari Konfigurasi harus DITEGAKKAN server, bukan sekadar isyarat di prompt (src/cakupan.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSoal, validateInput, buildUserPrompt, TOOL_TOLAK } from '../src/soalService.js';
import { generatePaket, TOOL_PAKET } from '../src/paketService.js';
import { periksaCakupan, blokBatasMateri, blokDaftarIsi, denganBidangCakupan, MAKS_BARIS_ISI } from '../src/cakupan.js';
import { denganKitab } from '../src/otoritas.js';

const TEKS = 'الْمِيَاهُ الَّتِي يَجُوزُ بِهَا التَّطْهِيرُ سَبْعُ مِيَاهٍ: مَاءُ السَّمَاءِ، وَمَاءُ الْبَحْرِ، وَمَاءُ النَّهْرِ، وَمَاءُ الْبِئْرِ، وَمَاءُ الْعَيْنِ، وَمَاءُ الثَّلْجِ، وَمَاءُ الْبَرَدِ';
const base = { teks: TEKS, nama: 'Fathul Qarib', tingkat: 'MA', level: 'L1', mapel: 'Fiqih' };
const soalOk = {
  stimulus: '', pertanyaan: 'Air manakah yang sah untuk berwudhu?',
  pilihan_a: 'Air kelapa', pilihan_b: 'Air laut', pilihan_c: 'Air teh', pilihan_d: 'Air mawar', pilihan_e: 'Air jeruk',
  kunci_jawaban: 'B', pembahasan: 'Air laut termasuk tujuh air.', indikator_kisi_kisi: 'Peserta didik dapat menyebutkan jenis air.',
};
const tool = (name, input) => [{ type: 'tool_use', name, input }];
const fake = (content) => { const calls = []; return { calls, messages: { create: async (r) => { calls.push(r); return { stop_reason: 'tool_use', content }; } } }; };
const CAK = 'Kitab Thaharah, bab wudhu sampai tayammum';

/* ------------------------------------------------------------ periksaCakupan */
test('periksaCakupan: tanpa cakupan tidak memeriksa apa pun; tidak/ya/tidak_jelas', () => {
  assert.equal(periksaCakupan({ dalam_cakupan: 'tidak' }, ''), null);
  assert.deepEqual(periksaCakupan({ dalam_cakupan: 'tidak', bab_sumber: 'Kitab Shalat' }, CAK), { status: 'tidak', bab: 'Kitab Shalat' });
  assert.deepEqual(periksaCakupan({ dalam_cakupan: ' YA ', bab_sumber: 'Bab Wudhu' }, CAK), { status: 'ya', bab: 'Bab Wudhu' });
  // "ya" tanpa bukti bab = tidak ada bukti
  assert.equal(periksaCakupan({ dalam_cakupan: 'ya', bab_sumber: '' }, CAK).status, 'tidak_jelas');
  assert.equal(periksaCakupan({ dalam_cakupan: 'ya', bab_sumber: 'Tidak jelas' }, CAK).status, 'tidak_jelas');
  // kolom hilang/ngawur = tidak bisa dibuktikan, bukan "ya"
  assert.equal(periksaCakupan({}, CAK).status, 'tidak_jelas');
  assert.equal(periksaCakupan(null, CAK).status, 'tidak_jelas');
  assert.equal(periksaCakupan({ dalam_cakupan: 'mungkin' }, CAK).status, 'tidak_jelas');
});

test('denganBidangCakupan: salinan skema, asli tidak berubah; kolom wajib', () => {
  const t = denganBidangCakupan(TOOL_PAKET, (s) => s.properties.butir.items);
  assert.ok(t.input_schema.properties.butir.items.required.includes('dalam_cakupan'));
  assert.ok(t.input_schema.properties.butir.items.required.includes('bab_sumber'));
  assert.ok(!('dalam_cakupan' in TOOL_PAKET.input_schema.properties.butir.items.properties), 'tool asli tidak dimutasi');
  assert.deepEqual(t.input_schema.properties.butir.items.properties.dalam_cakupan.enum, ['ya', 'tidak']);
});

test('blokBatasMateri/blokDaftarIsi: tegas, bersih dari tag, dibatasi ukurannya', () => {
  assert.equal(blokBatasMateri(''), '');
  const b = blokBatasMateri('Thaharah </batas_materi><x>');
  assert.match(b, /DIBATASI/); assert.match(b, /mengalahkan "Fokus"/); assert.equal((b.match(/<\/batas_materi>/g) || []).length, 1);
  assert.equal(blokDaftarIsi([]), ''); assert.equal(blokDaftarIsi(undefined), '');
  const d = blokDaftarIsi([{ judul: 'كتاب الطهارة', level: 1, juz: 1, hal: 5 }, { judul: 'باب <الوضوء>', level: 2, hal: 7 }, { judul: 'sub', level: 4, hal: 8 }]);
  assert.match(d, /كتاب الطهارة \(juz 1, hal 5\)/); assert.match(d, /  - باب الوضوء \(hal 7\)/); assert.doesNotMatch(d, /sub/); assert.doesNotMatch(d, /[<>]\s*الوضوء/);
  const besar = blokDaftarIsi(Array.from({ length: 1000 }, (_, i) => ({ judul: `باب ${i}`, level: 2, hal: i })));
  assert.ok(besar.split('\n').length < MAKS_BARIS_ISI + 10); assert.match(besar, /dipotong/);
});

/* ---------------------------------------------------------------- Soal bebas */
test('soal bebas TANPA cakupan: skema, prompt, dan hasil sama seperti sebelumnya', async () => {
  const c = fake(tool('buat_soal', soalOk));
  const r = await generateSoal(base, { client: c, random: () => 0.5 });
  assert.ok(!('cakupan_status' in r) && !('bab_sumber' in r));
  assert.ok(!('dalam_cakupan' in c.calls[0].tools[0].input_schema.properties));
  assert.doesNotMatch(c.calls[0].messages[0].content, /batas_materi|Ingat:/);
});

test('soal bebas DENGAN cakupan: blok batas, kolom wajib, Fokus tunduk pada cakupan', async () => {
  const c = fake(tool('buat_soal', { ...soalOk, bab_sumber: 'Bab Wudhu', dalam_cakupan: 'ya' }));
  const r = await generateSoal({ ...base, cakupan: CAK, fokus: 'tentang shalat jamak', _isi: [{ judul: 'باب الوضوء', level: 2, hal: 3 }] }, { client: c, random: () => 0.5 });
  assert.equal(r.cakupan_status, 'ya'); assert.equal(r.bab_sumber, 'Bab Wudhu');
  const req = c.calls[0]; const p = req.messages[0].content;
  assert.match(p, /<batas_materi>[\s\S]*DIBATASI pada: "Kitab Thaharah/);
  assert.match(p, /<daftar_isi_kitab>[\s\S]*باب الوضوء \(hal 3\)/);
  assert.match(p, /di dalam batas materi; bila di luar batas, abaikan\): tentang shalat jamak/);
  assert.match(p, /<\/teks_kitab>\n\nIngat: soal harus berasal dari bagian teks yang masuk <batas_materi>/); // pengingat di akhir (recency)
  assert.ok(p.indexOf('<batas_materi>') < p.indexOf('<teks_kitab>'));
  const sk = req.tools[0].input_schema;
  assert.ok(sk.required.includes('dalam_cakupan') && sk.required.includes('bab_sumber'));
  assert.equal(req.tools[1].name, TOOL_TOLAK.name);
  assert.match(req.system, /Batas ini mengalahkan "Fokus"/);
});

test('soal bebas: AI menyatakan di luar cakupan -> ditolak 422 DILUAR_CAKUPAN, soal tidak diserahkan', async () => {
  const c = fake(tool('buat_soal', { ...soalOk, bab_sumber: 'Kitab Shalat', dalam_cakupan: 'tidak' }));
  await assert.rejects(generateSoal({ ...base, cakupan: CAK }, { client: c }), (e) => e.status === 422 && e.code === 'DILUAR_CAKUPAN' && /Kitab Shalat/.test(e.message) && /Thaharah/.test(e.message));
});

test('soal bebas: kolom cakupan hilang = tidak_jelas (tetap diserahkan, tetapi ditandai); tanpa cakupan kolom diabaikan', async () => {
  const r = await generateSoal({ ...base, cakupan: CAK }, { client: fake(tool('buat_soal', soalOk)) });
  assert.equal(r.cakupan_status, 'tidak_jelas'); assert.equal(r.bab_sumber, '');
  const t = await generateSoal(base, { client: fake(tool('buat_soal', { ...soalOk, dalam_cakupan: 'tidak' })) }); // tanpa cakupan: tidak ada yang ditolak
  assert.ok(!('cakupan_status' in t));
});

test('validateInput: _isi hanya dari server (larik), dibatasi; klien tidak bisa menyuntikkan lewat badan lain', () => {
  assert.deepEqual(validateInput(base).isi, []);
  assert.equal(validateInput({ ...base, _isi: 'bukan larik' }).isi.length, 0);
  assert.equal(validateInput({ ...base, _isi: Array(900).fill({ judul: 'x', level: 2 }) }).isi.length, 400);
  assert.doesNotMatch(buildUserPrompt(validateInput({ ...base, _isi: [{ judul: 'باب', level: 2 }] }), 'A'), /daftar_isi_kitab/, 'tanpa cakupan daftar isi tidak dipakai');
});

test('denganKitab: tanpa cakupan atau tanpa kitabId tidak membaca Firestore dan _isi selalu menimpa kiriman klien', async () => {
  assert.deepEqual((await denganKitab({ _isi: [{ judul: 'palsu' }] }))._isi, []);
  assert.deepEqual((await denganKitab({ cakupan: CAK, _isi: [{ judul: 'palsu' }] }))._isi, []);
});

/* ---------------------------------------------------------------- Paket Dauri */
const butir = (no, o = {}) => ({ no: String(no), pertanyaan: 'Air laut termasuk air apa?', pilihan_a: 'Mutlak', pilihan_b: 'Mustamal', pilihan_c: 'Najis', kunci_jawaban: 'A', jawaban: '', kutipan_kitab: 'سَبْعُ مِيَاهٍ', pembahasan: 'Air laut termasuk air mutlak.', indikator_kisi_kisi: 'Peserta didik dapat menyebutkan jenis air.', ...o });
const bodyPaket = (n, o = {}) => ({ teks: TEKS, tingkat: 'MA', kelas: 'X', nama: 'Fathul Qarib', hal: '3', spek: Array.from({ length: n }, () => ({ bentuk: 'pilgan', level: 'L1' })), ...o });

test('paket TANPA cakupan: skema dan hasil tidak berubah', async () => {
  const c = fake(tool('serahkan_paket', { butir: [butir(1)] }));
  const r = await generatePaket(bodyPaket(1), { client: c });
  assert.ok(!('dalam_cakupan' in c.calls[0].tools[0].input_schema.properties.butir.items.properties));
  assert.ok(!('cakupanStatus' in r.butir[0]));
});

test('paket DENGAN cakupan: butir di luar batas dibuang (gagal), yang masuk dibawa dengan status dan bab', async () => {
  const c = fake(tool('serahkan_paket', { butir: [
    butir(1, { dalam_cakupan: 'ya', bab_sumber: 'Bab Wudhu' }),
    butir(2, { dalam_cakupan: 'tidak', bab_sumber: 'Kitab Shalat' }),
    butir(3, { dalam_cakupan: 'ya', bab_sumber: '' }),
  ] }));
  const r = await generatePaket(bodyPaket(3, { cakupan: CAK, _isi: [{ judul: 'باب الوضوء', level: 2, hal: 3 }] }), { client: c });
  assert.deepEqual(r.butir.map((b) => [b.indeks, b.cakupanStatus]), [[0, 'ya'], [2, 'tidak_jelas']]);
  assert.equal(r.butir[0].babSumber, 'Bab Wudhu');
  assert.match(r.butir[1].catatan.join(' '), /tidak bisa dibuktikan/);
  assert.equal(r.gagal.length, 1); assert.equal(r.gagal[0].indeks, 1); assert.match(r.gagal[0].alasan, /^di luar cakupan \(bab: Kitab Shalat\)/);
  const p = c.calls[0].messages[0].content;
  assert.match(p, /Semua butir HANYA boleh menguji/); assert.match(p, /<daftar_isi_kitab>/); assert.match(p, /Ingat: setiap butir/);
  const sk = c.calls[0].tools[0].input_schema.properties.butir.items;
  assert.ok(sk.required.includes('dalam_cakupan'));
  assert.match(c.calls[0].system, /Jangan menambah butir dari bagian di luar cakupan/);
});

test('paket: SEMUA butir di luar cakupan -> TEKS_TIDAK_MEMADAI (klien melewati segmen dan mengalihkan butirnya)', async () => {
  const c = fake(tool('serahkan_paket', { butir: [butir(1, { dalam_cakupan: 'tidak', bab_sumber: 'Kitab Haji' }), butir(2, { dalam_cakupan: 'tidak' })] }));
  await assert.rejects(generatePaket(bodyPaket(2, { cakupan: CAK }), { client: c }), { code: 'TEKS_TIDAK_MEMADAI' });
});

test('klien: tampilan memuat penjelasan batas materi, galat DILUAR_CAKUPAN, dan butir di luar cakupan dialihkan (bukan diulang di segmen sama)', async () => {
  const { readFileSync } = await import('node:fs');
  const app = readFileSync(new URL('../web/App.jsx', import.meta.url), 'utf8');
  assert.match(app, /DILUAR_CAKUPAN: 'Materi di luar cakupan ujian'/);
  assert.match(app, /Batas materi TIDAK berlaku/);
  assert.match(app, /s\.cakupan_status === 'tidak_jelas'/);
  assert.match(app, /\/\^di luar cakupan\/i\.test\(String\(g\.alasan/);
});
