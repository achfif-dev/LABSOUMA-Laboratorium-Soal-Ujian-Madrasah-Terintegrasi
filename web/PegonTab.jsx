import { Btn, Draft, ErrorBox, Label, Section, Select, Spin, apiErr, callApi, denganPegon, simpanBerkas, useDraftSync } from './ui.jsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { bacaPref } from './lib/dasar.js';
import { Camera, Copy, Download, FileText, Languages, Mic, Sparkles, Upload, X } from 'lucide-react';
import SaranTulisan from './SaranTulisan.jsx';
import { saranSorotan } from './lib/periksaTulisan.js';
import { EjaanPilih, Empty, useEjaan, useKamus } from './bersama.jsx';
import { bacaFile, pegonDocx, siapkanFoto } from './bacaBerkas.js';

export const PegonTab = denganPegon(PegonTabInti);

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
