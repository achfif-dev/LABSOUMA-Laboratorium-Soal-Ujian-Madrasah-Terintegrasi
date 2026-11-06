// Pembantu antarmuka dan API yang dipakai bersama oleh App.jsx dan berkas tab yang dimuat malas (mis. AdminKonfigurasi.jsx).
// Dipisah dari App.jsx agar tidak ada impor melingkar: berkas ini tidak mengimpor App.jsx.
import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { AlertTriangle, ChevronDown, Loader2 } from 'lucide-react';

// Kelas, sistem ujian, dan penempatan kitab: fungsi murni dari public/ujian.js (window.Ujian). Bila modul belum/tidak termuat, fitur kelas dan ujian diam (tidak merusak halaman).
// PENTING: dinamai Uj, bukan Ujian, agar tidak bentrok dengan window.Ujian (const tingkat atas oleh Babel menjadi var global).
const UJ_NOOP = { daftarSistem: () => [], kelasUntuk: () => [], periodeUntuk: () => [], sistemUntuk: () => null, labelPeriode: (c, t, k) => k || '', labelSistem: () => '', kitabCocok: () => true, cakupanKitab: () => '', ringkasPenempatan: () => [], penempatanYatim: () => [], penempatanKitab: () => [] };
const Uj = new Proxy({}, { get: (_, k) => (window.Ujian || UJ_NOOP)[k] });

/* ---------- Draf otomatis (public/draft.js) ---------- */
// Isian yang belum disimpan ke server dititipkan di localStorage per akun, supaya selamat dari muat ulang halaman.
// Rahasia (kunci API) tidak pernah dititipkan.
const DRAFT_NOOP = { read: () => null, save() {}, saveNow: () => false, remove() {}, clearAll() {}, flush: () => true, setUser() {}, onStatus: () => () => {}, tersedia: false };
// PENTING: modul disimpan di window.LabDraft, BUKAN window.Draft. Babel-standalone mengubah const di tingkat atas menjadi var global,
// jadi `const Draft` di sini menjadi window.Draft dan menimpa modul. Bila Proxy ini membaca window.Draft, ia membaca dirinya sendiri
// tanpa henti (RangeError: Maximum call stack size exceeded) dan seluruh halaman blank.
const Draft = new Proxy({}, { get: (_, k) => (window.LabDraft || DRAFT_NOOP)[k] });
// Titipkan `nilai` sebagai draf `nama`; bila `bersih`, hapus drafnya. `nilai` harus stabil antar render (useMemo) agar tidak menulis berulang.
function useDraftSync(nama, nilai, bersih) {
  useEffect(() => { if (bersih) Draft.remove(nama); else Draft.save(nama, nilai); }, [nama, nilai, bersih]);
}

const Label = ({ htmlFor, children, hint }) => (
  <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mute">
    {children}{hint && <span className="ml-1 normal-case font-normal tracking-normal">{hint}</span>}
  </label>
);
const Btn = ({ kind = 'ghost', className = '', children, ...p }) => {
  const base = 'inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed ';
  const k = {
    primary: 'bg-brand text-brand-fg shadow-sm hover:brightness-110 hover:shadow-md',
    soft: 'bg-soft text-soft-ink hover:opacity-80',
    ghost: 'border border-line bg-surface text-ink shadow-sm hover:border-brand hover:bg-soft',
    danger: 'bg-bad-bg text-bad ring-1 ring-inset ring-black/5 hover:brightness-95',
  }[kind];
  return <button type="button" className={base + k + ' ' + className} {...p}>{children}</button>;
};
const Select = ({ id, value, onChange, children, className = '', ...rest }) => (
  <select id={id} className={'field ' + className} {...rest} value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>
);
// `lipat`: di HP (lebar < 640px) seksi dimulai tertutup dan dibuka dengan mengetuk judulnya, supaya halaman panjang tidak perlu digulir jauh.
// Isi tetap terpasang (hanya disembunyikan) agar isian di dalamnya tidak hilang; di layar lebar seksi selalu terbuka.
const layarHp = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(max-width: 639px)').matches;
const Section = ({ title, icon: Icon, children, action, lipat = false }) => {
  const [buka, setBuka] = useState(() => !(lipat && layarHp()));
  const judul = <>{Icon && <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-soft text-soft-ink"><Icon size={15} /></span>}{title}</>;
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className={`flex flex-wrap items-center justify-between gap-2 ${lipat && !buka ? '' : 'mb-4'}`}>
        <h2 className="flex min-w-0 flex-1 items-center gap-2.5 text-sm font-bold text-ink">
          {lipat ? (
            <button type="button" aria-expanded={buka} onClick={() => setBuka((b) => !b)} className="flex min-h-[40px] w-full items-center gap-2.5 text-left sm:pointer-events-none sm:min-h-0">
              {judul}<ChevronDown size={18} className={`ml-auto shrink-0 text-mute transition-transform sm:hidden ${buka ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
          ) : judul}
        </h2>
        <div className={lipat && !buka ? 'max-sm:hidden' : ''}>{action}</div>
      </div>
      <div className={lipat && !buka ? 'max-sm:hidden' : ''}>{children}</div>
    </section>
  );
};

/* ---------- Helper API & tampilan bantuan AI ---------- */
async function callApi(path, body, signal) {
  const token = await firebase.auth().currentUser.getIdToken();
  const res = await fetch(path, { method: 'POST', signal, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(body) });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) throw { ...((data && data.error) || { code: 'HTTP_' + res.status, message: `Server mengembalikan error ${res.status}.` }), status: res.status };
  return data;
}
const apiErr = (e) => (e && e.name === 'AbortError' ? null : (e && e.code ? e : { code: 'NETWORK', message: 'Tidak dapat menghubungi server. Periksa koneksi internet lalu coba lagi.' }));
const ERR_TITLES = {
  INVALID_ARABIC: 'Teks Arab tidak valid', TEKS_TIDAK_MEMADAI: 'Teks belum cukup', TEKS_TOO_LONG: 'Teks terlalu panjang', SOAL_KOSONG: 'Naskah soal belum lengkap',
  RATE_LIMIT: 'Batas permintaan tercapai', RATE_LIMIT_LOCAL: 'Batas permintaan tercapai', RATE_LIMIT_DAILY: 'Kuota harian habis',
  AI_OVERLOADED: 'Layanan AI sedang sibuk', AI_TIMEOUT: 'AI terlalu lama merespons', AI_BAD_OUTPUT: 'Hasil AI tidak bisa dipakai', AI_MENOLAK: 'AI menolak memproses teks ini',
  KOREKSI_BENTROK: 'Halaman sudah diubah orang lain', KOREKSI_INVALID: 'Koreksi tidak bisa disimpan', KITAB_BERUBAH: 'Kitab baru saja berubah', HALAMAN_TIDAK_ADA: 'Halaman tidak ditemukan',
  AUTH_REQUIRED: 'Sesi berakhir', FORBIDDEN_ROLE: 'Akun belum disetujui', NETWORK: 'Tidak terhubung ke server',
  URL_INVALID: 'Tautan tidak valid', URL_NOT_ALLOWED: 'Situs belum didukung', SUMBER_NOT_FOUND: 'Halaman tidak ditemukan', SUMBER_BLOCKED: 'Situs menolak permintaan otomatis',
  SUMBER_ERROR: 'Situs sumber bermasalah', SUMBER_TIMEOUT: 'Situs sumber lambat', SUMBER_TOO_LARGE: 'Halaman terlalu besar', SUMBER_BUKAN_TEKS: 'Bukan halaman teks',
  TEKS_TIDAK_DITEMUKAN: 'Teks Arab tidak ditemukan', FILE: 'File tidak bisa dipakai',
  TEKS_KOSONG: 'Teks belum ada', GAMBAR_TIDAK_DIDUKUNG: 'Format foto tidak didukung', GAMBAR_TIDAK_VALID: 'Foto tidak valid', GAMBAR_TERLALU_BESAR: 'Foto terlalu besar',
  AI_KEY_MISSING: 'Kunci API belum ada', AI_TEST_KEY: 'Kunci API ditolak', AI_MODEL_NOT_FOUND: 'Model tidak ditemukan', AI_TEST_REJECTED: 'Permintaan uji ditolak',
  AI_UNREACHABLE: 'Layanan AI tidak terjangkau', AI_REQUEST_REJECTED: 'Permintaan ke AI ditolak', SERVER_AUTH: 'Kunci API server ditolak',
  SERVER_NOT_CONFIGURED: 'Server belum dikonfigurasi', CONFIG_READ_FAILED: 'Pengaturan tidak bisa dibaca', CONFIG_INVALID: 'Isian tidak valid',
  BACKUP_INVALID: 'Cadangan tidak bisa dipakai', CONFIG_CONFLICT: 'Konfigurasi sudah diubah admin lain', RIWAYAT_INVALID: 'Permintaan tidak bisa diproses', RIWAYAT_NOT_FOUND: 'Cadangan tidak ditemukan', DRIVE_BELUM_DIATUR: 'Backup belum diatur', DRIVE_IZIN: 'Izin Google Drive diperlukan', DRIVE_TOKEN: 'Izin Google Drive berakhir',
  DRIVE_API_OFF: 'Google Drive API belum aktif', DRIVE_PENUH: 'Google Drive penuh', DRIVE_RATE: 'Terlalu banyak permintaan', DRIVE_DITOLAK: 'Google Drive menolak',
  DRIVE_TIDAK_ADA: 'Tidak ditemukan di Drive', DRIVE_VERIFIKASI: 'Cadangan gagal diverifikasi', DRIVE_ERROR: 'Galat Google Drive',
};
const ErrorBox = ({ e }) => (
  <div role="alert" className="rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">
    <p className="flex items-center gap-2 font-bold"><AlertTriangle size={16} className="shrink-0" />{ERR_TITLES[e.code] || 'Gagal'}</p>
    <p className="mt-1 leading-relaxed">{e.message}</p>
  </div>
);
const Spin = ({ children }) => (
  <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-xl bg-soft px-4 py-3 text-sm font-medium text-soft-ink"><Loader2 size={18} className="spin shrink-0" />{children}</div>
);

const simpanBerkas = (nama, blob) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = nama;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

export { Uj, Draft, useDraftSync, Label, Btn, Select, Section, callApi, apiErr, ERR_TITLES, ErrorBox, Spin, simpanBerkas, layarHp };
