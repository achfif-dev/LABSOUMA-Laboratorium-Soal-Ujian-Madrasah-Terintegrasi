import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Save, Scissors, Trash2, X } from 'lucide-react';
import { barisKalimat, adaTanda, ringkasTanda, TEKS_PANJANG } from './lib/batasCetak.js';

// Penanda batas halaman cetak (editor dan admin), dibuka dari tombol "Tandai hal. cetak" pada kepala halaman di PembacaKitab.jsx.
// Tujuan: jumlah teks per halaman digital tidak sama dengan per halaman cetak. Penyunting mengetuk KALIMAT tempat tiap halaman cetak dimulai; tanda disimpan
// sebagai draf (tidak mengubah kitab, boleh dicicil dan dilanjutkan di hari lain). Admin lalu menerapkannya: halaman disusun ulang sehingga satu halaman = satu halaman cetak.
// Aturan dan server: web/lib/batasCetak.js, src/kitabBatas.js. State `batas` dipegang PembacaKitab (supaya tanda tampil di teks halaman); panel ini mengubahnya lewat `onUbah`.
// `TeksBertanda` menggantikan teks biasa pada halaman selama mode tandai aktif.

const SIMPAN_OTOMATIS_MS = 10_000;

export function TeksBertanda({ p, tanda, arab, px, bahasa, onKetuk }) {
  const baris = useMemo(() => barisKalimat(p.teks), [p.teks]);
  const gaya = { fontSize: `${px}px`, lineHeight: arab ? 2.15 : 1.75 };
  if (!baris.length) return <span className="text-sm text-mute" dir="ltr">(halaman tanpa teks)</span>;
  return (
    <div role="list" aria-label={`Kalimat halaman urutan ${p.seq}: ketuk untuk menandai awal halaman cetak`} className="space-y-0.5" {...(bahasa ? { lang: bahasa } : {})}>
      {baris.map((b) => {
        const t = adaTanda(tanda, p.seq, b.mulai);
        return (
          <React.Fragment key={b.mulai}>
            {t && <div dir="ltr" role="listitem" className="my-2 flex items-center gap-2 rounded-lg bg-brand px-2 py-1 text-xs font-semibold text-brand-fg"><Scissors size={13} />Halaman cetak {t.hal}{t.juz ? ` (juz ${t.juz})` : ''} mulai di sini<span className="ml-auto font-normal opacity-80">ketuk kalimat untuk menghapus</span></div>}
            <button type="button" role="listitem" onClick={() => onKetuk(p, b)} style={gaya}
              className={`${arab ? 'ar text-right' : 'text-left'} block w-full whitespace-pre-wrap break-words rounded-lg px-2 py-0.5 hover:bg-soft ${t ? 'bg-soft' : ''}`}>{b.teks}</button>
          </React.Fragment>);
      })}
    </div>
  );
}

export default function PenandaBatasCetak({ kitab, kitabId, total, pem, Btn, ErrorBox, apiErr, admin = false, batas, onUbah, onTutup, onLompat, onSelesai }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [kemajuan, setKemajuan] = useState(null);   // { tahap, tertulis, total } selama penerapan
  const [sudahMulai, setSudahMulai] = useState(false); // penerapan terputus sesudah `mulai`: bisa dilanjutkan tanpa mengulang
  const [info, setInfo] = useState('');
  const terbaru = useRef(batas); terbaru.current = batas;

  useEffect(() => {
    if (batas.muat) return undefined;
    let batal = false;
    pem.batasBaca(kitabId).then((r) => { if (!batal) onUbah({ ...terbaru.current, tanda: r.tanda, rev: r.rev, kotor: false, muat: true, usang: r.usang }); })
      .catch((e) => { const x = apiErr(e); if (!batal && x) { setErr(x); onUbah({ ...terbaru.current, muat: true }); } });
    return () => { batal = true; };
  }, [kitabId, batas.muat]);

  async function simpan(diam = false) {
    const b = terbaru.current; if (!b.muat || (!b.kotor && diam)) return true;
    setBusy(!diam); if (!diam) setErr(null);
    try {
      const r = await pem.batasSimpan(kitabId, { tanda: b.tanda, rev: b.rev });
      onUbah({ ...terbaru.current, rev: r.rev, kotor: terbaru.current.tanda !== b.tanda, usang: false }); if (!diam) setInfo(`Draf tersimpan (${r.jumlah} tanda).`);
      return true;
    } catch (e) { const x = apiErr(e); if (x) setErr(x); return false; } finally { setBusy(false); }
  }
  // Simpan otomatis sesudah jeda: tanda yang diketuk tidak hilang bila layar tertutup.
  useEffect(() => {
    if (!batas.kotor || !batas.muat) return undefined;
    const h = setTimeout(() => { simpan(true); }, SIMPAN_OTOMATIS_MS);
    return () => clearTimeout(h);
  }, [batas.tanda, batas.kotor, batas.muat]);

  const ringkas = useMemo(() => (batas.tanda.length ? ringkasTanda(batas.tanda, total) : null), [batas.tanda, total]);
  const tutup = () => { if (batas.kotor && !window.confirm('Ada tanda yang belum tersimpan. Tutup tanpa menyimpan?')) return; onTutup(); };
  const hapusSemua = () => { if (batas.tanda.length && window.confirm(`Hapus semua ${batas.tanda.length} tanda di draf ini?`)) onUbah({ ...batas, tanda: [], kotor: true }); };
  const muatUlang = async () => {
    if (batas.kotor && !window.confirm('Tanda yang belum tersimpan akan dibuang. Lanjutkan?')) return;
    setErr(null); onUbah({ ...batas, muat: false, kotor: false });
  };

  async function terapkan(lanjut = false) {
    if (!(await simpan(false))) return;
    const j = terbaru.current.tanda.length;
    if (!lanjut && !window.confirm(`Susun ulang kitab ini dari ${j} tanda?\n\n• Urutan halaman BERUBAH (${ringkas ? `${ringkas.jumlahLama} → ${ringkas.jumlahBaru} halaman` : ''}). Batas materi, paket, atau soal yang menaut ke urutan lama jadi tidak cocok.\n• Halaman yang dipotong tidak lagi memisahkan matn dan syarah, dan tanda "dicocokkan" pada halaman itu hilang.\n• Jangan mengoreksi teks kitab ini sampai selesai.\n• Kitab lama tetap terbaca sampai hasilnya lengkap.`)) return;
    setBusy(true); setErr(null); setInfo(''); setKemajuan({ tahap: 'mulai', tertulis: 0, total: ringkas ? ringkas.jumlahBaru : 0 }); setSudahMulai(false);
    try {
      await pem.batasTerapkan(kitabId, { lanjut, kemajuan: (k) => { setKemajuan(k); setSudahMulai(true); } });
      setKemajuan(null); setSudahMulai(false); onSelesai();
    } catch (e) { const x = apiErr(e); if (x) setErr(x); } finally { setBusy(false); }
  }

  const nomorBerikut = batas.hal;
  return (
    <section className="space-y-3 rounded-2xl border border-brand/40 bg-surface p-3 shadow-sm sm:p-4" dir="ltr" aria-label="Tandai batas halaman cetak">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold"><Scissors size={16} />Tandai batas halaman cetak</p>
        <button type="button" onClick={tutup} aria-label="Tutup penanda batas halaman cetak" className="rounded-lg p-1 text-mute hover:bg-soft"><X size={16} /></button>
      </div>
      <p className="text-xs text-mute">Buka kitab cetak Anda, cari kalimat pertama sebuah halaman cetak di teks di bawah, lalu <b>ketuk kalimat itu</b>. Halaman cetak berlanjut sampai tanda berikutnya, berapa pun panjang teksnya. Tanda disimpan sebagai draf dan belum mengubah kitab.</p>
      {batas.usang && <p className="rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn">Draf lama dibuat untuk isi kitab sebelum disusun ulang atau diimpor ulang, jadi tidak dipakai. Tandai ulang.</p>}
      {!batas.muat && !err && <p className="flex items-center gap-2 text-xs text-mute"><Loader2 size={13} className="spin" />Memuat draf...</p>}

      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1"><span className="text-xs font-semibold text-mute">Nomor halaman cetak untuk tanda berikutnya</span>
          <input inputMode="numeric" className="field" placeholder="Otomatis: nomor sebelumnya + 1" value={nomorBerikut} disabled={busy} onChange={(e) => onUbah({ ...batas, hal: e.target.value.replace(/\D/g, '').slice(0, 5) })} /></label>
        <label className="block space-y-1"><span className="text-xs font-semibold text-mute">Juz / jilid (opsional)</span>
          <input inputMode="numeric" className="field" value={batas.juz} disabled={busy} onChange={(e) => onUbah({ ...batas, juz: e.target.value.replace(/\D/g, '').slice(0, 2) })} /></label>
      </div>

      <p className="text-xs" aria-live="polite">
        <b>{batas.tanda.length}</b> tanda{ringkas ? <> · hasil <b>{ringkas.jumlahBaru}</b> halaman (sekarang {ringkas.jumlahLama})</> : null}
        {' · '}{batas.kotor ? 'ada perubahan belum tersimpan' : (batas.rev ? `draf tersimpan (rev. ${batas.rev})` : 'belum ada draf tersimpan')}
        {ringkas && ringkas.galat ? <span className="text-bad"> · {ringkas.galat}</span> : null}
      </p>

      {batas.tanda.length > 0 && (
        <details className="rounded-xl border border-line bg-soft/40 p-2 text-xs">
          <summary className="cursor-pointer font-semibold">Daftar tanda ({batas.tanda.length})</summary>
          <ul className="mt-2 max-h-56 space-y-1 overflow-auto">
            {batas.tanda.map((t) => (
              <li key={`${t.seq}:${t.off}`} className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1">
                <button type="button" className="min-w-0 flex-1 truncate text-left hover:underline" onClick={() => onLompat(t.seq)}>Hal. <b>{t.hal}</b>{t.juz ? ` · juz ${t.juz}` : ''} · urutan {t.seq}{t.awal ? ` · ${t.awal}` : ''}</button>
                <button type="button" aria-label={`Hapus tanda halaman ${t.hal}`} className="rounded p-1 text-mute hover:bg-soft" disabled={busy} onClick={() => onUbah({ ...batas, tanda: batas.tanda.filter((x) => x !== t), kotor: true })}><Trash2 size={13} /></button>
              </li>))}
          </ul>
        </details>)}

      {err && <ErrorBox e={err} />}
      {info && <p role="status" className="rounded-lg bg-ok-bg px-3 py-2 text-xs text-ok">{info}</p>}
      {kemajuan && <p role="status" className="flex items-center gap-2 rounded-lg bg-soft px-3 py-2 text-xs"><Loader2 size={13} className="spin" />{kemajuan.tahap === 'mulai' ? 'Menyusun rencana...' : kemajuan.tahap === 'selesai' ? 'Mengalihkan kitab...' : `Menulis halaman baru: ${kemajuan.tertulis} dari ${kemajuan.total}`}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Btn kind="primary" onClick={() => simpan(false)} disabled={busy || !batas.muat || !batas.kotor}>{busy && !kemajuan ? <Loader2 size={15} className="spin" /> : <Save size={15} />}Simpan draf</Btn>
        <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={muatUlang} disabled={busy}>Muat ulang draf</Btn>
        <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={hapusSemua} disabled={busy || !batas.tanda.length}><Trash2 size={14} />Hapus semua</Btn>
      </div>

      {admin ? (
        <div className="space-y-2 rounded-xl border border-line bg-soft/40 p-3">
          <p className="text-xs text-mute">Admin: terapkan tanda menjadi halaman baru ({kitab && kitab.jumlahHalaman ? `${kitab.jumlahHalaman} halaman sekarang` : ''}). Ini menyusun ulang seluruh kitab, jadi hanya untuk kitab yang belum dipakai soal, batas materi, atau paket. Halaman lebih dari {TEKS_PANJANG.toLocaleString('id-ID')} karakter tidak muat di satu soal; tanda yang terlewat biasanya penyebabnya.</p>
          <div className="flex flex-wrap items-center gap-2">
            <Btn kind="soft" onClick={() => terapkan(false)} disabled={busy || !batas.muat || !batas.tanda.length || !!(ringkas && ringkas.galat)}>{busy && kemajuan ? <Loader2 size={15} className="spin" /> : <Scissors size={15} />}Terapkan ke kitab</Btn>
            {sudahMulai && !busy && <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => terapkan(true)}>Lanjutkan penerapan yang terputus</Btn>}
          </div>
        </div>) : <p className="text-xs text-mute">Penerapan tanda ke kitab dilakukan admin. Tanda Anda tersimpan di draf dan bisa dilanjutkan siapa pun editor atau admin.</p>}
    </section>
  );
}
