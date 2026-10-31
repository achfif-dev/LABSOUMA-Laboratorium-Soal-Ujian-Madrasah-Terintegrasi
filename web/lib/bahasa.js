// Bahasa dan aksara kitab/buku (tanpa DOM, tanpa Node API; dipakai klien, server, dan tes).
//
// Dua sifat yang sengaja dipisah:
//  - `aksara`: huruf yang dipakai teks ('arab' | 'latin' | 'lain'). Menentukan ARAH tampilan (kanan-ke-kiri atau kiri-ke-kanan) dan jenis pemeriksaan mutu teks.
//  - `bahasa`: bahasa isi ('ar' Arab, 'id' Indonesia, 'jv' Jawa, 'su' Sunda, 'ms' Melayu, 'en' Inggris, 'lain'). Menentukan petunjuk untuk AI dan label di layar.
// Keduanya bisa berbeda: kitab Pegon berbahasa Jawa ditulis dengan aksara Arab (bahasa 'jv', aksara 'arab'), sehingga tetap tampil kanan-ke-kiri.
// Kitab lama (sebelum fitur ini) tidak punya kedua bidang; semuanya dianggap Arab (lihat `bahasaKitab` / `aksaraKitab`).

export const BAHASA = ['ar', 'id', 'jv', 'su', 'ms', 'en', 'lain'];
export const AKSARA = ['arab', 'latin', 'lain'];
export const LABEL_BAHASA = { ar: 'Arab', id: 'Indonesia', jv: 'Jawa', su: 'Sunda', ms: 'Melayu', en: 'Inggris', lain: 'Bahasa lain' };
export const LABEL_AKSARA = { arab: 'Arab (kanan ke kiri)', latin: 'Latin (kiri ke kanan)', lain: 'Aksara lain (kiri ke kanan)' };

const RE_ARAB = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/;
const RE_LATIN = /[A-Za-z\u00c0-\u024f]/;
const RE_HURUF = /\p{L}/u;

/** Hitung huruf menurut aksara. Hanya huruf (\p{L}); angka, tanda baca, dan spasi tidak dihitung. */
export function hitungAksara(teks) {
  let arab = 0; let latin = 0; let lain = 0;
  for (const ch of String(teks ?? '')) {
    if (!RE_HURUF.test(ch)) continue;
    if (RE_ARAB.test(ch)) arab++; else if (RE_LATIN.test(ch)) latin++; else lain++;
  }
  return { arab, latin, lain, total: arab + latin + lain };
}

/**
 * Aksara dominan sebuah teks. Contoh kecil dipakai bila teksnya sangat panjang (kitab ratusan ribu karakter): cukup 60.000 karakter pertama,
 * ditambah 20.000 dari tengah, supaya sampul dan pengantar berbahasa lain tidak menentukan hasil.
 * @returns {'arab'|'latin'|'lain'|null}  null bila tidak ada huruf sama sekali
 */
export function aksaraDominan(teks) {
  const t = String(teks ?? '');
  const contoh = t.length > 90000 ? t.slice(0, 60000) + t.slice(Math.floor(t.length / 2), Math.floor(t.length / 2) + 20000) : t;
  const h = hitungAksara(contoh);
  if (!h.total) return null;
  if (h.arab >= h.latin && h.arab >= h.lain) return 'arab';
  return h.latin >= h.lain ? 'latin' : 'lain';
}

/** Nisbah huruf Arab terhadap seluruh huruf (0-1); 0 bila tidak ada huruf. */
export function nisbahArab(teks) { const h = hitungAksara(teks); return h.total ? h.arab / h.total : 0; }

// Kata fungsi paling umum. Cukup untuk SARAN awal yang selalu bisa diubah admin, bukan penentu.
const KATA_UMUM = {
  id: ['yang', 'dan', 'di', 'untuk', 'dengan', 'dari', 'dalam', 'tidak', 'itu', 'ini', 'pada', 'adalah', 'atau', 'juga', 'akan', 'oleh', 'karena', 'sebagai', 'dapat', 'ke'],
  en: ['the', 'and', 'of', 'to', 'in', 'is', 'that', 'for', 'with', 'as', 'was', 'are', 'it', 'on', 'by', 'this', 'be', 'or', 'from', 'which'],
  jv: ['lan', 'ing', 'kang', 'iku', 'sing', 'yen', 'nanging', 'wong', 'utawa', 'saka', 'karo', 'ora', 'uga', 'bakal', 'wis', 'iki', 'ana', 'marang', 'sampeyan', 'kanggo'],
  su: ['jeung', 'nu', 'anu', 'teu', 'ka', 'dina', 'kana', 'sareng', 'atawa', 'tapi', 'oge', 'geus', 'mah', 'aya', 'ieu', 'eta', 'pikeun', 'sok', 'boh', 'kudu'],
};

/** Saran bahasa dari teks: cocokkan kata fungsi. Mengembalikan 'ar' untuk aksara Arab, 'id' bila tidak ada petunjuk (bahasa terbanyak di madrasah). */
export function tebakBahasa(teks) {
  const aksara = aksaraDominan(teks);
  if (aksara === 'arab' || aksara === null) return 'ar';
  if (aksara === 'lain') return 'lain';
  const kata = String(teks ?? '').slice(0, 60000).toLowerCase().match(/[a-z]+/g) || [];
  if (kata.length < 30) return 'id';
  const cacah = new Map(); for (const k of kata) cacah.set(k, (cacah.get(k) || 0) + 1);
  const skor = Object.entries(KATA_UMUM).map(([b, daftar]) => [b, daftar.reduce((n, k) => n + (cacah.get(k) || 0), 0)]).sort((a, c) => c[1] - a[1]);
  const [b, n] = skor[0];
  return n / kata.length >= 0.04 ? b : 'id';
}

/** Aksara bawaan sebuah bahasa bila belum ada contoh teks: hanya Arab yang memakai aksara Arab. */
export const aksaraBawaan = (bahasa) => (bahasa === 'ar' ? 'arab' : 'latin');

/** Bahasa/aksara sebuah kitab; kitab lama tanpa bidang itu dianggap Arab. */
export const bahasaKitab = (k) => (k && BAHASA.includes(k.bahasa) ? k.bahasa : 'ar');
export const aksaraKitab = (k) => (k && AKSARA.includes(k.aksara) ? k.aksara : (k && BAHASA.includes(k.bahasa) ? aksaraBawaan(k.bahasa) : 'arab'));
export const kitabArab = (k) => aksaraKitab(k) === 'arab';

/**
 * Atribut HTML untuk menampilkan teks kitab: arah (`dir`), bahasa (`lang`), dan kelas huruf. Kelas `ar` (huruf Amiri, baris renggang) HANYA untuk aksara Arab;
 * teks Latin memakai huruf biasa supaya terbaca nyaman dan tidak rata kanan.
 * @param {{bahasa?:string, aksara?:string}|null} kitab
 * @param {string} [ekstra]  kelas tambahan (mis. "text-lg")
 */
export function tampilanTeks(kitab, ekstra = '') {
  const arab = kitabArab(kitab);
  const lang = kitab && BAHASA.includes(kitab.bahasa) && kitab.bahasa !== 'lain' ? kitab.bahasa : (arab ? 'ar' : undefined);
  return { dir: arab ? 'rtl' : 'ltr', ...(lang ? { lang } : {}), className: `${arab ? 'ar ' : ''}${ekstra}`.trim() };
}

/** Atribut untuk teks yang bahasanya HANYA diketahui dari isinya (mis. judul di daftar, kolom tempel teks). */
export const tampilanDariIsi = (teks, ekstra = '') => tampilanTeks({ aksara: aksaraDominan(teks) || 'arab' }, ekstra);

/**
 * Bahasa teks untuk dikirim ke server saat soal dibuat dari teks yang ditempel/diambil (tanpa pilihan manual): aksara Arab atau tanpa huruf = 'ar',
 * selain itu tebakan dari kata fungsi. Server hanya memakai ini untuk memilih petunjuk AI dan aturan panjang teks.
 */
export const bahasaOtomatis = (teks) => { const a = aksaraDominan(teks); return a === 'arab' || a === null ? 'ar' : tebakBahasa(teks); };
