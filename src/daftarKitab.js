// Daftar kitab aktif untuk pemilih kitab dan Tanya Kitab, dibaca murah.
// Sebelumnya setiap panggilan membaca SELURUH koleksi `kitab` (100 kitab = 100 pembacaan per panggilan, dari jatah 50 ribu per hari paket Spark).
// Sekarang tiga lapis: (1) memori instance (60 detik), (2) satu dokumen ringkasan `kitab_ringkas/daftar` (1 pembacaan, sah 15 menit),
// (3) baru membaca koleksi `kitab` dan menulis ulang ringkasannya. Impor, otoritas, dan aktif/nonaktif membatalkan ringkasan (`batalkanDaftar`).
// Dokumen ringkasan hanya ditulis dan dibaca Admin SDK (tanpa aturan Firestore = tertutup bagi klien).
import { normalOtoritas } from '../web/lib/otoritas.js';

export const DOK_RINGKAS = 'kitab_ringkas/daftar';
export const TTL_MEMORI_MS = 60_000;
export const TTL_DOKUMEN_MS = 15 * 60_000;
const VERSI_RINGKAS = 1;
let memori = new WeakMap(); // db -> { at, kitab } (per instance Firestore: produksi hanya punya satu; tes memakai banyak)

/** Ringkasan satu kitab untuk klien (tanpa uid penetap otoritas). */
export const ringkas = (id, d) => ({
  id, judul: d.judul, judulLatin: d.judulLatin, pengarang: d.pengarang || '', fan: d.fan || '', mazhab: d.mazhab || '',
  jumlahHalaman: d.jumlahHalaman, jumlahJuz: d.jumlahJuz || 1, bentukMatn: d.bentukMatn, berharakat: d.berharakat === true,
  halamanVirtual: d.halamanVirtual === true, sumberJenis: (d.sumber && d.sumber.jenis) || '', ocrHalaman: d.ocrHalaman || 0,
  otoritas: (({ status, akidah, catatan }) => ({ status, akidah, catatan }))(normalOtoritas(d.otoritas)),
  bahasa: d.bahasa || 'ar', aksara: d.aksara || 'arab',
});

const urut = (a, b) => String(a.judulLatin).localeCompare(String(b.judulLatin));

/** Daftar kitab aktif dan siap (terurut menurut nama Latin). */
export async function daftarAktif(db, { sekarang = Date.now } = {}) {
  const t = sekarang();
  const m0 = memori.get(db);
  if (m0 && t - m0.at < TTL_MEMORI_MS) return m0.kitab;
  try {
    const dok = await db.doc(DOK_RINGKAS).get();
    if (dok.exists) {
      const x = dok.data();
      if (x.versi === VERSI_RINGKAS && Array.isArray(x.kitab) && typeof x.at === 'number' && t - x.at < TTL_DOKUMEN_MS) {
        memori.set(db, { at: t, kitab: x.kitab });
        return x.kitab;
      }
    }
  } catch { /* ringkasan tidak terbaca: bangun dari koleksi */ }
  const snap = await db.collection('kitab').get();
  const kitab = snap.docs.filter((d) => d.data().aktif === true && d.data().status === 'siap').map((d) => ringkas(d.id, d.data())).sort(urut);
  const bersih = JSON.parse(JSON.stringify(kitab)); // buang undefined (ditolak Firestore)
  try { await db.doc(DOK_RINGKAS).set({ versi: VERSI_RINGKAS, at: t, kitab: bersih }); } catch { /* ringkasan hanya penghemat bacaan */ }
  memori.set(db, { at: t, kitab: bersih });
  return bersih;
}

/** Dipanggil setelah metadata kitab berubah (impor, otoritas, aktif/nonaktif). Instance lain menyusul paling lama TTL_MEMORI_MS. */
export async function batalkanDaftar(db) {
  memori.delete(db);
  try { await db.doc(DOK_RINGKAS).delete(); } catch { /* sudah tidak ada atau tidak bisa dihapus: TTL 15 menit tetap membatasi */ }
}

export const _uji = { reset: () => { memori = new WeakMap(); } };
