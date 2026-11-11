import React from 'react';
import { Sparkles, Wand2, AlertTriangle } from 'lucide-react';
import { Btn, Spin, ErrorBox } from './ui.jsx';
import { peringatanLevel } from './lib/fakta.js';

const JENIS = { hukum: 'Hukum', bilangan: 'Bilangan', syarat: 'Syarat', definisi: 'Definisi', dalil: 'Dalil', perbedaan_pendapat: 'Beda pendapat' };

/** Daftar fakta atomik dari teks (kutipan dasar sudah diperiksa kode). Soal dibuat terikat pada SATU fakta yang dipilih pengguna. */
export default function FaktaTeks({ state, level, terpakai, basi, disabled, onBuat, onOtomatis }) {
  if (state.loading) return <Spin>Sedang mengekstrak fakta dari teks kitab...</Spin>;
  if (state.error) return <ErrorBox e={state.error} />;
  const d = state.data;
  return (
    <div className="space-y-3 text-sm">
      {basi && (
        <p role="status" className="flex gap-2 rounded-lg bg-warn-bg px-3 py-2 text-xs leading-relaxed text-warn">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />Teks kitab berubah sejak fakta ini diekstrak. Ekstrak ulang agar kutipan dasarnya sesuai.
        </p>
      )}
      <p className="text-xs leading-relaxed text-mute">
        Tiap fakta dikutip persis dari teks dan sudah dicocokkan oleh sistem{d.dibuang ? ` (${d.dibuang} fakta dibuang karena kutipannya tidak cocok)` : ''}. Soal yang dibuat dari satu fakta wajib menjelaskan alasan setiap pengecoh.
      </p>
      <Btn kind="soft" className="!px-3 !py-1.5 !text-xs" onClick={onOtomatis} disabled={disabled || basi}><Wand2 size={13} />Pilihkan fakta yang belum dipakai</Btn>
      <ul className="space-y-2">
        {d.fakta.map((f) => {
          const pakai = terpakai.includes(f.id); const warn = peringatanLevel(f, level);
          return (
            <li key={f.id} className={`rounded-lg border px-3 py-2 ${pakai ? 'border-line bg-surface opacity-75' : 'border-line bg-surface'}`}>
              <p className="flex flex-wrap items-start gap-2">
                <span className="mt-0.5 shrink-0 rounded-md bg-soft px-2 py-px text-xs font-bold text-soft-ink">{f.tingkat_cocok}</span>
                <span className="shrink-0 rounded-md border border-line px-2 py-px text-xs text-mute">{JENIS[f.jenis] || f.jenis}</span>
                {pakai && <span className="shrink-0 rounded-md border border-line px-2 py-px text-xs text-mute">sudah dipakai</span>}
              </p>
              <p className="mt-1 leading-relaxed">{f.fakta}</p>
              <p dir="rtl" lang="ar" className="ar ar-sm mt-1 !leading-normal text-mute">{f.kutipan}</p>
              {warn && <p className="mt-1 text-xs leading-relaxed text-warn">{warn}</p>}
              <button type="button" disabled={disabled || basi} onClick={() => onBuat(f)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-soft-ink hover:underline disabled:opacity-50"><Sparkles size={13} />Buat soal dari fakta ini</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
