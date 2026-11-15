import React, { useEffect, useMemo, useState } from 'react';
import { Library, Loader2 } from 'lucide-react';
import { buatPemuat } from './lib/perpus.js';
import { kitabPerpusUntuk, selesaikanBatas, batasBisaDipakai, labelBatas } from './lib/batasUjian.js';
import { SIMPANAN } from './PemilihKitab.jsx';

// Batas ujian untuk Paket Dauri: kitab di Konfigurasi yang sudah ada di perpustakaan dan punya batas untuk kelas + ujian terpilih
// bisa langsung dimuat sebagai materi paket (tanpa memilih halaman satu per satu). Hasil batas yang sudah dicocokkan dengan daftar isi
// TERKINI dikabarkan ke Paket Dauri lewat `onRes` ({ kitabId, res } atau null) untuk pemeriksaan halaman di luar batas.
// Tidak menulis apa pun sendiri: halaman diserahkan ke `onMuat` (bentuk sama dengan PemilihKitab mode "paket").
const JENDELA = 10; // batas server: satu panggilan perpus-halaman maksimal 10 halaman

export default function BatasPaket({ Btn, ErrorBox, callApi, apiErr, kitabCfg, batas, siap, sudah = 0, maks = 60, onMuat, onRes, disabled = false }) {
  const pem = useMemo(() => buatPemuat((b) => callApi('/api/kitab', b), SIMPANAN), []);
  const [daftar, setDaftar] = useState(SIMPANAN.daftar);
  const [isi, setIsi] = useState(null); // { kitab, entri }
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');
  const [err, setErr] = useState(null);

  const h = kitabCfg && daftar ? kitabPerpusUntuk(kitabCfg, daftar) : null;
  const id = h && h.item ? h.item.id : '';
  useEffect(() => { let batal = false; pem.daftar(true).then((l) => { if (!batal) setDaftar(l); }).catch(() => { /* tanpa daftar: Paket Dauri tetap jalan dengan cakupan teks */ }); return () => { batal = true; }; }, []);
  useEffect(() => {
    setIsi(null); setInfo(''); setErr(null);
    if (!id || !batas) return undefined;
    let batal = false;
    pem.isi(id).then((r) => { if (!batal) setIsi(r); }).catch((e) => { const x = apiErr(e); if (!batal && x) setErr(x); });
    return () => { batal = true; };
  }, [id, batas ? JSON.stringify(batas) : '']);

  const res = useMemo(() => (isi && batas ? selesaikanBatas(batas, isi.entri, isi.kitab.jumlahHalaman) : null), [isi, batas ? JSON.stringify(batas) : '']);
  const sah = batasBisaDipakai(res);
  useEffect(() => { if (onRes) onRes(sah ? { kitabId: id, res } : null); }, [sah, id, res && res.awal, res && res.akhir]);

  if (!kitabCfg || !daftar || !daftar.length) return null;
  if (!h.item) return <p className="mt-2 text-xs leading-relaxed text-mute">Kitab ini belum ada di perpustakaan, jadi materi ditempel atau difoto manual.</p>;
  if (!batas) return siap ? <p className="mt-2 text-xs leading-relaxed text-mute">{h.item.judulLatin} ada di perpustakaan, tetapi admin belum menetapkan batas ujian untuk kelas dan ujian ini. Tambahkan halamannya sendiri di bagian Materi.</p> : null;
  if (err) return <div className="mt-2"><ErrorBox e={err} /></div>;
  if (!res) return <p className="mt-2 flex items-center gap-2 text-xs text-mute"><Loader2 size={13} className="spin" />Mencocokkan batas ujian dengan daftar isi {h.item.judulLatin}...</p>;

  const total = res.akhir - res.awal + 1;
  const sisaTempat = Math.max(0, maks - sudah);
  const jumlah = Math.min(total, sisaTempat);
  const warna = res.status === 'ok' || res.status === 'tetap' || res.status === 'bergeser' ? 'bg-soft text-soft-ink' : 'bg-warn-bg text-warn';

  const muat = async () => {
    setBusy(true); setErr(null); setInfo('');
    try {
      const halaman = [];
      for (let s = res.awal; s < res.awal + jumlah; s += JENDELA) {
        const sampai = Math.min(s + JENDELA - 1, res.awal + jumlah - 1);
        halaman.push(...await pem.halaman(id, s, sampai, isi.kitab.jumlahHalaman));
      }
      if (!halaman.length) { setInfo('Tidak ada halaman yang terbaca di dalam batas ini.'); return; }
      onMuat({ kitabId: id, nama: kitabCfg.nama, juz: String(halaman[0].juz), bab: res.judulAwal || '', halaman, bagian: 'semua' });
      setInfo(total > jumlah ? `Dimuat ${halaman.length} halaman pertama dari ${total} halaman dalam batas (maksimal ${maks} halaman per paket). Sisanya bisa dibuat di paket lain.` : `Seluruh ${halaman.length} halaman dalam batas dimuat.`);
    } catch (e) { const x = apiErr(e); if (x) setErr(x); } finally { setBusy(false); }
  };

  return (
    <div className={`mt-2 space-y-2 rounded-lg px-3 py-2 text-xs leading-relaxed ${warna}`}>
      <p className="flex items-start gap-1.5"><Library size={14} className="mt-0.5 shrink-0" /><span><b>Batas ujian dari perpustakaan:</b> {labelBatas(res)}{res.catatan.length ? `. ${res.catatan.join(' ')}` : ''}</span></p>
      {sah && (
        <div className="flex flex-wrap items-center gap-2">
          <Btn kind="soft" className="!px-3 !py-1.5 !text-xs" onClick={muat} disabled={busy || disabled || jumlah < 1}>{busy ? <Loader2 size={14} className="spin" /> : <Library size={14} />}Muat materi dari batas ujian ({jumlah} hal.)</Btn>
          {sisaTempat < 1 && <span className="text-warn">Materi sudah penuh ({maks} halaman).</span>}
        </div>
      )}
      {info && <p role="status">{info}</p>}
    </div>
  );
}
