import React from 'react';
import { Loader2 } from 'lucide-react';
import { MEREK } from './lib/merek.js';

// Footnote kredit dan layar memuat bermerek. Teksnya hanya ada di web/lib/merek.js.

/** Footnote kredit (Latin + Arab). Dipakai di kaki semua halaman utama dan layar memuat. */
export function KreditKaki({ className = '', style }) {
  return (
    <footer className={`text-center text-xs text-mute ${className}`} style={style}>
      <p>{MEREK.kreditLatin}</p>
      <p dir="rtl" lang="ar" className="ar-nama mt-1">{MEREK.kreditArab}</p>
    </footer>
  );
}

/**
 * Layar memuat: logo, nama aplikasi, indikator putar, dan footnote.
 * `ringkas` = versi kecil untuk panel yang dimuat malas di dalam halaman (tanpa memenuhi layar).
 */
export function LayarMuat({ ringkas = false, children = 'Memuat…' }) {
  if (ringkas) {
    return (
      <div role="status" aria-busy="true" aria-live="polite" className="flex flex-col items-center gap-2 px-4 py-8 text-center">
        <img src={MEREK.logo} width={40} height={40} alt="" decoding="async" style={{ width: 40, height: 40 }} />
        <p className="text-sm font-semibold tracking-[.08em]">{MEREK.nama}</p>
        <p className="flex items-center gap-2 text-xs text-mute"><Loader2 size={14} className="spin" />{children}</p>
        <KreditKaki className="mt-1" />
      </div>
    );
  }
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="mx-auto flex min-h-[90vh] max-w-md flex-col items-center justify-center gap-3 px-4 py-10 text-center">
      <img src={MEREK.logo} width={72} height={72} alt={`Logo ${MEREK.nama}`} decoding="async" style={{ width: 72, height: 72 }} />
      <h1 className="text-2xl font-extrabold tracking-[.08em]">{MEREK.nama}</h1>
      <p className="text-sm font-medium text-mute">{MEREK.namaPanjang}</p>
      <Loader2 size={26} className="spin mt-2 text-mute" aria-hidden="true" />
      <span className="sr-only">{children}</span>
      <KreditKaki className="mt-6" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
    </div>
  );
}
