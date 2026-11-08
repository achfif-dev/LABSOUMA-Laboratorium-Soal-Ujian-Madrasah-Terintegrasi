import React, { useMemo } from 'react';
import { SpellCheck, Check } from 'lucide-react';
import { periksaTulisan, kelompokkan, terapkan, terapkanPasti } from './lib/periksaTulisan.js';

// Saran perbaikan tulisan Latin sebelum dipegonkan (salah ketik, ejaan tidak baku, singkatan, kata depan). Tidak memanggil server dan tidak
// mengubah apa pun sendiri: setiap perbaikan diterapkan penyusun lewat tombol. `Btn` dan `P` (window.Pegon) dioper dari App.jsx
// (menghindari impor melingkar dan memuat mesin Pegon lebih awal); `ver` berubah saat kamus berubah sehingga saran dihitung ulang.
const MAKS_TAMPIL = 12;

export default function SaranTulisan({ teks, onUbah, Btn, P, ver = 0, label = '' }) {
  const items = useMemo(() => (teks && String(teks).trim() && P
    ? periksaTulisan(teks, { kunci: P.kunciKamus(), dikenalArab: P.dikenalSebagaiArab, indonesia: P.adaKataIndonesia })
    : []), [teks, P, ver]);
  const grup = useMemo(() => kelompokkan(items), [items]);
  if (!grup.length) return null;
  const pasti = items.filter((x) => x.pasti);
  const bisa = (g) => g.kode !== 'KURUNG' && g.kode !== 'KUTIP';
  return (
    <div role="status" className="rounded-xl bg-warn-bg px-3 py-2 text-xs leading-relaxed text-warn">
      <div className="flex flex-wrap items-center gap-2">
        <SpellCheck size={14} className="shrink-0" aria-hidden="true" />
        <b>{label ? `${label}: ` : ''}Saran perbaikan tulisan ({grup.length})</b>
        {pasti.length > 0 && onUbah && (
          <Btn kind="soft" className="!px-2.5 !py-1 !text-xs" onClick={() => onUbah(terapkanPasti(teks, items))}><Check size={12} />Terapkan {pasti.length} perbaikan pasti</Btn>
        )}
      </div>
      <p className="mt-1 text-mute">Salah ketik atau ejaan tidak baku di teks Latin membuat mesin menulis Pegon yang keliru tanpa tanda. Perbaiki sebelum dipegonkan.</p>
      <ul className="mt-1.5 space-y-2">
        {grup.slice(0, MAKS_TAMPIL).map((g) => (
          <li key={g.id}>
            <p>
              <span className="font-semibold">&ldquo;{g.dari.trim() || '␣'}&rdquo;</span>
              {bisa(g) && <> &rarr; <b>{g.saran === '' ? '(dihapus)' : g.saran}</b></>}
              {g.items.length > 1 ? ` (${g.items.length} tempat)` : ''}
              <span className="text-mute"> {g.tingkat === 'periksa' ? '· periksa' : ''}</span>
            </p>
            <p className="text-mute">{g.pesan}</p>
            {onUbah && bisa(g) && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Btn kind="ghost" className="!px-2.5 !py-1 !text-xs" onClick={() => onUbah(terapkan(teks, g.items))}>{g.saran === '' ? 'Hapus' : 'Terapkan'}</Btn>
                {g.alternatif.map((a) => (
                  <Btn key={a.label} kind="ghost" className="!px-2.5 !py-1 !text-xs" onClick={() => onUbah(terapkan(teks, g.items.map((x) => ({ ...x, saran: a.saran }))))}>Pakai &ldquo;{a.label}&rdquo;</Btn>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
      {grup.length > MAKS_TAMPIL && <p className="mt-1.5 text-mute">+ {grup.length - MAKS_TAMPIL} saran lain; terapkan yang di atas lalu periksa ulang.</p>}
    </div>
  );
}
