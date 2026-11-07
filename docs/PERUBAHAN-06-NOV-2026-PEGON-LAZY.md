# Perubahan 6 Nov 2026 (5): mesin Pegon dimuat malas

## Hasil terukur (vite build)
| | Sebelum | Sesudah |
|---|---|---|
| Bundel utama | 1.252 KB (gzip 401 KB) | 994 KB (gzip 305 KB) |
| `pegon` (potongan terpisah, diunduh di latar belakang) | ikut bundel utama | 259 KB (gzip 95 KB) |

Total sejak awal audit: 1.984 KB (gzip 622) menjadi 994 KB (gzip 305), sekitar 50% lebih kecil.

## Cara kerja
- `web/globals.js` tidak lagi mengimpor `lib/pegon.js` dan tidak memasang `window.Pegon`.
- `web/lib/muatPegon.js` (baru): `muatPegon()` memuat mesin sekali lalu memasangnya sebagai `window.Pegon` (kode lama yang membaca `window.Pegon` tidak berubah). `kamusBersamaMasuk(docs)` menahan snapshot kamus bersama dari Firestore bila mesin belum siap, lalu menerapkannya saat mesin dimuat.
- `web/main.jsx`: setelah tampilan pertama, `muatPegon()` dipanggil saat browser menganggur (batas 4 dtk). Biasanya Pegon sudah siap sebelum tab Pegon dibuka.
- `web/ui.jsx`: `denganPegon(Komponen)` menampilkan "Memuat mesin Pegon..." (atau tombol "Coba lagi" bila gagal) sampai mesin siap, lalu merender komponen aslinya.
- `web/App.jsx`: `PegonSoal`, `PegonTab`, dan `Export` dibungkus `denganPegon`. Kedua listener Firestore kamus memakai `kamusBersamaMasuk`.
- `web/lib/exportBuilders.js`: `buildDocx` menunggu `muatPegon()` sebelum memakai `window.Pegon`.

## Mengapa Export ikut dibungkus
Export membaca `window.Pegon` saat render (`nkPegon = !!window.Pegon`). Bila mesin belum siap, Naskah bisa terekspor TANPA Pegon secara diam-diam. Pembungkus menutup kemungkinan itu.

## Tes
`test/muatPegon.test.js` (baru): globals tidak mengimpor pegon.js; sebelum dimuat `window.Pegon` kosong dan pembungkus menampilkan "Memuat"; snapshot kamus yang datang lebih dulu diterapkan setelah dimuat; pemuatan bersama memakai satu janji.
