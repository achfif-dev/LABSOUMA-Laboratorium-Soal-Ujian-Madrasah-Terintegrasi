import React, { useMemo, useState } from 'react';
import { BarChart3, Download, AlertTriangle } from 'lucide-react';
import { bacaMatriks, analisis, hasilKeCsv, labelKr20 } from './lib/analisisButir.js';

// Analisis butir dari hasil ujian yang ditempel (Excel/Sheets/CSV). Tidak menyimpan apa pun dan tidak memanggil server:
// data siswa tidak pernah keluar dari perangkat. `Btn` dan `unduh` dioper dari App.jsx (menghindari impor melingkar).
const WARNA = { pertahankan: 'bg-ok-bg text-ok', revisi: 'bg-warn-bg text-warn', periksa: 'bg-bad-bg text-bad' };
const NAMA = { pertahankan: 'Pertahankan', revisi: 'Revisi', periksa: 'Periksa kunci' };

export default function AnalisisButir({ Btn, unduh }) {
  const [teks, setTeks] = useState('');
  const [kunci, setKunci] = useState('');
  const [hasil, setHasil] = useState(null);

  const mat = useMemo(() => bacaMatriks(teks), [teks]);
  const adaHuruf = mat.sel.some((r) => r.some((c) => /^[A-Ea-e]$/.test(c)));

  const jalankan = () => {
    const k = kunci.split(/[\s,;]+/).filter(Boolean);
    setHasil(analisis(mat.sel, adaHuruf ? k : []));
  };
  const unduhCsv = () => hasil && unduh(`analisis-butir-${new Date().toISOString().slice(0, 10)}.csv`, new Blob([hasilKeCsv(hasil)], { type: 'text/csv;charset=utf-8' }));

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold"><BarChart3 size={20} />Analisis Butir Soal</h2>
      <p className="mt-1 text-sm text-mute">
        Tempel hasil ujian dari Excel atau Sheets: satu baris per siswa, satu kolom per soal. Isi sel 1 (benar) atau 0 (salah), atau huruf jawaban A-E
        (lalu isi kunci di bawah). Kolom nama dan baris judul dikenali otomatis. Data hanya diproses di perangkat ini dan tidak disimpan.
      </p>
      <textarea aria-label="Data hasil ujian" className="field mt-3 min-h-[140px] w-full font-mono text-xs" placeholder={'Nama\tNo1\tNo2\tNo3\nAli\t1\t0\t1\nBudi\tB\tA\tC'} value={teks} onChange={(e) => { setTeks(e.target.value); setHasil(null); }} />
      {teks.trim() && <p className="mt-1 text-xs text-mute">Terbaca {mat.sel.length} siswa × {mat.sel.length ? Math.max(...mat.sel.map((r) => r.length)) : 0} soal{mat.judul ? ' · baris judul dilewati' : ''}{mat.kolomNama ? ' · kolom nama dilewati' : ''}.</p>}
      {adaHuruf && (
        <label className="mt-3 block text-sm font-medium">Kunci jawaban (urut, pisahkan spasi atau koma)
          <input className="field mt-1 w-full font-mono" placeholder="A B C D A ..." value={kunci} onChange={(e) => { setKunci(e.target.value); setHasil(null); }} />
        </label>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Btn kind="primary" onClick={jalankan} disabled={!mat.sel.length}><BarChart3 size={16} />Analisis</Btn>
        {hasil && !hasil.galat.length && <Btn kind="ghost" onClick={unduhCsv}><Download size={16} />Unduh CSV</Btn>}
      </div>

      {hasil && hasil.galat.length > 0 && (
        <ul role="alert" className="mt-3 space-y-1 rounded-lg bg-bad-bg p-3 text-sm text-bad">{hasil.galat.map((g) => <li key={g}>{g}</li>)}</ul>
      )}
      {hasil && !hasil.galat.length && (
        <div className="mt-4">
          {hasil.peringatan.map((p) => <p key={p} className="mb-2 flex items-start gap-2 text-sm text-warn"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{p}</p>)}
          <p className="text-sm">
            Siswa: <b>{hasil.n}</b> · Rata-rata benar: <b>{Math.round(hasil.rataSkor * 100)}%</b> · Reliabilitas KR-20:{' '}
            <b>{hasil.kr20 === null ? '-' : hasil.kr20.toFixed(2)}</b> ({labelKr20(hasil.kr20)})
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {hasil.butir.map((b) => (
              <li key={b.no} className="rounded-xl border border-line p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <b>Soal {b.no}</b>
                  <span className={'rounded-full px-2 py-0.5 text-xs font-semibold ' + WARNA[b.status]}>{NAMA[b.status]}</span>
                </div>
                <p className="mt-1 text-mute">Kesukaran {b.p.toFixed(2)} ({b.kesukaran}) · Daya beda {b.d.toFixed(2)} ({b.dayaBeda}) · r {b.r.toFixed(2)}</p>
                {b.sebaran && <p className="mt-1 text-xs text-mute">Pilihan: {['A', 'B', 'C', 'D', 'E'].filter((o) => b.sebaran[o] > 0 || o === b.kunci).map((o) => `${o}${o === b.kunci ? '*' : ''}=${b.sebaran[o]}`).join(' ')}{b.sebaran.kosong ? ` kosong=${b.sebaran.kosong}` : ''}</p>}
                {b.saran.map((s) => <p key={s} className="mt-1 text-xs">{s}</p>)}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-mute">Patokan: kesukaran 0,30-0,70 sedang; daya beda ≥ 0,30 baik, &lt; 0,20 perlu revisi, negatif = periksa kunci. Ini petunjuk statistik, bukan pengganti telaah ustadz.</p>
        </div>
      )}
    </section>
  );
}
