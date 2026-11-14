import { AutoArea, Btn, Draft, ErrorBox, Label, Section, Select, Uj, apiErr, callApi, denganPegon, useCfg, useDraftSync } from './ui.jsx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bt, KEYS, LEVEL, bacaPref, cariKitab, mapelUntuk } from './lib/dasar.js';
import SaranTulisan from './SaranTulisan.jsx';
import { AlertTriangle, BookOpen, Camera, Check, Copy, Download, FileText, Info, Languages, Layers, Loader2, PenLine, RotateCcw, Save, Send, ShieldCheck, Sparkles, Upload, X } from 'lucide-react';
import * as NK from './lib/naskah.js';
import { bahasaOtomatis, tampilanDariIsi } from './lib/bahasa.js';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { faktaBasi, faktaTerikatDari, pilihFaktaBerikut, susunDasar } from './lib/fakta.js';
import { gabungRujukan, hashBaca, rentangRujukan, rujukanDariHalaman, rujukanSah } from './lib/rujukan.js';
import * as RW from './lib/riwayat.js';
import { ArNama, DraftNote, EjaanPilih, FIELDS, KITAB_LAIN, KutipanBadge, SaranCtx, SourceLink, cariGoogle, cleanArabic, kitabUntuk, labelArabTingkat, labelTingkat, pageNav, tingkatAktif, urlHalaman, useEjaan, useKamus } from './bersama.jsx';
import { siapkanFoto } from './bacaBerkas.js';
import { FaktaTeks, PemilihKitab, PeriksaRujukan } from './panelMalas.jsx';
import { AssistView, ButaView, TelaahView } from './TinjauanView.jsx';

const PegonSoal = denganPegon(PegonSoalInti);

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

export function Compose({ form, setForm, editingId, onSave, onSend, onReset, toast, ustadz = false }) {
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
        dasar: s.fakta_dasar ? susunDasar({ fakta: s.fakta_dasar, alasan: s.alasan_pengecoh }) : '',
        stimulus: s.stimulus || '', pertanyaan: s.pertanyaan || '',
        opsi: { A: s.pilihan_a || '', B: s.pilihan_b || '', C: s.pilihan_c || '', D: s.pilihan_d || '', E: s.pilihan_e || '' },
        kunci: s.kunci_jawaban || '', pembahasan: s.pembahasan || '', indikator: s.indikator_kisi_kisi || '',
        ai: { dibuat: true, model: String(data.model || '').slice(0, 60), verifikasi: (data.verifikasi && data.verifikasi.status) || '', buta: '' },
      }));
      setGenerated(true);
      if (fakta) setTerpakai((t) => (t.includes(fakta.id) ? t : [...t, fakta.id]));
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
          action={<button type="button" onClick={() => { onReset(); setGenerated(false); setErrors([]); }} className="inline-flex items-center gap-1 text-xs font-semibold text-mute hover:text-ink"><RotateCcw size={13} />Kosongkan</button>}>
          {generated && (
            <div className="mb-4 flex gap-2 rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>Draft disusun AI dari teks kitab Anda. Cek kebenaran kunci, pengecoh, dan kutipan Arab sebelum {ustadz ? 'dipakai untuk murid' : 'dikirim ke editor'}.</span>
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
            {form.dasar && (
              <div><Label htmlFor="dasar" hint="(untuk editor; tidak ikut ke naskah ujian)">Dasar soal: fakta dan alasan pengecoh</Label>
                <AutoArea id="dasar" maxLength={2000} rows={3} className="field" value={form.dasar} onChange={(e) => set('dasar', e.target.value)} /></div>
            )}
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
