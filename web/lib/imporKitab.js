// Logika klien impor perpustakaan kitab (tanpa React): pratinjau, peringatan, dan urutan panggilan ke /api/kitab.
// Server tetap memvalidasi ulang semuanya (src/kitabImpor.js); modul ini hanya merapikan dan mengurutkan.
import { peringatanKualitas } from './kualitasKitab.js';

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
  const kelewat = (l.halamanPanjang || []).filter((x) => x.panjang > 30000);
  if (kelewat.length) w.push({ tingkat: 'bad', teks: `Halaman hal. ${kelewat.map((x) => `${x.hal} (${x.panjang.toLocaleString('id-ID')} karakter)`).join(', ')} terlalu panjang untuk satu halaman cetak, dan tidak dipecah otomatis. Biasanya penanda halaman hilang, atau indeks/daftar isi kitab menempel di halaman terakhir. Perbaiki berkasnya (tambahkan penanda halaman, atau buang bagian belakang) lalu pilih ulang.` });
  else if (l.halamanMelebihiBatas.length) w.push({ tingkat: 'bad', teks: `${l.halamanMelebihiBatas.length} halaman melebihi 12.000 karakter; server akan menolak.` });
  if (l.halamanDipecah && l.halamanDipecah.length) w.push({ tingkat: 'warn', teks: `${l.halamanDipecah.length} halaman cetak terlalu panjang dan dipecah di batas paragraf agar muat di Penyusunan Soal: ${l.halamanDipecah.slice(0, 6).map((x) => `hal. ${x.hal} (${x.panjang.toLocaleString('id-ID')} karakter jadi ${x.bagian} bagian)`).join(', ')}${l.halamanDipecah.length > 6 ? ', ...' : ''}. Nomor halamannya tetap, jadi rujukan soal tidak berubah.` });
  if (k.halamanVirtual) w.push({ tingkat: 'warn', teks: 'Halaman kitab ini dibagi otomatis menurut panjang teks, jadi nomornya BUKAN nomor cetak. Soal tetap bisa ditautkan balik ke halaman di perpustakaan, tetapi rujukan "hal." di soal harus dicocokkan dengan edisi cetak.' });
  else if (k.sumber && k.sumber.jenis === 'pdf') w.push({ tingkat: 'warn', teks: 'Nomor halaman mengikuti urutan halaman PDF ditambah nomor awal yang Anda isi. Periksa satu halaman di pembaca: PDF sering memuat sampul dan pengantar sebelum halaman bernomor.' });
  else if (k.sumber && k.sumber.jenis === 'json' && !k.penomoranSesuaiCetak) w.push({ tingkat: 'warn', teks: 'Sebagian halaman di JSON tidak punya nomor "hal"; nomornya diisi berurutan, bukan nomor cetak.' });
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
  if (l.barisBerulangDibuang) w.push({ tingkat: 'warn', teks: `${l.barisBerulangDibuang} baris judul berjalan/nomor halaman dibuang dari awal dan akhir halaman PDF${l.contohBarisBerulang && l.contohBarisBerulang.length ? ` (mis. «${l.contohBarisBerulang[0].slice(0, 40)}»)` : ''}. Periksa satu-dua halaman di pratinjau bahwa tidak ada isi yang ikut terbuang.` });
  if (l.nomorDariPdf) w.push({ tingkat: 'warn', teks: `Nomor cetak dibaca dari nomor halaman di dalam PDF (${Math.round(l.nomorDariPdf.dukungan * 100)}% halaman bernomor sepakat; halaman PDF pertama = hal. ${l.nomorDariPdf.offset}). Nomor awal yang Anda isi tidak dipakai; isi nomor selain 1 untuk memakai nomor Anda sendiri.` });
  else if (l.nomorTerdeteksiDiabaikan !== null && l.nomorTerdeteksiDiabaikan !== undefined) w.push({ tingkat: 'warn', teks: `PDF memuat nomor halaman yang menunjukkan halaman PDF pertama = hal. ${l.nomorTerdeteksiDiabaikan}, tetapi Anda mengisi nomor awal sendiri, jadi nomor Anda yang dipakai.` });
  w.push(...peringatanKualitas(hasil.halaman));
  return w;
}

/** Peringatan terhadap kitab yang SUDAH ada di perpustakaan (`daftar` dari aksi impor-daftar): ID yang sama (harus menimpa) atau judul Arab yang sama dengan ID lain (kemungkinan dobel). */
export function peringatanDuplikat(hasil, isian, daftar) {
  const w = []; const ada = Array.isArray(daftar) ? daftar : [];
  const sama = ada.find((k) => k.id === isian.kitabId);
  if (sama) w.push({ tingkat: isian.timpa ? 'warn' : 'bad', teks: isian.timpa ? `Kitab "${sama.judulLatin}" (ID ${sama.id}, rev. ${sama.revisi}, ${sama.jumlahHalaman} halaman) akan DITIMPA: halaman lamanya dihapus. Soal yang sudah bertaut ke halaman lama tetap menyimpan salinan teksnya, tetapi tautan "Buka di kitab" bisa menunjuk halaman yang berbeda bila urutannya berubah.` : `ID "${sama.id}" sudah dipakai kitab "${sama.judulLatin}" (${sama.jumlahHalaman} halaman). Centang "timpa" bila ingin menggantinya, atau pakai ID lain.` });
  const norm = (s) => String(s || '').replace(/[\u064B-\u0652\u0670\u0640\s]+/g, '');
  const judul = norm(hasil && hasil.kitab && hasil.kitab.judul);
  const kembar = judul ? ada.find((k) => k.id !== isian.kitabId && norm(k.judul) === judul) : null;
  if (kembar) w.push({ tingkat: 'warn', teks: `Judul Arab yang sama sudah ada di perpustakaan sebagai "${kembar.judulLatin}" (ID ${kembar.id}). Pastikan ini edisi berbeda, bukan impor ganda.` });
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
