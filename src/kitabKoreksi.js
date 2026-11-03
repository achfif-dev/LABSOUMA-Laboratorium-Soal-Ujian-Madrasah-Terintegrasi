// Koreksi teks halaman kitab oleh editor/admin (aksi `perpus-koreksi` dan `perpus-riwayat`, dipanggil dari src/kitabBaca.js).
//
// Satu koreksi menulis, dalam SATU transaksi:
//   1. halaman      kitab/{id}/halaman[_rN]/pNNNNN   teks baru, `rev` naik satu, `dikoreksi`, `diverifikasi`
//   2. riwayat      kitab/{id}/koreksi/{id}          salinan teks lama dan baru + siapa dan kapan (hanya tambah; dibaca lewat `perpus-riwayat`)
//   3. indeks cari  kitab/{id}/cari[_rN]/cNNNNN      teks normal halaman itu diganti, supaya pencarian langsung menemukan ejaan yang benar
//   4. metadata     kitab/{id}.koreksi               penghitung; ikut kunci simpanan memori pencarian (src/kitabCari.js), jadi mesin lain tidak
//                                                    memakai indeks lama
// Bentrok: klien mengirim `rev` yang dilihatnya. Bila halaman sudah diubah orang lain (rev beda), ditolak 409 tanpa menulis apa pun.
// Impor ulang ("timpa") menggantikan seluruh isi kitab, jadi koreksi ikut hilang; riwayat tetap ada di `koreksi` sebagai arsip. Penghitung `koreksi`
// ditampilkan di layar impor supaya admin diperingatkan sebelum menimpa.
import { ApiError } from './soalService.js';
import { firestoreAdmin } from './platform.js';
import { idHalaman, koleksiHalaman, koleksiCari, akhiran } from './kitabImpor.js';
import { normalCari } from '../web/lib/cariKitab.js';
import { MAKS_TEKS_KOREKSI, MAKS_CATATAN_KOREKSI, bersihkanTeksKoreksi, gabungMatnSyarah } from '../web/lib/koreksi.js';

export const PERAN_KOREKSI = ['editor', 'admin'];
export const MAKS_RIWAYAT = 10;
const tolak = (status, kode, pesan) => { throw new ApiError(status, kode, pesan); };

const bulat = (v, min, maks, nama) => {
  if (!Number.isInteger(v) || v < min || v > maks) tolak(422, 'KOREKSI_INVALID', `${nama} harus bilangan bulat ${min}-${maks}.`);
  return v;
};
const teksWajib = (v, nama) => {
  if (typeof v !== 'string') tolak(422, 'KOREKSI_INVALID', `${nama} harus berupa teks.`);
  return v;
};

/** Dokumen halaman untuk klien: satu-satunya bentuk keluaran halaman (dipakai juga oleh src/kitabBaca.js). Bidang koreksi hanya ada bila terisi. */
export const halamanKlien = (d) => ({
  id: idHalaman(d.seq), seq: d.seq, juz: d.juz, hal: d.hal, teks: d.teks, batasMatn: d.batasMatn ?? null,
  ...(d.bab ? { bab: d.bab } : {}), ...(d.nomorAnomali ? { nomorAnomali: d.nomorAnomali } : {}), ...(d.potongan ? { potongan: d.potongan } : {}), ...(d.ocr === true ? { ocr: true } : {}),
  ...(d.rev ? { rev: d.rev } : {}), ...(d.dikoreksi ? { dikoreksi: true } : {}), ...(d.diverifikasi ? { diverifikasi: true } : {}),
});

/** Teks baru dan batas matn dari isi permintaan, menurut bentuk halaman TERSIMPAN (klien tidak boleh mengubah bentuknya). */
export function teksBaruDariPermintaan(halaman, b) {
  if (halaman.batasMatn === null || halaman.batasMatn === undefined) {
    if (b.matn !== undefined || b.syarah !== undefined) tolak(422, 'KOREKSI_INVALID', 'Halaman ini tidak memisahkan matn dan syarah: kirim `teks`.');
    return { teks: bersihkanTeksKoreksi(teksWajib(b.teks, 'Teks')), batasMatn: null };
  }
  if (b.teks !== undefined) tolak(422, 'KOREKSI_INVALID', 'Halaman ini memisahkan matn dan syarah: kirim `matn` dan `syarah`.');
  return gabungMatnSyarah(teksWajib(b.matn, 'Matn'), teksWajib(b.syarah, 'Syarah'));
}

/**
 * Aksi `perpus-koreksi`. Masukan: { kitabId, seq, rev, teks | (matn, syarah), cocok?, catatan? }
 * `cocok: true` = penyunting menyatakan halaman ini sudah dicocokkan dengan kitab asli (menghapus peringatan OCR pada halaman itu).
 * Keluaran: { ok, tidakBerubah, halaman }.
 */
export async function aksiKoreksi(b, kid, m, pengguna, { sekarang = () => new Date().toISOString() } = {}) {
  if (!pengguna || !PERAN_KOREKSI.includes(pengguna.role)) tolak(403, 'FORBIDDEN_ROLE', 'Mengoreksi teks kitab hanya untuk editor dan admin.');
  const { db } = await firestoreAdmin();
  const seq = bulat(b.seq, 1, m.jumlahHalaman, 'Urutan halaman');
  const rev = bulat(b.rev === undefined ? 0 : b.rev, 0, 1_000_000, 'Revisi halaman');
  const cocok = b.cocok === true;
  if (b.cocok !== undefined && typeof b.cocok !== 'boolean') tolak(422, 'KOREKSI_INVALID', '`cocok` harus true atau false.');
  const catatan = b.catatan === undefined || b.catatan === null ? '' : teksWajib(b.catatan, 'Catatan').trim();
  if (catatan.length > MAKS_CATATAN_KOREKSI) tolak(422, 'KOREKSI_INVALID', `Catatan terlalu panjang (maksimal ${MAKS_CATATAN_KOREKSI} karakter).`);

  const metaRef = db.doc(`kitab/${kid}`);
  const halRef = db.doc(`${koleksiHalaman(kid, m)}/${idHalaman(seq)}`);
  const oleh = pengguna.uid; const namaOleh = String(pengguna.nama || '').slice(0, 120);
  const t = sekarang();

  return db.runTransaction(async (tx) => {
    const [halSnap, metaSnap] = await Promise.all([tx.get(halRef), tx.get(metaRef)]);
    // Impor ulang bisa mengalihkan ruang penyimpanan setelah pemanggil membaca metadata: jangan menulis ke ruang yang sudah tidak dipakai.
    const mm = metaSnap.exists ? metaSnap.data() : null;
    if (!mm || mm.aktif !== true || mm.status !== 'siap' || akhiran(mm) !== akhiran(m) || (mm.revisi || 1) !== (m.revisi || 1)) {
      tolak(409, 'KITAB_BERUBAH', 'Kitab ini baru saja diimpor ulang atau dinonaktifkan. Muat ulang halaman lalu ulangi koreksi.');
    }
    if (!halSnap.exists) tolak(404, 'HALAMAN_TIDAK_ADA', `Halaman urutan ${seq} tidak ditemukan.`);
    const lama = halSnap.data();
    if ((lama.rev || 0) !== rev) tolak(409, 'KOREKSI_BENTROK', 'Halaman ini sudah diubah orang lain sejak Anda membukanya. Muat ulang halaman untuk melihat versi terbaru.');

    const { teks, batasMatn } = teksBaruDariPermintaan(lama, b);
    if (teks.length > MAKS_TEKS_KOREKSI) tolak(422, 'KOREKSI_INVALID', `Teks halaman melebihi ${MAKS_TEKS_KOREKSI} karakter.`);
    const berubah = teks !== lama.teks || (batasMatn ?? null) !== (lama.batasMatn ?? null);
    const baruVerifikasi = cocok && !lama.diverifikasi;
    if (!berubah && !baruVerifikasi) return { ok: true, tidakBerubah: true, halaman: halamanKlien(lama) };

    const baru = { ...lama, teks, batasMatn, rev: rev + 1 };
    if (berubah) baru.dikoreksi = { oleh, nama: namaOleh, at: t, jumlah: ((lama.dikoreksi && lama.dikoreksi.jumlah) || 0) + 1 };
    if (cocok) baru.diverifikasi = { oleh, nama: namaOleh, at: t };
    else if (berubah) delete baru.diverifikasi; // teks berubah tanpa dicocokkan ulang: pernyataan "sudah dicocokkan" sebelumnya tidak berlaku lagi

    // Indeks pencarian: potongan yang memuat halaman ini, bila sudah dibangun. Belum ada = akan dibangun dari halaman yang sudah benar ini.
    let potongan = null;
    if (berubah) {
      const q = await tx.get(db.collection(koleksiCari(kid, m)).where('dari', '<=', seq).orderBy('dari', 'desc').limit(1));
      const d = q.docs[0];
      if (d) { const data = d.data(); const i = Array.isArray(data.s) ? data.s.indexOf(seq) : -1; if (i >= 0 && Array.isArray(data.t) && data.t.length === data.s.length) { data.t[i] = normalCari(teks); potongan = { ref: d.ref, data }; } }
    }

    const idRiwayat = `${idHalaman(seq)}_${t.replace(/\D/g, '')}_${Math.random().toString(36).slice(2, 7)}`;
    tx.set(halRef, baru);
    tx.set(db.doc(`kitab/${kid}/koreksi/${idRiwayat}`), {
      seq, hal: lama.hal, juz: lama.juz, jenis: berubah ? 'koreksi' : 'verifikasi', revDari: rev, at: t, oleh, namaOleh, catatan,
      teksLama: lama.teks, batasMatnLama: lama.batasMatn ?? null, teksBaru: teks, batasMatnBaru: batasMatn, cocok,
    });
    if (potongan) tx.set(potongan.ref, potongan.data);
    if (berubah) tx.update(metaRef, { koreksi: (mm.koreksi || 0) + 1, koreksiAt: t, koreksiOleh: oleh });
    return { ok: true, tidakBerubah: false, halaman: halamanKlien(baru) };
  });
}

/** Aksi `perpus-riwayat`: koreksi terbaru satu halaman (maks MAKS_RIWAYAT), terbaru dulu. Masukan: { kitabId, seq }. */
export async function aksiRiwayat(b, kid, m, pengguna) {
  if (!pengguna || !PERAN_KOREKSI.includes(pengguna.role)) tolak(403, 'FORBIDDEN_ROLE', 'Riwayat koreksi hanya untuk editor dan admin.');
  const { db } = await firestoreAdmin();
  const seq = bulat(b.seq, 1, m.jumlahHalaman, 'Urutan halaman');
  const snap = await db.collection(`kitab/${kid}/koreksi`).where('seq', '==', seq).get();
  const semua = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((x, y) => (x.at < y.at ? 1 : x.at > y.at ? -1 : 0));
  return {
    riwayat: semua.slice(0, MAKS_RIWAYAT).map((r) => ({
      id: r.id, jenis: r.jenis, at: r.at, namaOleh: r.namaOleh || '', catatan: r.catatan || '', cocok: r.cocok === true,
      teksLama: r.teksLama, batasMatnLama: r.batasMatnLama ?? null, teksBaru: r.teksBaru, batasMatnBaru: r.batasMatnBaru ?? null,
    })),
    jumlah: semua.length,
  };
}
