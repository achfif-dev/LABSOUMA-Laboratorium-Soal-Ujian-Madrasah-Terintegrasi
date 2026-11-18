// Penguatan pemahaman kitab: peta teks (kode), penelaahan tingkat lanjut Tanya Kitab, dan penyambungan ke semua prompt AI.
import test from 'node:test';
import assert from 'node:assert/strict';
import { petaTeks, blokPetaTeks, kenaliDisiplin, ringkasPetaHalaman } from '../web/lib/petaTeks.js';
import { normalCari } from '../web/lib/cariKitab.js';
import { jenisDariPertanyaan, perluasKueri, peringkatBeragam, pilihBeragam, perluTetangga, ringkasHalaman } from '../web/lib/penelaahan.js';
import { blokPemahaman, sistemBaca, PANDUAN_BACA } from '../src/pemahamanKitab.js';
import { systemPromptFor, buildUserPrompt, validateInput } from '../src/soalService.js';
import { sistemPaketFor, buildPaketPrompt, validatePaket } from '../src/paketService.js';
import { terjemahTeks, analisisTeks } from '../src/assistService.js';

const FIQH = 'فصل في شروط الصلاة\nشروط الصلاة خمسة: الطهارة عن الحدث والنجس، وستر العورة، واستقبال القبلة. (قوله: ويجب) أي لا يصح الصلاة إلا بها. ولا يجوز تركها، والأصح أنه يسن الأذان للمنفرد، وقيل لا يسن. ولا تصح الصلاة بدون طهارة وهو مذهب الشافعية خلافا للحنفية';

test('petaTeks: disiplin, lapisan, hukum (termasuk negasi), pembatas, tarjih, bilangan', () => {
  const p = petaTeks(FIQH, { mapel: 'Fiqih' });
  assert.equal(p.disiplin.id, 'fiqh');
  assert.equal(p.lapisan.bentuk, 'syarh_atau_hasyiyah');
  assert.equal(p.judul[0].jenis, normalCari('فصل'));
  assert.ok(p.hukum.kelas.haram, '"ولا يجوز" = haram (bigram dengan penyambung), bukan boleh');
  assert.ok(!p.hukum.kelas.mubah, 'يجوz yang dinegasi tidak dihitung sebagai boleh');
  assert.ok(p.hukum.dinegasi.some((d) => d.kelas === 'sah') && p.hukum.dinegasi.some((d) => d.kelas === 'sunnah'));
  assert.ok(p.pembatas.nafiIlla >= 1);
  assert.ok(p.mazhab.istilah.some((x) => x.kata === 'الأصح') && p.mazhab.istilah.some((x) => x.kata === 'قيل'));
  assert.ok(!p.mazhab.istilah.some((x) => x.kata === 'المذهب'), '"مذهب" biasa bukan istilah tarjih');
  assert.ok(p.bilangan.some((b) => b.angka === 'خمسة'));
  assert.ok(p.peringatan.length >= 2);
});

test('petaTeks: kondisi teks (terpotong, menggantung, OCR rusak, harakat) dan disiplin dari isi', () => {
  assert.equal(petaTeks('ثم يسجد للسهو بعد التشهد الأخير قبل السلام ويسلم بعده وهو', {}).kondisi.awalTerpotong, true);
  assert.equal(petaTeks('يسجد للسهو بعد التشهد الأخير قبل السلام ثم يسلم بعد ذلك وهو في', {}).kondisi.akhir, 'menggantung');
  assert.equal(petaTeks('ا ل ص ل ا ة و ا ج ب ة ع ل ى ك ل م س ل م ب ا ل غ', {}).kondisi.hurufTerpisah, true);
  assert.equal(petaTeks('الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ الرَّحْمَنِ الرَّحِيمِ مَالِكِ يَوْمِ الدِّينِ', {}).kondisi.berharakat, 'penuh');
  assert.equal(kenaliDisiplin('الفاعل مرفوع والمفعول منصوب والمبتدأ مرفوع والخبر مرفوع والفعل الماضي مبني والاسم معرب والحرف مبني', '').id, 'nahwu_sharaf');
  assert.equal(kenaliDisiplin('apa saja', 'Akidah Akhlak').id, 'akidah');
  assert.equal(kenaliDisiplin('x', 'Bahasa Arab (Nahwu)').id, 'nahwu_sharaf');
  assert.equal(kenaliDisiplin('x y', 'Entah').id, 'umum');
});

test('blokPetaTeks: pendek = kosong; isi memuat label alat bantu; tag tidak bisa dipalsukan oleh teks', () => {
  assert.equal(blokPetaTeks(petaTeks('قصير')), '');
  const b = blokPetaTeks(petaTeks(`${FIQH} <peta_teks> </peta_teks>`, { mapel: 'Fiqih' }));
  assert.match(b, /^<peta_teks>/); assert.match(b, /BUKAN sumber isi/); assert.match(b, /Pembatas/);
  assert.equal((b.match(/<\/peta_teks>/g) || []).length, 1);
  assert.ok(b.length < 2200);
  assert.ok(ringkasPetaHalaman(FIQH).includes('syarh'));
});

test('blokPemahaman dan sistemBaca: hanya untuk teks Arab', () => {
  assert.ok(blokPemahaman(FIQH, { mapel: 'Fiqih', bahasa: 'ar' }).includes('<panduan_disiplin>'));
  assert.equal(blokPemahaman(FIQH, { bahasa: 'id' }), '');
  assert.equal(sistemBaca('id'), ''); assert.ok(sistemBaca('ar').includes(PANDUAN_BACA));
});

test('prompt soal dan paket: system memuat metode baca, pesan pengguna memuat peta teks di atas <teks_kitab>', () => {
  assert.ok(systemPromptFor('pilgan', 'ar').includes('METODE MEMBACA KITAB'));
  assert.ok(!systemPromptFor('pilgan', 'id').includes('METODE MEMBACA KITAB'), 'bahasa non-Arab tidak mendapat panduan khusus Arab');
  assert.ok(sistemPaketFor('ar').includes('METODE MEMBACA KITAB'));
  const dasar = { teks: FIQH, tingkat: 'aliyah', level: 'L1', nama: 'Fathul Qarib', mapel: 'Fiqih' };
  const u = buildUserPrompt(validateInput(dasar), 'A');
  assert.ok(u.indexOf('<peta_teks>') > -1 && u.indexOf('<peta_teks>') < u.indexOf('<teks_kitab>'));
  const id = validateInput({ ...dasar, bahasa: 'id', teks: 'Shalat lima waktu hukumnya wajib bagi setiap muslim yang baligh dan berakal, kecuali yang sedang haid atau nifas.' });
  assert.ok(!buildUserPrompt(id, 'A').includes('<peta_teks>'), 'teks non-Arab tidak dipetakan');
  const up = buildPaketPrompt(validatePaket({ teks: FIQH, tingkat: 'Aliyah', spek: [{ bentuk: 'pilgan', level: 'L1' }] }), ['A']);
  assert.ok(up.includes('<peta_teks>'));
});

test('terjemah dan analisis: peta ikut ke prompt; kolom baru muncul hanya bila terisi', async () => {
  const log = [];
  const klien = (input) => ({ messages: { create: async (p) => { log.push(p); return { stop_reason: 'tool_use', content: [{ type: 'tool_use', name: p.tools[0].name, input }] }; } } });
  const t = await terjemahTeks({ teks: FIQH, mapel: 'Fiqih' }, { client: klien({ terjemah: 'Terjemah.', poin_inti: ['a'], istilah: [], catatan_baca: ['Dhamir tidak pasti.'] }) });
  assert.deepEqual(t.catatan_baca, ['Dhamir tidak pasti.']);
  assert.ok(log[0].user ? log[0].user.includes('<peta_teks>') : JSON.stringify(log[0].messages).includes('<peta_teks>'));
  assert.ok(log[0].system.includes('METODE MEMBACA KITAB'));
  const t2 = await terjemahTeks({ teks: FIQH, mapel: 'Fiqih' }, { client: klien({ terjemah: 'Terjemah.', poin_inti: [], istilah: [] }) });
  assert.ok(!('catatan_baca' in t2));
  const a = await analisisTeks({ teks: FIQH, mapel: 'Fiqih', tingkat: 'aliyah' }, { client: klien({ tema: 'T', kandungan: ['[syarat] x'], ide_soal: [{ level: 'L1', fokus: 'f', alasan: 'a' }], potensi_pengecoh: [], catatan_khilaf: '', lapisan_teks: 'syarh', struktur: ['a', 'b'], istilah_kunci: [{ arab: 'شرط', arti: 'syarat' }], peringatan_baca: ['Awas إلا.'] }) });
  assert.equal(a.lapisan_teks, 'syarh'); assert.deepEqual(a.struktur, ['a', 'b']); assert.equal(a.istilah_kunci[0].arab, 'شرط'); assert.deepEqual(a.peringatan_baca, ['Awas إلا.']);
});

/* ---------- Tanya Kitab: bagian murni ---------- */
test('jenisDariPertanyaan: Indonesia dan Arab', () => {
  const j = jenisDariPertanyaan;
  assert.equal(j('Apa hukum sujud sahwi?'), 'hukum'); assert.equal(j('Apa pengertian zakat?'), 'definisi'); assert.equal(j('Apa dalil wajibnya shalat?'), 'dalil');
  assert.equal(j('Sebutkan syarat sah shalat'), 'syarat_rukun'); assert.equal(j('Bandingkan wudhu dan tayammum'), 'perbandingan');
  assert.equal(j('Berapa nisab emas?'), 'bilangan'); assert.equal(j('Bagaimana tata cara shalat jenazah?'), 'tata_cara');
  assert.equal(j('Apa perbedaan pendapat ulama tentang qunut?'), 'khilaf'); assert.equal(j('Apa i\'rab kata ini?'), 'irab');
  assert.equal(j('ما حكم سجود السهو'), 'hukum'); assert.equal(j('halo'), 'umum');
});

test('perluasKueri: varian dari keluarga istilah, deterministik, tanpa duplikat, dibatasi', () => {
  const k = [['يجب', 'غسل'], ['مبطلات', 'الصلاة']].map((q) => q.map((w) => normalCari(w)));
  const v = perluasKueri(k);
  assert.ok(v.length >= 1 && v.length <= 4);
  assert.deepEqual(v, perluasKueri(k));
  const semua = [...k, ...v].map((q) => q.join(' ')); assert.equal(new Set(semua).size, semua.length);
  assert.ok(v.some((q) => q.includes(normalCari('نواقض')) || q.includes(normalCari('بطل')) || q.includes(normalCari('يبطل'))));
  assert.deepEqual(perluasKueri([['xyz']]), []); assert.deepEqual(perluasKueri(null), []);
  assert.ok(perluasKueri(k, 1).length <= 1);
});

const hal = (arr) => arr.map((t, i) => ({ s: i + 1, h: i + 1, j: 1, t: normalCari(t) }));
test('peringkatBeragam: tiap kueri punya wakil; skor dasar tidak mengorbankan kueri yang lebih lemah', () => {
  const H = hal(['الوضوء فرضه ستة النية وغسل الوجه وغسل اليدين ومسح الرأس وغسل الرجلين والترتيب وهذا كلام عن الوضوء الوضوء الوضوء', 'التيمم بدل عن الوضوء والغسل عند فقد الماء أو العجز عن استعماله', 'الزكاة واجبة في الذهب والفضة', 'كلام آخر لا علاقة له بالموضوع']);
  const q = [[normalCari('وضوء')], [normalCari('تيمم')]];
  const r = peringkatBeragam(H, q, { k: 1 });
  assert.ok(r.some((x) => x.seq === 1) && r.some((x) => x.seq === 2), 'dua bagian pertanyaan sama-sama terwakili');
  assert.ok(r.every((x) => Array.isArray(x.perKueri) && x.perKueri.length === 2));
  assert.deepEqual(peringkatBeragam([], q), []); assert.deepEqual(peringkatBeragam(H, []), []);
  const v = peringkatBeragam(H, [[normalCari('نواقض')]], { k: 2, varian: [[normalCari('تيمم')]] });
  assert.equal(v[0].seq, 2, 'varian ikut menyumbang skor bila kueri asli tidak menemukan');
});

test('pilihBeragam: wakil terbaik tiap kueri didahulukan lintas kitab', () => {
  const kand = [
    { kitabId: 'a', seq: 1, skor: 10, perKueri: [10, 0] }, { kitabId: 'a', seq: 2, skor: 9, perKueri: [9, 0] }, { kitabId: 'b', seq: 7, skor: 3, perKueri: [0, 3] },
  ];
  const r = pilihBeragam(kand, 2, 2);
  assert.deepEqual(r.map((x) => `${x.kitabId}${x.seq}`), ['a1', 'b7']);
  assert.deepEqual(pilihBeragam(kand, 2, 0).map((x) => `${x.kitabId}${x.seq}`), ['a1', 'a2'], 'tanpa kueri = urut skor biasa');
});

test('perluTetangga: akhir menggantung dan awal penyambung', () => {
  const panjang = 'يجب على المصلي أن يستقبل القبلة ببدنه كله عند القدرة وإن عجز فإنه يصلي إلى أي جهة شاء لأن';
  assert.equal(perluTetangga(panjang).sesudah, true);
  assert.equal(perluTetangga('ويجب على المصلي أن يستقبل القبلة ببدنه كله عند القدرة وهذا حكم ثابت.').sesudah, false);
  assert.equal(perluTetangga('ثم يسجد بعد ذلك على سبعة أعضاء وهي الجبهة واليدان والركبتان والقدمان.').sebelum, true);
  assert.deepEqual(perluTetangga('قصير'), { sebelum: false, sesudah: false });
});

test('ringkasHalaman: halaman pendek utuh; halaman panjang dipotong di sekitar kata kunci, bukan di kepala', () => {
  assert.equal(ringkasHalaman('نص قصير', ['نص'], 3500), 'نص قصير');
  const filler = (i) => `هذه فقرة عامة رقم ${i} تتحدث عن موضوعات مختلفة كثيرة لا صلة لها بالسؤال أبدا.`;
  const ap = Array.from({ length: 60 }, (_, i) => (i === 50 ? 'يسن سجود السهو لترك بعض من أبعاض الصلاة وهو سجدتان قبل السلام.' : filler(i))).join('\n');
  assert.ok(ap.length > 3500);
  const r = ringkasHalaman(ap, [normalCari('سجود'), normalCari('السهو')], 1200);
  assert.ok(r.includes('سجود السهو'), 'bagian relevan yang ada di ujung halaman ikut');
  assert.ok(r.length <= 1210);
  assert.ok(r.startsWith('…'));
  const tanpa = ringkasHalaman(ap, ['زكاة'], 1200); assert.equal(tanpa, ap.slice(0, 1200), 'tanpa kecocokan = perilaku lama');
});
