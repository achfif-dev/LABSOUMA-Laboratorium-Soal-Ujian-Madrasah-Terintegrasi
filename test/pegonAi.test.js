import test from 'node:test';
import assert from 'node:assert/strict';
import { convertText } from '../src/pegon.js';
import { perkuatPegon, validatePegon, CONTOH } from '../src/pegonService.js';
import { periksaKeluaran, jagaPerubahan, bagiBagian, tokenKata } from '../src/pegonCek.js';

const fake = (...jawaban) => { const calls = []; let n = 0; return { calls, messages: { create: async (r) => { calls.push(r); const j = jawaban[Math.min(n++, jawaban.length - 1)]; return { stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'hasil_pegon', input: typeof j === 'function' ? j(r) : j }] }; } } }; };
const mesin = (t) => convertText(t).pegon;

test('mesin Pegon: sedangkan/tekan/pekan/rekan adalah akar, bukan akar + suffix -kan', () => {
  assert.equal(mesin('sedangkan'), 'سداڠكان'); // master prompt: sedangkan memakai vokal penuh
  assert.equal(mesin('tekan'), 'تكان');
  assert.equal(mesin('pekan'), 'ڤكان');
  assert.equal(mesin('rekan'), 'ركان');
  assert.equal(mesin('tulikan'), 'توليكن'); // suffix -kan sungguhan tetap ringkas
});

test('mesin Pegon: pesantren/perlu/pesan tidak lagi bersorot ⚠ untuk bunyi e', () => {
  for (const w of ['pesantren', 'perlu', 'pesan']) assert.equal(convertText(w).details[0].flagged, false, w);
});

test('prompt AI: contoh terverifikasi persis sama dengan keluaran mesin (tidak melenceng dari aturan)', () => {
  assert.ok(CONTOH.length >= 10);
  for (const [lat, peg] of CONTOH) assert.equal(mesin(lat), peg, lat);
});

test('periksaKeluaran: hasil yang sama dengan mesin lolos tanpa masalah', () => {
  const t = 'Ia berkata, "ayat ini" الحمد لله sedangkan harga Rp1.000,00 di www.contoh.id.';
  const m = mesin(t);
  const r = periksaKeluaran({ latin: t, mesin: m, pegon: m });
  assert.deepEqual(r.masalah, []);
  assert.equal(r.berat, false);
});

test('periksaKeluaran: kata hilang, Latin bocor, Arab asli berubah, angka berubah, ng terpecah, ny salah', () => {
  const t = 'Katanya ada 25 orang membaca الحمد لله dengan sungguh-sungguh dan sangat tekun hari ini.';
  const m = mesin(t);
  const kata = tokenKata(m);
  const hilang = kata.slice(0, 4).join(' ');
  assert.ok(periksaKeluaran({ latin: t, mesin: m, pegon: hilang }).masalah.some((x) => x.kode === 'JUMLAH_KATA' && x.berat));
  assert.ok(periksaKeluaran({ latin: t, mesin: m, pegon: `${m} catatan` }).masalah.some((x) => x.kode === 'LATIN_BOCOR' && x.berat));
  assert.ok(periksaKeluaran({ latin: t, mesin: m, pegon: m.replace('الحمد لله', 'الحمد') }).masalah.some((x) => x.kode === 'ARAB_ASLI_BERUBAH' && x.berat));
  assert.ok(periksaKeluaran({ latin: t, mesin: m, pegon: m.replace('25', '52') }).masalah.some((x) => x.kode === 'ANGKA_BERUBAH' && x.berat));
  const ng = periksaKeluaran({ latin: t, mesin: m, pegon: m.replace('ڠ', 'نڬ') });
  assert.ok(ng.masalah.some((x) => x.kode === 'NG_TERPECAH' && !x.berat));
  assert.equal(ng.berat, false);
  assert.ok(periksaKeluaran({ latin: t, mesin: m, pegon: `${m.replace('ڠ', 'ڽ')}` }).masalah.some((x) => x.kode === 'NY_SALAH'));
});

test('periksaKeluaran: tanda ⚠ tidak dihitung sebagai kata dan tidak memicu Latin bocor', () => {
  const t = 'kitab fiqih tentang najis';
  const m = mesin(t);
  const kata = tokenKata(m);
  const r = periksaKeluaran({ latin: t, mesin: m, pegon: `⚠${kata[0]} ${kata[1]} ⚠ ${kata[2]} ${kata[3] || ''}` });
  assert.ok(!r.masalah.some((x) => x.kode === 'JUMLAH_KATA' || x.kode === 'LATIN_BOCOR'));
});

test('jagaPerubahan: perubahan yang dilaporkan diterima, yang tidak dilaporkan dikembalikan, ⚠ dipertahankan', () => {
  const m = 'أ ب ج د';
  const hasil = jagaPerubahan({ mesin: m, pegon: 'أ بب ⚠جج دد', perubahan: [{ dari: 'ب', ke: 'بب', alasan: 'serapan Arab', jenis: 'serapan_arab' }] });
  assert.equal(hasil.selaras, true);
  assert.equal(hasil.teks, 'أ بب ⚠ج د');
  assert.deepEqual(hasil.diterima.map((x) => x.ke), ['بب']);
  assert.deepEqual(hasil.dikembalikan.map((x) => [x.dari, x.ke]), [['ج', 'جج'], ['د', 'دد']]);
  // laporan tanpa alasan sama dengan tidak melapor
  const k = jagaPerubahan({ mesin: m, pegon: 'أ بب ج د', perubahan: [{ dari: 'ب', ke: 'بب', alasan: '  ' }] });
  assert.equal(k.teks, m);
});

test('jagaPerubahan: baris baru dipertahankan; jumlah kata berbeda berarti tidak disejajarkan', () => {
  const m = 'أ ب\nج د';
  assert.equal(jagaPerubahan({ mesin: m, pegon: 'أ ب\nج د' }).teks, m);
  const beda = jagaPerubahan({ mesin: m, pegon: 'أ ب ج', perubahan: [] });
  assert.equal(beda.selaras, false);
});

test('bagiBagian: teks panjang dipecah per baris tanpa kehilangan isi; baris tak seimbang tetap satu bagian', () => {
  const baris = Array.from({ length: 12 }, (_, i) => `kalimat nomor ${i} `.repeat(30).trim());
  const L = baris.join('\n'); const M = baris.map((x) => x.toUpperCase()).join('\n');
  const b = bagiBagian(L, M);
  assert.ok(b.length >= 2 && b.length <= 4, `bagian: ${b.length}`);
  assert.equal(b.map((x) => x.latin).join('\n'), L);
  assert.equal(b.map((x) => x.mesin).join('\n'), M);
  assert.equal(bagiBagian(L, M + '\ntambahan').length, 1);
  assert.equal(bagiBagian('pendek', 'x').length, 1);
});

test('validatePegon: rincian dan kamus dibersihkan, entri cacat dibuang, jumlah dibatasi', () => {
  const v = validatePegon({
    teks: 'kitab', hasilMesin: 'كتاب',
    rincian: [{ latin: 'kitab', pegon: 'x', catatan: 'c' }, { latin: '' }, null, ...Array.from({ length: 100 }, (_, i) => ({ latin: `k${i}` }))],
    kamus: [{ latin: 'syariat', arab: 'شريعة' }, { latin: 'Bad Word', arab: 'x' }, { latin: 'ok', arab: 'latin' }, { latin: '__proto__', arab: 'شريعة' }, 7],
  });
  assert.equal(v.ragu.length, 60);
  assert.deepEqual(v.kamus, [{ latin: 'syariat', arab: 'شريعة' }]);
  assert.deepEqual(validatePegon({ teks: 'kitab', hasilMesin: 'x', rincian: 'bukan array', kamus: {} }).ragu, []);
});

test('perkuatPegon: perbaikan yang dilaporkan dipakai, perubahan liar dibatalkan, prompt memuat contoh, kata ragu, dan kamus', async () => {
  const t = 'Hukum syariat itu penting sekali';
  const m = mesin(t);
  const k = tokenKata(m);
  const ubah = [...k]; ubah[1] = 'شريعة'; ubah[3] = k[3] + 'ا'; // ubah[3] = perubahan liar tanpa laporan
  const c = fake({ pegon: `${ubah[0]} ⚠${ubah[1]} ${ubah[2]} ${ubah[3]} ${k[4]}`, peringatan: [{ kata: 'syariat', catatan: 'cek' }], keyakinan: 'tinggi', perubahan: [{ dari: k[1], ke: 'شريعة', alasan: 'serapan Arab baku', jenis: 'serapan_arab' }] });
  const r = await perkuatPegon({ teks: t, hasilMesin: m, rincian: [{ latin: 'syariat', pegon: k[1], catatan: 'serapan Arab?' }, { latin: 'tidakada', pegon: 'x' }], kamus: [{ latin: 'penting', arab: 'مهم' }] }, { client: c });
  assert.equal(r.pegon, `${k[0]} ⚠شريعة ${k[2]} ${k[3]} ${k[4]}`);
  assert.equal(r.perubahan.length, 1);
  assert.equal(r.dikembalikan, 1);
  assert.equal(r.keyakinan, 'tinggi');
  assert.deepEqual(r.bagian, { total: 1, ditolak: 0, diulang: 0 });
  const prompt = c.calls[0].messages[0].content;
  assert.match(prompt, /<kata_ragu>\nsyariat -> /);
  assert.doesNotMatch(prompt, /tidakada/); // kata ragu yang tidak ada di teks tidak dikirim
  assert.match(prompt, /<kamus_pengguna>\npenting = مهم/);
  assert.match(c.calls[0].system, /CONTOH TERVERIFIKASI/);
  assert.match(c.calls[0].system, /sedangkan = سداڠكان/);
  assert.equal(c.calls[0].tools.some((x) => x.name === 'hasil_pegon' && x.input_schema.properties.perubahan), true);
});

test('perkuatPegon: hasil AI yang membuang kata diulang sekali dengan daftar masalah, lalu dipakai bila sudah benar', async () => {
  const t = 'kitab ini membahas hukum thaharah dengan sangat jelas';
  const m = mesin(t);
  const c = fake({ pegon: tokenKata(m).slice(0, 2).join(' '), peringatan: [] }, { pegon: m, peringatan: [], perubahan: [] });
  const r = await perkuatPegon({ teks: t, hasilMesin: m }, { client: c });
  assert.equal(c.calls.length, 2);
  assert.match(c.calls[1].messages[0].content, /<masalah_percobaan_sebelumnya>[\s\S]*Jumlah kata/);
  assert.equal(r.pegon, m);
  assert.deepEqual(r.bagian, { total: 1, ditolak: 0, diulang: 1 });
});

test('perkuatPegon: dua kali gagal pemeriksa dilempar sebagai AI_BAD_OUTPUT (kuota dikembalikan), tanpa percobaan ulang bila waktu habis', async () => {
  const t = 'kitab ini membahas hukum thaharah dengan sangat jelas';
  const m = mesin(t);
  const buruk = { pegon: `${m} bocor`, peringatan: [] };
  const c = fake(buruk, buruk);
  await assert.rejects(perkuatPegon({ teks: t, hasilMesin: m }, { client: c }), { code: 'AI_BAD_OUTPUT' });
  assert.equal(c.calls.length, 2);
  const c2 = fake(buruk, buruk);
  let tik = 0; // jam palsu: panggilan pertama = mulai, berikutnya sudah melewati batas
  await assert.rejects(perkuatPegon({ teks: t, hasilMesin: m }, { client: c2, now: () => (tik++ === 0 ? 0 : 40_000) }), { code: 'AI_BAD_OUTPUT' });
  assert.equal(c2.calls.length, 1);
});

test('perkuatPegon: teks panjang dibagi, bagian yang gagal dipertahankan dari mesin, bagian lain tetap diperkuat', async () => {
  const baris = Array.from({ length: 9 }, (_, i) => `ini adalah kalimat ke ${i} yang cukup panjang untuk uji pembagian bagian `.repeat(8).trim());
  const t = baris.join('\n'); const m = baris.map(mesin).join('\n');
  let n = 0;
  const c = fake((r) => { n++; const isi = r.messages[0].content.match(/<hasil_mesin>\n([\s\S]*?)\n<\/hasil_mesin>/)[1]; return /^ini/.test(isi) && n === 1 ? { pegon: `${isi} bocor`, peringatan: [] } : { pegon: isi, peringatan: [], perubahan: [] }; });
  const r = await perkuatPegon({ teks: t, hasilMesin: m }, { client: c });
  assert.ok(r.bagian.total >= 2);
  assert.equal(r.pegon.split('\n').length, 9);
  assert.equal(r.pegon, m);
});

const fakeFoto = (...jawaban) => { const calls = []; let n = 0; return { calls, messages: { create: async (r) => { calls.push(r); return { stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'hasil_pegon_foto', input: jawaban[Math.min(n++, jawaban.length - 1)] }] }; } } }; };
const FOTO = { gambar: { mime: 'image/jpeg', data: 'A'.repeat(200) } };

test('fotoPegon: hasil sehat dipakai apa adanya dan selisih dengan mesin dihitung', async () => {
  const { fotoPegon } = await import('../src/pegonService.js');
  const lat = 'kitab ini membahas hukum thaharah dengan sangat jelas';
  const c = fakeFoto({ latin: lat, pegon: mesin(lat), peringatan: [] });
  const r = await fotoPegon(FOTO, { client: c });
  assert.equal(r.pegon, mesin(lat)); assert.equal(r.ditolak, false); assert.equal(r.selisihMesin, 0); assert.equal(c.calls.length, 1);
});

test('fotoPegon: Pegon cacat diulang sekali; bila tetap cacat diganti hasil mesin dengan peringatan', async () => {
  const { fotoPegon } = await import('../src/pegonService.js');
  const lat = 'kitab ini membahas hukum thaharah dengan sangat jelas';
  const buruk = { latin: lat, pegon: `${mesin(lat)} bocor`, peringatan: [] };
  const c = fakeFoto(buruk, { latin: lat, pegon: mesin(lat), peringatan: [] });
  const ok = await fotoPegon(FOTO, { client: c });
  assert.equal(c.calls.length, 2); assert.equal(ok.diulang, true); assert.equal(ok.ditolak, false);
  assert.match(c.calls[1].messages[0].content[1].text, /masalah_percobaan_sebelumnya/);
  const c2 = fakeFoto(buruk, buruk);
  const r = await fotoPegon(FOTO, { client: c2 });
  assert.equal(r.ditolak, true); assert.equal(r.pegon, mesin(lat)); assert.equal(r.latin, lat);
  assert.match(r.peringatan[0].catatan, /ditolak pemeriksa/);
});
