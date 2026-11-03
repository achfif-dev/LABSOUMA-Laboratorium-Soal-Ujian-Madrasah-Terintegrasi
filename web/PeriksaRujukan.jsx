// Periksa satu soal terhadap halaman kitab yang dirujuknya (aksi `periksarujukan`, src/periksaRujukan.js). Gratis: tanpa AI dan tanpa kuota AI.
// Pemeriksaan otomatis berbasis kata: menangkap kunci yang tidak ada di sumber atau pengecoh yang lebih cocok dengan sumber, bukan pengganti penelaahan ustadz.
import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

export const LABEL_PERIKSA = {
  selaras: { teks: 'Selaras dengan halaman rujukan', kelas: 'bg-ok-bg text-ok' },
  perlu_dicek: { teks: 'Perlu dicek manual', kelas: 'bg-warn-bg text-warn' },
  tidak_selaras: { teks: 'Tidak selaras dengan halaman rujukan', kelas: 'bg-bad-bg text-bad' },
  tidak_dapat_dinilai: { teks: 'Tidak dapat dinilai otomatis', kelas: 'bg-soft text-soft-ink' },
};

/** Soal dari isian formulir/daftar -> bentuk yang dikirim (hanya bidang yang dibaca server). */
export const soalUntukPeriksa = (q) => ({ bentuk: q.bentuk || 'pilgan', kunci: q.kunci || '', opsi: q.opsi || {}, pertanyaan: q.pertanyaan || '', stimulus: q.stimulus || '', pembahasan: q.pembahasan || '', jawaban: q.jawaban || '', rubrik: q.rubrik || '', kitabId: q.kitabId || '', halId: q.halId || '', halIdAkhir: q.halIdAkhir || '' });

export default function PeriksaRujukan({ Btn, ErrorBox, callApi, apiErr, soal }) {
  const [busy, setBusy] = useState(false); const [hasil, setHasil] = useState(null); const [err, setErr] = useState(null);
  const periksa = async () => {
    setBusy(true); setErr(null); setHasil(null);
    try { const d = await callApi('/api/assist', { aksi: 'periksarujukan', soal: soalUntukPeriksa(soal) }); setHasil(d.hasil); }
    catch (e) { const x = apiErr(e); if (x) setErr(x); } finally { setBusy(false); }
  };
  const lb = hasil && LABEL_PERIKSA[hasil.status];
  return (
    <div className="space-y-2">
      <Btn kind="soft" className="!text-xs" onClick={periksa} disabled={busy}><ShieldCheck size={13} />{busy ? 'Memeriksa…' : 'Periksa dengan halaman rujukan'}</Btn>
      {err && <ErrorBox e={err} />}
      {hasil && (
        <div className="space-y-2 rounded-xl border border-line bg-bg p-3 text-xs" role="status" aria-live="polite">
          <p className={`inline-block rounded-full px-2.5 py-1 font-semibold ${lb.kelas}`}>{lb.teks}</p>
          {hasil.kunci && hasil.kunci.catatan && <p className="text-ink">{hasil.kunci.catatan}</p>}
          {(hasil.temuan || []).map((t, i) => <p key={i} className={t.tingkat === 'kritis' ? 'font-semibold text-bad' : 'text-mute'}>{t.tingkat === 'kritis' ? 'Kritis: ' : 'Saran: '}{t.teks}</p>)}
          {hasil.kutipan && hasil.kutipan.ringkas.total > 0 && <p className="text-mute">Kutipan Arab: {hasil.kutipan.ringkas.cocok} cocok, {hasil.kutipan.ringkas.mirip} mirip, {hasil.kutipan.ringkas.tidak_ditemukan} tidak ditemukan.</p>}
          {hasil.sumber && <p className="text-mute">Dibandingkan dengan {hasil.sumber.judul}, urutan {hasil.sumber.dari}{hasil.sumber.sampai > hasil.sumber.dari ? `–${hasil.sumber.sampai}` : ''}. Ini pemeriksaan kata, bukan pemahaman makna; tetap perlu ditinjau ustadz.</p>}
        </div>)}
    </div>
  );
}
