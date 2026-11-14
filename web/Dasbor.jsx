import { useEffect, useMemo, useState } from 'react';
import { Btn, ErrorBox, Section, apiErr, callApi } from './ui.jsx';
import * as DB from './lib/dasbor.js';
import { ClipboardCheck, Loader2, RefreshCw, Sparkles, Users } from 'lucide-react';
import { ROLE_LABEL } from './bersama.jsx';

/* ---------- Dasbor admin: kuota AI per pengguna, sisa kuota harian, antrean review ---------- */
// Kuota dibaca di server (/api/admin-stats) dari dokumen rate/{id}; hitungan hanya untuk HARI INI (WIB), tanpa riwayat. Antrean review dihitung dari
// soal pending yang sudah dimuat realtime di App, jadi tidak menambah bacaan Firestore.
const KUOTA_LABEL = { aman: ['Aman', 'bg-ok-bg text-ok'], hampir: ['Hampir habis', 'bg-warn-bg text-warn'], habis: ['Habis', 'bg-bad-bg text-bad'] };

const KUOTA_WARNA = { aman: 'bg-ok', hampir: 'bg-warn', habis: 'bg-bad' };

const BadgeKuota = ({ status }) => <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${KUOTA_LABEL[status][1]}`}>{KUOTA_LABEL[status][0]}</span>;

const BatangKuota = ({ persen, status, label }) => (
  <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={persen} className="h-2 w-full overflow-hidden rounded-full bg-soft">
    <div className={`h-full rounded-full ${KUOTA_WARNA[status]}`} style={{ width: persen + '%' }} />
  </div>
);

const UMUR_CLS = { baru: 'text-mute', waspada: 'text-warn', lewat: 'text-bad' };

export function Dasbor({ pending, onBukaReview }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [semua, setSemua] = useState(false);
  const [waktu, setWaktu] = useState(0);
  const muat = async () => {
    setBusy(true);
    try { setD(await callApi('/api/admin-stats', { semua })); setWaktu(Date.now()); setErr(null); }
    catch (e) { setErr(apiErr(e)); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    muat();
    const t = setInterval(() => { if (document.visibilityState !== 'hidden') muat(); }, 120000);
    return () => clearInterval(t);
  }, [semua]);
  const antrean = useMemo(() => DB.ringkasAntrean(pending, Date.now()), [pending, waktu]);
  return <DasborView d={d} err={err} busy={busy} semua={semua} setSemua={setSemua} waktu={waktu} onMuat={muat} antrean={antrean} onBukaReview={onBukaReview} />;
}

// Tampilan murni (tanpa pengambilan data): dirender langsung di tes dengan data contoh.
export function DasborView({ d, err, busy, semua, setSemua, waktu, onMuat, antrean, onBukaReview }) {
  const kolamBermasalah = d ? d.kolam.filter((k) => k.status !== 'aman') : [];
  return (
    <div className="fade-in space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
        <p className="mr-auto text-mute">
          {d ? <>Kuota direset otomatis pukul 00.00 WIB, <b className="text-ink">{DB.teksSisaWaktu(d.resetDalamDetik)}</b> lagi. </> : null}
          {waktu ? `Diperbarui ${new Date(waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}; otomatis tiap 2 menit.` : 'Memuat...'}
        </p>
        <Btn kind="ghost" onClick={onMuat} disabled={busy}>{busy ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />}Segarkan</Btn>
      </div>
      {err && <ErrorBox e={err} />}
      {kolamBermasalah.map((k) => (
        <p key={k.id} role="alert" className={`rounded-xl px-4 py-3 text-sm ${k.status === 'habis' ? 'bg-bad-bg text-bad' : 'bg-warn-bg text-warn'}`}>
          <b>{k.status === 'habis' ? 'Kuota AI ' : 'Kuota AI hampir habis: '}{k.label}{k.status === 'habis' ? ' sudah habis.' : ` (${k.dipakai}/${k.batas}).`}</b>{' '}
          {k.status === 'habis' ? 'Semua permintaan AI kelompok ini ditolak sampai reset. ' : ''}Naikkan <code>{k.env}</code> di Vercel (Environment Variables) lalu Redeploy, atau tunggu reset.
        </p>
      ))}
      {!d && !err && <div className="flex justify-center py-12 text-mute"><Loader2 className="spin" /></div>}

      {d && (
        <Section title="Plafon harian AI" icon={Sparkles}>
          <div className="grid gap-3 sm:grid-cols-2">
            {d.kolam.map((k) => (
              <div key={k.id} className="rounded-xl border border-line p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{k.label}</p><BadgeKuota status={k.status} /></div>
                <p className="mb-2 text-2xl font-extrabold">{k.dipakai}<span className="text-base font-semibold text-mute"> / {k.batas}</span></p>
                <BatangKuota persen={k.persen} status={k.status} label={'Plafon ' + k.label} />
                <p className="mt-2 text-xs text-mute">Sisa <b className="text-ink">{k.sisa}</b> permintaan hari ini, dipakai semua pengguna kelompok ini bersama.</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {d && (
        <Section title="Pemakaian AI per pengguna (hari ini)" icon={Users}
          action={<label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={semua} onChange={(e) => setSemua(e.target.checked)} />Tampilkan juga yang belum memakai</label>}>
          {!d.pengguna.length ? <p className="text-sm text-mute">Belum ada yang memakai AI hari ini.</p> : (
            <>
            <ul className="divide-y divide-line sm:hidden">
              {d.pengguna.map((r) => (
                <li key={r.uid} className="space-y-2 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="break-words font-semibold">{r.nama}</p><p className="break-all text-xs text-mute">{ROLE_LABEL[r.role] || r.role || 'Tidak dikenal'}{r.email && r.email !== r.nama ? ' · ' + r.email : ''}</p></div>
                    <BadgeKuota status={r.status} />
                  </div>
                  <BatangKuota persen={r.persen} status={r.status} label={'Kuota ' + r.nama} />
                  <p className="text-xs text-mute">Terpakai <b className="text-ink">{r.dipakai} / {r.batas}</b> · sisa <b className="text-ink">{r.sisa}</b></p>
                </li>
              ))}
            </ul>
            <div className="overflow-x-auto max-sm:hidden">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-wide text-mute">
                  <tr><th className="px-2 py-2">Pengguna</th><th className="px-2 py-2">Terpakai</th><th className="w-32 px-2 py-2"><span className="sr-only">Proporsi</span></th><th className="px-2 py-2">Sisa</th><th className="px-2 py-2">Status</th></tr>
                </thead>
                <tbody>
                  {d.pengguna.map((r) => (
                    <tr key={r.uid} className="border-b border-line last:border-0">
                      <td className="px-2 py-2.5"><p className="font-semibold">{r.nama}</p><p className="text-xs text-mute">{ROLE_LABEL[r.role] || r.role || 'Tidak dikenal'}{r.email && r.email !== r.nama ? ' · ' + r.email : ''}</p></td>
                      <td className="whitespace-nowrap px-2 py-2.5 font-semibold">{r.dipakai} / {r.batas}</td>
                      <td className="px-2 py-2.5"><BatangKuota persen={r.persen} status={r.status} label={'Kuota ' + r.nama} /></td>
                      <td className="px-2 py-2.5">{r.sisa}</td>
                      <td className="px-2 py-2.5"><BadgeKuota status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
          <p className="mt-3 text-xs leading-relaxed text-mute">
            Total {d.totalHariIni} permintaan hari ini{d.penggunaHabis > 0 ? `; ${d.penggunaHabis} pengguna sudah kena batas hariannya` : ''}. Permintaan yang gagal di sisi server sudah dikembalikan dan tidak dihitung.
            Hanya hari ini yang tersimpan; belum ada riwayat harian atau bulanan.{d.terpotong ? ' Daftar dipotong 300 baris.' : ''}
          </p>
        </Section>
      )}

      <Section title="Antrean review" icon={ClipboardCheck} action={<Btn kind="ghost" onClick={onBukaReview}><ClipboardCheck size={15} />Buka Review</Btn>}>
        {!antrean.total ? <p className="text-sm text-mute">Tidak ada soal yang menunggu review.</p> : (
          <div className="space-y-3">
            <p className="text-sm"><b>{antrean.total}</b> soal menunggu review; yang tertua <b className={UMUR_CLS[DB.tandaUmur(antrean.tertuaHari)]}>{DB.teksUmur(antrean.tertuaHari)}</b>.</p>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {antrean.lewat > 0 && <span className="rounded-full bg-bad-bg px-2.5 py-0.5 text-bad">{antrean.lewat} lewat {DB.HARI_LEWAT} hari</span>}
              {antrean.waspada > 0 && <span className="rounded-full bg-warn-bg px-2.5 py-0.5 text-warn">{antrean.waspada} lewat {DB.HARI_WASPADA} hari</span>}
              {antrean.perluAlasan > 0 && <span className="rounded-full bg-warn-bg px-2.5 py-0.5 text-warn">{antrean.perluAlasan} perlu catatan alasan (kutipan tak cocok / uji buta berbeda)</span>}
            </div>
            <p className="text-xs text-mute">Per penyusun: {antrean.perPenyusun.map((x) => `${x.nama} (${x.jumlah})`).join(', ')}</p>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {antrean.tertua.map((t) => (
                <li key={t.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1"><span className="line-clamp-2">{t.pertanyaan || '(tanpa pertanyaan)'}</span><span className="block text-xs text-mute">{[t.nama, t.authorName].filter(Boolean).join(' · ')}{t.perluAlasan ? ' · perlu alasan' : ''}</span></span>
                  <span className={`shrink-0 text-xs font-semibold ${UMUR_CLS[DB.tandaUmur(t.hari)]}`}>{DB.teksUmur(t.hari)}</span>
                </li>
              ))}
            </ul>
            {antrean.total > antrean.tertua.length && <p className="text-xs text-mute">Menampilkan {antrean.tertua.length} tertua dari {antrean.total}.</p>}
          </div>
        )}
      </Section>
    </div>
  );
}
