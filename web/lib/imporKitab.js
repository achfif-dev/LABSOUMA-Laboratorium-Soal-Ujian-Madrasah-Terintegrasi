// Logika klien impor perpustakaan kitab (tanpa React): pratinjau, peringatan, dan urutan panggilan ke /api/kitab.
// Server tetap memvalidasi ulang semuanya (src/kitabImpor.js); modul ini hanya merapikan dan mengurutkan.
export const UKURAN_BATCH = 100;

/** "Fathul Mu'in" -> "fathul-muin". Kosong bila tidak ada huruf/angka Latin. */
export function slugKitab(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/['’ʼ`]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/g, '');
}

export function bagiBatch(daftar, maks = UKURAN_BATCH) {
  const hasil = [];
  for (let i = 0; i < daftar.length; i += maks) hasil.push(daftar.slice(i, i + maks));
  return hasil;
}

const MAZHAB_DARI_FAN = [[/الشافع/, 'syafii'], [/الحنفي/, 'hanafi'], [/المالك/, 'maliki'], [/الحنبل/, 'hanbali']];
export const tebakMazhab = (fan) => (MAZHAB_DARI_FAN.find(([re]) => re.test(fan || '')) || [0, ''])[1];

/** Isian awal formulir dari hasil parse. Nama Latin sengaja dikosongkan: tidak bisa ditebak dari judul Arab. */
export function isianAwal(hasil) {
  const k = hasil.kitab;
  return { judulLatin: '', kitabId: '', mazhab: tebakMazhab(k.fan), hakCipta: k.hakCipta.status, catatanHak: k.hakCipta.catatan || '', timpa: false };
}

/** Peringatan untuk admin sebelum impor. `tingkat`: 'bad' menghalangi, 'warn' memberi tahu. */
export function peringatanPratinjau(hasil) {
  const { kitab: k, laporan: l } = hasil;
  const w = [];
  if (l.halamanMelebihiBatas.length) w.push({ tingkat: 'bad', teks: `${l.halamanMelebihiBatas.length} halaman melebihi 12.000 karakter; server akan menolak.` });
  if (l.halamanKosong) w.push({ tingkat: 'warn', teks: `${l.halamanKosong} halaman tanpa teks.` });
  const a = l.anomali;
  if (a.duplikat + a.mundur + a.lompat) w.push({ tingkat: 'warn', teks: `Nomor halaman cetak tidak berurutan: ${a.duplikat} kembar, ${a.mundur} mundur, ${a.lompat} melompat. Aman: kunci halaman memakai urutan, bukan nomor cetak.` });
  if (k.bentukMatn === 'tanpa-pemisah') w.push({ tingkat: 'warn', teks: 'Matn tidak terpisah dari syarah di berkas ini (batas matn tidak diketahui).' });
  else if (l.halamanTanpaPemisah) w.push({ tingkat: 'warn', teks: `${l.halamanTanpaPemisah} halaman tanpa pemisah matn dan syarah.` });
  if (k.edisi.muhaqqiq) w.push({ tingkat: 'warn', teks: `Edisi ini bertahqiq (${k.edisi.muhaqqiq}). Teks pengarang klasik domain publik, tetapi hasil tahqiq bisa dilindungi hak cipta. Status hak cipta awal: belum dicek.` });
  if (l.catatanTertinggal && l.catatanTertinggal.length) w.push({ tingkat: 'warn', teks: `${l.catatanTertinggal.length} halaman (hal. ${l.catatanTertinggal.map((x) => x.hal).join(', ')}) memuat catatan bernomor "(1)" di tengah teks yang mungkin catatan editor. Tidak dibuang otomatis; periksa di perpustakaan.` });
  if (l.labelDibuang) w.push({ tingkat: 'warn', teks: `${l.labelDibuang} label ${l.labelLapisan} dibuang. Pada kitab berlapis (syarah dan hasyiyah) teks mengalir menurut urutan baca, sehingga kutipan matn bisa terselip di tengah kalimat.` });
  if (!l.judulTerdeteksi) w.push({ tingkat: 'warn', teks: 'Tidak ada judul bab terdeteksi: daftar isi kosong.' });
  if (l.selisihDenganKepala) w.push({ tingkat: 'warn', teks: `Jumlah halaman terbaca berbeda ${l.selisihDenganKepala > 0 ? '+' : ''}${l.selisihDenganKepala} dari yang tertulis di kepala berkas.` });
  return w;
}

export const isianSiap = (isian) => !!isian.judulLatin.trim() && /^[a-z0-9][a-z0-9-]{1,59}$/.test(isian.kitabId);

export function muatanMulai(hasil, isian) {
  const { kitab, daftarIsi } = hasil;
  return {
    aksi: 'impor-mulai', kitabId: isian.kitabId, timpa: !!isian.timpa, daftarIsi,
    kitab: { ...kitab, judulLatin: isian.judulLatin.trim(), mazhab: isian.mazhab, hakCipta: { status: isian.hakCipta, catatan: isian.catatanHak } },
  };
}

/**
 * Urutan impor: mulai -> halaman per batch (dicoba ulang 2x; menulis ulang dokumen yang sama aman) -> selesai.
 * @param {(body:object)=>Promise<object>} panggil  pemanggil /api/kitab (mis. callApi)
 * @returns {{dibatalkan:boolean, tertulis:number, selesai?:object}}
 */
export async function jalankanImpor({ panggil, hasil, isian, onProgres = () => {}, batal = () => false, ukuranBatch = UKURAN_BATCH, ulang = 2 }) {
  const total = hasil.halaman.length;
  let tertulis = 0;
  onProgres({ tahap: 'mulai', tertulis, total });
  await panggil(muatanMulai(hasil, isian));
  for (const grup of bagiBatch(hasil.halaman, ukuranBatch)) {
    if (batal()) return { dibatalkan: true, tertulis };
    let sisa = ulang;
    for (;;) {
      try { await panggil({ aksi: 'impor-halaman', kitabId: isian.kitabId, halaman: grup }); break; }
      catch (e) { if (sisa-- <= 0 || (e && e.status >= 400 && e.status < 500 && e.status !== 429)) throw e; }
    }
    tertulis += grup.length;
    onProgres({ tahap: 'halaman', tertulis, total });
  }
  if (batal()) return { dibatalkan: true, tertulis };
  onProgres({ tahap: 'selesai', tertulis, total });
  const selesai = await panggil({ aksi: 'impor-selesai', kitabId: isian.kitabId });
  return { dibatalkan: false, tertulis, selesai };
}
