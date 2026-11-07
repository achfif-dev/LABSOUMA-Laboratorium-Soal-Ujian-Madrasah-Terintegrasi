import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Loader2, RefreshCw, Eye, EyeOff, AlertTriangle, Check } from 'lucide-react';
import { bacaDokumenKitab, bolehVirtual, FORMAT_LABEL } from './lib/dokumenKitab.js';
import { bukaSimpananOcr, kunciBerkas } from './lib/simpananOcr.js';
import { slugKitab, isianAwal, peringatanPratinjau, peringatanDuplikat, isianSiap, jalankanImpor, PILIHAN_BAHASA, nilaiBahasa, bahasaDariNilai } from './lib/imporKitab.js';
import { tampilanTeks, bahasaKitab, LABEL_BAHASA } from './lib/bahasa.js';
import { STATUS_OTORITAS, LABEL_STATUS, AKIDAH, LABEL_AKIDAH, MAKS_CATATAN, normalOtoritas } from './lib/otoritas.js';

// Impor perpustakaan kitab/buku dari banyak sumber (Arab maupun berhuruf Latin, mis. Indonesia/Jawa/Inggris; Pegon/Jawi tampil kanan ke kiri): .txt/.docx ekspor Syamilah, .docx/.txt/.html/.epub dengan penanda halaman, PDF berlapis teks, JSON halaman,
// atau berkas tanpa penanda sama sekali (halaman dibagi otomatis dan ditandai virtual). Admin saja. Berkas diparse di perangkat; yang dikirim ke server hanya
// halaman hasil parse (bukan berkas mentah). `Btn`, `ErrorBox`, `callApi`, `apiErr` dioper dari App.jsx (menghindari impor melingkar).
const STATUS = { siap: 'Siap', mengimpor: 'Belum selesai' };
const HAK = { 'belum-dicek': 'Hak cipta: belum dicek', 'domain-publik': 'Domain publik', izin: 'Berizin' };

// Jenis tulisan halaman untuk OCR AI: menentukan petunjuk yang diberikan ke AI dan pemeriksaan hasilnya.
function PilihAksaraOcr({ nilai, ubah }) {
  return (
    <label className="mt-2 flex flex-wrap items-center gap-2 text-xs">Jenis tulisan halaman:
      <select className="rounded-lg border border-line bg-surface px-2 py-1 text-sm text-ink" value={nilai} onChange={(e) => ubah(e.target.value)}>
        <option value="arab">Arab (kitab kuning)</option><option value="latin">Latin (Indonesia, Jawa, Sunda, Melayu, Inggris)</option><option value="pegon">Pegon / Jawi (aksara Arab, bahasa daerah)</option>
      </select>
    </label>
  );
}

export default function KitabImpor({ Btn, ErrorBox, callApi, apiErr, toast }) {
  const [daftar, setDaftar] = useState(null);
  const [errDaftar, setErrDaftar] = useState(null);
  const [berkas, setBerkas] = useState('');
  const [hasil, setHasil] = useState(null);
  const [errParse, setErrParse] = useState('');
  const [isian, setIsian] = useState(null);
  const [idManual, setIdManual] = useState(false);
  const [progres, setProgres] = useState(null);
  const [errImpor, setErrImpor] = useState(null);
  const batalRef = useRef(false);
  const berkasRef = useRef(null);            // berkas terakhir dipilih, supaya bisa dibaca ulang (nomor awal diganti, atau mode halaman virtual)
  const [halAwal, setHalAwal] = useState('1');
  const [tawarVirtual, setTawarVirtual] = useState(false);
  const simpananRef = useRef(null); // titik simpan OCR berkas yang sedang diproses
  const [tawarHalamanWord, setTawarHalamanWord] = useState(0);   // jumlah pemisah halaman Word bila .docx tanpa penanda tetapi berhalaman
  const [membaca, setMembaca] = useState('');
  const [progresBaca, setProgresBaca] = useState(null);  // { tahap: 'teks' | 'ocr', n, total } selama PDF dibaca
  const [tawarOcr, setTawarOcr] = useState(null);        // jumlah halaman PDF tanpa teks bila seluruh PDF ternyata pindai
  const batalBacaRef = useRef(false);
  const [aksaraOcr, setAksaraOcr] = useState('arab');   // jenis tulisan halaman yang dibaca OCR: arab | latin | pegon
  const [urutLihat, setUrutLihat] = useState(1);   // halaman yang ditampilkan di pratinjau (urutan, bukan nomor cetak)
  const sibuk = !!progres && progres.tahap !== 'gagal';

  const muatDaftar = async () => {
    try { setDaftar((await callApi('/api/kitab', { aksi: 'impor-daftar' })).kitab); setErrDaftar(null); }
    catch (e) { setErrDaftar(apiErr(e)); }
  };
  useEffect(() => { muatDaftar(); }, []);

  const baca = async (f, { virtual = false, ocr = false, kolom = 'auto', halamanWord = false } = {}) => {
    setErrParse(''); setHasil(null); setIsian(null); setProgres(null); setErrImpor(null); setIdManual(false); setTawarVirtual(false); setTawarHalamanWord(0); setTawarOcr(null);
    batalBacaRef.current = false; setProgresBaca(null);
    setMembaca(/\.pdf$/i.test(f.name) ? 'Membaca PDF...' : 'Membaca berkas...');
    try {
      const n = parseInt(halAwal, 10);
      const simpanan = ocr ? await bukaSimpananOcr(kunciBerkas(f, aksaraOcr)) : null; // titik simpan OCR: tab mati atau kuota habis tidak menghanguskan halaman yang sudah terbaca
      simpananRef.current = simpanan;
      const h = await bacaDokumenKitab({
        nama: f.name, buffer: await f.arrayBuffer(), virtual, halamanWord, halAwal: Number.isInteger(n) ? n : 1,
        onProgres: setProgresBaca, batal: () => batalBacaRef.current, kolom,
        ocr: ocr ? { mode: 'perlu', simpanan, panggil: (gambar) => callApi('/api/kitab', { aksi: 'impor-ocr', gambar, aksara: aksaraOcr }) } : null, // OCR AI hanya atas permintaan admin: satu panggilan AI per halaman
      });
      setBerkas(f.name); setHasil(h); setIsian(isianAwal(h)); setUrutLihat(1);
    } catch (er) {
      setErrParse(er && er.message ? er.message : 'Berkas tidak bisa dibaca.'); setTawarVirtual(bolehVirtual(er)); setTawarHalamanWord(er && er.jedaHalaman >= 2 ? er.jedaHalaman + 1 : 0);
      setTawarOcr(er && er.kode === 'PDF_TANPA_TEKS' ? (er.halamanPerluOcr || 0) : null);
    }
    finally { setMembaca(''); setProgresBaca(null); }
  };
  const pilihBerkas = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    berkasRef.current = f; setBerkas(f.name);
    await baca(f);
  };

  const ubah = (p) => setIsian((s) => {
    const n = { ...s, ...p };
    if ('judulLatin' in p && !idManual) n.kitabId = slugKitab(p.judulLatin);
    return n;
  });

  const impor = async () => {
    batalRef.current = false; setErrImpor(null); setProgres({ tahap: 'mulai', tertulis: 0, total: hasil.halaman.length });
    try {
      const r = await jalankanImpor({ panggil: (b) => callApi('/api/kitab', b), hasil, isian, onProgres: setProgres, batal: () => batalRef.current });
      if (r.dibatalkan) { setProgres(null); toast(`Dibatalkan setelah ${r.tertulis} halaman. Pilih berkas yang sama lagi dan centang "lanjutkan" untuk meneruskan (kitab yang sudah siap tidak berubah).`); }
      else { setProgres(null); setHasil(null); setIsian(null); setBerkas(''); if (simpananRef.current) { simpananRef.current.hapus(); simpananRef.current = null; } toast(`Selesai: ${r.selesai.jumlah} halaman diimpor dan kitab aktif.`); }
    } catch (e) { setProgres({ tahap: 'gagal' }); setErrImpor(apiErr(e)); }
    muatDaftar();
  };
  const aktifkan = async (k) => {
    try { await callApi('/api/kitab', { aksi: 'impor-aktif', kitabId: k.id, aktif: !k.aktif }); muatDaftar(); }
    catch (e) { toast((apiErr(e) || {}).message || 'Gagal mengubah status.'); }
  };

  // Otoritas kitab: status ini diteruskan server ke prompt AI sebagai arahan haluan Aswaja (src/otoritas.js). Hanya admin; setiap perubahan diarsipkan server.
  const tetapkanOtoritas = async (k, ubah) => {
    const o = normalOtoritas(k.otoritas);
    try { await callApi('/api/kitab', { aksi: 'impor-otoritas', kitabId: k.id, otoritas: { status: o.status, akidah: o.akidah, catatan: o.catatan, ...ubah } }); muatDaftar(); toast('Otoritas kitab disimpan.'); }
    catch (e) { toast((apiErr(e) || {}).message || 'Gagal menyimpan otoritas kitab.'); }
  };
  const catatanOtoritas = (k) => {
    const baru = window.prompt(`Catatan ustadz tentang kitab ini (maks ${MAKS_CATATAN} karakter; dibaca AI sebagai arahan):`, normalOtoritas(k.otoritas).catatan);
    if (baru !== null) tetapkanOtoritas(k, { catatan: baru.slice(0, MAKS_CATATAN) });
  };

  // Pemeriksaan mutu menyisir seluruh teks kitab: dihitung sekali per hasil baca, bukan di tiap ketikan pada kolom isian.
  const pilihBahasa = isian ? isian.bahasa : null; const pilihAksara = isian ? isian.aksara : null;
  const peringatanIsi = useMemo(() => (hasil ? peringatanPratinjau(hasil, pilihBahasa ? { bahasa: pilihBahasa, aksara: pilihAksara } : null) : []), [hasil, pilihBahasa, pilihAksara]);
  const peringatan = hasil && isian ? [...peringatanDuplikat(hasil, isian, daftar), ...peringatanIsi] : peringatanIsi;
  const terhalang = peringatan.some((p) => p.tingkat === 'bad');
  const l = hasil && hasil.laporan;
  const pct = progres && progres.total ? Math.round((progres.tertulis / progres.total) * 100) : 0;

  return (
    <div className="fade-in space-y-4">
      <div className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
        <p className="font-semibold">Perpustakaan kitab</p>
        <details className="mt-1 text-mute"><summary className="font-semibold text-ink">Format yang didukung dan cara kerja impor</summary><p className="mt-1">Unggah ekspor Maktabah Syamilah (.txt UTF-8 atau .docx), PDF yang teksnya bisa disalin, EPUB, HTML, JSON halaman, atau berkas lain yang memuat penanda halaman [ص N] (kitab Arab) atau [hal. N] (buku berbahasa Indonesia, Jawa, Inggris, dan lain-lain). Bahasa dikenali otomatis dan bisa diubah sebelum impor. Berkas tanpa penanda halaman bisa dibagi otomatis (halaman virtual). Berkas dibaca di perangkat ini, lalu halaman dikirim per 100 ke server. Kitab baru aktif setelah jumlah halaman cocok.</p></details>
      </div>

      {errDaftar && <ErrorBox e={errDaftar} />}
      <div className="rounded-2xl border border-line bg-surface">
        <div className="flex items-center gap-2 border-b border-line px-4 py-2">
          <p className="mr-auto text-sm font-semibold">Kitab tersimpan{daftar ? ` (${daftar.length})` : ''}</p>
          <Btn kind="ghost" onClick={muatDaftar}><RefreshCw size={15} />Segarkan</Btn>
        </div>
        {!daftar ? <div className="flex justify-center py-6 text-mute"><Loader2 className="spin" /></div>
          : !daftar.length ? <p className="px-4 py-4 text-sm text-mute">Belum ada kitab di perpustakaan.</p>
          : <ul className="divide-y divide-line">{daftar.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
              <div className="mr-auto min-w-0">
                <p className="font-semibold">{k.judulLatin} <span className="font-normal text-mute">· {k.id}</span></p>
                {k.judul && k.judul !== k.judulLatin && <p {...tampilanTeks(k, 'truncate text-mute')}>{k.judul}</p>}
                <p className="text-xs text-mute">{LABEL_BAHASA[bahasaKitab(k)]} · {k.jumlahHalaman} halaman · rev. {k.revisi} · {STATUS[k.status] || k.status} · {k.aktif ? 'aktif' : 'tidak aktif'} · {HAK[k.hakCipta] || k.hakCipta}{k.koreksi > 0 ? ` · ${k.koreksi} koreksi teks oleh editor` : ''}{k.isiDisunting > 0 ? ` · daftar isi disunting ${k.isiDisunting} kali` : ''}</p>
              </div>
              {k.status === 'siap' && (
                <div className="flex w-full flex-wrap items-center gap-2 text-xs">
                  <label className="flex items-center gap-1">Otoritas:
                    <select className="rounded-lg border border-line bg-surface px-2 py-1 text-sm text-ink" value={normalOtoritas(k.otoritas).status} onChange={(e) => tetapkanOtoritas(k, { status: e.target.value })}>
                      {STATUS_OTORITAS.map((v) => <option key={v} value={v}>{LABEL_STATUS[v]}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center gap-1">Akidah:
                    <select className="rounded-lg border border-line bg-surface px-2 py-1 text-sm text-ink" value={normalOtoritas(k.otoritas).akidah} onChange={(e) => tetapkanOtoritas(k, { akidah: e.target.value })}>
                      {AKIDAH.map((v) => <option key={v} value={v}>{LABEL_AKIDAH[v]}</option>)}
                    </select>
                  </label>
                  <button type="button" className="underline" onClick={() => catatanOtoritas(k)}>{normalOtoritas(k.otoritas).catatan ? 'Ubah catatan' : 'Tambah catatan'}</button>
                </div>)}
              {k.status === 'siap' && <Btn kind="ghost" onClick={() => aktifkan(k)}>{k.aktif ? <><EyeOff size={15} />Sembunyikan</> : <><Eye size={15} />Aktifkan</>}</Btn>}
            </li>))}</ul>}
      </div>

      <div className="rounded-2xl border border-line bg-surface px-4 py-4">
        <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold shadow-sm hover:border-brand hover:bg-soft">
          <Upload size={15} />Pilih berkas kitab (.txt .docx .pdf .epub .html .json)
          <input type="file" accept=".txt,.docx,.pdf,.epub,.html,.htm,.xhtml,.json,text/plain,text/html,application/pdf,application/epub+zip,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={pilihBerkas} disabled={sibuk || !!membaca} />
        </label>
        {berkas && <span className="ml-2 break-all text-xs text-mute">{berkas}</span>}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="ki-awal" className="text-xs text-mute">Nomor cetak halaman pertama (PDF dan halaman virtual; biarkan 1 agar nomor cetak dibaca dari isi PDF bila ada)</label>
          <input id="ki-awal" type="number" min="0" max="99999" inputMode="numeric" className="field !w-24 !py-1.5" value={halAwal} onChange={(e) => setHalAwal(e.target.value)} disabled={sibuk || !!membaca} />
          {berkasRef.current && <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => baca(berkasRef.current)} disabled={sibuk || !!membaca}><RefreshCw size={13} />Baca ulang</Btn>}
        </div>
        {membaca && (
          <div role="status" className="mt-3 space-y-1 text-sm text-mute">
            <p className="flex items-center gap-2"><Loader2 size={15} className="spin" />{progresBaca ? (progresBaca.tahap === 'ocr' ? `OCR AI: ${progresBaca.n} dari ${progresBaca.total} halaman` : `Membaca teks PDF: halaman ${progresBaca.n} dari ${progresBaca.total}`) : membaca}</p>
            {progresBaca && progresBaca.total > 0 && <div className="h-2 overflow-hidden rounded-full bg-soft"><div className="h-full bg-brand transition-all" style={{ width: `${Math.round((progresBaca.n / progresBaca.total) * 100)}%` }} /></div>}
            {progresBaca && <Btn kind="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => { batalBacaRef.current = true; }}>Batalkan</Btn>}
          </div>)}
        {errParse && <p role="alert" className="mt-3 rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">{errParse}</p>}
        {tawarOcr !== null && berkasRef.current && !membaca && (
          <div className="mt-2 rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn">
            <p>PDF ini berupa gambar pindai{tawarOcr ? ` (${tawarOcr} halaman tanpa teks)` : ''}. OCR AI membaca tiap halaman sebagai gambar: <b>satu panggilan AI per halaman</b>, dan hasilnya bisa keliru pada huruf dan harakat. Pemeriksa kutipan memakai teks ini sebagai rujukan, jadi periksa beberapa halaman sebelum kitab dipakai.</p>
            <PilihAksaraOcr nilai={aksaraOcr} ubah={setAksaraOcr} />
            <Btn kind="soft" className="mt-2 !text-xs" onClick={() => baca(berkasRef.current, { ocr: true })}>Baca dengan OCR AI{tawarOcr ? ` (${tawarOcr} halaman)` : ''}</Btn>
          </div>)}
        {tawarHalamanWord > 0 && berkasRef.current && !membaca && (
          <div className="mt-2 rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn">
            <p>Dokumen Word ini tidak memuat penanda [ص N], tetapi punya sekitar <b>{tawarHalamanWord} halaman</b> menurut pemisah halaman Word (biasanya hasil konversi PDF ke Word). Satu halaman Word bisa dipakai sebagai satu halaman kitab; nomornya mengikuti urutan ditambah nomor awal di atas, bukan nomor cetak.</p>
            <Btn kind="soft" className="mt-2 !text-xs" onClick={() => baca(berkasRef.current, { halamanWord: true })} disabled={!!membaca}>Pakai pemisah halaman Word</Btn>
          </div>)}
        {tawarVirtual && berkasRef.current && (
          <div className="mt-2 rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn">
            <p>Berkas ini tidak memuat nomor halaman cetak. Halaman bisa dibagi otomatis menurut panjang teks; nomornya <b>bukan</b> nomor cetak, jadi rujukan soal ke kitab ini harus dicocokkan dengan edisi cetak.</p>
            <Btn kind="soft" className="mt-2 !text-xs" onClick={() => baca(berkasRef.current, { virtual: true })} disabled={!!membaca}>Bagi halaman otomatis (halaman virtual)</Btn>
          </div>)}

        {hasil && isian && (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs text-mute">Format terbaca: {FORMAT_LABEL[hasil.format] || hasil.format}</p>
              <p {...tampilanTeks(isian, 'text-lg')}>{hasil.kitab.judul}</p>
              <p className="text-sm text-mute">{hasil.kitab.pengarang}</p>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {[['Halaman', l.jumlahHalaman], ['Judul bab', l.judulTerdeteksi], ['Catatan kaki dibuang', l.catatanKakiDibuang], ['Rujukan takhrij dibuang', l.rujukanDibuang],
                ['Halaman cetak', `${l.halPertama}-${l.halTerakhir}`], ['Ukuran teks', `${Math.round(l.ukuranBytes / 1024)} KB`], ['Bahasa terdeteksi', LABEL_BAHASA[hasil.kitab.bahasa] || '-'],
                ...(isian.aksara === 'arab' ? [['Berharakat', hasil.kitab.berharakat ? 'ya' : 'tidak'], ['Matn terpisah', hasil.kitab.bentukMatn === 'pemisah-tatwil' ? 'ya' : 'tidak']] : [])]
                .map(([a, b]) => <div key={a} className="rounded-xl bg-soft px-3 py-2"><dt className="text-xs text-mute">{a}</dt><dd className="font-semibold">{b}</dd></div>)}
            </dl>
            {l.halamanPerluOcr && l.halamanPerluOcr.length > 0 && berkasRef.current && (
              <div className="space-y-2"><PilihAksaraOcr nilai={aksaraOcr} ubah={setAksaraOcr} /><Btn kind="soft" className="!text-xs" onClick={() => baca(berkasRef.current, { ocr: true })} disabled={sibuk || !!membaca}>Baca {l.halamanPerluOcr.length} halaman bermasalah dengan OCR AI (membaca ulang seluruh PDF)</Btn></div>)}
            {l.halamanDuaKolom > 0 && berkasRef.current && (
              <Btn kind="ghost" className="!text-xs" onClick={() => baca(berkasRef.current, { kolom: 'tutup' })} disabled={sibuk || !!membaca}>Baca ulang tanpa deteksi dua kolom (untuk nazham/syair)</Btn>)}
            {peringatan.map((p, i) => (
              <p key={i} role={p.tingkat === 'bad' ? 'alert' : undefined} className={`flex gap-2 rounded-xl px-4 py-3 text-sm ${p.tingkat === 'bad' ? 'bg-bad-bg text-bad' : 'bg-warn-bg text-warn'}`}><AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{p.teks}</span></p>
            ))}
            <details className="rounded-xl border border-line px-4 py-2 text-sm" open>
              <summary className="cursor-pointer font-semibold">Pratinjau halaman</summary>
              {(() => {
                const n = hasil.halaman.length; const u = Math.min(Math.max(1, urutLihat), n); const p = hasil.halaman[u - 1];
                const terpanjang = hasil.halaman.reduce((m, x, i) => (x.teks.length > hasil.halaman[m].teks.length ? i : m), 0) + 1;
                return (
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-mute">
                      <label htmlFor="ki-lihat">Urutan</label>
                      <input id="ki-lihat" type="number" min="1" max={n} inputMode="numeric" className="field !w-20 !py-1" value={u} onChange={(e) => setUrutLihat(parseInt(e.target.value, 10) || 1)} />
                      <span>dari {n}</span>
                      {[['Awal', 1], ['Tengah', Math.ceil(n / 2)], ['Akhir', n], ['Terpanjang', terpanjang]].map(([label, v]) => (
                        <Btn key={label} kind="ghost" className="!px-2.5 !py-1 !text-xs" onClick={() => setUrutLihat(v)}>{label}</Btn>))}
                    </div>
                    <p className="text-xs text-mute">Hal. {p.hal} · juz {p.juz} · {p.teks.length.toLocaleString('id-ID')} karakter{p.bab ? <> · bab: <span {...tampilanTeks(isian)}>{p.bab}</span></> : null}</p>
                    <p {...tampilanTeks(isian, `max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-soft px-3 py-2 text-lg ${isian.aksara === 'arab' ? 'leading-loose' : 'leading-relaxed'}`)}>{p.teks.slice(0, 1500)}{p.teks.length > 1500 ? ' …' : ''}</p>
                    <p className="text-xs text-mute">Periksa beberapa halaman (awal, tengah, akhir): huruf utuh bersambung, urutan kata benar, dan tidak ada judul berjalan atau nomor halaman yang menempel.</p>
                  </div>);
              })()}
            </details>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm"><span className="font-semibold">Nama kitab (Latin) *</span>
                <input className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2" value={isian.judulLatin} onChange={(e) => ubah({ judulLatin: e.target.value })} placeholder="mis. Fathul Mu'in" />
                <span className="text-xs text-mute">Dipakai sebagai nama kitab di soal.</span></label>
              <label className="text-sm"><span className="font-semibold">ID kitab *</span>
                <input className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2" value={isian.kitabId} onChange={(e) => { setIdManual(true); ubah({ kitabId: e.target.value.toLowerCase() }); }} placeholder="fathul-muin" />
                <span className="text-xs text-mute">Huruf kecil, angka, tanda hubung. Tidak bisa diganti setelah impor.</span></label>
              <label className="text-sm"><span className="font-semibold">Bahasa dan aksara teks *</span>
                <select className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2" value={nilaiBahasa(isian)} onChange={(e) => ubah(bahasaDariNilai(e.target.value))}>
                  {PILIHAN_BAHASA.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select>
                <span className="text-xs text-mute">Terdeteksi otomatis. Menentukan arah tampilan (Arab kanan ke kiri, Latin kiri ke kanan) dan petunjuk untuk AI saat menyusun soal.</span></label>
              <label className="text-sm"><span className="font-semibold">Mazhab</span>
                <select className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2" value={isian.mazhab} onChange={(e) => ubah({ mazhab: e.target.value })}>
                  <option value="">Tidak ditentukan</option><option value="syafii">Syafi'i</option><option value="hanafi">Hanafi</option><option value="maliki">Maliki</option><option value="hanbali">Hanbali</option></select></label>
              <label className="text-sm"><span className="font-semibold">Status hak cipta</span>
                <select className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2" value={isian.hakCipta} onChange={(e) => ubah({ hakCipta: e.target.value })}>
                  <option value="belum-dicek">Belum dicek</option><option value="domain-publik">Domain publik</option><option value="izin">Berizin</option></select></label>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isian.timpa} onChange={(e) => ubah({ timpa: e.target.checked, ...(e.target.checked ? { tambah: false } : {}) })} />Timpa bila kitab dengan ID ini sudah ada (halaman lama dihapus lebih dulu)</label>
            {isian.timpa && (() => { const ada = (daftar || []).find((k) => k.id === isian.kitabId); return ada && (ada.koreksi > 0 || ada.isiDisunting > 0) ? <p role="alert" className="rounded-xl bg-warn-bg px-4 py-2 text-xs text-warn">Kitab ini sudah dikoreksi {ada.koreksi} kali dan daftar isinya disunting {ada.isiDisunting || 0} kali oleh editor/admin. Menimpa mengganti seluruh teks dan daftar isi dengan isi berkas, jadi koreksi pada halaman dan suntingan daftar isi tidak ikut terbawa (riwayatnya tetap tersimpan di server). Pakai "tambah jilid" bila hanya ingin menambah halaman.</p> : null; })()}
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={!!isian.tambah} onChange={(e) => ubah({ tambah: e.target.checked, ...(e.target.checked ? { timpa: false } : {}) })} /><span>Tambahkan sebagai jilid berikutnya ke kitab dengan ID ini (halaman lama tidak disentuh; ID di atas harus kitab yang sudah siap).</span></label>
            {isian.tambah && (<label className="block text-sm">Nomor juz awal jilid ini (kosong = otomatis, melanjutkan juz terakhir)
              <input className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2" inputMode="numeric" value={isian.juzAwal} onChange={(e) => ubah({ juzAwal: e.target.value.replace(/\D/g, '').slice(0, 2) })} /></label>)}
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={!!isian.lanjut} onChange={(e) => ubah({ lanjut: e.target.checked })} /><span>Lanjutkan impor yang terputus (berkas dan pengaturan baca harus sama persis; halaman yang sudah tertulis dilewati). Untuk kitab yang sudah siap, centang juga \"timpa\".</span></label>

            {progres && progres.tahap !== 'gagal' && (
              <div role="status" className="space-y-1">
                <div className="h-2 overflow-hidden rounded-full bg-soft"><div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} /></div>
                <p className="text-xs text-mute">{progres.tahap === 'mulai' ? 'Menyiapkan kitab...' : progres.tahap === 'selesai' ? 'Memeriksa jumlah halaman...' : `${progres.tertulis} dari ${progres.total} halaman`}</p>
              </div>
            )}
            {errImpor && <ErrorBox e={errImpor} />}
            <div className="flex flex-wrap gap-2">
              <Btn kind="primary" onClick={impor} disabled={sibuk || terhalang || !isianSiap(isian)}>{sibuk ? <Loader2 size={15} className="spin" /> : <Check size={15} />}Impor ke perpustakaan</Btn>
              {sibuk && <Btn kind="ghost" onClick={() => { batalRef.current = true; }}>Batalkan</Btn>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
