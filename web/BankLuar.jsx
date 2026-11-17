import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Download, FileSpreadsheet, FileText, FileUp, Library, Loader2, Save, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { Btn, ErrorBox, Label, Section, Select, Spin, apiErr, callApi, simpanBerkas, useCfg } from './ui.jsx';
import { mapelUntuk } from './lib/dasar.js';
import { muatDocx } from './lib/muatDocx.js';
import { bacaDocxSoal, gabungKunci, MAKS_BERKAS } from './lib/soalDocx.js';
import { BATAS, LEVEL, bersihkanMeta, bersihkanPaket, butirUntukKisi, lengkapiKisiDraf, perluTinjauKisi, ringkasPaket } from './lib/soalLuar.js';
import { BAGIAN, PRESET_DAURI } from './lib/naskah.js';
import { MAKS_ASLI, MIME_DOCX, SUBKOLEKSI_BERKAS, base64KeByte, byteKeBase64, gabungPotongan } from './lib/berkasLuar.js';
import * as K from './lib/kisi.js';
import { bocor, buatKisiFokusDocx, kisiKhususKeCsv, kisiUmumKeCsv, buatKisiUmum, buatKisiKhusus } from './lib/kisiFokus.js';

const HURUF = { a: 'أ', b: 'ب', c: 'ج' };
const LEVEL_LABEL = { L1: 'L1 Ingatan', L2: 'L2 Aplikasi', L3: 'L3 HOTS' };
const hariIni = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const sha256 = async (buf) => { try { const h = await crypto.subtle.digest('SHA-256', buf); return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join(''); } catch { return ''; } };
const urut = (a, b) => 'abc'.indexOf(a.bagian) - 'abc'.indexOf(b.bagian) || a.no - b.no;
const potong = (arr, n) => { const o = []; for (let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o; };

/** Baris kisi-kisi (level, bab, indikator) satu butir; dipakai di pratinjau unggahan dan di penyuntingan naskah tersimpan. */
function KisiBaris({ b, onChange, idDasar }) {
  const ubah = (k, v) => onChange({ ...b, [k]: v, kisiSumber: 'manual' });
  return (
    <div className="mt-3 grid gap-2 rounded-xl bg-soft p-3 sm:grid-cols-[9rem_1fr]">
      <div>
        <Label htmlFor={`${idDasar}-lv`}>Level</Label>
        <Select id={`${idDasar}-lv`} value={b.level || ''} onChange={(v) => ubah('level', v)}>
          <option value="">Pilih…</option>
          {LEVEL.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
        </Select>
      </div>
      <div>
        <Label htmlFor={`${idDasar}-bab`}>Bab / materi pokok</Label>
        <input id={`${idDasar}-bab`} className="field" maxLength={BATAS.bab} value={b.bab || ''} onChange={(e) => ubah('bab', e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor={`${idDasar}-fk`} hint="(untuk lembar fokus belajar murid; topik luas, tanpa jawaban)">Fokus belajar</Label>
        <input id={`${idDasar}-fk`} className="field" maxLength={BATAS.fokus} value={b.fokus || ''} onChange={(e) => ubah('fokus', e.target.value)} placeholder="mis. Syarat dan rukun wudhu" />
        {b.fokus && bocor(b.fokus, b) && <p className="mt-1 flex items-center gap-1 text-xs text-warn"><AlertTriangle size={14} />Fokus ini memuat jawaban atau kalimat soal, jadi akan dibuang dari lembar murid. Tulis lebih umum.</p>}
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor={`${idDasar}-ind`} hint={b.kisiSumber === 'draf' ? '(draf otomatis, periksa)' : b.kisiSumber === 'ai' ? '(saran AI, periksa)' : ''}>Indikator</Label>
        <textarea id={`${idDasar}-ind`} rows={2} className="field" maxLength={BATAS.indikator} value={b.indikator || ''} onChange={(e) => ubah('indikator', e.target.value)} />
      </div>
    </div>
  );
}

/** Analisis AI per kelompok 20 butir; hasil digabung ke butir menurut (bagian, nomor). */
async function analisisAi(butir, meta, daftarBab) {
  const hasil = new Map(); let model = ''; const peringatan = []; const sikap = [];
  for (const kel of potong(butir, 20)) {
    const r = await callApi('/api/soal-luar', {
      aksi: 'kisi', butir: kel.map((b) => ({ bagian: b.bagian, no: b.no, bentuk: b.bentuk, pertanyaan: b.pertanyaan, opsi: b.opsi, kunci: b.kunci, jawaban: b.jawaban, kutipan: b.kutipan, hal: b.hal })),
      daftarBab, mapel: meta.mapel, tingkat: meta.tingkat, kelas: meta.kelas, kitab: meta.kitab,
    });
    model = r.model || model; peringatan.push(...(r.hasil.peringatan || [])); sikap.push(...((r.hasil.sikap && r.hasil.sikap.temuan) || []));
    r.hasil.kisi.forEach((k) => { const b = kel[k.i]; hasil.set(`${b.bagian}${b.no}`, k); });
  }
  const gabung = butir.map((b) => { const k = hasil.get(`${b.bagian}${b.no}`); return k ? { ...b, level: k.level, bab: k.bab || b.bab || '', indikator: k.indikator, fokus: k.fokus || b.fokus || '', kisiSumber: k.sumber } : b; });
  return { butir: gabung, model, peringatan, sikap };
}

/** Tombol analisis dan draf; dipakai di pratinjau dan penyuntingan. */
function AlatKisi({ butir, setButir, meta, daftarBab, setDaftarBab, onModel, disabled }) {
  const [sibuk, setSibuk] = useState(false); const [err, setErr] = useState(null); const [info, setInfo] = useState([]);
  const jalankan = async () => {
    setSibuk(true); setErr(null); setInfo([]);
    try {
      const r = await analisisAi(butir, meta, daftarBab.split('\n').map((x) => x.trim()).filter(Boolean));
      setButir(r.butir); onModel(r.model, 'ai'); setInfo([...new Set(r.peringatan)]);
      if (r.sikap.length) setInfo((x) => [...x, `Nada ${r.sikap.length} indikator perlu diperiksa (${[...new Set(r.sikap.map((t) => t.kata))].slice(0, 3).join(', ')}).`]);
    } catch (e) { setErr(apiErr(e)); } finally { setSibuk(false); }
  };
  const draf = () => { setButir(lengkapiKisiDraf(butir)); onModel('', 'draf'); setInfo(['Draf hanya mengisi yang masih kosong dan ditebak dari bentuk soal; tinjau tiap indikator.']); };
  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="luar-daftar-bab" hint="(opsional, satu bab per baris; AI hanya memilih dari daftar ini)">Daftar bab kitab</Label>
        <textarea id="luar-daftar-bab" rows={3} className="field" dir="auto" maxLength={4000} value={daftarBab} onChange={(e) => setDaftarBab(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Btn kind="primary" onClick={jalankan} disabled={disabled || sibuk || !butir.length}>{sibuk ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}Analisis kisi-kisi dengan AI</Btn>
        <Btn kind="ghost" onClick={draf} disabled={disabled || sibuk || !butir.length}><Wand2 size={16} />Isi draf tanpa AI</Btn>
      </div>
      {sibuk && <Spin>AI sedang menyusun kisi-kisi. Naskah 20 butir biasanya selesai dalam setengah menit.</Spin>}
      {err && <ErrorBox e={err} />}
      {info.map((x) => <p key={x} className="rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn">{x}</p>)}
    </div>
  );
}

/** Kartu satu butir di pratinjau: kalimat soal, opsi, kunci, dan kisi-kisi dapat disunting. */
function ButirKartu({ b, i, ubah, bisaSunting }) {
  const id = `luar-${b.bagian}${b.no}-${i}`;
  const set = (k, v) => ubah({ ...b, [k]: v });
  return (
    <li className="rounded-xl border border-line bg-surface p-3">
      <p className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold text-mute">
        <span className="rounded-md bg-soft px-2 py-0.5 text-soft-ink"><span lang="ar">{HURUF[b.bagian]}</span> no. {b.no}</span>
        <span>{({ pilgan: 'Pilihan ganda', lanjutan: 'Melanjutkan', isian: 'Isian', uraian: 'Uraian' })[b.bentuk]}</span>
        {b.hal && <span>Hal. {b.hal}</span>}
        {b.kunciDari === 'merah' && <span className="text-ok">kunci dari warna merah</span>}
        {b.kunciDari === 'naskah-kunci' && <span className="text-ok">kunci dari naskah kunci</span>}
      </p>
      {bisaSunting ? (
        <>
          <textarea aria-label={`Kalimat soal ${HURUF[b.bagian]} ${b.no}`} dir="auto" rows={2} className="field" maxLength={BATAS.pertanyaan} value={b.pertanyaan} onChange={(e) => set('pertanyaan', e.target.value)} />
          {b.bagian === 'a' ? (
            <ul className="mt-2 space-y-1.5">
              {['A', 'B', 'C', 'D', 'E'].filter((k) => k in b.opsi || ['A', 'B', 'C'].includes(k)).map((k) => (
                <li key={k} className="flex items-center gap-2">
                  <input type="radio" className="h-5 w-5 shrink-0" name={`${id}-kunci`} checked={b.kunci === k} onChange={() => set('kunci', k)} aria-label={`Jadikan ${k} kunci`} />
                  <span className="w-5 text-sm font-bold text-mute">{k}</span>
                  <input aria-label={`Opsi ${k}`} dir="auto" className="field" maxLength={BATAS.opsi} value={b.opsi[k] || ''} onChange={(e) => set('opsi', { ...b.opsi, [k]: e.target.value })} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-2">
              <Label htmlFor={`${id}-jw`}>{b.bagian === 'b' ? 'Jawaban isian' : 'Jawaban / pedoman'}</Label>
              <textarea id={`${id}-jw`} dir="auto" rows={2} className="field" maxLength={BATAS.jawaban} value={b.jawaban || ''} onChange={(e) => set('jawaban', e.target.value)} />
            </div>
          )}
        </>
      ) : null}
      {(b.catatan || []).length > 0 && <p className="mt-2 text-xs text-warn">{b.catatan.join('; ')}</p>}
      <KisiBaris b={b} idDasar={id} onChange={ubah} />
    </li>
  );
}

function Pratinjau({ hasil, canSave, onSelesai, toast }) {
  const cfg = useCfg();
  const [butir, setButir] = useState(hasil.butir);
  const [meta, setMeta] = useState({ dawr: hasil.meta.dawr, mapel: hasil.meta.mapel || '', tingkat: '', kelas: hasil.meta.kelas || '', periode: '', tahun: '', kitab: '', judul: '', aksara: hasil.meta.aksara });
  const [ver, setVer] = useState({ oleh: '', tanggal: hariIni(), catatan: '', pernyataan: false });
  const [daftarBab, setDaftarBab] = useState('');
  const [kisiSumber, setKisiSumber] = useState('draf'); const [kisiModel, setKisiModel] = useState('');
  const [sibuk, setSibuk] = useState(false); const [err, setErr] = useState(null);
  const tingkatOpsi = cfg.tingkat.filter((t) => t.aktif);
  const mapelOpsi = mapelUntuk(cfg, meta.tingkat);

  const m = useMemo(() => bersihkanMeta({ ...meta, verifikasi: ver }), [meta, ver]);
  const p = useMemo(() => bersihkanPaket(butir.map(({ catatan, kunciDari, ...x }) => x)), [butir]);
  const galat = [...m.galat, ...p.galat];
  const tinjau = perluTinjauKisi(butir);
  const ubahButir = (i) => (nb) => setButir((a) => a.map((x, j) => (j === i ? nb : x)));
  const setM = (k) => (v) => setMeta((x) => ({ ...x, [k]: v }));

  const simpan = async () => {
    setSibuk(true); setErr(null);
    try {
      await callApi('/api/soal-luar', { aksi: 'simpan', meta, verifikasi: ver, butir: p.butir, berkas: hasil.berkas, kisiSumber, kisiModel });
      toast('Naskah tersimpan di Bank Soal Manual.'); onSelesai();
    } catch (e) { setErr(apiErr(e)); } finally { setSibuk(false); }
  };

  return (
    <Section title={`Pratinjau: ${butir.length} butir terbaca`} icon={FileText}>
      <div className="space-y-5">
        {hasil.peringatan.length > 0 && (
          <div role="status" className="rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn">
            <p className="flex items-center gap-2 font-bold"><AlertTriangle size={16} />Periksa dulu</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">{hasil.peringatan.slice(0, 12).map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div><Label htmlFor="lx-dawr">Dauri</Label>
            <Select id="lx-dawr" value={meta.dawr === null ? '' : String(meta.dawr)} onChange={(v) => setM('dawr')(v ? Number(v) : null)}><option value="">Pilih…</option>{Object.keys(PRESET_DAURI).map((d) => <option key={d} value={d}>{PRESET_DAURI[d].label}</option>)}</Select></div>
          <div><Label htmlFor="lx-tingkat">Tingkat</Label>
            <Select id="lx-tingkat" value={meta.tingkat} onChange={setM('tingkat')}><option value="">Pilih…</option>{tingkatOpsi.map((t) => <option key={t.nama} value={t.nama}>{t.label || t.nama}</option>)}</Select></div>
          <div><Label htmlFor="lx-mapel">Mata pelajaran</Label>
            <input id="lx-mapel" list="lx-mapel-list" className="field" maxLength={BATAS.mapel} value={meta.mapel} onChange={(e) => setM('mapel')(e.target.value)} /><datalist id="lx-mapel-list">{mapelOpsi.map((x) => <option key={x} value={x} />)}</datalist></div>
          <div><Label htmlFor="lx-kelas">Kelas</Label><input id="lx-kelas" className="field" maxLength={BATAS.kelas} value={meta.kelas} onChange={(e) => setM('kelas')(e.target.value)} /></div>
          <div><Label htmlFor="lx-periode" hint="(opsional)">Periode</Label><input id="lx-periode" className="field" placeholder="UAS, UTS…" maxLength={BATAS.periode} value={meta.periode} onChange={(e) => setM('periode')(e.target.value)} /></div>
          <div><Label htmlFor="lx-kitab" hint="(opsional)">Kitab rujukan</Label><input id="lx-kitab" className="field" dir="auto" maxLength={BATAS.kitab} value={meta.kitab} onChange={(e) => setM('kitab')(e.target.value)} /></div>
        </div>

        <ul className="space-y-3">{butir.slice().sort(urut).map((b) => { const i = butir.indexOf(b); return <ButirKartu key={`${b.bagian}${b.no}-${i}`} b={b} i={i} ubah={ubahButir(i)} bisaSunting />; })}</ul>

        <div className="rounded-xl border border-line p-4">
          <h3 className="mb-2 text-sm font-bold text-ink">Kisi-kisi</h3>
          <AlatKisi butir={butir} setButir={setButir} meta={meta} daftarBab={daftarBab} setDaftarBab={setDaftarBab} onModel={(mdl, s) => { setKisiModel(mdl); setKisiSumber(s); }} disabled={false} />
          {tinjau > 0 && <p className="mt-3 text-xs text-warn">{tinjau} butir masih berisi kisi-kisi draf atau kosong. Boleh disimpan, tetapi tinjau sebelum kisi-kisi dibagikan.</p>}
        </div>

        <div className="rounded-xl border border-line p-4">
          <h3 className="mb-1 text-sm font-bold text-ink">Pernyataan verifikasi di luar aplikasi</h3>
          <p className="mb-3 text-xs text-mute">Naskah manual tidak melewati pemeriksaan kutipan dan tahap editor aplikasi, jadi yang dicatat adalah siapa yang memverifikasinya di luar aplikasi dan siapa yang mencatatnya di sini.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="lx-oleh">Diverifikasi oleh</Label><input id="lx-oleh" className="field" maxLength={BATAS.oleh} value={ver.oleh} onChange={(e) => setVer({ ...ver, oleh: e.target.value })} /></div>
            <div><Label htmlFor="lx-tgl">Tanggal verifikasi</Label><input id="lx-tgl" type="date" className="field" value={ver.tanggal} onChange={(e) => setVer({ ...ver, tanggal: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label htmlFor="lx-cat" hint="(opsional)">Catatan</Label><input id="lx-cat" className="field" maxLength={BATAS.catatan} value={ver.catatan} onChange={(e) => setVer({ ...ver, catatan: e.target.value })} /></div>
          </div>
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-ink">
            <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={ver.pernyataan} onChange={(e) => setVer({ ...ver, pernyataan: e.target.checked })} />
            <span>Saya menyatakan naskah ini sudah diverifikasi oleh editor di luar aplikasi.</span>
          </label>
        </div>

        {galat.length > 0 && (
          <div role="status" className="rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">
            <p className="font-bold">Belum bisa disimpan:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">{galat.slice(0, 8).map((x) => <li key={x}>{x}</li>)}{galat.length > 8 && <li>dan {galat.length - 8} masalah lain</li>}</ul>
          </div>
        )}
        {!canSave && <p className="rounded-xl bg-soft px-4 py-3 text-sm text-soft-ink">Menyimpan ke bank hanya bisa dilakukan editor atau admin, karena menyatakan verifikasi luar. Anda tetap bisa memeriksa hasil bacaan dan kisi-kisinya.</p>}
        {err && <ErrorBox e={err} />}
        <div className="flex flex-wrap gap-2">
          <Btn kind="primary" onClick={simpan} disabled={!canSave || galat.length > 0 || sibuk}>{sibuk ? <Loader2 size={16} className="spin" /> : <Save size={16} />}Simpan ke Bank Soal Manual</Btn>
          <Btn kind="ghost" onClick={onSelesai} disabled={sibuk}>Batal</Btn>
        </div>
      </div>
    </Section>
  );
}

function KartuPaket({ p, me, isAdmin, muat, toast }) {
  const [buka, setBuka] = useState(false); const [ubah, setUbah] = useState(null); const [sibuk, setSibuk] = useState(''); const [err, setErr] = useState(null);
  const [daftarBab, setDaftarBab] = useState(''); const [konfirm, setKonfirm] = useState(false); const [kisiSumber, setKisiSumber] = useState('manual'); const [model, setModel] = useState('');
  const bolehUbah = isAdmin || p.createdByUid === me.uid;
  const butir = (ubah || p.butir || []).slice().sort(urut);
  const kisi = useMemo(() => K.buatKisi(butirUntukKisi({ ...p, butir }), { judul: p.judul }), [p, butir]);
  const tinjau = perluTinjauKisi(p.butir);
  const slug = (p.judul || 'naskah').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'naskah';
  const tgl = p.createdAt && p.createdAt.toDate ? p.createdAt.toDate().toLocaleDateString('id-ID') : '';

  const unduh = async (mode) => {
    setSibuk(mode); setErr(null);
    try {
      const csv = (nama, isi) => simpanBerkas(`${nama}-${slug}.csv`, new Blob([isi], { type: 'text/csv;charset=utf-8' }));
      if (mode === 'csv') csv('kisi-kisi-rinci', K.kisiKeCsv(kisi, ''));
      else if (mode === 'umum-csv') csv('kisi-kisi-umum', kisiUmumKeCsv(buatKisiUmum(p)));
      else if (mode === 'fokus-csv') csv('fokus-belajar', kisiKhususKeCsv(buatKisiKhusus(p)));
      else {
        const D = await muatDocx(); const dok = { umum: ['kisi-kisi-umum', 'umum'], fokus: ['fokus-belajar', 'fokus'], paket: ['kisi-kisi-dan-fokus-belajar', 'lengkap'] }[mode];
        if (dok) simpanBerkas(`${dok[0]}-${slug}.docx`, await D.Packer.toBlob(buatKisiFokusDocx(D, p, dok[1])));
        else simpanBerkas(`kisi-kisi-rinci-guru-${slug}.docx`, await D.Packer.toBlob(K.buatKisiDocx(D, kisi, 'kisi', '')));
      }
      toast('File diunduh.');
    } catch (e) { setErr({ code: 'FILE', message: e && e.message ? e.message : 'Gagal membuat file.' }); } finally { setSibuk(''); }
  };
  const unduhAsli = async () => {
    setSibuk('asli'); setErr(null);
    try {
      const snap = await firebase.firestore().collection('soalLuar').doc(p.id).collection(SUBKOLEKSI_BERKAS).get({ source: 'server' });
      const b64 = gabungPotongan(snap.docs.map((d) => d.data()));
      if (!b64) throw new Error('Salinan naskah asli tidak lengkap di server.');
      const byte = base64KeByte(b64);
      const h = await crypto.subtle.digest('SHA-256', byte).then((x) => [...new Uint8Array(x)].map((c) => c.toString(16).padStart(2, '0')).join('')).catch(() => '');
      if (p.berkas && p.berkas.sha256 && h && h !== p.berkas.sha256) throw new Error('Isi naskah asli tidak cocok dengan sidik yang tercatat (SHA-256); berkas tidak diunduh.');
      simpanBerkas((p.berkas && p.berkas.nama) || `naskah-${slug}.docx`, new Blob([byte], { type: MIME_DOCX }));
      toast('Naskah asli diunduh.');
    } catch (e) { setErr({ code: 'FILE', message: e && e.message ? e.message : 'Gagal mengunduh naskah asli.' }); } finally { setSibuk(''); }
  };
  const simpanKisi = async () => {
    setSibuk('simpan'); setErr(null);
    try {
      await callApi('/api/soal-luar', { aksi: 'kisi-simpan', id: p.id, kisi: ubah.map(({ bagian, no, level, bab, indikator, fokus, kisiSumber: ks }) => ({ bagian, no, level, bab, indikator, fokus: fokus || '', kisiSumber: ks })), sumber: kisiSumber, model });
      toast('Kisi-kisi diperbarui.'); setUbah(null); muat();
    } catch (e) { setErr(apiErr(e)); } finally { setSibuk(''); }
  };
  const hapus = async () => {
    setSibuk('hapus'); setErr(null);
    try { await callApi('/api/soal-luar', { aksi: 'hapus', id: p.id }); toast('Naskah dihapus.'); muat(); } catch (e) { setErr(apiErr(e)); setKonfirm(false); } finally { setSibuk(''); }
  };

  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-ink" dir="auto">{p.judul}</p>
          <p className="text-xs text-mute">{ringkasPaket(p)}</p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ok"><CheckCircle2 size={14} />Diverifikasi di luar aplikasi oleh {p.verifikasi && p.verifikasi.oleh}{p.verifikasi && p.verifikasi.tanggal ? `, ${p.verifikasi.tanggal}` : ''}<span className="text-mute">· dicatat {p.createdByName || 'editor'}{tgl ? `, ${tgl}` : ''}</span></p>
          {p.berkas && p.berkas.nama && !p.berkas.tersimpan && <p className="mt-1 text-xs text-mute">Salinan asli ({p.berkas.nama}) tidak tersimpan; hanya teks soal.</p>}
          {tinjau > 0 && <p className="mt-1 text-xs text-warn">{tinjau} butir kisi-kisinya masih draf/kosong.</p>}
        </div>
        <Btn kind="ghost" onClick={() => setBuka(!buka)} aria-expanded={buka}>{buka ? <ChevronUp size={16} /> : <ChevronDown size={16} />}{buka ? 'Tutup' : 'Buka'}</Btn>
      </div>
      {buka && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Btn kind="primary" onClick={() => unduh('paket')} disabled={!!sibuk}>{sibuk === 'paket' ? <Loader2 size={16} className="spin" /> : <Download size={16} />}Untuk murid: Umum + Fokus (DOCX)</Btn>
            <Btn kind="ghost" onClick={() => unduh('umum')} disabled={!!sibuk}>Kisi-kisi Umum</Btn>
            <Btn kind="ghost" onClick={() => unduh('fokus')} disabled={!!sibuk}>Lembar Fokus Belajar</Btn>
            <Btn kind="ghost" onClick={() => unduh('docx')} disabled={!!sibuk}>{sibuk === 'docx' ? <Loader2 size={16} className="spin" /> : <Download size={16} />}Kisi-kisi rinci (guru)</Btn>
            <Btn kind="ghost" onClick={() => unduh('umum-csv')} disabled={!!sibuk}><FileSpreadsheet size={16} />Umum CSV</Btn>
            <Btn kind="ghost" onClick={() => unduh('fokus-csv')} disabled={!!sibuk}><FileSpreadsheet size={16} />Fokus CSV</Btn>
            <Btn kind="ghost" onClick={() => unduh('csv')} disabled={!!sibuk}><FileSpreadsheet size={16} />Rinci CSV</Btn>
            {p.berkas && p.berkas.tersimpan && <Btn kind="soft" onClick={unduhAsli} disabled={!!sibuk}>{sibuk === 'asli' ? <Loader2 size={16} className="spin" /> : <FileText size={16} />}Naskah asli (.docx)</Btn>}
            {bolehUbah && !ubah && <Btn kind="ghost" onClick={() => setUbah(p.butir.map((b) => ({ ...b })))}>Ubah kisi-kisi</Btn>}
            {bolehUbah && !konfirm && <Btn kind="danger" onClick={() => setKonfirm(true)}><Trash2 size={16} />Hapus</Btn>}
            {konfirm && <><Btn kind="danger" onClick={hapus} disabled={sibuk === 'hapus'}>{sibuk === 'hapus' ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}Ya, hapus naskah ini</Btn><Btn kind="ghost" onClick={() => setKonfirm(false)}>Batal</Btn></>}
          </div>
          {err && <ErrorBox e={err} />}
          {ubah && (
            <div className="rounded-xl border border-line p-4">
              <AlatKisi butir={ubah} setButir={setUbah} meta={p} daftarBab={daftarBab} setDaftarBab={setDaftarBab} onModel={(m, s) => { setModel(m); setKisiSumber(s); }} disabled={!!sibuk} />
              <div className="mt-3 flex gap-2"><Btn kind="primary" onClick={simpanKisi} disabled={!!sibuk}>{sibuk === 'simpan' ? <Loader2 size={16} className="spin" /> : <Save size={16} />}Simpan kisi-kisi</Btn><Btn kind="ghost" onClick={() => setUbah(null)}>Batal</Btn></div>
            </div>
          )}
          <ul className="space-y-3">
            {butir.map((b, i) => (ubah
              ? <ButirKartu key={`${b.bagian}${b.no}`} b={b} i={i} bisaSunting={false} ubah={(nb) => setUbah((a) => a.map((x) => (x.bagian === nb.bagian && x.no === nb.no ? nb : x)))} />
              : (
                <li key={`${b.bagian}${b.no}`} className="rounded-xl bg-soft p-3 text-sm">
                  <p className="text-xs font-bold text-mute"><span lang="ar">{HURUF[b.bagian]}</span> no. {b.no} · {b.level || '-'}{b.bab ? ` · ${b.bab}` : ''}</p>
                  <p className="mt-1 text-ink" dir="auto">{b.pertanyaan}</p>
                  {b.bagian === 'a' && <p className="mt-1 text-xs text-mute" dir="auto">{Object.entries(b.opsi).map(([k, v]) => `${k}) ${v}`).join('   ')} · kunci {b.kunci}</p>}
                  {b.bagian !== 'a' && b.jawaban && <p className="mt-1 text-xs text-mute" dir="auto">Jawaban: {b.jawaban}</p>}
                  <p className="mt-1 text-xs text-soft-ink" dir="auto">{b.indikator}</p>
                </li>
              )))}
          </ul>
        </div>
      )}
    </li>
  );
}

export default function BankLuar({ me, canReview, isAdmin, toast }) {
  const [daftar, setDaftar] = useState(null); const [errDaftar, setErrDaftar] = useState(null);
  const [hasil, setHasil] = useState(null); const [baca, setBaca] = useState(false); const [err, setErr] = useState(null);
  const inputNaskah = useRef(null); const inputKunci = useRef(null);

  const muat = useCallback(async () => {
    try {
      const s = await firebase.firestore().collection('soalLuar').orderBy('createdAt', 'desc').limit(100).get();
      setDaftar(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setErrDaftar(null);
    } catch (e) { setErrDaftar({ code: 'NETWORK', message: 'Daftar Bank Soal Manual tidak bisa dimuat. Periksa koneksi lalu muat ulang tab ini.' }); }
  }, []);
  useEffect(() => { muat(); }, [muat]);

  const proses = async () => {
    const f = inputNaskah.current && inputNaskah.current.files[0]; const fk = inputKunci.current && inputKunci.current.files[0];
    if (!f) { setErr({ code: 'FILE', message: 'Pilih berkas naskah (.docx) dulu.' }); return; }
    setBaca(true); setErr(null); setHasil(null);
    try {
      if (f.size > MAKS_BERKAS) throw new Error(`Berkas terlalu besar (maksimal ${Math.round(MAKS_BERKAS / 1048576)} MB).`);
      const buf = await f.arrayBuffer();
      const r = await bacaDocxSoal(buf);
      let butir = r.butir; const peringatan = [...r.peringatan];
      if (fk) {
        const k = await bacaDocxSoal(await fk.arrayBuffer());
        const g = gabungKunci(butir, k.butir);
        butir = g.butir; peringatan.push(`Naskah kunci: ${g.terpakai} butir dilengkapi kuncinya.`);
        if (g.tidakCocok.length) peringatan.push(`Kalimat soal tidak sama dengan naskah kunci pada ${g.tidakCocok.join(', ')}; kunci tidak dipakai di sana.`);
        const lama = peringatan.findIndex((x) => /^Tidak ada tanda kunci|butir .*belum punya kunci/.test(x)); if (lama >= 0 && butir.every((b) => (b.bagian === 'a' ? b.kunci : true))) peringatan.splice(lama, 1);
      }
      if (!butir.length) throw new Error(peringatan[0] || 'Tidak ada butir soal terbaca.');
      const asliMuat = f.size <= MAKS_ASLI;
      setHasil({ ...r, butir: lengkapiKisiDraf(butir).map((b) => ({ ...b, kisiSumber: 'draf' })), peringatan: asliMuat ? peringatan : [...peringatan, `Berkas ${(f.size / 1048576).toFixed(1)} MB melebihi batas penyimpanan naskah asli (${(MAKS_ASLI / 1048576).toFixed(1)} MB): teks soal tetap disimpan, salinan aslinya tidak.`], berkas: { nama: f.name, ukuran: f.size, sha256: await sha256(buf), ...(asliMuat ? { isi: byteKeBase64(buf) } : {}) } });
    } catch (e) { setErr({ code: 'FILE', message: e && e.message ? e.message : 'Berkas tidak bisa dibaca.' }); } finally { setBaca(false); }
  };
  const selesai = () => { setHasil(null); if (inputNaskah.current) inputNaskah.current.value = ''; if (inputKunci.current) inputKunci.current.value = ''; muat(); };

  return (
    <div className="space-y-5">
      <Section title="Unggah naskah Word (format Dauri)" icon={FileUp}>
        <div className="space-y-3">
          <p className="text-sm text-mute">Untuk naskah yang disusun di luar aplikasi dan sudah diverifikasi editor. Aplikasi membaca format yang sama dengan hasil Export Dauri: judul <span lang="ar">الدور</span>, bagian <span lang="ar">أ ب ج</span>, nomor <code>1-</code>, opsi <span lang="ar">(أ- ب- ج-)</span>, kunci/jawaban berwarna merah, dan <span lang="ar">ص</span> untuk halaman kitab. Isi soal Arab/Pegon/Latin disalin apa adanya.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="lx-file">Naskah (.docx)</Label><input id="lx-file" ref={inputNaskah} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="field" /></div>
            <div><Label htmlFor="lx-kunci" hint="(opsional, bila kunci ada di berkas lain)">Naskah kunci (.docx)</Label><input id="lx-kunci" ref={inputKunci} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="field" /></div>
          </div>
          <Btn kind="primary" onClick={proses} disabled={baca}>{baca ? <Loader2 size={16} className="spin" /> : <FileUp size={16} />}Baca naskah</Btn>
          {err && <ErrorBox e={err} />}
        </div>
      </Section>

      {hasil && <Pratinjau hasil={hasil} canSave={canReview} onSelesai={selesai} toast={toast} />}

      <Section title={`Bank Soal Manual${daftar ? ` (${daftar.length})` : ''}`} icon={Library}>
        {errDaftar && <ErrorBox e={errDaftar} />}
        {!daftar && !errDaftar && <Spin>Memuat daftar…</Spin>}
        {daftar && daftar.length === 0 && <p className="text-sm text-mute">Belum ada naskah. Unggah naskah Word di atas untuk mengisi bank ini.</p>}
        {daftar && daftar.length > 0 && <ul className="space-y-3">{daftar.map((p) => <KartuPaket key={p.id} p={p} me={me} isAdmin={isAdmin} muat={muat} toast={toast} />)}</ul>}
      </Section>
    </div>
  );
}
