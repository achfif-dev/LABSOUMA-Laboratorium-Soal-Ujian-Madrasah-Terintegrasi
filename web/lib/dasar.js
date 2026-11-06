// Konstanta dan pembantu murni (tanpa React) yang dipakai bersama oleh App.jsx, ui.jsx, ExportTab.jsx, dan exportBuilders.js.
import { cariKitabDi } from './kitabNama.js';

/* ---------- Data & constants ---------- */
const TINGKAT = ['Ibtidaiyah', 'Tsanawiyah', 'Aliyah'];

const MAPEL = ['Fiqih', 'Akidah', 'Akhlak', 'Tarikh (SKI)', "Qur'an Hadits", 'Bahasa Arab', 'Lainnya'];

// Cadangan bila /api/app-config belum terbaca. Nilai sebenarnya diatur admin di menu Konfigurasi (src/appConfig.js).
const FALLBACK_CFG = {
  tingkat: TINGKAT.map((n) => ({ nama: n, label: n, singkat: '', kelas: [], aktif: true })),
  mapel: MAPEL.map((n) => ({ nama: n, tingkat: TINGKAT, aktif: true })),
  kitab: ['Fathul Qarib', 'Kifayatul Akhyar', 'Safinatun Naja', 'Taqrib (Matan Abu Syuja)', "Arba'in Nawawi", 'Riyadhus Shalihin', "Ta'lim al-Muta'allim", 'Aqidatul Awam']
    .map((n) => ({ nama: n, pengarang: '', mapel: '', tingkat: TINGKAT, aktif: true })),
};

// Bentuk soal (public/bentuk.js, window.Bentuk). Dinamai Bt agar tidak bentrok dengan window.Bentuk. Bila modul tidak termuat, semua soal dibaca sebagai pilihan ganda.
const BT_NOOP = {
  BENTUK: { pilgan: { id: 'pilgan', label: 'Pilihan ganda', singkat: 'Pilgan', opsi: ['A', 'B', 'C', 'D', 'E'], jawaban: false, rubrik: false, ket: '', contoh: '' } }, BENTUK_IDS: ['pilgan'], OPSI_BENARSALAH: { A: 'Benar', B: 'Salah' },
  bentukDari: () => 'pilgan', punyaOpsi: () => true, kunciOpsi: () => ['A', 'B', 'C', 'D', 'E'], bentukUntukTingkat: () => ['pilgan'], dianjurkan: () => true, adaPenanda: () => true,
  kunciTeks: (q) => String((q && q.kunci) || ''), selaraskan: (q) => q,
  periksaSoal: (q) => { const e = []; const t = (v) => String(v || '').trim(); if (!t(q.pertanyaan)) e.push('Pertanyaan belum diisi.'); if (['A', 'B', 'C', 'D', 'E'].filter((k) => t((q.opsi || {})[k])).length < 2) e.push('Isi minimal dua opsi jawaban.'); if (!q.kunci) e.push('Pilih kunci jawaban.'); else if (!t((q.opsi || {})[q.kunci])) e.push(`Opsi ${q.kunci} kosong, tetapi dipilih sebagai kunci.`); if (!t(q.pembahasan)) e.push('Pembahasan atau dalil pendukung belum diisi.'); return e; },
};

const Bt = new Proxy({}, { get: (_, k) => (window.Bentuk || BT_NOOP)[k] });

const cariKitab = (cfg, nama) => cariKitabDi(cfg.kitab, nama); // definisi "kitab yang sama" satu untuk semua tab: web/lib/kitabNama.js

const namaArabKitab = (cfg, nama) => (cariKitab(cfg, nama) || {}).namaArab || '';

const LEVEL = [
  { v: 'L1', label: 'L1 – Ingatan' },
  { v: 'L2', label: 'L2 – Aplikasi' },
  { v: 'L3', label: 'L3 – HOTS' },
];

const KEYS = ['A', 'B', 'C', 'D', 'E'];

const STATUS = {
  draft:    { label: 'Draft',          cls: 'bg-soft text-mute' },
  pending:  { label: 'Pending Review', cls: 'bg-warn-bg text-warn' },
  approved: { label: 'Approved',       cls: 'bg-ok-bg text-ok' },
  revision: { label: 'Perlu Revisi',   cls: 'bg-bad-bg text-bad' },
};

// Baca pengaturan kecil (filter, format): hanya kunci yang dikenal dan bertipe sama yang dipakai; selebihnya nilai awal.
const bacaPref = (nama, awal) => {
  const s = Draft.read(nama); if (!s || typeof s !== 'object') return awal;
  const o = { ...awal }; for (const k of Object.keys(awal)) if (typeof s[k] === typeof awal[k]) o[k] = s[k];
  return o;
};

// Ejaan huruf Pegon (Al-Qolam '24 atau klasik) yang dipakai tab Pegonizer, pratinjau Pegonkan, dan ekspor Soal Pegon; disimpan per perangkat.
const ejaanTersimpan = () => (window.Pegon ? window.Pegon.ejaanSah(bacaPref('pegonEjaan', { ejaan: 'alqolam' }).ejaan) : 'alqolam');

/* ---------- Export builders ---------- */
const optsOf = (q) => KEYS.filter((k) => (q.opsi[k] || '').trim());

const levelLabel = (v) => (LEVEL.find((l) => l.v === v) || {}).label || v;

// Sel berawalan = + - @ (atau tab/CR) dibaca Excel/Sheets sebagai rumus: awali apostrof agar tampil sebagai teks biasa (OWASP CSV injection).
const csvEsc = (s) => { let t = String(s == null ? '' : s); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return '"' + t.replace(/"/g, '""') + '"'; };

const fullQ = (q) => [q.stimulus, q.pertanyaan].filter(Boolean).join(' ');

const umpanUraian = (q) => [q.pembahasan, q.jawaban && `Jawaban model: ${q.jawaban}`, q.rubrik && `Pedoman penskoran: ${q.rubrik}`].filter(Boolean).join(' | ');

/* ---------- Draf otomatis (public/draft.js) ---------- */
// Isian yang belum disimpan ke server dititipkan di localStorage per akun, supaya selamat dari muat ulang halaman.
// Rahasia (kunci API) tidak pernah dititipkan.
const DRAFT_NOOP = { read: () => null, save() {}, saveNow: () => false, remove() {}, clearAll() {}, flush: () => true, setUser() {}, onStatus: () => () => {}, tersedia: false };
// PENTING: modul disimpan di window.LabDraft, BUKAN window.Draft. Babel-standalone mengubah const di tingkat atas menjadi var global,
// jadi `const Draft` di sini menjadi window.Draft dan menimpa modul. Bila Proxy ini membaca window.Draft, ia membaca dirinya sendiri
// tanpa henti (RangeError: Maximum call stack size exceeded) dan seluruh halaman blank.
const Draft = new Proxy({}, { get: (_, k) => (window.LabDraft || DRAFT_NOOP)[k] });

const mapelUntuk = (cfg, tingkat) => cfg.mapel.filter((m) => m.aktif && (!tingkat || m.tingkat.includes(tingkat))).map((m) => m.nama);

export { Draft, TINGKAT, MAPEL, FALLBACK_CFG, BT_NOOP, Bt, cariKitab, namaArabKitab, LEVEL, KEYS, STATUS, bacaPref, ejaanTersimpan, optsOf, levelLabel, csvEsc, fullQ, umpanUraian, mapelUntuk };
