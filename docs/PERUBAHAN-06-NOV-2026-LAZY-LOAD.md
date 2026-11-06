# Perubahan 6 Nov 2026: pemuatan malas (lazy-load) untuk memangkas unduhan awal

## Hasil terukur (vite build)
| | Sebelum | Sesudah |
|---|---|---|
| Bundel utama | 1.984 KB (gzip 622 KB) | 1.332 KB (gzip 423 KB) |
| Dimuat saat dibuka | semua | tanpa docx, naskahDocx, dan 7 panel di bawah |

Potongan yang kini dimuat saat dipakai: `docx` (466 KB, saat unduh Word), `naskahDocx`, `KitabImpor` (91 KB), `PembacaKitab` (36 KB), `ImporExcel` (22 KB), `AnalisisButir`, `PemilihKitab`, `TanyaKitab`, `PeriksaRujukan`.

## Berkas yang berubah
- `web/lib/muatDocx.js` (baru): memuat `docx` sekali, dipakai bersama.
- `web/globals.js`: tidak lagi mengimpor `docx` dan tidak lagi memasang `window.docx`.
- `web/App.jsx`: empat tempat `window.docx` diganti `await muatDocx()`; tujuh panel memakai `lazyPanel()` yang dibungkus pelindung gagal-muat (offline dan belum pernah dibuka hanya menampilkan pesan "Coba lagi" di panel itu, tidak merobohkan aplikasi).
- Tes: tiga tes DOCX diberi `muatDocx` tiruan; tes render SSR Penyusunan Soal memakai stream yang menunggu potongan lazy.

## Tidak berubah / belum
- `npm audit fix` tidak mengubah apa pun: 6 temuan moderat di `firebase-admin` terkunci oleh `@google-cloud/firestore-api@0.2.0` (menarik `google-gax@5.0.8`). Perlu rilis hulu. `--force` JANGAN dipakai (menurunkan `firebase` ke 9.14.0).
- Bundel utama masih 1,3 MB: sisanya Firebase compat dan `App.jsx`. Langkah berikutnya: pecah komponen tab dari `App.jsx`.
