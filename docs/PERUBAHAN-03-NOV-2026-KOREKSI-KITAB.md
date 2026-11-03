# Perubahan 3 Nov 2026: koreksi teks kitab oleh editor dan admin

Permintaan: editor atau admin bisa membetulkan teks yang salah di Perpustakaan / tab Baca Kitab setelah dicocokkan dengan kitab asli, terutama hasil OCR AI.

## Temuan audit (sebelum perubahan)
1. **Tidak ada jalur mengubah teks.** Aturan Firestore menutup `kitab/*` untuk tulis dari klien, dan satu-satunya penulis adalah impor. Membetulkan satu huruf berarti mengimpor ulang seluruh kitab (untuk PDF pindai: mengulang OCR AI, berbayar dan lambat).
2. **Peringatan OCR tidak bisa dicabut.** Setiap halaman bertanda `ocr` selalu menampilkan "huruf dan harakat bisa keliru", sekalipun sudah dicocokkan.
3. **Simpanan pencarian di memori server akan basi.** Kunci simpanan `src/kitabCari.js` hanya memuat id, revisi, versi indeks, dan jumlah halaman. Teks yang dikoreksi tidak mengubah salah satunya, jadi mesin yang sudah menyimpan indeks akan terus menjawab dengan ejaan lama.
4. **Indeks pencarian menyalin teks** (`cari/cNNNNN`, teks normal). Mengubah halaman tanpa mengubah indeks membuat kata benar tidak ketemu dan kata salah masih ketemu.
5. **Impor ulang ("timpa") menghapus koreksi.** Tidak ada peringatan di layar impor.
6. **Soal yang sudah dibuat menyalin teks kitab** (sengaja, lihat SKEMA-KITAB.md). Soal lama yang diambil dari teks OCR yang salah tidak ikut benar, dan belum ada penanda. Belum dikerjakan (lihat "Saran lanjutan").

## Yang berubah
**Server** (`src/kitabKoreksi.js`, dipanggil dari `src/kitabBaca.js`; berkas `api/` tetap 11)
- `perpus-koreksi` `{ kitabId, seq, rev, teks | (matn, syarah), cocok?, catatan? }`: hanya editor dan admin (dicek di `api/kitab.js` dan sekali lagi di modul). Batas laju 30/menit dan 1.500/hari per pengguna.
- `perpus-riwayat` `{ kitabId, seq }`: 10 perubahan terbaru satu halaman, memuat teks lama dan baru.
- Satu koreksi = satu transaksi Firestore yang menulis: halaman (`rev` naik, `dikoreksi`, `diverifikasi`), arsip `kitab/{id}/koreksi/{id}` (teks lama dan baru, siapa, kapan, catatan; hanya tambah), potongan indeks pencarian yang memuat halaman itu, dan penghitung `kitab/{id}.koreksi`.
- **Bentrok:** klien mengirim `rev` yang dilihatnya. Bila halaman sudah berubah, 409 `KOREKSI_BENTROK` dan tidak ada yang tertulis. Bila kitab dialihkan ke ruang baru oleh impor ulang saat koreksi berjalan: 409 `KITAB_BERUBAH`.
- Bentuk halaman ditentukan data tersimpan, bukan klien: halaman bermatn menerima `matn` + `syarah` (batas matn dihitung ulang dengan susunan yang sama dengan parser Syamilah), halaman lain menerima `teks`. Maks 12.000 karakter. Dibuang: karakter kendali, BOM, penanda arah tersemat. Tidak ada normalisasi Unicode (urutan harakat Arab tidak boleh disusun ulang). ZWNJ dibiarkan (perlu untuk Pegon/Persia).
- `cocok: true` menandai halaman terverifikasi. Teks yang diubah lagi tanpa `cocok` mencabut tandanya. Hanya menandai `cocok` (teks sama) tidak menaikkan penghitung dan tidak menyentuh indeks.
- Kunci simpanan pencarian kini memuat `koreksi`, jadi semua mesin membuang indeks lama pada pencarian berikutnya.
- `impor-daftar` menyertakan `koreksi`.
- Firestore rules **tidak berubah**: `koreksi` tidak punya aturan baca/tulis klien (ditolak bawaan), semua lewat Admin SDK.

**Klien**
- `web/lib/koreksi.js`: pembersih teks, susun matn+syarah, beda per kata (LCS), dipakai klien dan server.
- `web/PenyuntingHalaman.jsx`: penyunting satu halaman (kotak Matn dan Syarah atau satu kotak), pratinjau perubahan (dicoret/digarisbawahi), centang "Sudah saya cocokkan dengan kitab asli", catatan, riwayat dengan "Pakai teks sebelum perubahan ini", Ctrl+Enter untuk simpan.
- `web/PembacaKitab.jsx`: tombol **Koreksi teks** per halaman (hanya `bisaKoreksi`, diisi `canReview` dari App), lencana "dikoreksi" dan "dicocokkan dengan kitab asli", peringatan OCR hanya untuk halaman yang belum dicocokkan, dan konfirmasi sebelum meninggalkan halaman yang ketikannya belum disimpan. Halaman yang tersimpan langsung masuk simpanan klien, jadi Pemilih Kitab di Penyusunan Soal dan Paket Dauri ikut memakai teks baru.
- `web/KitabImpor.jsx`: jumlah koreksi per kitab dan peringatan bila "timpa" dicentang pada kitab yang sudah dikoreksi.

## Batas yang perlu diketahui
- Impor ulang ("timpa") menimpa seluruh teks: koreksi tidak terbawa (arsipnya tetap di `kitab/{id}/koreksi`, tetapi belum ada tombol untuk menerapkannya lagi ke impor baru). "Tambah jilid" tidak menyentuh halaman lama.
- Pengguna lain yang sedang membuka kitab itu melihat teks lama sampai halaman dimuat ulang (simpanan memori klien). Soal yang sudah menyalin teks lama tidak berubah.
- Panel hasil pencarian yang sudah tampil tidak dihitung ulang setelah koreksi; cari lagi untuk menyegarkan.
- Satu koreksi menulis 4 dokumen (halaman, arsip, potongan indeks, metadata).
- Arsip koreksi bertambah selama dipakai (maks sekitar 50 KB per perubahan); belum ada pembersihan.

## Saran lanjutan (belum dikerjakan)
1. Tandai soal yang tertaut (`kitabId` + `halId`) bila halaman sumbernya dikoreksi sesudah soal dibuat.
2. Tombol "terapkan ulang koreksi" setelah impor ulang (arsip sudah memuat teks lama dan baru).
3. Daftar halaman OCR yang belum dicocokkan per kitab, untuk memantau kemajuan audit.

## Pengujian
- `test/koreksi.test.js` (14 tes): peran, bentuk matn/non-matn, bentrok, tanpa perubahan, verifikasi, validasi, pengalihan ruang, indeks dan simpanan pencarian, riwayat, penghitung impor, pemuat klien, logika murni.
- `test/_fakeDb.js` kini mendukung operator `<=`, `>=`, `<`, `>` pada `where`.
- Di lingkungan audit seluruh tes lulus kecuali 8 berkas yang memerlukan paket yang gagal terpasang di sana (`docx`, `jszip`, `vite`, `write-excel-file`): `bentukUi`, `dasborUi`, `dokumenKitab`, `excelConfig`, `kitabImporUi`, `naskah`, `paket`, `pemilihKitabUi`. Jalankan `npm test` dan `npm run build` di komputer Anda.
- Antarmuka diuji di Chromium sungguhan (bundel esbuild, tanpa Tailwind, ikon digantikan penampung) terhadap handler `/api/kitab` asli dengan Firestore tiruan: 14 skenario (penyusun tanpa tombol; koreksi matn+syarah; pratinjau beda; simpan; pencarian memakai teks baru; riwayat; konfirmasi navigasi; satu kotak untuk halaman tanpa pemisah; bentrok 409 dan muat ulang; peringatan OCR hilang setelah dicocokkan). Tampilan bergaya (warna, tata letak di HP) dan Firestore sungguhan belum dicoba.
