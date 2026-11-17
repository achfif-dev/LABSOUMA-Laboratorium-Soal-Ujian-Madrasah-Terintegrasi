import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2, Palette, RotateCcw, Save } from 'lucide-react';
import { HEX, KATEGORI, KUNCI_OPSI, OPSI, TEMPLAT, URUTAN_TEMPLAT, TAMPILAN_BAWAAN, efektif, normalisasiTampilan, terapkanTampilan, turunkanWarna } from './lib/tampilan.js';
import { Btn, Label, Section, callApi, apiErr } from './ui.jsx';

/** Kotak pratinjau mini satu template (selalu palet terang): kepala, tombol, kartu. Tidak bergantung pada tema aplikasi yang sedang aktif. */
function Mini({ id }) {
  const p = TEMPLAT[id].terang;
  return (
    <div aria-hidden="true" className="overflow-hidden border" style={{ background: p.bg, borderColor: p.line, borderRadius: TEMPLAT[id].sudut === 'tajam' ? 3 : TEMPLAT[id].sudut === 'bulat' ? 12 : 8 }}>
      <div style={{ background: p.head, height: 16, borderBottom: TEMPLAT[id].header === 'pola' ? `2px solid ${p.accent}` : 'none', display: 'flex', alignItems: 'flex-end', gap: 3, padding: '0 6px' }}>
        {TEMPLAT[id].subtab !== 'kiri' && [0, 1].map((i) => <div key={i} style={TEMPLAT[id].subtab === 'garis' ? { width: 14, height: 5, borderBottom: `2px solid ${p['head-ink']}`, opacity: i ? .4 : .9 } : { width: 14, height: 5, background: p['head-ink'], borderRadius: 3, opacity: i ? .3 : .55, marginBottom: 1 }} />)}
      </div>
      <div className="flex gap-1.5 p-2">
        {(TEMPLAT[id].nav === 'samping' || TEMPLAT[id].subtab === 'kiri') && (
          <div style={{ background: p.soft, width: 20, borderRadius: 3, padding: 2 }}>
            <div style={{ background: p.brand, height: 4, borderRadius: 2, opacity: .85 }} />
            {TEMPLAT[id].subtab === 'kiri' && [0, 1, 2].map((i) => <div key={i} style={{ background: p.mute, height: 2, margin: '3px 0 0 4px', borderRadius: 1, opacity: i === 0 ? .9 : .45 }} />)}
          </div>
        )}
        {TEMPLAT[id].nav === 'rel' && TEMPLAT[id].subtab !== 'kiri' && <div style={{ background: p.soft, width: 9, borderRadius: 3 }} />}
        <div className="flex-1 space-y-1.5">
          <div style={{ background: p.surface, border: TEMPLAT[id].kartu === 'garis' ? `1px solid ${p.ink}33` : 'none', boxShadow: TEMPLAT[id].kartu === 'bayangan' ? '0 1px 3px rgba(0,0,0,.18)' : 'none', borderRadius: 4, padding: 4 }}>
            <div style={{ background: p.ink, height: 4, width: '60%', borderRadius: 2, opacity: .8 }} />
            <div style={{ background: p.mute, height: 3, width: '85%', borderRadius: 2, marginTop: 3, opacity: .6 }} />
          </div>
          <div className="flex gap-1.5">
            <div style={{ background: p.brand, height: 10, width: 34, borderRadius: 3 }} />
            <div style={{ background: p.soft, height: 10, width: 24, borderRadius: 3 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Pilihan template tampilan dan penyesuaiannya (admin). Perubahan langsung dipratinjau di layar ini lewat terapkanTampilan; baru berlaku untuk
 * semua pengguna setelah Simpan. Saat panel ditutup tanpa menyimpan, tampilan kembali ke yang tersimpan.
 */
export default function TampilanAdmin({ tampilan, onSaved, toast }) {
  const tersimpan = useMemo(() => normalisasiTampilan(tampilan), [tampilan]);
  const [d, setD] = useState(tersimpan);
  const [busy, setBusy] = useState(false);
  const simpanRef = useRef(tersimpan);
  useEffect(() => { simpanRef.current = tersimpan; setD(tersimpan); }, [tersimpan]);
  useEffect(() => { terapkanTampilan(d); }, [d]);
  useEffect(() => () => { terapkanTampilan(simpanRef.current); }, []);

  const kanon = (x) => JSON.stringify(normalisasiTampilan(x));
  const dirty = kanon(d) !== kanon(tersimpan);
  const t = TEMPLAT[d.templat]; const e = efektif(d);
  const [kat, setKat] = useState('semua');
  const pilihTemplat = (id) => setD({ templat: id, ganti: {} });
  const tampil = URUTAN_TEMPLAT.filter((id) => kat === 'semua' || TEMPLAT[id].kategori === kat);
  // Sub-tab di kiri hidup di menu samping penuh: memilih menu lain mengembalikan sub-tab ke kepala; memilih sub-tab kiri otomatis memakai menu samping.
  const setOpsi = (k, v) => setD((x) => {
    const g = { ...x.ganti, [k]: v };
    if (k === 'nav' && v !== 'samping' && efektif(x).subtab === 'kiri') g.subtab = 'kapsul';
    if (k === 'subtab' && v === 'kiri') g.nav = 'samping';
    return normalisasiTampilan({ ...x, ganti: g });
  });
  const setWarna = (v) => setD((x) => { const g = { ...x.ganti }; if (v) g.warnaUtama = v; else delete g.warnaUtama; return { ...x, ganti: g }; });
  const [teksWarna, setTeksWarna] = useState(d.ganti.warnaUtama || '');
  useEffect(() => { setTeksWarna(d.ganti.warnaUtama || ''); }, [d.ganti.warnaUtama]);
  const warnaAktif = d.ganti.warnaUtama || t.terang.brand;
  const turunan = d.ganti.warnaUtama ? turunkanWarna(d.ganti.warnaUtama, t) : null;
  const disesuaikan = turunan && turunan.terang.brand !== d.ganti.warnaUtama;

  const simpan = async () => {
    setBusy(true);
    try { const r = await callApi('/api/app-config', { aksi: 'tampilansimpan', tampilan: normalisasiTampilan(d) }); onSaved(normalisasiTampilan(r.tampilan)); toast('Tampilan aplikasi disimpan untuk semua pengguna.'); }
    catch (er) { const x = apiErr(er); toast(x && x.message ? x.message : 'Gagal menyimpan tampilan.'); }
    finally { setBusy(false); }
  };

  return (
    <Section title={`Tampilan Aplikasi (${t.label}${dirty ? ', belum disimpan' : ''})`} icon={Palette} lipatSemua>
      <div className="space-y-5">
      <div>
        <p className="text-xs leading-relaxed text-mute">
          Pilih template, lalu sesuaikan bila perlu. Perubahan langsung terlihat di layar ini sebagai pratinjau, dan baru berlaku untuk semua pengguna setelah <b className="text-ink">Simpan</b>.
          Setiap template sudah diuji agar teks tetap terbaca di mode terang maupun gelap.
        </p>
      </div>

      <div role="group" aria-label="Kategori template" className="flex flex-wrap gap-1.5">
        {[{ id: 'semua', label: 'Semua' }, ...KATEGORI].map((k) => {
          const n = k.id === 'semua' ? URUTAN_TEMPLAT.length : URUTAN_TEMPLAT.filter((id) => TEMPLAT[id].kategori === k.id).length;
          return (
            <button key={k.id} type="button" aria-pressed={kat === k.id} onClick={() => setKat(k.id)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${kat === k.id ? 'border-brand bg-brand text-brand-fg' : 'border-line hover:border-brand'}`}>{k.label} <span className="opacity-75">{n}</span></button>
          );
        })}
      </div>
      {kat !== 'semua' && <p className="-mt-2 text-xs text-mute">{KATEGORI.find((k) => k.id === kat).deskripsi}</p>}

      <div role="radiogroup" aria-label="Template tampilan" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tampil.map((id) => {
          const aktif = d.templat === id;
          return (
            <button key={id} type="button" role="radio" aria-checked={aktif} onClick={() => pilihTemplat(id)}
              className={`rounded-xl border p-3 text-left transition ${aktif ? 'border-brand ring-2 ring-brand' : 'border-line hover:border-brand'}`}>
              <Mini id={id} />
              <p className="mt-2 flex items-center gap-1.5 text-sm font-bold">{TEMPLAT[id].label}{aktif && <Check size={15} className="text-brand" aria-label="Dipilih" />}<span className="ml-auto rounded-full bg-soft px-2 py-px text-[10px] font-semibold text-soft-ink">{KATEGORI.find((k) => k.id === TEMPLAT[id].kategori).label}</span></p>
              <p className="mt-0.5 text-xs leading-relaxed text-mute">{TEMPLAT[id].deskripsi}</p>
            </button>
          );
        })}
      </div>

      <div className="space-y-3 border-t border-line pt-4">
        <h3 className="text-sm font-bold">Sesuaikan</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {KUNCI_OPSI.map((k) => (
            <div key={k}>
              <Label htmlFor={`tpl-${k}`}>{OPSI[k].label}</Label>
              <select id={`tpl-${k}`} className="field" value={e[k]} onChange={(ev) => setOpsi(k, ev.target.value)}>
                {Object.entries(OPSI[k].nilai).map(([v, lbl]) => <option key={v} value={v}>{lbl}{v === t[k] && v !== TEMPLAT.zamrud[k] ? ' (template)' : ''}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-dashed border-line p-3" aria-label="Contoh huruf">
          <p className="text-xs font-semibold text-mute">Contoh huruf terpilih</p>
          <p dir="auto" className="mt-1 text-sm">Bank Soal Ujian Madrasah, Fiqih kelas VII: 0123456789.</p>
          <p lang="ar" dir="rtl" className="ar mt-1">بسم الله الرحمن الرحيم، إنما الأعمال بالنيات</p>
        </div>
        <p className="text-xs leading-relaxed text-mute">Huruf pilihan diunduh dari Google Fonts hanya bila dipilih (butuh internet di perangkat pengguna; bila gagal, huruf sistem dipakai). Pengaturan ini hanya mengubah tampilan di layar, bukan berkas Word atau PDF hasil ekspor. Huruf Arab bergaya kufi memakan ruang lebih besar daripada naskh.</p>
        <div className="grid items-end gap-3 sm:grid-cols-[auto_1fr_auto]">
          <div>
            <Label htmlFor="tpl-warna">Warna utama sendiri <span className="font-normal text-mute">(opsional)</span></Label>
            <input id="tpl-warna" type="color" aria-label="Pilih warna utama" value={HEX.test(warnaAktif) ? warnaAktif : '#0d6b4e'} onChange={(ev) => setWarna(ev.target.value)} className="h-10 w-16 cursor-pointer rounded-lg border border-line bg-surface p-1" />
          </div>
          <div>
            <Label htmlFor="tpl-hex">Kode warna</Label>
            <input id="tpl-hex" className="field max-w-[10rem] font-mono" placeholder={t.terang.brand} maxLength={7} value={teksWarna} onChange={(ev) => { const v = ev.target.value.trim(); setTeksWarna(v); if (HEX.test(v)) setWarna(v); else if (v === '') setWarna(''); }} aria-describedby="tpl-warna-info" />
          </div>
          <Btn kind="ghost" onClick={() => setWarna('')} disabled={!d.ganti.warnaUtama}>Pakai warna template</Btn>
        </div>
        <p id="tpl-warna-info" className="text-xs leading-relaxed text-mute">
          Warna utama dipakai untuk tombol, tautan, dan kepala halaman; warna turunannya dibuat otomatis untuk mode terang dan gelap.
          {disesuaikan && <> Warna ini <b className="text-ink">disesuaikan sedikit</b> (menjadi <code>{turunan.terang.brand}</code> di mode terang) agar teks di atasnya tetap terbaca.</>}
          {teksWarna && !HEX.test(teksWarna) && <span className="text-bad"> Tulis dengan format #rrggbb, mis. #0d6b4e.</span>}
        </p>
        {(e.nav !== 'menu' || e.subtab === 'kiri') && <p className="text-xs leading-relaxed text-mute">Menu di sisi kiri dan sub-tab ke bawah hanya tampil di layar lebar (tablet landscape dan komputer); di HP tetap memakai menu buka-tutup dan sub-tab di kepala. Sub-tab di kiri otomatis memakai menu samping penuh.</p>}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <Btn kind="primary" onClick={simpan} disabled={busy || !dirty}>{busy ? <Loader2 size={16} className="spin" /> : <Save size={16} />}Simpan untuk semua pengguna</Btn>
        <Btn kind="ghost" onClick={() => setD(tersimpan)} disabled={busy || !dirty}>Batalkan perubahan</Btn>
        <Btn kind="ghost" onClick={() => setD(TAMPILAN_BAWAAN)} disabled={busy || kanon(d) === kanon(TAMPILAN_BAWAAN)}><RotateCcw size={16} />Kembali ke tampilan bawaan</Btn>
      </div>
      {dirty && <p role="status" className="text-xs text-warn">Ada perubahan yang belum disimpan; hanya Anda yang melihatnya sebagai pratinjau.</p>}
      </div>
    </Section>
  );
}
