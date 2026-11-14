import { Btn, Draft, Label, apiErr, callApi, labelPaket, useAlur, useCfg, useDraftSync } from './ui.jsx';
import * as AL from './lib/alurSoal.js';
import { useMemo, useState } from 'react';
import { bahasaOtomatis } from './lib/bahasa.js';
import { Bt } from './lib/dasar.js';
import * as LK from './lib/lebarKolom.js';
import { Check, CheckCircle2, ClipboardCheck, Loader2, PenLine, Quote, RotateCcw, ShieldCheck } from 'lucide-react';
import * as PK from './lib/paket.js';
import { Empty, Meta, QuestionView, RefArab, SourceLink, TahapChip, TautKitab, refText } from './bersama.jsx';
import { ButaView, TelaahView } from './TinjauanView.jsx';

/* ---------- Tab 2: Review ---------- */
function ReviewCard({ q, onApprove, onRevise, me }) {
  const own = q.authorUid === me.uid && me.role !== 'admin';
  const alur = useAlur();
  const izin = AL.bolehTinjau(me, q, alur); // bukan penentu (server yang menentukan); hanya agar tombol dan pesannya jujur
  const akhir = izin.tahap >= izin.total; // tahap terakhir (atau alur satu tahap): Setujui = Approved
  const terkunci = !izin.ok;
  const [note, setNote] = useState(() => { const d = Draft.read('catatan:' + q.id); return typeof d === 'string' ? d.slice(0, 1000) : ''; });
  useDraftSync('catatan:' + q.id, note, !note.trim());
  const [err, setErr] = useState(false);
  const [tl, setTl] = useState(null);
  const [errOk, setErrOk] = useState(false);
  const [buta, setButa] = useState(null);
  const K = window.Kutipan;
  const kutLive = useMemo(() => (K && q.teks && q.pembahasan ? K.periksaKutipan(K.bidangDariSoal(q), q.teks).status : ''), [K, q.teks, q.pembahasan, q.stimulus, q.pertanyaan, q.opsi]);
  const a = q.ai || {};
  const alasanOverride = [
    (kutLive === 'gagal' || a.verifikasi === 'gagal') && 'ada kutipan Arab yang tidak ada di teks kitab',
    (a.buta === 'beda' || (buta && buta.data && buta.data.status === 'beda')) && 'uji jawab buta berbeda dari kunci',
  ].filter(Boolean);
  const runButa = async () => {
    setButa({ loading: true });
    try {
      const d = await callApi('/api/assist', { aksi: 'cekbuta', teks: q.teks, bahasa: bahasaOtomatis(q.teks), nama: q.nama, tingkat: q.tingkat, level: q.level, bentuk: Bt.bentukDari(q), soal: { stimulus: q.stimulus, pertanyaan: q.pertanyaan, opsi: q.opsi, kunci: q.kunci } });
      setButa({ data: d.hasil });
    } catch (e) { const er = apiErr(e); setButa(er ? { error: er } : null); }
  };
  const setujui = () => {
    if (akhir && alasanOverride.length && !note.trim()) { setErrOk(true); return; }
    // Meloloskan ke editor berikutnya: catatan opsional (tersimpan di jejak tinjauan). Persetujuan akhir: catatan override bila ada peringatan.
    onApprove(q.id, !akhir ? note.trim().slice(0, 300) : (alasanOverride.length ? `[Disetujui dengan catatan] ${note.trim()}`.slice(0, 1000) : ''));
  };
  const runTelaah = async () => {
    setTl({ loading: true });
    try {
      const d = await callApi('/api/assist', {
        aksi: 'telaah', teks: q.teks, bahasa: bahasaOtomatis(q.teks), nama: q.nama, juz: q.juz, hal: q.hal, tingkat: q.tingkat, mapel: q.mapel, level: q.level, bentuk: Bt.bentukDari(q), kitabId: q.kitabId || '',
        soal: { stimulus: q.stimulus, pertanyaan: q.pertanyaan, opsi: q.opsi, kunci: q.kunci, pembahasan: q.pembahasan, indikator: q.indikator || '', jawaban: q.jawaban || '', rubrik: q.rubrik || '' },
      });
      setTl({ data: d.hasil });
    } catch (e) { const er = apiErr(e); setTl(er ? { error: er } : null); }
  };
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2"><TahapChip q={q} /><Meta q={q} /></div>
        <span className="text-xs text-mute">{q.authorName ? `Oleh ${q.authorName} · ` : ''}{refText(q)}<RefArab q={q} /><TautKitab q={q} /></span>
      </header>
      <div className="grid md:[grid-template-columns:var(--kolom)]" style={{ '--kolom': LK.lebarKolom((q.teks || '').length, LK.panjangSoal(q)).css }}>
        <div className="min-w-0 border-b border-line p-4 sm:p-5 md:border-b-0 md:border-r">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-mute"><Quote size={14} />Teks Kitab Asli</h3>
          <div className="rounded-xl bg-soft px-4 py-2"><p dir="rtl" lang="ar" className="ar text-soft-ink">{q.teks || '—'}</p></div>
          <p className="mt-2 text-xs text-mute">{refText(q)}<RefArab q={q} /><TautKitab q={q} /></p>
          {q.sumberUrl && <p className="mt-1 text-xs text-mute">Sumber: <SourceLink url={q.sumberUrl} /></p>}
        </div>
        <div className="min-w-0 p-4 sm:p-5">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-mute"><PenLine size={14} />Naskah Soal</h3>
          <QuestionView q={q} />
        </div>
      </div>
      <footer className="border-t border-line bg-bg px-4 py-4 sm:px-5">
        <div className="mb-4">
          <Btn kind="soft" onClick={runTelaah} disabled={!!(tl && tl.loading)}>
            {tl && tl.loading ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}Telaah AI
          </Btn>
          {Bt.punyaOpsi(q) && (
            <Btn kind="soft" className="ml-2" onClick={runButa} disabled={!!(buta && buta.loading)}>
              {buta && buta.loading ? <Loader2 size={16} className="spin" /> : <Check size={16} />}Uji jawab buta
            </Btn>
          )}
          <ButaView state={buta} />
          {tl && <div className="mt-3"><TelaahView state={tl} onUseNotes={(t) => { setNote(t.slice(0, 1000)); setErr(false); }} /></div>}
        </div>
        {alasanOverride.length > 0 && (
          <div role="alert" className="mb-3 rounded-lg bg-bad-bg px-3 py-2 text-xs text-bad">
            <p className="font-semibold">Peringatan sebelum menyetujui: {alasanOverride.join('; ')}.</p>
            <p className="mt-1">{akhir ? 'Soal ini baru bisa disetujui bila Anda menulis catatan alasan di kolom di bawah (override). Catatan tersimpan bersama soal.' : 'Catatan alasan akan diwajibkan saat persetujuan akhir. Pertimbangkan meminta revisi sekarang.'}</p>
            {errOk && <p className="mt-1 font-semibold">Tulis catatan alasan lebih dulu.</p>}
          </div>
        )}
        {q.sumberUrl && <p className="mb-3 text-xs text-mute">Tautan sumber diisi penyusun dan tidak otomatis terikat ke teks di atas. Cocokkan sendiri bila perlu.</p>}
        <Label htmlFor={'note-' + q.id}>Catatan Revisi</Label>
        <textarea id={'note-' + q.id} rows={2} className={`field ${err ? '!border-[var(--bad)]' : ''}`} placeholder="Wajib diisi bila meminta revisi"
          value={note} onChange={(e) => { setNote(e.target.value); setErr(false); setErrOk(false); }} />
        {err && <p className="mt-1 text-xs font-medium text-bad">Tulis catatan revisi agar penyusun tahu apa yang diperbaiki.</p>}
        {own && <p className="mt-2 text-xs font-medium text-warn">Anda penyusun soal ini. Soal harus ditinjau editor lain.</p>}
        {!own && terkunci && <p className="mt-2 text-xs font-medium text-warn">{izin.alasan}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn kind="primary" disabled={own || terkunci} onClick={setujui}><CheckCircle2 size={16} />{akhir ? 'Setujui Soal' : `Loloskan ke Editor ${izin.tahap + 1}`}</Btn>
          <Btn kind="danger" disabled={own || terkunci} onClick={() => { if (!note.trim()) { setErr(true); return; } onRevise(q.id, note.trim()); }}><RotateCcw size={16} />Minta Revisi</Btn>
        </div>
      </footer>
    </article>
  );
}

export function Review({ list, all = [], onApprove, onRevise, me }) {
  const cfg = useCfg();
  const alur = useAlur();
  const kel = useMemo(() => PK.kelompokPaket(list, all), [list, all]);
  if (me.role !== 'editor' && me.role !== 'admin') return <Empty icon={ShieldCheck} title="Tab ini untuk editor" text="Hanya editor dan admin yang dapat meninjau soal. Pantau status soal Anda di tab Bank Soal dengan filter status." />;
  // Editor baru belum punya tahap: pada mapel bertahap antreannya kosong. Beri tahu sebabnya, jangan tampak seolah tidak ada pekerjaan.
  const belumDitugaskan = alur.aktif && me.role === 'editor' && AL.tahapDitugaskan(me).length === 0;
  if (!list.length) return <Empty icon={ClipboardCheck} title={belumDitugaskan ? 'Anda belum ditugaskan ke tahap editor' : 'Tidak ada soal yang menunggu review'} text={belumDitugaskan ? 'Peninjauan bertahap sedang aktif. Soal pada mapel bertahap baru muncul setelah admin menugaskan Anda ke tahap 1, 2, atau 3 (menu Pengguna).' : 'Soal yang dikirim dari tab Penyusunan Soal akan muncul di sini.'} />;
  return (
    <div className="fade-in space-y-5">
      {kel.paket.map((g) => (
        <section key={g.id} aria-label={labelPaket(cfg, g)} className="space-y-4 rounded-2xl border-2 border-brand/40 bg-soft/40 p-3 sm:p-4">
          <header className="px-1">
            <h3 className="text-sm font-bold">Paket {labelPaket(cfg, g)}</h3>
            {g.cakupan && <p className="text-xs text-soft-ink">Batas materi: {g.cakupan}</p>}
            <p className="text-xs text-mute">{g.soal.length} butir menunggu review · Approved {g.status.approved} · Revisi {g.status.revision} · Draft (belum dikirim) {g.status.draft}. Review tetap per butir; butir yang dikembalikan tetap berada dalam paket ini.</p>
          </header>
          {g.soal.map((q) => <ReviewCard key={q.id} q={q} me={me} onApprove={onApprove} onRevise={onRevise} />)}
        </section>
      ))}
      {kel.paket.length > 0 && kel.lepas.length > 0 && <h3 className="px-1 text-sm font-bold text-soft-ink">Soal lepas (bukan bagian paket)</h3>}
      {kel.lepas.map((q) => <ReviewCard key={q.id} q={q} me={me} onApprove={onApprove} onRevise={onRevise} />)}
    </div>
  );
}
