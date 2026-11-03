# Perubahan 3 Nov 2026: haluan Aswaja satu sumber dan otoritas kitab (langkah 1 menuju agent AI)

Tujuan: sebelum ada agent yang mempelajari kitab, AI di aplikasi harus (1) memakai satu rumusan haluan Aswaja di semua prompt, dan (2) tahu seberapa jauh sebuah kitab boleh dijadikan dasar soal. Status itu ditetapkan admin/ustadz, bukan ditebak model.

## Temuan audit (sebelum perubahan)
1. Haluan Aswaja hanya lengkap di saran bab dan Paket Dauri (`KERANGKA_ASWAJA`). Prompt generate soal punya aturan 9 sendiri, dan `assistService.js` punya `KONTEKS` sendiri: tiga rumusan berbeda untuk hal yang sama.
2. Metadata kitab sudah memuat `pengarang`, `wafatH`, `fan`, `mazhab`, tetapi tidak ada penanda status kitab bagi madrasah (pegangan, pembanding, di luar rumpun), dan metadata itu tidak pernah sampai ke prompt.
3. Impor ulang ("timpa") menulis ulang dokumen `kitab/{id}`; bidang baru apa pun akan hilang bila tidak dijaga.

## Yang berubah
**Haluan satu sumber** (`src/aswaja.js`): `HALUAN_RINGKAS` kini dipakai oleh aturan 9 prompt generate (`SYSTEM_PROMPT`) dan `KONTEKS` terjemah/analisis/telaah. `KERANGKA_ASWAJA` (panjang, saran bab dan paket) tidak diubah. Prompt pilgan tetap sama dengan `SYSTEM_PROMPT`.

**Otoritas kitab** (`web/lib/otoritas.js`, dipakai server dan klien; `src/otoritas.js` menambah pencarian server)
- `kitab/{id}.otoritas = { status, akidah, catatan, ditetapkanOleh, ditetapkanAt }`.
- Status: `belum_dinilai` (bawaan, termasuk semua kitab lama), `muktamad`, `rujukan`, `pembanding`, `luar_rumpun`. Tiap status punya arahan pendek untuk model (`ARAHAN_STATUS`). Akidah: Asy'ari, Maturidi, lainnya, atau tidak dicatat. Catatan maks 300 karakter.
- Server membaca otoritas dari Firestore lewat `kitabId`; isian `_kitab` atau teks otoritas dari klien selalu ditimpa. `kitabId` kosong, cacat, atau tidak ada diabaikan (soal tetap jadi, tanpa baris otoritas, prompt tidak berubah).
- Baris otoritas masuk ke blok `<metadata>` pada: generate, telaah, analisis, terjemah, paket, dan saran bab. Nilai dibersihkan dari `<`, `>`, dan baris baru.
- Respons generate dan assist memuat `peringatanOtoritas` untuk kitab pembanding, di luar rumpun, atau belum dinilai. Klien menampilkannya sebagai toast.

**Aksi admin** `impor-otoritas` (`POST /api/kitab`, admin saja, tanpa berkas `api/` baru): validasi ketat (status/akidah di luar daftar = 422), satu transaksi menulis status dan arsip `kitab/{id}/otoritasRiwayat/*` (status lama, baru, siapa, kapan). Firestore rules tidak berubah (subkoleksi tertutup untuk klien).
- `impor-daftar` dan `perpus-daftar` memuat `otoritas` (tanpa uid penetap untuk pemakai biasa).
- Impor ulang bertahap maupun tulis langsung kini membawa `otoritas` lama.

**Klien** (`web/KitabImpor.jsx`, `web/App.jsx`): pilihan Otoritas dan Akidah serta tombol catatan per kitab di Kelola > Perpustakaan. `kitabId` dikirim pada generate, telaah, analisis/terjemah, dan Paket Dauri (hanya bila seluruh materi dari satu kitab perpustakaan).

## Keputusan desain
- Status bukan penghakiman terhadap pengarang atau kelompok. Untuk `luar_rumpun` AI hanya diminta menguji isi teks sebagai pendapat kitab itu, sesuai aturan 5 di `aswaja.js`.
- Kitab tanpa tautan perpustakaan (teks ditempel manual) tidak mendapat arahan otoritas; ini sengaja agar prompt lama tidak berubah.
- Pembacaan otoritas memakai satu pembacaan dokumen sebelum validasi. Permintaan yang gagal validasi tetap menghabiskan satu pembacaan Firestore.

## Batas yang perlu diketahui
- Saran bab: server siap, tetapi klien belum mengirim `kitabId` karena layar itu memilih kitab dari Konfigurasi, bukan perpustakaan.
- Telaah dan uji buta dari daftar soal memakai `q.kitabId` bila soal tertaut; soal lama tanpa tautan tidak mendapat arahan.
- `luar_rumpun` dan `pembanding` belum memblokir persetujuan soal (`review.js`); hanya memberi peringatan.
- Prompt generate berubah (aturan 9 lebih lengkap): jalankan `npm run eval` dan bandingkan dengan hasil lama.

## Pengujian
- `test/otoritas.test.js` (11 tes): fungsi murni; prompt generate/paket/bab; endpoint generate dan assist (otoritas dibaca server, kitab lama, `kitabId` cacat, pemalsuan `_kitab`); `impor-otoritas` (peran, validasi, arsip, tanpa uid bocor, bertahan setelah impor ulang). Menghapus penjagaan di impor ulang membuat tes 11 gagal (diuji).
- Seluruh suite: 591 tes, 580 lulus, 8 gagal. Kedelapan berkas itu sama dengan sebelum perubahan dan gagal karena paket (`docx`, `react`, `write-excel-file`) tidak terpasang di lingkungan audit. Jalankan `npm install && npm test && npm run build` di komputer Anda.
- `web/App.jsx` dan `web/KitabImpor.jsx` hanya diperiksa sintaksnya (TypeScript parser); belum dibangun dengan Vite, belum dilihat di browser, dan belum dicoba dengan Firestore sungguhan.
