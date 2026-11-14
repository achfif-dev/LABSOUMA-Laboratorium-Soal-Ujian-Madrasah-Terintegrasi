import { useEffect, useState } from 'react';
import { MEREK } from './lib/merek.js';

/* ---------- Jam & tanggal di header (WIB, sesuai hari reset kuota) ---------- */
const FMT_JAM = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

const FMT_TGL = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function Jam() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <div className="ml-auto shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-center sm:mt-0 sm:rounded-none sm:bg-transparent sm:p-0 sm:text-right" role="timer" aria-live="off" aria-label="Jam dan tanggal WIB">
      <p className="text-sm font-bold tabular-nums leading-tight sm:text-3xl">{FMT_JAM.format(now).replace(/\./g, ':')}<span className="ml-1 text-xs font-semibold opacity-70">WIB</span></p>
      <p className="mt-0.5 hidden text-xs font-medium opacity-80 sm:block">{FMT_TGL.format(now)}</p>
    </div>
  );
}

// Kepala aplikasi dipakai App dan AppUstadz. Di HP dibuat satu baris (logo, judul, jam) supaya konten mulai lebih cepat tampak;
// baris nama Arab disembunyikan di layar kecil dan tampil mulai lebar sm ke atas.
const SISI_KEPALA = { marginLeft: 'calc(-1 * max(16px, env(safe-area-inset-left, 0px)))', marginRight: 'calc(-1 * max(16px, env(safe-area-inset-right, 0px)))', paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))', paddingRight: 'max(16px, env(safe-area-inset-right, 0px))' };

export function AppHeader() {
  return (
    <header className="pattern bg-head text-head-ink" style={SISI_KEPALA}>
      <div className="mx-auto max-w-6xl py-3 sm:pb-5 sm:pt-8">
        <div className="flex min-w-0 items-center gap-3 sm:items-start sm:gap-4">
          <AppLogo size={44} className="shrink-0 sm:!h-14 sm:!w-14" />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-extrabold leading-tight sm:text-2xl">{MEREK.nama}</h1>
            <p className="text-xs font-medium leading-snug opacity-90 sm:text-base">Laboratorium Soal Ujian Madrasah Terintegrasi</p>
            <p dir="rtl" lang="ar" className="ar mt-1 hidden text-right text-lg opacity-80 sm:block" style={{ fontSize: '1.2rem', lineHeight: 1.9, textWrap: 'balance' }}>مختبر أسئلة امتحان المدرسة المتكامل</p>
          </div>
          <Jam />
        </div>
      </div>
    </header>
  );
}

/* ---------- Login & penjaga akses ---------- */
export const Centered = ({ children }) => (
  <div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center gap-4 py-10 text-center">{children}</div>
);

export const AppLogo = ({ size = 48, className = '' }) => (
  <img src={MEREK.logo} width={size} height={size} alt={`Logo ${MEREK.nama}`} decoding="async" className={className} style={{ width: size, height: size }} />
);
