// Serah-terima antartab lewat draf perangkat: tab asal menyiapkan filter dan pilihan, tab tujuan membacanya saat dibuka.
// Murni (tanpa DOM): mengembalikan daftar {nama, nilai} untuk disimpan. Nama draf HARUS sama dengan yang dipakai tab tujuan di App.jsx
// (dijaga oleh test/serahTerima.test.js).

export const FILTER_KOSONG = { mapel: '', tingkat: '', kelas: '', periode: '' };

const idSah = (ids) => [...new Set((ids || []).filter((x) => typeof x === 'string' && x))];

/** Pilih soal di Export ('export') atau Fokus Ujian & Kisi-kisi ('fokus'). `prefLama` = isi draf prefs yang sudah ada (dipertahankan). */
export function rencanaPilihSoal(tujuan, ids, prefLama) {
  const picked = idSah(ids);
  if (!picked.length) return null;
  const lama = prefLama && typeof prefLama === 'object' ? prefLama : {};
  if (tujuan === 'export') return [{ nama: 'exportFilter', nilai: { ...FILTER_KOSONG } }, { nama: 'exportPrefs', nilai: { ...lama, picked } }];
  if (tujuan === 'fokus') return [{ nama: 'kisiFilter', nilai: { ...FILTER_KOSONG } }, { nama: 'kisiPrefs', nilai: { ...lama, picked } }];
  return null;
}

/** Buka Bank Soal pada satu paket, semua status. */
export const rencanaBukaPaket = (paketId) => (typeof paketId === 'string' && paketId
  ? [{ nama: 'bankFilter', nilai: { ...FILTER_KOSONG, status: '', paket: paketId } }] : null);
