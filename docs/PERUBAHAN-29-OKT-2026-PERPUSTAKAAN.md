# Perubahan 29 Oktober 2026: impor perpustakaan kitab

Menindaklanjuti `docs/SKEMA-KITAB.md` (v2). Admin bisa mengimpor ekspor Syamilah (.txt) ke Firestore dari aplikasi.

## Berkas
Baru: `web/lib/syamilah.js`, `src/syamilah.js` (parser), `src/kitabImpor.js` (server), `web/lib/imporKitab.js` (klien), `web/KitabImpor.jsx` (layar),
`scripts/periksa-syamilah.mjs`, `test/syamilah.test.js`, `test/kitabImpor.test.js`, `test/kitabImporUi.test.js`, dokumen ini.
Diubah: `api/kitab.js` (cabang `aksi: "impor-*"`, admin), `web/App.jsx` (tab `perpus`), `web/lib/navigasi.js` (tab di grup Kelola),
`firestore.rules` (blok `kitab`, dibaca staf, tidak pernah ditulis klien), `docs/SKEMA-KITAB.md`,
`test/navigasi.test.js` dan `test/cadanganDrive.test.js` (penjaga lama diperbarui untuk tab baru).

## Urutan pasang
1. Unggah semua berkas ke GitHub; Vercel men-deploy otomatis. Impor sudah bisa dipakai tanpa langkah lain (server menulis lewat Admin SDK).
2. Terbitkan `firestore.rules` (Firebase Console > Firestore > Rules > Publish) **hanya ketika** layar pemilih kitab untuk penyusun soal dibuat. Impor tidak memerlukannya.
3. Muat ulang aplikasi dua kali agar service worker memuat versi baru. Buka Kelola > Perpustakaan.

## Terukur
- Tes: 477 lulus. Build berhasil.
- Dua berkas nyata diimpor lewat handler asli ke Firestore tiruan: 673 dan 329 halaman, 9 dan 6 panggilan, muatan terbesar 158 KB, dokumen terbesar 16 KB.

## Belum teruji
- Firestore sungguhan: `count()` dipakai di `impor-selesai` bila ada (jalur cadangannya, `select()`, yang diuji). Coba satu kitab kecil dulu.
- Aturan Firestore tidak diuji di emulator (hanya penjaga teks). Layar impor belum dilihat di HP (hanya render awal di server).
- Pemilih kitab untuk penyusun soal (pilih kitab, bab, halaman, isi otomatis form) belum dibuat.

## Tahap 2: pemilih kitab, bab, halaman
Baru: `src/kitabBaca.js`, `web/lib/perpus.js`, `web/PemilihKitab.jsx`, `test/perpus.test.js`, `test/pemilihKitabUi.test.js`.
Diubah: `api/kitab.js` (cabang `aksi: "perpus-*"`, peran pemakai alat), `web/App.jsx` (pemilih di Penyusunan Soal dan Paket Dauri; `Compose`, `PaketDauri`, `emptyForm` diekspor untuk tes render),
`docs/SKEMA-KITAB.md`.
Terukur: 489 tes lulus, build berhasil. Interaksi (pilih kitab, lompat bab, cari nomor cetak kembar, pakai teks, batas 6.000, mode paket) dijalankan di DOM tiruan
dengan dua kitab nyata hasil impor; 5 halaman Fathul Mu'in menjadi satu segmen Paket Dauri berrujukan "40–44".
Belum teruji: tampilan dan ketukan di HP, Firestore sungguhan untuk jalur baca (jalur impor sudah terbukti), dan simpan soal hasil isian otomatis (memakai bidang lama saja, jadi aturan Firestore tidak berubah).
Tidak perlu menerbitkan `firestore.rules`.
