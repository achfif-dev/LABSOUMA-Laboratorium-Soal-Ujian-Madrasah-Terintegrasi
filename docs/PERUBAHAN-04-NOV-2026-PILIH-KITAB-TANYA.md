# Perubahan 04 Nov 2026: pilihan kitab di Tanya Kitab

## Masalah
Menu "Kitab yang dicari" hanya punya satu kitab tunggal atau "Semua kitab aktif (maksimal 4)". Opsi kedua diam-diam hanya mencari
4 kitab pertama menurut abjad (`src/telaahKitab.js`), dan tidak ada cara memilih sendiri 2-4 kitab. Kitab di urutan ke-5 dan seterusnya
tidak pernah bisa dicari bersama kitab lain.

## Perbaikan
- `web/TanyaKitab.jsx`: `<select>` diganti pilihan "Semua kitab aktif" (bawaan) ditambah daftar centang kitab. Pengguna bisa memilih 1-4 kitab
  sendiri. Setelah 4 terpilih, centang lain dinonaktifkan sampai satu dilepas. Bila kitab aktif lebih dari 4 dan tidak ada yang dipilih,
  muncul peringatan bahwa hanya 4 kitab pertama menurut abjad yang dicari.
- Klien mengirim `kitabIds` berisi semua kitab terpilih (sebelumnya paling banyak satu). Server (`validasiTanya`, `tanyaKitab`) tidak diubah:
  sudah menerima sampai 4 ID.
- `web/lib/telaahKitab.js`: helper murni `alihkanPilihanKitab` (centang/lepas, batas 4) dan `saringPilihanKitab` (buang ID kitab yang sudah
  dinonaktifkan admin supaya tidak ditolak server dengan `KITAB_TIDAK_ADA`).
- Daftar kitab kini memakai simpanan memori `SIMPANAN` yang sama dengan Pemilih Kitab, sehingga membuka tab Baca Kitab berulang kali tidak
  membaca ulang seluruh koleksi `kitab` di Firestore.

## Tes
- `test/telaahKitab.test.js`: dua tes baru untuk kedua helper, termasuk bahwa hasilnya selalu lolos `validasiTanya`.
- `test/telaahUi.test.js`: pernyataan render untuk kontrol baru (perlu `npm install` agar bisa dijalankan).
