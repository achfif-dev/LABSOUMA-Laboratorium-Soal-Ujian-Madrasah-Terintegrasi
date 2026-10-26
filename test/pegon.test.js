import test from 'node:test';
import assert from 'node:assert/strict';
import { convertText, kamus, kalibrasiOk, jenisPerbaikan } from '../src/pegon.js';
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

// ---- Kamus bersama (Firestore): data jaringan tidak dipercaya ----
const reset = () => kamus.muatBersama([]);

test('kamus bersama: entri valid dipakai mesin, lalu dicabut bersih saat daftar kosong', () => {
  const sebelum = convertText('tawakkul').pegon;
  const r = kamus.muatBersama([{ id: 'arab_tawakkul', jenis: 'arab', kata: 'tawakkul', arab: 'توكل' }]);
  assert.deepEqual(r, { masuk: 1, lewat: 0 });
  assert.ok(convertText('tawakkul').pegon.includes('توكل'));
  reset();
  assert.equal(convertText('tawakkul').pegon, sebelum);
});

test('kamus bersama: entri jahat atau tak konsisten dilewati, sisanya tetap masuk', () => {
  const r = kamus.muatBersama([
    { jenis: 'arab', kata: 'ok', arab: 'علم' },
    { jenis: 'arab', kata: 'x', arab: '<img src=x onerror=alert(1)>' },
    { jenis: 'arab', kata: '__proto__', arab: 'علم' },
    { jenis: 'arab', kata: 'constructor', arab: 'علم' },
    { jenis: 'arab', kata: 'y', arab: 'علم\u200d' },
    { jenis: 'e', kata: 'zz', tipe: 'sembarang' },
    { jenis: 'zzz', kata: 'a' },
    { id: 'arab_lain', jenis: 'arab', kata: 'cocok', arab: 'علم' },
    null, 'teks', 42, [],
  ]);
  assert.equal(r.masuk, 1);
  assert.equal(r.lewat, 11);
  assert.deepEqual(Object.keys(kamus.bersama().arab), ['ok']);
  assert.doesNotMatch(convertText('constructor').pegon, /function|native code/);
  reset();
});

test('kamus bersama: masukan bukan array tidak melempar dan tidak menyisakan data lama', () => {
  kamus.muatBersama([{ jenis: 'suf', kata: 'seolah' }]);
  assert.deepEqual(kamus.bersama().suffixExc, ['seolah']);
  assert.deepEqual(kamus.muatBersama(undefined), { masuk: 0, lewat: 0 });
  assert.deepEqual(kamus.bersama(), { arab: {}, keras: [], pepet: [], suffixExc: [] });
});

test('kamus bersama: jumlah entri dibatasi agar dokumen berlebih tidak membanjiri browser', () => {
  const banyak = Array.from({ length: 5003 }, (_, i) => ({ jenis: 'suf', kata: 'k' + String.fromCharCode(97 + (i % 26)).repeat(1 + (i % 7)) + 'q'.repeat(i % 5) }));
  const r = kamus.muatBersama(banyak);
  assert.equal(r.masuk + r.lewat, 5003);
  assert.ok(r.lewat >= 3);
  reset();
});

test('kamus bersama: prioritas bawaan < bersama < lokal, dan e keras/pepet berpindah bersih', () => {
  kamus.muatBersama([{ jenis: 'arab', kata: 'ilmu', arab: 'عِلْم' }, { jenis: 'e', kata: 'wortelan', tipe: 'keras' }]);
  assert.ok(convertText('ilmu').pegon.includes('عِلْم'), 'bersama menimpa bawaan');
  assert.equal(kamus.tambahArab('ilmu', 'علوم').ok, true);
  assert.ok(convertText('ilmu').pegon.includes('علوم'), 'lokal menimpa bersama');
  assert.deepEqual(kamus.bentrok(), [{ jenis: 'arab', kata: 'ilmu', lokal: 'علوم', bersama: 'عِلْم' }]);
  kamus.hapusArab('ilmu');
  assert.deepEqual(kamus.bentrok(), []);

  kamus.tambahE('wortelan', 'pepet');
  assert.ok(kamus.bersama().keras.includes('wortelan') && kamus.kustom().pepet.includes('wortelan'));
  assert.deepEqual(kamus.bentrok(), [{ jenis: 'e', kata: 'wortelan', lokal: 'pepet', bersama: 'keras' }]);
  kamus.hapusE('wortelan'); reset();
  assert.equal(kamus.kosong(), true);
  assert.ok(kalibrasiOk(), 'mesin kembali ke kalibrasi baku');
});

test('kamus bersama: entriLokal memetakan kamus perangkat ke bentuk bagikan dan membuang yang tak lolos', () => {
  kamus.tambahArab('tawakal', 'توكل'); kamus.tambahE('reken', 'keras'); kamus.tambahSuffixExc('seolah');
  const { entri, lewat } = kamus.entriLokal();
  assert.equal(lewat, 0);
  assert.deepEqual(entri.map(kamus.idEntri).sort(), ['arab_tawakal', 'e_reken', 'suf_seolah']);
  kamus.hapusArab('tawakal'); kamus.hapusE('reken'); kamus.hapusSuffixExc('seolah');
  assert.equal(kamus.kosong(), true);
});

test('jenisPerbaikan: mengenali catatan mesin yang bisa dibereskan lewat kamus', () => {
  assert.equal(jenisPerbaikan('ada bunyi e — cek pepet/keras'), 'e');
  assert.equal(jenisPerbaikan('kemungkinan serapan Arab yang belum ada di kamus — pastikan ejaan Arabnya, lalu tambahkan ke kamus'), 'arab');
  assert.equal(jenisPerbaikan('kata depan «ke» berdiri sendiri'), null);
  assert.equal(jenisPerbaikan(undefined), null);
  // setiap kata bersorot dari mesin harus punya jalur perbaikan atau memang kasus khusus «ke»
  for (const d of convertText('reken tafakkur kemarin ke pasar').details.filter((x) => x.flagged)) {
    assert.ok(jenisPerbaikan(d.note) || /^ke$/i.test(d.latin), `${d.latin}: ${d.note}`);
  }
});

test('mesin Pegon: angka desimal, nominal, URL, email, dan kode tidak ikut dialihaksarakan', () => {
  const { pegon } = convertText('Zakat 2,5% dari Rp1.000.000,00, lihat www.contoh.com atau a@b.co.id, level C2.');
  assert.ok(pegon.includes('2,5%'), 'koma desimal tetap koma Latin');
  assert.ok(pegon.includes('Rp1.000.000,00'), 'nominal utuh');
  assert.ok(pegon.includes('www.contoh.com'), 'URL utuh');
  assert.ok(pegon.includes('a@b.co.id'), 'email utuh');
  assert.ok(pegon.includes('C2'), 'kode utuh');
  assert.ok(!pegon.includes('2،5'), 'tidak ada koma Arab di dalam angka');
});

test('mesin Pegon: koma antarkata tetap diarabkan dan teks sekitar terlindung tetap dialihaksarakan', () => {
  const { pegon, html } = convertText('suci, lalu Rp5.000 ya?');
  assert.ok(pegon.includes('،'), 'koma kalimat diarabkan');
  assert.ok(pegon.includes('Rp5.000'));
  assert.ok(pegon.includes('؟'));
  assert.match(pegon, /[\u0600-\u06FF]/);
  assert.ok(!/<span/.test(html.replace(/<span class="flag"[^>]*>.*?<\/span>/g, '')), 'html tidak bocor');
});

/* ---------- ejaan klasik penuh (contoh naskah FIQH.docx) ---------- */
import { convertTextEjaan as konvEjaan } from '../web/lib/pegon.js';
test('ejaan klasik: hamzah awal alif polos, ف غ ج, dan -kan + -nya ringkas, sama dengan FIQH.docx', () => {
  const k = (s) => konvEjaan(s, 'klasik').pegon;
  const cocok = { dapat: 'دافات', dengan: 'دغان', yang: 'ياغ', adalah: 'اداله', atau: 'اتاو', orang: 'اوراغ', untuk: 'اونتوك', apa: 'افا', melakukannya: 'ملاكوكنيا', sudah: 'سوداه', kembali: 'كمبالي', siapakah: 'سيافاكه', juga: 'جوكا' };
  for (const [l, h] of Object.entries(cocok)) assert.equal(k(l), h, l);
  assert.equal(k('imam'), 'إمام'); assert.equal(k('akhir'), 'آخر'); // serapan Arab dari kamus tetap berhamzah
});
test('ejaan klasik tidak bocor: Al-Qolam tetap berhamzah sesudah konversi klasik, bahkan bila konversi melempar', () => {
  konvEjaan('adalah', 'klasik');
  assert.equal(konvEjaan('adalah', 'alqolam').pegon, 'أداله');
  assert.equal(convertText('adalah').pegon, 'أداله');
  assert.equal(kalibrasiOk(), true);
});
