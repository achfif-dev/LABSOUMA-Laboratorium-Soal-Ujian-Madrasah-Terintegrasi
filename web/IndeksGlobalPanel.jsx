import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

// Panel admin: membangun indeks pencarian LINTAS KITAB (src/kitabGlobal.js). Tanya Kitab memakai indeks ini untuk menunjuk kitab yang paling memuat kata kunci pertanyaan
// dari seluruh perpustakaan. Kitab yang belum masuk indeks tetap ikut dicari dengan cara lain, jadi indeks boleh dibangun kapan saja dan bertahap.
// `Btn`, `ErrorBox`, `callApi`, `apiErr` dioper dari App.jsx (menghindari impor melingkar).
const MAKS_PUTARAN = 60;
const MAKS_MACET = 3;

export default function IndeksGlobalPanel({ Btn, ErrorBox, callApi, apiErr, toast }) {
  const [st, setSt] = useState(null);
  const [err, setErr] = useState(null);
  const [jalan, setJalan] = useState(false);
  const [catatan, setCatatan] = useState('');
  const henti = useRef(false);
  const galat = (e) => setErr(apiErr ? apiErr(e) : e);

  const muat = async () => { try { setErr(null); setSt(await callApi('/api/kitab', { aksi: 'impor-indeks-global' })); } catch (e) { galat(e); } };
  useEffect(() => { muat(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const bangun = async () => {
    setJalan(true); setErr(null); setCatatan(''); henti.current = false;
    try {
      let putaran = 0; let macet = 0; let tandaLalu = '';
      for (;;) {
        const r = await callApi('/api/kitab', { aksi: 'impor-indeks-global', bangun: true });
        setSt(r);
        if (r.sibuk) { setCatatan('Pembangunan lain sedang berjalan. Coba lagi sebentar lagi.'); break; }
        if (r.selesai) { if (toast) toast('Indeks pencarian lintas kitab selesai.'); break; }
        const tanda = JSON.stringify([r.terindeks, r.menunggu, r.sapuan]);
        macet = tanda === tandaLalu ? macet + 1 : 0; tandaLalu = tanda;
        if (macet >= MAKS_MACET) { setCatatan('Kemajuan terhenti. Tekan lagi nanti; kitab yang menunggu sedang menyiapkan indeks per kitabnya.'); break; }
        if (henti.current) { setCatatan('Dihentikan. Kemajuan tersimpan; tekan lagi untuk melanjutkan.'); break; }
        if (++putaran >= MAKS_PUTARAN) { setCatatan('Putaran dibatasi. Tekan lagi untuk melanjutkan.'); break; }
      }
    } catch (e) { galat(e); } finally { setJalan(false); }
  };

  const lengkap = !!st && st.total > 0 && st.menunggu && st.menunggu.length === 0;
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <p className="mr-auto font-semibold">Indeks pencarian lintas kitab</p>
        {jalan
          ? <Btn kind="ghost" onClick={() => { henti.current = true; }}>Hentikan</Btn>
          : <Btn kind="soft" onClick={bangun} disabled={!st || lengkap || st.total === 0}>{st && st.ada ? 'Perbarui indeks' : 'Bangun indeks'}</Btn>}
      </div>
      {!st && !err && <p className="mt-1 flex items-center gap-2 text-mute"><Loader2 size={14} className="animate-spin" />Memuat status indeks</p>}
      {st && (
        <p className="mt-1 text-mute" aria-live="polite">
          {st.total === 0 ? 'Belum ada kitab aktif.' : `Terindeks ${st.terindeks} dari ${st.total} kitab aktif.`}
          {jalan && <span className="ml-1 inline-flex items-center gap-1"><Loader2 size={13} className="animate-spin" />Membangun{st.sapuan ? ` (${st.sapuan.selesai} dari ${st.sapuan.total} bagian)` : '...'}</span>}
        </p>
      )}
      {st && st.menunggu && st.menunggu.length > 0 && <p className="mt-1 text-xs text-mute">Belum masuk indeks: {st.menunggu.slice(0, 6).join(', ')}{st.menunggu.length > 6 ? `, dan ${st.menunggu.length - 6} lainnya` : ''}.</p>}
      {catatan && <p className="mt-1 text-xs text-warn">{catatan}</p>}
      {err && ErrorBox && <div className="mt-2"><ErrorBox e={err} /></div>}
      <details className="mt-1 text-xs text-mute"><summary className="font-semibold text-ink">Untuk apa indeks ini</summary>
        <p className="mt-1">Tanya Kitab memakainya untuk menunjuk kitab yang paling memuat kata kunci pertanyaan dari seluruh perpustakaan, bukan hanya kitab yang dipilih menurut bidang ilmunya. Bangun lagi setelah mengimpor kitab baru atau mengganti isi kitab. Kitab yang belum masuk indeks tetap ikut dicari. Aman diulang dan bertahap; satu sapuan memakai paling banyak sekitar 1.000 penulisan dari kuota 20.000 per hari.</p>
      </details>
    </div>
  );
}
