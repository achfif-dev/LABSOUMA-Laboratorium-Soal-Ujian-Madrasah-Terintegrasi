import React, { useState, useEffect, useMemo, useRef } from 'react';
// Tab dan panel besar dimuat saat pertama dibuka, bukan saat aplikasi dibuka (memangkas unduhan awal, penting di HP).
// Kegagalan memuat potongan (mis. offline dan belum pernah dibuka) hanya menampilkan pesan di panel itu, bukan merobohkan seluruh aplikasi.
class GagalMuatPanel extends React.Component {
  constructor(p) { super(p); this.state = { gagal: false }; }
  static getDerivedStateFromError() { return { gagal: true }; }
  render() {
    if (!this.state.gagal) return this.props.children;
    return (
      <div role="alert" className="rounded-xl border border-line bg-white p-4 text-sm text-mute">
        Bagian ini gagal dimuat (mungkin sinyal terputus).{' '}
        <button type="button" className="font-semibold text-ink underline" onClick={() => this.setState({ gagal: false })}>Coba lagi</button>
      </div>
    );
  }
}
const lazyPanel = (muat) => {
  const C = React.lazy(() => muat().catch((e) => { throw e; }));
  return function PanelMalas(props) {
    return (
      <GagalMuatPanel>
        <React.Suspense fallback={<LayarMuat ringkas />}><C {...props} /></React.Suspense>
      </GagalMuatPanel>
    );
  };
};
const AnalisisButir = lazyPanel(() => import('./AnalisisButir.jsx'));
const KitabImpor = lazyPanel(() => import('./KitabImpor.jsx'));
const PemilihKitab = lazyPanel(() => import('./PemilihKitab.jsx'));
const PembacaKitab = lazyPanel(() => import('./PembacaKitab.jsx'));
// Tab admin Konfigurasi dan Pengaturan AI: satu berkas, tiap komponen dibuka lewat pembungkus malas yang sama.
const AiConfig = lazyPanel(() => import('./AdminKonfigurasi.jsx').then((m) => ({ default: m.AiConfig })));
const AppCfgAdmin = lazyPanel(() => import('./AdminKonfigurasi.jsx').then((m) => ({ default: m.AppCfgAdmin })));
const AlurEditorAdmin = lazyPanel(() => import('./AdminKonfigurasi.jsx').then((m) => ({ default: m.AlurEditorAdmin })));
const PemeliharaanAdmin = lazyPanel(() => import('./AdminKonfigurasi.jsx').then((m) => ({ default: m.PemeliharaanAdmin })));
const Export = denganPegon(lazyPanel(() => import('./ExportTab.jsx')));
const TanyaKitab = lazyPanel(() => import('./TanyaKitab.jsx'));
const PeriksaRujukan = lazyPanel(() => import('./PeriksaRujukan.jsx'));
const FaktaTeks = lazyPanel(() => import('./FaktaTeks.jsx'));
import { rujukanDariHalaman, gabungRujukan, rujukanSah, rentangRujukan, hashBaca, bacaHash } from './lib/rujukan.js';
import { bagianTeks } from './lib/perpus.js';
import { faktaTerikatDari, pilihFaktaBerikut, faktaBasi, faktaSahDi, spekDenganFakta, jejakFaktaButir } from './lib/fakta.js';
import { samaKitab } from './lib/kitabNama.js';
import { bahasaOtomatis, tampilanDariIsi } from './lib/bahasa.js';
import * as UT from './lib/ustadz.js';
import * as DUP from './lib/duplikat.js';
import * as CD from './lib/cadanganDrive.js';
import * as DR from './lib/drive.js';
import * as DB from './lib/dasbor.js';
import * as NK from './lib/naskah.js';
import * as LK from './lib/lebarKolom.js';
import * as PK from './lib/paket.js';
import * as PKK from './lib/paketKembar.js';
import * as RW from './lib/riwayat.js';
import * as CS from './lib/cariSoal.js';
import * as SH from './lib/serahTerima.js';
import * as SK from './lib/saringKitab.js';
import * as AL from './lib/alurSoal.js';
import { muatDocx } from './lib/muatDocx.js';
import { kamusBersamaMasuk } from './lib/muatPegon.js';
import { Bt, FALLBACK_CFG, KEYS, LEVEL, STATUS, bacaPref, cariKitab, ejaanTersimpan, levelLabel, namaArabKitab, optsOf, mapelUntuk } from './lib/dasar.js';

import { denganPegon, AlurCtx, AppCfgCtx, CatatanCtx, Filters, applyFilter, labelPaket, useAlur, useCfg, Uj, Draft, useDraftSync, AutoArea, Label, Btn, Select, Section, callApi, apiErr, ErrorBox, Spin, simpanBerkas } from './ui.jsx';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { BarChart3, BookOpen, LibraryBig, PenLine, ClipboardCheck, Library, Download, Sparkles, Save, Send, Check, X, Copy, Trash2, Pencil, FileText, FileSpreadsheet, Loader2, Quote, RotateCcw, AlertTriangle, CheckCircle2, Info, Layers, Users, LogOut, ShieldCheck, LogIn, Languages, Mic, Camera, Upload, Menu, CloudUpload, ListChecks, Target, LayoutDashboard, RefreshCw, Settings, CheckSquare, Square } from 'lucide-react';
import * as NV from './lib/navigasi.js';
// Ikon grup navigasi (grup dengan satu tab memakai ikon tab itu sendiri).
const IKON_GRUP = { susun: PenLine, bank: Library, ujian: ListChecks, kelola: Settings, lainnya: Menu };

// Kamus Pegon bersama (Firestore kamusPegon). docs: dokumen mentah untuk daftar; ver: naik tiap kali kamus berubah agar Pegon dirender ulang.
const KamusCtx = React.createContext({ docs: [], ver: 0, err: null, canShare: false, simpan: async () => {}, hapus: async () => {} });
const useKamus = () => React.useContext(KamusCtx);
const tingkatAktif = (cfg) => cfg.tingkat.filter((t) => t.aktif);
const labelTingkat = (cfg, nama) => ((cfg.tingkat.find((t) => t.nama === nama) || {}).label) || nama;
// Kitab di dropdown = kitab aktif di Konfigurasi untuk tingkat dan mapel terpilih. Kitab "(tanpa mapel)" berlaku untuk semua mapel.
// Tanpa cadangan: kalau tidak ada yang cocok, daftar kosong (pengguna bisa memilih "Lainnya").
// Kelas dan periode ujian (opsional) mempersempit lagi lewat penempatan kitab per kelas (public/ujian.js).
const kitabUntuk = (cfg, tingkat, mapel, kelas = '', periode = '') =>
  cfg.kitab.filter((k) => k.aktif && (!tingkat || k.tingkat.includes(tingkat)) && (!mapel || !k.mapel || k.mapel === mapel) && Uj.kitabCocok(k, { tingkat, kelas, periode }));
const KITAB_LAIN = '__lain__';
const labelArabTingkat = (cfg, nama) => ((cfg.tingkat.find((t) => t.nama === nama) || {}).labelArab) || '';
// Teks Arab di tengah kalimat Latin: font Amiri, arah RTL terisolasi.
const ArNama = ({ children, className = '' }) => (children ? <span dir="rtl" lang="ar" className={'ar-nama ' + className}>{children}</span> : null);
// Tambahan setelah rujukan kitab: " · نama Arab" bila kitab ada di katalog dan punya nama Arab.
const RefArab = ({ q }) => { const a = namaArabKitab(useCfg(), q.nama); return a ? <> · <ArNama>{a}</ArNama></> : null; };
const ROLE_LABEL = { pending: 'Menunggu persetujuan', penyusun: 'Penyusun', editor: 'Editor', admin: 'Admin', ustadz: 'Ustadz', nonaktif: 'Nonaktif' };
const FIELDS = ['tingkat', 'mapel', 'level', 'kelas', 'periode', 'nama', 'juz', 'hal', 'bab', 'teks', 'stimulus', 'pertanyaan', 'indikator', 'sumberUrl', 'opsi', 'kunci', 'pembahasan', 'bentuk', 'jawaban', 'rubrik', 'kitabId', 'halId', 'halIdAkhir'];

const emptyForm = () => ({
  tingkat: 'Aliyah', mapel: 'Fiqih', level: 'L3',
  kelas: '', periode: '', // opsional: kelas dan kode periode ujian (label periode diatur di Konfigurasi)
  nama: '', juz: '', hal: '', bab: '', // bab: opsional, dasar pengelompokan kisi-kisi
  kitabId: '', halId: '', halIdAkhir: '', // tautan balik ke halaman kitab di perpustakaan (web/lib/rujukan.js); kosong = soal tidak berasal dari perpustakaan
  teks: '',
  stimulus: '', pertanyaan: '', indikator: '', sumberUrl: '',
  bentuk: 'pilgan', // pilgan | lanjutan | benarsalah | isian | uraian (public/bentuk.js)
  opsi: { A: '', B: '', C: '', D: '', E: '' }, kunci: '', pembahasan: '', jawaban: '', rubrik: '', // jawaban/rubrik: isian dan uraian
  ai: { dibuat: false, model: '', verifikasi: '', buta: '' }, // jejak audit: dibuat AI? model apa? lolos pemeriksaan apa?
});

// Komponen yang membaca window.Pegon dibungkus: baru dirender setelah mesin Pegon (dimuat malas) siap.
import SaranTulisan from './SaranTulisan.jsx';
import { KreditKaki, LayarMuat } from './Merek.jsx';
import { MEREK } from './lib/merek.js';
import { saranSorotan } from './lib/periksaTulisan.js';
const PegonSoal = denganPegon(PegonSoalInti);
const PegonTab = denganPegon(PegonTabInti);

function useEjaan() {
  const [e, setE] = useState(ejaanTersimpan);
  const ubah = (v) => { const s = window.Pegon ? window.Pegon.ejaanSah(v) : 'alqolam'; setE(s); Draft.save('pegonEjaan', { ejaan: s }); };
  return [e, ubah];
}
function EjaanPilih({ id, value, onChange }) {
  const P = window.Pegon;
  return (
    <div><Label htmlFor={id} hint="(huruf p, c, g, ng, ny)">Ejaan huruf Pegon</Label>
      <Select id={id} value={value} onChange={onChange}>
        {Object.entries(P ? P.EJAAN : { alqolam: 'Al-Qolam' }).map(([k, x]) => <option key={k} value={k}>{x}</option>)}
      </Select></div>
  );
}
// Bentuk form dari draf yang dibaca: total (tidak pernah melempar) dan hanya menerima string pada tempatnya, supaya draf rusak tidak membuat halaman gagal tampil.
const normalForm = (src) => {
  const base = emptyForm(); const x = src && typeof src === 'object' ? src : {};
  const str = (v, d) => (typeof v === 'string' ? v : d);
  const o = { ...base };
  for (const k of FIELDS) if (k !== 'opsi' && k !== 'ai' && typeof x[k] === 'string') o[k] = x[k];
  const so = x.opsi && typeof x.opsi === 'object' ? x.opsi : {};
  o.opsi = Object.fromEntries(KEYS.map((k) => [k, str(so[k], '')]));
  if (!KEYS.includes(o.kunci)) o.kunci = '';
  o.bentuk = Bt.bentukDari(o.bentuk);
  const sa = x.ai && typeof x.ai === 'object' ? x.ai : {};
  o.ai = { dibuat: sa.dibuat === true, model: str(sa.model, '').slice(0, 60), verifikasi: str(sa.verifikasi, ''), buta: str(sa.buta, '') };
  return o;
};
// Ada teks yang diketik pengguna? (dasar peringatan dan pemberitahuan pemulihan)
const formBerisi = (f) => ['nama', 'juz', 'hal', 'teks', 'stimulus', 'pertanyaan', 'indikator', 'sumberUrl', 'kunci', 'pembahasan', 'jawaban', 'rubrik'].some((k) => String(f[k] || '').trim()) || KEYS.some((k) => String((f.opsi || {})[k] || '').trim());
// Ada yang berbeda dari form kosong (termasuk pilihan tingkat/mapel/level)? Bila tidak, tidak ada yang perlu disimpan.
const formBeda = (f) => { const e = emptyForm(); return FIELDS.some((k) => JSON.stringify(f[k]) !== JSON.stringify(e[k])); };
// Penanda "draf otomatis tersimpan". `names` membatasi ke kunci draf tertentu; tanpa itu, semua.
function DraftNote({ names, className = '' }) {
  const [st, setSt] = useState(null);
  useEffect(() => Draft.onStatus((x) => { if (!names || names.includes(x.name)) setSt(x); }), []);
  const warn = (t) => <p role="status" className={'text-xs font-medium text-warn ' + className}>{t}</p>;
  if (!Draft.tersedia) return warn('Browser ini memblokir penyimpanan lokal, jadi isian tidak bisa dipulihkan setelah muat ulang. Simpan sebagai draft sebelum menutup halaman.');
  if (!st) return null;
  if (!st.ok) return warn(st.reason === 'terlalu-besar' ? 'Isian terlalu besar untuk draf otomatis. Simpan sebagai draft sebelum menutup halaman.' : 'Draf otomatis gagal disimpan (penyimpanan browser penuh atau ditolak). Simpan sebagai draft sebelum menutup halaman.');
  return <p role="status" className={'text-xs text-mute ' + className}>Draf otomatis tersimpan di perangkat ini · {new Date(st.at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>;
}









/* ---------- Small UI parts ---------- */
const Badge = ({ status }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ring-black/5 ${STATUS[status].cls}`}>{STATUS[status].label}</span>
);
const TahapChip = ({ q }) => {
  const t = AL.labelTahap(q, useAlur());
  return t ? <span className="inline-flex items-center rounded-full bg-soft px-2.5 py-0.5 text-xs font-semibold text-soft-ink ring-1 ring-inset ring-black/5">{t}</span> : null;
};
const Chip = ({ children }) => (
  <span className="inline-flex items-center rounded-md border border-line px-2 py-0.5 text-xs font-medium text-mute">{children}</span>
);
const Empty = ({ icon: Icon, title, text }) => (
  <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-soft text-soft-ink"><Icon size={22} /></div>
    <p className="font-semibold">{title}</p>
    <p className="mx-auto mt-1 max-w-sm text-sm text-mute">{text}</p>
  </div>
);
/* ---------- Pemeriksa kutipan Arab (gratis, di browser, tanpa kuota AI) ---------- */
const KUTIPAN_UI = {
  lolos: ['Kutipan cocok dengan teks kitab', 'bg-ok-bg text-ok'],
  periksa: ['Periksa kutipan secara manual', 'bg-warn-bg text-warn'],
  gagal: ['Ada kutipan yang tidak ada di teks kitab', 'bg-bad-bg text-bad'],
};
function SikapBadge({ q }) {
  const S = window.Sikap; const K = window.Kutipan;
  const r = useMemo(() => (S && K ? S.periksaSikap(K.bidangDariSoal(q)) : null), [S, K, q.stimulus, q.pertanyaan, q.opsi, q.pembahasan]);
  if (!r || r.status === 'aman') return null;
  return (
    <div className="rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn">
      <p className="font-semibold">Periksa nada soal (madrasah berhaluan wasathiyah)</p>
      {r.temuan.map((t, i) => <p key={i} className="mt-1">Kata “{t.kata}” di {t.bidang}: {t.alasan}. Pastikan sesuai teks dan tidak menyalahkan pihak lain.</p>)}
    </div>
  );
}
function KutipanBadge({ q }) {
  const K = window.Kutipan;
  const r = useMemo(
    () => (K && q.teks && q.pembahasan ? K.periksaKutipan(K.bidangDariSoal(q), q.teks) : null),
    [K, q.teks, q.pembahasan, q.stimulus, q.pertanyaan, q.opsi],
  );
  if (!r || r.status === 'tanpa_teks') return null;
  const [label, cls] = KUTIPAN_UI[r.status];
  const bermasalah = r.detail.filter((d) => d.status !== 'cocok');
  return (
    <div className={`rounded-lg px-3 py-2 text-xs ${cls}`}>
      <p className="font-semibold">{label}{r.ringkas.total ? ` (${r.ringkas.cocok} dari ${r.ringkas.total} cocok)` : ''}</p>
      {r.peringatan.map((w, i) => <p key={'w' + i} className="mt-1">{w}</p>)}
      {bermasalah.map((d, i) => (
        <div key={i} className="mt-2 border-t border-line pt-2">
          <p className="font-semibold">{d.label}: {d.bedaHarakat ? 'kata sama, tetapi harakat berbeda dari teks kitab' : d.status === 'mirip' ? 'mirip, tapi ada kata yang berbeda' : 'tidak ditemukan di teks kitab'}</p>
          <p dir="rtl" lang="ar" className="ar mt-1">{d.kutipan}</p>
          {d.bedaHarakat && d.bedaHarakat.map((h, j) => <p key={j} className="mt-1" dir="rtl" lang="ar"><span className="ar">{h.kutipan}</span> ≠ <span className="ar">{h.teks}</span></p>)}
          {d.terdekat && <p className="mt-1">Bagian teks yang paling dekat (tanpa harakat):</p>}
          {d.terdekat && <p dir="rtl" lang="ar" className="ar">{d.terdekat}</p>}
        </div>
      ))}
    </div>
  );
}
const QuestionView = ({ q }) => (
  <div className="space-y-3">
    {Bt.bentukDari(q) !== 'pilgan' && <p className="text-xs font-semibold uppercase tracking-wide text-mute">{Bt.BENTUK[Bt.bentukDari(q)].label}</p>}
    {q.stimulus && <p className="rounded-lg bg-soft px-3 py-2 text-sm leading-relaxed text-soft-ink">{q.stimulus}</p>}
    <p className="font-semibold leading-relaxed">{q.pertanyaan}</p>
    {optsOf(q).length > 0 && (
      <ul className="space-y-1.5">
        {optsOf(q).map((k) => (
          <li key={k} className={`flex gap-2 rounded-lg border px-3 py-2 text-sm ${k === q.kunci ? 'border-brand bg-ok-bg text-ok' : 'border-line'}`}>
            <span className="font-bold">{k}.</span>
            <span className="min-w-0 flex-1 break-words">{q.opsi[k]}</span>
            {k === q.kunci && <Check size={16} className="mt-0.5 shrink-0" />}
          </li>
        ))}
      </ul>
    )}
    {Bt.BENTUK[Bt.bentukDari(q)].jawaban && q.jawaban && (
      <p className="whitespace-pre-wrap rounded-lg border border-brand bg-ok-bg px-3 py-2 text-sm text-ok"><span className="font-bold">{Bt.bentukDari(q) === 'uraian' ? 'Jawaban model: ' : 'Jawaban: '}</span>{q.jawaban}</p>
    )}
    {Bt.bentukDari(q) === 'uraian' && q.rubrik && (
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-mute"><span className="font-semibold text-ink">Pedoman penskoran: </span>{q.rubrik}</p>
    )}
    {q.pembahasan && (
      <p className="text-sm leading-relaxed text-mute"><span className="font-semibold text-ink">Pembahasan: </span>{q.pembahasan}</p>
    )}
    <KutipanBadge q={q} />
    <SikapBadge q={q} />
    {q.indikator && (
      <p className="text-sm leading-relaxed text-mute"><span className="font-semibold text-ink">Indikator: </span>{q.indikator}</p>
    )}
  </div>
);
const Meta = ({ q }) => {
  const cfg = useCfg();
  return (
  <div className="flex flex-wrap gap-1.5">
    <Chip>{q.mapel}</Chip><Chip>{labelTingkat(cfg, q.tingkat)}</Chip>{q.kelas && <Chip>Kelas {q.kelas}</Chip>}{q.periode && <Chip>{Uj.labelPeriode(cfg, q.tingkat, q.periode)}</Chip>}{q.bab && <Chip>Bab: {q.bab}</Chip>}<Chip>{levelLabel(q.level)}</Chip>{Bt.bentukDari(q) !== 'pilgan' && <Chip>{Bt.BENTUK[Bt.bentukDari(q)].label}</Chip>}
    {q.contoh && <Chip>Contoh data</Chip>}
    {q.ai && q.ai.dibuat && <Chip>Dibuat AI{q.ai.model ? ` · ${q.ai.model}` : ''}</Chip>}
  </div>
  );
};
function TautKitab({ q }) {
  if (!rujukanSah(q)) return null;
  return <> · <a href={hashBaca(q)} className="font-semibold text-brand underline" title="Buka halaman kitab asal soal ini di tab Baca Kitab">Buka di kitab</a></>;
}
const refText = (q) => [q.nama || 'Kitab belum diisi', q.juz && `Juz ${q.juz}`, q.hal && `Hal. ${q.hal}`].filter(Boolean).join(' · ');

const Toast = ({ t }) => t ? (
  <div role="status" className="fade-in fixed left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-head px-4 py-3 text-sm font-medium text-head-ink shadow-xl"
       style={{ bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))', maxWidth: 'calc(100vw - 32px)' }}>
    {t}
  </div>
) : null;

/* ---------- Jam & tanggal di header (WIB, sesuai hari reset kuota) ---------- */
const FMT_JAM = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const FMT_TGL = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
function Jam() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <div className="ml-auto shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-center sm:mt-0 sm:rounded-none sm:bg-transparent sm:p-0 sm:text-right" role="timer" aria-live="off" aria-label="Jam dan tanggal WIB">
      <p className="text-sm font-bold tabular-nums leading-tight sm:text-3xl">{FMT_JAM.format(now).replace(/\./g, ':')}<span className="ml-1 text-xs font-semibold opacity-70">WIB</span></p>
      <p className="mt-0.5 hidden text-xs font-medium opacity-80 sm:block">{FMT_TGL.format(now)}</p>
    </div>
  );
}

// Kepala aplikasi dipakai App dan AppUstadz. Di HP dibuat satu baris (logo, judul, jam) supaya konten mulai lebih cepat tampak;
// baris nama Arab disembunyikan di layar kecil dan tampil mulai lebar sm ke atas.
const SISI_KEPALA = { marginLeft: 'calc(-1 * max(16px, env(safe-area-inset-left, 0px)))', marginRight: 'calc(-1 * max(16px, env(safe-area-inset-right, 0px)))', paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))', paddingRight: 'max(16px, env(safe-area-inset-right, 0px))' };
function AppHeader() {
  return (
    <header className="pattern bg-head text-head-ink" style={SISI_KEPALA}>
      <div className="mx-auto max-w-6xl py-3 sm:pb-5 sm:pt-8">
        <div className="flex min-w-0 items-center gap-3 sm:items-start sm:gap-4">
          <AppLogo size={44} className="shrink-0 sm:!h-14 sm:!w-14" />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-extrabold leading-tight sm:text-2xl">{MEREK.nama}</h1>
            <p className="text-xs font-medium leading-snug opacity-90 sm:text-base">Laboratorium Soal Ujian Madrasah Terintegrasi</p>
            <p dir="rtl" lang="ar" className="ar mt-1 hidden text-right text-lg opacity-80 sm:block" style={{ fontSize: '1.2rem', lineHeight: 1.9, textWrap: 'balance' }}>مختبر أسئلة امتحان المدرسة المتكامل</p>
          </div>
          <Jam />
        </div>
      </div>
    </header>
  );
}

const SourceLink = ({ url }) => (/^https:\/\//.test(url || '')
  ? <a href={url} target="_blank" rel="noopener noreferrer" className="break-all underline">{url}</a> : null);

/* Membersihkan teks salinan Maktabah Syamilah: penanda halaman [ص: ١٢], nomor catatan kaki, tatwil, karakter tak terlihat. */
const cleanArabic = (t) => String(t || '')
  .replace(/[​-‏‪-‮⁦-⁩﻿]/g, '')
  .replace(/ـ/g, '')
  .replace(/\[\s*(?:ص|ج)?\s*[:：]?\s*[\d٠-٩]+(?:\s*[\/:]\s*[\d٠-٩]+)?\s*\]/g, '')
  .replace(/\(\s*[\d٠-٩]{1,2}\s*\)/g, '')
  .replace(/[ \t ]+/g, ' ')
  .split('\n').map((l) => l.trim()).join('\n')
  .replace(/\n{3,}/g, '\n\n').trim();

const PAGE_RE = /^(https:\/\/[^?#]*\/book\/\d+\/)(\d+)(.*)$/;
const BOOK_RE = /^(https:\/\/[^?#]*\/book\/\d+)(?:\/\d+)?\/?$/;
const urlHalaman = (tautan, hal) => { const m = BOOK_RE.exec(String(tautan || '').trim()); const n = Number(hal); return m && Number.isInteger(n) && n >= 1 ? m[1] + '/' + n : null; };
const cariGoogle = (nama) => 'https://www.google.com/search?q=' + encodeURIComponent('site:shamela.ws ' + nama);
const pageNav = (url, d) => { const m = PAGE_RE.exec(url || ''); if (!m) return null; const n = Number(m[2]) + d; return n >= 1 ? m[1] + n : null; };

const VERDICT = { layak: ['Layak', 'bg-ok-bg text-ok'], perlu_perbaikan: ['Perlu perbaikan', 'bg-warn-bg text-warn'], tidak_layak: ['Tidak layak', 'bg-bad-bg text-bad'] };
const ASPEK = { kunci: 'Kunci', pengecoh: 'Pengecoh', kejelasan: 'Kejelasan', level: 'Level', bahasa: 'Bahasa', pembahasan: 'Pembahasan', rujukan: 'Rujukan', indikator: 'Indikator', kesesuaian_teks: 'Kesesuaian teks', jawaban: 'Jawaban', rubrik: 'Pedoman penskoran', bentuk: 'Bentuk soal' };
const H3 = ({ children }) => <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-mute">{children}</h3>;

function ButaView({ state }) {
  if (!state) return null;
  if (state.loading) return <Spin>Menguji soal tanpa kunci...</Spin>;
  if (state.error) return <div className="mt-2"><ErrorBox e={state.error} /></div>;
  const d = state.data;
  if (d.status === 'sepakat') return <p className="mt-2 rounded-lg bg-ok-bg px-3 py-2 text-xs font-semibold text-ok">Uji buta: penguji menjawab {d.jawaban}, sama dengan kunci.</p>;
  if (d.status === 'tanpa_kunci') return <p className="mt-2 text-xs text-mute">Pilih kunci jawaban dulu agar hasil uji bisa dibandingkan.</p>;
  return (
    <div className="mt-2 rounded-lg bg-bad-bg px-3 py-2 text-xs text-bad">
      <p className="font-semibold">Uji buta berbeda dari kunci: penguji menjawab “{d.jawaban === 'tidak_ada' ? 'tidak ada yang benar' : d.jawaban === 'lebih_dari_satu' ? 'lebih dari satu benar' : d.jawaban}”, kunci {d.kunci}.</p>
      {d.alasan && <p className="mt-1">{d.alasan}</p>}
      <p className="mt-1">Cek ulang kunci dan pengecoh sebelum mengirim ke editor.</p>
    </div>
  );
}
function TelaahView({ state, onApply, onUseNotes }) {
  if (state.loading) return <Spin>Sedang menelaah soal terhadap teks kitab...</Spin>;
  if (state.error) return <ErrorBox e={state.error} />;
  const d = state.data;
  const [vl, vc] = VERDICT[d.verdict] || VERDICT.perlu_perbaikan;
  const p = d.perbaikan;
  const fixed = { stimulus: p.stimulus, pertanyaan: p.pertanyaan, opsi: { A: p.pilihan_a, B: p.pilihan_b, C: p.pilihan_c, D: p.pilihan_d, E: p.pilihan_e }, kunci: p.kunci_jawaban, pembahasan: p.pembahasan, indikator: p.indikator_kisi_kisi, bentuk: p.bentuk, jawaban: p.jawaban, rubrik: p.rubrik };
  return (
    <div className="space-y-3 text-sm">
      <p className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${vc}`}>{vl}</span>
        <span className="text-mute">{d.temuan.length ? `${d.temuan.length} temuan` : 'Tidak ada temuan'}</span></p>
      {d.temuan.length > 0 && (
        <ul className="space-y-2">
          {d.temuan.map((t, i) => (
            <li key={i} className="rounded-lg border border-line bg-surface px-3 py-2">
              <p className="flex flex-wrap items-center gap-2"><span className={`rounded-md px-2 py-px text-xs font-semibold ${t.tingkat === 'kritis' ? 'bg-bad-bg text-bad' : 'bg-soft text-soft-ink'}`}>{t.tingkat === 'kritis' ? 'Kritis' : 'Saran'}</span>
                <span className="text-xs font-semibold text-mute">{ASPEK[t.aspek]}</span></p>
              <p className="mt-1 leading-relaxed">{t.masalah}</p>
              <p className="mt-1 leading-relaxed text-mute"><span className="font-semibold text-ink">Saran: </span>{t.saran}</p>
            </li>
          ))}
        </ul>
      )}
      {d.ringkasan_perubahan && <p className="leading-relaxed text-mute"><span className="font-semibold text-ink">Perubahan: </span>{d.ringkasan_perubahan}</p>}
      <details className="rounded-lg border border-line bg-surface px-3 py-2">
        <summary className="cursor-pointer text-sm font-semibold text-soft-ink">Lihat soal hasil perbaikan</summary>
        <div className="mt-3"><QuestionView q={fixed} /></div>
      </details>
      <div className="flex flex-wrap gap-2">
        {onApply && <Btn kind="primary" onClick={onApply}><Check size={16} />Terapkan perbaikan ke form</Btn>}
        {onUseNotes && d.temuan.length > 0 && <Btn kind="ghost" onClick={() => onUseNotes(d.temuan.map((t) => `${ASPEK[t.aspek]}: ${t.masalah} ${t.saran}`).join('\n'))}>Pakai temuan sebagai catatan revisi</Btn>}
      </div>
      <p className="text-xs text-mute">Telaah AI membantu, bukan pengganti keputusan editor.</p>
    </div>
  );
}

function AssistView({ state, onIdea }) {
  if (state.loading) return <Spin>{state.kind === 'terjemah' ? 'Sedang menerjemahkan teks kitab...' : 'Sedang menganalisis teks kitab...'}</Spin>;
  if (state.error) return <ErrorBox e={state.error} />;
  const d = state.data;
  if (state.kind === 'terjemah') {
    return (
      <div className="space-y-4 text-sm">
        <p className="whitespace-pre-wrap leading-relaxed">{d.terjemah}</p>
        {d.poin_inti.length > 0 && <div><H3>Poin inti</H3><ul className="list-disc space-y-1 pl-5">{d.poin_inti.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
        {d.istilah.length > 0 && (
          <div><H3>Istilah</H3>
            <ul className="space-y-1">{d.istilah.map((x, i) => (
              <li key={i} className="flex items-baseline gap-3"><span dir="rtl" lang="ar" className="ar ar-sm shrink-0 !leading-normal">{x.arab}</span><span>{x.arti}</span></li>))}</ul></div>
        )}
        <p className="text-xs text-mute">Draf terjemahan mesin (AI), belum ditinjau ustadz atau guru. Jangan dipakai sebagai kunci atau pembahasan sebelum dicocokkan dengan kitab terjemahan atau ditinjau orang yang menguasai kitabnya.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4 text-sm">
      <p className="font-semibold leading-relaxed">{d.tema}</p>
      {d.kandungan.length > 0 && <div><H3>Yang ditegaskan teks</H3><ul className="list-disc space-y-1 pl-5">{d.kandungan.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
      <div><H3>Ide soal</H3>
        <ul className="space-y-2">{d.ide_soal.map((x, i) => (
          <li key={i} className="rounded-lg border border-line bg-surface px-3 py-2">
            <p className="flex items-start gap-2"><span className="mt-0.5 shrink-0 rounded-md bg-soft px-2 py-px text-xs font-bold text-soft-ink">{x.level}</span><span className="min-w-0 flex-1 leading-relaxed">{x.fokus}</span></p>
            {x.alasan && <p className="mt-1 text-xs leading-relaxed text-mute">{x.alasan}</p>}
            <button type="button" onClick={() => onIdea(x)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-soft-ink hover:underline"><Sparkles size={13} />Buat soal dari fokus ini</button>
          </li>))}</ul></div>
      {d.potensi_pengecoh.length > 0 && <div><H3>Calon pengecoh</H3><ul className="list-disc space-y-1 pl-5">{d.potensi_pengecoh.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
      {d.catatan_khilaf && <div><H3>Perbedaan pendapat dalam teks</H3><p className="leading-relaxed">{d.catatan_khilaf}</p></div>}
    </div>
  );
}

/* ---------- Tab 1: Penyusunan ---------- */
/* ---------- Pegonkan: pratinjau Pegon dari isian soal (isian Latin TIDAK diubah) + perbaikan kata bersorot ke kamus ---------- */
function PegonSoalInti({ form, toast, onUbah }) {
  const P = window.Pegon;
  const kc = useKamus();
  const [ejaan, setEjaan] = useEjaan();
  const [tick, setTick] = useState(0);
  const [bahas, setBahas] = useState(false);
  const [isi, setIsi] = useState({}); // kata -> { arab, tipe }
  const [busy, setBusy] = useState('');
  const bagian = useMemo(() => {
    const out = [];
    const tambah = (label, teks) => { if (String(teks || '').trim()) out.push({ label, ...P.convertTextEjaan(String(teks), ejaan) }); };
    tambah('Stimulus', form.stimulus);
    tambah('Pertanyaan', form.pertanyaan);
    (Bt.bentukDari(form) === 'benarsalah' ? [] : ['A', 'B', 'C', 'D', 'E']).forEach((k) => tambah('Opsi ' + k + (form.kunci === k ? ' (kunci)' : ''), (form.opsi || {})[k]));
    if (Bt.BENTUK[Bt.bentukDari(form)].jawaban) tambah('Jawaban', form.jawaban);
    if (Bt.bentukDari(form) === 'uraian') tambah('Pedoman penskoran', form.rubrik);
    if (bahas) tambah('Pembahasan', form.pembahasan);
    return out;
  }, [form.stimulus, form.pertanyaan, form.opsi, form.kunci, form.pembahasan, form.bentuk, form.jawaban, form.rubrik, bahas, ejaan, kc.ver, tick]);
  // Kata bersorot yang bisa dibereskan lewat kamus. Kata berhubung (rekan-rekan) dipecah: mesin mencari kamus per bagian, bukan per gabungan.
  const masalah = useMemo(() => {
    const peta = new Map();
    for (const b of bagian) for (const d of b.details) {
      if (!d.flagged) continue;
      for (const part of String(d.latin).split('-')) {
        const k = part.toLowerCase();
        if (!k || peta.has(k)) continue;
        const det = P.convertText(part).details.find((x) => x.flagged);
        if (det) peta.set(k, { kata: k, jenis: P.jenisPerbaikan(det.note), note: det.note });
      }
    }
    return [...peta.values()];
  }, [bagian]);
  const salin = async () => { try { await navigator.clipboard.writeText(bagian.map((b) => b.label + '\n' + b.pegon).join('\n\n')); toast('Pegon soal disalin.'); } catch (e) { toast('Penyalinan ditolak browser. Pilih teks lalu salin manual.'); } };
  const simpan = async (m, bersama) => {
    const f = isi[m.kata] || {};
    const en = m.jenis === 'arab' ? { jenis: 'arab', kata: m.kata, arab: f.arab } : { jenis: 'e', kata: m.kata, tipe: f.tipe || 'keras' };
    const cek = P.kamus.bentukEntri(en);
    if (!cek.ok) return toast(cek.pesan);
    if (!bersama) {
      const r = en.jenis === 'arab' ? P.kamus.tambahArab(en.kata, en.arab) : P.kamus.tambahE(en.kata, en.tipe);
      if (r.ok === false) return toast(r.pesan);
      setTick((n) => n + 1); return toast('Disimpan di perangkat ini.');
    }
    setBusy(m.kata);
    try { await kc.simpan([cek.entri]); toast('Disimpan ke kamus bersama.'); }
    catch (e) { toast(e && e.code === 'permission-denied' ? 'Ditolak: hanya editor/admin yang boleh mengubah kamus bersama.' : 'Gagal menyimpan. Periksa koneksi lalu coba lagi.'); }
    finally { setBusy(''); }
  };
  if (!bagian.length) return <p className="mt-3 text-xs text-mute">Isi stimulus, pertanyaan, atau opsi dulu.</p>;
  // Saran perbaikan tulisan Latin per isian (salah ketik/ejaan tidak baku yang membuat Pegon keliru). Hanya isian yang ikut dipegonkan.
  const medan = [['Stimulus', form.stimulus, 'stimulus'], ['Pertanyaan', form.pertanyaan, 'pertanyaan']];
  if (Bt.bentukDari(form) !== 'benarsalah') ['A', 'B', 'C', 'D', 'E'].forEach((k) => medan.push(['Opsi ' + k, (form.opsi || {})[k], 'opsi.' + k]));
  if (Bt.BENTUK[Bt.bentukDari(form)].jawaban) medan.push(['Jawaban', form.jawaban, 'jawaban']);
  if (Bt.bentukDari(form) === 'uraian') medan.push(['Pedoman penskoran', form.rubrik, 'rubrik']);
  if (bahas) medan.push(['Pembahasan', form.pembahasan, 'pembahasan']);
  return (
    <div className="mt-3 space-y-3">
      {onUbah && medan.filter(([, t]) => String(t || '').trim()).map(([label, t, f]) => (
        <SaranTulisan key={f} label={label} teks={String(t)} P={P} ver={kc.ver + tick} Btn={Btn} onUbah={(v) => onUbah(f, v)} />
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[200px]"><EjaanPilih id="pg-soal-ejaan" value={ejaan} onChange={setEjaan} /></div>
        <Btn onClick={salin}><Copy size={16} />Salin Pegon</Btn>
        <label className="inline-flex items-center gap-2 text-xs text-mute"><input type="checkbox" checked={bahas} onChange={(e) => setBahas(e.target.checked)} />Sertakan pembahasan</label>
      </div>
      <div className="space-y-2">
        {bagian.map((b, i) => (
          <div key={i}>
            <p className="text-xs font-semibold text-soft-ink">{b.label}</p>
            <div dir="rtl" lang="ar" className="ar rounded-xl border border-line bg-surface p-3 [&_.flag]:rounded [&_.flag]:bg-warn-bg [&_.flag]:px-0.5"
              dangerouslySetInnerHTML={{ __html: b.html }} />
          </div>
        ))}
      </div>
      <p className="text-xs text-mute">Hanya untuk dilihat dan disalin; isian Latin soal tidak berubah dan tetap dipakai untuk telaah AI, cek kutipan, dan uji buta. Ekspor <b>Soal Pegon (DOCX)</b> memakai kamus yang sama. Transliterasi otomatis perlu diperiksa oleh yang menguasai Pegon.</p>
      {masalah.length > 0 && (
        <div className="rounded-xl bg-warn-bg px-3 py-3 text-warn">
          <p className="font-bold">{masalah.length} kata bersorot. Bila ejaannya sudah Anda ketahui, simpan ke kamus supaya hasil berikutnya benar:</p>
          <div className="mt-2 space-y-2">
            {masalah.map((m) => (
              <div key={m.kata} className="rounded-lg bg-surface p-2 text-ink">
                <p className="text-sm"><b>{m.kata}</b> <span className="text-xs text-mute">— {m.note}</span></p>
                {m.jenis ? (
                  <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                    {m.jenis === 'arab'
                      ? <input className="field ar-sm" dir="rtl" lang="ar" placeholder="Ejaan Arab, mis. توكل" value={(isi[m.kata] || {}).arab || ''} onChange={(e) => setIsi({ ...isi, [m.kata]: { ...(isi[m.kata] || {}), arab: e.target.value } })} />
                      : <Select value={(isi[m.kata] || {}).tipe || 'keras'} onChange={(v) => setIsi({ ...isi, [m.kata]: { ...(isi[m.kata] || {}), tipe: v } })}><option value="keras">e keras (ي)</option><option value="pepet">e pepet (tidak ditulis)</option></Select>}
                    <div className="flex flex-wrap gap-2">
                      {kc.canShare && <Btn kind="primary" disabled={busy === m.kata} onClick={() => simpan(m, true)}>Simpan untuk semua</Btn>}
                      <Btn onClick={() => simpan(m, false)}>{kc.canShare ? 'Hanya di perangkat ini' : 'Simpan di perangkat ini'}</Btn>
                    </div>
                  </div>
                ) : <p className="mt-1 text-xs text-mute">Kasus ini belum bisa diatur lewat kamus; putuskan dan edit manual di hasil Pegon.</p>}
              </div>
            ))}
          </div>
          {!kc.canShare && <p className="mt-2 text-xs">Anda penyusun: simpanan di perangkat ini tidak terlihat oleh rekan. Untuk membagikannya, ekspor kamus di tab Pegonizer dan serahkan ke editor.</p>}
        </div>
      )}
    </div>
  );
}

function Compose({ form, setForm, editingId, onSave, onSend, onReset, toast, ustadz = false }) {
  const cfg = useCfg();
  const babSaran = (React.useContext(SaranCtx).saran || { bab: [] }).bab.map((b) => b.nama);
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [errors, setErrors] = useState([]);
  // Hasil uji buta hanya berlaku untuk isi soal yang diuji: ubah isi, hasilnya dihapus.
  const AFFECT = ['teks', 'stimulus', 'pertanyaan', 'kunci', 'bentuk'];
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v, ...(AFFECT.includes(k) ? { ai: { ...f.ai, buta: '' } } : {}) }));
  const setOpt = (k, v) => setForm((f) => ({ ...f, opsi: { ...f.opsi, [k]: v }, ai: { ...f.ai, buta: '' } }));
  // Mapel mengikuti tingkat: ganti tingkat, mapel yang tidak berlaku di tingkat itu diganti mapel pertama yang berlaku.
  // Kelas dan periode ujian juga mengikuti tingkat: yang tidak berlaku di tingkat baru dikosongkan.
  const pilihTingkat = (v) => setForm((f) => {
    const l = mapelUntuk(cfg, v);
    return { ...f, tingkat: v, mapel: l.includes(f.mapel) || !l.length ? f.mapel : l[0],
      kelas: Uj.kelasUntuk(cfg, v).includes(f.kelas) ? f.kelas : '', periode: Uj.periodeUntuk(cfg, v).some((x) => x.kode === f.periode) ? f.periode : '' };
  });
  const tingkatOpsi = [...new Set([...tingkatAktif(cfg).map((t) => t.nama), form.tingkat])];
  const mapelOpsi = [...new Set([...mapelUntuk(cfg, form.tingkat), form.mapel])];
  const kelasOpsi = [...new Set([...Uj.kelasUntuk(cfg, form.tingkat), form.kelas].filter(Boolean))];
  const periodeOpsi = Uj.periodeUntuk(cfg, form.tingkat).map((x) => ({ kode: x.kode, label: x.label }));
  if (form.periode && !periodeOpsi.some((x) => x.kode === form.periode)) periodeOpsi.push({ kode: form.periode, label: Uj.labelPeriode(cfg, form.tingkat, form.periode) + ' (tidak ada di sistem ujian tingkat ini)' });
  const kitabOpsi = kitabUntuk(cfg, form.tingkat, form.mapel, form.kelas, form.periode);
  const kitabCocok = cariKitab(cfg, form.nama);
  const cakupanTerpilih = kitabCocok && form.kelas && form.periode ? Uj.cakupanKitab(kitabCocok, form.tingkat, form.kelas, form.periode) : '';
  // Isian lokal Compose yang ikut dipulihkan setelah muat ulang atau pindah tab: tautan sumber, halaman situs, mode tambah, fokus soal, nama kitab manual.
  const [ex, setEx] = useState(() => {
    const d = Draft.read('composeEx'); const o = d && typeof d === 'object' ? d : {};
    return { kUrl: typeof o.kUrl === 'string' ? o.kUrl : (form.sumberUrl || ''), kHal: typeof o.kHal === 'string' ? o.kHal : '1', kAppend: o.kAppend === true, fokus: typeof o.fokus === 'string' ? o.fokus : '', kManual: o.kManual === true, kFoto: o.kFoto === true,
      tpl: o.tpl === true, dawr: NK.dauriSah(typeof o.dawr === 'number' ? o.dawr : bacaPref('naskahMeta', { dawr: 1 }).dawr) }; // tpl: mode "ikuti template IMDA"; dawr awal mengikuti pengaturan di tab Export
  });
  const patchEx = (p) => setEx((x) => ({ ...x, ...p }));
  const { kUrl, kHal, kAppend, fokus, kManual, tpl, dawr } = ex; // kManual true: nama kitab diketik manual (di luar katalog)
  const setKUrl = (v) => patchEx({ kUrl: v }); const setKHal = (v) => patchEx({ kHal: v }); const setKAppend = (v) => patchEx({ kAppend: v });
  const setFokus = (v) => patchEx({ fokus: v }); const setKManual = (v) => patchEx({ kManual: v });
  useDraftSync('composeEx', ex, ex.kUrl === (form.sumberUrl || '') && ex.kHal === '1' && !ex.kAppend && !ex.fokus && !ex.kManual && !ex.kFoto && !ex.tpl && ex.dawr === NK.dauriSah(bacaPref('naskahMeta', { dawr: 1 }).dawr));
  const namaDiKatalog = kitabOpsi.some((k) => k.nama === form.nama);
  const pilihKitab = (v) => { if (v === KITAB_LAIN) { setKManual(true); return; } setKManual(false); set('nama', v); };
  // Soal baru: bila isian bawaan (mis. Aliyah/Fiqih) sudah dinonaktifkan admin, mulai dari pilihan yang aktif.
  useEffect(() => {
    if (editingId) return;
    setForm((f) => {
      const t = tingkatAktif(cfg).map((x) => x.nama); const tk = t.includes(f.tingkat) || !t.length ? f.tingkat : t[0];
      const m = mapelUntuk(cfg, tk); const mp = m.includes(f.mapel) || !m.length ? f.mapel : m[0];
      return tk === f.tingkat && mp === f.mapel ? f : { ...f, tingkat: tk, mapel: mp };
    });
  }, [cfg, editingId]);
  const [pg, setPg] = useState(false); // panel Pegonkan
  const [butaState, setButaState] = useState(null);
  const ujiButa = async (soal, bentuk = form.bentuk) => {
    setButaState({ loading: true });
    try {
      const d = await callApi('/api/assist', { aksi: 'cekbuta', teks: form.teks, bahasa: bahasaOtomatis(form.teks), nama: form.nama, tingkat: form.tingkat, level: form.level, bentuk, soal });
      setButaState({ data: d.hasil });
      const st = d.hasil.status === 'sepakat' || d.hasil.status === 'beda' ? d.hasil.status : '';
      setForm((f) => ({ ...f, ai: { ...f.ai, buta: st } }));
    } catch (e) { const er = apiErr(e); setButaState(er ? { error: er } : null); }
  };

  const [status, setStatus] = useState('idle');
  const [apiError, setApiError] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const abortRef = useRef(null);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const ARAB = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
  const arabicProblem = (txt) => {
    let letters = 0, arab = 0;
    for (const ch of txt) { if (/\p{L}/u.test(ch)) { letters++; if (ARAB.test(ch)) arab++; } }
    if (letters < 15) return 'Teks terlalu pendek. Tempel minimal satu kalimat lengkap.';
    // Teks berhuruf Latin (buku Indonesia, Jawa, Inggris, dst.) diterima; teks Arab tetap harus dominan Arab bila memang berhuruf Arab.
    if (bahasaOtomatis(txt) === 'ar' && arab / letters < 0.6) return 'Teks kitab terdeteksi campuran Arab dan huruf lain. Tempel satu bahasa saja per soal.';
    return null;
  };
  const ERR_TITLE = {
    INVALID_ARABIC: 'Teks Arab tidak valid', DILUAR_CAKUPAN: 'Materi di luar cakupan ujian', TEKS_TIDAK_MEMADAI: 'Teks belum cukup untuk dijadikan soal', TEKS_TOO_LONG: 'Teks terlalu panjang',
    RATE_LIMIT: 'Batas permintaan tercapai', RATE_LIMIT_LOCAL: 'Batas permintaan tercapai',
    AI_OVERLOADED: 'Layanan AI sedang sibuk', AI_TIMEOUT: 'AI terlalu lama merespons', AI_BAD_OUTPUT: 'Hasil AI tidak bisa dipakai', AI_MENOLAK: 'AI menolak memproses teks ini',
    SOAL_KOSONG: 'Naskah soal belum lengkap', AUTH_REQUIRED: 'Sesi berakhir', FORBIDDEN_ROLE: 'Akun belum disetujui', RATE_LIMIT_DAILY: 'Kuota harian habis',
    FAKTA_TIDAK_VALID: 'Fakta tidak cocok dengan teks', NETWORK: 'Tidak terhubung ke server', SERVER_NOT_CONFIGURED: 'Server belum dikonfigurasi', SERVER_AUTH: 'Kunci API server bermasalah',
  };

  const generate = async (fakta = null) => { // fakta: satu butir hasil ekstrak (pipeline); tanpa itu alur lama utuh
    setErrors([]); setApiError(null);
    const bad = arabicProblem(form.teks.trim());
    if (bad) { setApiError({ code: 'INVALID_ARABIC', message: bad }); return; }
    setBusy(true); setStatus('loading');
    const ctl = new AbortController(); abortRef.current = ctl;
    try {
      const res = await fetch('/api/generate', {
        method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await firebase.auth().currentUser.getIdToken()) },
        body: JSON.stringify({ teks: form.teks, bahasa: bahasaOtomatis(form.teks), nama: form.nama, juz: form.juz, hal: form.hal, tingkat: form.tingkat, kelas: form.kelas, mapel: form.mapel, level: form.level, bentuk: form.bentuk, fokus, kitabId: form.kitabId, cakupan: cakupanTerpilih, ujian: form.periode ? Uj.labelPeriode(cfg, form.tingkat, form.periode) : '', ...(fakta ? { faktaTerikat: faktaTerikatDari(fakta) } : {}) }),
      });
      let data = null;
      try { data = await res.json(); } catch (e) {}
      if (!res.ok) {
        const err = (data && data.error) || { code: 'HTTP_' + res.status, message: `Server mengembalikan error ${res.status}.` };
        setApiError(err);
        if (res.status === 429 && err.code !== 'RATE_LIMIT_DAILY') setCooldown(Math.max(1, Math.min(120, Number(err.retryAfter) || 30)));
        return;
      }
      const s = data.soal;
      if (data.peringatanOtoritas) toast(data.peringatanOtoritas); // kitab pembanding/di luar rumpun/belum dinilai: ustadz perlu menelaah
      const bt = Bt.bentukDari(s.bentuk || form.bentuk); // soal pilihan ganda dari server lama/baru tidak membawa `bentuk`
      setForm((f) => ({
        ...f,
        bentuk: bt, jawaban: s.jawaban || '', rubrik: s.rubrik || '',
        stimulus: s.stimulus || '', pertanyaan: s.pertanyaan || '',
        opsi: { A: s.pilihan_a || '', B: s.pilihan_b || '', C: s.pilihan_c || '', D: s.pilihan_d || '', E: s.pilihan_e || '' },
        kunci: s.kunci_jawaban || '', pembahasan: s.pembahasan || '', indikator: s.indikator_kisi_kisi || '',
        ai: { dibuat: true, model: String(data.model || '').slice(0, 60), verifikasi: (data.verifikasi && data.verifikasi.status) || '', buta: '' },
      }));
      setGenerated(true);
      if (fakta) { setTerpakai((t) => (t.includes(fakta.id) ? t : [...t, fakta.id])); setJejak({ fakta: s.fakta_dasar || fakta.fakta, kutipan: fakta.kutipan, alasan: s.alasan_pengecoh || '' }); } else setJejak(null);
      if (s.cakupan_status === 'tidak_jelas') toast(`Cakupan "${cakupanTerpilih}" tidak bisa dipastikan dari teks ini (judul bab tidak ada). Periksa sendiri apakah soal masuk cakupan.`);
      if (Bt.punyaOpsi(bt)) ujiButa({ stimulus: s.stimulus || '', pertanyaan: s.pertanyaan || '', opsi: { A: s.pilihan_a, B: s.pilihan_b, C: s.pilihan_c, D: s.pilihan_d, E: s.pilihan_e }, kunci: s.kunci_jawaban }, bt); else setButaState(null); // tanpa await: tidak menahan tampilan soal
    } catch (e) {
      if (e && e.name === 'AbortError') { /* dibatalkan pengguna */ }
      else setApiError({ code: 'NETWORK', message: 'Tidak dapat menghubungi server. Periksa koneksi internet lalu coba lagi.' });
    } finally { setBusy(false); setStatus('idle'); abortRef.current = null; }
  };

  const [kBusy, setKBusy] = useState(false);
  const [kErr, setKErr] = useState(null);
  const [kInfo, setKInfo] = useState(null);
  const [kGagal, setKGagal] = useState('');
  const fileRef = useRef(null);
  const [ai, setAi] = useState(null);     // {kind, loading, data, error}
  const [tl, setTl] = useState(null);     // telaah {loading, data, error}
  const [undo, setUndo] = useState(null);

  const fetchKitab = async (url, append) => {
    setKErr(null); setKGagal(''); setKBusy(true);
    try {
      const d = await callApi('/api/kitab', { url });
      const src = d.sumber;
      setForm((f) => ({
        ...f,
        teks: append && f.teks.trim() ? f.teks.trim() + '\n' + src.teks : src.teks,
        sumberUrl: src.url, nama: f.nama || src.nama || '', hal: append && f.hal ? f.hal : (src.hal || f.hal),
      }));
      setKUrl(src.url); setKInfo(src);
    } catch (e) { const er = apiErr(e); if (er) setKErr(er); setKGagal(url); }
    finally { setKBusy(false); }
  };
  // Halaman dari perpustakaan -> Rujukan Kitab. Ganti = teks sumber lain (tautan, foto) tidak berlaku lagi; tambah = lanjutan bahasan.
  const pakaiPerpus = (r, { tambah }) => {
    if (tambah && form.teks.trim() && form.nama.trim() && form.nama.trim().toLowerCase() !== r.nama.toLowerCase()
      && !window.confirm(`Teks saat ini dari "${form.nama}". Menambahkan halaman dari "${r.nama}" mencampur dua kitab dalam satu soal. Lanjutkan?`)) return;
    const baruRj = rujukanDariHalaman(r.kitabId, r.halaman);
    setForm((f) => ({ ...f, nama: r.nama, juz: r.juz, hal: r.hal, bab: r.bab, teks: r.teks, ...(tambah ? gabungRujukan({ kitabId: f.kitabId, halId: f.halId, halIdAkhir: f.halIdAkhir }, baruRj) : baruRj), ...(tambah ? {} : { sumberUrl: '' }), ai: { ...f.ai, buta: '' } }));
    if (!tambah) { setKInfo(null); setKErr(null); setKManual(false); patchEx({ kFoto: false }); setFotoInfo(null); }
    toast(`Teks kitab diisi dari perpustakaan: hal. ${r.hal}.`);
  };
  const importFile = (file) => {
    if (!file) return;
    if (file.size > 500000) { setKErr({ code: 'FILE', message: 'File terlalu besar (maksimal 500 KB). Ambil satu bagian saja.' }); return; }
    const r = new FileReader();
    r.onload = () => {
      let txt = String(r.result || '');
      if (/\.html?$/i.test(file.name)) txt = new DOMParser().parseFromString(txt, 'text/html').body.textContent || '';
      txt = cleanArabic(txt);
      if (!txt) { setKErr({ code: 'FILE', message: 'File kosong.' }); return; }
      setKErr(null); setKInfo(null);
      setForm((f) => ({ ...f, teks: txt }));
    };
    r.onerror = () => setKErr({ code: 'FILE', message: 'File tidak bisa dibaca.' });
    r.readAsText(file, 'utf-8');
  };
  // Baca teks Arab dari foto halaman kitab fisik (OCR oleh AI). Hasil selalu perlu dikoreksi pengguna: harakat dan huruf bisa salah baca.
  const fotoRef = useRef(null); const kameraRef = useRef(null);
  const [fotoBusy, setFotoBusy] = useState(false);
  const [fotoInfo, setFotoInfo] = useState(null); // { kualitas, ragu[], terpotong }
  const bacaFoto = async (file) => {
    if (!file || fotoBusy) return;
    if (form.teks.trim() && !kAppend && !window.confirm('Teks Kitab sudah terisi. Hasil foto akan MENGGANTI teks itu. Lanjutkan? (Centang "Tambahkan ke teks yang sudah ada" bila ingin menyambung.)')) return;
    setFotoBusy(true); setKErr(null); setKInfo(null);
    try {
      const gambar = await siapkanFoto(file, 2000); // harakat kecil: butuh resolusi lebih tinggi dari foto Pegon (1.600 px)
      const d = await callApi('/api/assist', { aksi: 'fotokitab', gambar });
      const h = d.hasil;
      setForm((f) => ({ ...f, teks: kAppend && f.teks.trim() ? f.teks.trimEnd() + '\n\n' + h.teks : h.teks }));
      setFotoInfo({ kualitas: h.kualitas, ragu: h.ragu || [], terpotong: !!h.terpotong });
      patchEx({ kFoto: true });
    } catch (e) { setKErr(apiErr(e)); } finally { setFotoBusy(false); }
  };
  const selesaiKoreksiFoto = () => { patchEx({ kFoto: false }); setFotoInfo(null); };
  const cleanText = () => setForm((f) => ({ ...f, teks: cleanArabic(f.teks) }));
  // Reset Rujukan Kitab: nama, juz, halaman, teks, tautan sumber, dan semua keadaan pengambilan. Naskah soal (pertanyaan, opsi, dst.) tidak disentuh.
  const rujukanTerisi = !!(form.nama || form.juz || form.hal || form.teks || form.sumberUrl || kUrl || kInfo || kErr || ai || fokus);
  const resetRujukan = () => {
    if (form.teks.trim() && !window.confirm('Kosongkan Rujukan Kitab (nama kitab, juz, halaman, teks, dan tautan sumber)? Naskah soal tidak ikut dihapus.')) return;
    setForm((f) => ({ ...f, nama: '', juz: '', hal: '', teks: '', sumberUrl: '', ai: { ...f.ai, buta: '' } }));
    setKUrl(''); setKErr(null); setKInfo(null); setKGagal(''); setKAppend(false); setKHal('1'); setKManual(false);
    setAi(null); setFokus(''); setApiError(null);
    toast('Rujukan kitab dikosongkan.');
  };

  // Pipeline soal: fakta atomik dari teks (kutipan diperiksa kode) -> satu fakta dipilih -> soal terikat fakta itu.
  const [fk, setFk] = useState(null);           // {loading, data:{fakta,dibuang}, teks, error}
  const [terpakai, setTerpakai] = useState([]); // id fakta yang sudah dijadikan soal pada teks ini
  const [jejak, setJejak] = useState(null);     // {fakta, kutipan, alasan}: dasar soal terakhir (tidak disimpan ke soal)
  const runFakta = async () => {
    const bad = arabicProblem(form.teks.trim());
    if (bad || bahasaOtomatis(form.teks) !== 'ar') { setFk({ error: { code: 'INVALID_ARABIC', message: bad || 'Ekstrak fakta hanya tersedia untuk teks Arab.' } }); return; }
    const teks = form.teks; setFk({ loading: true }); setTerpakai([]);
    try {
      const d = await callApi('/api/assist', { aksi: 'fakta', teks, nama: form.nama, tingkat: form.tingkat, mapel: form.mapel, kitabId: form.kitabId });
      if (d.peringatanOtoritas) toast(d.peringatanOtoritas);
      setFk({ data: d.hasil, teks });
    } catch (e) { const er = apiErr(e); setFk(er ? { error: er } : null); }
  };
  const buatDariFakta = (f) => { if (!busy && cooldown <= 0) generate(f); };
  const faktaOtomatis = () => {
    const { fakta, habis } = pilihFaktaBerikut(fk.data.fakta, terpakai, { bentuk: form.bentuk, level: form.level });
    if (!fakta) return;
    if (habis) toast('Semua fakta sudah dipakai; dipilih yang paling cocok dan akan mirip soal sebelumnya.');
    buatDariFakta(fakta);
  };

  const runAssist = async (kind) => {
    const bad = bahasaOtomatis(form.teks) !== 'ar' && form.teks.trim() ? 'Terjemah dan analisis kata hanya tersedia untuk teks Arab.' : arabicProblem(form.teks.trim());
    if (bad) { setAi({ kind, error: { code: 'INVALID_ARABIC', message: bad } }); return; }
    setAi({ kind, loading: true });
    try {
      const d = await callApi('/api/assist', { aksi: kind, teks: form.teks, nama: form.nama, tingkat: form.tingkat, mapel: form.mapel, kitabId: form.kitabId });
      if (d.peringatanOtoritas) toast(d.peringatanOtoritas);
      setAi({ kind, data: d.hasil });
    } catch (e) { const er = apiErr(e); setAi(er ? { kind, error: er } : null); }
  };
  const useIdea = (x) => { set('level', x.level); setFokus(x.fokus); toast('Fokus dipilih. Tekan Generate untuk membuat soalnya.'); };

  const runTelaah = async () => {
    const bad = arabicProblem(form.teks.trim());
    if (bad) { setTl({ error: { code: 'INVALID_ARABIC', message: bad } }); return; }
    setTl({ loading: true });
    try {
      const d = await callApi('/api/assist', {
        aksi: 'telaah', teks: form.teks, bahasa: bahasaOtomatis(form.teks), nama: form.nama, juz: form.juz, hal: form.hal, tingkat: form.tingkat, mapel: form.mapel, level: form.level, bentuk: form.bentuk, kitabId: form.kitabId,
        soal: { stimulus: form.stimulus, pertanyaan: form.pertanyaan, opsi: form.opsi, kunci: form.kunci, pembahasan: form.pembahasan, indikator: form.indikator, jawaban: form.jawaban, rubrik: form.rubrik },
      });
      setTl({ data: d.hasil });
      if (d.peringatanOtoritas) toast(d.peringatanOtoritas);
    } catch (e) { const er = apiErr(e); setTl(er ? { error: er } : null); }
  };
  const applyFix = () => {
    const p = tl.data.perbaikan;
    setUndo({ ...form, opsi: { ...form.opsi } });
    setForm((f) => ({ ...f, stimulus: p.stimulus, pertanyaan: p.pertanyaan, opsi: { A: p.pilihan_a, B: p.pilihan_b, C: p.pilihan_c, D: p.pilihan_d, E: p.pilihan_e },
      kunci: p.kunci_jawaban, pembahasan: p.pembahasan, indikator: p.indikator_kisi_kisi, jawaban: p.jawaban || '', rubrik: p.rubrik || '', ai: { ...f.ai, buta: '' } }));
    setTl(null); toast('Perbaikan diterapkan. Tombol Urungkan tersedia.');
  };
  const undoFix = () => { setForm(undo); setUndo(null); };

  const validate = () => {
    const e = [];
    if (!form.teks.trim()) e.push('Teks kitab belum diisi.');
    if (!form.nama.trim()) e.push('Nama kitab belum diisi.');
    e.push(...Bt.periksaSoal(form)); // pertanyaan, opsi/kunci atau jawaban, dan pembahasan, sesuai bentuk soal
    return e;
  };
  const send = () => { const e = validate(); setErrors(e); if (!e.length) onSend(); };
  const save = () => {
    if (!form.pertanyaan.trim() && !form.teks.trim()) { setErrors(['Isi minimal teks kitab atau pertanyaan sebelum menyimpan draft.']); return; }
    setErrors([]); onSave();
  };

  return (
    <div className="fade-in grid gap-5 lg:grid-cols-12">
      <div className="min-w-0 space-y-5 lg:col-span-5">
        <Section title="Data Soal" icon={Layers}>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div><Label htmlFor="tingkat">Tingkat</Label>
              <Select id="tingkat" value={form.tingkat} onChange={pilihTingkat}>{tingkatOpsi.map((t) => <option key={t} value={t}>{labelTingkat(cfg, t)}</option>)}</Select>
              {labelArabTingkat(cfg, form.tingkat) && <p className="mt-1 text-xs text-mute"><ArNama>{labelArabTingkat(cfg, form.tingkat)}</ArNama></p>}</div>
            <div><Label htmlFor="mapel">Mata Pelajaran</Label>
              <Select id="mapel" value={form.mapel} onChange={(v) => set('mapel', v)}>{mapelOpsi.map((t) => <option key={t}>{t}</option>)}</Select></div>
            <div><Label htmlFor="level">Tingkat Kesukaran</Label>
              <Select id="level" value={form.level} onChange={(v) => set('level', v)}>{LEVEL.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}</Select></div>
          </div>
          <div className="mt-3 rounded-xl border border-line bg-bg p-3">
            <Label htmlFor="cara-susun">Cara Penyusunan</Label>
            <div id="cara-susun" role="radiogroup" aria-label="Cara penyusunan soal" className="flex flex-wrap gap-2">
              {[[false, 'Bebas'], [true, 'Ikuti template IMDA']].map(([v, t]) => (
                <button key={String(v)} type="button" role="radio" aria-checked={tpl === v} onClick={() => patchEx({ tpl: v })}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${tpl === v ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink hover:border-brand'}`}>{t}</button>
              ))}
            </div>
            {!tpl && <p className="mt-1 text-xs leading-relaxed text-mute">Form seperti biasa: semua bentuk soal, narasi, dan lima opsi. Nyalakan <b>Ikuti template IMDA</b> bila soal ini akan dicetak ke naskah Dauri I–IV.</p>}
            {tpl && (
              <div className="mt-2 space-y-2">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <div><Label htmlFor="tpl-dauri">Dauri</Label>
                    <Select id="tpl-dauri" value={String(dawr)} onChange={(v) => patchEx({ dawr: NK.dauriSah(v) })}>
                      {NK.DAFTAR_DAURI.map((d) => <option key={d.dawr} value={d.dawr}>{d.label}</option>)}
                    </Select></div>
                  <div className="text-xs leading-relaxed text-mute sm:pt-6 lg:pt-0 xl:pt-6">{NK.ringkasDauri(dawr)} <span className="whitespace-nowrap">(nomor × nilai)</span></div>
                </div>
                {(() => {
                  const kode = NK.bagianDari(form); const bg = kode ? NK.ringkasBagian(dawr, kode) : null;
                  return bg ? (
                    <p className="text-xs leading-relaxed text-soft-ink">Masuk bagian <b>{bg.huruf}</b> ({bg.label}): {bg.n} nomor, nilai {bg.nilai} per nomor. <span dir="rtl" lang="ar" className="ar-nama">{bg.judul}</span></p>
                  ) : null;
                })()}
                {NK.catatanTemplate(form, dawr).map((t, i) => <p key={i} role="status" className="rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn">{t}</p>)}
                <p className="text-xs leading-relaxed text-mute">Template memuat tiga opsi (أ ب ج) dan satu kalimat soal ringkas per nomor (sekitar 150 karakter). Saat diekspor, kalimat soal, opsi, dan jawaban ditulis dalam Pegon. Isian di form tetap tersimpan utuh dalam Latin; mode ini hanya menyaring tampilan dan memberi catatan.</p>
              </div>
            )}
          </div>
          <div className="mt-3">
            <Label htmlFor="bentuk-soal">Bentuk Soal</Label>
            <div id="bentuk-soal" role="radiogroup" aria-label="Bentuk soal" className="flex flex-wrap gap-2">
              {(tpl ? Bt.BENTUK_IDS.filter((id) => NK.BENTUK_TEMPLATE.includes(id)) : Bt.BENTUK_IDS).map((id) => {
                const aktif = form.bentuk === id; const saran = Bt.dianjurkan(form.tingkat, id) && Bt.bentukUntukTingkat(form.tingkat).length < Bt.BENTUK_IDS.length;
                return (
                  <button key={id} type="button" role="radio" aria-checked={aktif} onClick={() => set('bentuk', id)} title={Bt.BENTUK[id].ket + ' Contoh: ' + Bt.BENTUK[id].contoh}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${aktif ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink hover:border-brand'}`}>
                    {Bt.BENTUK[id].label}{saran && !aktif ? ' ★' : ''}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-mute">{Bt.BENTUK[Bt.bentukDari(form)].ket} Contoh: <i>{Bt.BENTUK[Bt.bentukDari(form)].contoh}</i>{Bt.bentukUntukTingkat(form.tingkat).length < Bt.BENTUK_IDS.length ? ' ★ = dianjurkan untuk jenjang ini (saran awal, bukan batasan).' : ''}</p>
            {Bt.bentukDari(form) === 'isian' && form.level === 'L3' && <p className="mt-1 text-xs text-warn">Soal isian jarang cocok untuk tingkat HOTS (L3); pertimbangkan bentuk Uraian.</p>}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div><Label htmlFor="kelas" hint="(opsional)">Kelas</Label>
              <Select id="kelas" value={form.kelas} onChange={(v) => set('kelas', v)}>
                <option value="">{kelasOpsi.length ? '— Belum dipilih —' : '— Belum ada kelas di Konfigurasi —'}</option>
                {kelasOpsi.map((k) => <option key={k} value={k}>Kelas {k}</option>)}</Select></div>
            <div><Label htmlFor="periode" hint={Uj.labelSistem(cfg, form.tingkat) ? `(${Uj.labelSistem(cfg, form.tingkat)})` : '(opsional)'}>Ujian</Label>
              <Select id="periode" value={form.periode} onChange={(v) => set('periode', v)}>
                <option value="">{periodeOpsi.length ? '— Belum dipilih —' : '— Belum ada periode ujian —'}</option>
                {periodeOpsi.map((x) => <option key={x.kode} value={x.kode}>{x.label}</option>)}</Select></div>
          </div>
          <p className="mt-2 text-xs text-mute">Kelas dan ujian menyaring pilihan kitab di bawah sesuai pemetaan di menu Konfigurasi, dan ikut tersimpan pada soal.</p>
        </Section>

        <Section title="Rujukan Kitab" icon={BookOpen}
          action={<button type="button" onClick={resetRujukan} disabled={kBusy || !rujukanTerisi} className="inline-flex items-center gap-1 text-xs font-semibold text-mute hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"><RotateCcw size={13} />Reset</button>}>
          <div className="space-y-3">
            <div className="space-y-2 rounded-xl border border-line bg-bg p-3 max-sm:border-0 max-sm:bg-transparent max-sm:p-0">
              <PemilihKitab Btn={Btn} ErrorBox={ErrorBox} callApi={callApi} apiErr={apiErr} katalog={cfg.kitab} mode="form" onPakai={pakaiPerpus}
                sekarang={{ teks: form.teks, hal: form.hal, bab: form.bab }} batas={6000} />
              {rujukanSah(form) && (
                <p role="status" className="flex flex-wrap items-center gap-2 rounded-lg bg-soft px-3 py-2 text-xs text-soft-ink">
                  <BookOpen size={13} />Tertaut ke perpustakaan: <b>{form.nama || form.kitabId}</b>, urutan {rentangRujukan(form).dari}{rentangRujukan(form).sampai > rentangRujukan(form).dari ? `–${rentangRujukan(form).sampai}` : ''}.
                  <a href={hashBaca(form)} target="_blank" rel="noreferrer" className="underline">Buka di kitab</a>
                  <button type="button" className="ml-auto underline" onClick={() => setForm((f) => ({ ...f, kitabId: '', halId: '', halIdAkhir: '' }))}>Lepas tautan</button>
                </p>)}
              {rujukanSah(form) && <PeriksaRujukan Btn={Btn} ErrorBox={ErrorBox} callApi={callApi} apiErr={apiErr} soal={form} />}
              {kitabCocok && kitabCocok.tautan && (
                <div className="space-y-2 rounded-lg bg-soft p-2.5">
                  <p className="text-xs font-semibold text-soft-ink">Kitab ini punya tautan sumber</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <a href={kitabCocok.tautan} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-soft-ink underline">Buka di situs ↗</a>
                    <label htmlFor="khal" className="text-xs text-mute">Halaman situs</label>
                    <input id="khal" type="number" min="1" inputMode="numeric" className="field !w-24 !py-1.5" value={kHal} onChange={(e) => setKHal(e.target.value)} />
                    <Btn kind="soft" className="!px-3 !py-1.5 !text-xs" disabled={kBusy || !urlHalaman(kitabCocok.tautan, kHal)} onClick={() => { const u = urlHalaman(kitabCocok.tautan, kHal); setKUrl(u); fetchKitab(u, kAppend); }}>Ambil halaman {kHal}</Btn>
                  </div>
                  <p className="text-xs leading-relaxed text-mute">Nomor di sini adalah urutan halaman pada situs (bagian akhir alamat), bukan selalu nomor halaman cetak. Nomor cetak terisi otomatis dari judul halaman.</p>
                </div>
              )}
              <Label htmlFor="kurl">Ambil teks dari tautan</Label>
              <div className="flex gap-2">
                <input id="kurl" type="text" inputMode="url" autoCapitalize="none" spellCheck={false} className="field min-w-0" placeholder="shamela.ws/book/…/…" value={kUrl} onChange={(e) => setKUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && kUrl.trim() && !kBusy) { e.preventDefault(); fetchKitab(kUrl, kAppend); } }} />
                <Btn kind="soft" className="shrink-0" onClick={() => fetchKitab(kUrl, kAppend)} disabled={kBusy || !kUrl.trim()}>
                  {kBusy ? <Loader2 size={16} className="spin" /> : <Download size={16} />}Ambil
                </Btn>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href="https://shamela.ws/" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-soft-ink hover:bg-soft">Buka shamela.ws ↗</a>
                <a href="https://al-maktaba.org/" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-soft-ink hover:bg-soft">Buka al-maktaba.org ↗</a>
                {form.nama.trim() && <a href={cariGoogle(form.nama.trim())} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-soft-ink hover:bg-soft">Cari “{form.nama.trim().slice(0, 24)}” di Shamela ↗</a>}
              </div>
              {(pageNav(kUrl, -1) || pageNav(kUrl, 1)) && (
                <div className="flex flex-wrap items-center gap-2">
                  <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" disabled={kBusy || !pageNav(kUrl, -1)} onClick={() => fetchKitab(pageNav(kUrl, -1), kAppend)}>Halaman sebelumnya</Btn>
                  <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" disabled={kBusy || !pageNav(kUrl, 1)} onClick={() => fetchKitab(pageNav(kUrl, 1), kAppend)}>Halaman berikutnya</Btn>
                </div>
              )}
              <label htmlFor="kappend" className="flex items-center gap-2 text-xs text-mute">
                <input id="kappend" type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={kAppend} onChange={(e) => setKAppend(e.target.checked)} />
                Tambahkan ke teks yang sudah ada (bahasan berlanjut ke halaman lain)
              </label>
              {kInfo && <p className="text-xs leading-relaxed text-soft-ink">Diambil dari {kInfo.host}{kInfo.judul ? ' · ' + kInfo.judul : ''}{kInfo.terpotong ? '. Teks dipotong pada 6.000 karakter.' : ''} Periksa dan sunting teks sebelum dipakai.</p>}
              {kErr && <ErrorBox e={kErr} />}
              {kErr && /^https:\/\//.test(kGagal) && <a href={kGagal} target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-soft-ink underline">Buka halaman ini di tab baru ↗</a>}
              <div className="flex flex-wrap gap-2 pt-1">
                <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => fileRef.current && fileRef.current.click()}><FileText size={14} />Impor file .txt</Btn>
                <input ref={fileRef} type="file" accept=".txt,.htm,.html,text/plain,text/html" className="hidden" aria-label="Impor file teks kitab" onChange={(e) => { importFile(e.target.files[0]); e.target.value = ''; }} />
                <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => kameraRef.current && kameraRef.current.click()} disabled={fotoBusy}>{fotoBusy ? <Loader2 size={14} className="spin" /> : <Camera size={14} />}{fotoBusy ? 'Membaca foto…' : 'Foto kitab (kamera)'}</Btn>
                <input ref={kameraRef} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Ambil foto halaman kitab dengan kamera" onChange={(e) => { bacaFoto(e.target.files[0]); e.target.value = ''; }} />
                <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => fotoRef.current && fotoRef.current.click()} disabled={fotoBusy}><Upload size={14} />Foto dari galeri</Btn>
                <input ref={fotoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="Pilih foto halaman kitab dari galeri" onChange={(e) => { bacaFoto(e.target.files[0]); e.target.value = ''; }} />
                <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={cleanText} disabled={!form.teks.trim()}>Bersihkan teks</Btn>
              </div>
              <details className="text-xs text-mute"><summary className="font-semibold text-soft-ink">Bantuan mengambil teks kitab</summary>
                <div className="mt-1 space-y-2 leading-relaxed"><p>Situs yang didukung: shamela.ws, al-maktaba.org, islamweb.net, ar.wikisource.org, archive.org, ketabonline.com (hasilnya belum tentu bersih). Satu halaman per permintaan. Tautan boleh ditempel tanpa https://.</p><p>Cara cepat: buka kitabnya di situs, pindah ke halaman yang dibutuhkan, salin alamat di bilah browser, lalu tempel di kolom di atas.</p><p>Maktabah Syamilah versi desktop tidak bisa diakses dari web. Salin teks dari aplikasinya (atau ekspor ke .txt), tempel di kolom Teks Kitab, lalu tekan Bersihkan teks untuk membuang penanda halaman dan nomor catatan kaki.</p></div></details>
            </div>
            <div><Label htmlFor="nama">Nama Kitab</Label>
              <Select id="nama" value={kManual ? KITAB_LAIN : form.nama} onChange={pilihKitab}>
                <option value="">{kitabOpsi.length ? '— Pilih kitab —' : '— Belum ada kitab untuk pilihan tingkat, kelas, ujian, dan mapel ini —'}</option>
                {kitabOpsi.map((k) => <option key={k.nama} value={k.nama}>{[k.pengarang ? `${k.nama} · ${k.pengarang}` : k.nama, k.namaArab].filter(Boolean).join(' — ')}</option>)}
                {!kManual && form.nama && !namaDiKatalog && <option value={form.nama}>{form.nama} (di luar katalog)</option>}
                <option value={KITAB_LAIN}>Lainnya (ketik manual)…</option>
              </Select>
              {kManual && <input id="nama-manual" aria-label="Nama kitab (ketik manual)" autoFocus className="field mt-2" placeholder="Ketik nama kitab" value={form.nama} onChange={(e) => set('nama', e.target.value)} />}
              {!kitabOpsi.length && <p className="mt-1 text-xs text-mute">Admin bisa menambahkan kitab, atau memetakannya ke {labelTingkat(cfg, form.tingkat)}{form.kelas ? ` kelas ${form.kelas}` : ''} · {form.mapel}, di menu Konfigurasi. Sementara itu pilih “Lainnya”.</p>}
              {cakupanTerpilih && <p className="mt-1 text-xs text-soft-ink">Cakupan materi kitab ini pada kelas {form.kelas} · {Uj.labelPeriode(cfg, form.tingkat, form.periode)}: {cakupanTerpilih}. AI wajib membatasi soal pada cakupan ini; soal di luar cakupan ditolak.</p>}
              {!cakupanTerpilih && form.nama && <p role="status" className="mt-1 text-xs text-warn">Batas materi TIDAK berlaku: {!form.kelas || !form.periode ? 'pilih Kelas dan Ujian' : !kitabCocok ? 'nama kitab tidak ditemukan di katalog Konfigurasi (pilih dari daftar, bukan ketik manual)' : 'admin belum mengisi cakupan materi kitab ini untuk kelas dan ujian tersebut'}. Tanpa batas, AI boleh memakai bagian mana pun dari teks yang ditempel.</p>}
              {kitabCocok && (kitabCocok.namaArab || kitabCocok.pengarangArab) && (
                <div className="mt-2 rounded-xl bg-soft px-4 py-2 text-soft-ink">
                  {kitabCocok.namaArab && <p dir="rtl" lang="ar" className="ar ar-sm !leading-normal">{kitabCocok.namaArab}</p>}
                  {kitabCocok.pengarangArab && <p dir="rtl" lang="ar" className="ar-nama text-sm opacity-80">{kitabCocok.pengarangArab}</p>}
                </div>)}
              {kitabCocok && kitabCocok.pengarang && <p className="mt-1 text-xs text-mute">Pengarang: {kitabCocok.pengarang}</p>}</div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="juz">Juz / Volume</Label><input id="juz" className="field" placeholder="1" value={form.juz} onChange={(e) => set('juz', e.target.value)} /></div>
              <div><Label htmlFor="hal">Halaman</Label><input id="hal" className="field" placeholder="8" value={form.hal} onChange={(e) => set('hal', e.target.value)} /></div>
            </div>
            <div><Label htmlFor="bab" hint="(untuk kisi-kisi)">Bab / Materi</Label>
              <input id="bab" list="daftar-bab" maxLength={120} className="field" placeholder="mis. Bab Thaharah" value={form.bab} onChange={(e) => set('bab', e.target.value)} />
              <datalist id="daftar-bab">{babSaran.map((b) => <option key={b} value={b} />)}</datalist>
              <p className="mt-1 text-xs text-mute">Soal dengan bab yang sama dikelompokkan di kisi-kisi. {babSaran.length ? 'Pilihan berasal dari saran AI di tab Fokus Ujian.' : 'Tab Fokus Ujian bisa menyarankan bab yang penting.'}</p></div>
            <div><Label htmlFor="teks">Teks Kitab</Label>
              <textarea id="teks" {...tampilanDariIsi(form.teks, 'field')} rows={7} placeholder="الصق النص هنا (عربي أو لغة أخرى)... / Tempel teks kitab atau buku di sini" value={form.teks} onChange={(e) => set('teks', e.target.value)} />
              <p className={`mt-1 text-xs ${form.teks.length > 6000 ? 'font-semibold text-bad' : 'text-mute'}`}>
                {form.teks.length.toLocaleString('id-ID')} / 6.000 karakter{form.teks.length > 6000 ? '. Potong teks agar bisa diproses AI.' : ''}
              </p>
              {ex.kFoto && (
                <div role="status" className="mt-2 space-y-2 rounded-xl bg-warn-bg px-3 py-3 text-xs leading-relaxed text-warn">
                  <p className="font-semibold">Teks ini dibaca AI dari foto dan belum dikoreksi.{fotoInfo ? ` Kualitas bacaan: ${fotoInfo.kualitas}.` : ''}</p>
                  <p>Cocokkan huruf dan harakat dengan kitab fisik sebelum membuat soal. Pemeriksaan kutipan memakai teks ini sebagai rujukan, jadi kesalahan baca akan ikut dianggap benar.{fotoInfo && fotoInfo.terpotong ? ' Teks dipotong pada 6.000 karakter; foto halaman berikutnya terpisah.' : ''}</p>
                  {fotoInfo && fotoInfo.ragu.length > 0 && (
                    <ul className="list-disc space-y-0.5 pl-5">{fotoInfo.ragu.map((w, i) => <li key={i}><span className="ar" dir="rtl" lang="ar">{w.kata}</span>{w.catatan ? `: ${w.catatan}` : ''}</li>)}</ul>
                  )}
                  <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={selesaiKoreksiFoto}>Sudah saya cocokkan dengan kitab</Btn>
                </div>
              )}
              {form.sumberUrl && <p className="mt-1 text-xs text-mute">Sumber tersimpan: <SourceLink url={form.sumberUrl} /></p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn kind="soft" onClick={() => runAssist('terjemah')} disabled={ai && ai.loading}>Terjemahkan</Btn>
              <Btn kind="soft" onClick={() => runAssist('analisis')} disabled={ai && ai.loading}>Analisis teks</Btn>
              <Btn kind="soft" onClick={runFakta} disabled={(fk && fk.loading) || busy}>Ekstrak fakta</Btn>
            </div>
            {fokus && (
              <div className="flex items-start gap-2 rounded-lg bg-soft px-3 py-2 text-sm text-soft-ink">
                <span className="min-w-0 flex-1"><b>Fokus soal:</b> {fokus}</span>
                <button type="button" aria-label="Hapus fokus soal" onClick={() => setFokus('')}><X size={14} /></button>
              </div>
            )}
            <Btn kind="primary" className="w-full" onClick={() => generate()} disabled={busy || cooldown > 0}>
              {busy ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              {busy ? 'Menyusun soal...' : cooldown > 0 ? `Coba lagi dalam ${cooldown} detik` : 'Generate Draft Soal dari Teks Kitab'}
            </Btn>
            {busy && (
              <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-xl bg-soft px-4 py-3 text-sm font-medium text-soft-ink">
                <Loader2 size={18} className="spin shrink-0" />
                <span className="flex-1">Sedang menganalisis teks kitab &amp; menyusun soal...</span>
                <button type="button" className="text-xs font-semibold underline" onClick={() => abortRef.current && abortRef.current.abort()}>Batalkan</button>
              </div>
            )}
            {apiError && !busy && (
              <div role="alert" className="rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">
                <p className="flex items-center gap-2 font-bold"><AlertTriangle size={16} className="shrink-0" />{ERR_TITLE[apiError.code] || 'Gagal menyusun soal'}</p>
                <p className="mt-1 leading-relaxed">{apiError.message}</p>
              </div>
            )}
            <p className="flex gap-2 text-xs leading-relaxed text-mute">
              <Info size={14} className="mt-0.5 shrink-0" />
              Soal disusun AI hanya dari teks Arab di atas. Isi form akan terganti oleh hasilnya.
            </p>
          </div>
        </Section>

        {fk && (
          <Section title="Fakta dari Teks" icon={Sparkles}
            action={<button type="button" onClick={() => { setFk(null); setTerpakai([]); }} className="text-xs font-semibold text-mute hover:text-ink">Tutup</button>}>
            <FaktaTeks state={fk} level={form.level} terpakai={terpakai} basi={faktaBasi(fk, form.teks)} disabled={busy || cooldown > 0} onBuat={buatDariFakta} onOtomatis={faktaOtomatis} />
          </Section>
        )}

        {ai && (
          <Section title={ai.kind === 'terjemah' ? 'Terjemah & Istilah' : 'Analisis Teks'} icon={Sparkles}
            action={<button type="button" onClick={() => setAi(null)} className="text-xs font-semibold text-mute hover:text-ink">Tutup</button>}>
            <AssistView state={ai} onIdea={useIdea} />
          </Section>
        )}
      </div>

      <div className="min-w-0 space-y-5 lg:col-span-7">
        {editingId && !ustadz && <RiwayatSoal id={editingId} form={form} setForm={setForm} toast={toast} />}
        <Section title={editingId ? 'Naskah Soal (sedang diedit)' : 'Naskah Soal'} icon={PenLine}
          action={<button type="button" onClick={() => { onReset(); setGenerated(false); setErrors([]); setJejak(null); }} className="inline-flex items-center gap-1 text-xs font-semibold text-mute hover:text-ink"><RotateCcw size={13} />Kosongkan</button>}>
          {generated && (
            <div className="mb-4 flex gap-2 rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>Draft disusun AI dari teks kitab Anda. Cek kebenaran kunci, pengecoh, dan kutipan Arab sebelum {ustadz ? 'dipakai untuk murid' : 'dikirim ke editor'}.</span>
            </div>
          )}
          {generated && jejak && (
            <div className="mb-4 space-y-2 rounded-lg border border-line bg-surface px-3 py-3 text-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-mute">Dasar soal (satu fakta)</p>
              <p className="leading-relaxed">{jejak.fakta}</p>
              <p dir="rtl" lang="ar" className="ar ar-sm !leading-normal text-mute">{jejak.kutipan}</p>
              {jejak.alasan && <div><p className="text-xs font-semibold text-mute">Mengapa tiap pengecoh salah</p><p className="whitespace-pre-wrap text-xs leading-relaxed">{jejak.alasan}</p></div>}
              <p className="text-xs leading-relaxed text-mute">Catatan ini hanya tampil di layar ini dan tidak ikut tersimpan ke soal. Salin ke pembahasan bila ingin disimpan.</p>
            </div>
          )}
          <div className="space-y-4">
            <div><Label htmlFor="stimulus" hint="(opsional)">Narasi / Stimulus</Label>
              <AutoArea id="stimulus" maxLength={3000} rows={3} className="field" placeholder="Kasus atau konteks yang mengantar pertanyaan" value={form.stimulus} onChange={(e) => set('stimulus', e.target.value)} /></div>
            <div><Label htmlFor="pertanyaan">{{ pilgan: 'Pertanyaan', lanjutan: 'Kalimat yang dilanjutkan', benarsalah: 'Pernyataan', isian: 'Kalimat dengan titik-titik', uraian: 'Pertanyaan / Perintah' }[Bt.bentukDari(form)]}</Label>
              <AutoArea id="pertanyaan" maxLength={2000} rows={2} className="field" placeholder={{ pilgan: 'Tulis pertanyaan', lanjutan: 'Mis. Seorang musafir boleh mengqashar shalat apabila .....', benarsalah: 'Tulis satu pernyataan yang dinilai Benar atau Salah', isian: 'Mis. Syarat sah shalat ada ..... perkara.', uraian: 'Mis. Jelaskan syarat-syarat seorang musafir boleh mengqashar shalat!' }[Bt.bentukDari(form)]} value={form.pertanyaan} onChange={(e) => set('pertanyaan', e.target.value)} />
              {(form.bentuk === 'lanjutan' || form.bentuk === 'isian') && form.pertanyaan.trim() && !Bt.adaPenanda(form.pertanyaan) && <p className="mt-1 text-xs text-warn">Belum ada titik-titik (.....) tempat melanjutkan.</p>}</div>
            {(form.bentuk === 'pilgan' || form.bentuk === 'lanjutan' || !Bt.BENTUK[form.bentuk]) && (
            <fieldset>
              <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-mute">{form.bentuk === 'lanjutan' ? 'Kelanjutan (opsi)' : 'Opsi Jawaban'} <span className="ml-1 normal-case font-normal tracking-normal">(pilih bulatan untuk kunci)</span></legend>
              <div className="space-y-2">
                {KEYS.filter((k, i) => !tpl || i < NK.OPSI_ASLI || String(form.opsi[k] || '').trim()).map((k) => (
                  <div key={k} className={`flex items-center gap-2 rounded-xl border p-1.5 pr-2 ${form.kunci === k ? 'border-brand bg-ok-bg' : 'border-line'}`}>
                    <label htmlFor={'kunci-' + k} className="flex shrink-0 cursor-pointer items-center gap-2 pl-2" title={`Jadikan ${k} kunci jawaban`}>
                      <input id={'kunci-' + k} type="radio" name="kunci" className="h-4 w-4 accent-[var(--brand)]" checked={form.kunci === k} onChange={() => set('kunci', k)} />
                      <span className="w-4 text-sm font-bold">{k}</span>
                    </label>
                    <AutoArea satuBaris id={'opsi-' + k} aria-label={`Opsi ${k}`} className="min-w-0 flex-1 border-0 bg-transparent px-2 py-1.5 text-sm text-ink placeholder:text-mute focus:outline-none" placeholder={`Opsi ${k}`} maxLength={1000} value={form.opsi[k]} onChange={(e) => setOpt(k, e.target.value)} />
                  </div>
                ))}
              </div>
            </fieldset>
            )}
            {form.bentuk === 'benarsalah' && (
            <fieldset>
              <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-mute">Kunci <span className="ml-1 normal-case font-normal tracking-normal">(pernyataan di atas)</span></legend>
              <div className="grid grid-cols-2 gap-2">
                {[['A', 'Benar'], ['B', 'Salah']].map(([k, t]) => (
                  <label key={k} htmlFor={'bs-' + k} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-semibold ${form.kunci === k ? 'border-brand bg-ok-bg' : 'border-line'}`}>
                    <input id={'bs-' + k} type="radio" name="kunci-bs" className="h-4 w-4 accent-[var(--brand)]" checked={form.kunci === k} onChange={() => set('kunci', k)} />{t}
                  </label>
                ))}
              </div>
            </fieldset>
            )}
            {(form.bentuk === 'isian' || form.bentuk === 'uraian') && (
              <div><Label htmlFor="jawaban">{form.bentuk === 'uraian' ? 'Jawaban Model' : 'Jawaban Isian'}</Label>
                <AutoArea id="jawaban" rows={form.bentuk === 'uraian' ? 4 : 1} className="field" maxLength={2000} placeholder={form.bentuk === 'uraian' ? 'Jawaban lengkap yang diharapkan' : 'Jawaban singkat; pisahkan dengan " / " bila ada penulisan lain yang sama benarnya'} value={form.jawaban} onChange={(e) => set('jawaban', e.target.value)} /></div>
            )}
            {form.bentuk === 'uraian' && (
              <div><Label htmlFor="rubrik">Pedoman Penskoran</Label>
                <AutoArea id="rubrik" rows={3} className="field" maxLength={2000} placeholder="Mis. 1) menyebut syarat jarak (skor 2); 2) menyebut tujuan bukan maksiat (skor 2); Skor maksimal 4" value={form.rubrik} onChange={(e) => set('rubrik', e.target.value)} /></div>
            )}
            <div><Label htmlFor="pembahasan">Pembahasan / Dalil Pendukung</Label>
              <AutoArea id="pembahasan" maxLength={4000} rows={4} className="field" placeholder="Jelaskan jawaban dan kutip dalil atau teks kitab" value={form.pembahasan} onChange={(e) => set('pembahasan', e.target.value)} />
              <div className="mt-2"><KutipanBadge q={form} /></div></div>
            <div><Label htmlFor="indikator" hint="(opsional)">Indikator Kisi-kisi</Label>
              <AutoArea id="indikator" maxLength={1000} rows={2} className="field" placeholder="Peserta didik dapat ..." value={form.indikator} onChange={(e) => set('indikator', e.target.value)} /></div>
          </div>

          <div className="mt-5 rounded-xl border border-line bg-bg p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Btn kind="soft" onClick={runTelaah} disabled={!!(tl && tl.loading) || !form.pertanyaan.trim()}>
                {tl && tl.loading ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}Telaah &amp; Perbaiki dengan AI
              </Btn>
              {undo && <Btn kind="ghost" onClick={undoFix}><RotateCcw size={16} />Urungkan perbaikan</Btn>}
            </div>
            {tl && <div className="mt-3"><TelaahView state={tl} onApply={applyFix} /></div>}
          </div>
          <div className="mt-3 rounded-xl border border-line bg-bg p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Btn kind="soft" onClick={() => setPg((v) => !v)} aria-expanded={pg}><Languages size={16} />{pg ? 'Tutup Pegon' : 'Pegonkan'}</Btn>
              <span className="text-xs text-mute">Lihat soal ini dalam aksara Pegon. Isian Latin tidak diubah.</span>
            </div>
            {pg && <PegonSoal form={form} toast={toast} onUbah={(f, v) => (f.startsWith('opsi.') ? set('opsi', { ...(form.opsi || {}), [f.slice(5)]: v }) : set(f, v))} />}
          </div>
          {Bt.punyaOpsi(form.bentuk) ? (
          <div className="mt-3 rounded-xl border border-line bg-bg p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Btn kind="soft" onClick={() => ujiButa({ stimulus: form.stimulus, pertanyaan: form.pertanyaan, opsi: form.opsi, kunci: form.kunci })} disabled={!!(butaState && butaState.loading) || !form.pertanyaan.trim() || !form.kunci}>
                {butaState && butaState.loading ? <Loader2 size={16} className="spin" /> : <Check size={16} />}Uji jawab buta
              </Btn>
              <span className="text-xs text-mute">Model menjawab tanpa melihat kunci; bila berbeda, soal perlu ditelaah.</span>
            </div>
            <ButaView state={butaState} />
          </div>
          ) : (
            <p className="mt-3 rounded-xl border border-line bg-bg p-3 text-xs leading-relaxed text-mute">Uji jawab buta hanya untuk soal berpilihan. Untuk soal {Bt.BENTUK[Bt.bentukDari(form)].label.toLowerCase()}, periksa dengan tombol Telaah &amp; Perbaiki di atas.</p>
          )}

          {errors.length > 0 && (
            <ul role="alert" className="mt-4 space-y-1 rounded-lg bg-bad-bg px-4 py-3 text-sm text-bad">
              {errors.map((e) => <li key={e} className="flex gap-2"><X size={14} className="mt-1 shrink-0" />{e}</li>)}
            </ul>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {ustadz ? <Btn kind="primary" onClick={send}><Save size={16} />Simpan ke Soal Saya</Btn> : <>
              <Btn kind="ghost" onClick={save}><Save size={16} />Simpan Draft</Btn>
              <Btn kind="primary" onClick={send}><Send size={16} />Kirim ke Editor</Btn>
            </>}
          </div>
          <DraftNote names={['form', 'composeEx']} className="mt-2" />
        </Section>
      </div>
    </div>
  );
}

/* ---------- Tab 2: Review ---------- */
function ReviewCard({ q, onApprove, onRevise, me }) {
  const own = q.authorUid === me.uid && me.role !== 'admin';
  const alur = useAlur();
  const izin = AL.bolehTinjau(me, q, alur); // bukan penentu (server yang menentukan); hanya agar tombol dan pesannya jujur
  const akhir = izin.tahap >= izin.total; // tahap terakhir (atau alur satu tahap): Setujui = Approved
  const terkunci = !izin.ok;
  const [note, setNote] = useState(() => { const d = Draft.read('catatan:' + q.id); return typeof d === 'string' ? d.slice(0, 1000) : ''; });
  useDraftSync('catatan:' + q.id, note, !note.trim());
  const [err, setErr] = useState(false);
  const [tl, setTl] = useState(null);
  const [errOk, setErrOk] = useState(false);
  const [buta, setButa] = useState(null);
  const K = window.Kutipan;
  const kutLive = useMemo(() => (K && q.teks && q.pembahasan ? K.periksaKutipan(K.bidangDariSoal(q), q.teks).status : ''), [K, q.teks, q.pembahasan, q.stimulus, q.pertanyaan, q.opsi]);
  const a = q.ai || {};
  const alasanOverride = [
    (kutLive === 'gagal' || a.verifikasi === 'gagal') && 'ada kutipan Arab yang tidak ada di teks kitab',
    (a.buta === 'beda' || (buta && buta.data && buta.data.status === 'beda')) && 'uji jawab buta berbeda dari kunci',
  ].filter(Boolean);
  const runButa = async () => {
    setButa({ loading: true });
    try {
      const d = await callApi('/api/assist', { aksi: 'cekbuta', teks: q.teks, bahasa: bahasaOtomatis(q.teks), nama: q.nama, tingkat: q.tingkat, level: q.level, bentuk: Bt.bentukDari(q), soal: { stimulus: q.stimulus, pertanyaan: q.pertanyaan, opsi: q.opsi, kunci: q.kunci } });
      setButa({ data: d.hasil });
    } catch (e) { const er = apiErr(e); setButa(er ? { error: er } : null); }
  };
  const setujui = () => {
    if (akhir && alasanOverride.length && !note.trim()) { setErrOk(true); return; }
    // Meloloskan ke editor berikutnya: catatan opsional (tersimpan di jejak tinjauan). Persetujuan akhir: catatan override bila ada peringatan.
    onApprove(q.id, !akhir ? note.trim().slice(0, 300) : (alasanOverride.length ? `[Disetujui dengan catatan] ${note.trim()}`.slice(0, 1000) : ''));
  };
  const runTelaah = async () => {
    setTl({ loading: true });
    try {
      const d = await callApi('/api/assist', {
        aksi: 'telaah', teks: q.teks, bahasa: bahasaOtomatis(q.teks), nama: q.nama, juz: q.juz, hal: q.hal, tingkat: q.tingkat, mapel: q.mapel, level: q.level, bentuk: Bt.bentukDari(q), kitabId: q.kitabId || '',
        soal: { stimulus: q.stimulus, pertanyaan: q.pertanyaan, opsi: q.opsi, kunci: q.kunci, pembahasan: q.pembahasan, indikator: q.indikator || '', jawaban: q.jawaban || '', rubrik: q.rubrik || '' },
      });
      setTl({ data: d.hasil });
    } catch (e) { const er = apiErr(e); setTl(er ? { error: er } : null); }
  };
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2"><TahapChip q={q} /><Meta q={q} /></div>
        <span className="text-xs text-mute">{q.authorName ? `Oleh ${q.authorName} · ` : ''}{refText(q)}<RefArab q={q} /><TautKitab q={q} /></span>
      </header>
      <div className="grid md:[grid-template-columns:var(--kolom)]" style={{ '--kolom': LK.lebarKolom((q.teks || '').length, LK.panjangSoal(q)).css }}>
        <div className="min-w-0 border-b border-line p-4 sm:p-5 md:border-b-0 md:border-r">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-mute"><Quote size={14} />Teks Kitab Asli</h3>
          <div className="rounded-xl bg-soft px-4 py-2"><p dir="rtl" lang="ar" className="ar text-soft-ink">{q.teks || '—'}</p></div>
          <p className="mt-2 text-xs text-mute">{refText(q)}<RefArab q={q} /><TautKitab q={q} /></p>
          {q.sumberUrl && <p className="mt-1 text-xs text-mute">Sumber: <SourceLink url={q.sumberUrl} /></p>}
        </div>
        <div className="min-w-0 p-4 sm:p-5">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-mute"><PenLine size={14} />Naskah Soal</h3>
          <QuestionView q={q} />
        </div>
      </div>
      <footer className="border-t border-line bg-bg px-4 py-4 sm:px-5">
        <div className="mb-4">
          <Btn kind="soft" onClick={runTelaah} disabled={!!(tl && tl.loading)}>
            {tl && tl.loading ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}Telaah AI
          </Btn>
          {Bt.punyaOpsi(q) && (
            <Btn kind="soft" className="ml-2" onClick={runButa} disabled={!!(buta && buta.loading)}>
              {buta && buta.loading ? <Loader2 size={16} className="spin" /> : <Check size={16} />}Uji jawab buta
            </Btn>
          )}
          <ButaView state={buta} />
          {tl && <div className="mt-3"><TelaahView state={tl} onUseNotes={(t) => { setNote(t.slice(0, 1000)); setErr(false); }} /></div>}
        </div>
        {alasanOverride.length > 0 && (
          <div role="alert" className="mb-3 rounded-lg bg-bad-bg px-3 py-2 text-xs text-bad">
            <p className="font-semibold">Peringatan sebelum menyetujui: {alasanOverride.join('; ')}.</p>
            <p className="mt-1">{akhir ? 'Soal ini baru bisa disetujui bila Anda menulis catatan alasan di kolom di bawah (override). Catatan tersimpan bersama soal.' : 'Catatan alasan akan diwajibkan saat persetujuan akhir. Pertimbangkan meminta revisi sekarang.'}</p>
            {errOk && <p className="mt-1 font-semibold">Tulis catatan alasan lebih dulu.</p>}
          </div>
        )}
        {q.sumberUrl && <p className="mb-3 text-xs text-mute">Tautan sumber diisi penyusun dan tidak otomatis terikat ke teks di atas. Cocokkan sendiri bila perlu.</p>}
        <Label htmlFor={'note-' + q.id}>Catatan Revisi</Label>
        <textarea id={'note-' + q.id} rows={2} className={`field ${err ? '!border-[var(--bad)]' : ''}`} placeholder="Wajib diisi bila meminta revisi"
          value={note} onChange={(e) => { setNote(e.target.value); setErr(false); setErrOk(false); }} />
        {err && <p className="mt-1 text-xs font-medium text-bad">Tulis catatan revisi agar penyusun tahu apa yang diperbaiki.</p>}
        {own && <p className="mt-2 text-xs font-medium text-warn">Anda penyusun soal ini. Soal harus ditinjau editor lain.</p>}
        {!own && terkunci && <p className="mt-2 text-xs font-medium text-warn">{izin.alasan}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn kind="primary" disabled={own || terkunci} onClick={setujui}><CheckCircle2 size={16} />{akhir ? 'Setujui Soal' : `Loloskan ke Editor ${izin.tahap + 1}`}</Btn>
          <Btn kind="danger" disabled={own || terkunci} onClick={() => { if (!note.trim()) { setErr(true); return; } onRevise(q.id, note.trim()); }}><RotateCcw size={16} />Minta Revisi</Btn>
        </div>
      </footer>
    </article>
  );
}
function Review({ list, all = [], onApprove, onRevise, me }) {
  const cfg = useCfg();
  const alur = useAlur();
  const kel = useMemo(() => PK.kelompokPaket(list, all), [list, all]);
  if (me.role !== 'editor' && me.role !== 'admin') return <Empty icon={ShieldCheck} title="Tab ini untuk editor" text="Hanya editor dan admin yang dapat meninjau soal. Pantau status soal Anda di tab Bank Soal dengan filter status." />;
  // Editor baru belum punya tahap: pada mapel bertahap antreannya kosong. Beri tahu sebabnya, jangan tampak seolah tidak ada pekerjaan.
  const belumDitugaskan = alur.aktif && me.role === 'editor' && AL.tahapDitugaskan(me).length === 0;
  if (!list.length) return <Empty icon={ClipboardCheck} title={belumDitugaskan ? 'Anda belum ditugaskan ke tahap editor' : 'Tidak ada soal yang menunggu review'} text={belumDitugaskan ? 'Peninjauan bertahap sedang aktif. Soal pada mapel bertahap baru muncul setelah admin menugaskan Anda ke tahap 1, 2, atau 3 (menu Pengguna).' : 'Soal yang dikirim dari tab Penyusunan Soal akan muncul di sini.'} />;
  return (
    <div className="fade-in space-y-5">
      {kel.paket.map((g) => (
        <section key={g.id} aria-label={labelPaket(cfg, g)} className="space-y-4 rounded-2xl border-2 border-brand/40 bg-soft/40 p-3 sm:p-4">
          <header className="px-1">
            <h3 className="text-sm font-bold">Paket {labelPaket(cfg, g)}</h3>
            {g.cakupan && <p className="text-xs text-soft-ink">Batas materi: {g.cakupan}</p>}
            <p className="text-xs text-mute">{g.soal.length} butir menunggu review · Approved {g.status.approved} · Revisi {g.status.revision} · Draft (belum dikirim) {g.status.draft}. Review tetap per butir; butir yang dikembalikan tetap berada dalam paket ini.</p>
          </header>
          {g.soal.map((q) => <ReviewCard key={q.id} q={q} me={me} onApprove={onApprove} onRevise={onRevise} />)}
        </section>
      ))}
      {kel.paket.length > 0 && kel.lepas.length > 0 && <h3 className="px-1 text-sm font-bold text-soft-ink">Soal lepas (bukan bagian paket)</h3>}
      {kel.lepas.map((q) => <ReviewCard key={q.id} q={q} me={me} onApprove={onApprove} onRevise={onRevise} />)}
    </div>
  );
}



/* ---------- Tab 3: Bank ---------- */
/* ---------- Riwayat versi soal (hanya baca; versi lama bisa dimuat kembali ke form, belum tersimpan sampai penyusun menyimpan) ---------- */
function RiwayatSoal({ id, form, setForm, toast }) {
  const [buka, setBuka] = useState(false);
  const [daftar, setDaftar] = useState(null); // null = belum dimuat
  const [err, setErr] = useState('');
  const muat = async () => {
    setErr('');
    try {
      const snap = await firebase.firestore().collection('soal').doc(id).collection('riwayat').orderBy('at', 'desc').limit(30).get();
      setDaftar(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) { setErr(e && e.code === 'permission-denied' ? 'Aturan Firestore belum diperbarui untuk riwayat. Minta admin menerbitkan firestore.rules terbaru.' : 'Riwayat gagal dimuat. Coba lagi.'); }
  };
  useEffect(() => { setBuka(false); setDaftar(null); setErr(''); }, [id]);
  const pulihkan = (v) => {
    if (!window.confirm('Muat versi ini ke form? Isian form saat ini diganti, dan baru tersimpan setelah Anda menekan Simpan.')) return;
    const x = v.snapshot || {};
    setForm((f) => ({ ...f, ...Object.fromEntries(FIELDS.filter((k) => x[k] !== undefined).map((k) => [k, x[k]])), opsi: { ...f.opsi, ...(x.opsi || {}) } }));
    toast('Versi lama dimuat ke form. Periksa lalu simpan.');
  };
  const skrg = RW.potretSoal({ ...form });
  return (
    <div className="mb-4 rounded-xl border border-line bg-surface p-3 text-sm">
      <button type="button" className="inline-flex items-center gap-2 font-semibold text-brand" onClick={() => { const b = !buka; setBuka(b); if (b && daftar === null) muat(); }}>
        <RotateCcw size={15} />{buka ? 'Sembunyikan riwayat versi' : 'Lihat riwayat versi soal ini'}
      </button>
      {buka && (
        <div className="mt-2">
          {err && <p role="alert" className="text-bad">{err}</p>}
          {daftar === null && !err && <p className="text-mute">Memuat…</p>}
          {daftar && !daftar.length && <p className="text-mute">Belum ada versi lama. Riwayat mulai tercatat saat soal ini disimpan ulang.</p>}
          {daftar && daftar.length > 0 && (
            <ul className="space-y-2">
              {daftar.map((v) => (
                <li key={v.id} className="rounded-lg border border-line p-2">
                  <p className="text-xs text-mute">{v.at && v.at.toDate ? v.at.toDate().toLocaleString('id-ID') : ''} · diubah oleh {v.namaOleh || '-'}</p>
                  <p className="mt-0.5 text-xs">Berbeda dari isi form sekarang: {RW.ringkasBeda(v.snapshot, skrg)}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-mute">{(v.snapshot && v.snapshot.pertanyaan) || ''}</p>
                  <button type="button" className="mt-1 text-xs font-semibold text-brand" onClick={() => pulihkan(v)}>Muat versi ini ke form</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Pilih massal (dipakai Bank Soal dan Soal Saya) ---------- */
// "terlihat" = soal yang sedang tampil sesuai filter. Pilihan di luar daftar yang tampil TIDAK ikut diproses,
// supaya mengganti filter tidak membuat soal tersembunyi ikut terhapus.
function usePilihan(terlihat) {
  const [aktif, setAktif] = useState(false);
  const [ids, setIds] = useState(() => new Set());
  const [konfirm, setKonfirm] = useState(false);
  const dipilih = useMemo(() => terlihat.filter((q) => ids.has(q.id)), [terlihat, ids]);
  const semua = terlihat.length > 0 && dipilih.length === terlihat.length;
  const toggle = (id) => { setKonfirm(false); setIds((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };
  const pilihSemua = () => { setKonfirm(false); setIds(semua ? new Set() : new Set(terlihat.map((q) => q.id))); };
  const tutup = () => { setAktif(false); setIds(new Set()); setKonfirm(false); };
  return { aktif, setAktif, dipilih, semua, toggle, pilihSemua, tutup, konfirm, setKonfirm };
}
function KotakPilih({ pl, q }) {
  if (!pl.aktif) return null;
  const on = pl.dipilih.some((x) => x.id === q.id);
  return (
    <label className="mb-3 flex cursor-pointer items-center gap-2 rounded-lg bg-soft px-3 py-2 text-sm font-semibold text-soft-ink">
      <input type="checkbox" className="h-5 w-5" checked={on} onChange={() => pl.toggle(q.id)} aria-label="Pilih soal ini" />
      {on ? 'Dipilih' : 'Pilih soal ini'}
    </label>
  );
}
function BilahPilih({ pl, total, children }) {
  if (!pl.aktif) return <div className="flex"><Btn kind="ghost" onClick={() => pl.setAktif(true)} disabled={!total}><CheckSquare size={15} />Pilih</Btn></div>;
  return (
    <div className="sticky top-2 z-10 space-y-2 rounded-xl border border-brand/40 bg-surface p-3 shadow-md" role="region" aria-label="Aksi soal terpilih">
      <div className="flex flex-wrap items-center gap-2">
        <Btn kind="ghost" onClick={pl.pilihSemua}>{pl.semua ? <Square size={15} /> : <CheckSquare size={15} />}{pl.semua ? 'Batal pilih semua' : `Pilih semua (${total})`}</Btn>
        <span className="mr-auto text-sm font-semibold">{pl.dipilih.length} dipilih</span>
        <Btn kind="ghost" onClick={pl.tutup}><X size={15} />Selesai</Btn>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function Bank({ all, onEdit, onDelete, onDeleteMany, canEdit, uid = '', onKirim, onKirimTab }) {
  const alur = useAlur();
  const FAWAL = { mapel: '', tingkat: '', kelas: '', periode: '', status: 'approved', paket: '', kitab: '', bab: '' };
  const [f, setF] = useState(() => bacaPref('bankFilter', FAWAL));
  useDraftSync('bankFilter', f, JSON.stringify(f) === JSON.stringify(FAWAL));
  const [confirm, setConfirm] = useState(null);
  const [kirimBusy, setKirimBusy] = useState('');
  const cfg = useCfg();
  const [kata, setKata] = useState(''); // pencarian teks: sengaja tidak disimpan sebagai preferensi
  const list = useMemo(() => CS.saring(applyFilter(all, f, alur), kata), [all, f, kata, alur]);
  // Opsi Kitab/Bab menghitung soal yang lolos filter lain (mapel, tingkat, status, dst.), supaya jumlahnya sama dengan yang akan tampil.
  const dasarKB = useMemo(() => applyFilter(all, { ...f, kitab: '', bab: '' }, alur), [all, f, alur]);
  const opsiKitab = useMemo(() => SK.opsiKitab(dasarKB), [dasarKB]);
  const opsiBab = useMemo(() => SK.opsiBab(dasarKB, f.kitab), [dasarKB, f.kitab]);
  useEffect(() => { // pilihan yang sudah tidak ada (filter lain berubah, data dihapus) dilepas agar daftar tidak kosong tanpa sebab
    if (!all.length) return;
    if (f.kitab && !opsiKitab.some((o) => o.nilai === f.kitab)) setF({ ...f, kitab: '', bab: '' });
    else if (f.bab && !opsiBab.some((o) => o.nilai === f.bab)) setF({ ...f, bab: '' });
  }, [f, opsiKitab, opsiBab, all.length]);
  const kel = useMemo(() => PK.kelompokPaket(list, all), [list, all]);
  const pl = usePilihan(list);
  const bisaHapus = pl.dipilih.filter(canEdit);
  const approvedDipilih = pl.dipilih.filter((q) => q.status === 'approved');
  const hapusMassal = async () => {
    const approved = bisaHapus.filter((q) => q.status === 'approved').length;
    // Konfirmasi kedua untuk penghapusan besar atau yang menyentuh soal Approved: tombol "Ya" saja terlalu mudah ditekan tanpa sengaja di layar sentuh.
    if ((approved || bisaHapus.length >= 10) && !window.confirm(`Hapus ${bisaHapus.length} soal dari server${approved ? ` (${approved} berstatus Approved)` : ''}? Tidak bisa dibatalkan.`)) return;
    const n = await onDeleteMany(bisaHapus.map((q) => q.id)); pl.tutup(); return n;
  };
  const kartu = (q) => (
          <article key={q.id} className={'rounded-2xl border bg-surface p-4 sm:p-5 ' + (pl.aktif && pl.dipilih.some((x) => x.id === q.id) ? 'border-brand ring-2 ring-brand/30' : 'border-line')}>
            <KotakPilih pl={pl} q={q} />
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2"><Badge status={q.status} /><TahapChip q={q} /><Meta q={q} /></div>
              <span className="text-xs text-mute">{q.authorName ? `Oleh ${q.authorName} · ` : ''}{refText(q)}<RefArab q={q} /><TautKitab q={q} />{q.status === 'approved' && q.reviewerName ? ` · Disetujui ${q.reviewerName}` : ''}</span>
            </div>
            {q.status === 'revision' && q.catatan && (
              <p className="mb-3 rounded-lg bg-bad-bg px-3 py-2 text-sm text-bad"><span className="font-semibold">Catatan editor: </span>{q.catatan}</p>
            )}
            <QuestionView q={q} />
            {q.teks && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-soft-ink">Lihat teks kitab</summary>
                <p dir="rtl" lang="ar" className="ar ar-sm mt-2 rounded-xl bg-soft px-4 py-2 text-soft-ink">{q.teks}</p>
                {q.sumberUrl && <p className="mt-1 text-xs text-mute">Sumber: <SourceLink url={q.sumberUrl} /></p>}
              </details>
            )}
            {onKirimTab && q.status === 'approved' && <div className="mt-4 flex flex-wrap gap-2">
              <Btn kind="soft" onClick={() => onKirimTab('export', [q.id])}><Download size={15} />Ke Export</Btn>
              <Btn kind="soft" onClick={() => onKirimTab('fokus', [q.id])}><ListChecks size={15} />Ke Fokus Ujian</Btn>
            </div>}
            {canEdit(q) && <div className="mt-4 flex flex-wrap gap-2">
              <Btn kind={q.status === 'revision' ? 'primary' : 'ghost'} onClick={() => onEdit(q)}><Pencil size={15} />{q.status === 'revision' ? 'Perbaiki' : 'Edit'}</Btn>
              {confirm === q.id ? (
                <>
                  <Btn kind="danger" onClick={() => { onDelete(q.id); setConfirm(null); }}><Trash2 size={15} />Ya, hapus</Btn>
                  <Btn kind="ghost" onClick={() => setConfirm(null)}>Batal</Btn>
                </>
              ) : <Btn kind="ghost" onClick={() => setConfirm(q.id)}><Trash2 size={15} />Hapus</Btn>}
            </div>}
          </article>
  );
  return (
    <div className="fade-in space-y-4">
      <Filters f={f} setF={setF} withStatus count={list.length} qs={all} uid={uid} />
      {(opsiKitab.length > 1 || f.kitab) && (
        <div className="flex flex-wrap gap-3">
          <div className="min-w-[200px] flex-1"><Label htmlFor="f-kitab">Kitab</Label>
            <Select id="f-kitab" value={f.kitab || ''} onChange={(v) => setF({ ...f, kitab: v, bab: '' })}>
              <option value="">Semua kitab</option>
              {opsiKitab.map((o) => <option key={o.nilai} value={o.nilai}>{o.label} ({o.jumlah})</option>)}
            </Select></div>
          <div className="min-w-[200px] flex-1"><Label htmlFor="f-bab">Bab</Label>
            <Select id="f-bab" value={f.bab || ''} onChange={(v) => setF({ ...f, bab: v })}>
              <option value="">{f.kitab ? 'Semua bab kitab ini' : 'Semua bab'}</option>
              {opsiBab.map((o) => <option key={o.nilai} value={o.nilai}>{o.label} ({o.jumlah})</option>)}
            </Select></div>
        </div>
      )}
      <BilahPilih pl={pl} total={list.length}>
        <Btn kind="ghost" disabled={pl.dipilih.length !== 1 || !canEdit(pl.dipilih[0])} onClick={() => { const q = pl.dipilih[0]; pl.tutup(); onEdit(q); }}><Pencil size={15} />Edit</Btn>
        {onKirimTab && <Btn kind="soft" disabled={!approvedDipilih.length} onClick={() => { const ids = approvedDipilih.map((q) => q.id); pl.tutup(); onKirimTab('export', ids); }}><Download size={15} />Ke Export ({approvedDipilih.length})</Btn>}
        {onKirimTab && <Btn kind="soft" disabled={!approvedDipilih.length} onClick={() => { const ids = approvedDipilih.map((q) => q.id); pl.tutup(); onKirimTab('fokus', ids); }}><ListChecks size={15} />Ke Fokus Ujian ({approvedDipilih.length})</Btn>}
        {pl.konfirm
          ? <><Btn kind="danger" onClick={hapusMassal}><Trash2 size={15} />Ya, hapus {bisaHapus.length} soal</Btn><Btn kind="ghost" onClick={() => pl.setKonfirm(false)}>Batal</Btn></>
          : <Btn kind="ghost" disabled={!bisaHapus.length} onClick={() => pl.setKonfirm(true)}><Trash2 size={15} />Hapus ({bisaHapus.length})</Btn>}
        {pl.konfirm && pl.dipilih.length > bisaHapus.length && <p className="w-full text-xs text-warn">{pl.dipilih.length - bisaHapus.length} soal terpilih tidak bisa Anda hapus (bukan milik Anda atau sudah dikirim/disetujui) dan akan dilewati.</p>}
        {pl.konfirm && <p className="w-full text-xs text-mute">Penghapusan dari server tidak bisa dibatalkan.</p>}
      </BilahPilih>
      <input type="search" aria-label="Cari di bank soal" className="field w-full" placeholder="Cari kata di pertanyaan, pilihan, pembahasan, teks kitab (Latin atau Arab)…" value={kata} onChange={(e) => setKata(e.target.value)} />
      {onKirimTab && list.some((q) => q.status === 'approved') && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-soft px-4 py-3 text-sm text-soft-ink">
          <span className="font-medium">{list.filter((q) => q.status === 'approved').length} soal Approved sesuai filter:</span>
          <Btn kind="ghost" onClick={() => onKirimTab('export', list.filter((q) => q.status === 'approved').map((q) => q.id))}><Download size={15} />Kirim ke Export</Btn>
          <Btn kind="ghost" onClick={() => onKirimTab('fokus', list.filter((q) => q.status === 'approved').map((q) => q.id))}><ListChecks size={15} />Kirim ke Fokus Ujian</Btn>
        </div>
      )}
      {f.status === 'approved' && uid && all.some((q) => q.paket && q.authorUid === uid && (q.status === 'draft' || q.status === 'revision')) && (
        <p className="flex flex-wrap items-center gap-3 rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn" role="status">Anda punya butir paket yang belum selesai (Draft atau diminta revisi). Filter status saat ini hanya menampilkan yang Approved.
          <Btn kind="ghost" onClick={() => setF({ ...f, status: '' })}>Tampilkan semua status</Btn></p>
      )}
      {!list.length ? <Empty icon={Library} title="Tidak ada soal yang cocok" text="Ubah filter, atau setujui soal dari tab Review/Validasi." /> : (
        <>
          {kel.paket.map((g) => (
            <section key={g.id} aria-label={labelPaket(cfg, g)} className="space-y-3 rounded-2xl border-2 border-brand/40 bg-soft/40 p-3 sm:p-4">
              <header className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="min-w-0"><h3 className="text-sm font-bold">Paket {labelPaket(cfg, g)}</h3>
                  {g.cakupan && <p className="text-xs text-soft-ink">Batas materi: {g.cakupan}</p>}</div>
                <p className="text-xs text-mute">Draft {g.status.draft} · Pending {g.status.pending} · Revisi {g.status.revision} · Approved {g.status.approved}{!g.lengkap ? ` · kurang ${g.target - g.jumlah} dari ${g.target} nomor` : ''}</p>
              </header>
              {(() => {
                const milik = all.filter((q) => q.paket === g.id && q.authorUid === uid && (q.status === 'draft' || q.status === 'revision'));
                if (!milik.length || !onKirim) return null;
                const rev = milik.filter((q) => q.status === 'revision').length;
                return (
                  <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface px-3 py-2">
                    <Btn kind="primary" disabled={kirimBusy === g.id} onClick={async () => {
                      if (!window.confirm(`Kirim ${milik.length} butir milik Anda dalam paket ini ke editor${rev ? ` (${rev} di antaranya hasil revisi)` : ''}? Butir yang sudah Approved atau masih menunggu review tidak ikut.`)) return;
                      setKirimBusy(g.id); try { await onKirim(milik.map((q) => q.id)); } finally { setKirimBusy(''); }
                    }}>{kirimBusy === g.id ? <Loader2 size={15} className="spin" /> : <Send size={15} />}Kirim ke editor ({milik.length} butir)</Btn>
                    <p className="text-xs text-mute">{rev ? `${rev} butir diminta revisi editor: perbaiki lewat tombol Perbaiki, lalu kirim ulang. ` : ''}Hanya butir yang belum dikirim atau dikembalikan yang ikut.</p>
                  </div>
                );
              })()}
              {g.soal.length < g.jumlah && <p className="px-1 text-xs text-mute">Menampilkan {g.soal.length} dari {g.jumlah} butir (sesuai filter).</p>}
              {g.soal.map((q) => kartu(q))}
            </section>
          ))}
          {kel.paket.length > 0 && kel.lepas.length > 0 && <h3 className="px-1 pt-2 text-sm font-bold text-soft-ink">Soal lepas (bukan bagian paket)</h3>}
          {kel.lepas.map((q) => kartu(q))}
        </>
      )}
    </div>
  );
}


/* ---------- Tab: Fokus Ujian (saran AI bab penting + kisi-kisi dari soal) ---------- */
// Saran AI (haluan Ahlussunnah wal Jamaah, setia pada teks kitab) hanya MENYARANKAN bab. Kisi-kisi dihitung dari soal yang sudah ada
// (public/kisi.js), jadi tidak mengarang. Kunci jawaban, opsi, dan pembahasan tidak pernah ikut keluar, sehingga aman dibagikan ke murid.
// Nama top-level di blok ini tidak boleh sama dengan properti window (lihat catatan Draft di atas): modul kisi diakses lewat window.Kisi.
const SaranCtx = React.createContext({ saran: null, setSaran: () => {}, pakaiBab: () => {} });
const PRIO_BAB = { inti: ['Inti', 'bg-ok-bg text-ok'], penting: ['Penting', 'bg-soft text-soft-ink'], pendukung: ['Pendukung', 'bg-bg text-mute'] };
const JENIS_BAB = { akidah: 'Akidah', ibadah_pokok: 'Ibadah pokok', muamalah: 'Muamalah', akhlak: 'Akhlak', nahwu_sharaf: 'Nahwu/Sharaf', hadits_quran: "Hadits/Qur'an", sejarah: 'Sejarah', lainnya: 'Lainnya' };
const CAKUPAN_STATUS = { kosong: ['Belum ada soal', 'bg-bad-bg text-bad'], kurang: ['Kurang', 'bg-warn-bg text-warn'], cukup: ['Cukup', 'bg-ok-bg text-ok'], lebih: ['Lebih', 'bg-soft text-soft-ink'], ada: ['Ada soal', 'bg-ok-bg text-ok'] };
// simpanBerkas(nama, blob) dipakai bersama dengan Pegonizer (dideklarasikan sekali, di bagian Pegonizer).

function SaranView({ d, onPakai }) {
  return (
    <div className="space-y-4 text-sm">
      {d.dasar === 'daftar_isi'
        ? <p className="rounded-xl bg-soft px-4 py-2 text-xs text-soft-ink">Disusun dari daftar isi yang Anda tempel. Setiap bab dicocokkan ulang dengan daftar isi itu.</p>
        : <p role="alert" className="rounded-xl bg-warn-bg px-4 py-2 text-xs leading-relaxed text-warn"><b>Perlu diverifikasi.</b> Tanpa daftar isi, saran ini berasal dari pengetahuan umum model. Cocokkan dengan kitab Anda, atau tempel daftar isinya.</p>}
      {d.peringatan.filter((x) => d.dasar === 'daftar_isi').map((x, i) => <p key={i} role="alert" className="rounded-xl bg-warn-bg px-4 py-2 text-xs leading-relaxed text-warn">{x}</p>)}
      {d.sikap && d.sikap.status === 'periksa' && (
        <p role="alert" className="rounded-xl bg-warn-bg px-4 py-2 text-xs leading-relaxed text-warn">Ada kata yang perlu ditinjau ustadz ({[...new Set(d.sikap.temuan.map((t) => t.kata))].join(', ')}). Pastikan bahasanya santun dan tidak menyalahkan pihak lain.</p>)}
      {d.ringkasan && <p className="font-semibold leading-relaxed">{d.ringkasan}</p>}
      <p className="text-xs text-mute">Keyakinan AI pada struktur kitab: <b>{d.keyakinan}</b>{d.jumlah_soal ? ` · rencana ${d.jumlah_soal} soal` : ''}</p>
      <ul className="space-y-2">
        {d.bab.map((b, i) => (
          <li key={i} className="rounded-lg border border-line bg-surface px-3 py-2">
            <p className="flex flex-wrap items-center gap-2">
              <span className={'shrink-0 rounded-md px-2 py-px text-xs font-bold ' + (PRIO_BAB[b.prioritas] || PRIO_BAB.penting)[1]}>{(PRIO_BAB[b.prioritas] || PRIO_BAB.penting)[0]}</span>
              <span className="min-w-0 font-semibold">{b.nama}</span>
              {b.nama_arab && <ArNama>{b.nama_arab}</ArNama>}
            </p>
            {b.alasan && <p className="mt-1 text-xs leading-relaxed text-mute">{b.alasan}</p>}
            <p className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
              <Chip>{JENIS_BAB[b.jenis_materi] || 'Lainnya'}</Chip>
              {b.level_disarankan.map((l) => <Chip key={l}>{l}</Chip>)}
              {b.alokasi_soal > 0 && <Chip>{b.alokasi_soal} soal</Chip>}
              {b.khilafiyah && <Chip>Khilafiyah</Chip>}
              {b.ditemukan === true && <span className="rounded-md bg-ok-bg px-2 py-px font-semibold text-ok">Ada di daftar isi</span>}
              {b.ditemukan === false && <span className="rounded-md bg-warn-bg px-2 py-px font-semibold text-warn">Tidak ada di daftar isi</span>}
            </p>
            {b.catatan_aswaja && <p className="mt-1.5 text-xs leading-relaxed text-soft-ink">Catatan pendekatan (AI, tinjau ustadz): {b.catatan_aswaja}</p>}
            <button type="button" onClick={() => onPakai(b)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-soft-ink hover:underline"><PenLine size={13} />Susun soal untuk bab ini</button>
          </li>))}
      </ul>
      {d.catatan_umum && <div><H3>Catatan untuk ustadz</H3><p className="leading-relaxed">{d.catatan_umum}</p></div>}
      <p className="text-xs text-mute">Saran disusun dengan haluan Ahlussunnah wal Jamaah yang moderat dan setia pada teks kitab. Ini bahan pertimbangan, bukan keputusan: guru pengampu atau ustadz yang menetapkan bab ujian.</p>
    </div>
  );
}

function FokusUjian({ all, toast }) {
  const cfg = useCfg();
  const catatan = React.useContext(CatatanCtx);
  const { saran, setSaran, pakaiBab } = React.useContext(SaranCtx);
  const approved = useMemo(() => all.filter((q) => q.status === 'approved'), [all]);
  const K = window.Kisi;

  /* --- Saran AI --- */
  const SAWAL = { tingkat: (tingkatAktif(cfg)[0] || {}).nama || 'Aliyah', kelas: '', periode: '', mapel: 'Fiqih', nama: '', daftarIsi: '', jumlah: '' };
  const [sf, setSf] = useState(() => bacaPref('saranBabForm', SAWAL));
  useDraftSync('saranBabForm', sf, JSON.stringify(sf) === JSON.stringify(SAWAL));
  const setS = (k, v) => setSf((x) => ({ ...x, [k]: v }));
  const pilihTingkatS = (v) => setSf((x) => {
    const l = mapelUntuk(cfg, v);
    return { ...x, tingkat: v, mapel: l.includes(x.mapel) || !l.length ? x.mapel : l[0],
      kelas: Uj.kelasUntuk(cfg, v).includes(x.kelas) ? x.kelas : '', periode: Uj.periodeUntuk(cfg, v).some((y) => y.kode === x.periode) ? x.periode : '' };
  });
  const [st, setSt] = useState({});
  const ctrl = useRef(null);
  useEffect(() => () => { if (ctrl.current) ctrl.current.abort(); }, []);
  const kitabOpsi = kitabUntuk(cfg, sf.tingkat, sf.mapel, sf.kelas, sf.periode);
  const kitabObj = cariKitab(cfg, sf.nama.trim());
  const cakupan = kitabObj ? Uj.cakupanKitab(kitabObj, sf.tingkat, sf.kelas, sf.periode) : '';
  const jalankan = async () => {
    const nama = sf.nama.trim();
    if (!nama) { toast('Isi nama kitab dulu.'); return; }
    if (ctrl.current) ctrl.current.abort();
    const c = new AbortController(); ctrl.current = c;
    setSt({ loading: true });
    try {
      const d = await callApi('/api/assist', {
        aksi: 'bab', nama, pengarang: kitabObj ? kitabObj.pengarang || '' : '', tingkat: sf.tingkat, kelas: sf.kelas, mapel: sf.mapel,
        ujian: sf.periode ? Uj.labelPeriode(cfg, sf.tingkat, sf.periode) : '', cakupan, daftarIsi: sf.daftarIsi, jumlahSoal: sf.jumlah.trim(),
      }, c.signal);
      if (c.signal.aborted) return;
      setSaran(d.hasil); setSt({});
    } catch (e) { const er = apiErr(e); if (er) setSt({ error: er }); }
  };

  /* --- Kisi-kisi --- */
  const KAWAL = { mapel: '', tingkat: '', kelas: '', periode: '' };
  const kAwal = useRef(null); if (kAwal.current === null) { const d = Draft.read('kisiPrefs'); kAwal.current = d && typeof d === 'object' ? d : {}; }
  const [kf, setKf] = useState(() => bacaPref('kisiFilter', KAWAL));
  const [meta, setMeta] = useState(() => ({ judul: typeof kAwal.current.judul === 'string' ? kAwal.current.judul.slice(0, 80) : '', madrasah: typeof kAwal.current.madrasah === 'string' ? kAwal.current.madrasah.slice(0, 80) : '' }));
  const [picked, setPicked] = useState(() => (Array.isArray(kAwal.current.picked) ? new Set(kAwal.current.picked.filter((x) => typeof x === 'string')) : null)); // null = semua hasil filter
  useDraftSync('kisiFilter', kf, JSON.stringify(kf) === JSON.stringify(KAWAL));
  const kPref = useMemo(() => ({ judul: meta.judul, madrasah: meta.madrasah, picked: picked ? [...picked] : null }), [meta, picked]);
  useDraftSync('kisiPrefs', kPref, !meta.judul && !meta.madrasah && picked === null);
  const [busy, setBusy] = useState('');

  const list = applyFilter(approved, kf);
  const chosen = (picked ? list.filter((q) => picked.has(q.id)) : list).map((q) => ({ ...q, ujian: Uj.labelPeriode(cfg, q.tingkat, q.periode) }));
  // Saran dipakai untuk urutan dan analisis hanya bila untuk kitab yang sama dengan soal terpilih (jangan campur kitab).
  const saranCocok = K && saran && chosen.some((q) => samaKitab(q.nama, saran.kitab)) ? saran : null;
  const kisi = K && chosen.length ? K.buatKisi(chosen, {
    judul: meta.judul, madrasah: meta.madrasah,
    urutanBab: saranCocok ? saranCocok.bab.map((b) => b.nama) : [], prioritas: saranCocok ? Object.fromEntries(saranCocok.bab.map((b) => [b.nama, b.prioritas])) : {},
  }) : null;
  const cakupanHasil = saranCocok ? K.analisisCakupan(saranCocok.bab.map((b) => ({ nama: b.nama, prioritas: b.prioritas, alokasi: b.alokasi_soal })), chosen.filter((q) => samaKitab(q.nama, saranCocok.kitab))) : null;
  const tanpaIndikator = chosen.filter((q) => !String(q.indikator || '').trim()).length;
  const toggle = (id) => { const cur = new Set(picked || list.map((q) => q.id)); cur.has(id) ? cur.delete(id) : cur.add(id); setPicked(cur); };
  const slug = (meta.judul || kf.mapel || 'soal').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'soal';

  const unduh = async (mode) => {
    if (!kisi) return;
    setBusy(mode);
    try {
      if (mode === 'csv') simpanBerkas(`kisi-kisi-${slug}.csv`, new Blob([K.kisiKeCsv(kisi, catatan)], { type: 'text/csv;charset=utf-8' }));
      else {
        const D = await muatDocx();
        simpanBerkas(`kisi-kisi-${slug}-${mode}.docx`, await D.Packer.toBlob(K.buatKisiDocx(D, kisi, mode, catatan)));
      }
      toast('File diunduh.');
    } catch (e) { toast(e && e.message ? 'Gagal membuat file: ' + e.message : 'Gagal membuat file.'); } finally { setBusy(''); }
  };
  const salin = async () => { try { await navigator.clipboard.writeText(K.kisiKeTeks(kisi, catatan)); toast('Teks kisi-kisi disalin.'); } catch (e) { toast('Penyalinan ditolak browser.'); } };
  const kelasOpsi = Uj.kelasUntuk(cfg, sf.tingkat); const periodeOpsi = Uj.periodeUntuk(cfg, sf.tingkat);

  return (
    <div className="fade-in space-y-5">
      <Section title="Saran AI: Bab Penting untuk Diujikan" icon={Target}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><Label htmlFor="sb-tingkat">Tingkat</Label>
            <Select id="sb-tingkat" value={sf.tingkat} onChange={pilihTingkatS}>{[...new Set([...tingkatAktif(cfg).map((t) => t.nama), sf.tingkat])].map((t) => <option key={t} value={t}>{labelTingkat(cfg, t)}</option>)}</Select></div>
          <div><Label htmlFor="sb-kelas" hint="(opsional)">Kelas</Label>
            <Select id="sb-kelas" value={sf.kelas} onChange={(v) => setS('kelas', v)}><option value="">— Belum dipilih —</option>{kelasOpsi.map((k) => <option key={k} value={k}>{k}</option>)}</Select></div>
          <div><Label htmlFor="sb-periode" hint="(opsional)">Ujian</Label>
            <Select id="sb-periode" value={sf.periode} onChange={(v) => setS('periode', v)}><option value="">— Belum dipilih —</option>{periodeOpsi.map((x) => <option key={x.kode} value={x.kode}>{x.label}</option>)}</Select></div>
          <div><Label htmlFor="sb-mapel">Mata Pelajaran</Label>
            <Select id="sb-mapel" value={sf.mapel} onChange={(v) => setS('mapel', v)}>{[...new Set([...mapelUntuk(cfg, sf.tingkat), sf.mapel])].map((m) => <option key={m}>{m}</option>)}</Select></div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2"><Label htmlFor="sb-nama">Nama Kitab</Label>
            <input id="sb-nama" list="sb-kitab" maxLength={120} className="field" placeholder="Pilih dari katalog atau ketik nama kitab" value={sf.nama} onChange={(e) => setS('nama', e.target.value)} />
            <datalist id="sb-kitab">{kitabOpsi.map((k) => <option key={k.nama} value={k.nama} />)}</datalist>
            {cakupan && <p className="mt-1 text-xs text-soft-ink">Cakupan materi dari Konfigurasi: {cakupan}. AI diminta membatasi saran pada cakupan ini.</p>}</div>
          <div><Label htmlFor="sb-jumlah" hint="(opsional)">Rencana jumlah soal</Label>
            <input id="sb-jumlah" inputMode="numeric" className="field" placeholder="mis. 40" value={sf.jumlah} onChange={(e) => setS('jumlah', e.target.value.replace(/[^0-9]/g, '').slice(0, 3))} /></div>
        </div>
        <div className="mt-3"><Label htmlFor="sb-isi" hint="(opsional, sangat disarankan)">Daftar isi kitab</Label>
          <textarea id="sb-isi" rows={5} className="field" placeholder="Tempel daftar isi (Arab atau Latin), satu bab per baris. Dengan daftar isi, saran terikat pada kitab Anda dan tiap bab diperiksa ulang." value={sf.daftarIsi} onChange={(e) => setS('daftarIsi', e.target.value)} />
          <p className={`mt-1 text-xs ${sf.daftarIsi.length > 5000 ? 'font-semibold text-bad' : 'text-mute'}`}>{sf.daftarIsi.length.toLocaleString('id-ID')} / 5.000 karakter{sf.daftarIsi.length > 5000 ? '. Tempel bagian yang akan diujikan saja.' : ''}</p></div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Btn kind="primary" onClick={jalankan} disabled={st.loading || !sf.nama.trim() || sf.daftarIsi.length > 5000}>{st.loading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}Sarankan bab penting</Btn>
          <span className="text-xs text-mute">Memakai 1 kuota AI.</span>
        </div>
        <div className="mt-4" aria-live="polite">
          {st.loading && <Spin>AI sedang menimbang bab yang paling penting...</Spin>}
          {st.error && <ErrorBox e={st.error} />}
          {!st.loading && !st.error && saran && <SaranView d={saran} onPakai={(b) => pakaiBab({ bab: b.nama, nama: saran.kitab, tingkat: sf.tingkat, kelas: sf.kelas, periode: sf.periode, mapel: sf.mapel })} />}
          {!st.loading && !st.error && !saran && <p className="text-sm text-mute">Isi nama kitab (dan sebaiknya daftar isinya), lalu minta saran. Hasilnya bisa dipakai untuk menentukan bab yang disusun soalnya dan untuk menandai bab pada tiap soal.</p>}
        </div>
      </Section>

      <Filters f={kf} setF={(v) => { setKf(v); setPicked(null); }} count={list.length} qs={approved} />
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="min-w-0 space-y-5 lg:col-span-5">
          <Section title="Soal untuk Kisi-kisi" icon={ClipboardCheck}
            action={list.length > 0 && <button type="button" className="text-xs font-semibold text-soft-ink hover:underline"
              onClick={() => setPicked(!picked || picked.size === list.length ? new Set() : null)}>{!picked || picked.size === list.length ? 'Kosongkan' : 'Pilih semua'}</button>}>
            {!list.length ? <p className="text-sm text-mute">{catatan ? 'Belum ada soal tersimpan yang cocok dengan filter.' : 'Belum ada soal Approved yang cocok dengan filter.'}</p> : (
              <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {list.map((q, i) => {
                  const on = !picked || picked.has(q.id);
                  return (
                    <li key={q.id}>
                      <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${on ? 'border-brand bg-soft' : 'border-line'}`}>
                        <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[var(--brand)]" checked={on} onChange={() => toggle(q.id)} />
                        <span className="min-w-0">
                          <span className="block break-words font-medium">{q.pertanyaan}</span>
                          <span className="mt-1 block text-xs text-mute">{q.bab ? `Bab: ${q.bab}` : 'Belum ditandai bab'} · {q.level}{String(q.indikator || '').trim() ? '' : ' · tanpa indikator'}</span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>
        <div className="min-w-0 space-y-5 lg:col-span-7">
          <Section title="Dokumen Kisi-kisi" icon={ListChecks}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label htmlFor="ks-judul" hint="(mis. UTS Fiqih)">Judul</Label><input id="ks-judul" maxLength={80} className="field" value={meta.judul} onChange={(e) => setMeta((m) => ({ ...m, judul: e.target.value }))} /></div>
              <div><Label htmlFor="ks-madrasah" hint="(opsional)">Nama madrasah</Label><input id="ks-madrasah" maxLength={80} className="field" value={meta.madrasah} onChange={(e) => setMeta((m) => ({ ...m, madrasah: e.target.value }))} /></div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Btn kind="primary" onClick={() => unduh('lengkap')} disabled={!kisi || !!busy}>{busy === 'lengkap' ? <Loader2 size={16} className="spin" /> : <Download size={16} />}Kisi-kisi + Lembar Fokus (DOCX)</Btn>
              <Btn kind="ghost" onClick={() => unduh('kisi')} disabled={!kisi || !!busy}><FileText size={16} />Kisi-kisi guru (DOCX)</Btn>
              <Btn kind="ghost" onClick={() => unduh('fokus')} disabled={!kisi || !!busy}><Users size={16} />Lembar fokus murid (DOCX)</Btn>
              <Btn kind="ghost" onClick={() => unduh('csv')} disabled={!kisi || !!busy}><FileSpreadsheet size={16} />CSV</Btn>
              <Btn kind="ghost" onClick={salin} disabled={!kisi}><Copy size={16} />Salin teks</Btn>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-mute">Kunci jawaban, opsi, dan pembahasan tidak pernah dimasukkan, jadi aman dibagikan kepada murid. Nomor soal mengikuti urutan soal terpilih; bila Anda juga mengekspor naskah di tab Export/Download, samakan filter dan pilihan soalnya agar nomornya cocok. Halaman yang tertulis adalah halaman sumber soal, bukan seluruh bab.</p>
          </Section>

          <Section title="Pratinjau Kisi-kisi" lipat>
            {!kisi ? <p className="text-sm text-mute">{catatan ? 'Pilih minimal satu soal.' : 'Pilih minimal satu soal Approved.'}</p> : (
              <div className="max-h-[420px] space-y-3 overflow-auto rounded-xl bg-bg p-4 text-sm">
                {kisi.tanpaBab > 0 && <p role="alert" className="rounded-lg bg-warn-bg px-3 py-2 text-xs leading-relaxed text-warn">{kisi.tanpaBab} soal belum ditandai bab, jadi dikumpulkan di “Belum ditandai bab”. Edit soalnya dan isi kolom Bab agar masuk kelompok yang benar.</p>}
                {tanpaIndikator > 0 && <p role="alert" className="rounded-lg bg-warn-bg px-3 py-2 text-xs leading-relaxed text-warn">{tanpaIndikator} soal belum punya indikator, jadi barisnya kosong di kisi-kisi. Isi kolom Indikator Kisi-kisi pada soal itu.</p>}
                {kisi.kelompok.map((g) => (
                  <div key={`${g.bab}|${g.rujukan}`}>
                    <p className="font-bold">{g.bab}{g.prioritas && <span className={'ml-2 rounded-md px-2 py-px text-xs font-bold ' + (PRIO_BAB[g.prioritas] || PRIO_BAB.penting)[1]}>{(PRIO_BAB[g.prioritas] || PRIO_BAB.penting)[0]}</span>}</p>
                    <p className="text-xs text-mute">{g.jumlah} soal ({g.bobot}%){g.rujukan ? ` · ${g.rujukan}` : ''}</p>
                    <ul className="mt-1 space-y-0.5">{g.soal.map((s) => <li key={s.no} className="text-xs leading-relaxed"><b>No. {s.no}</b> · {s.level} · {s.indikator || '(indikator belum diisi)'}</li>)}</ul>
                  </div>))}
                <p className="text-xs font-semibold text-soft-ink">Ringkasan level: L1 {kisi.perLevel.L1} · L2 {kisi.perLevel.L2} · L3 {kisi.perLevel.L3}</p>
              </div>)}
          </Section>

          {cakupanHasil && (
            <Section title="Cakupan terhadap Saran AI" icon={Target}>
              {cakupanHasil.intiKosong.length > 0 && <p role="alert" className="mb-3 rounded-lg bg-bad-bg px-3 py-2 text-xs leading-relaxed text-bad">Bab inti belum punya soal: {cakupanHasil.intiKosong.join(', ')}.</p>}
              <ul className="space-y-1.5 text-sm">
                {cakupanHasil.baris.map((b) => (
                  <li key={b.nama} className="flex flex-wrap items-center gap-2">
                    <span className={'shrink-0 rounded-md px-2 py-px text-xs font-bold ' + (CAKUPAN_STATUS[b.status] || CAKUPAN_STATUS.ada)[1]}>{(CAKUPAN_STATUS[b.status] || CAKUPAN_STATUS.ada)[0]}</span>
                    <span className="min-w-0 flex-1">{b.nama}</span>
                    <span className="text-xs text-mute">{b.jumlah}{b.alokasi ? ` dari ${b.alokasi}` : ''} soal</span>
                  </li>))}
              </ul>
              {cakupanHasil.diluarSaran.length > 0 && <p className="mt-3 text-xs leading-relaxed text-mute">Soal di bab di luar saran: {cakupanHasil.diluarSaran.map((x) => `${x.bab} (${x.jumlah})`).join(', ')}.</p>}
              {cakupanHasil.tanpaBab > 0 && <p className="mt-1 text-xs text-mute">{cakupanHasil.tanpaBab} soal belum ditandai bab sehingga tidak terhitung di sini.</p>}
            </Section>)}
        </div>
      </div>
    </div>
  );
}

function TahapEditorPilih({ r, onSet, disabled }) {
  const sel = AL.tahapDitugaskan(r);
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className="text-mute">Tahap editor:</span>
      {Array.from({ length: AL.MAKS_TAHAP }, (_, i) => i + 1).map((n) => (
        <label key={n} className="inline-flex items-center gap-1">
          <input type="checkbox" className="h-4 w-4" disabled={disabled} checked={sel.includes(n)} onChange={(e) => onSet(r.id, e.target.checked ? [...sel, n].sort() : sel.filter((x) => x !== n))} aria-label={`Editor tahap ${n}: ${r.name || r.email}`} />{n}
        </label>
      ))}
    </div>
  );
}

/* ---------- Pengguna (admin) ---------- */
function UserAdmin({ me, toast }) {
  const [rows, setRows] = useState(null);
  useEffect(() => firebase.firestore().collection('users').orderBy('createdAt', 'desc').onSnapshot(
    (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }))),
    () => setRows([]),
  ), []);
  const setRole = async (id, role) => {
    try { await firebase.firestore().doc('users/' + id).update({ role }); toast('Peran diperbarui.'); }
    catch (e) { toast('Gagal mengubah peran.'); }
  };
  const setTahap = async (id, tahapEditor) => {
    try { await firebase.firestore().doc('users/' + id).update({ tahapEditor }); toast('Tahap editor diperbarui.'); }
    catch (e) { toast('Gagal mengubah tahap editor. Pastikan firestore.rules terbaru sudah diterbitkan.'); }
  };
  if (!rows) return <div className="flex justify-center py-16 text-mute"><Loader2 className="spin" /></div>;
  const waiting = rows.filter((r) => r.role === 'pending').length;
  return (
    <div className="fade-in space-y-4">
      <div className="rounded-2xl border border-line bg-surface p-4 text-sm text-mute">
        Pengguna baru masuk dengan status <b className="text-ink">Menunggu persetujuan</b>. Beri peran agar mereka bisa bekerja.
        Penyusun membuat soal, editor meninjau, admin mengelola semuanya. Ustadz memakai alat bantu (AI, Pegon, ekspor) untuk soal latihan sendiri, tanpa akses ke bank soal.{waiting > 0 && <b className="ml-1 text-warn">{waiting} menunggu.</b>}
      </div>
      <ul className="divide-y divide-line rounded-2xl border border-line bg-surface sm:hidden">
        {rows.map((r) => (
          <li key={r.id} className="space-y-2 p-4">
            <div className="min-w-0"><p className="break-words font-semibold">{r.name || r.email}</p><p className="break-all text-xs text-mute">{r.email}</p></div>
            <select aria-label={'Peran ' + (r.name || r.email)} className="field" value={r.role} disabled={r.id === me.uid} onChange={(e) => setRole(r.id, e.target.value)}>
              {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {r.role === 'editor' && <TahapEditorPilih r={r} disabled={r.id === me.uid} onSet={setTahap} />}
            <p className="text-xs text-mute">{r.id === me.uid ? '(Anda) · ' : ''}Terakhir masuk: {(() => { try { const d = r.lastLoginAt && r.lastLoginAt.toDate ? r.lastLoginAt.toDate() : null; return d ? d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'; } catch (e) { return '-'; } })()}</p>
          </li>
        ))}
      </ul>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface max-sm:hidden">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-mute">
            <tr><th className="px-4 py-3">Pengguna</th><th className="px-4 py-3">Peran</th><th className="px-4 py-3">Terakhir masuk</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3"><p className="font-semibold">{r.name || r.email}</p><p className="text-xs text-mute">{r.email}</p></td>
                <td className="px-4 py-3">
                  <select aria-label={'Peran ' + (r.name || r.email)} className="field !w-auto" value={r.role} disabled={r.id === me.uid} onChange={(e) => setRole(r.id, e.target.value)}>
                    {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  {r.id === me.uid && <span className="ml-2 text-xs text-mute">(Anda)</span>}
                  {r.role === 'editor' && <TahapEditorPilih r={r} disabled={r.id === me.uid} onSet={setTahap} />}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-mute">{(() => { try { const d = r.lastLoginAt && r.lastLoginAt.toDate ? r.lastLoginAt.toDate() : null; return d ? d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'; } catch (e) { return '-'; } })()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Dasbor admin: kuota AI per pengguna, sisa kuota harian, antrean review ---------- */
// Kuota dibaca di server (/api/admin-stats) dari dokumen rate/{id}; hitungan hanya untuk HARI INI (WIB), tanpa riwayat. Antrean review dihitung dari
// soal pending yang sudah dimuat realtime di App, jadi tidak menambah bacaan Firestore.
const KUOTA_LABEL = { aman: ['Aman', 'bg-ok-bg text-ok'], hampir: ['Hampir habis', 'bg-warn-bg text-warn'], habis: ['Habis', 'bg-bad-bg text-bad'] };
const KUOTA_WARNA = { aman: 'bg-ok', hampir: 'bg-warn', habis: 'bg-bad' };
const BadgeKuota = ({ status }) => <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${KUOTA_LABEL[status][1]}`}>{KUOTA_LABEL[status][0]}</span>;
const BatangKuota = ({ persen, status, label }) => (
  <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={persen} className="h-2 w-full overflow-hidden rounded-full bg-soft">
    <div className={`h-full rounded-full ${KUOTA_WARNA[status]}`} style={{ width: persen + '%' }} />
  </div>
);
const UMUR_CLS = { baru: 'text-mute', waspada: 'text-warn', lewat: 'text-bad' };

function Dasbor({ pending, onBukaReview }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [semua, setSemua] = useState(false);
  const [waktu, setWaktu] = useState(0);
  const muat = async () => {
    setBusy(true);
    try { setD(await callApi('/api/admin-stats', { semua })); setWaktu(Date.now()); setErr(null); }
    catch (e) { setErr(apiErr(e)); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    muat();
    const t = setInterval(() => { if (document.visibilityState !== 'hidden') muat(); }, 120000);
    return () => clearInterval(t);
  }, [semua]);
  const antrean = useMemo(() => DB.ringkasAntrean(pending, Date.now()), [pending, waktu]);
  return <DasborView d={d} err={err} busy={busy} semua={semua} setSemua={setSemua} waktu={waktu} onMuat={muat} antrean={antrean} onBukaReview={onBukaReview} />;
}

// Tampilan murni (tanpa pengambilan data): dirender langsung di tes dengan data contoh.
function DasborView({ d, err, busy, semua, setSemua, waktu, onMuat, antrean, onBukaReview }) {
  const kolamBermasalah = d ? d.kolam.filter((k) => k.status !== 'aman') : [];
  return (
    <div className="fade-in space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
        <p className="mr-auto text-mute">
          {d ? <>Kuota direset otomatis pukul 00.00 WIB, <b className="text-ink">{DB.teksSisaWaktu(d.resetDalamDetik)}</b> lagi. </> : null}
          {waktu ? `Diperbarui ${new Date(waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}; otomatis tiap 2 menit.` : 'Memuat...'}
        </p>
        <Btn kind="ghost" onClick={onMuat} disabled={busy}>{busy ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />}Segarkan</Btn>
      </div>
      {err && <ErrorBox e={err} />}
      {kolamBermasalah.map((k) => (
        <p key={k.id} role="alert" className={`rounded-xl px-4 py-3 text-sm ${k.status === 'habis' ? 'bg-bad-bg text-bad' : 'bg-warn-bg text-warn'}`}>
          <b>{k.status === 'habis' ? 'Kuota AI ' : 'Kuota AI hampir habis: '}{k.label}{k.status === 'habis' ? ' sudah habis.' : ` (${k.dipakai}/${k.batas}).`}</b>{' '}
          {k.status === 'habis' ? 'Semua permintaan AI kelompok ini ditolak sampai reset. ' : ''}Naikkan <code>{k.env}</code> di Vercel (Environment Variables) lalu Redeploy, atau tunggu reset.
        </p>
      ))}
      {!d && !err && <div className="flex justify-center py-12 text-mute"><Loader2 className="spin" /></div>}

      {d && (
        <Section title="Plafon harian AI" icon={Sparkles}>
          <div className="grid gap-3 sm:grid-cols-2">
            {d.kolam.map((k) => (
              <div key={k.id} className="rounded-xl border border-line p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{k.label}</p><BadgeKuota status={k.status} /></div>
                <p className="mb-2 text-2xl font-extrabold">{k.dipakai}<span className="text-base font-semibold text-mute"> / {k.batas}</span></p>
                <BatangKuota persen={k.persen} status={k.status} label={'Plafon ' + k.label} />
                <p className="mt-2 text-xs text-mute">Sisa <b className="text-ink">{k.sisa}</b> permintaan hari ini, dipakai semua pengguna kelompok ini bersama.</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {d && (
        <Section title="Pemakaian AI per pengguna (hari ini)" icon={Users}
          action={<label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={semua} onChange={(e) => setSemua(e.target.checked)} />Tampilkan juga yang belum memakai</label>}>
          {!d.pengguna.length ? <p className="text-sm text-mute">Belum ada yang memakai AI hari ini.</p> : (
            <>
            <ul className="divide-y divide-line sm:hidden">
              {d.pengguna.map((r) => (
                <li key={r.uid} className="space-y-2 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="break-words font-semibold">{r.nama}</p><p className="break-all text-xs text-mute">{ROLE_LABEL[r.role] || r.role || 'Tidak dikenal'}{r.email && r.email !== r.nama ? ' · ' + r.email : ''}</p></div>
                    <BadgeKuota status={r.status} />
                  </div>
                  <BatangKuota persen={r.persen} status={r.status} label={'Kuota ' + r.nama} />
                  <p className="text-xs text-mute">Terpakai <b className="text-ink">{r.dipakai} / {r.batas}</b> · sisa <b className="text-ink">{r.sisa}</b></p>
                </li>
              ))}
            </ul>
            <div className="overflow-x-auto max-sm:hidden">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-wide text-mute">
                  <tr><th className="px-2 py-2">Pengguna</th><th className="px-2 py-2">Terpakai</th><th className="w-32 px-2 py-2"><span className="sr-only">Proporsi</span></th><th className="px-2 py-2">Sisa</th><th className="px-2 py-2">Status</th></tr>
                </thead>
                <tbody>
                  {d.pengguna.map((r) => (
                    <tr key={r.uid} className="border-b border-line last:border-0">
                      <td className="px-2 py-2.5"><p className="font-semibold">{r.nama}</p><p className="text-xs text-mute">{ROLE_LABEL[r.role] || r.role || 'Tidak dikenal'}{r.email && r.email !== r.nama ? ' · ' + r.email : ''}</p></td>
                      <td className="whitespace-nowrap px-2 py-2.5 font-semibold">{r.dipakai} / {r.batas}</td>
                      <td className="px-2 py-2.5"><BatangKuota persen={r.persen} status={r.status} label={'Kuota ' + r.nama} /></td>
                      <td className="px-2 py-2.5">{r.sisa}</td>
                      <td className="px-2 py-2.5"><BadgeKuota status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
          <p className="mt-3 text-xs leading-relaxed text-mute">
            Total {d.totalHariIni} permintaan hari ini{d.penggunaHabis > 0 ? `; ${d.penggunaHabis} pengguna sudah kena batas hariannya` : ''}. Permintaan yang gagal di sisi server sudah dikembalikan dan tidak dihitung.
            Hanya hari ini yang tersimpan; belum ada riwayat harian atau bulanan.{d.terpotong ? ' Daftar dipotong 300 baris.' : ''}
          </p>
        </Section>
      )}

      <Section title="Antrean review" icon={ClipboardCheck} action={<Btn kind="ghost" onClick={onBukaReview}><ClipboardCheck size={15} />Buka Review</Btn>}>
        {!antrean.total ? <p className="text-sm text-mute">Tidak ada soal yang menunggu review.</p> : (
          <div className="space-y-3">
            <p className="text-sm"><b>{antrean.total}</b> soal menunggu review; yang tertua <b className={UMUR_CLS[DB.tandaUmur(antrean.tertuaHari)]}>{DB.teksUmur(antrean.tertuaHari)}</b>.</p>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {antrean.lewat > 0 && <span className="rounded-full bg-bad-bg px-2.5 py-0.5 text-bad">{antrean.lewat} lewat {DB.HARI_LEWAT} hari</span>}
              {antrean.waspada > 0 && <span className="rounded-full bg-warn-bg px-2.5 py-0.5 text-warn">{antrean.waspada} lewat {DB.HARI_WASPADA} hari</span>}
              {antrean.perluAlasan > 0 && <span className="rounded-full bg-warn-bg px-2.5 py-0.5 text-warn">{antrean.perluAlasan} perlu catatan alasan (kutipan tak cocok / uji buta berbeda)</span>}
            </div>
            <p className="text-xs text-mute">Per penyusun: {antrean.perPenyusun.map((x) => `${x.nama} (${x.jumlah})`).join(', ')}</p>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {antrean.tertua.map((t) => (
                <li key={t.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1"><span className="line-clamp-2">{t.pertanyaan || '(tanpa pertanyaan)'}</span><span className="block text-xs text-mute">{[t.nama, t.authorName].filter(Boolean).join(' · ')}{t.perluAlasan ? ' · perlu alasan' : ''}</span></span>
                  <span className={`shrink-0 text-xs font-semibold ${UMUR_CLS[DB.tandaUmur(t.hari)]}`}>{DB.teksUmur(t.hari)}</span>
                </li>
              ))}
            </ul>
            {antrean.total > antrean.tertua.length && <p className="text-xs text-mute">Menampilkan {antrean.tertua.length} tertua dari {antrean.total}.</p>}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ---------- App ---------- */
/* ---------- Pegonizer: alih aksara Latin ke Pegon (standar al-Qolam '24), mesin aturan di browser + bantuan AI lewat server ---------- */
// Pustaka berat dimuat malas dari paket npm (ikut dibundel Vite, dipisah jadi potongan sendiri); bukan lagi dari CDN.
const muatMammoth = async () => { const m = await import('mammoth/mammoth.browser.min.js'); return m.extractRawText ? m : m.default; };
const muatPdfjs = async () => {
  const [m, worker] = await Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'), import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')]);
  const lib = m.getDocument ? m : m.default;
  lib.GlobalWorkerOptions.workerSrc = worker.default;
  return lib;
};

async function bacaFile(file) {
  const nama = file.name.toLowerCase();
  if (nama.endsWith('.docx')) {
    const mammoth = await muatMammoth();
    return { teks: (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value, arab: false };
  }
  if (file.type === 'application/pdf' || nama.endsWith('.pdf')) {
    const pdfjsLib = await muatPdfjs();
    const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
    const halaman = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const content = await (await doc.getPage(i)).getTextContent();
      let out = '', lastY = null, lastH = 12;
      for (const it of content.items) {
        const y = it.transform[5], h = Math.abs(it.transform[3]) || 12;
        if (lastY !== null && Math.abs(y - lastY) > 2) out += Math.abs(y - lastY) > lastH * 1.7 ? '\n\n' : ' ';
        out += it.str; lastY = y; lastH = h;
      }
      halaman.push(out.replace(/ {2,}/g, ' ').trim());
    }
    const teks = halaman.join('\n\n');
    return { teks, arab: /[\u0600-\u06ff\ufb50-\ufdff\ufe70-\ufeff]/.test(teks) };
  }
  throw { code: 'FILE', message: 'Format file tidak didukung. Gunakan .docx atau .pdf.' };
}

// Foto diperkecil di browser (maks. 1600 px bawaan, JPEG) agar muat dalam batas isi permintaan server.
const siapkanFoto = (file, maksPx = 1600) => new Promise((res, rej) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const k = Math.min(1, maksPx / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    res({ mime: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.85).split(',')[1] });
  };
  img.onerror = () => { URL.revokeObjectURL(url); rej({ code: 'FILE', message: 'Foto tidak bisa dibaca. Coba foto lain.' }); };
  img.src = url;
});

const pegonDocx = async (teks) => {
  const D = await muatDocx();
  const paras = String(teks || '').split(/\n+/).filter((p) => p.trim()).map((p) => new D.Paragraph({
    bidirectional: true, spacing: { after: 160 },
    children: [new D.TextRun({ text: p, font: 'Traditional Arabic', size: 36, rightToLeft: true })],
  }));
  return D.Packer.toBlob(new D.Document({ sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: paras }] }));
};

function PegonKamus({ onChange }) {
  const P = window.Pegon;
  const [, setTick] = useState(0);
  const [cari, setCari] = useState('');
  const FKAMUS = { lat: '', ar: '', e: '', tipe: 'keras', suf: '' };
  const [f, setF] = useState(() => bacaPref('pegonKamusForm', FKAMUS));
  useDraftSync('pegonKamusForm', f, JSON.stringify(f) === JSON.stringify(FKAMUS));
  const [pesan, setPesan] = useState('');
  const sync = () => { setTick((n) => n + 1); onChange && onChange(); };
  const act = (r) => { setPesan(r && r.ok === false ? r.pesan : ''); if (!r || r.ok !== false) sync(); return !r || r.ok !== false; };
  const bawaan = useMemo(() => Object.entries(P.kamus.bawaan().arab).sort((a, b) => a[0].localeCompare(b[0])), []);
  const k = P.kamus.kustom();
  const q = cari.trim().toLowerCase();
  const hit = q ? bawaan.filter(([l, a]) => l.includes(q) || a.includes(q)) : [];
  const Chip2 = ({ children, onDel }) => (
    <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-bg px-2.5 py-1 text-sm">{children}
      {onDel && <button type="button" aria-label="Hapus" onClick={onDel} className="text-mute hover:text-bad"><X size={14} /></button>}
    </span>
  );
  const impor = async (e) => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    try { const r = P.kamus.impor(await file.text()); setPesan(`Kamus digabung: ${r.masuk} entri masuk${r.lewat ? `, ${r.lewat} dilewati karena tidak valid` : ''}.`); sync(); }
    catch (err) { setPesan('Gagal membaca berkas kamus (harus .json hasil ekspor aplikasi ini).'); }
  };
  const kc = useKamus();
  const [bagi, setBagi] = useState(false);
  const bersamaDocs = useMemo(() => [...kc.docs].sort((a, b) => String(a.kata).localeCompare(String(b.kata))), [kc.docs]);
  const bersamaHit = q ? bersamaDocs.filter((d) => String(d.kata).includes(q) || String(d.arab || '').includes(q)) : bersamaDocs;
  const lokal = P.kamus.entriLokal();
  const bentrok = P.kamus.bentrok();
  const bagikanLokal = async () => {
    if (!lokal.entri.length) return setPesan('Belum ada tambahan di perangkat ini untuk dibagikan.');
    if (!window.confirm(`Bagikan ${lokal.entri.length} entri dari perangkat ini ke kamus bersama? Semua pengguna akan memakainya, dan entri yang sama di kamus bersama akan tertimpa.`)) return;
    setBagi(true);
    try {
      const ok = await kc.simpan(lokal.entri);
      // Entri yang sudah dibagikan dicabut dari lokal: kalau dibiarkan, salinan lokal yang usang akan menimpa koreksi editor lain di perangkat ini.
      for (const en of ok) { if (en.jenis === 'arab') P.kamus.hapusArab(en.kata); else if (en.jenis === 'e') P.kamus.hapusE(en.kata); else P.kamus.hapusSuffixExc(en.kata); }
      setPesan(`${ok.length} entri dibagikan dan dipindah dari perangkat ini ke kamus bersama.${lokal.lewat ? ` ${lokal.lewat} entri lokal dilewati karena tidak memenuhi aturan kamus bersama (hanya huruf Arab dasar).` : ''}`);
      sync();
    } catch (e) { setPesan(e && e.code === 'permission-denied' ? 'Ditolak server: peran Anda tidak boleh mengubah kamus bersama.' : (e && e.message) || 'Gagal membagikan. Periksa koneksi lalu coba lagi.'); }
    finally { setBagi(false); }
  };
  const hapusBersama = async (d) => {
    if (!window.confirm(`Hapus "${d.kata}" dari kamus bersama? Semua pengguna akan kembali ke kamus bawaan untuk kata ini.`)) return;
    try { await kc.hapus(d.id); } catch (e) { setPesan((e && e.message) || 'Gagal menghapus.'); }
  };
  const pakaiBersama = () => { for (const b of bentrok) { if (b.jenis === 'arab') P.kamus.hapusArab(b.kata); else P.kamus.hapusE(b.kata); } sync(); setPesan('Entri perangkat yang berbeda dari kamus bersama sudah dibuang.'); };
  return (
    <div className="space-y-5 text-sm">
      <div className="rounded-xl border border-line p-3">
        <Label hint={`(${bersamaDocs.length} entri, dipakai semua pengguna)`}>Kamus bersama madrasah</Label>
        <p className="mt-1 text-mute">Urutan pemakaian mesin: kamus bawaan, lalu kamus bersama, lalu tambahan di perangkat ini (yang terakhir menang di perangkat ini saja).{' '}
          {kc.canShare ? 'Sebagai editor/admin Anda dapat menambah dan menghapus entri bersama; semua perubahan terlihat oleh seluruh pengguna.' : 'Perubahan kamus bersama hanya oleh editor atau admin. Koreksi Anda tersimpan di perangkat ini; untuk membagikannya, ekspor lalu serahkan berkasnya ke editor.'}</p>
        {kc.err && <p role="alert" className="mt-2 rounded-lg bg-bad-bg px-3 py-2 text-bad">{kc.err}</p>}
        {bentrok.length > 0 && (
          <div className="mt-2 rounded-lg bg-warn-bg px-3 py-2 text-warn">
            <p className="font-semibold">{bentrok.length} entri perangkat ini berbeda dari kamus bersama, sehingga hasil Pegon di sini bisa berbeda dari rekan Anda:</p>
            <p className="mt-1">{bentrok.map((b) => `${b.kata} (${b.jenis === 'arab' ? b.lokal + ' ≠ ' + b.bersama : b.lokal + ' ≠ ' + b.bersama})`).join(', ')}</p>
            <div className="mt-2"><Btn onClick={pakaiBersama}>Pakai kamus bersama</Btn></div>
          </div>
        )}
        {kc.canShare && <div className="mt-3"><Btn kind="soft" disabled={bagi} onClick={bagikanLokal}>{bagi ? 'Membagikan…' : `Bagikan tambahan perangkat ini (${lokal.entri.length})`}</Btn></div>}
        <div className="mt-3 flex flex-wrap gap-2">
          {bersamaHit.slice(0, 80).map((d) => (
            <span key={d.id} title={d.updatedByName ? 'Oleh ' + d.updatedByName : ''} className="inline-flex items-center gap-2 rounded-lg border border-line bg-bg px-2.5 py-1 text-sm">
              {d.jenis === 'arab' && <span className="ar-sm" dir="rtl">{d.arab}</span>}
              <span className="text-mute">{d.kata}{d.jenis === 'e' ? ' · e ' + d.tipe : d.jenis === 'suf' ? ' · akar' : ''}</span>
              {kc.canShare && <button type="button" aria-label="Hapus dari kamus bersama" onClick={() => hapusBersama(d)} className="text-mute hover:text-bad"><X size={14} /></button>}
            </span>
          ))}
          {!bersamaDocs.length && <span className="text-mute">Belum ada entri bersama.</span>}
          {bersamaHit.length > 80 && <span className="text-mute">…dan {bersamaHit.length - 80} lagi (persempit dengan kolom cari di bawah).</span>}
        </div>
      </div>
      <p className="text-mute">Tambahan di bawah tersimpan di browser perangkat ini saja. Gunakan ekspor dan impor untuk memindahkannya ke perangkat atau rekan lain.</p>
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => { if (P.kamus.kosong()) return setPesan('Belum ada tambahan untuk diekspor.'); simpanBerkas('kamus-pegon.json', new Blob([P.kamus.ekspor()], { type: 'application/json' })); }}>Ekspor kamus</Btn>
        <label className="inline-flex cursor-pointer items-center rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:bg-soft">Impor kamus<input type="file" accept="application/json,.json" className="hidden" onChange={impor} /></label>
      </div>
      {pesan && <p role="status" className="rounded-lg bg-warn-bg px-3 py-2 text-warn">{pesan}</p>}

      <div>
        <Label>Kata serapan Arab</Label>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input className="field" placeholder="Kata Latin, mis. tawakal" value={f.lat} onChange={(e) => setF({ ...f, lat: e.target.value })} />
          <input className="field ar-sm" dir="rtl" lang="ar" placeholder="Ejaan Arab, mis. توكل" value={f.ar} onChange={(e) => setF({ ...f, ar: e.target.value })} />
          <Btn onClick={() => act(P.kamus.tambahArab(f.lat, f.ar)) && setF({ ...f, lat: '', ar: '' })}>Tambah</Btn>
        </div>
        <input className="field mt-3" placeholder={`Cari di ${bawaan.length} kata bawaan (mis. hisab, wajib, dalil)`} value={cari} onChange={(e) => setCari(e.target.value)} />
        {q && <div className="mt-2 flex flex-wrap gap-2">{hit.length ? hit.slice(0, 60).map(([l, a]) => <Chip2 key={l}><span className="ar-sm" dir="rtl">{a}</span><span className="text-mute">{l}</span></Chip2>) : <span className="text-mute">Tidak ada yang cocok.</span>}{hit.length > 60 && <span className="text-mute">…dan {hit.length - 60} lainnya.</span>}</div>}
        <div className="mt-3 flex flex-wrap gap-2">{Object.entries(k.arab).length ? Object.entries(k.arab).map(([l, a]) => <Chip2 key={l} onDel={() => { P.kamus.hapusArab(l); sync(); }}><span className="ar-sm" dir="rtl">{a}</span><span className="text-mute">{l}</span></Chip2>) : <span className="text-mute">Belum ada tambahan Anda.</span>}</div>
      </div>

      <div>
        <Label>Kata dengan bunyi "e"</Label>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input className="field" placeholder="Kata, mis. reken" value={f.e} onChange={(e) => setF({ ...f, e: e.target.value })} />
          <Select value={f.tipe} onChange={(v) => setF({ ...f, tipe: v })}><option value="keras">e keras (ي)</option><option value="pepet">e pepet (tidak ditulis)</option></Select>
          <Btn onClick={() => act(P.kamus.tambahE(f.e, f.tipe)) && setF({ ...f, e: '' })}>Tambah</Btn>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">{[...k.keras.map((w) => [w, 'e keras']), ...k.pepet.map((w) => [w, 'e pepet'])].map(([w, t]) => <Chip2 key={w} onDel={() => { P.kamus.hapusE(w); sync(); }}>{w}<span className="text-mute">{t}</span></Chip2>)}</div>
      </div>

      <div>
        <Label hint="(kata berakhiran kan/kah/lah yang bukan akhiran, mis. seolah)">Akar pengecualian</Label>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input className="field" placeholder="Kata, mis. seolah" value={f.suf} onChange={(e) => setF({ ...f, suf: e.target.value })} />
          <Btn onClick={() => act(P.kamus.tambahSuffixExc(f.suf)) && setF({ ...f, suf: '' })}>Tambah</Btn>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">{k.suffixExc.map((w) => <Chip2 key={w} onDel={() => { P.kamus.hapusSuffixExc(w); sync(); }}>{w}</Chip2>)}</div>
      </div>
    </div>
  );
}

function PegonTabInti({ toast }) {
  const P = window.Pegon;
  const kcTab = useKamus();
  // Mode dan teks Latin dipulihkan setelah muat ulang. Foto (berkas), hasil konversi, dan hasil suntingan manual tidak ikut: konversi ulang dengan satu klik.
  const pgAwal = useRef(undefined); if (pgAwal.current === undefined) { const d = Draft.read('pegonTab'); pgAwal.current = d && typeof d === 'object' ? d : {}; }
  const [ejaan, setEjaan] = useEjaan();
  const [mode, setMode] = useState(() => (['teks', 'file', 'foto'].includes(pgAwal.current.mode) ? pgAwal.current.mode : 'teks')); // teks | file | foto
  const [latin, setLatin] = useState(() => (typeof pgAwal.current.latin === 'string' ? pgAwal.current.latin : ''));
  const [fileInfo, setFileInfo] = useState(() => { const x = pgAwal.current.fileInfo; return x && typeof x === 'object' && typeof x.nama === 'string' ? { nama: x.nama.slice(0, 200), arab: x.arab === true } : null; }); // { nama, arab }
  useEffect(() => {
    if (latin === 'Mengekstrak teks…') return; // keadaan sementara saat membaca berkas
    if (!latin.trim()) Draft.remove('pegonTab'); else Draft.save('pegonTab', { mode, latin, fileInfo });
  }, [mode, latin, fileInfo]);
  const [foto, setFoto] = useState(null);         // File
  const [hasil, setHasil] = useState(null);       // { id, html, details, tag, latin }
  const [warns, setWarns] = useState([]);
  const [infoAI, setInfoAI] = useState(null); // { perubahan, keyakinan, dikembalikan, bagian } dari Perkuat dengan AI
  const [rincian, setRincian] = useState(false);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState(null);
  const [mic, setMic] = useState({ on: false, hint: '' });
  const box = useRef(null);
  const rec = useRef(null);
  const base = useRef('');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  const teksHasil = () => (box.current ? box.current.innerText : '');
  const tampil = (html, details, tag, asal) => { setHasil({ id: Date.now(), html, details, tag, latin: asal }); setWarns([]); setInfoAI(null); setRincian(false); };

  const konversi = async () => {
    setErr(null);
    if (mode === 'foto') return konversiFoto();
    if (!latin.trim()) return toast('Isi teks terlebih dahulu (atau unggah file / foto).');
    const r = P.convertTextEjaan(latin, ejaan);
    tampil(r.html, r.details, ejaan === 'klasik' ? 'mesin aturan · ejaan klasik' : 'mesin aturan', latin);
  };
  const konversiFoto = async () => {
    if (!foto) return toast('Pilih foto terlebih dahulu.');
    setBusy('Membaca & mengonversi foto…');
    try {
      const gambar = await siapkanFoto(foto);
      const d = await callApi('/api/assist', { aksi: 'pegonfoto', gambar });
      tampil(P.escapeHtml(P.ubahEjaan(d.hasil.pegon, ejaan)).replace(/\n/g, '<br>'), [], 'AI · baca foto', d.hasil.latin);
      setWarns(d.hasil.peringatan || []);
    } catch (e) { setErr(apiErr(e)); } finally { setBusy(''); }
  };
  const perkuat = async () => {
    if (!hasil || !hasil.latin.trim()) return toast('Konversi teks dulu sebelum diperkuat dengan AI.');
    setErr(null); setBusy('Meminta AI memeriksa & memperkuat hasil…');
    try {
      // Konteks untuk AI: kata yang disorot mesin (beserta catatannya) dan kamus pengguna/bersama yang berlaku pada teks ini.
      const rincianAI = (hasil.details || []).filter((x) => x.flagged).slice(0, 60).map((x) => ({ latin: x.latin, pegon: x.pegon, catatan: x.note || '' }));
      const adaDi = new Set(hasil.latin.toLowerCase().match(/[a-z\u00e0-\u024f\u2019'-]+/g) || []);
      const kamusAI = Object.entries({ ...P.kamus.bersama().arab, ...P.kamus.kustom().arab }).filter(([k]) => adaDi.has(k)).slice(0, 80).map(([latinKata, arab]) => ({ latin: latinKata, arab }));
      const d = await callApi('/api/assist', { aksi: 'pegon', teks: hasil.latin, hasilMesin: teksHasil(), rincian: rincianAI, kamus: kamusAI });
      if (box.current) box.current.innerText = P.ubahEjaan(d.hasil.pegon, ejaan);
      setHasil((h) => ({ ...h, tag: 'diperkuat AI', details: [] })); setWarns(d.hasil.peringatan || []); setRincian(false);
      setInfoAI({ perubahan: d.hasil.perubahan || [], keyakinan: d.hasil.keyakinan || '', dikembalikan: d.hasil.dikembalikan || 0, bagian: d.hasil.bagian || null });
    } catch (e) { setErr(apiErr(e)); } finally { setBusy(''); }
  };
  const pilihFile = async (file) => {
    if (!file) return;
    setErr(null); setFileInfo({ nama: file.name, arab: false }); setLatin('Mengekstrak teks…');
    try {
      const r = await bacaFile(file);
      setLatin(r.teks.trim() || '(Tidak ada teks yang terbaca. Mungkin PDF hasil pindaian: coba mode Foto.)');
      setFileInfo({ nama: file.name, arab: r.arab });
    } catch (e) { setLatin(''); setFileInfo(null); setErr(e && e.code ? e : { code: 'FILE', message: 'Gagal membaca file: ' + ((e && e.message) || e) }); }
  };
  const bersihkan = () => { setLatin(''); setFileInfo(null); setFoto(null); setHasil(null); setWarns([]); setInfoAI(null); setErr(null); };

  const bicara = () => {
    if (!SR) return;
    if (mic.on) { rec.current && rec.current.stop(); return; }
    const r = new SR(); r.lang = 'id-ID'; r.continuous = false; r.interimResults = true;
    base.current = latin;
    r.onresult = (e) => { let fin = '', tmp = ''; for (let i = 0; i < e.results.length; i++) (e.results[i].isFinal ? (fin += e.results[i][0].transcript) : (tmp += e.results[i][0].transcript)); setLatin((base.current + ' ' + fin + tmp).trim()); };
    r.onerror = (e) => setMic({ on: false, hint: e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'Izin mikrofon ditolak. Aktifkan di pengaturan browser.' : e.error === 'no-speech' || e.error === 'aborted' ? '' : 'Gagal mengenali suara (' + e.error + ').' });
    r.onend = () => setMic((m) => ({ ...m, on: false }));
    rec.current = r; setMic({ on: true, hint: '' }); r.start();
  };
  useEffect(() => () => { try { rec.current && rec.current.abort(); } catch (e) {} }, []);

  const salin = async () => { try { await navigator.clipboard.writeText(teksHasil()); toast('Hasil Pegon disalin.'); } catch (e) { toast('Penyalinan ditolak browser. Pilih teks lalu salin manual.'); } };
  const unduhDocx = async () => { try { simpanBerkas('hasil-pegon.docx', await pegonDocx(teksHasil())); toast('File diunduh.'); } catch (e) { toast('Gagal membuat file: ' + (e.message || e)); } };
  const flagged = hasil ? hasil.details.filter((d) => d.flagged).length : 0;

  const MODES = [['teks', 'Teks'], ['file', 'File (Word/PDF)'], ['foto', 'Foto']];
  return (
    <div className="fade-in grid gap-5 lg:grid-cols-12">
      <div className="min-w-0 space-y-5 lg:col-span-5">
        <Section title="Teks Latin" icon={Languages}>
          <div role="tablist" className="mb-3 flex gap-1.5">
            {MODES.map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => setMode(id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${mode === id ? 'bg-soft text-soft-ink' : 'border border-line text-mute hover:bg-soft'}`}>{label}</button>
            ))}
          </div>
          {mode === 'teks' && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Btn onClick={bicara} disabled={!SR}><Mic size={16} />{mic.on ? 'Mendengarkan… (ketuk untuk berhenti)' : 'Bicara (Indonesia)'}</Btn>
                <span className="text-xs text-mute">{!SR ? 'Tidak didukung di browser ini. Coba Chrome di Android.' : mic.hint}</span>
              </div>
              <textarea className="field" rows={8} value={latin} onChange={(e) => setLatin(e.target.value)} placeholder="Tempel atau ketik teks Latin di sini…" />
              <div className="mt-2"><SaranTulisan teks={latin} P={P} Btn={Btn} ver={kcTab.ver} onUbah={setLatin} /></div>
            </div>
          )}
          {mode === 'file' && (
            <div className="space-y-2">
              <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm hover:bg-soft">
                <Upload size={20} /><span><b>Unggah file</b> Word (.docx) atau PDF</span>
                <input type="file" className="hidden" accept=".docx,.pdf,application/pdf" onChange={(e) => { pilihFile(e.target.files[0]); e.target.value = ''; }} />
              </label>
              {fileInfo && <p className="text-xs text-mute">{fileInfo.nama}</p>}
              {fileInfo && fileInfo.arab && <p className="rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn">File ini memuat aksara Arab. Dari PDF, teks Arab sering terbaca rusak (huruf bersambung hilang). Aksara Arab tidak diubah oleh mesin, tetapi periksa hasil ekstraksinya.</p>}
              <textarea className="field" rows={8} value={latin} onChange={(e) => setLatin(e.target.value)} placeholder="Teks hasil ekstraksi muncul di sini, bisa diedit sebelum dikonversi." />
              <div className="mt-2"><SaranTulisan teks={latin} P={P} Btn={Btn} ver={kcTab.ver} onUbah={setLatin} /></div>
            </div>
          )}
          {mode === 'foto' && (
            <div className="space-y-2">
              <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm hover:bg-soft">
                <Camera size={20} /><span><b>Ambil / unggah foto</b> teks Latin</span>
                <span className="text-xs text-mute">Dibaca dan dikonversi oleh AI server (memakai kuota AI madrasah)</span>
                <input type="file" className="hidden" accept="image/*" capture="environment" onChange={(e) => { setFoto(e.target.files[0] || null); e.target.value = ''; }} />
              </label>
              {foto && <p className="text-xs text-mute">{foto.name}</p>}
            </div>
          )}
          <div className="mt-4"><EjaanPilih id="pg-tab-ejaan" value={ejaan} onChange={setEjaan} /></div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn kind="primary" onClick={konversi} disabled={!!busy}>Konversi ke Pegon</Btn>
            <Btn onClick={bersihkan}>Bersihkan</Btn>
          </div>
        </Section>
        <details className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <summary className="cursor-pointer text-sm font-bold uppercase tracking-wide text-soft-ink">Kelola kamus tambahan</summary>
          <div className="mt-4"><PegonKamus onChange={() => {}} /></div>
        </details>
      </div>

      <div className="min-w-0 space-y-5 lg:col-span-7">
        {busy && <Spin>{busy}</Spin>}
        {err && <ErrorBox e={err} />}
        {!hasil ? (
          <Empty icon={Languages} title="Belum ada hasil" text="Ketik, unggah, atau foto teks Latin, lalu tekan Konversi ke Pegon." />
        ) : (
          <Section title={`Hasil Pegon · ${hasil.tag}`} icon={Languages}>
            <div className="mb-3 flex flex-wrap gap-2">
              <Btn onClick={salin}><Copy size={16} />Salin</Btn>
              <Btn onClick={() => simpanBerkas('hasil-pegon.txt', new Blob([teksHasil()], { type: 'text/plain;charset=utf-8' }))}><Download size={16} />.txt</Btn>
              <Btn onClick={unduhDocx}><FileText size={16} />.docx</Btn>
              <Btn kind="soft" onClick={perkuat} disabled={!!busy}><Sparkles size={16} />Perkuat dengan AI</Btn>
              {hasil.details.length > 0 && <Btn onClick={() => setRincian((v) => !v)}>{rincian ? 'Sembunyikan rincian' : 'Rincian per kata'}</Btn>}
            </div>
            <div key={hasil.id} ref={box} dir="rtl" lang="ar" contentEditable suppressContentEditableWarning spellCheck={false}
              className="ar rounded-xl border border-line bg-bg p-4 outline-none focus-visible:border-brand [&_.flag]:rounded [&_.flag]:bg-warn-bg [&_.flag]:px-0.5"
              dangerouslySetInnerHTML={{ __html: hasil.html }} />
            <p className="mt-2 text-xs text-mute">Hasil bisa diedit langsung. Transliterasi otomatis: periksa ulang oleh yang menguasai Pegon sebelum dipakai resmi.</p>
            {(flagged > 0 || warns.length > 0) && (
              <div className="mt-4 rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn">
                <p className="font-bold">Perlu diperiksa manual{flagged ? ` (${flagged} kata bersorot)` : ''}</p>
                {warns.map((w, i) => <p key={i} className="mt-1"><b>{w.kata}</b> — {w.catatan}</p>)}
                {(() => { const lihat = new Set(); return hasil.details.filter((d) => d.flagged && !lihat.has(d.latin.toLowerCase()) && lihat.add(d.latin.toLowerCase())).slice(0, 15).map((d, i) => (
                  <p key={'s' + i} className="mt-1 text-xs"><b>{d.latin}</b> — {saranSorotan(d.note)}</p>)); })()}
              </div>
            )}
            {infoAI && (
              <div className="mt-4 rounded-xl border border-line px-4 py-3 text-sm">
                <p className="font-bold">AI mengubah {infoAI.perubahan.length} kata{infoAI.keyakinan ? ` · keyakinan ${infoAI.keyakinan}` : ''}</p>
                {infoAI.dikembalikan > 0 && <p className="mt-1 text-xs text-mute">{infoAI.dikembalikan} perubahan tanpa alasan dibatalkan otomatis (kembali ke hasil mesin).</p>}
                {infoAI.bagian && infoAI.bagian.ditolak > 0 && <p className="mt-1 text-xs text-warn">{infoAI.bagian.ditolak} dari {infoAI.bagian.total} bagian gagal pemeriksaan otomatis; bagian itu tetap hasil mesin.</p>}
                {infoAI.perubahan.map((c, i) => <p key={i} className="mt-1"><span className="ar-sm" dir="rtl">{c.dari}</span> → <span className="ar-sm" dir="rtl">{c.ke}</span> <span className="text-xs text-mute">— {c.alasan}</span></p>)}
              </div>
            )}
            {hasil.tag.includes('foto') && hasil.latin && <p className="mt-3 text-xs text-mute">Teks Latin terbaca: {hasil.latin}</p>}
            {rincian && (
              <div className="mt-4 max-h-[360px] overflow-auto rounded-xl border border-line">
                <table className="w-full text-sm"><thead className="bg-soft text-left text-soft-ink"><tr><th className="p-2">Latin</th><th className="p-2">Pegon</th><th className="p-2">Ket.</th></tr></thead>
                  <tbody>{hasil.details.map((d, i) => <tr key={i} className={d.flagged ? 'bg-warn-bg' : ''}><td className="p-2">{d.latin}</td><td className="ar-sm p-2" dir="rtl">{d.pegon}</td><td className="p-2 text-xs text-mute">{d.note}</td></tr>)}</tbody></table>
              </div>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}

/* ---------- Paket Dauri: satu naskah IMDA utuh dari materi panjang (teks, berkas, atau banyak foto) ----------
 * Perencana ada di lib/paket.js (murni, bertes). Materi dibagi per segmen <= 6.000 karakter; tiap panggilan AI menyusun <= 6 butir dari satu segmen.
 * Hasil tidak langsung masuk bank: ditinjau dulu, lalu disimpan massal sebagai Draft (bukan Pending) agar penyusun sempat memeriksa kutipan dan kunci. */
const LABEL_BAGIAN = { a: 'أ  Pilihan', b: 'ب  Isian', c: 'ج  Uraian' };
const LABEL_KUTIPAN_STATUS = { cocok: 'Kutipan cocok dengan teks', mirip: 'Kutipan mirip teks (cek harakat)', tidak_cocok: 'Kutipan dibuang: tidak ada di teks', kosong: 'Tanpa kutipan' };
/** Pemeriksaan awal di klien (sama dengan arabicProblem di server): jangan buang kuota AI untuk teks yang pasti ditolak. */
const masalahArabPaket = (txt) => {
  let huruf = 0; let arab = 0;
  for (const ch of String(txt || '')) { if (/\p{L}/u.test(ch)) { huruf++; if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(ch)) arab++; } }
  if (huruf < 15) return 'Materi terlalu pendek. Tempel minimal satu kalimat lengkap.';
  if (bahasaOtomatis(txt) === 'ar' && arab / huruf < 0.6) return 'Materi terdeteksi campuran Arab dan huruf lain. Gunakan satu bahasa per paket.';
  return null;
};
const tidur = (ms, sinyal) => new Promise((res) => { const t = setTimeout(res, ms); if (sinyal) sinyal.addEventListener('abort', () => { clearTimeout(t); res(); }, { once: true }); });

/** Panggilan API dengan tunggu-dan-ulang untuk batas per menit (429) dan gangguan sesaat. Kuota harian habis tidak diulang. */
async function panggilSabar(path, body, sinyal, { onTunggu } = {}) {
  for (let i = 0; ; i++) {
    try { return await callApi(path, body, sinyal); } catch (e) {
      const ulang = e && ((e.status === 429 && e.code !== 'RATE_LIMIT_DAILY') || e.code === 'AI_OVERLOADED' || e.code === 'AI_TIMEOUT');
      if (!ulang || i >= 3 || (sinyal && sinyal.aborted)) throw e;
      const detik = Math.max(3, Math.min(90, Number(e.retryAfter) || 20));
      if (onTunggu) onTunggu(detik);
      await tidur(detik * 1000, sinyal);
      if (sinyal && sinyal.aborted) throw e;
    }
  }
}

// Sunting satu butir hasil AI sebelum disimpan. Kutipan diperiksa ulang terhadap teks segmen; kutipan yang tidak ada di teks tidak ikut tersimpan.
function EditButirPaket({ r, onSimpan, onBatal }) {
  const q = r.soal; const adaOpsi = Bt.punyaOpsi(Bt.bentukDari(q)); const pc = PK.pecahPembahasan(q.pembahasan);
  const [d, setD] = useState({ pertanyaan: q.pertanyaan, A: q.opsi.A || '', B: q.opsi.B || '', C: q.opsi.C || '', kunci: q.kunci || 'A', jawaban: q.jawaban || '', kutipan: pc.kutipan, pembahasan: pc.isi, indikator: q.indikator || '' });
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  const K = window.Kutipan;
  const sk = useMemo(() => (K ? PK.statusKutipan(K.periksaKutipan, d.kutipan, r.segmenTeks) : { status: '', kutipan: d.kutipan }), [K, d.kutipan, r.segmenTeks]);
  const galat = Bt.periksaSoal({ ...q, pertanyaan: d.pertanyaan, opsi: { ...q.opsi, A: d.A, B: d.B, C: d.C }, kunci: adaOpsi ? d.kunci : '', jawaban: d.jawaban, pembahasan: d.pembahasan || (sk.kutipan ? '-' : ''), rubrik: 'x' });
  const rujukan = [d.pertanyaan, ...(adaOpsi ? [d.A, d.B, d.C] : [d.jawaban])].some(PK.adaRujukanTeks);
  const id = 'eb-' + r.uid;
  const F = ({ k, label, rows, area }) => (<div><Label htmlFor={id + k}>{label}</Label>{area
    ? <AutoArea id={id + k} rows={rows || 2} className="field" value={d[k]} onChange={(e) => set(k, e.target.value)} />
    : <input id={id + k} className="field" value={d[k]} onChange={(e) => set(k, e.target.value)} />}</div>);
  return (
    <div className="mt-3 space-y-3 rounded-xl border border-brand/40 bg-surface p-3">
      <F k="pertanyaan" label="Kalimat soal" area />
      {adaOpsi ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3"><F k="A" label="Opsi A" /><F k="B" label="Opsi B" /><F k="C" label="Opsi C" /></div>
          <div className="max-w-[160px]"><Label htmlFor={id + 'kunci'}>Kunci</Label><Select id={id + 'kunci'} value={d.kunci} onChange={(v) => set('kunci', v)}>{['A', 'B', 'C'].map((k) => <option key={k} value={k}>{k}</option>)}</Select></div>
        </>
      ) : <F k="jawaban" label={Bt.bentukDari(q) === 'uraian' ? 'Jawaban model' : 'Jawaban isian'} area />}
      <div><Label htmlFor={id + 'kutipan'} hint="(salin persis dari teks)">Kutipan kitab untuk kunci</Label>
        <AutoArea id={id + 'kutipan'} dir="rtl" lang="ar" rows={2} className="field font-ar leading-loose" value={d.kutipan} onChange={(e) => set('kutipan', e.target.value)} />
        {sk.status && sk.status !== 'cocok' && <p className="mt-1 text-xs text-warn">{LABEL_KUTIPAN_STATUS[sk.status]}{sk.status === 'tidak_cocok' ? '. Kutipan ini tidak akan disimpan.' : ''}</p>}</div>
      <F k="pembahasan" label="Pembahasan" area />
      <F k="indikator" label="Indikator" />
      {rujukan && <p className="text-xs text-warn">Soal atau opsi memuat rujukan seperti “menurut kitab/teks”. Tulis sebagai pertanyaan langsung.</p>}
      {galat.length > 0 && <ul className="space-y-0.5 text-xs text-bad">{galat.map((g, i) => <li key={i}>{g}</li>)}</ul>}
      <div className="flex gap-2"><Btn kind="primary" disabled={galat.length > 0} onClick={() => onSimpan(d)}><Check size={15} />Terapkan</Btn><Btn kind="ghost" onClick={onBatal}>Batal</Btn></div>
    </div>
  );
}

// Pulihkan isian dan hasil AI Paket Dauri yang belum disimpan (muat ulang, tab tertutup, ponsel menutup tab). Hasil AI memakai kuota harian,
// jadi tidak boleh hilang diam-diam. Setiap nilai dibangun ulang dari bidang yang dikenal dan bertipe benar; data rusak = dianggap tidak ada.
function pulihPaket() {
  const d = Draft.read('paketDauri'); if (!d || typeof d !== 'object') return {};
  const S = (v, n) => (typeof v === 'string' ? v.slice(0, n) : undefined);
  const N = (v) => (Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : undefined);
  const o = { tingkat: S(d.tingkat, 40), mapel: S(d.mapel, 60), kelas: S(d.kelas, 20), periode: S(d.periode, 20), nama: S(d.nama, 120), juz: S(d.juz, 20), halMulai: S(d.halMulai, 20), fokus: S(d.fokus, 300), bab: S(d.bab, 120), teks: S(d.teks, 600000), lanjutan: N(d.lanjutan) };
  if (Number.isInteger(d.dawr)) o.dawr = NK.dauriSah(d.dawr);
  if (d.komposisi && typeof d.komposisi === 'object' && ['L1', 'L2', 'L3'].every((k) => N(d.komposisi[k]) !== undefined)) o.komposisi = { L1: N(d.komposisi.L1), L2: N(d.komposisi.L2), L3: N(d.komposisi.L3) };
  if (Array.isArray(d.foto)) o.foto = d.foto.filter((f) => f && typeof f.id === 'string' && typeof f.teks === 'string').slice(0, 60)
    .map((f) => ({ id: f.id.slice(0, 60), nama: S(f.nama, 120) || '', teks: f.teks.slice(0, 60000), hal: S(f.hal, 20) || '', kualitas: S(f.kualitas, 20) || '', ragu: Array.isArray(f.ragu) ? f.ragu.filter((r) => r && typeof r.kata === 'string').slice(0, 50) : [] }));
  if (Array.isArray(d.perpus)) o.perpus = d.perpus.filter((f) => f && typeof f.id === 'string' && typeof f.teks === 'string').slice(0, 60)
    .map((f) => ({ id: f.id.slice(0, 80), nama: S(f.nama, 120) || '', teks: f.teks.slice(0, 12000), hal: S(f.hal, 20) || '', juz: S(f.juz, 20) || '' }));
  const segs = Array.isArray(d.segs) ? d.segs.map((x) => (typeof x === 'string' ? x : '')) : [];
  if (Array.isArray(d.hasil)) o.hasil = d.hasil.filter((x) => x && typeof x.uid === 'string' && typeof x.bagian === 'string' && x.soal && typeof x.soal.pertanyaan === 'string' && x.soal.opsi && typeof x.soal.opsi === 'object').slice(0, 60)
    .map((x) => ({ uid: x.uid.slice(0, 80), bagian: x.bagian, soal: x.soal, segmenTeks: segs[x.si] || '', segmenHal: S(x.segmenHal, 20) || '', kutipanStatus: S(x.kutipanStatus, 20) || 'kosong', sikap: x.sikap && typeof x.sikap === 'object' ? x.sikap : null, catatan: Array.isArray(x.catatan) ? x.catatan.filter((c) => typeof c === 'string') : [], model: S(x.model, 60) || '', diedit: x.diedit === true }));
  return o;
}

function PaketDauri({ toast, onSimpan, onBukaBank, onCekBank }) {
  const cfg = useCfg();
  const awal = useRef(null); if (awal.current === null) awal.current = pulihPaket();
  const A0 = awal.current;
  const [dawr, setDauri] = useState(() => (A0.dawr !== undefined ? A0.dawr : NK.dauriSah(bacaPref('naskahMeta', { dawr: 1 }).dawr)));
  const [tingkat, setTingkat] = useState(() => A0.tingkat || (tingkatAktif(cfg)[0] || {}).nama || 'Aliyah');
  const [mapel, setMapel] = useState(A0.mapel || 'Fiqih');
  const [kelas, setKelas] = useState(A0.kelas || '');
  const [nama, setNama] = useState(A0.nama || '');
  const [juz, setJuz] = useState(A0.juz || '');
  const [halMulai, setHalMulai] = useState(A0.halMulai || '');
  const [periode, setPeriode] = useState(A0.periode || '');
  const [fokus, setFokus] = useState(A0.fokus || '');
  const [bab, setBab] = useState(A0.bab || '');            // bab/materi paket (untuk kisi-kisi); sama dengan kolom Bab di Penyusunan Soal
  const babSaran = (React.useContext(SaranCtx).saran || { bab: [] }).bab.map((b) => b.nama);
  const [teks, setTeks] = useState(A0.teks || '');
  const [perpus, setPerpus] = useState(A0.perpus || []);          // [{id, nama, teks, hal, juz}] halaman dari perpustakaan (teks bersih dari ekspor Syamilah, tidak disunting)
  const [foto, setFoto] = useState(A0.foto || []);              // [{id, nama, teks, hal, kualitas, ragu}] satu foto = satu halaman
  const [fotoStatus, setFotoStatus] = useState('');
  const [komposisi, setKomposisi] = useState(A0.komposisi || { L1: 30, L2: 50, L3: 20 });
  const [lanjutan, setLanjutan] = useState(A0.lanjutan !== undefined ? A0.lanjutan : 40);
  const [jalan, setJalan] = useState(false);
  const [modeFakta, setModeFakta] = useState(false); // tiap butir terikat SATU fakta dari teks (+1 panggilan AI per segmen untuk ekstrak fakta); mati bawaan
  const faktaSegRef = useRef(new Map());              // teks segmen -> fakta sah (cache sesi; ekstrak tidak diulang untuk segmen yang sama)
  const [status, setStatus] = useState('');
  const [hasil, setHasil] = useState(A0.hasil || []);            // [{uid, bagian, soal, segmenTeks, segmenHal, kutipanStatus, sikap, catatan}]
  const [kurang, setKurang] = useState([]);          // butir yang gagal dibuat setelah diulang sekali
  const [err, setErr] = useState(null);
  const [simpanBusy, setSimpanBusy] = useState(false);
  const [sunting, setSunting] = useState(null);      // uid butir yang sedang disunting
  const ctlRef = useRef(null);
  const fileRef = useRef(null); const galeriRef = useRef(null); const kameraRef = useRef(null);
  // Teks segmen sama untuk banyak butir: disimpan sekali (segs) dan dirujuk lewat indeks, supaya draf tidak membengkak.
  const rekam = useMemo(() => {
    const segs = []; const idx = new Map();
    const hs = hasil.map(({ segmenTeks, ...sisa }) => { let si = idx.get(segmenTeks); if (si === undefined) { si = segs.length; segs.push(segmenTeks || ''); idx.set(segmenTeks, si); } return { ...sisa, si }; });
    return { dawr, tingkat, mapel, kelas, periode, nama, juz, halMulai, fokus, bab, teks, foto, perpus, komposisi, lanjutan, segs, hasil: hs };
  }, [dawr, tingkat, mapel, kelas, periode, nama, juz, halMulai, fokus, bab, teks, foto, perpus, komposisi, lanjutan, hasil]);
  useDraftSync('paketDauri', rekam, !teks.trim() && !foto.length && !perpus.length && !hasil.length && !fokus && !bab && !nama && !juz && !halMulai);

  const tingkatOpsi = [...new Set(tingkatAktif(cfg).map((t) => t.nama).concat(tingkat))];
  const mapelOpsi = [...new Set([...mapelUntuk(cfg, tingkat), mapel])];
  const kelasOpsi = [...new Set([...Uj.kelasUntuk(cfg, tingkat), kelas].filter(Boolean))];
  const periodeOpsi = Uj.periodeUntuk(cfg, tingkat);
  const kitabOpsi = kitabUntuk(cfg, tingkat, mapel, kelas, periode);
  const kitabCfg = cariKitab(cfg, nama);
  const cakupan = kitabCfg && kelas && periode ? Uj.cakupanKitab(kitabCfg, tingkat, kelas, periode) : '';

  const sumber = useMemo(() => [{ teks, hal: halMulai.trim() }, ...foto.map((f) => ({ teks: f.teks, hal: f.hal })), ...perpus.map((f) => ({ teks: f.teks, hal: f.hal }))], [teks, halMulai, foto, perpus]);
  const rencana = useMemo(() => PK.rencanaPaket({ dawr, sumber, komposisi, lanjutan: lanjutan / 100 }), [dawr, sumber, komposisi, lanjutan]);
  const jumlahKarakter = useMemo(() => sumber.reduce((n, p) => n + String(p.teks || '').trim().length, 0), [sumber]);

  const tambahTeksBerkas = async (file) => {
    if (!file) return;
    setErr(null);
    try {
      let t = '';
      if (/\.(docx|pdf)$/i.test(file.name) || file.type === 'application/pdf') {
        const r = await bacaFile(file); t = r.teks;
        if (!r.arab) { setErr({ code: 'FILE', message: 'Berkas tidak memuat teks Arab yang bisa dibaca (mungkin PDF hasil pindai). Untuk halaman pindaian, unggah sebagai foto.' }); return; }
      } else {
        if (file.size > 2_000_000) { setErr({ code: 'FILE', message: 'Berkas teks terlalu besar (maksimal 2 MB).' }); return; }
        t = await file.text();
        if (/\.html?$/i.test(file.name)) t = new DOMParser().parseFromString(t, 'text/html').body.textContent || '';
      }
      t = cleanArabic(t);
      if (!t) { setErr({ code: 'FILE', message: 'Berkas kosong.' }); return; }
      setTeks((x) => (x.trim() ? x.trimEnd() + '\n\n' + t : t));
      toast(`Teks dari ${file.name} ditambahkan.`);
    } catch (e) { setErr(apiErr(e)); }
  };

  const tambahFoto = async (files) => {
    const daftar = [...(files || [])].filter(Boolean);
    if (!daftar.length) return;
    setErr(null); setJalan(true);
    const ctl = new AbortController(); ctlRef.current = ctl;
    try {
      let n = foto.length;
      for (let i = 0; i < daftar.length; i++) {
        if (ctl.signal.aborted) break;
        setFotoStatus(`Membaca foto ${i + 1} dari ${daftar.length}...`);
        const gambar = await siapkanFoto(daftar[i], 2000);
        const d = await panggilSabar('/api/assist', { aksi: 'fotokitab', gambar, penuh: true }, ctl.signal, { onTunggu: (s) => setFotoStatus(`Menunggu batas permintaan (${s} detik)...`) });
        const h = d.hasil; n++;
        const nomor = /^\d+$/.test(halMulai.trim()) ? String(Number(halMulai.trim()) + n - 1) : '';
        setFoto((f) => [...f, { id: Date.now() + '-' + i, nama: daftar[i].name || `Foto ${n}`, teks: h.teks, hal: nomor, kualitas: h.kualitas, ragu: h.ragu || [] }]);
      }
    } catch (e) { const x = apiErr(e); if (x) setErr(x); } finally { setJalan(false); setFotoStatus(''); ctlRef.current = null; }
  };

  const batal = () => { if (ctlRef.current) ctlRef.current.abort(); };

  const kekurangan = useMemo(() => PK.sisaPaket(rencana, hasil), [rencana, hasil]);
  const buat = async () => {
    if (rencana.masalah || !rencana.panggilan) { setErr({ code: 'BAD_REQUEST', message: rencana.masalah || 'Belum ada materi.' }); return; }
    const bad = masalahArabPaket(rencana.segmen.map((s) => s.teks).join('\n'));
    if (bad) { setErr({ code: 'INVALID_ARABIC', message: bad }); return; }
    if (hasil.length && !window.confirm(`Hasil paket sebelumnya (${hasil.length} butir) akan DIHAPUS dan paket dibuat ulang dari awal.${kekurangan.sisa.length ? ' Bila hanya ingin melengkapi yang kurang, batalkan lalu pakai "Lanjutkan sisa".' : ''} Lanjutkan?`)) return;
    const exFakta = modeFakta ? new Set(rencana.tugas.map((t) => t.segmen)).size : 0; // satu ekstrak fakta per segmen
    if (!window.confirm(`Membuat paket ${NK.PRESET_DAURI[dawr].label} memakai ±${rencana.panggilan}${exFakta ? ` + ±${exFakta} (ekstrak fakta)` : ''} panggilan AI dari kuota harian Anda. Lanjutkan?`)) return;
    setErr(null); setHasil([]); setKurang([]);
    await proses(rencana.tugas, [], rencana.panggilan);
  };

  // Lanjutkan: hitung kekurangan dari hasil yang sudah ada, buat hanya itu. Butir yang sudah jadi tidak dihapus dan tidak diulang.
  const lanjutkan = async () => {
    const tugas = PK.tugasDariSisa(kekurangan.sisa);
    if (!tugas.length) { toast('Paket sudah lengkap.'); return; }
    const bad = masalahArabPaket(rencana.segmen.map((s) => s.teks).join('\n'));
    if (bad) { setErr({ code: 'INVALID_ARABIC', message: bad }); return; }
    if (!window.confirm(`Melanjutkan ${kekurangan.sisa.length} butir yang belum ada (${kekurangan.terisi} butir yang sudah jadi tidak diulang) memakai ±${tugas.length}${modeFakta ? ` + ekstrak fakta untuk segmen yang belum pernah diekstrak` : ''} panggilan AI. Lanjutkan?`)) return;
    setErr(null); setKurang([]);
    await proses(tugas, hasil, tugas.length);
  };

  // Mesin bersama untuk "Buat paket" (awal kosong) dan "Lanjutkan sisa" (awal = hasil yang ada).
  const proses = async (daftarTugas, awal, jumlahPanggilan) => {
    setJalan(true);
    const ctl = new AbortController(); ctlRef.current = ctl;
    const kumpul = [...awal]; const sisa = []; const segmenAda = new Set(awal.map((x) => x.segmen).filter((n) => Number.isInteger(n)));
    const FATAL = new Set(['RATE_LIMIT_DAILY', 'AUTH_REQUIRED', 'FORBIDDEN_ROLE', 'BAD_REQUEST', 'INVALID_ARABIC', 'UNAUTHORIZED', 'FORBIDDEN']);
    let tanpaFaktaN = 0; let gagalFaktaN = 0; // butir yang dibuat tanpa fakta (fakta segmen habis / ekstrak gagal): dilaporkan, tidak disembunyikan
    let beruntun = 0; // panggilan gagal berturut-turut: berhenti bila 3 (mis. offline) supaya kuota tidak terbuang
    const jalankan = async (tugas, label) => {
      const seg = rencana.segmen[tugas.segmen];
      const kitabIdPaket = (() => { const ids = new Set(perpus.map((x) => String(x.id).split(':')[0])); return ids.size === 1 ? [...ids][0] : ''; })();
      // Mode fakta: ekstrak fakta segmen (sekali per teks), lalu bagikan satu fakta berbeda ke tiap butir. Gagal ekstrak = segmen ini memakai alur lama.
      let faktaTugas = null; let spekKirim = tugas.spek.map((s) => ({ bentuk: s.bentuk, level: s.level }));
      if (modeFakta) {
        let daftar = faktaSegRef.current.get(seg.teks);
        if (!daftar) {
          setStatus(`${label}: mengekstrak fakta dari segmen ${tugas.segmen + 1} dari ${rencana.segmen.length}...`);
          try {
            const df = await panggilSabar('/api/assist', { aksi: 'fakta', teks: seg.teks, nama, tingkat, mapel, kitabId: kitabIdPaket }, ctl.signal, { onTunggu: (n) => setStatus(`Menunggu batas permintaan AI (${n} detik)...`) });
            daftar = (df.hasil.fakta || []).filter((f) => faktaSahDi(f, seg.teks, window.Kutipan && window.Kutipan.periksaKutipan));
            faktaSegRef.current.set(seg.teks, daftar);
          } catch (e) {
            if (ctl.signal.aborted || (e && e.name === 'AbortError') || (e && (FATAL.has(e.code) || e.status === 401 || e.status === 403))) throw e;
            daftar = []; gagalFaktaN++;
          }
        }
        // Fakta yang sudah dijadikan butir di segmen ini (dikenali lewat kutipan dasarnya, tahan muat ulang) tidak dibagikan lagi.
        const sp = spekDenganFakta(tugas.spek, daftar, kumpul.filter((x) => x.segmenTeks === seg.teks));
        faktaTugas = sp.pilihan; spekKirim = sp.spekKirim; tanpaFaktaN += sp.tanpaFakta;
      }
      setStatus(`${label}: menyusun ${tugas.spek.length} butir dari segmen ${tugas.segmen + 1} dari ${rencana.segmen.length}...`);
      const d = await panggilSabar('/api/assist', {
        aksi: 'paket', teks: seg.teks, bahasa: bahasaOtomatis(seg.teks), hal: seg.hal || halMulai.trim(), nama, juz, tingkat, kelas, mapel, fokus, cakupan,
        kitabId: kitabIdPaket, // hanya bila seluruh materi dari satu kitab perpustakaan
        spek: spekKirim,
        hindari: PKK.daftarHindari(kumpul.map((x) => x.soal)), // soal yang sudah jadi di paket ini: AI diminta tidak mengulanginya
      }, ctl.signal, { onTunggu: (s) => setStatus(`Menunggu batas permintaan AI (${s} detik)...`) });
      const h = d.hasil;
      for (const b of h.butir) {
        const kode = tugas.spek[b.indeks].bagian;
        kumpul.push({ uid: `${tugas.id}-${b.indeks}-${kumpul.length}`, bagian: kode, soal: b.soal, segmenTeks: seg.teks, segmenHal: seg.hal, kutipanStatus: b.kutipanStatus, sikap: b.sikap, catatan: b.catatan, model: h.model, segmen: tugas.segmen, spek: tugas.spek[b.indeks],
          ...jejakFaktaButir(b, faktaTugas) });
      }
      if (h.butir.length) segmenAda.add(tugas.segmen);
      // Butir yang AI sendiri tandai di luar cakupan tidak diulang di segmen yang sama (hasilnya sama, kuota terbuang): dialihkan ke segmen yang terbukti masuk cakupan.
      for (const g of h.gagal) sisa.push({ segmen: /^di luar cakupan/i.test(String(g.alasan || '')) ? -1 : tugas.segmen, spek: tugas.spek[g.indeks] });
      setHasil([...kumpul]);
    };
    try {
      let k = 0;
      const luar = [];
      // Satu panggilan gagal TIDAK menghentikan paket: segmen di luar cakupan dilewati; galat sementara (hasil AI terpotong, rusak, jaringan)
      // dibagi dua dan dicoba lagi; butir tunggal yang tetap gagal masuk daftar ulang. Hanya kuota habis, sesi berakhir, batal, dan 3 gagal
      // berturut-turut yang menghentikan, dan semuanya bisa dilanjutkan lewat "Lanjutkan sisa" tanpa mengulang butir yang sudah jadi.
      const aman = async (t, label) => {
        if (ctl.signal.aborted) return;
        try { await jalankan(t, label); beruntun = 0; } catch (e) {
          if (ctl.signal.aborted || (e && e.name === 'AbortError')) throw e;
          if (e && e.code === 'TEKS_TIDAK_MEMADAI') { luar.push(t.segmen + 1); t.spek.forEach((s) => sisa.push({ segmen: -1, spek: s })); return; }
          if (e && (FATAL.has(e.code) || e.status === 401 || e.status === 403)) throw e;
          if (++beruntun >= 3) throw e;
          if (t.spek.length > 1) {
            const m = Math.ceil(t.spek.length / 2);
            await aman({ id: `${t.id}a`, segmen: t.segmen, spek: t.spek.slice(0, m) }, 'Mencoba lagi (dibagi dua)');
            await aman({ id: `${t.id}b`, segmen: t.segmen, spek: t.spek.slice(m) }, 'Mencoba lagi (dibagi dua)');
          } else t.spek.forEach((s) => sisa.push({ segmen: t.segmen, spek: s }));
        }
      };
      for (const t of daftarTugas) {
        if (ctl.signal.aborted) break; k++;
        await aman(t, `Panggilan ${k} dari ${jumlahPanggilan}`);
      }
      if (gagalFaktaN) toast(`Ekstrak fakta gagal untuk ${gagalFaktaN} segmen; butirnya dibuat tanpa fakta (alur biasa).`);
      if (tanpaFaktaN) toast(`${tanpaFaktaN} butir dibuat tanpa fakta karena fakta di segmennya sudah habis dipakai butir lain.`);
      if (luar.length && !segmenAda.size) setErr({ code: 'TEKS_TIDAK_MEMADAI', message: `Tidak ada bagian teks yang masuk cakupan${cakupan ? ` "${cakupan}"` : ''}. Periksa apakah materi yang diberikan sesuai dengan cakupan di Konfigurasi.` });
      else if (luar.length) toast(`Segmen ${[...new Set(luar)].join(', ')} dilewati (di luar cakupan); butirnya dialihkan ke segmen lain yang masuk cakupan.`);
      // Butir KEMBAR di dalam paket (tiap segmen disusun lewat panggilan AI terpisah yang tidak saling tahu) dibuang. Penggantinya ikut alur
      // pengulangan di bawah, kini dengan daftar "hindari". Butir yang sudah Anda sunting dan pasangan berkunci beda tidak pernah dibuang otomatis.
      let nKembar = 0;
      const buangKembar = () => {
        if (ctl.signal.aborted) return [];
        const dibuang = PKK.buangDariKumpulan(kumpul);
        if (dibuang.length) { nKembar += dibuang.length; setHasil([...kumpul]); }
        return dibuang;
      };
      for (const d of buangKembar()) if (d.spek) sisa.push({ segmen: d.segmen, spek: d.spek });
      // Butir yang gagal diulang sekali, dikelompokkan per segmen.
      if (!ctl.signal.aborted && sisa.length) {
        const per = new Map();
        const gagalAkhir = [];
        for (const s of sisa) { if (s.segmen < 0) continue; if (!per.has(s.segmen)) per.set(s.segmen, []); per.get(s.segmen).push(s.spek); }
        // Butir dari segmen di luar cakupan dialihkan ke segmen yang terbukti memuat materi cakupan (bukan dibuang).
        const alih = PK.alihkanButir(sisa.filter((s) => s.segmen < 0), [...segmenAda]);
        for (const [segmen, spek] of alih.per) { if (!per.has(segmen)) per.set(segmen, []); per.get(segmen).push(...spek); }
        gagalAkhir.push(...alih.tanpaTempat);
        for (const [segmen, spek] of per) {
          for (let off = 0; off < spek.length; off += PK.MAKS_BUTIR_PANGGILAN) {
            if (ctl.signal.aborted) break;
            const potong = spek.slice(off, off + PK.MAKS_BUTIR_PANGGILAN);
            const n0 = kumpul.length;
            try { await jalankan({ id: `u${segmen}-${off}`, segmen, spek: potong }, 'Mengulang butir yang gagal'); } catch (e) { if (ctl.signal.aborted || (e && (e.name === 'AbortError' || FATAL.has(e.code)))) throw e; }
            if (kumpul.length - n0 < potong.length) gagalAkhir.push(...potong.slice(kumpul.length - n0));
          }
        }
        setKurang(gagalAkhir);
      }
      const kembarAkhir = buangKembar(); // pengganti yang ternyata kembar lagi: tidak diulang lagi (hemat kuota), dihitung kurang
      if (kembarAkhir.length) setKurang((k) => [...k, ...kembarAkhir.map((d) => d.spek).filter(Boolean)]);
      if (nKembar) toast(`${nKembar} butir kembar dibuang otomatis${kembarAkhir.length ? `; ${kembarAkhir.length} belum ada penggantinya` : '; pengganti dibuat bila memungkinkan'}.`);
      if (ctl.signal.aborted) toast('Dibatalkan. Butir yang sudah jadi tetap ditampilkan; pakai "Lanjutkan sisa" untuk melengkapi.');
    } catch (e) {
      const x = apiErr(e); if (x) setErr({ ...x, message: `${x.message} Proses berhenti di tengah jalan. Butir yang sudah jadi tetap ada di bawah; klik "Lanjutkan sisa" untuk membuat yang belum ada (tidak mengulang dari awal)${x.code === 'RATE_LIMIT_DAILY' ? ', atau simpan dulu dan lanjutkan besok' : ''}.` });
    } finally { setJalan(false); setStatus(''); ctlRef.current = null; }
  };

  const hapus = (uid) => setHasil((h) => h.filter((x) => x.uid !== uid));
  const ubahButir = (uid, d) => { setHasil((h) => h.map((x) => {
    if (x.uid !== uid) return x;
    const K = window.Kutipan; const adaOpsi = Bt.punyaOpsi(Bt.bentukDari(x.soal));
    const sk = K ? PK.statusKutipan(K.periksaKutipan, d.kutipan, x.segmenTeks) : { status: x.kutipanStatus, kutipan: String(d.kutipan || '').trim() };
    const soal = { ...x.soal, pertanyaan: d.pertanyaan.trim(), opsi: adaOpsi ? { ...x.soal.opsi, A: d.A.trim(), B: d.B.trim(), C: d.C.trim() } : x.soal.opsi, kunci: adaOpsi ? d.kunci : '', jawaban: adaOpsi ? '' : d.jawaban.trim(), indikator: d.indikator.trim(), pembahasan: PK.gabungPembahasan(sk.kutipan, d.pembahasan) };
    return { ...x, soal, kutipanStatus: sk.status, diedit: true };
  })); setSunting(null); };
  const urut = useMemo(() => PK.urutkanSoal(hasil.map((x) => ({ ...x.soal, _uid: x.uid }))), [hasil]);
  const naskah = useMemo(() => NK.susunNaskah(urut, dawr), [urut, dawr]);
  const lookup = useMemo(() => new Map(hasil.map((x) => [x.uid, x])), [hasil]);
  const kemiripan = useMemo(() => PKK.petaKemiripan(hasil), [hasil]);   // uid -> butir lain yang kembar/mirip
  const buangan = useMemo(() => PKK.pilihBuang(hasil).buang, [hasil]);  // butir kembar yang aman dibuang
  const nomorUid = useMemo(() => { const m = new Map(); for (const bg of naskah.bagian) for (const { no, q } of bg.butir) if (q) m.set(q._uid, no); return m; }, [naskah]);
  const hapusKembar = () => {
    if (!buangan.length) return;
    const set = new Set(buangan); setHasil((h) => h.filter((x) => !set.has(x.uid)));
    toast(`${buangan.length} butir kembar dibuang. Jalankan paket lagi, atau tulis manual, untuk melengkapi nomornya.`);
  };

  const simpan = async (kirim) => {
    if (!hasil.length || simpanBusy) return;
    // Setiap butir harus lengkap dan bebas rujukan "menurut kitab" sebelum disimpan (butir yang disunting ikut diperiksa).
    for (const x of urut.map((q) => lookup.get(q._uid)).filter(Boolean)) {
      const q = x.soal; const adaOpsi = Bt.punyaOpsi(Bt.bentukDari(q));
      const g = Bt.periksaSoal({ ...q, rubrik: 'x' });
      const rj = [q.pertanyaan, ...(adaOpsi ? ['A', 'B', 'C'].map((k) => q.opsi[k]) : [q.jawaban])].some(PK.adaRujukanTeks);
      if (g.length || rj) { setErr({ code: 'BAD_REQUEST', message: `Ada butir yang belum layak disimpan (“${String(q.pertanyaan).slice(0, 50)}”): ${g[0] || 'memuat rujukan seperti “menurut kitab/teks”'}. Sunting atau hapus butir itu dulu.` }); setSunting(x.uid); return; }
    }
    const pesan = kirim
      ? `Kirim ${hasil.length} butir paket ke editor? Butir tidak bisa disunting lagi sampai editor menyetujui atau mengembalikannya untuk direvisi.`
      : `Simpan ${hasil.length} butir sebagai satu paket Draft? Anda masih bisa menyunting lalu mengirimnya ke editor dari tab Bank Soal.`;
    let pesanBank = '';
    if (onCekBank) { // pemeriksaan terhadap soal yang sudah ada di bank; gagal = tidak menghalangi penyimpanan
      try {
        const daftarSoal = urut.map((q) => ({ q, no: nomorUid.get(q._uid) || '?' }));
        const r = await onCekBank(daftarSoal.map((x) => x.q), nama);
        pesanBank = PKK.pesanKembarBank(r.hasil.map((h) => ({ ...h, no: daftarSoal[h.i].no })), { total: r.total });
      } catch (e) { pesanBank = ''; }
    }
    if (!window.confirm(pesanBank ? `${pesanBank}\n\n${pesan}` : pesan)) return;
    setSimpanBusy(true); setErr(null);
    try {
      // Nomor urut = urutan di naskah (bagian أ, ب, ج); butir yang tak muat di template dilanjutkan di belakang.
      const nomor = new Map(); let no = 0;
      for (const bg of naskah.bagian) for (const { q } of bg.butir) if (q) nomor.set(q._uid, ++no);
      for (const x of hasil) if (!nomor.has(x.uid)) nomor.set(x.uid, Math.min(200, ++no));
      const paketId = PK.idPaket();
      const n = await onSimpan(hasil, { tingkat, kelas, mapel, nama, juz, periode, dawr, cakupan, urut: nomor, paketId, tautan: PK.tautanPaket({ bab, perpus, teksManual: teks, foto }), status: kirim ? 'pending' : 'draft' });
      toast(kirim ? `${n} butir paket dikirim ke editor.` : `${n} butir tersimpan sebagai satu paket Draft. Cari di tab Bank Soal (filter Paket).`); setHasil([]); setKurang([]); setSunting(null);
      if (onBukaBank) onBukaBank(paketId);
    }
    catch (e) { toast((e && e.message) || 'Gagal menyimpan. Periksa koneksi lalu coba lagi.'); } finally { setSimpanBusy(false); }
  };

  const ubahKomp = (k, v) => setKomposisi((x) => ({ ...x, [k]: Math.max(0, Math.min(100, Number(v) || 0)) }));
  const bobot = Math.max(1, komposisi.L1 + komposisi.L2 + komposisi.L3);
  // Halaman dari perpustakaan: tiap halaman jadi satu sumber dengan nomor cetaknya sendiri, jadi rujukan hal. per butir akurat.
  const tambahPerpus = (r) => {
    const ada = new Set(perpus.map((x) => x.id));
    const baru = r.halaman.map((p) => ({ id: `${r.kitabId}:${p.seq}`, nama: r.nama, teks: bagianTeks(p, r.bagian), hal: String(p.hal).slice(0, 20), juz: String(p.juz) })).filter((x) => x.teks.trim() && !ada.has(x.id));
    if (!baru.length) { toast('Halaman itu sudah ada di materi (atau kosong).'); return; }
    if (perpus.length && perpus[0].nama.toLowerCase() !== r.nama.toLowerCase() && !window.confirm(`Materi berisi halaman dari "${perpus[0].nama}". Menambahkan dari "${r.nama}" mencampur dua kitab dalam satu paket. Lanjutkan?`)) return;
    setPerpus((l) => [...l, ...baru].slice(0, 60));
    if (!nama.trim()) setNama(r.nama);
    if (!juz.trim()) setJuz(r.juz);
    if (!bab.trim() && r.bab) setBab(String(r.bab).slice(0, 120));
    toast(`${baru.length} halaman ditambahkan ke materi.`);
  };
  const sebaranTeks = ['a', 'b', 'c'].map((k) => { const p = NK.PRESET_DAURI[dawr].bagian.find((x) => x.kode === k); const c = PK.bagiLevel(p.n, komposisi); return `${LABEL_BAGIAN[k].split(' ')[0]}: ${c.L1}/${c.L2}/${c.L3}`; }).join(' · ');

  return (
    <div className="space-y-4">
      <Section title="Paket Dauri (naskah IMDA utuh)" icon={Layers}>
        <p className="text-xs leading-relaxed text-mute">Tempel teks, unggah berkas, atau foto banyak halaman kitab. Materi boleh jauh lebih dari 6.000 karakter: aplikasi membaginya per segmen lalu menyusun semua soal satu Dauri sekaligus, tanpa narasi, tiga opsi, dan teks kitab rujukan tercatat untuk naskah kunci.</p>
        <DraftNote names={['paketDauri']} className="mt-2" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor="pk-dauri">Dauri</Label>
            <Select id="pk-dauri" value={String(dawr)} onChange={(v) => setDauri(NK.dauriSah(v))} disabled={jalan}>{NK.DAFTAR_DAURI.map((d) => <option key={d.dawr} value={d.dawr}>{d.label} ({NK.ringkasDauri(d.dawr)})</option>)}</Select></div>
          <div><Label htmlFor="pk-tingkat">Tingkat</Label>
            <Select id="pk-tingkat" value={tingkat} onChange={(v) => { setTingkat(v); setKelas(''); }} disabled={jalan}>{tingkatOpsi.map((t) => <option key={t} value={t}>{labelTingkat(cfg, t)}</option>)}</Select></div>
          <div><Label htmlFor="pk-mapel">Mata pelajaran</Label>
            <Select id="pk-mapel" value={mapel} onChange={setMapel} disabled={jalan}>{mapelOpsi.map((m) => <option key={m} value={m}>{m}</option>)}</Select></div>
          <div><Label htmlFor="pk-kelas" hint="(opsional)">Kelas</Label>
            <Select id="pk-kelas" value={kelas} onChange={setKelas} disabled={jalan}><option value="">— Belum dipilih —</option>{kelasOpsi.map((k) => <option key={k} value={k}>Kelas {k}</option>)}</Select></div>
          <div><Label htmlFor="pk-periode" hint="(untuk cakupan)">Ujian</Label>
            <Select id="pk-periode" value={periode} onChange={setPeriode} disabled={jalan}><option value="">— Belum dipilih —</option>{periodeOpsi.map((x) => <option key={x.kode} value={x.kode}>{x.label}</option>)}</Select></div>
          <div><Label htmlFor="pk-nama">Nama kitab</Label>
            <input id="pk-nama" className="field" list="pk-kitab-list" value={nama} maxLength={120} onChange={(e) => setNama(e.target.value)} disabled={jalan} placeholder="Pilih dari Konfigurasi atau ketik" />
            <datalist id="pk-kitab-list">{kitabOpsi.map((k) => <option key={k.nama} value={k.nama} />)}</datalist></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="pk-juz" hint="(opsional)">Juz</Label><input id="pk-juz" className="field" value={juz} maxLength={20} onChange={(e) => setJuz(e.target.value)} disabled={jalan} /></div>
            <div><Label htmlFor="pk-hal" hint="halaman awal">Hal.</Label><input id="pk-hal" className="field" inputMode="numeric" value={halMulai} maxLength={20} onChange={(e) => setHalMulai(e.target.value)} disabled={jalan} /></div>
          </div>
        </div>
        {cakupan
          ? <p className="mt-3 rounded-lg bg-soft px-3 py-2 text-xs leading-relaxed text-soft-ink">Cakupan dari Konfigurasi: <b>{cakupan}</b>. AI hanya boleh membuat soal dari bagian teks yang masuk cakupan ini; segmen yang seluruhnya di luar cakupan dilewati.</p>
          : <p className="mt-3 text-xs leading-relaxed text-mute">{kitabCfg && kelas && periode ? 'Kitab ini belum punya cakupan untuk kelas dan ujian tersebut di Konfigurasi, jadi semua teks yang Anda berikan dianggap bahan ujian.' : 'Pilih kelas, ujian, dan kitab dari Konfigurasi agar batas materi (mis. Thaharah sampai Puasa) ikut dikirim ke AI. Tanpa itu, semua teks yang Anda berikan dianggap bahan ujian.'}</p>}
      </Section>

      <Section title="Materi" icon={BookOpen}>
        <div className="mb-3 space-y-2">
          <PemilihKitab Btn={Btn} ErrorBox={ErrorBox} callApi={callApi} apiErr={apiErr} katalog={cfg.kitab} mode="paket" onPakai={tambahPerpus} disabled={jalan} />
          {perpus.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-ink">Halaman dari perpustakaan ({perpus.length}) · {perpus.reduce((n, f) => n + f.teks.length, 0).toLocaleString('id-ID')} karakter</p>
              <ul className="space-y-1">{perpus.map((f) => (
                <li key={f.id} className="flex items-center gap-2 rounded-lg border border-line bg-bg px-3 py-1.5 text-xs">
                  <span className="min-w-0 flex-1 truncate">{f.nama} · hal. {f.hal} · juz {f.juz} · {f.teks.length.toLocaleString('id-ID')} karakter</span>
                  <button type="button" aria-label={`Hapus halaman ${f.hal}`} disabled={jalan} className="text-mute hover:text-bad disabled:opacity-40" onClick={() => setPerpus((l) => l.filter((x) => x.id !== f.id))}><Trash2 size={13} /></button>
                </li>))}</ul>
            </div>
          )}
        </div>
        <textarea {...tampilanDariIsi(teks, 'field min-h-[160px] leading-loose')} placeholder="Tempel teks kitab atau buku (Arab atau bahasa lain) di sini. Tidak dibatasi 6.000 karakter." value={teks} onChange={(e) => setTeks(e.target.value)} disabled={jalan} />
        <div className="mt-2 flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".txt,.htm,.html,.docx,.pdf" className="hidden" aria-label="Unggah berkas teks kitab" onChange={(e) => { tambahTeksBerkas(e.target.files[0]); e.target.value = ''; }} />
          <input ref={galeriRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" aria-label="Pilih banyak foto halaman kitab" onChange={(e) => { tambahFoto(e.target.files); e.target.value = ''; }} />
          <input ref={kameraRef} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Ambil foto halaman kitab" onChange={(e) => { tambahFoto(e.target.files); e.target.value = ''; }} />
          <Btn onClick={() => fileRef.current.click()} disabled={jalan}><Upload size={15} />Berkas (.txt .docx .pdf)</Btn>
          <Btn onClick={() => galeriRef.current.click()} disabled={jalan}><Camera size={15} />Foto (banyak)</Btn>
          <Btn onClick={() => kameraRef.current.click()} disabled={jalan}><Camera size={15} />Kamera</Btn>
          {jalan && fotoStatus && <Btn kind="danger" onClick={batal}><X size={15} />Batal</Btn>}
        </div>
        {fotoStatus && <div className="mt-2"><Spin>{fotoStatus}</Spin></div>}
        {foto.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold text-ink">Halaman dari foto ({foto.length}). Hasil baca AI wajib diperiksa: harakat dan huruf bisa salah.</p>
            {foto.map((f) => (
              <details key={f.id} className="rounded-xl border border-line bg-bg p-3">
                <summary className="cursor-pointer text-xs font-semibold">{f.nama}{f.hal ? ` · hal. ${f.hal}` : ''} · {f.teks.length.toLocaleString('id-ID')} karakter · kualitas {f.kualitas}{f.ragu.length ? ` · ${f.ragu.length} kata ragu` : ''}{f.kualitas === 'buruk' ? ' ⚠' : ''}</summary>
                <div className="mt-2 space-y-2">
                  {f.ragu.length > 0 && <p className="text-xs text-warn">Kata ragu: {f.ragu.map((r) => r.kata).join('، ')}</p>}
                  <textarea dir="rtl" lang="ar" className="field min-h-[120px] font-ar leading-loose" value={f.teks} onChange={(e) => setFoto((l) => l.map((x) => (x.id === f.id ? { ...x, teks: e.target.value } : x)))} disabled={jalan} />
                  <div className="flex items-center gap-2"><label className="text-xs text-mute" htmlFor={'pkh-' + f.id}>Hal.</label><input id={'pkh-' + f.id} className="field !w-24 !py-1.5" value={f.hal} maxLength={20} onChange={(e) => setFoto((l) => l.map((x) => (x.id === f.id ? { ...x, hal: e.target.value } : x)))} disabled={jalan} />
                    <Btn kind="danger" className="!px-3 !py-1.5 !text-xs" onClick={() => setFoto((l) => l.filter((x) => x.id !== f.id))} disabled={jalan}><Trash2 size={13} />Hapus</Btn></div>
                </div>
              </details>
            ))}
          </div>
        )}
        <p className={`mt-2 text-xs ${rencana.masalah && jumlahKarakter ? 'font-semibold text-bad' : 'text-mute'}`}>
          {jumlahKarakter.toLocaleString('id-ID')} karakter · {rencana.segmen.length} segmen{rencana.masalah && jumlahKarakter ? `. ${rencana.masalah}` : ''}
        </p>
      </Section>

      <Section title="Sebaran kesukaran" icon={ListChecks}>
        <div className="grid grid-cols-3 gap-3">
          {['L1', 'L2', 'L3'].map((k) => (
            <div key={k}><Label htmlFor={'pk-' + k}>{k === 'L1' ? 'L1 Ingatan' : k === 'L2' ? 'L2 Aplikasi' : 'L3 HOTS'}</Label>
              <input id={'pk-' + k} type="number" min="0" max="100" inputMode="numeric" className="field" value={komposisi[k]} onChange={(e) => ubahKomp(k, e.target.value)} disabled={jalan} /></div>
          ))}
        </div>
        <div className="mt-3 max-w-[200px]"><Label htmlFor="pk-lanj" hint="% di bagian أ">Soal melanjutkan</Label>
          <input id="pk-lanj" type="number" min="0" max="100" inputMode="numeric" className="field" value={lanjutan} onChange={(e) => setLanjutan(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} disabled={jalan} /></div>
        <p className="mt-2 text-xs leading-relaxed text-mute">Angka adalah perbandingan (bobot), bukan harus 100. Bawaan 30:50:20 hanya titik awal; sesuaikan kebijakan madrasah. Jumlah per bagian (L1/L2/L3): {sebaranTeks}.</p>
        <div className="mt-3"><Label htmlFor="pk-fokus" hint="(opsional)">Fokus soal</Label><input id="pk-fokus" className="field" value={fokus} maxLength={300} onChange={(e) => setFokus(e.target.value)} disabled={jalan} /></div>
        <div className="mt-3"><Label htmlFor="pk-bab" hint="(untuk kisi-kisi)">Bab / Materi</Label><input id="pk-bab" list="pk-bab-list" className="field" maxLength={120} placeholder="mis. Bab Thaharah" value={bab} onChange={(e) => setBab(e.target.value)} disabled={jalan} />
          <datalist id="pk-bab-list">{babSaran.map((b) => <option key={b} value={b} />)}</datalist>
          <p className="mt-1 text-xs text-mute">Dicatat pada semua butir paket supaya tampil di kisi-kisi. {babSaran.length ? 'Pilihan berasal dari saran AI di tab Fokus Ujian.' : 'Tab Fokus Ujian bisa menyarankan bab yang penting.'}</p></div>
      </Section>

      <label className="flex items-start gap-2 rounded-xl border border-line bg-white px-3 py-3 text-sm">
        <input id="pk-fakta" type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)]" checked={modeFakta} onChange={(e) => setModeFakta(e.target.checked)} disabled={jalan} />
        <span className="min-w-0 leading-relaxed"><b>Mode fakta</b>: tiap butir menguji satu fakta berbeda dari teks, dengan kutipan dasar yang sudah dicocokkan sistem, dan wajib menjelaskan mengapa tiap pengecoh salah. Menambah ±1 panggilan AI per segmen teks (untuk mengekstrak fakta). Bila fakta di satu segmen habis atau ekstrak gagal, butir yang tersisa dibuat dengan cara biasa dan dilaporkan.</span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Btn kind="primary" onClick={buat} disabled={jalan || !!rencana.masalah || !rencana.panggilan}><Sparkles size={16} />Buat paket {NK.PRESET_DAURI[dawr].label}</Btn>
        {!jalan && hasil.length > 0 && kekurangan.sisa.length > 0 && !rencana.masalah && <Btn kind="soft" onClick={lanjutkan}><RefreshCw size={15} />Lanjutkan sisa ({kekurangan.sisa.length} butir)</Btn>}
        {jalan && !fotoStatus && <Btn kind="danger" onClick={batal}><X size={15} />Batal</Btn>}
        <span className="text-xs text-mute">{rencana.panggilan ? `${rencana.total} butir · ±${rencana.panggilan}${modeFakta ? ` + ±${new Set(rencana.tugas.map((t) => t.segmen)).size}` : ''} panggilan AI (kuota harian dipakai)` : ''}</span>
      </div>
      {status && <Spin>{status}</Spin>}
      {err && <ErrorBox e={err} />}

      {(hasil.length > 0 || kurang.length > 0) && (
        <Section title={`Hasil (${hasil.length} dari ${rencana.total} butir)`} icon={ClipboardCheck}
          action={<div className="flex flex-wrap gap-2">
            <Btn kind="ghost" onClick={() => simpan(false)} disabled={jalan || simpanBusy || !hasil.length}>{simpanBusy ? <Loader2 size={15} className="spin" /> : <Save size={15} />}Simpan sebagai Draft</Btn>
            <Btn kind="primary" onClick={() => simpan(true)} disabled={jalan || simpanBusy || !hasil.length}><Send size={15} />Simpan dan kirim ke editor</Btn></div>}>
          {naskah.peringatan.length > 0 && <ul className="mb-3 space-y-1">{naskah.peringatan.filter((p) => !/halaman kitab/.test(p)).map((p, i) => <li key={i} className="rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn">{p}</li>)}</ul>}
          {buangan.length > 0 && <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn"><span>{buangan.length} butir kembar dengan butir lain di paket ini.</span><Btn kind="soft" className="!text-xs" onClick={hapusKembar} disabled={jalan}>Buang yang kembar</Btn></div>}
          {kurang.length > 0 && <p className="mb-3 rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn">{kurang.length} butir tidak jadi (sudah diulang, kembar dengan butir lain, atau segmennya di luar cakupan). Jalankan paket lagi untuk menambah, atau tulis manual di tab Penyusunan Soal.</p>}
          {naskah.bagian.map((bg) => (
            <div key={bg.kode} className="mb-4">
              <h3 className="mb-2 text-xs font-bold text-ink">{LABEL_BAGIAN[bg.kode]} · {bg.terisi} dari {bg.n} nomor</h3>
              <ol className="space-y-2">
                {bg.butir.filter((x) => x.q).map(({ no, q }) => {
                  const r = lookup.get(q._uid); const b = Bt.bentukDari(q);
                  return (
                    <li key={q._uid} className="rounded-xl border border-line bg-bg p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="leading-relaxed"><span className="mr-1 font-bold">{no}.</span>{q.pertanyaan}</p>
                        <div className="flex shrink-0 gap-1">
                          <button type="button" onClick={() => setSunting(sunting === q._uid ? null : q._uid)} disabled={jalan} aria-label={`Sunting nomor ${no}`} className="rounded-lg p-1.5 text-mute hover:bg-soft hover:text-ink"><Pencil size={14} /></button>
                          <button type="button" onClick={() => hapus(q._uid)} disabled={jalan} aria-label={`Hapus nomor ${no}`} className="rounded-lg p-1.5 text-mute hover:bg-bad-bg hover:text-bad"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      {r && r.diedit && <p className="mt-1 text-xs text-soft-ink">Sudah Anda sunting.</p>}
                      {sunting === q._uid && r && <EditButirPaket key={q._uid} r={r} onSimpan={(d) => ubahButir(q._uid, d)} onBatal={() => setSunting(null)} />}
                      {Bt.punyaOpsi(b) && <p className="mt-1 text-xs text-mute">{['A', 'B', 'C'].map((k) => `${k}${q.kunci === k ? '✓' : ''}. ${q.opsi[k]}`).join('   ')}</p>}
                      {!Bt.punyaOpsi(b) && <p className="mt-1 text-xs text-mute">Jawaban: {q.jawaban}</p>}
                      <p className="mt-1 text-xs text-mute">{q.level}{r && r.segmenHal ? ` · hal. ${r.segmenHal}` : ''}</p>
                      {NK.kutipanKunci(q) && <p dir="rtl" lang="ar" className="mt-1 font-ar text-base leading-loose text-soft-ink">{NK.kutipanKunci(q)}</p>}
                      {r && r.kutipanStatus !== 'cocok' && <p className="mt-1 text-xs text-warn">{LABEL_KUTIPAN_STATUS[r.kutipanStatus]}</p>}
                      {r && r.sikap && r.sikap.status !== 'aman' && <p className="mt-1 text-xs text-warn">Periksa nada soal: {r.sikap.temuan.map((t) => t.kata).join(', ')}</p>}
                      {(kemiripan.get(q._uid) || []).map((m) => <p key={m.dengan} className="mt-1 text-xs text-warn">{m.jenis === 'kembar' ? 'Kembar' : 'Mirip'} {Math.round(m.skor * 100)}% dengan nomor {nomorUid.get(m.dengan) || '?'}{m.kunciBeda ? ', tetapi kunci jawabannya berbeda: periksa mana yang benar' : ''}. Hapus salah satu bila memang sama.</p>)}
                      {r && r.catatan.filter((c) => !/Kutipan|Kunci jatuh/.test(c)).map((c, i) => <p key={i} className="mt-1 text-xs text-warn">{c}</p>)}
                      {r && r.faktaDasar && (
                        <details className="mt-1 text-xs text-mute">
                          <summary className="cursor-pointer font-semibold text-soft-ink">Dasar butir (satu fakta)</summary>
                          <p className="mt-1 leading-relaxed">{r.faktaDasar}</p>
                          {r.alasanPengecoh && <p className="mt-1 whitespace-pre-wrap leading-relaxed"><b>Mengapa pengecoh salah:</b> {r.alasanPengecoh}</p>}
                        </details>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function App({ user, profile }) {
  const db = firebase.firestore();
  const col = db.collection('soal');
  const ts = () => firebase.firestore.FieldValue.serverTimestamp();
  const me = { uid: user.uid, role: profile.role, tahapEditor: profile.tahapEditor };
  // Draf otomatis dipisah per akun. Dijalankan sebelum state di bawah dibaca, dan sekali per akun.
  const drafUid = useRef(null); if (drafUid.current !== user.uid) { Draft.setUser(user.uid); drafUid.current = user.uid; }
  const displayName = user.displayName || user.email;
  const isAdmin = profile.role === 'admin';
  const canReview = profile.role === 'editor' || isAdmin;

  // Tab aktif disimpan di URL (#pegon, #bank, ...) supaya refresh tetap di halaman yang sama. Tab admin hanya dipulihkan untuk admin.
  const [tab, setTabRaw] = useState(() => {
    const h = (window.location.hash || '').slice(1);
    if (bacaHash(window.location.hash)) return 'baca'; // tautan balik dari soal: #baca/<kitab>/<urutan>
    return ['compose', 'paket', 'baca', 'bank', 'export', 'fokus', 'pegon', 'analisis'].includes(h) || (canReview && ['review', 'backup'].includes(h)) || (isAdmin && ['dasbor', 'users', 'cfg', 'perpus', 'ai'].includes(h)) ? h : 'compose';
  });
  const terakhirRef = useRef({}); // sub-tab terakhir dipakai per grup navigasi (sesi ini)
  // Tab Baca Kitab: halaman awal dari tautan balik soal (#baca/<kitab>/<urutan>[-<akhir>]). Tautan di kartu soal hanya mengubah hash, jadi didengarkan di sini.
  const [bacaAwal, setBacaAwal] = useState(() => bacaHash(window.location.hash));
  useEffect(() => {
    const h = () => { const b = bacaHash(window.location.hash); if (b) { setBacaAwal(b); setTabRaw('baca'); window.scrollTo({ top: 0 }); } };
    window.addEventListener('hashchange', h); return () => window.removeEventListener('hashchange', h);
  }, []);
  const posisiBaca = ({ kitabId, seq }) => { try { window.history.replaceState(null, '', kitabId ? `#baca/${kitabId}/${seq}` : '#baca'); } catch (e) { /* alamat tidak bisa diubah: pembaca tetap jalan */ } };
  const setTab = (id) => { setTabRaw(id); { const g = NV.grupDariTab(id); if (g) terakhirRef.current[g.id] = id; } try { window.history.replaceState(null, '', '#' + id); } catch (e) { /* URL tidak bisa diubah: tab tetap berganti, hanya tidak diingat */ } };
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [saran, setSaran] = useState(null); // hasil saran bab terakhir (tidak dipulihkan setelah refresh: memakai kuota AI)
  // Penanda kuota AI di menu (admin): hanya dua dokumen plafon (2 baca Firestore) tiap 3 menit selama halaman terlihat; rincian per pengguna hanya dimuat di tab Dasbor.
  const [kuotaRingkas, setKuotaRingkas] = useState(null);
  useEffect(() => {
    if (!isAdmin) return undefined;
    let mati = false;
    const ambil = () => { if (document.visibilityState === 'hidden') return; callApi('/api/admin-stats', { ringkas: true }).then((d) => { if (!mati) setKuotaRingkas(d); }).catch(() => { /* penanda saja: gagal dibaca tidak mengganggu */ }); };
    ambil();
    const t = setInterval(ambil, 180000);
    return () => { mati = true; clearInterval(t); };
  }, [isAdmin]);
  const keluar = () => {
    // Isian yang belum disimpan tidak hilang: tetap ada sebagai draf di perangkat ini untuk akun Anda dan muncul lagi saat Anda masuk.
    // Di komputer bersama, kosongkan form dulu (tombol Kosongkan) bila isiannya tidak boleh terlihat orang lain.
    if (formBerisi(form) && !window.confirm('Isian soal yang belum disimpan akan tetap tersimpan sebagai draf di perangkat ini dan muncul lagi saat Anda masuk. Di komputer bersama, tekan Batal lalu klik Kosongkan terlebih dahulu. Tetap keluar?')) return;
    Draft.flush();
    setMenuOpen(false);
    // Komputer bersama: setelah keluar, hapus cache offline Firestore (soal + kunci jawaban) dari IndexedDB lalu muat ulang.
    (async () => {
      try { await firebase.auth().signOut(); } catch (e) { /* tetap lanjut membersihkan */ }
      try { const db = firebase.firestore(); await db.terminate(); await db.clearPersistence(); } catch (e) { /* cache tidak aktif atau sudah bersih */ }
      window.location.reload();
    })();
  };
  const pilihTab = (id) => { setTab(id); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  useEffect(() => {
    if (!menuOpen) return undefined;
    const klikLuar = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    const tekanEsc = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', klikLuar); document.addEventListener('touchstart', klikLuar); document.addEventListener('keydown', tekanEsc);
    return () => { document.removeEventListener('mousedown', klikLuar); document.removeEventListener('touchstart', klikLuar); document.removeEventListener('keydown', tekanEsc); };
  }, [menuOpen]);
  const [appCfg, setAppCfg] = useState(FALLBACK_CFG);
  const [alur, setAlur] = useState(AL.ALUR_BAWAAN);
  const [cfgInfo, setCfgInfo] = useState({ kustom: false });
  const [cfgReady, setCfgReady] = useState(false); // true setelah konfigurasi server terbaca (atau gagal dibaca): editor konfigurasi menunggu ini agar draf tidak dibandingkan dengan nilai cadangan
  const terapkanCfg = (d) => { if (Object.hasOwn(d, 'alur')) setAlur(AL.normalisasiAlur(d.alur)); setAppCfg(d.config); setCfgInfo({ kustom: !!d.kustom, diubahAt: d.diubahAt || null }); setCfgReady(true); };
  useEffect(() => { callApi('/api/app-config', { aksi: 'baca' }).then(terapkanCfg).catch(() => { setCfgReady(true); /* tetap memakai cadangan bawaan */ }); }, []);
  // Bank soal dimuat berhalaman agar hemat kuota baca Firestore (paket Spark: 50.000 baca/hari):
  //  - recent : HALAMAN soal terbaru (realtime), bisa dipersempit per tingkat (lingkup)
  //  - pendingQs : semua soal berstatus pending (realtime; hanya editor/admin) agar antrean review tidak terlewat walau soalnya lama
  //  - milik : draf dan soal revisi milik pengguna sendiri (realtime), agar tetap bisa diedit walau lama
  //  - extra : halaman tambahan yang dimuat lewat tombol "Muat lagi" (sekali baca, tidak realtime)
  const HALAMAN = 100;
  const [recent, setRecent] = useState([]);
  const [pendingQs, setPendingQs] = useState([]);
  const [milik, setMilik] = useState([]);
  const [extra, setExtra] = useState([]);
  const [lingkup, setLingkup] = useState(''); // '' = semua tingkat
  const [masihAda, setMasihAda] = useState(false);
  const [memuat, setMemuat] = useState(false);
  const kursor = useRef(null); const sudahLagi = useRef(false);
  const qs = useMemo(() => {
    const m = new Map();
    for (const arr of [extra, pendingQs, milik, recent]) for (const q of arr) m.set(q.id, q); // pendengar realtime paling segar, menang terakhir
    const ms = (q) => (q.updatedAt && typeof q.updatedAt.toMillis === 'function' ? q.updatedAt.toMillis() : Number.MAX_SAFE_INTEGER);
    return [...m.values()].sort((a, b) => ms(b) - ms(a));
  }, [extra, pendingQs, milik, recent]);
  const [loaded, setLoaded] = useState(false);
  const [loadErr, setLoadErr] = useState('');
  // Form soal dipulihkan dari draf otomatis bila ada (muat ulang halaman, tab tertutup).
  const awalForm = useRef(undefined); if (awalForm.current === undefined) awalForm.current = Draft.read('form') || null;
  const [form, setForm] = useState(() => (awalForm.current && awalForm.current.form ? normalForm(awalForm.current.form) : emptyForm()));
  const [editingId, setEditingId] = useState(() => (awalForm.current && typeof awalForm.current.editingId === 'string' && awalForm.current.editingId ? awalForm.current.editingId : null));
  const formDraf = useMemo(() => ({ form, editingId }), [form, editingId]);
  useDraftSync('form', formDraf, !editingId && !formBeda(form));
  // Bila browser memblokir penyimpanan lokal (mode privat tertentu), draf tidak bisa diselamatkan: setidaknya tanyakan sebelum tab ditutup atau dimuat ulang.
  const berisi = formBerisi(form);
  useEffect(() => {
    if (Draft.tersedia || !berisi) return undefined;
    const tanya = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', tanya); return () => window.removeEventListener('beforeunload', tanya);
  }, [berisi]);
  const [composeKey, setComposeKey] = useState(0); // naik tiap form dikosongkan/disimpan, supaya state lokal Compose (tautan, hasil AI) ikut bersih
  const [msg, setMsg] = useState('');
  const timer = useRef(null);
  const toast = (m) => { setMsg(m); clearTimeout(timer.current); timer.current = setTimeout(() => setMsg(''), 3500); };
  useEffect(() => {
    const a = awalForm.current; if (!a || !a.form) return;
    if (formBerisi(normalForm(a.form))) toast(a.editingId ? 'Draf perbaikan soal dipulihkan. Tekan Simpan Draft atau Kirim ke Editor agar tersimpan di server.' : 'Draf soal yang belum disimpan dipulihkan. Tekan Simpan Draft atau Kirim ke Editor agar tersimpan di server.');
  }, []);

  const dariDoc = (d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) });
  useEffect(() => {
    let q = lingkup ? col.where('tingkat', '==', lingkup) : col;
    q = q.orderBy('updatedAt', 'desc').limit(HALAMAN);
    setExtra([]); sudahLagi.current = false; kursor.current = null;
    return q.onSnapshot(
      (snap) => {
        setRecent(snap.docs.map(dariDoc)); setLoaded(true); setLoadErr('');
        if (!sudahLagi.current) { kursor.current = snap.docs[snap.docs.length - 1] || null; setMasihAda(snap.docs.length >= HALAMAN); }
      },
      (e) => {
        if (lingkup && e && e.code === 'failed-precondition') { toast('Indeks Firestore untuk lingkup tingkat belum dipasang (jalankan: firebase deploy --only firestore:indexes). Memakai semua tingkat.'); setLingkup(''); return; }
        setLoadErr('Bank soal tidak bisa dimuat. Periksa koneksi, atau minta admin memastikan peran Anda aktif.'); setLoaded(true);
      },
    );
  }, [lingkup]);
  useEffect(() => (canReview
    ? col.where('status', '==', 'pending').limit(300).onSnapshot((snap) => setPendingQs(snap.docs.map(dariDoc)), () => setPendingQs([]))
    : undefined), [canReview]);
  useEffect(() => col.where('authorUid', '==', user.uid).where('status', 'in', ['draft', 'revision']).limit(200)
    .onSnapshot((snap) => setMilik(snap.docs.map(dariDoc)), () => setMilik([])), [user.uid]);
  const muatLagi = async () => {
    if (memuat || !kursor.current) return;
    setMemuat(true);
    try {
      let q = lingkup ? col.where('tingkat', '==', lingkup) : col;
      const snap = await q.orderBy('updatedAt', 'desc').startAfter(kursor.current).limit(HALAMAN).get();
      sudahLagi.current = true;
      setExtra((e) => [...e, ...snap.docs.map(dariDoc)]);
      if (snap.docs.length) kursor.current = snap.docs[snap.docs.length - 1];
      setMasihAda(snap.docs.length >= HALAMAN);
    } catch (e) { toast('Gagal memuat soal berikutnya. Periksa koneksi lalu coba lagi.'); } finally { setMemuat(false); }
  };

  // ---- Kamus Pegon bersama ----
  // Dibaca semua staf. Ditulis hanya editor/admin (aturan Firestore). Setiap dokumen divalidasi ulang di mesin (muatBersama).
  const [kamusDocs, setKamusDocs] = useState([]);
  const [kamusVer, setKamusVer] = useState(0);
  const [kamusErr, setKamusErr] = useState(null);
  useEffect(() => db.collection('kamusPegon').onSnapshot(
    (snap) => {
      const docs = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      kamusBersamaMasuk(docs);
      setKamusDocs(docs); setKamusErr(null); setKamusVer((n) => n + 1);
    },
    () => setKamusErr('Kamus bersama tidak dapat dimuat. Pegon memakai kamus bawaan dan kamus perangkat ini.'),
  ), []);
  const kamusSimpan = async (daftar) => {
    if (!canReview) throw new Error('Hanya editor atau admin yang dapat mengubah kamus bersama.');
    const P = window.Pegon; const ok = [];
    // Satu per satu (paralel kecil), bukan batch: aturan memanggil get() ke profil peran, dan batas panggilan akses per permintaan batch tidak pasti.
    for (let i = 0; i < daftar.length; i += 10) {
      await Promise.all(daftar.slice(i, i + 10).map(async (en) => {
        const r = P.kamus.bentukEntri(en); if (!r.ok) return;
        await db.collection('kamusPegon').doc(P.kamus.idEntri(r.entri)).set({ ...r.entri, updatedAt: ts(), updatedByUid: user.uid, updatedByName: String(displayName || '').slice(0, 120) });
        ok.push(r.entri);
      }));
    }
    return ok;
  };
  const kamusHapus = async (id) => { if (!canReview) throw new Error('Hanya editor atau admin yang dapat mengubah kamus bersama.'); await db.collection('kamusPegon').doc(id).delete(); };
  const kamusCtx = useMemo(() => ({ docs: kamusDocs, ver: kamusVer, err: kamusErr, canShare: canReview, simpan: kamusSimpan, hapus: kamusHapus }), [kamusDocs, kamusVer, kamusErr, canReview]);

  const failMsg = (e) => (e && e.code === 'permission-denied'
    ? 'Ditolak: Anda tidak berhak melakukan ini, atau soal sudah diubah orang lain.'
    : 'Gagal menyimpan. Periksa koneksi lalu coba lagi.');

  // Jejak audit disimpan bersama soal; editor melihatnya dan aturan Firestore memakainya sebagai gerbang persetujuan.
  const aiMeta = () => {
    const K = window.Kutipan; const a = form.ai || {};
    let v = '';
    if (K && form.teks && form.pembahasan) { try { v = K.periksaKutipan(K.bidangDariSoal(form), form.teks).status; } catch (e) { v = ''; } }
    // Soal buatan AI tanpa teks kitab tidak bisa diperiksa kutipannya: tandai 'tanpa_teks' (jangan dikosongkan diam-diam).
    else if (K && !String(form.teks || '').trim() && form.pembahasan && a.dibuat) v = 'tanpa_teks';
    return { dibuat: !!a.dibuat, model: String(a.model || '').slice(0, 60), verifikasi: v, buta: a.buta || '' };
  };
  const content = () => {
    const sel = Bt.selaraskan(form); // opsi dan kunci mengikuti bentuk soal (mis. isian tanpa opsi, benar-salah hanya A/B)
    const c = Object.fromEntries(FIELDS.map((k) => [k, sel[k]]));
    const lama = editingId ? (qs.find((x) => x.id === editingId) || {}) : {};
    for (const k of ['kelas', 'periode', 'bab', 'jawaban', 'rubrik', 'kitabId', 'halId', 'halIdAkhir']) if (!c[k] && !(k in lama)) delete c[k]; // kosong dan belum pernah ada: jangan kirim (aturan Firestore lama menolak kunci baru)
    if (c.bentuk === 'pilgan' && !('bentuk' in lama)) delete c.bentuk; // pilihan ganda = bawaan: soal biasa tetap sama persis dengan sebelum fitur bentuk
    return { ...c, ai: aiMeta() };
  };
  // Hapus form dan semua draf terkait (dipanggil setelah berhasil disimpan ke server, atau saat pengguna mengosongkan form).
  const kosongkanForm = () => { Draft.remove('form'); Draft.remove('composeEx'); setForm(emptyForm()); setEditingId(null); setComposeKey((n) => n + 1); };
  // Deteksi soal kembar/mirip. Pembanding: soal yang sudah dimuat + soal sekitab (kitab yang sama, maks. 200, disimpan 10 menit per kitab agar hemat jatah baca Firestore).
  // Soal lama di luar itu tidak diperiksa (bank dimuat berhalaman). Pemeriksaan yang gagal tidak menghalangi penyimpanan.
  const cacheKitab = useRef(new Map());
  const sudahDiakui = useRef(new Set());
  const kandidatDuplikat = async () => {
    const gabung = new Map(qs.map((q) => [q.id, q]));
    const nama = String(form.nama || '').trim();
    if (nama) {
      let c = cacheKitab.current.get(nama);
      if (!c || Date.now() - c.waktu > 600000) {
        c = { waktu: Date.now(), daftar: (await col.where('nama', '==', nama).limit(200).get()).docs.map(dariDoc) };
        cacheKitab.current.set(nama, c);
      }
      for (const q of c.daftar) if (!gabung.has(q.id)) gabung.set(q.id, q);
    }
    return [...gabung.values()];
  };
  // Butir paket vs soal yang sudah ada di bank (cache sekitab yang sama dengan kandidatDuplikat: tidak menambah jatah baca Firestore bila sudah termuat).
  const cekKembarBank = async (soalList, namaKitab) => {
    const gabung = new Map(qs.map((q) => [q.id, q]));
    const nama = String(namaKitab || '').trim();
    if (nama) {
      let c = cacheKitab.current.get(nama);
      if (!c || Date.now() - c.waktu > 600000) {
        c = { waktu: Date.now(), daftar: (await col.where('nama', '==', nama).limit(200).get()).docs.map(dariDoc) };
        cacheKitab.current.set(nama, c);
      }
      for (const q of c.daftar) if (!gabung.has(q.id)) gabung.set(q.id, q);
    }
    const daftar = [...gabung.values()]; const hasil = [];
    soalList.forEach((soal, i) => { const m = DUP.cari(soal, daftar, { maks: 1 }); if (m.length) hasil.push({ i, ...m[0] }); });
    return { hasil, total: daftar.length };
  };
  const amanDariDuplikat = async () => {
    let daftar; let hasil;
    try { daftar = await kandidatDuplikat(); hasil = DUP.cari(Bt.selaraskan(form), daftar, { abaikanId: editingId || '' }); } catch (e) { return true; }
    if (!hasil.length) return true;
    const kunci = (editingId || 'baru') + '|' + hasil.map((h) => h.q.id).join(',');
    if (sudahDiakui.current.has(kunci)) return true; // sudah ditanya untuk soal ini dan pengguna memilih tetap menyimpan
    if (!window.confirm(DUP.pesanKonfirmasi(hasil, { total: daftar.length }))) return false;
    sudahDiakui.current.add(kunci);
    return true;
  };
  const commit = async (status) => {
    if (!(await amanDariDuplikat())) { toast('Penyimpanan dibatalkan. Ubah soalnya, atau simpan lagi dan pilih tetap simpan.'); return false; }
    try {
      if (editingId) {
        const ref = col.doc(editingId); const baru = { ...content(), status, catatan: '', updatedAt: ts() };
        let lama = null; try { lama = (await ref.get()).data() || null; } catch (e) { lama = null; } // gagal baca riwayat tidak boleh menggagalkan penyimpanan
        if (lama && RW.adaPerubahan(lama, { ...lama, ...baru })) {
          const b = db.batch(); b.update(ref, baru); b.set(ref.collection('riwayat').doc(), RW.buatRiwayat(lama, { uid: user.uid, nama: displayName }, ts()));
          try { await b.commit(); } catch (e) { if (e && e.code === 'permission-denied') await ref.update(baru); else throw e; } // aturan lama belum memuat `riwayat`: simpan soal tetap berhasil
        } else await ref.update(baru);
      }
      else await col.add({ ...content(), status, catatan: '', authorUid: user.uid, authorName: displayName, createdAt: ts(), updatedAt: ts() });
      kosongkanForm();
      return true;
    } catch (e) { toast(failMsg(e)); return false; } // gagal: isian dan drafnya tetap ada
  };
  const saveDraft = async () => { if (await commit('draft')) toast('Draft tersimpan (status Draft). Cari di tab Bank Soal.'); };
  // Simpan massal hasil Paket Dauri (Draft atau Pending). Status ai.verifikasi dihitung ulang terhadap segmen sumbernya (kutipan ada di pembahasan).
  // Aturan Firestore memanggil exists() + get() ke profil peran untuk SETIAP dokumen, dan satu permintaan batch dibatasi 20 panggilan akses.
  // Karena itu batch dibatasi 8 dokumen (16 panggilan). Bila batch tetap ditolak, bagian itu diulang per dokumen (batch bersifat atomik,
  // jadi tidak ada dokumen ganda) supaya jelas apakah penyebabnya batas batch atau memang aturan/isi butir.
  const simpanPaket = async (butir, meta) => {
    const K = window.Kutipan; const potong = (v, m) => String(v || '').slice(0, m);
    const bangun = (x) => {
      const q = x.soal; const bt = Bt.bentukDari(q.bentuk);
      let v = ''; try { v = K ? K.periksaKutipan(K.bidangDariSoal(q), x.segmenTeks).status : ''; } catch (e) { v = ''; }
      const c = {
        tingkat: potong(meta.tingkat, 40), mapel: potong(meta.mapel, 60), level: q.level, nama: potong(meta.nama, 120), juz: potong(meta.juz, 20),
        hal: potong(x.segmenHal, 20), teks: potong(x.segmenTeks, 8000), stimulus: '', pertanyaan: potong(q.pertanyaan, 2000), indikator: potong(q.indikator, 1000), sumberUrl: '',
        opsi: Object.fromEntries(['A', 'B', 'C', 'D', 'E'].map((k) => [k, potong(q.opsi && q.opsi[k], 1000)])),
        kunci: q.kunci || '', pembahasan: potong(q.pembahasan, 4000), bentuk: bt, jawaban: potong(q.jawaban, 2000), rubrik: '',
        ai: { dibuat: true, model: potong(x.model, 60), verifikasi: ['lolos', 'periksa', 'gagal', 'tanpa_teks'].includes(v) ? v : '', buta: '' },
      };
      if (meta.kelas) c.kelas = potong(meta.kelas, 20);
      if (meta.periode) c.periode = potong(meta.periode, 20);
      if (meta.tautan) Object.assign(c, meta.tautan); // bab (kisi-kisi) dan kitabId/halId/halIdAkhir (tautan balik ke perpustakaan), hanya bila ada
      // Penanda kelompok: seluruh butir satu kali simpan menjadi satu paket (Bank Soal dan Ekspor menampilkannya sebagai satu kesatuan).
      if (meta.paketId) Object.assign(c, PK.penandaPaket({ id: meta.paketId, dawr: meta.dawr, cakupan: meta.cakupan, urut: meta.urut && meta.urut.get(x.uid) }));
      if (bt === 'pilgan') delete c.bentuk; // pilihan ganda = bawaan, sama persis dengan soal biasa
      if (!c.jawaban) delete c.jawaban;
      delete c.rubrik;
      return { ...c, status: meta.status === 'pending' ? 'pending' : 'draft', catatan: '', authorUid: user.uid, authorName: potong(displayName, 120), createdAt: ts(), updatedAt: ts() };
    };
    // Diagnosis otomatis saat satu dokumen ditolak: tulis dokumen uji (tanpa kolom opsional, lalu tambah satu kelompok kolom
    // per percobaan) dan hapus lagi. Hasilnya menunjuk kelompok kolom yang ditolak aturan yang BENAR-BENAR terbit di proyek ini.
    const diagnosa = async (dok) => {
      const KELOMPOK = [['paket', 'dawr', 'cakupan', 'urut'], ['kelas', 'periode'], ['bab'], ['kitabId', 'halId', 'halIdAkhir'], ['bentuk', 'jawaban']];
      let proyek = ''; try { proyek = firebase.app().options.projectId || ''; } catch (e) { proyek = ''; }
      const semua = new Set(KELOMPOK.flat());
      const dasar = Object.fromEntries(Object.entries(dok).filter(([k]) => !semua.has(k)));
      const coba = async (d) => { try { const r = await col.add(d); try { await r.delete(); } catch (e) { /* dokumen uji draft milik sendiri; abaikan bila gagal dihapus */ } return true; } catch (e) { return e && e.code === 'permission-denied' ? false : null; } };
      const awal = `Proyek Firebase aplikasi ini: "${proyek || 'tidak terbaca'}" (harus sama dengan proyek tempat Anda menerbitkan firestore.rules).`;
      const okDasar = await coba(dasar);
      if (okDasar === false) return `${awal} Diagnosis: dokumen dasar TANPA kolom paket pun ditolak. Penyebabnya bukan kolom Paket Dauri, melainkan aturan dasar atau profil: periksa dokumen users/${user.uid} (field role harus tepat "admin"/"editor"/"penyusun"), dan pastikan aturan diterbitkan di proyek dan database "(default)" yang dipakai aplikasi.`;
      if (okDasar === null) return `${awal} Diagnosis tidak bisa dijalankan (galat jaringan).`;
      const ditolak = [];
      for (const g of KELOMPOK) {
        const ada = g.filter((k) => k in dok); if (!ada.length) continue;
        const d = { ...dasar }; for (const k of ada) d[k] = dok[k];
        if ((await coba(d)) === false) ditolak.push(ada.join('+'));
      }
      if (ditolak.length) return `${awal} Diagnosis: aturan yang terbit MENOLAK kolom: ${ditolak.join(', ')}. Berarti isi firestore.rules di Firebase bukan versi terbaru dari repo ini.`;
      // Semua kelompok lolos sendiri-sendiri: tambahkan kumulatif untuk mencari titik mulai ditolak (dugaan: batas 1.000 ekspresi per permintaan pada aturan).
      let kum = { ...dasar }; const urut = [];
      for (const g of KELOMPOK) {
        const ada = g.filter((k) => k in dok); if (!ada.length) continue;
        for (const k of ada) kum[k] = dok[k]; urut.push(ada.join('+'));
        if ((await coba({ ...kum })) === false) return `${awal} Diagnosis: ditolak mulai setelah kelompok kolom ditambahkan berurutan sampai "${urut.join(' > ')}". Tiap kelompok lolos sendiri, jadi ini batas evaluasi aturan (terlalu banyak kolom sekaligus). Terbitkan firestore.rules terbaru dari berkas yang saya kirim.`;
      }
      return `${awal} Diagnosis: dokumen dasar, tiap kelompok, dan gabungannya diterima pada percobaan ini, jadi penyebabnya nilai spesifik pada butir ini. Kirimkan teks butir pertama ke saya.`;
    };
    const gagal = (e, tersimpan, rincian = '') => {
      const awal = tersimpan > 0 ? `Sebagian tersimpan (${tersimpan} dari ${butir.length} butir) lalu gagal.` : 'Belum ada butir yang tersimpan.';
      return new Error(`${awal} ${failMsg(e)}${rincian ? ' ' + rincian : ''}`);
    };
    const UKURAN_BATCH = 8; let n = 0;
    for (let i = 0; i < butir.length; i += UKURAN_BATCH) {
      const dokumen = butir.slice(i, i + UKURAN_BATCH).map(bangun);
      try {
        const batch = db.batch();
        for (const dok of dokumen) batch.set(col.doc(), dok);
        await batch.commit(); n += dokumen.length;
      } catch (e) {
        if (!(e && e.code === 'permission-denied')) throw gagal(e, n);
        for (const dok of dokumen) { // batch atomik: tidak ada yang tersimpan, jadi aman diulang satu per satu
          try { await col.add(dok); n++; } catch (e2) { throw gagal(e2, n, e2 && e2.code === 'permission-denied' ? await diagnosa(dok) : ''); }
        }
      }
    }
    return n;
  };
  // Kirim sekaligus butir milik penyusun dalam satu paket (draft atau yang dikembalikan editor untuk revisi) ke editor.
  const kirimPaket = async (ids) => {
    try {
      for (let i = 0; i < ids.length; i += 400) {
        const batch = db.batch();
        ids.slice(i, i + 400).forEach((id) => batch.update(col.doc(id), { status: 'pending', catatan: '', updatedAt: ts() }));
        await batch.commit();
      }
      toast(`${ids.length} butir paket dikirim ke editor.`);
    } catch (e) { toast(failMsg(e)); }
  };
  // Serah-terima antartab lewat draf perangkat (dibaca tab tujuan saat dibuka): pilihan soal dan filter disiapkan, lalu pindah tab.
  const terapkanRencana = (r) => { for (const x of r) Draft.saveNow(x.nama, x.nilai); };
  const kirimKeTab = (tujuan, ids) => {
    const r = SH.rencanaPilihSoal(tujuan, ids, Draft.read(tujuan === 'export' ? 'exportPrefs' : 'kisiPrefs'));
    if (!r) { toast('Tidak ada soal Approved untuk dikirim.'); return; }
    terapkanRencana(r);
    toast(`${r[1].nilai.picked.length} soal dipilih di tab ${tujuan === 'export' ? 'Export/Download' : 'Fokus Ujian & Kisi-kisi'}.`);
    pilihTab(tujuan);
  };
  // Setelah paket disimpan: buka Bank Soal langsung pada paket itu (semua status), agar bisa ditelaah dan dikirim ke editor.
  const bukaPaketDiBank = (paketId) => { const r = SH.rencanaBukaPaket(paketId); if (r) { terapkanRencana(r); pilihTab('bank'); } };
  const sendEditor = async () => { if (await commit('pending')) { toast('Soal dikirim ke editor.'); setTab(canReview ? 'review' : 'bank'); } };
  // Persetujuan lewat server: gerbang kutipan dan uji buta dihitung ulang di sana (klaim di dokumen soal tidak dipercaya).
  const approve = async (id, note = '') => {
    try {
      const d = await callApi('/api/assist', { aksi: 'setujui', id, catatan: note });
      Draft.remove('catatan:' + id);
      if (d && d.lanjut) { toast(`Soal diloloskan ke editor tahap ${d.tahap} dari ${d.total}.`); return; }
      const SUMBER_INFO = { tanpa_sumber: ' Teks kitab tidak dicocokkan ke sumber (tanpa tautan sumber).', tidak_terjangkau: ' Situs sumber tidak terjangkau, teks kitab tidak dicocokkan.', sebagian: ' Sebagian baris teks tidak ada di halaman sumber (wajar bila gabungan beberapa halaman).' };
      toast('Soal disetujui dan masuk Bank Soal.' + (SUMBER_INFO[d && d.sumber] || ''));
    } catch (e) { const er = apiErr(e); toast(er && er.message ? er.message : failMsg(e)); }
  };
  // Permintaan revisi juga lewat server (bukan tulis Firestore langsung): tahap editor ditegakkan di sana dan tahap berikutnya dicatat.
  const revise = async (id, note) => {
    try {
      await callApi('/api/assist', { aksi: 'revisi', id, catatan: note });
      Draft.remove('catatan:' + id); // catatan sudah tersimpan bersama soal
      toast('Permintaan revisi dikirim ke penyusun.');
    } catch (e) { const er = apiErr(e); toast(er && er.message ? er.message : failMsg(e)); }
  };
  const edit = (q) => {
    // Memuat soal lain ke form menimpa isian di form; jangan diam-diam membuang isian yang belum disimpan.
    if (editingId !== q.id && formBerisi(form) && !window.confirm('Form Penyusunan Soal berisi isian yang belum disimpan. Mengedit soal ini akan menggantinya. Lanjutkan?')) return;
    Draft.remove('composeEx'); setComposeKey((n) => n + 1);
    const base = emptyForm();
    setForm({ ...base, ...Object.fromEntries(FIELDS.map((k) => [k, q[k] ?? base[k]])), bentuk: Bt.bentukDari(q), opsi: { ...base.opsi, ...q.opsi }, ai: { ...base.ai, ...(q.ai || {}) } });
    setEditingId(q.id); setTab('compose');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  // Firestore tidak menghapus subkoleksi otomatis. Setelah soal terhapus, hapus riwayat versinya satu per satu (aturan mengizinkan hanya bila soalnya sudah tidak ada).
  // Best effort: gagal di sini tidak membatalkan penghapusan soal; admin bisa menyapu sisanya (Konfigurasi, Pemeliharaan data).
  const hapusRiwayat = async (id) => {
    try { const s = await col.doc(id).collection('riwayat').get(); await Promise.allSettled(s.docs.map((d) => d.ref.delete())); } catch (e) { /* disapu admin kemudian */ }
  };
  const del = async (id) => { try { await col.doc(id).delete(); hapusRiwayat(id); setExtra((e) => e.filter((x) => x.id !== id)); toast('Soal dihapus.'); } catch (e) { toast(failMsg(e)); } };
  const delMany = async (ids) => {
    const gagal = [];
    for (let i = 0; i < ids.length; i += 25) {
      const hasil = await Promise.allSettled(ids.slice(i, i + 25).map((id) => col.doc(id).delete()));
      hasil.forEach((r, j) => { if (r.status === 'rejected') gagal.push(ids[i + j]); });
    }
    const ok = ids.filter((id) => !gagal.includes(id));
    for (const id of ok) await hapusRiwayat(id);
    setExtra((e) => e.filter((x) => !ok.includes(x.id)));
    toast(gagal.length ? `${ok.length} soal dihapus, ${gagal.length} gagal (ditolak server atau jaringan). Coba lagi untuk sisanya.` : `${ok.length} soal dihapus.`);
    return ok.length;
  };
  const canEdit = (q) => isAdmin || (q.authorUid === user.uid && (q.status === 'draft' || q.status === 'revision'));

  // Dari saran bab ke form soal. Form kosong: kitab, jenjang, dan bab diisi. Form berisi: HANYA kolom Bab (isian yang sedang diketik tidak diubah).
  const pakaiBab = (o) => {
    const kosong = !formBerisi(form);
    setForm((f) => {
      if (!kosong) return { ...f, bab: o.bab };
      const l = mapelUntuk(appCfg, o.tingkat);
      return { ...f, bab: o.bab, nama: o.nama || f.nama, tingkat: o.tingkat || f.tingkat, kelas: o.kelas || '', periode: o.periode || '', mapel: l.includes(o.mapel) ? o.mapel : f.mapel };
    });
    toast(kosong ? `Form diisi untuk bab “${o.bab}”. Tempel teks kitab bab ini lalu susun soalnya.` : `Kolom Bab diisi “${o.bab}”. Kitab dan jenjang di form tidak diubah karena form sedang berisi.`);
    setTab('compose'); window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const saranCtx = { saran, setSaran, pakaiBab };

  const pending = qs.filter((q) => q.status === 'pending');
  // Antrean editor: dengan alur bertingkat, editor hanya melihat soal yang menunggu tahapnya (admin dan mapel satu tahap: semua).
  const antrian = pending.filter((q) => AL.masukAntrean(me, q, alur));
  const approvedN = qs.filter((q) => q.status === 'approved').length;
  const TABS = [
    { id: 'compose', label: 'Penyusunan Soal', icon: PenLine },
    { id: 'paket', label: 'Paket Dauri', icon: Layers },
    ...(canReview ? [{ id: 'review', label: 'Review/Validasi', icon: ClipboardCheck, n: antrian.length }] : []), // penyusun memantau soalnya lewat Bank Soal
    { id: 'bank', label: 'Bank Soal Approved', icon: Library, n: approvedN },
    { id: 'export', label: 'Export/Download', icon: Download },
    { id: 'fokus', label: 'Fokus Ujian & Kisi-kisi', icon: ListChecks },
    { id: 'pegon', label: 'Pegonizer', icon: Languages },
    { id: 'baca', label: 'Baca Kitab', icon: BookOpen },
    { id: 'analisis', label: 'Analisis Butir', icon: BarChart3 },
    ...(canReview ? [{ id: 'backup', label: 'Backup Drive', icon: CloudUpload }] : []),
    ...(isAdmin ? [{ id: 'dasbor', label: 'Dasbor', icon: LayoutDashboard, n: kuotaRingkas ? kuotaRingkas.peringatan : 0 }, { id: 'users', label: 'Pengguna', icon: Users }, { id: 'cfg', label: 'Konfigurasi', icon: BookOpen }, { id: 'perpus', label: 'Perpustakaan Kitab', icon: LibraryBig }, { id: 'ai', label: 'Pengaturan AI', icon: Sparkles }] : []),
  ];
  const subNavRef = useRef(null);
  useEffect(() => { // sub-tab aktif digulirkan ke tengah bilah, supaya tidak tersembunyi di luar layar HP
    const n = subNavRef.current; const el = n && n.querySelector('[aria-current="page"]');
    if (n && el) n.scrollTo({ left: Math.max(0, el.offsetLeft - (n.clientWidth - el.offsetWidth) / 2), behavior: 'smooth' });
  }, [tab]);
  const needsData = tab === 'review' || tab === 'bank' || tab === 'export' || tab === 'fokus';
  const aktif = TABS.find((t) => t.id === tab);
  const NAV = NV.bangunNav(TABS);
  const grupAktif = NAV.find((g) => g.items.some((t) => t.id === tab)) || null;
  const tampilGrup = (g) => (g.items.length === 1 ? { label: g.items[0].label, Ikon: g.items[0].icon } : { label: g.label, Ikon: IKON_GRUP[g.id] || Menu });
  const pendingBadge = canReview ? antrian.length : 0;
  const kuotaGenting = !!(isAdmin && kuotaRingkas && kuotaRingkas.peringatan > 0);

  return (
    <div className="font-sans">
      <AppHeader />

      {/* Bilah beku: tetap di atas saat halaman digulir */}
      <div className="sticky z-40 bg-head text-head-ink shadow-md sm:rounded-b-2xl" style={{ top: 'env(safe-area-inset-top, 0px)', marginLeft: 'calc(-1 * max(16px, env(safe-area-inset-left, 0px)))', marginRight: 'calc(-1 * max(16px, env(safe-area-inset-right, 0px)))', paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))', paddingRight: 'max(16px, env(safe-area-inset-right, 0px))' }}>
        <div className="mx-auto flex max-w-6xl items-center gap-2 py-2">
          <button type="button" aria-label="Ke atas" title="Ke atas" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hidden shrink-0 rounded-lg sm:block"><AppLogo size={36} /></button>
          <div ref={menuRef} className="relative min-w-0 flex-1">
            <button type="button" id="tombol-menu" aria-haspopup="true" aria-expanded={menuOpen} aria-controls="menu-tab" onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex max-w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-white/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="shrink-0">{menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
              <span className="sr-only">Menu navigasi</span>
              <span className="flex min-w-0 items-center gap-2 rounded-md bg-white/10 px-2.5 py-1">
                {grupAktif ? (() => { const T = tampilGrup(grupAktif); return <><T.Ikon size={15} className="shrink-0" /><span className="truncate">{T.label}</span></>; })() : <span className="truncate">Menu</span>}
                {pendingBadge > 0 && !menuOpen && <span aria-label={pendingBadge + ' soal menunggu review'} className="h-2 w-2 shrink-0 rounded-full bg-amber-300" />}
                {kuotaGenting && !menuOpen && <span aria-label="Kuota AI hampir atau sudah habis" className="h-2 w-2 shrink-0 rounded-full bg-red-400" />}
              </span>
            </button>
            {menuOpen && (
              <nav id="menu-tab" aria-label="Navigasi utama" className="fade-in absolute left-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-surface p-1.5 text-ink shadow-xl">
                {NAV.map((g) => { const T = tampilGrup(g); const aktifG = grupAktif && grupAktif.id === g.id; return (
                  <button key={g.id} type="button" onClick={() => pilihTab(NV.tujuanGrup(g, terakhirRef.current))} aria-current={aktifG ? 'page' : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition ${aktifG ? 'bg-soft text-soft-ink' : 'hover:bg-soft'}`}>
                    <T.Ikon size={17} className="shrink-0" />
                    <span className="min-w-0 flex-1">{T.label}{g.items.length > 1 && <span className="block truncate text-xs font-normal text-mute">{g.items.map((t) => NV.SUB_LABEL[t.id] || t.label).join(' · ')}</span>}</span>
                    {g.lencana > 0 && <span className="rounded-full bg-soft px-2 py-px text-xs text-soft-ink">{g.lencana}</span>}
                  </button>
                ); })}
                <div className="mt-1.5 border-t border-line px-3.5 pb-1 pt-2.5">
                  <p className="truncate text-xs font-semibold">{displayName}</p>
                  <p className="text-xs text-mute">{ROLE_LABEL[profile.role]}</p>
                </div>
                <button type="button" onClick={keluar} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-bad transition hover:bg-bad-bg"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg><span>Keluar</span></button>
              </nav>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {user.photoURL && <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full" />}
            <div className="hidden text-right text-xs md:block"><p className="font-semibold">{displayName}</p><p className="opacity-75">{ROLE_LABEL[profile.role]}</p></div>
            <button type="button" id="tombol-keluar" aria-label="Keluar" title="Keluar" onClick={keluar} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold hover:bg-white/10"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg><span className="hidden sm:inline">Keluar</span></button>
          </div>
        </div>
        {grupAktif && grupAktif.items.length > 1 && (
          <nav ref={subNavRef} aria-label={'Sub-tab ' + grupAktif.label} className="subtab-fade relative mx-auto flex max-w-6xl gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none] max-sm:[&>*:first-child]:ml-auto max-sm:[&>*:last-child]:mr-auto">
            {grupAktif.items.map((t) => (
              <button key={t.id} type="button" onClick={() => pilihTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${tab === t.id ? 'bg-white/25' : 'bg-white/10 hover:bg-white/15'}`}>
                <t.icon size={14} className="shrink-0" />{NV.SUB_LABEL[t.id] || t.label}
                {t.n > 0 && <span className="rounded-full bg-white/20 px-1.5 text-xs">{t.n}</span>}
              </button>
            ))}
          </nav>
        )}
      </div>

      <main id="konten" tabIndex={-1} className="mx-auto max-w-6xl py-6 outline-none sm:py-8">
        <AppCfgCtx.Provider value={appCfg}><AlurCtx.Provider value={alur}>
        <KamusCtx.Provider value={kamusCtx}>
        <SaranCtx.Provider value={saranCtx}>
        {loadErr && <p role="alert" className="mb-4 rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">{loadErr}</p>}
        {tab === 'compose' && <Compose key={composeKey} form={form} setForm={setForm} editingId={editingId} onSave={saveDraft} onSend={sendEditor}
          onReset={() => { if (formBerisi(form) && !window.confirm('Kosongkan seluruh isian soal? Draf otomatis di perangkat ini ikut terhapus.')) return; kosongkanForm(); }} toast={toast} />}
        {tab === 'paket' && <PaketDauri toast={toast} onSimpan={simpanPaket} onBukaBank={bukaPaketDiBank} onCekBank={cekKembarBank} />}
        {needsData && !loaded && <div className="flex justify-center py-16 text-mute"><Loader2 className="spin" /></div>}
        {loaded && (tab === 'bank' || tab === 'export' || tab === 'fokus') && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-line px-4 py-3 text-sm" role="status">
            <span className="text-mute">Dimuat {qs.length} soal{masihAda ? ' terbaru (masih ada yang lebih lama)' : ' (semua yang tersedia)'}.</span>
            <label className="flex items-center gap-2 font-semibold">Lingkup tingkat
              <select className="field !w-auto" value={lingkup} onChange={(e) => setLingkup(e.target.value)} aria-label="Lingkup tingkat yang dimuat">
                <option value="">Semua tingkat</option>
                {appCfg.tingkat.map((t) => <option key={t.nama} value={t.nama}>{t.nama}</option>)}
              </select>
            </label>
            {masihAda && <Btn kind="ghost" onClick={muatLagi} disabled={memuat}>{memuat ? <Loader2 size={15} className="spin" /> : null}Muat {HALAMAN} lagi</Btn>}
            {tab !== 'bank' && masihAda && <span className="text-xs text-mute">Ekspor dan Fokus Ujian hanya memakai soal yang sudah dimuat.</span>}
          </div>
        )}
        {loaded && tab === 'review' && <Review list={antrian} all={qs} me={me} onApprove={approve} onRevise={revise} />}
        {loaded && tab === 'bank' && <Bank all={qs} onEdit={edit} onDelete={del} onDeleteMany={delMany} canEdit={canEdit} uid={user.uid} onKirim={kirimPaket} onKirimTab={kirimKeTab} />}
        {loaded && tab === 'export' && <Export all={qs} toast={toast} />}
        {loaded && tab === 'fokus' && <FokusUjian all={qs} toast={toast} />}
        {tab === 'pegon' && <PegonTab toast={toast} />}
        {tab === 'baca' && <PembacaKitab Btn={Btn} ErrorBox={ErrorBox} callApi={callApi} apiErr={apiErr} awal={bacaAwal} onPosisi={posisiBaca} bisaKoreksi={canReview} />}
        {tab === 'baca' && <div className="mt-4"><TanyaKitab Btn={Btn} ErrorBox={ErrorBox} callApi={callApi} apiErr={apiErr} /></div>}
        {tab === 'analisis' && <AnalisisButir Btn={Btn} unduh={simpanBerkas} paketList={loaded ? PK.kelompokPaket(qs).paket : []} onEdit={edit} canEdit={canEdit} />}
        {tab === 'backup' && canReview && <BackupTab user={user} isAdmin={isAdmin} toast={toast} onCfg={terapkanCfg} />}
        {tab === 'dasbor' && isAdmin && <Dasbor pending={pending} onBukaReview={() => pilihTab('review')} />}
        {tab === 'users' && isAdmin && <UserAdmin me={me} toast={toast} />}
        {tab === 'cfg' && isAdmin && (cfgReady ? <div className="space-y-6"><AlurEditorAdmin alur={alur} mapel={appCfg.mapel} onSaved={setAlur} toast={toast} /><PemeliharaanAdmin toast={toast} /><AppCfgAdmin cfg={appCfg} kustom={cfgInfo.kustom} diubahAt={cfgInfo.diubahAt} onSaved={terapkanCfg} toast={toast} /></div> : <div className="flex justify-center py-16 text-mute"><Loader2 className="spin" /></div>)}
        {tab === 'perpus' && isAdmin && <KitabImpor Btn={Btn} ErrorBox={ErrorBox} callApi={callApi} apiErr={apiErr} toast={toast} />}
        {tab === 'ai' && isAdmin && <AiConfig toast={toast} />}
        </SaranCtx.Provider>
        </KamusCtx.Provider>
        </AlurCtx.Provider></AppCfgCtx.Provider>
      </main>
      <KreditKaki className="mx-auto max-w-6xl px-4 pt-2" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }} />
      <Toast t={msg} />
    </div>
  );
}

/* ---------- Peran Ustadz ---------- */
// Alat bantu untuk soal latihan sendiri: susun (dengan AI), Pegonkan, dan ekspor. TIDAK memasang pendengar ke koleksi `soal` (aturan Firestore menolaknya)
// dan tidak mengirim apa pun ke editor. Soal disimpan hanya di perangkat ini (web/lib/ustadz.js), per akun.
// Kerangka (header, menu) sengaja disalin dari App agar App tidak ikut berubah; setiap perubahan tampilan kerangka perlu dibuat di dua tempat.
const lokalStorage = () => { try { const s = window.localStorage; const k = 'labsouma-soalsaya:v1:__uji__'; s.setItem(k, '1'); s.removeItem(k); return s; } catch (e) { return null; } };
const PESAN_SIMPAN = {
  'terlalu-banyak': `Soal Saya sudah berisi ${UT.MAKS_SOAL} soal. Unduh cadangan, lalu hapus soal yang tidak dipakai.`,
  'terlalu-besar': 'Penyimpanan Soal Saya di perangkat ini penuh. Unduh cadangan, lalu hapus soal yang tidak dipakai.',
  'ditolak': 'Browser menolak menyimpan (penyimpanan penuh atau diblokir). Unduh cadangan atau kosongkan ruang browser, lalu coba lagi.',
  'tidak-tersedia': 'Browser ini memblokir penyimpanan lokal, jadi soal tidak bisa disimpan. Coba jendela biasa (bukan mode privat).',
};
const PESAN_IMPOR = { 'bukan-json': 'Berkas bukan JSON yang valid.', 'bukan-berkas-soal-saya': 'Berkas ini bukan cadangan Soal Saya dari LABSOUMA.', ...PESAN_SIMPAN };

function AppUstadz({ user, profile }) {
  const db = firebase.firestore();
  const displayName = user.displayName || user.email;
  const drafUid = useRef(null); if (drafUid.current !== user.uid) { Draft.setUser(user.uid); drafUid.current = user.uid; }
  const ID_TAB = ['compose', 'saya', 'export', 'fokus', 'pegon'];
  const [tab, setTabRaw] = useState(() => { const h = (window.location.hash || '').slice(1); return ID_TAB.includes(h) ? h : 'compose'; });
  const setTab = (id) => { setTabRaw(id); try { window.history.replaceState(null, '', '#' + id); } catch (e) { /* URL tidak bisa diubah */ } };
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [saran, setSaran] = useState(null);
  const pendingBadge = 0;

  // ---- Soal Saya (perangkat ini) ----
  const store = useMemo(() => { const st = UT.createSoalSaya({ storage: lokalStorage(), normal: normalForm }); st.setUser(user.uid); return st; }, [user.uid]);
  const [items, setItems] = useState(() => store.list());
  const segarkan = () => setItems(store.list());

  // ---- Cadangan otomatis ke Google Drive pribadi ----
  // Token hanya di memori; jendela izin Google hanya muncul dari klik (Simpan, Hapus, Pulihkan, atau tombol cadangan), jadi tidak ada pencadangan di latar belakang.
  const prefDrive = useMemo(() => { const pf = CD.createPrefDrive({ storage: lokalStorage() }); pf.setUser(user.uid); return pf; }, [user.uid]);
  const [dm, setDm] = useState(() => prefDrive.baca());
  const [drvBusy, setDrvBusy] = useState('');
  const [drvErr, setDrvErr] = useState(null);
  const [drvSiap, setDrvSiap] = useState(false);
  const [drvDaftar, setDrvDaftar] = useState(null);
  const tokenDrv = useRef({ v: '', exp: 0 }); const idKlien = useRef('');
  const sedang = useRef(false); const ulang = useRef(false);
  useEffect(() => {
    if (tab !== 'saya' && !dm.aktif) return;
    muatGis().catch(() => {}); // dimuat lebih awal supaya jendela izin tidak terblokir saat tombol diklik
    if (idKlien.current) { setDrvSiap(true); return; }
    callApi('/api/drive-client', {}).then((r) => { idKlien.current = (r && r.driveClientId) || ''; setDrvSiap(true); }).catch((e) => setDrvErr(apiErr(e)));
  }, [tab, dm.aktif]);
  const ambilTokenDrv = () => {
    const t = tokenDrv.current;
    if (t.v && Date.now() < t.exp - 60000) return Promise.resolve(t.v);
    return new Promise((selesai, gagal) => {
      if (!idKlien.current) { gagal(new DR.DriveError('DRIVE_BELUM_DIATUR', 'Client ID Google Drive belum diisi di server (GOOGLE_DRIVE_CLIENT_ID). Minta admin mengisinya (lihat README, bagian Backup).')); return; }
      const mulai = () => {
        const klien = window.google.accounts.oauth2.initTokenClient({
          client_id: idKlien.current, scope: DR.SCOPE, login_hint: user.email || undefined,
          callback: (r) => {
            if (r && r.access_token) { tokenDrv.current = { v: r.access_token, exp: Date.now() + (Number(r.expires_in) || 3600) * 1000 }; selesai(r.access_token); }
            else gagal(new DR.DriveError('DRIVE_IZIN', 'Izin Google Drive tidak diberikan.'));
          },
          error_callback: (e) => gagal(new DR.DriveError('DRIVE_IZIN', e && e.type === 'popup_closed' ? 'Jendela izin ditutup sebelum selesai.' : e && e.type === 'popup_failed_to_open' ? 'Browser memblokir jendela izin. Izinkan pop-up untuk situs ini lalu ulangi.' : 'Izin Google Drive gagal diminta.')),
        });
        klien.requestAccessToken({ prompt: '' });
      };
      if (window.google && window.google.accounts && window.google.accounts.oauth2) mulai(); else muatGis().then(mulai, gagal);
    });
  };
  const galatDrv = (e) => { if (e && e.code === 'DRIVE_TOKEN') tokenDrv.current = { v: '', exp: 0 }; setDrvErr(apiErr(e)); };
  const cadangkan = async ({ aktifkan = false } = {}) => {
    if (!aktifkan && !store.list().length) return; // tidak ada yang dicadangkan: jangan memunculkan jendela izin
    if (sedang.current) { ulang.current = true; return; }
    sedang.current = true; setDrvBusy('cadang'); setDrvErr(null);
    try {
      await ambilTokenDrv(); // pertama: jendela izin harus muncul dari klik pengguna
      if (aktifkan) { prefDrive.aktifkan(); setDm(prefDrive.baca()); }
      do {
        ulang.current = false;
        const daftar = store.list();
        if (!daftar.length) break; // daftar kosong tidak diunggah: akan menimpa cadangan hari ini dengan berkas kosong
        const r = await CD.cadangkanSoalSaya({ drive: DR.buatDrive({ ambilToken: ambilTokenDrv }), isi: store.ekspor(), jumlah: daftar.length });
        prefDrive.catatBerhasil({ sidik: CD.sidikDaftar(daftar), jumlah: daftar.length, nama: r.nama, link: r.link });
        setDm(prefDrive.baca());
      } while (ulang.current);
    } catch (e) { galatDrv(e); } finally { sedang.current = false; setDrvBusy(''); }
  };
  const picuCadangan = () => { if (prefDrive.baca().aktif) cadangkan(); };
  const matikanCadangan = () => { prefDrive.matikan(); setDm(prefDrive.baca()); tokenDrv.current = { v: '', exp: 0 }; setDrvErr(null); setDrvDaftar(null); toast('Cadangan otomatis dimatikan. Berkas di Google Drive tidak dihapus.'); };
  const muatDaftarDrive = async () => {
    setDrvErr(null); setDrvBusy('daftar');
    try { await ambilTokenDrv(); setDrvDaftar(await CD.daftarSoalSaya(DR.buatDrive({ ambilToken: ambilTokenDrv }))); } catch (e) { galatDrv(e); } finally { setDrvBusy(''); }
  };
  const pulihDariDrive = async (f) => {
    setDrvErr(null); setDrvBusy('pulih');
    try {
      const r = store.impor(await DR.buatDrive({ ambilToken: ambilTokenDrv }).unduh(f.id));
      if (!r.ok) { toast(PESAN_IMPOR[r.reason] || 'Berkas tidak bisa dipakai.'); return; }
      segarkan(); setDrvDaftar(null);
      toast(`Dipulihkan dari Drive: ${r.tambah} soal baru, ${r.perbarui} diperbarui, ${r.lewati} dilewati.`);
    } catch (e) { galatDrv(e); } finally { setDrvBusy(''); }
    picuCadangan();
  };
  const semuaQ = useMemo(() => items.map((it) => ({ ...it.isi, id: it.id, status: 'approved', authorName: displayName, updatedAt: it.updatedAt })), [items]);

  // ---- Form soal (draf otomatis seperti di App) ----
  const awalForm = useRef(undefined); if (awalForm.current === undefined) awalForm.current = Draft.read('form') || null;
  const [form, setForm] = useState(() => (awalForm.current && awalForm.current.form ? normalForm(awalForm.current.form) : emptyForm()));
  const [editingId, setEditingId] = useState(() => (awalForm.current && typeof awalForm.current.editingId === 'string' && awalForm.current.editingId ? awalForm.current.editingId : null));
  const formDraf = useMemo(() => ({ form, editingId }), [form, editingId]);
  useDraftSync('form', formDraf, !editingId && !formBeda(form));
  const berisi = formBerisi(form);
  useEffect(() => {
    if (Draft.tersedia || !berisi) return undefined;
    const tanya = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', tanya); return () => window.removeEventListener('beforeunload', tanya);
  }, [berisi]);
  const [composeKey, setComposeKey] = useState(0);
  const [msg, setMsg] = useState('');
  const timer = useRef(null);
  const toast = (m) => { setMsg(m); clearTimeout(timer.current); timer.current = setTimeout(() => setMsg(''), 3500); };
  useEffect(() => {
    const a = awalForm.current; if (!a || !a.form) return;
    if (formBerisi(normalForm(a.form))) toast('Draf soal yang belum disimpan dipulihkan. Tekan Simpan ke Soal Saya agar masuk daftar.');
  }, []);

  // ---- Konfigurasi aplikasi (tingkat, mapel, kitab): hanya baca ----
  const [appCfg, setAppCfg] = useState(FALLBACK_CFG);
  useEffect(() => { callApi('/api/app-config', { aksi: 'baca' }).then((d) => setAppCfg(d.config)).catch(() => { /* tetap memakai cadangan bawaan */ }); }, []);

  // ---- Kamus Pegon bersama: baca saja (aturan Firestore mengizinkan ustadz membaca, bukan menulis) ----
  const [kamusDocs, setKamusDocs] = useState([]);
  const [kamusVer, setKamusVer] = useState(0);
  const [kamusErr, setKamusErr] = useState(null);
  useEffect(() => db.collection('kamusPegon').onSnapshot(
    (snap) => {
      const docs = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      kamusBersamaMasuk(docs);
      setKamusDocs(docs); setKamusErr(null); setKamusVer((n) => n + 1);
    },
    () => setKamusErr('Kamus bersama tidak dapat dimuat. Pegon memakai kamus bawaan dan kamus perangkat ini.'),
  ), []);
  const kamusCtx = useMemo(() => ({
    docs: kamusDocs, ver: kamusVer, err: kamusErr, canShare: false,
    simpan: async () => { throw new Error('Hanya editor atau admin yang dapat mengubah kamus bersama.'); },
    hapus: async () => { throw new Error('Hanya editor atau admin yang dapat mengubah kamus bersama.'); },
  }), [kamusDocs, kamusVer, kamusErr]);

  const kosongkanForm = () => { Draft.remove('form'); Draft.remove('composeEx'); setForm(emptyForm()); setEditingId(null); setComposeKey((n) => n + 1); };
  const simpanSoal = () => {
    // Soal kembar/mirip di Soal Saya (perangkat ini saja). Konfirmasi sinkron, jadi jendela izin Drive di bawah tetap muncul dari klik yang sama.
    const mirip = DUP.cari(Bt.selaraskan(form), semuaQ, { abaikanId: editingId || '' });
    if (mirip.length && !window.confirm(DUP.pesanKonfirmasi(mirip, { total: semuaQ.length, lokal: true }))) { toast('Penyimpanan dibatalkan. Ubah soalnya, atau simpan lagi dan pilih tetap simpan.'); return; }
    const r = store.simpan(form, editingId);
    if (!r.ok) { toast(PESAN_SIMPAN[r.reason] || 'Gagal menyimpan soal.'); return; } // gagal: isian dan drafnya tetap ada
    kosongkanForm(); segarkan(); setTab('saya');
    toast('Soal disimpan di perangkat ini (tab Soal Saya).');
    picuCadangan();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const edit = (id) => {
    const it = items.find((x) => x.id === id); if (!it) return;
    if (editingId !== id && formBerisi(form) && !window.confirm('Form Penyusunan Soal berisi isian yang belum disimpan. Mengedit soal ini akan menggantinya. Lanjutkan?')) return;
    Draft.remove('composeEx'); setComposeKey((n) => n + 1);
    setForm(normalForm(it.isi)); setEditingId(id); setTab('compose');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const hapusBanyak = (ids) => { const r = store.hapusBanyak(ids); segarkan(); toast(r.ok ? `${ids.length} soal dihapus dari perangkat ini.` : (PESAN_SIMPAN[r.reason] || 'Gagal menghapus.')); if (r.ok) picuCadangan(); };
  const hapus = (id) => { const r = store.hapus(id); segarkan(); toast(r.ok ? 'Soal dihapus dari perangkat ini.' : (PESAN_SIMPAN[r.reason] || 'Gagal menghapus.')); if (r.ok) picuCadangan(); };

  // Dari saran bab ke form soal (sama dengan App): form kosong diisi kitab, jenjang, bab; form berisi hanya kolom Bab.
  const pakaiBab = (o) => {
    const kosong = !formBerisi(form);
    setForm((f) => {
      if (!kosong) return { ...f, bab: o.bab };
      const l = mapelUntuk(appCfg, o.tingkat);
      return { ...f, bab: o.bab, nama: o.nama || f.nama, tingkat: o.tingkat || f.tingkat, kelas: o.kelas || '', periode: o.periode || '', mapel: l.includes(o.mapel) ? o.mapel : f.mapel };
    });
    toast(kosong ? `Form diisi untuk bab “${o.bab}”. Tempel teks kitab bab ini lalu susun soalnya.` : `Kolom Bab diisi “${o.bab}”. Kitab dan jenjang di form tidak diubah karena form sedang berisi.`);
    setTab('compose'); window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const saranCtx = { saran, setSaran, pakaiBab };

  const keluar = () => {
    if (formBerisi(form) && !window.confirm('Isian soal yang belum disimpan akan tetap tersimpan sebagai draf di perangkat ini dan muncul lagi saat Anda masuk. Soal Saya juga tetap ada di perangkat ini. Di komputer bersama, hapus keduanya dulu (tombol Kosongkan dan tab Soal Saya). Tetap keluar?')) return;
    Draft.flush();
    setMenuOpen(false);
    (async () => {
      try { await firebase.auth().signOut(); } catch (e) { /* tetap lanjut membersihkan */ }
      try { const d = firebase.firestore(); await d.terminate(); await d.clearPersistence(); } catch (e) { /* cache tidak aktif atau sudah bersih */ }
      window.location.reload();
    })();
  };
  const pilihTab = (id) => { setTab(id); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  useEffect(() => {
    if (!menuOpen) return undefined;
    const klikLuar = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    const tekanEsc = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', klikLuar); document.addEventListener('touchstart', klikLuar); document.addEventListener('keydown', tekanEsc);
    return () => { document.removeEventListener('mousedown', klikLuar); document.removeEventListener('touchstart', klikLuar); document.removeEventListener('keydown', tekanEsc); };
  }, [menuOpen]);
  const TABS = [
    { id: 'compose', label: 'Penyusunan Soal', icon: PenLine },
    { id: 'saya', label: 'Soal Saya', icon: Library, n: items.length },
    { id: 'export', label: 'Export/Download', icon: Download },
    { id: 'fokus', label: 'Fokus Ujian & Kisi-kisi', icon: ListChecks },
    { id: 'pegon', label: 'Pegonizer', icon: Languages },
  ];
  const aktif = TABS.find((t) => t.id === tab);

  return (
    <div className="font-sans">
      <AppHeader />

      {/* Bilah beku: tetap di atas saat halaman digulir */}
      <div className="sticky z-40 bg-head text-head-ink shadow-md sm:rounded-b-2xl" style={{ top: 'env(safe-area-inset-top, 0px)', marginLeft: 'calc(-1 * max(16px, env(safe-area-inset-left, 0px)))', marginRight: 'calc(-1 * max(16px, env(safe-area-inset-right, 0px)))', paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))', paddingRight: 'max(16px, env(safe-area-inset-right, 0px))' }}>
        <div className="mx-auto flex max-w-6xl items-center gap-2 py-2">
          <button type="button" aria-label="Ke atas" title="Ke atas" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hidden shrink-0 rounded-lg sm:block"><AppLogo size={36} /></button>
          <div ref={menuRef} className="relative min-w-0 flex-1">
            <button type="button" id="tombol-menu" aria-haspopup="true" aria-expanded={menuOpen} aria-controls="menu-tab" onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex max-w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-white/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="shrink-0">{menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
              <span className="sr-only">Menu navigasi</span>
              <span className="flex min-w-0 items-center gap-2 rounded-md bg-white/10 px-2.5 py-1">
                {aktif && <aktif.icon size={15} className="shrink-0" />}<span className="truncate">{aktif ? aktif.label : 'Menu'}</span>
                {pendingBadge > 0 && !menuOpen && <span aria-label={pendingBadge + ' soal menunggu review'} className="h-2 w-2 shrink-0 rounded-full bg-amber-300" />}
              </span>
            </button>
            {menuOpen && (
              <nav id="menu-tab" aria-label="Navigasi utama" className="fade-in absolute left-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-surface p-1.5 text-ink shadow-xl">
                {TABS.map((t) => (
                  <button key={t.id} type="button" onClick={() => pilihTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition ${tab === t.id ? 'bg-soft text-soft-ink' : 'hover:bg-soft'}`}>
                    <t.icon size={17} className="shrink-0" /><span className="flex-1">{t.label}</span>
                    {t.n > 0 && <span className="rounded-full bg-soft px-2 py-px text-xs text-soft-ink">{t.n}</span>}
                  </button>
                ))}
                <div className="mt-1.5 border-t border-line px-3.5 pb-1 pt-2.5">
                  <p className="truncate text-xs font-semibold">{displayName}</p>
                  <p className="text-xs text-mute">{ROLE_LABEL[profile.role]}</p>
                </div>
                <button type="button" onClick={keluar} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-bad transition hover:bg-bad-bg"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg><span>Keluar</span></button>
              </nav>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {user.photoURL && <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full" />}
            <div className="hidden text-right text-xs md:block"><p className="font-semibold">{displayName}</p><p className="opacity-75">{ROLE_LABEL[profile.role]}</p></div>
            <button type="button" id="tombol-keluar" aria-label="Keluar" title="Keluar" onClick={keluar} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold hover:bg-white/10"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg><span className="hidden sm:inline">Keluar</span></button>
          </div>
        </div>
      </div>

      <main id="konten" tabIndex={-1} className="mx-auto max-w-6xl py-6 outline-none sm:py-8">
        <AppCfgCtx.Provider value={appCfg}>
        <KamusCtx.Provider value={kamusCtx}>
        <SaranCtx.Provider value={saranCtx}>
        <CatatanCtx.Provider value={UT.CATATAN_USTADZ}>
        <p role="note" className="mb-4 rounded-xl bg-soft px-4 py-3 text-xs leading-relaxed text-soft-ink">
          <b>Akun Ustadz.</b> Alat bantu untuk soal latihan Anda sendiri. Soal tersimpan <b>hanya di perangkat ini</b> (bukan di server) dan tidak ditelaah editor, jadi periksa sendiri kunci, kutipan, dan haluan bahasanya. Setiap berkas ekspor otomatis diberi catatan “belum ditelaah tim editor”.
        </p>
        {tab === 'compose' && <Compose key={composeKey} ustadz form={form} setForm={setForm} editingId={editingId} onSave={() => {}} onSend={simpanSoal}
          onReset={() => { if (formBerisi(form) && !window.confirm('Kosongkan seluruh isian soal? Draf otomatis di perangkat ini ikut terhapus.')) return; kosongkanForm(); }} toast={toast} />}
        {tab === 'saya' && (
          <div className="space-y-4">
            <CadanganDriveUstadz dm={dm} busy={drvBusy} err={drvErr} siap={drvSiap} jumlah={items.length} sidik={CD.sidikDaftar(items)} daftar={drvDaftar}
              onAktifkan={() => cadangkan({ aktifkan: true })} onSekarang={() => cadangkan()} onMatikan={matikanCadangan} onDaftar={muatDaftarDrive} onPulih={pulihDariDrive} onTutupDaftar={() => setDrvDaftar(null)} />
            <SoalSaya store={store} semuaQ={semuaQ} onEdit={edit} onDelete={hapus} onDeleteMany={hapusBanyak} onChanged={() => { segarkan(); picuCadangan(); }} toast={toast} />
          </div>
        )}
        {tab === 'export' && <Export all={semuaQ} toast={toast} />}
        {tab === 'fokus' && <FokusUjian all={semuaQ} toast={toast} />}
        {tab === 'pegon' && <PegonTab toast={toast} />}
        </CatatanCtx.Provider>
        </SaranCtx.Provider>
        </KamusCtx.Provider>
        </AppCfgCtx.Provider>
      </main>
      <KreditKaki className="mx-auto max-w-6xl px-4 pt-2" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }} />
      <Toast t={msg} />
    </div>
  );
}

/* ---------- Soal Saya (peran Ustadz): daftar soal di perangkat ini + cadangan berkas ---------- */
function SoalSaya({ store, semuaQ, onEdit, onDelete, onDeleteMany, onChanged, toast }) {
  const [f, setF] = useState({ mapel: '', tingkat: '', kelas: '', periode: '', bentuk: '' });
  const [konfirm, setKonfirm] = useState(null); // id soal, atau '*' untuk semua
  const berkas = useRef(null);
  const list = applyFilter(semuaQ, f);
  const pl = usePilihan(list);
  const unduhCadangan = () => {
    if (!semuaQ.length) { toast('Belum ada soal untuk dicadangkan.'); return; }
    simpanBerkas(`soal-saya-${new Date().toISOString().slice(0, 10)}.json`, new Blob([store.ekspor()], { type: 'application/json' }));
    toast('Cadangan diunduh. Simpan berkasnya di tempat aman (mis. Google Drive pribadi).');
  };
  const pilihBerkas = async (e) => {
    const file = e.target.files && e.target.files[0]; e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('Berkas terlalu besar untuk cadangan Soal Saya (maks. 5 MB).'); return; }
    try {
      const r = store.impor(await file.text());
      if (!r.ok) { toast(PESAN_IMPOR[r.reason] || 'Berkas tidak bisa dipakai.'); return; }
      onChanged();
      toast(`Cadangan dipulihkan: ${r.tambah} soal baru, ${r.perbarui} diperbarui, ${r.lewati} dilewati.`);
    } catch (err) { toast('Berkas tidak bisa dibaca.'); }
  };
  return (
    <div className="fade-in space-y-4">
      {!store.tersedia && <p role="alert" className="rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn">Browser ini memblokir penyimpanan lokal, jadi Soal Saya tidak bisa dipakai. Buka di jendela biasa (bukan mode privat).</p>}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-4">
        <p className="mr-auto text-sm"><b>{semuaQ.length}</b> soal tersimpan di perangkat ini. Tidak ikut pindah ke perangkat lain: unduh cadangan sebelum mengganti HP atau membersihkan browser.</p>
        <Btn kind="ghost" onClick={unduhCadangan}><Download size={15} />Unduh cadangan</Btn>
        <Btn kind="ghost" onClick={() => berkas.current && berkas.current.click()}><Upload size={15} />Pulihkan dari cadangan</Btn>
        <input ref={berkas} type="file" accept="application/json,.json" className="hidden" aria-label="Berkas cadangan Soal Saya" onChange={pilihBerkas} />
        {konfirm === '*'
          ? <><Btn kind="danger" onClick={() => { store.kosongkan(); onChanged(); setKonfirm(null); toast('Semua soal dihapus dari perangkat ini.'); }}><Trash2 size={15} />Ya, hapus semua</Btn><Btn kind="ghost" onClick={() => setKonfirm(null)}>Batal</Btn></>
          : <Btn kind="ghost" onClick={() => setKonfirm('*')} disabled={!semuaQ.length}><Trash2 size={15} />Hapus semua</Btn>}
      </div>
      <Filters f={f} setF={setF} count={list.length} qs={semuaQ} />
      <BilahPilih pl={pl} total={list.length}>
        <Btn kind="ghost" disabled={pl.dipilih.length !== 1} onClick={() => { const q = pl.dipilih[0]; pl.tutup(); onEdit(q.id); }}><Pencil size={15} />Edit</Btn>
        {pl.konfirm
          ? <><Btn kind="danger" onClick={() => { onDeleteMany(pl.dipilih.map((q) => q.id)); pl.tutup(); }}><Trash2 size={15} />Ya, hapus {pl.dipilih.length} soal</Btn><Btn kind="ghost" onClick={() => pl.setKonfirm(false)}>Batal</Btn></>
          : <Btn kind="ghost" disabled={!pl.dipilih.length} onClick={() => pl.setKonfirm(true)}><Trash2 size={15} />Hapus ({pl.dipilih.length})</Btn>}
        {pl.konfirm && <p className="w-full text-xs text-mute">Soal hanya ada di perangkat ini. Unduh cadangan dulu bila ragu.</p>}
      </BilahPilih>
      {!list.length ? <Empty icon={Library} title={semuaQ.length ? 'Tidak ada soal yang cocok' : 'Belum ada soal'} text={semuaQ.length ? 'Ubah filter di atas.' : 'Susun soal di tab Penyusunan Soal, lalu tekan Simpan ke Soal Saya.'} /> :
        list.map((q) => (
          <article key={q.id} className={'rounded-2xl border bg-surface p-4 sm:p-5 ' + (pl.aktif && pl.dipilih.some((x) => x.id === q.id) ? 'border-brand ring-2 ring-brand/30' : 'border-line')}>
            <KotakPilih pl={pl} q={q} />
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2"><Meta q={q} /></div>
              <span className="text-xs text-mute">{refText(q)}<RefArab q={q} /></span>
            </div>
            <QuestionView q={q} />
            {q.teks && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-soft-ink">Lihat teks kitab</summary>
                <p dir="rtl" lang="ar" className="ar ar-sm mt-2 rounded-xl bg-soft px-4 py-2 text-soft-ink">{q.teks}</p>
              </details>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Btn kind="ghost" onClick={() => onEdit(q.id)}><Pencil size={15} />Edit</Btn>
              {konfirm === q.id ? (
                <>
                  <Btn kind="danger" onClick={() => { onDelete(q.id); setKonfirm(null); }}><Trash2 size={15} />Ya, hapus</Btn>
                  <Btn kind="ghost" onClick={() => setKonfirm(null)}>Batal</Btn>
                </>
              ) : <Btn kind="ghost" onClick={() => setKonfirm(q.id)}><Trash2 size={15} />Hapus</Btn>}
            </div>
          </article>
        ))}
    </div>
  );
}

/* ---------- Panel cadangan otomatis Soal Saya ke Google Drive (peran Ustadz) ---------- */
// Logika di web/lib/cadanganDrive.js (tes: test/cadanganDrive.test.js). Panel ini hanya tampilan.
function CadanganDriveUstadz({ dm, busy, err, siap, jumlah, sidik, daftar, onAktifkan, onSekarang, onMatikan, onDaftar, onPulih, onTutupDaftar }) {
  const belum = CD.perluCadangan({ aktif: dm.aktif, jumlah, sidik, ok: dm.ok });
  const sibuk = !!busy;
  return (
    <Section title="Cadangan otomatis ke Google Drive" icon={CloudUpload}>
      <p className="mb-3 text-sm leading-relaxed text-mute">
        Setiap kali Anda menyimpan, menghapus, atau memulihkan soal, salinan Soal Saya dikirim ke folder “LABSOUMA Backup” di <b className="text-ink">Google Drive akun Anda sendiri</b>:
        satu berkas per hari, 14 hari terakhir disimpan. Aplikasi hanya melihat berkas buatannya sendiri. Pencadangan tidak berjalan di latar belakang: hanya saat Anda membuka aplikasi dan menyimpan,
        dan kira-kira tiap satu jam Google meminta izin lagi lewat jendela singkat.
      </p>
      {err && <div className="mb-3"><ErrorBox e={err} /></div>}
      {!dm.aktif ? (
        <Btn kind="primary" onClick={onAktifkan} disabled={sibuk || !siap}>{busy === 'cadang' ? <Loader2 size={16} className="spin" /> : <CloudUpload size={16} />}Aktifkan cadangan otomatis</Btn>
      ) : (
        <div className="space-y-3">
          {dm.ok
            ? <p className="flex flex-wrap items-center gap-x-2 text-sm"><CheckCircle2 size={16} className="shrink-0 text-ok" />Cadangan terakhir: <b>{waktuLokal(new Date(dm.ok.waktu).toISOString())}</b> · {dm.ok.jumlah} soal{tautanDriveAman(dm.ok.link) && <> · <a href={tautanDriveAman(dm.ok.link)} target="_blank" rel="noopener noreferrer" className="underline">Buka di Drive</a></>}</p>
            : <p className="text-sm text-mute">Cadangan otomatis aktif, tetapi belum ada cadangan yang berhasil.</p>}
          {belum && !sibuk && <p role="status" className="rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn">Ada perubahan yang belum tercadangkan di Drive (izin ditolak, koneksi putus, atau halaman ditutup sebelum selesai).</p>}
          <div className="flex flex-wrap gap-2">
            <Btn kind={belum ? 'primary' : 'ghost'} onClick={onSekarang} disabled={sibuk || !jumlah}>{busy === 'cadang' ? <Loader2 size={15} className="spin" /> : <CloudUpload size={15} />}Cadangkan sekarang</Btn>
            <Btn kind="ghost" onClick={onDaftar} disabled={sibuk}>{busy === 'daftar' ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}Pulihkan dari Drive</Btn>
            <Btn kind="ghost" onClick={onMatikan} disabled={sibuk}>Matikan</Btn>
          </div>
        </div>
      )}
      {busy && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-mute"><Loader2 size={14} className="spin" />{busy === 'cadang' ? 'Mencadangkan ke Google Drive...' : busy === 'daftar' ? 'Membaca daftar cadangan...' : 'Memulihkan soal...'}</p>}
      {daftar && (
        <div className="mt-4 rounded-xl border border-line p-3">
          <div className="mb-2 flex items-center justify-between gap-2"><p className="text-sm font-semibold">Pilih cadangan</p><Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={onTutupDaftar}>Tutup</Btn></div>
          {!daftar.length ? <p className="text-sm text-mute">Belum ada cadangan Soal Saya di Drive akun ini.</p> : (
            <ul className="divide-y divide-line">
              {daftar.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0"><b>{f.name.replace(/^labsouma-soal-saya-|\.json$/g, '')}</b>{f.size ? <span className="text-xs text-mute"> · {ukuranBerkas(Number(f.size))}</span> : null}</span>
                  <Btn kind="soft" className="!px-3 !py-1.5 !text-xs" onClick={() => onPulih(f)} disabled={sibuk}>Pulihkan</Btn>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-mute">Pemulihan digabung dengan soal di perangkat ini: soal dengan ID sama diganti hanya bila isi cadangan lebih baru.</p>
        </div>
      )}
    </Section>
  );
}

/* ---------- Backup ke Google Drive (editor dan admin) ---------- */
// Soal dibaca dari Firestore di browser, diunggah ke Drive milik akun Google yang dipilih pengguna (izin drive.file), lalu diunduh kembali dan
// dibandingkan; cadangan baru dianggap berhasil bila isinya identik. Soal hanya boleh dihapus dari Firestore (arsip, khusus admin) setelah itu.
// Logika murninya ada di public/drive.js (tes: test/backup.test.js). Pemulihan lewat /api/backup (Admin SDK).
const GIS_SRC = 'https://accounts.google.com/gsi/client';
function muatGis() {
  if (window.google && window.google.accounts && window.google.accounts.oauth2) return Promise.resolve();
  if (window.__gisJanji) return window.__gisJanji;
  window.__gisJanji = new Promise((selesai, gagal) => {
    const s = document.createElement('script'); s.src = GIS_SRC; s.async = true;
    s.onload = () => selesai();
    s.onerror = () => { window.__gisJanji = null; gagal(new Error('Skrip Google tidak bisa dimuat. Periksa koneksi internet atau pemblokir iklan.')); };
    document.head.appendChild(s);
  });
  return window.__gisJanji;
}
const ukuranBerkas = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
const waktuLokal = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }); };
const tautanDriveAman = (u) => (/^https:\/\/(drive|docs)\.google\.com\//.test(String(u || '')) ? u : '');

function BackupTab({ user, isAdmin, toast, onCfg }) {
  const Drv = window.LabDrive;
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState('');
  const [status, setStatus] = useState('');
  const [hasil, setHasil] = useState(null);      // cadangan terakhir yang sudah terverifikasi di Drive (soalnya dipakai untuk arsip)
  const [hari, setHari] = useState('180');
  const [paksaPenuh, setPaksaPenuh] = useState(false); // true = baca semua soal dari Firestore (memakai jatah baca), bukan gabung cadangan terakhir
  const [arsipRes, setArsipRes] = useState(null);
  const [files, setFiles] = useState(null);
  const [pilih, setPilih] = useState(null);      // cadangan yang akan dipulihkan
  const [mode, setMode] = useState('lewati');
  const [pulihKitab, setPulihKitab] = useState(false);
  const [pulihRes, setPulihRes] = useState(null);
  const tokenRef = useRef({ v: '', exp: 0 });
  useEffect(() => {
    muatGis().catch(() => {}); // dimuat lebih awal supaya jendela izin tidak terblokir saat tombol diklik
    callApi('/api/backup', { aksi: 'info' }).then(setInfo).catch((e) => setErr(apiErr(e)));
  }, []);
  if (!Drv) return <ErrorBox e={{ code: 'DRIVE_ERROR', message: 'Modul Drive tidak termuat. Muat ulang halaman dengan Ctrl+Shift+R.' }} />;

  // Token hanya di memori (hilang saat halaman ditutup, kedaluwarsa sekitar satu jam), tidak pernah ke localStorage atau server.
  const ambilToken = async () => {
    const t = tokenRef.current;
    if (t.v && Date.now() < t.exp - 60000) return t.v;
    if (!info || !info.driveClientId) throw new Drv.DriveError('DRIVE_BELUM_DIATUR', 'Client ID Google Drive belum diisi di server (GOOGLE_DRIVE_CLIENT_ID). Lihat README, bagian Backup.');
    await muatGis();
    return new Promise((selesai, gagal) => {
      const klien = window.google.accounts.oauth2.initTokenClient({
        client_id: info.driveClientId, scope: Drv.SCOPE, login_hint: user.email || undefined,
        callback: (r) => {
          if (r && r.access_token) { tokenRef.current = { v: r.access_token, exp: Date.now() + (Number(r.expires_in) || 3600) * 1000 }; selesai(r.access_token); }
          else gagal(new Drv.DriveError('DRIVE_IZIN', 'Izin Google Drive tidak diberikan.'));
        },
        error_callback: (e) => gagal(new Drv.DriveError('DRIVE_IZIN', e && e.type === 'popup_closed' ? 'Jendela izin ditutup sebelum selesai.' : e && e.type === 'popup_failed_to_open' ? 'Browser memblokir jendela izin. Izinkan pop-up untuk situs ini lalu ulangi.' : 'Izin Google Drive gagal diminta.')),
      });
      klien.requestAccessToken({ prompt: '' });
    });
  };
  const jalan = async (nama, fn) => {
    setErr(null); setBusy(nama);
    try { await fn(); }
    catch (e) { if (e && e.code === 'DRIVE_TOKEN') tokenRef.current = { v: '', exp: 0 }; setErr(apiErr(e)); }
    finally { setBusy(''); setStatus(''); }
  };

  const bacaSemuaSoal = async () => {
    const db = firebase.firestore(); const out = []; let akhir = null;
    for (;;) {
      let q = db.collection('soal').orderBy(firebase.firestore.FieldPath.documentId()).limit(300);
      if (akhir) q = q.startAfter(akhir);
      const snap = await q.get({ source: 'server' }); // paksa server: salinan lokal yang usang tidak boleh masuk cadangan
      snap.docs.forEach((d) => out.push(Drv.serialisasiSoal(d.id, d.data())));
      setStatus(`Membaca soal dari Firestore: ${out.length}...`);
      if (snap.docs.length < 300) break;
      akhir = snap.docs[snap.docs.length - 1];
      if (out.length >= 50000) throw { code: 'BACKUP_INVALID', message: 'Jumlah soal melebihi 50.000; cadangan dihentikan.' };
    }
    return out;
  };

  // Hanya soal yang updatedAt-nya lebih baru dari `iso` (cadangan inkremental). Indeks updatedAt sudah ada (otomatis); paksa server agar salinan lokal usang tidak ikut.
  const bacaSoalSejak = async (iso) => {
    const db = firebase.firestore(); const out = []; let akhir = null;
    const batas = firebase.firestore.Timestamp.fromDate(new Date(iso));
    for (;;) {
      let q = db.collection('soal').where('updatedAt', '>', batas).orderBy('updatedAt').limit(300);
      if (akhir) q = q.startAfter(akhir);
      const snap = await q.get({ source: 'server' });
      snap.docs.forEach((d) => out.push(Drv.serialisasiSoal(d.id, d.data())));
      setStatus(`Membaca soal yang berubah: ${out.length}...`);
      if (snap.docs.length < 300) break;
      akhir = snap.docs[snap.docs.length - 1];
    }
    return out;
  };

  // Muat cadangan terakhir dari Drive (tidak memakai jatah baca Firestore). Dipakai cadangan inkremental DAN cadangan penuh: keduanya meneruskan daftar soal terarsip.
  const muatDasar = async (drive, folderId) => {
    try {
      setStatus('Mencari cadangan terakhir di Google Drive...');
      const f = Drv.cadanganTerbaru(await drive.daftar(folderId));
      if (!f) return { alasan: 'Belum ada cadangan sebelumnya.' };
      try { return { f, dasar: Drv.periksaBackup(JSON.parse(await drive.unduh(f.id))) }; }
      catch (e) { if (e && e.code === 'DRIVE_TOKEN') throw e; return { alasan: 'Cadangan terakhir tidak bisa dibaca.', takTerbaca: true }; }
    } catch (e) { if (e && e.code === 'DRIVE_TOKEN') throw e; return { alasan: 'Cadangan terakhir tidak bisa dicari.', takTerbaca: true }; }
  };

  // Coba cadangan inkremental dari dasar yang sudah dimuat. Mengembalikan { soal, diarsipkan, jenis, dasar, penuhSejak, ringkas } atau { alasan } bila harus penuh. Galat apa pun = penuh (tidak pernah menggagalkan cadangan).
  // Soal terarsip ada di berkas tetapi tidak di Firestore, jadi jumlah yang diharapkan di server = jumlah gabungan dikurangi yang terarsip.
  const cobaInkremental = async ({ f, dasar, alasan }) => {
    if (!dasar) return { alasan };
    try {
      const layak = Drv.layakInkremental(dasar); if (!layak.ok) return { alasan: layak.alasan };
      const ubah = await bacaSoalSejak(Drv.batasUbah(dasar));
      setStatus('Memeriksa jumlah soal di server...');
      const { jumlah } = await callApi('/api/backup', { aksi: 'hitung' });
      const g = Drv.gabungInkrementalArsip(dasar, ubah);
      if (!Number.isInteger(jumlah)) return { alasan: 'Jumlah soal di server tidak bisa dihitung.' };
      const diharapkan = g.soal.length - g.diarsipkan.length;
      if (diharapkan !== jumlah) return { alasan: `Ada soal yang dihapus sejak cadangan terakhir (cadangan ${diharapkan}, server ${jumlah}).` };
      return { soal: g.soal, diarsipkan: g.diarsipkan, jenis: 'inkremental', dasar: f.name, penuhSejak: dasar.penuhSejak || dasar.dibuat, ringkas: `${ubah.length} soal berubah digabung dengan ${f.name}` };
    } catch (e) { if (e && e.code === 'DRIVE_TOKEN') throw e; return { alasan: 'Cadangan inkremental gagal; dipakai cadangan penuh.' }; }
  };

  const cadangkan = () => jalan('backup', async () => {
    setHasil(null); setArsipRes(null);
    setStatus('Meminta izin Google Drive...');
    await ambilToken(); // pertama, supaya jendela izin muncul dari klik pengguna
    const drive = Drv.buatDrive({ ambilToken });
    const folderId = await drive.siapkanFolder();
    const dsr = await muatDasar(drive, folderId);
    const ink = paksaPenuh ? { alasan: 'Cadangan penuh dipilih.' } : await cobaInkremental(dsr);
    let soal = ink.soal; let diarsipkan = ink.diarsipkan || [];
    if (!soal) { // cadangan penuh: baca Firestore, lalu bawa soal terarsip dari cadangan terakhir supaya berkas terbaru tetap lengkap
      const b = Drv.bawaArsip(await bacaSemuaSoal(), dsr.dasar);
      soal = b.soal; diarsipkan = b.diarsipkan;
    }
    setStatus('Membaca katalog kitab...');
    const cfg = await callApi('/api/app-config', { aksi: 'baca' });
    const cad = Drv.buatBackup({ soal, config: cfg.config, kustom: cfg.kustom, oleh: user.email || user.uid, jenis: ink.soal ? 'inkremental' : 'penuh', dasar: ink.dasar || '', penuhSejak: ink.penuhSejak || '', diarsipkan });
    const isi = JSON.stringify(cad); const nama = Drv.namaBerkas();
    setStatus('Mengunggah ke Google Drive...');
    const f = await drive.unggah(folderId, nama, isi);
    setStatus('Memeriksa berkas di Google Drive...');
    if ((await drive.unduh(f.id)) !== isi) throw new Drv.DriveError('DRIVE_VERIFIKASI', 'Berkas di Google Drive tidak sama dengan data yang dikirim, jadi cadangan tidak dianggap berhasil dan tidak ada soal yang dihapus. Coba lagi.');
    setHasil({ id: f.id, nama, link: f.webViewLink || '', soal: cad.soal, diarsipkan: cad.diarsipkan || [], jumlah: cad.jumlah, ukuran: new Blob([isi]).size, waktu: cad.dibuat });
    setFiles(null);
    const catatArsip = diarsipkan.length ? ` ${diarsipkan.length} soal terarsip ikut tersimpan di berkas.` : '';
    // Cadangan terakhir tidak terbaca = daftar arsip sebelumnya tidak diketahui; beri tahu agar admin memeriksa cadangan yang lebih lama.
    const awasArsip = !ink.soal && dsr.takTerbaca ? ' PERHATIAN: cadangan sebelumnya tidak terbaca, jadi soal yang pernah diarsipkan tidak ikut dibawa. Simpan cadangan lama yang memuatnya.' : '';
    toast((ink.soal ? `Cadangan inkremental tersimpan dan terverifikasi (${ink.ringkas}).` : `Cadangan penuh tersimpan dan terverifikasi di Google Drive.${ink.alasan && !paksaPenuh ? ' ' + ink.alasan : ''}`) + catatArsip + awasArsip);
  });

  // ---- Arsip (admin): hapus dari Firestore soal Disetujui yang lama tidak berubah, hanya yang ada di cadangan terverifikasi ----
  const arsipSudah = (hasil && hasil.diarsipkan) || [];
  const kand = hasil && isAdmin ? Drv.kandidatArsip(hasil.soal, { hari: Number(hari), kecuali: arsipSudah }) : [];
  const arsipkan = () => jalan('arsip', async () => {
    if (!kand.length) return;
    if (!window.confirm(`Hapus ${kand.length} soal berstatus Disetujui (terakhir diubah lebih dari ${hari} hari lalu) dari Firestore?\n\nSalinannya ada di "${hasil.nama}" di Google Drive. Soal itu tidak akan tampil di Bank Soal dan Export sampai dipulihkan dari cadangan.`)) return;
    // 1) CATAT DULU daftar arsip di berkas cadangan (diverifikasi), BARU hapus dari Firestore. Bila pencatatan gagal, tidak ada yang dihapus.
    //    Tanpa catatan ini, cadangan penuh berikutnya (membaca Firestore) tidak lagi memuat soal terarsip.
    const drive = Drv.buatDrive({ ambilToken });
    const tulisArsip = async (ids) => {
      const obj = JSON.parse(await drive.unduh(hasil.id));
      const isi = JSON.stringify(Drv.denganArsip(obj, ids));
      await drive.perbarui(hasil.id, isi);
      if ((await drive.unduh(hasil.id)) !== isi) throw new Drv.DriveError('DRIVE_VERIFIKASI', 'Daftar arsip di berkas Google Drive tidak sama dengan yang dikirim, jadi tidak ada soal yang dihapus. Coba lagi.');
      return Drv.periksaBackup(JSON.parse(isi)).diarsipkan;
    };
    setStatus('Mencatat daftar arsip di berkas cadangan Google Drive...');
    const calon = [...arsipSudah, ...kand.map((q) => q.id)];
    const awal = await tulisArsip(calon);
    if (awal.length !== new Set(calon).size) throw new Drv.DriveError('DRIVE_VERIFIKASI', 'Daftar arsip tidak tercatat lengkap di berkas cadangan, jadi tidak ada soal yang dihapus.');
    const db = firebase.firestore(); let dihapus = 0; let berubah = 0; const idDihapus = [];
    for (const bagian of Drv.potong(kand, 100)) {
      setStatus(`Menghapus dari Firestore: ${dihapus + berubah} / ${kand.length}...`);
      // Transaksi: soal yang diubah sejak cadangan dibuat (updatedAt berbeda) tidak dihapus, supaya suntingan terbaru tidak hilang.
      const r = await db.runTransaction(async (tx) => {
        const snaps = await Promise.all(bagian.map((q) => tx.get(db.collection('soal').doc(q.id))));
        let d = 0; let b = 0; const ids = [];
        snaps.forEach((s, j) => {
          if (!s.exists) return;
          const t = s.data().updatedAt;
          const sama = s.data().status === 'approved' && t && typeof t.toMillis === 'function' && new Date(t.toMillis()).toISOString() === bagian[j].updatedAt;
          if (sama) { tx.delete(s.ref); d++; ids.push(s.id); } else b++;
        });
        return { d, b, ids };
      });
      dihapus += r.d; berubah += r.b; idDihapus.push(...r.ids);
    }
    // 2) Soal yang dilewati (berubah) masih di Firestore: keluarkan dari daftar arsip. Bila langkah ini gagal tidak apa-apa; cadangan berikutnya memperbaiki daftar sendiri.
    let tercatat = awal;
    if (berubah > 0) { try { tercatat = await tulisArsip([...arsipSudah, ...idDihapus]); } catch (e) { /* diperbaiki cadangan berikutnya */ } }
    setHasil((h) => (h ? { ...h, diarsipkan: tercatat } : h));
    setArsipRes({ dihapus, berubah });
    toast(`${dihapus} soal dihapus dari Firestore dan tetap tersimpan di berkas cadangan.`);
  });

  // ---- Daftar cadangan di Drive dan pemulihan ----
  const muatDaftar = () => jalan('daftar', async () => {
    setStatus('Meminta izin Google Drive...'); await ambilToken();
    const drive = Drv.buatDrive({ ambilToken });
    setStatus('Membaca daftar cadangan...');
    setFiles(await drive.daftar(await drive.siapkanFolder()));
  });
  const bacaCadangan = (teks, nama) => {
    let obj; try { obj = JSON.parse(teks); } catch (e) { throw { code: 'BACKUP_INVALID', message: 'Berkas bukan JSON yang valid.' }; }
    let r; try { r = Drv.periksaBackup(obj); } catch (e) { throw { code: 'BACKUP_INVALID', message: e.message }; }
    setPilih({ nama, ...r }); setPulihRes(null); setPulihKitab(false); setMode('lewati');
  };
  const pilihDariDrive = (f) => jalan('baca', async () => { setStatus('Mengunduh cadangan...'); bacaCadangan(await Drv.buatDrive({ ambilToken }).unduh(f.id), f.name); });
  const pilihLokal = (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    jalan('baca', async () => {
      if (f.size > 40 * 1048576) throw { code: 'BACKUP_INVALID', message: 'Berkas terlalu besar (maks. 40 MB).' };
      bacaCadangan(await f.text(), f.name);
    });
  };
  const pulihkan = () => jalan('pulih', async () => {
    if (!pilih) return;
    if (!window.confirm(`Pulihkan ${pilih.soal.length} soal${pulihKitab ? ' dan katalog kitab beserta kelas dan sistem ujian (menimpa pengaturan saat ini)' : ''} dari "${pilih.nama}"?\n\n` + (mode === 'timpa' ? 'Soal dengan ID yang sama akan DITIMPA isi cadangan.' : 'Soal yang sudah ada dibiarkan.'))) return;
    const tot = { ditulis: 0, dilewati: 0, ditolak: [] }; let n = 0;
    for (const b of Drv.potong(pilih.soal, 100)) {
      setStatus(`Memulihkan soal: ${n} / ${pilih.soal.length}...`);
      const r = await callApi('/api/backup', { aksi: 'pulihkan', mode, soal: b });
      tot.ditulis += r.ditulis; tot.dilewati += r.dilewati; tot.ditolak.push(...r.ditolak); n += b.length;
    }
    let kitabOk = false;
    if (pulihKitab && pilih.konfigurasi) { setStatus('Memulihkan katalog kitab...'); onCfg(await callApi('/api/app-config', { aksi: 'simpan', config: pilih.konfigurasi })); kitabOk = true; }
    setPulihRes({ ...tot, kitabOk });
    toast('Pemulihan selesai.');
  });

  const siap = !!(info && info.driveClientId);
  const sibuk = !!busy;
  return (
    <div className="fade-in space-y-4">
      <div className="rounded-2xl border border-line bg-surface p-4 text-sm leading-relaxed text-mute">
        Semua soal (termasuk draf) dan katalog kitab disimpan sebagai satu berkas JSON ke <b className="text-ink">Google Drive</b> akun yang Anda pilih di jendela izin, dalam folder “LABSOUMA Backup”.
        Aplikasi hanya melihat berkas yang dibuatnya sendiri. Gunakan akun Google madrasah, bukan akun pribadi, supaya cadangan tidak ikut hilang saat pengelola berganti.
        <p className="mt-2">Cadangan pertama (dan tiap 30 hari, atau bila ada soal yang dihapus) membaca seluruh soal dari Firestore: satu dokumen sama dengan satu bacaan dari jatah gratis harian. Cadangan berikutnya inkremental: hanya soal yang berubah dibaca dari Firestore dan digabung dengan cadangan terakhir di Drive, tetapi berkasnya tetap lengkap, termasuk soal yang sudah diarsipkan. Cadangan sendiri tidak mengosongkan Firestore; untuk itu pakai <b className="text-ink">Arsipkan</b> (khusus admin) setelah cadangan terverifikasi.</p>
      </div>
      {err && <ErrorBox e={err} />}
      {info && !siap && (
        <p role="alert" className="rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn">
          Backup ke Google Drive belum diatur: Client ID OAuth belum diisi di server. {isAdmin ? 'Isi' : 'Minta admin mengisi'} variabel <code>GOOGLE_DRIVE_CLIENT_ID</code> di Vercel lalu Redeploy (langkahnya ada di README, bagian Backup).
        </p>
      )}

      <Section title="Cadangkan sekarang" icon={CloudUpload}>
        <Btn kind="primary" onClick={cadangkan} disabled={sibuk || !siap}>{busy === 'backup' ? <Loader2 size={16} className="spin" /> : <CloudUpload size={16} />}Cadangkan ke Google Drive</Btn>
        <label className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-mute">
          <input type="checkbox" className="mt-0.5" checked={paksaPenuh} disabled={sibuk} onChange={(e) => setPaksaPenuh(e.target.checked)} />
          <span>Paksa cadangan penuh (baca semua soal dari Firestore; memakai jatah baca harian sebanyak jumlah soal)</span>
        </label>
        {busy && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-mute"><Loader2 size={14} className="spin" />{status || 'Memproses...'}</p>}
        {hasil && (
          <div className="mt-4 rounded-xl bg-ok-bg px-4 py-3 text-sm text-ok">
            <p className="flex items-center gap-2 font-bold"><CheckCircle2 size={16} className="shrink-0" />Tersimpan dan terverifikasi di Google Drive</p>
            <p className="mt-1 leading-relaxed">{hasil.nama} · {hasil.jumlah.soal} soal, {hasil.jumlah.kitab} kitab · {ukuranBerkas(hasil.ukuran)}
              {tautanDriveAman(hasil.link) && <> · <a href={tautanDriveAman(hasil.link)} target="_blank" rel="noopener noreferrer" className="underline">Buka di Drive</a></>}</p>
          </div>
        )}
      </Section>

      {hasil && isAdmin && (
        <Section title="Arsipkan dari Firestore (admin)" icon={Trash2} lipat>
          <p className="text-sm leading-relaxed text-mute">
            Hapus dari Firestore soal berstatus <b className="text-ink">Disetujui</b> yang terakhir diubah lebih dari
            {' '}<span className="inline-block w-28 align-middle"><Select id="arsip-hari" value={hari} onChange={setHari}><option value="90">90 hari</option><option value="180">180 hari</option><option value="365">365 hari</option></Select></span>{' '}lalu.
            Draf, soal menunggu review, dan soal perlu revisi tidak pernah dihapus. Soal yang diarsipkan hilang dari Bank Soal dan Export sampai dipulihkan dari cadangan. Daftarnya dicatat di berkas cadangan lebih dulu, lalu ikut terbawa di setiap cadangan berikutnya, jadi cadangan terbaru tetap memuat semua soal.
            Pemeriksaan ulang tiap soal sebelum dihapus memakai satu bacaan lagi per soal.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Btn kind="danger" onClick={arsipkan} disabled={sibuk || !kand.length}>{busy === 'arsip' ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}Hapus {kand.length} soal dari Firestore</Btn>
            {!kand.length && <span className="text-sm text-mute">Tidak ada soal yang memenuhi syarat.</span>}
          </div>
          {arsipRes && <p role="status" className="mt-3 text-sm text-ink">{arsipRes.dihapus} soal dihapus dari Firestore{arsipRes.berubah > 0 ? `; ${arsipRes.berubah} soal dilewati karena berubah sejak cadangan dibuat` : ''}.</p>}
        </Section>
      )}

      <Section title="Cadangan di Google Drive" icon={Library} action={<Btn kind="ghost" onClick={muatDaftar} disabled={sibuk || !siap}>{busy === 'daftar' ? <Loader2 size={16} className="spin" /> : <RotateCcw size={16} />}Muat daftar</Btn>}>
        {files === null && <p className="text-sm text-mute">Klik “Muat daftar” untuk melihat cadangan yang tersimpan di Drive.</p>}
        {files && !files.length && <p className="text-sm text-mute">Belum ada cadangan di folder “LABSOUMA Backup”.</p>}
        {files && files.length > 0 && (
          <ul className="divide-y divide-line text-sm">
            {files.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0"><p className="truncate font-semibold">{f.name}</p><p className="text-xs text-mute">{waktuLokal(f.modifiedTime)} · {ukuranBerkas(Number(f.size) || 0)}</p></div>
                {isAdmin && <Btn kind="soft" onClick={() => pilihDariDrive(f)} disabled={sibuk}>Pulihkan…</Btn>}
              </li>
            ))}
          </ul>
        )}
        {!isAdmin && <p className="mt-3 text-xs text-mute">Pemulihan hanya dapat dilakukan admin.</p>}
        {isAdmin && (
          <div className="mt-4 border-t border-line pt-4">
            <Label htmlFor="cad-lokal" hint="(alternatif: berkas .json yang sudah diunduh dari Drive)">Pulihkan dari berkas di komputer</Label>
            <input id="cad-lokal" type="file" accept=".json,application/json" onChange={pilihLokal} disabled={sibuk} className="block w-full text-sm" />
          </div>
        )}
        {busy === 'baca' && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-mute"><Loader2 size={14} className="spin" />{status || 'Membaca...'}</p>}
      </Section>

      {isAdmin && pilih && (
        <Section title="Pulihkan dari cadangan" icon={RotateCcw} lipat>
          <p className="text-sm leading-relaxed">
            <b>{pilih.nama}</b><br />
            <span className="text-mute">Dibuat {pilih.dibuat ? waktuLokal(pilih.dibuat) : '-'}{pilih.oleh ? ' oleh ' + pilih.oleh : ''} · {pilih.soal.length} soal · {pilih.jumlahKitab} kitab</span>
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="pulih-mode">Bila soal dengan ID yang sama sudah ada</Label>
              <Select id="pulih-mode" value={mode} onChange={setMode}><option value="lewati">Lewati (aman, bisa diulang)</option><option value="timpa">Timpa dengan isi cadangan</option></Select>
            </div>
            <label className="flex items-start gap-2 self-end text-sm">
              <input type="checkbox" checked={pulihKitab} disabled={!pilih.konfigurasi} onChange={(e) => setPulihKitab(e.target.checked)} className="mt-1" />
              <span>Pulihkan juga katalog kitab, mapel, tingkat, kelas, dan sistem ujian <span className="text-mute">(menimpa pengaturan saat ini{pilih.konfigurasi ? '' : '; cadangan ini tidak memuatnya'})</span></span>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn kind="primary" onClick={pulihkan} disabled={sibuk}>{busy === 'pulih' ? <Loader2 size={16} className="spin" /> : <RotateCcw size={16} />}Pulihkan</Btn>
            <Btn kind="ghost" onClick={() => { setPilih(null); setPulihRes(null); }} disabled={sibuk}>Batal</Btn>
          </div>
          {busy === 'pulih' && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-mute"><Loader2 size={14} className="spin" />{status || 'Memproses...'}</p>}
          {pulihRes && (
            <div role="status" className="mt-4 rounded-xl bg-soft px-4 py-3 text-sm">
              <p className="font-bold">{pulihRes.ditulis} soal ditulis, {pulihRes.dilewati} dilewati (sudah ada), {pulihRes.ditolak.length} ditolak{pulihRes.kitabOk ? ', katalog kitab dipulihkan' : ''}.</p>
              {pulihRes.ditolak.slice(0, 10).map((x, i) => <p key={i} className="mt-1 text-xs text-bad">{x.id}: {x.alasan}</p>)}
              {pulihRes.ditolak.length > 10 && <p className="mt-1 text-xs text-mute">...dan {pulihRes.ditolak.length - 10} lainnya.</p>}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

/* ---------- Login & penjaga akses ---------- */
const Centered = ({ children }) => (
  <div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center gap-4 py-10 text-center">{children}</div>
);
const AppLogo = ({ size = 48, className = '' }) => (
  <img src={MEREK.logo} width={size} height={size} alt={`Logo ${MEREK.nama}`} decoding="async" className={className} style={{ width: size, height: size }} />
);
const Logo = () => <AppLogo size={64} />;

function Login() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const signIn = async () => {
    setError(''); setBusy(true);
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try { await firebase.auth().signInWithPopup(provider); }
    catch (e) {
      if (e.code === 'auth/popup-blocked') { try { await firebase.auth().signInWithRedirect(provider); return; } catch (e2) {} }
      if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
        setError(e.code === 'auth/unauthorized-domain' ? 'Domain ini belum diizinkan di Firebase Authentication (Settings > Authorized domains).' : 'Gagal masuk. Coba lagi.');
      }
    } finally { setBusy(false); }
  };
  return (
    <div className="login-wrap -mx-4 px-4">
      <Centered>
        <div className="login-card flex flex-col items-center gap-3">
          <Logo />
          <h1 className="text-2xl font-extrabold tracking-[.08em]" style={{ textWrap: 'balance' }}>{MEREK.nama}</h1>
          <p className="text-sm font-medium text-mute">Laboratorium Soal Ujian Madrasah Terintegrasi</p>
          <p dir="rtl" lang="ar" className="ar" style={{ fontSize: '1.4rem', lineHeight: 2 }}>مختبر أسئلة امتحان المدرسة المتكامل</p>
          <hr className="my-1 w-16 border-0 border-t-2" style={{ borderColor: 'var(--accent)' }} />
          <p className="text-sm text-mute">Masuk dengan akun Google untuk menyusun, meninjau, dan mengekspor soal.</p>
          <Btn kind="primary" className="mt-1 w-full" onClick={signIn} disabled={busy}>
            {busy ? <Loader2 size={16} className="spin" /> : <LogIn size={16} />}Masuk dengan Google
          </Btn>
          {error && <p role="alert" className="w-full rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">{error}</p>}
        </div>
        <p className="text-xs text-mute">Akses terbatas untuk staf madrasah yang telah disetujui admin.</p>
      </Centered>
    </div>
  );
}

function Blocked({ title, text, user }) {
  return (
    <Centered>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-warn-bg text-warn shadow-sm"><ShieldCheck size={28} /></div>
      <h1 className="text-xl font-extrabold">{title}</h1>
      <p className="text-sm leading-relaxed text-mute">{text}</p>
      {user && <p className="text-xs text-mute">Masuk sebagai {user.email}</p>}
      <Btn kind="ghost" onClick={() => firebase.auth().signOut()}><LogOut size={16} />Keluar</Btn>
    </Centered>
  );
}

function Root() {
  const [user, setUser] = useState(undefined); // undefined = memuat, null = belum masuk
  const [profile, setProfile] = useState(undefined);
  const [sessErr, setSessErr] = useState(null);

  useEffect(() => firebase.auth().onAuthStateChanged((u) => { setUser(u); setProfile(undefined); setSessErr(null); }), []);
  useEffect(() => {
    if (!user) return undefined;
    let dead = false;
    let unsub = () => {};
    (async () => {
      try {
        const token = await user.getIdToken();
        const r = await fetch('/api/session', { method: 'POST', headers: { Authorization: 'Bearer ' + token } });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw (d.error || { message: 'Server mengembalikan error ' + r.status + '.' });
        if (dead) return;
        unsub = firebase.firestore().doc('users/' + user.uid).onSnapshot((snap) => setProfile(snap.exists ? snap.data() : null), () => setProfile(null));
      } catch (e) { if (!dead) setSessErr(e); }
    })();
    return () => { dead = true; unsub(); };
  }, [user && user.uid]);

  const Spinner = <LayarMuat />;
  if (user === undefined) return Spinner;
  if (user === null) return <Login />;
  if (sessErr) return <Blocked user={user} title="Tidak bisa masuk" text={sessErr.message || 'Terjadi kesalahan saat memuat profil Anda.'} />;
  if (profile === undefined) return Spinner;
  if (!profile || profile.role === 'pending') return <Blocked user={user} title="Menunggu persetujuan admin" text="Akun Anda sudah terdaftar. Admin perlu memberi peran (penyusun, editor, admin, atau ustadz) sebelum Anda bisa memakai aplikasi. Muat ulang halaman ini setelah disetujui." />;
  if (profile.role === 'nonaktif') return <Blocked user={user} title="Akun dinonaktifkan" text="Akses akun ini telah dinonaktifkan oleh admin." />;
  if (profile.role === 'ustadz') return <AppUstadz user={user} profile={profile} />;
  return <App user={user} profile={profile} />;
}

function SetupError() {
  return (
    <Centered>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bad-bg text-bad"><AlertTriangle size={28} /></div>
      <h1 className="text-xl font-extrabold">Konfigurasi Firebase tidak ditemukan</h1>
      <p className="text-sm leading-relaxed text-mute">Konfigurasi belum lengkap. Administrator perlu mengisi variabel <code>FIREBASE_WEB_CONFIG</code> di Vercel, lalu deploy ulang.</p>
    </Centered>
  );
}

/* ---------- Penangkap galat tampilan ---------- */
// Tanpa ini, satu galat saat render membuat seluruh halaman blank tanpa pesan. Draf di localStorage tidak ikut hilang.
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { try { Draft.flush(); } catch (e) { /* abaikan */ } try { console.error(err); } catch (e) { /* abaikan */ } }
  buangDraf = () => {
    // Jalan keluar bila draf yang rusak membuat halaman gagal tampil berulang kali.
    if (!window.confirm('Semua draf isian di perangkat ini akan dihapus. Lanjutkan?')) return;
    try {
      const hapus = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('labsouma:v1:')) hapus.push(k); }
      hapus.forEach((k) => localStorage.removeItem(k));
    } catch (e) { /* abaikan */ }
    window.location.reload();
  };
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <Centered>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bad-bg text-bad"><AlertTriangle size={28} /></div>
        <h1 className="text-xl font-extrabold">Halaman gagal ditampilkan</h1>
        <p className="text-sm leading-relaxed text-mute">Terjadi galat tak terduga. Isian yang belum disimpan tetap aman sebagai draf di perangkat ini. Muat ulang halaman untuk memulihkannya.</p>
        <p className="break-words text-xs text-mute" dir="ltr">{String((this.state.err && this.state.err.message) || this.state.err)}</p>
        <Btn kind="primary" onClick={() => window.location.reload()}><RotateCcw size={16} />Muat ulang</Btn>
        <button type="button" className="text-xs text-mute underline" onClick={this.buangDraf}>Masih gagal? Hapus draf di perangkat ini</button>
      </Centered>
    );
  }
}

export { Root, ErrorBoundary, SetupError };
// Hanya untuk tes render (test/dasborUi.test.js): tampilan murni tanpa pengambilan data.
export { DasborView, CadanganDriveUstadz, Compose, PaketDauri, emptyForm };
