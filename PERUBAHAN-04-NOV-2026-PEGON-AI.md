# Perubahan 4 November 2026: audit mesin Pegon dan penguatan AI

## Temuan pada mesin (`web/lib/pegon.js`)
| # | Tingkat | Temuan | Status |
|---|---|---|---|
| M1 | Tinggi | `sedangkan` ditulis `سداڠكن` (dibaca akar + suffix -kan). Master prompt menyebutnya akar yang vokalnya ditulis penuh. | Diperbaiki → `سداڠكان` |
| M2 | Sedang | `tekan`, `pekan`, `rekan` terbaca akar + -kan (`تكن`, `ڤكن`, `ركن`). | Diperbaiki (daftar pengecualian suffix) |
| M3 | Rendah | `pesantren`, `perlu`, `pesan` selalu bersorot ⚠ untuk bunyi e padahal pasti pepet. | Diperbaiki (daftar e-pepet bawaan) |
| M4 | Info | Istilah umum (syariat, fatwa, maslahat, mudharat) tidak ada di kamus bawaan, tetapi ada di `docs/kamus-serapan-arab-kitab-pesantren.json` yang harus diimpor admin. Tanpa impor, `syariat` menjadi `سياريات`. | Tidak diubah (tes menjaga agar berkas itu tidak menduplikasi kamus bawaan). Sarankan impor sekali. |

## Temuan pada jalur AI (`src/pegonService.js`) dan perbaikannya
| # | Temuan lama | Perbaikan |
|---|---|---|
| A1 | AI hanya menerima teks hasil mesin; sorotan ⚠ dan catatan mesin tidak ikut. | Klien mengirim `rincian` (kata bersorot + catatan) dan `kamus` (kamus bersama + lokal yang berlaku pada teks). Prompt memuat `<kata_ragu>` dan `<kamus_pengguna>` (wajib dipakai). |
| A2 | Prompt tanpa contoh dan tanpa langkah kerja. | Peran "pemeriksa, bukan penulis ulang", 6 langkah kerja, larangan eksplisit, dan 16 pasangan contoh terverifikasi (`CONTOH`; tes memastikan persis sama dengan mesin). |
| A3 | Tidak ada pemeriksaan keluaran: kata bisa hilang, Latin bocor, kutipan Arab/angka berubah. | `src/pegonCek.js` → `periksaKeluaran`: jumlah kata, Latin bocor, aksara Arab asli, angka, ng terpecah, ny ڽ. Pelanggaran berat memicu satu percobaan ulang berisi daftar masalah. |
| A4 | AI bebas mengubah kata tanpa alasan. | Skema alat baru: `perubahan[]` (dari, ke, alasan, jenis) dan `keyakinan`. `jagaPerubahan` membatalkan perubahan yang tidak dilaporkan (kembali ke mesin, ⚠ tetap). |
| A5 | Teks 6.000 karakter dalam satu panggilan: risiko terpotong (`max_tokens`). | `bagiBagian`: dipecah per baris menjadi paling banyak 4 bagian, diproses paralel. Bagian yang gagal dua kali tetap hasil mesin; bila semua gagal, error dilempar sehingga kuota dikembalikan. |
| A6 | Percobaan ulang bisa melewati batas 60 dtk fungsi Vercel. | Tidak ada percobaan ulang setelah 35 dtk. |

Klien (`web/App.jsx`, `PegonTab`): panel baru menampilkan kata yang diubah AI beserta alasannya, keyakinan, jumlah perubahan yang dibatalkan, dan bagian yang gagal pemeriksaan.

## Pengujian
- `test/pegonAi.test.js` (14 tes baru): perbaikan mesin, konsistensi contoh prompt, pemeriksa keluaran, penjaga perubahan, pembagian bagian, sanitasi masukan, alur AI dengan klien palsu (diterima/dibatalkan/diulang/ditolak/waktu habis).
- Seluruh suite: 637 lulus. 9 berkas gagal hanya karena paket dev tidak terpasang di lingkungan audit (`docx`, `jszip`, `write-excel-file`); jalankan `npm ci` lalu `npm test`.
- `web/App.jsx` dikompilasi dengan esbuild tanpa galat.

## Belum diuji
Panggilan nyata ke model (butuh kunci AI), tampilan panel di browser, dan `npm run eval`. Disarankan menambah kasus Pegon ke `eval/golden.json` (Latin → Pegon yang sudah diverifikasi ustadz) agar mutu AI bisa diukur, bukan hanya dijaga.

## Batas yang disengaja
- Ejaan klasik: AI selalu bekerja di al-Qolam, lalu `ubahEjaan` memetakan huruf. Hamzah awal gaya klasik tidak dihasilkan jalur AI.

## Tambahan: jalur baca-foto (`pegonfoto`)
Pemeriksa yang sama kini dipakai. Mesin dijalankan pada teks Latin hasil baca AI sebagai pembanding; pelanggaran berat memicu satu percobaan ulang, lalu bila tetap cacat Pegon diganti hasil mesin (teks Latin tetap dari AI) dengan peringatan. Respons menambah `ditolak`, `diulang`, `selisihMesin`. Perubahan liar tidak dibatalkan di jalur ini karena AI tidak melihat hasil mesin. 2 tes baru.
