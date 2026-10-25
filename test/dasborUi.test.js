// Render sungguhan (SSR dengan React 18) untuk Dasbor admin dan panel cadangan Drive Ustadz: memastikan tampilan tidak gagal pada data nyata,
// teks penting muncul, dan isi dari luar (nama pengguna) tidak lolos sebagai HTML. Tidak menguji interaksi di browser.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

let vite; let App;
before(async () => {
  globalThis.window ??= globalThis; globalThis.document ??= { visibilityState: 'visible' };
  vite = await createServer({ root: process.cwd(), server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
  App = await vite.ssrLoadModule('/web/App.jsx');
});
after(async () => { if (vite) await vite.close(); });

// React SSR menyisipkan <!-- --> di antara potongan teks; dibuang agar pola teks mudah dicocokkan.
const h = (C, props) => renderToString(React.createElement(C, props)).replace(/<!-- -->/g, '');
const antreanKosong = { total: 0, tertuaHari: 0, waspada: 0, lewat: 0, perluAlasan: 0, perPenyusun: [], tertua: [] };
const kolam = (a, b) => [
  { id: 'global_ai', label: 'Tim (penyusun, editor, admin)', env: 'LIMIT_GLOBAL_PER_DAY', dipakai: a, batas: 1000, sisa: 1000 - a, persen: Math.round(a / 10), status: a >= 1000 ? 'habis' : a >= 800 ? 'hampir' : 'aman' },
  { id: 'global_ai_ustadz', label: 'Ustadz', env: 'LIMIT_USTADZ_GLOBAL_PER_DAY', dipakai: b, batas: 300, sisa: 300 - b, persen: Math.round(b / 3), status: b >= 300 ? 'habis' : b >= 240 ? 'hampir' : 'aman' },
];
const dasar = (o = {}) => ({ d: null, err: null, busy: false, semua: false, setSemua() {}, waktu: 0, onMuat() {}, antrean: antreanKosong, onBukaReview() {}, ...o });

test('Dasbor: memuat (d kosong) dan galat tidak gagal dirender', () => {
  const a = h(App.DasborView, dasar());
  assert.match(a, /Memuat/); assert.match(a, /Antrean review/); assert.match(a, /Tidak ada soal yang menunggu review/);
  const b = h(App.DasborView, dasar({ err: { code: 'FORBIDDEN_ROLE', message: 'Fitur ini hanya untuk admin.' } }));
  assert.match(b, /Fitur ini hanya untuk admin/);
});

test('Dasbor: kuota hampir/habis memunculkan peringatan dengan nama variabel yang harus dinaikkan; pengguna dan sisa tampil', () => {
  const d = { hari: '2026-10-25', resetDalamDetik: 12 * 3600, kolam: kolam(850, 300), peringatan: 3, totalHariIni: 65, penggunaHabis: 1, terpotong: false,
    pengguna: [
      { uid: 'u2', nama: 'Ust. Budi', email: 'b@x.id', role: 'ustadz', dipakai: 15, batas: 15, sisa: 0, persen: 100, status: 'habis' },
      { uid: 'u1', nama: 'Ust. Ahmad', email: 'a@x.id', role: 'penyusun', dipakai: 50, batas: 60, sisa: 10, persen: 83, status: 'hampir' },
    ] };
  const t = h(App.DasborView, dasar({ d, waktu: Date.now() }));
  assert.match(t, /Kuota AI hampir habis: Tim/); assert.match(t, /LIMIT_GLOBAL_PER_DAY/);
  assert.match(t, /Kuota AI Ustadz sudah habis/); assert.match(t, /LIMIT_USTADZ_GLOBAL_PER_DAY/);
  assert.match(t, /850/); assert.match(t, /Ust\. Budi/); assert.match(t, /Ust\. Ahmad/);
  assert.match(t, /Habis/); assert.match(t, /Hampir habis/);
  assert.match(t, /12 jam 0 menit/); assert.match(t, /1 pengguna sudah kena batas hariannya/);
  assert.match(t, /role="progressbar"[^>]*aria-valuenow="83"/);
});

test('Dasbor: kuota aman tanpa peringatan; daftar kosong diberi keterangan', () => {
  const d = { hari: '2026-10-25', resetDalamDetik: 600, kolam: kolam(10, 5), peringatan: 0, totalHariIni: 0, penggunaHabis: 0, terpotong: false, pengguna: [] };
  const t = h(App.DasborView, dasar({ d }));
  assert.doesNotMatch(t, /role="alert"/); assert.match(t, /Belum ada yang memakai AI hari ini/);
});

test('Dasbor: nama pengguna berisi HTML dirender sebagai teks (tidak menjadi elemen)', () => {
  const d = { hari: 'x', resetDalamDetik: 60, kolam: kolam(0, 0), peringatan: 0, totalHariIni: 1, penggunaHabis: 0, terpotong: false,
    pengguna: [{ uid: 'z', nama: '<img src=x onerror=alert(1)>', email: '', role: 'penyusun', dipakai: 1, batas: 60, sisa: 59, persen: 2, status: 'aman' }] };
  const t = h(App.DasborView, dasar({ d }));
  assert.ok(!t.includes('<img src=x'));
  assert.ok(t.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

test('Dasbor: antrean review menampilkan jumlah, umur, perlu alasan, dan per penyusun', () => {
  const antrean = { total: 7, tertuaHari: 9, waspada: 1, lewat: 2, perluAlasan: 1, perPenyusun: [{ nama: 'Ust. A', jumlah: 5 }, { nama: 'Ust. B', jumlah: 2 }],
    tertua: [{ id: 'q1', pertanyaan: 'Berapa rakaat shalat Maghrib?', nama: 'Safinatun Naja', authorName: 'Ust. A', hari: 9, perluAlasan: true }] };
  const t = h(App.DasborView, dasar({ antrean }));
  assert.match(t, /<b>7<\/b> soal menunggu review/); assert.match(t, /9 hari/);
  assert.match(t, /2 lewat 7 hari/); assert.match(t, /1 lewat 3 hari/); assert.match(t, /perlu catatan alasan/);
  assert.match(t, /Ust\. A \(5\), Ust\. B \(2\)/); assert.match(t, /Berapa rakaat shalat Maghrib/);
  assert.match(t, /Menampilkan 1 tertua dari 7/);
});

const drv = (o = {}) => ({ dm: { aktif: false, ok: null }, busy: '', err: null, siap: true, jumlah: 2, sidik: 'x', daftar: null, onAktifkan() {}, onSekarang() {}, onMatikan() {}, onDaftar() {}, onPulih() {}, onTutupDaftar() {}, ...o });

test('Panel Drive Ustadz: belum aktif menawarkan aktivasi dan menjelaskan batasnya; tombol mati sebelum Client ID termuat', () => {
  const t = h(App.CadanganDriveUstadz, drv());
  assert.match(t, /Aktifkan cadangan otomatis/); assert.match(t, /tidak berjalan di latar belakang/);
  assert.match(t, /Google Drive akun Anda sendiri/);
  assert.match(h(App.CadanganDriveUstadz, drv({ siap: false })), /<button[^>]*disabled=""[^>]*>[^]*Aktifkan cadangan otomatis/);
});

test('Panel Drive Ustadz: aktif dengan cadangan terakhir, perubahan belum tercadangkan, galat, dan daftar pemulihan', () => {
  const ok = { waktu: Date.parse('2026-10-25T05:00:00Z'), sidik: 'lama', jumlah: 3, nama: 'labsouma-soal-saya-2026-10-25.json', link: 'https://drive.google.com/file/d/1/view' };
  const sama = h(App.CadanganDriveUstadz, drv({ dm: { aktif: true, ok: { ...ok, sidik: 'x' } } }));
  assert.match(sama, /Cadangan terakhir/); assert.match(sama, /3 soal/); assert.match(sama, /href="https:\/\/drive\.google\.com\/file\/d\/1\/view"/);
  assert.doesNotMatch(sama, /belum tercadangkan/);
  const beda = h(App.CadanganDriveUstadz, drv({ dm: { aktif: true, ok }, err: { code: 'DRIVE_IZIN', message: 'Izin Google Drive tidak diberikan.' } }));
  assert.match(beda, /belum tercadangkan/); assert.match(beda, /Izin Google Drive tidak diberikan/);
  const belumPernah = h(App.CadanganDriveUstadz, drv({ dm: { aktif: true, ok: null } }));
  assert.match(belumPernah, /belum ada cadangan yang berhasil/);
  const daftar = h(App.CadanganDriveUstadz, drv({ dm: { aktif: true, ok }, daftar: [{ id: 'a', name: 'labsouma-soal-saya-2026-10-25.json', size: '2048' }, { id: 'b', name: 'labsouma-soal-saya-2026-10-24.json' }] }));
  assert.match(daftar, /2026-10-25/); assert.match(daftar, /2026-10-24/); assert.match(daftar, /Pulihkan<\/button>/);
  assert.match(h(App.CadanganDriveUstadz, drv({ dm: { aktif: true, ok }, daftar: [] })), /Belum ada cadangan Soal Saya di Drive/);
});

test('Panel Drive Ustadz: tautan Drive yang bukan https Google tidak dijadikan href', () => {
  const t = h(App.CadanganDriveUstadz, drv({ dm: { aktif: true, ok: { waktu: 1, sidik: 'x', jumlah: 1, nama: 'n', link: 'javascript:alert(1)' } } }));
  assert.ok(!t.includes('javascript:'));
});
