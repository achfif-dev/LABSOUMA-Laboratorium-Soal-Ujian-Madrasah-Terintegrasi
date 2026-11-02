// Logika klien impor perpustakaan kitab (tanpa React): pratinjau, peringatan, dan urutan panggilan ke /api/kitab.
// Server tetap memvalidasi ulang semuanya (src/kitabImpor.js); modul ini hanya merapikan dan mengurutkan.
import { peringatanKualitas } from './kualitasKitab.js';
import { aksaraBawaan, LABEL_BAHASA } from './bahasa.js';

export const UKURAN_BATCH = 100;

/**
 * Sidik isi hasil baca (FNV-1a 32-bit atas urutan, nomor, dan teks tiap halaman). Dikirim saat impor-mulai: server hanya mau MELANJUTKAN impor yang terputus
 * bila sidiknya sama, sehingga halaman lama dan halaman baru tidak pernah tercampur dari dua berkas yang berbeda.
 */
export function sidikHasil(hasil) {
  let h = 0x811c9dc5; const campur = (c) => { h ^= c; h = Math.imul(h, 0x01000193) >>> 0; };
  const teksKe = (t) => { for (let i = 0; i < t.length; i++) campur(t.charCodeAt(i)); campur(10); };
  let karakter = 0;
  for (const p of hasil.halaman) { teksKe(`${p.seq}|${p.juz}|${p.hal}|`); teksKe(p.teks); karakter += p.teks.length; }
  return `f1-${h.toString(16).padStart(8, '0')}-${hasil.halaman.length}-${karakter}`.slice(0, 40);
}

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

/** Pilihan "bahasa : aksara" di formulir impor. Nilai = `${bahasa}:${aksara}`. Pegon/Jawi = bahasa daerah/Melayu/Indonesia beraksara Arab (tampil kanan ke kiri). */
export const PILIHAN_BAHASA = [
  ['ar:arab', 'Arab'], ['id:latin', 'Indonesia (Latin)'], ['jv:latin', 'Jawa (Latin)'], ['su:latin', 'Sunda (Latin)'], ['ms:latin', 'Melayu (Latin)'], ['en:latin', 'Inggris (Latin)'],
  ['lain:latin', 'Bahasa lain (Latin)'], ['id:arab', 'Indonesia (aksara Arab/Pegon)'], ['jv:arab', 'Jawa (Pegon)'], ['su:arab', 'Sunda (Pegon)'], ['ms:arab', 'Melayu (Jawi)'], ['lain:lain', 'Aksara lain (kiri ke kanan)'],
];
export const nilaiBahasa = (i) => `${i.bahasa}:${i.aksara}`;
export const bahasaDariNilai = (v) => { const [bahasa, aksara] = String(v).split(':'); return { bahasa, aksara }; };

const MAZHAB_DARI_FAN = [[/الشافع/, 'syafii'], [/الحنفي/, 'hanafi'], [/المالك/, 'maliki'], [/الحنبل/, 'hanbali']];
export const tebakMazhab = (fan) => (MAZHAB_DARI_FAN.find(([re]) => re.test(fan || '')) || [0, ''])[1];

/**
 * Isian awal formulir dari hasil parse. Kitab Arab: nama Latin dikosongkan (tidak bisa ditebak dari judul Arab).
 * Buku berhuruf Latin: judulnya sudah Latin, jadi dipakai sebagai nama awal (admin tetap bisa mengubahnya).
 */
export function isianAwal(hasil) {
  const k = hasil.kitab;
  const aksara = k.aksara || 'arab'; const bahasa = k.bahasa || (aksara === 'arab' ? 'ar' : 'id');
  const judulLatin = aksara === 'arab' ? '' : String(k.judul || '').trim().slice(0, 150);
  return { judulLatin, kitabId: judulLatin ? slugKitab(judulLatin) : '', bahasa, aksara, mazhab: tebakMazhab(k.fan), hakCipta: k.hakCipta.status, catatanHak: k.hakCipta.catatan || '', timpa: false, lanjut: false };
}

/** Peringatan untuk admin sebelum impor. `tingkat`: 'bad' menghalangi, 'warn' memberi tahu. */
export function peringatanPratinjau(hasil, pilihan = null) {
  const { kitab: k, laporan: l } = hasil;
  const bahasa = (pilihan && pilihan.bahasa) || k.bahasa || 'ar'; const aksara = (pilihan && pilihan.aksara) || k.aksara || aksaraBawaan(bahasa);
  const w = [];
  const kelewat = (l.halamanPanjang || []).filter((x) => x.panjang > 30000);
  if (kelewat.length) w.push({ tingkat: 'bad', teks: `Halaman hal. ${kelewat.map((x) => `${x.hal} (${x.panjang.toLocaleString('id-ID')} karakter)`).join(', ')} terlalu panjang untuk satu halaman cetak, dan tidak dipecah otomatis. Biasanya penanda halaman hilang, atau indeks/daftar isi kitab menempel di halaman terakhir. Perbaiki berkasnya (tambahkan penanda halaman, atau buang bagian belakang) lalu pilih ulang.` });
  else if (l.halamanMelebihiBatas.length) w.push({ tingkat: 'bad', teks: `${l.halamanMelebihiBatas.length} halaman melebihi 12.000 karakter; server akan menolak.` });
  if (l.halamanDipecah && l.halamanDipecah.length) w.push({ tingkat: 'warn', teks: `${l.halamanDipecah.length} halaman cetak terlalu panjang dan dipecah di batas paragraf agar muat di Penyusunan Soal: ${l.halamanDipecah.slice(0, 6).map((x) => `hal. ${x.hal} (${x.panjang.toLocaleString('id-ID')} karakter jadi ${x.bagian} bagian)`).join(', ')}${l.halamanDipecah.length > 6 ? ', ...' : ''}. Nomor halamannya tetap, jadi rujukan soal tidak berubah.` });
  if (k.halamanVirtual) w.push({ tingkat: 'warn', teks: 'Halaman kitab ini dibagi otomatis menurut panjang teks, jadi nomornya BUKAN nomor cetak. Soal tetap bisa ditautkan balik ke halaman di perpustakaan, tetapi rujukan "hal." di soal harus dicocokkan dengan edisi cetak.' });
  else if (k.sumber && k.sumber.jenis === 'docx-halaman') w.push({ tingkat: 'warn', teks: 'Halaman kitab ini mengikuti pemisah halaman dokumen Word, BUKAN nomor cetak. Sampul dan pengantar ikut terhitung (nomor awal bisa diatur), dan satu halaman Word bisa tidak sama dengan satu halaman cetak bila hasil konversi PDF ke Word menggeser teks. Periksa beberapa halaman di pratinjau dan cocokkan dengan edisi cetak.' });
  else if (k.sumber && (k.sumber.jenis === 'pdf' || k.sumber.jenis === 'pdf-ocr')) w.push({ tingkat: 'warn', teks: 'Nomor halaman mengikuti urutan halaman PDF ditambah nomor awal yang Anda isi. Periksa satu halaman di pembaca: PDF sering memuat sampul dan pengantar sebelum halaman bernomor.' });
  else if (k.sumber && k.sumber.jenis === 'epub-ocr') w.push({ tingkat: 'warn', teks: 'Nomor halaman = nomor lembar pindai di Internet Archive (berkas page_N), BUKAN nomor cetak; lembar tanpa teks dilewati. Rujukan "hal." di soal harus dicocokkan dengan lembar pindainya.' });
  else if (k.sumber && k.sumber.jenis === 'json' && !k.penomoranSesuaiCetak) w.push({ tingkat: 'warn', teks: 'Sebagian halaman di JSON tidak punya nomor "hal"; nomornya diisi berurutan, bukan nomor cetak.' });
  if (l.ocr) {
    const o = l.ocr;
    w.push({ tingkat: 'warn', teks: `${o.berhasil} halaman dibaca dengan OCR AI. Huruf dan harakat bisa keliru, dan pemeriksa kutipan memakai teks ini sebagai rujukan: periksa beberapa halaman di pratinjau dan bandingkan dengan PDF-nya sebelum kitab dipakai menyusun soal.${o.buruk ? ` ${o.buruk} halaman dinilai AI "buruk" (banyak bagian tidak terbaca).` : ''}` });
    if (o.gagal && o.gagal.length) w.push({ tingkat: 'warn', teks: `OCR gagal pada ${o.gagal.length} halaman PDF (urutan PDF: ${o.gagal.slice(0, 8).map((x) => x.indeks + 1).join(', ')}${o.gagal.length > 8 ? ', ...' : ''}); halaman itu kosong atau berteks lapisan PDF seadanya.${o.kuotaHabis ? ' Penyebab: batas OCR harian habis.' : ''}` });
    if (o.kosong) w.push({ tingkat: 'warn', teks: `${o.kosong} halaman PDF tidak memuat teks Arab yang terbaca (kosong, gambar, atau sampul) dan dibiarkan kosong.` });
  } else if (l.halamanPerluOcr && l.halamanPerluOcr.length) w.push({ tingkat: 'warn', teks: `${l.halamanPerluOcr.length} halaman PDF tanpa lapisan teks atau teksnya rusak (urutan PDF: ${l.halamanPerluOcr.slice(0, 8).map((i) => i + 1).join(', ')}${l.halamanPerluOcr.length > 8 ? ', ...' : ''}). Tombol \"Baca dengan OCR AI\" bisa membacanya.` });
  if (l.ocrAkurasi) {
    const o = l.ocrAkurasi;
    w.push({ tingkat: 'warn', teks: `EPUB ini hasil OCR otomatis Internet Archive. ${o.bertanda} halaman mencantumkan perkiraan akurasi: median ${o.median}%, terendah ${o.min}%, tertinggi ${o.maks}%; ${o.rendah} di antaranya di bawah 70%.${o.median < 70 ? ' Teks seakurat ini tidak layak dijadikan rujukan soal atau kutipan (huruf salah, kata acak, harakat rusak). Gunakan sumber teks lain (Syamilah, Waqfeya) atau OCR ulang dari PDF-nya.' : ' Periksa beberapa halaman sebelum dipakai.'}` });
  }
  if (l.halamanDuaKolom) w.push({ tingkat: 'warn', teks: `${l.halamanDuaKolom} halaman terdeteksi dua kolom dan dibaca per kolom (kolom awal-baca dulu). Bila isinya nazham/syair (tiap bait dua syatr), urutan bait bisa keliru: baca ulang tanpa deteksi dua kolom.` });
  if (l.ligaturDiperbaiki) w.push({ tingkat: 'warn', teks: `${l.ligaturDiperbaiki} ligatur (lafzh Allah atau shalawat) hilang dari PDF dan diganti otomatis menurut konteks (\"الله\" atau \"صلى الله عليه وسلم\"). Ini tebakan: periksa kutipan yang memuatnya sebelum dijadikan rujukan.` });
  if (l.judulSumber === 'penanda-buku') w.push({ tingkat: 'warn', teks: 'Daftar isi diambil dari penanda buku (bookmark) PDF. Periksa bahwa halaman tujuan tiap bab sesuai.' });
  if (l.babTakTerbaca) w.push({ tingkat: 'warn', teks: `${l.babTakTerbaca} bab yang tercantum di EPUB tidak terbaca (berkas hilang atau rusak) dan tidak ikut diimpor.` });
  if (l.teksSebelumPenanda >= 300) w.push({ tingkat: 'warn', teks: `${l.teksSebelumPenanda} karakter teks sebelum penanda halaman pertama (sampul, pengantar penerbit) tidak diimpor. Bila isinya dibutuhkan, impor ulang dengan halaman virtual.` });
  if (l.halamanKosong) w.push({ tingkat: 'warn', teks: `${l.halamanKosong} halaman tanpa teks.` });
  const a = l.anomali;
  if (a.duplikat + a.mundur + a.lompat) w.push({ tingkat: 'warn', teks: `Nomor halaman cetak tidak berurutan: ${a.duplikat} kembar, ${a.mundur} mundur, ${a.lompat} melompat. Aman: kunci halaman memakai urutan, bukan nomor cetak.` });
  if (aksara !== 'arab') { /* pemisahan matn dan syarah hanya dikenal pada kitab Arab (Syamilah); tidak relevan untuk buku biasa */ }
  else if (k.bentukMatn === 'tanpa-pemisah') w.push({ tingkat: 'warn', teks: 'Matn tidak terpisah dari syarah di berkas ini (batas matn tidak diketahui).' });
  else if (l.halamanTanpaPemisah) w.push({ tingkat: 'warn', teks: `${l.halamanTanpaPemisah} halaman tanpa pemisah matn dan syarah.` });
  if (k.edisi.muhaqqiq) w.push({ tingkat: 'warn', teks: `Edisi ini bertahqiq (${k.edisi.muhaqqiq}). Teks pengarang klasik domain publik, tetapi hasil tahqiq bisa dilindungi hak cipta. Status hak cipta awal: belum dicek.` });
  if (l.catatanTertinggal && l.catatanTertinggal.length) w.push({ tingkat: 'warn', teks: `${l.catatanTertinggal.length} halaman (hal. ${l.catatanTertinggal.map((x) => x.hal).join(', ')}) memuat catatan bernomor "(1)" di tengah teks yang mungkin catatan editor. Tidak dibuang otomatis; periksa di perpustakaan.` });
  if (l.labelDibuang) w.push({ tingkat: 'warn', teks: `${l.labelDibuang} label ${l.labelLapisan} dibuang. Pada kitab berlapis (syarah dan hasyiyah) teks mengalir menurut urutan baca, sehingga kutipan matn bisa terselip di tengah kalimat.` });
  if (!l.judulTerdeteksi) w.push({ tingkat: 'warn', teks: 'Tidak ada judul bab terdeteksi: daftar isi kosong.' });
  if (l.selisihDenganKepala) w.push({ tingkat: 'warn', teks: `Jumlah halaman terbaca berbeda ${l.selisihDenganKepala > 0 ? '+' : ''}${l.selisihDenganKepala} dari yang tertulis di kepala berkas.` });
  if (l.barisBerulangDibuang) w.push({ tingkat: 'warn', teks: `${l.barisBerulangDibuang} baris judul berjalan/nomor halaman dibuang dari awal dan akhir halaman PDF${l.contohBarisBerulang && l.contohBarisBerulang.length ? ` (mis. «${l.contohBarisBerulang[0].slice(0, 40)}»)` : ''}. Periksa satu-dua halaman di pratinjau bahwa tidak ada isi yang ikut terbuang.` });
  if (l.nomorDariPdf) w.push({ tingkat: 'warn', teks: `Nomor cetak dibaca dari nomor halaman di dalam PDF (${Math.round(l.nomorDariPdf.dukungan * 100)}% halaman bernomor sepakat; halaman PDF pertama = hal. ${l.nomorDariPdf.offset}). Nomor awal yang Anda isi tidak dipakai; isi nomor selain 1 untuk memakai nomor Anda sendiri.` });
  else if (l.nomorTerdeteksiDiabaikan !== null && l.nomorTerdeteksiDiabaikan !== undefined) w.push({ tingkat: 'warn', teks: `PDF memuat nomor halaman yang menunjukkan halaman PDF pertama = hal. ${l.nomorTerdeteksiDiabaikan}, tetapi Anda mengisi nomor awal sendiri, jadi nomor Anda yang dipakai.` });
  if (aksara !== 'arab') w.push({ tingkat: 'warn', teks: `Kitab/buku berbahasa ${LABEL_BAHASA[bahasa] || 'lain'} (huruf ${aksara === 'latin' ? 'Latin' : 'selain Arab'}): tampil kiri ke kanan. Pembuangan catatan kaki otomatis dirancang untuk kitab Arab; periksa halaman yang memuat catatan, dan pastikan teks di pratinjau utuh.` });
  w.push(...peringatanKualitas(hasil.halaman, { bahasa, aksara }));
  return w;
}

/** Peringatan terhadap kitab yang SUDAH ada di perpustakaan (`daftar` dari aksi impor-daftar): ID yang sama (harus menimpa) atau judul Arab yang sama dengan ID lain (kemungkinan dobel). */
export function peringatanDuplikat(hasil, isian, daftar) {
  const w = []; const ada = Array.isArray(daftar) ? daftar : [];
  const sama = ada.find((k) => k.id === isian.kitabId);
  if (sama) {
    const terputus = sama.status === 'mengimpor';
    if (isian.timpa) w.push({ tingkat: 'warn', teks: terputus ? `Impor kitab \"${sama.judulLatin}\" (ID ${sama.id}) sebelumnya belum selesai. Halaman yang sudah tertulis akan DITIMPA dan impor dimulai dari awal, kecuali Anda mencentang \"lanjutkan\" dan memilih berkas yang sama persis.` : `Kitab \"${sama.judulLatin}\" (ID ${sama.id}, rev. ${sama.revisi}, ${sama.jumlahHalaman} halaman) akan DITIMPA. Kitab lama tetap aktif dan terbaca sampai impor baru selesai; sesudah itu halaman lamanya dihapus. Soal yang sudah bertaut ke halaman lama tetap menyimpan salinan teksnya, tetapi tautan \"Buka di kitab\" bisa menunjuk halaman yang berbeda bila urutannya berubah.` });
    else if (isian.lanjut && terputus) w.push({ tingkat: 'warn', teks: `Impor kitab \"${sama.judulLatin}\" (ID ${sama.id}) akan dilanjutkan dari halaman yang sudah tertulis. Hanya berhasil bila berkas dan pengaturan bacanya sama persis dengan impor sebelumnya.` });
    else w.push({ tingkat: 'bad', teks: `ID \"${sama.id}\" sudah dipakai kitab \"${sama.judulLatin}\" (${sama.jumlahHalaman} halaman). Centang \"timpa\" bila ingin menggantinya${terputus ? ', atau \"lanjutkan\" bila impor sebelumnya terputus' : ''}, atau pakai ID lain.` });
  }
  const norm = (s) => String(s || '').replace(/[\u064B-\u0652\u0670\u0640\s]+/g, '').toLowerCase();
  const judul = norm(hasil && hasil.kitab && hasil.kitab.judul);
  const kembar = judul ? ada.find((k) => k.id !== isian.kitabId && norm(k.judul) === judul) : null;
  if (kembar) w.push({ tingkat: 'warn', teks: `Judul Arab yang sama sudah ada di perpustakaan sebagai "${kembar.judulLatin}" (ID ${kembar.id}). Pastikan ini edisi berbeda, bukan impor ganda.` });
  return w;
}

export const isianSiap = (isian) => !!isian.judulLatin.trim() && /^[a-z0-9][a-z0-9-]{1,59}$/.test(isian.kitabId) && PILIHAN_BAHASA.some(([v]) => v === nilaiBahasa(isian));

export function muatanMulai(hasil, isian) {
  const { kitab, daftarIsi } = hasil;
  return {
    aksi: 'impor-mulai', kitabId: isian.kitabId, timpa: !!isian.timpa, lanjut: !!isian.lanjut, sidik: sidikHasil(hasil), daftarIsi,
    kitab: { ...kitab, judul: kitab.judul || isian.judulLatin.trim(), judulLatin: isian.judulLatin.trim(), bahasa: isian.bahasa, aksara: isian.aksara, mazhab: isian.mazhab, hakCipta: { status: isian.hakCipta, catatan: isian.catatanHak } },
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
  const mulai = await panggil(muatanMulai(hasil, isian));
  const sudah = new Set(Array.isArray(mulai && mulai.sudah) ? mulai.sudah : []); // melanjutkan: batch yang seluruh halamannya sudah tertulis dilewati
  for (const grup of bagiBatch(hasil.halaman, ukuranBatch)) {
    if (batal()) return { dibatalkan: true, tertulis };
    if (sudah.size && grup.every((h) => sudah.has(h.seq))) { tertulis += grup.length; onProgres({ tahap: 'halaman', tertulis, total }); continue; }
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
