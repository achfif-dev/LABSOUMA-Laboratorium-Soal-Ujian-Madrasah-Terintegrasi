// Teks Latin yang menyisipkan huruf Arab tunggal, mis. "أ 5×5 + ب 5×7 + ج 5×8 = 100": tanpa isolasi, algoritma dua arah (bidi)
// membalik urutannya di layar sempit ("100 = 8×5 ج + 7×5 ب + 5×5 أ"). Tiap rangkaian huruf Arab dibungkus isolat FSI…PDI
// supaya tampil sesuai urutan tulis. Hanya untuk tampilan: jangan dipakai pada data yang disimpan atau diekspor.
const ARAB = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g;
export const isolasiArab = (s) => String(s == null ? '' : s).replace(ARAB, '\u2068$&\u2069');
