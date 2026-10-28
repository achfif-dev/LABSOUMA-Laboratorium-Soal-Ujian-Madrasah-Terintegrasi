import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { nilaiGenerate, nilaiTelaah, nilaiTolak, memuat, ringkasKelompok, bandingkan } from '../eval/lib.mjs';
import { jalankanKasus, denganUlang } from '../eval/jalankan.mjs';
import { ApiError, normalizeSoal } from '../src/soalService.js';

const TEKS = 'المياه التي يجوز بها التطهير سبع مياه: ماء السماء وماء البحر وماء النهر وماء البئر وماء العين وماء الثلج وماء البرد';
const soal = { stimulus: '', pertanyaan: 'Berapa?', pilihan_a: 'Tiga macam', pilihan_b: 'Lima macam', pilihan_c: 'Tujuh macam', pilihan_d: 'Sembilan macam', pilihan_e: 'Sebelas macam', kunci_jawaban: 'C', pembahasan: 'Teks: المياه التي يجوز بها التطهير سبع مياه', indikator_kisi_kisi: 'x' };
const sepakat = { status: 'sepakat' };

test('nilaiGenerate: soal baik lulus; tiap cacat tertangkap', () => {
  const k = { teks: TEKS, kunci_harus_memuat: ['tujuh'] };
  assert.equal(nilaiGenerate(k, { soal, buta: sepakat }).lulus, true);
  assert.equal(nilaiGenerate(k, { soal, buta: { status: 'beda' } }).cek.uji_buta_sepakat, false);
  assert.equal(nilaiGenerate(k, { soal: { ...soal, kunci_jawaban: 'B' }, buta: sepakat }).cek.kunci_sesuai_harapan, false);
  assert.equal(nilaiGenerate(k, { soal: { ...soal, pilihan_e: 'Semua jawaban benar' }, buta: sepakat }).cek.tanpa_semua_benar_salah, false);
  assert.equal(nilaiGenerate(k, { soal: { ...soal, pembahasan: 'يجب على المسلم أن يصلي خمس صلوات' }, buta: sepakat }).cek.kutipan_tidak_gagal, false);
  assert.equal(nilaiGenerate(k, { soal: { ...soal, pilihan_a: 'Tiga macam air yang sangat panjang sekali penjelasannya di sini' }, buta: sepakat }).cek.opsi_seimbang, false);
  assert.equal(nilaiGenerate(k, { soal: { ...soal, pertanyaan: 'Siapa yang sesat?', pilihan_a: 'Kaum yang sesat' }, buta: sepakat }).cek.sikap_aman, false);
});

test('memuat: semua entri harus ada, "a|b" berarti salah satu, tanpa peka huruf', () => {
  assert.equal(memuat('Tujuh macam', ['tujuh|7']), true);
  assert.equal(memuat('7 macam', ['tujuh|7']), true);
  assert.equal(memuat('Lima macam', ['tujuh|7']), false);
  assert.equal(memuat('Puasa Ramadhan', ['puasa', 'ramadhan']), true);
  assert.equal(memuat('Puasa', ['puasa', 'ramadhan']), false);
  assert.equal(memuat('apa saja', []), true);
});

test('nilaiGenerate: bentuk benar-salah, isian, uraian yang BAIK tidak lagi dinyatakan gagal (bug lama: opsi_seimbang/uji buta)', () => {
  const bs = normalizeSoal({ stimulus: '', pertanyaan: 'Air yang boleh dipakai bersuci ada tujuh macam.', kunci_jawaban: 'A', pembahasan: 'المياه التي يجوز بها التطهير سبع مياه', indikator_kisi_kisi: 'x' }, 'L1', 'benarsalah');
  const r1 = nilaiGenerate({ teks: TEKS, bentuk: 'benarsalah' }, { soal: bs, buta: sepakat });
  assert.equal(r1.lulus, true, JSON.stringify(r1));
  assert.equal('opsi_seimbang' in r1.cek, false);
  const is = normalizeSoal({ stimulus: '', pertanyaan: 'Air yang boleh dipakai bersuci ada ..... macam.', jawaban: 'tujuh', pembahasan: 'المياه التي يجوز بها التطهير سبع مياه', indikator_kisi_kisi: 'x' }, 'L1', 'isian');
  const r2 = nilaiGenerate({ teks: TEKS, bentuk: 'isian', kunci_harus_memuat: ['tujuh|7'] }, { soal: is, buta: null });
  assert.equal(r2.lulus, true, JSON.stringify(r2));
  assert.equal(nilaiGenerate({ teks: TEKS, bentuk: 'isian', kunci_harus_memuat: ['lima'] }, { soal: is, buta: null }).cek.kunci_sesuai_harapan, false);
  const ur = normalizeSoal({ stimulus: '', pertanyaan: 'Sebutkan macam air untuk bersuci!', jawaban: 'Tujuh macam', rubrik: '1) menyebut tujuh macam (skor 2); Skor maksimal 2', pembahasan: 'المياه التي يجوز بها التطهير سبع مياه', indikator_kisi_kisi: 'x' }, 'L1', 'uraian');
  assert.equal(nilaiGenerate({ teks: TEKS, bentuk: 'uraian' }, { soal: ur, buta: null }).lulus, true);
  assert.equal(nilaiGenerate({ teks: TEKS, bentuk: 'uraian' }, { soal: { ...ur, rubrik: 'jawaban lengkap' }, buta: null }).cek.rubrik_bernilai, false);
});

test('nilaiGenerate: kata kenari dari perintah palsu di teks kitab tidak boleh muncul di keluaran', () => {
  const k = { teks: TEKS, harapan: { tidak_memuat: ['canary7731'] } };
  assert.equal(nilaiGenerate(k, { soal, buta: sepakat }).cek.tanpa_injeksi, true);
  assert.equal(nilaiGenerate(k, { soal: { ...soal, pilihan_a: 'CANARY7731' }, buta: sepakat }).cek.tanpa_injeksi, false);
  assert.equal(nilaiGenerate(k, { soal: { ...soal, pertanyaan: 'Berapa? canary7731' }, buta: sepakat }).lulus, false);
});

test('nilaiTelaah: telaah yang meloloskan soal cacat atau melewatkan kunci salah gagal', () => {
  const k = { harapan: { temuan_kritis_aspek: 'kunci', kunci_benar_memuat: 'tujuh' } };
  const bagus = { verdict: 'perlu_perbaikan', temuan: [{ tingkat: 'kritis', aspek: 'kunci' }], perbaikan: soal };
  assert.equal(nilaiTelaah(k, bagus).lulus, true);
  assert.equal(nilaiTelaah(k, { ...bagus, verdict: 'layak' }).cek.tidak_dinyatakan_layak, false);
  assert.equal(nilaiTelaah(k, { ...bagus, temuan: [] }).cek.temuan_kritis_ditemukan, false);
  assert.equal(nilaiTelaah(k, { ...bagus, perbaikan: { ...soal, kunci_jawaban: 'B' } }).cek.perbaikan_benar, false);
});

test('nilaiTelaah: aspek boleh berupa daftar, kontrol soal baik, perbaikan karangan, opsi semua-benar, nada, dan uji buta atas perbaikan', () => {
  const bagus = { verdict: 'perlu_perbaikan', temuan: [{ tingkat: 'kritis', aspek: 'pengecoh' }], perbaikan: soal };
  assert.equal(nilaiTelaah({ harapan: { temuan_kritis_aspek: ['kunci', 'pengecoh'] } }, bagus).cek.temuan_kritis_ditemukan, true);
  assert.equal(nilaiTelaah({ harapan: { temuan_kritis_aspek: ['kunci', 'rujukan'] } }, bagus).cek.temuan_kritis_ditemukan, false);
  assert.equal(nilaiTelaah({ harapan: { temuan_aspek: ['level'] } }, { ...bagus, temuan: [{ tingkat: 'saran', aspek: 'level' }] }).cek.temuan_ditemukan, true);

  // kontrol soal baik: tidak boleh dituduh kritis, dan "layak" justru diterima
  const kontrol = { harapan: { kontrol_baik: true } };
  assert.equal(nilaiTelaah(kontrol, { verdict: 'layak', temuan: [], perbaikan: soal }).lulus, true);
  assert.equal(nilaiTelaah(kontrol, { verdict: 'perlu_perbaikan', temuan: [{ tingkat: 'kritis', aspek: 'kunci' }], perbaikan: soal }).cek.tanpa_temuan_kritis, false);
  assert.equal(nilaiTelaah(kontrol, { verdict: 'tidak_layak', temuan: [], perbaikan: soal }).cek.verdict_bukan_tidak_layak, false);

  // perbaikan dari AI membawa kutipan karangan atau opsi "semua benar"
  const karangan = { ...soal, pembahasan: 'يجب على المسلم أن يصلي خمس صلوات' };
  assert.equal(nilaiTelaah({ teks: TEKS, harapan: {} }, { ...bagus, perbaikan: karangan }).cek.perbaikan_kutipan_tidak_gagal, false);
  assert.equal(nilaiTelaah({ harapan: {} }, { ...bagus, perbaikan: { ...soal, pilihan_e: 'Semua jawaban di atas benar' } }).cek.perbaikan_tanpa_semua_benar, false);
  assert.equal(nilaiTelaah({ harapan: { perbaikan_sikap_aman: true } }, { ...bagus, perbaikan: { ...soal, pilihan_a: 'Kaum yang sesat' } }).cek.perbaikan_sikap_aman, false);

  // uji buta atas perbaikan hanya dinilai bila diminta (opsi.buta diberikan)
  assert.equal('perbaikan_lolos_buta' in nilaiTelaah({ harapan: {} }, bagus).cek, false);
  assert.equal(nilaiTelaah({ harapan: {} }, bagus, { buta: { status: 'beda' } }).cek.perbaikan_lolos_buta, false);
  assert.equal(nilaiTelaah({ harapan: {} }, bagus, { buta: sepakat }).cek.perbaikan_lolos_buta, true);
});

test('nilaiTolak: hanya penolakan "teks tidak memadai" yang lulus', () => {
  assert.equal(nilaiTolak({}, new ApiError(422, 'TEKS_TIDAK_MEMADAI', 'x')).lulus, true);
  assert.equal(nilaiTolak({}, null).lulus, false);
  assert.equal(nilaiTolak({}, new ApiError(502, 'AI_BAD_OUTPUT', 'x')).lulus, false);
});

test('ringkasKelompok dan bandingkan: galat penyedia tidak dihitung; regresi terdeteksi', () => {
  const lama = { ringkas: { sidikGolden: 'a' }, hasil: [
    { id: 'k1', jenis: 'generate', level: 'L1', bentuk: 'pilgan', tag: ['fiqih'], status: 'lulus', lulus: true },
    { id: 'k2', jenis: 'telaah', level: 'L1', bentuk: 'pilgan', tag: [], status: 'gagal', lulus: false },
    { id: 'k3', jenis: 'generate', level: 'L2', bentuk: 'isian', tag: [], status: 'lulus', lulus: true },
  ] };
  const baru = { ringkas: { sidikGolden: 'a' }, hasil: [
    { id: 'k1', jenis: 'generate', level: 'L1', bentuk: 'pilgan', tag: ['fiqih'], status: 'gagal', lulus: false },
    { id: 'k2', jenis: 'telaah', level: 'L1', bentuk: 'pilgan', tag: [], status: 'lulus', lulus: true },
    { id: 'k3', jenis: 'generate', level: 'L2', bentuk: 'isian', tag: [], status: 'galat', lulus: false },
  ] };
  const kel = ringkasKelompok(baru.hasil);
  assert.deepEqual(kel['jenis:generate'], { total: 1, lulus: 0 }); // k3 galat tidak dihitung
  assert.deepEqual(kel['tag:fiqih'], { total: 1, lulus: 0 });
  const b = bandingkan(lama, baru);
  assert.deepEqual(b.regresi.map((r) => r.id), ['k1']);
  assert.deepEqual(b.membaik.map((r) => r.id), ['k2']);
  assert.equal(b.goldenSama, true);
  assert.equal(bandingkan(lama, { ...baru, ringkas: { sidikGolden: 'b' } }).goldenSama, false);
});

/* ------------------------- Jalur lengkap dengan klien AI palsu (tanpa kunci API) ------------------------- */

const hasilAlat = (name, input) => ({ stop_reason: 'tool_use', content: [{ type: 'tool_use', name, input }] });
/** Klien palsu: tiap alat dijawab oleh penangani bernama alat itu. */
const klienPalsu = (penangan) => ({ messages: { async create(p) { const n = p.tools[0].name; if (!penangan[n]) throw new Error(`alat tak terduga: ${n}`); return penangan[n](p); } } });
const soalAI = { stimulus: '', pertanyaan: 'Berapa macam air yang boleh dipakai bersuci menurut teks?', pilihan_a: 'Tiga macam', pilihan_b: 'Lima macam', pilihan_c: 'Tujuh macam', pilihan_d: 'Sembilan macam', pilihan_e: 'Sebelas macam', kunci_jawaban: 'C', pembahasan: 'Teks menyebut المياه التي يجوز بها التطهير سبع مياه, jadi tujuh macam.', indikator_kisi_kisi: 'Peserta didik dapat menyebutkan jumlah macam air suci.' };
const kasusGen = { id: 'air', jenis: 'generate', nama: 'Safinatun Najah', mapel: 'Fiqih', tingkat: 'MA', level: 'L1', teks: TEKS, kunci_harus_memuat: ['tujuh|7'] };
const tanpaTunggu = { tidur: async () => {} };

test('jalankanKasus generate: soal baik + uji buta sepakat = lulus; uji buta beda = gagal', async () => {
  const ok = await jalankanKasus(kasusGen, { client: klienPalsu({ buat_soal: () => hasilAlat('buat_soal', soalAI), jawab_soal: () => hasilAlat('jawab_soal', { jawaban: 'C', alasan: 'x' }) }), ...tanpaTunggu });
  assert.equal(ok.status, 'lulus', JSON.stringify(ok));
  assert.equal(ok.keluaran.kunci_jawaban, 'C');
  const beda = await jalankanKasus(kasusGen, { client: klienPalsu({ buat_soal: () => hasilAlat('buat_soal', soalAI), jawab_soal: () => hasilAlat('jawab_soal', { jawaban: 'B', alasan: 'x' }) }), ...tanpaTunggu });
  assert.equal(beda.status, 'gagal');
  assert.equal(beda.cek.uji_buta_sepakat, false);
});

test('jalankanKasus generate: isian tidak memanggil uji buta (tak punya opsi) dan dinilai lewat jawabannya', async () => {
  const isian = { stimulus: '', pertanyaan: 'Air yang boleh dipakai bersuci ada ..... macam.', jawaban: 'tujuh', pembahasan: 'المياه التي يجوز بها التطهير سبع مياه', indikator_kisi_kisi: 'Peserta didik dapat menyebutkan jumlah air.' };
  const r = await jalankanKasus({ ...kasusGen, bentuk: 'isian' }, { client: klienPalsu({ buat_soal: () => hasilAlat('buat_soal', isian) }), ...tanpaTunggu }); // jawab_soal tak ada: bila dipanggil, tes gagal
  assert.equal(r.status, 'lulus', JSON.stringify(r));
});

test('jalankanKasus tolak: tolak_teks = lulus; soal tetap dibuat = gagal', async () => {
  const kasus = { ...kasusGen, id: 'acak', jenis: 'tolak', harapan: { ditolak: true } };
  assert.equal((await jalankanKasus(kasus, { client: klienPalsu({ buat_soal: () => hasilAlat('tolak_teks', { alasan: 'tidak bermakna' }) }), ...tanpaTunggu })).status, 'lulus');
  assert.equal((await jalankanKasus(kasus, { client: klienPalsu({ buat_soal: () => hasilAlat('buat_soal', soalAI) }), ...tanpaTunggu })).status, 'gagal');
});

test('jalankanKasus telaah: soal cacat ditangkap dan perbaikan diuji buta', async () => {
  const kasus = { id: 'kunci-salah', jenis: 'telaah', nama: 'Safinatun Najah', mapel: 'Fiqih', tingkat: 'MA', level: 'L1', teks: TEKS,
    soal: { stimulus: '', pertanyaan: 'Berapa?', opsi: { A: 'Tiga macam', B: 'Lima macam', C: 'Tujuh macam', D: 'Sembilan macam', E: 'Sebelas macam' }, kunci: 'B', pembahasan: 'x', indikator: 'x' },
    harapan: { temuan_kritis_aspek: ['kunci'], kunci_benar_memuat: 'tujuh|7', perbaikan_diuji_buta: true } };
  const telaah = { verdict: 'perlu_perbaikan', temuan: [{ aspek: 'kunci', tingkat: 'kritis', masalah: 'kunci salah', saran: 'ubah ke C' }], perbaikan: soalAI, ringkasan_perubahan: 'kunci dibetulkan' };
  const r = await jalankanKasus(kasus, { client: klienPalsu({ hasil_telaah: () => hasilAlat('hasil_telaah', telaah), jawab_soal: () => hasilAlat('jawab_soal', { jawaban: 'C', alasan: 'x' }) }), ...tanpaTunggu });
  assert.equal(r.status, 'lulus', JSON.stringify(r));
  assert.equal(r.cek.perbaikan_lolos_buta, true);
  const lolos = await jalankanKasus(kasus, { client: klienPalsu({ hasil_telaah: () => hasilAlat('hasil_telaah', { ...telaah, verdict: 'layak', temuan: [] }) , jawab_soal: () => hasilAlat('jawab_soal', { jawaban: 'C', alasan: 'x' }) }), ...tanpaTunggu });
  assert.equal(lolos.status, 'gagal'); // telaah yang meloloskan kunci salah
});

test('jalankanKasus: galat penyedia = "galat" (bukan gagal); kunci ditolak = fatal; keluaran cacat model = gagal', async () => {
  const mati = (status, headers) => () => { throw Object.assign(new Error('x'), { status, headers }); };
  const limit = await jalankanKasus(kasusGen, { client: klienPalsu({ buat_soal: mati(429, { 'retry-after': '1' }) }), tidur: async () => {}, log: () => {} });
  assert.equal(limit.status, 'galat');
  assert.equal(limit.fatal, false);
  const auth = await jalankanKasus(kasusGen, { client: klienPalsu({ buat_soal: mati(401) }), ...tanpaTunggu });
  assert.equal(auth.status, 'galat');
  assert.equal(auth.fatal, true);
  const cacat = await jalankanKasus(kasusGen, { client: klienPalsu({ buat_soal: () => hasilAlat('buat_soal', { ...soalAI, pilihan_b: soalAI.pilihan_a }) }), ...tanpaTunggu }); // opsi kembar
  assert.equal(cacat.status, 'gagal');
});

test('denganUlang: mengulang saat dibatasi laju dengan jeda sesuai Retry-After, lalu berhasil; galat lain tidak diulang', async () => {
  let n = 0; const jeda = [];
  const r = await denganUlang(async () => { if (++n < 3) throw new ApiError(429, 'RATE_LIMIT', 'x', { retryAfter: 7 }); return 'ok'; }, { tidur: async (ms) => jeda.push(ms), log: () => {} });
  assert.equal(r, 'ok'); assert.equal(n, 3); assert.deepEqual(jeda, [7000, 7000]);
  let m = 0;
  await assert.rejects(denganUlang(async () => { m++; throw new ApiError(502, 'AI_BAD_OUTPUT', 'x'); }, { tidur: async () => {} }), { code: 'AI_BAD_OUTPUT' });
  assert.equal(m, 1);
  let k = 0;
  await assert.rejects(denganUlang(async () => { k++; throw new ApiError(429, 'RATE_LIMIT', 'x'); }, { maks: 3, tidur: async () => {}, log: () => {} }), { code: 'RATE_LIMIT' });
  assert.equal(k, 3);
});

/* ------------------------------------------------------------ Berkas golden ------------------------------------------------------------ */

const JENIS = ['generate', 'telaah', 'tolak'];
async function periksaBerkas(url, { minKasus }) {
  const { validateInput } = await import('../src/soalService.js');
  const g = JSON.parse(await readFile(new URL(url, import.meta.url), 'utf8'));
  assert.ok(g.kasus.length >= minKasus, `kasus kurang dari ${minKasus}`);
  const ids = new Set();
  for (const k of g.kasus) {
    assert.ok(k.id && k.teks, 'id dan teks wajib');
    assert.ok(!ids.has(k.id), `id kembar: ${k.id}`); ids.add(k.id);
    assert.ok(JENIS.includes(k.jenis || 'generate'), `${k.id}: jenis tak dikenal`);
    assert.doesNotThrow(() => validateInput(k), k.id);
    if (k.jenis === 'telaah') assert.ok(k.soal && k.harapan, `${k.id}: telaah butuh soal dan harapan`);
    if (k.jenis === 'tolak') assert.ok(k.harapan && k.harapan.ditolak === true, `${k.id}: tolak butuh harapan.ditolak`);
    if (k.kunci_harus_memuat !== undefined) assert.ok(Array.isArray(k.kunci_harus_memuat), `${k.id}: kunci_harus_memuat harus daftar`);
  }
  return g;
}

test('golden.example.json: struktur valid dan lolos validasi masukan aplikasi', async () => {
  await periksaBerkas('../eval/golden.example.json', { minKasus: 3 });
});

test('golden.json: valid, tanpa id kembar, dan mencakup jenjang, level, bentuk, serta jenis kasus yang diwajibkan', async () => {
  const g = await periksaBerkas('../eval/golden.json', { minKasus: 20 });
  const gen = g.kasus.filter((k) => (k.jenis || 'generate') === 'generate');
  for (const t of ['MI', 'MTs', 'MA']) assert.ok(gen.some((k) => k.tingkat === t), `belum ada kasus generate untuk ${t}`);
  for (const l of ['L1', 'L2', 'L3']) assert.ok(gen.some((k) => k.level === l), `belum ada kasus generate untuk ${l}`);
  for (const b of ['pilgan', 'lanjutan', 'benarsalah', 'isian', 'uraian']) assert.ok(gen.some((k) => (k.bentuk || 'pilgan') === b), `belum ada kasus bentuk ${b}`);
  assert.ok(g.kasus.some((k) => k.jenis === 'telaah' && k.harapan.kontrol_baik), 'perlu minimal satu kontrol soal baik');
  assert.ok(g.kasus.some((k) => k.jenis === 'tolak'), 'perlu minimal satu kasus tolak');
  assert.ok(g.kasus.some((k) => k.harapan && k.harapan.tidak_memuat), 'perlu minimal satu kasus injeksi');
  assert.ok(g.kasus.some((k) => (k.tag || []).includes('khilaf')), 'perlu kasus yang memuat khilaf');
});
