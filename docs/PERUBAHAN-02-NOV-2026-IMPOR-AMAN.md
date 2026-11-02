# Perubahan 2 Nov 2026 - impor lebih aman

Menindaklanjuti audit impor kitab (temuan 1 dan 4).

## 1. Impor ulang bertahap dan bisa dilanjutkan
- "Timpa" atas kitab yang sudah siap tidak lagi menghapus apa pun di awal. Kitab lama tetap aktif dan terbaca; isi baru ditulis ke ruang baru, dan baru dialihkan di `impor-selesai` (satu penulisan meta). Impor yang gagal atau ditutup di tengah tidak mengubah kitab yang sedang dipakai.
- Impor yang terputus dilanjutkan dengan mencentang "Lanjutkan" dan memilih berkas yang sama persis. Server membandingkan sidik isi (`sidikHasil`) dan jumlah halaman; halaman yang sudah tertulis dilewati.
- Batas yang tersisa: peralihan tetap memakai pembacaan ulang berkas (hasil OCR AI tidak dicek-simpan, jadi OCR ulang menghasilkan sidik berbeda dan tidak bisa dilanjutkan). Sisa ruang dari percobaan yang ditinggalkan dibersihkan pada impor-mulai berikutnya.
- Berkas: src/kitabImpor.js, src/kitabBaca.js, src/kitabCari.js, web/lib/imporKitab.js, web/KitabImpor.jsx.

## 2. Pembaca .docx
- Pemisah halaman Word (`w:br w:type="page"`, `w:pageBreakBefore`, akhir seksi halaman berikutnya) sekarang terbaca. Dokumen tanpa penanda `[ص N]` tetapi berhalaman (hasil konversi PDF ke Word) bisa diimpor dengan "Pakai pemisah halaman Word": satu halaman Word = satu halaman kitab (jenis sumber `docx-halaman`, nomor = nomor awal + urutan, bukan nomor cetak).
- Kotak teks tidak lagi terbaca dua kali (salinan `mc:Fallback` dibuang).
- Batas ukuran isi setelah dibuka (150 MB, juga dicek terhadap ukuran yang diumumkan arsip) melindungi peramban ponsel dari zip bomb. Berlaku juga untuk pembaca EPUB.
- Berkas: web/lib/docx.js, web/lib/sumberLain.js, web/lib/dokumenKitab.js.

## Tes
test/docxAman.test.js (baru), test/kitabImpor.test.js dan test/cariKitab.test.js (disesuaikan, ditambah skenario bertahap dan lanjutkan). Seluruh suite lulus.

## 3. Titik simpan OCR (tambahan)
- Hasil OCR AI tiap halaman disimpan di IndexedDB peramban (web/lib/simpananOcr.js), dengan kunci nama+ukuran+waktu ubah berkas+aksara. Tab mati, layar terkunci, atau kuota harian habis tidak lagi menghanguskan halaman yang sudah terbaca: baca ulang berkas yang sama hanya memanggil AI untuk halaman yang belum ada.
- Hanya hasil berhasil yang disimpan (termasuk halaman kosong sah); halaman gagal dicoba ulang. Simpanan dihapus setelah impor berhasil dan otomatis kedaluwarsa setelah 14 hari. Galat penyimpanan tidak pernah menggagalkan OCR.
- Karena hasil lama dipakai apa adanya, sidik berkas OCR menjadi stabil, sehingga "Lanjutkan impor yang terputus" juga bekerja untuk impor OCR.
- Batas: simpanan ada per perangkat dan peramban; berpindah ponsel atau mode privat berarti mulai dari awal. Tes: test/simpananOcr.test.js (IndexedDB asli tidak bisa diuji di Node, hanya logika dan penanganan galatnya).
