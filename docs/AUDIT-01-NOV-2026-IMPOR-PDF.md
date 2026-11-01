# Audit dan peningkatan impor PDF — 1 Nov 2026

Dasar: clone `main` (commit e93b6b7), 579 tes lulus sebelum perubahan, 598 sesudahnya, build Vite lolos.

## Temuan audit (jalur impor PDF)

| # | Temuan | Dampak | Status |
|---|---|---|---|
| 1 | PDF pindai (gambar) ditolak total (`PDF_TANPA_TEKS`); OCR AI sudah ada di repo (`src/fotoKitab.js`) tetapi tidak tersambung ke impor | Kitab yang hanya ada sebagai PDF pindai tidak bisa masuk perpustakaan | Diperbaiki: tombol "Baca dengan OCR AI" |
| 2 | Pemeriksaan "ada teks atau tidak" memakai RATA-RATA seluruh PDF | PDF campuran (sebagian pindai) lolos dengan halaman kosong senyap | Diperbaiki: penilaian per halaman (`nilaiHalamanPdf`), halaman bermasalah dilaporkan dan bisa di-OCR |
| 3 | Penanda buku (bookmark) PDF tidak dibaca; daftar isi hanya ditebak dari kata "باب/فصل/كتاب" | Daftar isi dan bab per halaman kurang tepat | Diperbaiki: penanda buku dipakai bila >= 3 entri; cadangan: ukuran huruf lalu kata kunci |
| 4 | Metadata PDF (judul, pengarang) tidak dibaca | Admin mengetik ulang | Diperbaiki (judul sampah seperti "Microsoft Word - x.docx" dibuang) |
| 5 | Pembacaan PDF panjang tanpa progres dan tanpa tombol batal; halaman dan dokumen pdf.js tidak dilepas | Layar tampak macet pada PDF ratusan halaman; memori tertahan (berisiko di ponsel) | Diperbaiki: progres, batal, `page.cleanup()`, `doc.destroy()` |
| 6 | Pengaman CVE pdf.js 3.11 (`isEvalSupported: false`) | — | Sudah ada; dipertahankan |

## Yang ditambahkan

- `web/lib/bacaPdf.js`: sesi PDF (teks + calon judul menurut ukuran huruf, penanda buku, metadata, gambar halaman untuk OCR).
- `web/lib/pdfKitab.js`: alur PDF -> (opsional) OCR -> `parsePdf`. `web/lib/ocrPdf.js`: antrean OCR (2 paralel, tunggu 429, berhenti saat kuota harian habis, batal, halaman gagal tidak menggagalkan kitab).
- `src/kitabOcr.js` + aksi `impor-ocr` di `api/kitab.js`: khusus admin, TIDAK memakai kuota AI per pengguna (satu kitab = ratusan halaman), batas laju sendiri `LIMIT_OCR_PER_MINUTE` (20) dan `LIMIT_OCR_PER_DAY` (1500). Tidak menambah fungsi Vercel (tetap 11 dari 12).
- Halaman hasil OCR ditandai `ocr: true`, kitab `sumber.jenis = "pdf-ocr"` dan `ocrHalaman`; pembaca menampilkan peringatan. Tidak perlu mengubah aturan Firestore (penulisan lewat Admin SDK).

## Tahap 2 (OCR Latin/Pegon, dua kolom, ligatur, paragraf)

- **OCR Latin dan Pegon/Jawi**: aksi `impor-ocr` menerima `aksara` = `arab` (bawaan) | `latin` | `pegon`. Petunjuk ke AI berbeda per aksara (Latin: ejaan lama tidak dimodernkan; Pegon: huruf khusus ڠ ڽ چ ڤ ݢ ۑ ۏ dipertahankan dan dilarang dialihaksarakan ke Latin). Hasil yang tidak cocok dengan aksara yang dipilih (mis. halaman Arab dibaca sebagai Latin) dianggap halaman tanpa teks. Pemilih jenis tulisan ada di panel OCR.
- **PDF dua kolom**: `kolom: 'auto'` (bawaan) mengenali talang vertikal di tengah halaman, lalu membaca per pita: kolom awal-baca dulu (kanan untuk Arab). Judul selebar halaman tetap di atas kolomnya. Pengaman nazham: syair tersusun dua syatr per baris sehingga mirip dua kolom, maka deteksi hanya aktif bila setiap sisi bermedian >= 30 karakter per baris dan >= 16 baris berisi di kedua sisi. Tombol "Baca ulang tanpa deteksi dua kolom" tersedia bila ada halaman terdeteksi.
- **Ligatur (NUL)**: NUL yang berdiri sendiri diganti "الله", atau "صلى الله عليه وسلم" bila didahului محمد/النبي/نبينا/سيدنا atau "رسول الله". **Ini tebakan** (NUL tidak menyimpan ligatur aslinya), karena itu selalu dilaporkan di pratinjau. NUL yang menempel pada huruf dibiarkan.
- **Paragraf**: baris visual digabung bila baris sebelumnya terisi penuh (>= 90% lebar blok) dan baris berikutnya bukan: menjorok, berjeda paragraf, bercelah lebar (syair), berhuruf judul, berawalan kata bab, pendek, atau angka. Dua baris awal dan akhir halaman tidak disentuh agar pembersih judul berjalan dan nomor halaman tetap bekerja. Kata Latin terpotong tanda hubung disambung.

## Batasan yang masih ada (jujur)

1. **Mutu OCR belum diuji pada kitab nyata** (tes memakai AI tiruan), untuk ketiga aksara. Harakat dan huruf bisa keliru, sedangkan pemeriksa kutipan memakai teks ini sebagai rujukan. Periksa sampel halaman dan coba dulu pada satu jilid kecil. OCR Pegon paling berisiko: ejaan Pegon tidak baku dan AI cenderung "membetulkan".
2. **Biaya.** Satu halaman = satu panggilan AI. Kitab 300 halaman = 300 panggilan; pada 20 per menit membutuhkan sekitar 15 menit dengan layar terbuka.
3. **Deteksi dua kolom bersifat heuristik.** Teruji pada PDF uji dua kolom dan nazham buatan sendiri, belum pada kitab nyata. Syair dengan syatr panjang (bahar thawil/basith, >= 30 karakter) bisa salah terdeteksi; gunakan tombol baca ulang tanpa deteksi. Tiga kolom, dan halaman yang kolomnya tidak sejajar vertikal, tidak ditangani.
4. **Penggabungan paragraf** paling akurat untuk teks rata kanan-kiri (justified). Teks rata satu sisi saja (ragged) menghasilkan penggabungan tidak merata.
5. Ligatur selain lafzh dan shalawat (mis. ﷻ) tidak dibedakan; semua NUL berdiri sendiri diperlakukan sebagai dua kemungkinan di atas.
6. Pembacaan PDF memakai memori peramban: PDF besar di ponsel lama bisa berat. Batas 3000 halaman tetap berlaku.

## Diverifikasi dengan pdf.js sungguhan

PDF uji Arab dengan 4 halaman, penanda buku bertingkat, dan metadata (tahap 1); PDF dua kolom 3 halaman (3 dari 3 terdeteksi, urutan baca benar: kolom kanan lalu kiri), PDF nazham (0 terdeteksi sebagai kolom), dan PDF paragraf (tahap 2). Tahap 1: judul, pengarang, 3 penanda buku (dengan level), calon judul menurut ukuran huruf (rasio 1,83), dan urutan teks logis terbaca benar.
