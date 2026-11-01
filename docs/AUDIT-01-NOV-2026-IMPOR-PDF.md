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

## Batasan yang masih ada (jujur)

1. **OCR hanya untuk kitab Arab.** Pembaca foto kitab menolak teks tanpa huruf Arab. Buku Latin/Pegon pindai belum didukung.
2. **Mutu OCR belum diuji pada kitab nyata.** Tes memakai AI tiruan. Harakat dan huruf bisa keliru, sedangkan pemeriksa kutipan memakai teks ini sebagai rujukan. Periksa sampel halaman sebelum kitab dipakai menyusun soal. Disarankan uji dulu pada satu jilid kecil.
3. **Biaya.** Satu halaman = satu panggilan AI (gambar JPEG ~1600 px). Kitab 300 halaman = 300 panggilan; pada 20 per menit membutuhkan sekitar 15 menit dengan layar tetap terbuka. Pantau kuota penyedia AI.
4. **PDF dua kolom** tetap digabung per baris (belum ada deteksi kolom). Pola umum turats (satu kolom; matn dan syarah atas-bawah) tidak terpengaruh.
5. **Ligatur lafzh Allah (ﷲ)** pada font tertentu terbaca sebagai karakter NUL oleh pdf.js (terlihat pada PDF uji buatan sendiri). Pemeriksa mutu sudah memperingatkan "karakter kontrol"; bila banyak, gunakan OCR AI untuk halaman itu (mode "semua" tersedia di kode, belum di tombol).
6. Garis antar baris PDF dipertahankan sebagai baris baru (belum digabung menjadi paragraf).
7. Pembacaan PDF memakai memori peramban: PDF besar (ribuan halaman) di ponsel lama bisa berat. Batas 3000 halaman tetap berlaku.

## Diverifikasi dengan pdf.js sungguhan

PDF uji Arab dengan 4 halaman, penanda buku bertingkat, dan metadata: judul, pengarang, 3 penanda buku (dengan level), calon judul menurut ukuran huruf (rasio 1,83), dan urutan teks logis terbaca benar.
