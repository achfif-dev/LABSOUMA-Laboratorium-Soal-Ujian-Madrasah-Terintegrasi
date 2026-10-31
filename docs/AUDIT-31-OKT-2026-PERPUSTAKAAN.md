# Audit 31 Okt 2026: aplikasi, perpustakaan, tautan balik, pembaca, impor multi-sumber

## Temuan audit (terukur di lingkungan audit)
1. **`web/lib/sumberLain.js` tidak bisa dimuat.** Ia mengimpor `namaBerkasZip` dari `docx.js`, yang tidak mengekspornya (`SyntaxError` saat modul dimuat). Bila disambungkan ke layar impor, build Vite gagal. Diperbaiki: `namaBerkasZip` ditambahkan di `web/lib/docx.js`.
2. **Parser sumber lain, pembaca, dan helper rujukan sudah ditulis tetapi belum tersambung dan tanpa tes**: `sumberLain.js`, `PembacaKitab.jsx`, `lib/pembaca.js`, `lib/rujukan.js` tidak dipakai `App.jsx`, `KitabImpor.jsx`, maupun `dokumenKitab.js`; tidak ada tes untuknya.
3. **Server membuang `halamanVirtual` dan menolak jenis sumber baru** (`JENIS_SUMBER` hanya tiga nilai; `validasiKitab` tidak meneruskan `halamanVirtual`). Pembaca membaca `kitab.sumberJenis` dan `kitab.halamanVirtual`, yang tidak pernah dikirim `perpus-*`. Peringatan "halaman virtual" tidak akan pernah tampil.
4. **Tautan balik tidak pernah tersimpan.** Dokumen sebelumnya menyebut "memakai bidang lama saja"; `kitabId/halId` tidak ada di `FIELDS`, aturan Firestore (`opsiKeys`, `snapshotOk`, aturan admin), riwayat, maupun cadangan. Tombol "Buka di kitab" tidak mungkin ada.
5. **Pelajaran dari audit aturan:** menambah nama kunci ke `opsiKeys` saja tidak memvalidasi isinya. Ditambahkan validasi bentuk (`kitabId`, `halId`, `halIdAkhir`) di `validContent()`.
6. Empat berkas tes (`dasborUi`, `excelConfig`, `kitabImporUi`, `pemilihKitabUi`) gagal di lingkungan audit karena paket `vite` dan `write-excel-file` tidak terpasang (tanpa jaringan). Itu bukan galat kode, tetapi **tes tampilan tidak bisa dijalankan di sini**.

## Perubahan
- **Tautan balik soal ke halaman kitab.** Tiga bidang opsional di soal: `kitabId`, `halId` (urutan halaman, bukan nomor cetak), `halIdAkhir`. Terisi otomatis saat teks diambil dari perpustakaan (Penyusunan Soal); "tambah halaman" memperluas rentang, kitab berbeda melepas tautan. Form menampilkan chip "Tertaut ke perpustakaan" dengan "Buka di kitab" dan "Lepas tautan". Kartu di Review dan Bank Soal punya tautan "Buka di kitab" (`#baca/<kitab>/<urutan>[-<akhir>]`). Teks, nama, juz, dan hal tetap disalin ke soal: soal yang sudah disetujui tidak berubah bila teks kitab dikoreksi.
- **Tab Baca Kitab** (grup "Baca Kitab" di menu): `PembacaKitab.jsx` disambungkan. Layar lebar, huruf 20 sampai 60 px (bawaan 32), daftar isi dapat dicari, lompat ke nomor cetak, 1 atau 2 halaman, matn/syarah, salin dengan rujukan, pintasan papan ketik (panah, + dan -, Esc), posisi terakhir diingat per kitab, alamat `#baca/...` bisa dibagikan, rentang rujukan soal disorot. Tidak membuat soal.
- **Impor multi-sumber**: `.txt` dan `.docx` Syamilah, `.txt/.docx/.html` dengan penanda `[ص N]`, **PDF berlapis teks** (nomor awal diisi admin), **EPUB** (penanda pagebreak bila ada), **HTML**, **JSON halaman**, dan berkas **tanpa penanda** dengan tombol "Bagi halaman otomatis" (halaman virtual, ditandai dan diperingatkan). PDF pindai ditolak dengan petunjuk OCR.
- `web/lib/bacaPdf.js` (pdfjs dimuat malas), `dokumenKitab.js` (routing semua format), `KitabImpor.jsx` (pemilih berkas, nomor awal, baca ulang, tawaran virtual), `imporKitab.js` (peringatan virtual/PDF/JSON).
- Server: `JENIS_SUMBER` + `halamanVirtual` di `src/kitabImpor.js`; `perpus-*` mengirim `halamanVirtual` dan `sumberJenis`; `src/backup.js` memulihkan tautan (rujukan setengah dibuang).

## Yang WAJIB dilakukan saat memasang
1. **Terbitkan `firestore.rules`** (Firebase Console > Firestore > Rules > Publish). Berbeda dengan catatan 29 Okt, sekarang perlu: tanpa itu, menyimpan soal bertautan ditolak. Aplikasi sudah aman untuk aturan lama karena bidang kosong tidak dikirim, tetapi soal dari perpustakaan akan gagal disimpan sampai aturan terbit.
2. Muat ulang aplikasi dua kali (service worker).
3. Coba impor satu berkas kecil per format sebelum kitab besar.

## Belum teruji
- `npm run build` dan tes tampilan (4 berkas) tidak bisa dijalankan di lingkungan audit; sintaks JSX diperiksa dengan `tsc` saja. Jalankan `npm test` dan `npm run build` di komputer Anda.
- PDF nyata lewat pdfjs, EPUB nyata, dan JSON dari situs tertentu: parser diuji dengan data buatan. Alias bidang JSON (pages/text/page/vol) belum diuji pada ekspor situs mana pun.
- Aturan Firestore hanya diuji sebagai teks (belum di emulator). Tampilan di HP belum dilihat.
- Paket Dauri: halaman dari perpustakaan sudah memakai ID `kitabId:urutan`, tetapi soal hasil Paket Dauri **belum** diberi tautan balik. Ustadz (menu 5 tab, sengaja dibatasi tes) belum mendapat tab Baca Kitab.
