# Audit ulang aplikasi (27 Oktober 2026, siang)

Cakupan: seluruh `api/*`, `src/*`, `firestore.rules`, `firestore.indexes.json`, `vercel.json`, CI, dan perubahan Paket Dawr hari ini (cakupan Konfigurasi, tanpa rujukan kitab, pengelompokan paket, sunting dan kirim ke editor, Review berkelompok). Dibaca langsung dari kode; temuan diuji dengan skrip bila memungkinkan.

## Ringkasan

- Tidak ditemukan celah keamanan baru. Satu masalah fungsi berdampak biaya (hasil AI hilang saat muat ulang) dan satu bug kecil sudah diperbaiki.
- Temuan lama B1, B2, B3, H5, H9 ternyata sudah tertutup (lihat bagian 3).
- Yang belum bisa diverifikasi di lingkungan audit: `vite build`, `npm audit`, dan `test/excelConfig.test.js` (registry npm diblokir, paket tidak bisa dipasang). 374 dari 376 tes lulus; dua yang gagal hanya karena paket `vite` dan `write-excel-file` tidak ada.

## 1. Temuan baru

| # | Tingkat | Temuan | Status |
|---|---|---|---|
| N1 | Sedang (biaya) | Hasil AI tab Paket Dawr hanya di memori halaman. Muat ulang, tab tertutup, atau ponsel membuang tab membuang butir yang sudah memakai kuota AI harian (bawaan 60), beserta materi yang ditempel. | **Diperbaiki:** isian, materi, foto hasil baca, dan butir hasil AI disimpan sebagai draf perangkat (kunci `paketDawr`, per akun, 30 hari, dihapus saat Keluar atau bila kosong). Teks segmen disimpan sekali dan dirujuk lewat indeks. Data rusak dibangun ulang dari bidang yang dikenal; diuji dengan lima bentuk data rusak. |
| N2 | Rendah | Tab Paket Dawr tidak ada di daftar hash yang dikenal: memuat ulang halaman di `#paket` jatuh ke Penyusunan Soal. | **Diperbaiki.** |
| N3 | Rendah | Penyusun menulis sendiri `paket`, `dawr`, `urut`. Penyusun yang sengaja atau tidak sengaja memakai id paket orang lain mencampur butirnya ke kelompok itu di Bank/Review. Hanya staf yang bisa; dampaknya tampilan, bukan data atau hak akses. | Belum diubah. Aturan Firestore tidak bisa memeriksa kepemilikan id paket tanpa dokumen induk. Id dibuat acak dan tidak ditampilkan. |
| N4 | Rendah | Penyusun tidak bisa menarik kembali butir yang sudah Pending (aturan: hapus/ubah hanya saat draft atau revisi). Salah kirim hanya bisa diselesaikan editor (minta revisi). | Belum diubah; sesuai desain aturan yang ada. |
| N5 | Info | Kelengkapan paket ("kurang N dari 15 nomor") dihitung dari soal yang **sudah dimuat** (Bank 100 terbaru, Review 300 pending, draf sendiri 200). Paket lama yang sebagian butirnya belum dimuat bisa tampak kurang. | Belum diubah. Tombol "Muat lagi" di Bank menuntaskan; pertimbangkan kueri per id paket bila paket sering lama. |
| N6 | Info | Segmen di luar cakupan tetap memakai satu panggilan AI (AI yang menolak; kuota tidak dikembalikan karena panggilan terjadi). | Dicatat di AUDIT-PAKET-DAWR.md. |

## 2. Diperiksa dan baik

- Semua handler `api/*` memanggil autentikasi sesuai peran; satu-satunya yang tanpa login adalah `api/config.js` (konfigurasi web Firebase, memang publik). Aksi `paket` ditolak untuk Ustadz sebelum validasi dan kuota.
- `firestore.rules`: kunci wajib `soal` tidak berubah (soal lama dan klien lama tetap sah); kolom paket opsional dan berbatas (`urut` int 1-200, `dawr` 1-4, `cakupan` ≤120, `paket` ≤40); `config/*` dan riwayat konfigurasi tertutup untuk klien; penyusun hanya mengubah miliknya saat draft/revisi; editor tidak meninjau soalnya sendiri.
- Kueri Firestore: semua kueri di klien tercakup indeks bawaan atau gabungan indeks satu bidang (`tingkat` + `updatedAt` ada di `firestore.indexes.json`).
- Ekspor CSV melindungi sel berawalan `= + - @` (injeksi rumus). `dangerouslySetInnerHTML` hanya dipakai untuk keluaran Pegon yang sudah di-escape.
- Tidak ada rahasia di repositori (yang cocok pola hanya kunci palsu di tes).
- Paket Dawr: keempat bentuk butir (pilihan ganda, melanjutkan, isian, uraian) dari keluaran AI lolos `periksaSoal`; kutipan yang tidak cocok dengan teks tidak pernah masuk kunci; rujukan "menurut kitab/teks" ditolak atau dibuang di server dan klien.

## 3. Temuan lama: status sekarang

| # | Status |
|---|---|
| B1 `package-lock.json` | **Selesai.** Ada; CI memakai `npm ci`. |
| B2 CSP Report-Only dan `unsafe-eval` | **Selesai.** CSP kini ditegakkan (`script-src 'self'` plus Google), tanpa `unsafe-eval`. `style-src` masih `'unsafe-inline'` (Tailwind/gaya inline). |
| B3 Skrip CDN tanpa SRI | **Selesai.** Tidak ada CDN di `index.html`; semuanya dibundel Vite. |
| H4 Profil `pending` untuk akun Google mana pun | Masih terbuka bila `ALLOWED_EMAIL_DOMAIN` kosong (ada batas laju per akun, bukan per IP). Isi variabel itu bila madrasah memakai domain email sendiri. |
| H5 Dokumentasi host kitab | **Selesai.** `.env.example` dan kode sama. |
| H9 Cache Firestore tertinggal setelah Keluar | **Selesai.** `clearPersistence()` dipanggil saat Keluar. |
| H10 Nama paket `bank-soal-madrasah` | Kosmetik, belum diubah. |

## 4. Belum diuji (jujur)

`vite build`, `npm audit`, dan `excelConfig.test.js` (registry npm diblokir). Tampilan dan klik di browser sungguhan; Firestore dan aturan di emulator (aturan hanya dicocokkan lewat teks); panggilan AI nyata; Safari/iOS. Pemulihan draf Paket Dawr diuji lewat render server dengan data tiruan, bukan di browser.

## 5. Saran urutan kerja

1. Deploy (urutan: Publish `firestore.rules`, lalu aplikasi) dan jalankan `npm run build` serta `npm audit` di CI.
2. Coba satu Dawr kecil sampai terkirim ke editor; muat ulang halaman di tengah proses untuk memastikan hasil pulih.
3. Isi `ALLOWED_EMAIL_DOMAIN` bila memungkinkan (H4).
