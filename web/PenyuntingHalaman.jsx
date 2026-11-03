import React, { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, History, Loader2, X } from 'lucide-react';
import { MAKS_TEKS_KOREKSI, MAKS_CATATAN_KOREKSI, bagianSunting, hasilSunting, bedaTeks, ringkasBeda } from './lib/koreksi.js';

// Penyunting satu halaman kitab (editor dan admin), dipakai di dalam PembacaKitab.jsx pada tombol "Koreksi teks".
// Tujuan: memperbaiki teks yang keliru (terutama hasil OCR AI) setelah dicocokkan dengan kitab asli. Server: src/kitabKoreksi.js.
// Halaman bermatn (batasMatn bukan null) disunting dalam dua kotak (matn dan syarah) supaya batas matn tetap benar; halaman lain satu kotak.
// Menyimpan mengirim `rev` yang dilihat penyunting; bila orang lain lebih dulu mengubah halaman ini, server menolak dan tidak ada yang tertimpa.
// `pem` = pemuat dari web/lib/perpus.js (koreksi, riwayat, lupakan). Btn, ErrorBox, apiErr dioper dari App.jsx lewat PembacaKitab.

const waktu = (iso) => { try { return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }) + ' WIB'; } catch { return String(iso || ''); } };

/** Beda per kata: yang dihapus dicoret merah, yang ditambah digarisbawahi hijau (tidak hanya warna, supaya terbaca tanpa membedakan warna). */
export function TampilanBeda({ potongan, arab, bahasa }) {
  return (
    <div dir={arab ? 'rtl' : 'ltr'} {...(bahasa ? { lang: bahasa } : {})} className={`${arab ? 'ar ' : ''}max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-line bg-bg px-3 py-2 !text-lg !leading-loose`}>
      {potongan.map((x, i) => (x.j === 'hapus' ? <del key={i} className="rounded bg-bad-bg px-0.5 text-bad">{x.t}</del>
        : x.j === 'tambah' ? <ins key={i} className="rounded bg-ok-bg px-0.5 text-ok underline">{x.t}</ins> : <React.Fragment key={i}>{x.t}</React.Fragment>))}
    </div>
  );
}

function Riwayat({ p, kitabId, pem, arab, bahasa, Btn, ErrorBox, apiErr, onPakai }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    let batal = false;
    pem.riwayat(kitabId, p.seq).then((r) => { if (!batal) setData(r); }).catch((e) => { const x = apiErr(e); if (!batal && x) setErr(x); });
    return () => { batal = true; };
  }, [kitabId, p.seq, p.rev]);
  const sama = (r) => (r.batasMatnLama === null) === (p.batasMatn === null || p.batasMatn === undefined);
  return (
    <div className="space-y-2 rounded-xl border border-line bg-soft/40 p-3" aria-label="Riwayat koreksi halaman ini" dir="ltr">
      {err && <ErrorBox e={err} />}
      {!data && !err && <p className="flex items-center gap-2 text-xs text-mute"><Loader2 size={13} className="spin" />Memuat riwayat...</p>}
      {data && !data.riwayat.length && <p className="text-xs text-mute">Halaman ini belum pernah dikoreksi.</p>}
      {data && data.riwayat.length > 0 && <p className="text-xs text-mute">{data.jumlah > data.riwayat.length ? `${data.riwayat.length} terbaru dari ${data.jumlah} perubahan.` : `${data.jumlah} perubahan.`} Terbaru di atas.</p>}
      <ul className="space-y-3">
        {data && data.riwayat.map((r) => (
          <li key={r.id} className="space-y-1.5 rounded-lg border border-line bg-surface p-2.5">
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-mute">
              <b className="text-ink">{r.namaOleh || 'Tanpa nama'}</b><span>{waktu(r.at)}</span>
              <span className="rounded-full bg-soft px-2 py-0.5 text-soft-ink">{r.jenis === 'verifikasi' ? 'ditandai cocok' : 'koreksi teks'}</span>
              {r.cocok && r.jenis !== 'verifikasi' && <span className="rounded-full bg-ok-bg px-2 py-0.5 text-ok">dicocokkan</span>}
            </p>
            {r.catatan && <p className="text-sm">{r.catatan}</p>}
            {r.jenis !== 'verifikasi' && <TampilanBeda potongan={bedaTeks(r.teksLama, r.teksBaru)} arab={arab} bahasa={bahasa} />}
            {r.jenis !== 'verifikasi' && sama(r) && <Btn kind="ghost" className="!px-3 !py-1 !text-xs" onClick={() => onPakai(r)}>Pakai teks sebelum perubahan ini</Btn>}
          </li>))}
      </ul>
    </div>
  );
}

export default function PenyuntingHalaman({ p, kitab, kitabId, arab, px, pem, Btn, ErrorBox, apiErr, onSimpan, onBatal, onKotor = () => {}, onMuatUlang = () => {} }) {
  const bagian = useMemo(() => bagianSunting(p), [p.seq, p.rev]);
  const [isi, setIsi] = useState(() => (bagian.terpisah ? { matn: bagian.matn, syarah: bagian.syarah } : { teks: bagian.teks }));
  const [cocok, setCocok] = useState(false);
  const [catatan, setCatatan] = useState('');
  const [lihatBeda, setLihatBeda] = useState(false);
  const [lihatRiwayat, setLihatRiwayat] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [salinInfo, setSalinInfo] = useState('');

  const hasil = hasilSunting(p, isi);
  const berubah = hasil.teks !== p.teks || (hasil.batasMatn ?? null) !== (p.batasMatn ?? null);
  const kepanjangan = hasil.teks.length > MAKS_TEKS_KOREKSI;
  const potongan = useMemo(() => (lihatBeda && berubah ? bedaTeks(p.teks, hasil.teks) : null), [lihatBeda, berubah, p.teks, hasil.teks]);
  const hitung = potongan ? ringkasBeda(potongan) : null;
  const bahasa = kitab && kitab.bahasa && kitab.bahasa !== 'lain' ? kitab.bahasa : (arab ? 'ar' : undefined);
  const bentrok = err && err.code === 'KOREKSI_BENTROK';

  useEffect(() => { onKotor(berubah); }, [berubah]);
  useEffect(() => () => onKotor(false), []);

  const gaya = { fontSize: `${px}px`, lineHeight: arab ? 2.15 : 1.75 };
  const kotak = (kunci, label, tinggi) => (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-mute" dir="ltr">{label}</span>
      <textarea dir={arab ? 'rtl' : 'ltr'} {...(bahasa ? { lang: bahasa } : {})} spellCheck={false} autoComplete="off" aria-label={label}
        className={`field ${arab ? 'ar ' : ''}w-full resize-y`} style={{ ...gaya, minHeight: tinggi }} value={isi[kunci]} disabled={busy}
        onChange={(e) => setIsi((s) => ({ ...s, [kunci]: e.target.value }))}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); if (!busy && (berubah || cocok) && !kepanjangan) simpan(); } }} />
    </label>
  );

  async function simpan() {
    setBusy(true); setErr(null);
    try {
      const r = await pem.koreksi(kitabId, p.seq, { rev: p.rev || 0, cocok, ...(catatan.trim() ? { catatan: catatan.trim() } : {}), ...(bagian.terpisah ? { matn: isi.matn, syarah: isi.syarah } : { teks: isi.teks }) });
      onSimpan(r.halaman, r.tidakBerubah === true);
    } catch (e) { const x = apiErr(e); if (x) setErr(x); } finally { setBusy(false); }
  }
  const batal = () => { if (berubah && !window.confirm('Perubahan teks belum disimpan. Buang perubahan?')) return; onBatal(); };
  const salin = async () => {
    try { await navigator.clipboard.writeText(bagian.terpisah ? `${isi.matn}\n${isi.syarah}` : isi.teks); setSalinInfo('Teks Anda disalin.'); }
    catch { setSalinInfo('Tidak bisa menyalin otomatis. Blok teksnya lalu salin manual.'); }
  };
  const pakaiLama = (r) => {
    const b = bagianSunting({ teks: r.teksLama, batasMatn: r.batasMatnLama });
    setIsi(b.terpisah ? { matn: b.matn, syarah: b.syarah } : { teks: b.teks });
    setLihatRiwayat(false);
  };

  return (
    <div className="space-y-3" dir="ltr" aria-label={`Koreksi teks halaman ${p.hal}`}>
      <p className="rounded-lg bg-soft px-3 py-2 text-xs text-soft-ink">
        Cocokkan dengan kitab asli, lalu perbaiki huruf, harakat, atau tanda baca yang keliru. Setiap perubahan tercatat (siapa, kapan, teks lama) dan bisa dikembalikan.
        {p.potongan ? ' Halaman cetak ini dibagi menjadi beberapa bagian; yang diubah hanya bagian ini.' : ''}
      </p>
      {bagian.terpisah ? (<>{kotak('matn', 'Matn', '7rem')}{kotak('syarah', 'Syarah', '12rem')}</>) : kotak('teks', 'Teks halaman', '14rem')}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mute" aria-live="polite">
        <span className={kepanjangan ? 'font-semibold text-bad' : ''}>{hasil.teks.length.toLocaleString('id-ID')} / {MAKS_TEKS_KOREKSI.toLocaleString('id-ID')} karakter</span>
        <span>{berubah ? 'Ada perubahan yang belum disimpan' : 'Belum ada perubahan'}</span>
        {hitung && <span>{hitung.hapus} kata dihapus, {hitung.tambah} kata ditambah</span>}
      </div>

      {potongan && <TampilanBeda potongan={potongan} arab={arab} bahasa={bahasa} />}
      {lihatRiwayat && <Riwayat p={p} kitabId={kitabId} pem={pem} arab={arab} bahasa={bahasa} Btn={Btn} ErrorBox={ErrorBox} apiErr={apiErr} onPakai={pakaiLama} />}

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={cocok} onChange={(e) => setCocok(e.target.checked)} disabled={busy} />
        <span><BadgeCheck size={14} className="mr-1 inline align-[-2px]" />Sudah saya cocokkan dengan kitab asli
          <span className="block text-xs text-mute">Halaman ditandai terverifikasi dan peringatan OCR tidak tampil lagi untuk halaman ini. Bila teks diubah lagi tanpa centang ini, tandanya dicabut.</span></span>
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-mute">Catatan perubahan (opsional)</span>
        <input className="field" maxLength={MAKS_CATATAN_KOREKSI} placeholder="Mis. harakat baris 3 disesuaikan dengan cetakan Dar al-Fikr" value={catatan} disabled={busy} onChange={(e) => setCatatan(e.target.value)} />
      </label>

      {err && (
        <div className="space-y-2">
          <ErrorBox e={err} />
          {bentrok && (
            <div className="flex flex-wrap items-center gap-2">
              <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={salin}>Salin teks saya dulu</Btn>
              <Btn kind="soft" className="!px-3 !py-1.5 !text-xs" onClick={onMuatUlang}>Muat ulang halaman (teks saya dibuang)</Btn>
              {salinInfo && <span role="status" className="text-xs text-mute">{salinInfo}</span>}
            </div>)}
        </div>)}

      <div className="flex flex-wrap items-center gap-2">
        <Btn kind="primary" onClick={simpan} disabled={busy || kepanjangan || (!berubah && !cocok)} title="Ctrl+Enter">
          {busy ? <Loader2 size={15} className="spin" /> : null}Simpan koreksi</Btn>
        <Btn kind="ghost" onClick={batal} disabled={busy}><X size={15} />Batal</Btn>
        <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => setLihatBeda((v) => !v)} aria-pressed={lihatBeda} disabled={!berubah && !lihatBeda}>Lihat perubahan</Btn>
        <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => setLihatRiwayat((v) => !v)} aria-pressed={lihatRiwayat}><History size={14} />Riwayat</Btn>
      </div>
    </div>
  );
}
