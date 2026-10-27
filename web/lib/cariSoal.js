// Pencarian teks di Bank Soal: Latin tidak peka huruf besar-kecil; Arab tidak peka harakat, tatwil, dan variasi alif/ya/ta marbuthah.
// Semua kata pencarian harus ditemukan (AND), di bidang mana pun yang berisi teks soal.

const HARAKAT = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

export const normalisasi = (s) => String(s ?? '')
  .normalize('NFKC').replace(HARAKAT, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .toLowerCase();

const BIDANG = ['pertanyaan', 'stimulus', 'pembahasan', 'indikator', 'teks', 'nama', 'bab', 'mapel', 'jawaban', 'authorName'];

/** Gabungan teks yang dicari untuk satu soal (sudah dinormalisasi). */
export function jerami(q) {
  const o = q && q.opsi && typeof q.opsi === 'object' ? Object.values(q.opsi) : [];
  return normalisasi([...BIDANG.map((k) => q && q[k]), ...o].filter(Boolean).join(' \n '));
}

/** Saring daftar soal menurut kata pencarian. Kosong = semua. */
export function saring(daftar, kata) {
  const kt = normalisasi(kata).split(/\s+/).filter(Boolean);
  if (!kt.length) return daftar;
  return daftar.filter((q) => { const j = jerami(q); return kt.every((k) => j.includes(k)); });
}
