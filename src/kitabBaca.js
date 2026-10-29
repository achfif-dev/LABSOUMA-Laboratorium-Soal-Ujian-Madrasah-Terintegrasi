// Membaca perpustakaan kitab untuk pemilih kitab/bab/halaman di Penyusunan Soal dan Paket Dauri (semua peran pemakai alat).
// Lewat server (Admin SDK), bukan Firestore klien: berjalan tanpa menerbitkan aturan baru dan ustadz ikut terlayani.
// Hanya kitab berstatus "siap" dan aktif yang terbaca. Tanpa pembatas laju karena pembatas laju sendiri menulis satu dokumen per panggilan
// (menggerus kuota tulis Spark); gantinya, setiap panggilan dibatasi 10 halaman dan klien menyimpan hasilnya di memori.
import { ApiError } from './soalService.js';
import { firestoreAdmin } from './platform.js';
import { validasiKitabId, idHalaman } from './kitabImpor.js';

export const MAKS_HALAMAN_BACA = 10;
const tolak = (status, kode, pesan) => { throw new ApiError(status, kode, pesan); };

const ringkas = (id, d) => ({
  id, judul: d.judul, judulLatin: d.judulLatin, pengarang: d.pengarang || '', fan: d.fan || '', mazhab: d.mazhab || '',
  jumlahHalaman: d.jumlahHalaman, jumlahJuz: d.jumlahJuz || 1, bentukMatn: d.bentukMatn, berharakat: d.berharakat === true,
});
const dokHalaman = (d) => ({
  id: idHalaman(d.seq), seq: d.seq, juz: d.juz, hal: d.hal, teks: d.teks, batasMatn: d.batasMatn ?? null,
  ...(d.bab ? { bab: d.bab } : {}), ...(d.nomorAnomali ? { nomorAnomali: d.nomorAnomali } : {}),
});
const bulat = (v, min, maks, nama) => {
  if (!Number.isInteger(v) || v < min || v > maks) tolak(422, 'PERPUS_INVALID', `${nama} harus bilangan bulat ${min}-${maks}.`);
  return v;
};

export async function aksiBaca(body) {
  const b = body && typeof body === 'object' ? body : {};
  const { db } = await firestoreAdmin();

  if (b.aksi === 'perpus-daftar') {
    const snap = await db.collection('kitab').get();
    const kitab = snap.docs.filter((d) => d.data().aktif === true && d.data().status === 'siap').map((d) => ringkas(d.id, d.data()))
      .sort((x, y) => String(x.judulLatin).localeCompare(String(y.judulLatin)));
    return { kitab };
  }

  const kid = validasiKitabId(b.kitabId);
  const meta = await db.doc(`kitab/${kid}`).get();
  if (!meta.exists || meta.data().aktif !== true || meta.data().status !== 'siap') tolak(404, 'KITAB_TIDAK_ADA', 'Kitab tidak ditemukan atau belum diaktifkan admin.');
  const m = meta.data();

  if (b.aksi === 'perpus-isi') {
    const isi = await db.doc(`kitab/${kid}/daftar/isi`).get();
    return { kitab: ringkas(kid, m), entri: isi.exists ? isi.data().entri || [] : [] };
  }

  if (b.aksi === 'perpus-halaman') {
    let docs = [];
    if (b.hal !== undefined) { // cari menurut nomor halaman cetak (bisa lebih dari satu: nomor cetak tidak unik)
      const hal = bulat(b.hal, 0, 99999, 'Nomor halaman');
      const snap = await db.collection(`kitab/${kid}/halaman`).where('hal', '==', hal).limit(MAKS_HALAMAN_BACA).get();
      docs = snap.docs.map((d) => d.data());
      if (b.juz !== undefined) docs = docs.filter((d) => d.juz === b.juz);
    } else {
      const dari = bulat(b.dariSeq, 1, m.jumlahHalaman, 'Urutan awal');
      const sampai = b.sampaiSeq === undefined ? dari : bulat(b.sampaiSeq, dari, dari + MAKS_HALAMAN_BACA - 1, 'Urutan akhir');
      const ids = []; for (let s = dari; s <= Math.min(sampai, m.jumlahHalaman); s++) ids.push(idHalaman(s));
      const snaps = await Promise.all(ids.map((id) => db.doc(`kitab/${kid}/halaman/${id}`).get()));
      docs = snaps.filter((s) => s.exists).map((s) => s.data());
    }
    docs.sort((x, y) => x.seq - y.seq);
    return { kitab: ringkas(kid, m), halaman: docs.map(dokHalaman) };
  }

  return tolak(400, 'AKSI_TIDAK_DIKENAL', 'Aksi tidak dikenal.');
}
