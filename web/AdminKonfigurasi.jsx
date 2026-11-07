// Tab admin Konfigurasi dan Pengaturan AI: dipisah dari App.jsx supaya baru dimuat saat admin membukanya (bukan saat aplikasi dibuka).
// Pembantu bersama (Btn, Section, dst.) diimpor dari ui.jsx, bukan App.jsx, jadi tidak ada impor melingkar.
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BookOpen, Check, ClipboardCheck, Download, FileSpreadsheet, Layers, Library, Loader2, RotateCcw, Save, Search, ShieldCheck, Trash2 } from 'lucide-react';
import * as AL from './lib/alurSoal.js';
import { Btn, Label, Section, ErrorBox, callApi, apiErr, simpanBerkas, useDraftSync, Uj, Draft } from './ui.jsx';

const ImporExcel = React.lazy(() => import('./ImporExcel.jsx'));

/* ---------- Pengaturan AI (admin): penyedia, model, kunci API ---------- */
const AI_PROV = { gemini: 'Google Gemini', anthropic: 'Anthropic Claude' };
function AiConfig({ toast }) {
  const [st, setSt] = useState(null);
  const [err, setErr] = useState(null);
  const [prov, setProv] = useState('gemini');
  const [models, setModels] = useState({ gemini: '', anthropic: '' });
  const [keys, setKeys] = useState({ gemini: '', anthropic: '' });
  const [busy, setBusy] = useState('');
  const [uji, setUji] = useState(null);
  // Pilihan provider dan model yang belum disimpan ikut dipulihkan. Kunci API sengaja TIDAK disimpan di browser: isi ulang bila perlu.
  const awalAi = useRef(undefined); if (awalAi.current === undefined) awalAi.current = Draft.read('aiConfig') || null;

  const terapkan = (d) => { setSt(d); setProv(d.aktif.provider); setModels({ ...d.models }); setKeys({ gemini: '', anthropic: '' }); };
  const muat = async () => {
    try {
      terapkan(await callApi('/api/ai-config', { aksi: 'status' })); setErr(null);
      const a = awalAi.current; awalAi.current = null;
      if (a && typeof a === 'object') {
        const m = a.models && typeof a.models === 'object' ? a.models : {};
        if (AI_PROV[a.prov]) setProv(a.prov);
        setModels((x) => ({ gemini: typeof m.gemini === 'string' ? m.gemini.slice(0, 120) : x.gemini, anthropic: typeof m.anthropic === 'string' ? m.anthropic.slice(0, 120) : x.anthropic }));
        toast('Pilihan provider/model yang belum disimpan dipulihkan. Kunci API tidak ikut dipulihkan, isi ulang bila perlu.');
      }
    } catch (e) { setErr(apiErr(e)); }
  };
  useEffect(() => { muat(); }, []);
  useEffect(() => {
    if (!st) return; // tunggu status server terbaca; sebelum itu draf lama belum boleh dihapus
    const beda = prov !== st.aktif.provider || ['gemini', 'anthropic'].some((k) => (models[k] || '') !== (st.models[k] || ''));
    if (beda) Draft.save('aiConfig', { prov, models }); else Draft.remove('aiConfig');
  }, [st, prov, models]);

  const simpan = async () => {
    setBusy('simpan'); setErr(null); setUji(null);
    try {
      const kirim = {};
      for (const k of Object.keys(AI_PROV)) if (keys[k].trim()) kirim[k] = keys[k].trim();
      terapkan(await callApi('/api/ai-config', { aksi: 'simpan', provider: prov, models, keys: kirim }));
      toast('Pengaturan AI disimpan.');
    } catch (e) { setErr(apiErr(e)); } finally { setBusy(''); }
  };
  const hapusKunci = async (k) => {
    if (!window.confirm(`Hapus kunci ${AI_PROV[k]} yang tersimpan? Aplikasi akan memakai kunci dari environment variable bila ada.`)) return;
    setBusy('hapus'); setErr(null);
    try { terapkan(await callApi('/api/ai-config', { aksi: 'simpan', hapus: [k] })); toast('Kunci dihapus.'); }
    catch (e) { setErr(apiErr(e)); } finally { setBusy(''); }
  };
  const ujiAi = async () => {
    setBusy('uji'); setErr(null); setUji(null);
    try {
      const kirim = {};
      for (const k of Object.keys(AI_PROV)) if (keys[k].trim()) kirim[k] = keys[k].trim();
      const berubah = Object.keys(kirim).length > 0 || prov !== st.aktif.provider || ['gemini', 'anthropic'].some((k) => (models[k] || '') !== (st.models[k] || ''));
      // Ada isian yang belum disimpan: uji isian itu (tidak disimpan oleh server). Jika tidak, uji pengaturan tersimpan.
      setUji(await callApi('/api/ai-config', { aksi: 'uji', ...(berubah ? { draft: { provider: prov, models, keys: kirim } } : {}) }));
    } catch (e) { setErr(apiErr(e)); } finally { setBusy(''); }
  };

  if (!st) return err ? <ErrorBox e={err} /> : <div className="flex justify-center py-16 text-mute"><Loader2 className="spin" /></div>;
  const dirty = Object.values(keys).some((v) => v.trim()) || prov !== st.aktif.provider || ['gemini', 'anthropic'].some((k) => (models[k] || '') !== (st.models[k] || ''));
  return (
    <div className="fade-in space-y-4">
      <div className="rounded-2xl border border-line bg-surface p-4 text-sm text-mute">
        Aktif sekarang: <b className="text-ink">{AI_PROV[st.aktif.provider]}</b>, model <b className="text-ink">{st.aktif.model}</b>,
        kunci dari <b className="text-ink">{st.aktif.sumberKunci === 'konfigurasi' ? 'menu ini' : st.aktif.sumberKunci === 'environment' ? 'environment variable' : 'belum ada'}</b>.
        {st.aktif.peringatan && <p className="mt-2 font-semibold text-warn">{st.aktif.peringatan}</p>}
        {st.enkripsi && st.enkripsi.sumber === 'turunan' && <p className="mt-2 text-xs leading-relaxed text-mute">Kunci enkripsi masih diturunkan dari kunci akun layanan Firebase, jadi bila akun layanan bocor, kunci AI ikut terbuka. Isi <code>CONFIG_ENCRYPTION_KEY</code> di Vercel (lihat README), redeploy, lalu masukkan ulang kunci AI.</p>}
        <p className="mt-2">Kunci disimpan terenkripsi di server dan <b className="text-ink">tidak pernah ditampilkan lagi</b>; hanya 4 karakter terakhir yang terlihat. Perubahan berlaku dalam sekitar satu menit.</p>
      </div>

      <fieldset className="rounded-2xl border border-line bg-surface p-4">
        <legend className="px-1 text-xs font-bold uppercase tracking-wide text-mute">Penyedia AI yang dipakai</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {Object.entries(AI_PROV).map(([k, v]) => (
            <label key={k} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${prov === k ? 'border-brand bg-soft text-soft-ink' : 'border-line'}`}>
              <input type="radio" name="aiprov" checked={prov === k} onChange={() => setProv(k)} />{v}
            </label>
          ))}
        </div>
      </fieldset>

      {Object.entries(AI_PROV).map(([k, nama]) => {
        const kk = st.kunci[k];
        return (
          <div key={k} className="space-y-3 rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold">{nama}{prov === k && <span className="ml-2 rounded-full bg-ok-bg px-2 py-px text-xs text-ok">dipakai</span>}</h3>
              <span className="text-xs text-mute">
                {kk.tersimpan ? `Tersimpan ••••${kk.last4}${kk.diubahOleh ? ` · oleh ${kk.diubahOleh}` : ''}` : kk.envAda ? 'Memakai environment variable' : 'Belum ada kunci'}
              </span>
            </div>
            <div><Label htmlFor={'key-' + k} hint={kk.tersimpan ? '(kosongkan bila tidak diganti)' : ''}>Kunci API</Label>
              <input id={'key-' + k} type="password" autoComplete="off" spellCheck={false} className="field" placeholder={kk.tersimpan ? `••••${kk.last4}` : 'Tempel kunci di sini'}
                value={keys[k]} onChange={(e) => setKeys((x) => ({ ...x, [k]: e.target.value }))} /></div>
            <div><Label htmlFor={'model-' + k} hint="(kosongkan untuk bawaan)">Model</Label>
              <input id={'model-' + k} className="field" placeholder={st.modelBawaan[k]} value={models[k] || ''} onChange={(e) => setModels((x) => ({ ...x, [k]: e.target.value }))} />
              {((st.modelPilihan && st.modelPilihan[k]) || []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {st.modelPilihan[k].map((m) => (
                    <button key={m.id} type="button" title={m.catatan} onClick={() => setModels((x) => ({ ...x, [k]: m.id }))}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${(models[k] || st.modelBawaan[k]) === m.id ? 'border-brand bg-soft text-soft-ink' : 'border-line text-mute'}`}>{m.label}</button>
                  ))}
                </div>
              )}
              {(() => { const pm = ((st.modelPilihan && st.modelPilihan[k]) || []).find((x) => x.id === (models[k] || st.modelBawaan[k])); return pm && pm.peringatan ? <p className="mt-1 text-xs leading-relaxed text-mute">{pm.peringatan}</p> : null; })()}
            </div>
            {kk.tersimpan && <Btn kind="danger" onClick={() => hapusKunci(k)} disabled={!!busy}><Trash2 size={14} />Hapus kunci tersimpan</Btn>}
          </div>
        );
      })}

      {err && <ErrorBox e={err} />}
      {uji && (
        <div className="space-y-1 rounded-lg bg-ok-bg px-3 py-2 text-sm text-ok">
          <p className="font-semibold">Berhasil: {AI_PROV[uji.provider]}, model {uji.model}, respons {uji.ms} ms.</p>
          {uji.draf && <p>Yang diuji adalah isian di layar yang belum disimpan. Tekan Simpan agar berlaku untuk semua pengguna.</p>}
          {(uji.catatan || []).map((c) => <p key={c} className="text-warn">{c}</p>)}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Btn kind="primary" onClick={simpan} disabled={!!busy || !dirty}>{busy === 'simpan' ? <Loader2 size={16} className="spin" /> : <Save size={16} />}Simpan</Btn>
        <Btn kind="soft" onClick={ujiAi} disabled={!!busy}>{busy === 'uji' ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}{dirty ? 'Uji isian ini (belum disimpan)' : 'Uji koneksi AI'}</Btn>
      </div>
      <p className="text-xs text-mute">Uji koneksi memakai satu permintaan dari kuota AI Anda dan boleh dijalankan sebelum menyimpan: kunci dan model yang baru diketik diuji tanpa disimpan. Bila gagal, pesan galat menyebut penyebabnya (kunci, model, kuota, atau jaringan). Kuota gratis Gemini berlaku per proyek Google, bukan per kunci: kunci kedua dari proyek yang sama tidak menambah kuota.</p>
      <RiwayatCfg jenis="ai" versi={st} dirty={dirty} onRestored={terapkan} toast={toast} />
    </div>
  );
}

/* ---------- Cadangan dan riwayat konfigurasi (admin): kembalikan ke setelan buatan madrasah, bukan bawaan aplikasi ---------- */
const ALASAN_RIWAYAT = { 'sebelum-simpan': 'Sebelum disimpan', 'sebelum-reset': 'Sebelum "kembali ke bawaan"', 'sebelum-pulih': 'Sebelum pemulihan', titik: 'Titik pulih' };
const tglWaktu = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }); };
const barisPerubahan = (jenis, p) => {
  if (!p) return [];
  if (p.sama) return ['Sama persis dengan yang berlaku sekarang.'];
  const out = [];
  if (jenis === 'app') {
    for (const [k, nama] of [['tingkat', 'Tingkat'], ['mapel', 'Mata pelajaran'], ['kitab', 'Kitab']]) {
      const x = p[k]; const daftar = (a, n) => a.join(', ') + (n > a.length ? ` … (+${n - a.length})` : '');
      if (x.jumlah.kembali) out.push(`${nama} yang akan muncul lagi (${x.jumlah.kembali}): ${daftar(x.kembali, x.jumlah.kembali)}`);
      if (x.jumlah.hilang) out.push(`${nama} yang akan DIHAPUS karena tidak ada di cadangan (${x.jumlah.hilang}): ${daftar(x.hilang, x.jumlah.hilang)}`);
      if (x.jumlah.beda) out.push(`${nama} yang isinya kembali ke versi cadangan (${x.jumlah.beda}): ${daftar(x.beda, x.jumlah.beda)}`);
    }
    if (p.sistemUjianBeda) out.push('Sistem ujian kembali ke versi cadangan.');
  } else {
    if (p.providerBeda) out.push(`Penyedia AI: ${p.provider.sekarang || '(dari environment)'} menjadi ${p.provider.cadangan || '(dari environment)'}`);
    for (const m of p.model) out.push(`Model ${m.provider}: "${m.sekarang || 'bawaan'}" menjadi "${m.cadangan || 'bawaan'}"`);
  }
  return out;
};
function RiwayatCfg({ jenis, versi, dirty, onRestored, toast }) {
  const label = jenis === 'app' ? 'konfigurasi' : 'pengaturan AI';
  const [list, setList] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState('');
  const [nama, setNama] = useState('');
  const [lihat, setLihat] = useState(null);
  const muat = async () => {
    try { const r = await callApi('/api/config-backup', { aksi: 'daftar', jenis }); setList(r.riwayat); setErr(null); }
    catch (e) { setErr(apiErr(e)); setList((x) => x || []); }
  };
  useEffect(() => { muat(); }, [versi]); // versi berubah (disimpan, dikembalikan ke bawaan, atau dipulihkan): daftar riwayat ikut disegarkan
  const jalan = async (kunci, fn) => { setBusy(kunci); setErr(null); try { await fn(); } catch (e) { setErr(apiErr(e)); } finally { setBusy(''); } };
  const tandai = () => jalan('titik', async () => {
    await callApi('/api/config-backup', { aksi: 'titik', jenis, nama });
    setNama(''); toast(`Titik pulih disimpan dari ${label} yang tersimpan di server.`); await muat();
  });
  const bukaLihat = (r) => {
    if (lihat && lihat.id === r.id) { setLihat(null); return; }
    jalan('lihat-' + r.id, async () => { setLihat({ id: r.id, ...(await callApi('/api/config-backup', { aksi: 'lihat', jenis, id: r.id })) }); });
  };
  const pulihkan = (r) => {
    const judul = r.tipe === 'titik' ? `titik pulih "${r.nama}"` : `cadangan ${tglWaktu(r.dibuatAt)}`;
    if (!window.confirm(`Pulihkan ${label} ke ${judul}?\n\nKeadaan yang berlaku sekarang disimpan dulu sebagai cadangan, jadi pemulihan ini masih bisa dibatalkan.${dirty ? '\n\nPerubahan di layar yang belum disimpan akan dibuang.' : ''}${jenis === 'ai' ? '\n\nKunci API tidak ikut berubah (kunci tidak pernah dicadangkan).' : ''}`)) return;
    jalan('pulih-' + r.id, async () => { onRestored(await callApi('/api/config-backup', { aksi: 'pulihkan', jenis, id: r.id })); setLihat(null); toast(`${label[0].toUpperCase() + label.slice(1)} dipulihkan.`); });
  };
  const hapus = (r) => {
    if (!window.confirm(`Hapus titik pulih "${r.nama}"? Ini tidak bisa dibatalkan.`)) return;
    jalan('hapus-' + r.id, async () => { await callApi('/api/config-backup', { aksi: 'hapus', jenis, id: r.id }); if (lihat && lihat.id === r.id) setLihat(null); toast('Titik pulih dihapus.'); await muat(); });
  };
  const titik = (list || []).filter((r) => r.tipe === 'titik'); const otomatis = (list || []).filter((r) => r.tipe !== 'titik');
  const ringkasan = (r) => (jenis === 'app'
    ? `${r.ringkas.tingkat} tingkat, ${r.ringkas.mapel} mapel, ${r.ringkas.kitab} kitab${r.ringkas.penempatan ? `, ${r.ringkas.penempatan} pemetaan kelas` : ''}`
    : `${r.ringkas.provider || 'penyedia dari environment'}${Object.entries(r.ringkas.models || {}).map(([k, v]) => ` · ${k}: ${v}`).join('')}`);
  const baris = (r) => (
    <li key={r.id} className="space-y-2 rounded-xl border border-line bg-bg p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold">{r.tipe === 'titik' ? r.nama : (ALASAN_RIWAYAT[r.alasan] || 'Cadangan otomatis')}</p>
          <p className="text-xs text-mute">Dicadangkan {tglWaktu(r.dibuatAt)}{r.dibuatOleh ? ` oleh ${r.dibuatOleh}` : ''}</p>
          {r.sumberAt && <p className="text-xs text-mute">Isinya disimpan {tglWaktu(r.sumberAt)}{r.sumberOleh ? ` oleh ${r.sumberOleh}` : ''}</p>}
          <p className="mt-1 text-xs text-soft-ink">{ringkasan(r)}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => bukaLihat(r)} disabled={!!busy}>{busy === 'lihat-' + r.id ? <Loader2 size={14} className="spin" /> : null}{lihat && lihat.id === r.id ? 'Tutup' : 'Lihat perubahan'}</Btn>
          <Btn kind="soft" className="!px-3 !py-1.5 !text-xs" onClick={() => pulihkan(r)} disabled={!!busy}>{busy === 'pulih-' + r.id ? <Loader2 size={14} className="spin" /> : <RotateCcw size={14} />}Pulihkan</Btn>
          {r.tipe === 'titik' && <button type="button" aria-label={'Hapus titik pulih ' + r.nama} className="rounded-lg p-2 text-bad hover:bg-bad-bg disabled:opacity-30" disabled={!!busy} onClick={() => hapus(r)}><Trash2 size={15} /></button>}
        </div>
      </div>
      {lihat && lihat.id === r.id && (
        <div className="rounded-lg bg-soft p-2.5 text-xs leading-relaxed text-soft-ink">
          <p className="font-semibold">Bila dipulihkan, dibandingkan dengan yang berlaku sekarang:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">{barisPerubahan(jenis, lihat.perubahan).map((b, i) => <li key={i} className="break-words">{b}</li>)}</ul>
          {!lihat.dapatDipulihkan && <p className="mt-1 font-semibold text-bad">Cadangan ini tidak lagi lolos pemeriksaan dan tidak bisa dipulihkan: {lihat.alasanTolak}</p>}
        </div>
      )}
    </li>
  );
  return (
    <Section title="Cadangan & Riwayat" lipat icon={ShieldCheck} action={<Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={muat} disabled={!!busy}>Muat ulang daftar</Btn>}>
      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-mute">
          Setiap kali {label} disimpan, dikembalikan ke bawaan, atau dipulihkan, keadaan <b>sebelumnya</b> otomatis dicadangkan (disimpan maksimal 30 terakhir). Bila terjadi salah ubah atau salah hapus, pulihkan dari sini: yang kembali adalah setelan buatan madrasah, bukan bawaan aplikasi.
          {jenis === 'ai' && ' Kunci API tidak pernah ikut dicadangkan; bila terhapus, tempel ulang kuncinya.'}
        </p>
        <div className="rounded-xl border border-dashed border-line p-3">
          <Label htmlFor={'titik-' + jenis} hint="(dari yang tersimpan di server sekarang; tidak ikut terhapus otomatis)">Tandai setelan yang sudah benar sebagai titik pulih</Label>
          <div className="flex flex-wrap gap-2">
            <input id={'titik-' + jenis} className="field min-w-[200px] flex-1" maxLength={80} placeholder="mis. Setelan awal tahun ajaran 2026/2027" value={nama} onChange={(e) => setNama(e.target.value)} />
            <Btn kind="primary" onClick={tandai} disabled={!!busy || !nama.trim()}>{busy === 'titik' ? <Loader2 size={16} className="spin" /> : <Save size={16} />}Simpan titik pulih</Btn>
          </div>
          {dirty && <p className="mt-1 text-xs text-warn">Ada perubahan di layar yang belum disimpan; yang ditandai adalah versi yang sudah tersimpan di server.</p>}
        </div>
        {err && <ErrorBox e={err} />}
        {!list ? <div className="flex justify-center py-6 text-mute"><Loader2 className="spin" /></div> : (
          <>
            <div><h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-mute">Titik pulih ({titik.length})</h3>
              {titik.length ? <ul className="space-y-2">{titik.map(baris)}</ul> : <p className="text-sm text-mute">Belum ada. Tandai setelan yang sudah benar agar mudah dikembalikan.</p>}
            </div>
            <div><h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-mute">Cadangan otomatis ({otomatis.length})</h3>
              {otomatis.length ? <ul className="space-y-2">{otomatis.map(baris)}</ul> : <p className="text-sm text-mute">Belum ada. Cadangan pertama dibuat saat {label} yang sudah tersimpan diubah.</p>}
            </div>
          </>
        )}
      </div>
    </Section>
  );
}

/* ---------- Konfigurasi aplikasi (admin): tingkatan, mata pelajaran, katalog kitab ---------- */
const rapikan = (n) => String(n || '').replace(/\s+/g, ' ').trim();
const TingkatChecks = ({ value, onChange, daftar }) => (
  <div className="flex flex-wrap gap-x-3 gap-y-1">
    {daftar.filter((t) => rapikan(t.nama)).map((t) => { const n = rapikan(t.nama); return (
      <label key={t._k} className="flex items-center gap-1 text-xs font-semibold">
        <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={value.includes(n)}
          onChange={(e) => onChange(daftar.map((x) => rapikan(x.nama)).filter((x) => x && (x === n ? e.target.checked : value.includes(x))))} />{t.singkat || t.label || n}
      </label>); })}
  </div>
);
const AktifCek = ({ checked, onChange }) => (
  <label className="flex items-center gap-1 text-xs font-semibold">
    <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />Aktif
  </label>
);
function AppCfgAdmin({ cfg, kustom, diubahAt, onSaved, toast }) {
  const seq = useRef(0);
  const bubuhId = (c) => ({
    sistemUjian: Uj.daftarSistem(c).map((x) => ({ ...x, periode: x.periode.map((p) => ({ ...p, _k: ++seq.current })), _k: ++seq.current })),
    tingkat: c.tingkat.map((t) => ({ ...t, labelArab: t.labelArab || '', kelasTeks: (t.kelas || []).join(', '), sistemUjian: t.sistemUjian || '', _k: ++seq.current })),
    mapel: c.mapel.map((m) => ({ ...m, _k: ++seq.current })),
    kitab: c.kitab.map((k) => ({ ...k, namaArab: k.namaArab || '', pengarangArab: k.pengarangArab || '', penempatan: (k.penempatan || []).map((x) => ({ ...x, periode: (x.periode || []).map((y) => ({ ...y })) })), _k: ++seq.current })),
  });
  // Draf konfigurasi yang belum disimpan dipulihkan setelah muat ulang. Bentuknya divalidasi ketat dan dibangun ulang dari daftar bidang yang dikenal.
  const sigCfg = (c) => JSON.stringify({ sistemUjian: c.sistemUjian || [], tingkat: c.tingkat, mapel: c.mapel, kitab: c.kitab });
  // Bandingkan konfigurasi tanpa bergantung pada urutan kunci objek (bentuk dari server dan bentuk hasil susun() bisa berbeda urutannya).
  const kanon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x));
  const normCfgDraft = (a) => {
    if (!a || typeof a !== 'object' || !a.d || !Array.isArray(a.d.tingkat) || !Array.isArray(a.d.mapel) || !Array.isArray(a.d.kitab)) return null;
    const S = (v) => (typeof v === 'string' ? v : ''); const B = (v) => v !== false; const A = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
    const o = (v) => (v && typeof v === 'object' ? v : {}); let maks = 0;
    const kunci = (x) => { const k = Number(o(x)._k); if (Number.isFinite(k) && k > 0) { maks = Math.max(maks, k); return k; } return ++maks; };
    const P = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object').map((x) => ({ tingkat: S(x.tingkat), kelas: S(x.kelas), periode: (Array.isArray(x.periode) ? x.periode : []).filter((y) => y && typeof y === 'object').map((y) => ({ kode: S(y.kode), cakupan: S(y.cakupan) })) })) : []);
    const SU = (v) => (Array.isArray(v) && v.length ? v.filter((x) => x && typeof x === 'object').map((x) => ({ id: S(x.id), label: S(x.label), ...(x.baru === true ? { baru: true } : {}), _k: kunci(x), periode: (Array.isArray(x.periode) ? x.periode : []).filter((y) => y && typeof y === 'object').map((y) => ({ kode: S(y.kode), label: S(y.label), ...(y.baru === true ? { baru: true } : {}), _k: kunci(y) })) })) : null);
    const d = {
      sistemUjian: SU(a.d.sistemUjian) || SU(Uj.daftarSistem(cfg)) || [],
      tingkat: a.d.tingkat.map((x) => ({ nama: S(o(x).nama), label: S(o(x).label), labelArab: S(o(x).labelArab), singkat: S(o(x).singkat), kelas: A(o(x).kelas), kelasTeks: S(o(x).kelasTeks), sistemUjian: S(o(x).sistemUjian), aktif: B(o(x).aktif), ...(o(x).baru === true ? { baru: true } : {}), _k: kunci(x) })),
      mapel: a.d.mapel.map((x) => ({ nama: S(o(x).nama), namaArab: S(o(x).namaArab), tingkat: A(o(x).tingkat), aktif: B(o(x).aktif), _k: kunci(x) })),
      kitab: a.d.kitab.map((x) => ({ nama: S(o(x).nama), namaArab: S(o(x).namaArab), pengarang: S(o(x).pengarang), pengarangArab: S(o(x).pengarangArab), mapel: S(o(x).mapel), tautan: S(o(x).tautan), tingkat: A(o(x).tingkat), penempatan: P(o(x).penempatan), aktif: B(o(x).aktif), _k: kunci(x) })),
    };
    return { d, massal: S(a.massal).slice(0, 200000), basi: a.baseSig !== sigCfg(cfg), maks };
  };
  const awalCfg = useRef(undefined); if (awalCfg.current === undefined) awalCfg.current = normCfgDraft(Draft.read('cfgDraft'));
  const [d, setD] = useState(() => { const a = awalCfg.current; if (a) { seq.current = a.maks; return a.d; } return bubuhId(cfg); });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState('');
  const [cari, setCari] = useState('');
  const [batas, setBatas] = useState(30);
  const [massal, setMassal] = useState(() => (awalCfg.current ? awalCfg.current.massal : ''));
  const [salinDari, setSalinDari] = useState({});
  const cfgPertama = useRef(true);
  useEffect(() => { if (cfgPertama.current) { cfgPertama.current = false; return; } setD(bubuhId(cfg)); setMassal(''); }, [cfg]); // konfigurasi berubah (disimpan/dipulihkan): mulai dari yang baru
  useEffect(() => {
    const a = awalCfg.current; if (!a) return;
    toast(a.basi ? 'Draf konfigurasi yang belum disimpan dipulihkan, tetapi konfigurasi di server berubah sejak draf dibuat. Periksa dulu sebelum menyimpan.' : 'Draf konfigurasi yang belum disimpan dipulihkan. Tekan Simpan agar berlaku.');
  }, []);

  // Bentuk yang dikirim ke server: tanpa penanda UI (_k, baru, kelasTeks); nama tingkat dirapikan agar cocok dengan rujukan di mapel/kitab.
  const kelasDari = (t) => t.kelasTeks.split(/[,،]/).map((x) => x.trim()).filter(Boolean);
  // Urutan yang sama dengan server (src/appConfig.js sanitizePenempatan): tingkat, lalu kelas, lalu periode menurut urutan di konfigurasi.
  const urutPen = (pen) => {
    const tn = d.tingkat.map((t) => rapikan(t.nama));
    const kelasT = (n) => { const t = d.tingkat.find((x) => rapikan(x.nama) === n); return t ? kelasDari(t) : []; };
    const kodeT = (n) => { const t = d.tingkat.find((x) => rapikan(x.nama) === n); const sis = t && (d.sistemUjian.find((y) => y.id === t.sistemUjian) || d.sistemUjian[0]); return sis ? sis.periode.map((y) => y.kode) : []; };
    return pen.map((x) => ({ ...x, tingkat: rapikan(x.tingkat), periode: [...(x.periode || [])].sort((a, b) => kodeT(rapikan(x.tingkat)).indexOf(a.kode) - kodeT(rapikan(x.tingkat)).indexOf(b.kode)) }))
      .sort((a, b) => tn.indexOf(a.tingkat) - tn.indexOf(b.tingkat) || kelasT(a.tingkat).indexOf(a.kelas) - kelasT(b.tingkat).indexOf(b.kelas));
  };
  const susun = () => ({
    sistemUjian: d.sistemUjian.map(({ _k, baru, periode, ...x }) => ({ ...x, label: rapikan(x.label), periode: periode.map(({ _k: _p, baru: _b, ...y }) => ({ ...y, label: rapikan(y.label) })) })),
    tingkat: d.tingkat.filter((t) => rapikan(t.nama)).map(({ _k, baru, kelasTeks, ...t }) => ({ ...t, nama: rapikan(t.nama), kelas: kelasDari({ kelasTeks }), sistemUjian: t.sistemUjian || (d.sistemUjian[0] || {}).id || '' })),
    mapel: d.mapel.map(({ _k, ...m }) => ({ ...m, tingkat: m.tingkat.map(rapikan) })),
    kitab: d.kitab.map(({ _k, ...k }) => ({ ...k, tingkat: k.tingkat.map(rapikan), penempatan: urutPen(k.penempatan || []) })),
  });
  const cur = susun(); // bentuk yang akan dikirim; juga dasar ringkasan penempatan dan peringatan rujukan yatim
  const dirty = kanon(cur) !== kanon({
    sistemUjian: Uj.daftarSistem(cfg),
    tingkat: cfg.tingkat.map((t) => ({ ...t, labelArab: t.labelArab || '', sistemUjian: t.sistemUjian || (Uj.daftarSistem(cfg)[0] || {}).id || '' })),
    mapel: cfg.mapel,
    kitab: cfg.kitab.map((k) => ({ ...k, namaArab: k.namaArab || '', pengarangArab: k.pengarangArab || '', penempatan: k.penempatan || [] })),
  });
  const cfgVal = useMemo(() => ({ d, massal, baseSig: sigCfg(cfg) }), [d, massal, cfg]);
  useDraftSync('cfgDraft', cfgVal, !dirty && !massal.trim());
  const namaTingkat = d.tingkat.map((t) => rapikan(t.nama)).filter(Boolean);
  const tanpaNama = d.tingkat.some((t) => !rapikan(t.nama));

  // Tingkat: mengubah kunci hanya mungkin untuk tingkat baru (belum disimpan); rujukan di mapel/kitab ikut diganti.
  const setT = (k, patch) => setD((x) => {
    const lama = x.tingkat.find((t) => t._k === k); if (!lama) return x;
    let { mapel, kitab } = x;
    if (patch.nama !== undefined && rapikan(lama.nama)) {
      const ganti = (arr) => arr.map((n) => (n === rapikan(lama.nama) ? rapikan(patch.nama) : n));
      mapel = mapel.map((m) => ({ ...m, tingkat: ganti(m.tingkat) }));
      kitab = kitab.map((b) => ({ ...b, tingkat: ganti(b.tingkat), penempatan: (b.penempatan || []).map((p) => (p.tingkat === rapikan(lama.nama) ? { ...p, tingkat: rapikan(patch.nama) } : p)) }));
    }
    // Ganti sistem ujian tingkat: kode periode lama tidak berlaku lagi, jadi pembagian periode kitab di tingkat ini dikosongkan (kelasnya tetap).
    if (patch.sistemUjian !== undefined && patch.sistemUjian !== lama.sistemUjian && rapikan(lama.nama)) {
      kitab = kitab.map((b) => ({ ...b, penempatan: (b.penempatan || []).map((p) => (p.tingkat === rapikan(lama.nama) ? { ...p, periode: [] } : p)) }));
    }
    return { ...x, mapel, kitab, tingkat: x.tingkat.map((t) => (t._k === k ? { ...t, ...patch } : t)) };
  });
  const tambahT = () => setD((x) => ({ ...x, tingkat: [...x.tingkat, { nama: '', label: '', labelArab: '', singkat: '', kelas: [], kelasTeks: '', sistemUjian: (x.sistemUjian[0] || {}).id || '', aktif: true, baru: true, _k: ++seq.current }] }));
  const geserT = (k, arah) => setD((x) => {
    const i = x.tingkat.findIndex((t) => t._k === k); const j = i + arah;
    if (i < 0 || j < 0 || j >= x.tingkat.length) return x;
    const t = [...x.tingkat]; [t[i], t[j]] = [t[j], t[i]]; return { ...x, tingkat: t };
  });
  const hapusT = (k) => {
    const t = d.tingkat.find((x) => x._k === k); if (!t) return;
    if (d.tingkat.length <= 1) { toast('Minimal satu tingkat harus ada.'); return; }
    if (!t.baru && !window.confirm(`Hapus tingkat "${t.label || t.nama}"? Soal lama dengan tingkat ini tetap tersimpan, tetapi tidak bisa difilter lagi. Menonaktifkan biasanya lebih aman.`)) return;
    const n = rapikan(t.nama);
    setD((x) => ({ ...x, tingkat: x.tingkat.filter((y) => y._k !== k), mapel: x.mapel.map((m) => ({ ...m, tingkat: m.tingkat.filter((y) => y !== n) })), kitab: x.kitab.map((b) => ({ ...b, tingkat: b.tingkat.filter((y) => y !== n), penempatan: (b.penempatan || []).filter((p) => p.tingkat !== n) })) }));
  };
  // Tingkat baru belum punya mapel/kitab: salin cakupan dari tingkat lain agar tidak mencentang satu per satu.
  const salinCakupan = (k) => {
    const t = d.tingkat.find((x) => x._k === k); const dari = salinDari[k]; const n = t && rapikan(t.nama);
    if (!n || !dari || dari === n) return;
    const tambah = (arr) => (arr.includes(dari) && !arr.includes(n) ? [...arr, n] : arr);
    setD((x) => ({ ...x, mapel: x.mapel.map((m) => ({ ...m, tingkat: tambah(m.tingkat) })), kitab: x.kitab.map((b) => ({ ...b, tingkat: tambah(b.tingkat) })) }));
    toast(`Mapel dan kitab milik ${dari} ditambahkan juga ke ${n}. Tekan Simpan agar berlaku.`);
  };

  // Sistem ujian. ID sistem dan kode periode dibuat otomatis dan tetap (dipakai soal); yang diubah admin adalah nama/label.
  const kodeBaru = (awal) => { const pakai = new Set([...d.sistemUjian.map((x) => x.id), ...d.sistemUjian.flatMap((x) => x.periode.map((y) => y.kode))]); let k; do { k = awal + Math.random().toString(36).slice(2, 8); } while (pakai.has(k)); return k; };
  const setS = (k, patch) => setD((x) => ({ ...x, sistemUjian: x.sistemUjian.map((y) => (y._k === k ? { ...y, ...patch } : y)) }));
  const tambahS = () => setD((x) => ({ ...x, sistemUjian: [...x.sistemUjian, { id: kodeBaru('s'), label: '', baru: true, _k: ++seq.current, periode: [{ kode: kodeBaru('p'), label: '', baru: true, _k: ++seq.current }] }] }));
  const hapusS = (k) => {
    const sis = d.sistemUjian.find((y) => y._k === k); if (!sis) return;
    if (d.sistemUjian.length <= 1) { toast('Minimal satu sistem ujian harus ada.'); return; }
    if (d.tingkat.some((t) => (t.sistemUjian || d.sistemUjian[0].id) === sis.id)) { toast('Sistem ujian ini masih dipakai tingkat. Pindahkan tingkatnya ke sistem lain dulu.'); return; }
    setD((x) => ({ ...x, sistemUjian: x.sistemUjian.filter((y) => y._k !== k) }));
  };
  const tambahP = (ks) => setD((x) => ({ ...x, sistemUjian: x.sistemUjian.map((y) => (y._k === ks && y.periode.length < 6 ? { ...y, periode: [...y.periode, { kode: kodeBaru('p'), label: '', baru: true, _k: ++seq.current }] } : y)) }));
  const setP = (ks, kp, patch) => setD((x) => ({ ...x, sistemUjian: x.sistemUjian.map((y) => (y._k === ks ? { ...y, periode: y.periode.map((z) => (z._k === kp ? { ...z, ...patch } : z)) } : y)) }));
  const geserP = (ks, kp, arah) => setD((x) => ({ ...x, sistemUjian: x.sistemUjian.map((y) => {
    if (y._k !== ks) return y;
    const i = y.periode.findIndex((z) => z._k === kp); const j = i + arah; if (i < 0 || j < 0 || j >= y.periode.length) return y;
    const l = [...y.periode]; [l[i], l[j]] = [l[j], l[i]]; return { ...y, periode: l };
  }) }));
  const hapusP = (ks, kp) => {
    const sis = d.sistemUjian.find((y) => y._k === ks); const per = sis && sis.periode.find((z) => z._k === kp); if (!per) return;
    if (sis.periode.length <= 1) { toast('Satu sistem ujian minimal punya satu periode.'); return; }
    if (!per.baru && !window.confirm(`Hapus periode \"${per.label || per.kode}\"? Pemetaan kitab ke periode ini ikut dibuang. Soal lama tetap menyimpan periodenya, tetapi namanya tidak tampil lagi. Mengganti nama biasanya lebih aman.`)) return;
    setD((x) => ({ ...x, sistemUjian: x.sistemUjian.map((y) => (y._k === ks ? { ...y, periode: y.periode.filter((z) => z._k !== kp) } : y)),
      kitab: x.kitab.map((b) => ({ ...b, penempatan: (b.penempatan || []).map((p) => ({ ...p, periode: p.periode.filter((z) => z.kode !== per.kode) })) })) }));
  };
  // Penempatan kitab ke kelas dan periode. Kelas tanpa daftar periode = semua periode (bentuk lama); di sini kelas yang dicentang selalu memuat daftar periode eksplisit.
  const periodeTingkat = (t) => { const sis = d.sistemUjian.find((y) => y.id === t.sistemUjian) || d.sistemUjian[0]; return sis ? sis.periode : []; };
  const ubahPen = (kk, tn, fn) => setD((x) => ({ ...x, kitab: x.kitab.map((b) => (b._k === kk ? { ...b, penempatan: fn((b.penempatan || []).filter((p) => p.tingkat === tn)).concat((b.penempatan || []).filter((p) => p.tingkat !== tn)) } : b)) }));
  const semuaPeriode = (t) => periodeTingkat(t).map((y) => ({ kode: y.kode, cakupan: '' }));
  const toggleKelas = (kk, t, kelas, on) => ubahPen(kk, rapikan(t.nama), (pet) => (on ? [...pet.filter((p) => p.kelas !== kelas), { tingkat: rapikan(t.nama), kelas, periode: semuaPeriode(t) }] : pet.filter((p) => p.kelas !== kelas)));
  const semuaKelas = (kk, t) => ubahPen(kk, rapikan(t.nama), (pet) => kelasDari(t).map((kls) => pet.find((p) => p.kelas === kls) || { tingkat: rapikan(t.nama), kelas: kls, periode: semuaPeriode(t) }));
  const kosongkanPen = (kk, t) => ubahPen(kk, rapikan(t.nama), () => []);
  const aktifPeriode = (p, kode) => p.periode.length === 0 || p.periode.some((y) => y.kode === kode);
  const togglePeriode = (kk, t, kelas, kode) => {
    const urut = periodeTingkat(t).map((y) => y.kode); let ditolak = false;
    ubahPen(kk, rapikan(t.nama), (pet) => pet.map((p) => {
      if (p.kelas !== kelas) return p;
      const dasar = p.periode.length ? p.periode : semuaPeriode(t);
      const ada = dasar.some((y) => y.kode === kode);
      const next = ada ? dasar.filter((y) => y.kode !== kode) : [...dasar, { kode, cakupan: '' }];
      if (!next.length) { ditolak = true; return p; }
      return { ...p, periode: next.sort((a, b) => urut.indexOf(a.kode) - urut.indexOf(b.kode)) };
    }));
    if (ditolak) toast('Minimal satu periode. Hapus centang kelas bila kitab tidak dipakai di kelas ini.');
  };
  const setCakupan = (kk, t, kelas, kode, v) => ubahPen(kk, rapikan(t.nama), (pet) => pet.map((p) => (p.kelas === kelas ? { ...p, periode: (p.periode.length ? p.periode : semuaPeriode(t)).map((y) => (y.kode === kode ? { ...y, cakupan: v } : y)) } : p)));
  const [bukaPeta, setBukaPeta] = useState({}); // kitab yang editor penempatannya sedang dibuka (dirender hanya bila dibuka, supaya katalog besar tetap ringan)

  const setM = (k, patch) => setD((x) => {
    const lama = x.mapel.find((m) => m._k === k);
    const ganti = patch.nama !== undefined && lama ? lama.nama : null; // mengganti nama mapel ikut mengubah kitab yang menunjuk ke nama lama
    return { ...x, mapel: x.mapel.map((m) => (m._k === k ? { ...m, ...patch } : m)), kitab: ganti === null ? x.kitab : x.kitab.map((b) => (b.mapel === ganti ? { ...b, mapel: patch.nama } : b)) };
  });
  const hapusM = (k) => setD((x) => ({ ...x, mapel: x.mapel.filter((m) => m._k !== k) }));
  const tambahM = () => setD((x) => ({ ...x, mapel: [...x.mapel, { nama: '', namaArab: '', tingkat: [...namaTingkat], aktif: true, _k: ++seq.current }] }));
  const setK = (k, patch) => setD((x) => ({ ...x, kitab: x.kitab.map((b) => (b._k === k ? { ...b, ...patch } : b)) }));
  const hapusK = (k) => setD((x) => ({ ...x, kitab: x.kitab.filter((b) => b._k !== k) }));
  const kitabBaru = (o = {}) => ({ nama: '', namaArab: '', pengarang: '', pengarangArab: '', mapel: '', tautan: '', tingkat: [...namaTingkat], penempatan: [], aktif: true, _k: ++seq.current, ...o });
  const tambahK = () => { setCari(''); setD((x) => ({ ...x, kitab: [kitabBaru({ mapel: (x.mapel[0] || {}).nama || '' }), ...x.kitab] })); };
  const tambahMassal = () => {
    const ada = new Set(d.kitab.map((b) => b.nama.toLowerCase())); let baru = 0; let lewat = 0; const isi = [];
    for (const baris of massal.split('\n')) {
      const [nama = '', pengarang = '', mapel = '', tautan = '', namaArab = '', pengarangArab = ''] = baris.split('|').map((x) => x.trim());
      if (!nama) continue;
      if (ada.has(nama.toLowerCase())) { lewat++; continue; }
      ada.add(nama.toLowerCase()); baru++;
      isi.push(kitabBaru({ nama, pengarang, mapel, tautan, namaArab, pengarangArab }));
    }
    setD((x) => ({ ...x, kitab: [...isi, ...x.kitab] })); setMassal('');
    toast(`${baru} kitab ditambahkan${lewat ? `, ${lewat} dilewati (nama sudah ada)` : ''}. Tekan Simpan agar berlaku.`);
  };

  const simpan = async () => {
    if (tanpaNama) { setErr({ message: 'Ada tingkat baru yang belum diberi kunci (nama). Isi atau hapus dulu.' }); return; }
    setBusy('simpan'); setErr(null);
    try { const r = await callApi('/api/app-config', { aksi: 'simpan', config: susun(), basisAt: diubahAt || null }); onSaved(r); toast('Konfigurasi disimpan. Versi sebelumnya masuk ke Riwayat.'); }
    catch (e) { setErr(apiErr(e)); } finally { setBusy(''); }
  };
  const pulihkan = async () => {
    if (!window.confirm('Kembalikan ke BAWAAN APLIKASI?\n\nIni BUKAN urungkan: tingkatan, kelas, sistem ujian, mapel, kitab, dan pemetaan kelas buatan madrasah diganti daftar bawaan aplikasi.\n\nSalinan keadaan sekarang tetap disimpan di bagian Cadangan & Riwayat di bawah dan bisa dipulihkan dari sana. Soal yang sudah tersimpan tidak terpengaruh.')) return;
    setBusy('reset'); setErr(null);
    try { const r = await callApi('/api/app-config', { aksi: 'reset' }); onSaved(r); toast('Konfigurasi dikembalikan ke bawaan aplikasi. Setelan sebelumnya ada di Cadangan & Riwayat.'); }
    catch (e) { setErr(apiErr(e)); } finally { setBusy(''); }
  };

  const unduhCfg = () => simpanBerkas(`konfigurasi-labsouma-${new Date().toISOString().slice(0, 10)}.json`, new Blob([JSON.stringify({ konfigurasi: cfg }, null, 2)], { type: 'application/json' }));

  const q = cari.trim().toLowerCase();
  const kitabTampil = d.kitab.filter((b) => !q || b.nama.toLowerCase().includes(q) || (b.namaArab || '').includes(cari.trim()) || (b.pengarang || '').toLowerCase().includes(q) || (b.mapel || '').toLowerCase().includes(q));
  const namaMapel = [...new Set(d.mapel.map((m) => m.nama).filter(Boolean))];

  return (
    <div className="fade-in space-y-5">
      <div className="rounded-2xl border border-line bg-surface p-4 text-sm leading-relaxed text-mute">
        Atur pilihan yang muncul di form penyusunan soal dan filter. {kustom ? 'Sedang memakai pengaturan Anda.' : 'Sedang memakai daftar bawaan aplikasi.'}
        <details className="mt-2"><summary className="font-semibold text-ink">Petunjuk pengaturan (ketuk untuk membuka)</summary><ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
          <li>Tingkatan bisa ditambah, diurutkan, dinonaktifkan, atau dihapus. <b>Kunci</b> tingkat dipakai pada setiap soal, jadi tidak bisa diubah setelah disimpan; yang bisa diubah kapan saja adalah label, singkatan, label Arab, dan kelas.</li>
          <li>Tingkat baru belum punya mapel dan kitab: pakai tombol <b>Salin mapel &amp; kitab dari…</b> atau centang per mapel/kitab di bawah.</li>
          <li>Mengganti nama mapel tidak mengubah soal lama. Soal lama tetap muncul di filter dengan nama lamanya.</li>
          <li><b>Kelas</b> adalah turunan tingkat. Kelas dipakai di form soal (tersimpan pada soal), filter, dan pemetaan kitab. Mengganti nama kelas memutus pemetaan kitab lama ke kelas itu; pemetaannya perlu diatur ulang.</li>
          <li><b>Sistem ujian</b>: tiap tingkat memakai satu sistem (bawaan: Semester 4 ujian dan Catur Wulan 3 ujian). Nama sistem dan nama tiap ujian bebas diubah, ditambah, atau diurutkan ulang. Soal menyimpan kode periodenya, jadi mengganti nama tidak memutus soal lama.</li>
          <li><b>Pemetaan kitab</b>: pada tiap kitab, buka <i>Kelas &amp; ujian</i> untuk menentukan kitab itu dipakai di kelas dan periode ujian mana. Kitab tanpa pemetaan berlaku untuk semua kelas dan periode di tingkatnya.</li>
          <li>Nama Arab kitab dan pengarang tampil di pilihan kitab, daftar soal, dan ekspor (DOCX/CSV). Tulis dengan huruf Arab; harakat boleh.</li>
          <li>Daftar kitab dan nama Arab bawaan adalah usulan. Periksa bersama ustadz atau guru mapel.</li>
        </ul></details>
      </div>

      <Section title="Impor & Template Excel" icon={FileSpreadsheet} lipat>
        <ImporExcel Btn={Btn} unduh={simpanBerkas} konfigurasi={susun} toast={toast} onTerapkan={(c) => { setD(bubuhId(c)); setErr(null); }} />
      </Section>

      <Section title={`Tingkatan & Kelas (${d.tingkat.length})`} lipat icon={Layers} action={<Btn kind="soft" onClick={tambahT} disabled={d.tingkat.length >= 8}>Tambah tingkat</Btn>}>
        <div className="space-y-3">
          {d.tingkat.map((t, i) => (
            <div key={t._k} className="space-y-2 rounded-xl border border-line bg-bg p-3">
              <div className="grid gap-2 sm:grid-cols-12">
                <div className="sm:col-span-3">
                  <Label htmlFor={'tn-' + t._k} hint={t.baru ? '(tetap setelah disimpan)' : '(kunci, tetap)'}>Kunci</Label>
                  {t.baru
                    ? <input id={'tn-' + t._k} className="field" maxLength={40} placeholder="mis. Wustha" value={t.nama} onChange={(e) => setT(t._k, { nama: e.target.value })} />
                    : <p className="field !bg-soft font-semibold text-soft-ink">{t.nama}</p>}
                </div>
                <div className="sm:col-span-4"><Label htmlFor={'tl-' + t._k}>Label</Label><input id={'tl-' + t._k} className="field" maxLength={40} placeholder="Nama yang tampil" value={t.label} onChange={(e) => setT(t._k, { label: e.target.value })} /></div>
                <div className="sm:col-span-3"><Label htmlFor={'ta-' + t._k} hint="(Arab)">Label Arab</Label><input id={'ta-' + t._k} dir="rtl" lang="ar" className="field ar-input" maxLength={40} placeholder="المرحلة" value={t.labelArab} onChange={(e) => setT(t._k, { labelArab: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label htmlFor={'ts-' + t._k}>Singkatan</Label><input id={'ts-' + t._k} className="field" maxLength={10} value={t.singkat} onChange={(e) => setT(t._k, { singkat: e.target.value })} /></div>
                <div className="sm:col-span-8"><Label htmlFor={'tk-' + t._k} hint="(turunan tingkat, pisahkan koma; maks. 12)">Kelas</Label><input id={'tk-' + t._k} className="field" placeholder="mis. X, XI, XII" value={t.kelasTeks} onChange={(e) => setT(t._k, { kelasTeks: e.target.value })} /></div>
                <div className="sm:col-span-4"><Label htmlFor={'tu-' + t._k}>Sistem ujian</Label>
                  <select id={'tu-' + t._k} className="field" value={t.sistemUjian || (d.sistemUjian[0] || {}).id || ''} onChange={(e) => { setT(t._k, { sistemUjian: e.target.value }); if (!t.baru) toast('Sistem ujian diganti: pembagian periode kitab di tingkat ini dikosongkan (pemetaan kelas tetap). Tekan Simpan agar berlaku.'); }}>
                    {d.sistemUjian.map((y) => <option key={y._k} value={y.id}>{y.label || '(sistem baru)'} · {y.periode.length} ujian</option>)}
                  </select></div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <AktifCek checked={t.aktif} onChange={(v) => setT(t._k, { aktif: v })} />
                <div className="flex items-center gap-1">
                  <select aria-label={'Salin cakupan ke ' + (t.nama || 'tingkat baru')} className="field !w-auto !py-1 text-xs" value={salinDari[t._k] || ''} onChange={(e) => setSalinDari((x) => ({ ...x, [t._k]: e.target.value }))}>
                    <option value="">Salin mapel &amp; kitab dari…</option>
                    {namaTingkat.filter((n) => n !== rapikan(t.nama)).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <Btn kind="soft" className="!px-3 !py-1.5 !text-xs" onClick={() => salinCakupan(t._k)} disabled={!rapikan(t.nama) || !salinDari[t._k]}>Salin</Btn>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <button type="button" aria-label="Naikkan urutan" className="rounded-lg px-2 py-1 text-sm font-bold hover:bg-soft disabled:opacity-30" disabled={i === 0} onClick={() => geserT(t._k, -1)}>↑</button>
                  <button type="button" aria-label="Turunkan urutan" className="rounded-lg px-2 py-1 text-sm font-bold hover:bg-soft disabled:opacity-30" disabled={i === d.tingkat.length - 1} onClick={() => geserT(t._k, 1)}>↓</button>
                  <button type="button" aria-label={'Hapus ' + (t.label || t.nama || 'tingkat')} className="rounded-lg p-2 text-bad hover:bg-bad-bg" onClick={() => hapusT(t._k)}><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title={`Sistem Ujian (${d.sistemUjian.length})`} lipat icon={ClipboardCheck} action={<Btn kind="soft" onClick={tambahS} disabled={d.sistemUjian.length >= 4}>Tambah sistem</Btn>}>
        <div className="space-y-3">
          {d.sistemUjian.map((sis) => {
            const dipakai = d.tingkat.filter((t) => rapikan(t.nama) && (t.sistemUjian || d.sistemUjian[0].id) === sis.id).map((t) => t.singkat || t.label || t.nama);
            return (
              <div key={sis._k} className="space-y-2 rounded-xl border border-line bg-bg p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[200px] flex-1"><Label htmlFor={'su-' + sis._k} hint="(mis. Semester, Catur Wulan)">Nama sistem</Label><input id={'su-' + sis._k} className="field" maxLength={40} placeholder="Nama sistem ujian" value={sis.label} onChange={(e) => setS(sis._k, { label: e.target.value })} /></div>
                  <p className="pb-2 text-xs text-mute">{dipakai.length ? `Dipakai: ${dipakai.join(', ')}` : 'Belum dipakai tingkat mana pun'}</p>
                  <button type="button" aria-label={'Hapus sistem ' + (sis.label || 'ujian')} className="rounded-lg p-2 text-bad hover:bg-bad-bg disabled:opacity-30" disabled={d.sistemUjian.length <= 1} onClick={() => hapusS(sis._k)}><Trash2 size={16} /></button>
                </div>
                <ol className="space-y-1.5">
                  {sis.periode.map((per, i) => (
                    <li key={per._k} className="flex items-center gap-2">
                      <span className="w-6 text-right text-xs font-semibold text-mute">{i + 1}.</span>
                      <input aria-label={`Nama ujian ke-${i + 1} sistem ${sis.label || 'baru'}`} className="field min-w-0 flex-1" maxLength={60} placeholder="mis. UTS Semester 1 (Ganjil)" value={per.label} onChange={(e) => setP(sis._k, per._k, { label: e.target.value })} />
                      <button type="button" aria-label="Naikkan urutan" className="rounded-lg px-2 py-1 text-sm font-bold hover:bg-soft disabled:opacity-30" disabled={i === 0} onClick={() => geserP(sis._k, per._k, -1)}>↑</button>
                      <button type="button" aria-label="Turunkan urutan" className="rounded-lg px-2 py-1 text-sm font-bold hover:bg-soft disabled:opacity-30" disabled={i === sis.periode.length - 1} onClick={() => geserP(sis._k, per._k, 1)}>↓</button>
                      <button type="button" aria-label={'Hapus ' + (per.label || 'periode')} className="rounded-lg p-2 text-bad hover:bg-bad-bg" onClick={() => hapusP(sis._k, per._k)}><Trash2 size={16} /></button>
                    </li>
                  ))}
                </ol>
                <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => tambahP(sis._k)} disabled={sis.periode.length >= 6}>Tambah ujian ({sis.periode.length}/6)</Btn>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title={`Mata Pelajaran (${d.mapel.length})`} lipat icon={BookOpen} action={<Btn kind="soft" onClick={tambahM}>Tambah mapel</Btn>}>
        <div className="space-y-2">
          {d.mapel.map((m) => (
            <div key={m._k} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-bg p-3">
              <input aria-label="Nama mata pelajaran" className="field min-w-[160px] flex-1" maxLength={60} placeholder="Nama mata pelajaran" value={m.nama} onChange={(e) => setM(m._k, { nama: e.target.value })} />
              <input aria-label={'Nama Arab ' + (m.nama || 'mapel')} dir="rtl" lang="ar" className="field ar-input min-w-[120px] flex-1" maxLength={60} placeholder="الاسم بالعربية (mis. فقه)" value={m.namaArab || ''} onChange={(e) => setM(m._k, { namaArab: e.target.value })} />
              <TingkatChecks daftar={d.tingkat} value={m.tingkat} onChange={(v) => setM(m._k, { tingkat: v })} />
              <AktifCek checked={m.aktif} onChange={(v) => setM(m._k, { aktif: v })} />
              <button type="button" aria-label={'Hapus ' + (m.nama || 'mapel')} className="rounded-lg p-2 text-bad hover:bg-bad-bg" onClick={() => hapusM(m._k)}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </Section>

      <Section title={`Katalog Kitab (${d.kitab.length})`} lipat icon={Library} action={<Btn kind="soft" onClick={tambahK}>Tambah kitab</Btn>}>
        <div className="space-y-3">
          <input aria-label="Cari kitab" className="field" placeholder="Cari nama kitab (Latin atau Arab), pengarang, atau mapel…" value={cari} onChange={(e) => { setCari(e.target.value); setBatas(30); }} />
          <div className="space-y-2">
            {kitabTampil.slice(0, batas).map((b) => (
              <div key={b._k} className="space-y-2 rounded-xl border border-line bg-bg p-3">
                <div className="grid gap-2 sm:grid-cols-12">
                  <input aria-label="Nama kitab" className="field sm:col-span-6" maxLength={120} placeholder="Nama kitab (Latin)" value={b.nama} onChange={(e) => setK(b._k, { nama: e.target.value })} />
                  <input aria-label="Nama kitab dalam huruf Arab" dir="rtl" lang="ar" className="field ar-input sm:col-span-6" maxLength={120} placeholder="اسم الكتاب" value={b.namaArab || ''} onChange={(e) => setK(b._k, { namaArab: e.target.value })} />
                  <input aria-label="Pengarang" className="field sm:col-span-6" maxLength={100} placeholder="Pengarang (opsional)" value={b.pengarang || ''} onChange={(e) => setK(b._k, { pengarang: e.target.value })} />
                  <input aria-label="Pengarang dalam huruf Arab" dir="rtl" lang="ar" className="field ar-input sm:col-span-6" maxLength={100} placeholder="اسم المؤلف" value={b.pengarangArab || ''} onChange={(e) => setK(b._k, { pengarangArab: e.target.value })} />
                  <input aria-label="Tautan kitab" type="text" inputMode="url" autoCapitalize="none" spellCheck={false} className="field sm:col-span-9" maxLength={300} placeholder="Tautan kitab (opsional), mis. https://shamela.ws/book/823" value={b.tautan || ''} onChange={(e) => setK(b._k, { tautan: e.target.value })} />
                  <select aria-label="Mata pelajaran kitab" className="field sm:col-span-3" value={b.mapel || ''} onChange={(e) => setK(b._k, { mapel: e.target.value })}>
                    <option value="">(tanpa mapel)</option>
                    {[...new Set([...namaMapel, b.mapel].filter(Boolean))].map((n) => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <TingkatChecks daftar={d.tingkat} value={b.tingkat} onChange={(v) => setK(b._k, { tingkat: v })} />
                  <AktifCek checked={b.aktif} onChange={(v) => setK(b._k, { aktif: v })} />
                  <button type="button" aria-label={'Hapus ' + (b.nama || 'kitab')} className="ml-auto rounded-lg p-2 text-bad hover:bg-bad-bg" onClick={() => hapusK(b._k)}><Trash2 size={16} /></button>
                </div>
                <div className="rounded-lg bg-soft p-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-0.5 text-xs text-soft-ink">
                      <p className="font-semibold">Kelas &amp; ujian</p>
                      {Uj.ringkasPenempatan(cur, b).map((r, i) => <p key={i} className="break-words">{r}</p>)}
                      {Uj.penempatanYatim(cur, b).length > 0 && <p className="font-semibold text-warn">{Uj.penempatanYatim(cur, b).length} pemetaan merujuk kelas atau ujian yang sudah tidak ada; akan dibuang saat disimpan.</p>}
                    </div>
                    <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => setBukaPeta((x) => ({ ...x, [b._k]: !x[b._k] }))} disabled={!b.tingkat.length}>{bukaPeta[b._k] ? 'Tutup' : 'Atur kelas & ujian'}</Btn>
                  </div>
                  {bukaPeta[b._k] && (
                    <div className="mt-3 space-y-3">
                      {d.tingkat.filter((t) => rapikan(t.nama) && b.tingkat.includes(rapikan(t.nama))).map((t) => {
                        const n = rapikan(t.nama); const kls = kelasDari(t); const per = periodeTingkat(t); const pet = (b.penempatan || []).filter((p) => p.tingkat === n);
                        return (
                          <div key={t._k} className="space-y-2 rounded-lg border border-line bg-surface p-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xs font-bold">{t.label || t.nama}</p>
                              <Btn kind="ghost" className="!px-2 !py-1 !text-xs" onClick={() => semuaKelas(b._k, t)} disabled={!kls.length}>Centang semua kelas</Btn>
                              <Btn kind="ghost" className="!px-2 !py-1 !text-xs" onClick={() => kosongkanPen(b._k, t)} disabled={!pet.length}>Kosongkan (berlaku semua)</Btn>
                            </div>
                            {!kls.length && <p className="text-xs text-mute">Tingkat ini belum punya kelas. Isi kolom Kelas pada Tingkatan di atas.</p>}
                            {!pet.length && kls.length > 0 && <p className="text-xs text-mute">Belum ada kelas dicentang: kitab berlaku untuk semua kelas dan ujian tingkat ini.</p>}
                            {kls.map((k) => {
                              const p = pet.find((x) => x.kelas === k); const terisi = p ? p.periode.filter((y) => y.cakupan).length : 0;
                              return (
                                <div key={k} className="space-y-1.5 border-t border-line pt-2 first:border-t-0 first:pt-0">
                                  <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={!!p} onChange={(e) => toggleKelas(b._k, t, k, e.target.checked)} />Kelas {k}</label>
                                  {p && (
                                    <div className="space-y-1.5 pl-6">
                                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                                        {per.map((y) => (
                                          <label key={y.kode} className="flex items-center gap-1 text-xs"><input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={aktifPeriode(p, y.kode)} onChange={() => togglePeriode(b._k, t, k, y.kode)} />{y.label || '(tanpa nama)'}</label>
                                        ))}
                                      </div>
                                      <details>
                                        <summary className="cursor-pointer text-xs font-semibold text-soft-ink">Cakupan materi per ujian (opsional){terisi ? ` · ${terisi} terisi` : ''}</summary>
                                        <div className="mt-1.5 space-y-1.5">
                                          {per.filter((y) => aktifPeriode(p, y.kode)).map((y) => (
                                            <div key={y.kode} className="flex flex-wrap items-center gap-2">
                                              <span className="w-full text-xs text-mute sm:w-56">{y.label || '(tanpa nama)'}</span>
                                              <input aria-label={`Cakupan ${b.nama || 'kitab'} kelas ${k} ${y.label}`} className="field min-w-0 flex-1 !py-1.5" maxLength={120} placeholder="mis. Kitab Thaharah, bab wudhu sampai tayammum" value={((p.periode.find((z) => z.kode === y.kode) || {}).cakupan) || ''} onChange={(e) => setCakupan(b._k, t, k, y.kode, e.target.value)} />
                                            </div>
                                          ))}
                                        </div>
                                      </details>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {!kitabTampil.length && <p className="text-sm text-mute">Tidak ada kitab yang cocok.</p>}
            {kitabTampil.length > batas && <Btn kind="ghost" className="w-full" onClick={() => setBatas((n) => n + 30)}>Tampilkan lebih banyak ({kitabTampil.length - batas} lagi)</Btn>}
          </div>
          <div className="space-y-2 rounded-xl border border-dashed border-line p-3">
            <Label htmlFor="massal" hint="(satu kitab per baris)">Tempel banyak kitab</Label>
            <textarea id="massal" rows={4} className="field" placeholder={'Nama | Pengarang | Mapel | Tautan | Nama Arab | Pengarang Arab (kolom 4-6 opsional)\nFathul Qarib | Ibnu Qasim al-Ghazzi | Fiqih | | فتح القريب المجيب | ابن قاسم الغزي'} value={massal} onChange={(e) => setMassal(e.target.value)} />
            <Btn kind="soft" onClick={tambahMassal} disabled={!massal.trim()}>Tambahkan ke daftar</Btn>
          </div>
        </div>
      </Section>

      {err && <ErrorBox e={err} />}
      <div className="flex flex-wrap gap-2">
        <Btn kind="primary" onClick={simpan} disabled={!!busy || !dirty}>{busy === 'simpan' ? <Loader2 size={16} className="spin" /> : <Save size={16} />}Simpan konfigurasi</Btn>
        <Btn kind="ghost" onClick={() => { setD(bubuhId(cfg)); setErr(null); }} disabled={!!busy || !dirty}>Batalkan perubahan</Btn>
        <Btn kind="danger" onClick={pulihkan} disabled={!!busy || !kustom}>{busy === 'reset' ? <Loader2 size={16} className="spin" /> : <RotateCcw size={16} />}Kembali ke bawaan aplikasi</Btn>
        <Btn kind="ghost" onClick={unduhCfg} disabled={!kustom}><Download size={16} />Unduh konfigurasi (.json)</Btn>
      </div>

      <RiwayatCfg jenis="app" versi={diubahAt || null} dirty={dirty} onRestored={onSaved} toast={toast} />
    </div>
  );
}

/* ---------- Tahap editor: penugasan per akun (Pengguna) dan pengaturan alur (Konfigurasi), keduanya khusus admin ---------- */
function AlurEditorAdmin({ alur, mapel, onSaved, toast }) {
  const [d, setD] = useState(alur);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setD(alur); }, [alur]);
  const kanon = (a) => { const n = AL.normalisasiAlur(a); return JSON.stringify([n.aktif, n.standar, Object.entries(n.perMapel).sort(([x], [y]) => (x < y ? -1 : 1))]); };
  const dirty = kanon(d) !== kanon(alur);
  const namaMapel = mapel.filter((m) => m.aktif !== false).map((m) => m.nama);
  const setMapel = (nama, v) => setD((x) => { const p = { ...x.perMapel }; if (!v) delete p[nama]; else p[nama] = Number(v); return { ...x, perMapel: p }; });
  const simpan = async () => {
    setBusy(true);
    try { const r = await callApi('/api/app-config', { aksi: 'alursimpan', alur: AL.normalisasiAlur(d) }); onSaved(AL.normalisasiAlur(r.alur)); toast('Pengaturan alur editor disimpan.'); }
    catch (e) { const er = apiErr(e); toast(er && er.message ? er.message : 'Gagal menyimpan pengaturan alur editor.'); }
    finally { setBusy(false); }
  };
  return (
    <section className="space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-5" aria-label="Alur editor bertahap">
      <div>
        <h2 className="text-base font-bold">Alur Editor Bertahap</h2>
        <p className="mt-1 text-xs leading-relaxed text-mute">Nonaktif: satu editor mana pun menyetujui soal (seperti sebelumnya). Aktif: jumlah tahap (1 sampai 3) diatur per mata pelajaran. Tiap tahap dikerjakan editor berbeda yang Anda tugaskan di menu Pengguna.
          Alur: penyusun, editor 1, revisi ke penyusun, editor 2, revisi, editor 3. Setelah revisi tahap terakhir, soal kembali ke editor terakhir untuk disetujui. Editor boleh juga meloloskan tanpa revisi.</p>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="h-5 w-5" checked={d.aktif} onChange={(e) => setD({ ...d, aktif: e.target.checked })} />Aktifkan peninjauan bertahap
      </label>
      {d.aktif && (
        <div className="space-y-3">
          <div className="max-w-xs"><Label htmlFor="alur-standar">Jumlah tahap standar</Label>
            <select id="alur-standar" className="field" value={d.standar} onChange={(e) => setD({ ...d, standar: Number(e.target.value) })}>
              {[1, 2, 3].map((n) => <option key={n} value={n}>{n} editor</option>)}
            </select></div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-mute">Per mata pelajaran (fan)</p>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {namaMapel.map((nama) => (
                <li key={nama} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <span className="text-sm font-medium">{nama}</span>
                  <select aria-label={'Jumlah tahap ' + nama} className="field !w-auto" value={Object.hasOwn(d.perMapel, nama) ? String(d.perMapel[nama]) : ''} onChange={(e) => setMapel(nama, e.target.value)}>
                    <option value="">Ikuti standar ({d.standar})</option>{[1, 2, 3].map((n) => <option key={n} value={String(n)}>{n} editor</option>)}
                  </select>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Btn kind="primary" disabled={!dirty || busy} onClick={simpan}>{busy ? <Loader2 size={16} className="spin" /> : <Check size={16} />}Simpan Alur Editor</Btn>
        {dirty && <Btn kind="ghost" disabled={busy} onClick={() => setD(alur)}>Batalkan</Btn>}
        {dirty && <span className="text-xs text-warn">Ada perubahan yang belum disimpan.</span>}
      </div>
    </section>
  );
}

/* ---------- Pemeliharaan data (admin): riwayat versi soal yang soalnya sudah dihapus ---------- */
function PemeliharaanAdmin({ toast }) {
  const [hasil, setHasil] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pangkas, setPangkas] = useState(null);
  const [simpan, setSimpan] = useState('10');
  const jalan = async (hapus) => {
    if (hapus && !window.confirm(`Hapus ${hasil.riwayatYatim} riwayat versi dari ${hasil.soalYatim} soal yang sudah dihapus? Tidak bisa dibatalkan.`)) return;
    setBusy(true);
    try {
      const r = await callApi('/api/backup', { aksi: 'bersihriwayat', hapus });
      setHasil(hapus ? { ...r, riwayatYatim: 0, soalYatim: 0 } : r);
      toast(hapus ? `${r.dihapus} riwayat yatim dihapus.` : (r.riwayatYatim ? `Ditemukan ${r.riwayatYatim} riwayat yatim.` : 'Tidak ada riwayat yatim.'));
    } catch (e) { const er = apiErr(e); toast(er && er.message ? er.message : 'Gagal memindai riwayat.'); }
    finally { setBusy(false); }
  };
  const jalanPangkas = async (hapus) => {
    const n = Number(simpan);
    if (hapus && !window.confirm(`Hapus ${pangkas.riwayatKelebihan} riwayat versi paling lama dari ${pangkas.soalDipangkas} soal? Tiap soal menyimpan ${pangkas.simpan} versi terbaru. Tidak bisa dibatalkan.`)) return;
    setBusy(true);
    try {
      const r = await callApi('/api/backup', { aksi: 'pangkasriwayat', simpan: n, hapus });
      setPangkas(hapus ? { ...r, riwayatKelebihan: 0, soalDipangkas: 0 } : r);
      toast(hapus ? `${r.dihapus} riwayat lama dihapus.` : (r.riwayatKelebihan ? `${r.riwayatKelebihan} riwayat melebihi batas.` : 'Tidak ada riwayat yang perlu dipangkas.'));
    } catch (e) { const er = apiErr(e); toast(er && er.message ? er.message : 'Gagal memindai riwayat.'); }
    finally { setBusy(false); }
  };
  return (
    <section className="space-y-3 rounded-2xl border border-line bg-surface p-4 sm:p-5" aria-label="Pemeliharaan data">
      <div>
        <h2 className="text-base font-bold">Pemeliharaan Data</h2>
        <p className="mt-1 text-xs leading-relaxed text-mute">Menghapus soal tidak otomatis menghapus riwayat versinya. Pindai mencari riwayat milik soal yang sudah tidak ada. Setiap pindai membaca seluruh riwayat (memakai kuota baca Firestore), jadi cukup sesekali.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Btn kind="ghost" disabled={busy} onClick={() => jalan(false)}>{busy ? <Loader2 size={16} className="spin" /> : <Search size={16} />}Pindai riwayat yatim</Btn>
        {hasil && hasil.riwayatYatim > 0 && <Btn kind="danger" disabled={busy} onClick={() => jalan(true)}><Trash2 size={16} />Hapus {hasil.riwayatYatim} riwayat yatim</Btn>}
      </div>
      {hasil && <p className="text-xs text-mute">Total riwayat: {hasil.riwayatTotal}. Yatim: {hasil.riwayatYatim}{hasil.terpotong ? '. Pindai dibatasi 20.000 dokumen; ulangi setelah menghapus.' : '.'}</p>}
      <div className="space-y-2 border-t border-line pt-3">
        <p className="text-xs leading-relaxed text-mute">Riwayat versi ikut diindeks dan membengkak tiap soal disunting. Pangkas menyisakan hanya versi terbaru per soal (3–50). Setiap pindai membaca seluruh riwayat, jadi cukup sesekali.</p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-mute">Simpan terbaru
            <input type="number" min="3" max="50" value={simpan} onChange={(e) => setSimpan(e.target.value)} className="w-16 rounded-lg border border-line bg-surface px-2 py-1 text-sm text-ink" /> versi
          </label>
          <Btn kind="ghost" disabled={busy} onClick={() => jalanPangkas(false)}>{busy ? <Loader2 size={16} className="spin" /> : <Search size={16} />}Pindai riwayat berlebih</Btn>
          {pangkas && pangkas.riwayatKelebihan > 0 && <Btn kind="danger" disabled={busy} onClick={() => jalanPangkas(true)}><Trash2 size={16} />Hapus {pangkas.riwayatKelebihan} riwayat lama</Btn>}
        </div>
        {pangkas && <p className="text-xs text-mute">Total riwayat: {pangkas.riwayatTotal}. Melebihi batas: {pangkas.riwayatKelebihan}{pangkas.terpotong ? '. Pindai dibatasi 20.000 dokumen; ulangi setelah menghapus.' : '.'}</p>}
      </div>
    </section>
  );
}

export { AiConfig, AppCfgAdmin, AlurEditorAdmin, PemeliharaanAdmin };
