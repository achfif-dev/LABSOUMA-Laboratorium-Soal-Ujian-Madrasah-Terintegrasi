// Tab Export: dipisah dari App.jsx dan dimuat malas saat tab dibuka.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as NK from './lib/naskah.js';
import * as NM from './lib/naskahMeta.js';
import * as PK from './lib/paket.js';
import { muatDocx } from './lib/muatDocx.js';
import { ClipboardCheck, Copy, Download, FileText, Loader2 } from 'lucide-react';
import { Bt, bacaPref, ejaanTersimpan, fullQ, namaArabKitab, optsOf } from './lib/dasar.js';
import { Btn, CatatanCtx, Draft, Filters, Label, Section, Select, Uj, applyFilter, labelPaket, useCfg, useDraftSync } from './ui.jsx';
import { FORMATS, buildDocx } from './lib/exportBuilders.js';

/* ---------- Tab 4: Export ---------- */
function Export({ all, toast }) {
  const cfg = useCfg();
  const catatan = React.useContext(CatatanCtx);
  const approved = useMemo(() => all.filter((q) => q.status === 'approved'), [all]);
  const EAWAL = { f: { mapel: '', tingkat: '', kelas: '', periode: '' }, fmt: 'gift', picked: null };
  const eAwal = useRef(null); if (eAwal.current === null) { const d = Draft.read('exportPrefs'); eAwal.current = d && typeof d === 'object' ? d : {}; }
  const [f, setF] = useState(() => bacaPref('exportFilter', EAWAL.f));
  const [fmt, setFmt] = useState(() => (FORMATS.some((x) => x.id === eAwal.current.fmt) ? eAwal.current.fmt : EAWAL.fmt));
  const [picked, setPicked] = useState(() => (Array.isArray(eAwal.current.picked) ? new Set(eAwal.current.picked.filter((x) => typeof x === 'string')) : null)); // null = semua hasil filter
  useDraftSync('exportFilter', f, JSON.stringify(f) === JSON.stringify(EAWAL.f));
  const ePref = useMemo(() => ({ fmt, picked: picked ? [...picked] : null }), [fmt, picked]);
  useDraftSync('exportPrefs', ePref, fmt === EAWAL.fmt && picked === null);
  const [busy, setBusy] = useState(false);
  // Kop dan pengaturan naskah ujian IMDA (hanya dipakai bila format Naskah dipilih); disimpan sebagai draf agar tidak diketik ulang.
  // Tahun ajaran awal = tahun ajaran hijriah yang sedang berjalan (bukan angka tetap); pilihan tingkat/kelas/mapel mengikuti filter di atas.
  const nmAwal = useMemo(() => ({ ...NK.META_AWAL, dawr: 1, tahun: NM.tahunAjaranBawaan(new Date(), NK.META_AWAL.tahun) }), []);
  const [nm, setNm] = useState(() => { const d = bacaPref('naskahMeta', nmAwal); return d.tingkatKey ? d : NM.selaraskanDenganFilter(cfg, d, f); });
  useDraftSync('naskahMeta', nm, JSON.stringify(nm) === JSON.stringify(nmAwal));
  const setN = (k, v) => setNm((x) => ({ ...x, [k]: v }));
  // Filter Mapel/Tingkat/Kelas di atas diteruskan ke pengaturan naskah hanya saat filter berubah; pilihan manual di form tidak ditimpa tiap render.
  const fSebelum = useRef(f);
  useEffect(() => {
    const p = fSebelum.current; fSebelum.current = f;
    if (p.tingkat === f.tingkat && p.kelas === f.kelas && p.mapel === f.mapel) return;
    setNm((x) => NM.selaraskanDenganFilter(cfg, x, f));
  }, [f, cfg]);
  const opsiTahun = useMemo(() => NM.opsiTahunAjaran(new Date(), nm.tahun), [nm.tahun]);
  const opsiTingkat = NM.opsiTingkat(cfg, nm.tingkatKey);
  const opsiKelas = NM.opsiKelas(Uj.kelasUntuk(cfg, nm.tingkatKey), nm.kelasKey);
  const opsiMapel = NM.opsiMapel(cfg, nm.tingkatKey, nm.mapelKey);

  const saveFile = (filename, data) => {
    const blob = data instanceof Blob ? data : new Blob([data], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  // Satu paket dipilih: butirnya urut menurut nomor naskah, sehingga naskah yang diunduh sama dengan paket yang disimpan.
  const list = useMemo(() => { const l = applyFilter(approved, f); return f.paket ? [...l].sort((a, b) => (a.urut || 999) - (b.urut || 999)) : l; }, [approved, f]);
  const paketDipilih = useMemo(() => (f.paket ? PK.kelompokPaket(all.filter((q) => q.paket === f.paket)).paket[0] || null : null), [all, f.paket]);
  // Memilih paket otomatis memakai Dauri paket itu pada pengaturan naskah.
  useEffect(() => { if (paketDipilih) setNm((x) => (x.dawr === paketDipilih.dawr ? x : { ...x, dawr: paketDipilih.dawr })); }, [paketDipilih && paketDipilih.id]);
  // Nama Arab kitab diambil dari katalog Konfigurasi (tidak disimpan pada soal) agar ikut tercetak di ekspor.
  const chosen = (picked ? list.filter((q) => picked.has(q.id)) : list).map((q) => ({ ...q, namaArab: namaArabKitab(cfg, q.nama), ujian: Uj.labelPeriode(cfg, q.tingkat, q.periode) }));
  const format = FORMATS.find((x) => x.id === fmt);
  const isText = !!format.build;
  const text = isText ? format.build(chosen, catatan) : '';
  const toggle = (id) => {
    const cur = new Set(picked || list.map((q) => q.id));
    cur.has(id) ? cur.delete(id) : cur.add(id);
    setPicked(cur);
  };
  const isNaskah = fmt === 'naskah';
  const naskah = isNaskah ? NK.susunNaskah(chosen, nm.dawr) : null;
  // Soal di bank tetap Latin; hanya berkas naskah yang ditulis Pegon (bawaan menyala). Narasi tidak dicetak kecuali dinyalakan.
  const nkPegon = nm.pegon !== false && !!window.Pegon; const nkNarasi = nm.narasi === true;
  const nkUbah = nkPegon ? (t) => window.Pegon.convertTextEjaan(String(t || ''), nm.ejaan) : null;
  const nkRagu = naskah && nkUbah ? NK.kataRagu(naskah, nkUbah, { narasi: nkNarasi }) : [];
  const isPegon = fmt === 'pegon' || fmt === 'pegonlatin';
  const pv = (t) => (isPegon && window.Pegon ? window.Pegon.convertTextEjaan(String(t || ''), ejaanTersimpan()).pegon : t);
  const fname = `bank-soal-${(f.mapel || 'semua').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${format.id}.${format.ext}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast('Teks ekspor disalin.'); }
    catch (e) { toast('Penyalinan ditolak browser. Pilih teks pratinjau lalu salin manual.'); }
  };
  // Naskah ujian: dua berkas, untuk peserta (tanpa unsur merah) dan untuk pengoreksi (kunci dan halaman kitab berwarna merah).
  const unduhNaskah = async (kunci) => {
    if (!naskah) return;
    setBusy(true);
    try {
      const [D, { buatNaskah }] = await Promise.all([muatDocx(), import('./lib/naskahDocx.js')]);
      let logo = null;
      try { const r = await fetch('/logo-madrasah.png'); if (r.ok) logo = new Uint8Array(await r.arrayBuffer()); } catch (e) { /* tanpa logo: kop tetap tercetak */ }
      saveFile(NK.namaBerkasNaskah(nm, kunci), await D.Packer.toBlob(buatNaskah(D, naskah, nm, { kunci, logo, pegon: nkUbah ? (t) => nkUbah(t).pegon : null, narasi: nkNarasi })));
      toast(kunci ? 'Naskah kunci diunduh. Jangan dibagikan kepada peserta.' : 'Naskah diunduh.');
    } catch (e) {
      toast(e && e.message ? 'Gagal membuat file: ' + e.message : 'Gagal membuat file.');
    } finally { setBusy(false); }
  };
  const download = async () => {
    if (!chosen.length) return;
    if (isNaskah) { unduhNaskah(false); return; }
    setBusy(true);
    try {
      const data = isText ? text : await buildDocx(chosen, fmt === 'kartu' ? 'kartu' : fmt === 'pegon' ? 'pegon' : fmt === 'pegonlatin' ? 'pegonlatin' : 'daftar', catatan, ejaanTersimpan());
      saveFile(fname, data);
      toast('File diunduh.');
    } catch (e) {
      toast(e && e.message ? 'Gagal membuat file: ' + e.message : 'Gagal membuat file.');
    } finally { setBusy(false); }
  };

  return (
    <div className="fade-in space-y-5">
      <Filters f={f} setF={(v) => { setF(v); setPicked(null); }} count={list.length} qs={approved} />
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="min-w-0 space-y-5 lg:col-span-5">
          <Section title="Pilih Soal" icon={ClipboardCheck}
            action={list.length > 0 && <button type="button" className="text-xs font-semibold text-soft-ink hover:underline"
              onClick={() => setPicked(!picked || picked.size === list.length ? new Set() : null)}>{!picked || picked.size === list.length ? 'Kosongkan' : 'Pilih semua'}</button>}>
            {!list.length ? <p className="text-sm text-mute">{catatan ? 'Belum ada soal tersimpan yang cocok dengan filter.' : 'Belum ada soal Approved yang cocok dengan filter.'}</p> : (
              <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {list.map((q) => {
                  const on = !picked || picked.has(q.id);
                  return (
                    <li key={q.id}>
                      <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${on ? 'border-brand bg-soft' : 'border-line'}`}>
                        <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[var(--brand)]" checked={on} onChange={() => toggle(q.id)} />
                        <span className="min-w-0">
                          <span className="block break-words font-medium">{q.pertanyaan}</span>
                          <span className="mt-1 block text-xs text-mute">{q.mapel} · {q.tingkat}{q.kelas ? ` · Kelas ${q.kelas}` : ''}{q.periode ? ` · ${Uj.labelPeriode(cfg, q.tingkat, q.periode)}` : ''} · {q.level}</span>
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
          <Section title="Format Ekspor" icon={Download}>
            <div className="grid gap-2 sm:grid-cols-2">
              {FORMATS.map((x) => (
                <button key={x.id} type="button" onClick={() => setFmt(x.id)} aria-pressed={fmt === x.id}
                  className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${fmt === x.id ? 'border-brand bg-soft' : 'border-line hover:bg-soft'}`}>
                  <x.icon size={20} className="mt-0.5 shrink-0 text-soft-ink" />
                  <span className="min-w-0"><span className="block text-sm font-bold">{x.label}</span><span className="block text-xs text-mute">{x.sub}</span></span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Btn kind="primary" onClick={download} disabled={!chosen.length || busy}>
                {busy ? <Loader2 size={16} className="spin" /> : <Download size={16} />}{isNaskah ? 'Unduh naskah peserta' : `Unduh ${chosen.length} soal`}
              </Btn>
              {isNaskah && <Btn kind="ghost" onClick={() => unduhNaskah(true)} disabled={!chosen.length || busy}><Download size={16} />Unduh naskah kunci</Btn>}
              {isText && <Btn kind="ghost" onClick={copy} disabled={!chosen.length}><Copy size={16} />Salin teks</Btn>}
            </div>
            {paketDipilih && (
              <p className={`mt-3 rounded-lg px-3 py-2 text-xs leading-relaxed ${paketDipilih.semuaApproved && paketDipilih.lengkap ? 'bg-soft text-soft-ink' : 'bg-warn-bg text-warn'}`}>
                Paket {labelPaket(cfg, paketDipilih)}{paketDipilih.cakupan ? `. Batas materi: ${paketDipilih.cakupan}` : ''}. {list.length} dari {paketDipilih.jumlah} butir paket ikut diekspor (hanya yang Approved)
                {paketDipilih.semuaApproved ? '' : `; ${paketDipilih.jumlah - paketDipilih.status.approved} butir belum Approved sehingga nomornya kosong di naskah`}
                {paketDipilih.lengkap ? '' : `; paket hanya berisi ${paketDipilih.jumlah} dari ${paketDipilih.target} nomor`}.
              </p>
            )}
            {catatan && <p className="mt-3 text-xs leading-relaxed text-mute"><b>Catatan otomatis:</b> “{catatan}” dicantumkan pada semua berkas ekspor (di bawah judul dan kaki halaman untuk DOCX, komentar untuk GIFT dan Moodle XML, kolom Catatan untuk CSV).</p>}
          </Section>

          {isNaskah && (
            <Section title="Pengaturan Naskah Ujian" icon={FileText} lipat>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label htmlFor="nk-dauri">Dauri (putaran ujian)</Label>
                  <Select id="nk-dauri" value={String(nm.dawr)} onChange={(v) => setN('dawr', NK.dauriSah(v))}>
                    {NK.DAFTAR_DAURI.map((d) => <option key={d.dawr} value={d.dawr}>{d.label} ({d.bagian.map((b) => `${b.n}×${b.nilai}`).join(' + ')})</option>)}
                  </Select></div>
                <div><Label htmlFor="nk-tingkat-pilih">Tingkat</Label>
                  <Select id="nk-tingkat-pilih" className="sel-ar" value={nm.tingkatKey} onChange={(v) => setNm((x) => NM.pilihTingkat(cfg, x, v))}>
                    <option value="">Pilih dari Konfigurasi</option>{opsiTingkat.map((o) => <option key={o.kunci} value={o.kunci}>{o.arab ? `${o.label} · ${o.arab}` : o.label}</option>)}</Select>
                  <input id="nk-tingkat" aria-label="Teks Arab tingkat di naskah" className="field ar-input mt-2" dir="rtl" lang="ar" value={nm.tingkat} maxLength={30} onChange={(e) => setN('tingkat', e.target.value)} /></div>
                <div><Label htmlFor="nk-kelas-pilih">Kelas</Label>
                  <Select id="nk-kelas-pilih" className="sel-ar" value={nm.kelasKey} onChange={(v) => setNm((x) => NM.pilihKelas(cfg, x, v))}>
                    <option value="">{nm.tingkatKey ? 'Pilih dari Konfigurasi' : 'Pilih tingkat dulu'}</option>{opsiKelas.map((o) => <option key={o.kunci} value={o.kunci}>{o.arab ? `${o.kunci} · ${o.arab}` : o.kunci}</option>)}</Select>
                  <input id="nk-kelas" aria-label="Teks Arab kelas di naskah" className="field ar-input mt-2" dir="rtl" lang="ar" value={nm.kelas} maxLength={30} onChange={(e) => setN('kelas', e.target.value)} /></div>
                <div><Label htmlFor="nk-mapel-pilih" hint="(Arab, mis. فقه / حديث)">Mata pelajaran</Label>
                  <Select id="nk-mapel-pilih" className="sel-ar" value={nm.mapelKey} onChange={(v) => setNm((x) => NM.pilihMapel(cfg, x, v))}>
                    <option value="">Pilih dari Konfigurasi</option>{opsiMapel.map((o) => <option key={o.kunci} value={o.kunci}>{o.arab ? `${o.kunci} · ${o.arab}` : o.kunci}</option>)}</Select>
                  <input id="nk-mapel" aria-label="Teks Arab mata pelajaran di naskah" className="field ar-input mt-2" dir="rtl" lang="ar" value={nm.mapel} maxLength={40} onChange={(e) => setN('mapel', e.target.value)} />
                  {nm.mapelKey && !nm.mapel && <p role="status" className="mt-1 text-xs text-warn">Belum ada nama Arab untuk “{nm.mapelKey}”. Ketik di kolom di atas.</p>}</div>
                <div><Label htmlFor="nk-tahun">Tahun ajaran (hijriah)</Label>
                  {opsiTahun.length > 1
                    ? <Select id="nk-tahun" value={nm.tahun} onChange={(v) => setN('tahun', v)}>{opsiTahun.map((t) => <option key={t} value={t}>{t}</option>)}</Select>
                    : <input id="nk-tahun" className="field ar-input" dir="rtl" lang="ar" value={nm.tahun} maxLength={30} onChange={(e) => setN('tahun', e.target.value)} />}</div>
                <div><Label htmlFor="nk-penanda" hint="(kaki halaman)">Penanda</Label><input id="nk-penanda" className="field" dir="ltr" value={nm.penanda} maxLength={40} onChange={(e) => setN('penanda', e.target.value)} /></div>
                <div className="sm:col-span-2"><Label htmlFor="nk-b1">Baris kop 1 (madrasah)</Label><input id="nk-b1" className="field ar-input" dir="rtl" lang="ar" value={nm.baris1} maxLength={80} onChange={(e) => setN('baris1', e.target.value)} /></div>
                <div className="sm:col-span-2"><Label htmlFor="nk-b2">Baris kop 2 (lembaga)</Label><input id="nk-b2" className="field ar-input" dir="rtl" lang="ar" value={nm.baris2} maxLength={80} onChange={(e) => setN('baris2', e.target.value)} /></div>
                <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" className="mt-1" checked={nm.pegon !== false} onChange={(e) => setN('pegon', e.target.checked)} disabled={!window.Pegon} />
                  <span><b>Tulis soal dalam Pegon</b> <span className="text-xs text-mute">(kalimat soal, opsi, dan jawaban kunci; soal di bank tetap Latin)</span></span></label>
                <div className="sm:col-span-2"><Label htmlFor="nk-ejaan" hint="(huruf p, c, g, ng, ny)">Ejaan huruf Pegon</Label>
                  <Select id="nk-ejaan" value={window.Pegon ? window.Pegon.ejaanSah(nm.ejaan) : 'alqolam'} onChange={(v) => setN('ejaan', v)} disabled={nm.pegon === false}>
                    {Object.entries(window.Pegon ? window.Pegon.EJAAN : { alqolam: 'Al-Qolam' }).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                  </Select></div>
                <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" className="mt-1" checked={nm.narasi === true} onChange={(e) => setN('narasi', e.target.checked)} />
                  <span><b>Sertakan narasi/stimulus</b> <span className="text-xs text-mute">(bawaan mati: template hanya satu kalimat soal per nomor, seperti contoh)</span></span></label>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-mute">Soal dimasukkan ke bagian menurut bentuknya, dengan urutan pilihan Anda: <b>أ</b> pilihan ganda dan lanjutan, <b>ب</b> isian, <b>ج</b> uraian. Benar–Salah tidak ada di template. Naskah peserta tidak memuat kunci; <b>naskah kunci</b> menandai jawaban dan halaman kitab (ص) dengan warna merah.</p>
            </Section>
          )}

          <Section title="Pratinjau" lipat>
            {!chosen.length ? <p className="text-sm text-mute">{catatan ? 'Pilih minimal satu soal.' : 'Pilih minimal satu soal Approved.'}</p> :
              isNaskah ? (
                <div className="space-y-3 text-sm">
                  <p className="font-semibold" dir="rtl" lang="ar">{NK.judulDauri(nm.dawr)}</p>
                  <ul className="divide-y divide-line rounded-xl border border-line">
                    {naskah.bagian.map((bg) => (
                      <li key={bg.kode} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                        <span><b dir="rtl" lang="ar" className="ml-1 text-base">{bg.huruf}</b> {NK.BAGIAN[bg.kode].label}</span>
                        <span className={bg.kurang > 0 ? 'font-semibold text-warn' : 'font-semibold text-ok'}>{bg.terisi}/{bg.n} nomor × {bg.nilai} = {bg.terisi * bg.nilai}</span>
                      </li>
                    ))}
                    <li className="flex items-center justify-between gap-2 bg-soft px-3 py-2.5 font-bold"><span>Total nilai</span><span className={naskah.total === naskah.maks ? 'text-ok' : 'text-warn'}>{naskah.total} / {naskah.maks}</span></li>
                  </ul>
                  {naskah.peringatan.map((t, i) => <p key={i} role="status" className="rounded-xl bg-warn-bg px-3 py-2 text-xs text-warn">{t}</p>)}
                  {nkRagu.length > 0 && (
                    <p role="status" className="rounded-xl bg-warn-bg px-3 py-2 text-xs leading-relaxed text-warn">
                      <b>{nkRagu.length} kata diragukan mesin Pegon:</b> {nkRagu.map((x) => x.kata).join(', ')}. Pastikan ejaan Arabnya lalu tambahkan ke kamus di tab Pegonizer; naskah yang diunduh sesudahnya memakai ejaan itu.
                    </p>
                  )}
                  {naskah.tidakDipakai.length > 0 && (
                    <div className="rounded-xl border border-line p-3 text-xs">
                      <p className="mb-1 font-semibold">{naskah.tidakDipakai.length} soal tidak masuk naskah</p>
                      <ul className="space-y-1 text-mute">{naskah.tidakDipakai.map((x, i) => <li key={i}>{String(x.q.pertanyaan || '').slice(0, 60)}: {x.alasan}</li>)}</ul>
                    </div>
                  )}
                </div>
              ) :
              isText ? (
                <pre dir="auto" className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-bg p-4 text-xs leading-relaxed text-ink" style={{ fontFamily: "ui-monospace, Menlo, 'Amiri', monospace" }}>{text}</pre>
              ) : (
                <div className="max-h-[420px] space-y-4 overflow-auto rounded-xl bg-bg p-4">
                  {chosen.map((q, i) => (
                    <div key={q.id} className="text-sm">
                      <p className={`font-semibold ${isPegon ? 'ar-sm' : ''}`} dir={isPegon ? 'rtl' : undefined}>{i + 1}. {pv(fullQ(q))}</p>
                      <ul className="ml-4 mt-1" dir={isPegon ? 'rtl' : undefined}>{optsOf(q).map((k) => <li key={k} className={isPegon ? 'ar-sm' : ''}>{k}. {pv(q.opsi[k])}</li>)}</ul>
                      {fmt === 'kartu' && <>
                        <p className="mt-1 text-soft-ink">{Bt.BENTUK[Bt.bentukDari(q)].jawaban ? 'Jawaban' : 'Kunci'}: <b>{Bt.kunciTeks(q)}</b></p>
                        {q.teks && <p dir="rtl" lang="ar" className="ar ar-sm">{q.teks}</p>}
                      </>}
                    </div>
                  ))}
                </div>
              )}
          </Section>
        </div>
      </div>
    </div>
  );
}

export default Export;
