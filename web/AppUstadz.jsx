import * as UT from './lib/ustadz.js';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppCfgCtx, Btn, CatatanCtx, Draft, ErrorBox, Filters, Section, apiErr, applyFilter, callApi, simpanBerkas, useDraftSync } from './ui.jsx';
import * as CD from './lib/cadanganDrive.js';
import * as DR from './lib/drive.js';
import { Bt, FALLBACK_CFG, mapelUntuk } from './lib/dasar.js';
import { kamusBersamaMasuk } from './lib/muatPegon.js';
import * as DUP from './lib/duplikat.js';
import { CheckCircle2, CloudUpload, Download, Languages, Library, ListChecks, Loader2, PenLine, Pencil, Trash2, Upload } from 'lucide-react';
import { KreditKaki } from './Merek.jsx';
import { Empty, KamusCtx, Meta, QuestionView, ROLE_LABEL, RefArab, SaranCtx, Toast, emptyForm, formBeda, formBerisi, normalForm, refText } from './bersama.jsx';
import { muatGis, tautanDriveAman, ukuranBerkas, waktuLokal } from './driveUi.js';
import { AppHeader, AppLogo } from './Kepala.jsx';
import { Compose } from './Compose.jsx';
import { Export } from './panelMalas.jsx';
import { FokusUjian } from './FokusUjian.jsx';
import { PegonTab } from './PegonTab.jsx';
import { BilahPilih, KotakPilih, usePilihan } from './BankTab.jsx';

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

export function AppUstadz({ user, profile }) {
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
export function CadanganDriveUstadz({ dm, busy, err, siap, jumlah, sidik, daftar, onAktifkan, onSekarang, onMatikan, onDaftar, onPulih, onTutupDaftar }) {
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
