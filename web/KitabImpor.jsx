import React, { useEffect, useRef, useState } from 'react';
import { Upload, Loader2, RefreshCw, Eye, EyeOff, AlertTriangle, Check } from 'lucide-react';
import { bacaDokumenKitab, FORMAT_LABEL } from './lib/dokumenKitab.js';
import { slugKitab, isianAwal, peringatanPratinjau, isianSiap, jalankanImpor } from './lib/imporKitab.js';

// Impor perpustakaan kitab: .txt ekspor Syamilah, atau .docx/.txt dengan penanda halaman [ص N]. Admin saja. Berkas diparse di perangkat; yang dikirim ke server hanya
// halaman hasil parse (bukan berkas mentah). `Btn`, `ErrorBox`, `callApi`, `apiErr` dioper dari App.jsx (menghindari impor melingkar).
const STATUS = { siap: 'Siap', mengimpor: 'Belum selesai' };
const HAK = { 'belum-dicek': 'Hak cipta: belum dicek', 'domain-publik': 'Domain publik', izin: 'Berizin' };

export default function KitabImpor({ Btn, ErrorBox, callApi, apiErr, toast }) {
  const [daftar, setDaftar] = useState(null);
  const [errDaftar, setErrDaftar] = useState(null);
  const [berkas, setBerkas] = useState('');
  const [hasil, setHasil] = useState(null);
  const [errParse, setErrParse] = useState('');
  const [isian, setIsian] = useState(null);
  const [idManual, setIdManual] = useState(false);
  const [progres, setProgres] = useState(null);
  const [errImpor, setErrImpor] = useState(null);
  const batalRef = useRef(false);
  const sibuk = !!progres && progres.tahap !== 'gagal';

  const muatDaftar = async () => {
    try { setDaftar((await callApi('/api/kitab', { aksi: 'impor-daftar' })).kitab); setErrDaftar(null); }
    catch (e) { setErrDaftar(apiErr(e)); }
  };
  useEffect(() => { muatDaftar(); }, []);

  const pilihBerkas = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setErrParse(''); setHasil(null); setIsian(null); setProgres(null); setErrImpor(null); setIdManual(false);
    try {
      const h = await bacaDokumenKitab({ nama: f.name, buffer: await f.arrayBuffer() });
      setBerkas(f.name); setHasil(h); setIsian(isianAwal(h));
    } catch (er) { setErrParse(er && er.message ? er.message : 'Berkas tidak bisa dibaca.'); }
  };
  const ubah = (p) => setIsian((s) => {
    const n = { ...s, ...p };
    if ('judulLatin' in p && !idManual) n.kitabId = slugKitab(p.judulLatin);
    return n;
  });

  const impor = async () => {
    batalRef.current = false; setErrImpor(null); setProgres({ tahap: 'mulai', tertulis: 0, total: hasil.halaman.length });
    try {
      const r = await jalankanImpor({ panggil: (b) => callApi('/api/kitab', b), hasil, isian, onProgres: setProgres, batal: () => batalRef.current });
      if (r.dibatalkan) { setProgres(null); toast(`Dibatalkan setelah ${r.tertulis} halaman. Kitab belum aktif; ulangi dengan "timpa".`); }
      else { setProgres(null); setHasil(null); setIsian(null); setBerkas(''); toast(`Selesai: ${r.selesai.jumlah} halaman diimpor dan kitab aktif.`); }
    } catch (e) { setProgres({ tahap: 'gagal' }); setErrImpor(apiErr(e)); }
    muatDaftar();
  };
  const aktifkan = async (k) => {
    try { await callApi('/api/kitab', { aksi: 'impor-aktif', kitabId: k.id, aktif: !k.aktif }); muatDaftar(); }
    catch (e) { toast((apiErr(e) || {}).message || 'Gagal mengubah status.'); }
  };

  const peringatan = hasil ? peringatanPratinjau(hasil) : [];
  const terhalang = peringatan.some((p) => p.tingkat === 'bad');
  const l = hasil && hasil.laporan;
  const pct = progres && progres.total ? Math.round((progres.tertulis / progres.total) * 100) : 0;

  return (
    <div className="fade-in space-y-4">
      <div className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
        <p className="font-semibold">Perpustakaan kitab</p>
        <p className="mt-1 text-mute">Unggah ekspor Maktabah Syamilah (.txt UTF-8 atau .docx), atau berkas lain yang memuat penanda halaman [ص N]. Berkas dibaca di perangkat ini, lalu halaman dikirim per 100 ke server. Kitab baru aktif setelah jumlah halaman cocok.</p>
      </div>

      {errDaftar && <ErrorBox e={errDaftar} />}
      <div className="rounded-2xl border border-line bg-surface">
        <div className="flex items-center gap-2 border-b border-line px-4 py-2">
          <p className="mr-auto text-sm font-semibold">Kitab tersimpan{daftar ? ` (${daftar.length})` : ''}</p>
          <Btn kind="ghost" onClick={muatDaftar}><RefreshCw size={15} />Segarkan</Btn>
        </div>
        {!daftar ? <div className="flex justify-center py-6 text-mute"><Loader2 className="spin" /></div>
          : !daftar.length ? <p className="px-4 py-4 text-sm text-mute">Belum ada kitab di perpustakaan.</p>
          : <ul className="divide-y divide-line">{daftar.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
              <div className="mr-auto min-w-0">
                <p className="font-semibold">{k.judulLatin} <span className="font-normal text-mute">· {k.id}</span></p>
                <p dir="rtl" lang="ar" className="ar truncate text-mute">{k.judul}</p>
                <p className="text-xs text-mute">{k.jumlahHalaman} halaman · rev. {k.revisi} · {STATUS[k.status] || k.status} · {k.aktif ? 'aktif' : 'tidak aktif'} · {HAK[k.hakCipta] || k.hakCipta}</p>
              </div>
              {k.status === 'siap' && <Btn kind="ghost" onClick={() => aktifkan(k)}>{k.aktif ? <><EyeOff size={15} />Sembunyikan</> : <><Eye size={15} />Aktifkan</>}</Btn>}
            </li>))}</ul>}
      </div>

      <div className="rounded-2xl border border-line bg-surface px-4 py-4">
        <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold shadow-sm hover:border-brand hover:bg-soft">
          <Upload size={15} />Pilih berkas kitab (.txt / .docx)
          <input type="file" accept=".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={pilihBerkas} disabled={sibuk} />
        </label>
        {berkas && <span className="ml-2 break-all text-xs text-mute">{berkas}</span>}
        {errParse && <p role="alert" className="mt-3 rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">{errParse}</p>}

        {hasil && isian && (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs text-mute">Format terbaca: {FORMAT_LABEL[hasil.format] || hasil.format}</p>
              <p dir="rtl" lang="ar" className="ar text-lg">{hasil.kitab.judul}</p>
              <p className="text-sm text-mute">{hasil.kitab.pengarang}</p>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {[['Halaman', l.jumlahHalaman], ['Judul bab', l.judulTerdeteksi], ['Catatan kaki dibuang', l.catatanKakiDibuang], ['Rujukan takhrij dibuang', l.rujukanDibuang],
                ['Halaman cetak', `${l.halPertama}-${l.halTerakhir}`], ['Ukuran teks', `${Math.round(l.ukuranBytes / 1024)} KB`], ['Berharakat', hasil.kitab.berharakat ? 'ya' : 'tidak'], ['Matn terpisah', hasil.kitab.bentukMatn === 'pemisah-tatwil' ? 'ya' : 'tidak']]
                .map(([a, b]) => <div key={a} className="rounded-xl bg-soft px-3 py-2"><dt className="text-xs text-mute">{a}</dt><dd className="font-semibold">{b}</dd></div>)}
            </dl>
            {peringatan.map((p, i) => (
              <p key={i} role={p.tingkat === 'bad' ? 'alert' : undefined} className={`flex gap-2 rounded-xl px-4 py-3 text-sm ${p.tingkat === 'bad' ? 'bg-bad-bg text-bad' : 'bg-warn-bg text-warn'}`}><AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{p.teks}</span></p>
            ))}
            <details className="rounded-xl border border-line px-4 py-2 text-sm">
              <summary className="cursor-pointer font-semibold">Cuplikan halaman pertama</summary>
              <p dir="rtl" lang="ar" className="ar mt-2 whitespace-pre-wrap">{hasil.halaman[0].teks.slice(0, 500)}</p>
            </details>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm"><span className="font-semibold">Nama kitab (Latin) *</span>
                <input className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2" value={isian.judulLatin} onChange={(e) => ubah({ judulLatin: e.target.value })} placeholder="mis. Fathul Mu'in" />
                <span className="text-xs text-mute">Dipakai sebagai nama kitab di soal.</span></label>
              <label className="text-sm"><span className="font-semibold">ID kitab *</span>
                <input className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2" value={isian.kitabId} onChange={(e) => { setIdManual(true); ubah({ kitabId: e.target.value.toLowerCase() }); }} placeholder="fathul-muin" />
                <span className="text-xs text-mute">Huruf kecil, angka, tanda hubung. Tidak bisa diganti setelah impor.</span></label>
              <label className="text-sm"><span className="font-semibold">Mazhab</span>
                <select className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2" value={isian.mazhab} onChange={(e) => ubah({ mazhab: e.target.value })}>
                  <option value="">Tidak ditentukan</option><option value="syafii">Syafi'i</option><option value="hanafi">Hanafi</option><option value="maliki">Maliki</option><option value="hanbali">Hanbali</option></select></label>
              <label className="text-sm"><span className="font-semibold">Status hak cipta</span>
                <select className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2" value={isian.hakCipta} onChange={(e) => ubah({ hakCipta: e.target.value })}>
                  <option value="belum-dicek">Belum dicek</option><option value="domain-publik">Domain publik</option><option value="izin">Berizin</option></select></label>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isian.timpa} onChange={(e) => ubah({ timpa: e.target.checked })} />Timpa bila kitab dengan ID ini sudah ada (halaman lama dihapus lebih dulu)</label>

            {progres && progres.tahap !== 'gagal' && (
              <div role="status" className="space-y-1">
                <div className="h-2 overflow-hidden rounded-full bg-soft"><div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} /></div>
                <p className="text-xs text-mute">{progres.tahap === 'mulai' ? 'Menyiapkan kitab...' : progres.tahap === 'selesai' ? 'Memeriksa jumlah halaman...' : `${progres.tertulis} dari ${progres.total} halaman`}</p>
              </div>
            )}
            {errImpor && <ErrorBox e={errImpor} />}
            <div className="flex flex-wrap gap-2">
              <Btn kind="primary" onClick={impor} disabled={sibuk || terhalang || !isianSiap(isian)}>{sibuk ? <Loader2 size={15} className="spin" /> : <Check size={15} />}Impor ke perpustakaan</Btn>
              {sibuk && <Btn kind="ghost" onClick={() => { batalRef.current = true; }}>Batalkan</Btn>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
