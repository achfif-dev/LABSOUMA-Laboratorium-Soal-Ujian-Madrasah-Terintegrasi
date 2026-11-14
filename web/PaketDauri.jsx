import { bahasaOtomatis, tampilanDariIsi } from './lib/bahasa.js';
import { AutoArea, Btn, Draft, ErrorBox, Label, Section, Select, Spin, Uj, apiErr, callApi, useCfg, useDraftSync } from './ui.jsx';
import { Bt, bacaPref, cariKitab, mapelUntuk } from './lib/dasar.js';
import * as PK from './lib/paket.js';
import React, { useMemo, useRef, useState } from 'react';
import { BookOpen, Camera, Check, ClipboardCheck, Layers, ListChecks, Loader2, Pencil, RefreshCw, Save, Send, Sparkles, Trash2, Upload, X } from 'lucide-react';
import * as NK from './lib/naskah.js';
import { faktaSahDi, jejakFaktaButir, spekDenganFakta } from './lib/fakta.js';
import * as PKK from './lib/paketKembar.js';
import { bagianTeks } from './lib/perpus.js';
import { DraftNote, SaranCtx, cleanArabic, kitabUntuk, labelTingkat, tingkatAktif } from './bersama.jsx';
import { bacaFile, siapkanFoto } from './bacaBerkas.js';
import { PemilihKitab } from './panelMalas.jsx';

/* ---------- Paket Dauri: satu naskah IMDA utuh dari materi panjang (teks, berkas, atau banyak foto) ----------
 * Perencana ada di lib/paket.js (murni, bertes). Materi dibagi per segmen <= 6.000 karakter; tiap panggilan AI menyusun <= 6 butir dari satu segmen.
 * Hasil tidak langsung masuk bank: ditinjau dulu, lalu disimpan massal sebagai Draft (bukan Pending) agar penyusun sempat memeriksa kutipan dan kunci. */
const LABEL_BAGIAN = { a: 'أ  Pilihan', b: 'ب  Isian', c: 'ج  Uraian' };

const LABEL_KUTIPAN_STATUS = { cocok: 'Kutipan cocok dengan teks', mirip: 'Kutipan mirip teks (cek harakat)', tidak_cocok: 'Kutipan dibuang: tidak ada di teks', kosong: 'Tanpa kutipan' };

/** Pemeriksaan awal di klien (sama dengan arabicProblem di server): jangan buang kuota AI untuk teks yang pasti ditolak. */
const masalahArabPaket = (txt) => {
  let huruf = 0; let arab = 0;
  for (const ch of String(txt || '')) { if (/\p{L}/u.test(ch)) { huruf++; if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(ch)) arab++; } }
  if (huruf < 15) return 'Materi terlalu pendek. Tempel minimal satu kalimat lengkap.';
  if (bahasaOtomatis(txt) === 'ar' && arab / huruf < 0.6) return 'Materi terdeteksi campuran Arab dan huruf lain. Gunakan satu bahasa per paket.';
  return null;
};

const tidur = (ms, sinyal) => new Promise((res) => { const t = setTimeout(res, ms); if (sinyal) sinyal.addEventListener('abort', () => { clearTimeout(t); res(); }, { once: true }); });

/** Panggilan API dengan tunggu-dan-ulang untuk batas per menit (429) dan gangguan sesaat. Kuota harian habis tidak diulang. */
async function panggilSabar(path, body, sinyal, { onTunggu } = {}) {
  for (let i = 0; ; i++) {
    try { return await callApi(path, body, sinyal); } catch (e) {
      const ulang = e && ((e.status === 429 && e.code !== 'RATE_LIMIT_DAILY') || e.code === 'AI_OVERLOADED' || e.code === 'AI_TIMEOUT');
      if (!ulang || i >= 3 || (sinyal && sinyal.aborted)) throw e;
      const detik = Math.max(3, Math.min(90, Number(e.retryAfter) || 20));
      if (onTunggu) onTunggu(detik);
      await tidur(detik * 1000, sinyal);
      if (sinyal && sinyal.aborted) throw e;
    }
  }
}

// Sunting satu butir hasil AI sebelum disimpan. Kutipan diperiksa ulang terhadap teks segmen; kutipan yang tidak ada di teks tidak ikut tersimpan.
function EditButirPaket({ r, onSimpan, onBatal }) {
  const q = r.soal; const adaOpsi = Bt.punyaOpsi(Bt.bentukDari(q)); const pc = PK.pecahPembahasan(q.pembahasan);
  const [d, setD] = useState({ pertanyaan: q.pertanyaan, A: q.opsi.A || '', B: q.opsi.B || '', C: q.opsi.C || '', kunci: q.kunci || 'A', jawaban: q.jawaban || '', kutipan: pc.kutipan, pembahasan: pc.isi, indikator: q.indikator || '' });
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  const K = window.Kutipan;
  const sk = useMemo(() => (K ? PK.statusKutipan(K.periksaKutipan, d.kutipan, r.segmenTeks) : { status: '', kutipan: d.kutipan }), [K, d.kutipan, r.segmenTeks]);
  const galat = Bt.periksaSoal({ ...q, pertanyaan: d.pertanyaan, opsi: { ...q.opsi, A: d.A, B: d.B, C: d.C }, kunci: adaOpsi ? d.kunci : '', jawaban: d.jawaban, pembahasan: d.pembahasan || (sk.kutipan ? '-' : ''), rubrik: 'x' });
  const rujukan = [d.pertanyaan, ...(adaOpsi ? [d.A, d.B, d.C] : [d.jawaban])].some(PK.adaRujukanTeks);
  const id = 'eb-' + r.uid;
  const F = ({ k, label, rows, area }) => (<div><Label htmlFor={id + k}>{label}</Label>{area
    ? <AutoArea id={id + k} rows={rows || 2} className="field" value={d[k]} onChange={(e) => set(k, e.target.value)} />
    : <input id={id + k} className="field" value={d[k]} onChange={(e) => set(k, e.target.value)} />}</div>);
  return (
    <div className="mt-3 space-y-3 rounded-xl border border-brand/40 bg-surface p-3">
      <F k="pertanyaan" label="Kalimat soal" area />
      {adaOpsi ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3"><F k="A" label="Opsi A" /><F k="B" label="Opsi B" /><F k="C" label="Opsi C" /></div>
          <div className="max-w-[160px]"><Label htmlFor={id + 'kunci'}>Kunci</Label><Select id={id + 'kunci'} value={d.kunci} onChange={(v) => set('kunci', v)}>{['A', 'B', 'C'].map((k) => <option key={k} value={k}>{k}</option>)}</Select></div>
        </>
      ) : <F k="jawaban" label={Bt.bentukDari(q) === 'uraian' ? 'Jawaban model' : 'Jawaban isian'} area />}
      <div><Label htmlFor={id + 'kutipan'} hint="(salin persis dari teks)">Kutipan kitab untuk kunci</Label>
        <AutoArea id={id + 'kutipan'} dir="rtl" lang="ar" rows={2} className="field font-ar leading-loose" value={d.kutipan} onChange={(e) => set('kutipan', e.target.value)} />
        {sk.status && sk.status !== 'cocok' && <p className="mt-1 text-xs text-warn">{LABEL_KUTIPAN_STATUS[sk.status]}{sk.status === 'tidak_cocok' ? '. Kutipan ini tidak akan disimpan.' : ''}</p>}</div>
      <F k="pembahasan" label="Pembahasan" area />
      <F k="indikator" label="Indikator" />
      {rujukan && <p className="text-xs text-warn">Soal atau opsi memuat rujukan seperti “menurut kitab/teks”. Tulis sebagai pertanyaan langsung.</p>}
      {galat.length > 0 && <ul className="space-y-0.5 text-xs text-bad">{galat.map((g, i) => <li key={i}>{g}</li>)}</ul>}
      <div className="flex gap-2"><Btn kind="primary" disabled={galat.length > 0} onClick={() => onSimpan(d)}><Check size={15} />Terapkan</Btn><Btn kind="ghost" onClick={onBatal}>Batal</Btn></div>
    </div>
  );
}

// Pulihkan isian dan hasil AI Paket Dauri yang belum disimpan (muat ulang, tab tertutup, ponsel menutup tab). Hasil AI memakai kuota harian,
// jadi tidak boleh hilang diam-diam. Setiap nilai dibangun ulang dari bidang yang dikenal dan bertipe benar; data rusak = dianggap tidak ada.
function pulihPaket() {
  const d = Draft.read('paketDauri'); if (!d || typeof d !== 'object') return {};
  const S = (v, n) => (typeof v === 'string' ? v.slice(0, n) : undefined);
  const N = (v) => (Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : undefined);
  const o = { tingkat: S(d.tingkat, 40), mapel: S(d.mapel, 60), kelas: S(d.kelas, 20), periode: S(d.periode, 20), nama: S(d.nama, 120), juz: S(d.juz, 20), halMulai: S(d.halMulai, 20), fokus: S(d.fokus, 300), bab: S(d.bab, 120), teks: S(d.teks, 600000), lanjutan: N(d.lanjutan) };
  if (Number.isInteger(d.dawr)) o.dawr = NK.dauriSah(d.dawr);
  if (d.komposisi && typeof d.komposisi === 'object' && ['L1', 'L2', 'L3'].every((k) => N(d.komposisi[k]) !== undefined)) o.komposisi = { L1: N(d.komposisi.L1), L2: N(d.komposisi.L2), L3: N(d.komposisi.L3) };
  if (Array.isArray(d.foto)) o.foto = d.foto.filter((f) => f && typeof f.id === 'string' && typeof f.teks === 'string').slice(0, 60)
    .map((f) => ({ id: f.id.slice(0, 60), nama: S(f.nama, 120) || '', teks: f.teks.slice(0, 60000), hal: S(f.hal, 20) || '', kualitas: S(f.kualitas, 20) || '', ragu: Array.isArray(f.ragu) ? f.ragu.filter((r) => r && typeof r.kata === 'string').slice(0, 50) : [] }));
  if (Array.isArray(d.perpus)) o.perpus = d.perpus.filter((f) => f && typeof f.id === 'string' && typeof f.teks === 'string').slice(0, 60)
    .map((f) => ({ id: f.id.slice(0, 80), nama: S(f.nama, 120) || '', teks: f.teks.slice(0, 12000), hal: S(f.hal, 20) || '', juz: S(f.juz, 20) || '' }));
  const segs = Array.isArray(d.segs) ? d.segs.map((x) => (typeof x === 'string' ? x : '')) : [];
  if (Array.isArray(d.hasil)) o.hasil = d.hasil.filter((x) => x && typeof x.uid === 'string' && typeof x.bagian === 'string' && x.soal && typeof x.soal.pertanyaan === 'string' && x.soal.opsi && typeof x.soal.opsi === 'object').slice(0, 60)
    .map((x) => ({ uid: x.uid.slice(0, 80), bagian: x.bagian, soal: x.soal, segmenTeks: segs[x.si] || '', segmenHal: S(x.segmenHal, 20) || '', kutipanStatus: S(x.kutipanStatus, 20) || 'kosong', sikap: x.sikap && typeof x.sikap === 'object' ? x.sikap : null, catatan: Array.isArray(x.catatan) ? x.catatan.filter((c) => typeof c === 'string') : [], model: S(x.model, 60) || '', diedit: x.diedit === true }));
  return o;
}

export function PaketDauri({ toast, onSimpan, onBukaBank, onCekBank }) {
  const cfg = useCfg();
  const awal = useRef(null); if (awal.current === null) awal.current = pulihPaket();
  const A0 = awal.current;
  const [dawr, setDauri] = useState(() => (A0.dawr !== undefined ? A0.dawr : NK.dauriSah(bacaPref('naskahMeta', { dawr: 1 }).dawr)));
  const [tingkat, setTingkat] = useState(() => A0.tingkat || (tingkatAktif(cfg)[0] || {}).nama || 'Aliyah');
  const [mapel, setMapel] = useState(A0.mapel || 'Fiqih');
  const [kelas, setKelas] = useState(A0.kelas || '');
  const [nama, setNama] = useState(A0.nama || '');
  const [juz, setJuz] = useState(A0.juz || '');
  const [halMulai, setHalMulai] = useState(A0.halMulai || '');
  const [periode, setPeriode] = useState(A0.periode || '');
  const [fokus, setFokus] = useState(A0.fokus || '');
  const [bab, setBab] = useState(A0.bab || '');            // bab/materi paket (untuk kisi-kisi); sama dengan kolom Bab di Penyusunan Soal
  const babSaran = (React.useContext(SaranCtx).saran || { bab: [] }).bab.map((b) => b.nama);
  const [teks, setTeks] = useState(A0.teks || '');
  const [perpus, setPerpus] = useState(A0.perpus || []);          // [{id, nama, teks, hal, juz}] halaman dari perpustakaan (teks bersih dari ekspor Syamilah, tidak disunting)
  const [foto, setFoto] = useState(A0.foto || []);              // [{id, nama, teks, hal, kualitas, ragu}] satu foto = satu halaman
  const [fotoStatus, setFotoStatus] = useState('');
  const [komposisi, setKomposisi] = useState(A0.komposisi || { L1: 30, L2: 50, L3: 20 });
  const [lanjutan, setLanjutan] = useState(A0.lanjutan !== undefined ? A0.lanjutan : 40);
  const [jalan, setJalan] = useState(false);
  const [modeFakta, setModeFakta] = useState(false); // tiap butir terikat SATU fakta dari teks (+1 panggilan AI per segmen untuk ekstrak fakta); mati bawaan
  const faktaSegRef = useRef(new Map());              // teks segmen -> fakta sah (cache sesi; ekstrak tidak diulang untuk segmen yang sama)
  const [status, setStatus] = useState('');
  const [hasil, setHasil] = useState(A0.hasil || []);            // [{uid, bagian, soal, segmenTeks, segmenHal, kutipanStatus, sikap, catatan}]
  const [kurang, setKurang] = useState([]);          // butir yang gagal dibuat setelah diulang sekali
  const [err, setErr] = useState(null);
  const [simpanBusy, setSimpanBusy] = useState(false);
  const [sunting, setSunting] = useState(null);      // uid butir yang sedang disunting
  const ctlRef = useRef(null);
  const fileRef = useRef(null); const galeriRef = useRef(null); const kameraRef = useRef(null);
  // Teks segmen sama untuk banyak butir: disimpan sekali (segs) dan dirujuk lewat indeks, supaya draf tidak membengkak.
  const rekam = useMemo(() => {
    const segs = []; const idx = new Map();
    const hs = hasil.map(({ segmenTeks, ...sisa }) => { let si = idx.get(segmenTeks); if (si === undefined) { si = segs.length; segs.push(segmenTeks || ''); idx.set(segmenTeks, si); } return { ...sisa, si }; });
    return { dawr, tingkat, mapel, kelas, periode, nama, juz, halMulai, fokus, bab, teks, foto, perpus, komposisi, lanjutan, segs, hasil: hs };
  }, [dawr, tingkat, mapel, kelas, periode, nama, juz, halMulai, fokus, bab, teks, foto, perpus, komposisi, lanjutan, hasil]);
  useDraftSync('paketDauri', rekam, !teks.trim() && !foto.length && !perpus.length && !hasil.length && !fokus && !bab && !nama && !juz && !halMulai);

  const tingkatOpsi = [...new Set(tingkatAktif(cfg).map((t) => t.nama).concat(tingkat))];
  const mapelOpsi = [...new Set([...mapelUntuk(cfg, tingkat), mapel])];
  const kelasOpsi = [...new Set([...Uj.kelasUntuk(cfg, tingkat), kelas].filter(Boolean))];
  const periodeOpsi = Uj.periodeUntuk(cfg, tingkat);
  const kitabOpsi = kitabUntuk(cfg, tingkat, mapel, kelas, periode);
  const kitabCfg = cariKitab(cfg, nama);
  const cakupan = kitabCfg && kelas && periode ? Uj.cakupanKitab(kitabCfg, tingkat, kelas, periode) : '';

  const sumber = useMemo(() => [{ teks, hal: halMulai.trim() }, ...foto.map((f) => ({ teks: f.teks, hal: f.hal })), ...perpus.map((f) => ({ teks: f.teks, hal: f.hal }))], [teks, halMulai, foto, perpus]);
  const rencana = useMemo(() => PK.rencanaPaket({ dawr, sumber, komposisi, lanjutan: lanjutan / 100 }), [dawr, sumber, komposisi, lanjutan]);
  const jumlahKarakter = useMemo(() => sumber.reduce((n, p) => n + String(p.teks || '').trim().length, 0), [sumber]);

  const tambahTeksBerkas = async (file) => {
    if (!file) return;
    setErr(null);
    try {
      let t = '';
      if (/\.(docx|pdf)$/i.test(file.name) || file.type === 'application/pdf') {
        const r = await bacaFile(file); t = r.teks;
        if (!r.arab) { setErr({ code: 'FILE', message: 'Berkas tidak memuat teks Arab yang bisa dibaca (mungkin PDF hasil pindai). Untuk halaman pindaian, unggah sebagai foto.' }); return; }
      } else {
        if (file.size > 2_000_000) { setErr({ code: 'FILE', message: 'Berkas teks terlalu besar (maksimal 2 MB).' }); return; }
        t = await file.text();
        if (/\.html?$/i.test(file.name)) t = new DOMParser().parseFromString(t, 'text/html').body.textContent || '';
      }
      t = cleanArabic(t);
      if (!t) { setErr({ code: 'FILE', message: 'Berkas kosong.' }); return; }
      setTeks((x) => (x.trim() ? x.trimEnd() + '\n\n' + t : t));
      toast(`Teks dari ${file.name} ditambahkan.`);
    } catch (e) { setErr(apiErr(e)); }
  };

  const tambahFoto = async (files) => {
    const daftar = [...(files || [])].filter(Boolean);
    if (!daftar.length) return;
    setErr(null); setJalan(true);
    const ctl = new AbortController(); ctlRef.current = ctl;
    try {
      let n = foto.length;
      for (let i = 0; i < daftar.length; i++) {
        if (ctl.signal.aborted) break;
        setFotoStatus(`Membaca foto ${i + 1} dari ${daftar.length}...`);
        const gambar = await siapkanFoto(daftar[i], 2000);
        const d = await panggilSabar('/api/assist', { aksi: 'fotokitab', gambar, penuh: true }, ctl.signal, { onTunggu: (s) => setFotoStatus(`Menunggu batas permintaan (${s} detik)...`) });
        const h = d.hasil; n++;
        const nomor = /^\d+$/.test(halMulai.trim()) ? String(Number(halMulai.trim()) + n - 1) : '';
        setFoto((f) => [...f, { id: Date.now() + '-' + i, nama: daftar[i].name || `Foto ${n}`, teks: h.teks, hal: nomor, kualitas: h.kualitas, ragu: h.ragu || [] }]);
      }
    } catch (e) { const x = apiErr(e); if (x) setErr(x); } finally { setJalan(false); setFotoStatus(''); ctlRef.current = null; }
  };

  const batal = () => { if (ctlRef.current) ctlRef.current.abort(); };

  const kekurangan = useMemo(() => PK.sisaPaket(rencana, hasil), [rencana, hasil]);
  const buat = async () => {
    if (rencana.masalah || !rencana.panggilan) { setErr({ code: 'BAD_REQUEST', message: rencana.masalah || 'Belum ada materi.' }); return; }
    const bad = masalahArabPaket(rencana.segmen.map((s) => s.teks).join('\n'));
    if (bad) { setErr({ code: 'INVALID_ARABIC', message: bad }); return; }
    if (hasil.length && !window.confirm(`Hasil paket sebelumnya (${hasil.length} butir) akan DIHAPUS dan paket dibuat ulang dari awal.${kekurangan.sisa.length ? ' Bila hanya ingin melengkapi yang kurang, batalkan lalu pakai "Lanjutkan sisa".' : ''} Lanjutkan?`)) return;
    const exFakta = modeFakta ? new Set(rencana.tugas.map((t) => t.segmen)).size : 0; // satu ekstrak fakta per segmen
    if (!window.confirm(`Membuat paket ${NK.PRESET_DAURI[dawr].label} memakai ±${rencana.panggilan}${exFakta ? ` + ±${exFakta} (ekstrak fakta)` : ''} panggilan AI dari kuota harian Anda. Lanjutkan?`)) return;
    setErr(null); setHasil([]); setKurang([]);
    await proses(rencana.tugas, [], rencana.panggilan);
  };

  // Lanjutkan: hitung kekurangan dari hasil yang sudah ada, buat hanya itu. Butir yang sudah jadi tidak dihapus dan tidak diulang.
  const lanjutkan = async () => {
    const tugas = PK.tugasDariSisa(kekurangan.sisa);
    if (!tugas.length) { toast('Paket sudah lengkap.'); return; }
    const bad = masalahArabPaket(rencana.segmen.map((s) => s.teks).join('\n'));
    if (bad) { setErr({ code: 'INVALID_ARABIC', message: bad }); return; }
    if (!window.confirm(`Melanjutkan ${kekurangan.sisa.length} butir yang belum ada (${kekurangan.terisi} butir yang sudah jadi tidak diulang) memakai ±${tugas.length}${modeFakta ? ` + ekstrak fakta untuk segmen yang belum pernah diekstrak` : ''} panggilan AI. Lanjutkan?`)) return;
    setErr(null); setKurang([]);
    await proses(tugas, hasil, tugas.length);
  };

  // Mesin bersama untuk "Buat paket" (awal kosong) dan "Lanjutkan sisa" (awal = hasil yang ada).
  const proses = async (daftarTugas, awal, jumlahPanggilan) => {
    setJalan(true);
    const ctl = new AbortController(); ctlRef.current = ctl;
    const kumpul = [...awal]; const sisa = []; const segmenAda = new Set(awal.map((x) => x.segmen).filter((n) => Number.isInteger(n)));
    const FATAL = new Set(['RATE_LIMIT_DAILY', 'AUTH_REQUIRED', 'FORBIDDEN_ROLE', 'BAD_REQUEST', 'INVALID_ARABIC', 'UNAUTHORIZED', 'FORBIDDEN']);
    let tanpaFaktaN = 0; let gagalFaktaN = 0; // butir yang dibuat tanpa fakta (fakta segmen habis / ekstrak gagal): dilaporkan, tidak disembunyikan
    let beruntun = 0; // panggilan gagal berturut-turut: berhenti bila 3 (mis. offline) supaya kuota tidak terbuang
    const jalankan = async (tugas, label) => {
      const seg = rencana.segmen[tugas.segmen];
      const kitabIdPaket = (() => { const ids = new Set(perpus.map((x) => String(x.id).split(':')[0])); return ids.size === 1 ? [...ids][0] : ''; })();
      // Mode fakta: ekstrak fakta segmen (sekali per teks), lalu bagikan satu fakta berbeda ke tiap butir. Gagal ekstrak = segmen ini memakai alur lama.
      let faktaTugas = null; let spekKirim = tugas.spek.map((s) => ({ bentuk: s.bentuk, level: s.level }));
      if (modeFakta) {
        let daftar = faktaSegRef.current.get(seg.teks);
        if (!daftar) {
          setStatus(`${label}: mengekstrak fakta dari segmen ${tugas.segmen + 1} dari ${rencana.segmen.length}...`);
          try {
            const df = await panggilSabar('/api/assist', { aksi: 'fakta', teks: seg.teks, nama, tingkat, mapel, kitabId: kitabIdPaket }, ctl.signal, { onTunggu: (n) => setStatus(`Menunggu batas permintaan AI (${n} detik)...`) });
            daftar = (df.hasil.fakta || []).filter((f) => faktaSahDi(f, seg.teks, window.Kutipan && window.Kutipan.periksaKutipan));
            faktaSegRef.current.set(seg.teks, daftar);
          } catch (e) {
            if (ctl.signal.aborted || (e && e.name === 'AbortError') || (e && (FATAL.has(e.code) || e.status === 401 || e.status === 403))) throw e;
            daftar = []; gagalFaktaN++;
          }
        }
        // Fakta yang sudah dijadikan butir di segmen ini (dikenali lewat kutipan dasarnya, tahan muat ulang) tidak dibagikan lagi.
        const sp = spekDenganFakta(tugas.spek, daftar, kumpul.filter((x) => x.segmenTeks === seg.teks));
        faktaTugas = sp.pilihan; spekKirim = sp.spekKirim; tanpaFaktaN += sp.tanpaFakta;
      }
      setStatus(`${label}: menyusun ${tugas.spek.length} butir dari segmen ${tugas.segmen + 1} dari ${rencana.segmen.length}...`);
      const d = await panggilSabar('/api/assist', {
        aksi: 'paket', teks: seg.teks, bahasa: bahasaOtomatis(seg.teks), hal: seg.hal || halMulai.trim(), nama, juz, tingkat, kelas, mapel, fokus, cakupan,
        kitabId: kitabIdPaket, // hanya bila seluruh materi dari satu kitab perpustakaan
        spek: spekKirim,
        hindari: PKK.daftarHindari(kumpul.map((x) => x.soal)), // soal yang sudah jadi di paket ini: AI diminta tidak mengulanginya
      }, ctl.signal, { onTunggu: (s) => setStatus(`Menunggu batas permintaan AI (${s} detik)...`) });
      const h = d.hasil;
      for (const b of h.butir) {
        const kode = tugas.spek[b.indeks].bagian;
        kumpul.push({ uid: `${tugas.id}-${b.indeks}-${kumpul.length}`, bagian: kode, soal: b.soal, segmenTeks: seg.teks, segmenHal: seg.hal, kutipanStatus: b.kutipanStatus, sikap: b.sikap, catatan: b.catatan, model: h.model, segmen: tugas.segmen, spek: tugas.spek[b.indeks],
          ...jejakFaktaButir(b, faktaTugas) });
      }
      if (h.butir.length) segmenAda.add(tugas.segmen);
      // Butir yang AI sendiri tandai di luar cakupan tidak diulang di segmen yang sama (hasilnya sama, kuota terbuang): dialihkan ke segmen yang terbukti masuk cakupan.
      for (const g of h.gagal) sisa.push({ segmen: /^di luar cakupan/i.test(String(g.alasan || '')) ? -1 : tugas.segmen, spek: tugas.spek[g.indeks] });
      setHasil([...kumpul]);
    };
    try {
      let k = 0;
      const luar = [];
      // Satu panggilan gagal TIDAK menghentikan paket: segmen di luar cakupan dilewati; galat sementara (hasil AI terpotong, rusak, jaringan)
      // dibagi dua dan dicoba lagi; butir tunggal yang tetap gagal masuk daftar ulang. Hanya kuota habis, sesi berakhir, batal, dan 3 gagal
      // berturut-turut yang menghentikan, dan semuanya bisa dilanjutkan lewat "Lanjutkan sisa" tanpa mengulang butir yang sudah jadi.
      const aman = async (t, label) => {
        if (ctl.signal.aborted) return;
        try { await jalankan(t, label); beruntun = 0; } catch (e) {
          if (ctl.signal.aborted || (e && e.name === 'AbortError')) throw e;
          if (e && e.code === 'TEKS_TIDAK_MEMADAI') { luar.push(t.segmen + 1); t.spek.forEach((s) => sisa.push({ segmen: -1, spek: s })); return; }
          if (e && (FATAL.has(e.code) || e.status === 401 || e.status === 403)) throw e;
          if (++beruntun >= 3) throw e;
          if (t.spek.length > 1) {
            const m = Math.ceil(t.spek.length / 2);
            await aman({ id: `${t.id}a`, segmen: t.segmen, spek: t.spek.slice(0, m) }, 'Mencoba lagi (dibagi dua)');
            await aman({ id: `${t.id}b`, segmen: t.segmen, spek: t.spek.slice(m) }, 'Mencoba lagi (dibagi dua)');
          } else t.spek.forEach((s) => sisa.push({ segmen: t.segmen, spek: s }));
        }
      };
      for (const t of daftarTugas) {
        if (ctl.signal.aborted) break; k++;
        await aman(t, `Panggilan ${k} dari ${jumlahPanggilan}`);
      }
      if (gagalFaktaN) toast(`Ekstrak fakta gagal untuk ${gagalFaktaN} segmen; butirnya dibuat tanpa fakta (alur biasa).`);
      if (tanpaFaktaN) toast(`${tanpaFaktaN} butir dibuat tanpa fakta karena fakta di segmennya sudah habis dipakai butir lain.`);
      if (luar.length && !segmenAda.size) setErr({ code: 'TEKS_TIDAK_MEMADAI', message: `Tidak ada bagian teks yang masuk cakupan${cakupan ? ` "${cakupan}"` : ''}. Periksa apakah materi yang diberikan sesuai dengan cakupan di Konfigurasi.` });
      else if (luar.length) toast(`Segmen ${[...new Set(luar)].join(', ')} dilewati (di luar cakupan); butirnya dialihkan ke segmen lain yang masuk cakupan.`);
      // Butir KEMBAR di dalam paket (tiap segmen disusun lewat panggilan AI terpisah yang tidak saling tahu) dibuang. Penggantinya ikut alur
      // pengulangan di bawah, kini dengan daftar "hindari". Butir yang sudah Anda sunting dan pasangan berkunci beda tidak pernah dibuang otomatis.
      let nKembar = 0;
      const buangKembar = () => {
        if (ctl.signal.aborted) return [];
        const dibuang = PKK.buangDariKumpulan(kumpul);
        if (dibuang.length) { nKembar += dibuang.length; setHasil([...kumpul]); }
        return dibuang;
      };
      for (const d of buangKembar()) if (d.spek) sisa.push({ segmen: d.segmen, spek: d.spek });
      // Butir yang gagal diulang sekali, dikelompokkan per segmen.
      if (!ctl.signal.aborted && sisa.length) {
        const per = new Map();
        const gagalAkhir = [];
        for (const s of sisa) { if (s.segmen < 0) continue; if (!per.has(s.segmen)) per.set(s.segmen, []); per.get(s.segmen).push(s.spek); }
        // Butir dari segmen di luar cakupan dialihkan ke segmen yang terbukti memuat materi cakupan (bukan dibuang).
        const alih = PK.alihkanButir(sisa.filter((s) => s.segmen < 0), [...segmenAda]);
        for (const [segmen, spek] of alih.per) { if (!per.has(segmen)) per.set(segmen, []); per.get(segmen).push(...spek); }
        gagalAkhir.push(...alih.tanpaTempat);
        for (const [segmen, spek] of per) {
          for (let off = 0; off < spek.length; off += PK.MAKS_BUTIR_PANGGILAN) {
            if (ctl.signal.aborted) break;
            const potong = spek.slice(off, off + PK.MAKS_BUTIR_PANGGILAN);
            const n0 = kumpul.length;
            try { await jalankan({ id: `u${segmen}-${off}`, segmen, spek: potong }, 'Mengulang butir yang gagal'); } catch (e) { if (ctl.signal.aborted || (e && (e.name === 'AbortError' || FATAL.has(e.code)))) throw e; }
            if (kumpul.length - n0 < potong.length) gagalAkhir.push(...potong.slice(kumpul.length - n0));
          }
        }
        setKurang(gagalAkhir);
      }
      const kembarAkhir = buangKembar(); // pengganti yang ternyata kembar lagi: tidak diulang lagi (hemat kuota), dihitung kurang
      if (kembarAkhir.length) setKurang((k) => [...k, ...kembarAkhir.map((d) => d.spek).filter(Boolean)]);
      if (nKembar) toast(`${nKembar} butir kembar dibuang otomatis${kembarAkhir.length ? `; ${kembarAkhir.length} belum ada penggantinya` : '; pengganti dibuat bila memungkinkan'}.`);
      if (ctl.signal.aborted) toast('Dibatalkan. Butir yang sudah jadi tetap ditampilkan; pakai "Lanjutkan sisa" untuk melengkapi.');
    } catch (e) {
      const x = apiErr(e); if (x) setErr({ ...x, message: `${x.message} Proses berhenti di tengah jalan. Butir yang sudah jadi tetap ada di bawah; klik "Lanjutkan sisa" untuk membuat yang belum ada (tidak mengulang dari awal)${x.code === 'RATE_LIMIT_DAILY' ? ', atau simpan dulu dan lanjutkan besok' : ''}.` });
    } finally { setJalan(false); setStatus(''); ctlRef.current = null; }
  };

  const hapus = (uid) => setHasil((h) => h.filter((x) => x.uid !== uid));
  const ubahButir = (uid, d) => { setHasil((h) => h.map((x) => {
    if (x.uid !== uid) return x;
    const K = window.Kutipan; const adaOpsi = Bt.punyaOpsi(Bt.bentukDari(x.soal));
    const sk = K ? PK.statusKutipan(K.periksaKutipan, d.kutipan, x.segmenTeks) : { status: x.kutipanStatus, kutipan: String(d.kutipan || '').trim() };
    const soal = { ...x.soal, pertanyaan: d.pertanyaan.trim(), opsi: adaOpsi ? { ...x.soal.opsi, A: d.A.trim(), B: d.B.trim(), C: d.C.trim() } : x.soal.opsi, kunci: adaOpsi ? d.kunci : '', jawaban: adaOpsi ? '' : d.jawaban.trim(), indikator: d.indikator.trim(), pembahasan: PK.gabungPembahasan(sk.kutipan, d.pembahasan) };
    return { ...x, soal, kutipanStatus: sk.status, diedit: true };
  })); setSunting(null); };
  const urut = useMemo(() => PK.urutkanSoal(hasil.map((x) => ({ ...x.soal, _uid: x.uid }))), [hasil]);
  const naskah = useMemo(() => NK.susunNaskah(urut, dawr), [urut, dawr]);
  const lookup = useMemo(() => new Map(hasil.map((x) => [x.uid, x])), [hasil]);
  const kemiripan = useMemo(() => PKK.petaKemiripan(hasil), [hasil]);   // uid -> butir lain yang kembar/mirip
  const buangan = useMemo(() => PKK.pilihBuang(hasil).buang, [hasil]);  // butir kembar yang aman dibuang
  const nomorUid = useMemo(() => { const m = new Map(); for (const bg of naskah.bagian) for (const { no, q } of bg.butir) if (q) m.set(q._uid, no); return m; }, [naskah]);
  const hapusKembar = () => {
    if (!buangan.length) return;
    const set = new Set(buangan); setHasil((h) => h.filter((x) => !set.has(x.uid)));
    toast(`${buangan.length} butir kembar dibuang. Jalankan paket lagi, atau tulis manual, untuk melengkapi nomornya.`);
  };

  const simpan = async (kirim) => {
    if (!hasil.length || simpanBusy) return;
    // Setiap butir harus lengkap dan bebas rujukan "menurut kitab" sebelum disimpan (butir yang disunting ikut diperiksa).
    for (const x of urut.map((q) => lookup.get(q._uid)).filter(Boolean)) {
      const q = x.soal; const adaOpsi = Bt.punyaOpsi(Bt.bentukDari(q));
      const g = Bt.periksaSoal({ ...q, rubrik: 'x' });
      const rj = [q.pertanyaan, ...(adaOpsi ? ['A', 'B', 'C'].map((k) => q.opsi[k]) : [q.jawaban])].some(PK.adaRujukanTeks);
      if (g.length || rj) { setErr({ code: 'BAD_REQUEST', message: `Ada butir yang belum layak disimpan (“${String(q.pertanyaan).slice(0, 50)}”): ${g[0] || 'memuat rujukan seperti “menurut kitab/teks”'}. Sunting atau hapus butir itu dulu.` }); setSunting(x.uid); return; }
    }
    const pesan = kirim
      ? `Kirim ${hasil.length} butir paket ke editor? Butir tidak bisa disunting lagi sampai editor menyetujui atau mengembalikannya untuk direvisi.`
      : `Simpan ${hasil.length} butir sebagai satu paket Draft? Anda masih bisa menyunting lalu mengirimnya ke editor dari tab Bank Soal.`;
    let pesanBank = '';
    if (onCekBank) { // pemeriksaan terhadap soal yang sudah ada di bank; gagal = tidak menghalangi penyimpanan
      try {
        const daftarSoal = urut.map((q) => ({ q, no: nomorUid.get(q._uid) || '?' }));
        const r = await onCekBank(daftarSoal.map((x) => x.q), nama);
        pesanBank = PKK.pesanKembarBank(r.hasil.map((h) => ({ ...h, no: daftarSoal[h.i].no })), { total: r.total });
      } catch (e) { pesanBank = ''; }
    }
    if (!window.confirm(pesanBank ? `${pesanBank}\n\n${pesan}` : pesan)) return;
    setSimpanBusy(true); setErr(null);
    try {
      // Nomor urut = urutan di naskah (bagian أ, ب, ج); butir yang tak muat di template dilanjutkan di belakang.
      const nomor = new Map(); let no = 0;
      for (const bg of naskah.bagian) for (const { q } of bg.butir) if (q) nomor.set(q._uid, ++no);
      for (const x of hasil) if (!nomor.has(x.uid)) nomor.set(x.uid, Math.min(200, ++no));
      const paketId = PK.idPaket();
      const n = await onSimpan(hasil, { tingkat, kelas, mapel, nama, juz, periode, dawr, cakupan, urut: nomor, paketId, tautan: PK.tautanPaket({ bab, perpus, teksManual: teks, foto }), status: kirim ? 'pending' : 'draft' });
      toast(kirim ? `${n} butir paket dikirim ke editor.` : `${n} butir tersimpan sebagai satu paket Draft. Cari di tab Bank Soal (filter Paket).`); setHasil([]); setKurang([]); setSunting(null);
      if (onBukaBank) onBukaBank(paketId);
    }
    catch (e) { toast((e && e.message) || 'Gagal menyimpan. Periksa koneksi lalu coba lagi.'); } finally { setSimpanBusy(false); }
  };

  const ubahKomp = (k, v) => setKomposisi((x) => ({ ...x, [k]: Math.max(0, Math.min(100, Number(v) || 0)) }));
  const bobot = Math.max(1, komposisi.L1 + komposisi.L2 + komposisi.L3);
  // Halaman dari perpustakaan: tiap halaman jadi satu sumber dengan nomor cetaknya sendiri, jadi rujukan hal. per butir akurat.
  const tambahPerpus = (r) => {
    const ada = new Set(perpus.map((x) => x.id));
    const baru = r.halaman.map((p) => ({ id: `${r.kitabId}:${p.seq}`, nama: r.nama, teks: bagianTeks(p, r.bagian), hal: String(p.hal).slice(0, 20), juz: String(p.juz) })).filter((x) => x.teks.trim() && !ada.has(x.id));
    if (!baru.length) { toast('Halaman itu sudah ada di materi (atau kosong).'); return; }
    if (perpus.length && perpus[0].nama.toLowerCase() !== r.nama.toLowerCase() && !window.confirm(`Materi berisi halaman dari "${perpus[0].nama}". Menambahkan dari "${r.nama}" mencampur dua kitab dalam satu paket. Lanjutkan?`)) return;
    setPerpus((l) => [...l, ...baru].slice(0, 60));
    if (!nama.trim()) setNama(r.nama);
    if (!juz.trim()) setJuz(r.juz);
    if (!bab.trim() && r.bab) setBab(String(r.bab).slice(0, 120));
    toast(`${baru.length} halaman ditambahkan ke materi.`);
  };
  const sebaranTeks = ['a', 'b', 'c'].map((k) => { const p = NK.PRESET_DAURI[dawr].bagian.find((x) => x.kode === k); const c = PK.bagiLevel(p.n, komposisi); return `${LABEL_BAGIAN[k].split(' ')[0]}: ${c.L1}/${c.L2}/${c.L3}`; }).join(' · ');

  return (
    <div className="space-y-4">
      <Section title="Paket Dauri (naskah IMDA utuh)" icon={Layers}>
        <p className="text-xs leading-relaxed text-mute">Tempel teks, unggah berkas, atau foto banyak halaman kitab. Materi boleh jauh lebih dari 6.000 karakter: aplikasi membaginya per segmen lalu menyusun semua soal satu Dauri sekaligus, tanpa narasi, tiga opsi, dan teks kitab rujukan tercatat untuk naskah kunci.</p>
        <DraftNote names={['paketDauri']} className="mt-2" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor="pk-dauri">Dauri</Label>
            <Select id="pk-dauri" value={String(dawr)} onChange={(v) => setDauri(NK.dauriSah(v))} disabled={jalan}>{NK.DAFTAR_DAURI.map((d) => <option key={d.dawr} value={d.dawr}>{d.label} ({NK.ringkasDauri(d.dawr)})</option>)}</Select></div>
          <div><Label htmlFor="pk-tingkat">Tingkat</Label>
            <Select id="pk-tingkat" value={tingkat} onChange={(v) => { setTingkat(v); setKelas(''); }} disabled={jalan}>{tingkatOpsi.map((t) => <option key={t} value={t}>{labelTingkat(cfg, t)}</option>)}</Select></div>
          <div><Label htmlFor="pk-mapel">Mata pelajaran</Label>
            <Select id="pk-mapel" value={mapel} onChange={setMapel} disabled={jalan}>{mapelOpsi.map((m) => <option key={m} value={m}>{m}</option>)}</Select></div>
          <div><Label htmlFor="pk-kelas" hint="(opsional)">Kelas</Label>
            <Select id="pk-kelas" value={kelas} onChange={setKelas} disabled={jalan}><option value="">— Belum dipilih —</option>{kelasOpsi.map((k) => <option key={k} value={k}>Kelas {k}</option>)}</Select></div>
          <div><Label htmlFor="pk-periode" hint="(untuk cakupan)">Ujian</Label>
            <Select id="pk-periode" value={periode} onChange={setPeriode} disabled={jalan}><option value="">— Belum dipilih —</option>{periodeOpsi.map((x) => <option key={x.kode} value={x.kode}>{x.label}</option>)}</Select></div>
          <div><Label htmlFor="pk-nama">Nama kitab</Label>
            <input id="pk-nama" className="field" list="pk-kitab-list" value={nama} maxLength={120} onChange={(e) => setNama(e.target.value)} disabled={jalan} placeholder="Pilih dari Konfigurasi atau ketik" />
            <datalist id="pk-kitab-list">{kitabOpsi.map((k) => <option key={k.nama} value={k.nama} />)}</datalist></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="pk-juz" hint="(opsional)">Juz</Label><input id="pk-juz" className="field" value={juz} maxLength={20} onChange={(e) => setJuz(e.target.value)} disabled={jalan} /></div>
            <div><Label htmlFor="pk-hal" hint="halaman awal">Hal.</Label><input id="pk-hal" className="field" inputMode="numeric" value={halMulai} maxLength={20} onChange={(e) => setHalMulai(e.target.value)} disabled={jalan} /></div>
          </div>
        </div>
        {cakupan
          ? <p className="mt-3 rounded-lg bg-soft px-3 py-2 text-xs leading-relaxed text-soft-ink">Cakupan dari Konfigurasi: <b>{cakupan}</b>. AI hanya boleh membuat soal dari bagian teks yang masuk cakupan ini; segmen yang seluruhnya di luar cakupan dilewati.</p>
          : <p className="mt-3 text-xs leading-relaxed text-mute">{kitabCfg && kelas && periode ? 'Kitab ini belum punya cakupan untuk kelas dan ujian tersebut di Konfigurasi, jadi semua teks yang Anda berikan dianggap bahan ujian.' : 'Pilih kelas, ujian, dan kitab dari Konfigurasi agar batas materi (mis. Thaharah sampai Puasa) ikut dikirim ke AI. Tanpa itu, semua teks yang Anda berikan dianggap bahan ujian.'}</p>}
      </Section>

      <Section title="Materi" icon={BookOpen}>
        <div className="mb-3 space-y-2">
          <PemilihKitab Btn={Btn} ErrorBox={ErrorBox} callApi={callApi} apiErr={apiErr} katalog={cfg.kitab} mode="paket" onPakai={tambahPerpus} disabled={jalan} />
          {perpus.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-ink">Halaman dari perpustakaan ({perpus.length}) · {perpus.reduce((n, f) => n + f.teks.length, 0).toLocaleString('id-ID')} karakter</p>
              <ul className="space-y-1">{perpus.map((f) => (
                <li key={f.id} className="flex items-center gap-2 rounded-lg border border-line bg-bg px-3 py-1.5 text-xs">
                  <span className="min-w-0 flex-1 truncate">{f.nama} · hal. {f.hal} · juz {f.juz} · {f.teks.length.toLocaleString('id-ID')} karakter</span>
                  <button type="button" aria-label={`Hapus halaman ${f.hal}`} disabled={jalan} className="text-mute hover:text-bad disabled:opacity-40" onClick={() => setPerpus((l) => l.filter((x) => x.id !== f.id))}><Trash2 size={13} /></button>
                </li>))}</ul>
            </div>
          )}
        </div>
        <textarea {...tampilanDariIsi(teks, 'field min-h-[160px] leading-loose')} placeholder="Tempel teks kitab atau buku (Arab atau bahasa lain) di sini. Tidak dibatasi 6.000 karakter." value={teks} onChange={(e) => setTeks(e.target.value)} disabled={jalan} />
        <div className="mt-2 flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".txt,.htm,.html,.docx,.pdf" className="hidden" aria-label="Unggah berkas teks kitab" onChange={(e) => { tambahTeksBerkas(e.target.files[0]); e.target.value = ''; }} />
          <input ref={galeriRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" aria-label="Pilih banyak foto halaman kitab" onChange={(e) => { tambahFoto(e.target.files); e.target.value = ''; }} />
          <input ref={kameraRef} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Ambil foto halaman kitab" onChange={(e) => { tambahFoto(e.target.files); e.target.value = ''; }} />
          <Btn onClick={() => fileRef.current.click()} disabled={jalan}><Upload size={15} />Berkas (.txt .docx .pdf)</Btn>
          <Btn onClick={() => galeriRef.current.click()} disabled={jalan}><Camera size={15} />Foto (banyak)</Btn>
          <Btn onClick={() => kameraRef.current.click()} disabled={jalan}><Camera size={15} />Kamera</Btn>
          {jalan && fotoStatus && <Btn kind="danger" onClick={batal}><X size={15} />Batal</Btn>}
        </div>
        {fotoStatus && <div className="mt-2"><Spin>{fotoStatus}</Spin></div>}
        {foto.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold text-ink">Halaman dari foto ({foto.length}). Hasil baca AI wajib diperiksa: harakat dan huruf bisa salah.</p>
            {foto.map((f) => (
              <details key={f.id} className="rounded-xl border border-line bg-bg p-3">
                <summary className="cursor-pointer text-xs font-semibold">{f.nama}{f.hal ? ` · hal. ${f.hal}` : ''} · {f.teks.length.toLocaleString('id-ID')} karakter · kualitas {f.kualitas}{f.ragu.length ? ` · ${f.ragu.length} kata ragu` : ''}{f.kualitas === 'buruk' ? ' ⚠' : ''}</summary>
                <div className="mt-2 space-y-2">
                  {f.ragu.length > 0 && <p className="text-xs text-warn">Kata ragu: {f.ragu.map((r) => r.kata).join('، ')}</p>}
                  <textarea dir="rtl" lang="ar" className="field min-h-[120px] font-ar leading-loose" value={f.teks} onChange={(e) => setFoto((l) => l.map((x) => (x.id === f.id ? { ...x, teks: e.target.value } : x)))} disabled={jalan} />
                  <div className="flex items-center gap-2"><label className="text-xs text-mute" htmlFor={'pkh-' + f.id}>Hal.</label><input id={'pkh-' + f.id} className="field !w-24 !py-1.5" value={f.hal} maxLength={20} onChange={(e) => setFoto((l) => l.map((x) => (x.id === f.id ? { ...x, hal: e.target.value } : x)))} disabled={jalan} />
                    <Btn kind="danger" className="!px-3 !py-1.5 !text-xs" onClick={() => setFoto((l) => l.filter((x) => x.id !== f.id))} disabled={jalan}><Trash2 size={13} />Hapus</Btn></div>
                </div>
              </details>
            ))}
          </div>
        )}
        <p className={`mt-2 text-xs ${rencana.masalah && jumlahKarakter ? 'font-semibold text-bad' : 'text-mute'}`}>
          {jumlahKarakter.toLocaleString('id-ID')} karakter · {rencana.segmen.length} segmen{rencana.masalah && jumlahKarakter ? `. ${rencana.masalah}` : ''}
        </p>
      </Section>

      <Section title="Sebaran kesukaran" icon={ListChecks}>
        <div className="grid grid-cols-3 gap-3">
          {['L1', 'L2', 'L3'].map((k) => (
            <div key={k}><Label htmlFor={'pk-' + k}>{k === 'L1' ? 'L1 Ingatan' : k === 'L2' ? 'L2 Aplikasi' : 'L3 HOTS'}</Label>
              <input id={'pk-' + k} type="number" min="0" max="100" inputMode="numeric" className="field" value={komposisi[k]} onChange={(e) => ubahKomp(k, e.target.value)} disabled={jalan} /></div>
          ))}
        </div>
        <div className="mt-3 max-w-[200px]"><Label htmlFor="pk-lanj" hint="% di bagian أ">Soal melanjutkan</Label>
          <input id="pk-lanj" type="number" min="0" max="100" inputMode="numeric" className="field" value={lanjutan} onChange={(e) => setLanjutan(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} disabled={jalan} /></div>
        <p className="mt-2 text-xs leading-relaxed text-mute">Angka adalah perbandingan (bobot), bukan harus 100. Bawaan 30:50:20 hanya titik awal; sesuaikan kebijakan madrasah. Jumlah per bagian (L1/L2/L3): {sebaranTeks}.</p>
        <div className="mt-3"><Label htmlFor="pk-fokus" hint="(opsional)">Fokus soal</Label><input id="pk-fokus" className="field" value={fokus} maxLength={300} onChange={(e) => setFokus(e.target.value)} disabled={jalan} /></div>
        <div className="mt-3"><Label htmlFor="pk-bab" hint="(untuk kisi-kisi)">Bab / Materi</Label><input id="pk-bab" list="pk-bab-list" className="field" maxLength={120} placeholder="mis. Bab Thaharah" value={bab} onChange={(e) => setBab(e.target.value)} disabled={jalan} />
          <datalist id="pk-bab-list">{babSaran.map((b) => <option key={b} value={b} />)}</datalist>
          <p className="mt-1 text-xs text-mute">Dicatat pada semua butir paket supaya tampil di kisi-kisi. {babSaran.length ? 'Pilihan berasal dari saran AI di tab Fokus Ujian.' : 'Tab Fokus Ujian bisa menyarankan bab yang penting.'}</p></div>
      </Section>

      <label className="flex items-start gap-2 rounded-xl border border-line bg-white px-3 py-3 text-sm">
        <input id="pk-fakta" type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)]" checked={modeFakta} onChange={(e) => setModeFakta(e.target.checked)} disabled={jalan} />
        <span className="min-w-0 leading-relaxed"><b>Mode fakta</b>: tiap butir menguji satu fakta berbeda dari teks, dengan kutipan dasar yang sudah dicocokkan sistem, dan wajib menjelaskan mengapa tiap pengecoh salah. Menambah ±1 panggilan AI per segmen teks (untuk mengekstrak fakta). Bila fakta di satu segmen habis atau ekstrak gagal, butir yang tersisa dibuat dengan cara biasa dan dilaporkan.</span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Btn kind="primary" onClick={buat} disabled={jalan || !!rencana.masalah || !rencana.panggilan}><Sparkles size={16} />Buat paket {NK.PRESET_DAURI[dawr].label}</Btn>
        {!jalan && hasil.length > 0 && kekurangan.sisa.length > 0 && !rencana.masalah && <Btn kind="soft" onClick={lanjutkan}><RefreshCw size={15} />Lanjutkan sisa ({kekurangan.sisa.length} butir)</Btn>}
        {jalan && !fotoStatus && <Btn kind="danger" onClick={batal}><X size={15} />Batal</Btn>}
        <span className="text-xs text-mute">{rencana.panggilan ? `${rencana.total} butir · ±${rencana.panggilan}${modeFakta ? ` + ±${new Set(rencana.tugas.map((t) => t.segmen)).size}` : ''} panggilan AI (kuota harian dipakai)` : ''}</span>
      </div>
      {status && <Spin>{status}</Spin>}
      {err && <ErrorBox e={err} />}

      {(hasil.length > 0 || kurang.length > 0) && (
        <Section title={`Hasil (${hasil.length} dari ${rencana.total} butir)`} icon={ClipboardCheck}
          action={<div className="flex flex-wrap gap-2">
            <Btn kind="ghost" onClick={() => simpan(false)} disabled={jalan || simpanBusy || !hasil.length}>{simpanBusy ? <Loader2 size={15} className="spin" /> : <Save size={15} />}Simpan sebagai Draft</Btn>
            <Btn kind="primary" onClick={() => simpan(true)} disabled={jalan || simpanBusy || !hasil.length}><Send size={15} />Simpan dan kirim ke editor</Btn></div>}>
          {naskah.peringatan.length > 0 && <ul className="mb-3 space-y-1">{naskah.peringatan.filter((p) => !/halaman kitab/.test(p)).map((p, i) => <li key={i} className="rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn">{p}</li>)}</ul>}
          {buangan.length > 0 && <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn"><span>{buangan.length} butir kembar dengan butir lain di paket ini.</span><Btn kind="soft" className="!text-xs" onClick={hapusKembar} disabled={jalan}>Buang yang kembar</Btn></div>}
          {kurang.length > 0 && <p className="mb-3 rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn">{kurang.length} butir tidak jadi (sudah diulang, kembar dengan butir lain, atau segmennya di luar cakupan). Jalankan paket lagi untuk menambah, atau tulis manual di tab Penyusunan Soal.</p>}
          {naskah.bagian.map((bg) => (
            <div key={bg.kode} className="mb-4">
              <h3 className="mb-2 text-xs font-bold text-ink">{LABEL_BAGIAN[bg.kode]} · {bg.terisi} dari {bg.n} nomor</h3>
              <ol className="space-y-2">
                {bg.butir.filter((x) => x.q).map(({ no, q }) => {
                  const r = lookup.get(q._uid); const b = Bt.bentukDari(q);
                  return (
                    <li key={q._uid} className="rounded-xl border border-line bg-bg p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="leading-relaxed"><span className="mr-1 font-bold">{no}.</span>{q.pertanyaan}</p>
                        <div className="flex shrink-0 gap-1">
                          <button type="button" onClick={() => setSunting(sunting === q._uid ? null : q._uid)} disabled={jalan} aria-label={`Sunting nomor ${no}`} className="rounded-lg p-1.5 text-mute hover:bg-soft hover:text-ink"><Pencil size={14} /></button>
                          <button type="button" onClick={() => hapus(q._uid)} disabled={jalan} aria-label={`Hapus nomor ${no}`} className="rounded-lg p-1.5 text-mute hover:bg-bad-bg hover:text-bad"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      {r && r.diedit && <p className="mt-1 text-xs text-soft-ink">Sudah Anda sunting.</p>}
                      {sunting === q._uid && r && <EditButirPaket key={q._uid} r={r} onSimpan={(d) => ubahButir(q._uid, d)} onBatal={() => setSunting(null)} />}
                      {Bt.punyaOpsi(b) && <p className="mt-1 text-xs text-mute">{['A', 'B', 'C'].map((k) => `${k}${q.kunci === k ? '✓' : ''}. ${q.opsi[k]}`).join('   ')}</p>}
                      {!Bt.punyaOpsi(b) && <p className="mt-1 text-xs text-mute">Jawaban: {q.jawaban}</p>}
                      <p className="mt-1 text-xs text-mute">{q.level}{r && r.segmenHal ? ` · hal. ${r.segmenHal}` : ''}</p>
                      {NK.kutipanKunci(q) && <p dir="rtl" lang="ar" className="mt-1 font-ar text-base leading-loose text-soft-ink">{NK.kutipanKunci(q)}</p>}
                      {r && r.kutipanStatus !== 'cocok' && <p className="mt-1 text-xs text-warn">{LABEL_KUTIPAN_STATUS[r.kutipanStatus]}</p>}
                      {r && r.sikap && r.sikap.status !== 'aman' && <p className="mt-1 text-xs text-warn">Periksa nada soal: {r.sikap.temuan.map((t) => t.kata).join(', ')}</p>}
                      {(kemiripan.get(q._uid) || []).map((m) => <p key={m.dengan} className="mt-1 text-xs text-warn">{m.jenis === 'kembar' ? 'Kembar' : 'Mirip'} {Math.round(m.skor * 100)}% dengan nomor {nomorUid.get(m.dengan) || '?'}{m.kunciBeda ? ', tetapi kunci jawabannya berbeda: periksa mana yang benar' : ''}. Hapus salah satu bila memang sama.</p>)}
                      {r && r.catatan.filter((c) => !/Kutipan|Kunci jatuh/.test(c)).map((c, i) => <p key={i} className="mt-1 text-xs text-warn">{c}</p>)}
                      {r && r.faktaDasar && (
                        <details className="mt-1 text-xs text-mute">
                          <summary className="cursor-pointer font-semibold text-soft-ink">Dasar butir (satu fakta)</summary>
                          <p className="mt-1 leading-relaxed">{r.faktaDasar}</p>
                          {r.alasanPengecoh && <p className="mt-1 whitespace-pre-wrap leading-relaxed"><b>Mengapa pengecoh salah:</b> {r.alasanPengecoh}</p>}
                        </details>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
