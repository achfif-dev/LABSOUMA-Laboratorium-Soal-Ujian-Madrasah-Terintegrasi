> **ARSIP.** Laporan ini ditulis sebelum migrasi ke Vite (21 Okt 2026) dan sebagian besar temuannya (CDN, Babel, tanpa `package-lock.json`, CSP `unsafe-eval`) sudah tidak berlaku. Status terkini: lihat audit 24 Okt 2026 (CSP ditegakkan, `/api/session` dibatasi, `kunci.yml` dihapus). Yang masih terbuka: koleksi `kitab` terkurasi belum dipasang; gerbang persetujuan AI hanya jejak audit.

# Laporan audit dan integrasi: Bank Soal Madrasah + Pegonizer

Tanggal: 21 Oktober 2026. Cakupan: `Sistem-Bank-Soal-Madrasah-dan-Referensi-Maktabah-Syamilah-main` dan `Pegon-main`.

## 1. Ringkasan

- Bank Soal secara umum sehat: 98 tes bawaan lulus, aturan Firestore ketat, batas pemakaian dan pengembalian kuota rapi, kunci API disimpan terenkripsi.
- Pegon berfungsi sebagai satu halaman mandiri, tetapi fitur AI-nya hanya hidup di dalam claude.ai dan ada satu bug nyata pada mesinnya. Keduanya sudah diperbaiki dalam integrasi.
- Pegon kini menjadi tab **Pegonizer** di Bank Soal, memakai login, peran, kuota AI, dan ekspor yang sama. Total tes sekarang 105, semuanya lulus.

## 2. Temuan pada Bank Soal

| # | Tingkat | Temuan | Status |
|---|---|---|---|
| B1 | Sedang | Tidak ada `package-lock.json`, padahal `ci.yml` dan `eval.yml` memakai `npm ci` (perintah itu gagal tanpa lockfile). CI kemungkinan merah. | **Diperbaiki sementara:** `ci.yml` dan `eval.yml` kini memakai `npm install`, jadi CI tidak lagi gagal. Setelah `package-lock.json` di-commit (`npm install` di komputer Anda), kembalikan ke `npm ci` agar versi terkunci. |
| B2 | Sedang | CSP hanya mode *Report-Only* dan mengizinkan `unsafe-inline` dan `unsafe-eval`. Penyebabnya Babel-standalone dan Tailwind CDN dijalankan langsung di browser produksi. | Belum diubah. Perbaikan sebenarnya adalah build step (mis. Vite, yang sudah Anda pakai di proyek lain). |
| B3 | Sedang | Tujuh skrip CDN (Tailwind, React, ReactDOM, Babel, lucide, docx, Firebase) tanpa atribut `integrity` (SRI). | Belum diubah. Dengan build step, masalah ini hilang sendiri. |
| B4 | Rendah | Adapter Gemini hanya menerima teks, sehingga fitur membaca foto tidak mungkin. | **Diperbaiki:** `src/gemini.js` kini memetakan blok gambar ke `inlineData`. |
| B5 | Rendah | CSP belum mencantumkan `worker-src` untuk pdf.js. | **Diperbaiki** di `vercel.json`. |

Yang sudah baik dan sengaja tidak disentuh: aturan Firestore (peran, gerbang persetujuan, batas ukuran field, `config/*` tertutup untuk klien), `kitabFetch` memakai `redirect: 'manual'` dan daftar host yang diizinkan, enkripsi AES-256-GCM dengan AAD, pengembalian kuota saat kegagalan sisi server.

## 3. Temuan pada Pegon

| # | Tingkat | Temuan | Status |
|---|---|---|---|
| P1 | Sedang | **Bug mesin:** kata berpropertinama objek JavaScript lolos sebagai kata serapan Arab. Contoh: `constructor` menghasilkan teks `function Object() { [native code] }`. | **Diperbaiki:** kamus tanpa prototipe. Ada tes regresi. |
| P2 | Tinggi (fungsi) | "Perkuat dengan AI" dan baca-foto memakai `claude.use('sample')`, yang hanya ada di dalam claude.ai. Di luar itu, fitur tidak jalan (hanya menyalin prompt). | **Diganti** dengan `/api/assist` aksi `pegon` dan `pegonfoto` (login, peran, batas, plafon, refund). |
| P3 | Sedang | Impor kamus tanpa validasi, dan ejaan Arab dirender lewat `innerHTML` tanpa escape. File `.json` jahat atau salah bisa menyuntik HTML (vektor XSS-diri; menjadi XSS nyata bila kamus kelak dibagi antarpengguna). Impor juga memakai `Object.assign` dengan kunci `__proto__`. | **Diperbaiki:** `kamus.*` memvalidasi huruf Latin dan Arab, menolak `__proto__`, melewati entri buruk tanpa menggagalkan impor; antarmuka React meng-escape otomatis. |
| P4 | Rendah | "Unduh Word (.doc)" sebenarnya HTML bernama `.doc`. | **Diganti** dengan `.docx` asli (RTL). |
| P5 | Rendah | Foto dikirim ukuran penuh (bisa 5-10 MB). | Diperkecil ke maks. 1600 px JPEG di browser; server menolak di atas ±2,2 MB. |
| P6 | Rendah | `manifest.webmanifest` dirujuk tetapi tidak ada di repositori (disajikan SW secara virtual); `maximum-scale=1` menghalangi pinch-zoom; URL artifact claude.ai tertanam. | Tidak dibawa: Bank Soal punya manifest dan viewport sendiri. |
| P7 | Rendah | Tidak ada tes; kalibrasi hanya `console.warn`. | Ditambah `test/pegon.test.js` (7 tes). |

## 4. Apa yang diintegrasikan

| Berkas | Perubahan |
|---|---|
| `public/pegon.js` (baru) | Mesin Pegon dari aslinya (byte-per-byte pada bagian aturan dan kamus), plus tambalan P1, fasad `kamus.*`, `kalibrasiOk()`. |
| `src/pegon.js` (baru) | Meneruskan `public/pegon.js` ke server dan tes (pola sama dengan `kutipan.js`). |
| `src/pegonRules.js` (baru) | Aturan master untuk prompt AI. |
| `src/pegonService.js` (baru) | `perkuatPegon`, `fotoPegon`, validasi teks dan gambar. |
| `src/gemini.js` | Dukungan blok gambar. |
| `api/assist.js` | Aksi `pegon` dan `pegonfoto`; teks Latin tidak lewat validasi "wajib Arab". |
| `public/index.html` | Tab **Pegonizer** (teks, suara, file Word/PDF, foto, kamus), format ekspor **Soal Pegon (DOCX)** dengan sorot kuning untuk kata yang diragukan mesin. |
| `vercel.json`, `README.md` | `worker-src`; bagian dokumentasi Pegonizer. |
| `test/pegon.test.js` (baru) | 7 tes. |

Tidak ada koleksi Firestore baru, jadi `firestore.rules` tidak berubah. Service worker Pegon sengaja tidak dibawa (akan bentrok dengan lingkup aplikasi induk).

## 5. Cara memverifikasi

```bash
npm install
npm test            # 105 tes
vercel dev          # coba tab Pegonizer dan Export > Soal Pegon (DOCX)
```

## 6. Yang BELUM saya uji (jujur)

Diuji: mesin Pegon di Node, layanan AI dengan klien palsu, adapter gambar, validasi, sintaks JSX seluruh blok `text/babel`, dan pembuatan DOCX (mode pegon, daftar, kartu) dengan pustaka `docx`.

Belum diuji karena tidak ada browser, akun Firebase, atau kunci AI di sandbox: tampilan dan interaksi tab di browser sungguhan, login dan peran, panggilan nyata ke Gemini/Claude (terutama pembacaan foto), mikrofon, serta pemuatan lazy mammoth dan pdf.js. Pustaka `docx` lokal berversi 9.6.1, sedangkan halaman memuat 8.5.0 dari CDN; opsi yang dipakai (`bidirectional`, `rightToLeft`, `highlight`, `indent.start`) ada di keduanya, tetapi cek unduhan DOCX Pegon sekali di browser.

## 7. Saran lanjutan

1. Commit `package-lock.json` (B1).
2. Pindahkan front end ke Vite (B2, B3): CSP bisa ditegakkan, SRI tidak perlu, dan load time turun karena Babel tidak lagi jalan di browser.
3. ~~Kamus Pegon bersama~~ dan 4. ~~tombol "Pegonkan"~~: dikerjakan, lihat bagian 8.

## 8. Pembaruan 22 Oktober 2026: kamus Pegon bersama dan tombol Pegonkan

| # | Tingkat | Temuan / keputusan | Status |
|---|---|---|---|
| K1 | Tinggi (desain) | Kamus bersama mengubah hasil Pegon semua pengguna sekaligus, termasuk ekspor DOCX yang sudah pernah dibuat. Satu entri salah menyebar ke semua. | Mitigasi: tulis hanya editor/admin; tiap entri membawa penulis dan waktu (`updatedByName`, `updatedAt`); daftar bersama terlihat dan bisa dihapus editor. Tidak ada riwayat versi. |
| K2 | Sedang | Jika entri lokal dibiarkan setelah dibagikan, salinan usang di satu perangkat menimpa koreksi editor lain di perangkat itu. | Entri yang berhasil dibagikan otomatis dicabut dari lokal. Entri lokal yang berbeda dari bersama ditandai dan bisa dibuang satu klik. |
| K3 | Sedang | Data Firestore tidak boleh dipercaya hanya karena aturan menjaganya (aturan bisa salah terpasang, salah publish, atau diubah lewat konsol). | Mesin memvalidasi ulang tiap entri saat memuat (`muatBersama`): pola Latin, pola Arab sempit, id cocok isi, batas 5000. Entri jahat dilewati, bukan menggagalkan sisanya. Ada tes dan uji render dengan dokumen berisi HTML. |
| K4 | Rendah | Ejaan Arab bersama sengaja lebih sempit daripada impor lokal (tanpa karakter tak terlihat seperti ZWJ, tanpa blok presentasi). | Pola yang sama di mesin dan `firestore.rules`; `test/kamusRules.test.js` gagal bila keduanya menyimpang (sudah dicoba dengan mengubah aturan). |
| K5 | Sedang | Kata berhubung (rekan-rekan) dicari mesin per bagian, bukan per gabungan, sehingga entri berhubung di kamus tidak pernah terpakai. | Panel Pegonkan memecah kata berhubung sebelum menawarkan perbaikan. |
| K6 | Keputusan | Tombol Pegonkan **tidak menimpa** isian Latin. Telaah AI, cek kutipan, dan uji jawab buta bekerja pada Latin; menimpa akan merusaknya dan sulit dibatalkan. | Pratinjau, salin, dan perbaikan kamus; ekspor Pegon tetap memakai konversi saat ekspor. |

Perubahan berkas: `public/pegon.js` (lapisan bersama, `muatBersama`, `bentukEntri`, `bentrok`, `entriLokal`, `jenisPerbaikan`), `firestore.rules` (koleksi `kamusPegon`), `public/index.html` (langganan kamus di App, bagian kamus bersama di Pegonizer, komponen `PegonSoal` dan tombol Pegonkan), `test/pegon.test.js` (+7), `test/kamusRules.test.js` (baru, 2), `README.md`.

Diuji: 122 tes lulus; sintaks JSX seluruh blok `text/babel` dikompilasi dengan Babel; komponen `PegonSoal`, `PegonKamus`, dan `Compose` dirender dengan React 18 sungguhan di jsdom (peran editor dan penyusun, dokumen kamus berisi HTML, isian kosong).

**Belum diuji:** `firestore.rules` terhadap emulator Firestore (tidak ada emulator di lingkungan ini); layar sungguhan di browser dan ponsel; langganan `onSnapshot` terhadap Firebase nyata; batas 10 panggilan akses per permintaan pada rules (penyimpanan sengaja per dokumen, bukan batch, karena batas itu tidak pasti untuk batch). Selain itu, penyusun belum punya jalur usulan ke kamus bersama; jalurnya masih ekspor lalu serahkan ke editor.

## 9. Pembaruan 22 Oktober 2026: isian yang hilang saat refresh

Keluhan: isian form soal yang belum disimpan hilang saat halaman dimuat ulang, begitu juga isian dan konfigurasi lain yang belum disimpan.

**Akar masalah.** Seluruh isian hidup hanya di state React (`useState`). Tidak ada satu pun yang ditulis ke penyimpanan browser (`public/index.html` tidak memanggil `localStorage` sama sekali), jadi muat ulang, tab tertutup, atau browser mati membuangnya. Yang sudah diingat hanya tab aktif (lewat `#hash`). Peringatan saat Keluar hanya menutupi satu jalan hilangnya data. Dua jalan lain tanpa peringatan: tombol **Edit** di Bank Soal menimpa form yang sedang berisi, dan **Kosongkan** menghapus form tanpa konfirmasi.

| # | Tingkat | Temuan | Status |
|---|---|---|---|
| D1 | Tinggi | Form Penyusunan Soal (teks kitab, pertanyaan, opsi, kunci, pembahasan, tingkat/mapel/level) hilang saat refresh. | **Diperbaiki:** draf otomatis per akun di `localStorage`. |
| D2 | Sedang | State lokal Compose (tautan sumber, halaman situs, mode tambah, fokus soal, nama kitab manual) hilang bahkan saat pindah tab. | **Diperbaiki:** ikut disimpan dan dipulihkan. |
| D3 | Tinggi (admin) | Draf **Konfigurasi** (tingkat, mapel, katalog kitab, daftar massal) hilang saat refresh. Pekerjaan admin bisa puluhan baris. | **Diperbaiki.** Bentuk draf divalidasi ketat saat dibaca; bila konfigurasi server berubah sejak draf dibuat, pemulihan tetap jalan tetapi admin diperingatkan. |
| D4 | Sedang | Pilihan provider dan model di **Pengaturan AI** hilang. | **Diperbaiki.** Kunci API sengaja **tidak** disimpan di browser (rahasia); kolomnya kosong lagi setelah refresh, dan pesan pemulihan menyebut itu. |
| D5 | Rendah | Catatan Revisi editor di tab Review hilang. | **Diperbaiki** (per soal; dihapus setelah setuju/revisi terkirim). |
| D6 | Rendah | Teks Latin dan mode Pegonizer, isian tambah kamus, filter Bank/Ekspor, format ekspor dan soal terpilih ikut hilang. | **Diperbaiki.** |
| D7 | Sedang | Tombol **Edit** menimpa form yang berisi tanpa bertanya. | **Diperbaiki:** konfirmasi bila form berisi. |
| D8 | Rendah | **Kosongkan** menghapus semua isian tanpa konfirmasi. | **Diperbaiki:** konfirmasi bila form berisi. |
| D9 | Rendah | Pesan saat Keluar tidak lagi benar (isian kini tidak hilang). | **Diganti:** menjelaskan bahwa draf tetap ada di perangkat ini dan cara menghapusnya di komputer bersama. |

**Cara kerja.** `public/draft.js` (diteruskan ke tes lewat `src/draft.js`, pola yang sama dengan `kutipan.js`):

- Kunci `labsouma:v1:<uid>:<nama>`: akun lain di perangkat yang sama tidak melihat draf.
- Penulisan ditunda 500 ms agar mengetik tidak menulis disk tiap huruf, lalu ditulis paksa saat `pagehide` / tab disembunyikan, supaya refresh sesaat setelah mengetik tetap aman.
- Kedaluwarsa 30 hari; data rusak, versi lain, atau bukan JSON dianggap tidak ada. Bentuk form dan konfigurasi dibangun ulang dari bidang yang dikenal dan bertipe benar, jadi draf rusak tidak bisa membuat halaman gagal tampil berulang-ulang.
- Draf dihapus begitu isiannya berhasil disimpan ke server. Bila penyimpanan gagal, draf dan isian tetap ada.
- Penyimpanan penuh atau diblokir tidak melempar galat: muncul peringatan kuning di form, dan bila browser memblokir total, tab yang berisi form meminta konfirmasi sebelum ditutup.

**Batasan yang disengaja / yang perlu Anda tahu.**

1. Draf tersimpan di perangkat, **bukan** di server: tidak ikut pindah ke perangkat lain. Untuk itu tetap tekan Simpan Draft.
2. Draf berupa teks biasa di browser. Di komputer bersama, tekan **Kosongkan** sebelum Keluar.
3. Tidak ikut dipulihkan: hasil AI (ide fokus, telaah, uji buta, hasil konversi Pegon), foto yang dipilih, suntingan manual pada hasil Pegon, dan kunci API. Hasil AI memakai kuota; menyimpannya akan menampilkan telaah yang bisa sudah usang terhadap isian yang berubah.
4. Mengedit soal lalu refresh mempertahankan soal yang sedang diedit. Bila soal itu sudah diubah orang lain, aturan Firestore menolak simpan (pesan "soal sudah diubah orang lain" yang sudah ada).
5. Kamus Pegon perangkat (`pegon.js`) memang sudah memakai `localStorage` sejak awal; tidak diubah.

**Pengujian.** `test/draft.test.js` (12 tes: tunda dan flush, pemisahan akun, kedaluwarsa, data rusak, penyimpanan penuh/null, batas ukuran). Total 134 tes lulus. Di Chromium sungguhan (React dibundel lokal, Firebase dan API ditiru): 39 skenario, termasuk refresh sesaat setelah mengetik, simpan lalu refresh (draf tidak "hidup lagi"), dua akun, draf rusak, konfigurasi, Pengaturan AI (kunci tidak ada di `localStorage`), catatan review, edit dari Bank, dan pesan Keluar. Versi asli diuji dengan skenario yang sama dan gagal pada D1 (bug terkonfirmasi).

**Belum diuji:** Firebase dan Firestore sungguhan, login Google, dan panggilan AI nyata (ditiru di uji browser); Safari/iOS (hanya Chromium); dan perilaku `localStorage` di mode privat browser selain lewat tiruan kegagalan.

## 10. Perbaikan 22 Oktober 2026: halaman blank setelah pembaruan draf otomatis

**Gejala.** Setelah versi dengan draf otomatis dipasang, halaman blank. Konsol: `RangeError: Maximum call stack size exceeded` berulang di `Object.get (<anonymous>:...)`, dilaporkan oleh `react-dom.production.min.js`.

**Penyebab (terkonfirmasi).** `<script type="module">` menaruh modul di `window.Draft`. Blok `text/babel` lalu mendeklarasikan `const Draft = new Proxy({}, { get: (_, k) => (window.Draft || DRAFT_NOOP)[k] })`. Babel-standalone mengubah `const` tingkat atas menjadi `var` global, sehingga `window.Draft` kini menunjuk ke Proxy itu sendiri dan menimpa modul. Setiap `Draft.read(...)` pada render pertama membaca `window.Draft` (yaitu Proxy yang sama), yang memanggil `get` lagi, tanpa henti. Galat terjadi saat render, dan React 18 membongkar seluruh pohon: layar blank.

**Mengapa lolos dari uji sebelumnya.** Uji browser di bagian 9 membundel JSX secara lokal, sehingga `const` tetap `const` dan tidak bocor ke `window`. Bug ini hanya muncul di bawah Babel-standalone di halaman sungguhan.

| # | Tingkat | Perubahan | Status |
|---|---|---|---|
| E1 | Tinggi | Modul disimpan di `window.LabDraft`; Proxy membaca `window.LabDraft`. Tidak ada lagi nama global yang bertabrakan. | **Diperbaiki** |
| E2 | Sedang | Tidak ada penangkap galat: satu galat render apa pun membuat layar blank tanpa pesan. Ditambah `ErrorBoundary` di sekitar `<Root />` dengan tombol **Muat ulang** dan jalan keluar **Hapus draf di perangkat ini** bila draf rusak membuat galat berulang. | **Ditambah** |

**Pengujian.** Di Chromium sungguhan: kode lama mereproduksi `RangeError: Maximum call stack size exceeded`; kode baru memuat normal, dan draf yang ditulis dengan `Draft.save` bertahan setelah refresh langsung (lewat `pagehide`), tidak terbaca oleh akun lain. Sintaks seluruh blok `text/babel` bersih, `node --test`: 134 lulus. **Belum diuji:** seluruh aplikasi di bawah Babel-standalone dari CDN (sandbox tanpa internet); uji dengan membuka situs setelah deploy, tab Penyusunan Soal, ketik, refresh.

**Bila masih blank setelah deploy:** hard refresh (Ctrl+Shift+R) agar `index.html` lama tidak dipakai dari cache browser, lalu kirim galat konsol yang baru.

## 11. Fitur: backup soal dan kitab ke Google Drive (22 Oktober 2026)

**Kebutuhan.** Editor dan admin dapat mencadangkan soal dan kitab ke Google Drive agar data Firestore gratis tidak cepat penuh.

**Analisis model data yang mendasari rancangan.**
- Soal ada di koleksi `soal`; staf boleh membaca semuanya. Katalog kitab, mapel, dan tingkat ada di satu dokumen `config/app` yang klien tidak boleh akses (hanya lewat `/api/app-config`).
- Aturan Firestore melarang klien membuat soal atas nama penyusun lain atau berstatus Disetujui. Jadi **pemulihan harus lewat server (Admin SDK)**, dengan validasi yang mencerminkan `validContent()`.
- Fungsi Vercel dibatasi sekitar 4,5 MB per permintaan/respons. Jadi soal dibaca **langsung di browser** (per 300 dokumen, `source: 'server'`) dan dipulihkan per 100 soal.
- Token Drive milik pengguna (Google Identity Services, scope `drive.file`) hanya di memori browser: tidak ada rahasia baru di server, hanya `GOOGLE_DRIVE_CLIENT_ID`.

| # | Bagian | Keterangan |
|---|---|---|
| B1 | Cadangan | Baca semua soal, tambah katalog kitab, unggah multipart, **unduh ulang dan bandingkan**; gagal verifikasi = tidak dianggap berhasil |
| B2 | Arsip (admin) | Hapus dari Firestore hanya soal Disetujui, lama tidak berubah, dan ada di cadangan terverifikasi; transaksi per 100 melewati soal yang `updatedAt`-nya berubah |
| B3 | Pulihkan (admin) | `/api/backup` aksi `pulihkan`: validasi ketat per entri, mode lewati/timpa, entri buruk dilaporkan tanpa menggagalkan sisanya; katalog kitab lewat `/api/app-config` |
| B4 | Hak akses | `info`: editor dan admin. `pulihkan` dan arsip: admin. Aturan Firestore **tidak diubah** |
| B5 | CSP | Skrip dan gaya `accounts.google.com` ditambahkan (mode report-only) |

**Pengujian.** `test/backup.test.js` (11 tes: format, kandidat arsip, klien Drive dengan fetch tiruan, pemetaan galat, validasi entri terhadap `firestore.rules`, pemulihan dengan Firestore tiruan, hak akses endpoint). Uji Chromium atas komponen asli (`BackupTab` dan `drive.js`; Firestore, Google, Drive, dan `/api/*` ditiru): 24 pemeriksaan, termasuk 650 soal tiga halaman baca, arsip dengan soal yang diubah di tengah jalan, verifikasi gagal, peran editor, pemulihan 7 permintaan, dan izin ditolak. Dijalankan enam kali berturut-turut tanpa gagal.

**Belum diuji.** Terhadap Google Drive dan jendela izin Google yang sungguhan (sandbox tanpa internet): pemasangan OAuth di Cloud Console, perilaku pop-up di browser tertentu, dan unggahan berkas di atas sekitar 5 MB. Uji sekali setelah deploy dengan akun editor dan admin sebelum memakai Arsip pada data penting. Mulailah dengan cadangan, cek berkasnya di Drive, lalu coba arsip 365 hari dulu.

## 12. Perbaikan 22 Oktober 2026: ekspor Soal Pegon (DOCX)

**Keluhan.** Teks di DOCX Pegon tampak amburadul dan filenya dirasa tidak bisa diedit. Berkas DOCX asli pengguna tidak tersedia; audit dilakukan dengan membangun ulang DOCX dari kode (mesin Pegon asli, pustaka `docx` 9.6.1), memeriksa XML, dan merender di LibreOffice.

| # | Tingkat | Temuan | Status |
|---|---|---|---|
| F1 | Sedang | Koma desimal menjadi koma Arab (`2,5%` menjadi `2،5%`); `Rp` ikut dipegonkan; URL dan email menjadi huruf acak; kode seperti `C2` terpecah. | **Diperbaiki** di `public/pegon.js` (`convertText` melindungi URL, email, nominal, kode huruf+angka, angka bersambung pemisah). 2 tes baru. |
| F2 | Sedang | Stimulus dan pertanyaan digabung satu paragraf; semua baris baru diratakan menjadi spasi. | **Diperbaiki:** tiap baris sumber menjadi paragraf sendiri. |
| F3 | Sedang | Rujukan kitab, nama Arab kitab, indikator, dan teks sumber tidak ikut di mode Pegon (ada di mode Word biasa). | **Diperbaiki:** ditulis di bagian kunci dan pembahasan. |
| F4 | Rendah | Alasan sorotan kuning hilang di DOCX. | **Diperbaiki:** tiap kata bersorot mendapat komentar Word berisi alasannya (dilewati bila pustaka tidak punya API komentar). |
| F5 | Sedang | DOCX hanya berisi Pegon, tanpa pembanding Latin, sehingga sulit diperiksa dan disunting. | **Ditambah** format **Soal Pegon + Latin (DOCX)**: baris Latin asli (abu-abu) di bawah tiap paragraf Pegon. |
| F6 | Rendah | Judul bagian kunci memuat `&` Latin. | Diganti "dan". |

**Tidak diubah (belum terbukti):** font `Traditional Arabic` (bawaan Office Windows; di Android atau macOS akan diganti, cakupan huruf Pegon tidak bisa diverifikasi di sandbox), dan keluhan "tidak bisa diedit": XML tidak memuat pengaman dokumen, jadi dugaan utama adalah Protected View atau aplikasi penampil. Perlu info aplikasi dan perangkat pembuka file.

**Diuji:** 147 tes lulus; DOCX mode `pegon`, `pegonlatin`, `daftar`, `kartu` dibangun dengan kode `index.html` yang sebenarnya; XML diperiksa (komentar, tidak ada teks HTML bocor, angka utuh); render LibreOffice. **Belum diuji:** pustaka `docx@8.5.0` dari CDN (sandbox tanpa internet; kode memakai pemeriksaan keberadaan API komentar), dan pembukaan di Word/WPS/Google Docs sungguhan.

## 13. Audit konfigurasi dan fitur: kelas terpisah, sistem ujian, penempatan kitab (22 Oktober 2026)

Cakupan: alur konfigurasi tingkatan, kelas, kitab (`src/appConfig.js`, menu Konfigurasi, form soal, filter, ekspor, cadangan, `firestore.rules`).
Bagian lain aplikasi tidak diaudit ulang di sini (lihat bagian 2 sampai 12).

### Temuan

| # | Tingkat | Temuan | Status |
|---|---|---|---|
| T1 | Tinggi (fungsi) | Kelas hanya teks keterangan (`kelas` pada tingkat), tidak tersimpan pada soal dan tidak bisa difilter. Kitab hanya dipetakan ke **tingkat**, sehingga tidak bisa dinyatakan kitab itu untuk kelas berapa. | **Diperbaiki:** `soal.kelas`, filter kelas, `kitab.penempatan` per kelas. |
| T2 | Tinggi (fungsi) | Tidak ada konsep periode ujian (catur wulan atau semester). | **Diperbaiki:** `sistemUjian` (Semester 4 ujian, Catur Wulan 3 ujian; nama dan periode bisa diubah), dipilih per tingkat, `soal.periode`. |
| T3 | Sedang | Penanda "ada perubahan belum disimpan" membandingkan `JSON.stringify` yang bergantung urutan kunci objek. Menambah field baru mudah membuat tombol Simpan aktif palsu atau mati. | **Diperbaiki:** pembanding kanonik (kunci diurutkan); susunan pemetaan diurutkan seperti server. |
| T4 | Sedang | Pemulihan draf konfigurasi setelah refresh membangun ulang objek dari daftar bidang yang dikenal, jadi field baru akan **diam-diam hilang** (pemetaan kelas yang belum disimpan lenyap saat halaman dimuat ulang). | **Diperbaiki:** `normCfgDraft` ikut memuat sistem ujian, sistem per tingkat, dan penempatan. |
| T5 | Sedang | Mengganti kunci atau menghapus tingkat, atau menghapus periode, tidak membersihkan rujukan di data turunan. | **Diperbaiki** di UI dan di server (rujukan yang sudah tidak ada dibuang saat simpan; ada peringatan di kartu kitab sebelum disimpan). |
| T6 | Sedang (risiko) | `config/app` adalah satu dokumen Firestore (maks. 1 MiB). Pemetaan kelas plus cakupan materi di banyak kitab bisa melewatinya dan gagal dengan galat 500. | **Diperbaiki:** batas 800.000 byte dengan pesan 422 yang jelas (ada tes). |
| T7 | Sedang (kompatibilitas) | `createKeys()` di `firestore.rules` mewajibkan seluruh kunci. Menambah `kelas` dan `periode` sebagai kunci wajib akan menolak klien lama dan membuat soal lama tak bisa diedit. | **Dihindari:** keduanya opsional (`opsiKeys()`). Klien baru tidak mengirim kunci itu bila kosong dan soal belum pernah memilikinya. |

Temuan lama yang **masih terbuka** (tidak disentuh di sini): B1 tanpa `package-lock.json` (CI memakai `npm install`), B2 CSP masih *Report-Only* dengan `unsafe-inline`/`unsafe-eval`, B3 skrip CDN tanpa SRI.
Catatan kebersihan: `kamus-bersama-pegonkan.patch` (43 KB, tidak dirujuk kode mana pun) tertinggal di akar repositori dan sebaiknya dihapus dari repo; nama paket di `package.json` masih `bank-soal-madrasah`.

### Keputusan desain yang perlu Anda ketahui

1. **Sistem ujian dipilih per tingkat**, bukan satu untuk seluruh madrasah. Bila semua tingkat memakai sistem yang sama, pilih sistem yang sama di tiap tingkat.
2. **Kitab tanpa pemetaan tetap berlaku untuk semua kelas dan ujian di tingkatnya.** Ini menjaga konfigurasi lama. Konsekuensinya: Anda yang harus memetakan kitab satu per satu; tidak ada pemetaan otomatis. Begitu satu kelas dicentang pada suatu tingkat, hanya kelas yang dicentang yang berlaku di tingkat itu.
3. **Kelas yang dicentang menyimpan daftar ujian eksplisit** (default: semua ujian kelas itu). Pembagian "kitab dibagi 4 per kelas" dinyatakan lewat ujian mana yang dicentang dan, bila perlu, kolom **cakupan materi** (teks bebas; tidak diperiksa terhadap halaman kitab).
4. **Soal lama tidak diisi kelas dan ujiannya secara otomatis.** Soal lama muncul di filter bila Kelas/Ujian = Semua dan tidak muncul bila salah satunya dipilih. Mengisinya perlu dilakukan per soal (edit) atau lewat skrip tersendiri.
5. **Mengganti nama sistem atau ujian aman** (soal menyimpan kode). **Menghapus ujian** membuat soal lama menampilkan kodenya, bukan namanya. **Mengganti nama kelas** memutus pemetaan kitab lama ke kelas itu.
6. Daftar kitab bawaan hanyalah usulan: mis. *Fathul Mu'in* bawaan hanya di Aliyah. Madrasah Anda memakainya di Tsanawiyah, jadi atur di Konfigurasi.
7. Ekspor: kolom **Kelas** dan **Ujian** ditambahkan di **akhir** CSV lengkap agar urutan kolom lama tidak berubah bagi yang mengimpornya. Format Moodle XML dan CSV Forms tidak berubah. Telaah AI dan uji jawab buta belum menerima kelas (hanya penyusunan soal yang mengirim kelas ke AI).
8. Memulihkan **cadangan lama** (sebelum pembaruan ini) dengan opsi "pulihkan katalog" menimpa pemetaan kelas dengan keadaan kosong dan sistem ujian dengan bawaan.

### Cara memverifikasi

```bash
npm install
npm test     # 162 tes (147 lama + 15 baru di test/ujian.test.js)
```

Urutan rilis: (1) tempel `firestore.rules` di Firebase Console dan **Publish**, (2) deploy aplikasi, (3) buka Konfigurasi: pilih sistem ujian tiap tingkat, periksa kelas, lalu petakan kitab (**Atur kelas & ujian**).

### Yang BELUM saya uji (jujur)

Diuji: logika murni (`public/ujian.js`), validasi dan pembersihan server (`sanitizeAppConfig`, penempatan, batas ukuran, konfigurasi lama), validasi cadangan, isi prompt AI, kesesuaian teks `firestore.rules`, dan sintaks JSX seluruh blok `text/babel` beserta pemeriksaan nama yang tidak terdefinisi.
**Belum diuji:** tampilan dan interaksi di browser sungguhan (tidak ada browser atau React di sandbox), yaitu editor Sistem Ujian, matriks kelas dan ujian, pemulihan draf konfigurasi, filter, dan unduhan ekspor. Aturan Firestore diuji hanya lewat pencocokan teks, bukan di emulator. Cek sekali di browser: ubah nama ujian, petakan satu kitab ke dua kelas, simpan, muat ulang halaman, lalu susun satu soal dan ekspor CSV.

## 14. Fitur: saran bab penting (AI, haluan Aswaja) dan kisi-kisi (23 Oktober 2026)

### Temuan saat audit
- `clean()` di `src/soalService.js` tidak membuang tag `</daftar_isi>`. Daftar isi tempelan bisa menyelipkan instruksi keluar dari blok data. Diperbaiki, diuji lewat unit dan handler.
- `simpanBerkas` ternyata sudah dideklarasikan di bagian Pegonizer. Deklarasi ganda `const` pada satu blok Babel membuat seluruh aplikasi gagal dimuat. Tertangkap karena blok asli dijalankan di Node, bukan dari cek sintaks (cek sintaks lolos). Salinan dihapus.
- Lebar kolom tabel DOCX kisi-kisi diabaikan LibreOffice (persentase pada sel). Diganti lebar tetap DXA dan tata letak tetap; hasilnya dilihat lewat render PDF.
- `package-lock.json` (B1): TIDAK bisa dibuat di sandbox (tanpa akses registry npm; lockfile butuh versi dan hash dari registry, tidak boleh dikarang). Disiapkan `.github/workflows/kunci.yml` (jalankan sekali dari tab Actions), dan `docx` kini dideklarasikan sebagai devDependency karena tes DOCX kisi-kisi sebelumnya otomatis dilewati bila paket itu tidak terpasang. Setelah lockfile ada, ganti `npm install` di `ci.yml` dan `eval.yml` menjadi `npm ci`.
- Masih terbuka dari audit lama: CSP masih Report-Only dengan `unsafe-inline`/`unsafe-eval`, skrip CDN tanpa SRI.

### Yang ditambahkan
- Tab **Fokus Ujian & Kisi-kisi**. Aksi `bab` di `/api/assist` (`src/babService.js`, kerangka di `src/aswaja.js`): saran bab dengan prioritas inti/penting/pendukung, alokasi soal (dihitung server, jumlahnya tepat), penanda khilafiyah, dan catatan pendekatan.
- Bila daftar isi ditempel, tiap bab dicocokkan ulang oleh server; bab di luar daftar isi ditandai. Tanpa daftar isi, hasil bertanda **perlu diverifikasi**. Nada teks bebas model diperiksa `periksaSikap` (hanya penanda).
- Field opsional `bab` pada soal: form, chip, CSV RDM (kolom ditambah di akhir), cadangan, `firestore.rules`.
- Kisi-kisi (`public/kisi.js`): DOCX guru, Lembar Fokus murid, gabungan, CSV, teks. Kunci, opsi, dan pembahasan tidak pernah ikut. Analisis cakupan terhadap saran AI.

### Keputusan desain
- Saran AI tidak disimpan setelah refresh (memakai kuota AI). Bab yang dipilih tersimpan pada soal.
- Saran hanya dipakai untuk urutan dan analisis kisi-kisi bila untuk kitab yang sama dengan soal terpilih.
- Tombol "Susun soal untuk bab ini": form kosong diisi (kitab, jenjang, bab); form berisi hanya kolom Bab yang diisi.
- Nomor soal kisi-kisi mengikuti urutan soal terpilih; samakan filter dan pilihan dengan tab Export agar nomor cocok. Halaman yang tertulis adalah halaman sumber soal, bukan seluruh bab.

### Cara memverifikasi
```bash
npm test     # 184 tes, semuanya lulus pada 23 Oktober 2026
```
Urutan rilis: (1) tempel `firestore.rules` di Firebase Console dan **Publish**, (2) deploy aplikasi.

### Yang BELUM saya uji (jujur)
Diuji: logika kisi-kisi dan saran bab, handler `/api/assist` aksi `bab` (sukses, validasi sebelum kuota, injeksi tag, peran pending, pengembalian kuota), render komponen baru dengan React 19 di Node, dan DOCX lewat render LibreOffice (kolom dan Lembar Fokus dilihat).
**Belum diuji:** klik dan alur di browser sungguhan, panggilan Gemini nyata, DOCX dengan pustaka `docx` 8.5.0 dari CDN (tes memakai 9.x), dan aturan Firestore di emulator. Cek sekali: minta saran bab untuk satu kitab, klik "Susun soal untuk bab ini", simpan satu soal, lalu unduh Kisi-kisi + Lembar Fokus.

## 9. Pembaruan 23 Oktober 2026: bentuk soal (melanjutkan, benar-salah, isian, uraian) dan audit ulang

### Audit ulang (kondisi sebelum perubahan)

| # | Tingkat | Temuan | Status |
|---|---|---|---|
| A1 | Sedang | Model data soal terkunci pada pilihan ganda: `kunci` hanya A-E, `opsi` wajib, prompt AI, skema alat, telaah, uji buta, semua ekspor, kisi-kisi ("Pilihan ganda (5 opsi)" tertulis tetap), cadangan, dan `firestore.rules` menganggap satu bentuk. | Diperbaiki (bagian di bawah). |
| A2 | Rendah | Tes `ujian.test.js` mengunci daftar field opsional di `firestore.rules` secara harfiah. Bagus sebagai penjaga, tetapi perubahan sah gagal sampai tesnya ikut diubah. | Tes diperbarui bersama aturan. |
| A3 | Sedang | B2 dan B3 dari bagian 2 masih berlaku: CSP masih Report-Only dengan `unsafe-inline` dan `unsafe-eval`; 0 dari 7 skrip CDN punya `integrity`. `npm audit --omit=dev`: 0 kerentanan. | Belum diubah. Perlu build step (Vite). |
| A4 | Info | B1 (lockfile) sudah teratasi: `package-lock.json` ada dan `ci.yml` memakai `npm ci`. | Selesai. |

### Perubahan

- `public/bentuk.js` (baru, sumber tunggal; `src/bentuk.js` meneruskannya): definisi lima bentuk, saran per jenjang, `periksaSoal`, `selaraskan`, `kunciTeks`.
- `src/soalService.js`: `validateInput` menerima `bentuk` (kosong = pilgan, asing = 400), `ATURAN_BENTUK` + `systemPromptFor`, skema alat per bentuk (`toolSoalFor`), `normalizeSoal(raw, level, bentuk)`. Untuk pilgan prompt, skema, dan kunci keluaran identik dengan sebelumnya.
- `src/assistService.js`: telaah memakai skema perbaikan dan aturan telaah per bentuk; `validateSoalDraft` sadar bentuk. `src/cekButa.js`: menolak isian/uraian. `src/backup.js`: memvalidasi `bentuk`, `jawaban`, `rubrik`.
- `firestore.rules`: `bentuk`, `jawaban`, `rubrik` opsional dengan batas (2000 karakter), masuk daftar kunci opsional dan daftar admin; kunci wajib tidak berubah.
- `public/index.html`: selektor bentuk, form per bentuk, pratinjau, uji buta disembunyikan untuk isian/uraian, filter bentuk, ekspor DOCX/CSV/GIFT/Moodle XML. `public/kisi.js`, `public/kutipan.js` menyesuaikan.
- Tes: 184 menjadi 210 (`test/bentuk.test.js`, `test/bentukUi.test.js`; kode ekspor diambil langsung dari `index.html` dan dijalankan dengan pustaka `docx` asli).

### Keputusan dan risiko

| # | Keputusan / risiko |
|---|---|
| D1 | "Melanjutkan" ditafsirkan dua cara dan dibuat keduanya: pilihan (kelanjutan dipilih dari 5 opsi) dan isian (ditulis sendiri). Tradisi pesantren umumnya isian; bila hanya satu yang dipakai, bentuk lain bisa disembunyikan lewat `BENTUK_IDS`. |
| D2 | Saran bentuk per jenjang (`BENTUK_PER_TINGKAT`) adalah perkiraan pedagogis awal, bukan ketentuan Kemenag. Guru/kepala madrasah perlu menyesuaikan. |
| D3 | Benar-salah disimpan sebagai `opsi {A: Benar, B: Salah}` + `kunci` A/B, sehingga seluruh jalur pilihan ganda (uji buta, kutipan, sikap, ekspor) ikut bekerja tanpa cabang baru. |
| D4 | Isian dan uraian tidak bisa diuji buta; penjagaan mutunya hanya Telaah AI dan editor manusia. Kunci isian yang ambigu (lebih dari satu jawaban benar) adalah risiko terbesar bentuk ini; prompt melarangnya, tetapi tidak ada pemeriksa otomatis. |
| D5 | Urutan rilis wajib: Publish `firestore.rules` dulu, baru deploy. Klien baru tidak mengirim field baru untuk soal pilihan ganda, jadi soal biasa tetap bisa disimpan walau aturan belum dipublish; hanya bentuk baru yang gagal. |

### Yang BELUM saya uji (jujur)
Diuji: logika bentuk, validasi, prompt dan skema per bentuk dengan klien AI palsu, handler `/api/generate`, cadangan, aturan Firestore (hanya pencocokan teks), kisi-kisi, seluruh pembuat ekspor, dan sintaks JSX `index.html` (Babel).
**Belum diuji:** tampilan dan interaksi form di browser sungguhan (tidak ada browser di sandbox), mutu soal dari model nyata untuk tiap bentuk, impor GIFT/Moodle XML di Moodle sungguhan untuk benar-salah, isian, uraian, DOCX dengan `docx` 8.5.0 dari CDN (tes memakai 9.6.1), dan aturan Firestore di emulator.


## 15. Audit menyeluruh dan fitur cadangan konfigurasi (23 Oktober 2026)

Cakupan: seluruh kode server (`src/`, `api/`), aturan Firestore, konfigurasi penerapan (`vercel.json`, CI), klien (`public/index.html`, `public/*.js`) khususnya jalur konfigurasi, pengaturan AI, dan titik penyuntikan HTML. Dibaca langsung dari kode; tes dijalankan ulang.

### Temuan

| # | Tingkat | Temuan | Status |
|---|---|---|---|
| H1 | **Tinggi (operasional)** | **"Pulihkan bawaan" menghapus `config/app` secara permanen**, dan setiap Simpan menimpa tanpa jejak. Satu salah klik admin menghapus semua tingkatan, kelas, sistem ujian, mapel, kitab, dan pemetaan kelas buatan madrasah, tanpa jalan kembali (yang tersisa hanya bawaan kode). Hal yang sama untuk model/penyedia AI di `config/ai`. | **Diperbaiki:** cadangan otomatis atomik sebelum setiap perubahan, titik pulih bernama, pratinjau perubahan, pemulihan yang juga dapat dibatalkan (`src/configBackup.js`, `api/config-backup.js`, bagian "Cadangan & Riwayat" di UI). |
| H2 | Sedang | **Dua admin menyimpan bersamaan: yang terakhir menimpa tanpa peringatan** (editor membaca konfigurasi sekali saat dibuka). | **Diperbaiki:** `basisAt`; bila sudah ada simpanan lain, ditolak 409 dengan nama admin yang menyimpan. Klien lama tanpa `basisAt` tetap diterima (kompatibel). |
| H3 | Sedang | **`clean()` bisa dilewati tag pembatas bersarang.** Penghapusan `</teks_kitab>` hanya satu putaran: `<</teks_kitab>/teks_kitab>` menjadi `</teks_kitab>`. Pengguna (atau teks tempelan) bisa keluar dari blok data prompt AI dan menyelipkan instruksi. Dampak terbatas (pengguna sudah login, keluaran AI ditinjau editor), tetapi pertahanannya tidak berfungsi seperti yang dimaksudkan. | **Diperbaiki:** pembersihan diulang sampai stabil, dengan pengaman untuk sarang yang sangat dalam. Tes regresi ditambah (diverifikasi gagal pada kode lama). |
| H4 | Rendah | `/api/session` membuat profil `pending` untuk akun Google mana pun yang emailnya terverifikasi bila `ALLOWED_EMAIL_DOMAIN` kosong (bawaan). Tanpa batas laju, koleksi `users` bisa dibanjiri akun asing. Mereka tetap tidak punya akses (`pending`). | **Belum diubah.** Isi `ALLOWED_EMAIL_DOMAIN` bila madrasah memakai domain email sendiri; bila tidak, pertimbangkan batas laju per IP. |
| H5 | Rendah | Perbedaan dokumentasi: kode mengizinkan `ketabonline.com` (`DEFAULT_HOSTS`), tetapi README dan `.env.example` hanya menyebut lima situs. Bila `KITAB_ALLOWED_HOSTS` diisi, tautan kitab yang lolos validasi Konfigurasi (memakai `DEFAULT_HOSTS`) bisa ditolak saat diambil (memakai env). | Belum diubah; samakan dokumentasinya. |
| H6 | Rendah | Aturan Firestore: `ai.verifikasi` dan `ai.buta` pada soal dihitung klien, jadi penyusun yang sengaja curang dapat menulis "lolos/sepakat" sendiri dan menghindari gerbang alasan override. Sudah tercatat sebagai batasan di komentar aturan. | Diterima sebagai keputusan desain (jejak audit, bukan jaminan keamanan). |
| H7 | Rendah | Tidak ada jalur pemulihan bila semua admin dinonaktifkan (`ADMIN_EMAILS` hanya mengangkat akun `pending`). | Didokumentasikan: perbaiki `users/{uid}.role` di Firebase Console (README). |
| H8 | Sedang (sudah dicatat) | CSP masih *Report-Only* dengan `unsafe-inline` dan `unsafe-eval`; tujuh skrip CDN tanpa `integrity` (Babel-standalone dan Tailwind CDN dijalankan di browser produksi). | Belum diubah (B2, B3). Akar masalahnya sama: butuh langkah build (Vite). |
| H9 | Info | `enablePersistence` Firestore menyimpan salinan soal di IndexedDB perangkat dan tidak dihapus saat Keluar. Di komputer bersama, data soal tertinggal di profil browser. | Belum diubah; pertimbangkan `clearPersistence()` saat Keluar. |
| H10 | Info | Nama paket di `package.json` masih `bank-soal-madrasah`. | Kosmetik. |

Yang diperiksa dan **baik**: `kitabFetch` (daftar host, `redirect: 'manual'` dengan pemeriksaan ulang tiap lompatan, batas ukuran dan waktu, pembersih HTML linear); `dangerouslySetInnerHTML` hanya menerima keluaran Pegon yang di-escape (`escapeHtml`); kunci Gemini dikirim lewat header, bukan URL; kunci API terenkripsi AES-256-GCM dengan AAD dan tidak pernah dikirim ke browser; validasi foto Pegon; peran dan kuota (per pengguna dan plafon harian, dengan pengembalian saat gagal di sisi server); `config/*` tertutup untuk klien; `npm audit` tidak bisa dijalankan di sandbox (tanpa registry), jalankan di CI.

### Fitur: cadangan dan riwayat konfigurasi

Lihat README bagian "Cadangan dan riwayat konfigurasi". Ringkasnya:

- Koleksi `configRiwayatApp` dan `configRiwayatAi` (tertutup untuk klien, ditulis eksplisit di `firestore.rules`). Satu dokumen per cadangan: `tipe` (otomatis/titik), `alasan`, `data`, ringkasan, siapa yang menyimpan isinya dan siapa yang mencadangkan.
- Penulisan cadangan dan perubahan dalam **satu transaksi**: tidak ada perubahan tanpa cadangan; cadangan gagal berarti perubahan batal.
- Cadangan otomatis dibatasi 30, titik pulih 20 (tidak dipangkas). Salinan kembar tidak ditumpuk. Daftar dibaca dengan `select()` supaya tidak menarik isi besar (sampai 800 KB per dokumen).
- Cadangan AI tidak memuat kunci API maupun ciphertext-nya.
- Pemulihan memeriksa ulang cadangan dengan `sanitizeAppConfig` yang berlaku sekarang; cadangan yang tak lagi sah ditolak dan tidak mengubah apa pun.

### Pengujian

- `test/configBackup.test.js` (13 tes) dan `test/_fakeDb.js` (Firestore tiruan dengan transaksi atomik: gagal = tidak ada yang tertulis). Tes diuji dengan **mutasi** (mematikan penulisan cadangan, mematikan cek `basisAt`, memasukkan ciphertext ke cadangan AI): masing-masing membuat tes gagal. Fake Firestore pada `appConfig.test.js` dan `aiConfig.test.js` diganti dengan yang sama.
- Uji di Chromium sungguhan: halaman asli `public/index.html` (JSX dikompilasi esbuild, React lokal, Firebase ditiru) melawan **handler API asli**. 19 pemeriksaan: simpan dua kali (cadangan muncul), "Kembali ke bawaan" (editor kembali ke bawaan), lihat perubahan, pulihkan (setelan madrasah kembali persis), titik pulih, bentrok admin (409 dan pekerjaan admin lain selamat), Pengaturan AI (model salah ketik dikembalikan, kunci tetap, tidak ada kunci di cadangan), tanpa galat konsol. Uji ini menemukan satu bug pada UI baru (daftar riwayat tidak menyegarkan setelah Simpan); sudah diperbaiki.
- Seluruh suite: 221 tes (219 lulus; 1 berkas gagal dan 1 tes dilewati hanya karena paket tidak terpasang di sandbox). Satu berkas (`bentukUi.test.js`) dan satu tes DOCX tidak bisa jalan di sandbox karena paket `docx`/`jszip` tidak dapat dipasang (tanpa registry npm); di CI dengan `npm ci` keduanya jalan.

### Yang BELUM saya uji (jujur)

Firestore dan Firebase sungguhan (transaksi, `select()`, urutan `orderBy` pada string ISO, dan aturan `firestore.rules` di emulator; hanya pencocokan teks), tampilan dengan gaya Tailwind (CDN tidak tersedia di sandbox, jadi uji browser berjalan tanpa gaya: fungsi diuji, tampilan visual tidak), Safari/iOS, dan DOCX dengan `docx` 8.5.0 dari CDN. Setelah deploy: buka Konfigurasi, ubah satu nama mapel, simpan dua kali, tekan **Kembali ke bawaan aplikasi**, lalu pulihkan dari daftar dan pastikan setelan Anda kembali.

### Urutan rilis

1. Tempel `firestore.rules` di Firebase Console dan **Publish**. 2. Deploy aplikasi. 3. Buka Konfigurasi, periksa bagian "Cadangan & Riwayat", dan tandai setelan yang sekarang berlaku sebagai **titik pulih** pertama.

## 16. Audit 24 Oktober 2026: kondisi aplikasi dan evaluasi proposal "Perpustakaan Kitab" (BELUM diimplementasikan)

Bagian ini **pengingat**, bukan laporan perubahan. Tidak ada kode yang diubah. Dibaca langsung dari berkas zip; `node --test` dijalankan ulang. Proposal yang dievaluasi berasal dari sesi lain (teks per halaman di Firestore, berkas asli opsional, OCR foto, koreksi editor) dan dibandingkan dengan kode serta `docs/SKEMA-KITAB.md`.

### 16.1 Kondisi aplikasi saat ini

- **Tes:** 232 tes, 230 lulus, 1 dilewati, 1 berkas gagal (`test/bentukUi.test.js`: `Cannot find module 'jszip'`). Penyebabnya paket tidak terpasang di lingkungan audit (tanpa `npm install` penuh), bukan bug kode. Jalankan `npm ci` lalu `npm test` untuk memastikan.
- **Status temuan lama:**

| # | Status 24 Okt 2026 |
|---|---|
| B1 lockfile | Selesai: `package-lock.json` ada. |
| B2 CSP | **Masih terbuka.** Tetap *Report-Only* dengan `unsafe-inline` dan `unsafe-eval`; `unpkg.com` juga ada di `script-src`. |
| B3 SRI | **Masih terbuka.** Ada **9** tag skrip CDN tanpa `integrity` (Tailwind, React, ReactDOM, Babel, lucide via unpkg, docx, tiga skrip Firebase). Bagian lama menyebut tujuh. Akar masalah sama: perlu langkah build (Vite). |
| H4 akun asing | Terbuka. `ALLOWED_EMAIL_DOMAIN` kosong secara bawaan. |
| H5 daftar host | Terbuka. Kode mengizinkan `ketabonline.com`; komentar `.env.example` dan README tidak menyebutnya. Bila `KITAB_ALLOWED_HOSTS` diisi mengikuti komentar itu, tautan ketabonline ditolak. |
| H9 cache offline | **Sebagian selesai:** menu Keluar kini memanggil `clearPersistence()`. Tidak berlaku bila tab ditutup tanpa Keluar. Menjadi lebih penting bila teks kitab nanti ikut tersimpan (lihat K9). |
| H10 nama paket | Terbuka (`bank-soal-madrasah`). Kosmetik. |

- **Kebersihan dokumen ini:** ada dua bagian bernomor 9 (draf otomatis, dan bentuk soal). Belum direnumerasi supaya rujukan lama tidak bergeser.
- **Fakta yang relevan untuk perpustakaan kitab:**
  - `docs/SKEMA-KITAB.md` ada, berstatus rancangan. Pencarian `kitabId`, `halId`, dan koleksi `kitab/` di seluruh kode, aturan, dan cadangan: **nol hasil**. Belum ada satu pun bagian yang dipasang.
  - OCR foto kitab **sudah ada**: aksi `fotokitab` di `/api/assist` (`src/fotoKitab.js`), mengembalikan `teks`, `kualitas` (jelas/sedang/buruk), dan daftar kata `ragu`. Yang belum ada hanya penyimpanan hasilnya.
  - `kitabFetch` mengambil teks dari situs (Shamela dan lainnya) dan hanya menyimpannya di cache memori server, tidak di database.

### 16.2 Temuan pada proposal perpustakaan kitab

| # | Tingkat | Temuan | Tindakan saat implementasi |
|---|---|---|---|
| K1 | Sedang | Proposal tumpang tindih dengan `SKEMA-KITAB.md`, dan keduanya berbeda. `SKEMA` punya `daftar/isi`, metadata `hakCipta` dan `sumber`, `revisi`, pencarian lokal di IndexedDB. Proposal menambah status draf/terverifikasi, nama pengoreksi, dan OCR. | Pakai satu dokumen. Usul: struktur koleksi dari `SKEMA`, ditambah `status` dan `dikoreksiOleh` dari proposal. Perbarui `SKEMA-KITAB.md`, jangan buat dokumen ketiga. |
| K2 | Tinggi (desain) | Proposal membiarkan editor mengoreksi halaman, sedangkan `SKEMA` menetapkan klien **tidak boleh menulis** ke `kitab/*` (`allow write: if false`, impor lewat Admin SDK). Dua rancangan ini bertabrakan. | Putuskan jalur tulis dulu. Rekomendasi: endpoint server (mis. `/api/kitab-halaman`) dengan peran editor/admin, polanya seperti `pulihkanSoal`, supaya aturan Firestore tetap tertutup dan validasi terpusat. |
| K3 | Sedang | Proposal menyebut "OCR foto yang baru kita buat", padahal sudah ada. Hasil OCR dipotong di `MAX_TEKS` = 6000 karakter. Satu foto = satu panggilan AI, kena `LIMIT_PER_DAY` = 60 per pengguna dan `LIMIT_GLOBAL_PER_DAY` = 1000 untuk seluruh madrasah. Satu kitab 300 halaman = 300 panggilan: lima hari kerja bagi satu pengguna dan sepertiga plafon harian madrasah. | Simpan `kualitas` dan `ragu` sebagai metadata halaman (kualitas "buruk" atau ada `ragu` = otomatis belum terverifikasi). Rencanakan antrean atau unggah bertahap. Angka biaya proposal ($0,3 sampai $0,6 per kitab dengan Haiku) tidak dihitung ulang; bawaan aplikasi memakai Gemini. |
| K4 | **Tinggi** | Menambah `kitabId` dan `halId` ke soal menyentuh banyak tempat, dengan satu jebakan: `bersihkanSoal` di `src/backup.js` membangun objek dari daftar field eksplisit, sehingga field baru **diam-diam terbuang saat pemulihan cadangan**. Selain itu, jalur admin (jalur 3) di `firestore.rules` punya daftar kunci sendiri yang tidak memakai `opsiKeys()`. | Ubah bersamaan: `firestore.rules` (`opsiKeys`, `validContent`, **dan** daftar kunci admin), `src/backup.js` (`bersihkanSoal`), `test/ujian.test.js` (tes yang mengunci daftar kunci), form di `index.html`, README. Tambahkan tes pemulihan yang memastikan kedua field bertahan. Rilis: Publish `firestore.rules` dulu, baru deploy (urutan bagian 13 dan 14). |
| K5 | Sedang | Peringatan "belum terverifikasi" pada pemeriksa kutipan tidak punya tempat: `validAi` hanya mengizinkan `ai.verifikasi` bernilai `''`, `lolos`, `periksa`, `gagal`, `tanpa_teks`. | Pilih: pakai nilai yang ada, atau tambah nilai baru di **tiga tempat sekaligus** (`firestore.rules`, `VERIFIKASI` di `src/backup.js`, `public/kutipan.js`) beserta tesnya. |
| K6 | Sedang | Katalog kitab di `config/app` **tidak punya ID stabil**: kitab dikenali dari `nama` (unik tanpa peduli huruf besar). Mengganti nama kitab akan memutus tautan ke halamannya. Proposal menyebut katalog "tinggal ditambah penanda", padahal bentuk katalog perlu berubah (saat ini `versi: 3`). | Simpan `kitabId` (slug stabil) di koleksi `kitab`, dan di katalog cukup penunjuk `kitabId`. Naikkan versi katalog dan sediakan migrasi. Ingat batas 800.000 byte untuk `config/app`. |
| K7 | Sedang | Estimasi ukuran 3 sampai 6 KB per halaman kemungkinan terlalu rendah untuk teks **berharakat**: huruf Arab 2 byte di UTF-8, dan setiap harakat menambah karakter. 2.500 huruf polos sekitar 5 KB; berharakat penuh bisa sekitar 8 sampai 10 KB (perkiraan, belum diukur). 100 kitab x 300 halaman x 10 KB sekitar 300 MB, belum termasuk indeks. `fieldOverrides` di `firestore.indexes.json` saat ini kosong. | Ukur dengan satu kitab nyata sebelum bergantung pada angka. Pasang pengecualian indeks untuk `halaman.teks` (usul `SKEMA`) sejak awal. |
| K8 | Sedang | Soal sudah menyimpan **salinan** `teks` (maks 8000 di aturan, 6000 di server). Menyimpan teks lagi di perpustakaan menggandakannya, dan salinan itu ikut cadangan Drive. Pilihan "halaman lalu teks masuk otomatis" harus memotong atau membatasi satu halaman agar tidak melewati `MAX_TEKS`. | Pertahankan salinan di soal (benar menurut `SKEMA`: soal yang sudah disetujui tidak boleh berubah diam-diam bila halaman dikoreksi). Batasi pemilih ke satu halaman atau rentang yang muat 6000 karakter. |
| K9 | **Tinggi (hukum dan kebijakan)** | Ini perubahan sikap: sekarang teks kitab **tidak disimpan** di database (hanya cache memori server dan salinan per soal), dan proposal membuatnya disimpan permanen. Proposal sudah menandai hak cipta dan syarat penggunaan Shamela sebagai risiko terbesar. Tambahan dari kode: cache offline Firestore (IndexedDB) akan ikut menyimpan halaman kitab di perangkat (lihat H9), dan foto kitab fisik hampir pasti edisi modern bertahqiq. Ini bukan nasihat hukum. | Tetapkan kebijakan tertulis sebelum menulis kode: hanya kutipan sebagian untuk soal internal, tidak menyimpan kitab utuh, tidak dibagi publik, isi `hakCipta.status`, `edisi`, dan penerbit per kitab. Pertanyaan yang menentukan semuanya (belum dijawab): perpustakaan untuk satu madrasah atau dibagi antar madrasah. `SKEMA` mengasumsikan satu madrasah, satu proyek Firebase. |
| K10 | Sedang | Cadangan Drive saat ini hanya soal dan katalog (`src/backup.js`, `public/drive.js`); halaman kitab tidak ikut. Halaman hasil impor bisa diimpor ulang, tetapi **koreksi manual editor tidak bisa**. | Putuskan sadar: koleksi halaman ikut cadangan, atau dikecualikan. Bila dikecualikan, koreksi editor perlu jalur ekspor sendiri. Pemulihan halaman juga butuh jalur server. |
| K11 | Rendah | Pencarian: `SKEMA` mengusulkan pencarian lokal di IndexedDB, proposal hanya penelusuran per kitab dan halaman. Keduanya sepakat tidak ada pencarian teks penuh di tahap 1. `normalisasi()` di `public/kutipan.js` (harakat diabaikan) bisa dipakai bila pencarian lokal dibuat. | Tahap 1: navigasi per kitab, bab, halaman saja. |
| K12 | Info | Semua angka eksternal di proposal maupun `SKEMA` berasal dari ingatan dan **belum diverifikasi hari ini**: kuota Firestore gratis (1 GiB, 50.000 baca, 20.000 tulis per hari), Firebase Storage yang disebut butuh paket Blaze, batas isi permintaan Vercel sekitar 4,5 MB, dan harga Haiku. Aturan Firestore memakai `exists()` dan `get()` pada `users`; apakah itu menambah hitungan baca per kueri halaman belum diukur. | Cek Firebase Console > Usage dan halaman harga resmi sebelum memutuskan. |

### 16.3 Keputusan yang harus diambil sebelum mulai

1. Untuk satu madrasah, atau dibagi antar madrasah? (menentukan hak cipta, peran, dan perlunya koleksi `lembaga`)
2. Siapa yang boleh menulis halaman, dan lewat jalur apa? (K2; rekomendasi: server)
3. Bentuk ID kitab dan migrasi katalog (K6).
4. Halaman ikut cadangan Drive atau tidak (K10).
5. Nilai status "belum terverifikasi": pakai yang ada atau tambah baru (K5).

### 16.4 Urutan implementasi bila dilanjutkan

0. Jawab 16.3 dan perbarui `docs/SKEMA-KITAB.md` menjadi satu rancangan.
1. Minta satu berkas contoh (mis. Safinatun Naja) dan **ukur** ukuran per halaman (K7).
2. Aturan `kitab/*` (tertutup untuk klien), pengecualian indeks, `kitabId` dan `halId` opsional di `soal`, perbaikan `bersihkanSoal` dan tes pemulihannya (K4). **Publish `firestore.rules` sebelum deploy.**
3. Endpoint server untuk impor dan koreksi halaman, beserta tes.
4. Antarmuka pemilih kitab, bab, halaman di Penyusunan Soal; simpan hasil `fotokitab` ke halaman dengan status sesuai `kualitas` (K3).
5. Peringatan di pemeriksa kutipan untuk halaman belum terverifikasi (K5).
6. Pencarian lokal atau berkas asli di Drive: hanya bila tahap 1 sudah terpakai dan benar-benar dibutuhkan.

### 16.5 Yang BELUM saya uji

Seluruhnya analisis baca-kode. Tidak diuji: aturan Firestore di emulator, ukuran dokumen nyata, biaya atau kuota nyata, perilaku OCR pada kitab sungguhan, dan tes yang membutuhkan `jszip` atau `docx` (paket tidak terpasang di lingkungan audit).

## 17. Migrasi ke Vite, tahap 1 (24 Oktober 2026)

**Tujuan:** menutup B2 dan B3. Babel dan Tailwind tidak lagi jalan di browser, dan tidak ada skrip CDN yang dimuat saat halaman dibuka.

**Pendekatan: pindahkan dulu, pecah kemudian.** Seluruh kode `<script type="text/babel">` dipindahkan apa adanya ke `web/App.jsx` (3.543 baris); perilaku sengaja tidak diubah. Memecah menjadi komponen per tab tanpa bisa menjalankan aplikasinya terlalu berisiko, jadi itu tahap 2.

| Sebelum | Sesudah |
|---|---|
| `public/index.html` (CDN, Babel, `<style>`, 3.500 baris JSX) | `index.html` (kerangka), `web/main.jsx` (boot), `web/App.jsx`, `web/styles.css`, `tailwind.config.js` |
| `public/{kutipan,sikap,pegon,draft,drive,ujian,kisi,bentuk}.js` | `web/lib/*.js`; `src/*.js` meneruskan ke lokasi baru; tes dan server tidak berubah perilakunya |
| React, ReactDOM, Babel, lucide, docx, Firebase, Tailwind dari CDN | paket npm, dibundel Vite |
| mammoth dan pdf.js dimuat dari cdnjs lewat `<script>` | paket npm, `import()` malas (potongan terpisah) |
| `window.docx`, `window.Pegon`, dan sejenisnya dipasang modul di HTML | `web/globals.js` memasangnya; harus diimpor pertama di `main.jsx` |
| `vercel.json`: `outputDirectory: public` | `framework: vite`, `outputDirectory: dist`, `devCommand: vite --port $PORT` |
| CSP Report-Only dengan `unsafe-inline`, `unsafe-eval`, 5 host CDN | CSP Report-Only tanpa `unsafe-inline` dan `unsafe-eval` untuk skrip, tanpa host CDN; `worker-src 'self' blob:` |

Perubahan lain: `ci.yml` menambah `npm run build`; `.gitignore` menambah `dist/`; README (struktur, preset Vercel); `test/bentukUi.test.js` kini membaca `web/App.jsx`. Tombol PDF memakai `isEvalSupported: false` agar pdf.js tidak memicu `unsafe-eval`.

**Status temuan lama:** B3 (SRI) **selesai** untuk semua skrip aplikasi. B2 **sebagian**: CSP sudah ketat tetapi masih Report-Only (lihat "Langkah Anda" nomor 4). Yang tetap dimuat dari luar adalah skrip Google (`accounts.google.com/gsi/client` untuk Drive, dan `apis.google.com` untuk login Firebase); itu sengaja diizinkan di CSP dan tidak bisa diberi SRI.

### Pengujian (apa yang benar-benar dijalankan)

- Bundel esbuild seluruh `web/main.jsx` berhasil (sintaks JSX dan jalur impor valid).
- Pemeriksaan nama tak terdefinisi dengan compiler TypeScript pada `App.jsx`, `main.jsx`, `globals.js`: bersih. Pemeriksa diuji dengan menyisipkan nama palsu (terdeteksi).
- Bundel dimuat di Chromium sungguhan (Playwright; Firebase dan lucide diganti stub kosong, `/api/config` dibuat gagal): halaman menampilkan layar "Konfigurasi Firebase tidak ditemukan", sembilan objek `window.*` terpasang, tanpa galat JavaScript. Ini hanya membuktikan urutan pemuatan modul dan kode tingkat atas tidak jatuh; bukan alur aplikasi.
- `node --test`: 232 tes. Dengan paket `docx` dan `jszip` tersedia, 5 tes `bentukUi` lulus terhadap `App.jsx` yang baru; tanpa kedua paket itu (seperti di lingkungan audit) berkas itu gagal seperti sebelum migrasi.

### Yang BELUM diuji (penting)

- **`npm install` dan `vite build` belum pernah dijalankan.** Sandbox tanpa akses registry. Nomor versi di `package.json` (Vite `^7.0.0`, `@vitejs/plugin-react` `^5.0.0`, Tailwind 3.4.17, postcss, autoprefixer, React 18.3.1, Firebase 10.14.1, lucide-react 0.468.0, mammoth 1.12.2, pdfjs-dist 3.11.174, docx `^9.6.1`) saya tulis dari pengetahuan, bukan dari registry. Bila ada yang tidak ditemukan, `npm install` akan menyebutnya.
- **Tailwind hasil build belum dibandingkan dengan CDN.** Build hanya memuat kelas yang tertulis utuh di kode. Pemeriksaan saya menemukan tidak ada kelas yang dirangkai dari potongan (`bg-${x}`), tetapi tampilan harus dilihat dengan mata.
- Impor `mammoth` dan `pdfjs-dist` (unggah Word dan PDF di Pegonizer), nama ikon lucide (stub saya menerima semuanya), login Google, Firestore sungguhan, cadangan Drive, dan seluruh alur tab: tidak diuji di browser.
- `docx` di browser naik dari 8.5.0 (CDN) ke 9.6.1, versi yang selama ini dipakai tes. Cek sekali unduhan DOCX (soal, Pegon, kisi-kisi) di Word atau WPS.
- Peringatan esbuild: kunci `tarawih` ganda di kamus `web/lib/pegon.js` baris 152. Sudah ada sejak aplikasi Pegon asli, tidak berbahaya (yang terakhir menang), tidak diubah karena berkas itu dijaga identik dengan aslinya.

### Langkah Anda (urut)

1. `npm install` di komputer, lalu **commit `package-lock.json`** yang baru. Lockfile lama tidak memuat paket baru, jadi `npm ci` di CI gagal sampai itu dilakukan. Alternatif: jalankan workflow **Buat package-lock.json** dari tab Actions.
2. `npm run build`, lalu `npx vite preview`. Buka semua tab; bandingkan tampilan dengan versi lama. Coba unggah satu `.docx` dan satu `.pdf` di Pegonizer, serta satu unduhan DOCX.
3. Di Vercel, Framework Preset otomatis menjadi Vite lewat `vercel.json`; deploy, hard refresh (Ctrl+Shift+R).
4. Buka konsol browser: bila **tidak ada** laporan pelanggaran `Content-Security-Policy-Report-Only` selama pemakaian normal (login, Drive, unggah file), ganti nama header di `vercel.json` dari `Content-Security-Policy-Report-Only` menjadi `Content-Security-Policy` agar benar-benar memblokir. Bila ada pelanggaran yang sah, tambahkan host-nya, jangan kembalikan `unsafe-eval`.

### Tahap 2 (opsional, nanti)

Ganti Proxy dan `window.*` di `App.jsx` dengan `import` langsung lalu hapus `web/globals.js` (tes `bentukUi` memerlukan penyesuaian karena memberi `window` palsu); pecah `App.jsx` per tab; hapus kode cadangan ("modul tidak termuat") yang tidak mungkin terjadi lagi di bundel.
