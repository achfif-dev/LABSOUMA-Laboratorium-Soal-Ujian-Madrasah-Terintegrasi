// Penyuntingan daftar isi kitab oleh editor/admin (aksi `perpus-isi-usul`, `perpus-isi-simpan`, `perpus-isi-riwayat`, dipanggil dari src/kitabBaca.js).
//
// Simpan = SATU transaksi:
//   1. daftar isi   kitab/{id}/daftar/isi[_rN]       seluruh daftar diganti; `suntingRev` naik satu (kunci bentrok), juz dan hal diisi server dari halaman kitab
//   2. riwayat      kitab/{id}/isiRiwayat/{id}       salinan daftar SEBELUM perubahan + ringkasan + siapa dan kapan (hanya tambah; dibaca lewat `perpus-isi-riwayat`)
//   3. metadata     kitab/{id}.isiDisunting          penghitung; ditampilkan di layar impor supaya admin diperingatkan sebelum menimpa
// Bentrok: klien mengirim `rev` yang dilihatnya. Bila daftar sudah diubah orang lain, ditolak 409 tanpa menulis apa pun.
// Impor ulang ("timpa") menggantikan daftar isi bersama isi kitab, jadi suntingan ikut hilang; riwayat tetap ada sebagai arsip.
// Berbeda dari koreksi teks, daftar isi tidak ada di indeks pencarian, jadi tidak ada yang perlu dibangun ulang.
import { ApiError } from './soalService.js';
import { firestoreAdmin } from './platform.js';
import { idHalaman, koleksiHalaman, dokDaftarIsi, akhiran } from './kitabImpor.js';
import { PERAN_KOREKSI } from './kitabKoreksi.js';
import { MAKS_ENTRI_ISI, MAKS_CATATAN_ISI, rapikanEntri, periksaEntri, bedaDaftar, usulDariHalaman } from '../web/lib/daftarIsi.js';

export const MAKS_RIWAYAT_ISI = 10;
const MAKS_BYTE_DAFTAR = 900_000;   // batas dokumen Firestore 1 MiB; sisakan ruang untuk bidang lain
const MAKS_BYTE_ARSIP = 600_000;    // salinan lama yang lebih besar dari ini tidak diarsipkan (hanya jumlahnya)
const tolak = (status, kode, pesan) => { throw new ApiError(status, kode, pesan); };
const izinkan = (pengguna, untuk) => { if (!pengguna || !PERAN_KOREKSI.includes(pengguna.role)) tolak(403, 'FORBIDDEN_ROLE', `${untuk} hanya untuk editor dan admin.`); };
const ukuran = (o) => JSON.stringify(o).length;
const bersih = (e) => ({ judul: e.judul, level: e.level, juz: e.juz, hal: e.hal, seq: e.seq });

/** Aksi `perpus-isi-usul`: usulan daftar isi dari teks kitab. Tidak menulis apa pun. Masukan: { kitabId }. Keluaran: { usul, dibaca, terpotong }. */
export async function aksiIsiUsul(b, kid, m, pengguna) {
  izinkan(pengguna, 'Membuat usulan daftar isi');
  const { db } = await firestoreAdmin();
  const snap = await db.collection(koleksiHalaman(kid, m)).select('seq', 'juz', 'hal', 'teks', 'bab').get();
  const halaman = snap.docs.map((d) => d.data()).filter((h) => Number.isInteger(h.seq));
  const semua = usulDariHalaman(halaman);
  return { usul: semua.slice(0, MAKS_ENTRI_ISI), dibaca: halaman.length, terpotong: semua.length > MAKS_ENTRI_ISI };
}

/**
 * Aksi `perpus-isi-simpan`. Masukan: { kitabId, entri: [{ judul, level, seq }], rev, catatan? }.
 * `rev` = `suntingRev` yang dilihat penyunting (0 bila daftar belum pernah disunting). Keluaran: { ok, tidakBerubah, entri, rev, ringkas }.
 */
export async function aksiIsiSimpan(b, kid, m, pengguna, { sekarang = () => new Date().toISOString() } = {}) {
  izinkan(pengguna, 'Menyunting daftar isi');
  const { db } = await firestoreAdmin();
  if (!Array.isArray(b.entri)) tolak(422, 'ISI_INVALID', 'Daftar isi harus berupa larik.');
  if (b.entri.length > MAKS_ENTRI_ISI) tolak(422, 'ISI_INVALID', `Daftar isi terlalu panjang (maksimal ${MAKS_ENTRI_ISI} judul).`);
  const rev = b.rev === undefined ? 0 : b.rev;
  if (!Number.isInteger(rev) || rev < 0 || rev > 1_000_000) tolak(422, 'ISI_INVALID', 'Revisi daftar isi harus bilangan bulat 0-1.000.000.');
  const catatan = b.catatan === undefined || b.catatan === null ? '' : b.catatan;
  if (typeof catatan !== 'string') tolak(422, 'ISI_INVALID', 'Catatan harus berupa teks.');
  if (catatan.trim().length > MAKS_CATATAN_ISI) tolak(422, 'ISI_INVALID', `Catatan terlalu panjang (maksimal ${MAKS_CATATAN_ISI} karakter).`);
  const entri = rapikanEntri(b.entri);
  const { galat } = periksaEntri(entri, m.jumlahHalaman);
  if (galat.length) tolak(422, 'ISI_INVALID', `Judul ke-${galat[0].i}: ${galat[0].pesan}`);

  const metaRef = db.doc(`kitab/${kid}`);
  const daftarRef = db.doc(dokDaftarIsi(kid, m));
  const oleh = pengguna.uid; const namaOleh = String(pengguna.nama || '').slice(0, 120);
  const t = sekarang();

  return db.runTransaction(async (tx) => {
    const [daftarSnap, metaSnap] = await Promise.all([tx.get(daftarRef), tx.get(metaRef)]);
    // Impor ulang bisa mengalihkan ruang penyimpanan setelah pemanggil membaca metadata: jangan menulis ke ruang yang sudah tidak dipakai.
    const mm = metaSnap.exists ? metaSnap.data() : null;
    if (!mm || mm.aktif !== true || mm.status !== 'siap' || akhiran(mm) !== akhiran(m) || (mm.revisi || 1) !== (m.revisi || 1)) {
      tolak(409, 'KITAB_BERUBAH', 'Kitab ini baru saja diimpor ulang atau dinonaktifkan. Muat ulang halaman lalu ulangi penyuntingan.');
    }
    const lamaDoc = daftarSnap.exists ? daftarSnap.data() : {};
    const lama = Array.isArray(lamaDoc.entri) ? lamaDoc.entri : [];
    const revLama = lamaDoc.suntingRev || 0;
    if (revLama !== rev) tolak(409, 'ISI_BENTROK', 'Daftar isi ini sudah diubah orang lain sejak Anda membukanya. Muat ulang untuk melihat versi terbaru.');

    // juz dan hal cetak: dari halaman kitab, bukan dari klien. Halaman yang sudah punya entri lama memakai label lama (tanpa membaca ulang).
    const label = new Map(lama.map((e) => [e.seq, { juz: e.juz, hal: e.hal }]));
    const perlu = [...new Set(entri.map((e) => e.seq))].filter((s) => !label.has(s));
    const snaps = await Promise.all(perlu.map((s) => tx.get(db.doc(`${koleksiHalaman(kid, m)}/${idHalaman(s)}`))));
    snaps.forEach((s, i) => {
      if (!s.exists) tolak(422, 'ISI_INVALID', `Halaman urutan ${perlu[i]} tidak ditemukan.`);
      label.set(perlu[i], { juz: s.data().juz, hal: s.data().hal });
    });
    const baru = entri.map((e) => bersih({ ...e, ...label.get(e.seq) }));
    if (ukuran(baru) > MAKS_BYTE_DAFTAR) tolak(422, 'ISI_INVALID', 'Daftar isi terlalu besar. Kurangi jumlah atau panjang judul.');

    const lamaBersih = lama.map(bersih);
    if (JSON.stringify(lamaBersih) === JSON.stringify(baru)) return { ok: true, tidakBerubah: true, entri: lamaBersih, rev: revLama, ringkas: { tambah: 0, hapus: 0, ubah: 0 } };

    const ringkas = bedaDaftar(lamaBersih, baru);
    const arsip = ukuran(lamaBersih) <= MAKS_BYTE_ARSIP;
    const idRiwayat = `${t.replace(/\D/g, '')}_${Math.random().toString(36).slice(2, 7)}`;
    tx.set(daftarRef, { entri: baru, jumlah: baru.length, revisi: lamaDoc.revisi || mm.revisi || 1, suntingRev: revLama + 1, disuntingOleh: oleh, disuntingNama: namaOleh, disuntingAt: t });
    tx.set(db.doc(`kitab/${kid}/isiRiwayat/${idRiwayat}`), {
      at: t, oleh, namaOleh, catatan: catatan.trim(), revDari: revLama, ringkas, jumlahLama: lamaBersih.length, jumlahBaru: baru.length,
      entriLama: arsip ? lamaBersih : null, // null = terlalu besar untuk diarsipkan; hanya jumlahnya yang tercatat
    });
    tx.update(metaRef, { isiDisunting: (mm.isiDisunting || 0) + 1, isiDisuntingAt: t, isiDisuntingOleh: oleh });
    return { ok: true, tidakBerubah: false, entri: baru, rev: revLama + 1, ringkas };
  });
}

/** Aksi `perpus-isi-riwayat`: perubahan terbaru daftar isi (maks MAKS_RIWAYAT_ISI), terbaru dulu. Masukan: { kitabId }. */
export async function aksiIsiRiwayat(b, kid, m, pengguna) {
  izinkan(pengguna, 'Riwayat daftar isi');
  const { db } = await firestoreAdmin();
  const snap = await db.collection(`kitab/${kid}/isiRiwayat`).get();
  const semua = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((x, y) => (x.at < y.at ? 1 : x.at > y.at ? -1 : 0));
  return {
    riwayat: semua.slice(0, MAKS_RIWAYAT_ISI).map((r) => ({
      id: r.id, at: r.at, namaOleh: r.namaOleh || '', catatan: r.catatan || '', ringkas: r.ringkas || { tambah: 0, hapus: 0, ubah: 0 },
      jumlahLama: r.jumlahLama || 0, jumlahBaru: r.jumlahBaru || 0, entriLama: Array.isArray(r.entriLama) ? r.entriLama : null,
    })),
    jumlah: semua.length,
  };
}
