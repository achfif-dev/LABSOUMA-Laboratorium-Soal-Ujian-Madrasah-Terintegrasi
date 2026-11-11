// Langkah 2 pipeline soal: KISI-KISI OLEH KODE. Memilih fakta untuk tiap slot (bentuk x level) dan menyebar huruf kunci,
// tanpa melibatkan model, supaya sebaran materi, level, dan kunci bisa diperiksa dan diulang. Fungsi murni (tanpa jaringan, tanpa DOM).
// Dipakai klien: hasil ekstrak fakta (src/faktaService.js) + daftar slot -> rencana; tiap butir rencana lalu dikirim ke /api/generate
// dengan `faktaTerikat` = fakta yang dipilih.

// Jenis fakta yang paling cocok per level (indeks lebih kecil = lebih cocok).
const JENIS_COCOK = {
  L1: ['definisi', 'bilangan', 'hukum', 'syarat', 'dalil', 'perbedaan_pendapat'],
  L2: ['hukum', 'syarat', 'bilangan', 'definisi', 'dalil', 'perbedaan_pendapat'],
  L3: ['syarat', 'perbedaan_pendapat', 'hukum', 'dalil', 'bilangan', 'definisi'],
};
const URUT = { L1: 1, L2: 2, L3: 3 };
const BENTUK_KUNCI_HURUF = { pilgan: 'ABCDE', lanjutan: 'ABCDE', benarsalah: 'AB' };

/** Nilai kecocokan fakta untuk satu level: makin kecil makin cocok. */
export function skorCocok(fakta, level) {
  const selisih = Math.abs((URUT[fakta.tingkat_cocok] || 1) - (URUT[level] || 1));
  const idx = (JENIS_COCOK[level] || JENIS_COCOK.L1).indexOf(fakta.jenis);
  return selisih * 10 + (idx < 0 ? 9 : idx);
}

/** Huruf kunci tersebar merata (pool diputar lalu diacak), per bentuk. benarsalah: A=Benar, B=Salah. */
function sebarKunci(slot, rand) {
  const hasil = new Array(slot.length).fill('');
  for (const b of Object.keys(BENTUK_KUNCI_HURUF)) {
    const idx = slot.map((s, i) => (s.bentuk === b ? i : -1)).filter((i) => i >= 0);
    if (!idx.length) continue;
    const huruf = BENTUK_KUNCI_HURUF[b]; const pool = [];
    while (pool.length < idx.length) pool.push(...huruf);
    const ambil = pool.slice(0, idx.length);
    for (let i = ambil.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [ambil[i], ambil[j]] = [ambil[j], ambil[i]]; }
    idx.forEach((pos, k) => { hasil[pos] = ambil[k]; });
  }
  return hasil;
}

/**
 * @param {{id:string, jenis:string, tingkat_cocok:string}[]} fakta  hasil ekstrak (sudah terverifikasi kode)
 * @param {{bentuk:string, level:'L1'|'L2'|'L3'}[]} slot  permintaan: satu entri per butir soal
 * @param {() => number} [rand]
 * @returns {{rencana: {indeks:number, bentuk:string, level:string, faktaId:string, kunciTarget:string, faktaDipakaiUlang:boolean}[], catatan:string[]}}
 *   Tiap fakta dipakai sekali sebelum ada yang dipakai ulang. Pemakaian ulang ditandai (`faktaDipakaiUlang`) dan dicatat, tidak disembunyikan.
 */
export function rencanaKisi(fakta, slot, rand = Math.random) {
  const catatan = [];
  if (!Array.isArray(fakta) || !fakta.length) return { rencana: [], catatan: ['Tidak ada fakta; ekstrak fakta dulu.'] };
  if (!Array.isArray(slot) || !slot.length) return { rencana: [], catatan: ['Tidak ada slot soal.'] };
  const kunci = sebarKunci(slot, rand);
  const pakai = new Map(fakta.map((f) => [f.id, 0]));
  // Slot level tertinggi dipilihkan dulu: fakta yang cocok untuk L3 paling sedikit, jangan sampai dihabiskan slot L1.
  const urutan = slot.map((s, i) => i).sort((a, b) => (URUT[slot[b].level] || 1) - (URUT[slot[a].level] || 1) || a - b);
  const hasil = new Array(slot.length);
  for (const i of urutan) {
    const s = slot[i];
    const min = Math.min(...pakai.values());
    const kandidat = fakta.filter((f) => pakai.get(f.id) === min);
    kandidat.sort((a, b) => skorCocok(a, s.level) - skorCocok(b, s.level) || rand() - 0.5);
    const f = kandidat[0];
    const ulang = pakai.get(f.id) > 0;
    pakai.set(f.id, pakai.get(f.id) + 1);
    hasil[i] = { indeks: i, bentuk: s.bentuk, level: s.level, faktaId: f.id, kunciTarget: kunci[i], faktaDipakaiUlang: ulang };
    if (skorCocok(f, s.level) >= 10) catatan.push(`Butir ${i + 1} (${s.level}): fakta ${f.id} lebih cocok untuk ${f.tingkat_cocok}; periksa hasilnya.`);
  }
  const ulangN = hasil.filter((h) => h.faktaDipakaiUlang).length;
  if (ulangN) catatan.push(`${ulangN} butir memakai fakta yang sudah dipakai butir lain (fakta hanya ${fakta.length}, butir ${slot.length}). Tambah teks atau kurangi jumlah butir agar tidak kembar.`);
  return { rencana: hasil, catatan };
}
