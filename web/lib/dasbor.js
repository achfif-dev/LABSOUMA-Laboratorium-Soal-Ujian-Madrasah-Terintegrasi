// Ringkasan untuk Dasbor admin yang dihitung di browser dari data yang sudah dimuat (antrean review) dan format tampilan.
// Fungsi murni, diuji di test/dasbor.test.js.

export const HARI_WASPADA = 3;  // soal pending lebih lama dari ini ditandai kuning
export const HARI_LEWAT = 7;    // ... dan merah

const msDari = (v) => {
  if (v && typeof v.toMillis === 'function') { try { return v.toMillis(); } catch (e) { return 0; } }
  const t = typeof v === 'string' ? Date.parse(v) : NaN;
  return Number.isNaN(t) ? 0 : t;
};

/** Soal yang hanya bisa disetujui editor dengan catatan alasan (cermin aturan Firestore `perluAlasan`). */
export const perluAlasan = (q) => !!q && !!q.ai && (q.ai.verifikasi === 'gagal' || q.ai.buta === 'beda');

export function ringkasAntrean(pending, now = Date.now()) {
  const daftar = (Array.isArray(pending) ? pending : []).map((q) => {
    const ms = msDari(q.updatedAt);
    return { q, ms, hari: ms ? Math.max(0, (now - ms) / 86_400_000) : 0 };
  }).sort((a, b) => (a.ms || Infinity) - (b.ms || Infinity)); // tertua dulu; tanpa waktu di belakang
  const perPenyusun = new Map();
  for (const { q } of daftar) { const n = q.authorName || 'Tanpa nama'; perPenyusun.set(n, (perPenyusun.get(n) || 0) + 1); }
  return {
    total: daftar.length,
    tertuaHari: daftar.length && daftar[0].ms ? daftar[0].hari : 0,
    waspada: daftar.filter((x) => x.hari >= HARI_WASPADA && x.hari < HARI_LEWAT).length,
    lewat: daftar.filter((x) => x.hari >= HARI_LEWAT).length,
    perluAlasan: daftar.filter((x) => perluAlasan(x.q)).length,
    perPenyusun: [...perPenyusun].map(([nama, jumlah]) => ({ nama, jumlah })).sort((a, b) => b.jumlah - a.jumlah || a.nama.localeCompare(b.nama)),
    tertua: daftar.slice(0, 5).map(({ q, hari }) => ({ id: q.id, pertanyaan: String(q.pertanyaan || '').replace(/\s+/g, ' ').slice(0, 120), nama: q.nama || '', authorName: q.authorName || '', hari, perluAlasan: perluAlasan(q) })),
  };
}

export const tandaUmur = (hari) => (hari >= HARI_LEWAT ? 'lewat' : hari >= HARI_WASPADA ? 'waspada' : 'baru');

export function teksUmur(hari) {
  if (!(hari > 0)) return 'baru saja';
  if (hari < 1 / 24) return `${Math.max(1, Math.round(hari * 1440))} menit`;
  if (hari < 1) return `${Math.round(hari * 24)} jam`;
  return `${Math.floor(hari)} hari`;
}

export function teksSisaWaktu(detik) {
  const d = Math.max(0, Math.floor(detik));
  const j = Math.floor(d / 3600); const m = Math.floor((d % 3600) / 60);
  return j > 0 ? `${j} jam ${m} menit` : `${Math.max(1, m)} menit`;
}
