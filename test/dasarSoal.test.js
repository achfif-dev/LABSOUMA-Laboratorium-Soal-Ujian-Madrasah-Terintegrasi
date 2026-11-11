import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { susunDasar, MAKS_DASAR } from '../web/lib/fakta.js';
import { BIDANG_RIWAYAT, LABEL_BIDANG } from '../web/lib/riwayat.js';
import { bersihkanSoal } from '../src/backup.js';

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const blokSoal = rules.slice(rules.indexOf('match /soal/{id}'), rules.indexOf('match /kamusPegon/{id}'));
const daftar = (teks) => new Set([...teks.matchAll(/'([A-Za-z]+)'/g)].map((m) => m[1]));

test('susunDasar: fakta + alasan; tanpa fakta = kosong; spasi dirapikan', () => {
  assert.equal(susunDasar({ fakta: '  Shalat   wajib\nbagi muslim ', alasan: 'B: belum baligh.' }), 'Fakta yang diuji: Shalat wajib bagi muslim\nMengapa pengecoh salah: B: belum baligh.');
  assert.equal(susunDasar({ fakta: 'Shalat wajib' }), 'Fakta yang diuji: Shalat wajib');
  assert.equal(susunDasar({ alasan: 'x' }), ''); assert.equal(susunDasar({}), ''); assert.equal(susunDasar(), '');
});

test('susunDasar: tidak pernah melebihi batas kolom di aturan Firestore (2000), dipotong dengan tanda …', () => {
  const r = susunDasar({ fakta: 'f', alasan: 'a'.repeat(5000) });
  assert.equal(r.length, MAKS_DASAR); assert.ok(r.endsWith('…'));
  assert.ok(susunDasar({ fakta: 'f'.repeat(3000) }).length <= MAKS_DASAR);
  assert.match(blokSoal, new RegExp(`x\\.dasar\\.size\\(\\) <= ${MAKS_DASAR}`)); // klien dan aturan memakai batas yang sama
});

test('firestore.rules: dasar opsional dan dibatasi pada validasi, snapshot riwayat, kunci penyusun, dan daftar admin', () => {
  assert.match(blokSoal, /\(!\('dasar' in x\) \|\| \(x\.dasar is string && x\.dasar\.size\(\) <= 2000\)\)/);
  assert.match(blokSoal, /teksMax\(s, 'dasar', 2000\)/);
  assert.match(blokSoal, /function opsiKeys\(\) \{ return \[[^\]]*'dasar'\]/);
  const admin = /isAdmin\(\)\s*&& d\(\)\.keys\(\)\.hasOnly\(\[([^\]]+)\]/.exec(blokSoal);
  assert.ok(admin && daftar(admin[1]).has('dasar'), 'daftar kunci admin harus memuat dasar');
});

test('penjaga drift: setiap bidang riwayat versi diizinkan snapshotOk di aturan, dan sebaliknya', () => {
  const snap = /function snapshotOk\(s\) \{[\s\S]*?hasOnly\(\[([^\]]+)\]/.exec(blokSoal);
  assert.ok(snap, 'snapshotOk tidak ditemukan');
  const diAturan = daftar(snap[1]); const diKlien = new Set(BIDANG_RIWAYAT);
  for (const k of diKlien) assert.ok(diAturan.has(k), `bidang riwayat ${k} tidak diizinkan snapshotOk`);
  for (const k of diAturan) assert.ok(diKlien.has(k), `snapshotOk mengizinkan ${k} yang tidak dicatat klien`);
  assert.ok(diKlien.has('dasar') && LABEL_BIDANG.dasar === 'Dasar soal');
  for (const k of BIDANG_RIWAYAT) assert.ok(LABEL_BIDANG[k], `label untuk ${k} belum ada`);
});

const SOAL = () => ({
  id: 'abc', tingkat: 'Aliyah', mapel: 'Fiqih', level: 'L2', nama: 'Fathul Qarib', juz: '1', hal: '12', teks: 'نص', stimulus: '', pertanyaan: 'Apa?', indikator: '', sumberUrl: '',
  opsi: { A: 'a', B: 'b', C: 'c', D: '', E: '' }, kunci: 'B', pembahasan: 'karena', ai: { dibuat: true, model: 'm', verifikasi: 'lolos', buta: 'sepakat' }, status: 'draft', catatan: '',
  authorUid: 'u', authorName: 'A', createdAt: '2026-01-02T03:04:05.000Z', updatedAt: '2026-02-03T04:05:06.000Z',
});

test('backup: dasar ikut dipulihkan bila ada, tidak ditulis bila kosong, dan hasilnya tetap hanya kunci yang diizinkan aturan', () => {
  const ada = bersihkanSoal({ ...SOAL(), dasar: 'Fakta yang diuji: x' }).data;
  assert.equal(ada.dasar, 'Fakta yang diuji: x');
  assert.ok(!('dasar' in bersihkanSoal(SOAL()).data));
  assert.ok(!('dasar' in bersihkanSoal({ ...SOAL(), dasar: '' }).data));
  assert.throws(() => bersihkanSoal({ ...SOAL(), dasar: 'x'.repeat(2001) }), /Dasar soal/);
});
