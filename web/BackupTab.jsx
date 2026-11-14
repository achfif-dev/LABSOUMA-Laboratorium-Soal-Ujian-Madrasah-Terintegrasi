import { useEffect, useRef, useState } from 'react';
import { Btn, ErrorBox, Label, Section, Select, apiErr, callApi } from './ui.jsx';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { CheckCircle2, CloudUpload, Library, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { muatGis, tautanDriveAman, ukuranBerkas, waktuLokal } from './driveUi.js';

export function BackupTab({ user, isAdmin, toast, onCfg }) {
  const Drv = window.LabDrive;
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState('');
  const [status, setStatus] = useState('');
  const [hasil, setHasil] = useState(null);      // cadangan terakhir yang sudah terverifikasi di Drive (soalnya dipakai untuk arsip)
  const [hari, setHari] = useState('180');
  const [paksaPenuh, setPaksaPenuh] = useState(false); // true = baca semua soal dari Firestore (memakai jatah baca), bukan gabung cadangan terakhir
  const [arsipRes, setArsipRes] = useState(null);
  const [files, setFiles] = useState(null);
  const [pilih, setPilih] = useState(null);      // cadangan yang akan dipulihkan
  const [mode, setMode] = useState('lewati');
  const [pulihKitab, setPulihKitab] = useState(false);
  const [pulihRes, setPulihRes] = useState(null);
  const tokenRef = useRef({ v: '', exp: 0 });
  useEffect(() => {
    muatGis().catch(() => {}); // dimuat lebih awal supaya jendela izin tidak terblokir saat tombol diklik
    callApi('/api/backup', { aksi: 'info' }).then(setInfo).catch((e) => setErr(apiErr(e)));
  }, []);
  if (!Drv) return <ErrorBox e={{ code: 'DRIVE_ERROR', message: 'Modul Drive tidak termuat. Muat ulang halaman dengan Ctrl+Shift+R.' }} />;

  // Token hanya di memori (hilang saat halaman ditutup, kedaluwarsa sekitar satu jam), tidak pernah ke localStorage atau server.
  const ambilToken = async () => {
    const t = tokenRef.current;
    if (t.v && Date.now() < t.exp - 60000) return t.v;
    if (!info || !info.driveClientId) throw new Drv.DriveError('DRIVE_BELUM_DIATUR', 'Client ID Google Drive belum diisi di server (GOOGLE_DRIVE_CLIENT_ID). Lihat README, bagian Backup.');
    await muatGis();
    return new Promise((selesai, gagal) => {
      const klien = window.google.accounts.oauth2.initTokenClient({
        client_id: info.driveClientId, scope: Drv.SCOPE, login_hint: user.email || undefined,
        callback: (r) => {
          if (r && r.access_token) { tokenRef.current = { v: r.access_token, exp: Date.now() + (Number(r.expires_in) || 3600) * 1000 }; selesai(r.access_token); }
          else gagal(new Drv.DriveError('DRIVE_IZIN', 'Izin Google Drive tidak diberikan.'));
        },
        error_callback: (e) => gagal(new Drv.DriveError('DRIVE_IZIN', e && e.type === 'popup_closed' ? 'Jendela izin ditutup sebelum selesai.' : e && e.type === 'popup_failed_to_open' ? 'Browser memblokir jendela izin. Izinkan pop-up untuk situs ini lalu ulangi.' : 'Izin Google Drive gagal diminta.')),
      });
      klien.requestAccessToken({ prompt: '' });
    });
  };
  const jalan = async (nama, fn) => {
    setErr(null); setBusy(nama);
    try { await fn(); }
    catch (e) { if (e && e.code === 'DRIVE_TOKEN') tokenRef.current = { v: '', exp: 0 }; setErr(apiErr(e)); }
    finally { setBusy(''); setStatus(''); }
  };

  const bacaSemuaSoal = async () => {
    const db = firebase.firestore(); const out = []; let akhir = null;
    for (;;) {
      let q = db.collection('soal').orderBy(firebase.firestore.FieldPath.documentId()).limit(300);
      if (akhir) q = q.startAfter(akhir);
      const snap = await q.get({ source: 'server' }); // paksa server: salinan lokal yang usang tidak boleh masuk cadangan
      snap.docs.forEach((d) => out.push(Drv.serialisasiSoal(d.id, d.data())));
      setStatus(`Membaca soal dari Firestore: ${out.length}...`);
      if (snap.docs.length < 300) break;
      akhir = snap.docs[snap.docs.length - 1];
      if (out.length >= 50000) throw { code: 'BACKUP_INVALID', message: 'Jumlah soal melebihi 50.000; cadangan dihentikan.' };
    }
    return out;
  };

  // Hanya soal yang updatedAt-nya lebih baru dari `iso` (cadangan inkremental). Indeks updatedAt sudah ada (otomatis); paksa server agar salinan lokal usang tidak ikut.
  const bacaSoalSejak = async (iso) => {
    const db = firebase.firestore(); const out = []; let akhir = null;
    const batas = firebase.firestore.Timestamp.fromDate(new Date(iso));
    for (;;) {
      let q = db.collection('soal').where('updatedAt', '>', batas).orderBy('updatedAt').limit(300);
      if (akhir) q = q.startAfter(akhir);
      const snap = await q.get({ source: 'server' });
      snap.docs.forEach((d) => out.push(Drv.serialisasiSoal(d.id, d.data())));
      setStatus(`Membaca soal yang berubah: ${out.length}...`);
      if (snap.docs.length < 300) break;
      akhir = snap.docs[snap.docs.length - 1];
    }
    return out;
  };

  // Muat cadangan terakhir dari Drive (tidak memakai jatah baca Firestore). Dipakai cadangan inkremental DAN cadangan penuh: keduanya meneruskan daftar soal terarsip.
  const muatDasar = async (drive, folderId) => {
    try {
      setStatus('Mencari cadangan terakhir di Google Drive...');
      const f = Drv.cadanganTerbaru(await drive.daftar(folderId));
      if (!f) return { alasan: 'Belum ada cadangan sebelumnya.' };
      try { return { f, dasar: Drv.periksaBackup(JSON.parse(await drive.unduh(f.id))) }; }
      catch (e) { if (e && e.code === 'DRIVE_TOKEN') throw e; return { alasan: 'Cadangan terakhir tidak bisa dibaca.', takTerbaca: true }; }
    } catch (e) { if (e && e.code === 'DRIVE_TOKEN') throw e; return { alasan: 'Cadangan terakhir tidak bisa dicari.', takTerbaca: true }; }
  };

  // Coba cadangan inkremental dari dasar yang sudah dimuat. Mengembalikan { soal, diarsipkan, jenis, dasar, penuhSejak, ringkas } atau { alasan } bila harus penuh. Galat apa pun = penuh (tidak pernah menggagalkan cadangan).
  // Soal terarsip ada di berkas tetapi tidak di Firestore, jadi jumlah yang diharapkan di server = jumlah gabungan dikurangi yang terarsip.
  const cobaInkremental = async ({ f, dasar, alasan }) => {
    if (!dasar) return { alasan };
    try {
      const layak = Drv.layakInkremental(dasar); if (!layak.ok) return { alasan: layak.alasan };
      const ubah = await bacaSoalSejak(Drv.batasUbah(dasar));
      setStatus('Memeriksa jumlah soal di server...');
      const { jumlah } = await callApi('/api/backup', { aksi: 'hitung' });
      const g = Drv.gabungInkrementalArsip(dasar, ubah);
      if (!Number.isInteger(jumlah)) return { alasan: 'Jumlah soal di server tidak bisa dihitung.' };
      const diharapkan = g.soal.length - g.diarsipkan.length;
      if (diharapkan !== jumlah) return { alasan: `Ada soal yang dihapus sejak cadangan terakhir (cadangan ${diharapkan}, server ${jumlah}).` };
      return { soal: g.soal, diarsipkan: g.diarsipkan, jenis: 'inkremental', dasar: f.name, penuhSejak: dasar.penuhSejak || dasar.dibuat, ringkas: `${ubah.length} soal berubah digabung dengan ${f.name}` };
    } catch (e) { if (e && e.code === 'DRIVE_TOKEN') throw e; return { alasan: 'Cadangan inkremental gagal; dipakai cadangan penuh.' }; }
  };

  const cadangkan = () => jalan('backup', async () => {
    setHasil(null); setArsipRes(null);
    setStatus('Meminta izin Google Drive...');
    await ambilToken(); // pertama, supaya jendela izin muncul dari klik pengguna
    const drive = Drv.buatDrive({ ambilToken });
    const folderId = await drive.siapkanFolder();
    const dsr = await muatDasar(drive, folderId);
    const ink = paksaPenuh ? { alasan: 'Cadangan penuh dipilih.' } : await cobaInkremental(dsr);
    let soal = ink.soal; let diarsipkan = ink.diarsipkan || [];
    if (!soal) { // cadangan penuh: baca Firestore, lalu bawa soal terarsip dari cadangan terakhir supaya berkas terbaru tetap lengkap
      const b = Drv.bawaArsip(await bacaSemuaSoal(), dsr.dasar);
      soal = b.soal; diarsipkan = b.diarsipkan;
    }
    setStatus('Membaca katalog kitab...');
    const cfg = await callApi('/api/app-config', { aksi: 'baca' });
    const cad = Drv.buatBackup({ soal, config: cfg.config, kustom: cfg.kustom, oleh: user.email || user.uid, jenis: ink.soal ? 'inkremental' : 'penuh', dasar: ink.dasar || '', penuhSejak: ink.penuhSejak || '', diarsipkan });
    const isi = JSON.stringify(cad); const nama = Drv.namaBerkas();
    setStatus('Mengunggah ke Google Drive...');
    const f = await drive.unggah(folderId, nama, isi);
    setStatus('Memeriksa berkas di Google Drive...');
    if ((await drive.unduh(f.id)) !== isi) throw new Drv.DriveError('DRIVE_VERIFIKASI', 'Berkas di Google Drive tidak sama dengan data yang dikirim, jadi cadangan tidak dianggap berhasil dan tidak ada soal yang dihapus. Coba lagi.');
    setHasil({ id: f.id, nama, link: f.webViewLink || '', soal: cad.soal, diarsipkan: cad.diarsipkan || [], jumlah: cad.jumlah, ukuran: new Blob([isi]).size, waktu: cad.dibuat });
    setFiles(null);
    const catatArsip = diarsipkan.length ? ` ${diarsipkan.length} soal terarsip ikut tersimpan di berkas.` : '';
    // Cadangan terakhir tidak terbaca = daftar arsip sebelumnya tidak diketahui; beri tahu agar admin memeriksa cadangan yang lebih lama.
    const awasArsip = !ink.soal && dsr.takTerbaca ? ' PERHATIAN: cadangan sebelumnya tidak terbaca, jadi soal yang pernah diarsipkan tidak ikut dibawa. Simpan cadangan lama yang memuatnya.' : '';
    toast((ink.soal ? `Cadangan inkremental tersimpan dan terverifikasi (${ink.ringkas}).` : `Cadangan penuh tersimpan dan terverifikasi di Google Drive.${ink.alasan && !paksaPenuh ? ' ' + ink.alasan : ''}`) + catatArsip + awasArsip);
  });

  // ---- Arsip (admin): hapus dari Firestore soal Disetujui yang lama tidak berubah, hanya yang ada di cadangan terverifikasi ----
  const arsipSudah = (hasil && hasil.diarsipkan) || [];
  const kand = hasil && isAdmin ? Drv.kandidatArsip(hasil.soal, { hari: Number(hari), kecuali: arsipSudah }) : [];
  const arsipkan = () => jalan('arsip', async () => {
    if (!kand.length) return;
    if (!window.confirm(`Hapus ${kand.length} soal berstatus Disetujui (terakhir diubah lebih dari ${hari} hari lalu) dari Firestore?\n\nSalinannya ada di "${hasil.nama}" di Google Drive. Soal itu tidak akan tampil di Bank Soal dan Export sampai dipulihkan dari cadangan.`)) return;
    // 1) CATAT DULU daftar arsip di berkas cadangan (diverifikasi), BARU hapus dari Firestore. Bila pencatatan gagal, tidak ada yang dihapus.
    //    Tanpa catatan ini, cadangan penuh berikutnya (membaca Firestore) tidak lagi memuat soal terarsip.
    const drive = Drv.buatDrive({ ambilToken });
    const tulisArsip = async (ids) => {
      const obj = JSON.parse(await drive.unduh(hasil.id));
      const isi = JSON.stringify(Drv.denganArsip(obj, ids));
      await drive.perbarui(hasil.id, isi);
      if ((await drive.unduh(hasil.id)) !== isi) throw new Drv.DriveError('DRIVE_VERIFIKASI', 'Daftar arsip di berkas Google Drive tidak sama dengan yang dikirim, jadi tidak ada soal yang dihapus. Coba lagi.');
      return Drv.periksaBackup(JSON.parse(isi)).diarsipkan;
    };
    setStatus('Mencatat daftar arsip di berkas cadangan Google Drive...');
    const calon = [...arsipSudah, ...kand.map((q) => q.id)];
    const awal = await tulisArsip(calon);
    if (awal.length !== new Set(calon).size) throw new Drv.DriveError('DRIVE_VERIFIKASI', 'Daftar arsip tidak tercatat lengkap di berkas cadangan, jadi tidak ada soal yang dihapus.');
    const db = firebase.firestore(); let dihapus = 0; let berubah = 0; const idDihapus = [];
    for (const bagian of Drv.potong(kand, 100)) {
      setStatus(`Menghapus dari Firestore: ${dihapus + berubah} / ${kand.length}...`);
      // Transaksi: soal yang diubah sejak cadangan dibuat (updatedAt berbeda) tidak dihapus, supaya suntingan terbaru tidak hilang.
      const r = await db.runTransaction(async (tx) => {
        const snaps = await Promise.all(bagian.map((q) => tx.get(db.collection('soal').doc(q.id))));
        let d = 0; let b = 0; const ids = [];
        snaps.forEach((s, j) => {
          if (!s.exists) return;
          const t = s.data().updatedAt;
          const sama = s.data().status === 'approved' && t && typeof t.toMillis === 'function' && new Date(t.toMillis()).toISOString() === bagian[j].updatedAt;
          if (sama) { tx.delete(s.ref); d++; ids.push(s.id); } else b++;
        });
        return { d, b, ids };
      });
      dihapus += r.d; berubah += r.b; idDihapus.push(...r.ids);
    }
    // 2) Soal yang dilewati (berubah) masih di Firestore: keluarkan dari daftar arsip. Bila langkah ini gagal tidak apa-apa; cadangan berikutnya memperbaiki daftar sendiri.
    let tercatat = awal;
    if (berubah > 0) { try { tercatat = await tulisArsip([...arsipSudah, ...idDihapus]); } catch (e) { /* diperbaiki cadangan berikutnya */ } }
    setHasil((h) => (h ? { ...h, diarsipkan: tercatat } : h));
    setArsipRes({ dihapus, berubah });
    toast(`${dihapus} soal dihapus dari Firestore dan tetap tersimpan di berkas cadangan.`);
  });

  // ---- Daftar cadangan di Drive dan pemulihan ----
  const muatDaftar = () => jalan('daftar', async () => {
    setStatus('Meminta izin Google Drive...'); await ambilToken();
    const drive = Drv.buatDrive({ ambilToken });
    setStatus('Membaca daftar cadangan...');
    setFiles(await drive.daftar(await drive.siapkanFolder()));
  });
  const bacaCadangan = (teks, nama) => {
    let obj; try { obj = JSON.parse(teks); } catch (e) { throw { code: 'BACKUP_INVALID', message: 'Berkas bukan JSON yang valid.' }; }
    let r; try { r = Drv.periksaBackup(obj); } catch (e) { throw { code: 'BACKUP_INVALID', message: e.message }; }
    setPilih({ nama, ...r }); setPulihRes(null); setPulihKitab(false); setMode('lewati');
  };
  const pilihDariDrive = (f) => jalan('baca', async () => { setStatus('Mengunduh cadangan...'); bacaCadangan(await Drv.buatDrive({ ambilToken }).unduh(f.id), f.name); });
  const pilihLokal = (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    jalan('baca', async () => {
      if (f.size > 40 * 1048576) throw { code: 'BACKUP_INVALID', message: 'Berkas terlalu besar (maks. 40 MB).' };
      bacaCadangan(await f.text(), f.name);
    });
  };
  const pulihkan = () => jalan('pulih', async () => {
    if (!pilih) return;
    if (!window.confirm(`Pulihkan ${pilih.soal.length} soal${pulihKitab ? ' dan katalog kitab beserta kelas dan sistem ujian (menimpa pengaturan saat ini)' : ''} dari "${pilih.nama}"?\n\n` + (mode === 'timpa' ? 'Soal dengan ID yang sama akan DITIMPA isi cadangan.' : 'Soal yang sudah ada dibiarkan.'))) return;
    const tot = { ditulis: 0, dilewati: 0, ditolak: [] }; let n = 0;
    for (const b of Drv.potong(pilih.soal, 100)) {
      setStatus(`Memulihkan soal: ${n} / ${pilih.soal.length}...`);
      const r = await callApi('/api/backup', { aksi: 'pulihkan', mode, soal: b });
      tot.ditulis += r.ditulis; tot.dilewati += r.dilewati; tot.ditolak.push(...r.ditolak); n += b.length;
    }
    let kitabOk = false;
    if (pulihKitab && pilih.konfigurasi) { setStatus('Memulihkan katalog kitab...'); onCfg(await callApi('/api/app-config', { aksi: 'simpan', config: pilih.konfigurasi })); kitabOk = true; }
    setPulihRes({ ...tot, kitabOk });
    toast('Pemulihan selesai.');
  });

  const siap = !!(info && info.driveClientId);
  const sibuk = !!busy;
  return (
    <div className="fade-in space-y-4">
      <div className="rounded-2xl border border-line bg-surface p-4 text-sm leading-relaxed text-mute">
        Semua soal (termasuk draf) dan katalog kitab disimpan sebagai satu berkas JSON ke <b className="text-ink">Google Drive</b> akun yang Anda pilih di jendela izin, dalam folder “LABSOUMA Backup”.
        Aplikasi hanya melihat berkas yang dibuatnya sendiri. Gunakan akun Google madrasah, bukan akun pribadi, supaya cadangan tidak ikut hilang saat pengelola berganti.
        <p className="mt-2">Cadangan pertama (dan tiap 30 hari, atau bila ada soal yang dihapus) membaca seluruh soal dari Firestore: satu dokumen sama dengan satu bacaan dari jatah gratis harian. Cadangan berikutnya inkremental: hanya soal yang berubah dibaca dari Firestore dan digabung dengan cadangan terakhir di Drive, tetapi berkasnya tetap lengkap, termasuk soal yang sudah diarsipkan. Cadangan sendiri tidak mengosongkan Firestore; untuk itu pakai <b className="text-ink">Arsipkan</b> (khusus admin) setelah cadangan terverifikasi.</p>
      </div>
      {err && <ErrorBox e={err} />}
      {info && !siap && (
        <p role="alert" className="rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn">
          Backup ke Google Drive belum diatur: Client ID OAuth belum diisi di server. {isAdmin ? 'Isi' : 'Minta admin mengisi'} variabel <code>GOOGLE_DRIVE_CLIENT_ID</code> di Vercel lalu Redeploy (langkahnya ada di README, bagian Backup).
        </p>
      )}

      <Section title="Cadangkan sekarang" icon={CloudUpload}>
        <Btn kind="primary" onClick={cadangkan} disabled={sibuk || !siap}>{busy === 'backup' ? <Loader2 size={16} className="spin" /> : <CloudUpload size={16} />}Cadangkan ke Google Drive</Btn>
        <label className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-mute">
          <input type="checkbox" className="mt-0.5" checked={paksaPenuh} disabled={sibuk} onChange={(e) => setPaksaPenuh(e.target.checked)} />
          <span>Paksa cadangan penuh (baca semua soal dari Firestore; memakai jatah baca harian sebanyak jumlah soal)</span>
        </label>
        {busy && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-mute"><Loader2 size={14} className="spin" />{status || 'Memproses...'}</p>}
        {hasil && (
          <div className="mt-4 rounded-xl bg-ok-bg px-4 py-3 text-sm text-ok">
            <p className="flex items-center gap-2 font-bold"><CheckCircle2 size={16} className="shrink-0" />Tersimpan dan terverifikasi di Google Drive</p>
            <p className="mt-1 leading-relaxed">{hasil.nama} · {hasil.jumlah.soal} soal, {hasil.jumlah.kitab} kitab · {ukuranBerkas(hasil.ukuran)}
              {tautanDriveAman(hasil.link) && <> · <a href={tautanDriveAman(hasil.link)} target="_blank" rel="noopener noreferrer" className="underline">Buka di Drive</a></>}</p>
          </div>
        )}
      </Section>

      {hasil && isAdmin && (
        <Section title="Arsipkan dari Firestore (admin)" icon={Trash2} lipat>
          <p className="text-sm leading-relaxed text-mute">
            Hapus dari Firestore soal berstatus <b className="text-ink">Disetujui</b> yang terakhir diubah lebih dari
            {' '}<span className="inline-block w-28 align-middle"><Select id="arsip-hari" value={hari} onChange={setHari}><option value="90">90 hari</option><option value="180">180 hari</option><option value="365">365 hari</option></Select></span>{' '}lalu.
            Draf, soal menunggu review, dan soal perlu revisi tidak pernah dihapus. Soal yang diarsipkan hilang dari Bank Soal dan Export sampai dipulihkan dari cadangan. Daftarnya dicatat di berkas cadangan lebih dulu, lalu ikut terbawa di setiap cadangan berikutnya, jadi cadangan terbaru tetap memuat semua soal.
            Pemeriksaan ulang tiap soal sebelum dihapus memakai satu bacaan lagi per soal.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Btn kind="danger" onClick={arsipkan} disabled={sibuk || !kand.length}>{busy === 'arsip' ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}Hapus {kand.length} soal dari Firestore</Btn>
            {!kand.length && <span className="text-sm text-mute">Tidak ada soal yang memenuhi syarat.</span>}
          </div>
          {arsipRes && <p role="status" className="mt-3 text-sm text-ink">{arsipRes.dihapus} soal dihapus dari Firestore{arsipRes.berubah > 0 ? `; ${arsipRes.berubah} soal dilewati karena berubah sejak cadangan dibuat` : ''}.</p>}
        </Section>
      )}

      <Section title="Cadangan di Google Drive" icon={Library} action={<Btn kind="ghost" onClick={muatDaftar} disabled={sibuk || !siap}>{busy === 'daftar' ? <Loader2 size={16} className="spin" /> : <RotateCcw size={16} />}Muat daftar</Btn>}>
        {files === null && <p className="text-sm text-mute">Klik “Muat daftar” untuk melihat cadangan yang tersimpan di Drive.</p>}
        {files && !files.length && <p className="text-sm text-mute">Belum ada cadangan di folder “LABSOUMA Backup”.</p>}
        {files && files.length > 0 && (
          <ul className="divide-y divide-line text-sm">
            {files.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0"><p className="truncate font-semibold">{f.name}</p><p className="text-xs text-mute">{waktuLokal(f.modifiedTime)} · {ukuranBerkas(Number(f.size) || 0)}</p></div>
                {isAdmin && <Btn kind="soft" onClick={() => pilihDariDrive(f)} disabled={sibuk}>Pulihkan…</Btn>}
              </li>
            ))}
          </ul>
        )}
        {!isAdmin && <p className="mt-3 text-xs text-mute">Pemulihan hanya dapat dilakukan admin.</p>}
        {isAdmin && (
          <div className="mt-4 border-t border-line pt-4">
            <Label htmlFor="cad-lokal" hint="(alternatif: berkas .json yang sudah diunduh dari Drive)">Pulihkan dari berkas di komputer</Label>
            <input id="cad-lokal" type="file" accept=".json,application/json" onChange={pilihLokal} disabled={sibuk} className="block w-full text-sm" />
          </div>
        )}
        {busy === 'baca' && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-mute"><Loader2 size={14} className="spin" />{status || 'Membaca...'}</p>}
      </Section>

      {isAdmin && pilih && (
        <Section title="Pulihkan dari cadangan" icon={RotateCcw} lipat>
          <p className="text-sm leading-relaxed">
            <b>{pilih.nama}</b><br />
            <span className="text-mute">Dibuat {pilih.dibuat ? waktuLokal(pilih.dibuat) : '-'}{pilih.oleh ? ' oleh ' + pilih.oleh : ''} · {pilih.soal.length} soal · {pilih.jumlahKitab} kitab</span>
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="pulih-mode">Bila soal dengan ID yang sama sudah ada</Label>
              <Select id="pulih-mode" value={mode} onChange={setMode}><option value="lewati">Lewati (aman, bisa diulang)</option><option value="timpa">Timpa dengan isi cadangan</option></Select>
            </div>
            <label className="flex items-start gap-2 self-end text-sm">
              <input type="checkbox" checked={pulihKitab} disabled={!pilih.konfigurasi} onChange={(e) => setPulihKitab(e.target.checked)} className="mt-1" />
              <span>Pulihkan juga katalog kitab, mapel, tingkat, kelas, dan sistem ujian <span className="text-mute">(menimpa pengaturan saat ini{pilih.konfigurasi ? '' : '; cadangan ini tidak memuatnya'})</span></span>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn kind="primary" onClick={pulihkan} disabled={sibuk}>{busy === 'pulih' ? <Loader2 size={16} className="spin" /> : <RotateCcw size={16} />}Pulihkan</Btn>
            <Btn kind="ghost" onClick={() => { setPilih(null); setPulihRes(null); }} disabled={sibuk}>Batal</Btn>
          </div>
          {busy === 'pulih' && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-mute"><Loader2 size={14} className="spin" />{status || 'Memproses...'}</p>}
          {pulihRes && (
            <div role="status" className="mt-4 rounded-xl bg-soft px-4 py-3 text-sm">
              <p className="font-bold">{pulihRes.ditulis} soal ditulis, {pulihRes.dilewati} dilewati (sudah ada), {pulihRes.ditolak.length} ditolak{pulihRes.kitabOk ? ', katalog kitab dipulihkan' : ''}.</p>
              {pulihRes.ditolak.slice(0, 10).map((x, i) => <p key={i} className="mt-1 text-xs text-bad">{x.id}: {x.alasan}</p>)}
              {pulihRes.ditolak.length > 10 && <p className="mt-1 text-xs text-mute">...dan {pulihRes.ditolak.length - 10} lainnya.</p>}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
