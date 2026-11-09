// Pembantu antarmuka dan API yang dipakai bersama oleh App.jsx dan berkas tab yang dimuat malas (mis. AdminKonfigurasi.jsx).
// Dipisah dari App.jsx agar tidak ada impor melingkar: berkas ini tidak mengimpor App.jsx.
import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { AlertTriangle, ChevronDown, Filter, Loader2 } from 'lucide-react';
import * as NK from './lib/naskah.js';
import * as PK from './lib/paket.js';
import * as SK from './lib/saringKitab.js';
import * as AL from './lib/alurSoal.js';
import { muatPegon } from './lib/muatPegon.js';
import { Draft, Bt, FALLBACK_CFG, STATUS, mapelUntuk } from './lib/dasar.js';

// Kelas, sistem ujian, dan penempatan kitab: fungsi murni dari public/ujian.js (window.Ujian). Bila modul belum/tidak termuat, fitur kelas dan ujian diam (tidak merusak halaman).
// PENTING: dinamai Uj, bukan Ujian, agar tidak bentrok dengan window.Ujian (const tingkat atas oleh Babel menjadi var global).
const UJ_NOOP = { daftarSistem: () => [], kelasUntuk: () => [], periodeUntuk: () => [], sistemUntuk: () => null, labelPeriode: (c, t, k) => k || '', labelSistem: () => '', kitabCocok: () => true, cakupanKitab: () => '', ringkasPenempatan: () => [], penempatanYatim: () => [], penempatanKitab: () => [] };
const Uj = new Proxy({}, { get: (_, k) => (window.Ujian || UJ_NOOP)[k] });

// Titipkan `nilai` sebagai draf `nama`; bila `bersih`, hapus drafnya. `nilai` harus stabil antar render (useMemo) agar tidak menulis berulang.
function useDraftSync(nama, nilai, bersih) {
  useEffect(() => { if (bersih) Draft.remove(nama); else Draft.save(nama, nilai); }, [nama, nilai, bersih]);
}

// Textarea yang tingginya mengikuti isi: tidak ada bilah gulir dan tidak ada teks yang terpotong.
// `rows` menjadi tinggi minimum. Tinggi dihitung ulang saat isi berubah, saat lebar kolom berubah (teks terlipat ulang), dan saat font selesai dimuat (Amiri/Plus Jakarta Sans mengubah tinggi baris).
// `satuBaris`: untuk isian pendek seperti opsi jawaban. Teks tetap terlipat ke bawah, tetapi Enter diblokir dan baris baru hasil tempel diganti spasi.
const AutoArea = ({ value, onChange, onKeyDown, className = '', satuBaris = false, rows = 1, ...rest }) => {
  const el = useRef(null);
  const fit = useCallback(() => {
    const t = el.current;
    if (!t || !t.offsetWidth) return; // tersembunyi (mis. seksi HP yang terlipat): dihitung ulang oleh ResizeObserver saat tampil
    t.style.height = 'auto';
    t.style.height = (t.scrollHeight + (t.offsetHeight - t.clientHeight)) + 'px';
  }, []);
  useLayoutEffect(fit, [value, fit]);
  useEffect(() => {
    const t = el.current; if (!t) return undefined;
    let lebar = t.offsetWidth;
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { if (t.offsetWidth !== lebar) { lebar = t.offsetWidth; fit(); } }) : null;
    if (ro) ro.observe(t);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit).catch(() => {});
    return () => { if (ro) ro.disconnect(); };
  }, [fit]);
  return (
    <textarea ref={el} rows={rows} value={value} className={`${className} resize-none overflow-hidden`}
      onChange={satuBaris && onChange ? (e) => { const v = e.target.value; if (/[\r\n]/.test(v)) e.target.value = v.replace(/\s*[\r\n]+\s*/g, ' '); onChange(e); } : onChange}
      onKeyDown={(e) => { if (satuBaris && e.key === 'Enter') e.preventDefault(); if (onKeyDown) onKeyDown(e); }}
      {...rest} />
  );
};

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

const AppCfgCtx = React.createContext(FALLBACK_CFG);

// Catatan wajib pada setiap ekspor ('' untuk tim penyusun; terisi untuk peran Ustadz, yang soalnya tidak ditelaah editor). Lihat web/lib/ustadz.js.
const CatatanCtx = React.createContext('');

const useCfg = () => React.useContext(AppCfgCtx);

// Alur peninjauan bertahap (diatur admin; lihat web/lib/alurSoal.js). Bawaan: nonaktif = satu editor mana pun, seperti sebelumnya.
const AlurCtx = React.createContext(AL.ALUR_BAWAAN);

const useAlur = () => React.useContext(AlurCtx);

/* ---------- Filters ---------- */
// Nama ringkas satu paket Dauri untuk pilihan filter dan judul kelompok.
const labelPaket = (cfg, g) => [NK.PRESET_DAURI[g.dawr].label, g.nama || g.mapel, g.kelas && `Kelas ${g.kelas}`, g.periode && Uj.labelPeriode(cfg, g.tingkat, g.periode), g.cakupan, `${g.jumlah} butir`].filter(Boolean).join(' · ');

function Filters({ f, setF, withStatus, count, qs = [], uid = '' }) {
  const cfg = useCfg();
  const alur = useAlur();
  // Penyusun: dari soal yang dimuat (nama dan jumlah soalnya), agar editor/admin bisa menelusuri soal per penyusun dan penyusun bisa memilih "Anda".
  const penyusunOpsi = useMemo(() => {
    const m = new Map();
    for (const q of qs) if (q.authorUid) { const x = m.get(q.authorUid) || { uid: q.authorUid, nama: q.authorName || 'Tanpa nama', n: 0 }; x.n++; m.set(q.authorUid, x); }
    return [...m.values()].sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
  }, [qs]);
  // Mapel dari konfigurasi plus mapel yang sudah dipakai soal tersimpan (supaya soal lama tetap bisa difilter walau mapelnya diganti nama).
  const mapelOpsi = [...new Set([...mapelUntuk(cfg, f.tingkat), ...qs.filter((q) => !f.tingkat || q.tingkat === f.tingkat).map((q) => q.mapel).filter(Boolean)])];
  // Kelas dan ujian: milik tingkat terpilih; tanpa tingkat, gabungan semua tingkat plus yang sudah dipakai soal tersimpan (soal lama tetap bisa difilter).
  const kelasOpsiFilter = [...new Set([...(f.tingkat ? Uj.kelasUntuk(cfg, f.tingkat) : cfg.tingkat.flatMap((t) => Uj.kelasUntuk(cfg, t.nama))), ...qs.filter((q) => !f.tingkat || q.tingkat === f.tingkat).map((q) => q.kelas).filter(Boolean)])];
  const periodeOpsiFilter = (() => {
    const m = new Map(); const tambah = (x) => { if (!m.has(x.kode)) m.set(x.kode, x.label); };
    if (f.tingkat) Uj.periodeUntuk(cfg, f.tingkat).forEach(tambah); else cfg.tingkat.forEach((t) => Uj.periodeUntuk(cfg, t.nama).forEach(tambah));
    qs.filter((q) => q.periode && (!f.tingkat || q.tingkat === f.tingkat)).forEach((q) => tambah({ kode: q.periode, label: Uj.labelPeriode(cfg, q.tingkat, q.periode) }));
    return [...m].map(([kode, label]) => ({ kode, label }));
  })();
  const paketOpsi = useMemo(() => PK.kelompokPaket(qs).paket, [qs]);
  // Filter penyusun yang tersimpan di perangkat tetapi penyusunnya tidak ada di data yang dimuat (mis. akun lain di perangkat yang sama): kembali ke Semua, bukan menyaring diam-diam.
  useEffect(() => { if (f.penyusun && qs.length && !penyusunOpsi.some((p) => p.uid === f.penyusun)) setF({ ...f, penyusun: '' }); }, [f.penyusun, penyusunOpsi, qs.length]);
  // Pilihan paket yang tersimpan tetapi sudah tidak ada (paket dihapus atau belum Approved di Ekspor): kembali ke Semua.
  useEffect(() => { if (f.paket && qs.length && !paketOpsi.some((g) => g.id === f.paket)) setF({ ...f, paket: '' }); }, [f.paket, paketOpsi, qs.length]);
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-4">
      <Filter size={16} className="mb-2.5 hidden text-mute sm:block" />
      <div className="min-w-[140px] flex-1"><Label htmlFor={'f-mapel' + (withStatus ? 'b' : 'e')}>Mata Pelajaran</Label>
        <Select id={'f-mapel' + (withStatus ? 'b' : 'e')} value={f.mapel} onChange={(v) => setF({ ...f, mapel: v })}><option value="">Semua</option>{mapelOpsi.map((m) => <option key={m}>{m}</option>)}</Select></div>
      <div className="min-w-[140px] flex-1"><Label htmlFor={'f-tingkat' + (withStatus ? 'b' : 'e')}>Tingkat</Label>
        <Select id={'f-tingkat' + (withStatus ? 'b' : 'e')} value={f.tingkat} onChange={(v) => setF({ ...f, tingkat: v, kelas: '', periode: '' })}><option value="">Semua</option>{cfg.tingkat.map((t) => <option key={t.nama} value={t.nama}>{t.label}</option>)}</Select></div>
      <div className="min-w-[110px] flex-1"><Label htmlFor={'f-kelas' + (withStatus ? 'b' : 'e')}>Kelas</Label>
        <Select id={'f-kelas' + (withStatus ? 'b' : 'e')} value={f.kelas || ''} onChange={(v) => setF({ ...f, kelas: v })}><option value="">Semua</option>{kelasOpsiFilter.map((k) => <option key={k} value={k}>{k}</option>)}</Select></div>
      <div className="min-w-[140px] flex-1"><Label htmlFor={'f-periode' + (withStatus ? 'b' : 'e')}>Ujian</Label>
        <Select id={'f-periode' + (withStatus ? 'b' : 'e')} value={f.periode || ''} onChange={(v) => setF({ ...f, periode: v })}><option value="">Semua</option>{periodeOpsiFilter.map((x) => <option key={x.kode} value={x.kode}>{x.label}</option>)}</Select></div>
      <div className="min-w-[140px] flex-1"><Label htmlFor={'f-bentuk' + (withStatus ? 'b' : 'e')}>Bentuk Soal</Label>
        <Select id={'f-bentuk' + (withStatus ? 'b' : 'e')} value={f.bentuk || ''} onChange={(v) => setF({ ...f, bentuk: v })}><option value="">Semua</option>{Bt.BENTUK_IDS.map((id) => <option key={id} value={id}>{Bt.BENTUK[id].label}</option>)}</Select></div>
      {paketOpsi.length > 0 && (
        <div className="min-w-[200px] flex-1"><Label htmlFor={'f-paket' + (withStatus ? 'b' : 'e')}>Paket Dauri</Label>
          <Select id={'f-paket' + (withStatus ? 'b' : 'e')} value={f.paket || ''} onChange={(v) => { const g = paketOpsi.find((x) => x.id === v); setF(g ? { ...f, paket: v, tingkat: g.tingkat, mapel: g.mapel, kelas: g.kelas, periode: g.periode } : { ...f, paket: '' }); }}>
            <option value="">Semua (paket dan soal lepas)</option>{paketOpsi.map((g) => <option key={g.id} value={g.id}>{labelPaket(cfg, g)}</option>)}</Select></div>
      )}
      {withStatus && penyusunOpsi.length > 0 && (
        <div className="min-w-[160px] flex-1"><Label htmlFor="f-penyusun">Penyusun</Label>
          <Select id="f-penyusun" value={f.penyusun || ''} onChange={(v) => setF({ ...f, penyusun: v })}>
            <option value="">Semua</option>{penyusunOpsi.map((p) => <option key={p.uid} value={p.uid}>{p.nama}{p.uid === uid ? ' (Anda)' : ''} ({p.n})</option>)}</Select></div>
      )}
      {withStatus && alur.aktif && (
        <div className="min-w-[150px] flex-1"><Label htmlFor="f-tahap">Tahap Editor</Label>
          <Select id="f-tahap" value={f.tahap || ''} onChange={(v) => setF({ ...f, tahap: v })}>
            <option value="">Semua</option>{Array.from({ length: AL.MAKS_TAHAP }, (_, i) => i + 1).map((n) => <option key={n} value={String(n)}>Menunggu editor {n}</option>)}</Select></div>
      )}
      {withStatus && (
        <div className="min-w-[140px] flex-1"><Label htmlFor="f-status">Status Approval</Label>
          <Select id="f-status" value={f.status} onChange={(v) => setF({ ...f, status: v })}>
            <option value="">Semua</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></div>
      )}
      <p className="mb-2.5 ml-auto text-sm font-semibold text-soft-ink">{count} soal</p>
    </div>
  );
}

const applyFilter = (qs, f, alur = AL.ALUR_BAWAAN) => qs.filter((q) => (!f.penyusun || q.authorUid === f.penyusun) && (!f.tahap || !alur.aktif || (q.status === 'pending' && AL.tahapSoal(q, alur) === Number(f.tahap))) && (!f.mapel || q.mapel === f.mapel) && (!f.tingkat || q.tingkat === f.tingkat) && (!f.kelas || q.kelas === f.kelas) && (!f.periode || q.periode === f.periode) && (!f.paket || q.paket === f.paket) && (!f.bentuk || Bt.bentukDari(q) === f.bentuk) && (!f.status || q.status === f.status) && SK.cocokKitabBab(q, f));

// Membungkus komponen yang membaca window.Pegon: ia baru dirender setelah mesin Pegon siap, sehingga isinya aman memakai window.Pegon seperti semula.
// Dimuat di latar belakang sejak aplikasi dibuka (main.jsx), jadi biasanya sudah siap sebelum tab Pegon dibuka.
function usePegon() {
  const [P, setP] = useState(() => (typeof window !== 'undefined' && window.Pegon) || null);
  const [gagal, setGagal] = useState(false);
  const [coba, setCoba] = useState(0);
  useEffect(() => {
    if (P) return undefined;
    let hidup = true;
    setGagal(false);
    muatPegon().then((m) => { if (hidup) setP(m); }).catch(() => { if (hidup) setGagal(true); });
    return () => { hidup = false; };
  }, [P, coba]);
  const ulang = useCallback(() => setCoba((n) => n + 1), []);
  return { P, gagal, ulang };
}
const denganPegon = (Komp) => function DenganPegon(props) {
  const { P, gagal, ulang } = usePegon();
  if (P) return <Komp {...props} />;
  if (gagal) {
    return (
      <div role="alert" className="rounded-xl border border-line bg-white p-4 text-sm text-mute">
        Mesin Pegon gagal dimuat (mungkin sinyal terputus).{' '}
        <button type="button" className="font-semibold text-ink underline" onClick={ulang}>Coba lagi</button>
      </div>
    );
  }
  return <div className="p-4 text-sm text-mute" aria-busy="true">Memuat mesin Pegon…</div>;
};

export { Uj, Draft, useDraftSync, AutoArea, Label, Btn, Select, Section, callApi, apiErr, ERR_TITLES, ErrorBox, Spin, simpanBerkas, layarHp, AlurCtx, AppCfgCtx, CatatanCtx, Filters, applyFilter, labelPaket, useAlur, useCfg, usePegon, denganPegon };
