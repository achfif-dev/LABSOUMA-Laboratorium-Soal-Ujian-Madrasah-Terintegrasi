// Tanya-jawab bersumber atas perpustakaan (aksi `tanyakitab`, src/telaahKitab.js), kini berbentuk percakapan dua arah: pertanyaan lanjutan dipahami dari riwayat,
// tetapi tiap giliran tetap mencari halaman sendiri. Setiap butir jawaban wajib punya kutipan yang terbukti ada di halaman kitab;
// jawaban yang kutipannya tidak cocok tidak ditampilkan. Ini telaah teks, bukan fatwa. Komponen mandiri: Btn, ErrorBox, callApi, apiErr dioper dari App.jsx.
import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, BookOpen, ShieldCheck, AlertTriangle, RotateCcw } from 'lucide-react';
import { hashBaca, idHalaman } from './lib/rujukan.js';
import { buatPemuat } from './lib/perpus.js';
import { SIMPANAN } from './PemilihKitab.jsx';
import { MAKS_PERTANYAAN, MAKS_KITAB_TANYA, alihkanPilihanKitab, saringPilihanKitab, susunRiwayat } from './lib/telaahKitab.js';

export const LABEL_VERIFIKASI = { cocok: 'Cocok dengan halaman', mirip: 'Mirip, cek manual', tidak_cocok: 'Tidak ditemukan di halaman', tanpa_kutipan: 'Tanpa kutipan', halaman_tidak_dikenal: 'Halaman tidak dikenal' };
export const BANNER_STATUS = {
  terverifikasi: { kelas: 'bg-ok-bg text-ok', teks: 'Seluruh dasar jawaban terbukti ada di halaman kitab.' },
  sebagian: { kelas: 'bg-warn-bg text-warn', teks: 'Sebagian dasar jawaban terbukti. Butir yang tidak cocok ditandai; jangan dipakai tanpa memeriksa kitab.' },
  tidak_terverifikasi: { kelas: 'bg-bad-bg text-bad', teks: 'Jawaban tidak ditampilkan: kutipannya tidak cocok dengan halaman.' },
  tidak_ditemukan: { kelas: 'bg-soft text-soft-ink', teks: 'Tidak ditemukan jawabannya di kitab yang dicari.' },
};
const kelasPoin = { cocok: 'bg-ok-bg text-ok', mirip: 'bg-warn-bg text-warn' };

function HasilJawaban({ hasil }) {
  const banner = BANNER_STATUS[hasil.status];
  return (
    <div className="space-y-3" role="region">
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
    </div>
  );
}

function JawabanBebas({ hasil }) {
  return (
    <div className="space-y-2" role="region">
      <p className="flex items-start gap-2 rounded-xl bg-warn-bg px-3 py-2 text-xs font-semibold text-warn"><AlertTriangle size={14} className="mt-0.5 shrink-0" />Jawaban bebas dari AI: tidak dicari dan tidak diverifikasi dari kitab. Bukan fatwa.</p>
      <p className="whitespace-pre-wrap text-sm text-ink">{hasil.jawaban}</p>
      {hasil.perluCek && <p className="text-xs text-mute">Memuat klaim hukum atau dalil. Periksa ke kitab: ajukan pertanyaan yang sama di mode Bersumber, atau tanyakan kepada kiai/ustadz.</p>}
    </div>
  );
}

export default function TanyaKitab({ Btn, ErrorBox, callApi, apiErr }) {
  const [daftar, setDaftar] = useState([]);
  const [terpilih, setTerpilih] = useState([]);        // [] = semua kitab aktif (server membatasi 4 kitab pertama menurut abjad); selain itu 1-4 kitab pilihan
  const [pertanyaan, setPertanyaan] = useState('');
  const [mode, setMode] = useState('sumber');         // 'sumber' = Tanya Kitab (diverifikasi, gagal-tertutup); 'bebas' = chat bebas (tidak diverifikasi)
  const [busy, setBusy] = useState(false);
  const [pesan, setPesan] = useState([]);              // percakapan: { id, role: 'user', teks } | { id, role: 'ai', hasil }
  const [err, setErr] = useState(null);
  const akhir = useRef(null);
  const nomor = useRef(0);
  useEffect(() => { if (pesan.length && akhir.current && akhir.current.scrollIntoView) akhir.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [pesan, busy]);
  // Daftar kitab memakai simpanan memori yang sama dengan Pemilih Kitab: tab dibuka-tutup tidak membaca ulang seluruh koleksi `kitab` di Firestore.
  useEffect(() => { let batal = false; buatPemuat((b) => callApi('/api/kitab', b), SIMPANAN).daftar(true).then((k) => { if (!batal) { const l = Array.isArray(k) ? k : []; setDaftar(l); setTerpilih((t) => saringPilihanKitab(t, l)); } }).catch(() => { /* daftar gagal dimuat: "semua kitab" tetap bisa dipakai */ }); return () => { batal = true; }; }, []);
  const tanya = async () => {
    const teks = pertanyaan.trim(); if (busy || teks.length < 3) return;
    const bebas = mode === 'bebas';
    const riwayat = susunRiwayat(pesan);                 // konteks pertanyaan lanjutan; server tetap mencari dan memverifikasi halaman untuk tiap giliran
    setBusy(true); setErr(null); setPertanyaan('');
    setPesan((p) => [...p, { id: ++nomor.current, role: 'user', teks }]);
    try {
      const d = await callApi('/api/assist', { aksi: bebas ? 'chatbebas' : 'tanyakitab', pertanyaan: teks, ...(riwayat.length ? { riwayat } : {}), ...(!bebas && terpilih.length ? { kitabIds: terpilih } : {}) });
      setPesan((p) => [...p, { id: ++nomor.current, role: 'ai', mode, hasil: d.hasil }]);
    } catch (e) {
      // Gagal: pertanyaan dikembalikan ke kotak tulis dan dilepas dari percakapan supaya bisa dikirim ulang tanpa mengetik lagi.
      setPesan((p) => p.slice(0, -1)); setPertanyaan(teks);
      const x = apiErr(e); if (x) setErr(x);
    } finally { setBusy(false); }
  };
  const baru = () => { setPesan([]); setErr(null); setPertanyaan(''); };
  const ok = pertanyaan.trim().length >= 3 && pertanyaan.length <= MAKS_PERTANYAAN;
  return (
    <section className="space-y-3 rounded-2xl border border-line bg-surface p-4" aria-label="Tanya kitab">
      <h2 className="flex items-center gap-2 text-sm font-bold text-ink"><Sparkles size={15} />Tanya kitab (AI, bersumber)</h2>
      <p className="text-xs text-mute">AI hanya menjawab dari halaman kitab di perpustakaan dan wajib menyertakan kutipan. Kutipan dicocokkan oleh mesin; yang tidak cocok ditandai. Ini telaah teks, bukan fatwa.</p>
      <div role="radiogroup" aria-label="Mode" className="grid grid-cols-2 gap-1 rounded-xl border border-line p-1 text-sm">
        {[['sumber', 'Bersumber (kitab)'], ['bebas', 'Bebas (ngobrol)']].map(([k, label]) => (
          <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => setMode(k)} className={`rounded-lg px-3 py-2 font-medium ${mode === k ? 'bg-brand text-brand-fg' : 'text-ink'}`}>{label}</button>))}
      </div>
      {mode === 'bebas' && <p className="rounded-xl bg-warn-bg px-3 py-2 text-xs text-warn">Mode bebas: AI menjawab dari pengetahuannya sendiri, tanpa membaca atau mengutip kitab. Jawaban tidak diverifikasi. Untuk hukum atau dalil, pakai mode Bersumber.</p>}
      {mode === 'sumber' && <details open={pesan.length === 0} className="space-y-2 rounded-xl border border-line px-3 py-2 text-sm">
        <summary className="cursor-pointer font-medium">Kitab yang dicari: {terpilih.length ? `${terpilih.length} dipilih` : 'semua kitab aktif'}</summary>
      <fieldset className="mt-2 space-y-2 text-sm">
        <legend className="sr-only">Kitab yang dicari</legend>
        <label className="flex items-start gap-2 rounded-lg border border-line px-3 py-2">
          <input type="radio" name="tk-mode" className="mt-1 accent-[var(--brand)]" checked={terpilih.length === 0} onChange={() => setTerpilih([])} />
          <span>Semua kitab aktif (maksimal {MAKS_KITAB_TANYA})
            {daftar.length > MAKS_KITAB_TANYA && terpilih.length === 0 && <span className="block text-xs text-warn">Ada {daftar.length} kitab aktif, tetapi hanya {MAKS_KITAB_TANYA} kitab pertama menurut abjad yang dicari. Pilih kitabnya sendiri di bawah.</span>}
          </span>
        </label>
        {daftar.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-mute">Atau pilih sendiri kitabnya ({terpilih.length}/{MAKS_KITAB_TANYA} dipilih):</p>
            <ul className="max-h-56 space-y-1 overflow-auto rounded-lg border border-line p-2" aria-label="Pilih kitab yang dicari">
              {daftar.map((k) => {
                const centang = terpilih.includes(k.id); const penuh = !centang && terpilih.length >= MAKS_KITAB_TANYA;
                return (
                  <li key={k.id}>
                    <label className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${penuh ? 'opacity-50' : ''}`}>
                      <input type="checkbox" className="accent-[var(--brand)]" checked={centang} disabled={penuh} onChange={() => setTerpilih((t) => alihkanPilihanKitab(t, k.id))} />
                      <span className="min-w-0 flex-1">{k.judulLatin}</span>
                    </label>
                  </li>);
              })}
            </ul>
            {terpilih.length >= MAKS_KITAB_TANYA && <p className="text-xs text-mute">Batas {MAKS_KITAB_TANYA} kitab tercapai. Hapus centang satu kitab untuk memilih yang lain.</p>}
          </div>)}
      </fieldset>
      {pesan.length > 0 && <p className="text-xs text-mute">Pilihan kitab berlaku untuk pertanyaan berikutnya.</p>}
      </details>}
      {pesan.length > 0 && (
        <div className="space-y-3" role="log" aria-live="polite" aria-label="Percakapan">
          {pesan.map((m) => m.role === 'user'
            ? <div key={m.id} className="flex justify-end"><p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand px-3 py-2 text-sm text-brand-fg">{m.teks}</p></div>
            : <div key={m.id} className="rounded-2xl rounded-bl-md border border-line bg-bg p-3">{m.mode === 'bebas' ? <JawabanBebas hasil={m.hasil} /> : <HasilJawaban hasil={m.hasil} />}</div>)}
          {busy && <p className="text-xs text-mute">{mode === 'bebas' ? 'Menulis balasan…' : 'Mencari dan membaca kitab…'}</p>}
          <div ref={akhir} />
        </div>)}
      {err && <ErrorBox e={err} />}
      <div className="space-y-2">
        <label className="block text-sm">{pesan.length ? 'Pertanyaan lanjutan' : 'Pertanyaan'}
          <textarea className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2" rows={2} maxLength={MAKS_PERTANYAAN} value={pertanyaan} onChange={(e) => setPertanyaan(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && ok && !busy) { e.preventDefault(); tanya(); } }}
            placeholder={pesan.length ? 'Contoh: Apa dalilnya? / Bagaimana kalau sedang safar?' : 'Contoh: Apa saja yang membatalkan wudhu?'} /></label>
        <div className="flex flex-wrap items-center gap-2">
          <Btn onClick={tanya} disabled={busy || !ok}>{busy ? (mode === 'bebas' ? 'Menulis…' : 'Mencari dan membaca…') : (pesan.length ? 'Kirim' : 'Tanya')}</Btn>
          {pesan.length > 0 && <button type="button" onClick={baru} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-xs disabled:opacity-50"><RotateCcw size={12} />Percakapan baru</button>}
        </div>
      </div>
    </section>
  );
}
