import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Library, Loader2, ChevronLeft, ChevronRight, Plus, Check } from 'lucide-react';
import { buatPemuat, isianRujukan, labelEntri, rentangBab } from './lib/perpus.js';
import { tampilanTeks } from './lib/bahasa.js';
import { kitabPerpusUntuk, selesaikanBatas, batasBisaDipakai, labelBatas, indeksBabDalamBatas } from './lib/batasUjian.js';

// Pemilih kitab, bab, dan halaman dari perpustakaan (hasil impor admin). Dipakai di Penyusunan Soal (mode "form": ganti atau tambah teks)
// dan Paket Dauri (mode "paket": menambah halaman ke materi). Tidak menulis apa pun sendiri: hasilnya diserahkan ke `onPakai`.
// `Btn`, `ErrorBox`, `callApi`, `apiErr` dioper dari App.jsx (menghindari impor melingkar). Simpanan memori dibagi antarlayar selama sesi.
export const SIMPANAN = { daftar: null, isi: new Map(), halaman: new Map() }; // diekspor hanya agar tes render bisa mengisinya

// `onBatas` (opsional) dipanggil dengan { kitabId, res } bila batas berlaku, selain itu null.
// `rencana` (opsional) = penempatan kitab dari Konfigurasi untuk kelas dan ujian yang dipilih: { kitabCfg, batas, siap, otomatis }.
//   - kitab perpustakaan dipilih otomatis (tautan di Konfigurasi, atau cocok menurut nama);
//   - bila ada `batas`: bab yang ditawarkan dan gerak halaman DIKUNCI di dalam batas, dan (otomatis) halaman pertama batas langsung dipakai
//     bila Teks Kitab masih kosong. Tanpa `rencana`, perilaku sama persis seperti sebelumnya.
export default function PemilihKitab({ Btn, ErrorBox, callApi, apiErr, katalog = [], mode = 'form', onPakai, sekarang = {}, batas = null, disabled = false, rencana = null, onBatas = null }) {
  const pem = useMemo(() => buatPemuat((b) => callApi('/api/kitab', b), SIMPANAN), []);
  const [daftar, setDaftar] = useState(SIMPANAN.daftar);
  const [kitabId, setKitabId] = useState('');
  const [isi, setIsi] = useState(null);       // { kitab, entri }
  const [babIdx, setBabIdx] = useState('');
  const [kursor, setKursor] = useState(1);
  const [jumlah, setJumlah] = useState(1);
  const [bagian, setBagian] = useState('semua');
  const [halaman, setHalaman] = useState([]);
  const [halInput, setHalInput] = useState('');
  const [kembar, setKembar] = useState([]);   // hasil cari nomor cetak yang cocok dengan lebih dari satu halaman
  const [info, setInfo] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const urut = useRef(0);                     // hanya jawaban permintaan terakhir yang dipakai (ketukan cepat)
  const kunciTerapan = useRef('');            // rencana yang sudah diterapkan: pilihan manual penyusun tidak ditimpa terus-menerus
  const menungguOto = useRef(false);          // true = halaman pertama batas belum diisikan otomatis

  const gagal = (e) => { const x = apiErr(e); if (x) setErr(x); };
  useEffect(() => { pem.daftar(true).then(setDaftar).catch((e) => { if (!SIMPANAN.daftar) gagal(e); }); }, []); // cocokkan ulang ke server: kitab yang dihapus admin tidak boleh tetap terpilih
  useEffect(() => {
    setIsi(null); setHalaman([]); setBabIdx(''); setKursor(1); setBagian('semua'); setKembar([]); setInfo('');
    if (!kitabId) return;
    setErr(null);
    pem.isi(kitabId).then(setIsi).catch(gagal);
  }, [kitabId]);
  const total = isi ? isi.kitab.jumlahHalaman : 0;
  // Penempatan dari Konfigurasi: kitab perpustakaan sasaran, lalu batas ujian diselesaikan terhadap daftar isi TERKINI (otomatis sinkron).
  const sasaran = rencana && daftar ? kitabPerpusUntuk(rencana.kitabCfg, daftar).item : null;
  const sasaranId = sasaran ? sasaran.id : '';
  const kunciRencana = rencana ? `${sasaranId}|${JSON.stringify(rencana.batas || null)}` : '';
  const res = useMemo(() => (rencana && rencana.batas && isi && sasaranId && kitabId === sasaranId ? selesaikanBatas(rencana.batas, isi.entri, isi.kitab.jumlahHalaman) : null), [kunciRencana, isi, kitabId]);
  const terkunci = batasBisaDipakai(res);
  const lo = terkunci ? res.awal : 1;
  const hi = terkunci ? Math.min(res.akhir, total) : total;
  useEffect(() => { if (onBatas) onBatas(terkunci ? { kitabId: sasaranId, res } : null); }, [kunciRencana, isi, kitabId]); // batas yang sudah diselesaikan dikabarkan ke form (untuk cakupan AI dan pemeriksaan di luar batas)
  useEffect(() => {
    if (!sasaranId || kunciTerapan.current === kunciRencana) return;
    kunciTerapan.current = kunciRencana; menungguOto.current = !!(rencana && rencana.otomatis && rencana.batas);
    setKitabId(sasaranId);
  }, [kunciRencana]);
  useEffect(() => { if (terkunci) { setKursor(res.awal); setBabIdx(''); } }, [terkunci, terkunci && res.awal, terkunci && res.akhir, kitabId]);
  useEffect(() => {
    if (!isi) return;
    const n = ++urut.current; setBusy(true);
    pem.halaman(kitabId, kursor, Math.min(kursor + jumlah - 1, hi), total).then((h) => { if (n === urut.current) { setHalaman(h); setErr(null); } }).catch(gagal)
      .finally(() => { if (n === urut.current) setBusy(false); });
  }, [isi, kursor, jumlah, hi]);

  const kitab = isi && isi.kitab;
  const bisaPisah = kitab && kitab.bentukMatn === 'pemisah-tatwil' && halaman.some((p) => p.batasMatn !== null);
  const jml = Math.max(1, Math.min(jumlah, hi - kursor + 1)); // jumlah halaman yang benar-benar diminta (tidak melewati akhir batas)
  const geser = (d) => { setInfo(''); setKursor((k) => Math.min(Math.max(lo, k + d), Math.max(lo, hi - jumlah + 1))); };
  const pilihBab = (v) => { setBabIdx(v); setInfo(''); setKembar([]); if (v !== '') setKursor(isi.entri[Number(v)].seq); };
  const babInfo = isi && babIdx !== '' ? rentangBab(isi.entri, Number(babIdx), total) : null;

  const cari = async () => {
    const n = parseInt(halInput, 10); setInfo(''); setKembar([]);
    if (!Number.isInteger(n)) { setInfo('Ketik nomor halaman cetak (angka).'); return; }
    setBusy(true);
    try {
      const semua = await pem.cariHal(kitabId, n);
      const r = terkunci ? semua.filter((p) => p.seq >= lo && p.seq <= hi) : semua;
      if (!r.length && semua.length) setInfo(`Halaman ${n} berada di luar batas ujian (urutan ${lo}–${hi}). Hanya halaman di dalam batas yang bisa dipakai.`);
      else if (!r.length) setInfo(`Tidak ada halaman bernomor ${n} di kitab ini.`);
      else if (r.length === 1) setKursor(r[0].seq);
      else if (r.every((p) => p.potongan)) { setKursor(r[0].seq); setInfo(`Halaman ${n} panjang, dipecah menjadi ${r.length} bagian. Mulai dari bagian 1; gunakan Berikutnya untuk bagian lanjutan.`); }
      else { setKembar(r); setInfo(`Nomor ${n} dipakai ${r.length} halaman di kitab ini. Pilih salah satu.`); }
    } catch (e) { gagal(e); } finally { setBusy(false); }
  };

  const pakai = (tambah, otomatis = false) => {
    if (!halaman.length || halaman.length < jml && kursor + jml - 1 <= total) return;
    const r = isianRujukan({ kitab, halaman, bagian: bisaPisah ? bagian : 'semua', babNama: babIdx !== '' ? isi.entri[Number(babIdx)].judul : '', katalog, tambah, sekarang });
    if (!r.teks.trim()) { setInfo('Bagian ini kosong di halaman terpilih.'); return; }
    if (batas && r.panjang > batas) { setInfo(`Hasilnya ${r.panjang.toLocaleString('id-ID')} karakter, melebihi ${batas.toLocaleString('id-ID')}. Kurangi jumlah halaman atau pilih matn/syarah saja.`); return; }
    if (mode === 'form' && !tambah && String(sekarang.teks || '').trim() && !window.confirm('Ganti Teks Kitab yang sudah ada dengan halaman ini?')) return;
    onPakai({ ...r, kitabId, kitab, halaman, bagian: bisaPisah ? bagian : 'semua' }, { tambah, otomatis });
    setInfo(`Dipakai: hal. ${r.hal}.`);
    setKursor((k) => Math.min(k + halaman.length, Math.max(lo, hi - jumlah + 1)));
  };

  // Materi ujian terisi sendiri: halaman pertama batas dipakai begitu terbaca, hanya bila Teks Kitab masih kosong.
  useEffect(() => {
    if (!menungguOto.current) return;
    if (String(sekarang.teks || '').trim()) { menungguOto.current = false; return; }
    if (terkunci && halaman.length && halaman[0].seq === res.awal) { menungguOto.current = false; pakai(false, true); }
  }, [halaman]);

  if (daftar && !daftar.length) return <p className="rounded-lg bg-soft px-3 py-2 text-xs leading-relaxed text-mute">Perpustakaan kitab masih kosong. Admin bisa mengimpor kitab di Kelola &gt; Perpustakaan.</p>;
  const teksHalaman = halaman.map((p) => p.teks).join('\n\n— — —\n\n');
  const anomali = halaman.filter((p) => p.nomorAnomali);
  return (
    <div className="space-y-2 rounded-lg bg-soft p-2.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-soft-ink"><Library size={14} />Dari Perpustakaan</p>
      {!daftar && !err ? <p className="flex items-center gap-2 text-xs text-mute"><Loader2 size={13} className="spin" />Memuat daftar kitab...</p> : null}
      {err && <ErrorBox e={err} />}
      {daftar && (
        <select aria-label="Pilih kitab dari perpustakaan" className="field" value={kitabId} onChange={(e) => setKitabId(e.target.value)} disabled={disabled}>
          <option value="">— Pilih kitab dari perpustakaan —</option>
          {daftar.map((k) => <option key={k.id} value={k.id}>{k.judulLatin} ({k.jumlahHalaman} hal.)</option>)}
        </select>
      )}
      {rencana && sasaran && rencana.batas && kitabId === sasaranId && res && (
        <p role="status" className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${res.status === 'ok' || res.status === 'tetap' || res.status === 'bergeser' ? 'bg-surface text-soft-ink' : 'bg-warn-bg text-warn'}`}>
          <b>Batas ujian:</b> {labelBatas(res)}.{terkunci ? ' Halaman dan bab di luar batas tidak ditawarkan.' : ''}{res.catatan.length ? ` ${res.catatan.join(' ')}` : ''}
        </p>)}
      {rencana && sasaran && rencana.batas && kitabId && kitabId !== sasaranId && <p className="text-xs text-warn">Batas ujian hanya berlaku untuk {sasaran.judulLatin}. Kitab lain tidak dibatasi, tetapi soal di luar cakupan tetap ditolak AI.</p>}
      {rencana && sasaran && !rencana.batas && rencana.siap && <p className="text-xs text-mute">{sasaran.judulLatin} ada di perpustakaan, tetapi admin belum menetapkan batas ujian untuk kelas dan ujian ini. Pilih bab dan halaman sendiri.</p>}
      {kitabId && !isi && !err && <p className="flex items-center gap-2 text-xs text-mute"><Loader2 size={13} className="spin" />Memuat daftar isi...</p>}
      {isi && (
        <div className="space-y-2">
          {isi.entri.length > 0 && (
            <select aria-label="Pilih bab" className="field" value={babIdx} onChange={(e) => pilihBab(e.target.value)} disabled={disabled}>
              <option value="">{terkunci ? '— Lompat ke bab (dalam batas ujian) —' : '— Lompat ke bab —'}</option>
              {(terkunci ? indeksBabDalamBatas(isi.entri, res) : isi.entri.map((_, i) => i)).map((i) => <option key={i} value={i}>{labelEntri(isi.entri[i])}</option>)}
            </select>
          )}
          {babInfo && <p className="text-xs text-mute">Bab ini membentang urutan halaman {babInfo.awal}–{babInfo.akhir}.</p>}
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="pk-halcetak" className="text-xs text-mute">Hal. cetak</label>
            <input id="pk-halcetak" type="number" min="0" inputMode="numeric" className="field !w-24 !py-1.5" value={halInput} onChange={(e) => setHalInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); cari(); } }} />
            <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={cari} disabled={busy || disabled || !halInput}>Cari</Btn>
            <label htmlFor="pk-jumlah" className="ml-auto text-xs text-mute">Jumlah halaman</label>
            <select id="pk-jumlah" className="field !w-16 !py-1.5" value={jumlah} onChange={(e) => setJumlah(Number(e.target.value))}>{[1, 2, 3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}</select>
          </div>
          {kembar.length > 0 && <div className="flex flex-wrap gap-2">{kembar.map((p) => <Btn key={p.seq} kind="soft" className="!px-3 !py-1.5 !text-xs" onClick={() => { setKursor(p.seq); setKembar([]); setInfo(''); }}>Urutan {p.seq}{p.bab ? ` · ${p.bab.slice(0, 24)}` : ''}</Btn>)}</div>}
          <div className="flex items-center gap-2">
            <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => geser(-1)} disabled={busy || kursor <= lo}><ChevronLeft size={14} />Sebelumnya</Btn>
            <p className="min-w-0 flex-1 text-center text-xs text-mute">{halaman.length ? <>Hal. <b className="text-ink">{halaman.length > 1 ? `${halaman[0].hal}–${halaman[halaman.length - 1].hal}` : halaman[0].hal}</b> · juz {halaman[0].juz}{halaman.some((p) => p.potongan) ? ` · bagian ${halaman.filter((p) => p.potongan).map((p) => `${p.potongan.ke}/${p.potongan.dari}`).join(', ')}` : ''} · urutan {kursor}/{total}</> : busy ? 'Memuat...' : `Urutan ${kursor}/${total}`}</p>
            <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => geser(1)} disabled={busy || kursor + jumlah - 1 >= hi}>Berikutnya<ChevronRight size={14} /></Btn>
          </div>
          {bisaPisah && (
            <div className="flex flex-wrap gap-3 text-xs text-mute" role="radiogroup" aria-label="Bagian halaman">
              {[['semua', 'Matn + syarah'], ['matn', 'Matn saja'], ['syarah', 'Syarah saja']].map(([v, l]) => (
                <label key={v} className="flex items-center gap-1.5"><input type="radio" name="pk-bagian" className="accent-[var(--brand)]" checked={bagian === v} onChange={() => setBagian(v)} />{l}</label>))}
            </div>
          )}
          {halaman.length > 0 && <p {...tampilanTeks(kitab, 'max-h-52 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-surface p-3 text-lg')}>{teksHalaman}</p>}
          {anomali.length > 0 && <p className="text-xs text-warn">Nomor cetak halaman ini {anomali.map((p) => p.nomorAnomali).join(', ')} di kitab sumber; urutan {anomali.map((p) => p.seq).join(', ')} tetap benar.</p>}
          {info && <p role="status" className="text-xs text-soft-ink">{info}</p>}
          <div className="flex flex-wrap gap-2">
            {mode === 'form' && <Btn kind="soft" className="!px-3 !py-1.5 !text-xs" onClick={() => pakai(false)} disabled={busy || disabled || !halaman.length}><Check size={14} />Pakai teks ini</Btn>}
            <Btn kind="soft" className="!px-3 !py-1.5 !text-xs" onClick={() => pakai(true)} disabled={busy || disabled || !halaman.length}><Plus size={14} />{mode === 'form' ? 'Tambahkan ke teks' : 'Tambahkan ke materi'}</Btn>
          </div>
          <p className="text-xs leading-relaxed text-mute">Teks dari ekspor Syamilah, sudah tanpa catatan kaki editor. Setelah dipakai, kursor maju ke halaman berikutnya.</p>
        </div>
      )}
    </div>
  );
}
