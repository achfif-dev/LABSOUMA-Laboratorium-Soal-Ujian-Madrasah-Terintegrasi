import test from 'node:test';
import assert from 'node:assert/strict';
import { bocor, fokusBocor, rentangAman, buatKisiUmum, buatKisiKhusus, prioritasDariBobot, kisiKhususKeTeks, kisiKhususKeCsv, kisiUmumKeCsv } from '../web/lib/kisiFokus.js';
import { bacaDocxSoal } from '../web/lib/soalDocx.js';
import { analisisKisi, ubahKisi, TOOL_KISI } from '../src/soalLuarService.js';
import { run, par, kop, dokumen, docx } from './_buatDocx.js';
import { judulBagian, judulDauri } from '../web/lib/naskah.js';

const b = (o) => ({ bagian: 'a', no: 1, bentuk: 'pilgan', pertanyaan: 'Berapa jumlah rukun wudhu menurut mazhab Syafii', opsi: { A: 'empat', B: 'enam', C: 'delapan' }, kunci: 'B', jawaban: '', kutipan: '', hal: '12', level: 'L1', bab: 'Wudhu', fokus: '', ...o });

test('bocor: angka jawaban, jawaban utuh, dua kata berurutan, dan salinan soal terdeteksi; topik luas lolos', () => {
  const isian = b({ bagian: 'b', bentuk: 'isian', pertanyaan: 'Rukun wudhu ......', opsi: {}, kunci: '', jawaban: 'niat membasuh muka' });
  assert.equal(bocor('Syarat dan rukun wudhu', b()), false);
  assert.equal(bocor('Rukun wudhu', isian), false);
  assert.equal(bocor('Niat membasuh muka dalam wudhu', isian), true, 'dua kata berurutan dari jawaban');
  assert.equal(bocor('Wudhu ada 6 rukun', b({ bagian: 'b', jawaban: '6' })), true, 'angka jawaban');
  assert.equal(bocor('Berapa jumlah rukun wudhu', b()), true, 'tiga kata berurutan dari soal');
  assert.equal(bocor('', b()), false);
  assert.equal(bocor('Wudhu', null), false);
  assert.equal(bocor('Jumlah enam', b()), true, 'teks opsi kunci');
  assert.equal(bocor('Fiqih ٦', b({ jawaban: '6', kunci: '' })), true, 'angka Arab-Indic dinormalkan');
});

test('rentangAman: halaman dan hadits dilebarkan, satu butir tidak menunjuk satu halaman', () => {
  assert.equal(rentangAman(['113']), 'hal. 112–114');
  assert.equal(rentangAman(['5', '9', '7']), 'hal. 4–10');
  assert.equal(rentangAman(['1']), 'hal. 1–2');
  assert.equal(rentangAman(['ح1017']), 'hadits no. 1010–1020');
  assert.equal(rentangAman(['ح1017', '113']), 'hal. 112–114; hadits no. 1010–1020');
  assert.equal(rentangAman(['', 'x', null]), '');
});

const paket = () => ({
  judul: 'Fiqih', mapel: 'Fiqih', kelas: '2', kitab: 'Fathul Qarib', dawr: 2,
  butir: [
    b({ no: 1, bab: 'Wudhu', fokus: 'Syarat dan rukun wudhu', hal: '10' }),
    b({ no: 2, bab: 'Wudhu', fokus: 'Syarat dan rukun wudhu', hal: '12' }),
    b({ no: 3, bab: 'Wudhu', fokus: 'Hal yang membatalkan wudhu', hal: '13' }),
    b({ no: 4, bab: 'Shalat', fokus: 'Syarat sah shalat', hal: '30' }),
    b({ bagian: 'b', no: 1, bentuk: 'isian', pertanyaan: 'Rukun shalat ......', opsi: {}, kunci: '', jawaban: 'niat', bab: 'Shalat', fokus: 'Niat dan takbiratul ihram niat', level: 'L2', hal: '31' }),
    b({ bagian: 'c', no: 1, bentuk: 'uraian', pertanyaan: 'Jelaskan tata cara tayamum', opsi: {}, kunci: '', jawaban: 'mengusap muka', bab: '', fokus: '', level: 'L3', hal: '' }),
  ],
});

test('kisi umum: hanya agregat; bobot per bab dari nilai bagian; tidak membawa soal, kunci, indikator, atau halaman', () => {
  const u = buatKisiUmum(paket());
  assert.equal(u.totalSoal, 6); assert.deepEqual(u.perLevel, { L1: 4, L2: 1, L3: 1 });
  assert.equal(u.bagian[0].nilai, 4); assert.equal(u.bagian[0].jumlah, 4);
  const poin = 4 * 4 + 5 + 6;
  const wudhu = u.kelompok.find((g) => g.bab === 'Wudhu');
  assert.equal(wudhu.jumlah, 3); assert.equal(wudhu.bobot, Math.round((12 / poin) * 1000) / 10);
  assert.equal(u.kelompok.at(-1).bab, 'Materi lainnya', 'tanpa bab di urutan terakhir');
  assert.equal(u.tanpaBab, 1);
  const json = JSON.stringify(u);
  for (const rahasia of ['Berapa jumlah', 'niat', 'mengusap', '"hal"', 'indikator', 'kunci', ]) assert.ok(!json.includes(rahasia), `umum tidak memuat ${rahasia}`);
  assert.ok(!kisiUmumKeCsv(u).includes('Syarat dan rukun'), 'fokus tidak masuk kisi umum');
});

test('kisi khusus: topik unik dan berurut abjad, prioritas kasar, rentang dilebarkan, tanpa nomor soal atau jumlah per topik', () => {
  const k = buatKisiKhusus(paket());
  const wudhu = k.kelompok.find((g) => g.bab === 'Wudhu');
  assert.deepEqual(wudhu.topik, ['Hal yang membatalkan wudhu', 'Syarat dan rukun wudhu']);
  assert.equal(wudhu.rentang, 'hal. 9–14');
  assert.equal(k.dibuang, 1, 'fokus "Niat dan takbiratul ihram niat" memuat jawaban "niat"');
  assert.equal(k.tanpaFokus, 1);
  assert.equal(k.kosong, false);
  const teks = kisiKhususKeTeks(k) + kisiKhususKeCsv(k);
  for (const rahasia of ['Berapa jumlah', 'mengusap', 'enam', 'Rukun shalat', 'no. 1', 'indikator']) assert.ok(!teks.includes(rahasia), `fokus tidak memuat ${rahasia}`);
  const shalat = k.kelompok.find((g) => g.bab === 'Shalat');
  assert.deepEqual(shalat.topik, ['Syarat sah shalat']);
  assert.equal(prioritasDariBobot(35), 'Fokus utama'); assert.equal(prioritasDariBobot(20), 'Penting'); assert.equal(prioritasDariBobot(5), 'Pendukung');
});

test('kisi khusus: butir tanpa fokus tidak memunculkan tebakan; bab tanpa topik memakai kalimat umum; fokusBocor menandai butir', () => {
  const p = { ...paket(), butir: paket().butir.map((x) => ({ ...x, fokus: '' })) };
  const k = buatKisiKhusus(p);
  assert.equal(k.kosong, true); assert.equal(k.tanpaFokus, 6);
  assert.match(kisiKhususKeTeks(k), /Pelajari seluruh pembahasan bab ini/);
  assert.deepEqual(fokusBocor(paket().butir), [{ bagian: 'b', no: 1 }]);
});

test('AI: fokus yang bocor dikosongkan server dengan peringatan; fokus aman dipertahankan; tool mewajibkan fokus', async () => {
  assert.ok(TOOL_KISI.input_schema.properties.kisi.items.required.includes('fokus'));
  const ind = 'Peserta didik dapat menyebutkan jumlah rukun wudhu';
  const client = { messages: { create: async () => ({ stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'hasil_kisi', input: { kisi: [
    { id: 0, level: 'L1', bab: 'Wudhu', indikator: ind, fokus: 'Syarat dan rukun wudhu' },
    { id: 1, level: 'L1', bab: 'Wudhu', indikator: ind, fokus: 'Berapa jumlah rukun wudhu' },
  ] } }] }) } };
  const r = await analisisKisi({ butir: [b({ no: 1 }), b({ no: 2 })] }, { client });
  assert.equal(r.kisi[0].fokus, 'Syarat dan rukun wudhu');
  assert.equal(r.kisi[1].fokus, '');
  assert.ok(r.peringatan.some((x) => /1 fokus belajar dikosongkan/.test(x)));
});

test('ubahKisi: fokus bocor dibuang, fokus kosong menghapus, fokus tidak dikirim mempertahankan', async () => {
  const butir = [b({ no: 1, fokus: 'Lama' }), b({ no: 2, fokus: 'Tetap' }), b({ no: 3, fokus: 'Hapus' })];
  let simpan = null;
  const id = `lx${'a'.repeat(28)}`;
  const db = { collection: () => ({ doc: () => ({}) }), runTransaction: async (fn) => fn({ get: async () => ({ exists: true, data: () => ({ createdByUid: 'u1', butir }) }), update: (_r, v) => { simpan = v; } }) };
  await ubahKisi(db, { serverTimestamp: () => 'ts' }, {
    id, uid: 'u1', role: 'editor', sumber: 'manual', model: '',
    kisi: [
      { bagian: 'a', no: 1, level: 'L1', bab: 'Wudhu', indikator: 'Peserta didik dapat x y z', fokus: 'Berapa jumlah rukun wudhu' },
      { bagian: 'a', no: 2, level: 'L1', bab: 'Wudhu', indikator: 'Peserta didik dapat x y z' },
      { bagian: 'a', no: 3, level: 'L1', bab: 'Wudhu', indikator: 'Peserta didik dapat x y z', fokus: '' },
    ],
  });
  assert.deepEqual(simpan.butir.map((x) => x.fokus), ['', 'Tetap', '']);
});

// Regresi format naskah Dauri nyata (HADITS/USHUL/FIQH): rujukan merah ص<n>/ح<n> menempel, opsi di tengah/awal kalimat, kurung bersarang, isian di tengah kalimat, catatan kaki "(*...*)".
const J_A = judulBagian('a', 4); const J_B = judulBagian('b', 5); const J_C = judulBagian('c', 6);
test('format naskah nyata: opsi di tengah kalimat, rujukan ح/ص merah, isian di tengah kalimat, kurung bersarang, catatan kaki', async () => {
  const xml = dokumen(
    kop('الاسم : ____ الفصـل : الثاني', 'الرقم : المادة : الحديث'),
    par(run(judulDauri(2), { bold: true })),
    par(run(J_A, { bold: true })),
    par(run('1- ( ) '), run('(أ-'), run('الأعمال'), run(' ب-'), run('النيات'), run(' ج-'), run('الأقوال'), run(') بالنيات إنما '), run('ح'), run('1017', { merah: true })),
    par(run('2- ( ) كان الرجل (أ-'), run('يقرأ', { merah: true }), run(' ب-يكتب ج-يسمع) القرآن (وهو حافظ له) '), run('ص113', { merah: true })),
    par(run(J_B, { bold: true })),
    par(run('1- قال النبي '), run('صلى الله عليه وسلم', { merah: true }), run(' إنما الأعمال بالنيات '), run('ص 20', { merah: true })),
    par(run(J_C, { bold: true })),
    par(run('1- ما معنى النية ؟ '), run('القصد', { merah: true }), run(' ص 21', { merah: true })),
    par(run('(*تم بحمد الله*)')),
  );
  const r = await bacaDocxSoal(docx(xml));
  const [a1, a2, b1, c1] = r.butir;
  assert.equal(r.butir.length, 4);
  assert.equal(a1.hal, 'ح1017'); assert.equal(a1.kunci, ''); // tidak ada opsi merah: kunci kosong
  assert.deepEqual(Object.keys(a1.opsi), ['A', 'B', 'C']);
  assert.match(a1.pertanyaan, /بالنيات إنما/);
  assert.equal(a2.kunci, 'A'); assert.equal(a2.hal, '113'); assert.match(a2.pertanyaan, /كان الرجل/); assert.match(a2.pertanyaan, /القرآن/); assert.match(a2.pertanyaan, /وهو حافظ له/);
  assert.equal(b1.jawaban, 'صلى الله عليه وسلم'); assert.match(b1.pertanyaan, /قال النبي .*\.\.\.\.\.\..*إنما الأعمال/); assert.equal(b1.hal, '20');
  assert.equal(c1.jawaban, 'القصد'); assert.equal(c1.hal, '21');
  assert.ok(!r.peringatan.some((x) => /tidak dikenali|\(\*/.test(x)), 'catatan kaki bukan butir tak dikenal');
});
