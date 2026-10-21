import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { nilaiGenerate, nilaiTelaah } from '../eval/lib.mjs';

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

test('nilaiTelaah: telaah yang meloloskan soal cacat atau melewatkan kunci salah gagal', () => {
  const k = { harapan: { temuan_kritis_aspek: 'kunci', kunci_benar_memuat: 'tujuh' } };
  const bagus = { verdict: 'perlu_perbaikan', temuan: [{ tingkat: 'kritis', aspek: 'kunci' }], perbaikan: soal };
  assert.equal(nilaiTelaah(k, bagus).lulus, true);
  assert.equal(nilaiTelaah(k, { ...bagus, verdict: 'layak' }).cek.tidak_dinyatakan_layak, false);
  assert.equal(nilaiTelaah(k, { ...bagus, temuan: [] }).cek.temuan_kritis_ditemukan, false);
  assert.equal(nilaiTelaah(k, { ...bagus, perbaikan: { ...soal, kunci_jawaban: 'B' } }).cek.perbaikan_benar, false);
});

test('golden.example.json: struktur valid dan lolos validasi masukan aplikasi', async () => {
  const { validateInput } = await import('../src/soalService.js');
  const g = JSON.parse(await readFile(new URL('../eval/golden.example.json', import.meta.url), 'utf8'));
  assert.ok(g.kasus.length >= 3);
  for (const k of g.kasus) {
    assert.ok(k.id && k.teks);
    assert.doesNotThrow(() => validateInput(k), k.id);
    if (k.jenis === 'telaah') assert.ok(k.soal && k.harapan);
  }
});
