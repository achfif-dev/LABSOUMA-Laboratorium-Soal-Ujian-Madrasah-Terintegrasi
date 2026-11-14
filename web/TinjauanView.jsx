import { Btn, ErrorBox, Spin } from './ui.jsx';
import { Check, Sparkles } from 'lucide-react';
import { ASPEK, H3, QuestionView, VERDICT } from './bersama.jsx';

export function ButaView({ state }) {
  if (!state) return null;
  if (state.loading) return <Spin>Menguji soal tanpa kunci...</Spin>;
  if (state.error) return <div className="mt-2"><ErrorBox e={state.error} /></div>;
  const d = state.data;
  if (d.status === 'sepakat') return <p className="mt-2 rounded-lg bg-ok-bg px-3 py-2 text-xs font-semibold text-ok">Uji buta: penguji menjawab {d.jawaban}, sama dengan kunci.</p>;
  if (d.status === 'tanpa_kunci') return <p className="mt-2 text-xs text-mute">Pilih kunci jawaban dulu agar hasil uji bisa dibandingkan.</p>;
  return (
    <div className="mt-2 rounded-lg bg-bad-bg px-3 py-2 text-xs text-bad">
      <p className="font-semibold">Uji buta berbeda dari kunci: penguji menjawab “{d.jawaban === 'tidak_ada' ? 'tidak ada yang benar' : d.jawaban === 'lebih_dari_satu' ? 'lebih dari satu benar' : d.jawaban}”, kunci {d.kunci}.</p>
      {d.alasan && <p className="mt-1">{d.alasan}</p>}
      <p className="mt-1">Cek ulang kunci dan pengecoh sebelum mengirim ke editor.</p>
    </div>
  );
}

export function TelaahView({ state, onApply, onUseNotes }) {
  if (state.loading) return <Spin>Sedang menelaah soal terhadap teks kitab...</Spin>;
  if (state.error) return <ErrorBox e={state.error} />;
  const d = state.data;
  const [vl, vc] = VERDICT[d.verdict] || VERDICT.perlu_perbaikan;
  const p = d.perbaikan;
  const fixed = { stimulus: p.stimulus, pertanyaan: p.pertanyaan, opsi: { A: p.pilihan_a, B: p.pilihan_b, C: p.pilihan_c, D: p.pilihan_d, E: p.pilihan_e }, kunci: p.kunci_jawaban, pembahasan: p.pembahasan, indikator: p.indikator_kisi_kisi, bentuk: p.bentuk, jawaban: p.jawaban, rubrik: p.rubrik };
  return (
    <div className="space-y-3 text-sm">
      <p className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${vc}`}>{vl}</span>
        <span className="text-mute">{d.temuan.length ? `${d.temuan.length} temuan` : 'Tidak ada temuan'}</span></p>
      {d.temuan.length > 0 && (
        <ul className="space-y-2">
          {d.temuan.map((t, i) => (
            <li key={i} className="rounded-lg border border-line bg-surface px-3 py-2">
              <p className="flex flex-wrap items-center gap-2"><span className={`rounded-md px-2 py-px text-xs font-semibold ${t.tingkat === 'kritis' ? 'bg-bad-bg text-bad' : 'bg-soft text-soft-ink'}`}>{t.tingkat === 'kritis' ? 'Kritis' : 'Saran'}</span>
                <span className="text-xs font-semibold text-mute">{ASPEK[t.aspek]}</span></p>
              <p className="mt-1 leading-relaxed">{t.masalah}</p>
              <p className="mt-1 leading-relaxed text-mute"><span className="font-semibold text-ink">Saran: </span>{t.saran}</p>
            </li>
          ))}
        </ul>
      )}
      {d.ringkasan_perubahan && <p className="leading-relaxed text-mute"><span className="font-semibold text-ink">Perubahan: </span>{d.ringkasan_perubahan}</p>}
      <details className="rounded-lg border border-line bg-surface px-3 py-2">
        <summary className="cursor-pointer text-sm font-semibold text-soft-ink">Lihat soal hasil perbaikan</summary>
        <div className="mt-3"><QuestionView q={fixed} /></div>
      </details>
      <div className="flex flex-wrap gap-2">
        {onApply && <Btn kind="primary" onClick={onApply}><Check size={16} />Terapkan perbaikan ke form</Btn>}
        {onUseNotes && d.temuan.length > 0 && <Btn kind="ghost" onClick={() => onUseNotes(d.temuan.map((t) => `${ASPEK[t.aspek]}: ${t.masalah} ${t.saran}`).join('\n'))}>Pakai temuan sebagai catatan revisi</Btn>}
      </div>
      <p className="text-xs text-mute">Telaah AI membantu, bukan pengganti keputusan editor.</p>
    </div>
  );
}

export function AssistView({ state, onIdea }) {
  if (state.loading) return <Spin>{state.kind === 'terjemah' ? 'Sedang menerjemahkan teks kitab...' : 'Sedang menganalisis teks kitab...'}</Spin>;
  if (state.error) return <ErrorBox e={state.error} />;
  const d = state.data;
  if (state.kind === 'terjemah') {
    return (
      <div className="space-y-4 text-sm">
        <p className="whitespace-pre-wrap leading-relaxed">{d.terjemah}</p>
        {d.poin_inti.length > 0 && <div><H3>Poin inti</H3><ul className="list-disc space-y-1 pl-5">{d.poin_inti.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
        {d.istilah.length > 0 && (
          <div><H3>Istilah</H3>
            <ul className="space-y-1">{d.istilah.map((x, i) => (
              <li key={i} className="flex items-baseline gap-3"><span dir="rtl" lang="ar" className="ar ar-sm shrink-0 !leading-normal">{x.arab}</span><span>{x.arti}</span></li>))}</ul></div>
        )}
        <p className="text-xs text-mute">Draf terjemahan mesin (AI), belum ditinjau ustadz atau guru. Jangan dipakai sebagai kunci atau pembahasan sebelum dicocokkan dengan kitab terjemahan atau ditinjau orang yang menguasai kitabnya.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4 text-sm">
      <p className="font-semibold leading-relaxed">{d.tema}</p>
      {d.kandungan.length > 0 && <div><H3>Yang ditegaskan teks</H3><ul className="list-disc space-y-1 pl-5">{d.kandungan.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
      <div><H3>Ide soal</H3>
        <ul className="space-y-2">{d.ide_soal.map((x, i) => (
          <li key={i} className="rounded-lg border border-line bg-surface px-3 py-2">
            <p className="flex items-start gap-2"><span className="mt-0.5 shrink-0 rounded-md bg-soft px-2 py-px text-xs font-bold text-soft-ink">{x.level}</span><span className="min-w-0 flex-1 leading-relaxed">{x.fokus}</span></p>
            {x.alasan && <p className="mt-1 text-xs leading-relaxed text-mute">{x.alasan}</p>}
            <button type="button" onClick={() => onIdea(x)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-soft-ink hover:underline"><Sparkles size={13} />Buat soal dari fokus ini</button>
          </li>))}</ul></div>
      {d.potensi_pengecoh.length > 0 && <div><H3>Calon pengecoh</H3><ul className="list-disc space-y-1 pl-5">{d.potensi_pengecoh.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
      {d.catatan_khilaf && <div><H3>Perbedaan pendapat dalam teks</H3><p className="leading-relaxed">{d.catatan_khilaf}</p></div>}
    </div>
  );
}
