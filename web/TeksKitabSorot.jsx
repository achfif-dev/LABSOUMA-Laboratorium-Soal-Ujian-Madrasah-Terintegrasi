import React, { useEffect, useMemo, useRef, useState } from 'react';
import { bidangDariSoal } from './lib/kutipan.js';
import { sorotSoal } from './lib/sorotKutipan.js';

// Teks kitab sebuah soal dengan bagian yang dikutip soal/pembahasan disorot (web/lib/sorotKutipan.js), plus tombol lompat per bagian.
// gulir="kotak": teks di kotak setinggi layar yang bisa digulir; saat tampil, kotak langsung menggulir ke sorotan pertama (tanpa menggeser halaman).
// gulir="halaman": teks selebar kolom tanpa batas tinggi; tombol lompat menggulir halaman (dipakai kartu Review yang berdampingan dengan soal).
export function TeksKitabSorot({ q, gulir = 'kotak', kelas = 'ar ar-sm' }) {
  const hasil = useMemo(() => sorotSoal(q.teks, bidangDariSoal(q)), [q]);
  const kotak = useRef(null);
  const ke = (i, halus = true) => {
    const el = kotak.current && kotak.current.querySelectorAll('mark')[i];
    if (!el) return;
    if (gulir === 'kotak') kotak.current.scrollTo({ top: Math.max(0, el.offsetTop - kotak.current.clientHeight * 0.3), behavior: halus ? 'smooth' : 'auto' });
    else el.scrollIntoView({ block: 'center', behavior: halus ? 'smooth' : 'auto' });
  };
  useEffect(() => { if (gulir === 'kotak' && hasil.rentang.length) ke(0, false); }, [hasil]); // eslint-disable-line react-hooks/exhaustive-deps
  const ada = hasil.rentang.length;
  return (
    <div className="mt-2">
      {ada > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-mute">Rujukan soal:</span>
          {hasil.rentang.map((r, i) => (
            <button key={r.id} type="button" onClick={() => ke(i)} className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-soft-ink hover:border-brand">
              {ada > 1 ? `${i + 1}. ` : ''}{r.label.join(', ')}{r.jenis === 'mirip' ? ' (mirip)' : ''}
            </button>
          ))}
        </div>
      )}
      <div ref={kotak} className={'relative rounded-xl bg-soft px-4 py-2 text-soft-ink ' + (gulir === 'kotak' ? 'max-h-72 overflow-y-auto' : '')}>
        <p dir="rtl" lang="ar" className={kelas}>
          {hasil.segmen.map((s, i) => s.sorot
            ? <mark key={i} data-rujukan={s.sorot.id} title={`Dikutip di: ${s.sorot.label.join(', ')}${s.sorot.jenis === 'mirip' ? ' (hanya mirip, cek manual)' : ''}`} className={'rounded bg-warn-bg px-0.5 text-inherit underline decoration-warn decoration-2 underline-offset-[6px] [box-decoration-break:clone] ' + (s.sorot.jenis === 'mirip' ? 'decoration-dashed' : '')}>{s.t}</mark>
            : <React.Fragment key={i}>{s.t}</React.Fragment>)}
        </p>
      </div>
      {ada > 0 && <p className="mt-1 text-xs text-mute">Bagian yang disorot dikutip oleh soal atau pembahasan.{hasil.rentang.some((r) => r.jenis === 'mirip') ? ' Garis putus-putus: hanya mirip, periksa manual.' : ''}</p>}
      {hasil.tidakDitemukan.length > 0 && <p className="mt-1 text-xs text-bad">{hasil.tidakDitemukan.length} kutipan ({[...new Set(hasil.tidakDitemukan.map((x) => x.label))].join(', ')}) tidak ditemukan di teks ini.</p>}
    </div>
  );
}

// Pembungkus <details>: sorotan baru dihitung setelah dibuka (daftar Bank Soal bisa memuat banyak soal sekaligus).
export function TeksKitabLipat({ q, children, bukaAwal = false }) {
  const [buka, setBuka] = useState(bukaAwal);
  return (
    <details className="mt-3" open={bukaAwal || undefined} onToggle={(e) => setBuka(e.currentTarget.open)}>
      <summary className="cursor-pointer text-sm font-semibold text-soft-ink">Lihat teks kitab</summary>
      {buka && <TeksKitabSorot q={q} />}
      {children}
    </details>
  );
}
