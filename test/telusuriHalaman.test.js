// Menelusuri halaman sesudah/sebelum ("halaman selanjutnya"): deteksi niat, validasi, dan orkestrasi server (tanpa rencana pencarian, satu panggilan AI).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSyamilah } from '../src/syamilah.js';
import { isianAwal, jalankanImpor } from '../web/lib/imporKitab.js';
import { tanyaKitab, validasiTanya } from '../src/telaahKitab.js';
import { niatLanjut, penelusuranTerakhir } from '../web/lib/telaahKitab.js';
import { __setFirebaseForTest } from '../src/platform.js';
import handler from '../src/rute/kitab.js';
import { fakeDb } from './_fakeDb.js';

const J = 'فتح المعين'; const ZW = '‌‌';
const HAL = [
  'فصل في شروط الصلاة. شروط الصلاة خمسة الطهارة عن الحدث والنجس وستر العورة.',
  'واستقبال القبلة ودخول الوقت. ومن شروطها أيضا العلم بفرضيتها.',
  'باب الأذان والإقامة. هما سنة على الكفاية ويسن للمنفرد.',
  'فصل في الجماعة. هي في الفرائض سنة مؤكدة للرجال.',
  'كتاب الزكاة. تجب في النقدين والأنعام والمعشرات.',
];
const buku = (halaman) => [`${J}   (المعبري)`, 'القسم: الفقه الشافعي', `الكتاب: ${J}`, 'المؤلف: المعبري (ت 987هـ)', 'الناشر: دار', '[ترقيم الكتاب موافق للمطبوع]',
  ...halaman.flatMap((t, i) => [`${J}(ص: ${i + 1})`, ...(i === 0 ? [`${ZW}باب الصلاة`] : []), 'متن', 'ـ', t])].join('\r\n');
const HASIL = parseSyamilah(buku(HAL));
const ISIAN = { ...isianAwal(HASIL), judulLatin: "Fathul Mu'in", kitabId: 'fathul-muin' };
const mkRes = () => { const r = { h: {}, setHeader(k, v) { r.h[k] = v; }, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; };
const dasar = () => ({ 'users/u_admin': { role: 'admin', name: 'Admin' } });
const dengan = async (data, fn) => {
  const db = fakeDb(data);
  __setFirebaseForTest({ db, auth: { verifyIdToken: async (t) => ({ uid: t.replace('tok_', 'u_') }) }, FieldValue: {} });
  try { return await fn(db); } finally { __setFirebaseForTest(null); }
};
const admin = async (body) => { const r = mkRes(); await handler({ method: 'POST', headers: { authorization: 'Bearer tok_admin' }, body }, r); if (r.code !== 200) throw { ...r.body.error, status: r.code }; return r.body; };
const impor = () => jalankanImpor({ panggil: admin, hasil: HASIL, isian: ISIAN });
const klien = (...antrean) => { const log = []; return { log, messages: { create: async (p) => { log.push(p); const n = antrean.shift(); if (!n) throw new Error('panggilan AI tak terduga'); return { stop_reason: 'tool_use', content: [{ type: 'tool_use', name: n.name, input: n.input }] }; } } }; };
const jawab = (o) => ({ name: 'hasil_tanya', input: { cukup: true, jawaban: 'Jawaban.', poin: [], khilaf: '', catatan: '', ...o } });

test('niatLanjut: hanya permintaan menelusuri, bukan pertanyaan biasa', () => {
  for (const t of ['halaman selanjutnya', 'Tolong lanjutkan membaca halaman berikutnya ya', 'lanjut', 'telusuri halaman sesudahnya', 'bagaimana dengan halaman berikutnya?']) assert.equal(niatLanjut(t), 'sesudah', t);
  for (const t of ['halaman sebelumnya', 'buka halaman sebelumnya', 'mundur satu halaman']) assert.equal(niatLanjut(t), 'sebelum', t);
  for (const t of ['apa hukum shalat setelah subuh', 'jelaskan lanjutan hukum qashar dan jamak', 'apa dalilnya?', 'lanjutkan penjelasan tentang syarat sah shalat jumat', '', null]) assert.equal(niatLanjut(t), '', String(t));
});

test('penelusuranTerakhir: ambil dari jawaban bersumber terbaru; jawaban bebas memutus', () => {
  const pen = { kitabId: 'k', maju: 2, mundur: 1 };
  assert.deepEqual(penelusuranTerakhir([{ role: 'user', teks: 'x' }, { role: 'ai', mode: 'sumber', hasil: { penelusuran: pen } }]), pen);
  assert.equal(penelusuranTerakhir([{ role: 'ai', mode: 'sumber', hasil: { penelusuran: pen } }, { role: 'user', teks: 'y' }, { role: 'ai', mode: 'bebas', hasil: {} }]), null);
  assert.equal(penelusuranTerakhir([]), null);
});

test('validasiTanya: lanjut wajib valid dan punya pertanyaan asal di riwayat', () => {
  const l = { kitabId: 'fathul-muin', arah: 'sesudah', maju: 2, mundur: 1 };
  const riwayat = [{ role: 'user', teks: 'Apa syarat shalat?' }, { role: 'ai', teks: 'Lima.' }];
  const v = validasiTanya({ pertanyaan: 'halaman selanjutnya', lanjut: l, riwayat });
  assert.equal(v.lanjut.pertanyaanAsal, 'Apa syarat shalat?');
  assert.throws(() => validasiTanya({ pertanyaan: 'halaman selanjutnya', lanjut: l }), (e) => e.code === 'TANYA_INVALID');
  assert.throws(() => validasiTanya({ pertanyaan: 'halaman selanjutnya', lanjut: l, riwayat: [{ role: 'user', teks: 'lanjut' }] }), (e) => e.code === 'TANYA_INVALID');
  for (const buruk of [{ ...l, arah: 'samping' }, { ...l, maju: 0 }, { ...l, mundur: 5 }, { ...l, kitabId: '../x' }, 'sesudah']) assert.throws(() => validasiTanya({ pertanyaan: 'halaman selanjutnya', lanjut: buruk, riwayat }));
});

test('tanyaKitab: hasil membawa batas penelusuran, lalu "halaman selanjutnya" membaca halaman berurutan tanpa rencana pencarian', () => dengan(dasar(), async () => {
  await impor();
  const c1 = klien({ name: 'rencana_cari', input: { kueri: ['شروط الصلاة'], jenis: 'syarat_rukun' } }, jawab({ jawaban: 'Syarat shalat lima.', poin: [{ pernyataan: 'Syarat shalat lima.', halaman_id: 'H1', kutipan: 'شروط الصلاة خمسة الطهارة عن الحدث والنجس' }] }));
  const r1 = await tanyaKitab({ pertanyaan: 'Apa syarat shalat?' }, { client: c1 });
  assert.equal(r1.penelusuran.kitabId, 'fathul-muin');
  assert.ok(r1.penelusuran.maju >= 1 && r1.penelusuran.mundur <= r1.penelusuran.maju);
  assert.equal(r1.penelusuran.adaSebelum, r1.penelusuran.mundur > 1);
  const { maju, mundur } = r1.penelusuran;

  const c2 = klien(jawab({ jawaban: 'Kelanjutannya membahas azan.', poin: [{ pernyataan: 'Azan dan iqamah sunnah kifayah.', halaman_id: 'H1', kutipan: 'هما سنة على الكفاية ويسن للمنفرد' }] }));
  const riwayat = [{ role: 'user', teks: 'Apa syarat shalat?' }, { role: 'ai', teks: 'Syarat shalat lima. [Sumber: Fathul Mu\'in hal. 1]' }];
  const r2 = await tanyaKitab({ pertanyaan: 'halaman selanjutnya', riwayat, lanjut: { kitabId: 'fathul-muin', arah: 'sesudah', maju, mundur } }, { client: c2 });
  assert.equal(c2.log.length, 1, 'hanya satu panggilan AI: tanpa rencana pencarian');
  const prompt = c2.log[0].messages[0].content;
  assert.match(prompt, /<lanjutan>[\s\S]*SESUDAH/);
  assert.match(prompt, /<pertanyaan>\s*Apa syarat shalat\?/, 'yang dijawab adalah pertanyaan asal');
  assert.match(c2.log[0].system, /LANJUTAN/);
  assert.deepEqual(r2.halamanDibaca.map((h) => h.seq), [maju + 1, maju + 2, maju + 3].filter((x) => x <= 5));
  assert.ok(r2.halamanDibaca.every((h) => h.lanjutan === 'sesudah'));
  assert.equal(r2.lanjutan, 'sesudah');
  assert.equal(r2.status, 'terverifikasi', 'kutipan dari halaman lanjutan diverifikasi');
  assert.equal(r2.penelusuran.maju, Math.min(5, maju + 3)); assert.equal(r2.penelusuran.mundur, mundur);
  assert.equal(r2.penelusuran.adaSesudah, r2.penelusuran.maju < 5);
}));

test('tanyaKitab: menelusuri ke belakang, dan di ujung kitab tidak memanggil AI', () => dengan(dasar(), async () => {
  await impor();
  const riwayat = [{ role: 'user', teks: 'Apa itu jamaah?' }, { role: 'ai', teks: 'Sunnah.' }];
  const c = klien(jawab({ jawaban: 'Sebelumnya membahas syarat.', poin: [{ pernyataan: 'Syarat lima.', halaman_id: 'H1', kutipan: 'شروط الصلاة خمسة الطهارة عن الحدث والنجس' }] }));
  const r = await tanyaKitab({ pertanyaan: 'halaman sebelumnya', riwayat, lanjut: { kitabId: 'fathul-muin', arah: 'sebelum', maju: 4, mundur: 4 } }, { client: c });
  assert.deepEqual(r.halamanDibaca.map((h) => h.seq), [1, 2, 3]);
  assert.equal(r.penelusuran.mundur, 1); assert.equal(r.penelusuran.adaSebelum, false); assert.equal(r.penelusuran.maju, 4);
  assert.match(c.log[0].messages[0].content, /SEBELUM/);

  const c0 = klien();
  const akhir = await tanyaKitab({ pertanyaan: 'halaman selanjutnya', riwayat, lanjut: { kitabId: 'fathul-muin', arah: 'sesudah', maju: 5, mundur: 3 } }, { client: c0 });
  assert.equal(c0.log.length, 0); assert.equal(akhir.status, 'tidak_ditemukan'); assert.match(akhir.catatan, /terakhir/);
  assert.equal(akhir.penelusuran.adaSesudah, false);
  const awal = await tanyaKitab({ pertanyaan: 'halaman sebelumnya', riwayat, lanjut: { kitabId: 'fathul-muin', arah: 'sebelum', maju: 3, mundur: 1 } }, { client: c0 });
  assert.match(awal.catatan, /pertama/);
}));

test('tanyaKitab: penelusuran kitab yang tidak aktif/ada ditolak 404', () => dengan(dasar(), async () => {
  await impor();
  const riwayat = [{ role: 'user', teks: 'Apa itu jamaah?' }];
  await assert.rejects(() => tanyaKitab({ pertanyaan: 'lanjut', riwayat, lanjut: { kitabId: 'tidak-ada', arah: 'sesudah', maju: 1, mundur: 1 } }, { client: klien() }), (e) => e.status === 404 || e.code === 'KITAB_TIDAK_ADA');
}));
