// Pemilih kitab OTOMATIS untuk Tanya Kitab: bagian MURNI (tanpa AI, tanpa jaringan, tanpa pembacaan Firestore), dipakai server dan tes.
// Dulu "semua kitab aktif" = MAKS_KITAB_TANYA kitab pertama menurut abjad, sehingga kitab yang tepat sering tidak ikut dicari.
// Sekarang kitab dipilih dari ringkasan kitab (judul, fan) yang sudah ada, dengan tiga isyarat berurutan:
//   1. nama kitab disebut di pertanyaan (Latin atau Arab)  -> hanya kitab itu yang dicari;
//   2. bidang ilmu (fan) pertanyaan dari kamus topik cocok dengan isian `fan` kitab;
//   3. tanpa isyarat -> urutan abjad (seperti dulu), dan hasilnya MENYATAKAN bahwa kitab dipilih tanpa isyarat.
// Alat bantu pemilihan, bukan sumber jawaban: jawaban tetap hanya dari halaman yang dibaca dan kutipannya tetap diverifikasi kode.
import { normalCari } from './cariKitab.js';
import { cariTopik, fanTopik, FAN_TOPIK } from './kamusTopik.js';
import { MAKS_KITAB_OTOMATIS } from './telaahKitab.js';

const n = (s) => normalCari(s);
const pad = (s) => ` ${n(s)} `;

// Kata pada isian `fan` kitab (diketik admin bebas) -> kode fan kamus topik. `khas` menunjuk satu cabang; `umum` ("fiqih") berlaku untuk semua cabang fiqih
// dan hanya dipakai bila isian fan tidak memuat kata khas satu pun (mis. "Ushul Fiqih" hanya ushul, bukan fiqih ibadah).
const FIQH_UMUM = ['fiqih', 'fiqh', 'fikih', 'فقه'];
const KATA_FAN = {
  fiqh_ibadah: { khas: ['ibadah', 'thaharah', 'shalat', 'salat', 'zakat', 'puasa', 'haji', 'عبادات', 'طهارة'], umum: FIQH_UMUM },
  fiqh_muamalat: { khas: ['muamalat', 'muamalah', 'jual beli', 'معاملات', 'بيوع'], umum: FIQH_UMUM },
  munakahat: { khas: ['munakahat', 'nikah', 'pernikahan', 'مناكحات', 'نكاح'], umum: FIQH_UMUM },
  jinayat: { khas: ['jinayat', 'jinayah', 'hudud', 'peradilan', 'جنايات', 'حدود'], umum: FIQH_UMUM },
  faraidh: { khas: ['faraidh', 'faraid', 'mawaris', 'waris', 'فرائض', 'مواريث'], umum: FIQH_UMUM },
  akidah: { khas: ['akidah', 'aqidah', 'tauhid', 'aqaid', 'ushuluddin', 'عقيدة', 'توحيد', 'عقائد'] },
  tasawuf: { khas: ['tasawuf', 'tasawwuf', 'sufi', 'تصوف'] },
  akhlak: { khas: ['akhlak', 'akhlaq', 'adab', 'tarbiyah', 'اخلاق', 'ادب'] },
  ushul: { khas: ['ushul', 'usul', 'اصول'] },
  qawaid: { khas: ['qawaid', 'kaidah', 'قواعد'] },
  balaghah: { khas: ['balaghah', 'balagha', 'bayan', 'بلاغة'] },
  nahwu: { khas: ['nahwu', 'nahw', 'nahu', 'نحو'] },
  sharaf: { khas: ['sharaf', 'shorof', 'sharf', 'tashrif', 'صرف'] },
  tafsir: { khas: ['tafsir', 'tafseer', 'تفسير'] },
  ulumul_quran: { khas: ['ulumul quran', 'ulumul qur an', 'ulum al quran', 'علوم القران'] },
  tajwid: { khas: ['tajwid', 'tajweed', 'qiraat', 'qiraah', 'تجويد', 'قراءات'] },
  mustalah: { khas: ['mustalah', 'musthalah', 'mustholah', 'ilmu hadits', 'ulumul hadits', 'مصطلح'] },
  hadits: { khas: ['hadits', 'hadis', 'hadith', 'حديث'] },
  sirah: { khas: ['sirah', 'sirat', 'tarikh', 'sejarah', 'سيرة', 'تاريخ'] },
  mantiq: { khas: ['mantiq', 'manthiq', 'logika', 'منطق'] },
};
const KATA = Object.fromEntries(Object.entries(KATA_FAN).map(([k, v]) => [k, { khas: v.khas.map(pad), umum: (v.umum || []).map(pad) }]));
export const KODE_FAN = Object.keys(KATA);

/** Kode fan yang ditunjuk isian `fan` sebuah kitab, dengan bobot (khas 10, umum 6). Kosong = isian fan kosong atau tidak dikenal. */
export function kodeFanKitab(fan) {
  const t = pad(fan);
  if (!n(fan)) return new Map();
  const hasil = new Map();
  for (const [kode, k] of Object.entries(KATA)) if (k.khas.some((w) => t.includes(w))) hasil.set(kode, 10);
  if (hasil.size) return hasil;
  for (const [kode, k] of Object.entries(KATA)) if (k.umum.some((w) => t.includes(w))) hasil.set(kode, 6);
  return hasil;
}

// Kata judul yang tidak membedakan kitab satu dari yang lain.
const KATA_UMUM_JUDUL = new Set(['kitab', 'al', 'an', 'ad', 'ar', 'as', 'ash', 'ath', 'az', 'at', 'adz', 'adh', 'asy', 'asy', 'bi', 'fi', 'wa', 'li', 'min', 'ala', 'syarh', 'syarah', 'hasyiyah', 'matan', 'ibn', 'abu', 'abi', 'ul', 'ulum']);

/** 'kuat' bila nama kitab utuh disebut (Latin tanpa spasi/apostrof atau Arab); 'lemah' bila kata pertama judul yang khas disebut; '' bila tidak. */
export function sebutKitab(k, teks) {
  const q = pad(teks); const qRapat = q.replace(/\s+/g, '');
  const latin = n(k.judulLatin || ''); const rapat = latin.replace(/\s+/g, '');
  if (rapat.length >= 6 && qRapat.includes(rapat)) return 'kuat';
  const arab = n(k.judul || '');
  if (arab.replace(/\s+/g, '').length >= 4 && q.includes(` ${arab} `)) return 'kuat';
  const khas = latin.split(' ').filter((w) => w.length >= 5 && !KATA_UMUM_JUDUL.has(w))[0];
  return khas && q.includes(` ${khas} `) ? 'lemah' : '';
}

/**
 * Memilih kitab untuk satu pertanyaan.
 * @param {Array<{id:string, judul?:string, judulLatin?:string, fan?:string}>} aktif  ringkasan kitab aktif (urut abjad)
 * @param {string} teks   pertanyaan (+ pertanyaan pengguna sebelumnya untuk pertanyaan lanjutan)
 * @param {{maks?:number}} [opsi]
 * @returns {{ids:string[], dasar:'nama'|'fan'|'tanpa_isyarat'|'tidak_sefan', fan:string, jumlahAktif:number}}
 */
export function pilihKitabOtomatis(aktif, teks, { maks = MAKS_KITAB_OTOMATIS } = {}) {
  const daftar = Array.isArray(aktif) ? aktif : [];
  const fan = fanTopik(cariTopik(teks, 2));
  const nilai = daftar.map((k, i) => {
    const sebut = sebutKitab(k, teks);
    const kode = kodeFanKitab(k.fan);
    // Isian fan kosong atau tidak dikenali = belum diketahui (1): kitabnya tidak boleh tersingkir diam-diam hanya karena admin menulis fan dengan istilah lain.
    const fanNilai = !fan ? 1 : !kode.size ? 1 : (kode.get(fan) || 0);
    return { id: k.id, i, sebut, fanNilai, skor: (sebut === 'kuat' ? 1000 : sebut === 'lemah' ? 100 : 0) + fanNilai };
  });
  const urut = [...nilai].sort((a, b) => b.skor - a.skor || a.i - b.i);
  const dasarHasil = (ids, dasar) => ({ ids: ids.map((x) => x.id), dasar, fan, jumlahAktif: daftar.length });
  const kuat = urut.filter((x) => x.sebut === 'kuat');
  if (kuat.length) return dasarHasil(kuat.slice(0, maks), 'nama');
  const lemah = urut.filter((x) => x.sebut === 'lemah');
  if (lemah.length) return dasarHasil(urut.filter((x) => x.sebut === 'lemah' || x.fanNilai > 0).slice(0, maks), 'nama');
  if (!fan) return dasarHasil(urut.slice(0, maks), 'tanpa_isyarat');
  if (urut.some((x) => x.fanNilai >= 6)) return dasarHasil(urut.filter((x) => x.fanNilai > 0).slice(0, maks), 'fan');
  return dasarHasil(urut.slice(0, maks), 'tidak_sefan'); // tak satu pun fan-nya cocok: yang belum diketahui didahulukan, yang jelas beda bidang paling akhir
}

/** Kalimat catatan untuk pengguna tentang cara kitab dipilih ('' bila semua kitab aktif ikut dicari). */
export function catatanPilihan(p, jumlahDicari) {
  if (!p || p.jumlahAktif <= jumlahDicari) return '';
  const dari = `${jumlahDicari} dari ${p.jumlahAktif} kitab aktif`;
  const namaFan = p.fan && FAN_TOPIK[p.fan] ? FAN_TOPIK[p.fan] : '';
  if (p.dasar === 'nama') return `Kitab yang dicari dipilih dari nama kitab di pertanyaan (${dari}).`;
  if (p.dasar === 'fan') return `Kitab yang dicari dipilih menurut bidang ilmu pertanyaan (${namaFan}): ${dari}. Bila kitab yang Anda maksud tidak ikut, sebut namanya di pertanyaan atau pilih sendiri kitabnya.`;
  if (p.dasar === 'tidak_sefan') return `Tidak ada kitab aktif yang isian fan-nya cocok dengan bidang pertanyaan (${namaFan}), jadi hanya ${dari} yang dicari menurut abjad. Sebut nama kitab atau pilih sendiri kitabnya.`;
  return `Pertanyaan tidak menyebut kitab atau bidang ilmu tertentu, jadi hanya ${dari} yang dicari menurut abjad. Sebut nama kitab atau pilih sendiri kitabnya.`;
}
