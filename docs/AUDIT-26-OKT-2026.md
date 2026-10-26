# Audit dan pembaruan tampilan: 26 Oktober 2026

Cakupan: tinjauan statis seluruh repositori (`api/`, `src/`, `web/`, `firestore.rules`, `vercel.json`, CI, dokumentasi).
Batasan: registry npm tidak terjangkau di lingkungan audit, jadi `vite build`, `npm audit`, dan pemeriksaan visual di browser **belum dijalankan**. Lakukan langkah di bagian 4 di komputer Anda.

## 1. Ringkasan
Arsitektur sehat. Aturan Firestore ketat (peran, batas ukuran, gerbang persetujuan), enkripsi kunci AI (AES-256-GCM + AAD), batas pemakaian per pengguna dan plafon harian, refund kuota saat gagal di server, `redirect: 'manual'` dan daftar host untuk pengambilan kitab, keluaran Pegon di-escape sebelum `dangerouslySetInnerHTML`, `pdf.js` dengan `isEvalSupported: false`. Tidak ditemukan kerentanan kritis.

## 2. Temuan
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

## 3. Perubahan tampilan
- **Token desain** baru (terang dan gelap): palet hijau lebih dalam, aksen emas, bayangan `--shadow-sm/md`, cincin fokus `--ring`.
- **Header**: gradasi hijau dengan garis aksen emas, judul ber-tracking.
- **Kartu/Section**: bayangan halus, judul bagian normal-case dengan ikon dalam chip.
- **Tombol**: tinggi minimal 40px, bayangan, hover/active yang jelas; **kolom isian**: cincin fokus, hover, status disabled.
- **Badge status** diberi cincin tipis; **toast** lebih tegas.
- **Halaman masuk**: kartu terpusat dengan garis aksen dan catatan akses terbatas.
- Skip link, `scroll-behavior`, antialiasing, angka tabular, bilah gulir tipis, gaya cetak (menyembunyikan header/navigasi).
Logika, aturan Firestore, dan struktur komponen tidak diubah.

## 4. Verifikasi yang perlu Anda jalankan
```bash
npm ci
npm test          # harap 318 tes (semua lulus)
npm audit --omit=dev
npm run build && npm run preview
```
Periksa secara visual: masuk, Penyusunan Soal, Bank, Export, Dasbor, mode gelap, dan lebar ponsel (≈375px).
