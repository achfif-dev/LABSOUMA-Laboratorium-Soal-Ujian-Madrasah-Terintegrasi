// Alat AI di pembaca kitab: terjemah, analisis, ekstrak fakta, dan kirim ke Penyusunan Soal, atas teks yang diblok pembaca (atau halaman yang tampil bila tidak ada blok).
// Memakai aksi server yang sama dengan Penyusunan Soal (/api/assist: terjemah, analisis, fakta), jadi validasi, kuota, otoritas kitab, dan pemeriksaan kutipan identik.
// Pembuatan soal TIDAK dilakukan di sini: bentuk soal, level, jenjang, batas ujian, dan uji buta hidup di Penyusunan Soal. Tombol "Buat soal" memindahkan teks dan rujukan ke sana (web/lib/pilihanBaca.js).
// `Btn`, `callApi`, `apiErr` dioper dari App.jsx (galat ditampilkan oleh AssistView dan FaktaTeks). `cakupan` = hasil susunCakupan (dihitung PembacaKitab). `konteks` = { tingkat, mapel, bentuk, level } dari form Penyusunan Soal.
import React, { useRef, useState } from 'react';
import { FileSearch, Languages, ListChecks, Plus, Sparkles, X, AlertTriangle } from 'lucide-react';
import { AssistView } from './TinjauanView.jsx';
import FaktaTeks from './FaktaTeks.jsx';
import { faktaBasi, pilihFaktaBerikut } from './lib/fakta.js';
import { masalahCakupan } from './lib/pilihanBaca.js';
import { kenaliDisiplin } from './lib/petaTeks.js';

const LABEL_MODE = { pilihan: 'Teks terpilih', halaman: 'Halaman yang tampil', kosong: 'Belum ada teks' };

export default function AlatTeksKitab({ Btn, callApi, apiErr, kitab, kitabId, cakupan, arab = true, konteks = {}, formTerisi = false, onKirim, onHapusPilihan }) {
  const [ai, setAi] = useState(null);          // { kind, teks, loading, data, error }
  const [fk, setFk] = useState(null);          // { teks, loading, data, error }
  const [tampil, setTampil] = useState('');    // 'ai' | 'fk' | '': hasil yang sedang dibuka
  const [peringatan, setPeringatan] = useState('');
  const cache = useRef(new Map());             // hasil yang sama tidak diminta ulang (hemat kuota harian)
  const urut = useRef(0);

  const masalah = masalahCakupan(cakupan);
  // Fan kitab beda dengan mapel Susun Soal: hanya catatan, bukan penolakan. Ekstrak fakta, terjemah, dan analisis mengikuti disiplin kitab.
  const dKitab = kitab && kitab.fan ? kenaliDisiplin('', kitab.fan) : null;
  const dMapel = konteks.mapel ? kenaliDisiplin('', konteks.mapel) : null;
  const bedaMapel = !!(dKitab && dMapel && dKitab.sumber === 'mapel' && dMapel.sumber === 'mapel' && dKitab.id !== dMapel.id);
  const sibuk = !!((ai && ai.loading) || (fk && fk.loading));
  const nama = kitab ? kitab.judulLatin : '';

  const jalankan = async (aksi, ulang = false) => {
    const teks = cakupan.teks; const kunci = `${kitabId}|${aksi}|${konteks.mapel || ''}|${konteks.tingkat || ''}|${teks}`;
    const untukAi = aksi !== 'fakta'; const set = untukAi ? (v) => { setAi(v); setTampil('ai'); } : (v) => { setFk(v); setTampil('fk'); };
    const kind = aksi;
    if (masalah) { set({ kind, teks, error: { code: 'INVALID_ARABIC', message: masalah } }); return; }
    if (!ulang && cache.current.has(kunci)) { const c = cache.current.get(kunci); setPeringatan(c.peringatan || ''); set({ kind, teks, data: c.data, dariSimpanan: true }); return; }
    const n = ++urut.current; set({ kind, teks, loading: true });
    try {
      const d = await callApi('/api/assist', { aksi, teks, nama, tingkat: konteks.tingkat, mapel: konteks.mapel, kitabId });
      if (n !== urut.current) return;
      cache.current.set(kunci, { data: d.hasil, peringatan: d.peringatanOtoritas || '' });
      setPeringatan(d.peringatanOtoritas || '');
      set({ kind, teks, data: d.hasil });
    } catch (e) { if (n !== urut.current) return; const er = apiErr(e); set(er ? { kind, teks, error: er } : null); }
  };

  const kirim = (opsi = {}) => onKirim({
    ...opsi,
    ...(opsi.tambah ? {} : {
      ai: ai && ai.data && ai.teks === cakupan.teks ? { kind: ai.kind, data: ai.data } : null,
      fk: opsi.fk || (fk && fk.data && fk.teks === cakupan.teks ? { data: fk.data, teks: fk.teks } : null),
    }),
  });
  const faktaOtomatis = () => {
    const { fakta } = pilihFaktaBerikut(fk.data.fakta, [], { bentuk: konteks.bentuk, level: konteks.level });
    if (fakta) kirim({ fk: { data: fk.data, teks: fk.teks }, fakta });
  };

  const adaHasil = (tampil === 'ai' && ai) || (tampil === 'fk' && fk);
  return (
    <section aria-label="Alat AI untuk teks kitab" className="space-y-2 rounded-2xl border border-line bg-surface px-2.5 py-2 shadow-sm sm:px-3">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" role="status" aria-live="polite">
        <span className={`rounded-full px-2 py-0.5 font-semibold ${cakupan.mode === 'pilihan' ? 'bg-brand text-brand-fg' : 'bg-soft text-soft-ink'}`}>{LABEL_MODE[cakupan.mode]}</span>
        <span className="text-mute">{cakupan.panjang.toLocaleString('id-ID')} karakter{cakupan.mode === 'halaman' ? ' · blok sebagian teks untuk memilih lebih sempit' : ''}</span>
        {cakupan.mode === 'pilihan' && <span dir="auto" {...(arab ? { lang: 'ar' } : {})} className={`${arab ? 'ar ' : ''}min-w-0 max-w-full truncate text-sm`}>{cakupan.teks.replace(/\s+/g, ' ').slice(0, 80)}</span>}
        {cakupan.mode === 'pilihan' && <button type="button" onClick={onHapusPilihan} className="ml-auto inline-flex items-center gap-1 underline"><X size={12} />Hapus pilihan</button>}
      </p>
      {bedaMapel && cakupan.mode !== 'kosong' && (
        <p role="note" className="flex items-start gap-1.5 text-xs leading-snug text-mute"><AlertTriangle size={13} className="mt-0.5 shrink-0" />Kitab ini fan {dKitab.label}, sedangkan mapel di Susun Soal {dMapel.label}. Fakta, terjemah, dan analisis mengikuti isi kitab, bukan ditolak. Sesuaikan mapel di Susun Soal sebelum membuat soal.</p>
      )}
      {masalah && cakupan.mode !== 'kosong' && <p role="note" className="flex items-start gap-1.5 text-xs text-warn"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{masalah}</p>}
      <div className="flex flex-wrap gap-1.5">
        <Btn kind="soft" className="!px-3 !py-1.5 !text-xs" onClick={() => jalankan('terjemah')} disabled={sibuk || !!masalah}><Languages size={14} />Terjemahkan</Btn>
        <Btn kind="soft" className="!px-3 !py-1.5 !text-xs" onClick={() => jalankan('analisis')} disabled={sibuk || !!masalah}><FileSearch size={14} />Analisis teks</Btn>
        <Btn kind="soft" className="!px-3 !py-1.5 !text-xs" onClick={() => jalankan('fakta')} disabled={sibuk || !!masalah}><ListChecks size={14} />Ekstrak fakta</Btn>
        <Btn kind="primary" className="!px-3 !py-1.5 !text-xs" onClick={() => kirim({ tambah: false })} disabled={sibuk || cakupan.mode === 'kosong' || cakupan.terlaluPanjang}><Sparkles size={14} />Buat soal dari teks ini</Btn>
        {formTerisi && <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => kirim({ tambah: true })} disabled={sibuk || cakupan.mode === 'kosong' || cakupan.terlaluPanjang}><Plus size={14} />Tambahkan ke teks di Susun Soal</Btn>}
      </div>
      <p className="text-[11px] leading-snug text-mute">AI memakai jenjang {konteks.tingkat || 'bawaan'} dan mapel {konteks.mapel || 'bawaan'} dari form Susun Soal. Tiap permintaan AI memakai kuota harian; hasil untuk teks yang sama dipakai ulang. Soal dibuat di Susun Soal: teks dan rujukan halaman ikut dipindahkan.</p>
      {adaHasil && (
        <div className="space-y-2 border-t border-line pt-2" aria-live="polite">
          <div className="flex items-center gap-2 text-xs">
            <b>{tampil === 'fk' ? 'Fakta dari Teks' : ai.kind === 'terjemah' ? 'Terjemah & Istilah' : 'Analisis Teks'}</b>
            {((tampil === 'ai' ? ai : fk).dariSimpanan) && <span className="text-mute">(hasil tersimpan)</span>}
            <button type="button" onClick={() => (tampil === 'ai' ? jalankan(ai.kind, true) : jalankan('fakta', true))} disabled={sibuk || !!masalah} className="underline disabled:no-underline disabled:opacity-40">Ulangi</button>
            <button type="button" onClick={() => setTampil('')} className="ml-auto font-semibold text-mute hover:text-ink">Tutup</button>
          </div>
          {(tampil === 'ai' ? ai : fk).teks !== cakupan.teks && !(tampil === 'ai' ? ai : fk).loading && (
            <p role="status" className="rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn">Teks yang dipilih sudah berbeda dari teks hasil ini. Jalankan ulang untuk teks yang sekarang.</p>)}
          {peringatan && <p role="note" className="rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn">{peringatan}</p>}
          <div className="max-h-[45vh] overflow-auto pr-1">
            {tampil === 'ai'
              ? <AssistView state={ai} labelIde="Kirim fokus ini ke Susun Soal" onIdea={(x) => kirim({ ide: x })} />
              : <FaktaTeks state={fk} level={konteks.level} terpakai={[]} basi={faktaBasi(fk, cakupan.teks)} disabled={false}
                  labelBuat="Pakai fakta ini di Susun Soal" onBuat={(f) => kirim({ fk: { data: fk.data, teks: fk.teks }, fakta: f })} onOtomatis={fk.data ? faktaOtomatis : undefined} />}
          </div>
        </div>)}
    </section>
  );
}
