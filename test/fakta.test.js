import test from 'node:test';
import assert from 'node:assert/strict';
import { faktaTerikatDari, peringatanLevel, pilihFaktaBerikut, faktaBasi } from '../web/lib/fakta.js';

const F = (id, jenis, tingkat_cocok) => ({ id, fakta: `fakta ${id}`, kutipan: 'واجبة على كل مسلم', jenis, tingkat_cocok, pengecoh: ['x'], kutipanStatus: 'lolos' });
const DAFTAR = [F('f1', 'definisi', 'L1'), F('f2', 'syarat', 'L3'), F('f3', 'hukum', 'L2')];

test('faktaTerikatDari: hanya fakta, kutipan, pengecoh yang dikirim ke server', () => {
  assert.deepEqual(faktaTerikatDari(DAFTAR[0]), { fakta: 'fakta f1', kutipan: 'واجبة على كل مسلم', pengecoh: ['x'] });
  assert.equal(faktaTerikatDari(null), null);
  assert.deepEqual(faktaTerikatDari({ fakta: 'a', kutipan: 'b' }).pengecoh, []);
});

test('peringatanLevel: kosong bila level sama; ada bila level berbeda dari yang paling cocok (tidak mengubah level)', () => {
  assert.equal(peringatanLevel(DAFTAR[0], 'L1'), '');
  assert.match(peringatanLevel(DAFTAR[0], 'L3'), /lebih cocok untuk L1/);
  assert.match(peringatanLevel(DAFTAR[2], 'L1'), /lebih cocok untuk L2/);
  assert.equal(peringatanLevel(null, 'L1'), '');
  assert.equal(peringatanLevel(DAFTAR[0], ''), '');
});

test('pilihFaktaBerikut: tidak mengulang fakta yang sudah dipakai, dan memilih yang paling cocok dengan level', () => {
  const a = pilihFaktaBerikut(DAFTAR, [], { bentuk: 'pilgan', level: 'L3' }, () => 0.5);
  assert.equal(a.fakta.id, 'f2'); assert.equal(a.habis, false);
  const b = pilihFaktaBerikut(DAFTAR, ['f2'], { bentuk: 'pilgan', level: 'L3' }, () => 0.5);
  assert.notEqual(b.fakta.id, 'f2'); assert.equal(b.habis, false);
});

test('pilihFaktaBerikut: semua terpakai -> tetap memilih satu dan menandai habis', () => {
  const r = pilihFaktaBerikut(DAFTAR, ['f1', 'f2', 'f3'], { bentuk: 'pilgan', level: 'L1' }, () => 0.5);
  assert.equal(r.habis, true); assert.ok(r.fakta);
  assert.deepEqual(pilihFaktaBerikut([], [], { bentuk: 'pilgan', level: 'L1' }), { fakta: null, habis: false });
});

test('faktaBasi: true hanya bila teks sekarang berbeda dari teks saat ekstrak', () => {
  const st = { data: { fakta: DAFTAR }, teks: 'abc' };
  assert.equal(faktaBasi(st, 'abc'), false);
  assert.equal(faktaBasi(st, 'abcd'), true);
  assert.equal(faktaBasi({ loading: true }, 'abc'), false);
  assert.equal(faktaBasi(null, 'abc'), false);
});

import { faktaSahDi, susunSpekFakta } from '../web/lib/fakta.js';

test('faktaSahDi: sah bila kutipan persis; tidak sah bila hilang/mirip/pendek; tanpa pemeriksa dianggap sah (server memeriksa ulang)', () => {
  const periksa = (_b, teks) => ({ ringkas: teks === 'ok' ? { total: 1, cocok: 1, mirip: 0, tidak_ditemukan: 0 } : teks === 'mirip' ? { total: 1, cocok: 0, mirip: 1, tidak_ditemukan: 0 } : teks === 'hilang' ? { total: 1, cocok: 0, mirip: 0, tidak_ditemukan: 1 } : { total: 0, cocok: 0, mirip: 0, tidak_ditemukan: 0 } });
  assert.equal(faktaSahDi(DAFTAR[0], 'ok', periksa), true);
  assert.equal(faktaSahDi(DAFTAR[0], 'mirip', periksa), false);
  assert.equal(faktaSahDi(DAFTAR[0], 'hilang', periksa), false);
  assert.equal(faktaSahDi(DAFTAR[0], 'pendek', periksa), false);
  assert.equal(faktaSahDi(DAFTAR[0], 'apa saja', undefined), true);
  assert.equal(faktaSahDi({ id: 'x', kutipan: '' }, 'ok', periksa), false);
});

test('susunSpekFakta: tiap fakta dipakai sekali; butir yang tidak kebagian dibuat tanpa fakta (bukan fakta kembar)', () => {
  const spek = [{ bentuk: 'pilgan', level: 'L1' }, { bentuk: 'pilgan', level: 'L3' }, { bentuk: 'isian', level: 'L2' }, { bentuk: 'uraian', level: 'L1' }];
  const r = susunSpekFakta(spek, DAFTAR, [], () => 0.5);
  const ids = r.pilihan.filter(Boolean).map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);          // tidak ada fakta kembar
  assert.equal(ids.length, 3); assert.equal(r.tanpaFakta, 1);
  assert.equal(r.pilihan[1].id, 'f2');                  // L3 mendapat fakta syarat yang cocok untuk L3
  assert.equal(r.pilihan.length, spek.length);
});

test('susunSpekFakta: fakta yang sudah terpakai di butir lain tidak dibagikan lagi; semua terpakai -> semua tanpa fakta', () => {
  const spek = [{ bentuk: 'pilgan', level: 'L1' }, { bentuk: 'pilgan', level: 'L2' }];
  const a = susunSpekFakta(spek, DAFTAR, ['f1', 'f3'], () => 0.5);
  assert.equal(a.pilihan.filter(Boolean).length, 1); assert.equal(a.pilihan.find(Boolean).id, 'f2'); assert.equal(a.tanpaFakta, 1);
  const b = susunSpekFakta(spek, DAFTAR, ['f1', 'f2', 'f3'], () => 0.5);
  assert.equal(b.tanpaFakta, 2); assert.deepEqual(b.pilihan, [null, null]);
  assert.deepEqual(susunSpekFakta(spek, [], [], () => 0.5).pilihan, [null, null]);
});

/* ---- Paket Dauri: kontrak klien -> server ---- */
import { spekDenganFakta, jejakFaktaButir } from '../web/lib/fakta.js';
import { validatePaket, normalisasiButir } from '../src/paketService.js';

const TEKS_P = 'قال المصنف: الصلاة واجبة على كل مسلم بالغ عاقل. ثم قال: الوضوء شرط لصحة الصلاة عند الجمهور. وقال أيضا: الزكاة فرض على من ملك نصابا وحال عليه الحول.';
const FP = (id, kutipan, jenis, tingkat_cocok) => ({ id, fakta: `fakta ${id}`, kutipan, jenis, tingkat_cocok, pengecoh: ['p1', 'p2'] });
const FAKTA_P = [FP('a1', 'الصلاة واجبة على كل مسلم بالغ عاقل', 'hukum', 'L1'), FP('a2', 'الوضوء شرط لصحة الصلاة عند الجمهور', 'syarat', 'L3'), FP('a3', 'الزكاة فرض على من ملك نصابا', 'hukum', 'L2')];
const SPEK_P = [{ bentuk: 'pilgan', level: 'L1', bagian: 'A' }, { bentuk: 'pilgan', level: 'L3', bagian: 'A' }, { bentuk: 'isian', level: 'L2', bagian: 'B' }];
const BODY = (spek) => ({ teks: TEKS_P, bahasa: 'ar', tingkat: 'Aliyah', spek });

test('spekDenganFakta: muatan klien DITERIMA validatePaket di server, fakta terikat tiap butir berbeda dan kutipannya lolos periksa ulang', () => {
  const { spekKirim, pilihan, tanpaFakta } = spekDenganFakta(SPEK_P, FAKTA_P, [], () => 0.5);
  assert.equal(tanpaFakta, 0); assert.equal(new Set(pilihan.map((f) => f.id)).size, 3);
  assert.ok(spekKirim.every((s) => s.faktaTerikat && s.faktaTerikat.kutipan));
  assert.ok(spekKirim.every((s) => !('bagian' in s)));           // hanya bentuk, level, faktaTerikat
  const v = validatePaket(BODY(spekKirim));                       // tidak melempar = kontrak cocok
  assert.equal(v.spek.length, 3); assert.ok(v.spek.every((s) => s.fakta && s.fakta.kutipan));
});

test('spekDenganFakta: butir yang sudah jadi di segmen (dikenali dari kutipan) tidak dibagikan lagi; sisanya dibuat tanpa fakta dan diterima server', () => {
  const sudah = [{ faktaKutipan: FAKTA_P[0].kutipan }, { faktaKutipan: FAKTA_P[1].kutipan }];
  const { spekKirim, tanpaFakta } = spekDenganFakta(SPEK_P, FAKTA_P, sudah, () => 0.5);
  assert.equal(spekKirim.filter((s) => s.faktaTerikat).length, 1); assert.equal(tanpaFakta, 2);
  assert.equal(spekKirim.find((s) => s.faktaTerikat).faktaTerikat.kutipan, FAKTA_P[2].kutipan);
  const v = validatePaket(BODY(spekKirim)); assert.equal(v.spek.filter((s) => s.fakta).length, 1);
  const kosong = spekDenganFakta(SPEK_P, [], [], () => 0.5);       // ekstrak gagal/tidak ada fakta: alur lama, tetap valid
  assert.equal(kosong.tanpaFakta, 3); assert.ok(kosong.spekKirim.every((s) => !s.faktaTerikat));
  assert.equal(validatePaket(BODY(kosong.spekKirim)).spek.length, 3);
});

test('spekDenganFakta: fakta dengan kutipan yang TIDAK ada di teks ditolak server (jaring pengaman kedua)', () => {
  const rusak = [{ ...FAKTA_P[0], kutipan: 'هذا كلام لا يوجد في النص أبدا' }];
  const { spekKirim } = spekDenganFakta([SPEK_P[0]], rusak, [], () => 0.5);
  assert.throws(() => validatePaket(BODY(spekKirim)), (e) => e.code === 'FAKTA_TIDAK_VALID');
});

test('jejakFaktaButir + normalisasiButir: butir terikat membawa fakta, kutipan, dan alasan pengecoh; butir biasa tidak', () => {
  const { pilihan, spekKirim } = spekDenganFakta([SPEK_P[0]], FAKTA_P, [], () => 0.5);
  const v = validatePaket(BODY(spekKirim));
  const raw = { pertanyaan: 'Siapakah yang wajib shalat?', pembahasan: 'Sesuai teks.', pilihan_a: 'Muslim baligh berakal', pilihan_b: 'Anak kecil', pilihan_c: 'Orang gila', kunci_jawaban: 'A', alasan_pengecoh: 'B: belum baligh; C: tidak berakal.', indikator_kisi_kisi: 'x' };
  const r = { indeks: 0, ...normalisasiButir(raw, v.spek[0], TEKS_P) };
  const j = jejakFaktaButir(r, pilihan);
  assert.equal(j.faktaDasar, r.faktaDasar); assert.equal(j.faktaKutipan, pilihan[0].kutipan); assert.match(j.alasanPengecoh, /belum baligh/);
  assert.deepEqual(jejakFaktaButir({ indeks: 0 }, pilihan), {});     // butir tanpa fakta
  assert.deepEqual(jejakFaktaButir(r, null), {});
});
