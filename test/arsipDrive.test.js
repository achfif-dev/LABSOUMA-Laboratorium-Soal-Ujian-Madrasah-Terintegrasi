import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buatBackup, periksaBackup, kandidatArsip, denganArsip, gabungInkremental, gabungInkrementalArsip, bawaArsip, batasUbah,
} from '../web/lib/drive.js';

const LAMA = '2026-06-01T00:00:00.000Z'; const BARU = '2026-11-08T00:00:00.000Z';
const mk = (i, upd) => ({ id: 'q' + String(i).padStart(2, '0'), status: 'approved', updatedAt: upd });
const NOW = Date.parse('2026-11-09T00:00:00Z');
const awal = () => Array.from({ length: 10 }, (_, i) => mk(i, i < 4 ? LAMA : BARU)); // q00-q03 lama, q04-q09 baru
const id = (q) => q.id;

// Meniru langkah admin: cadangan 1 -> Arsipkan (catat di berkas, hapus di Firestore) -> cadangan berikutnya.
function cadanganLalu() {
  let server = awal();
  const cad1 = buatBackup({ soal: server, config: null, oleh: 'a', now: new Date('2026-11-08T10:00:00Z') });
  const arsip = kandidatArsip(cad1.soal, { hari: 90, now: NOW });
  const berkas1 = denganArsip(cad1, arsip.map(id));        // yang ditulis tulisArsip() ke Drive
  server = server.filter((q) => !arsip.some((a) => a.id === q.id)); // yang dilakukan transaksi hapus
  return { server, arsip, berkas1 };
}

test('kandidatArsip melewati soal yang sudah diarsipkan (isinya masih di berkas, tidak di Firestore)', () => {
  const s = awal();
  assert.equal(kandidatArsip(s, { hari: 90, now: NOW }).length, 4);
  assert.equal(kandidatArsip(s, { hari: 90, now: NOW, kecuali: ['q00', 'q01'] }).length, 2);
});

test('cadangan inkremental setelah arsip: jumlah cocok, tidak lagi dipaksa penuh, soal terarsip ikut', () => {
  const { server, arsip, berkas1 } = cadanganLalu();
  const dasar = periksaBackup(JSON.parse(JSON.stringify(berkas1)));
  assert.deepEqual(dasar.diarsipkan, arsip.map(id).sort());
  const ubah = server.filter((q) => Date.parse(q.updatedAt) >= Date.parse(batasUbah(dasar)));
  const g = gabungInkrementalArsip(dasar, ubah);
  assert.equal(g.soal.length - g.diarsipkan.length, server.length, 'jumlah yang diharapkan = jumlah server');
  assert.equal(g.soal.length, 10);
  assert.deepEqual(g.diarsipkan, ['q00', 'q01', 'q02', 'q03']);
});

test('cadangan penuh setelah arsip: berkas terbaru tetap memuat soal terarsip (sebelumnya hilang)', () => {
  const { server, arsip, berkas1 } = cadanganLalu();
  const dasar = periksaBackup(JSON.parse(JSON.stringify(berkas1)));
  const b = bawaArsip(server, dasar);
  assert.equal(b.soal.length, 10);
  assert.deepEqual(b.soal.map(id), awal().map(id).sort());
  const cad2 = buatBackup({ soal: b.soal, config: null, oleh: 'a', diarsipkan: b.diarsipkan });
  assert.equal(arsip.filter((a) => cad2.soal.some((q) => q.id === a.id)).length, 4);
  // dan tetap lestari lewat cadangan ke-3, ke-4, ...
  const lagi = bawaArsip(server, periksaBackup(JSON.parse(JSON.stringify(cad2))));
  assert.equal(lagi.soal.length, 10);
  assert.deepEqual(lagi.diarsipkan, ['q00', 'q01', 'q02', 'q03']);
});

test('soal terarsip yang dipulihkan ke Firestore dilepas dari daftar arsip (tanpa duplikat)', () => {
  const { server, berkas1 } = cadanganLalu();
  const dipulihkan = { ...mk(0, LAMA) };                      // dipulihkan dengan updatedAt lama: tidak masuk jendela "berubah"
  const serverBaru = [...server, dipulihkan];
  const dasar = periksaBackup(JSON.parse(JSON.stringify(berkas1)));
  // inkremental: jumlah tidak cocok -> klien jatuh ke penuh (aman)
  const g = gabungInkrementalArsip(dasar, []);
  assert.notEqual(g.soal.length - g.diarsipkan.length, serverBaru.length);
  // penuh: q00 dari server, bukan salinan arsip; sisanya tetap terarsip
  const b = bawaArsip(serverBaru, dasar);
  assert.equal(b.soal.length, 10);
  assert.equal(b.soal.filter((q) => q.id === 'q00').length, 1);
  assert.deepEqual(b.diarsipkan, ['q01', 'q02', 'q03']);
});

test('soal terarsip yang berubah lagi (muncul di soalUbah) tidak dihitung arsip', () => {
  const { berkas1 } = cadanganLalu();
  const dasar = periksaBackup(JSON.parse(JSON.stringify(berkas1)));
  const g = gabungInkrementalArsip(dasar, [{ ...mk(1, BARU), status: 'revision' }]);
  assert.deepEqual(g.diarsipkan, ['q00', 'q02', 'q03']);
});

test('denganArsip: abaikan id yang tidak ada di berkas, hapus kunci bila kosong, tidak mengubah berkas asal', () => {
  const cad = buatBackup({ soal: awal(), config: null, oleh: 'a' });
  const a = denganArsip(cad, ['q00', 'tidak-ada', 'q00']);
  assert.deepEqual(a.diarsipkan, ['q00']);
  assert.ok(!('diarsipkan' in cad));
  assert.ok(!('diarsipkan' in denganArsip(a, [])));
  assert.equal(denganArsip(a, ['q01']).soal.length, 10);
});

test('berkas tanpa arsip bentuknya sama persis seperti sebelumnya; cadangan lama dibaca sebagai tanpa arsip', () => {
  const cad = buatBackup({ soal: awal(), config: null, oleh: 'a' });
  assert.ok(!('diarsipkan' in cad));
  const lama = { ...cad }; delete lama.diarsipkan;
  assert.deepEqual(periksaBackup(lama).diarsipkan, []);
  assert.deepEqual(bawaArsip(awal(), periksaBackup(lama)).soal.map(id), awal().map(id));
  assert.equal(bawaArsip(awal(), undefined).soal.length, 10);
});

test('urutan di UI: daftar arsip dicatat dan diverifikasi di Drive SEBELUM transaksi hapus Firestore', () => {
  const app = readFileSync(new URL('../web/App.jsx', import.meta.url), 'utf8');
  const catat = app.indexOf('const awal = await tulisArsip(calon)');
  const hapus = app.indexOf("db.runTransaction(async (tx) => {\n        const snaps = await Promise.all(bagian.map");
  assert.ok(catat > 0 && hapus > 0, 'kedua langkah harus ada');
  assert.ok(catat < hapus, 'pencatatan harus lebih dulu daripada penghapusan');
  assert.ok(app.includes("Drv.kandidatArsip(hasil.soal, { hari: Number(hari), kecuali: arsipSudah })"));
  assert.ok(app.includes('Drv.bawaArsip(await bacaSemuaSoal(), dsr.dasar)'));
});
