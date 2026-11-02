// Titik simpan hasil OCR per halaman di IndexedDB peramban (bukan Firestore: gratis, tanpa kuota tulis).
// Kunci simpanan = identitas berkas + aksara OCR. Hasil dibuang setelah impor berhasil, atau otomatis setelah UMUR_MAKS_MS.
// Semua fungsi aman dipanggil di lingkungan tanpa IndexedDB (mode privat, Node): bukaSimpananOcr mengembalikan null.
export const UMUR_MAKS_MS = 14 * 24 * 3600 * 1000;
const NAMA_DB = 'labsouma-ocr'; const TOKO = 'hal';

export const kunciBerkas = (f, aksara = '') => `${String(f.name).slice(0, 120)}|${f.size}|${f.lastModified || 0}|${aksara}`;

const janji = (req) => new Promise((ok, gagal) => { req.onsuccess = () => ok(req.result); req.onerror = () => gagal(req.error); });

/** @returns {Promise<{ambil:Function, simpan:Function, hapus:Function, jumlah:Function}|null>} */
export async function bukaSimpananOcr(kunci, { idb = typeof indexedDB !== 'undefined' ? indexedDB : null, sekarang = Date.now } = {}) {
  if (!idb) return null;
  let db;
  try {
    db = await new Promise((ok, gagal) => {
      const r = idb.open(NAMA_DB, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore(TOKO); };
      r.onsuccess = () => ok(r.result); r.onerror = () => gagal(r.error); r.onblocked = () => gagal(new Error('diblokir'));
    });
  } catch { return null; }
  const toko = (mode) => db.transaction(TOKO, mode).objectStore(TOKO);
  const k = (i) => `${kunci}#${String(i).padStart(6, '0')}`;
  const rentang = () => (typeof IDBKeyRange !== 'undefined' ? IDBKeyRange.bound(`${kunci}#`, `${kunci}#\uffff`) : null);
  try { // buang entri kedaluwarsa (semua kunci), sekali per pembukaan
    await new Promise((ok) => {
      const req = toko('readwrite').openCursor();
      req.onsuccess = () => { const c = req.result; if (!c) return ok(); if (c.value && sekarang() - c.value.t > UMUR_MAKS_MS) c.delete(); c.continue(); };
      req.onerror = () => ok();
    });
  } catch { /* abaikan */ }
  return {
    ambil: async (i) => { try { const v = await janji(toko('readonly').get(k(i))); return v && typeof v.teks === 'string' ? { teks: v.teks, kualitas: v.kualitas } : undefined; } catch { return undefined; } },
    simpan: async (i, r) => { await janji(toko('readwrite').put({ teks: String(r.teks || ''), kualitas: r.kualitas || '', t: sekarang() }, k(i))); },
    jumlah: async () => { try { const r = rentang(); return await janji(r ? toko('readonly').count(r) : toko('readonly').count()); } catch { return 0; } },
    hapus: async () => { try { const r = rentang(); if (r) await janji(toko('readwrite').delete(r)); } catch { /* abaikan */ } },
  };
}
