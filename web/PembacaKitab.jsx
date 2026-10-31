import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Copy, List, Loader2, Maximize2, Minimize2, Minus, Plus, Search, X } from 'lucide-react';
import { buatPemuat, bagianTeks, labelEntri, rentangBab } from './lib/perpus.js';
import { UKURAN_HURUF, LEBAR_BACA, pengaturanBaca, simpanPengaturanBaca, entriAktif, saringEntri, kursorSah, teksSalinan, labelSumberJenis } from './lib/pembaca.js';
import { SIMPANAN } from './PemilihKitab.jsx';

// Pembaca kitab penuh: dipakai untuk MEMBACA saja, tanpa membuat soal. Layar lebar (menutupi seluruh jendela), huruf Arab besar yang bisa diatur,
// daftar isi yang bisa dicari, lompat ke nomor cetak, dan penyorotan rentang halaman yang dirujuk soal (tautan balik dari Bank Soal/Review).
// Membaca lewat server (aksi perpus-*), jadi semua peran pemakai alat, termasuk ustadz, bisa membuka; hanya kitab berstatus siap dan aktif yang terbaca.
// `Btn`, `ErrorBox`, `callApi`, `apiErr` dioper dari App.jsx (menghindari impor melingkar). `awal` = { kitabId, dari, sampai } dari tautan soal atau #baca/...
// `onPosisi({ kitabId, seq })` dipanggil saat halaman berganti, agar alamat (#baca/kitab/40) selalu bisa dibagikan atau dimuat ulang.
export default function PembacaKitab({ Btn, ErrorBox, callApi, apiErr, awal = null, onPosisi = () => {} }) {
  const pem = useMemo(() => buatPemuat((b) => callApi('/api/kitab', b), SIMPANAN), []);
  const [pref, setPref] = useState(pengaturanBaca);
  const [daftar, setDaftar] = useState(SIMPANAN.daftar);
  const [kitabId, setKitabId] = useState(awal ? awal.kitabId : '');
  const [isi, setIsi] = useState(null);
  const [kursor, setKursor] = useState(awal ? awal.dari : 1);
  const [sorot, setSorot] = useState(awal ? { dari: awal.dari, sampai: awal.sampai } : null); // rentang rujukan soal
  const [halaman, setHalaman] = useState([]);
  const [halInput, setHalInput] = useState('');
  const [kembar, setKembar] = useState([]);
  const [info, setInfo] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lebarLayar, setLebarLayar] = useState(false);   // true = menutupi seluruh jendela
  const [panelIsi, setPanelIsi] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [saring, setSaring] = useState('');
  const urut = useRef(0);
  const areaRef = useRef(null);
  const gagal = (e) => { const x = apiErr(e); if (x) setErr(x); };
  const ubahPref = (p) => setPref((s) => { const n = { ...s, ...p }; simpanPengaturanBaca(n); return n; });

  // Tautan baru dari luar (mis. tombol "Buka di kitab" pada kartu soal) mengganti kitab dan halaman yang dibuka.
  useEffect(() => {
    if (!awal) return;
    setKitabId(awal.kitabId); setKursor(awal.dari); setSorot({ dari: awal.dari, sampai: awal.sampai }); setInfo(''); setKembar([]);
  }, [awal && awal.kitabId, awal && awal.dari, awal && awal.sampai]);

  useEffect(() => { if (!SIMPANAN.daftar) pem.daftar().then(setDaftar).catch(gagal); }, []);
  useEffect(() => {
    setIsi(null); setHalaman([]); setKembar([]); setSaring('');
    if (!kitabId) return;
    setErr(null);
    pem.isi(kitabId).then(setIsi).catch(gagal);
  }, [kitabId]);

  const total = isi ? isi.kitab.jumlahHalaman : 0;
  const jumlah = pref.lembar === 2 ? 2 : 1;
  useEffect(() => {
    if (!isi) return;
    const n = ++urut.current; setBusy(true);
    pem.halaman(kitabId, kursor, kursor + jumlah - 1, total).then((h) => {
      if (n !== urut.current) return;
      setHalaman(h); setErr(null);
      onPosisi({ kitabId, seq: kursor });
      setPref((s) => { const n = { ...s, terakhir: { ...s.terakhir, [kitabId]: kursor } }; simpanPengaturanBaca(n); return n; });
      if (areaRef.current) areaRef.current.scrollTo({ top: 0 });
      pem.halaman(kitabId, kursor + jumlah, kursor + jumlah + 4, total).catch(() => { /* muat awal halaman berikutnya: gagal tidak mengganggu */ });
    }).catch(gagal).finally(() => { if (n === urut.current) setBusy(false); });
  }, [isi, kursor, jumlah]);

  const kitab = isi && isi.kitab;
  const geser = useCallback((d) => { setInfo(''); setSorot((s) => s); setKursor((k) => kursorSah(k + d * jumlah, total, jumlah)); }, [total, jumlah]);
  const bisaPisah = kitab && kitab.bentukMatn === 'pemisah-tatwil' && halaman.some((p) => p.batasMatn !== null);
  const bagian = bisaPisah ? pref.bagian : 'semua';

  // Pintasan papan ketik. Arah baca Arab: halaman berikutnya ada di KIRI. Tidak aktif saat mengetik di kolom isian.
  useEffect(() => {
    const tekan = (e) => {
      const t = e.target; if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); geser(1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); geser(-1); }
      else if (e.key === 'Escape' && lebarLayar) setLebarLayar(false);
      else if (e.key === '+' || e.key === '=') ubahPref({ ukuran: Math.min(UKURAN_HURUF.length - 1, pref.ukuran + 1) });
      else if (e.key === '-') ubahPref({ ukuran: Math.max(0, pref.ukuran - 1) });
    };
    window.addEventListener('keydown', tekan); return () => window.removeEventListener('keydown', tekan);
  }, [geser, lebarLayar, pref.ukuran]);
  // Layar lebar menutupi halaman: kunci gulir badan dokumen selama aktif.
  useEffect(() => {
    if (!lebarLayar) return undefined;
    const lama = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = lama; };
  }, [lebarLayar]);

  const cari = async () => {
    const n = parseInt(halInput, 10); setInfo(''); setKembar([]);
    if (!Number.isInteger(n)) { setInfo('Ketik nomor halaman cetak (angka).'); return; }
    setBusy(true);
    try {
      const r = await pem.cariHal(kitabId, n);
      if (!r.length) setInfo(`Tidak ada halaman bernomor ${n} di kitab ini.`);
      else if (r.length === 1 || r.every((p) => p.potongan)) { setSorot(null); setKursor(kursorSah(r[0].seq, total, jumlah)); }
      else { setKembar(r); setInfo(`Nomor ${n} dipakai ${r.length} halaman di kitab ini. Pilih salah satu.`); }
    } catch (e) { gagal(e); } finally { setBusy(false); }
  };
  const salin = async () => {
    try { await navigator.clipboard.writeText(teksSalinan(kitab, halaman, bagian)); setInfo('Teks halaman disalin.'); }
    catch { setInfo('Peramban tidak mengizinkan menyalin otomatis. Blok teksnya lalu salin manual.'); }
  };

  const px = UKURAN_HURUF[pref.ukuran] || UKURAN_HURUF[3];
  const lebar = LEBAR_BACA[pref.lebar] || LEBAR_BACA.sedang;
  const entri = isi ? isi.entri : [];
  const aktif = entriAktif(entri, kursor);
  const daftarTampil = useMemo(() => saringEntri(entri, saring), [entri, saring]);
  const babInfo = isi && aktif >= 0 ? rentangBab(entri, aktif, total) : null;
  const terakhir = pref.terakhir || {};
  const pesanVirtual = kitab && kitab.halamanVirtual;

  const bungkus = lebarLayar ? 'fixed inset-0 z-40 flex flex-col bg-bg' : 'space-y-3';

  // ---------- Layar pilih kitab ----------
  if (!kitabId) {
    return (
      <div className="fade-in space-y-4">
        <div className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
          <p className="flex items-center gap-2 font-semibold"><BookOpen size={17} />Baca Kitab</p>
          <p className="mt-1 text-mute">Baca kitab dari perpustakaan dengan huruf besar dan layar lebar, tanpa membuat soal. Kitab diimpor admin di Kelola &gt; Perpustakaan.</p>
        </div>
        {err && <ErrorBox e={err} />}
        {!daftar && !err && <p className="flex items-center gap-2 text-sm text-mute"><Loader2 size={15} className="spin" />Memuat daftar kitab...</p>}
        {daftar && !daftar.length && <p className="rounded-xl bg-soft px-4 py-3 text-sm text-mute">Perpustakaan masih kosong. Admin bisa mengimpor kitab di Kelola &gt; Perpustakaan.</p>}
        {daftar && daftar.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {daftar.map((k) => (
              <li key={k.id}>
                <button type="button" onClick={() => { setSorot(null); setKursor(terakhir[k.id] || 1); setKitabId(k.id); }}
                  className="flex h-full w-full flex-col gap-1 rounded-2xl border border-line bg-surface px-4 py-3 text-left shadow-sm transition hover:border-brand hover:bg-soft">
                  <span dir="rtl" lang="ar" className="ar text-xl">{k.judul}</span>
                  <span className="text-sm font-semibold">{k.judulLatin}</span>
                  {k.pengarang && <span dir="rtl" lang="ar" className="ar text-sm text-mute">{k.pengarang}</span>}
                  <span className="mt-auto pt-1 text-xs text-mute">{k.jumlahHalaman} halaman{k.fan ? ` · ${k.fan}` : ''}{terakhir[k.id] ? ` · terakhir dibaca urutan ${terakhir[k.id]}` : ''}</span>
                </button>
              </li>))}
          </ul>
        )}
      </div>
    );
  }

  // ---------- Pembaca ----------
  return (
    <div className={`fade-in ${bungkus}`}>
      <div className={`flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2 shadow-sm ${lebarLayar ? 'm-2 mb-0' : ''}`} role="toolbar" aria-label="Alat pembaca kitab">
        <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => { setKitabId(''); setSorot(null); onPosisi({ kitabId: '', seq: 0 }); }} aria-label="Kembali ke daftar kitab"><X size={14} />Kitab lain</Btn>
        <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => setPanelIsi((v) => !v)} aria-pressed={panelIsi}><List size={14} />Daftar isi</Btn>
        <div className="flex items-center gap-1.5">
          <label htmlFor="bk-hal" className="text-xs text-mute">Hal. cetak</label>
          <input id="bk-hal" type="number" min="0" inputMode="numeric" className="field !w-20 !py-1.5" value={halInput} onChange={(e) => setHalInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); cari(); } }} />
          <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={cari} disabled={busy || !halInput} aria-label="Cari nomor halaman"><Search size={14} /></Btn>
        </div>
        <div className="flex items-center gap-1.5" role="group" aria-label="Ukuran huruf">
          <Btn kind="ghost" className="!px-2.5 !py-1.5 !text-xs" onClick={() => ubahPref({ ukuran: Math.max(0, pref.ukuran - 1) })} disabled={pref.ukuran <= 0} aria-label="Perkecil huruf"><Minus size={14} /></Btn>
          <span className="min-w-[3.2rem] text-center text-xs text-mute" aria-live="polite">{px}px</span>
          <Btn kind="ghost" className="!px-2.5 !py-1.5 !text-xs" onClick={() => ubahPref({ ukuran: Math.min(UKURAN_HURUF.length - 1, pref.ukuran + 1) })} disabled={pref.ukuran >= UKURAN_HURUF.length - 1} aria-label="Perbesar huruf"><Plus size={14} /></Btn>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-mute">Lebar
          <select aria-label="Lebar kolom baca" className="field !w-auto !py-1.5" value={pref.lebar} onChange={(e) => ubahPref({ lebar: e.target.value })}>
            {Object.entries(LEBAR_BACA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
        <label className="flex items-center gap-1.5 text-xs text-mute">Tampil
          <select aria-label="Jumlah halaman per tampilan" className="field !w-auto !py-1.5" value={jumlah} onChange={(e) => { ubahPref({ lembar: Number(e.target.value) }); }}>
            <option value={1}>1 halaman</option><option value={2}>2 halaman</option></select></label>
        {bisaPisah && (
          <label className="flex items-center gap-1.5 text-xs text-mute">Bagian
            <select aria-label="Bagian halaman" className="field !w-auto !py-1.5" value={pref.bagian} onChange={(e) => ubahPref({ bagian: e.target.value })}>
              <option value="semua">Matn + syarah</option><option value="matn">Matn saja</option><option value="syarah">Syarah saja</option></select></label>)}
        <div className="ml-auto flex items-center gap-1.5">
          <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={salin} disabled={!halaman.length} aria-label="Salin teks halaman"><Copy size={14} />Salin</Btn>
          <Btn kind="soft" className="!px-3 !py-1.5 !text-xs" onClick={() => setLebarLayar((v) => !v)} aria-pressed={lebarLayar}>
            {lebarLayar ? <><Minimize2 size={14} />Tutup layar lebar</> : <><Maximize2 size={14} />Layar lebar</>}</Btn>
        </div>
      </div>

      {err && <div className={lebarLayar ? 'mx-2' : ''}><ErrorBox e={err} /></div>}
      {pesanVirtual && <p role="note" className={`rounded-xl bg-warn-bg px-4 py-2 text-xs text-warn ${lebarLayar ? 'mx-2 mt-2' : ''}`}>Halaman kitab ini dibagi otomatis saat diimpor, jadi nomor halamannya bukan nomor cetak. Rujukan soal ke kitab ini sebaiknya dicocokkan dengan edisi cetak.</p>}
      {kitab && !pesanVirtual && kitab.sumberJenis === 'pdf' && <p role="note" className={`rounded-xl bg-soft px-4 py-2 text-xs text-soft-ink ${lebarLayar ? 'mx-2 mt-2' : ''}`}>Kitab ini diimpor dari PDF: nomor halaman mengikuti urutan PDF ditambah nomor awal yang diisi admin ({labelSumberJenis(kitab.sumberJenis)}).</p>}
      {sorot && halaman.length > 0 && (
        <p role="status" className={`flex flex-wrap items-center gap-2 rounded-xl bg-soft px-4 py-2 text-xs text-soft-ink ${lebarLayar ? 'mx-2 mt-2' : ''}`}>
          <b>Rujukan soal:</b> urutan {sorot.dari}{sorot.sampai > sorot.dari ? `–${sorot.sampai}` : ''} disorot.
          {kursor !== sorot.dari && <button type="button" className="underline" onClick={() => setKursor(kursorSah(sorot.dari, total, jumlah))}>Kembali ke halaman rujukan</button>}
          <button type="button" className="ml-auto underline" onClick={() => setSorot(null)}>Hilangkan sorotan</button>
        </p>)}

      <div className={`grid min-h-0 gap-3 ${lebarLayar ? 'flex-1 p-2' : ''} ${panelIsi ? 'lg:grid-cols-[18rem_minmax(0,1fr)]' : ''}`}>
        {panelIsi && (
          <aside aria-label="Daftar isi" className={`flex min-h-0 flex-col rounded-2xl border border-line bg-surface ${lebarLayar ? '' : 'max-h-[70vh]'}`}>
            <div className="border-b border-line p-2">
              <input aria-label="Cari judul di daftar isi" className="field !py-1.5 !text-sm" placeholder="Cari judul bab..." value={saring} onChange={(e) => setSaring(e.target.value)} />
            </div>
            {!isi ? <p className="flex items-center gap-2 p-3 text-xs text-mute"><Loader2 size={13} className="spin" />Memuat daftar isi...</p>
              : !entri.length ? <p className="p-3 text-xs text-mute">Kitab ini tidak punya daftar isi terdeteksi. Pakai kolom Hal. cetak untuk berpindah.</p>
              : (
                <ul className="min-h-0 flex-1 overflow-auto p-1.5 text-sm">
                  {daftarTampil.map(({ e, i }) => (
                    <li key={i}>
                      <button type="button" onClick={() => { setSorot(null); setKursor(kursorSah(e.seq, total, jumlah)); setInfo(''); }} aria-current={i === aktif ? 'true' : undefined}
                        className={`w-full rounded-lg px-2 py-1.5 text-right leading-snug hover:bg-soft ${i === aktif ? 'bg-soft font-semibold text-soft-ink' : ''}`}>
                        <span dir="rtl" lang="ar" className="ar block text-base">{`${'– '.repeat(Math.max(0, (e.level || 1) - 1))}${e.judul}`}</span>
                        <span className="block text-left text-[11px] text-mute">hal. {e.hal}</span>
                      </button>
                    </li>))}
                  {!daftarTampil.length && <li className="p-3 text-xs text-mute">Tidak ada judul yang cocok.</li>}
                </ul>)}
          </aside>)}

        <section ref={areaRef} aria-label="Isi kitab" aria-busy={busy} className={`min-h-0 min-w-0 rounded-2xl border border-line bg-surface ${lebarLayar ? 'overflow-auto' : ''}`}>
          {kitab && (
            <div className="flex flex-wrap items-baseline gap-x-3 border-b border-line px-4 py-2">
              <span dir="rtl" lang="ar" className="ar text-lg">{kitab.judul}</span>
              <span className="text-xs text-mute">{kitab.judulLatin}</span>
              {babInfo && entri[aktif] && <span className="text-xs text-mute">· bab: <span dir="rtl" lang="ar" className="ar">{entri[aktif].judul}</span></span>}
            </div>)}
          {!halaman.length && (busy || !isi) && <p className="flex items-center gap-2 p-6 text-sm text-mute"><Loader2 size={16} className="spin" />Memuat halaman...</p>}
          {halaman.length > 0 && (
            <div dir="rtl" className={`mx-auto flex gap-4 px-4 py-5 ${jumlah === 2 ? 'max-w-none flex-col xl:flex-row' : lebar.kelas}`}>
              {halaman.map((p) => {
                const disorot = sorot && p.seq >= sorot.dari && p.seq <= sorot.sampai;
                const teks = bagianTeks(p, bagian);
                return (
                  <article key={p.seq} aria-label={`Halaman ${p.hal}`} className={`min-w-0 flex-1 rounded-xl px-4 py-3 ${disorot ? 'bg-soft ring-2 ring-brand' : ''}`}>
                    <header dir="ltr" className="mb-2 flex flex-wrap items-center gap-x-3 border-b border-line pb-1.5 text-xs text-mute">
                      <b className="text-ink">Hal. {p.hal}</b><span>juz {p.juz}</span><span>urutan {p.seq}/{total}</span>
                      {p.potongan && <span>bagian {p.potongan.ke}/{p.potongan.dari}</span>}
                      {p.nomorAnomali && <span className="text-warn">nomor cetak {p.nomorAnomali}</span>}
                      {disorot && <span className="ml-auto rounded-full bg-brand px-2 py-0.5 font-semibold text-brand-fg">rujukan soal</span>}
                    </header>
                    <div lang="ar" className="ar whitespace-pre-wrap break-words text-right" style={{ fontSize: `${px}px`, lineHeight: 2.15 }}>
                      {teks || <span className="text-sm text-mute" dir="ltr">(halaman tanpa teks pada bagian ini)</span>}
                    </div>
                  </article>);
              })}
            </div>)}
        </section>
      </div>

      <div className={`flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2 shadow-sm ${lebarLayar ? 'm-2 mt-0' : ''}`}>
        <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => geser(-1)} disabled={busy || kursor <= 1} aria-keyshortcuts="ArrowRight" title="Halaman sebelumnya (→)"><ChevronRight size={14} />Sebelumnya</Btn>
        <div className="min-w-0 flex-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-soft" role="progressbar" aria-valuemin={1} aria-valuemax={total || 1} aria-valuenow={kursor} aria-label="Posisi baca">
            <div className="h-full bg-brand transition-all" style={{ width: `${total ? Math.round((kursor / total) * 100) : 0}%` }} /></div>
          <p className="mt-1 text-center text-xs text-mute">{halaman.length ? <>Hal. <b className="text-ink">{halaman.length > 1 ? `${halaman[0].hal}–${halaman[halaman.length - 1].hal}` : halaman[0].hal}</b> · urutan {kursor}/{total}</> : `Urutan ${kursor}/${total}`}{info ? ` · ${info}` : ''}</p>
        </div>
        <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => geser(1)} disabled={busy || kursor + jumlah - 1 >= total} aria-keyshortcuts="ArrowLeft" title="Halaman berikutnya (←, arah baca Arab)">Berikutnya<ChevronLeft size={14} /></Btn>
      </div>
      {kembar.length > 0 && (
        <div className={`flex flex-wrap items-center gap-2 ${lebarLayar ? 'mx-2 mb-2' : ''}`} role="group" aria-label="Pilih halaman bernomor kembar">
          {kembar.map((p) => <Btn key={p.seq} kind="soft" className="!px-3 !py-1.5 !text-xs" onClick={() => { setSorot(null); setKursor(kursorSah(p.seq, total, jumlah)); setKembar([]); setInfo(''); }}>Urutan {p.seq}{p.bab ? ` · ${p.bab.slice(0, 24)}` : ''}</Btn>)}
        </div>)}
    </div>
  );
}
