# Riwayat audit dan perubahan LABSOUMA

Satu berkas kronologis (21 Okt sampai 6 Nov 2026) yang menggantikan 24 berkas terpisah `docs/AUDIT-*.md`, `docs/PERUBAHAN-*.md`, dan `docs/LAPORAN-AUDIT.md`. Isi tiap bagian disalin apa adanya dari berkas asalnya; yang berubah hanya tingkat judul (disesuaikan agar rapi dalam satu dokumen) dan rujukan antarberkas lama yang kini menunjuk ke nomor bagian di sini. Bagian 20 (audit 6 Nov) ditulis langsung di berkas ini.

Jenis: **Audit** = temuan dan penilaian; **Perubahan** = yang dikerjakan menindaklanjuti audit atau permintaan. Urutan mengikuti tanggal; untuk tanggal yang sama, audit mendahului perubahan yang menindaklanjutinya. Catatan keadaan terkini aplikasi ada di `README.md`.

Dokumen rujukan yang tetap terpisah: `docs/SKEMA-KITAB.md` (skema database kitab) dan `docs/kamus-serapan-arab-kitab-pesantren.json` (kamus serapan untuk Pegon).

## Daftar isi

| No | Tanggal | Jenis | Judul | Berkas asal |
|---|---|---|---|---|
| 1 | 21 Okt 2026 (arsip) | Audit | Laporan audit dan integrasi: Bank Soal Madrasah + Pegonizer | `LAPORAN-AUDIT.md` |
| 2 | 26 Okt 2026 | Audit | Audit dan pembaruan tampilan: 26 Oktober 2026 | `AUDIT-26-OKT-2026.md` |
| 3 | 27 Okt 2026 | Audit | Audit dan pembaruan: pembuatan soal template IMDA (27 Oktober 2026) | `AUDIT-PAKET-DAURI.md` |
| 4 | 27 Okt 2026 | Audit | Audit ulang aplikasi (27 Oktober 2026, siang) | `AUDIT-27-OKT-2026-LANJUTAN.md` |
| 5 | 28 Okt 2026 | Perubahan | Perubahan 28 Oktober 2026 | `PERUBAHAN-28-OKT-2026.md` |
| 6 | 29 Okt 2026 | Audit | Audit 29 Okt 2026 dan persiapan perpustakaan kitab | `AUDIT-29-OKT-2026-KITAB.md` |
| 7 | 29 Okt 2026 | Perubahan | Perubahan 29 Oktober 2026 | `PERUBAHAN-29-OKT-2026.md` |
| 8 | 29 Okt 2026 | Perubahan | Perubahan 29 Oktober 2026: impor perpustakaan kitab | `PERUBAHAN-29-OKT-2026-PERPUSTAKAAN.md` |
| 9 | 31 Okt 2026 | Audit | Audit 31 Okt 2026: aplikasi, perpustakaan, tautan balik, pembaca, impor multi-sumber | `AUDIT-31-OKT-2026-PERPUSTAKAAN.md` |
| 10 | 31 Okt 2026 | Audit | Audit 31 Okt 2026: pencarian teks Baca Kitab dan mutu impor kitab | `AUDIT-31-OKT-2026-CARI-DAN-MUTU-IMPOR.md` |
| 11 | 1 Nov 2026 | Audit | Audit dan peningkatan impor PDF — 1 Nov 2026 | `AUDIT-01-NOV-2026-IMPOR-PDF.md` |
| 12 | 1 Nov 2026 | Audit | Audit 1 November 2026: kitab/buku non-Arab | `AUDIT-01-NOV-2026-KITAB-NON-ARAB.md` |
| 13 | 2 Nov 2026 | Perubahan | Perubahan 2 Nov 2026 - impor lebih aman | `PERUBAHAN-02-NOV-2026-IMPOR-AMAN.md` |
| 14 | 3 Nov 2026 | Perubahan | Perubahan 3 Nov 2026: koreksi teks kitab oleh editor dan admin | `PERUBAHAN-03-NOV-2026-KOREKSI-KITAB.md` |
| 15 | 3 Nov 2026 | Perubahan | Perubahan 3 Nov 2026: haluan Aswaja satu sumber dan otoritas kitab (langkah 1 menuju agent AI) | `PERUBAHAN-03-NOV-2026-OTORITAS-ASWAJA.md` |
| 16 | 3 Nov 2026 | Perubahan | Perubahan 3 Nov 2026: agen telaah kitab, tahap 1 (tanya-jawab bersumber) dan tahap 3 (soal vs halaman rujukan) | `PERUBAHAN-03-NOV-2026-TAHAP-1-3-AGEN-TELAAH.md` |
| 17 | 4 Nov 2026 | Perubahan | Perubahan 4 November 2026: audit mesin Pegon dan penguatan AI | `PERUBAHAN-04-NOV-2026-PEGON-AI.md` |
| 18 | 4 Nov 2026 | Perubahan | Perubahan 04 Nov 2026: pilihan kitab di Tanya Kitab | `PERUBAHAN-04-NOV-2026-PILIH-KITAB-TANYA.md` |
| 19 | 5 Nov 2026 | Perubahan | Alur editor bertahap (1 sampai 3 editor) dan filter penyusun | `PERUBAHAN-05-NOV-2026-ALUR-EDITOR.md` |
| 20 | 6 Nov 2026 | Audit | Audit 6 Nov 2026: keamanan, kualitas, dan ukuran bundel | - |
| 21 | 6 Nov 2026 | Perubahan | Perubahan 6 Nov 2026: pemuatan malas (lazy-load) untuk memangkas unduhan awal | `PERUBAHAN-06-NOV-2026-LAZY-LOAD.md` |
| 22 | 6 Nov 2026 | Perubahan | Perubahan 6 Nov 2026 (2): tab Konfigurasi dan Pengaturan AI dipisah dari App.jsx | `PERUBAHAN-06-NOV-2026-PISAH-TAB-ADMIN.md` |
| 23 | 6 Nov 2026 | Perubahan | Perubahan 6 Nov 2026 (3): pembantu bersama dipindah ke web/ui.jsx | `PERUBAHAN-06-NOV-2026-UI-BERSAMA.md` |
| 24 | 6 Nov 2026 | Perubahan | Perubahan 6 Nov 2026 (4): tab Export dipisah dari App.jsx | `PERUBAHAN-06-NOV-2026-PISAH-TAB-EXPORT.md` |
| 25 | 6 Nov 2026 | Perubahan | Perubahan 6 Nov 2026 (5): mesin Pegon dimuat malas | `PERUBAHAN-06-NOV-2026-PEGON-LAZY.md` |
| 26 | 7 Nov 2026 | Audit dan perubahan | Audit dan perluasan kamus serapan Arab kitab pesantren (647 menjadi 1287 entri) | - |
| 27 | 7 Nov 2026 | Perubahan | Perubahan 7 Nov 2026: penyuntingan dan pembuatan daftar isi kitab dari dalam aplikasi | - |
| 28 | 7 Nov 2026 | Perubahan | Mesin Buat otomatis daftar isi diperkuat dan dibantu AI (bertahap, hanya memilih kandidat) | - |

---

## 1. [Audit] Laporan audit dan integrasi: Bank Soal Madrasah + Pegonizer

*Tanggal: 21 Okt 2026 (arsip).* *Berkas asal: `docs/LAPORAN-AUDIT.md` (digabung ke sini).*

> **ARSIP.** Laporan ini ditulis sebelum migrasi ke Vite (21 Okt 2026) dan sebagian besar temuannya (CDN, Babel, tanpa `package-lock.json`, CSP `unsafe-eval`) sudah tidak berlaku. Status terkini: lihat audit 24 Okt 2026 (CSP ditegakkan, `/api/session` dibatasi, `kunci.yml` dihapus). Yang masih terbuka: koleksi `kitab` terkurasi belum dipasang; gerbang persetujuan AI hanya jejak audit.


Tanggal: 21 Oktober 2026. Cakupan: `Sistem-Bank-Soal-Madrasah-dan-Referensi-Maktabah-Syamilah-main` dan `Pegon-main`.

#### 1. Ringkasan

- Bank Soal secara umum sehat: 98 tes bawaan lulus, aturan Firestore ketat, batas pemakaian dan pengembalian kuota rapi, kunci API disimpan terenkripsi.
- Pegon berfungsi sebagai satu halaman mandiri, tetapi fitur AI-nya hanya hidup di dalam claude.ai dan ada satu bug nyata pada mesinnya. Keduanya sudah diperbaiki dalam integrasi.
- Pegon kini menjadi tab **Pegonizer** di Bank Soal, memakai login, peran, kuota AI, dan ekspor yang sama. Total tes sekarang 105, semuanya lulus.

#### 2. Temuan pada Bank Soal

| # | Tingkat | Temuan | Status |
|---|---|---|---|
| B1 | Sedang | Tidak ada `package-lock.json`, padahal `ci.yml` dan `eval.yml` memakai `npm ci` (perintah itu gagal tanpa lockfile). CI kemungkinan merah. | **Diperbaiki sementara:** `ci.yml` dan `eval.yml` kini memakai `npm install`, jadi CI tidak lagi gagal. Setelah `package-lock.json` di-commit (`npm install` di komputer Anda), kembalikan ke `npm ci` agar versi terkunci. |
| B2 | Sedang | CSP hanya mode *Report-Only* dan mengizinkan `unsafe-inline` dan `unsafe-eval`. Penyebabnya Babel-standalone dan Tailwind CDN dijalankan langsung di browser produksi. | Belum diubah. Perbaikan sebenarnya adalah build step (mis. Vite, yang sudah Anda pakai di proyek lain). |
| B3 | Sedang | Tujuh skrip CDN (Tailwind, React, ReactDOM, Babel, lucide, docx, Firebase) tanpa atribut `integrity` (SRI). | Belum diubah. Dengan build step, masalah ini hilang sendiri. |
| B4 | Rendah | Adapter Gemini hanya menerima teks, sehingga fitur membaca foto tidak mungkin. | **Diperbaiki:** `src/gemini.js` kini memetakan blok gambar ke `inlineData`. |
| B5 | Rendah | CSP belum mencantumkan `worker-src` untuk pdf.js. | **Diperbaiki** di `vercel.json`. |

Yang sudah baik dan sengaja tidak disentuh: aturan Firestore (peran, gerbang persetujuan, batas ukuran field, `config/*` tertutup untuk klien), `kitabFetch` memakai `redirect: 'manual'` dan daftar host yang diizinkan, enkripsi AES-256-GCM dengan AAD, pengembalian kuota saat kegagalan sisi server.

#### 3. Temuan pada Pegon

| # | Tingkat | Temuan | Status |
|---|---|---|---|
| P1 | Sedang | **Bug mesin:** kata berpropertinama objek JavaScript lolos sebagai kata serapan Arab. Contoh: `constructor` menghasilkan teks `function Object() { [native code] }`. | **Diperbaiki:** kamus tanpa prototipe. Ada tes regresi. |
| P2 | Tinggi (fungsi) | "Perkuat dengan AI" dan baca-foto memakai `claude.use('sample')`, yang hanya ada di dalam claude.ai. Di luar itu, fitur tidak jalan (hanya menyalin prompt). | **Diganti** dengan `/api/assist` aksi `pegon` dan `pegonfoto` (login, peran, batas, plafon, refund). |
| P3 | Sedang | Impor kamus tanpa validasi, dan ejaan Arab dirender lewat `innerHTML` tanpa escape. File `.json` jahat atau salah bisa menyuntik HTML (vektor XSS-diri; menjadi XSS nyata bila kamus kelak dibagi antarpengguna). Impor juga memakai `Object.assign` dengan kunci `__proto__`. | **Diperbaiki:** `kamus.*` memvalidasi huruf Latin dan Arab, menolak `__proto__`, melewati entri buruk tanpa menggagalkan impor; antarmuka React meng-escape otomatis. |
| P4 | Rendah | "Unduh Word (.doc)" sebenarnya HTML bernama `.doc`. | **Diganti** dengan `.docx` asli (RTL). |
| P5 | Rendah | Foto dikirim ukuran penuh (bisa 5-10 MB). | Diperkecil ke maks. 1600 px JPEG di browser; server menolak di atas ±2,2 MB. |
| P6 | Rendah | `manifest.webmanifest` dirujuk tetapi tidak ada di repositori (disajikan SW secara virtual); `maximum-scale=1` menghalangi pinch-zoom; URL artifact claude.ai tertanam. | Tidak dibawa: Bank Soal punya manifest dan viewport sendiri. |
| P7 | Rendah | Tidak ada tes; kalibrasi hanya `console.warn`. | Ditambah `test/pegon.test.js` (7 tes). |

#### 4. Apa yang diintegrasikan

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

#### 5. Cara memverifikasi

```bash
npm install
npm test            # 105 tes
vercel dev          # coba tab Pegonizer dan Export > Soal Pegon (DOCX)
```

#### 6. Yang BELUM saya uji (jujur)

Diuji: mesin Pegon di Node, layanan AI dengan klien palsu, adapter gambar, validasi, sintaks JSX seluruh blok `text/babel`, dan pembuatan DOCX (mode pegon, daftar, kartu) dengan pustaka `docx`.

Belum diuji karena tidak ada browser, akun Firebase, atau kunci AI di sandbox: tampilan dan interaksi tab di browser sungguhan, login dan peran, panggilan nyata ke Gemini/Claude (terutama pembacaan foto), mikrofon, serta pemuatan lazy mammoth dan pdf.js. Pustaka `docx` lokal berversi 9.6.1, sedangkan halaman memuat 8.5.0 dari CDN; opsi yang dipakai (`bidirectional`, `rightToLeft`, `highlight`, `indent.start`) ada di keduanya, tetapi cek unduhan DOCX Pegon sekali di browser.

#### 7. Saran lanjutan

1. Commit `package-lock.json` (B1).
2. Pindahkan front end ke Vite (B2, B3): CSP bisa ditegakkan, SRI tidak perlu, dan load time turun karena Babel tidak lagi jalan di browser.
3. ~~Kamus Pegon bersama~~ dan 4. ~~tombol "Pegonkan"~~: dikerjakan, lihat bagian 8.

#### 8. Pembaruan 22 Oktober 2026: kamus Pegon bersama dan tombol Pegonkan

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

#### 9. Pembaruan 22 Oktober 2026: isian yang hilang saat refresh

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

#### 10. Perbaikan 22 Oktober 2026: halaman blank setelah pembaruan draf otomatis

**Gejala.** Setelah versi dengan draf otomatis dipasang, halaman blank. Konsol: `RangeError: Maximum call stack size exceeded` berulang di `Object.get (<anonymous>:...)`, dilaporkan oleh `react-dom.production.min.js`.

**Penyebab (terkonfirmasi).** `<script type="module">` menaruh modul di `window.Draft`. Blok `text/babel` lalu mendeklarasikan `const Draft = new Proxy({}, { get: (_, k) => (window.Draft || DRAFT_NOOP)[k] })`. Babel-standalone mengubah `const` tingkat atas menjadi `var` global, sehingga `window.Draft` kini menunjuk ke Proxy itu sendiri dan menimpa modul. Setiap `Draft.read(...)` pada render pertama membaca `window.Draft` (yaitu Proxy yang sama), yang memanggil `get` lagi, tanpa henti. Galat terjadi saat render, dan React 18 membongkar seluruh pohon: layar blank.

**Mengapa lolos dari uji sebelumnya.** Uji browser di bagian 9 membundel JSX secara lokal, sehingga `const` tetap `const` dan tidak bocor ke `window`. Bug ini hanya muncul di bawah Babel-standalone di halaman sungguhan.

| # | Tingkat | Perubahan | Status |
|---|---|---|---|
| E1 | Tinggi | Modul disimpan di `window.LabDraft`; Proxy membaca `window.LabDraft`. Tidak ada lagi nama global yang bertabrakan. | **Diperbaiki** |
| E2 | Sedang | Tidak ada penangkap galat: satu galat render apa pun membuat layar blank tanpa pesan. Ditambah `ErrorBoundary` di sekitar `<Root />` dengan tombol **Muat ulang** dan jalan keluar **Hapus draf di perangkat ini** bila draf rusak membuat galat berulang. | **Ditambah** |

**Pengujian.** Di Chromium sungguhan: kode lama mereproduksi `RangeError: Maximum call stack size exceeded`; kode baru memuat normal, dan draf yang ditulis dengan `Draft.save` bertahan setelah refresh langsung (lewat `pagehide`), tidak terbaca oleh akun lain. Sintaks seluruh blok `text/babel` bersih, `node --test`: 134 lulus. **Belum diuji:** seluruh aplikasi di bawah Babel-standalone dari CDN (sandbox tanpa internet); uji dengan membuka situs setelah deploy, tab Penyusunan Soal, ketik, refresh.

**Bila masih blank setelah deploy:** hard refresh (Ctrl+Shift+R) agar `index.html` lama tidak dipakai dari cache browser, lalu kirim galat konsol yang baru.

#### 11. Fitur: backup soal dan kitab ke Google Drive (22 Oktober 2026)

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

#### 12. Perbaikan 22 Oktober 2026: ekspor Soal Pegon (DOCX)

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

#### 13. Audit konfigurasi dan fitur: kelas terpisah, sistem ujian, penempatan kitab (22 Oktober 2026)

Cakupan: alur konfigurasi tingkatan, kelas, kitab (`src/appConfig.js`, menu Konfigurasi, form soal, filter, ekspor, cadangan, `firestore.rules`).
Bagian lain aplikasi tidak diaudit ulang di sini (lihat bagian 2 sampai 12).

##### Temuan

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

##### Keputusan desain yang perlu Anda ketahui

1. **Sistem ujian dipilih per tingkat**, bukan satu untuk seluruh madrasah. Bila semua tingkat memakai sistem yang sama, pilih sistem yang sama di tiap tingkat.
2. **Kitab tanpa pemetaan tetap berlaku untuk semua kelas dan ujian di tingkatnya.** Ini menjaga konfigurasi lama. Konsekuensinya: Anda yang harus memetakan kitab satu per satu; tidak ada pemetaan otomatis. Begitu satu kelas dicentang pada suatu tingkat, hanya kelas yang dicentang yang berlaku di tingkat itu.
3. **Kelas yang dicentang menyimpan daftar ujian eksplisit** (default: semua ujian kelas itu). Pembagian "kitab dibagi 4 per kelas" dinyatakan lewat ujian mana yang dicentang dan, bila perlu, kolom **cakupan materi** (teks bebas; tidak diperiksa terhadap halaman kitab).
4. **Soal lama tidak diisi kelas dan ujiannya secara otomatis.** Soal lama muncul di filter bila Kelas/Ujian = Semua dan tidak muncul bila salah satunya dipilih. Mengisinya perlu dilakukan per soal (edit) atau lewat skrip tersendiri.
5. **Mengganti nama sistem atau ujian aman** (soal menyimpan kode). **Menghapus ujian** membuat soal lama menampilkan kodenya, bukan namanya. **Mengganti nama kelas** memutus pemetaan kitab lama ke kelas itu.
6. Daftar kitab bawaan hanyalah usulan: mis. *Fathul Mu'in* bawaan hanya di Aliyah. Madrasah Anda memakainya di Tsanawiyah, jadi atur di Konfigurasi.
7. Ekspor: kolom **Kelas** dan **Ujian** ditambahkan di **akhir** CSV lengkap agar urutan kolom lama tidak berubah bagi yang mengimpornya. Format Moodle XML dan CSV Forms tidak berubah. Telaah AI dan uji jawab buta belum menerima kelas (hanya penyusunan soal yang mengirim kelas ke AI).
8. Memulihkan **cadangan lama** (sebelum pembaruan ini) dengan opsi "pulihkan katalog" menimpa pemetaan kelas dengan keadaan kosong dan sistem ujian dengan bawaan.

##### Cara memverifikasi

```bash
npm install
npm test     # 162 tes (147 lama + 15 baru di test/ujian.test.js)
```

Urutan rilis: (1) tempel `firestore.rules` di Firebase Console dan **Publish**, (2) deploy aplikasi, (3) buka Konfigurasi: pilih sistem ujian tiap tingkat, periksa kelas, lalu petakan kitab (**Atur kelas & ujian**).

##### Yang BELUM saya uji (jujur)

Diuji: logika murni (`public/ujian.js`), validasi dan pembersihan server (`sanitizeAppConfig`, penempatan, batas ukuran, konfigurasi lama), validasi cadangan, isi prompt AI, kesesuaian teks `firestore.rules`, dan sintaks JSX seluruh blok `text/babel` beserta pemeriksaan nama yang tidak terdefinisi.
**Belum diuji:** tampilan dan interaksi di browser sungguhan (tidak ada browser atau React di sandbox), yaitu editor Sistem Ujian, matriks kelas dan ujian, pemulihan draf konfigurasi, filter, dan unduhan ekspor. Aturan Firestore diuji hanya lewat pencocokan teks, bukan di emulator. Cek sekali di browser: ubah nama ujian, petakan satu kitab ke dua kelas, simpan, muat ulang halaman, lalu susun satu soal dan ekspor CSV.

#### 14. Fitur: saran bab penting (AI, haluan Aswaja) dan kisi-kisi (23 Oktober 2026)

##### Temuan saat audit
- `clean()` di `src/soalService.js` tidak membuang tag `</daftar_isi>`. Daftar isi tempelan bisa menyelipkan instruksi keluar dari blok data. Diperbaiki, diuji lewat unit dan handler.
- `simpanBerkas` ternyata sudah dideklarasikan di bagian Pegonizer. Deklarasi ganda `const` pada satu blok Babel membuat seluruh aplikasi gagal dimuat. Tertangkap karena blok asli dijalankan di Node, bukan dari cek sintaks (cek sintaks lolos). Salinan dihapus.
- Lebar kolom tabel DOCX kisi-kisi diabaikan LibreOffice (persentase pada sel). Diganti lebar tetap DXA dan tata letak tetap; hasilnya dilihat lewat render PDF.
- `package-lock.json` (B1): TIDAK bisa dibuat di sandbox (tanpa akses registry npm; lockfile butuh versi dan hash dari registry, tidak boleh dikarang). Disiapkan `.github/workflows/kunci.yml` (jalankan sekali dari tab Actions), dan `docx` kini dideklarasikan sebagai devDependency karena tes DOCX kisi-kisi sebelumnya otomatis dilewati bila paket itu tidak terpasang. Setelah lockfile ada, ganti `npm install` di `ci.yml` dan `eval.yml` menjadi `npm ci`.
- Masih terbuka dari audit lama: CSP masih Report-Only dengan `unsafe-inline`/`unsafe-eval`, skrip CDN tanpa SRI.

##### Yang ditambahkan
- Tab **Fokus Ujian & Kisi-kisi**. Aksi `bab` di `/api/assist` (`src/babService.js`, kerangka di `src/aswaja.js`): saran bab dengan prioritas inti/penting/pendukung, alokasi soal (dihitung server, jumlahnya tepat), penanda khilafiyah, dan catatan pendekatan.
- Bila daftar isi ditempel, tiap bab dicocokkan ulang oleh server; bab di luar daftar isi ditandai. Tanpa daftar isi, hasil bertanda **perlu diverifikasi**. Nada teks bebas model diperiksa `periksaSikap` (hanya penanda).
- Field opsional `bab` pada soal: form, chip, CSV RDM (kolom ditambah di akhir), cadangan, `firestore.rules`.
- Kisi-kisi (`public/kisi.js`): DOCX guru, Lembar Fokus murid, gabungan, CSV, teks. Kunci, opsi, dan pembahasan tidak pernah ikut. Analisis cakupan terhadap saran AI.

##### Keputusan desain
- Saran AI tidak disimpan setelah refresh (memakai kuota AI). Bab yang dipilih tersimpan pada soal.
- Saran hanya dipakai untuk urutan dan analisis kisi-kisi bila untuk kitab yang sama dengan soal terpilih.
- Tombol "Susun soal untuk bab ini": form kosong diisi (kitab, jenjang, bab); form berisi hanya kolom Bab yang diisi.
- Nomor soal kisi-kisi mengikuti urutan soal terpilih; samakan filter dan pilihan dengan tab Export agar nomor cocok. Halaman yang tertulis adalah halaman sumber soal, bukan seluruh bab.

##### Cara memverifikasi
```bash
npm test     # 184 tes, semuanya lulus pada 23 Oktober 2026
```
Urutan rilis: (1) tempel `firestore.rules` di Firebase Console dan **Publish**, (2) deploy aplikasi.

##### Yang BELUM saya uji (jujur)
Diuji: logika kisi-kisi dan saran bab, handler `/api/assist` aksi `bab` (sukses, validasi sebelum kuota, injeksi tag, peran pending, pengembalian kuota), render komponen baru dengan React 19 di Node, dan DOCX lewat render LibreOffice (kolom dan Lembar Fokus dilihat).
**Belum diuji:** klik dan alur di browser sungguhan, panggilan Gemini nyata, DOCX dengan pustaka `docx` 8.5.0 dari CDN (tes memakai 9.x), dan aturan Firestore di emulator. Cek sekali: minta saran bab untuk satu kitab, klik "Susun soal untuk bab ini", simpan satu soal, lalu unduh Kisi-kisi + Lembar Fokus.

#### 9. Pembaruan 23 Oktober 2026: bentuk soal (melanjutkan, benar-salah, isian, uraian) dan audit ulang

##### Audit ulang (kondisi sebelum perubahan)

| # | Tingkat | Temuan | Status |
|---|---|---|---|
| A1 | Sedang | Model data soal terkunci pada pilihan ganda: `kunci` hanya A-E, `opsi` wajib, prompt AI, skema alat, telaah, uji buta, semua ekspor, kisi-kisi ("Pilihan ganda (5 opsi)" tertulis tetap), cadangan, dan `firestore.rules` menganggap satu bentuk. | Diperbaiki (bagian di bawah). |
| A2 | Rendah | Tes `ujian.test.js` mengunci daftar field opsional di `firestore.rules` secara harfiah. Bagus sebagai penjaga, tetapi perubahan sah gagal sampai tesnya ikut diubah. | Tes diperbarui bersama aturan. |
| A3 | Sedang | B2 dan B3 dari bagian 2 masih berlaku: CSP masih Report-Only dengan `unsafe-inline` dan `unsafe-eval`; 0 dari 7 skrip CDN punya `integrity`. `npm audit --omit=dev`: 0 kerentanan. | Belum diubah. Perlu build step (Vite). |
| A4 | Info | B1 (lockfile) sudah teratasi: `package-lock.json` ada dan `ci.yml` memakai `npm ci`. | Selesai. |

##### Perubahan

- `public/bentuk.js` (baru, sumber tunggal; `src/bentuk.js` meneruskannya): definisi lima bentuk, saran per jenjang, `periksaSoal`, `selaraskan`, `kunciTeks`.
- `src/soalService.js`: `validateInput` menerima `bentuk` (kosong = pilgan, asing = 400), `ATURAN_BENTUK` + `systemPromptFor`, skema alat per bentuk (`toolSoalFor`), `normalizeSoal(raw, level, bentuk)`. Untuk pilgan prompt, skema, dan kunci keluaran identik dengan sebelumnya.
- `src/assistService.js`: telaah memakai skema perbaikan dan aturan telaah per bentuk; `validateSoalDraft` sadar bentuk. `src/cekButa.js`: menolak isian/uraian. `src/backup.js`: memvalidasi `bentuk`, `jawaban`, `rubrik`.
- `firestore.rules`: `bentuk`, `jawaban`, `rubrik` opsional dengan batas (2000 karakter), masuk daftar kunci opsional dan daftar admin; kunci wajib tidak berubah.
- `public/index.html`: selektor bentuk, form per bentuk, pratinjau, uji buta disembunyikan untuk isian/uraian, filter bentuk, ekspor DOCX/CSV/GIFT/Moodle XML. `public/kisi.js`, `public/kutipan.js` menyesuaikan.
- Tes: 184 menjadi 210 (`test/bentuk.test.js`, `test/bentukUi.test.js`; kode ekspor diambil langsung dari `index.html` dan dijalankan dengan pustaka `docx` asli).

##### Keputusan dan risiko

| # | Keputusan / risiko |
|---|---|
| D1 | "Melanjutkan" ditafsirkan dua cara dan dibuat keduanya: pilihan (kelanjutan dipilih dari 5 opsi) dan isian (ditulis sendiri). Tradisi pesantren umumnya isian; bila hanya satu yang dipakai, bentuk lain bisa disembunyikan lewat `BENTUK_IDS`. |
| D2 | Saran bentuk per jenjang (`BENTUK_PER_TINGKAT`) adalah perkiraan pedagogis awal, bukan ketentuan Kemenag. Guru/kepala madrasah perlu menyesuaikan. |
| D3 | Benar-salah disimpan sebagai `opsi {A: Benar, B: Salah}` + `kunci` A/B, sehingga seluruh jalur pilihan ganda (uji buta, kutipan, sikap, ekspor) ikut bekerja tanpa cabang baru. |
| D4 | Isian dan uraian tidak bisa diuji buta; penjagaan mutunya hanya Telaah AI dan editor manusia. Kunci isian yang ambigu (lebih dari satu jawaban benar) adalah risiko terbesar bentuk ini; prompt melarangnya, tetapi tidak ada pemeriksa otomatis. |
| D5 | Urutan rilis wajib: Publish `firestore.rules` dulu, baru deploy. Klien baru tidak mengirim field baru untuk soal pilihan ganda, jadi soal biasa tetap bisa disimpan walau aturan belum dipublish; hanya bentuk baru yang gagal. |

##### Yang BELUM saya uji (jujur)
Diuji: logika bentuk, validasi, prompt dan skema per bentuk dengan klien AI palsu, handler `/api/generate`, cadangan, aturan Firestore (hanya pencocokan teks), kisi-kisi, seluruh pembuat ekspor, dan sintaks JSX `index.html` (Babel).
**Belum diuji:** tampilan dan interaksi form di browser sungguhan (tidak ada browser di sandbox), mutu soal dari model nyata untuk tiap bentuk, impor GIFT/Moodle XML di Moodle sungguhan untuk benar-salah, isian, uraian, DOCX dengan `docx` 8.5.0 dari CDN (tes memakai 9.6.1), dan aturan Firestore di emulator.


#### 15. Audit menyeluruh dan fitur cadangan konfigurasi (23 Oktober 2026)

Cakupan: seluruh kode server (`src/`, `api/`), aturan Firestore, konfigurasi penerapan (`vercel.json`, CI), klien (`public/index.html`, `public/*.js`) khususnya jalur konfigurasi, pengaturan AI, dan titik penyuntikan HTML. Dibaca langsung dari kode; tes dijalankan ulang.

##### Temuan

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

##### Fitur: cadangan dan riwayat konfigurasi

Lihat README bagian "Cadangan dan riwayat konfigurasi". Ringkasnya:

- Koleksi `configRiwayatApp` dan `configRiwayatAi` (tertutup untuk klien, ditulis eksplisit di `firestore.rules`). Satu dokumen per cadangan: `tipe` (otomatis/titik), `alasan`, `data`, ringkasan, siapa yang menyimpan isinya dan siapa yang mencadangkan.
- Penulisan cadangan dan perubahan dalam **satu transaksi**: tidak ada perubahan tanpa cadangan; cadangan gagal berarti perubahan batal.
- Cadangan otomatis dibatasi 30, titik pulih 20 (tidak dipangkas). Salinan kembar tidak ditumpuk. Daftar dibaca dengan `select()` supaya tidak menarik isi besar (sampai 800 KB per dokumen).
- Cadangan AI tidak memuat kunci API maupun ciphertext-nya.
- Pemulihan memeriksa ulang cadangan dengan `sanitizeAppConfig` yang berlaku sekarang; cadangan yang tak lagi sah ditolak dan tidak mengubah apa pun.

##### Pengujian

- `test/configBackup.test.js` (13 tes) dan `test/_fakeDb.js` (Firestore tiruan dengan transaksi atomik: gagal = tidak ada yang tertulis). Tes diuji dengan **mutasi** (mematikan penulisan cadangan, mematikan cek `basisAt`, memasukkan ciphertext ke cadangan AI): masing-masing membuat tes gagal. Fake Firestore pada `appConfig.test.js` dan `aiConfig.test.js` diganti dengan yang sama.
- Uji di Chromium sungguhan: halaman asli `public/index.html` (JSX dikompilasi esbuild, React lokal, Firebase ditiru) melawan **handler API asli**. 19 pemeriksaan: simpan dua kali (cadangan muncul), "Kembali ke bawaan" (editor kembali ke bawaan), lihat perubahan, pulihkan (setelan madrasah kembali persis), titik pulih, bentrok admin (409 dan pekerjaan admin lain selamat), Pengaturan AI (model salah ketik dikembalikan, kunci tetap, tidak ada kunci di cadangan), tanpa galat konsol. Uji ini menemukan satu bug pada UI baru (daftar riwayat tidak menyegarkan setelah Simpan); sudah diperbaiki.
- Seluruh suite: 221 tes (219 lulus; 1 berkas gagal dan 1 tes dilewati hanya karena paket tidak terpasang di sandbox). Satu berkas (`bentukUi.test.js`) dan satu tes DOCX tidak bisa jalan di sandbox karena paket `docx`/`jszip` tidak dapat dipasang (tanpa registry npm); di CI dengan `npm ci` keduanya jalan.

##### Yang BELUM saya uji (jujur)

Firestore dan Firebase sungguhan (transaksi, `select()`, urutan `orderBy` pada string ISO, dan aturan `firestore.rules` di emulator; hanya pencocokan teks), tampilan dengan gaya Tailwind (CDN tidak tersedia di sandbox, jadi uji browser berjalan tanpa gaya: fungsi diuji, tampilan visual tidak), Safari/iOS, dan DOCX dengan `docx` 8.5.0 dari CDN. Setelah deploy: buka Konfigurasi, ubah satu nama mapel, simpan dua kali, tekan **Kembali ke bawaan aplikasi**, lalu pulihkan dari daftar dan pastikan setelan Anda kembali.

##### Urutan rilis

1. Tempel `firestore.rules` di Firebase Console dan **Publish**. 2. Deploy aplikasi. 3. Buka Konfigurasi, periksa bagian "Cadangan & Riwayat", dan tandai setelan yang sekarang berlaku sebagai **titik pulih** pertama.

#### 16. Audit 24 Oktober 2026: kondisi aplikasi dan evaluasi proposal "Perpustakaan Kitab" (BELUM diimplementasikan)

Bagian ini **pengingat**, bukan laporan perubahan. Tidak ada kode yang diubah. Dibaca langsung dari berkas zip; `node --test` dijalankan ulang. Proposal yang dievaluasi berasal dari sesi lain (teks per halaman di Firestore, berkas asli opsional, OCR foto, koreksi editor) dan dibandingkan dengan kode serta `docs/SKEMA-KITAB.md`.

##### 16.1 Kondisi aplikasi saat ini

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

##### 16.2 Temuan pada proposal perpustakaan kitab

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

##### 16.3 Keputusan yang harus diambil sebelum mulai

1. Untuk satu madrasah, atau dibagi antar madrasah? (menentukan hak cipta, peran, dan perlunya koleksi `lembaga`)
2. Siapa yang boleh menulis halaman, dan lewat jalur apa? (K2; rekomendasi: server)
3. Bentuk ID kitab dan migrasi katalog (K6).
4. Halaman ikut cadangan Drive atau tidak (K10).
5. Nilai status "belum terverifikasi": pakai yang ada atau tambah baru (K5).

##### 16.4 Urutan implementasi bila dilanjutkan

0. Jawab 16.3 dan perbarui `docs/SKEMA-KITAB.md` menjadi satu rancangan.
1. Minta satu berkas contoh (mis. Safinatun Naja) dan **ukur** ukuran per halaman (K7).
2. Aturan `kitab/*` (tertutup untuk klien), pengecualian indeks, `kitabId` dan `halId` opsional di `soal`, perbaikan `bersihkanSoal` dan tes pemulihannya (K4). **Publish `firestore.rules` sebelum deploy.**
3. Endpoint server untuk impor dan koreksi halaman, beserta tes.
4. Antarmuka pemilih kitab, bab, halaman di Penyusunan Soal; simpan hasil `fotokitab` ke halaman dengan status sesuai `kualitas` (K3).
5. Peringatan di pemeriksa kutipan untuk halaman belum terverifikasi (K5).
6. Pencarian lokal atau berkas asli di Drive: hanya bila tahap 1 sudah terpakai dan benar-benar dibutuhkan.

##### 16.5 Yang BELUM saya uji

Seluruhnya analisis baca-kode. Tidak diuji: aturan Firestore di emulator, ukuran dokumen nyata, biaya atau kuota nyata, perilaku OCR pada kitab sungguhan, dan tes yang membutuhkan `jszip` atau `docx` (paket tidak terpasang di lingkungan audit).

#### 17. Migrasi ke Vite, tahap 1 (24 Oktober 2026)

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

##### Pengujian (apa yang benar-benar dijalankan)

- Bundel esbuild seluruh `web/main.jsx` berhasil (sintaks JSX dan jalur impor valid).
- Pemeriksaan nama tak terdefinisi dengan compiler TypeScript pada `App.jsx`, `main.jsx`, `globals.js`: bersih. Pemeriksa diuji dengan menyisipkan nama palsu (terdeteksi).
- Bundel dimuat di Chromium sungguhan (Playwright; Firebase dan lucide diganti stub kosong, `/api/config` dibuat gagal): halaman menampilkan layar "Konfigurasi Firebase tidak ditemukan", sembilan objek `window.*` terpasang, tanpa galat JavaScript. Ini hanya membuktikan urutan pemuatan modul dan kode tingkat atas tidak jatuh; bukan alur aplikasi.
- `node --test`: 232 tes. Dengan paket `docx` dan `jszip` tersedia, 5 tes `bentukUi` lulus terhadap `App.jsx` yang baru; tanpa kedua paket itu (seperti di lingkungan audit) berkas itu gagal seperti sebelum migrasi.

##### Yang BELUM diuji (penting)

- **`npm install` dan `vite build` belum pernah dijalankan.** Sandbox tanpa akses registry. Nomor versi di `package.json` (Vite `^7.0.0`, `@vitejs/plugin-react` `^5.0.0`, Tailwind 3.4.17, postcss, autoprefixer, React 18.3.1, Firebase 10.14.1, lucide-react 0.468.0, mammoth 1.12.2, pdfjs-dist 3.11.174, docx `^9.6.1`) saya tulis dari pengetahuan, bukan dari registry. Bila ada yang tidak ditemukan, `npm install` akan menyebutnya.
- **Tailwind hasil build belum dibandingkan dengan CDN.** Build hanya memuat kelas yang tertulis utuh di kode. Pemeriksaan saya menemukan tidak ada kelas yang dirangkai dari potongan (`bg-${x}`), tetapi tampilan harus dilihat dengan mata.
- Impor `mammoth` dan `pdfjs-dist` (unggah Word dan PDF di Pegonizer), nama ikon lucide (stub saya menerima semuanya), login Google, Firestore sungguhan, cadangan Drive, dan seluruh alur tab: tidak diuji di browser.
- `docx` di browser naik dari 8.5.0 (CDN) ke 9.6.1, versi yang selama ini dipakai tes. Cek sekali unduhan DOCX (soal, Pegon, kisi-kisi) di Word atau WPS.
- Peringatan esbuild: kunci `tarawih` ganda di kamus `web/lib/pegon.js` baris 152. Sudah ada sejak aplikasi Pegon asli, tidak berbahaya (yang terakhir menang), tidak diubah karena berkas itu dijaga identik dengan aslinya.

##### Langkah Anda (urut)

1. `npm install` di komputer, lalu **commit `package-lock.json`** yang baru. Lockfile lama tidak memuat paket baru, jadi `npm ci` di CI gagal sampai itu dilakukan. Alternatif: jalankan workflow **Buat package-lock.json** dari tab Actions.
2. `npm run build`, lalu `npx vite preview`. Buka semua tab; bandingkan tampilan dengan versi lama. Coba unggah satu `.docx` dan satu `.pdf` di Pegonizer, serta satu unduhan DOCX.
3. Di Vercel, Framework Preset otomatis menjadi Vite lewat `vercel.json`; deploy, hard refresh (Ctrl+Shift+R).
4. Buka konsol browser: bila **tidak ada** laporan pelanggaran `Content-Security-Policy-Report-Only` selama pemakaian normal (login, Drive, unggah file), ganti nama header di `vercel.json` dari `Content-Security-Policy-Report-Only` menjadi `Content-Security-Policy` agar benar-benar memblokir. Bila ada pelanggaran yang sah, tambahkan host-nya, jangan kembalikan `unsafe-eval`.

##### Tahap 2 (opsional, nanti)

Ganti Proxy dan `window.*` di `App.jsx` dengan `import` langsung lalu hapus `web/globals.js` (tes `bentukUi` memerlukan penyesuaian karena memberi `window` palsu); pecah `App.jsx` per tab; hapus kode cadangan ("modul tidak termuat") yang tidak mungkin terjadi lagi di bundel.

#### 10. Pembaruan 25 Oktober 2026: Dasbor admin, soal mirip, cadangan Drive Ustadz

Cakupan audit: jalur yang disentuh tiga fitur ini (`src/platform.js`, `src/access.js`, `firestore.rules`, `web/lib/drive.js`, `web/lib/ustadz.js`, `api/backup.js`, App, AppUstadz, BackupTab). Bukan audit ulang seluruh repositori. Tes sebelum perubahan: 269 lulus; sesudah: 315 lulus, build Vite lulus.

| # | Tingkat | Temuan | Status |
|---|---|---|---|
| A1 | Sedang | Admin tidak punya cara melihat kuota: `rate/*` tertutup untuk klien dan hanya hitungan hari ini yang tersimpan, sehingga kuota habis baru terlihat setelah ada yang gagal. | **Dikerjakan:** `/api/admin-stats` + tab Dasbor + titik merah di menu. Riwayat harian/bulanan tetap tidak ada (butuh satu tulis tambahan per panggilan AI; belum dikerjakan). |
| A2 | Sedang | Ustadz tidak bisa memperoleh Client ID Drive: `/api/backup` aksi `info` khusus editor/admin (dan tes menjaganya). | **Dikerjakan:** `/api/drive-client` terpisah; `/api/backup` tidak diubah. |
| A3 | Sedang | Cadangan Ustadz yang menimpa satu berkas tetap bisa menghapus cadangan baik bila penyimpanan browser terhapus lalu satu soal disimpan. | **Dikerjakan:** berkas per hari (14 terakhir), daftar kosong tidak pernah diunggah, verifikasi unduh-ulang. Penghapusan data browser di hari yang sama tetap menimpa berkas hari itu. |
| A4 | Info | Bank soal dimuat berhalaman (100 terbaru + pending + milik), jadi deteksi duplikat tidak bisa memeriksa seluruh bank tanpa membaca seluruhnya. | **Dikerjakan dengan batas:** soal termuat + hingga 200 soal sekitab (cache 10 menit). Pemindaian seluruh bank belum ada. |
| A5 | Info | `firestore.rules` mengizinkan klien menulis hanya kunci yang terdaftar, jadi menyimpan sidik duplikat di dokumen soal butuh perubahan aturan. | Dihindari: tidak ada perubahan `firestore.rules` maupun indeks. |

Temuan dari tes, sudah diperbaiki: titik isian di akhir kalimat ("هو ....") membuat soal lanjutan yang sama hanya dinilai "mirip"; titik isian kini diabaikan saat membandingkan.

**Belum diuji (tidak ada browser, akun Firebase, atau Google Cloud di lingkungan ini):** jendela izin Google di ponsel (terutama Safari iOS, yang ketat soal pop-up di luar klik langsung), perilaku token Drive sungguhan setelah ±1 jam, layar Dasbor di browser (hanya dirender di Node dengan React SSR), kueri `where('dayKey','==',...)` terhadap Firestore asli, dan biaya baca Firestore nyata. Layar persetujuan OAuth berstatus Testing akan menolak Ustadz yang belum terdaftar sebagai Test user.

##### 10b. Naskah ujian IMDA (template FORMAT_SOAL_IMDA_I–IV)

| # | Tingkat | Temuan | Status |
|---|---|---|---|
| B1 | Sedang | `web/lib/naskah.js` dan `naskahDocx.js` (draf naskah IMDA) ada di salinan kerja tetapi **belum ter-commit**, tidak diimpor oleh `App.jsx`, tanpa tes, dan tidak disebut di README: fitur naskah IMDA belum bisa dipakai dari aplikasi. Keduanya diperiksa, diperbaiki (B2), diberi tes, dan disertakan sebagai berkas baru. | **Dikerjakan:** format "Naskah Ujian IMDA (DOCX)" di tab Export, pengaturan kop, pratinjau isian bagian dan total nilai, unduhan naskah peserta dan naskah kunci. |
| B2 | Rendah | Kop baris ketiga terpecah ke dua baris pada hasil render (di template satu baris). | **Diperbaiki:** font baris itu 10 pt dan lebar kolom kop disesuaikan. |
| B3 | Info | Logo template berupa WMF (tidak bisa ditanam oleh pustaka DOCX). | Dikonversi menjadi `public/logo-madrasah.png` (200×245). |

Dicek: jumlah nomor, nilai per nomor, dan total 100 untuk keempat Dauri; teks judul bagian sama dengan template; naskah peserta tanpa warna merah dan tanpa jawaban; naskah kunci bermerah; render LibreOffice satu halaman F4. Tes baru: `test/naskah.test.js` (14 tes). Total 329 tes lulus.

**Asumsi yang belum dikonfirmasi:** "ص" pada template dibaca sebagai halaman kitab. Perbedaan antar template yang tidak dibawa otomatis: mata pelajaran (I: حديث, II: فقه) diisi manual di pengaturan naskah. Belum diuji: tampilan tab Export di browser dan membuka berkas hasil di Microsoft Word (yang diuji LibreOffice).

---

## 2. [Audit] Audit dan pembaruan tampilan: 26 Oktober 2026

*Tanggal: 26 Okt 2026.* *Berkas asal: `docs/AUDIT-26-OKT-2026.md` (digabung ke sini).*

Cakupan: tinjauan statis seluruh repositori (`api/`, `src/`, `web/`, `firestore.rules`, `vercel.json`, CI, dokumentasi).
Batasan: registry npm tidak terjangkau di lingkungan audit, jadi `vite build`, `npm audit`, dan pemeriksaan visual di browser **belum dijalankan**. Lakukan langkah di bagian 4 di komputer Anda.

#### 1. Ringkasan
Arsitektur sehat. Aturan Firestore ketat (peran, batas ukuran, gerbang persetujuan), enkripsi kunci AI (AES-256-GCM + AAD), batas pemakaian per pengguna dan plafon harian, refund kuota saat gagal di server, `redirect: 'manual'` dan daftar host untuk pengambilan kitab, keluaran Pegon di-escape sebelum `dangerouslySetInnerHTML`, `pdf.js` dengan `isEvalSupported: false`. Tidak ditemukan kerentanan kritis.

#### 2. Temuan
| # | Tingkat | Temuan | Status |
|---|---|---|---|
| A1 | Rendah | Tidak ada header `Strict-Transport-Security`. | **Diperbaiki** (`vercel.json`). |
| A2 | Rendah | CSP `style-src 'unsafe-inline'` (dibutuhkan atribut `style` React/Firebase UI). | Dibiarkan; risiko kecil karena `script-src` ketat. |
| A3 | Rendah | Aksesibilitas: tidak ada tautan lewati-konten, fokus papan ketik tidak seragam, target sentuh tombol/kolom <40px. | **Diperbaiki** (skip link, `focus-visible`, `min-height: 40px`). |
| A4 | Rendah | `index.html` tanpa meta description/color-scheme, tanpa preconnect font. | **Diperbaiki.** |
| A5 | Info | `web/App.jsx` satu berkas 4.300 baris (±337 KB): sulit dirawat, dan semua peran memuat seluruh kode. | Saran: pecah per tab dan muat malas (`React.lazy`). |
| A6 | Info | Firebase SDK versi *compat* menambah ukuran bundel. | Saran: migrasi ke SDK modular. |
| A7 | Info | Font dimuat dari Google Fonts (pihak ketiga, butuh internet). | Saran: host sendiri (`@fontsource`). |
| A8 | Info | Judul README menyiratkan Claude wajib berbayar, padahal opsional (Gemini gratis). | Saran: ubah redaksi. |
| A9 | Info | 4 tes UI (`bentukUi`, `dasborUi`, `excelConfig`, `naskah`) butuh dependensi terpasang (`jszip`, `vite`). | Gagal hanya karena `npm ci` tidak bisa jalan di lingkungan audit; 311 tes lain lulus. |

#### 3. Perubahan tampilan
- **Token desain** baru (terang dan gelap): palet hijau lebih dalam, aksen emas, bayangan `--shadow-sm/md`, cincin fokus `--ring`.
- **Header**: gradasi hijau dengan garis aksen emas, judul ber-tracking.
- **Kartu/Section**: bayangan halus, judul bagian normal-case dengan ikon dalam chip.
- **Tombol**: tinggi minimal 40px, bayangan, hover/active yang jelas; **kolom isian**: cincin fokus, hover, status disabled.
- **Badge status** diberi cincin tipis; **toast** lebih tegas.
- **Halaman masuk**: kartu terpusat dengan garis aksen dan catatan akses terbatas.
- Skip link, `scroll-behavior`, antialiasing, angka tabular, bilah gulir tipis, gaya cetak (menyembunyikan header/navigasi).
Logika, aturan Firestore, dan struktur komponen tidak diubah.

#### 4. Verifikasi yang perlu Anda jalankan
```bash
npm ci
npm test          # harap 318 tes (semua lulus)
npm audit --omit=dev
npm run build && npm run preview
```
Periksa secara visual: masuk, Penyusunan Soal, Bank, Export, Dasbor, mode gelap, dan lebar ponsel (≈375px).

---

## 3. [Audit] Audit dan pembaruan: pembuatan soal template IMDA (27 Oktober 2026)

*Tanggal: 27 Okt 2026.* *Berkas asal: `docs/AUDIT-PAKET-DAURI.md` (digabung ke sini).*

Permintaan: materi lebih dari 6.000 karakter (teks atau foto kitab), soal dibuat AI sesuai jumlah per Dauri menurut tingkat kesukaran, tanpa narasi dan prolog, dan teks kitab rujukan tercatat di kunci jawaban.

#### Temuan (urut dari yang paling mengganggu)

| # | Keyakinan | Temuan | Dampak |
|---|---|---|---|
| 1 | Pasti | `generateSoal` menyusun **satu soal per panggilan**. Dauri II dan IV butuh 20 soal = 20 panggilan. Batas bawaan 5 per menit dan 60 per hari per pengguna (`LIMIT_*`). | Satu Dauri II memakai sepertiga kuota harian dan ±4 menit menunggu. Tidak ada cara menyusun satu naskah utuh. |
| 2 | Pasti | `MAX_TEKS = 6000` ditolak keras (`TEKS_TOO_LONG`) di server dan form. OCR foto dipotong 6.000 karakter dan hanya satu foto per kali. | Materi satu bab tidak bisa dipakai. Foto banyak halaman harus dikerjakan manual satu-satu. |
| 3 | Pasti | Template IMDA punya **tiga opsi** (أ ب ج), tetapi prompt dan skema memaksa **lima opsi**. | Naskah mencetak lima opsi dan mengeluarkan peringatan "template aslinya 3". |
| 4 | Pasti | L2 dan L3 **wajib stimulus** (`normalizeSoal` menolak bila kosong), padahal naskah memakai `narasi: false` dan tidak mencetaknya. | AI menghabiskan token untuk narasi yang dibuang, dan soal L2/L3 bisa kehilangan konteks di naskah. Ini bertentangan dengan permintaan "tanpa narasi". |
| 5 | Pasti | Naskah kunci hanya mencetak `ص <halaman>`. Kutipan Arab hanya ada di `pembahasan`. | Pengoreksi tidak melihat teks kitab di kunci. |
| 6 | Pasti | Tidak ada pengaturan sebaran L1/L2/L3 per Dauri; level dipilih satu per satu. | Komposisi tingkat kesukaran tidak terjamin. |
| 7 | Kemungkinan besar | Impor di form penyusunan hanya `.txt/.html` maksimal 500 KB. Pembaca `.docx/.pdf` hanya ada di Pegonizer. | Materi Word/PDF tidak bisa dipakai langsung. |
| 8 | Pasti | Satu tes lama gagal sebelum perubahan: `test/excelConfig.test.js` ("ekspor lalu impor (ganti)..."). Tidak terkait pekerjaan ini. | Perlu dicek terpisah. |

#### Yang diubah

- `web/lib/paket.js` (baru, murni): pembagi materi per segmen ≤ 6.000 karakter di batas paragraf/kalimat (seimbang, tanpa teks hilang), pembagi level dengan sisa terbesar, `rencanaPaket` per Dauri (jumlah per bagian persis sesuai template), label halaman per segmen.
- `src/paketService.js` (baru) lewat `POST /api/assist` aksi `paket` (tidak menambah fungsi Vercel; folder `api/` sudah 11 berkas): satu panggilan = satu segmen, sampai 6 butir campuran bagian. Tanpa stimulus, tiga opsi, kunci disebar A/B/C. Butir rusak dikembalikan di `gagal` supaya hanya itu yang diulang.
- Kutipan kitab: model wajib menyalin 3-25 kata dari teks. Server mencocokkannya dengan `periksaKutipan`. Yang tidak ada di teks **dibuang dan ditandai**, tidak pernah masuk kunci. Disimpan sebagai baris `Kutipan kitab: ...` di awal `pembahasan`, jadi **tanpa perubahan skema dan tanpa deploy aturan Firestore**.
- `web/lib/naskah.js` (`kutipanKunci`) dan `naskahDocx.js`: naskah kunci mencetak `نص الكتاب: <kutipan>` merah di bawah tiap nomor (opsi `kutipan: false` untuk mematikan). Naskah peserta tidak berubah. Soal lama tanpa baris itu memakai kutipan Arab pertama dari pembahasan bila ada.
- `src/fotoKitab.js`: `penuh: true` tidak memotong hasil OCR di 6.000 (mode paket).
- `web/App.jsx`: tab **Paket Dauri** (teks, berkas `.txt .docx .pdf`, banyak foto yang bisa dikoreksi per halaman, komposisi L1:L2:L3, porsi "melanjutkan", ringkasan panggilan AI, tunggu otomatis bila kena batas per menit, tinjau dan hapus butir, simpan massal sebagai **Draft**).
- Cakupan dari Konfigurasi: tab Paket Dauri memilih kelas, ujian, dan kitab (dari Konfigurasi). Cakupan kitab untuk kelas dan ujian itu (mis. "Thaharah – Puasa") dikirim ke AI sebagai batas materi; segmen yang seluruhnya di luar cakupan dilewati. Cakupan masih teks bebas (maks. 120 karakter), jadi AI mencocokkannya dengan judul bab di teks: **perkiraan**, periksa hasilnya. Aplikasi belum mengambil halaman kitab otomatis dari cakupan.
- Butir dari segmen di luar cakupan **dialihkan** (`alihkanButir` di `web/lib/paket.js`) ke segmen yang terbukti memuat materi cakupan, bergantian, lalu ikut tahap ulang. Sebelumnya butir itu dibuang sehingga naskah Dauri bisa kurang nomor. Bila tidak ada satu pun segmen yang masuk cakupan, tampil pesan yang jelas dan tidak ada panggilan tambahan.
- Soal tanpa rujukan ke teks: kalimat soal dan opsi dilarang memuat "menurut kitab", "berdasarkan teks kitab", "pada bacaan di atas", dan sejenisnya (aturan 3b di prompt). Server juga memeriksa: klausa di awal atau akhir kalimat dibuang otomatis, sisanya (mis. di tengah kalimat atau di opsi) ditolak dan diulang sekali. "Menurut mazhab Syafii" tetap boleh karena itu pokok soal. Pembahasan boleh menyebut teks.
- **Paket sebagai satu kesatuan (27 Oktober, sore).** Simpan massal kini memberi tiap butir penanda `paket` (id), `dawr`, `cakupan` (batas materi dari Konfigurasi), dan `urut` (nomor di naskah), plus `periode` yang sebelumnya tidak ikut tersimpan. Bank Soal menampilkan butir sepaket dalam satu bingkai: judul paket, batas materi, hitungan Draft/Pending/Revisi/Approved, dan peringatan bila nomor kurang. Soal tanpa paket tampil terpisah sebagai "Soal lepas". Filter **Paket Dauri** ada di Bank dan Ekspor. Di Ekspor, memilih paket otomatis mengisi tingkat/mapel/kelas/ujian dan memakai Dauri paket itu, butir diurut menurut nomor naskah, dan muncul ringkasan (berapa butir Approved, berapa nomor kosong). CSV lengkap mendapat kolom Paket, Dauri, Batas materi, No. paket di akhir (sebelum Catatan). Cadangan dan pemulihan membawa penanda ini.
- **Perubahan `firestore.rules` (wajib, kali ini ada):** empat kunci opsional baru `paket`, `dawr`, `cakupan`, `urut` (kunci wajib tidak berubah, jadi soal lama dan klien lama tetap sah). **Urutan rilis: Publish `firestore.rules` dulu, baru deploy aplikasi.** Bila dibalik, simpan paket gagal karena aturan lama menolak kunci baru (soal biasa tidak terpengaruh).
- **Sunting, simpan, kirim ke editor, review (27 Oktober, siang).**
  - Setiap butir hasil AI bisa **disunting** sebelum disimpan (ikon pensil): kalimat soal, opsi, kunci, jawaban, kutipan kitab, pembahasan, indikator. Kutipan diperiksa ulang terhadap teks segmen; kutipan yang tidak ada di teks tidak ikut tersimpan. Soal yang tidak lengkap atau memuat "menurut kitab/teks" tidak bisa disimpan sebelum diperbaiki atau dihapus.
  - Dua tombol: **Simpan sebagai Draft** (bisa disunting lagi dari Bank Soal) dan **Simpan dan kirim ke editor** (langsung Pending). Di Bank Soal, tiap paket punya tombol **Kirim ke editor** untuk butir milik Anda yang masih Draft atau dikembalikan editor. Bank memberi tahu bila Anda punya butir paket yang belum selesai namun tersembunyi oleh filter "Approved".
  - **Review/Validasi tetap per butir** (setujui atau minta revisi, catatan revisi wajib per butir, Telaah AI dan uji buta per butir), tetapi butir ditampilkan **dikelompokkan per paket** dengan judul, batas materi, dan hitungan status. Penyusun melihat catatan editor pada tiap butir yang dikembalikan, memperbaikinya dengan tombol Perbaiki, lalu mengirim ulang.
- `test/paket.test.js`: 27 tes baru.

#### Batasan yang perlu Anda ketahui

1. Tab baru **belum diuji di browser atau perangkat**; hanya `vite build` dan tes logika yang lolos. AI sungguhan juga belum dipanggil (tes memakai klien palsu). Uji dulu satu Dauri dengan teks pendek.
2. Mutu soal tiga opsi tanpa narasi pada L3 belum terukur. Jalankan `npm run eval` atau periksa 1 paket penuh sebelum dipakai ujian.
3. Komposisi bawaan 30:50:20 adalah **perkiraan**, bukan standar. Ubah sesuai kebijakan madrasah.
4. "Kutipan cocok" berarti cocok dengan teks yang diunggah. Jika foto salah dibaca OCR dan tidak dikoreksi, kutipan salah pun bisa dinyatakan cocok.
5. Biaya kuota: setiap foto 1 panggilan, ditambah ±3-4 panggilan per Dauri satu segmen (sekitar satu per segmen untuk materi panjang). Sepuluh foto + Dauri II ±14 dari 60 per hari.
6. Simpan massal belum memeriksa soal kembar (fitur `duplikat.js` hanya dipakai di form biasa), dan tab belum ada di aplikasi peran Ustadz.
7. Segmen di luar cakupan tetap **memakai satu panggilan AI** (AI yang menolak dengan `tolak_teks`, kuota tidak dikembalikan karena panggilan memang terjadi). Cakupan masih teks bebas, jadi aplikasi belum bisa menyaring segmen sebelum memanggil AI. Cara paling hemat: unggah materi yang memang sebatas bab cakupan.
8. Pembuatan paket belum diuji di browser, dan pemasangan paket npm tidak bisa dilakukan di lingkungan audit 27 Oktober (registry npm diblokir): `vite build` belum dijalankan ulang; sintaks `web/App.jsx` diperiksa dengan esbuild, dan 369 dari 371 tes lulus. Dua yang gagal hanya karena paket `vite` dan `write-excel-file` tidak ada di sandbox (`dasborUi`, `excelConfig`), bukan karena kode.
9. Paket yang disimpan **sebelum** pembaruan ini tidak punya penanda, jadi tampil sebagai soal lepas. Tidak ada migrasi otomatis.
10. Review/Validasi tetap per butir menurut keputusan pengguna (tidak ada setujui satu paket sekaligus). Naskah DOCX tidak mencetak batas materi (template IMDA tetap); batas materi tampil di ringkasan Ekspor dan kolom CSV.
11. Tampilan Bank, Ekspor, Review, dan form sunting baru diuji lewat render server (React, data tiruan), belum di browser; klik (sunting, terapkan, kirim, pilih paket di Ekspor) dan penyimpanan ke Firestore sungguhan belum diuji.
12. Mengirim ulang butir hasil revisi menghapus catatan editor pada butir itu (sama dengan perilaku soal biasa).

---

## 4. [Audit] Audit ulang aplikasi (27 Oktober 2026, siang)

*Tanggal: 27 Okt 2026.* *Berkas asal: `docs/AUDIT-27-OKT-2026-LANJUTAN.md` (digabung ke sini).*

Cakupan: seluruh `api/*`, `src/*`, `firestore.rules`, `firestore.indexes.json`, `vercel.json`, CI, dan perubahan Paket Dauri hari ini (cakupan Konfigurasi, tanpa rujukan kitab, pengelompokan paket, sunting dan kirim ke editor, Review berkelompok). Dibaca langsung dari kode; temuan diuji dengan skrip bila memungkinkan.

#### Ringkasan

- Tidak ditemukan celah keamanan baru. Satu masalah fungsi berdampak biaya (hasil AI hilang saat muat ulang) dan satu bug kecil sudah diperbaiki.
- Temuan lama B1, B2, B3, H5, H9 ternyata sudah tertutup (lihat bagian 3).
- Yang belum bisa diverifikasi di lingkungan audit: `vite build`, `npm audit`, dan `test/excelConfig.test.js` (registry npm diblokir, paket tidak bisa dipasang). 374 dari 376 tes lulus; dua yang gagal hanya karena paket `vite` dan `write-excel-file` tidak ada.

#### 1. Temuan baru

| # | Tingkat | Temuan | Status |
|---|---|---|---|
| N1 | Sedang (biaya) | Hasil AI tab Paket Dauri hanya di memori halaman. Muat ulang, tab tertutup, atau ponsel membuang tab membuang butir yang sudah memakai kuota AI harian (bawaan 60), beserta materi yang ditempel. | **Diperbaiki:** isian, materi, foto hasil baca, dan butir hasil AI disimpan sebagai draf perangkat (kunci `paketDauri`, per akun, 30 hari, dihapus saat Keluar atau bila kosong). Teks segmen disimpan sekali dan dirujuk lewat indeks. Data rusak dibangun ulang dari bidang yang dikenal; diuji dengan lima bentuk data rusak. |
| N2 | Rendah | Tab Paket Dauri tidak ada di daftar hash yang dikenal: memuat ulang halaman di `#paket` jatuh ke Penyusunan Soal. | **Diperbaiki.** |
| N3 | Rendah | Penyusun menulis sendiri `paket`, `dawr`, `urut`. Penyusun yang sengaja atau tidak sengaja memakai id paket orang lain mencampur butirnya ke kelompok itu di Bank/Review. Hanya staf yang bisa; dampaknya tampilan, bukan data atau hak akses. | Belum diubah. Aturan Firestore tidak bisa memeriksa kepemilikan id paket tanpa dokumen induk. Id dibuat acak dan tidak ditampilkan. |
| N4 | Rendah | Penyusun tidak bisa menarik kembali butir yang sudah Pending (aturan: hapus/ubah hanya saat draft atau revisi). Salah kirim hanya bisa diselesaikan editor (minta revisi). | Belum diubah; sesuai desain aturan yang ada. |
| N5 | Info | Kelengkapan paket ("kurang N dari 15 nomor") dihitung dari soal yang **sudah dimuat** (Bank 100 terbaru, Review 300 pending, draf sendiri 200). Paket lama yang sebagian butirnya belum dimuat bisa tampak kurang. | Belum diubah. Tombol "Muat lagi" di Bank menuntaskan; pertimbangkan kueri per id paket bila paket sering lama. |
| N6 | Info | Segmen di luar cakupan tetap memakai satu panggilan AI (AI yang menolak; kuota tidak dikembalikan karena panggilan terjadi). | Dicatat di bagian 3 di berkas ini. |

#### 2. Diperiksa dan baik

- Semua handler `api/*` memanggil autentikasi sesuai peran; satu-satunya yang tanpa login adalah `api/config.js` (konfigurasi web Firebase, memang publik). Aksi `paket` ditolak untuk Ustadz sebelum validasi dan kuota.
- `firestore.rules`: kunci wajib `soal` tidak berubah (soal lama dan klien lama tetap sah); kolom paket opsional dan berbatas (`urut` int 1-200, `dawr` 1-4, `cakupan` ≤120, `paket` ≤40); `config/*` dan riwayat konfigurasi tertutup untuk klien; penyusun hanya mengubah miliknya saat draft/revisi; editor tidak meninjau soalnya sendiri.
- Kueri Firestore: semua kueri di klien tercakup indeks bawaan atau gabungan indeks satu bidang (`tingkat` + `updatedAt` ada di `firestore.indexes.json`).
- Ekspor CSV melindungi sel berawalan `= + - @` (injeksi rumus). `dangerouslySetInnerHTML` hanya dipakai untuk keluaran Pegon yang sudah di-escape.
- Tidak ada rahasia di repositori (yang cocok pola hanya kunci palsu di tes).
- Paket Dauri: keempat bentuk butir (pilihan ganda, melanjutkan, isian, uraian) dari keluaran AI lolos `periksaSoal`; kutipan yang tidak cocok dengan teks tidak pernah masuk kunci; rujukan "menurut kitab/teks" ditolak atau dibuang di server dan klien.

#### 3. Temuan lama: status sekarang

| # | Status |
|---|---|
| B1 `package-lock.json` | **Selesai.** Ada; CI memakai `npm ci`. |
| B2 CSP Report-Only dan `unsafe-eval` | **Selesai.** CSP kini ditegakkan (`script-src 'self'` plus Google), tanpa `unsafe-eval`. `style-src` masih `'unsafe-inline'` (Tailwind/gaya inline). |
| B3 Skrip CDN tanpa SRI | **Selesai.** Tidak ada CDN di `index.html`; semuanya dibundel Vite. |
| H4 Profil `pending` untuk akun Google mana pun | Masih terbuka bila `ALLOWED_EMAIL_DOMAIN` kosong (ada batas laju per akun, bukan per IP). Isi variabel itu bila madrasah memakai domain email sendiri. |
| H5 Dokumentasi host kitab | **Selesai.** `.env.example` dan kode sama. |
| H9 Cache Firestore tertinggal setelah Keluar | **Selesai.** `clearPersistence()` dipanggil saat Keluar. |
| H10 Nama paket `bank-soal-madrasah` | Kosmetik, belum diubah. |

#### 4. Belum diuji (jujur)

`vite build`, `npm audit`, dan `excelConfig.test.js` (registry npm diblokir). Tampilan dan klik di browser sungguhan; Firestore dan aturan di emulator (aturan hanya dicocokkan lewat teks); panggilan AI nyata; Safari/iOS. Pemulihan draf Paket Dauri diuji lewat render server dengan data tiruan, bukan di browser.

#### 5. Saran urutan kerja

1. Deploy (urutan: Publish `firestore.rules`, lalu aplikasi) dan jalankan `npm run build` serta `npm audit` di CI.
2. Coba satu Dauri kecil sampai terkirim ke editor; muat ulang halaman di tengah proses untuk memastikan hasil pulih.
3. Isi `ALLOWED_EMAIL_DOMAIN` bila memungkinkan (H4).

---

## 5. [Perubahan] Perubahan 28 Oktober 2026

*Tanggal: 28 Okt 2026.* *Berkas asal: `docs/PERUBAHAN-28-OKT-2026.md` (digabung ke sini).*

Menindaklanjuti audit: penggantian nama, analisis butir, riwayat versi, pencarian, dan offline.

#### Yang berubah
1. **Dawr menjadi Dauri** di semua tampilan, teks, dan nama fungsi. Kunci data `dawr` di Firestore sengaja tetap (lihat bagian 3 di berkas ini).
2. **Tab Analisis Butir** (penyusun, editor, admin; bukan ustadz). Tempel hasil ujian dari Excel/Sheets: kesukaran, daya beda (kelompok atas-bawah 27%), korelasi butir-total, fungsi pengecoh, KR-20, saran per soal, unduh CSV. Diproses di perangkat, tidak dikirim ke server. Kode: `web/lib/analisisButir.js`, `web/AnalisisButir.jsx`.
3. **Riwayat versi soal.** Saat soal yang sudah ada disimpan ulang dan isinya berubah, versi lama disalin ke `soal/{id}/riwayat`. Dilihat dari form edit ("Lihat riwayat versi soal ini"); versi lama bisa dimuat ke form. Kode: `web/lib/riwayat.js`.
4. **Pencarian teks di Bank Soal** (Latin tanpa peka huruf; Arab tanpa harakat dan variasi alif/ya/ta marbuthah). Kode: `web/lib/cariSoal.js`.
5. **Cangkang aplikasi offline** lewat `public/sw.js` (hanya halaman dan berkas statis; `/api/*` dan Firebase tidak disentuh).
6. **Integrasi antartab.**
   - Bank Soal: tombol **Ke Export** dan **Ke Fokus Ujian** pada tiap soal Approved, serta **Kirim ke Export/Fokus Ujian** untuk semua soal Approved hasil filter. Tab tujuan terbuka dengan soal itu sudah terpilih.
   - Paket Dauri: setelah paket disimpan, Bank Soal otomatis terbuka pada paket itu (semua status), siap ditelaah dan dikirim ke editor.
   - Analisis Butir: pilihan **Hubungkan dengan paket** mengisi kunci dari soal (urut seperti naskah), menampilkan soal di hasil, dan memberi tombol membuka soal bermasalah untuk diperbaiki.
   - Serah-terima lewat draf perangkat (`web/lib/serahTerima.js`, dijaga `test/serahTerima.test.js`); tidak ada perubahan aturan Firestore.
7. **Filter Kitab dan Bab di Bank Soal** (`web/lib/saringKitab.js`). Ejaan berbeda ("Safinatun Naja", "safinatun  naja ") digabung; pilihan Bab hanya dari kitab terpilih, diurut angka alami (Bab 2 sebelum Bab 10); jumlah soal ditampilkan; soal tanpa kitab/bab punya pilihan sendiri. Filter ini ikut tersimpan per perangkat.

#### Wajib dilakukan setelah deploy
- **Terbitkan ulang `firestore.rules`** (Firebase Console > Firestore > Rules > tempel isi file > Publish). Tanpa ini, riwayat versi tidak tercatat, tetapi menyimpan soal tetap berhasil (ada cadangan otomatis di `commit`).
- Setelah deploy pertama, muat ulang halaman dua kali agar service worker aktif.

#### Belum dikerjakan (disengaja)
- `eval/golden.json`: kunci dan kebenaran fiqihnya harus ditetapkan ustadz, bukan AI.
- Pemecahan `web/App.jsx` per tab: perlu diuji di perangkat nyata, dilakukan bertahap.

---

## 6. [Audit] Audit 29 Okt 2026 dan persiapan perpustakaan kitab

*Tanggal: 29 Okt 2026.* *Berkas asal: `docs/AUDIT-29-OKT-2026-KITAB.md` (digabung ke sini).*

Commit yang diaudit: `beb52a4`.

#### Hasil pemeriksaan (terukur)
- `npm test`: 448 lulus, 0 gagal (sebelum tambahan); sesudah tambahan parser: 462 lulus.
- `npm run build`: berhasil. `npm audit --omit=dev`: 0 kerentanan.
- `api/`: 11 fungsi. Menambah satu berkas lagi mencapai batas 12 (Hobby). Endpoint impor kitab dijadikan aksi di `api/kitab.js`.
- `MAX_TEKS` = 6000, halaman terbesar nyata 1160 karakter: satu halaman selalu muat; satu bab perlu penggabungan.

#### Belum diperiksa
- Aturan Firestore di emulator (tidak tersedia di lingkungan audit).
- Tampilan di layar HP.
- Penerapan sebenarnya di Vercel dan Firebase.

#### Tambahan
`web/lib/syamilah.js`, `src/syamilah.js`, `test/syamilah.test.js`, `scripts/periksa-syamilah.mjs`, `docs/SKEMA-KITAB.md` (v2).
Tidak ada perubahan pada `firestore.rules`, `firestore.indexes.json`, atau `api/`.

---

## 7. [Perubahan] Perubahan 29 Oktober 2026

*Tanggal: 29 Okt 2026.* *Berkas asal: `docs/PERUBAHAN-29-OKT-2026.md` (digabung ke sini).*

Menindaklanjuti audit 29 Okt: gerbang persetujuan AI yang bisa dipalsukan (temuan 1) dan riwayat versi tanpa batas ukuran (temuan 3a).

#### Masalah
`ai.verifikasi` dan `ai.buta` ditulis penyusun sendiri, lalu aturan Firestore memakainya untuk menentukan apakah editor wajib memberi catatan alasan.
Penyusun bisa menulis `lolos`/`sepakat` untuk soal yang kutipannya gagal atau uji butanya berbeda; editor tidak akan diminta alasan.

#### Yang berubah
1. **Persetujuan lewat server.** `POST /api/assist` dengan `aksi: "setujui"` (hanya editor/admin; bukan pemakaian AI, tanpa kuota AI, dibatasi `LIMIT_REVIEW_PER_MINUTE` 30 dan `LIMIT_REVIEW_PER_DAY` 1000). Kode: `src/review.js`.
   - Kutipan Arab **dihitung ulang** dari `teks` dan isi soal yang tersimpan; klaim di dokumen hanya dipakai bila tidak bisa dihitung ulang (tanpa teks).
   - Uji jawab buta: server mencatat tiap hasil `sepakat`/`beda` di koleksi `cekbutaHasil` (kunci dokumen = sidik isi: teks, bentuk, stimulus, pertanyaan, opsi, kunci). Gerbang memakai catatan itu. Klaim `beda` di dokumen tetap dihormati bila tidak ada catatan server (hanya bisa memperketat).
   - Status harus Pending; editor tidak boleh menyetujui soalnya sendiri (admin boleh); catatan wajib bila ada alasan.
   - Tidak menambah fungsi Vercel (aksi baru di `api/assist.js`).
2. **`firestore.rules`.**
   - Klien tidak lagi bisa mengubah soal ke `approved` (editor hanya bisa meminta revisi; admin tidak bisa menaikkan status ke approved lewat klien). Fungsi `perluAlasan()` dihapus.
   - `riwayat`: isi salinan dibatasi per bidang seperti isi soal (`snapshotOk`), tidak lagi hanya "maks. 40 kunci".
   - `cekbutaHasil`: tertutup untuk klien.
3. **Klien** (`web/App.jsx`): tombol Setujui memanggil server; pesan penolakan server (mis. "perlu catatan alasan") tampil sebagai toast.
4. Dasbor admin mengabaikan id kuota `*_review`.
5. Tes: `test/review.test.js` (13 tes), termasuk penjaga agar daftar kunci riwayat di aturan tetap sama dengan `BIDANG_RIWAYAT`.

#### Lanjutan: teks kitab dicocokkan dengan halaman sumber
Menutup batas pertama di bawah. Saat persetujuan, server mengambil halaman `sumberUrl` (lewat `kitabFetch`, daftar situs yang sama dengan `/api/kitab`) dan mencocokkan baris `teks` soal (>= 3 kata, tanpa harakat dan tanda baca, selisih <= 15% kata dianggap mirip). Kode: `src/sumber.js`.
- `cocok`: semua baris ada. `sebagian`: separuh atau lebih ada (wajar untuk teks gabungan beberapa halaman, karena `sumberUrl` hanya satu). Keduanya tidak mewajibkan catatan; editor hanya diberi tahu.
- `tidak_cocok`: kurang dari separuh baris ada di halaman sumber, yaitu teks hampir seluruhnya karangan atau dari halaman lain: **catatan alasan wajib**.
- `tanpa_sumber`, `tidak_terjangkau` (situs memblokir, waktu habis, halaman terpotong), `tanpa_teks`: tidak menyimpulkan apa pun. Isi `SUMBER_WAJIB=1` di Vercel agar dua yang pertama juga mewajibkan catatan alasan (bawaan mati, karena soal dari foto kitab tidak punya tautan).
- Pengambilan halaman dilakukan sebelum transaksi; bila `teks`/`sumberUrl` berubah selagi diperiksa, persetujuan ditolak (409).

#### Urutan deploy (penting)
1. Deploy kode (Vercel) lebih dulu.
2. Baru terbitkan ulang `firestore.rules` (Firebase Console > Firestore > Rules > Publish).
   Bila urutannya terbalik, tombol Setujui di klien lama ditolak sampai kode baru aktif.
3. Muat ulang aplikasi dua kali agar service worker memuat versi baru.

#### Batas yang masih ada (jujur)
- Pencocokan sumber hanya berlaku bila ada `sumberUrl` yang terjangkau. Penyusun yang sengaja mengosongkan tautan sumber (atau memakai situs yang memblokir server) melewatinya, kecuali `SUMBER_WAJIB=1`. Satu kalimat karangan yang disisipkan ke teks yang selebihnya asli juga tidak tertangkap (rasio masih di atas separuh).
- Uji buta bisa diulang sampai `sepakat` (hasil AI tidak deterministik); yang dihitung adalah hasil terakhir untuk isi yang sama.
- Admin masih bisa mengubah isi soal yang sudah Approved tanpa pemeriksaan ulang (admin dipercaya).
- Aturan Firestore belum diuji di emulator (tidak tersedia di lingkungan audit); hanya diuji lewat tes penjaga teks aturan.
- Fungsi Vercel kini 11 berkas di `api/`; batas paket Hobby (12) perlu dicek bila Anda menambah endpoint.

#### Navigasi dua tingkat (grup dan sub-tab)
Menu hamburger tidak lagi memuat 13 tab. Kini berisi grup; sub-tab tampil sebagai bilah di bawah header (ikut menempel saat digulir). Kode: `web/lib/navigasi.js`, `web/App.jsx`, tes `test/navigasi.test.js`.

| Grup | Sub-tab | Peran |
|---|---|---|
| Susun | Penyusunan, Paket Dauri, Pegonizer | semua |
| Bank Soal | Review (editor/admin), Approved | semua (penyusun hanya Approved) |
| Ujian | Fokus & Kisi-kisi, Export, Analisis Butir | semua |
| Kelola | Backup Drive (editor/admin), Dasbor, Pengguna, Konfigurasi, Pengaturan AI (admin) | editor/admin |

- ID tab tidak berubah, jadi `#hash`, "Ke Export", "Kirim ke editor", dan draf tetap bekerja.
- Mengetuk grup membuka sub-tab terakhir yang dipakai di grup itu (selama sesi), bukan selalu yang pertama.
- Lencana grup: Bank Soal = jumlah menunggu review; Kelola = peringatan kuota AI. Lencana tiap sub-tab tetap ada.
- Grup yang hanya berisi satu tab (Kelola untuk editor) tampil langsung dengan nama tab itu, tanpa bilah sub-tab.
- Perubahan ikutan: tab **Review disembunyikan untuk penyusun** (komponennya memang hanya menampilkan "untuk editor"; penyusun memantau soalnya lewat Bank Soal dengan filter status), dan **refresh di `#analisis` kini tetap di Analisis Butir** (sebelumnya jatuh ke Penyusunan).
- Aplikasi Ustadz (5 tab) tidak diubah.
- Belum dilihat di layar sungguhan: yang diuji hanya logika pengelompokan dan struktur kode. Periksa di HP: bilah sub-tab bisa digeser mendatar, tidak menutupi konten saat header menempel, dan menu tidak terpotong.

---

## 8. [Perubahan] Perubahan 29 Oktober 2026: impor perpustakaan kitab

*Tanggal: 29 Okt 2026.* *Berkas asal: `docs/PERUBAHAN-29-OKT-2026-PERPUSTAKAAN.md` (digabung ke sini).*

Menindaklanjuti `docs/SKEMA-KITAB.md` (v2). Admin bisa mengimpor ekspor Syamilah (.txt) ke Firestore dari aplikasi.

#### Berkas
Baru: `web/lib/syamilah.js`, `src/syamilah.js` (parser), `src/kitabImpor.js` (server), `web/lib/imporKitab.js` (klien), `web/KitabImpor.jsx` (layar),
`scripts/periksa-syamilah.mjs`, `test/syamilah.test.js`, `test/kitabImpor.test.js`, `test/kitabImporUi.test.js`, dokumen ini.
Diubah: `api/kitab.js` (cabang `aksi: "impor-*"`, admin), `web/App.jsx` (tab `perpus`), `web/lib/navigasi.js` (tab di grup Kelola),
`firestore.rules` (blok `kitab`, dibaca staf, tidak pernah ditulis klien), `docs/SKEMA-KITAB.md`,
`test/navigasi.test.js` dan `test/cadanganDrive.test.js` (penjaga lama diperbarui untuk tab baru).

#### Urutan pasang
1. Unggah semua berkas ke GitHub; Vercel men-deploy otomatis. Impor sudah bisa dipakai tanpa langkah lain (server menulis lewat Admin SDK).
2. Terbitkan `firestore.rules` (Firebase Console > Firestore > Rules > Publish) **hanya ketika** layar pemilih kitab untuk penyusun soal dibuat. Impor tidak memerlukannya.
3. Muat ulang aplikasi dua kali agar service worker memuat versi baru. Buka Kelola > Perpustakaan.

#### Terukur
- Tes: 477 lulus. Build berhasil.
- Dua berkas nyata diimpor lewat handler asli ke Firestore tiruan: 673 dan 329 halaman, 9 dan 6 panggilan, muatan terbesar 158 KB, dokumen terbesar 16 KB.

#### Belum teruji
- Firestore sungguhan: `count()` dipakai di `impor-selesai` bila ada (jalur cadangannya, `select()`, yang diuji). Coba satu kitab kecil dulu.
- Aturan Firestore tidak diuji di emulator (hanya penjaga teks). Layar impor belum dilihat di HP (hanya render awal di server).
- Pemilih kitab untuk penyusun soal (pilih kitab, bab, halaman, isi otomatis form) belum dibuat.

#### Tahap 2: pemilih kitab, bab, halaman
Baru: `src/kitabBaca.js`, `web/lib/perpus.js`, `web/PemilihKitab.jsx`, `test/perpus.test.js`, `test/pemilihKitabUi.test.js`.
Diubah: `api/kitab.js` (cabang `aksi: "perpus-*"`, peran pemakai alat), `web/App.jsx` (pemilih di Penyusunan Soal dan Paket Dauri; `Compose`, `PaketDauri`, `emptyForm` diekspor untuk tes render),
`docs/SKEMA-KITAB.md`.
Terukur: 489 tes lulus, build berhasil. Interaksi (pilih kitab, lompat bab, cari nomor cetak kembar, pakai teks, batas 6.000, mode paket) dijalankan di DOM tiruan
dengan dua kitab nyata hasil impor; 5 halaman Fathul Mu'in menjadi satu segmen Paket Dauri berrujukan "40–44".
Belum teruji: tampilan dan ketukan di HP, Firestore sungguhan untuk jalur baca (jalur impor sudah terbukti), dan simpan soal hasil isian otomatis (memakai bidang lama saja, jadi aturan Firestore tidak berubah).
Tidak perlu menerbitkan `firestore.rules`.

#### Tahap 3: impor .docx dan teks dengan penanda `[ص N]`
Baru: `web/lib/docx.js`, `web/lib/penandaSisip.js`, `web/lib/dokumenKitab.js`, `test/dokumenKitab.test.js`.
Diubah: `web/KitabImpor.jsx` (memilih .txt atau .docx, menampilkan format terbaca), `web/lib/imporKitab.js` (peringatan catatan tertinggal dan label dibuang),
`web/lib/syamilah.js` (ekspor pembantu, pola wafat "(المتوفى: …)", ambang harakat 0,02), `src/kitabImpor.js` (`sumber.jenis` tiga nilai, `sumber.rujukan`), `test/kitabImporUi.test.js`, `docs/SKEMA-KITAB.md`.
Terukur: 502 tes (501 lulus, 1 dilewati: uji berkas nyata, jalankan dengan `KITAB_DASUQI_DOCX=...`); build berhasil.
Berkas nyata Dasuqi (.docx): 261 halaman, hal. 5-265 menaik tanpa anomali, 51 judul (47 cocok dengan daftar isi), tanpa sisa tatwil/penanda/label;
diimpor lewat handler asli ke Firestore tiruan, lalu dibaca lewat pemilih: "بيان الحكم الشرعي وتقسيمه", hal. 36-37, 5.844 karakter.
Belum teruji: pembukaan .docx di peramban HP (memakai `DecompressionStream`; peramban lama akan menampilkan pesan agar dipakai .txt), Firestore sungguhan.
Diketahui: 3 halaman (hal. 113, 241, 259) mungkin memuat catatan "(1)" yang tidak dibuang otomatis; satu halaman ~3.500 karakter, jadi batas 6.000 di Penyusunan Soal muat sekitar 1-2 halaman.

#### Tahap 4: halaman terlalu panjang (kasus غاية الوصول)
Penyebab: batas 12.000 karakter per halaman di server menolak seluruh impor bila satu halaman melebihinya; batas itu pilihan rancangan, bukan batas Firestore.
Baru: `web/lib/pecahHalaman.js`, `test/pecahHalaman.test.js`. Diubah: `web/lib/dokumenKitab.js` (memecah hasil semua parser), `src/kitabImpor.js` (bidang `potongan`), `src/kitabBaca.js`,
`web/lib/imporKitab.js` (peringatan), `web/PemilihKitab.jsx` (label "bagian k/n", cari nomor cetak halaman terpecah), `docs/SKEMA-KITAB.md`.
Terukur: 510 tes (509 lulus, 1 dilewati: uji berkas nyata). Tiga kitab nyata (Fathul Mu'in, Fathul Qarib, Dasuqi) hasilnya identik (0 halaman dipecah).
Belum teruji: berkas Ghayatul Wushul yang asli (tidak tersedia); alasan halamannya panjang belum diketahui.

---

## 9. [Audit] Audit 31 Okt 2026: aplikasi, perpustakaan, tautan balik, pembaca, impor multi-sumber

*Tanggal: 31 Okt 2026.* *Berkas asal: `docs/AUDIT-31-OKT-2026-PERPUSTAKAAN.md` (digabung ke sini).*

#### Temuan audit (terukur di lingkungan audit)
1. **`web/lib/sumberLain.js` tidak bisa dimuat.** Ia mengimpor `namaBerkasZip` dari `docx.js`, yang tidak mengekspornya (`SyntaxError` saat modul dimuat). Bila disambungkan ke layar impor, build Vite gagal. Diperbaiki: `namaBerkasZip` ditambahkan di `web/lib/docx.js`.
2. **Parser sumber lain, pembaca, dan helper rujukan sudah ditulis tetapi belum tersambung dan tanpa tes**: `sumberLain.js`, `PembacaKitab.jsx`, `lib/pembaca.js`, `lib/rujukan.js` tidak dipakai `App.jsx`, `KitabImpor.jsx`, maupun `dokumenKitab.js`; tidak ada tes untuknya.
3. **Server membuang `halamanVirtual` dan menolak jenis sumber baru** (`JENIS_SUMBER` hanya tiga nilai; `validasiKitab` tidak meneruskan `halamanVirtual`). Pembaca membaca `kitab.sumberJenis` dan `kitab.halamanVirtual`, yang tidak pernah dikirim `perpus-*`. Peringatan "halaman virtual" tidak akan pernah tampil.
4. **Tautan balik tidak pernah tersimpan.** Dokumen sebelumnya menyebut "memakai bidang lama saja"; `kitabId/halId` tidak ada di `FIELDS`, aturan Firestore (`opsiKeys`, `snapshotOk`, aturan admin), riwayat, maupun cadangan. Tombol "Buka di kitab" tidak mungkin ada.
5. **Pelajaran dari audit aturan:** menambah nama kunci ke `opsiKeys` saja tidak memvalidasi isinya. Ditambahkan validasi bentuk (`kitabId`, `halId`, `halIdAkhir`) di `validContent()`.
6. Empat berkas tes (`dasborUi`, `excelConfig`, `kitabImporUi`, `pemilihKitabUi`) gagal di lingkungan audit karena paket `vite` dan `write-excel-file` tidak terpasang (tanpa jaringan). Itu bukan galat kode, tetapi **tes tampilan tidak bisa dijalankan di sini**.

#### Perubahan
- **Tautan balik soal ke halaman kitab.** Tiga bidang opsional di soal: `kitabId`, `halId` (urutan halaman, bukan nomor cetak), `halIdAkhir`. Terisi otomatis saat teks diambil dari perpustakaan (Penyusunan Soal); "tambah halaman" memperluas rentang, kitab berbeda melepas tautan. Form menampilkan chip "Tertaut ke perpustakaan" dengan "Buka di kitab" dan "Lepas tautan". Kartu di Review dan Bank Soal punya tautan "Buka di kitab" (`#baca/<kitab>/<urutan>[-<akhir>]`). Teks, nama, juz, dan hal tetap disalin ke soal: soal yang sudah disetujui tidak berubah bila teks kitab dikoreksi.
- **Tab Baca Kitab** (grup "Baca Kitab" di menu): `PembacaKitab.jsx` disambungkan. Layar lebar, huruf 20 sampai 60 px (bawaan 32), daftar isi dapat dicari, lompat ke nomor cetak, 1 atau 2 halaman, matn/syarah, salin dengan rujukan, pintasan papan ketik (panah, + dan -, Esc), posisi terakhir diingat per kitab, alamat `#baca/...` bisa dibagikan, rentang rujukan soal disorot. Tidak membuat soal.
- **Impor multi-sumber**: `.txt` dan `.docx` Syamilah, `.txt/.docx/.html` dengan penanda `[ص N]`, **PDF berlapis teks** (nomor awal diisi admin), **EPUB** (penanda pagebreak bila ada), **HTML**, **JSON halaman**, dan berkas **tanpa penanda** dengan tombol "Bagi halaman otomatis" (halaman virtual, ditandai dan diperingatkan). PDF pindai ditolak dengan petunjuk OCR.
- `web/lib/bacaPdf.js` (pdfjs dimuat malas), `dokumenKitab.js` (routing semua format), `KitabImpor.jsx` (pemilih berkas, nomor awal, baca ulang, tawaran virtual), `imporKitab.js` (peringatan virtual/PDF/JSON).
- Server: `JENIS_SUMBER` + `halamanVirtual` di `src/kitabImpor.js`; `perpus-*` mengirim `halamanVirtual` dan `sumberJenis`; `src/backup.js` memulihkan tautan (rujukan setengah dibuang).

#### Yang WAJIB dilakukan saat memasang
1. **Terbitkan `firestore.rules`** (Firebase Console > Firestore > Rules > Publish). Berbeda dengan catatan 29 Okt, sekarang perlu: tanpa itu, menyimpan soal bertautan ditolak. Aplikasi sudah aman untuk aturan lama karena bidang kosong tidak dikirim, tetapi soal dari perpustakaan akan gagal disimpan sampai aturan terbit.
2. Muat ulang aplikasi dua kali (service worker).
3. Coba impor satu berkas kecil per format sebelum kitab besar.

#### Belum teruji
- `npm run build` dan tes tampilan (4 berkas) tidak bisa dijalankan di lingkungan audit; sintaks JSX diperiksa dengan `tsc` saja. Jalankan `npm test` dan `npm run build` di komputer Anda.
- PDF nyata lewat pdfjs, EPUB nyata, dan JSON dari situs tertentu: parser diuji dengan data buatan. Alias bidang JSON (pages/text/page/vol) belum diuji pada ekspor situs mana pun.
- Aturan Firestore hanya diuji sebagai teks (belum di emulator). Tampilan di HP belum dilihat.
- Paket Dauri: halaman dari perpustakaan sudah memakai ID `kitabId:urutan`, tetapi soal hasil Paket Dauri **belum** diberi tautan balik. Ustadz (menu 5 tab, sengaja dibatasi tes) belum mendapat tab Baca Kitab.

---

## 10. [Audit] Audit 31 Okt 2026: pencarian teks Baca Kitab dan mutu impor kitab

*Tanggal: 31 Okt 2026.* *Berkas asal: `docs/AUDIT-31-OKT-2026-CARI-DAN-MUTU-IMPOR.md` (digabung ke sini).*

#### Temuan
1. **Tab Baca Kitab tidak punya pencarian isi.** Yang ada hanya penyaring judul bab dan lompat ke nomor halaman cetak. Mencari satu kalimat di kitab 600 halaman berarti membuka halaman satu per satu.
2. **Pencarian isi tidak bisa dibuat dengan membaca halaman biasa.** Firestore tidak punya pencarian teks penuh, dan satu kitab bisa 5.000 halaman; membacanya per pencarian menghabiskan kuota baca harian paket Spark (50 ribu) dalam beberapa kali coba.
3. **Impor tidak memeriksa ISI teks, hanya bentuknya.** Parser memastikan halaman, nomor, dan bab; teks rusak (PDF dengan pemetaan huruf buruk: huruf terpisah, urutan terbalik, karakter pengganti, UTF-8 terbaca sebagai Latin-1) lolos dan baru ketahuan setelah soal dibuat dari kutipan itu.
4. **PDF: judul berjalan dan nomor halaman ikut tersimpan** di awal/akhir tiap halaman, mengotori kutipan ke soal. Nomor cetak hanya ditebak dari urutan halaman PDF + nomor awal isian admin, padahal sampul dan pengantar menggeser hitungan.
5. **Pratinjau impor hanya menampilkan 500 karakter halaman pertama**, yaitu halaman yang paling tidak mewakili isi kitab (sampul/judul).
6. **Bentrokan dengan kitab yang sudah ada baru ketahuan dari galat server (409).** Tidak ada peringatan bila judul Arab yang sama sudah diimpor dengan ID lain, atau bahwa "timpa" menghapus halaman lama.
7. **`peringatanPratinjau` dipanggil di badan render** layar impor. Setelah ditambah pemeriksaan mutu yang menyisir seluruh teks, ia akan berjalan di setiap ketikan pada kolom Nama kitab bila tidak diingat.
8. Dicek dan baik: tiap `api/*.js` memakai autentikasi sesuai peran (kecuali `config.js`, memang publik); pengambil kitab dari situs memakai daftar host, https saja, tanpa kredensial/port; `sw.js` tidak menyentuh `/api/`; tidak ada kunci rahasia di repo; `.gitignore` menutup `.env` dan kunci layanan.

#### Perubahan
**Pencarian teks** (`web/lib/cariKitab.js`, `src/kitabCari.js`, `web/PembacaKitab.jsx`)
- Panel samping pembaca punya dua tab: *Daftar isi* dan *Cari teks* (tombol "Cari teks" di bilah alat, pintasan `/`).
- Pencarian mengabaikan harakat dan tatwil, menyatukan أ/إ/آ/ا, ى/ي, ة/ه, ؤ/ئ, angka Arab/Persia; tanda baca jadi spasi. Kecocokan substring, jadi "كتاب" menemukan "الكتاب" dan "بالكتاب". Dua mode: **frasa persis** dan **semua kata** (urutan bebas, maksimal 8 kata).
- Hasil: cuplikan dengan kata disorot, nomor halaman, juz, jumlah kemunculan, dan bab; 50 per muatan, "Muat hasil berikutnya". Klik hasil membuka halaman; kata disorot juga **di teks berharakat** halaman (regex yang mengabaikan harakat), dengan tombol "Hasil sebelumnya/berikutnya" dan "Hilangkan sorotan kata".
- **Indeks**: potongan teks normal (maks 250 ribu karakter) di `kitab/{id}/cari/*`. Satu pencarian membaca sekitar 20-40 dokumen, bukan ribuan, dan hasil bacaan disimpan di memori proses (maks 2 kitab), jadi pencarian berikutnya tidak membaca Firestore.
  - Kitab yang diimpor sesudah ini: indeks ditulis dalam batch yang sama dengan halamannya (halaman lengkap = indeks lengkap), meta ditulis di `impor-selesai`; impor ulang menghapus indeks lama.
  - Kitab lama: indeks dibangun **bertahap dan otomatis** pada pencarian pertama (anggaran 5,5 detik per panggilan, kemajuan tersimpan; layar menampilkan "Menyiapkan pencarian... 2/7"). Dua pemakai yang membangun bersamaan aman (ID potongan deterministik).
  - `firestore.rules`: `cari/*` ditutup eksplisit untuk klien.

**Mutu impor** (`web/lib/kualitasKitab.js`, `sumberLain.js`, `imporKitab.js`, `KitabImpor.jsx`)
- **Pemeriksa isi** yang muncul sebagai peringatan di layar impor (merah = menghalangi impor): mojibake, karakter pengganti/area pribadi, karakter kontrol, bukan teks Arab / sedikit Arab, huruf terpisah-pisah, kata menempel, urutan huruf terbalik, halaman hampir kosong, rata-rata halaman terlalu pendek, halaman ganda persis, baris berulang di awal/akhir halaman.
- **PDF**: judul berjalan dan nomor halaman (baris yang sama di awal/akhir >= 30% halaman, angka diabaikan) dibuang; baris isi di tengah halaman tidak disentuh. Bila nomor itu konsisten (>= 70% halaman bernomor sepakat, >= 50% halaman memuat nomor), nomor cetak dibaca dari sana. **Aturan:** bila kolom "nomor cetak halaman pertama" dibiarkan 1, nomor dari PDF dipakai; bila admin mengisi angka lain, angka admin yang menang, dan layar memberi tahu. Semuanya dilaporkan di peringatan.
- **Pratinjau halaman** mana pun (urutan, tombol Awal/Tengah/Akhir/Terpanjang), hingga 1.500 karakter.
- **Peringatan duplikat**: ID sudah dipakai (merah bila belum "timpa", kuning bila timpa, dengan penjelasan akibatnya), dan judul Arab yang sama dengan ID lain.
- Pemeriksaan mutu diingat per hasil baca (`useMemo`), bukan dihitung ulang tiap ketikan.

**Tes**: `test/cariKitab.test.js` (17) dan `test/kualitasKitab.test.js` (16). Total tes 478, lulus 467; 8 gagal karena paket (React/Vite/docx/jszip) tidak terpasang di lingkungan audit, sama persis dengan sebelum perubahan.

#### Yang perlu dilakukan saat memasang
1. **Terbitkan `firestore.rules`** (hanya menambah aturan tutup untuk `cari/*`; pencarian tetap jalan tanpa itu karena lewat server, tetapi klien tidak boleh membaca indeks).
2. Muat ulang aplikasi dua kali (service worker).
3. Buka tab Baca Kitab pada kitab yang sudah ada, cari satu kata. Kitab besar akan menyiapkan indeks dulu (beberapa detik sampai setengah menit, satu kali). Cek di Firestore bahwa `kitab/<id>/cari/meta` berstatus `siap`.
4. Impor ulang satu PDF nyata dan baca peringatan serta pratinjau (awal, tengah, akhir) sebelum menekan impor.

#### Belum teruji (jujur)
- **`npm run build` dan 8 berkas tes tampilan tidak bisa dijalankan** (registry npm ditolak di lingkungan audit). Sintaks JSX dan nama variabel `PembacaKitab.jsx` dan `KitabImpor.jsx` diperiksa dengan `tsc`; tampilannya **belum dilihat di browser** (tab, sorotan, tampilan HP). Jalankan `npm test` dan `npm run build` di komputer Anda.
- Pencarian diuji dengan Firestore tiruan, bukan Firestore sungguhan: waktu bangun indeks kitab besar (5.000 halaman) belum terukur. Anggaran 5,5 detik per panggilan sengaja jauh di bawah `maxDuration` 60 detik.
- Pembersih PDF diuji dengan teks sintetis lewat jalur `bacaDokumenKitab` -> `parsePdf`, bukan PDF nyata melalui pdfjs. Ambang (30% halaman, 70% kesepakatan nomor) wajar tetapi belum diuji pada koleksi PDF kitab; periksa pratinjau pada PDF pertama Anda.
- Pemeriksa mutu diuji pada teks sintetis; ambang (mis. 20% kata satu huruf, 1% kata >= 22 huruf) belum dikalibrasi pada kitab nyata. Semua temuan bertingkat peringatan kecuali kerusakan jelas (mojibake, karakter pengganti > 0,5%, terbalik, huruf terpisah, bukan Arab).

#### Catatan yang tidak diubah
- `perpus-*` tetap tanpa pembatas laju (pembatas laju menulis satu dokumen per panggilan dan menggerus kuota tulis Spark). Pencarian paling berat di antaranya, tetapi murah setelah indeks ada di memori; pantau kuota baca bila pemakai banyak.
- Pencarian hanya di satu kitab yang sedang dibuka. Pencarian lintas kitab membutuhkan membaca indeks semua kitab per pencarian (puluhan sampai ratusan pembacaan); belum dikerjakan.
- Perubahan aturan normalisasi (mis. menambah varian huruf) = naikkan `VERSI_INDEKS` di `web/lib/cariKitab.js`; indeks lama dibangun ulang sendiri.

---

## 11. [Audit] Audit dan peningkatan impor PDF — 1 Nov 2026

*Tanggal: 1 Nov 2026.* *Berkas asal: `docs/AUDIT-01-NOV-2026-IMPOR-PDF.md` (digabung ke sini).*

Dasar: clone `main` (commit e93b6b7), 579 tes lulus sebelum perubahan, 598 sesudahnya, build Vite lolos.

#### Temuan audit (jalur impor PDF)

| # | Temuan | Dampak | Status |
|---|---|---|---|
| 1 | PDF pindai (gambar) ditolak total (`PDF_TANPA_TEKS`); OCR AI sudah ada di repo (`src/fotoKitab.js`) tetapi tidak tersambung ke impor | Kitab yang hanya ada sebagai PDF pindai tidak bisa masuk perpustakaan | Diperbaiki: tombol "Baca dengan OCR AI" |
| 2 | Pemeriksaan "ada teks atau tidak" memakai RATA-RATA seluruh PDF | PDF campuran (sebagian pindai) lolos dengan halaman kosong senyap | Diperbaiki: penilaian per halaman (`nilaiHalamanPdf`), halaman bermasalah dilaporkan dan bisa di-OCR |
| 3 | Penanda buku (bookmark) PDF tidak dibaca; daftar isi hanya ditebak dari kata "باب/فصل/كتاب" | Daftar isi dan bab per halaman kurang tepat | Diperbaiki: penanda buku dipakai bila >= 3 entri; cadangan: ukuran huruf lalu kata kunci |
| 4 | Metadata PDF (judul, pengarang) tidak dibaca | Admin mengetik ulang | Diperbaiki (judul sampah seperti "Microsoft Word - x.docx" dibuang) |
| 5 | Pembacaan PDF panjang tanpa progres dan tanpa tombol batal; halaman dan dokumen pdf.js tidak dilepas | Layar tampak macet pada PDF ratusan halaman; memori tertahan (berisiko di ponsel) | Diperbaiki: progres, batal, `page.cleanup()`, `doc.destroy()` |
| 6 | Pengaman CVE pdf.js 3.11 (`isEvalSupported: false`) | — | Sudah ada; dipertahankan |

#### Yang ditambahkan

- `web/lib/bacaPdf.js`: sesi PDF (teks + calon judul menurut ukuran huruf, penanda buku, metadata, gambar halaman untuk OCR).
- `web/lib/pdfKitab.js`: alur PDF -> (opsional) OCR -> `parsePdf`. `web/lib/ocrPdf.js`: antrean OCR (2 paralel, tunggu 429, berhenti saat kuota harian habis, batal, halaman gagal tidak menggagalkan kitab).
- `src/kitabOcr.js` + aksi `impor-ocr` di `api/kitab.js`: khusus admin, TIDAK memakai kuota AI per pengguna (satu kitab = ratusan halaman), batas laju sendiri `LIMIT_OCR_PER_MINUTE` (20) dan `LIMIT_OCR_PER_DAY` (1500). Tidak menambah fungsi Vercel (tetap 11 dari 12).
- Halaman hasil OCR ditandai `ocr: true`, kitab `sumber.jenis = "pdf-ocr"` dan `ocrHalaman`; pembaca menampilkan peringatan. Tidak perlu mengubah aturan Firestore (penulisan lewat Admin SDK).

#### Tahap 2 (OCR Latin/Pegon, dua kolom, ligatur, paragraf)

- **OCR Latin dan Pegon/Jawi**: aksi `impor-ocr` menerima `aksara` = `arab` (bawaan) | `latin` | `pegon`. Petunjuk ke AI berbeda per aksara (Latin: ejaan lama tidak dimodernkan; Pegon: huruf khusus ڠ ڽ چ ڤ ݢ ۑ ۏ dipertahankan dan dilarang dialihaksarakan ke Latin). Hasil yang tidak cocok dengan aksara yang dipilih (mis. halaman Arab dibaca sebagai Latin) dianggap halaman tanpa teks. Pemilih jenis tulisan ada di panel OCR.
- **PDF dua kolom**: `kolom: 'auto'` (bawaan) mengenali talang vertikal di tengah halaman, lalu membaca per pita: kolom awal-baca dulu (kanan untuk Arab). Judul selebar halaman tetap di atas kolomnya. Pengaman nazham: syair tersusun dua syatr per baris sehingga mirip dua kolom, maka deteksi hanya aktif bila setiap sisi bermedian >= 30 karakter per baris dan >= 16 baris berisi di kedua sisi. Tombol "Baca ulang tanpa deteksi dua kolom" tersedia bila ada halaman terdeteksi.
- **Ligatur (NUL)**: NUL yang berdiri sendiri diganti "الله", atau "صلى الله عليه وسلم" bila didahului محمد/النبي/نبينا/سيدنا atau "رسول الله". **Ini tebakan** (NUL tidak menyimpan ligatur aslinya), karena itu selalu dilaporkan di pratinjau. NUL yang menempel pada huruf dibiarkan.
- **Paragraf**: baris visual digabung bila baris sebelumnya terisi penuh (>= 90% lebar blok) dan baris berikutnya bukan: menjorok, berjeda paragraf, bercelah lebar (syair), berhuruf judul, berawalan kata bab, pendek, atau angka. Dua baris awal dan akhir halaman tidak disentuh agar pembersih judul berjalan dan nomor halaman tetap bekerja. Kata Latin terpotong tanda hubung disambung.

#### Batasan yang masih ada (jujur)

1. **Mutu OCR belum diuji pada kitab nyata** (tes memakai AI tiruan), untuk ketiga aksara. Harakat dan huruf bisa keliru, sedangkan pemeriksa kutipan memakai teks ini sebagai rujukan. Periksa sampel halaman dan coba dulu pada satu jilid kecil. OCR Pegon paling berisiko: ejaan Pegon tidak baku dan AI cenderung "membetulkan".
2. **Biaya.** Satu halaman = satu panggilan AI. Kitab 300 halaman = 300 panggilan; pada 20 per menit membutuhkan sekitar 15 menit dengan layar terbuka.
3. **Deteksi dua kolom bersifat heuristik.** Teruji pada PDF uji dua kolom dan nazham buatan sendiri, belum pada kitab nyata. Syair dengan syatr panjang (bahar thawil/basith, >= 30 karakter) bisa salah terdeteksi; gunakan tombol baca ulang tanpa deteksi. Tiga kolom, dan halaman yang kolomnya tidak sejajar vertikal, tidak ditangani.
4. **Penggabungan paragraf** paling akurat untuk teks rata kanan-kiri (justified). Teks rata satu sisi saja (ragged) menghasilkan penggabungan tidak merata.
5. Ligatur selain lafzh dan shalawat (mis. ﷻ) tidak dibedakan; semua NUL berdiri sendiri diperlakukan sebagai dua kemungkinan di atas.
6. Pembacaan PDF memakai memori peramban: PDF besar di ponsel lama bisa berat. Batas 3000 halaman tetap berlaku.

#### Diverifikasi dengan pdf.js sungguhan

PDF uji Arab dengan 4 halaman, penanda buku bertingkat, dan metadata (tahap 1); PDF dua kolom 3 halaman (3 dari 3 terdeteksi, urutan baca benar: kolom kanan lalu kiri), PDF nazham (0 terdeteksi sebagai kolom), dan PDF paragraf (tahap 2). Tahap 1: judul, pengarang, 3 penanda buku (dengan level), calon judul menurut ukuran huruf (rasio 1,83), dan urutan teks logis terbaca benar.

#### Audit impor EPUB (1 Nov 2026)

**Temuan utama [Pasti]: `parseEpub` tidak punya satu pun tes sebelumnya.** Cacat di bawah dikonfirmasi dengan EPUB sungguhan (ZIP terkompresi buatan `test/_epub.js`) sebelum diperbaiki, lalu jalur diuji ulang pada EPUB nyata (IDPF accessible_epub_3: 38 berkas, 85 halaman virtual, metadata terbaca).

| # | Cacat (terbukti) | Dampak | Status |
|---|---|---|---|
| 1 | Nomor pagebreak hanya angka Latin (`\d`); `title="١٢"` atau `id="page_١٢"` tidak terbaca | EPUB kitab ber-nomor Arab-Hindi dianggap tanpa penanda halaman, atau halamannya hilang | Diperbaiki (juga angka Persia) |
| 2 | Atribut berkutip tunggal (`full-path='..'`, `id='..'`) tidak terbaca | EPUB sah ditolak "container.xml tidak menunjuk OPF" | Diperbaiki; awalan `opf:` juga diterima |
| 3 | `</td>` tidak memberi spasi | Syair dalam tabel menempel: "مالكمصليا" | Diperbaiki (juga dd/dt/figcaption/aside/pre) |
| 4 | `decodeURIComponent` tanpa penjaga | Galat mentah "URI malformed" | Diperbaiki |
| 5 | Catatan kaki EPUB3 (`aside footnote/endnote`) dan tautan `noteref` tercampur di teks halaman | Hamisy ikut jadi rujukan pemeriksa kutipan | Dibuang dan dihitung, sama dengan jalur Syamilah |
| 6 | Teks sebelum penanda halaman pertama (sampul, pengantar) dibuang tanpa peringatan | Isi hilang senyap | Dilaporkan (`teksSebelumPenanda`) dan diperingatkan; perilaku membuang dipertahankan |
| 7 | Bab di OPF yang berkasnya hilang dilewati tanpa jejak | Teks hilang senyap | Dihitung (`babTakTerbaca`) dan diperingatkan |
| 8 | Dokumen navigasi (`properties="nav"`) ikut diimpor sebagai isi bila ada di spine | Daftar isi tercetak jadi halaman | Dilewati |
| 9 | Arsip rusak/DRM menghasilkan galat mentah; pesan menyebut ".docx" | Membingungkan | `EPUB_DRM` (enkripsi selain pengaburan font) dan `EPUB_RUSAK` berbahasa jelas |
| 10 | EPUB isi gambar (pindai) hanya berpesan "tidak berisi teks" | Tidak ada arahan | Pesan menunjuk jalur PDF + OCR AI |

Dugaan yang **tidak** terbukti: performa. 3000 berkas XHTML (satu halaman per berkas) selesai dalam sekitar 2 detik di Node, jadi tidak diubah.

**Belum dikerjakan**
1. Daftar isi EPUB (nav.xhtml / toc.ncx) belum dipakai; daftar isi masih ditebak dari tag h1-h6 (pemetaan anchor ke halaman butuh penanda posisi di aliran teks).
2. Format penanda halaman selain `epub:type="pagebreak"` / `role="doc-pagebreak"` (mis. `<span class="PageNumber">[12]</span>` dari konverter tertentu) belum dikenali; EPUB seperti itu jatuh ke halaman virtual. Belum ada contoh EPUB kitab Arab nyata untuk memastikan format mana yang umum.
3. Item spine `linear="no"` tetap ikut diimpor.
4. EPUB bergambar (hasil pindai) belum bisa di-OCR langsung.

##### Berkas nyata: متن_لب_الأصول.epub (diunggah pengguna)

Sumber: **Internet Archive, hasil OCR otomatis** (`hocr-to-epub`), 99 berkas `page_N.html`, tanpa penanda halaman cetak. Sebelum perbaikan, parser menolaknya (TANPA_PENANDA); bila dipaksa dengan halaman virtual, hasilnya 27 halaman karangan yang memuat notice bahasa Inggris Internet Archive sebagai isi dan baris "estimated to be only N% accurate" tercampur di teks.

Fakta kualitas [Pasti, dihitung dari berkasnya]: 81 dari 99 halaman mencantumkan perkiraan akurasi OCR; semuanya antara 24,69% dan 47,86% (median 34,16%); tidak ada yang di atas 50%. Teks contoh: "ختصر" (مختصر), "ني" (في), "نحفة" (تحفة), baris acak bercampur huruf Latin.

Perbaikan: mode EPUB Internet Archive (dikenali dari `archive.org/details/` di OPF dan >= 80% berkas bernama `page_N`):
- satu berkas = satu halaman, `hal` = N (nomor lembar pindai, bukan nomor cetak), lembar kosong dilewati tanpa dihitung sebagai anomali penomoran;
- notice Internet Archive dan baris akurasi dibuang dari teks; akurasi diringkas di `laporan.ocrAkurasi` dan diperingatkan keras bila median < 70%;
- semua halaman ditandai `ocr: true`, sumber `epub-ocr`, rujukan `archive.org/details/<id>`; lolos validasi server (diuji pada berkas aslinya: 99 halaman, validasiHalaman 99/99, validasiKitab lolos).

**Rekomendasi: jangan jadikan berkas ini rujukan soal.** Dengan akurasi sekitar 34%, pemeriksa kutipan akan menolak kutipan yang benar atau meloloskan teks yang rusak. Cari teks Syamilah/Waqfeya untuk لب الأصول, atau unduh PDF pindai dari archive.org lalu gunakan "Baca dengan OCR AI" (mutunya belum teruji, lihat batasan OCR di atas).

---

## 12. [Audit] Audit 1 November 2026: kitab/buku non-Arab

*Tanggal: 1 Nov 2026.* *Berkas asal: `docs/AUDIT-01-NOV-2026-KITAB-NON-ARAB.md` (digabung ke sini).*

Cakupan audit: jalur impor perpustakaan kitab dan jalur yang memakai teks kitab (penyusunan soal, Paket Dauri, telaah, uji jawab buta, pemeriksa kutipan, pembaca). `web/App.jsx` (±400 KB), aturan Firestore, dan evaluasi AI tidak diaudit menyeluruh.

#### Temuan

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

#### Perubahan

- Baru: `web/lib/bahasa.js` (deteksi aksara dan bahasa, atribut tampilan), `test/kitabNonArab.test.js` (18 tes).
- Impor: `kualitasKitab.js` (aturan per aksara), `syamilah.js` (judul bab Latin, label kepala Latin, `levelKata` bersama), `penandaSisip.js` (penanda halaman Latin), `dokumenKitab.js` (`tetapkanBahasa`), `imporKitab.js` (pilihan bahasa, isian awal), `src/kitabImpor.js` dan `src/kitabBaca.js` (bidang `bahasa`, `aksara`).
- Soal: `soalService.js` (`resolveBahasa`, `teksProblem`, `sesuaikanPromptBahasa`), `paketService.js` (`sistemPaketFor`), `kutipan.js` dan `paket.js` (mode Latin), `App.jsx` (kirim `bahasa`, pesan dan kolom teks mengikuti aksara).
- UI: `KitabImpor.jsx`, `PembacaKitab.jsx`, `PemilihKitab.jsx`.
- Kompatibilitas: tanpa `bahasa` semuanya berperilaku seperti sebelumnya (prompt Arab identik karakter demi karakter, teks Latin tanpa `bahasa` tetap ditolak).

#### Verifikasi

- Tanpa dependensi terpasang: 496 tes, 485 lulus, 8 gagal. Delapan itu sama dengan keadaan awal (paket `docx`, `react`, `write-excel-file`, `jszip` tidak terpasang di lingkungan audit). Keadaan awal: 478 tes, 467 lulus; selisih 18 adalah tes baru.
- Dengan `react`, `react-dom`, `docx`, `pdfjs-dist` disambungkan sementara: 564 tes, 559 lulus, 4 gagal (`dasborUi`, `excelConfig`, `kitabImporUi`, `pemilihKitabUi`) karena `vite` dan `write-excel-file` tetap tidak ada. Jalankan `npm install && npm test` untuk hasil penuh.
- Smoke render (SSR) `KitabImpor`, `PemilihKitab`, `PembacaKitab` berhasil dengan ikon tiruan. `Compose` dan `PaketDauri` di `App.jsx` TIDAK dirender (butuh `firebase`, `mammoth`, dan impor `?url` khas Vite); keduanya hanya diperiksa sintaksnya dan ditutup tes logika.
- Belum diuji: browser sungguhan, PDF Latin sungguhan (hanya lewat teks per halaman tiruan), dan panggilan AI sungguhan dengan prompt yang disesuaikan. Jalankan `npm run eval` dengan beberapa contoh teks Latin sebelum dipakai luas.

#### Batasan yang perlu diketahui

- Bahasa dikenali dari kata fungsi (Indonesia, Inggris, Jawa, Sunda); Melayu terbaca sebagai Indonesia dan Pegon/Jawi terbaca sebagai Arab pada deteksi otomatis di penyusunan soal. Pilihan manual di layar impor tetap menentukan arah tampilan.
- Pembuangan catatan kaki otomatis "(1) ..." di akhir halaman memakai aturan Syamilah dan ikut berlaku pada buku Latin; layar impor menampilkan jumlah yang dibuang dan peringatannya.
- Kata yang terputus tanda hubung di akhir baris PDF tidak disambung kembali.
- Hak cipta buku non-Arab hampir selalu berlaku: status awal tetap "belum dicek"; admin yang menentukan.

---

## 13. [Perubahan] Perubahan 2 Nov 2026 - impor lebih aman

*Tanggal: 2 Nov 2026.* *Berkas asal: `docs/PERUBAHAN-02-NOV-2026-IMPOR-AMAN.md` (digabung ke sini).*

Menindaklanjuti audit impor kitab (temuan 1 dan 4).

#### 1. Impor ulang bertahap dan bisa dilanjutkan
- "Timpa" atas kitab yang sudah siap tidak lagi menghapus apa pun di awal. Kitab lama tetap aktif dan terbaca; isi baru ditulis ke ruang baru, dan baru dialihkan di `impor-selesai` (satu penulisan meta). Impor yang gagal atau ditutup di tengah tidak mengubah kitab yang sedang dipakai.
- Impor yang terputus dilanjutkan dengan mencentang "Lanjutkan" dan memilih berkas yang sama persis. Server membandingkan sidik isi (`sidikHasil`) dan jumlah halaman; halaman yang sudah tertulis dilewati.
- Batas yang tersisa: peralihan tetap memakai pembacaan ulang berkas (hasil OCR AI tidak dicek-simpan, jadi OCR ulang menghasilkan sidik berbeda dan tidak bisa dilanjutkan). Sisa ruang dari percobaan yang ditinggalkan dibersihkan pada impor-mulai berikutnya.
- Berkas: src/kitabImpor.js, src/kitabBaca.js, src/kitabCari.js, web/lib/imporKitab.js, web/KitabImpor.jsx.

#### 2. Pembaca .docx
- Pemisah halaman Word (`w:br w:type="page"`, `w:pageBreakBefore`, akhir seksi halaman berikutnya) sekarang terbaca. Dokumen tanpa penanda `[ص N]` tetapi berhalaman (hasil konversi PDF ke Word) bisa diimpor dengan "Pakai pemisah halaman Word": satu halaman Word = satu halaman kitab (jenis sumber `docx-halaman`, nomor = nomor awal + urutan, bukan nomor cetak).
- Kotak teks tidak lagi terbaca dua kali (salinan `mc:Fallback` dibuang).
- Batas ukuran isi setelah dibuka (150 MB, juga dicek terhadap ukuran yang diumumkan arsip) melindungi peramban ponsel dari zip bomb. Berlaku juga untuk pembaca EPUB.
- Berkas: web/lib/docx.js, web/lib/sumberLain.js, web/lib/dokumenKitab.js.

#### Tes
test/docxAman.test.js (baru), test/kitabImpor.test.js dan test/cariKitab.test.js (disesuaikan, ditambah skenario bertahap dan lanjutkan). Seluruh suite lulus.

#### 3. Titik simpan OCR (tambahan)
- Hasil OCR AI tiap halaman disimpan di IndexedDB peramban (web/lib/simpananOcr.js), dengan kunci nama+ukuran+waktu ubah berkas+aksara. Tab mati, layar terkunci, atau kuota harian habis tidak lagi menghanguskan halaman yang sudah terbaca: baca ulang berkas yang sama hanya memanggil AI untuk halaman yang belum ada.
- Hanya hasil berhasil yang disimpan (termasuk halaman kosong sah); halaman gagal dicoba ulang. Simpanan dihapus setelah impor berhasil dan otomatis kedaluwarsa setelah 14 hari. Galat penyimpanan tidak pernah menggagalkan OCR.
- Karena hasil lama dipakai apa adanya, sidik berkas OCR menjadi stabil, sehingga "Lanjutkan impor yang terputus" juga bekerja untuk impor OCR.
- Batas: simpanan ada per perangkat dan peramban; berpindah ponsel atau mode privat berarti mulai dari awal. Tes: test/simpananOcr.test.js (IndexedDB asli tidak bisa diuji di Node, hanya logika dan penanganan galatnya).

#### 4. Tambah jilid ke kitab yang sudah ada
- `impor-mulai` dengan `tambah:true` menambahkan jilid berikutnya di belakang kitab berstatus siap. Urutan halaman digeser (offset = jumlah halaman sekarang), `juz` dimulai dari `juzAwal` (bawaan: juz terakhir + 1), daftar isi digabung. Hak cipta, mazhab, dan metadata kitab tidak berubah. Bahasa, aksara, dan jenis penomoran harus sama (422 `TAMBAH_TIDAK_SAMA`).
- Halaman jilid baru tidak terlihat pembaca maupun pencarian sampai `impor-selesai` menaikkan `jumlahHalaman` dalam satu penulisan. Bisa dilanjutkan bila terputus (sidik berkas sama).
- Dua celah ditutup: (a) pencarian kini mengabaikan potongan indeks dengan urutan di luar `jumlahHalaman`, jadi jilid yang belum selesai tidak muncul di hasil cari; (b) memulai penambahan baru membersihkan halaman dan potongan indeks sisa percobaan yang ditinggalkan, sehingga tidak ada halaman atau hasil cari ganda.
- UI: kotak "Tambahkan sebagai jilid berikutnya" dan isian nomor juz awal; pratinjau memperingatkan bila ID belum ada, kitab belum siap, bahasa berbeda, atau "timpa" ikut dicentang.
- Tes: lima tes baru di test/kitabImpor.test.js.

---

## 14. [Perubahan] Perubahan 3 Nov 2026: koreksi teks kitab oleh editor dan admin

*Tanggal: 3 Nov 2026.* *Berkas asal: `docs/PERUBAHAN-03-NOV-2026-KOREKSI-KITAB.md` (digabung ke sini).*

Permintaan: editor atau admin bisa membetulkan teks yang salah di Perpustakaan / tab Baca Kitab setelah dicocokkan dengan kitab asli, terutama hasil OCR AI.

#### Temuan audit (sebelum perubahan)
1. **Tidak ada jalur mengubah teks.** Aturan Firestore menutup `kitab/*` untuk tulis dari klien, dan satu-satunya penulis adalah impor. Membetulkan satu huruf berarti mengimpor ulang seluruh kitab (untuk PDF pindai: mengulang OCR AI, berbayar dan lambat).
2. **Peringatan OCR tidak bisa dicabut.** Setiap halaman bertanda `ocr` selalu menampilkan "huruf dan harakat bisa keliru", sekalipun sudah dicocokkan.
3. **Simpanan pencarian di memori server akan basi.** Kunci simpanan `src/kitabCari.js` hanya memuat id, revisi, versi indeks, dan jumlah halaman. Teks yang dikoreksi tidak mengubah salah satunya, jadi mesin yang sudah menyimpan indeks akan terus menjawab dengan ejaan lama.
4. **Indeks pencarian menyalin teks** (`cari/cNNNNN`, teks normal). Mengubah halaman tanpa mengubah indeks membuat kata benar tidak ketemu dan kata salah masih ketemu.
5. **Impor ulang ("timpa") menghapus koreksi.** Tidak ada peringatan di layar impor.
6. **Soal yang sudah dibuat menyalin teks kitab** (sengaja, lihat SKEMA-KITAB.md). Soal lama yang diambil dari teks OCR yang salah tidak ikut benar, dan belum ada penanda. Belum dikerjakan (lihat "Saran lanjutan").

#### Yang berubah
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

#### Batas yang perlu diketahui
- Impor ulang ("timpa") menimpa seluruh teks: koreksi tidak terbawa (arsipnya tetap di `kitab/{id}/koreksi`, tetapi belum ada tombol untuk menerapkannya lagi ke impor baru). "Tambah jilid" tidak menyentuh halaman lama.
- Pengguna lain yang sedang membuka kitab itu melihat teks lama sampai halaman dimuat ulang (simpanan memori klien). Soal yang sudah menyalin teks lama tidak berubah.
- Panel hasil pencarian yang sudah tampil tidak dihitung ulang setelah koreksi; cari lagi untuk menyegarkan.
- Satu koreksi menulis 4 dokumen (halaman, arsip, potongan indeks, metadata).
- Arsip koreksi bertambah selama dipakai (maks sekitar 50 KB per perubahan); belum ada pembersihan.

#### Saran lanjutan (belum dikerjakan)
1. Tandai soal yang tertaut (`kitabId` + `halId`) bila halaman sumbernya dikoreksi sesudah soal dibuat.
2. Tombol "terapkan ulang koreksi" setelah impor ulang (arsip sudah memuat teks lama dan baru).
3. Daftar halaman OCR yang belum dicocokkan per kitab, untuk memantau kemajuan audit.

#### Pengujian
- `test/koreksi.test.js` (14 tes): peran, bentuk matn/non-matn, bentrok, tanpa perubahan, verifikasi, validasi, pengalihan ruang, indeks dan simpanan pencarian, riwayat, penghitung impor, pemuat klien, logika murni.
- `test/_fakeDb.js` kini mendukung operator `<=`, `>=`, `<`, `>` pada `where`.
- Di lingkungan audit seluruh tes lulus kecuali 8 berkas yang memerlukan paket yang gagal terpasang di sana (`docx`, `jszip`, `vite`, `write-excel-file`): `bentukUi`, `dasborUi`, `dokumenKitab`, `excelConfig`, `kitabImporUi`, `naskah`, `paket`, `pemilihKitabUi`. Jalankan `npm test` dan `npm run build` di komputer Anda.
- Antarmuka diuji di Chromium sungguhan (bundel esbuild, tanpa Tailwind, ikon digantikan penampung) terhadap handler `/api/kitab` asli dengan Firestore tiruan: 14 skenario (penyusun tanpa tombol; koreksi matn+syarah; pratinjau beda; simpan; pencarian memakai teks baru; riwayat; konfirmasi navigasi; satu kotak untuk halaman tanpa pemisah; bentrok 409 dan muat ulang; peringatan OCR hilang setelah dicocokkan). Tampilan bergaya (warna, tata letak di HP) dan Firestore sungguhan belum dicoba.

---

## 15. [Perubahan] Perubahan 3 Nov 2026: haluan Aswaja satu sumber dan otoritas kitab (langkah 1 menuju agent AI)

*Tanggal: 3 Nov 2026.* *Berkas asal: `docs/PERUBAHAN-03-NOV-2026-OTORITAS-ASWAJA.md` (digabung ke sini).*

Tujuan: sebelum ada agent yang mempelajari kitab, AI di aplikasi harus (1) memakai satu rumusan haluan Aswaja di semua prompt, dan (2) tahu seberapa jauh sebuah kitab boleh dijadikan dasar soal. Status itu ditetapkan admin/ustadz, bukan ditebak model.

#### Temuan audit (sebelum perubahan)
1. Haluan Aswaja hanya lengkap di saran bab dan Paket Dauri (`KERANGKA_ASWAJA`). Prompt generate soal punya aturan 9 sendiri, dan `assistService.js` punya `KONTEKS` sendiri: tiga rumusan berbeda untuk hal yang sama.
2. Metadata kitab sudah memuat `pengarang`, `wafatH`, `fan`, `mazhab`, tetapi tidak ada penanda status kitab bagi madrasah (pegangan, pembanding, di luar rumpun), dan metadata itu tidak pernah sampai ke prompt.
3. Impor ulang ("timpa") menulis ulang dokumen `kitab/{id}`; bidang baru apa pun akan hilang bila tidak dijaga.

#### Yang berubah
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

#### Keputusan desain
- Status bukan penghakiman terhadap pengarang atau kelompok. Untuk `luar_rumpun` AI hanya diminta menguji isi teks sebagai pendapat kitab itu, sesuai aturan 5 di `aswaja.js`.
- Kitab tanpa tautan perpustakaan (teks ditempel manual) tidak mendapat arahan otoritas; ini sengaja agar prompt lama tidak berubah.
- Pembacaan otoritas memakai satu pembacaan dokumen sebelum validasi. Permintaan yang gagal validasi tetap menghabiskan satu pembacaan Firestore.

#### Batas yang perlu diketahui
- Saran bab: server siap, tetapi klien belum mengirim `kitabId` karena layar itu memilih kitab dari Konfigurasi, bukan perpustakaan.
- Telaah dan uji buta dari daftar soal memakai `q.kitabId` bila soal tertaut; soal lama tanpa tautan tidak mendapat arahan.
- `luar_rumpun` dan `pembanding` belum memblokir persetujuan soal (`review.js`); hanya memberi peringatan.
- Prompt generate berubah (aturan 9 lebih lengkap): jalankan `npm run eval` dan bandingkan dengan hasil lama.

#### Pengujian
- `test/otoritas.test.js` (11 tes): fungsi murni; prompt generate/paket/bab; endpoint generate dan assist (otoritas dibaca server, kitab lama, `kitabId` cacat, pemalsuan `_kitab`); `impor-otoritas` (peran, validasi, arsip, tanpa uid bocor, bertahan setelah impor ulang). Menghapus penjagaan di impor ulang membuat tes 11 gagal (diuji).
- Seluruh suite: 591 tes, 580 lulus, 8 gagal. Kedelapan berkas itu sama dengan sebelum perubahan dan gagal karena paket (`docx`, `react`, `write-excel-file`) tidak terpasang di lingkungan audit. Jalankan `npm install && npm test && npm run build` di komputer Anda.
- `web/App.jsx` dan `web/KitabImpor.jsx` hanya diperiksa sintaksnya (TypeScript parser); belum dibangun dengan Vite, belum dilihat di browser, dan belum dicoba dengan Firestore sungguhan.

---

## 16. [Perubahan] Perubahan 3 Nov 2026: agen telaah kitab, tahap 1 (tanya-jawab bersumber) dan tahap 3 (soal vs halaman rujukan)

*Tanggal: 3 Nov 2026.* *Berkas asal: `docs/PERUBAHAN-03-NOV-2026-TAHAP-1-3-AGEN-TELAAH.md` (digabung ke sini).*

#### Audit perubahan sebelumnya (koreksi kitab dan otoritas Aswaja)
Diperiksa pada salinan baru repo (commit 2819c50). Seluruh suite lulus (673 lulus, 1 dilewati) dan `vite build` lolos, jadi kekhawatiran dokumen lama tentang 8 berkas yang tidak teruji (paket gagal terpasang di lingkungan audit saat itu) tidak berlaku di lingkungan dengan paket lengkap.

Diuji ulang oleh audit ini: `test/koreksiTambah.test.js` (koreksi pada jilid tambahan, indeks pencarian ikut berubah dan jilid lain tak tersentuh; koreksi sebelum dan sesudah impor ulang bertahap). Tidak ditemukan cacat pada interaksi koreksi, tambah jilid, dan impor ulang. Aturan Firestore: subkoleksi baru (`koreksi`, `otoritasRiwayat`, `impor`, `halaman_rN`, `cari_rN`) tidak punya aturan, jadi tertutup bagi klien; tidak perlu perubahan.

Temuan yang belum diperbaiki:
1. Dokumen otoritas menyebut uji buta memakai `q.kitabId`, tetapi `cekbuta` tidak ada di `PAKAI_KITAB` (`api/assist.js`) sehingga uji buta tidak membaca otoritas. Perbaiki dokumennya, atau tambahkan `cekbuta` bila memang diinginkan (prompt uji buta belum memuat baris otoritas).
2. Kunci simpanan pencarian memuat penghitung `koreksi`. Tiap koreksi membuat semua mesin server membuang indeks tersimpan; pencarian berikutnya membaca ulang puluhan dokumen per kitab. Wajar untuk koreksi jarang, terasa pada kuota baca Spark bila editor mengoreksi banyak halaman beruntun sambil orang lain mencari atau bertanya.
3. `perpus-riwayat` membaca seluruh arsip koreksi satu halaman lalu memotong 10. Biaya tumbuh seiring riwayat; beri `orderBy` dan `limit` bila satu halaman bisa punya puluhan koreksi.
4. `peringatanOtoritas` memberi peringatan untuk semua kitab `belum_dinilai` (termasuk seluruh kitab lama), jadi toast muncul di tiap generate dan telaah sampai admin menetapkan status. Sengaja, tetapi bising: tetapkan status kitab yang dipakai dulu.
5. Prompt generate berubah (aturan 9). `npm run eval` perlu kunci AI dan belum dijalankan.
6. `luar_rumpun` dan `pembanding` belum memblokir persetujuan soal (sudah dicatat di dokumen otoritas).

#### Tahap 1: tanya-jawab bersumber (`aksi: tanyakitab`)
Berkas: `src/telaahKitab.js`, `web/lib/telaahKitab.js`, `web/TanyaKitab.jsx` (di bawah pembaca pada tab Baca Kitab), `src/kitabCari.js` (`cariTerbaik`), `web/lib/cariKitab.js` (`peringkatHalaman`).

Alur "cari dulu, baru baca", dua panggilan AI yang dikendalikan kode (bukan agen yang memanggil alat berulang): (1) AI mengubah pertanyaan Indonesia menjadi kata kunci Arab (dilewati bila pertanyaan sudah Arab); (2) kode meranking halaman di indeks perpustakaan (bobot kelangkaan kata, bonus kueri lengkap dan frasa), membaca hingga 6 halaman terbaik dari paling banyak 4 kitab; (3) AI menjawab hanya dari halaman itu, tiap butir wajib punya kutipan Arab; (4) kode mencocokkan tiap kutipan dengan halaman (`kutipan.js`, toleran harakat dan ejaan, selisih kecil ditandai "mirip"). Kutipan yang keliru menyebut halaman tetapi ada di halaman lain yang dibaca dikoreksi rujukannya.
- **Gagal-tertutup:** tanpa satu pun butir yang cocok, jawaban tidak ditampilkan (`tidak_terverifikasi`). Status: `terverifikasi`, `sebagian`, `tidak_terverifikasi`, `tidak_ditemukan`.
- **Otoritas kitab** dibaca dari perpustakaan (bukan dari klien): baris otoritas masuk ke prompt, tiap butir membawa `otoritas` dan `dasarMadrasah`; `dasarMadrasah` hasil keseluruhan hanya `true` bila semua butir yang terbukti berasal dari kitab muktamad atau rujukan. Peringatan otoritas (pembanding, di luar rumpun, belum dinilai) dihitung kode, bukan AI.
- **Penanda OCR:** halaman `ocr` yang belum `diverifikasi` memberi peringatan: kutipan terbukti ada di teks perpustakaan, belum tentu sama dengan kitab cetak (verifikasi hanya selaras dengan teks tersimpan).
- Batas biaya: pertanyaan 3 sampai 500 karakter, maksimal 4 kitab, 6 halaman, 3.500 karakter per halaman ke AI. Dihitung satu pemakaian kuota AI per pertanyaan walau memakai dua panggilan.
- Sengaja tidak memakai putaran alat: adaptor Gemini (penyedia bawaan) hanya mendukung satu giliran per panggilan, dan putaran terbuka sulit dibatasi biayanya.

#### Tahap 3: periksa soal terhadap halaman rujukan (`aksi: periksarujukan`, gratis)
Berkas: `src/periksaRujukan.js`, `web/lib/periksaRujukan.js`, `web/PeriksaRujukan.jsx` (tombol di bawah "Tertaut ke perpustakaan" pada formulir soal). Tanpa AI dan tanpa kuota AI (batas laju 20/menit, 500/hari).
- Kutipan Arab pada pembahasan, stimulus, dan jawaban/rubrik harus ada di halaman rujukan. Opsi dan pertanyaan tidak diperlakukan sebagai kutipan (pengecoh memang tidak wajib ada di sumber).
- Dukungan kunci (heuristik kata, bukan makna): kata khas jawaban benar dibandingkan dengan kata khas pengecoh terhadap halaman. Hasil: `didukung`, `curiga_kunci` (pengecoh lebih cocok dengan sumber), `ambigu`, `tidak_didukung`, `lemah`, atau `tidak_dapat_dinilai` (benar/salah, opsi berbahasa lain dari sumber).
- Status akhir: `selaras`, `perlu_dicek`, `tidak_selaras`, `tidak_dapat_dinilai`. Halaman rujukan OCR yang belum dicocokkan menurunkan `selaras` menjadi `perlu_dicek`. Laporan memuat status otoritas kitab.
- Rentang rujukan melebihi jumlah halaman dipotong ke halaman terakhir; di atas 20 halaman ditolak.

#### Batas yang perlu diketahui
- Pencarian leksikal (kata/frasa), bukan semantik. Pertanyaan yang istilahnya berbeda dari kitab bisa luput; AI perencana membantu dengan sinonim, tetapi tidak dijamin.
- Kutipan terbukti selaras dengan teks perpustakaan, bukan dengan kitab cetak; ini sebabnya penanda OCR/koreksi ditampilkan.
- Pemeriksaan kunci tidak menilai makna, negasi, atau parafrasa jauh; "selaras" bukan pengganti penelaahan ustadz.
- Indeks yang belum dibangun memicu pembacaan puluhan dokumen per kitab pada pertanyaan pertama.
- Belum dicoba dengan Gemini atau Firestore sungguhan, dan UI belum dilihat di browser. Tes UI hanya render SSR dan pemetaan label.

#### Pengujian
`test/telaahKitab.test.js` (18 tes): peringkat, rencana, verifikasi kutipan, orkestrasi dengan klien AI tiruan (terverifikasi, gagal-tertutup, sebagian, Arab satu panggilan, tidak ditemukan, injeksi tag), otoritas dan OCR, periksa rujukan, `/api/assist`. `test/telaahUi.test.js` (3 tes). `test/koreksiTambah.test.js` (2 tes). Seluruh suite: 696 lulus, 1 dilewati; `vite build` lolos.

---

## 17. [Perubahan] Perubahan 4 November 2026: audit mesin Pegon dan penguatan AI

*Tanggal: 4 Nov 2026.* *Berkas asal: `docs/PERUBAHAN-04-NOV-2026-PEGON-AI.md` (digabung ke sini).*

#### Temuan pada mesin (`web/lib/pegon.js`)
| # | Tingkat | Temuan | Status |
|---|---|---|---|
| M1 | Tinggi | `sedangkan` ditulis `سداڠكن` (dibaca akar + suffix -kan). Master prompt menyebutnya akar yang vokalnya ditulis penuh. | Diperbaiki → `سداڠكان` |
| M2 | Sedang | `tekan`, `pekan`, `rekan` terbaca akar + -kan (`تكن`, `ڤكن`, `ركن`). | Diperbaiki (daftar pengecualian suffix) |
| M3 | Rendah | `pesantren`, `perlu`, `pesan` selalu bersorot ⚠ untuk bunyi e padahal pasti pepet. | Diperbaiki (daftar e-pepet bawaan) |
| M4 | Info | Istilah umum (syariat, fatwa, maslahat, mudharat) tidak ada di kamus bawaan, tetapi ada di `docs/kamus-serapan-arab-kitab-pesantren.json` yang harus diimpor admin. Tanpa impor, `syariat` menjadi `سياريات`. | Tidak diubah (tes menjaga agar berkas itu tidak menduplikasi kamus bawaan). Sarankan impor sekali. |

#### Temuan pada jalur AI (`src/pegonService.js`) dan perbaikannya
| # | Temuan lama | Perbaikan |
|---|---|---|
| A1 | AI hanya menerima teks hasil mesin; sorotan ⚠ dan catatan mesin tidak ikut. | Klien mengirim `rincian` (kata bersorot + catatan) dan `kamus` (kamus bersama + lokal yang berlaku pada teks). Prompt memuat `<kata_ragu>` dan `<kamus_pengguna>` (wajib dipakai). |
| A2 | Prompt tanpa contoh dan tanpa langkah kerja. | Peran "pemeriksa, bukan penulis ulang", 6 langkah kerja, larangan eksplisit, dan 16 pasangan contoh terverifikasi (`CONTOH`; tes memastikan persis sama dengan mesin). |
| A3 | Tidak ada pemeriksaan keluaran: kata bisa hilang, Latin bocor, kutipan Arab/angka berubah. | `src/pegonCek.js` → `periksaKeluaran`: jumlah kata, Latin bocor, aksara Arab asli, angka, ng terpecah, ny ڽ. Pelanggaran berat memicu satu percobaan ulang berisi daftar masalah. |
| A4 | AI bebas mengubah kata tanpa alasan. | Skema alat baru: `perubahan[]` (dari, ke, alasan, jenis) dan `keyakinan`. `jagaPerubahan` membatalkan perubahan yang tidak dilaporkan (kembali ke mesin, ⚠ tetap). |
| A5 | Teks 6.000 karakter dalam satu panggilan: risiko terpotong (`max_tokens`). | `bagiBagian`: dipecah per baris menjadi paling banyak 4 bagian, diproses paralel. Bagian yang gagal dua kali tetap hasil mesin; bila semua gagal, error dilempar sehingga kuota dikembalikan. |
| A6 | Percobaan ulang bisa melewati batas 60 dtk fungsi Vercel. | Tidak ada percobaan ulang setelah 35 dtk. |

Klien (`web/App.jsx`, `PegonTab`): panel baru menampilkan kata yang diubah AI beserta alasannya, keyakinan, jumlah perubahan yang dibatalkan, dan bagian yang gagal pemeriksaan.

#### Pengujian
- `test/pegonAi.test.js` (14 tes baru): perbaikan mesin, konsistensi contoh prompt, pemeriksa keluaran, penjaga perubahan, pembagian bagian, sanitasi masukan, alur AI dengan klien palsu (diterima/dibatalkan/diulang/ditolak/waktu habis).
- Seluruh suite: 637 lulus. 9 berkas gagal hanya karena paket dev tidak terpasang di lingkungan audit (`docx`, `jszip`, `write-excel-file`); jalankan `npm ci` lalu `npm test`.
- `web/App.jsx` dikompilasi dengan esbuild tanpa galat.

#### Belum diuji
Panggilan nyata ke model (butuh kunci AI), tampilan panel di browser, dan `npm run eval`. Disarankan menambah kasus Pegon ke `eval/golden.json` (Latin → Pegon yang sudah diverifikasi ustadz) agar mutu AI bisa diukur, bukan hanya dijaga.

#### Batas yang disengaja
- Ejaan klasik: AI selalu bekerja di al-Qolam, lalu `ubahEjaan` memetakan huruf. Hamzah awal gaya klasik tidak dihasilkan jalur AI.

#### Tambahan: jalur baca-foto (`pegonfoto`)
Pemeriksa yang sama kini dipakai. Mesin dijalankan pada teks Latin hasil baca AI sebagai pembanding; pelanggaran berat memicu satu percobaan ulang, lalu bila tetap cacat Pegon diganti hasil mesin (teks Latin tetap dari AI) dengan peringatan. Respons menambah `ditolak`, `diulang`, `selisihMesin`. Perubahan liar tidak dibatalkan di jalur ini karena AI tidak melihat hasil mesin. 2 tes baru.

---

## 18. [Perubahan] Perubahan 04 Nov 2026: pilihan kitab di Tanya Kitab

*Tanggal: 4 Nov 2026.* *Berkas asal: `docs/PERUBAHAN-04-NOV-2026-PILIH-KITAB-TANYA.md` (digabung ke sini).*

#### Masalah
Menu "Kitab yang dicari" hanya punya satu kitab tunggal atau "Semua kitab aktif (maksimal 4)". Opsi kedua diam-diam hanya mencari
4 kitab pertama menurut abjad (`src/telaahKitab.js`), dan tidak ada cara memilih sendiri 2-4 kitab. Kitab di urutan ke-5 dan seterusnya
tidak pernah bisa dicari bersama kitab lain.

#### Perbaikan
- `web/TanyaKitab.jsx`: `<select>` diganti pilihan "Semua kitab aktif" (bawaan) ditambah daftar centang kitab. Pengguna bisa memilih 1-4 kitab
  sendiri. Setelah 4 terpilih, centang lain dinonaktifkan sampai satu dilepas. Bila kitab aktif lebih dari 4 dan tidak ada yang dipilih,
  muncul peringatan bahwa hanya 4 kitab pertama menurut abjad yang dicari.
- Klien mengirim `kitabIds` berisi semua kitab terpilih (sebelumnya paling banyak satu). Server (`validasiTanya`, `tanyaKitab`) tidak diubah:
  sudah menerima sampai 4 ID.
- `web/lib/telaahKitab.js`: helper murni `alihkanPilihanKitab` (centang/lepas, batas 4) dan `saringPilihanKitab` (buang ID kitab yang sudah
  dinonaktifkan admin supaya tidak ditolak server dengan `KITAB_TIDAK_ADA`).
- Daftar kitab kini memakai simpanan memori `SIMPANAN` yang sama dengan Pemilih Kitab, sehingga membuka tab Baca Kitab berulang kali tidak
  membaca ulang seluruh koleksi `kitab` di Firestore.

#### Tes
- `test/telaahKitab.test.js`: dua tes baru untuk kedua helper, termasuk bahwa hasilnya selalu lolos `validasiTanya`.
- `test/telaahUi.test.js`: pernyataan render untuk kontrol baru (perlu `npm install` agar bisa dijalankan).

---

## 19. [Perubahan] Alur editor bertahap (1 sampai 3 editor) dan filter penyusun

*Tanggal: 5 Nov 2026.* *Berkas asal: `docs/PERUBAHAN-05-NOV-2026-ALUR-EDITOR.md` (digabung ke sini).*

#### Alur
Penyusun → editor 1 → (revisi ke penyusun) → editor 2 → (revisi) → editor 3 → (revisi) → editor 3 menyetujui → Approved.

- Setelah penyusun merevisi, soal langsung ke editor berikutnya.
- **Tahap terakhir:** setelah revisi tahap terakhir, soal kembali ke editor terakhir untuk disetujui. Approved harus tindakan editor dan lewat gerbang kutipan/uji buta/sumber di server.
- Editor boleh **meloloskan tanpa revisi** ("Loloskan ke Editor N"), jadi revisi tidak wajib di setiap tahap.
- Satu editor tidak boleh meninjau dua tahap berbeda pada soal yang sama.
- Admin bisa meninjau tahap mana pun.

#### Pengaturan admin
- **Konfigurasi → Alur Editor Bertahap:** nonaktif (satu editor mana pun, seperti dulu) atau aktif dengan jumlah tahap standar dan jumlah tahap per mata pelajaran (fan).
- **Pengguna → Tahap editor:** centang tahap 1/2/3 untuk tiap editor. Mapel yang hanya 1 tahap bisa ditinjau editor mana pun.
- Pengaturan disimpan di dokumen terpisah `config/alur` (tidak tersentuh simpan/reset konfigurasi utama).

#### Filter
Bank Soal: filter **Penyusun** (nama dan jumlah soal) dan **Tahap Editor** (soal Pending yang menunggu editor N; tampil bila alur aktif).

#### Yang berubah di kode
- `web/lib/alurSoal.js` (aturan murni), `src/alurSoal.js`, `src/alurEditor.js` (baca/simpan `config/alur`).
- `src/review.js`: `setujui` sadar tahap; `mintaRevisi` baru. `api/assist.js`: aksi `revisi`. `api/app-config.js`: aksi `alursimpan`, dan `baca` menyertakan `alur`.
- `firestore.rules`: admin boleh set `tahapEditor` pada profil; klien tidak lagi bisa menulis status `revision` (lewat server); `tahap` dan `tinjauan` hanya ditulis server.
- Tes: `test/alurSoal.test.js`, tambahan di `test/review.test.js`; beberapa tes teks-aturan diselaraskan dengan refactor `validContent(x)`.

#### Urutan penerapan (penting)
1. Unggah kode (semua berkas kecuali `firestore.rules`) dan tunggu deploy selesai.
2. Baru terbitkan `firestore.rules`. Bila rules terbit lebih dulu, tombol "Minta Revisi" di aplikasi lama akan ditolak.
3. Masuk sebagai admin: tugaskan tahap ke tiap editor, lalu aktifkan alur.

#### Batasan yang diketahui
- Penegakan tahap ada di server. Tanpa menerbitkan rules terbaru, editor yang paham teknis masih bisa menulis status `revision` langsung ke Firestore.
- Admin yang mengubah soal Approved kembali ke Pending dari klien tidak mereset `tahap`; soal bisa masuk di tahap lama.
- Pemulihan dari cadangan tidak membawa `tahap` dan `tinjauan`; soal Pending hasil pulih mulai lagi dari tahap 1.
- Bila pengaturan alur gagal dibaca server, persetujuan/revisi ditolak sementara (503) dan tidak melonggarkan pemeriksaan.

---

## 20. [Audit] Audit 6 Nov 2026: keamanan, kualitas, dan ukuran bundel

*Tanggal: 6 Nov 2026.* *Dicatat langsung di berkas ini.*

Dasar: clone `main` (commit 6889274 sebelum rangkaian perubahan 6 Nov). Dijalankan: `npm ci`, `npm test`, `eslint`, `vite build`, `npm audit`, pemindaian rahasia, dan pembacaan `firestore.rules` serta pola autentikasi di `api/`. Tidak dijalankan: login, Firebase, dan AI sungguhan, serta pengujian di HP.

#### Yang lolos
- Tes: 758 lulus, 0 gagal, 1 dilewati (tes opsional berkas Dasuqi). Lint: 0 error, 72 peringatan. Build lolos.
- Tidak ada kunci asli yang bocor (yang cocok hanya kunci palsu di tes).
- Setiap endpoint `api/*` memverifikasi token dan peran di server; email wajib terverifikasi.
- Aturan Firestore: `config`, `kitab` (tulis), dan `cekbutaHasil` tertutup dari klien; persetujuan soal hanya lewat server.
- Pengambilan teks kitab memakai daftar host yang diizinkan, redirect manual, dan pemeriksaan ulang host tujuan.
- Semua prompt AI menandai teks kitab sebagai data, bukan perintah.

#### Temuan dan status

| # | Temuan | Status |
|---|---|---|
| 1 | Bundel utama 1.984 KB (gzip 622 KB), tanpa pemecahan kode: pustaka `docx` (±466 KB) dan semua panel ikut terunduh saat aplikasi dibuka. | Diperbaiki (lihat bagian 6 Nov berikutnya). |
| 2 | `web/App.jsx` monolit: 5.386 baris, 111 komponen, 184 `useState`. | Sebagian: kini 4.014 baris; tab Konfigurasi/Pengaturan AI dan Export dipisah. Sisanya (mis. `PaketDauri`, `Compose`) belum. |
| 3 | 72 peringatan lint, mayoritas `react-hooks/exhaustive-deps`. | Belum. Perlu ditriase satu per satu: sebagian disengaja, sebagian mungkin bug state basi. |
| 4 | `npm audit`: 6 kerentanan moderat, semuanya transitif lewat `firebase-admin` (minimatch, glob, rimraf, google-gax). | Tidak bisa diperbaiki dari sisi proyek: terkunci oleh `@google-cloud/firestore-api@0.2.0` (menarik `google-gax@5.0.8`). `npm audit fix` tidak mengubah apa pun; jangan pakai `--force` (menurunkan `firebase` ke 9.14.0). Risiko praktis rendah: kode berjalan di server. |
| 5 | CSP tanpa `unsafe-eval` dan pdf.js: build memberi peringatan eval. | Kode sudah memakai `isEvalSupported: false`. Belum terbukti: PDF sungguhan terbuka di produksi dengan CSP ini. Uji manual sekali. |
| 6 | `package.json` masih bernama `bank-soal-madrasah`; nama itu juga dipakai sebagai salt HKDF di `src/secrets.js`. | Tidak diubah. **Jangan ganti salt itu**: kunci API terenkripsi di Firestore tidak akan bisa dibuka lagi. Mengganti `name` di package.json saja aman. |
| 7 | Batas 12 fungsi Vercel Hobby: `api/` berisi 11 berkas. | Dicatat: tersisa 1 slot; fitur API baru digabung ke berkas yang ada. |
| 8 | 24 berkas dokumen audit/perubahan tersebar di `docs/`. | Diperbaiki: digabung menjadi `docs/RIWAYAT-AUDIT-DAN-PERUBAHAN.md`. |

#### Keputusan: Firebase modular ditunda
Pengukuran atribusi sourcemap pada bundel utama (total ±1.218 KB): Firebase ±497 KB (41%), `web/lib/pegon.js` 251 KB (21%), `App.jsx` 223 KB, `react-dom` 128 KB. Lapisan compat Firebase sendiri hanya ±25 KB. Build uji terpisah dengan fitur yang sama: compat 568 KB (gzip 150 KB) lawan modular 486 KB (gzip 128 KB), selisih sekitar 22 KB gzip (±5%). Migrasi menyentuh login dan ±25 titik baca-tulis Firestore (`exists` properti lawan `exists()` metode, `onSnapshot`, persistensi multi-tab) yang tidak tercakup tes unit, untuk penghematan sekecil itu. Maka diputuskan **tidak dikerjakan sekarang**; pemuatan malas `pegon.js` dipilih karena penghematannya 3 sampai 4 kali lebih besar dengan risiko yang bisa ditangkap tes.

---

## 21. [Perubahan] Perubahan 6 Nov 2026: pemuatan malas (lazy-load) untuk memangkas unduhan awal

*Tanggal: 6 Nov 2026.* *Berkas asal: `docs/PERUBAHAN-06-NOV-2026-LAZY-LOAD.md` (digabung ke sini).*

#### Hasil terukur (vite build)
| | Sebelum | Sesudah |
|---|---|---|
| Bundel utama | 1.984 KB (gzip 622 KB) | 1.332 KB (gzip 423 KB) |
| Dimuat saat dibuka | semua | tanpa docx, naskahDocx, dan 7 panel di bawah |

Potongan yang kini dimuat saat dipakai: `docx` (466 KB, saat unduh Word), `naskahDocx`, `KitabImpor` (91 KB), `PembacaKitab` (36 KB), `ImporExcel` (22 KB), `AnalisisButir`, `PemilihKitab`, `TanyaKitab`, `PeriksaRujukan`.

#### Berkas yang berubah
- `web/lib/muatDocx.js` (baru): memuat `docx` sekali, dipakai bersama.
- `web/globals.js`: tidak lagi mengimpor `docx` dan tidak lagi memasang `window.docx`.
- `web/App.jsx`: empat tempat `window.docx` diganti `await muatDocx()`; tujuh panel memakai `lazyPanel()` yang dibungkus pelindung gagal-muat (offline dan belum pernah dibuka hanya menampilkan pesan "Coba lagi" di panel itu, tidak merobohkan aplikasi).
- Tes: tiga tes DOCX diberi `muatDocx` tiruan; tes render SSR Penyusunan Soal memakai stream yang menunggu potongan lazy.

#### Tidak berubah / belum
- `npm audit fix` tidak mengubah apa pun: 6 temuan moderat di `firebase-admin` terkunci oleh `@google-cloud/firestore-api@0.2.0` (menarik `google-gax@5.0.8`). Perlu rilis hulu. `--force` JANGAN dipakai (menurunkan `firebase` ke 9.14.0).
- Bundel utama masih 1,3 MB: sisanya Firebase compat dan `App.jsx`. Langkah berikutnya: pecah komponen tab dari `App.jsx`.

---

## 22. [Perubahan] Perubahan 6 Nov 2026 (2): tab Konfigurasi dan Pengaturan AI dipisah dari App.jsx

*Tanggal: 6 Nov 2026.* *Berkas asal: `docs/PERUBAHAN-06-NOV-2026-PISAH-TAB-ADMIN.md` (digabung ke sini).*

#### Hasil terukur (vite build)
| | Sebelum | Sesudah |
|---|---|---|
| Bundel utama | 1.332 KB (gzip 423 KB) | 1.282 KB (gzip 409 KB) |
| `AdminKonfigurasi` (baru, dimuat saat admin membuka tab) | - | 50 KB (gzip 14 KB) |
| `App.jsx` | 5.4 rb baris | ±4.7 rb baris (757 baris pindah) |

#### Isi
- `web/AdminKonfigurasi.jsx` (baru): `AiConfig`, `RiwayatCfg`, `AppCfgAdmin`, `AlurEditorAdmin`, `PemeliharaanAdmin`, beserta `TingkatChecks`, `AktifCek`, `AI_PROV`, dan pembantu kecilnya. Hanya empat komponen diekspor.
- `web/App.jsx`: empat komponen itu kini `lazyPanel(...)`. `TahapEditorPilih` tetap di App.jsx karena `UserAdmin` juga memakainya. App.jsx mengekspor pembantu bersama (`Btn`, `Label`, `Section`, `ErrorBox`, `callApi`, `apiErr`, `simpanBerkas`, `useDraftSync`, `Uj`, `Draft`).
- Impor melingkar `AdminKonfigurasi` <-> `App` disengaja dan aman: berkas admin hanya dimuat malas setelah App selesai dievaluasi. Tes `adminKonfigurasiUi` memuat modul admin lebih dulu untuk memastikannya.
- Tes: `adminKonfigurasiUi.test.js` (baru, 3 tes); `alurSoal` dan `review` kini membaca App.jsx + AdminKonfigurasi.jsx.

#### Catatan
Penghematan unduhan awal hanya ±50 KB (14 KB gzip): tab admin memang kecil. Pemisahan ini terutama mempermudah pemeliharaan; bundel terbesar masih Firebase compat dan sisa App.jsx.

---

## 23. [Perubahan] Perubahan 6 Nov 2026 (3): pembantu bersama dipindah ke web/ui.jsx

*Tanggal: 6 Nov 2026.* *Berkas asal: `docs/PERUBAHAN-06-NOV-2026-UI-BERSAMA.md` (digabung ke sini).*

Memutus impor melingkar `AdminKonfigurasi.jsx` <-> `App.jsx` (lihat bagian 22 di berkas ini).

#### Isi
- `web/ui.jsx` (baru, tidak mengimpor App.jsx): `Uj`, `Draft`, `useDraftSync`, `Label`, `Btn`, `Select`, `Section`, `layarHp`, `callApi`, `apiErr`, `ERR_TITLES`, `ErrorBox`, `Spin`, `simpanBerkas`. Dipindah apa adanya (tanpa perubahan perilaku).
- `web/App.jsx` dan `web/AdminKonfigurasi.jsx` mengimpor dari `ui.jsx`. App.jsx tidak lagi mengekspor pembantu itu.
- Tes `adminKonfigurasiUi` kini juga menegaskan bahwa `ui.jsx` dan `AdminKonfigurasi.jsx` tidak mengimpor `App.jsx`.

#### Pola untuk tab berikutnya
Tab baru yang dipisah cukup mengimpor dari `./ui.jsx` (dan `./lib/*`), lalu didaftarkan di App.jsx dengan `lazyPanel(() => import('./NamaTab.jsx'))`. Komponen kecil yang dipakai banyak tempat (Badge, Chip, Empty, SourceLink, Toast) belum dipindah; pindahkan ke `ui.jsx` bila tab yang dipisah memerlukannya.

---

## 24. [Perubahan] Perubahan 6 Nov 2026 (4): tab Export dipisah dari App.jsx

*Tanggal: 6 Nov 2026.* *Berkas asal: `docs/PERUBAHAN-06-NOV-2026-PISAH-TAB-EXPORT.md` (digabung ke sini).*

#### Hasil terukur (vite build)
| | Sebelum | Sesudah |
|---|---|---|
| Bundel utama | 1.282 KB (gzip 410 KB) | 1.252 KB (gzip 401 KB) |
| `ExportTab` (dimuat saat tab dibuka, sudah termasuk pembuat berkas) | - | 30 KB (gzip 11 KB) |
| `App.jsx` | 4.572 baris | 4.009 baris |

#### Berkas baru
- `web/ExportTab.jsx`: komponen `Export` (default export), dimuat malas lewat `lazyPanel`.
- `web/lib/exportBuilders.js` (murni, tanpa React): `buildGift`, `buildMoodleXml`, `buildCsvForms`, `buildCsvRdm`, `buildDocx`, `FORMATS`, plus `giftEsc`, `xmlEsc`, `giftJawaban`. Hanya `ExportTab` yang memakainya, jadi ikut terpotong dari bundel utama.
- `web/lib/dasar.js` (murni): `TINGKAT`, `MAPEL`, `FALLBACK_CFG`, `LEVEL`, `KEYS`, `STATUS`, `Bt`, `BT_NOOP`, `Draft`, `DRAFT_NOOP`, `bacaPref`, `ejaanTersimpan`, `cariKitab`, `namaArabKitab`, `mapelUntuk`, `levelLabel`, `optsOf`, `fullQ`, `csvEsc`, `umpanUraian`.
- `web/ui.jsx` bertambah: `AppCfgCtx`, `useCfg`, `CatatanCtx`, `AlurCtx`, `useAlur`, `Filters`, `applyFilter`, `labelPaket`.

#### Aturan impor (jangan dilanggar)
`dasar.js` tidak mengimpor siapa pun dari proyek selain `lib/kitabNama.js`; `ui.jsx` mengimpor `dasar.js`; `exportBuilders.js` mengimpor `dasar.js`; `ExportTab.jsx`, `AdminKonfigurasi.jsx`, dan `App.jsx` mengimpor yang di atas. Tidak ada yang mengimpor `App.jsx`. Dijaga oleh tes `exportTabUi` dan `adminKonfigurasiUi`.

#### Tes
- Baru: `test/exportTabUi.test.js` (render tab Export, ekspor modul, tanpa impor melingkar) dan `test/_sumberWeb.js` (gabungan sumber untuk tes yang memeriksa teks kode).
- `bentukUi` dan `ustadzLokal` kini mengimpor `exportBuilders.js` langsung (sebelumnya memotong teks App.jsx dengan `new Function`).
- `alurSoal`, `naskah`, `serahTerima` membaca sumber gabungan.

---

## 25. [Perubahan] Perubahan 6 Nov 2026 (5): mesin Pegon dimuat malas

*Tanggal: 6 Nov 2026.* *Berkas asal: `docs/PERUBAHAN-06-NOV-2026-PEGON-LAZY.md` (digabung ke sini).*

#### Hasil terukur (vite build)
| | Sebelum | Sesudah |
|---|---|---|
| Bundel utama | 1.252 KB (gzip 401 KB) | 994 KB (gzip 305 KB) |
| `pegon` (potongan terpisah, diunduh di latar belakang) | ikut bundel utama | 259 KB (gzip 95 KB) |

Total sejak awal audit: 1.984 KB (gzip 622) menjadi 994 KB (gzip 305), sekitar 50% lebih kecil.

#### Cara kerja
- `web/globals.js` tidak lagi mengimpor `lib/pegon.js` dan tidak memasang `window.Pegon`.
- `web/lib/muatPegon.js` (baru): `muatPegon()` memuat mesin sekali lalu memasangnya sebagai `window.Pegon` (kode lama yang membaca `window.Pegon` tidak berubah). `kamusBersamaMasuk(docs)` menahan snapshot kamus bersama dari Firestore bila mesin belum siap, lalu menerapkannya saat mesin dimuat.
- `web/main.jsx`: setelah tampilan pertama, `muatPegon()` dipanggil saat browser menganggur (batas 4 dtk). Biasanya Pegon sudah siap sebelum tab Pegon dibuka.
- `web/ui.jsx`: `denganPegon(Komponen)` menampilkan "Memuat mesin Pegon..." (atau tombol "Coba lagi" bila gagal) sampai mesin siap, lalu merender komponen aslinya.
- `web/App.jsx`: `PegonSoal`, `PegonTab`, dan `Export` dibungkus `denganPegon`. Kedua listener Firestore kamus memakai `kamusBersamaMasuk`.
- `web/lib/exportBuilders.js`: `buildDocx` menunggu `muatPegon()` sebelum memakai `window.Pegon`.

#### Mengapa Export ikut dibungkus
Export membaca `window.Pegon` saat render (`nkPegon = !!window.Pegon`). Bila mesin belum siap, Naskah bisa terekspor TANPA Pegon secara diam-diam. Pembungkus menutup kemungkinan itu.

#### Tes
`test/muatPegon.test.js` (baru): globals tidak mengimpor pegon.js; sebelum dimuat `window.Pegon` kosong dan pembungkus menampilkan "Memuat"; snapshot kamus yang datang lebih dulu diterapkan setelah dimuat; pemuatan bersama memakai satu janji.

## 26. [Audit dan perubahan] Audit dan perluasan kamus serapan Arab kitab pesantren (7 Nov 2026)

**Permintaan.** Audit `docs/kamus-serapan-arab-kitab-pesantren.json` lalu tambah entri. Semua istilah kitab memakai kata aslinya (ejaan Arab); kata berakhiran "nya" memakai يا, bukan نيا.

#### Hasil audit entri lama (647)
- Tidak ada kunci ganda, tidak ada yang bentrok dengan kamus bawaan, dan semua entri lolos impor dan tes.
- `mudhaaf` tertulis مضعف; istilah sharaf "fi'il mudha'af" ejaan aslinya **مضاعف**. **Diperbaiki.** (`mudhaf` = مضاف sudah ada di kamus bawaan.)
- `ila` tertulis إيلاء (sumpah suami tidak menggauli istri). Dalam teks kitab "ila" jauh lebih sering berarti **إلى** (ila akhirihi, ila yaumil qiyamah). **Diubah menjadi إلى**; istilah fikihnya dipindah ke kunci `iilaa` = إيلاء.
- Varian ejaan Latin untuk satu kata (mis. `thawaf`/`tawaf`, `shaum`/`saum`) sengaja dipertahankan.

#### Penambahan (640 entri, total 1287)
Thaharah dan shalat, zakat, puasa, haji, muamalah, munakahat, jinayat, waris, siyasah; ushul fikih dan mushthalah hadits; perawi dan penulis hadits; ulama dan kitab rujukan (Fathul Qarib, Fathul Muin, Minhajuth Thalibin, Safinatun Naja, dan lain-lain); nahwu-sharaf, balaghah, mantiq; akidah dan firqah; tasawuf; tajwid, qiraat, dan tahfizh; sejarah, nabi, sahabat, ummahatul mukminin; istilah kitab dan bahar syair; ungkapan penutup kitab (wallahu a'lam, radhiyallahu 'anhu, dan sejenisnya). Kunci yang artinya lain dalam bahasa Indonesia sehari-hari (mal, hajar, hawa, sama, hal, jam, madin, dan sejenisnya) sengaja tidak dimasukkan.

#### Bentuk -nya
67 kunci berakhiran -nya (hukumnya, dalilnya, rukunnya, sunnahnya, dan seterusnya) ditulis **akar Arab + يا disambung**. Akar berakhir ta marbuthah ditulis ت (sunnahnya = سنتيا). Untuk akar berakhir nun (rukunnya = ركنيا, matannya = متنيا) nun itu milik akar, bukan suffix, jadi tidak ada nun ganda.

**Perhatian.** Aturan ini hanya berlaku untuk kunci utuh di kamus. Mesin tetap menulis -nya di luar kamus sebagai پا, terpisah pada akar serapan Arab (aturan Al-Qolam '24, juga dipakai kalibrasi), mis. `sifatnya` = صفة پا. Hasilnya, "hukumnya" (يا, disambung) dan "sifatnya" (پا, terpisah) kini berbeda gaya. Bila yang dikehendaki satu gaya untuk semua, aturan mesin dan kalibrasinya perlu diubah; itu tidak dikerjakan di sini.

#### Tes
`test/kamusPesantren.test.js`, `test/kamusRules.test.js`, dan `test/pegon.test.js` lulus (jumlah cocok dengan `_meta`, tiap kata dipegonkan persis seperti isinya, kalibrasi tetap lulus). `test/muatPegon.test.js` gagal karena paket `react` tidak terpasang di lingkungan ini (gagal juga pada berkas asli).

**Belum dilakukan.** Peninjauan ejaan Arab oleh ustadz, sebagaimana catatan di `_meta`.

## 27. [Perubahan] Penyuntingan dan pembuatan daftar isi kitab dari dalam aplikasi (7 Nov 2026)

**Permintaan.** Admin dan editor bisa membuat daftar isi yang tidak ada, dan memperbaiki yang keliru, langsung dari aplikasi.

**Masalah.** Daftar isi hanya lahir saat impor (`daftar/isi`), dan hanya dari judul yang berhasil dikenali parser. Kitab hasil PDF/OCR sering tanpa daftar isi sama sekali; judul yang salah baca, level yang keliru, atau halaman yang meleset hanya bisa diperbaiki dengan mengimpor ulang seluruh kitab (yang juga menghapus koreksi teks).

**Yang dikerjakan** (mengikuti pola koreksi teks, bagian 14):
- **Layar** (`web/DaftarIsiEditor.jsx`, dibuka dari tab Daftar isi di pembaca; hanya tampil untuk editor dan admin): tambah judul (urutan halaman terisi dari halaman yang sedang dibuka), ubah judul, level (kitab/pengantar, bab, fasal, sub-judul), dan urutan halaman, hapus, urutkan, tombol "Halaman ini". Galat per baris (judul kosong, halaman di luar kitab) menghalangi simpan; peringatan (judul sangat panjang, judul ganda) tidak. Ringkasan perubahan yang belum disimpan tampil terus.
- **Buat otomatis dari teks kitab** (`perpus-isi-usul`): server membaca teks halaman dan menyarankan judul dari baris pendek berawalan kata kunci (باب، فصل، كتاب، مقدمة, "Bab 3") dan dari perubahan `bab` pada halaman. Hanya usulan: editor memilih "tambahkan yang belum ada" atau "ganti seluruh daftar", meninjau, lalu menyimpan. Batas laju sendiri (6 per menit, 100 per hari) karena satu usulan membaca seluruh halaman.
- **Simpan** (`perpus-isi-simpan`, `src/kitabIsi.js`): validasi ulang di server, `juz` dan `hal` cetak diisi dari halaman kitab (bukan dari klien), seluruh daftar diganti dalam satu transaksi, `suntingRev` naik. Bila orang lain lebih dulu menyimpan, 409 `ISI_BENTROK` tanpa menulis apa pun. Kitab yang diimpor ulang atau dinonaktifkan di tengah penyuntingan ditolak 409 `KITAB_BERUBAH`.
- **Riwayat dan jalan kembali** (`perpus-isi-riwayat`): tiap simpan mengarsipkan daftar sebelumnya di `kitab/{id}/isiRiwayat` (siapa, kapan, catatan, ringkasan). Di layar, "Pakai daftar sebelum perubahan ini" memuat daftar lama ke penyunting; menyimpannya menjadi versi baru, riwayat tidak dihapus.
- **Layar impor** memperingatkan admin bahwa menimpa kitab juga menghapus suntingan daftar isi (penghitung `isiDisunting`).
- Tanpa perubahan aturan Firestore: koleksi arsip baru tidak punya aturan, jadi klien ditolak; penulisan hanya lewat server.

**Keputusan.** Penyunting memilih URUTAN halaman (1 sampai jumlah halaman), bukan nomor cetak, karena nomor cetak tidak unik (kitab nyata punya nomor kembar dan mundur, lihat `docs/SKEMA-KITAB.md`). Nomor cetak ditampilkan di samping sebagai informasi. Usulan otomatis sengaja tidak langsung disimpan: kata kunci bisa salah menangkap kalimat.

**Batas yang diketahui.** Daftar lama yang lebih besar dari sekitar 600 KB tidak diarsipkan isinya (hanya jumlahnya); tidak mungkin untuk kitab biasa (daftar nyata sekitar 6 KB). Daftar sangat panjang (ribuan judul) akan terasa berat di layar karena semua baris dirender.

**Tes.** `test/daftarIsi.test.js` (17 tes): logika murni (rapikan, periksa, beda, usulan, gabung) dan server (peran, simpan dengan juz/hal dari halaman, tanpa perubahan tidak menulis, membuat dari nol, bentrok, isian tidak sah, kitab diimpor ulang, usulan tidak menulis, riwayat dan pemulihan, arsip terlalu besar, pemuat klien). Seluruh suite: 671 lulus; 13 berkas gagal karena paket `react`, `docx`, `write-excel-file`, dan `lucide-react` tidak terpasang di lingkungan ini (sama seperti sebelum perubahan).

**Belum diuji.** Layar di browser sungguhan (tidak ada `react` di lingkungan ini; JSX hanya diperiksa sintaksnya), Firestore sungguhan (tes memakai Firestore tiruan; `select(...)` pada usulan dan transaksi dengan ratusan pembacaan belum dicoba di server asli), dan perilaku pada kitab dengan ribuan judul.

## 28. [Perubahan] Mesin "Buat otomatis" daftar isi diperkuat dan dibantu AI (7 Nov 2026)

**Permintaan.** Perkuat mesin Buat otomatis dari teks kitab dan tambah performanya dengan bantuan AI.

**Kelemahan mesin awal (bagian 27).** Hanya kata kunci tanpa harakat dan tanpa "ال"; baris panjang berawalan kata kunci dilewati; header yang berulang di tiap halaman ikut jadi judul; judul tanpa kata kunci ("الطهارة") tidak pernah ditemukan; level hanya 1-3.

**Mesin aturan (`web/lib/daftarIsi.js`, gratis, satu lintasan).**
- Kata kunci dicocokkan setelah harakat dibuang dan boleh berawalan "ال" (بَابُ، الباب، الفصل، المبحث، المطلب); kata harus utuh ("بابك", "كتابه" bukan judul). Kata kunci baru: مبحث، مطلب. Aturan Syamilah lama hanya dipakai untuk judul Latin (tanpa syarat kata utuh, itulah sebabnya "بابك" lolos di versi pertama perbaikan ini; sudah ditutup dan dites).
- Level 1-4 (`levelUsul`): kitab/pengantar/penutup, bab, fasal/mabhats, mathlab/far'/tatimmah.
- Baris panjang berawalan kata kunci dipotong di titik dua, titik, atau tanda pisah pertama ("باب الوضوء: يجب ...", sumber `potong`); baris pendek berbentuk kalimat (berakhir titik) tetap ditolak.
- Header berulang dibuang: baris pendek yang sama di sedikitnya 5 halaman dan 8% kitab bukan judul. Judul sama di halaman berurutan tidak digandakan.
- Sisa penanda halaman "(ص: 12)", kurung siku, dan titik dua di ujung dibuang; angka di judul ("Bab 3") tetap.
- Tiap usulan membawa `sumber`: `kata-kunci`, `potong`, `bab`, atau `ai`.

**Pemilahan AI (`perpus-isi-ai`, `src/kitabIsi.js`).**
- **Hemat.** Ke AI hanya dikirim KANDIDAT judul (baris pendek dan berkata kunci, plus awal baris sesudahnya sebagai konteks), bukan seluruh teks. Pada kitab uji sintetis 3000 halaman (4,4 MB teks) yang dikirim sekitar 144 KB (3,3%). Jendela tanpa kandidat tidak memanggil AI.
- **Tidak bisa mengarang.** AI hanya memilih NOMOR kandidat dan level 1-4. Judul yang keluar selalu persis dari teks. Bila AI memotong judul dari baris panjang, potongan itu harus bagian dari baris sumber (dibandingkan tanpa harakat); kalau tidak, dipakai baris utuh. Nomor yang tidak ada atau ganda dibuang dan dihitung (`ditolak`).
- **Bertahap.** Satu panggilan = satu jendela 60 halaman (maks 250 kandidat; yang berkata kunci didahulukan). Layar memanggil berulang dengan kemajuan dan tombol Hentikan, dan membawa 8 judul terakhir sebagai konteks supaya level konsisten sepanjang kitab. Bila berhenti atau gagal di tengah, hasil sebagian tetap bisa dipakai (ditandai).
- **Biaya terkendali.** Seperti OCR, tanpa kuota AI per pengguna; batas laju sendiri `LIMIT_ISI_AI_PER_MINUTE` (15) dan `LIMIT_ISI_AI_PER_DAY` (600). Masukan cacat ditolak 422 sebelum batas laju terhitung. Layar meminta konfirmasi dengan perkiraan jumlah panggilan.
- Hanya usulan: tidak menulis apa pun. Editor tetap meninjau, lalu menyimpan lewat jalur simpan yang sama (transaksi, riwayat, deteksi bentrok).
- Hanya editor dan admin (diperiksa di api/kitab.js dan lagi di modul).

**Kitab hasil OCR AI.** Usulan bekerja pada teks yang tersimpan di halaman, jadi sumber kitab (Syamilah, PDF teks, PDF pindai OCR) tidak menjadi syarat. Satu perbedaan penting: OCR Arab (`src/fotoKitab.js`) mempertahankan baris cetak, sehingga satu halaman berisi puluhan baris sepanjang sekitar 50 sampai 60 karakter, sedangkan teks Syamilah dan OCR Latin/Pegon berupa paragraf utuh. Tanpa penyesuaian, hampir tiap baris OCR tampak sebagai kandidat judul (biaya AI membengkak, kandidat terpotong di batas 250) dan lanjutan kalimat berawalan kata kunci ("كتاب الله تعالى وسنة رسوله ...") ikut menjadi judul palsu. Penyesuaian (`ukuranBarisKhas`, `web/lib/daftarIsi.js`): bila median panjang baris isi (baris dengan panjang 20 karakter ke atas, kurang dari atau sama dengan 90) menunjukkan teks berbaris cetak, judul harus jelas lebih pendek dari baris biasa (kandidat tanpa kata kunci maksimal sekitar 55% baris khas dan 8 kata; berkata kunci maksimal sekitar 75%), dan pemotongan baris panjang dimatikan. Dites dengan halaman OCR sintetis (6 halaman, 156 baris): mesin aturan menemukan tepat 2 judul tanpa judul palsu, dan kandidat AI hanya 4 atau kurang dari 156 baris; kedua tes gagal bila penyesuaian dimatikan.

**Batas untuk OCR yang diketahui.** Salah baca OCR pada kata kunci ("باب" terbaca lain) tidak dikenali mesin aturan; jalur AI masih bisa memilihnya karena kandidat memuat baris pendek tanpa kata kunci, tetapi ini belum diuji dengan OCR nyata. Judul di halaman berkualitas `buruk` ikut kena. OCR Pegon belum punya kata kunci sendiri (kata kunci Arab dan Latin saja), jadi untuk Pegon andalkan jalur AI. Teks dua kolom atau nazham (satu bait per baris) tidak berbentuk paragraf maupun baris biasa; hasilnya belum diukur.

**Kecepatan (kitab uji sintetis 3000 halaman, 4,4 MB):** mesin aturan sekitar 0,17 detik; penyaringan kandidat untuk 50 jendela sekitar 0,17 detik. Waktu AI tergantung penyedia.

**Tes.** `test/daftarIsi.test.js` kini 34 tes (17 baru): harakat dan "ال", level, pembersihan judul, header berulang, pemotongan baris panjang, kandidat dan batasnya, pemeriksaan pilihan AI, aksi server dengan klien AI tiruan (jendela, konteks, tanpa kandidat tanpa panggilan AI, alat salah 502, penolakan AI 422, nomor ngawur, peran), validasi masukan, dan jalur /api/kitab. Seluruh suite: 688 lulus; 13 berkas gagal karena paket `react`, `docx`, `write-excel-file`, `lucide-react` tidak terpasang di lingkungan ini (sama seperti sebelumnya).

**Belum diuji.** AI sungguhan (tes memakai klien tiruan, jadi mutu pilihan dan level AI pada kitab nyata belum terukur), layar di browser, dan Firestore sungguhan. Disarankan mencoba pada satu kitab yang daftar isinya sudah benar dan membandingkan hasil AI dengan daftar itu sebelum dipakai massal.
