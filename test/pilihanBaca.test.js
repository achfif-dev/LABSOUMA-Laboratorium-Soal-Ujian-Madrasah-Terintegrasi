// Alat AI di pembaca kitab: logika murni (web/lib/pilihanBaca.js) dan render panel (web/AlatTeksKitab.jsx). Tidak menguji blok teks sungguhan di peramban (selectionchange, gagang blok di HP).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import {
  MAKS_TEKS_AI, bersihkanPilihan, masalahTeksArab, susunCakupan, masalahCakupan, urutanDariSimpul, kirimanDariCakupan, terapkanKiriman, campurKitab,
} from '../web/lib/pilihanBaca.js';

const AR1 = 'الْمِيَاهُ الَّتِي يَجُوزُ التَّطْهِيرُ بِهَا سَبْعُ مِيَاهٍ مَاءُ السَّمَاءِ وَمَاءُ الْبَحْرِ';
const AR2 = 'وَالْمَاءُ الْمُسْتَعْمَلُ طَاهِرٌ غَيْرُ مُطَهِّرٍ عِنْدَ الشَّافِعِيَّةِ';
const hal = (seq, teks, extra = {}) => ({ seq, hal: String(seq + 10), juz: 1, teks, bab: '', ...extra });
const kitab = { judulLatin: 'Fathul Muin', judul: 'فتح المعين' };

test('bersihkanPilihan: buang penanda arah dan rapikan spasi, huruf dan harakat utuh', () => {
  assert.equal(bersihkanPilihan('\u200fالْمَاءُ\u200c   طَهُورٌ \r\n\r\n\r\n\r\n  وَالْبَحْرُ  '), 'الْمَاءُ طَهُورٌ\n\nوَالْبَحْرُ');
  assert.equal(bersihkanPilihan(null), '');
});

test('masalahTeksArab: pendek, bukan Arab, campuran, dan layak', () => {
  assert.match(masalahTeksArab('الماء'), /terlalu pendek/);
  assert.match(masalahTeksArab('Ini adalah kalimat Indonesia biasa yang cukup panjang'), /hanya tersedia untuk teks Arab/);
  assert.match(masalahTeksArab(`${AR1} ${'abc '.repeat(40)}`), /campuran|hanya tersedia/);
  assert.equal(masalahTeksArab(AR1), null);
});

test('susunCakupan: blok mengalahkan halaman; tanpa blok = halaman yang tampil; kosong; terlalu panjang', () => {
  const h = [hal(40, AR1), hal(41, AR2)];
  const a = susunCakupan({ pilihan: { teks: ` ${AR2} `, seqs: [41] }, halaman: h });
  assert.equal(a.mode, 'pilihan'); assert.equal(a.teks, AR2); assert.deepEqual(a.halaman.map((p) => p.seq), [41]);
  const b = susunCakupan({ halaman: h });
  assert.equal(b.mode, 'halaman'); assert.equal(b.teks, `${AR1}\n${AR2}`); assert.equal(b.halaman.length, 2);
  assert.equal(susunCakupan({ halaman: [] }).mode, 'kosong');
  assert.equal(susunCakupan({ pilihan: { teks: '  ', seqs: [] }, halaman: [hal(1, '')] }).mode, 'kosong');
  const panjang = susunCakupan({ halaman: [hal(1, 'ا'.repeat(MAKS_TEKS_AI + 1))] });
  assert.equal(panjang.terlaluPanjang, true);
  assert.match(masalahCakupan(panjang), /melebihi batas 6\.000/);
});

test('susunCakupan: bagian matn/syarah dihormati untuk halaman utuh; blok yang seqs-nya tidak dikenal memakai halaman tampil', () => {
  const p = hal(5, `${AR1} ${AR2}`, { batasMatn: AR1.length });
  assert.equal(susunCakupan({ halaman: [p], bagian: 'matn' }).teks, AR1);
  assert.equal(susunCakupan({ halaman: [p], bagian: 'syarah' }).teks, AR2);
  const x = susunCakupan({ pilihan: { teks: AR1, seqs: [] }, halaman: [p] });
  assert.equal(x.mode, 'pilihan'); assert.deepEqual(x.halaman.map((q) => q.seq), [5]);
});

test('masalahCakupan: kosong, bukan Arab, layak', () => {
  assert.match(masalahCakupan(susunCakupan({ halaman: [] })), /belum memuat teks/i);
  assert.match(masalahCakupan(susunCakupan({ halaman: [hal(1, 'Teks Indonesia yang cukup panjang untuk diuji di sini')] })), /teks Arab/);
  assert.equal(masalahCakupan(susunCakupan({ halaman: [hal(1, AR1)] })), null);
});

test('urutanDariSimpul: satu halaman, dua halaman, simpul di luar halaman, nilai tidak sah', () => {
  assert.deepEqual(urutanDariSimpul('40', '40'), [40]);
  assert.deepEqual(urutanDariSimpul('41', '40'), [40, 41]);
  assert.deepEqual(urutanDariSimpul(null, '7'), [7]);
  assert.deepEqual(urutanDariSimpul('x', null), []);
  assert.ok(urutanDariSimpul('1', '99999').length <= 20);
});

test('kirimanDariCakupan: rujukan menunjuk halaman tempat teks berada; nama mengikuti katalog', () => {
  const c = susunCakupan({ pilihan: { teks: AR2, seqs: [41] }, halaman: [hal(40, AR1), hal(41, AR2, { bab: 'Bab Thaharah' })] });
  const k = kirimanDariCakupan({ kitab, kitabId: 'fathul-muin', cakupan: c, katalog: [{ nama: "Fath al-Mu'in" }] });
  assert.equal(k.teks, AR2); assert.equal(k.hal, '51'); assert.equal(k.juz, '1'); assert.equal(k.bab, 'Bab Thaharah'); assert.equal(k.sebagian, true);
  assert.deepEqual(k.rujukan, { kitabId: 'fathul-muin', halId: 'p00041', halIdAkhir: '' });
  const dua = kirimanDariCakupan({ kitab, kitabId: 'fathul-muin', cakupan: susunCakupan({ halaman: [hal(40, AR1), hal(41, AR2)] }) });
  assert.equal(dua.hal, '50-51'); assert.equal(dua.rujukan.halIdAkhir, 'p00041'); assert.equal(dua.sebagian, false);
  assert.equal(kirimanDariCakupan({ kitab, kitabId: 'fathul-muin', cakupan: susunCakupan({ halaman: [] }) }), null);
});

test('terapkanKiriman: ganti hanya menyentuh Rujukan Kitab; tambah menyambung dan menggabung rujukan; batas 6.000', () => {
  const k = kirimanDariCakupan({ kitab, kitabId: 'fathul-muin', cakupan: susunCakupan({ halaman: [hal(41, AR2)] }) });
  const form = { nama: 'Lain', juz: '2', hal: '9', bab: 'X', teks: 'lama', sumberUrl: 'https://x', kitabId: '', halId: '', halIdAkhir: '', pertanyaan: 'Q?', kunci: 'B', ai: { dibuat: true, buta: 'sepakat' } };
  const g = terapkanKiriman(form, k).form;
  assert.equal(g.teks, AR2); assert.equal(g.sumberUrl, ''); assert.equal(g.pertanyaan, 'Q?'); assert.equal(g.kunci, 'B');
  assert.equal(g.halId, 'p00041'); assert.equal(g.ai.buta, ''); assert.equal(g.ai.dibuat, true);
  const awal = { ...form, nama: 'Fathul Muin', teks: AR1, hal: '50', bab: 'Bab 1', juz: '1', kitabId: 'fathul-muin', halId: 'p00040', halIdAkhir: '' };
  const t = terapkanKiriman(awal, k, { tambah: true }).form;
  assert.equal(t.teks, `${AR1}\n${AR2}`); assert.equal(t.hal, '50-51'); assert.equal(t.bab, 'Bab 1');
  assert.deepEqual([t.halId, t.halIdAkhir], ['p00040', 'p00041']);
  const lain = terapkanKiriman({ ...awal, kitabId: 'kitab-lain' }, k, { tambah: true }).form;
  assert.deepEqual([lain.kitabId, lain.halId], ['', ''], 'dua kitab berbeda: tautan tunggal dilepas');
  const penuh = terapkanKiriman({ ...awal, teks: 'ا'.repeat(MAKS_TEKS_AI - 5) }, k, { tambah: true });
  assert.match(penuh.galat, /melebihi batas/); assert.equal(penuh.form, undefined);
  assert.match(terapkanKiriman(form, null).galat, /Tidak ada teks/);
});

test('campurKitab: hanya bila teks terisi dan nama kitab berbeda', () => {
  const k = { nama: 'Fathul Muin' };
  assert.equal(campurKitab({ teks: 'x', nama: 'Taqrib' }, k), true);
  assert.equal(campurKitab({ teks: 'x', nama: 'fathul muin' }, k), false);
  assert.equal(campurKitab({ teks: '', nama: 'Taqrib' }, k), false);
  assert.equal(campurKitab({ teks: 'x', nama: '' }, k), false);
});

let vite; let Alat;
before(async () => {
  globalThis.window ??= globalThis; globalThis.document ??= { visibilityState: 'visible' };
  vite = await createServer({ root: process.cwd(), server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
  Alat = (await vite.ssrLoadModule('/web/AlatTeksKitab.jsx')).default;
});
after(async () => { if (vite) await vite.close(); });
const h = (props) => renderToString(React.createElement(Alat, props)).replace(/<!-- -->/g, '');
const Btn = ({ children, kind, ...p }) => React.createElement('button', p, children);
// Satu tombol menurut labelnya: true = aktif, false = disabled, undefined = tidak ada.
const aktif = (html, label) => { const b = html.split('<button').find((x) => x.includes(`${label}</button>`)); return b === undefined ? undefined : !/\bdisabled/.test(b.split('>')[0]); };
const dasar = { Btn, callApi: async () => ({}), apiErr: (e) => e, kitab, kitabId: 'fathul-muin', arab: true, konteks: { tingkat: 'Aliyah (MA)', mapel: 'Fiqih', bentuk: 'pilgan', level: 'L2' }, onKirim() {}, onHapusPilihan() {} };

test('AlatTeksKitab dirender: keempat tombol, jenjang dan mapel dari form, penanda cakupan', () => {
  const a = h({ ...dasar, cakupan: susunCakupan({ halaman: [hal(40, AR1)] }) });
  for (const t of ['Terjemahkan', 'Analisis teks', 'Ekstrak fakta', 'Buat soal dari teks ini', 'Halaman yang tampil']) assert.match(a, new RegExp(t));
  assert.match(a, /Aliyah \(MA\)/); assert.doesNotMatch(a, /Tambahkan ke teks di Susun Soal/);
  for (const t of ['Terjemahkan', 'Analisis teks', 'Ekstrak fakta', 'Buat soal dari teks ini']) assert.equal(aktif(a, t), true, `${t} aktif untuk teks Arab yang layak`);
});

test('AlatTeksKitab: blok tampil dengan tombol hapus; form berisi menawarkan tambah; teks non-Arab menonaktifkan AI tetapi bukan Buat soal', () => {
  const a = h({ ...dasar, formTerisi: true, cakupan: susunCakupan({ pilihan: { teks: AR1, seqs: [40] }, halaman: [hal(40, AR1)] }) });
  assert.match(a, /Teks terpilih/); assert.match(a, /Hapus pilihan/); assert.match(a, /Tambahkan ke teks di Susun Soal/);
  const lat = h({ ...dasar, arab: false, cakupan: susunCakupan({ halaman: [hal(1, 'Teks Indonesia yang cukup panjang untuk diuji di sini')] }) });
  assert.match(lat, /hanya tersedia untuk teks Arab/);
  for (const t of ['Terjemahkan', 'Analisis teks', 'Ekstrak fakta']) assert.equal(aktif(lat, t), false, `${t} nonaktif untuk teks non-Arab`);
  assert.equal(aktif(lat, 'Buat soal dari teks ini'), true);
  const kosong = h({ ...dasar, cakupan: susunCakupan({ halaman: [] }) });
  assert.equal(aktif(kosong, 'Buat soal dari teks ini'), false);
  const panjang = h({ ...dasar, cakupan: susunCakupan({ halaman: [hal(1, 'ا'.repeat(MAKS_TEKS_AI + 1))] }) });
  assert.equal(aktif(panjang, 'Buat soal dari teks ini'), false); assert.match(panjang, /melebihi batas 6\.000/);
});
