# Audit 1 November 2026: kitab/buku non-Arab

Cakupan audit: jalur impor perpustakaan kitab dan jalur yang memakai teks kitab (penyusunan soal, Paket Dauri, telaah, uji jawab buta, pemeriksa kutipan, pembaca). `web/App.jsx` (±400 KB), aturan Firestore, dan evaluasi AI tidak diaudit menyeluruh.

## Temuan

| # | Tingkat | Temuan | Status |
|---|---|---|---|
| 1 | Tinggi | Impor menolak berkas non-Arab: `kualitasKitab.js` memberi tingkat `bad` (`bukan-arab`) bila huruf Arab < 25%, dan `KitabImpor.jsx` mematikan tombol impor pada tingkat `bad`. Deteksi bab dan penanda halaman juga hanya Arab (`باب`, `[ص N]`). | Diperbaiki |
| 2 | Tinggi | Penyusunan soal hanya menerima Arab: `arabicProblem` di server (`soalService.js`), duplikatnya di `App.jsx` (Compose dan Paket), `paketService.js`, prompt "berbahasa Arab". Tanpa perbaikan ini buku Latin bisa dibaca tetapi tidak bisa dijadikan soal. | Diperbaiki untuk soal, telaah, uji buta, dan paket |
| 3 | Sedang | Tampilan memaku `dir="rtl" lang="ar"` dan kelas `ar` di layar impor, pemilih, pembaca (termasuk arah panah halaman). | Diperbaiki (mengikuti `aksara` kitab) |
| 4 | Sedang | `periksaKutipan` hanya mengekstrak potongan Arab, sehingga soal dari teks Latin selalu mendapat peringatan "tidak memuat kutipan Arab". | Diperbaiki (mode Latin otomatis: kutipan = isi tanda petik ganda) |
| 5 | Rendah | `test/kitabImporUi.test.js` sudah usang sebelum audit ini: mencari teks tombol "(.txt / .docx)" padahal tombol memuat daftar format yang lebih panjang. | Diperbaiki |
| 6 | Info | Server tidak memeriksa kecocokan isi halaman dengan `aksara` yang dinyatakan klien (hanya klien yang memeriksa). Dampaknya hanya arah tampilan, bukan keamanan. | Dicatat |
| 7 | Info | `perpus-daftar` dan `impor-daftar` membaca seluruh koleksi `kitab` pada tiap panggilan; biaya baca naik sebanding jumlah kitab. | Dicatat |
| 8 | Info | Terjemah dan analisis kata, OCR foto kitab, dan ambil teks dari URL (`kitabFetch.js`) memang khusus Arab dan tidak diubah. Klien kini menolak terjemah/analisis untuk teks non-Arab dengan pesan yang jelas. | Dicatat |

## Perubahan

- Baru: `web/lib/bahasa.js` (deteksi aksara dan bahasa, atribut tampilan), `test/kitabNonArab.test.js` (18 tes).
- Impor: `kualitasKitab.js` (aturan per aksara), `syamilah.js` (judul bab Latin, label kepala Latin, `levelKata` bersama), `penandaSisip.js` (penanda halaman Latin), `dokumenKitab.js` (`tetapkanBahasa`), `imporKitab.js` (pilihan bahasa, isian awal), `src/kitabImpor.js` dan `src/kitabBaca.js` (bidang `bahasa`, `aksara`).
- Soal: `soalService.js` (`resolveBahasa`, `teksProblem`, `sesuaikanPromptBahasa`), `paketService.js` (`sistemPaketFor`), `kutipan.js` dan `paket.js` (mode Latin), `App.jsx` (kirim `bahasa`, pesan dan kolom teks mengikuti aksara).
- UI: `KitabImpor.jsx`, `PembacaKitab.jsx`, `PemilihKitab.jsx`.
- Kompatibilitas: tanpa `bahasa` semuanya berperilaku seperti sebelumnya (prompt Arab identik karakter demi karakter, teks Latin tanpa `bahasa` tetap ditolak).

## Verifikasi

- Tanpa dependensi terpasang: 496 tes, 485 lulus, 8 gagal. Delapan itu sama dengan keadaan awal (paket `docx`, `react`, `write-excel-file`, `jszip` tidak terpasang di lingkungan audit). Keadaan awal: 478 tes, 467 lulus; selisih 18 adalah tes baru.
- Dengan `react`, `react-dom`, `docx`, `pdfjs-dist` disambungkan sementara: 564 tes, 559 lulus, 4 gagal (`dasborUi`, `excelConfig`, `kitabImporUi`, `pemilihKitabUi`) karena `vite` dan `write-excel-file` tetap tidak ada. Jalankan `npm install && npm test` untuk hasil penuh.
- Smoke render (SSR) `KitabImpor`, `PemilihKitab`, `PembacaKitab` berhasil dengan ikon tiruan. `Compose` dan `PaketDauri` di `App.jsx` TIDAK dirender (butuh `firebase`, `mammoth`, dan impor `?url` khas Vite); keduanya hanya diperiksa sintaksnya dan ditutup tes logika.
- Belum diuji: browser sungguhan, PDF Latin sungguhan (hanya lewat teks per halaman tiruan), dan panggilan AI sungguhan dengan prompt yang disesuaikan. Jalankan `npm run eval` dengan beberapa contoh teks Latin sebelum dipakai luas.

## Batasan yang perlu diketahui

- Bahasa dikenali dari kata fungsi (Indonesia, Inggris, Jawa, Sunda); Melayu terbaca sebagai Indonesia dan Pegon/Jawi terbaca sebagai Arab pada deteksi otomatis di penyusunan soal. Pilihan manual di layar impor tetap menentukan arah tampilan.
- Pembuangan catatan kaki otomatis "(1) ..." di akhir halaman memakai aturan Syamilah dan ikut berlaku pada buku Latin; layar impor menampilkan jumlah yang dibuang dan peringatannya.
- Kata yang terputus tanda hubung di akhir baris PDF tidak disambung kembali.
- Hak cipta buku non-Arab hampir selalu berlaku: status awal tetap "belum dicek"; admin yang menentukan.
