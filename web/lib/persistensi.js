// Status cache lokal Firestore di perangkat ini (enablePersistence). Bila 'gagal', setiap muat ulang halaman membaca ulang
// seluruh listener dari server (±ratusan baca per tab), jadi admin perlu bisa melihatnya tanpa konsol peramban.
let status = { ok: null, kode: '' }; // ok: null = belum diketahui
export const setPersistensi = (ok, kode = '') => { status = { ok, kode: String(kode || '') }; };
export const getPersistensi = () => status;
