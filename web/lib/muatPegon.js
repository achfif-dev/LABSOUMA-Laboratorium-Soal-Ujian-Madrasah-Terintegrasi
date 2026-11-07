// Mesin Pegon (web/lib/pegon.js, ±250 KB) dimuat malas: tidak ikut unduhan awal. Setelah dimuat ia dipasang sebagai window.Pegon,
// sama seperti sebelumnya, sehingga kode yang membaca window.Pegon tidak berubah. Komponen yang membutuhkannya dibungkus denganPegon (ui.jsx).
let janji = null;
let tertunda = null; // dokumen kamus bersama yang tiba dari Firestore sebelum mesin Pegon selesai dimuat

export const pegonSiap = () => !!(typeof window !== 'undefined' && window.Pegon);

export const muatPegon = () => {
  if (pegonSiap()) return Promise.resolve(window.Pegon);
  if (!janji) {
    janji = import('./pegon.js').then((m) => {
      window.Pegon = m;
      if (tertunda) { const d = tertunda; tertunda = null; m.kamus.muatBersama(d); }
      return m;
    }).catch(() => { janji = null; throw new Error('Mesin Pegon gagal dimuat. Periksa sambungan internet lalu coba lagi.'); });
  }
  return janji;
};

// Kamus bersama dari Firestore: diterapkan segera bila mesin siap, bila belum, snapshot terbaru ditahan lalu diterapkan saat mesin dimuat.
export const kamusBersamaMasuk = (docs) => {
  if (pegonSiap()) window.Pegon.kamus.muatBersama(docs); else tertunda = docs;
};
