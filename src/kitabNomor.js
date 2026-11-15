// Penyesuaian nomor halaman cetak kitab oleh editor/admin (aksi `perpus-nomor` dan `perpus-nomor-riwayat`, dipanggil dari src/kitabBaca.js).
// Aturan hitungan ada di web/lib/nomorHalaman.js (satu sumber dengan layar). Nomor cetak (`hal`, `juz`) tersalin di empat tempat, jadi SATU transaksi menulis semuanya:
//   1. halaman      kitab/{id}/halaman[_rN]/pNNNNN   `hal`, `juz`, tanda `nomorAnomali` dihitung ulang, `nomorOp` (kunci ulangan), `nomorDisunting`; `rev` TIDAK naik (itu kunci koreksi teks)
//   2. daftar isi   kitab/{id}/daftar/isi[_rN]       `entri[].hal/juz` pada seq yang berubah; `suntingRev` tidak naik (labelnya bukan hasil suntingan judul)
//   3. indeks cari  kitab/{id}/cari[_rN]/cNNNNN      larik `h` dan `j` (nomor di hasil pencarian); teks tidak disentuh
//   4. metadata     kitab/{id}.nomorDisunting        penghitung; ikut kunci simpanan memori pencarian dan usulan daftar isi, jadi mesin lain tidak memakai nomor lama
//   + riwayat       kitab/{id}/nomorRiwayat/{id}     hanya tambah: nomor lama dan baru per halaman (dasar `pulih`)
// Tidak disalin ke soal: soal yang sudah ada menyimpan `hal` saat dibuat dan sengaja tidak berubah (docs/SKEMA-KITAB.md); nomor di soal lama tetap nomor yang dilihat penyusunnya.
// Maksimal MAKS_NOMOR_PER_PANGGILAN (250) halaman per proses: satu transaksi (maks 500 penulisan) yang harus selesai dalam batas waktu fungsi Vercel Hobby. Kitab lebih panjang dikerjakan
// beberapa proses berurutan (layar menyediakan tombol "Lanjutkan"). Belum diukur di Firestore sungguhan: bila sering kehabisan waktu, turunkan konstanta itu.
// Ulangan aman: klien mengirim `op` (kunci acak per percobaan); bila halaman pertama rentang sudah memuat `nomorOp` yang sama, proses dianggap sudah terjadi.
// Impor ulang ("timpa") mengganti seluruh halaman, jadi nomor suntingan ikut hilang (riwayat tetap ada). Layar impor memperingatkan admin lewat penghitung `nomorDisunting`.
import { ApiError } from './soalService.js';
import { firestoreAdmin } from './platform.js';
import { idHalaman, koleksiHalaman, koleksiCari, dokDaftarIsi, akhiran } from './kitabImpor.js';
import { PERAN_KOREKSI } from './kitabKoreksi.js';
import { batalkanDaftar } from './daftarKitab.js';
import { periksaOp, hitungNomor, jendelaBaca, MAKS_CATATAN_NOMOR, RE_ID_OP, RE_ID_RIWAYAT_NOMOR } from '../web/lib/nomorHalaman.js';

export const MAKS_RIWAYAT_NOMOR = 10;
const MAKS_TULIS = 480; // di bawah batas 500 penulisan per transaksi Firestore
const tolak = (status, kode, pesan) => { throw new ApiError(status, kode, pesan); };
const izinkan = (pengguna, untuk) => { if (!pengguna || !PERAN_KOREKSI.includes(pengguna.role)) tolak(403, 'FORBIDDEN_ROLE', `${untuk} hanya untuk editor dan admin.`); };

/** Pemeriksaan sebelum menghitung batas laju (route): masukan cacat tidak memakai jatah. */
export function validasiNomor(b, jumlahHalaman = 100000) {
  if (!b || typeof b !== 'object') tolak(422, 'NOMOR_INVALID', 'Permintaan tidak valid.');
  if (typeof b.op !== 'string' || !RE_ID_OP.test(b.op)) tolak(422, 'NOMOR_INVALID', 'Kunci proses (op) harus 8-40 huruf, angka, strip, atau garis bawah.');
  if (b.catatan !== undefined && b.catatan !== null && (typeof b.catatan !== 'string' || b.catatan.trim().length > MAKS_CATATAN_NOMOR)) tolak(422, 'NOMOR_INVALID', `Catatan harus berupa teks maksimal ${MAKS_CATATAN_NOMOR} karakter.`);
  if (b.jenis === 'pulih') {
    if (typeof b.riwayatId !== 'string' || !RE_ID_RIWAYAT_NOMOR.test(b.riwayatId)) tolak(422, 'NOMOR_INVALID', 'Riwayat yang akan dipulihkan tidak valid.');
    return;
  }
  const { galat } = periksaOp(b, jumlahHalaman);
  if (galat) tolak(422, 'NOMOR_INVALID', galat);
}

const salin = (x) => JSON.parse(JSON.stringify(x));

/**
 * Aksi `perpus-nomor`. Masukan: { kitabId, op, jenis: 'satu'|'geser'|'urut', dari, sampai?, hal | selisih | mulai, juz?, catatan?, sesuaiCetak? }
 *                          atau { kitabId, op, jenis: 'pulih', riwayatId, catatan? }.
 * `sesuaiCetak: true` (admin): kitab ini sekarang bernomor sesuai kitab cetak (menghapus peringatan "halaman virtual").
 * Keluaran: { ok, tidakBerubah, diulang?, jenis, dari, akhir, jumlah, halTerakhir, halaman: [{ seq, hal, juz, nomorAnomali }], riwayatId }.
 */
export async function aksiNomor(b, kid, m, pengguna, { sekarang = () => new Date().toISOString() } = {}) {
  izinkan(pengguna, 'Menyesuaikan nomor halaman kitab');
  const { db } = await firestoreAdmin();
  if (typeof b.op !== 'string' || !RE_ID_OP.test(b.op)) tolak(422, 'NOMOR_INVALID', 'Kunci proses (op) harus 8-40 huruf, angka, strip, atau garis bawah.');
  const catatan = b.catatan === undefined || b.catatan === null ? '' : b.catatan;
  if (typeof catatan !== 'string') tolak(422, 'NOMOR_INVALID', 'Catatan harus berupa teks.');
  if (catatan.trim().length > MAKS_CATATAN_NOMOR) tolak(422, 'NOMOR_INVALID', `Catatan terlalu panjang (maksimal ${MAKS_CATATAN_NOMOR} karakter).`);
  if (b.sesuaiCetak !== undefined && typeof b.sesuaiCetak !== 'boolean') tolak(422, 'NOMOR_INVALID', '`sesuaiCetak` harus true atau false.');
  if (b.sesuaiCetak === true && pengguna.role !== 'admin') tolak(403, 'FORBIDDEN_ROLE', 'Menandai penomoran sesuai kitab cetak hanya untuk admin.');
  const pulih = b.jenis === 'pulih';
  let opKlien = null;
  if (!pulih) { const r = periksaOp(b, m.jumlahHalaman); if (r.galat) tolak(422, 'NOMOR_INVALID', r.galat); opKlien = r.op; }
  else validasiNomor(b);

  const metaRef = db.doc(`kitab/${kid}`);
  const daftarRef = db.doc(dokDaftarIsi(kid, m));
  const riwayatRef = pulih ? db.doc(`kitab/${kid}/nomorRiwayat/${b.riwayatId}`) : null;
  const oleh = pengguna.uid; const namaOleh = String(pengguna.nama || '').slice(0, 120);
  const t = sekarang();
  let batalkanRingkasan = false;

  const hasil = await db.runTransaction(async (tx) => {
    // ---- semua bacaan dulu (aturan transaksi Firestore) ----
    const [metaSnap, daftarSnap, riwayatSnap] = await Promise.all([tx.get(metaRef), tx.get(daftarRef), riwayatRef ? tx.get(riwayatRef) : Promise.resolve(null)]);
    // Impor ulang bisa mengalihkan ruang penyimpanan setelah pemanggil membaca metadata: jangan menulis ke ruang yang sudah tidak dipakai.
    const mm = metaSnap.exists ? metaSnap.data() : null;
    if (!mm || mm.aktif !== true || mm.status !== 'siap' || akhiran(mm) !== akhiran(m) || (mm.revisi || 1) !== (m.revisi || 1)) {
      tolak(409, 'KITAB_BERUBAH', 'Kitab ini baru saja diimpor ulang atau dinonaktifkan. Muat ulang halaman lalu ulangi penyesuaian.');
    }

    let op = opKlien; let lamaRiwayat = null;
    if (pulih) {
      if (!riwayatSnap.exists) tolak(404, 'NOMOR_RIWAYAT_TIDAK_ADA', 'Riwayat penyesuaian itu tidak ditemukan.');
      lamaRiwayat = riwayatSnap.data();
      if (lamaRiwayat.dipulihkan) tolak(409, 'NOMOR_SUDAH_DIPULIHKAN', 'Penyesuaian ini sudah dipulihkan.');
      if (!Array.isArray(lamaRiwayat.lama) || !Array.isArray(lamaRiwayat.baru) || !lamaRiwayat.lama.length) tolak(409, 'NOMOR_TIDAK_BISA_DIPULIHKAN', 'Riwayat ini tidak memuat nomor lama.');
      op = { jenis: 'tetap', tetapan: lamaRiwayat.lama };
    }

    const seqs = pulih ? lamaRiwayat.lama.map((x) => x[0]) : [op.dari, op.sampai];
    const dari = Math.min(...seqs); const sampai = Math.max(...seqs);
    const w = jendelaBaca(dari, sampai, m.jumlahHalaman);
    const ids = []; for (let s = w.dari; s <= w.sampai; s++) ids.push(s);
    const snaps = await Promise.all(ids.map((s) => tx.get(db.doc(`${koleksiHalaman(kid, m)}/${idHalaman(s)}`))));
    const halaman = snaps.filter((x) => x.exists).map((x) => ({ ...x.data(), _ref: x.ref })).sort((x, y) => x.seq - y.seq);
    const cari = koleksiCari(kid, m);
    const [awalQ, tengahQ] = await Promise.all([
      tx.get(db.collection(cari).where('dari', '<=', dari).orderBy('dari', 'desc').limit(1)),
      tx.get(db.collection(cari).where('dari', '>', dari).where('dari', '<=', sampai + 12)),
    ]);

    // ---- keputusan ----
    if (!pulih && halaman.length && halaman.find((h) => h.seq === op.dari) && halaman.find((h) => h.seq === op.dari).nomorOp === b.op) {
      return { ok: true, tidakBerubah: true, diulang: true, jenis: op.jenis, dari: op.dari, akhir: op.sampai, jumlah: 0, halTerakhir: null, halaman: [], riwayatId: null };
    }
    if (pulih) { // urutan pemulihan: nomor sekarang harus masih sama dengan hasil penyesuaian yang dipulihkan
      const kini = new Map(halaman.map((h) => [h.seq, h]));
      for (const [s, hal, juz] of lamaRiwayat.baru) {
        const h = kini.get(s);
        if (!h || h.hal !== hal || h.juz !== juz) tolak(409, 'NOMOR_BERUBAH', `Nomor halaman urutan ${s} sudah diubah lagi setelah penyesuaian ini. Pulihkan penyesuaian yang lebih baru lebih dulu.`);
      }
    }
    const h = hitungNomor(halaman, op);
    if (h.galat) tolak(422, 'NOMOR_INVALID', h.galat);
    const jumlahTulis = h.ubah.length + 3 + (awalQ.docs.length + tengahQ.docs.length);
    if (jumlahTulis > MAKS_TULIS) tolak(422, 'NOMOR_INVALID', 'Rentang ini terlalu besar untuk satu proses. Kecilkan rentangnya.');
    const ubahLabel = h.ubah.filter((u) => u.labelBerubah);
    const tandaCetak = b.sesuaiCetak === true && (mm.halamanVirtual === true || mm.penomoranSesuaiCetak !== true);
    if (!ubahLabel.length && !h.ubah.length && !tandaCetak) {
      return { ok: true, tidakBerubah: true, jenis: op.jenis, dari, akhir: h.akhir, jumlah: 0, halTerakhir: h.halTerakhir, halaman: [], riwayatId: null };
    }

    // ---- penulisan ----
    const peta = new Map(h.ubah.map((u) => [u.seq, u]));
    for (const hal of halaman) {
      const u = peta.get(hal.seq); if (!u) continue;
      const { _ref, ...dok } = hal;
      const baru = { ...dok, hal: u.hal, juz: u.juz };
      if (u.nomorAnomali) baru.nomorAnomali = u.nomorAnomali; else delete baru.nomorAnomali;
      if (u.labelBerubah) { baru.nomorOp = b.op; baru.nomorDisunting = { oleh, nama: namaOleh, at: t }; }
      tx.set(_ref, baru);
    }
    if (daftarSnap.exists && Array.isArray(daftarSnap.data().entri)) {
      let berubah = false;
      const entri = daftarSnap.data().entri.map((e) => { const u = peta.get(e.seq); if (!u || !u.labelBerubah || (e.hal === u.hal && e.juz === u.juz)) return e; berubah = true; return { ...e, hal: u.hal, juz: u.juz }; });
      if (berubah) tx.update(daftarRef, { entri });
    }
    for (const d of [...awalQ.docs, ...tengahQ.docs]) {
      const x = d.data();
      if (!Array.isArray(x.s)) continue;
      let berubah = false; const hh = Array.isArray(x.h) ? [...x.h] : x.s.map(() => 0); const jj = Array.isArray(x.j) ? [...x.j] : x.s.map(() => 1);
      x.s.forEach((s, i) => { const u = peta.get(s); if (u && u.labelBerubah && (hh[i] !== u.hal || jj[i] !== u.juz)) { hh[i] = u.hal; jj[i] = u.juz; berubah = true; } });
      if (berubah) tx.update(d.ref, { h: hh, j: jj });
    }
    const idRiwayat = `${t.replace(/\D/g, '')}_${Math.random().toString(36).slice(2, 7)}`;
    tx.set(db.doc(`kitab/${kid}/nomorRiwayat/${idRiwayat}`), {
      at: t, oleh, namaOleh, catatan: catatan.trim(), op: b.op, jenis: pulih ? 'pulih' : op.jenis, dari, sampai: h.akhir, jumlah: ubahLabel.length,
      parameter: pulih ? { riwayatId: b.riwayatId } : salin(Object.fromEntries(Object.entries(op).filter(([k]) => !['jenis', 'dari', 'sampai'].includes(k)))),
      lama: ubahLabel.map((u) => [u.seq, u.halLama, u.juzLama]), baru: ubahLabel.map((u) => [u.seq, u.hal, u.juz]),
    });
    if (pulih) tx.update(riwayatRef, { dipulihkan: { oleh, nama: namaOleh, at: t } });
    const metaBaru = { nomorDisunting: (mm.nomorDisunting || 0) + 1, nomorDisuntingAt: t, nomorDisuntingOleh: oleh };
    if (tandaCetak) { metaBaru.halamanVirtual = false; metaBaru.penomoranSesuaiCetak = true; batalkanRingkasan = true; }
    tx.update(metaRef, metaBaru);
    return {
      ok: true, tidakBerubah: false, jenis: pulih ? 'pulih' : op.jenis, dari, akhir: h.akhir, jumlah: ubahLabel.length, halTerakhir: h.halTerakhir,
      halaman: h.ubah.map((u) => ({ seq: u.seq, hal: u.hal, juz: u.juz, nomorAnomali: u.nomorAnomali })), riwayatId: idRiwayat, sesuaiCetak: tandaCetak,
    };
  });
  if (batalkanRingkasan) await batalkanDaftar(db); // daftar kitab untuk pemilih memuat `halamanVirtual`
  return hasil;
}

/** Aksi `perpus-nomor-riwayat`: penyesuaian terbaru (maks MAKS_RIWAYAT_NOMOR), terbaru dulu. Masukan: { kitabId }. */
export async function aksiNomorRiwayat(b, kid, m, pengguna) {
  izinkan(pengguna, 'Riwayat nomor halaman');
  const { db } = await firestoreAdmin();
  const snap = await db.collection(`kitab/${kid}/nomorRiwayat`).get();
  const semua = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((x, y) => (x.at < y.at ? 1 : x.at > y.at ? -1 : 0));
  const urutSama = (x) => (Array.isArray(x.lama) && x.lama.length ? { awal: { seq: x.lama[0][0], dari: x.lama[0][1], jadi: x.baru[0][1] }, akhir: { seq: x.lama[x.lama.length - 1][0], dari: x.lama[x.lama.length - 1][1], jadi: x.baru[x.baru.length - 1][1] } } : null);
  return {
    riwayat: semua.slice(0, MAKS_RIWAYAT_NOMOR).map((r) => ({
      id: r.id, at: r.at, namaOleh: r.namaOleh || '', jenis: r.jenis, dari: r.dari, sampai: r.sampai, jumlah: r.jumlah || 0, catatan: r.catatan || '',
      parameter: r.parameter || {}, dipulihkan: !!r.dipulihkan, sampel: urutSama(r),
    })),
    jumlah: semua.length,
  };
}
