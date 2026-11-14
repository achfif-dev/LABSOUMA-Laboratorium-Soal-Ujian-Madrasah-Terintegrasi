// Paket Dauri yang berhenti di tengah jalan harus bisa DILANJUTKAN (hanya sisanya), bukan diulang dari awal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { sumberWeb } from './_sumberWeb.js';
import { rencanaPaket, sisaPaket, tugasDariSisa, MAKS_BUTIR_PANGGILAN } from '../web/lib/paket.js';
import { generatePaket } from '../src/paketService.js';

const KAL = ['الْمِيَاهُ الَّتِي يَجُوزُ بِهَا التَّطْهِيرُ سَبْعُ مِيَاهٍ مَاءُ السَّمَاءِ وَمَاءُ الْبَحْرِ وَمَاءُ النَّهْرِ', 'وَالْمَاءُ الْمُتَغَيِّرُ بِمَا يُخَالِطُهُ مِنَ الطَّاهِرَاتِ لَا يَصِحُّ بِهِ الْوُضُوءُ وَلَا الْغُسْلُ', 'فَرْضُ الْوُضُوءِ سِتَّةُ أَشْيَاءَ النِّيَّةُ وَغَسْلُ الْوَجْهِ وَغَسْلُ الْيَدَيْنِ وَمَسْحُ بَعْضِ الرَّأْسِ'];
const sumber = Array.from({ length: 90 }, (_, i) => KAL[i % 3] + ' ' + i).join('\n');
const rencana = rencanaPaket({ dawr: 1, sumber: [{ teks: sumber, hal: '1' }], lanjutan: 0.4 });
const hasilDari = (tugas) => tugas.flatMap((t) => t.spek.map((s) => ({ bagian: s.bagian, soal: { bentuk: s.bentuk, level: s.level } })));

test('sisaPaket: paket kosong = semua butir; lengkap = tidak ada sisa', () => {
  const k = sisaPaket(rencana, []);
  assert.equal(k.sisa.length, rencana.total); assert.equal(k.terisi, 0);
  const l = sisaPaket(rencana, hasilDari(rencana.tugas));
  assert.equal(l.sisa.length, 0); assert.equal(l.terisi, rencana.total);
});

test('sisaPaket: proses berhenti di tengah -> sisa persis butir yang belum jadi, urutan rencana dan segmen asal terjaga', () => {
  const sudah = rencana.tugas.slice(0, 2);
  const k = sisaPaket(rencana, hasilDari(sudah));
  const belum = rencana.tugas.slice(2).flatMap((t) => t.spek.map((s) => [t.segmen, s.bagian, s.bentuk, s.level]));
  assert.deepEqual(k.sisa.map((x) => [x.segmen, x.spek.bagian, x.spek.bentuk, x.spek.level]), belum);
  assert.equal(k.terisi + k.sisa.length, rencana.total);
});

test('sisaPaket: butir dialihkan ke segmen lain, dihapus pengguna, atau lebih dari perlu', () => {
  const semua = hasilDari(rencana.tugas);
  const hapus = semua.slice(1); // satu butir dihapus pengguna
  assert.equal(sisaPaket(rencana, hapus).sisa.length, 1);
  assert.equal(sisaPaket(rencana, [...semua, ...semua.slice(0, 3)]).sisa.length, 0, 'kelebihan tidak mengurangi apa pun dan tidak membuat sisa negatif');
  assert.equal(sisaPaket(rencana, [{ bagian: 'z', soal: {} }, null, {}]).sisa.length, rencana.total, 'entri rusak diabaikan');
  assert.equal(sisaPaket(null, null).total, 0);
});

test('tugasDariSisa: satu segmen per panggilan, maksimal per panggilan, jumlah pas', () => {
  const t = tugasDariSisa(sisaPaket(rencana, []).sisa);
  assert.equal(t.reduce((n, x) => n + x.spek.length, 0), rencana.total);
  assert.ok(t.every((x) => x.spek.length <= MAKS_BUTIR_PANGGILAN && x.spek.length > 0));
  assert.ok(new Set(t.map((x) => x.id)).size === t.length, 'id unik');
  assert.deepEqual(t.map((x) => x.segmen), [...t.map((x) => x.segmen)].sort((a, b) => a - b));
  assert.deepEqual(tugasDariSisa([]), []);
});

/* ------------------------------------------------ server: keluaran terpotong tidak membuang butir yang sudah utuh */
const tool = (name, input) => [{ type: 'tool_use', name, input }];
const fake = (content, stop = 'tool_use') => ({ messages: { create: async () => ({ stop_reason: stop, content }) } });
const pil = (no) => ({ no: String(no), pertanyaan: 'Air laut termasuk air apa?', pilihan_a: 'Mutlak', pilihan_b: 'Mustamal', pilihan_c: 'Najis', kunci_jawaban: 'A', jawaban: '', kutipan_kitab: 'سَبْعُ مِيَاهٍ', pembahasan: 'Air laut termasuk air mutlak.', indikator_kisi_kisi: 'Peserta didik dapat menyebutkan jenis air.' });
const body = (n) => ({ teks: KAL.join('\n'), tingkat: 'MA', kelas: 'X', nama: 'Fathul Qarib', hal: '3', spek: Array.from({ length: n }, () => ({ bentuk: 'pilgan', level: 'L1' })) });

test('generatePaket: terpotong tetapi ada butir utuh -> dikembalikan, sisanya masuk gagal dan ditandai terpotong', async () => {
  const r = await generatePaket(body(3), { client: fake(tool('serahkan_paket', { butir: [pil(1)] }), 'max_tokens') });
  assert.equal(r.terpotong, true); assert.deepEqual(r.butir.map((b) => b.indeks), [0]);
  assert.deepEqual(r.gagal.map((g) => g.indeks), [1, 2]); assert.match(r.gagal[0].alasan, /terpotong/);
});

test('generatePaket: AI berhenti lebih awal (tanpa max_tokens) -> butir yang kurang masuk gagal agar klien melanjutkan', async () => {
  const r = await generatePaket(body(3), { client: fake(tool('serahkan_paket', { butir: [pil(1), pil(2)] })) });
  assert.equal(r.butir.length, 2); assert.equal(r.terpotong, undefined);
  assert.deepEqual(r.gagal.map((g) => [g.indeks, g.alasan]), [[2, 'tidak dibuat oleh AI']]);
});

/* ------------------------------------------------ klien */
test('klien: tombol Lanjutkan sisa, mesin bersama, galat tidak menghentikan semuanya', () => {
  const app = sumberWeb;
  assert.match(app, /PK\.sisaPaket\(rencana, hasil\)/);
  assert.match(app, /Lanjutkan sisa \(\{kekurangan\.sisa\.length\} butir\)/);
  assert.match(app, /await proses\(tugas, hasil, tugas\.length\)/);   // lanjut: awal = hasil yang ada
  assert.match(app, /await proses\(rencana\.tugas, \[\], rencana\.panggilan\)/); // buat ulang: awal kosong
  assert.match(app, /const kumpul = \[\.\.\.awal\]/);
  assert.match(app, /Mencoba lagi \(dibagi dua\)/);
  assert.match(app, /beruntun >= 3/);
  assert.match(app, /Bila hanya ingin melengkapi yang kurang, batalkan lalu pakai "Lanjutkan sisa"/);
});
