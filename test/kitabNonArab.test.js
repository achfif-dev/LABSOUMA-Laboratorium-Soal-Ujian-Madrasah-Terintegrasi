// Impor dan pemakaian kitab/buku NON-ARAB: deteksi bahasa, mutu teks, penanda halaman Latin, bab Latin, validasi server,
// alur impor lewat handler asli, pemeriksa kutipan mode Latin, serta bahasa pada penyusunan soal dan paket.
import test from 'node:test';
import assert from 'node:assert/strict';
import { aksaraDominan, tebakBahasa, tampilanTeks, bahasaKitab, aksaraKitab, bahasaOtomatis, nisbahArab } from '../web/lib/bahasa.js';
import { periksaKualitasTeks } from '../web/lib/kualitasKitab.js';
import { bacaDokumenKitab, bolehVirtual } from '../web/lib/dokumenKitab.js';
import { isianAwal, muatanMulai, peringatanPratinjau, isianSiap, jalankanImpor, PILIHAN_BAHASA } from '../web/lib/imporKitab.js';
import { KATA_KUNCI_BAB, levelKata } from '../web/lib/syamilah.js';
import { periksaKutipan, sumberLatin } from '../web/lib/kutipan.js';
import { statusKutipan } from '../web/lib/paket.js';
import { validasiKitab } from '../src/kitabImpor.js';
import { teksProblem, validateInput, systemPromptFor, SYSTEM_PROMPT, resolveBahasa, buildUserPrompt } from '../src/soalService.js';
import { validatePaket, sistemPaketFor, SISTEM_PAKET } from '../src/paketService.js';
import { __setFirebaseForTest } from '../src/platform.js';
import handler from '../api/kitab.js';
import { fakeDb } from './_fakeDb.js';
import { batalkanDaftar } from '../src/daftarKitab.js';

const KAL = ['Fikih adalah ilmu tentang hukum syariat yang bersifat praktis dan diambil dari dalil yang terperinci.', 'Shalat lima waktu adalah kewajiban setiap muslim yang baligh dan berakal, tidak boleh ditinggalkan.',
  'Wudhu merupakan syarat sah shalat dan harus dilakukan dengan air yang suci dan menyucikan menurut mazhab.', 'Zakat dikeluarkan bila harta telah mencapai nisab dan haul, dan diberikan kepada delapan golongan penerima.'];
const hal = (i) => Array.from({ length: 6 }, (_, k) => `${KAL[(i + k) % 4]} Pembahasan nomor ${i * 7 + k} yang lebih panjang agar halaman cukup.`).join(' ');
const bukuDenganPenanda = (n = 12) => `Pengantar Fikih Dasar\nPenulis: Fulan bin Fulan\nPenerbit: Pustaka Santri\n\n${Array.from({ length: n }, (_, i) => `[hal. ${i + 1}]\n${i === 0 ? 'Bab 1\n' : ''}${i === 5 ? 'Bab 2\n' : ''}${hal(i)}`).join('\n')}`;
const bukuPolos = () => `Pengantar\n\n${Array.from({ length: 40 }, (_, i) => hal(i)).join('\n\nBab 1\n\n')}`;
const ARAB = 'الصلاة واجبة على كل مسلم بالغ عاقل وهي خمس صلوات في اليوم والليلة '.repeat(8);

/* ---------- bahasa.js ---------- */
test('aksara dan bahasa: Arab, Latin, campuran, kosong; saran bahasa Latin', () => {
  assert.equal(aksaraDominan(ARAB), 'arab'); assert.equal(aksaraDominan(hal(1)), 'latin'); assert.equal(aksaraDominan('123 !!'), null);
  assert.equal(aksaraDominan(`${hal(1)} ${'الصلاة '.repeat(3)}`), 'latin');
  assert.equal(tebakBahasa(ARAB), 'ar'); assert.equal(tebakBahasa(hal(2)), 'id');
  assert.equal(tebakBahasa('The prayer is obligatory and the one who is in the state of purity must perform it, and it is for the believers in the morning and the evening as is in this chapter of the book. '.repeat(3)), 'en');
  assert.equal(tebakBahasa('Wong sing sholat iku kudu suci lan ora kena ninggalake kanggo saben dina, lan yen ora ana banyu mula tayamum saka lemah. Iki wis ana ing kitab kang kapisan marang sampeyan. '.repeat(3)), 'jv');
  assert.equal(bahasaOtomatis(''), 'ar'); assert.equal(bahasaOtomatis(ARAB), 'ar'); assert.equal(bahasaOtomatis(hal(3)), 'id');
  assert.ok(nisbahArab(ARAB) > 0.99 && nisbahArab(hal(1)) === 0);
});
test('tampilanTeks: Arab kanan-ke-kiri dengan kelas ar; Latin kiri-ke-kanan tanpa kelas ar; kitab lama = Arab; Pegon tetap RTL', () => {
  assert.deepEqual(tampilanTeks(null, 'x'), { dir: 'rtl', lang: 'ar', className: 'ar x' });
  assert.deepEqual(tampilanTeks({ bahasa: 'id', aksara: 'latin' }, 'text-lg'), { dir: 'ltr', lang: 'id', className: 'text-lg' });
  assert.equal(tampilanTeks({ bahasa: 'jv', aksara: 'arab' }).dir, 'rtl');
  assert.equal(bahasaKitab({}), 'ar'); assert.equal(aksaraKitab({ bahasa: 'en' }), 'latin'); assert.equal(aksaraKitab({}), 'arab');
});

/* ---------- Mutu teks ---------- */
test('mutu teks: buku Latin tidak ditolak; salah pilih Arab ditolak; teks Arab dipilih Latin ditolak; perilaku lama tanpa opsi tetap', () => {
  const lat = Array.from({ length: 20 }, (_, i) => ({ teks: hal(i) }));
  assert.ok(!periksaKualitasTeks(lat, { bahasa: 'id', aksara: 'latin' }).some((x) => x.tingkat === 'bad'));
  assert.ok(periksaKualitasTeks(lat).some((x) => x.kode === 'bukan-arab' && x.tingkat === 'bad'), 'tanpa opsi = kitab Arab (lama)');
  assert.ok(periksaKualitasTeks(lat, { bahasa: 'ar' }).some((x) => x.kode === 'bukan-arab'));
  const ar = Array.from({ length: 12 }, () => ({ teks: ARAB }));
  assert.ok(periksaKualitasTeks(ar, { bahasa: 'id', aksara: 'latin' }).some((x) => x.kode === 'aksara-tidak-cocok' && x.tingkat === 'bad'));
  assert.ok(!periksaKualitasTeks(ar, { bahasa: 'jv', aksara: 'arab' }).some((x) => x.tingkat === 'bad' && x.kode.includes('aksara')), 'Pegon: bahasa daerah beraksara Arab sah');
});
test('mutu teks Latin: huruf terpisah-pisah dan kata menempel terdeteksi; teks sehat bersih', () => {
  const sehat = Array.from({ length: 20 }, (_, i) => ({ teks: hal(i) }));
  assert.deepEqual(periksaKualitasTeks(sehat, { aksara: 'latin' }).filter((x) => !['ganda'].includes(x.kode)), []);
  const pisah = sehat.map((h) => ({ teks: Array.from(h.teks).join(' ') }));
  assert.ok(periksaKualitasTeks(pisah, { aksara: 'latin' }).some((x) => x.kode === 'huruf-terpisah' && x.tingkat === 'bad'));
  const nempel = sehat.map((h) => ({ teks: h.teks.replace(/ /g, '').replace(/(.{40})/g, '$1 ') }));
  assert.ok(periksaKualitasTeks(nempel, { aksara: 'latin' }).some((x) => x.kode === 'kata-menempel'));
  const mojibake = sehat.map((h) => ({ teks: Buffer.from(`${h.teks} café résumé naïve`, 'utf8').toString('latin1') }));
  assert.ok(periksaKualitasTeks(mojibake, { aksara: 'latin' }).every((x) => x.kode !== 'bukan-arab'));
});

/* ---------- Judul bab Latin ---------- */
test('judul bab Latin: bernomor atau berdiri sendiri; kalimat biasa bukan judul; Arab tetap', () => {
  for (const t of ['Bab 3', 'BAB IV', 'Chapter 12', 'Pasal 5', 'Pendahuluan', 'Kata Pengantar', 'Introduction']) assert.ok(KATA_KUNCI_BAB.test(t), t);
  for (const t of ['Penutup surat itu berisi', 'Part of the plan', 'Bab pertama membahas', 'Bagian dari kitab ini']) assert.ok(!KATA_KUNCI_BAB.test(t), t);
  assert.ok(KATA_KUNCI_BAB.test('باب الصلاة') && KATA_KUNCI_BAB.test('مقدمة'));
  assert.equal(levelKata('Pendahuluan'), 1); assert.equal(levelKata('Bab 2'), 2); assert.equal(levelKata('باب'), 2); assert.equal(levelKata('كتاب الطهارة'), 1);
});

/* ---------- Pembacaan dokumen ---------- */
test('teks Latin dengan penanda [hal. N]: halaman, judul bab, kepala berkas, bahasa terdeteksi', async () => {
  const h = await bacaDokumenKitab({ nama: 'fikih.txt', teks: bukuDenganPenanda() });
  assert.equal(h.format, 'txt-penanda-sisip'); assert.equal(h.halaman.length, 12); assert.deepEqual(h.halaman.map((p) => p.hal).slice(0, 3), [1, 2, 3]);
  assert.deepEqual(h.daftarIsi.map((d) => [d.judul, d.hal]), [['Bab 1', 1], ['Bab 2', 6]]);
  assert.equal(h.kitab.judul, 'Pengantar Fikih Dasar'); assert.equal(h.kitab.pengarang, 'Fulan bin Fulan'); assert.equal(h.kitab.edisi.penerbit, 'Pustaka Santri');
  assert.equal(h.kitab.aksara, 'latin'); assert.equal(h.kitab.bahasa, 'id'); assert.equal(h.laporan.bahasa, 'id');
});
test('penanda Latin lain: [halaman N], [page N], [jilid 2, hal. 5]; berkas Syamilah lama tidak berubah', async () => {
  for (const [p, jml] of [['[halaman %]', 1], ['[page %]', 1], ['[hlm. %]', 1], ['[p. %]', 1]]) {
    const teks = `Judul Buku\n${Array.from({ length: 3 }, (_, i) => `${p.replace('%', i + 1)}\n${hal(i)}`).join('\n')}`;
    const h = await bacaDokumenKitab({ nama: 'x.txt', teks }); assert.equal(h.halaman.length, 3, p); assert.equal(h.halaman[2].hal, 3 * jml);
  }
  const j = await bacaDokumenKitab({ nama: 'x.txt', teks: `Judul\n[jilid 2, hal. 5]\n${hal(1)}\n[jilid 2, hal. 6]\n${hal(2)}` });
  assert.deepEqual(j.halaman.map((p) => [p.juz, p.hal]), [[2, 5], [2, 6]]);
  const lama = await bacaDokumenKitab({ nama: 'x.txt', teks: `كتاب\n[ص 1]\n${ARAB}\n[ص 2]\n${ARAB}` });
  assert.equal(lama.kitab.aksara, 'arab'); assert.equal(lama.kitab.bahasa, 'ar'); assert.deepEqual(lama.halaman.map((p) => p.hal), [1, 2]);
});
test('teks Latin tanpa penanda: ditolak, bisa dibagi otomatis (virtual); EPUB/HTML/JSON/PDF Latin diterima', async () => {
  await assert.rejects(() => bacaDokumenKitab({ nama: 'polos.txt', teks: bukuPolos() }), (e) => e.kode === 'TANPA_PENANDA' && bolehVirtual(e) && /hal\. N/.test(e.message));
  const v = await bacaDokumenKitab({ nama: 'polos.txt', teks: bukuPolos(), virtual: true });
  assert.equal(v.kitab.halamanVirtual, true); assert.ok(v.halaman.length > 5); assert.equal(v.kitab.aksara, 'latin'); assert.ok(v.daftarIsi.length > 0);
  const html = `<html><body><h1>Buku HTML</h1>${Array.from({ length: 6 }, (_, i) => `<p>[hal. ${i + 1}]</p><p>${hal(i)}</p>`).join('')}</body></html>`;
  const h = await bacaDokumenKitab({ nama: 'b.html', teks: html }); assert.equal(h.halaman.length, 6); assert.equal(h.kitab.aksara, 'latin');
  const json = JSON.stringify({ judul: 'Buku JSON', pengarang: 'Fulan', halaman: Array.from({ length: 5 }, (_, i) => ({ hal: i + 1, teks: hal(i) })) });
  const j = await bacaDokumenKitab({ nama: 'b.json', teks: json }); assert.equal(j.halaman.length, 5); assert.equal(j.kitab.bahasa, 'id'); assert.equal(j.kitab.penomoranSesuaiCetak, true);
  const pdf = await bacaDokumenKitab({ nama: 'buku.pdf', buffer: new ArrayBuffer(8), bacaPdf: async () => Array.from({ length: 12 }, (_, i) => `${hal(i)}\n${i + 1}`) });
  assert.equal(pdf.format, 'pdf'); assert.equal(pdf.halaman.length, 12); assert.equal(pdf.kitab.aksara, 'latin'); assert.equal(pdf.kitab.sumber.jenis, 'pdf');
});
test('halaman Latin panjang dipecah di batas kalimat (titik), nomor cetak tetap', async () => {
  const panjang = Array.from({ length: 70 }, (_, i) => `Kalimat nomor ${i} berisi penjelasan hukum yang cukup panjang untuk diuji pemecahannya di batas kalimat.`).join(' ');
  const h = await bacaDokumenKitab({ nama: 'x.txt', teks: `Buku\n[hal. 1]\n${panjang}\n[hal. 2]\n${hal(1)}` });
  assert.ok(h.halaman.length > 2 && h.halaman.filter((p) => p.hal === 1).length >= 2); assert.ok(h.halaman[0].teks.endsWith('.'));
});

/* ---------- Layar impor (logika klien) ---------- */
test('isian awal buku Latin: nama dan ID terisi dari judul, bahasa terpilih; pratinjau bersih; salah pilih Arab menghalangi', async () => {
  const h = await bacaDokumenKitab({ nama: 'fikih.txt', teks: bukuDenganPenanda() });
  const i = isianAwal(h);
  assert.equal(i.judulLatin, 'Pengantar Fikih Dasar'); assert.equal(i.kitabId, 'pengantar-fikih-dasar'); assert.equal(i.bahasa, 'id'); assert.equal(i.aksara, 'latin'); assert.equal(isianSiap(i), true);
  const w = peringatanPratinjau(h, { bahasa: i.bahasa, aksara: i.aksara });
  assert.ok(!w.some((x) => x.tingkat === 'bad')); assert.ok(!w.some((x) => /Matn tidak terpisah/.test(x.teks)));
  assert.ok(peringatanPratinjau(h, { bahasa: 'ar', aksara: 'arab' }).some((x) => x.tingkat === 'bad'));
  assert.equal(isianSiap({ ...i, bahasa: 'ar', aksara: 'latin' }), false, 'kombinasi tidak ada di daftar pilihan');
  assert.ok(PILIHAN_BAHASA.some(([v]) => v === 'jv:arab'));
  const m = muatanMulai(h, i); assert.equal(m.kitab.bahasa, 'id'); assert.equal(m.kitab.aksara, 'latin'); assert.equal(m.kitab.judul, 'Pengantar Fikih Dasar');
});

/* ---------- Server: validasi dan alur lewat handler ---------- */
const KITAB_DASAR = { judul: 'Buku', judulLatin: 'Buku', jumlahHalaman: 3, jumlahJuz: 1, bentukMatn: 'tanpa-pemisah' };
test('validasiKitab: bahasa/aksara diterima, bawaan Arab untuk klien lama, kombinasi salah ditolak', () => {
  const lama = validasiKitab(KITAB_DASAR); assert.equal(lama.bahasa, 'ar'); assert.equal(lama.aksara, 'arab');
  const id = validasiKitab({ ...KITAB_DASAR, bahasa: 'id' }); assert.equal(id.aksara, 'latin');
  assert.equal(validasiKitab({ ...KITAB_DASAR, bahasa: 'jv', aksara: 'arab' }).aksara, 'arab');
  for (const x of [{ bahasa: 'xx' }, { bahasa: 'id', aksara: 'rune' }, { bahasa: 'ar', aksara: 'latin' }]) assert.throws(() => validasiKitab({ ...KITAB_DASAR, ...x }), (e) => e.code === 'KITAB_INVALID');
});
const mkRes = () => { const r = { setHeader() {}, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; };
async function lewat(db, body, token = 'tok_admin') {
  const fb = { db, auth: { verifyIdToken: async (t) => ({ uid: t.replace('tok_', 'u_') }) }, FieldValue: {} }; __setFirebaseForTest(fb);
  try { const r = mkRes(); await handler({ method: 'POST', headers: { authorization: 'Bearer ' + token }, body }, r); return r; } finally { __setFirebaseForTest(null); }
}
test('impor buku Latin ujung ke ujung lewat /api/kitab, lalu dibaca lewat perpus-*', async () => {
  const data = { 'users/u_admin': { role: 'admin', name: 'A' }, 'users/u_editor': { role: 'editor', name: 'E' } }; const db = fakeDb(data);
  const hasil = await bacaDokumenKitab({ nama: 'fikih.txt', teks: bukuDenganPenanda(8) });
  const isian = isianAwal(hasil);
  const panggil = async (b) => { const r = await lewat(db, b); if (r.code !== 200) throw { ...r.body.error, status: r.code }; return r.body; };
  const r = await jalankanImpor({ panggil, hasil, isian });
  assert.equal(r.selesai.jumlah, 8);
  const meta = data['kitab/pengantar-fikih-dasar']; assert.equal(meta.bahasa, 'id'); assert.equal(meta.aksara, 'latin'); assert.equal(meta.aktif, true);
  const daftar = await lewat(db, { aksi: 'perpus-daftar' }, 'tok_editor');
  assert.equal(daftar.code, 200); assert.equal(daftar.body.kitab[0].bahasa, 'id'); assert.equal(daftar.body.kitab[0].aksara, 'latin');
  const cari = await lewat(db, { aksi: 'perpus-cari', kitabId: 'pengantar-fikih-dasar', q: 'wudhu' }, 'tok_editor');
  assert.equal(cari.code, 200); assert.ok(cari.body.total > 0, 'pencarian Latin tidak membedakan huruf besar/kecil');
  const caps = await lewat(db, { aksi: 'perpus-cari', kitabId: 'pengantar-fikih-dasar', q: 'WUDHU' }, 'tok_editor'); assert.equal(caps.body.total, cari.body.total);
  // kitab lama tanpa bidang bahasa dibaca sebagai Arab
  data['kitab/lama'] = { ...data['kitab/pengantar-fikih-dasar'], bahasa: undefined, aksara: undefined, judulLatin: 'Lama' };
  delete data['kitab/lama'].bahasa; delete data['kitab/lama'].aksara;
  await batalkanDaftar(db); // daftar kitab dicache (src/daftarKitab.js); data diubah langsung di atas, jadi batalkan seperti yang dilakukan impor
  const d2 = await lewat(db, { aksi: 'perpus-daftar' }, 'tok_editor'); const lama = d2.body.kitab.find((k) => k.id === 'lama'); assert.equal(lama.bahasa, 'ar'); assert.equal(lama.aksara, 'arab');
});

/* ---------- Penyusunan soal ---------- */
test('teksProblem: Arab = aturan lama; bahasa lain cukup panjang; bahasa tak dikenal ditolak', () => {
  assert.equal(teksProblem(hal(1), 'id'), null); assert.match(teksProblem('pendek', 'id'), /terlalu pendek/);
  assert.match(teksProblem(hal(1), 'ar'), /harus berbahasa Arab/); assert.match(teksProblem(hal(1)), /harus berbahasa Arab/); assert.equal(teksProblem(ARAB, 'ar'), null);
  assert.equal(resolveBahasa(undefined), 'ar'); assert.equal(resolveBahasa(' ID '), 'id'); assert.equal(resolveBahasa('klingon'), undefined);
});
const BODY = { tingkat: 'MA', level: 'L1', bentuk: 'pilgan' };
test('validateInput: teks Latin diterima hanya bila bahasa bukan Arab (klien lama tetap ditolak)', () => {
  assert.throws(() => validateInput({ ...BODY, teks: hal(1) }), (e) => e.code === 'INVALID_ARABIC');
  assert.throws(() => validateInput({ ...BODY, teks: hal(1), bahasa: 'ar' }), (e) => e.code === 'INVALID_ARABIC');
  const i = validateInput({ ...BODY, teks: hal(1), bahasa: 'id' }); assert.equal(i.bahasa, 'id');
  assert.equal(validateInput({ ...BODY, teks: ARAB }).bahasa, 'ar');
  assert.throws(() => validateInput({ ...BODY, teks: hal(1), bahasa: 'zz' }), (e) => e.status === 400);
});
test('prompt: Arab tidak berubah sama sekali; bahasa lain tidak lagi menyebut Arab', () => {
  assert.equal(systemPromptFor('pilgan'), SYSTEM_PROMPT); assert.equal(systemPromptFor('pilgan', 'ar'), SYSTEM_PROMPT);
  const p = systemPromptFor('pilgan', 'id');
  for (const frasa of ['berbahasa Arab', 'kutipan Arab', 'bagian Arab', 'harakat', 'bukan bahasa Arab']) assert.ok(!p.includes(frasa), frasa);
  assert.match(p, /berbahasa Indonesia/); assert.match(p, /tanda petik ganda/); assert.match(p, /tanpa terjemahan/);
  assert.match(systemPromptFor('pilgan', 'en'), /terjemahkan ke Bahasa Indonesia/);
  assert.ok(buildUserPrompt(validateInput({ ...BODY, teks: hal(1), bahasa: 'jv' }), 'A').includes('Bahasa teks sumber: Jawa'));
  assert.ok(!buildUserPrompt(validateInput({ ...BODY, teks: ARAB }), 'A').includes('Bahasa teks sumber'));
});
test('paket: bahasa diteruskan, prompt disesuaikan, Arab tidak berubah', () => {
  const spek = [{ bentuk: 'pilgan', level: 'L1' }];
  assert.equal(validatePaket({ teks: hal(1), tingkat: 'MA', spek, bahasa: 'id' }).bahasa, 'id');
  assert.throws(() => validatePaket({ teks: hal(1), tingkat: 'MA', spek }), (e) => e.code === 'INVALID_ARABIC');
  assert.equal(sistemPaketFor('ar'), SISTEM_PAKET);
  const p = sistemPaketFor('id'); for (const f of ['berbahasa Arab', 'kata Arab', 'mengutip Arab', 'bahasa Arab yang']) assert.ok(!p.includes(f), f);
});

/* ---------- Pemeriksa kutipan mode Latin ---------- */
test('kutipan Latin: kutipan bertanda petik dicocokkan tanpa membedakan huruf besar; Arab tidak berubah', () => {
  const teks = hal(1); assert.equal(sumberLatin(teks), true); assert.equal(sumberLatin(ARAB), false);
  const kalimat = KAL[1]; // kalimat utuh (pemotongan di tengah kata memang dinilai "mirip")
  const ok = periksaKutipan({ pembahasan: `Menurut teks, "${kalimat.toUpperCase()}" sehingga wajib.` }, teks);
  assert.equal(ok.ringkas.total, 1); assert.equal(ok.ringkas.cocok, 1); assert.equal(ok.status, 'lolos');
  const palsu = periksaKutipan({ pembahasan: 'Teks menyatakan "puasa ramadhan wajib atas setiap muslim dewasa" saja.' }, teks);
  assert.equal(palsu.status, 'gagal'); assert.equal(palsu.ringkas.tidak_ditemukan, 1);
  const tanpa = periksaKutipan({ pembahasan: 'Tidak ada kutipan di sini.' }, teks);
  assert.equal(tanpa.status, 'periksa'); assert.match(tanpa.peringatan[0], /tanda petik/);
  const arab = periksaKutipan({ pembahasan: 'الصلاة واجبة على كل مسلم' }, ARAB); assert.equal(arab.ringkas.cocok, 1);
});
test('statusKutipan paket pada teks Latin: salinan polos dicocokkan; palsu dibuang', () => {
  const teks = hal(1);
  assert.equal(statusKutipan(periksaKutipan, KAL[0], teks).status, 'cocok');
  assert.equal(statusKutipan(periksaKutipan, 'kalimat yang sama sekali tidak ada di teks sumber ini', teks).status, 'tidak_cocok');
  assert.equal(statusKutipan(periksaKutipan, '', teks).status, 'kosong');
  assert.equal(statusKutipan(periksaKutipan, 'الصلاة واجبة على كل مسلم', ARAB).status, 'cocok');
});
