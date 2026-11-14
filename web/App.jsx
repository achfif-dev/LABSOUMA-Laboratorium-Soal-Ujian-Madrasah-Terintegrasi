import { AlertTriangle, BarChart3, BookOpen, ClipboardCheck, CloudUpload, Download, Languages, Layers, LayoutDashboard, Library, LibraryBig, ListChecks, Loader2, LogIn, LogOut, Menu, PenLine, RotateCcw, Settings, ShieldCheck, Sparkles, Users } from 'lucide-react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlurCtx, AppCfgCtx, Btn, Draft, ErrorBox, apiErr, callApi, simpanBerkas, useDraftSync } from './ui.jsx';
import { bacaHash } from './lib/rujukan.js';
import * as NV from './lib/navigasi.js';
import { Bt, FALLBACK_CFG, mapelUntuk } from './lib/dasar.js';
import * as AL from './lib/alurSoal.js';
import { kamusBersamaMasuk } from './lib/muatPegon.js';
import * as DUP from './lib/duplikat.js';
import * as RW from './lib/riwayat.js';
import { susunDasar } from './lib/fakta.js';
import * as PK from './lib/paket.js';
import * as SH from './lib/serahTerima.js';
import { KreditKaki, LayarMuat } from './Merek.jsx';
import { MEREK } from './lib/merek.js';
import { Export, lazyPanel } from './panelMalas.jsx';
import { FIELDS, KamusCtx, ROLE_LABEL, SaranCtx, Toast, emptyForm, formBeda, formBerisi, normalForm } from './bersama.jsx';
import { AppHeader, AppLogo, Centered } from './Kepala.jsx';
import { Compose } from './Compose.jsx';
import { PaketDauri } from './PaketDauri.jsx';
import { Review } from './ReviewTab.jsx';
import { Bank } from './BankTab.jsx';
import { FokusUjian } from './FokusUjian.jsx';
import { PegonTab } from './PegonTab.jsx';
import { BackupTab } from './BackupTab.jsx';
import { Dasbor } from './Dasbor.jsx';
import { UserAdmin } from './AdminPengguna.jsx';
import { AppUstadz } from './AppUstadz.jsx';

const AnalisisButir = lazyPanel(() => import('./AnalisisButir.jsx'));

const KitabImpor = lazyPanel(() => import('./KitabImpor.jsx'));

const PembacaKitab = lazyPanel(() => import('./PembacaKitab.jsx'));

// Tab admin Konfigurasi dan Pengaturan AI: satu berkas, tiap komponen dibuka lewat pembungkus malas yang sama.
const AiConfig = lazyPanel(() => import('./AdminKonfigurasi.jsx').then((m) => ({ default: m.AiConfig })));

const AppCfgAdmin = lazyPanel(() => import('./AdminKonfigurasi.jsx').then((m) => ({ default: m.AppCfgAdmin })));

const AlurEditorAdmin = lazyPanel(() => import('./AdminKonfigurasi.jsx').then((m) => ({ default: m.AlurEditorAdmin })));

const PemeliharaanAdmin = lazyPanel(() => import('./AdminKonfigurasi.jsx').then((m) => ({ default: m.PemeliharaanAdmin })));

const TanyaKitab = lazyPanel(() => import('./TanyaKitab.jsx'));

// Ikon grup navigasi (grup dengan satu tab memakai ikon tab itu sendiri).
const IKON_GRUP = { susun: PenLine, bank: Library, ujian: ListChecks, kelola: Settings, lainnya: Menu };

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
    for (const k of ['kelas', 'periode', 'bab', 'jawaban', 'rubrik', 'kitabId', 'halId', 'halIdAkhir', 'dasar']) if (!c[k] && !(k in lama)) delete c[k]; // kosong dan belum pernah ada: jangan kirim (aturan Firestore lama menolak kunci baru)
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
      const ds = x.faktaDasar ? susunDasar({ fakta: x.faktaDasar, alasan: x.alasanPengecoh }) : ''; if (ds) c.dasar = ds; // hanya butir mode fakta
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
      const KELOMPOK = [['paket', 'dawr', 'cakupan', 'urut'], ['kelas', 'periode'], ['bab'], ['kitabId', 'halId', 'halIdAkhir'], ['bentuk', 'jawaban'], ['dasar']];
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

export { DasborView } from './Dasbor.jsx';
export { CadanganDriveUstadz } from './AppUstadz.jsx';
export { Compose } from './Compose.jsx';
export { PaketDauri } from './PaketDauri.jsx';
export { emptyForm } from './bersama.jsx';
