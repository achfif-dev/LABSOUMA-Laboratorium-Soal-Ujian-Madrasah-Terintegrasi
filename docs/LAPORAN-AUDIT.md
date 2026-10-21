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
