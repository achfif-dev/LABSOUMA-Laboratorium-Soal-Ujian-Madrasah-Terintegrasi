import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Hash, History, Loader2, Undo2, X } from 'lucide-react';
import { MAKS_NOMOR_PER_PANGGILAN, MAKS_CATATAN_NOMOR, LABEL_JENIS_NOMOR, periksaOp, pratinjauKasar } from './lib/nomorHalaman.js';

// Penyunting nomor halaman cetak (editor dan admin), dibuka dari tombol "Nomor hal." pada kepala halaman di PembacaKitab.jsx.
// Tujuan: menyamakan "Hal. N" di aplikasi dengan kitab cetak yang dipegang madrasah. Server: src/kitabNomor.js; aturan hitungan: web/lib/nomorHalaman.js.
// Tiga cara: satu halaman, geser (nomor ditambah selisih; cukup menyebut nomor yang benar untuk halaman pertama), urutkan (nomori ulang berurutan).
// Setiap proses maksimal 250 halaman; kitab lebih panjang dikerjakan berurutan (tombol "Lanjutkan"). Setiap proses tercatat dan bisa dipulihkan lewat Riwayat.
// Kunci `op` dibuat sekali per isian: bila jaringan putus setelah server menyimpan, mengulang kirim tidak menggeser dua kali.
// `pem` = pemuat dari web/lib/perpus.js. Btn, ErrorBox, apiErr dioper dari App.jsx lewat PembacaKitab.

const waktu = (iso) => { try { return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }) + ' WIB'; } catch { return String(iso || ''); } };
const angka = (s) => (/^-?\d+$/.test(String(s ?? '').trim()) ? Number(String(s).trim()) : NaN);
const buatId = () => `${(globalThis.crypto && globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID().replace(/-/g, '') : Math.random().toString(36).slice(2))}${Date.now().toString(36)}`.slice(0, 32);
const tanda = (n) => (n > 0 ? `+${n}` : String(n));

const CARA = [
  { id: 'satu', label: 'Halaman ini' },
  { id: 'geser', label: 'Geser nomor' },
  { id: 'urut', label: 'Urutkan' },
];
const PENJELASAN = {
  satu: 'Beri satu halaman nomor cetak yang benar. Bagian lanjutan dari halaman cetak yang dibagi ikut bernomor sama.',
  geser: 'Semua nomor di rentang ditambah selisih yang sama. Cocok bila kitab cetak Anda mulai dari nomor lain (mis. di sini hal. 1, di kitab hal. 31). Nomor kembar atau mundur bawaan kitab tetap.',
  urut: 'Nomori ulang berurutan mulai nomor yang Anda tentukan. Cocok untuk memperbaiki nomor kembar, mundur, atau lompat. Bagian dari halaman cetak yang dibagi tetap bernomor sama.',
};

function Riwayat({ kitabId, pem, Btn, ErrorBox, apiErr, onPulih, versi }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [busyId, setBusyId] = useState('');
  useEffect(() => {
    let batal = false; setData(null); setErr(null);
    pem.nomorRiwayat(kitabId).then((r) => { if (!batal) setData(r); }).catch((e) => { const x = apiErr(e); if (!batal && x) setErr(x); });
    return () => { batal = true; };
  }, [kitabId, versi]);
  const pulihkan = async (r) => {
    if (!window.confirm(`Kembalikan nomor halaman ke keadaan sebelum penyesuaian ini (${r.jumlah} halaman, urutan ${r.dari}–${r.sampai})?`)) return;
    setBusyId(r.id); setErr(null);
    try { onPulih(await pem.nomor(kitabId, { op: buatId(), jenis: 'pulih', riwayatId: r.id })); }
    catch (e) { const x = apiErr(e); if (x) setErr(x); } finally { setBusyId(''); }
  };
  const ringkasParam = (r) => {
    const p = r.parameter || {};
    return [p.selisih !== undefined && `selisih ${tanda(p.selisih)}`, p.mulai !== undefined && `mulai hal. ${p.mulai}`, p.hal !== undefined && `hal. ${p.hal}`, p.juz !== undefined && `juz ${p.juz}`].filter(Boolean).join(', ');
  };
  return (
    <div className="space-y-2 rounded-xl border border-line bg-soft/40 p-3" aria-label="Riwayat penyesuaian nomor halaman">
      {err && <ErrorBox e={err} />}
      {!data && !err && <p className="flex items-center gap-2 text-xs text-mute"><Loader2 size={13} className="spin" />Memuat riwayat...</p>}
      {data && !data.riwayat.length && <p className="text-xs text-mute">Nomor halaman kitab ini belum pernah disesuaikan.</p>}
      {data && data.riwayat.length > 0 && <p className="text-xs text-mute">{data.jumlah > data.riwayat.length ? `${data.riwayat.length} terbaru dari ${data.jumlah} penyesuaian.` : `${data.jumlah} penyesuaian.`} Terbaru di atas. Pemulihan hanya bisa bila nomor di rentang itu belum diubah lagi, jadi pulihkan dari yang terbaru.</p>}
      <ul className="space-y-2">
        {data && data.riwayat.map((r) => (
          <li key={r.id} className="space-y-1 rounded-lg border border-line bg-surface p-2.5 text-xs">
            <p className="flex flex-wrap items-center gap-x-2 text-mute"><b className="text-ink">{r.namaOleh || 'Tanpa nama'}</b><span>{waktu(r.at)}</span>
              <span className="rounded-full bg-soft px-2 py-0.5 text-soft-ink">{LABEL_JENIS_NOMOR[r.jenis] || r.jenis}</span>
              {r.dipulihkan && <span className="rounded-full bg-ok-bg px-2 py-0.5 text-ok">sudah dipulihkan</span>}</p>
            <p>{r.jumlah} halaman, urutan {r.dari}–{r.sampai}{ringkasParam(r) ? ` · ${ringkasParam(r)}` : ''}</p>
            {r.sampel && <p className="text-mute">Contoh: urutan {r.sampel.awal.seq} hal. {r.sampel.awal.dari} → {r.sampel.awal.jadi}{r.sampel.akhir.seq !== r.sampel.awal.seq ? `; urutan ${r.sampel.akhir.seq} hal. ${r.sampel.akhir.dari} → ${r.sampel.akhir.jadi}` : ''}</p>}
            {r.catatan && <p>{r.catatan}</p>}
            {!r.dipulihkan && r.jenis !== 'pulih' && r.jumlah > 0 && <Btn kind="ghost" className="!px-3 !py-1 !text-xs" disabled={!!busyId} onClick={() => pulihkan(r)}>{busyId === r.id ? <Loader2 size={13} className="spin" /> : <Undo2 size={13} />}Kembalikan nomor lama</Btn>}
          </li>))}
      </ul>
    </div>
  );
}

export default function PenyuntingNomor({ kitab, kitabId, total, kursor, pem, Btn, ErrorBox, apiErr, admin = false, onSelesai, onTutup }) {
  const [cara, setCara] = useState('satu');
  const [dari, setDari] = useState(String(kursor));
  const [sampai, setSampai] = useState(String(kursor));
  const [target, setTarget] = useState('');
  const [juz, setJuz] = useState('');
  const [catatan, setCatatan] = useState('');
  const [sesuaiCetak, setSesuaiCetak] = useState(false);
  const [halDari, setHalDari] = useState(null);
  const [halSampai, setHalSampai] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [hasil, setHasil] = useState(null);
  const [lihatRiwayat, setLihatRiwayat] = useState(false);
  const [versiRiwayat, setVersiRiwayat] = useState(0);
  const opRef = useRef(null);
  const lanjutRef = useRef(null); // { selisih } bila "Lanjutkan" pada cara geser: nomor target dihitung setelah halaman awal bagian berikutnya terbaca

  const nDari = angka(dari); const nSampai = cara === 'satu' ? nDari : angka(sampai);
  useEffect(() => {
    let batal = false;
    if (!Number.isInteger(nDari) || nDari < 1 || nDari > total) { setHalDari(null); return undefined; }
    pem.halaman(kitabId, nDari, nDari, total).then((l) => {
      if (batal) return;
      setHalDari(l[0] || null);
      if (l[0] && lanjutRef.current && lanjutRef.current.selisih !== undefined) { setTarget(String(l[0].hal + lanjutRef.current.selisih)); }
      lanjutRef.current = null;
    }).catch(() => { if (!batal) setHalDari(null); });
    return () => { batal = true; };
  }, [nDari, kitabId, total, versiRiwayat]);
  useEffect(() => {
    let batal = false;
    if (cara === 'satu' || !Number.isInteger(nSampai) || nSampai < 1 || nSampai > total) { setHalSampai(null); return undefined; }
    pem.halaman(kitabId, nSampai, nSampai, total).then((l) => { if (!batal) setHalSampai(l[0] || null); }).catch(() => { if (!batal) setHalSampai(null); });
    return () => { batal = true; };
  }, [nSampai, cara, kitabId, total, versiRiwayat]);

  const pilihCara = (c) => {
    setCara(c); setErr(null); setHasil(null); opRef.current = null;
    setSampai(c === 'satu' ? dari : String(Math.min(total, (Number.isInteger(nDari) ? nDari : 1) + MAKS_NOMOR_PER_PANGGILAN - 1)));
    setTarget('');
  };

  const nTarget = angka(target); const nJuz = juz.trim() === '' ? undefined : angka(juz);
  const bentuk = useMemo(() => {
    const dasar = { jenis: cara, dari: nDari, ...(cara === 'satu' ? {} : { sampai: nSampai }), ...(nJuz !== undefined ? { juz: nJuz } : {}) };
    if (cara === 'satu') return { ...dasar, hal: nTarget };
    if (cara === 'geser') return { ...dasar, selisih: halDari && Number.isInteger(nTarget) ? nTarget - halDari.hal : NaN };
    return { ...dasar, mulai: nTarget };
  }, [cara, nDari, nSampai, nTarget, nJuz, halDari]);
  const { op, galat } = useMemo(() => periksaOp(bentuk, total), [bentuk, total]);
  const galatTampil = cara === 'geser' && halDari && Number.isInteger(nTarget) && nTarget === halDari.hal ? 'Nomor itu sama dengan nomor sekarang, tidak ada yang bergeser.'
    : (target.trim() === '' || (cara === 'geser' && !halDari)) ? '' : galat;
  const jumlahHalaman = Number.isInteger(nDari) && Number.isInteger(nSampai) ? nSampai - nDari + 1 : 0;
  const kasar = op ? pratinjauKasar(op, halDari, halSampai) : null;
  const siap = !!op && !busy && !galatTampil && (target.trim() !== '');

  async function simpan() {
    if (!siap) return;
    if (jumlahHalaman > 1 && !window.confirm(`Ubah nomor cetak ${jumlahHalaman} halaman (urutan ${op.dari}–${op.sampai})?\n\nPerubahan tercatat dan bisa dikembalikan lewat Riwayat. Soal yang sudah dibuat tidak ikut berubah.`)) return;
    const kunci = JSON.stringify([op, catatan, sesuaiCetak]);
    if (!opRef.current || opRef.current.kunci !== kunci) opRef.current = { kunci, id: buatId() };
    setBusy(true); setErr(null); setHasil(null);
    try {
      const r = await pem.nomor(kitabId, { ...op, op: opRef.current.id, ...(catatan.trim() ? { catatan: catatan.trim() } : {}), ...(admin && sesuaiCetak ? { sesuaiCetak: true } : {}) });
      opRef.current = null; setHasil({ ...r, selisih: op.selisih, cara: op.jenis }); setVersiRiwayat((v) => v + 1);
      onSelesai(r);
    } catch (e) { const x = apiErr(e); if (x) setErr(x); } finally { setBusy(false); }
  }

  const lanjut = () => {
    const h = hasil; if (!h || h.akhir >= total) return;
    const baruDari = h.akhir + 1;
    setHasil(null); setErr(null); opRef.current = null;
    setDari(String(baruDari)); setSampai(String(Math.min(total, baruDari + MAKS_NOMOR_PER_PANGGILAN - 1)));
    if (h.cara === 'urut') setTarget(String((h.halTerakhir ?? 0) + 1));
    else { setTarget(''); lanjutRef.current = { selisih: h.selisih }; }
  };

  const pesanHasil = !hasil ? '' : hasil.diulang ? 'Proses ini sudah berhasil sebelumnya (permintaan diulang); tidak ada yang diubah lagi.'
    : hasil.tidakBerubah ? 'Nomor sudah sesuai; tidak ada yang diubah.'
    : `Nomor cetak ${hasil.jumlah} halaman diubah (urutan ${hasil.dari}–${hasil.akhir}). Pencarian, daftar isi, dan pemilih kitab memakai nomor baru.`;

  return (
    <section className="space-y-3 rounded-2xl border border-brand/40 bg-surface p-3 shadow-sm sm:p-4" dir="ltr" aria-label="Sesuaikan nomor halaman cetak">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold"><Hash size={16} />Sesuaikan nomor halaman cetak</p>
        <button type="button" onClick={onTutup} aria-label="Tutup penyunting nomor halaman" className="rounded-lg p-1 text-mute hover:bg-soft"><X size={16} /></button>
      </div>
      {kitab && kitab.halamanVirtual && <p className="rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn">Halaman kitab ini dibagi otomatis menurut panjang teks, jadi satu halaman di sini belum tentu satu halaman cetak. Cocokkan dengan kitab cetak, lalu pakai cara Urutkan atau Halaman ini.</p>}

      <div role="group" aria-label="Cara penyesuaian" className="flex flex-wrap gap-1.5">
        {CARA.map((c) => <Btn key={c.id} kind={cara === c.id ? 'primary' : 'ghost'} className="!px-3 !py-1.5 !text-xs" aria-pressed={cara === c.id} onClick={() => pilihCara(c.id)} disabled={busy}>{c.label}</Btn>)}
      </div>
      <p className="text-xs text-mute">{PENJELASAN[cara]}</p>

      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1"><span className="text-xs font-semibold text-mute">{cara === 'satu' ? 'Urutan halaman' : 'Dari urutan'}</span>
          <input inputMode="numeric" className="field" value={dari} disabled={busy} onChange={(e) => { setDari(e.target.value); if (cara === 'satu') setSampai(e.target.value); setHasil(null); }} /></label>
        {cara !== 'satu' && <label className="block space-y-1"><span className="text-xs font-semibold text-mute">Sampai urutan</span>
          <input inputMode="numeric" className="field" value={sampai} disabled={busy} onChange={(e) => { setSampai(e.target.value); setHasil(null); }} /></label>}
      </div>
      {cara !== 'satu' && jumlahHalaman > MAKS_NOMOR_PER_PANGGILAN && <p className="text-xs text-bad">Maksimal {MAKS_NOMOR_PER_PANGGILAN} halaman per proses; kerjakan bagian berikutnya sesudahnya.</p>}
      {halDari && <p className="text-xs text-mute">Urutan {halDari.seq} sekarang: hal. {halDari.hal}, juz {halDari.juz}{halDari.nomorAnomali ? ` (nomor ${halDari.nomorAnomali})` : ''}.</p>}

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-mute">{cara === 'satu' ? 'Nomor cetak yang benar' : cara === 'geser' ? `Nomor di kitab cetak untuk urutan ${Number.isInteger(nDari) ? nDari : '…'}` : `Nomor awal untuk urutan ${Number.isInteger(nDari) ? nDari : '…'}`}</span>
        <input inputMode="numeric" className="field" placeholder="Mis. 31" value={target} disabled={busy} onChange={(e) => { setTarget(e.target.value); setHasil(null); }} />
      </label>
      {cara === 'geser' && op && halDari && <p className="text-xs">Selisih: <b>{tanda(op.selisih)}</b>{kasar && kasar.akhir !== null && halSampai ? <> · urutan {halSampai.seq}: hal. {halSampai.hal} → <b>{kasar.akhir}</b></> : null}</p>}
      {cara === 'urut' && op && <p className="text-xs text-mute">Halaman terakhir mendapat nomor kira-kira {op.mulai + Math.max(0, jumlahHalaman - 1)} (lebih kecil bila ada bagian dari halaman cetak yang dibagi); server menghitung yang pasti.</p>}
      {galatTampil && <p role="alert" className="text-xs text-bad">{galatTampil}</p>}

      <label className="block space-y-1"><span className="text-xs font-semibold text-mute">Juz / jilid (kosongkan bila tidak berubah)</span>
        <input inputMode="numeric" className="field" value={juz} disabled={busy} onChange={(e) => { setJuz(e.target.value); setHasil(null); }} /></label>
      <label className="block space-y-1"><span className="text-xs font-semibold text-mute">Catatan (opsional)</span>
        <input className="field" maxLength={MAKS_CATATAN_NOMOR} placeholder="Mis. disesuaikan dengan cetakan Dar al-Kutub 1422 H" value={catatan} disabled={busy} onChange={(e) => setCatatan(e.target.value)} /></label>
      {admin && kitab && kitab.halamanVirtual && (
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={sesuaiCetak} disabled={busy} onChange={(e) => setSesuaiCetak(e.target.checked)} />
          <span>Penomoran kitab ini sudah sesuai kitab cetak<span className="block text-xs text-mute">Peringatan "halaman dibagi otomatis" dihapus untuk kitab ini. Centang hanya bila seluruh halaman sudah dicocokkan.</span></span></label>)}

      {err && <ErrorBox e={err} />}
      {pesanHasil && <p role="status" className="rounded-lg bg-ok-bg px-3 py-2 text-xs text-ok">{pesanHasil}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Btn kind="primary" onClick={simpan} disabled={!siap}>{busy ? <Loader2 size={15} className="spin" /> : null}Terapkan nomor</Btn>
        {hasil && !hasil.tidakBerubah && cara !== 'satu' && hasil.akhir < total && <Btn kind="soft" className="!px-3 !py-1.5 !text-xs" onClick={lanjut} disabled={busy}>Lanjutkan ke urutan {hasil.akhir + 1}</Btn>}
        <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => setLihatRiwayat((v) => !v)} aria-pressed={lihatRiwayat}><History size={14} />Riwayat</Btn>
      </div>
      {lihatRiwayat && <Riwayat kitabId={kitabId} pem={pem} Btn={Btn} ErrorBox={ErrorBox} apiErr={apiErr} versi={versiRiwayat} onPulih={(r) => { setHasil({ ...r, cara: 'pulih' }); setVersiRiwayat((v) => v + 1); onSelesai(r); }} />}
    </section>
  );
}
