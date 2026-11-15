import React, { useMemo, useRef, useState } from 'react';
import { Bot, Eye, History, Loader2, Plus, Sparkles, Square, Quote, Trash2, X } from 'lucide-react';
import { LABEL_LEVEL, MAKS_ENTRI_ISI, MAKS_JUDUL_ISI, MAKS_CATATAN_ISI, rapikanEntri, rapikanJudul, periksaEntri, bedaDaftar, gabungUsul, levelUsul, titikLanjut, konteksSebelum } from './lib/daftarIsi.js';

// Penyunting daftar isi kitab (editor dan admin), dipakai di dalam PembacaKitab.jsx pada tombol "Sunting daftar isi" / "Buat daftar isi".
// Tujuan: membuat daftar isi yang tidak ada (PDF/OCR, berkas tanpa judul bertanda) dan memperbaiki yang keliru (judul, level, halaman).
// Menyimpan mengirim `rev` yang dilihat penyunting; bila orang lain lebih dulu mengubah daftar ini, server menolak dan tidak ada yang tertimpa.
// Server: src/kitabIsi.js (peran diperiksa di sana juga). `pem` = pemuat dari web/lib/perpus.js (isiUsul, isiSimpan, isiRiwayat).
// Kedua mesin MELANJUTKAN, tidak mengulang dari halaman 1: pemindaian mulai dari halaman judul terakhir yang sudah ada (daftar sekarang + usulan yang belum dipakai),
// bisa diubah lewat "Mulai dari urutan". Hasil sebagian yang dihentikan disimpan di usulan dan dilanjutkan oleh proses berikutnya.
// "Buat otomatis" ada dua: aturan (instan, gratis) dan "Sempurnakan dengan AI" (bertahap per 60 halaman, kemajuan tampil, bisa dihentikan; hasil sebagian tetap bisa dipakai).
// Halaman kitab TETAP tampil di sebelah penyunting (PembacaKitab.jsx): "Halaman ini" memakai halaman yang sedang dibuka, "Lihat" membuka halaman sebuah judul, dan
// "Judul dari teks terpilih" mengambil teks yang diblok di halaman kitab sebagai judul baru di halaman itu. Baris pada halaman yang sedang dibuka disorot.
// Nomor cetak (hal.) dan juz diisi server dari halaman kitab; penyunting hanya memilih URUTAN halaman (1 sampai jumlah halaman kitab).

const waktu = (iso) => { try { return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }) + ' WIB'; } catch { return String(iso || ''); } };
const JUMLAH_AI = 60; // halaman per panggilan AI (batas server: JUMLAH_AI_MAKS di src/kitabIsi.js)
let nomor = 0;
const keBaris = (entri) => (entri || []).map((e) => ({ id: ++nomor, judul: e.judul, level: e.level, seq: String(e.seq), hal: e.hal }));
const keEntri = (baris) => baris.map((b) => ({ judul: rapikanJudul(b.judul), level: Number(b.level), seq: b.seq === '' ? NaN : Number(b.seq) }));

export default function DaftarIsiEditor({ kitab, kitabId, isi, arab, kursor, total, pem, Btn, ErrorBox, apiErr, onSimpan, onBatal, onKotor = () => {}, onMuatUlang = () => {}, halamanAktif = [], onLihat = () => {}, ambilTerpilih = () => '' }) {
  const asal = useMemo(() => rapikanEntri(isi.entri), [isi.entri]);
  const [baris, setBaris] = useState(() => keBaris(asal));
  const [catatan, setCatatan] = useState('');
  const [usul, setUsul] = useState(null);          // { usul[], dibaca, terpotong, sumber: 'aturan'|'ai', sebagian?, ditolak? }
  const [ai, setAi] = useState(null);              // null = tidak berjalan; { dari, ditemukan }
  const batalRef = useRef(false);
  const [riwayat, setRiwayat] = useState(null);    // null = tertutup; { data?, err? }
  const [busy, setBusy] = useState(false);
  const [sibuk, setSibuk] = useState('');          // 'usul' | 'riwayat'
  const [err, setErr] = useState(null);
  const [info, setInfo] = useState('');
  const barisRef = useRef(null);
  const [mulai, setMulai] = useState(''); // '' = otomatis (lanjut dari judul terakhir); angka = urutan halaman awal pilihan penyunting

  const mentah = useMemo(() => keEntri(baris), [baris]);
  const { galat, peringatan } = useMemo(() => periksaEntri(mentah, total), [mentah, total]);
  const baru = useMemo(() => rapikanEntri(mentah), [mentah]);
  const beda = useMemo(() => bedaDaftar(asal, baru), [asal, baru]);
  // Titik lanjut: halaman judul terakhir yang sudah ada, termasuk usulan yang belum dipakai dan halaman yang sudah selesai dipilah AI.
  const titik = useMemo(() => {
    const dasar = titikLanjut([...baru, ...(usul ? usul.usul : [])], total);
    return usul && usul.selesaiSampai ? Math.max(dasar, Math.min(total, usul.selesaiSampai + 1)) : dasar;
  }, [baru, usul, total]);
  const mulaiAngka = /^\d+$/.test(mulai) ? Math.min(Math.max(1, Number(mulai)), Math.max(1, total)) : null;
  const dariEfektif = mulaiAngka || titik;
  const berubah = beda.tambah + beda.hapus + beda.ubah > 0 || JSON.stringify(asal.map((e) => e.seq)) !== JSON.stringify(baru.map((e) => e.seq));
  const galatDi = (i) => galat.filter((g) => g.i === i + 1).map((g) => g.pesan);
  const peringatanDi = (i) => peringatan.filter((g) => g.i === i + 1).map((g) => g.pesan);
  const bentrok = err && err.code === 'ISI_BENTROK';
  const bahasa = kitab && kitab.bahasa && kitab.bahasa !== 'lain' ? kitab.bahasa : (arab ? 'ar' : undefined);
  const aktif = halamanAktif[0];
  const tambahDariTerpilih = () => {
    const t = rapikanJudul(ambilTerpilih());
    if (!t) { setInfo('Blok dulu teks judul di halaman kitab, lalu tekan tombol ini.'); return; }
    if (t.length > MAKS_JUDUL_ISI) { setInfo(`Teks terpilih terlalu panjang untuk judul (maksimal ${MAKS_JUDUL_ISI} karakter).`); return; }
    setBaris((l) => [...l, { id: ++nomor, judul: t, level: levelUsul(t), seq: String(Math.min(Math.max(1, kursor || 1), total || 1)) }]); setInfo(`Judul ditambahkan di halaman ${kursor}. Periksa levelnya.`); onKotor(true);
  };
  const gagal = (e, tujuan) => { const x = apiErr(e); if (x) tujuan(x); };

  const ubah = (id, kunci, nilai) => { setBaris((l) => l.map((b) => (b.id === id ? { ...b, [kunci]: nilai } : b))); setInfo(''); onKotor(true); };
  const urutkan = () => setBaris((l) => l.map((b, i) => ({ b, i })).sort((x, y) => ((Number(x.b.seq) || 0) - (Number(y.b.seq) || 0)) || x.i - y.i).map(({ b }) => b));
  const tambah = () => {
    setBaris((l) => [...l, { id: ++nomor, judul: '', level: 2, seq: String(Math.min(Math.max(1, kursor || 1), total || 1)) }]); setInfo(''); onKotor(true);
    setTimeout(() => { const k = barisRef.current && barisRef.current.querySelectorAll('input[data-judul]'); if (k && k.length) k[k.length - 1].focus(); }, 0);
  };
  const hapus = (id) => { setBaris((l) => l.filter((b) => b.id !== id)); onKotor(true); };

  async function buatUsul() {
    setSibuk('usul'); setErr(null); setUsul(null);
    try { setUsul({ ...(await pem.isiUsul(kitabId, { dari: dariEfektif })), sumber: 'aturan', dari: dariEfektif }); } catch (e) { gagal(e, setErr); } finally { setSibuk(''); }
  }
  async function jalankanAi() {
    const mulaiDari = dariEfektif; const sisa = Math.max(1, total - mulaiDari + 1); const panggilan = Math.ceil(sisa / JUMLAH_AI);
    if (!window.confirm(`AI akan memilah kandidat judul dari halaman ${mulaiDari} sampai ${total} (${sisa} halaman, sekitar ${panggilan} panggilan AI atas biaya server; jendela tanpa kandidat dilewati).${mulaiDari > 1 ? ' Halaman sebelumnya yang sudah punya judul tidak diperiksa ulang.' : ''} Hasilnya hanya usulan; belum disimpan. Lanjutkan?`)) return;
    batalRef.current = false; setErr(null); setInfo('');
    // Usulan AI sebelumnya yang belum dipakai (mis. proses yang dihentikan) dipertahankan dan digabung dengan hasil baru.
    const lama = usul && usul.sumber === 'ai' ? usul : null;
    const awalDari = lama && lama.dari ? Math.min(lama.dari, mulaiDari) : mulaiDari;
    const konteks = konteksSebelum([...baru, ...(lama ? lama.usul : [])], mulaiDari);
    let kumpul = []; let ditolak = lama ? lama.ditolak || 0 : 0; let berhenti = false; let kandidat = lama ? lama.kandidat || 0 : 0; let dipanggil = lama ? lama.dipanggil || 0 : 0; let selesai = mulaiDari - 1;
    setAi({ dari: mulaiDari, ditemukan: 0, mulai: mulaiDari });
    try {
      for (let dari = mulaiDari; dari <= total; dari += JUMLAH_AI) {
        if (batalRef.current) { berhenti = true; break; }
        setAi({ dari, ditemukan: kumpul.length, mulai: mulaiDari });
        const sebelumnya = [...konteks, ...kumpul].slice(-8).map(({ judul, level }) => ({ judul, level }));
        const r = await pem.isiAi(kitabId, { dari, jumlah: JUMLAH_AI, sebelumnya });
        kumpul = kumpul.concat(r.entri); ditolak += r.ditolak || 0; kandidat += r.kandidat || 0; if (r.dipanggilAi) dipanggil++;
        selesai = Math.min(total, dari + JUMLAH_AI - 1);
      }
    } catch (e) { berhenti = true; gagal(e, setErr); } finally { setAi(null); }
    const gabung = lama ? gabungUsul(lama.usul, kumpul).entri : kumpul;
    if (gabung.length) setUsul({ usul: gabung, dibaca: total - awalDari + 1, terpotong: false, sumber: 'ai', sebagian: berhenti, ditolak, kandidat, dipanggil, dari: awalDari, selesaiSampai: selesai });
    else if (!berhenti) setUsul({ usul: [], dibaca: total - awalDari + 1, sumber: 'ai', kandidat, dipanggil, dari: awalDari, selesaiSampai: selesai });
  }
  const gantiSemua = (entri) => { setBaris(keBaris(rapikanEntri(entri))); onKotor(true); };
  const pakaiUsul = (mode) => {
    if (!usul) return;
    if (mode === 'gabung') { const g = gabungUsul(baru.filter((e) => Number.isInteger(e.seq) && e.judul), usul.usul); gantiSemua(g.entri); setInfo(`${g.ditambah} judul ditambahkan. Tinjau dulu, lalu simpan.`); }
    else {
      if (baris.length && !window.confirm('Seluruh daftar yang sekarang diganti dengan usulan. Lanjutkan?')) return;
      gantiSemua(usul.usul); setInfo(`${usul.usul.length} judul dari usulan. Tinjau dulu, lalu simpan.`);
    }
    setUsul(null);
  };
  async function bukaRiwayat() {
    if (riwayat) { setRiwayat(null); return; }
    setRiwayat({}); setSibuk('riwayat');
    try { setRiwayat({ data: await pem.isiRiwayat(kitabId) }); } catch (e) { gagal(e, (x) => setRiwayat({ err: x })); } finally { setSibuk(''); }
  }
  const pakaiLama = (r) => {
    if (baris.length && !window.confirm('Daftar yang sekarang diganti dengan daftar sebelum perubahan itu. Lanjutkan?')) return;
    gantiSemua(r.entriLama); setRiwayat(null); setInfo('Daftar lama dimuat. Simpan bila sudah benar.');
  };
  async function simpan() {
    setBusy(true); setErr(null);
    try {
      const r = await pem.isiSimpan(kitabId, { entri: baru.map(({ judul, level, seq }) => ({ judul, level, seq })), rev: isi.rev || 0, ...(catatan.trim() ? { catatan: catatan.trim() } : {}) });
      onKotor(false); onSimpan(r);
    } catch (e) { gagal(e, setErr); } finally { setBusy(false); }
  }
  const batal = () => { if (berubah && !window.confirm('Perubahan daftar isi belum disimpan. Buang perubahan?')) return; onKotor(false); onBatal(); };
  const bisaSimpan = !busy && berubah && !galat.length && baris.length <= MAKS_ENTRI_ISI;

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4" dir="ltr" aria-label="Penyunting daftar isi">
      <div>
        <h2 className="text-base font-semibold">{asal.length ? 'Sunting daftar isi' : 'Buat daftar isi'}{kitab ? ` · ${kitab.judulLatin || kitab.judul}` : ''}</h2>
        <p className="mt-1 rounded-lg bg-soft px-3 py-2 text-xs text-soft-ink">
          Tiap judul punya <b>level</b> (kitab/pengantar, bab, fasal, sub-judul) dan <b>urutan halaman</b> (1 sampai {total}; bukan nomor cetak). Nomor cetak dan juz diisi otomatis dari halaman itu.
          Pastikan urutan halaman dicocokkan dengan kitab asli. Setiap perubahan tercatat (siapa, kapan, daftar lama) dan bisa dikembalikan.
        </p>
      </div>

      <p role="status" aria-live="polite" className="rounded-lg border border-line px-3 py-1.5 text-xs">
        Halaman kitab yang sedang dibuka (di sebelah): <b>urutan {kursor}</b> dari {total}{aktif && aktif.hal !== undefined ? ` · cetak ${aktif.hal}` : ''}{aktif && aktif.juz ? ` · juz ${aktif.juz}` : ''}. Ganti halaman di pembaca, lalu pakai "Halaman ini".
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Btn kind="soft" className="!px-3 !py-1.5 !text-xs" onClick={tambah} disabled={busy || baris.length >= MAKS_ENTRI_ISI}><Plus size={14} />Tambah judul (halaman {kursor})</Btn>
        <Btn kind="soft" className="!px-3 !py-1.5 !text-xs" onMouseDown={(e) => e.preventDefault()} onClick={tambahDariTerpilih} disabled={busy || baris.length >= MAKS_ENTRI_ISI} title="Blok teks judul di halaman kitab, lalu tekan"><Quote size={14} />Judul dari teks terpilih</Btn>
        <Btn kind="soft" className="!px-3 !py-1.5 !text-xs" onClick={buatUsul} disabled={busy || sibuk === 'usul' || !!ai}>{sibuk === 'usul' ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}Buat otomatis dari teks kitab{dariEfektif > 1 ? ` · lanjut hal. ${dariEfektif}` : ''}</Btn>
        <Btn kind="soft" className="!px-3 !py-1.5 !text-xs" onClick={jalankanAi} disabled={busy || sibuk === 'usul' || !!ai}><Bot size={14} />Sempurnakan dengan AI{dariEfektif > 1 ? ` · lanjut hal. ${dariEfektif}` : ''}</Btn>
        <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={urutkan} disabled={busy || baris.length < 2}>Urutkan menurut halaman</Btn>
        <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={bukaRiwayat} aria-pressed={!!riwayat}><History size={14} />Riwayat</Btn>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line px-3 py-1.5 text-xs">
        <span>{baru.some((e) => Number.isInteger(e.seq))
          ? <>Daftar isi sekarang sampai urutan <b>{titik}</b> dari {total}. Mesin <b>melanjutkan dari urutan {dariEfektif}</b>, bukan dari awal.{titik >= total && !mulaiAngka ? ' Daftar sudah sampai halaman terakhir; hanya halaman terakhir yang dipindai.' : ''}</>
          : <>Daftar isi masih kosong, jadi mesin mulai dari urutan {dariEfektif}.</>}</span>
        <label className="flex items-center gap-1 text-mute">Mulai dari urutan
          <input aria-label="Mulai dari urutan halaman" inputMode="numeric" className="field !w-20 !py-1 text-center" placeholder={String(titik)} value={mulai} onChange={(e) => setMulai(e.target.value.replace(/\D/g, '').slice(0, 6))} disabled={!!ai} /></label>
        {(mulai !== '' || dariEfektif > 1) && <button type="button" className="font-semibold text-soft-ink underline" disabled={!!ai} onClick={() => setMulai('1')}>Pindai dari awal</button>}
        {mulai !== '' && <button type="button" className="font-semibold text-soft-ink underline" disabled={!!ai} onClick={() => setMulai('')}>Otomatis</button>}
      </div>

      {ai && (
        <div role="status" aria-live="polite" className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-soft/40 p-3 text-sm">
          <Loader2 size={15} className="spin" />
          <span>AI memilah halaman {ai.dari}-{Math.min(total, ai.dari + JUMLAH_AI - 1)} (mulai {ai.mulai}, sampai {total}) · {ai.ditemukan} judul terpilih</span>
          <progress className="h-2 w-40" max={Math.max(1, total - ai.mulai + 1)} value={Math.max(0, Math.min(total, ai.dari - 1) - ai.mulai + 1)} aria-label="Kemajuan pemilahan AI" />
          <Btn kind="ghost" className="!px-3 !py-1 !text-xs" onClick={() => { batalRef.current = true; }}><Square size={12} />Hentikan</Btn>
        </div>)}

      {usul && (
        <div role="status" className="space-y-2 rounded-xl border border-line bg-soft/40 p-3 text-sm">
          {usul.usul.length === 0
            ? <p>{usul.sumber === 'ai' ? `AI tidak menemukan judul pada ${usul.kandidat || 0} kandidat. ` : (usul.dari > 1 ? `Tidak ada judul baru pada urutan ${usul.dari} ke atas. ` : `Tidak ditemukan judul bab di teks ${usul.dibaca} halaman. `)}Kitab hasil PDF/OCR sering tanpa baris judul yang jelas; {usul.sumber === 'ai' ? 'tambahkan manual lewat "Tambah judul".' : 'coba "Sempurnakan dengan AI", atau tambahkan manual lewat "Tambah judul".'}</p>
            : (<>
              {usul.sumber === 'ai'
                ? <p>AI memilih <b>{usul.usul.length}</b> judul dari {usul.kandidat} kandidat{usul.ditolak ? ` (${usul.ditolak} pilihan tidak sah dibuang)` : ''}. Judul selalu persis dari teks kitab; level ditentukan AI. {usul.dari > 1 ? `Dipindai mulai urutan ${usul.dari}, tanpa mengulang halaman yang sudah punya judul. ` : ''}{usul.sebagian ? <b>Proses dihentikan sebelum seluruh kitab selesai: ini hasil sebagian; tekan "Sempurnakan dengan AI" lagi untuk melanjutkan dari urutan {Math.min(total, (usul.selesaiSampai || 0) + 1)}. </b> : null}Periksa sebelum disimpan.</p>
                : <p>Ditemukan <b>{usul.usul.length}</b> judul {usul.dari > 1 ? `pada urutan ${usul.dari} ke atas (halaman sebelumnya yang sudah punya judul tidak diusulkan ulang)` : `dari teks ${usul.dibaca} halaman`}{usul.terpotong ? ` (dipotong ke ${MAKS_ENTRI_ISI} pertama)` : ''}. Ini usulan mesin dari kata kunci (باب، فصل، كتاب، مقدمة، مبحث, "Bab 3"); periksa sebelum disimpan. Judul tanpa kata kunci hanya bisa dikenali lewat "Sempurnakan dengan AI".</p>}
              <div className="flex flex-wrap gap-2">
                <Btn kind="primary" className="!px-3 !py-1.5 !text-xs" onClick={() => pakaiUsul('gabung')}>Tambahkan yang belum ada</Btn>
                {!(usul.dari > 1) && <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => pakaiUsul('ganti')}>Ganti seluruh daftar</Btn>}
                <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => setUsul(null)}>Abaikan</Btn>
              </div></>)}
        </div>)}

      {riwayat && (
        <div className="space-y-2 rounded-xl border border-line bg-soft/40 p-3" aria-label="Riwayat daftar isi">
          {riwayat.err && <ErrorBox e={riwayat.err} />}
          {sibuk === 'riwayat' && <p className="flex items-center gap-2 text-xs text-mute"><Loader2 size={13} className="spin" />Memuat riwayat...</p>}
          {riwayat.data && !riwayat.data.riwayat.length && <p className="text-xs text-mute">Daftar isi ini belum pernah disunting di aplikasi.</p>}
          {riwayat.data && riwayat.data.riwayat.length > 0 && (
            <ul className="space-y-2">
              {riwayat.data.riwayat.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-line bg-surface p-2 text-xs text-mute">
                  <b className="text-ink">{r.namaOleh || 'Tanpa nama'}</b><span>{waktu(r.at)}</span>
                  <span className="rounded-full bg-soft px-2 py-0.5 text-soft-ink">{r.ringkas.tambah} ditambah, {r.ringkas.hapus} dihapus, {r.ringkas.ubah} diubah</span>
                  <span>({r.jumlahLama} menjadi {r.jumlahBaru} judul)</span>
                  {r.catatan && <span className="basis-full text-sm text-ink">{r.catatan}</span>}
                  {r.entriLama ? <Btn kind="ghost" className="!px-3 !py-1 !text-xs" onClick={() => pakaiLama(r)}>Pakai daftar sebelum perubahan ini</Btn> : <span>(daftar lama terlalu besar untuk diarsipkan)</span>}
                </li>))}
            </ul>)}
        </div>)}

      {!baris.length && <p className="rounded-xl bg-soft px-4 py-3 text-sm text-mute">Daftar isi kosong. Pakai "Buat otomatis dari teks kitab" atau tambahkan judul satu per satu.</p>}
      <ul ref={barisRef} className="space-y-2" aria-label="Judul daftar isi">
        {baris.map((b, i) => {
          const g = galatDi(i); const w = peringatanDi(i);
          return (
            <li key={b.id} aria-current={Number(b.seq) === kursor ? 'true' : undefined} className={`rounded-xl border p-2 ${g.length ? 'border-bad' : Number(b.seq) === kursor ? 'border-ink bg-soft/50' : 'border-line'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-8 text-xs text-mute">{i + 1}.</span>
                <input data-judul dir={arab ? 'rtl' : 'ltr'} {...(bahasa ? { lang: bahasa } : {})} spellCheck={false} autoComplete="off" maxLength={MAKS_JUDUL_ISI + 50} aria-label={`Judul ke-${i + 1}`}
                  className={`field min-w-[12rem] flex-1 ${arab ? 'ar ' : ''}!text-base`} value={b.judul} disabled={busy} placeholder="Judul bab atau fasal" onChange={(e) => ubah(b.id, 'judul', e.target.value)} />
                <select aria-label={`Level judul ke-${i + 1}`} className="field !w-auto" value={b.level} disabled={busy} onChange={(e) => ubah(b.id, 'level', Number(e.target.value))}>
                  {Object.entries(LABEL_LEVEL).map(([k, v]) => <option key={k} value={k}>{k} · {v}</option>)}</select>
                <label className="flex items-center gap-1 text-xs text-mute">Hal. urut
                  <input type="number" inputMode="numeric" min={1} max={total} aria-label={`Urutan halaman judul ke-${i + 1}`} className="field !w-24" value={b.seq} disabled={busy}
                    onChange={(e) => ubah(b.id, 'seq', e.target.value)} onBlur={urutkan} /></label>
                {b.hal !== undefined && <span className="text-[11px] text-mute" title="Nomor cetak saat ini">cetak {b.hal}</span>}
                <Btn kind="ghost" className="!px-2 !py-1 !text-xs" onClick={() => ubah(b.id, 'seq', String(kursor))} disabled={busy} title="Pakai halaman yang sedang dibuka">Halaman ini</Btn>
                <Btn kind="ghost" className="!px-2 !py-1 !text-xs" onClick={() => onLihat(Number(b.seq))} disabled={busy || !Number.isInteger(Number(b.seq)) || Number(b.seq) < 1 || Number(b.seq) > total} aria-label={`Lihat halaman judul ke-${i + 1} di kitab`} title="Buka halaman ini di pembaca"><Eye size={14} />Lihat</Btn>
                <Btn kind="ghost" className="!px-2 !py-1 !text-xs" onClick={() => hapus(b.id)} disabled={busy} aria-label={`Hapus judul ke-${i + 1}`}><Trash2 size={14} /></Btn>
              </div>
              {g.map((m) => <p key={m} role="alert" className="mt-1 text-xs text-bad">{m}</p>)}
              {w.map((m) => <p key={m} className="mt-1 text-xs text-warn">{m}</p>)}
            </li>);
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mute" aria-live="polite">
        <span>{baris.length} judul</span>
        <span>{berubah ? `Belum disimpan: ${beda.tambah} ditambah, ${beda.hapus} dihapus, ${beda.ubah} diubah` : 'Belum ada perubahan'}</span>
        {galat.length > 0 && <span className="font-semibold text-bad">{galat.length} isian perlu diperbaiki</span>}
        {info && <span role="status">{info}</span>}
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-mute">Catatan perubahan (opsional)</span>
        <input className="field" maxLength={MAKS_CATATAN_ISI} placeholder="Mis. judul fasal dicocokkan dengan daftar isi cetakan Dar al-Fikr" value={catatan} disabled={busy} onChange={(e) => setCatatan(e.target.value)} />
      </label>

      {err && (
        <div className="space-y-2">
          <ErrorBox e={err} />
          {bentrok && <Btn kind="soft" className="!px-3 !py-1.5 !text-xs" onClick={onMuatUlang}>Muat ulang daftar isi (suntingan saya dibuang)</Btn>}
        </div>)}

      <div className="flex flex-wrap items-center gap-2">
        <Btn kind="primary" onClick={simpan} disabled={!bisaSimpan}>{busy ? <Loader2 size={15} className="spin" /> : null}Simpan daftar isi</Btn>
        <Btn kind="ghost" onClick={batal} disabled={busy}><X size={15} />Batal</Btn>
      </div>
    </div>
  );
}
