import { ClipboardCheck, Copy, Download, FileSpreadsheet, FileText, ListChecks, Loader2, PenLine, Sparkles, Target, Users } from 'lucide-react';
import { Btn, CatatanCtx, Draft, ErrorBox, Filters, Label, Section, Select, Spin, Uj, apiErr, applyFilter, callApi, simpanBerkas, useCfg, useDraftSync } from './ui.jsx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { bacaPref, cariKitab, mapelUntuk } from './lib/dasar.js';
import { samaKitab } from './lib/kitabNama.js';
import { muatDocx } from './lib/muatDocx.js';
import { ArNama, CAKUPAN_STATUS, Chip, H3, JENIS_BAB, PRIO_BAB, SaranCtx, kitabUntuk, labelTingkat, tingkatAktif } from './bersama.jsx';

// simpanBerkas(nama, blob) dipakai bersama dengan Pegonizer (dideklarasikan sekali, di bagian Pegonizer).

function SaranView({ d, onPakai }) {
  return (
    <div className="space-y-4 text-sm">
      {d.dasar === 'daftar_isi'
        ? <p className="rounded-xl bg-soft px-4 py-2 text-xs text-soft-ink">Disusun dari daftar isi yang Anda tempel. Setiap bab dicocokkan ulang dengan daftar isi itu.</p>
        : <p role="alert" className="rounded-xl bg-warn-bg px-4 py-2 text-xs leading-relaxed text-warn"><b>Perlu diverifikasi.</b> Tanpa daftar isi, saran ini berasal dari pengetahuan umum model. Cocokkan dengan kitab Anda, atau tempel daftar isinya.</p>}
      {d.peringatan.filter((x) => d.dasar === 'daftar_isi').map((x, i) => <p key={i} role="alert" className="rounded-xl bg-warn-bg px-4 py-2 text-xs leading-relaxed text-warn">{x}</p>)}
      {d.sikap && d.sikap.status === 'periksa' && (
        <p role="alert" className="rounded-xl bg-warn-bg px-4 py-2 text-xs leading-relaxed text-warn">Ada kata yang perlu ditinjau ustadz ({[...new Set(d.sikap.temuan.map((t) => t.kata))].join(', ')}). Pastikan bahasanya santun dan tidak menyalahkan pihak lain.</p>)}
      {d.ringkasan && <p className="font-semibold leading-relaxed">{d.ringkasan}</p>}
      <p className="text-xs text-mute">Keyakinan AI pada struktur kitab: <b>{d.keyakinan}</b>{d.jumlah_soal ? ` · rencana ${d.jumlah_soal} soal` : ''}</p>
      <ul className="space-y-2">
        {d.bab.map((b, i) => (
          <li key={i} className="rounded-lg border border-line bg-surface px-3 py-2">
            <p className="flex flex-wrap items-center gap-2">
              <span className={'shrink-0 rounded-md px-2 py-px text-xs font-bold ' + (PRIO_BAB[b.prioritas] || PRIO_BAB.penting)[1]}>{(PRIO_BAB[b.prioritas] || PRIO_BAB.penting)[0]}</span>
              <span className="min-w-0 font-semibold">{b.nama}</span>
              {b.nama_arab && <ArNama>{b.nama_arab}</ArNama>}
            </p>
            {b.alasan && <p className="mt-1 text-xs leading-relaxed text-mute">{b.alasan}</p>}
            <p className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
              <Chip>{JENIS_BAB[b.jenis_materi] || 'Lainnya'}</Chip>
              {b.level_disarankan.map((l) => <Chip key={l}>{l}</Chip>)}
              {b.alokasi_soal > 0 && <Chip>{b.alokasi_soal} soal</Chip>}
              {b.khilafiyah && <Chip>Khilafiyah</Chip>}
              {b.ditemukan === true && <span className="rounded-md bg-ok-bg px-2 py-px font-semibold text-ok">Ada di daftar isi</span>}
              {b.ditemukan === false && <span className="rounded-md bg-warn-bg px-2 py-px font-semibold text-warn">Tidak ada di daftar isi</span>}
            </p>
            {b.catatan_aswaja && <p className="mt-1.5 text-xs leading-relaxed text-soft-ink">Catatan pendekatan (AI, tinjau ustadz): {b.catatan_aswaja}</p>}
            <button type="button" onClick={() => onPakai(b)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-soft-ink hover:underline"><PenLine size={13} />Susun soal untuk bab ini</button>
          </li>))}
      </ul>
      {d.catatan_umum && <div><H3>Catatan untuk ustadz</H3><p className="leading-relaxed">{d.catatan_umum}</p></div>}
      <p className="text-xs text-mute">Saran disusun dengan haluan Ahlussunnah wal Jamaah yang moderat dan setia pada teks kitab. Ini bahan pertimbangan, bukan keputusan: guru pengampu atau ustadz yang menetapkan bab ujian.</p>
    </div>
  );
}

export function FokusUjian({ all, toast }) {
  const cfg = useCfg();
  const catatan = React.useContext(CatatanCtx);
  const { saran, setSaran, pakaiBab } = React.useContext(SaranCtx);
  const approved = useMemo(() => all.filter((q) => q.status === 'approved'), [all]);
  const K = window.Kisi;

  /* --- Saran AI --- */
  const SAWAL = { tingkat: (tingkatAktif(cfg)[0] || {}).nama || 'Aliyah', kelas: '', periode: '', mapel: 'Fiqih', nama: '', daftarIsi: '', jumlah: '' };
  const [sf, setSf] = useState(() => bacaPref('saranBabForm', SAWAL));
  useDraftSync('saranBabForm', sf, JSON.stringify(sf) === JSON.stringify(SAWAL));
  const setS = (k, v) => setSf((x) => ({ ...x, [k]: v }));
  const pilihTingkatS = (v) => setSf((x) => {
    const l = mapelUntuk(cfg, v);
    return { ...x, tingkat: v, mapel: l.includes(x.mapel) || !l.length ? x.mapel : l[0],
      kelas: Uj.kelasUntuk(cfg, v).includes(x.kelas) ? x.kelas : '', periode: Uj.periodeUntuk(cfg, v).some((y) => y.kode === x.periode) ? x.periode : '' };
  });
  const [st, setSt] = useState({});
  const ctrl = useRef(null);
  useEffect(() => () => { if (ctrl.current) ctrl.current.abort(); }, []);
  const kitabOpsi = kitabUntuk(cfg, sf.tingkat, sf.mapel, sf.kelas, sf.periode);
  const kitabObj = cariKitab(cfg, sf.nama.trim());
  const cakupan = kitabObj ? Uj.cakupanKitab(kitabObj, sf.tingkat, sf.kelas, sf.periode) : '';
  const jalankan = async () => {
    const nama = sf.nama.trim();
    if (!nama) { toast('Isi nama kitab dulu.'); return; }
    if (ctrl.current) ctrl.current.abort();
    const c = new AbortController(); ctrl.current = c;
    setSt({ loading: true });
    try {
      const d = await callApi('/api/assist', {
        aksi: 'bab', nama, pengarang: kitabObj ? kitabObj.pengarang || '' : '', tingkat: sf.tingkat, kelas: sf.kelas, mapel: sf.mapel,
        ujian: sf.periode ? Uj.labelPeriode(cfg, sf.tingkat, sf.periode) : '', cakupan, daftarIsi: sf.daftarIsi, jumlahSoal: sf.jumlah.trim(),
      }, c.signal);
      if (c.signal.aborted) return;
      setSaran(d.hasil); setSt({});
    } catch (e) { const er = apiErr(e); if (er) setSt({ error: er }); }
  };

  /* --- Kisi-kisi --- */
  const KAWAL = { mapel: '', tingkat: '', kelas: '', periode: '' };
  const kAwal = useRef(null); if (kAwal.current === null) { const d = Draft.read('kisiPrefs'); kAwal.current = d && typeof d === 'object' ? d : {}; }
  const [kf, setKf] = useState(() => bacaPref('kisiFilter', KAWAL));
  const [meta, setMeta] = useState(() => ({ judul: typeof kAwal.current.judul === 'string' ? kAwal.current.judul.slice(0, 80) : '', madrasah: typeof kAwal.current.madrasah === 'string' ? kAwal.current.madrasah.slice(0, 80) : '' }));
  const [picked, setPicked] = useState(() => (Array.isArray(kAwal.current.picked) ? new Set(kAwal.current.picked.filter((x) => typeof x === 'string')) : null)); // null = semua hasil filter
  useDraftSync('kisiFilter', kf, JSON.stringify(kf) === JSON.stringify(KAWAL));
  const kPref = useMemo(() => ({ judul: meta.judul, madrasah: meta.madrasah, picked: picked ? [...picked] : null }), [meta, picked]);
  useDraftSync('kisiPrefs', kPref, !meta.judul && !meta.madrasah && picked === null);
  const [busy, setBusy] = useState('');

  const list = applyFilter(approved, kf);
  const chosen = (picked ? list.filter((q) => picked.has(q.id)) : list).map((q) => ({ ...q, ujian: Uj.labelPeriode(cfg, q.tingkat, q.periode) }));
  // Saran dipakai untuk urutan dan analisis hanya bila untuk kitab yang sama dengan soal terpilih (jangan campur kitab).
  const saranCocok = K && saran && chosen.some((q) => samaKitab(q.nama, saran.kitab)) ? saran : null;
  const kisi = K && chosen.length ? K.buatKisi(chosen, {
    judul: meta.judul, madrasah: meta.madrasah,
    urutanBab: saranCocok ? saranCocok.bab.map((b) => b.nama) : [], prioritas: saranCocok ? Object.fromEntries(saranCocok.bab.map((b) => [b.nama, b.prioritas])) : {},
  }) : null;
  const cakupanHasil = saranCocok ? K.analisisCakupan(saranCocok.bab.map((b) => ({ nama: b.nama, prioritas: b.prioritas, alokasi: b.alokasi_soal })), chosen.filter((q) => samaKitab(q.nama, saranCocok.kitab))) : null;
  const tanpaIndikator = chosen.filter((q) => !String(q.indikator || '').trim()).length;
  const toggle = (id) => { const cur = new Set(picked || list.map((q) => q.id)); cur.has(id) ? cur.delete(id) : cur.add(id); setPicked(cur); };
  const slug = (meta.judul || kf.mapel || 'soal').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'soal';

  const unduh = async (mode) => {
    if (!kisi) return;
    setBusy(mode);
    try {
      if (mode === 'csv') simpanBerkas(`kisi-kisi-${slug}.csv`, new Blob([K.kisiKeCsv(kisi, catatan)], { type: 'text/csv;charset=utf-8' }));
      else {
        const D = await muatDocx();
        simpanBerkas(`kisi-kisi-${slug}-${mode}.docx`, await D.Packer.toBlob(K.buatKisiDocx(D, kisi, mode, catatan)));
      }
      toast('File diunduh.');
    } catch (e) { toast(e && e.message ? 'Gagal membuat file: ' + e.message : 'Gagal membuat file.'); } finally { setBusy(''); }
  };
  const salin = async () => { try { await navigator.clipboard.writeText(K.kisiKeTeks(kisi, catatan)); toast('Teks kisi-kisi disalin.'); } catch (e) { toast('Penyalinan ditolak browser.'); } };
  const kelasOpsi = Uj.kelasUntuk(cfg, sf.tingkat); const periodeOpsi = Uj.periodeUntuk(cfg, sf.tingkat);

  return (
    <div className="fade-in space-y-5">
      <Section title="Saran AI: Bab Penting untuk Diujikan" icon={Target}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><Label htmlFor="sb-tingkat">Tingkat</Label>
            <Select id="sb-tingkat" value={sf.tingkat} onChange={pilihTingkatS}>{[...new Set([...tingkatAktif(cfg).map((t) => t.nama), sf.tingkat])].map((t) => <option key={t} value={t}>{labelTingkat(cfg, t)}</option>)}</Select></div>
          <div><Label htmlFor="sb-kelas" hint="(opsional)">Kelas</Label>
            <Select id="sb-kelas" value={sf.kelas} onChange={(v) => setS('kelas', v)}><option value="">— Belum dipilih —</option>{kelasOpsi.map((k) => <option key={k} value={k}>{k}</option>)}</Select></div>
          <div><Label htmlFor="sb-periode" hint="(opsional)">Ujian</Label>
            <Select id="sb-periode" value={sf.periode} onChange={(v) => setS('periode', v)}><option value="">— Belum dipilih —</option>{periodeOpsi.map((x) => <option key={x.kode} value={x.kode}>{x.label}</option>)}</Select></div>
          <div><Label htmlFor="sb-mapel">Mata Pelajaran</Label>
            <Select id="sb-mapel" value={sf.mapel} onChange={(v) => setS('mapel', v)}>{[...new Set([...mapelUntuk(cfg, sf.tingkat), sf.mapel])].map((m) => <option key={m}>{m}</option>)}</Select></div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2"><Label htmlFor="sb-nama">Nama Kitab</Label>
            <input id="sb-nama" list="sb-kitab" maxLength={120} className="field" placeholder="Pilih dari katalog atau ketik nama kitab" value={sf.nama} onChange={(e) => setS('nama', e.target.value)} />
            <datalist id="sb-kitab">{kitabOpsi.map((k) => <option key={k.nama} value={k.nama} />)}</datalist>
            {cakupan && <p className="mt-1 text-xs text-soft-ink">Cakupan materi dari Konfigurasi: {cakupan}. AI diminta membatasi saran pada cakupan ini.</p>}</div>
          <div><Label htmlFor="sb-jumlah" hint="(opsional)">Rencana jumlah soal</Label>
            <input id="sb-jumlah" inputMode="numeric" className="field" placeholder="mis. 40" value={sf.jumlah} onChange={(e) => setS('jumlah', e.target.value.replace(/[^0-9]/g, '').slice(0, 3))} /></div>
        </div>
        <div className="mt-3"><Label htmlFor="sb-isi" hint="(opsional, sangat disarankan)">Daftar isi kitab</Label>
          <textarea id="sb-isi" rows={5} className="field" placeholder="Tempel daftar isi (Arab atau Latin), satu bab per baris. Dengan daftar isi, saran terikat pada kitab Anda dan tiap bab diperiksa ulang." value={sf.daftarIsi} onChange={(e) => setS('daftarIsi', e.target.value)} />
          <p className={`mt-1 text-xs ${sf.daftarIsi.length > 5000 ? 'font-semibold text-bad' : 'text-mute'}`}>{sf.daftarIsi.length.toLocaleString('id-ID')} / 5.000 karakter{sf.daftarIsi.length > 5000 ? '. Tempel bagian yang akan diujikan saja.' : ''}</p></div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Btn kind="primary" onClick={jalankan} disabled={st.loading || !sf.nama.trim() || sf.daftarIsi.length > 5000}>{st.loading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}Sarankan bab penting</Btn>
          <span className="text-xs text-mute">Memakai 1 kuota AI.</span>
        </div>
        <div className="mt-4" aria-live="polite">
          {st.loading && <Spin>AI sedang menimbang bab yang paling penting...</Spin>}
          {st.error && <ErrorBox e={st.error} />}
          {!st.loading && !st.error && saran && <SaranView d={saran} onPakai={(b) => pakaiBab({ bab: b.nama, nama: saran.kitab, tingkat: sf.tingkat, kelas: sf.kelas, periode: sf.periode, mapel: sf.mapel })} />}
          {!st.loading && !st.error && !saran && <p className="text-sm text-mute">Isi nama kitab (dan sebaiknya daftar isinya), lalu minta saran. Hasilnya bisa dipakai untuk menentukan bab yang disusun soalnya dan untuk menandai bab pada tiap soal.</p>}
        </div>
      </Section>

      <Filters f={kf} setF={(v) => { setKf(v); setPicked(null); }} count={list.length} qs={approved} />
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="min-w-0 space-y-5 lg:col-span-5">
          <Section title="Soal untuk Kisi-kisi" icon={ClipboardCheck}
            action={list.length > 0 && <button type="button" className="text-xs font-semibold text-soft-ink hover:underline"
              onClick={() => setPicked(!picked || picked.size === list.length ? new Set() : null)}>{!picked || picked.size === list.length ? 'Kosongkan' : 'Pilih semua'}</button>}>
            {!list.length ? <p className="text-sm text-mute">{catatan ? 'Belum ada soal tersimpan yang cocok dengan filter.' : 'Belum ada soal Approved yang cocok dengan filter.'}</p> : (
              <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {list.map((q, i) => {
                  const on = !picked || picked.has(q.id);
                  return (
                    <li key={q.id}>
                      <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${on ? 'border-brand bg-soft' : 'border-line'}`}>
                        <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[var(--brand)]" checked={on} onChange={() => toggle(q.id)} />
                        <span className="min-w-0">
                          <span className="block break-words font-medium">{q.pertanyaan}</span>
                          <span className="mt-1 block text-xs text-mute">{q.bab ? `Bab: ${q.bab}` : 'Belum ditandai bab'} · {q.level}{String(q.indikator || '').trim() ? '' : ' · tanpa indikator'}</span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>
        <div className="min-w-0 space-y-5 lg:col-span-7">
          <Section title="Dokumen Kisi-kisi" icon={ListChecks}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label htmlFor="ks-judul" hint="(mis. UTS Fiqih)">Judul</Label><input id="ks-judul" maxLength={80} className="field" value={meta.judul} onChange={(e) => setMeta((m) => ({ ...m, judul: e.target.value }))} /></div>
              <div><Label htmlFor="ks-madrasah" hint="(opsional)">Nama madrasah</Label><input id="ks-madrasah" maxLength={80} className="field" value={meta.madrasah} onChange={(e) => setMeta((m) => ({ ...m, madrasah: e.target.value }))} /></div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Btn kind="primary" onClick={() => unduh('lengkap')} disabled={!kisi || !!busy}>{busy === 'lengkap' ? <Loader2 size={16} className="spin" /> : <Download size={16} />}Kisi-kisi + Lembar Fokus (DOCX)</Btn>
              <Btn kind="ghost" onClick={() => unduh('kisi')} disabled={!kisi || !!busy}><FileText size={16} />Kisi-kisi guru (DOCX)</Btn>
              <Btn kind="ghost" onClick={() => unduh('fokus')} disabled={!kisi || !!busy}><Users size={16} />Lembar fokus murid (DOCX)</Btn>
              <Btn kind="ghost" onClick={() => unduh('csv')} disabled={!kisi || !!busy}><FileSpreadsheet size={16} />CSV</Btn>
              <Btn kind="ghost" onClick={salin} disabled={!kisi}><Copy size={16} />Salin teks</Btn>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-mute">Kunci jawaban, opsi, dan pembahasan tidak pernah dimasukkan, jadi aman dibagikan kepada murid. Nomor soal mengikuti urutan soal terpilih; bila Anda juga mengekspor naskah di tab Export/Download, samakan filter dan pilihan soalnya agar nomornya cocok. Halaman yang tertulis adalah halaman sumber soal, bukan seluruh bab.</p>
          </Section>

          <Section title="Pratinjau Kisi-kisi" lipat>
            {!kisi ? <p className="text-sm text-mute">{catatan ? 'Pilih minimal satu soal.' : 'Pilih minimal satu soal Approved.'}</p> : (
              <div className="max-h-[420px] space-y-3 overflow-auto rounded-xl bg-bg p-4 text-sm">
                {kisi.tanpaBab > 0 && <p role="alert" className="rounded-lg bg-warn-bg px-3 py-2 text-xs leading-relaxed text-warn">{kisi.tanpaBab} soal belum ditandai bab, jadi dikumpulkan di “Belum ditandai bab”. Edit soalnya dan isi kolom Bab agar masuk kelompok yang benar.</p>}
                {tanpaIndikator > 0 && <p role="alert" className="rounded-lg bg-warn-bg px-3 py-2 text-xs leading-relaxed text-warn">{tanpaIndikator} soal belum punya indikator, jadi barisnya kosong di kisi-kisi. Isi kolom Indikator Kisi-kisi pada soal itu.</p>}
                {kisi.kelompok.map((g) => (
                  <div key={`${g.bab}|${g.rujukan}`}>
                    <p className="font-bold">{g.bab}{g.prioritas && <span className={'ml-2 rounded-md px-2 py-px text-xs font-bold ' + (PRIO_BAB[g.prioritas] || PRIO_BAB.penting)[1]}>{(PRIO_BAB[g.prioritas] || PRIO_BAB.penting)[0]}</span>}</p>
                    <p className="text-xs text-mute">{g.jumlah} soal ({g.bobot}%){g.rujukan ? ` · ${g.rujukan}` : ''}</p>
                    <ul className="mt-1 space-y-0.5">{g.soal.map((s) => <li key={s.no} className="text-xs leading-relaxed"><b>No. {s.no}</b> · {s.level} · {s.indikator || '(indikator belum diisi)'}</li>)}</ul>
                  </div>))}
                <p className="text-xs font-semibold text-soft-ink">Ringkasan level: L1 {kisi.perLevel.L1} · L2 {kisi.perLevel.L2} · L3 {kisi.perLevel.L3}</p>
              </div>)}
          </Section>

          {cakupanHasil && (
            <Section title="Cakupan terhadap Saran AI" icon={Target}>
              {cakupanHasil.intiKosong.length > 0 && <p role="alert" className="mb-3 rounded-lg bg-bad-bg px-3 py-2 text-xs leading-relaxed text-bad">Bab inti belum punya soal: {cakupanHasil.intiKosong.join(', ')}.</p>}
              <ul className="space-y-1.5 text-sm">
                {cakupanHasil.baris.map((b) => (
                  <li key={b.nama} className="flex flex-wrap items-center gap-2">
                    <span className={'shrink-0 rounded-md px-2 py-px text-xs font-bold ' + (CAKUPAN_STATUS[b.status] || CAKUPAN_STATUS.ada)[1]}>{(CAKUPAN_STATUS[b.status] || CAKUPAN_STATUS.ada)[0]}</span>
                    <span className="min-w-0 flex-1">{b.nama}</span>
                    <span className="text-xs text-mute">{b.jumlah}{b.alokasi ? ` dari ${b.alokasi}` : ''} soal</span>
                  </li>))}
              </ul>
              {cakupanHasil.diluarSaran.length > 0 && <p className="mt-3 text-xs leading-relaxed text-mute">Soal di bab di luar saran: {cakupanHasil.diluarSaran.map((x) => `${x.bab} (${x.jumlah})`).join(', ')}.</p>}
              {cakupanHasil.tanpaBab > 0 && <p className="mt-1 text-xs text-mute">{cakupanHasil.tanpaBab} soal belum ditandai bab sehingga tidak terhitung di sini.</p>}
            </Section>)}
        </div>
      </div>
    </div>
  );
}
