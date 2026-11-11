// Paket Dauri terikat fakta (src/paketService.js): kutipan dari fakta terverifikasi, alasan pengecoh wajib, prompt lama utuh bila tanpa fakta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePaket, validatePaket, sistemPaketFor, SISTEM_PAKET, TOOL_PAKET, toolPaketDenganFakta, blokFaktaButir, ATURAN_FAKTA_PAKET } from '../src/paketService.js';

const TEKS = 'الصلاة واجبة على كل مسلم بالغ عاقل ذكر أو أنثى ولا تجب على الحائض والنفساء ولا تجب على الصبي حتى يبلغ وشروط صحتها خمسة الطهارة وستر العورة واستقبال القبلة';
const FAKTA = { fakta: 'Shalat wajib bagi muslim yang baligh dan berakal.', kutipan: 'واجبة على كل مسلم بالغ عاقل', pengecoh: ['Wajib bagi anak kecil'] };
const dasar = { teks: TEKS, tingkat: 'Aliyah', mapel: 'Fiqih' };
const fake = (butir) => { const calls = []; return { calls, messages: { create: async (r) => { calls.push(r); return { stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'serahkan_paket', input: { butir } }] }; } } }; };
const butirPilgan = (o = {}) => ({ no: '1', pertanyaan: 'Siapakah yang wajib melaksanakan shalat?', pilihan_a: 'Muslim baligh berakal', pilihan_b: 'Anak kecil', pilihan_c: 'Orang haid', kunci_jawaban: 'A', jawaban: '', kutipan_kitab: 'تجب على كل مسلم بالغ عاقل', pembahasan: 'Teks menyebut kewajiban shalat bagi muslim baligh berakal.', indikator_kisi_kisi: 'Peserta didik dapat menyebutkan.', alasan_pengecoh: 'B: anak kecil belum baligh; C: haid tidak wajib shalat.', ...o });
const butirIsian = (o = {}) => ({ no: '2', pertanyaan: 'Shalat wajib bagi muslim yang ..... dan berakal.', pilihan_a: '', pilihan_b: '', pilihan_c: '', kunci_jawaban: '', jawaban: 'baligh', kutipan_kitab: 'karangan model yang tidak ada di teks', pembahasan: 'Syarat wajib shalat adalah baligh dan berakal.', indikator_kisi_kisi: 'Peserta didik dapat melengkapi.', alasan_pengecoh: '', ...o });

test('validatePaket: spek tanpa faktaTerikat berbentuk lama (tanpa kunci fakta); dengan fakta valid dibawa', () => {
  const lama = validatePaket({ ...dasar, spek: [{ bentuk: 'pilgan', level: 'L1' }] });
  assert.deepEqual(lama.spek[0], { bentuk: 'pilgan', level: 'L1' });
  const baru = validatePaket({ ...dasar, spek: [{ bentuk: 'pilgan', level: 'L1', faktaTerikat: FAKTA }] });
  assert.equal(baru.spek[0].fakta.fakta, FAKTA.fakta);
  assert.equal(baru.spek[0].fakta.kutipan, FAKTA.kutipan);
});

test('validatePaket: kutipan dasar karangan ditolak SEBELUM memanggil AI (FAKTA_TIDAK_VALID)', () => {
  assert.throws(() => validatePaket({ ...dasar, spek: [{ bentuk: 'pilgan', level: 'L1', faktaTerikat: { ...FAKTA, kutipan: 'تجب على كل مسلم بالغ عاقل' } }] }), (e) => e.code === 'FAKTA_TIDAK_VALID' && e.status === 422);
});

test('prompt sistem: tanpa fakta persis seperti sebelumnya; dengan fakta ditambah aturan butir terikat', () => {
  assert.equal(sistemPaketFor('ar'), SISTEM_PAKET);
  assert.equal(sistemPaketFor('ar', false), SISTEM_PAKET);
  assert.equal(sistemPaketFor('ar', true), SISTEM_PAKET + ATURAN_FAKTA_PAKET);
  assert.match(sistemPaketFor('id', true), /BUTIR TERIKAT SATU FAKTA/);
  assert.equal(blokFaktaButir(undefined), '');
  assert.match(blokFaktaButir(FAKTA), /FAKTA WAJIB DIUJI[\s\S]*Dasar di teks[\s\S]*Pengecoh yang boleh dipakai: Wajib bagi anak kecil/);
});

test('toolPaketDenganFakta: menambah alasan_pengecoh tanpa mengubah alat asli', () => {
  const t = toolPaketDenganFakta(TOOL_PAKET);
  assert.ok(t.input_schema.properties.butir.items.properties.alasan_pengecoh);
  assert.equal('alasan_pengecoh' in TOOL_PAKET.input_schema.properties.butir.items.properties, false);
  assert.equal(t.input_schema.properties.butir.items.required.includes('alasan_pengecoh'), false);
});

test('generatePaket terikat fakta: kutipan butir = kutipan fakta (bukan buatan model), fakta dan alasan pengecoh ikut hasil', async () => {
  const c = fake([butirPilgan(), butirIsian()]);
  const r = await generatePaket({ ...dasar, spek: [{ bentuk: 'pilgan', level: 'L1', faktaTerikat: FAKTA }, { bentuk: 'isian', level: 'L1', faktaTerikat: { ...FAKTA, fakta: 'Syarat wajib shalat.', kutipan: 'وشروط صحتها خمسة الطهارة وستر العورة' } }] }, { client: c, random: () => 0 });
  assert.equal(r.butir.length, 2); assert.equal(r.gagal.length, 0);
  const [p, i] = r.butir;
  assert.equal(p.kutipan, FAKTA.kutipan); assert.equal(p.kutipanStatus, 'cocok');
  assert.match(p.soal.pembahasan, /واجبة على كل مسلم بالغ عاقل/);
  assert.equal(p.faktaDasar, FAKTA.fakta); assert.match(p.alasanPengecoh, /^B:/);
  assert.equal(i.kutipan, 'وشروط صحتها خمسة الطهارة وستر العورة'); // kutipan karangan model dari butir isian diabaikan
  assert.equal(i.alasanPengecoh, ''); // isian tidak diminta alasan pengecoh
  const req = c.calls[0];
  assert.match(req.messages[0].content, /FAKTA WAJIB DIUJI \(data\): Shalat wajib/);
  assert.match(req.system, /BUTIR TERIKAT SATU FAKTA/);
  assert.ok(req.tools[0].input_schema.properties.butir.items.properties.alasan_pengecoh);
});

test('generatePaket terikat fakta: pilgan terikat tanpa alasan pengecoh masuk gagal (diulang klien); butir lain tetap jadi', async () => {
  const c = fake([butirPilgan({ alasan_pengecoh: '' }), butirIsian()]);
  const r = await generatePaket({ ...dasar, spek: [{ bentuk: 'pilgan', level: 'L1', faktaTerikat: FAKTA }, { bentuk: 'isian', level: 'L1' }] }, { client: c, random: () => 0 });
  assert.deepEqual(r.butir.map((b) => b.indeks), [1]);
  assert.deepEqual(r.gagal.map((g) => [g.indeks, g.alasan]), [[0, 'alasan pengecoh kosong']]);
});

test('generatePaket tanpa fakta: prompt, skema alat, dan hasil sama seperti sebelumnya', async () => {
  const c = fake([butirPilgan({ no: '1', kutipan_kitab: 'واجبة على كل مسلم بالغ عاقل' })]);
  const r = await generatePaket({ ...dasar, spek: [{ bentuk: 'pilgan', level: 'L1' }] }, { client: c, random: () => 0 });
  assert.equal(c.calls[0].system, SISTEM_PAKET);
  assert.equal('alasan_pengecoh' in c.calls[0].tools[0].input_schema.properties.butir.items.properties, false);
  assert.equal(c.calls[0].messages[0].content.includes('FAKTA WAJIB DIUJI'), false);
  assert.equal('faktaDasar' in r.butir[0], false); assert.equal('alasanPengecoh' in r.butir[0], false);
  assert.equal(r.butir[0].kutipan, 'واجبة على كل مسلم بالغ عاقل'); assert.equal(r.butir[0].kutipanStatus, 'cocok'); // tanpa fakta: kutipan buatan model tetap dipakai bila cocok
});
