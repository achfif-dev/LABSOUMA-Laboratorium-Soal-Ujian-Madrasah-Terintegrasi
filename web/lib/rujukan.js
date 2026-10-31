// Rujukan soal ke halaman kitab asalnya di perpustakaan (tautan balik). Murni (tanpa React/Firestore): dipakai browser, server (backup, persetujuan), dan tes.
// Tiga bidang opsional di dokumen soal (docs/SKEMA-KITAB.md):
//   kitabId     = id kitab di koleksi `kitab` (mis. "fathul-muin")
//   halId       = id halaman AWAL ("p00040" = urutan ke-40, kunci sebenarnya; BUKAN nomor cetak)
//   halIdAkhir  = id halaman AKHIR bila teks soal mencakup beberapa halaman (opsional; sama dengan halId bila satu halaman)
// `teks`, `nama`, `juz`, `hal` tetap disalin ke soal: soal yang sudah disetujui tidak berubah bila teks kitab dikoreksi. Tautan ini hanya penunjuk.
export const RE_KITAB_ID = /^[a-z0-9][a-z0-9-]{1,59}$/;
export const RE_HAL_ID = /^p\d{5}$/;
export const MAKS_HALAMAN_RUJUKAN = 20; // dibaca server saat mencocokkan teks soal dengan halaman sumber

export const idHalaman = (seq) => `p${String(seq).padStart(5, '0')}`;
export const seqDariHalId = (id) => (typeof id === 'string' && RE_HAL_ID.test(id) ? parseInt(id.slice(1), 10) : null);
export const RUJUKAN_KOSONG = Object.freeze({ kitabId: '', halId: '', halIdAkhir: '' });

/** Rujukan dari halaman terpilih. `halaman` = objek dengan `seq` (hasil perpus-halaman). Kosong bila tidak sah. */
export function rujukanDariHalaman(kitabId, halaman) {
  const seqs = (Array.isArray(halaman) ? halaman : []).map((p) => p && p.seq).filter((n) => Number.isInteger(n) && n >= 1 && n <= 99999);
  if (!RE_KITAB_ID.test(kitabId || '') || !seqs.length) return { ...RUJUKAN_KOSONG };
  const a = Math.min(...seqs); const b = Math.max(...seqs);
  return { kitabId, halId: idHalaman(a), halIdAkhir: b > a ? idHalaman(b) : '' };
}

/** Rujukan yang utuh dan masuk akal? (kitabId dan halId sama-sama ada, akhir tidak mendahului awal). */
export function rujukanSah(q) {
  if (!q || typeof q !== 'object') return false;
  const a = seqDariHalId(q.halId); if (!RE_KITAB_ID.test(q.kitabId || '') || a === null) return false;
  if (!q.halIdAkhir) return true;
  const b = seqDariHalId(q.halIdAkhir);
  return b !== null && b >= a;
}

/** Tiga bidang dalam bentuk bersih (string); rujukan yang tidak sah menjadi kosong semua, bukan setengah-setengah. */
export function bersihkanRujukan(q) {
  if (!rujukanSah(q)) return { ...RUJUKAN_KOSONG };
  const a = seqDariHalId(q.halId); const b = q.halIdAkhir ? seqDariHalId(q.halIdAkhir) : a;
  return { kitabId: q.kitabId, halId: q.halId, halIdAkhir: b > a ? q.halIdAkhir : '' };
}

/** Gabung rujukan lama dengan halaman yang ditambahkan. Kitab berbeda: tautan tunggal tidak bisa mewakili dua kitab, jadi dilepas. */
export function gabungRujukan(lama, baru) {
  const l = bersihkanRujukan(lama); const n = bersihkanRujukan(baru);
  if (!n.kitabId) return l;
  if (!l.kitabId) return n;
  if (l.kitabId !== n.kitabId) return { ...RUJUKAN_KOSONG };
  const seqs = [l.halId, l.halIdAkhir, n.halId, n.halIdAkhir].map(seqDariHalId).filter((x) => x !== null);
  return rujukanDariHalaman(l.kitabId, seqs.map((seq) => ({ seq })));
}

/** Rentang urutan [dari, sampai] atau null. */
export function rentangRujukan(q) {
  if (!rujukanSah(q)) return null;
  const a = seqDariHalId(q.halId);
  return { dari: a, sampai: q.halIdAkhir ? seqDariHalId(q.halIdAkhir) : a };
}

/** Hash pembaca: "#baca/fathul-muin/40" atau "#baca/fathul-muin/40-44". Hanya ASCII, aman dipakai di tautan dan riwayat peramban. */
export function hashBaca(q) {
  const r = rentangRujukan(q); if (!r) return '';
  return `#baca/${q.kitabId}/${r.dari}${r.sampai > r.dari ? `-${r.sampai}` : ''}`;
}

/** "#baca/fathul-muin/40-44" -> { kitabId, dari, sampai }. Selain itu null (total: tidak pernah melempar). */
export function bacaHash(hash) {
  const m = /^#?baca\/([a-z0-9][a-z0-9-]{1,59})(?:\/(\d{1,5})(?:-(\d{1,5}))?)?$/.exec(String(hash || ''));
  if (!m) return null;
  const dari = m[2] ? parseInt(m[2], 10) : 1; const sampai = m[3] ? parseInt(m[3], 10) : dari;
  if (dari < 1 || sampai < dari) return null;
  return { kitabId: m[1], dari, sampai };
}
