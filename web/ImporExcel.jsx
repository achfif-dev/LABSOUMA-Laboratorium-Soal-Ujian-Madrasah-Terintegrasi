import React, { useState, useRef } from 'react';
import { FileSpreadsheet, Download, Upload, Loader2, AlertTriangle } from 'lucide-react';
import { buatTemplate, ekspor, bacaExcel, gabungkan } from './lib/excelConfig.js';

// Impor/ekspor konfigurasi lewat Excel. Hasil impor hanya dimasukkan ke editor (belum disimpan); admin memeriksa lalu menekan Simpan.
// `Btn` dan `unduh` dioper dari App.jsx supaya berkas ini tidak bergantung padanya (menghindari impor melingkar).
export default function ImporExcel({ Btn, unduh, konfigurasi, onTerapkan, toast }) {
  const [busy, setBusy] = useState('');
  const [hasil, setHasil] = useState(null); // { nama, galat, peringatan, bagian, lembarDibaca }
  const [mode, setMode] = useState('gabung');
  const [err, setErr] = useState('');
  const input = useRef(null);
  const tgl = () => new Date().toISOString().slice(0, 10);

  const unduhTemplate = async () => {
    setBusy('template'); setErr('');
    try { unduh('template-konfigurasi-labsouma.xlsx', await buatTemplate()); } catch { setErr('Gagal membuat template. Muat ulang halaman lalu coba lagi.'); } finally { setBusy(''); }
  };
  const unduhSaatIni = async () => {
    setBusy('ekspor'); setErr('');
    try { unduh(`konfigurasi-labsouma-${tgl()}.xlsx`, await ekspor(konfigurasi())); } catch { setErr('Gagal membuat berkas Excel. Muat ulang halaman lalu coba lagi.'); } finally { setBusy(''); }
  };
  const pilih = async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    setBusy('baca'); setErr(''); setHasil(null);
    try { setHasil({ nama: f.name, ...(await bacaExcel(f)) }); } catch { setErr('Berkas tidak bisa diproses.'); } finally { setBusy(''); }
  };

  const pratinjau = hasil && !hasil.galat.length ? gabungkan(konfigurasi(), hasil.bagian, mode) : null;
  const terapkan = () => {
    if (!pratinjau) return;
    if (mode === 'ganti' && !window.confirm('Daftar yang ada di lembar-lembar itu akan DIGANTI seluruhnya oleh isi Excel. Item yang tidak ada di Excel hilang dari editor (belum disimpan; versi lama tetap ada di Riwayat setelah Simpan). Lanjutkan?')) return;
    onTerapkan(pratinjau.config);
    toast('Isi Excel dimasukkan ke editor. Periksa, lalu tekan Simpan konfigurasi agar berlaku.');
    setHasil(null);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-mute">
        Isi tingkat, kelas, sistem ujian, mapel, kitab, dan penempatan sekaligus lewat Excel. Unduh <b>template</b> (ada petunjuk dan contoh) atau <b>konfigurasi saat ini</b> untuk disunting, lalu impor kembali. Hasil impor belum disimpan sampai Anda menekan Simpan.
      </p>
      <div className="flex flex-wrap gap-2">
        <Btn kind="soft" onClick={unduhTemplate} disabled={!!busy}>{busy === 'template' ? <Loader2 size={16} className="spin" /> : <Download size={16} />}Unduh template</Btn>
        <Btn kind="ghost" onClick={unduhSaatIni} disabled={!!busy}>{busy === 'ekspor' ? <Loader2 size={16} className="spin" /> : <FileSpreadsheet size={16} />}Unduh konfigurasi saat ini (.xlsx)</Btn>
        <Btn kind="primary" onClick={() => input.current && input.current.click()} disabled={!!busy}>{busy === 'baca' ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}Impor dari Excel</Btn>
        <input ref={input} type="file" className="hidden" aria-label="Pilih berkas Excel konfigurasi" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={pilih} />
      </div>
      {err && <p role="alert" className="text-sm font-semibold text-bad">{err}</p>}

      {hasil && (
        <div className="space-y-3 rounded-xl border border-line bg-bg p-3 text-sm">
          <p className="font-semibold text-soft-ink">{hasil.nama}{hasil.lembarDibaca.length ? <span className="font-normal text-mute"> · lembar terbaca: {hasil.lembarDibaca.join(', ')}</span> : null}</p>
          {hasil.galat.length > 0 && (
            <div role="alert" className="rounded-lg bg-bad-bg p-3 text-bad">
              <p className="flex items-center gap-2 font-bold"><AlertTriangle size={16} />Perbaiki dulu di Excel ({hasil.galat.length} masalah)</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">{hasil.galat.slice(0, 30).map((g, i) => <li key={i}>{g}</li>)}</ul>
              {hasil.galat.length > 30 && <p className="mt-1 text-xs">… dan {hasil.galat.length - 30} lainnya.</p>}
            </div>
          )}
          {pratinjau && (
            <>
              <fieldset className="space-y-1">
                <legend className="text-xs font-bold uppercase tracking-wide text-soft-ink">Cara memasukkan</legend>
                <label className="flex items-start gap-2 text-sm"><input type="radio" name="mode-impor" className="mt-1" checked={mode === 'gabung'} onChange={() => setMode('gabung')} /><span><b>Tambah &amp; perbarui</b> (aman): nama yang sama diperbarui, yang baru ditambahkan, sisanya dibiarkan.</span></label>
                <label className="flex items-start gap-2 text-sm"><input type="radio" name="mode-impor" className="mt-1" checked={mode === 'ganti'} onChange={() => setMode('ganti')} /><span><b>Ganti seluruh daftar</b>: daftar pada lembar yang ada di Excel menggantikan daftar sekarang.</span></label>
              </fieldset>
              <ul className="list-disc space-y-1 pl-5 text-xs text-soft-ink">{pratinjau.ringkasan.map((r, i) => <li key={i}>{r}</li>)}</ul>
              {(hasil.peringatan.length + pratinjau.peringatan.length) > 0 && (
                <div className="rounded-lg bg-warn-bg p-3 text-warn">
                  <p className="font-bold">Perlu diperhatikan</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">{[...hasil.peringatan, ...pratinjau.peringatan].slice(0, 30).map((w, i) => <li key={i}>{w}</li>)}</ul>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Btn kind="primary" onClick={terapkan}>Masukkan ke editor</Btn>
                <Btn kind="ghost" onClick={() => setHasil(null)}>Batal</Btn>
              </div>
            </>
          )}
          {!pratinjau && <Btn kind="ghost" onClick={() => setHasil(null)}>Tutup</Btn>}
        </div>
      )}
    </div>
  );
}
