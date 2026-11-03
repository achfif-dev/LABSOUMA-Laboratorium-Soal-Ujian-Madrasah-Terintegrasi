// Tanya-jawab bersumber atas perpustakaan (aksi `tanyakitab`, src/telaahKitab.js). Setiap butir jawaban wajib punya kutipan yang terbukti ada di halaman kitab;
// jawaban yang kutipannya tidak cocok tidak ditampilkan. Ini telaah teks, bukan fatwa. Komponen mandiri: Btn, ErrorBox, callApi, apiErr dioper dari App.jsx.
import React, { useEffect, useState } from 'react';
import { Sparkles, BookOpen, ShieldCheck, AlertTriangle } from 'lucide-react';
import { hashBaca, idHalaman } from './lib/rujukan.js';
import { MAKS_PERTANYAAN } from './lib/telaahKitab.js';

export const LABEL_VERIFIKASI = { cocok: 'Cocok dengan halaman', mirip: 'Mirip, cek manual', tidak_cocok: 'Tidak ditemukan di halaman', tanpa_kutipan: 'Tanpa kutipan', halaman_tidak_dikenal: 'Halaman tidak dikenal' };
export const BANNER_STATUS = {
  terverifikasi: { kelas: 'bg-ok-bg text-ok', teks: 'Seluruh dasar jawaban terbukti ada di halaman kitab.' },
  sebagian: { kelas: 'bg-warn-bg text-warn', teks: 'Sebagian dasar jawaban terbukti. Butir yang tidak cocok ditandai; jangan dipakai tanpa memeriksa kitab.' },
  tidak_terverifikasi: { kelas: 'bg-bad-bg text-bad', teks: 'Jawaban tidak ditampilkan: kutipannya tidak cocok dengan halaman.' },
  tidak_ditemukan: { kelas: 'bg-soft text-soft-ink', teks: 'Tidak ditemukan jawabannya di kitab yang dicari.' },
};
const kelasPoin = { cocok: 'bg-ok-bg text-ok', mirip: 'bg-warn-bg text-warn' };

export default function TanyaKitab({ Btn, ErrorBox, callApi, apiErr }) {
  const [daftar, setDaftar] = useState([]);
  const [kitabId, setKitabId] = useState('');          // '' = semua kitab aktif (server membatasi 4 kitab pertama)
  const [pertanyaan, setPertanyaan] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasil, setHasil] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { let batal = false; callApi('/api/kitab', { aksi: 'perpus-daftar' }).then((d) => { if (!batal) setDaftar(d.kitab || []); }).catch(() => { /* daftar gagal dimuat: "semua kitab" tetap bisa dipakai */ }); return () => { batal = true; }; }, []);
  const tanya = async () => {
    setBusy(true); setErr(null); setHasil(null);
    try {
      const d = await callApi('/api/assist', { aksi: 'tanyakitab', pertanyaan, ...(kitabId ? { kitabIds: [kitabId] } : {}) });
      setHasil(d.hasil);
    } catch (e) { const x = apiErr(e); if (x) setErr(x); } finally { setBusy(false); }
  };
  const ok = pertanyaan.trim().length >= 3 && pertanyaan.length <= MAKS_PERTANYAAN;
  const banner = hasil && BANNER_STATUS[hasil.status];
  return (
    <section className="space-y-3 rounded-2xl border border-line bg-surface p-4" aria-label="Tanya kitab">
      <h2 className="flex items-center gap-2 text-sm font-bold text-ink"><Sparkles size={15} />Tanya kitab (AI, bersumber)</h2>
      <p className="text-xs text-mute">AI hanya menjawab dari halaman kitab di perpustakaan dan wajib menyertakan kutipan. Kutipan dicocokkan oleh mesin; yang tidak cocok ditandai. Ini telaah teks, bukan fatwa.</p>
      <label className="block text-sm">Kitab yang dicari
        <select className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2" value={kitabId} onChange={(e) => setKitabId(e.target.value)}>
          <option value="">Semua kitab aktif (maksimal 4)</option>
          {daftar.map((k) => <option key={k.id} value={k.id}>{k.judulLatin}</option>)}
        </select></label>
      <label className="block text-sm">Pertanyaan
        <textarea className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2" rows={3} maxLength={MAKS_PERTANYAAN} value={pertanyaan} onChange={(e) => setPertanyaan(e.target.value)} placeholder="Contoh: Apa saja yang membatalkan wudhu?" /></label>
      <Btn onClick={tanya} disabled={busy || !ok}>{busy ? 'Mencari dan membaca…' : 'Tanya'}</Btn>
      {err && <ErrorBox e={err} />}
      {hasil && (
        <div className="space-y-3" role="region" aria-live="polite">
          {banner && <p className={`flex items-start gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${banner.kelas}`}><ShieldCheck size={14} className="mt-0.5 shrink-0" />{banner.teks}</p>}
          {(hasil.peringatan || []).map((t) => <p key={t} className="flex items-start gap-2 rounded-xl bg-warn-bg px-3 py-2 text-xs text-warn"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{t}</p>)}
          {hasil.jawaban && (
            <div className="space-y-1">
              <p className="whitespace-pre-wrap text-sm text-ink">{hasil.jawaban}</p>
              {hasil.khilaf && <p className="text-xs text-mute">Perbedaan pendapat yang disebut kitab: {hasil.khilaf}</p>}
              {hasil.status !== 'tidak_ditemukan' && <p className="text-xs text-mute">{hasil.dasarMadrasah ? 'Seluruh dasar berasal dari kitab pegangan atau rujukan yang ditetapkan admin.' : 'Belum semua dasar berasal dari kitab pegangan/rujukan madrasah; ini pendapat kitab yang tertera, bukan ketentuan madrasah.'}</p>}
            </div>)}
          {hasil.catatan && <p className="text-xs text-mute">{hasil.catatan}</p>}
          {(hasil.poin || []).length > 0 && (
            <ol className="space-y-2">
              {hasil.poin.map((p, i) => (
                <li key={i} className="space-y-1 rounded-xl border border-line bg-bg p-3 text-sm">
                  <p className="text-ink">{p.pernyataan}</p>
                  <p dir="rtl" lang="ar" className="font-sans text-base leading-loose text-ink">{p.kutipan}</p>
                  <p className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${kelasPoin[p.status] || 'bg-bad-bg text-bad'}`}>{LABEL_VERIFIKASI[p.status] || p.status}</span>
                    {p.dikoreksi && <span className="text-mute">halaman dikoreksi mesin</span>}
                    {p.ocrBelumDicocokkan && <span className="text-warn">halaman OCR belum dicocokkan</span>}
                    {p.kitabId && <a className="inline-flex items-center gap-1 underline" target="_blank" rel="noreferrer" href={hashBaca({ kitabId: p.kitabId, halId: idHalaman(p.seq), halIdAkhir: '' })}><BookOpen size={12} />{p.kitab}, juz {p.juz}, hal. {p.hal}</a>}
                  </p>
                </li>))}
            </ol>)}
          {(hasil.kitabDicari || []).length > 0 && <p className="text-xs text-mute">Dicari di: {hasil.kitabDicari.map((k) => k.judul).join(', ')}. Kata kunci: {(hasil.kueri || []).join(' | ')}</p>}
        </div>)}
    </section>
  );
}
