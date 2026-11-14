import { useEffect, useMemo, useState } from 'react';
import { Btn, Filters, Label, Select, applyFilter, labelPaket, useAlur, useCfg, useDraftSync } from './ui.jsx';
import { CheckSquare, Download, Library, ListChecks, Loader2, Pencil, Send, Square, Trash2, X } from 'lucide-react';
import { bacaPref } from './lib/dasar.js';
import * as CS from './lib/cariSoal.js';
import * as SK from './lib/saringKitab.js';
import * as PK from './lib/paket.js';
import { Badge, Empty, Meta, QuestionView, RefArab, SourceLink, TahapChip, TautKitab, refText } from './bersama.jsx';

/* ---------- Pilih massal (dipakai Bank Soal dan Soal Saya) ---------- */
// "terlihat" = soal yang sedang tampil sesuai filter. Pilihan di luar daftar yang tampil TIDAK ikut diproses,
// supaya mengganti filter tidak membuat soal tersembunyi ikut terhapus.
export function usePilihan(terlihat) {
  const [aktif, setAktif] = useState(false);
  const [ids, setIds] = useState(() => new Set());
  const [konfirm, setKonfirm] = useState(false);
  const dipilih = useMemo(() => terlihat.filter((q) => ids.has(q.id)), [terlihat, ids]);
  const semua = terlihat.length > 0 && dipilih.length === terlihat.length;
  const toggle = (id) => { setKonfirm(false); setIds((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };
  const pilihSemua = () => { setKonfirm(false); setIds(semua ? new Set() : new Set(terlihat.map((q) => q.id))); };
  const tutup = () => { setAktif(false); setIds(new Set()); setKonfirm(false); };
  return { aktif, setAktif, dipilih, semua, toggle, pilihSemua, tutup, konfirm, setKonfirm };
}

export function KotakPilih({ pl, q }) {
  if (!pl.aktif) return null;
  const on = pl.dipilih.some((x) => x.id === q.id);
  return (
    <label className="mb-3 flex cursor-pointer items-center gap-2 rounded-lg bg-soft px-3 py-2 text-sm font-semibold text-soft-ink">
      <input type="checkbox" className="h-5 w-5" checked={on} onChange={() => pl.toggle(q.id)} aria-label="Pilih soal ini" />
      {on ? 'Dipilih' : 'Pilih soal ini'}
    </label>
  );
}

export function BilahPilih({ pl, total, children }) {
  if (!pl.aktif) return <div className="flex"><Btn kind="ghost" onClick={() => pl.setAktif(true)} disabled={!total}><CheckSquare size={15} />Pilih</Btn></div>;
  return (
    <div className="sticky top-2 z-10 space-y-2 rounded-xl border border-brand/40 bg-surface p-3 shadow-md" role="region" aria-label="Aksi soal terpilih">
      <div className="flex flex-wrap items-center gap-2">
        <Btn kind="ghost" onClick={pl.pilihSemua}>{pl.semua ? <Square size={15} /> : <CheckSquare size={15} />}{pl.semua ? 'Batal pilih semua' : `Pilih semua (${total})`}</Btn>
        <span className="mr-auto text-sm font-semibold">{pl.dipilih.length} dipilih</span>
        <Btn kind="ghost" onClick={pl.tutup}><X size={15} />Selesai</Btn>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function Bank({ all, onEdit, onDelete, onDeleteMany, canEdit, uid = '', onKirim, onKirimTab }) {
  const alur = useAlur();
  const FAWAL = { mapel: '', tingkat: '', kelas: '', periode: '', status: 'approved', paket: '', kitab: '', bab: '' };
  const [f, setF] = useState(() => bacaPref('bankFilter', FAWAL));
  useDraftSync('bankFilter', f, JSON.stringify(f) === JSON.stringify(FAWAL));
  const [confirm, setConfirm] = useState(null);
  const [kirimBusy, setKirimBusy] = useState('');
  const cfg = useCfg();
  const [kata, setKata] = useState(''); // pencarian teks: sengaja tidak disimpan sebagai preferensi
  const list = useMemo(() => CS.saring(applyFilter(all, f, alur), kata), [all, f, kata, alur]);
  // Opsi Kitab/Bab menghitung soal yang lolos filter lain (mapel, tingkat, status, dst.), supaya jumlahnya sama dengan yang akan tampil.
  const dasarKB = useMemo(() => applyFilter(all, { ...f, kitab: '', bab: '' }, alur), [all, f, alur]);
  const opsiKitab = useMemo(() => SK.opsiKitab(dasarKB), [dasarKB]);
  const opsiBab = useMemo(() => SK.opsiBab(dasarKB, f.kitab), [dasarKB, f.kitab]);
  useEffect(() => { // pilihan yang sudah tidak ada (filter lain berubah, data dihapus) dilepas agar daftar tidak kosong tanpa sebab
    if (!all.length) return;
    if (f.kitab && !opsiKitab.some((o) => o.nilai === f.kitab)) setF({ ...f, kitab: '', bab: '' });
    else if (f.bab && !opsiBab.some((o) => o.nilai === f.bab)) setF({ ...f, bab: '' });
  }, [f, opsiKitab, opsiBab, all.length]);
  const kel = useMemo(() => PK.kelompokPaket(list, all), [list, all]);
  const pl = usePilihan(list);
  const bisaHapus = pl.dipilih.filter(canEdit);
  const approvedDipilih = pl.dipilih.filter((q) => q.status === 'approved');
  const hapusMassal = async () => {
    const approved = bisaHapus.filter((q) => q.status === 'approved').length;
    // Konfirmasi kedua untuk penghapusan besar atau yang menyentuh soal Approved: tombol "Ya" saja terlalu mudah ditekan tanpa sengaja di layar sentuh.
    if ((approved || bisaHapus.length >= 10) && !window.confirm(`Hapus ${bisaHapus.length} soal dari server${approved ? ` (${approved} berstatus Approved)` : ''}? Tidak bisa dibatalkan.`)) return;
    const n = await onDeleteMany(bisaHapus.map((q) => q.id)); pl.tutup(); return n;
  };
  const kartu = (q) => (
          <article key={q.id} className={'rounded-2xl border bg-surface p-4 sm:p-5 ' + (pl.aktif && pl.dipilih.some((x) => x.id === q.id) ? 'border-brand ring-2 ring-brand/30' : 'border-line')}>
            <KotakPilih pl={pl} q={q} />
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2"><Badge status={q.status} /><TahapChip q={q} /><Meta q={q} /></div>
              <span className="text-xs text-mute">{q.authorName ? `Oleh ${q.authorName} · ` : ''}{refText(q)}<RefArab q={q} /><TautKitab q={q} />{q.status === 'approved' && q.reviewerName ? ` · Disetujui ${q.reviewerName}` : ''}</span>
            </div>
            {q.status === 'revision' && q.catatan && (
              <p className="mb-3 rounded-lg bg-bad-bg px-3 py-2 text-sm text-bad"><span className="font-semibold">Catatan editor: </span>{q.catatan}</p>
            )}
            <QuestionView q={q} />
            {q.teks && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-soft-ink">Lihat teks kitab</summary>
                <p dir="rtl" lang="ar" className="ar ar-sm mt-2 rounded-xl bg-soft px-4 py-2 text-soft-ink">{q.teks}</p>
                {q.sumberUrl && <p className="mt-1 text-xs text-mute">Sumber: <SourceLink url={q.sumberUrl} /></p>}
              </details>
            )}
            {onKirimTab && q.status === 'approved' && <div className="mt-4 flex flex-wrap gap-2">
              <Btn kind="soft" onClick={() => onKirimTab('export', [q.id])}><Download size={15} />Ke Export</Btn>
              <Btn kind="soft" onClick={() => onKirimTab('fokus', [q.id])}><ListChecks size={15} />Ke Fokus Ujian</Btn>
            </div>}
            {canEdit(q) && <div className="mt-4 flex flex-wrap gap-2">
              <Btn kind={q.status === 'revision' ? 'primary' : 'ghost'} onClick={() => onEdit(q)}><Pencil size={15} />{q.status === 'revision' ? 'Perbaiki' : 'Edit'}</Btn>
              {confirm === q.id ? (
                <>
                  <Btn kind="danger" onClick={() => { onDelete(q.id); setConfirm(null); }}><Trash2 size={15} />Ya, hapus</Btn>
                  <Btn kind="ghost" onClick={() => setConfirm(null)}>Batal</Btn>
                </>
              ) : <Btn kind="ghost" onClick={() => setConfirm(q.id)}><Trash2 size={15} />Hapus</Btn>}
            </div>}
          </article>
  );
  return (
    <div className="fade-in space-y-4">
      <Filters f={f} setF={setF} withStatus count={list.length} qs={all} uid={uid} />
      {(opsiKitab.length > 1 || f.kitab) && (
        <div className="flex flex-wrap gap-3">
          <div className="min-w-[200px] flex-1"><Label htmlFor="f-kitab">Kitab</Label>
            <Select id="f-kitab" value={f.kitab || ''} onChange={(v) => setF({ ...f, kitab: v, bab: '' })}>
              <option value="">Semua kitab</option>
              {opsiKitab.map((o) => <option key={o.nilai} value={o.nilai}>{o.label} ({o.jumlah})</option>)}
            </Select></div>
          <div className="min-w-[200px] flex-1"><Label htmlFor="f-bab">Bab</Label>
            <Select id="f-bab" value={f.bab || ''} onChange={(v) => setF({ ...f, bab: v })}>
              <option value="">{f.kitab ? 'Semua bab kitab ini' : 'Semua bab'}</option>
              {opsiBab.map((o) => <option key={o.nilai} value={o.nilai}>{o.label} ({o.jumlah})</option>)}
            </Select></div>
        </div>
      )}
      <BilahPilih pl={pl} total={list.length}>
        <Btn kind="ghost" disabled={pl.dipilih.length !== 1 || !canEdit(pl.dipilih[0])} onClick={() => { const q = pl.dipilih[0]; pl.tutup(); onEdit(q); }}><Pencil size={15} />Edit</Btn>
        {onKirimTab && <Btn kind="soft" disabled={!approvedDipilih.length} onClick={() => { const ids = approvedDipilih.map((q) => q.id); pl.tutup(); onKirimTab('export', ids); }}><Download size={15} />Ke Export ({approvedDipilih.length})</Btn>}
        {onKirimTab && <Btn kind="soft" disabled={!approvedDipilih.length} onClick={() => { const ids = approvedDipilih.map((q) => q.id); pl.tutup(); onKirimTab('fokus', ids); }}><ListChecks size={15} />Ke Fokus Ujian ({approvedDipilih.length})</Btn>}
        {pl.konfirm
          ? <><Btn kind="danger" onClick={hapusMassal}><Trash2 size={15} />Ya, hapus {bisaHapus.length} soal</Btn><Btn kind="ghost" onClick={() => pl.setKonfirm(false)}>Batal</Btn></>
          : <Btn kind="ghost" disabled={!bisaHapus.length} onClick={() => pl.setKonfirm(true)}><Trash2 size={15} />Hapus ({bisaHapus.length})</Btn>}
        {pl.konfirm && pl.dipilih.length > bisaHapus.length && <p className="w-full text-xs text-warn">{pl.dipilih.length - bisaHapus.length} soal terpilih tidak bisa Anda hapus (bukan milik Anda atau sudah dikirim/disetujui) dan akan dilewati.</p>}
        {pl.konfirm && <p className="w-full text-xs text-mute">Penghapusan dari server tidak bisa dibatalkan.</p>}
      </BilahPilih>
      <input type="search" aria-label="Cari di bank soal" className="field w-full" placeholder="Cari kata di pertanyaan, pilihan, pembahasan, teks kitab (Latin atau Arab)…" value={kata} onChange={(e) => setKata(e.target.value)} />
      {onKirimTab && list.some((q) => q.status === 'approved') && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-soft px-4 py-3 text-sm text-soft-ink">
          <span className="font-medium">{list.filter((q) => q.status === 'approved').length} soal Approved sesuai filter:</span>
          <Btn kind="ghost" onClick={() => onKirimTab('export', list.filter((q) => q.status === 'approved').map((q) => q.id))}><Download size={15} />Kirim ke Export</Btn>
          <Btn kind="ghost" onClick={() => onKirimTab('fokus', list.filter((q) => q.status === 'approved').map((q) => q.id))}><ListChecks size={15} />Kirim ke Fokus Ujian</Btn>
        </div>
      )}
      {f.status === 'approved' && uid && all.some((q) => q.paket && q.authorUid === uid && (q.status === 'draft' || q.status === 'revision')) && (
        <p className="flex flex-wrap items-center gap-3 rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn" role="status">Anda punya butir paket yang belum selesai (Draft atau diminta revisi). Filter status saat ini hanya menampilkan yang Approved.
          <Btn kind="ghost" onClick={() => setF({ ...f, status: '' })}>Tampilkan semua status</Btn></p>
      )}
      {!list.length ? <Empty icon={Library} title="Tidak ada soal yang cocok" text="Ubah filter, atau setujui soal dari tab Review/Validasi." /> : (
        <>
          {kel.paket.map((g) => (
            <section key={g.id} aria-label={labelPaket(cfg, g)} className="space-y-3 rounded-2xl border-2 border-brand/40 bg-soft/40 p-3 sm:p-4">
              <header className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="min-w-0"><h3 className="text-sm font-bold">Paket {labelPaket(cfg, g)}</h3>
                  {g.cakupan && <p className="text-xs text-soft-ink">Batas materi: {g.cakupan}</p>}</div>
                <p className="text-xs text-mute">Draft {g.status.draft} · Pending {g.status.pending} · Revisi {g.status.revision} · Approved {g.status.approved}{!g.lengkap ? ` · kurang ${g.target - g.jumlah} dari ${g.target} nomor` : ''}</p>
              </header>
              {(() => {
                const milik = all.filter((q) => q.paket === g.id && q.authorUid === uid && (q.status === 'draft' || q.status === 'revision'));
                if (!milik.length || !onKirim) return null;
                const rev = milik.filter((q) => q.status === 'revision').length;
                return (
                  <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface px-3 py-2">
                    <Btn kind="primary" disabled={kirimBusy === g.id} onClick={async () => {
                      if (!window.confirm(`Kirim ${milik.length} butir milik Anda dalam paket ini ke editor${rev ? ` (${rev} di antaranya hasil revisi)` : ''}? Butir yang sudah Approved atau masih menunggu review tidak ikut.`)) return;
                      setKirimBusy(g.id); try { await onKirim(milik.map((q) => q.id)); } finally { setKirimBusy(''); }
                    }}>{kirimBusy === g.id ? <Loader2 size={15} className="spin" /> : <Send size={15} />}Kirim ke editor ({milik.length} butir)</Btn>
                    <p className="text-xs text-mute">{rev ? `${rev} butir diminta revisi editor: perbaiki lewat tombol Perbaiki, lalu kirim ulang. ` : ''}Hanya butir yang belum dikirim atau dikembalikan yang ikut.</p>
                  </div>
                );
              })()}
              {g.soal.length < g.jumlah && <p className="px-1 text-xs text-mute">Menampilkan {g.soal.length} dari {g.jumlah} butir (sesuai filter).</p>}
              {g.soal.map((q) => kartu(q))}
            </section>
          ))}
          {kel.paket.length > 0 && kel.lepas.length > 0 && <h3 className="px-1 pt-2 text-sm font-bold text-soft-ink">Soal lepas (bukan bagian paket)</h3>}
          {kel.lepas.map((q) => kartu(q))}
        </>
      )}
    </div>
  );
}
