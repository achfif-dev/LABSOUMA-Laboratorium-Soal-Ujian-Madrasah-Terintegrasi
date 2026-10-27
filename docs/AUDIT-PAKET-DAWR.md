# Audit dan pembaruan: pembuatan soal template IMDA (27 Oktober 2026)

Permintaan: materi lebih dari 6.000 karakter (teks atau foto kitab), soal dibuat AI sesuai jumlah per Dawr menurut tingkat kesukaran, tanpa narasi dan prolog, dan teks kitab rujukan tercatat di kunci jawaban.

## Temuan (urut dari yang paling mengganggu)

| # | Keyakinan | Temuan | Dampak |
|---|---|---|---|
| 1 | Pasti | `generateSoal` menyusun **satu soal per panggilan**. Dawr II dan IV butuh 20 soal = 20 panggilan. Batas bawaan 5 per menit dan 60 per hari per pengguna (`LIMIT_*`). | Satu Dawr II memakai sepertiga kuota harian dan ±4 menit menunggu. Tidak ada cara menyusun satu naskah utuh. |
| 2 | Pasti | `MAX_TEKS = 6000` ditolak keras (`TEKS_TOO_LONG`) di server dan form. OCR foto dipotong 6.000 karakter dan hanya satu foto per kali. | Materi satu bab tidak bisa dipakai. Foto banyak halaman harus dikerjakan manual satu-satu. |
| 3 | Pasti | Template IMDA punya **tiga opsi** (أ ب ج), tetapi prompt dan skema memaksa **lima opsi**. | Naskah mencetak lima opsi dan mengeluarkan peringatan "template aslinya 3". |
| 4 | Pasti | L2 dan L3 **wajib stimulus** (`normalizeSoal` menolak bila kosong), padahal naskah memakai `narasi: false` dan tidak mencetaknya. | AI menghabiskan token untuk narasi yang dibuang, dan soal L2/L3 bisa kehilangan konteks di naskah. Ini bertentangan dengan permintaan "tanpa narasi". |
| 5 | Pasti | Naskah kunci hanya mencetak `ص <halaman>`. Kutipan Arab hanya ada di `pembahasan`. | Pengoreksi tidak melihat teks kitab di kunci. |
| 6 | Pasti | Tidak ada pengaturan sebaran L1/L2/L3 per Dawr; level dipilih satu per satu. | Komposisi tingkat kesukaran tidak terjamin. |
| 7 | Kemungkinan besar | Impor di form penyusunan hanya `.txt/.html` maksimal 500 KB. Pembaca `.docx/.pdf` hanya ada di Pegonizer. | Materi Word/PDF tidak bisa dipakai langsung. |
| 8 | Pasti | Satu tes lama gagal sebelum perubahan: `test/excelConfig.test.js` ("ekspor lalu impor (ganti)..."). Tidak terkait pekerjaan ini. | Perlu dicek terpisah. |

## Yang diubah

- `web/lib/paket.js` (baru, murni): pembagi materi per segmen ≤ 6.000 karakter di batas paragraf/kalimat (seimbang, tanpa teks hilang), pembagi level dengan sisa terbesar, `rencanaPaket` per Dawr (jumlah per bagian persis sesuai template), label halaman per segmen.
- `src/paketService.js` (baru) lewat `POST /api/assist` aksi `paket` (tidak menambah fungsi Vercel; folder `api/` sudah 11 berkas): satu panggilan = satu segmen, sampai 6 butir campuran bagian. Tanpa stimulus, tiga opsi, kunci disebar A/B/C. Butir rusak dikembalikan di `gagal` supaya hanya itu yang diulang.
- Kutipan kitab: model wajib menyalin 3-25 kata dari teks. Server mencocokkannya dengan `periksaKutipan`. Yang tidak ada di teks **dibuang dan ditandai**, tidak pernah masuk kunci. Disimpan sebagai baris `Kutipan kitab: ...` di awal `pembahasan`, jadi **tanpa perubahan skema dan tanpa deploy aturan Firestore**.
- `web/lib/naskah.js` (`kutipanKunci`) dan `naskahDocx.js`: naskah kunci mencetak `نص الكتاب: <kutipan>` merah di bawah tiap nomor (opsi `kutipan: false` untuk mematikan). Naskah peserta tidak berubah. Soal lama tanpa baris itu memakai kutipan Arab pertama dari pembahasan bila ada.
- `src/fotoKitab.js`: `penuh: true` tidak memotong hasil OCR di 6.000 (mode paket).
- `web/App.jsx`: tab **Paket Dawr** (teks, berkas `.txt .docx .pdf`, banyak foto yang bisa dikoreksi per halaman, komposisi L1:L2:L3, porsi "melanjutkan", ringkasan panggilan AI, tunggu otomatis bila kena batas per menit, tinjau dan hapus butir, simpan massal sebagai **Draft**).
- Cakupan dari Konfigurasi: tab Paket Dawr memilih kelas, ujian, dan kitab (dari Konfigurasi). Cakupan kitab untuk kelas dan ujian itu (mis. "Thaharah – Puasa") dikirim ke AI sebagai batas materi; segmen yang seluruhnya di luar cakupan dilewati. Cakupan masih teks bebas (maks. 120 karakter), jadi AI mencocokkannya dengan judul bab di teks: **perkiraan**, periksa hasilnya. Aplikasi belum mengambil halaman kitab otomatis dari cakupan.
- Butir dari segmen di luar cakupan **dialihkan** (`alihkanButir` di `web/lib/paket.js`) ke segmen yang terbukti memuat materi cakupan, bergantian, lalu ikut tahap ulang. Sebelumnya butir itu dibuang sehingga naskah Dawr bisa kurang nomor. Bila tidak ada satu pun segmen yang masuk cakupan, tampil pesan yang jelas dan tidak ada panggilan tambahan.
- `test/paket.test.js`: 23 tes baru.

## Batasan yang perlu Anda ketahui

1. Tab baru **belum diuji di browser atau perangkat**; hanya `vite build` dan tes logika yang lolos. AI sungguhan juga belum dipanggil (tes memakai klien palsu). Uji dulu satu Dawr dengan teks pendek.
2. Mutu soal tiga opsi tanpa narasi pada L3 belum terukur. Jalankan `npm run eval` atau periksa 1 paket penuh sebelum dipakai ujian.
3. Komposisi bawaan 30:50:20 adalah **perkiraan**, bukan standar. Ubah sesuai kebijakan madrasah.
4. "Kutipan cocok" berarti cocok dengan teks yang diunggah. Jika foto salah dibaca OCR dan tidak dikoreksi, kutipan salah pun bisa dinyatakan cocok.
5. Biaya kuota: setiap foto 1 panggilan, ditambah ±3-4 panggilan per Dawr satu segmen (sekitar satu per segmen untuk materi panjang). Sepuluh foto + Dawr II ±14 dari 60 per hari.
6. Simpan massal belum memeriksa soal kembar (fitur `duplikat.js` hanya dipakai di form biasa), dan tab belum ada di aplikasi peran Ustadz.
7. Segmen di luar cakupan tetap **memakai satu panggilan AI** (AI yang menolak dengan `tolak_teks`, kuota tidak dikembalikan karena panggilan memang terjadi). Cakupan masih teks bebas, jadi aplikasi belum bisa menyaring segmen sebelum memanggil AI. Cara paling hemat: unggah materi yang memang sebatas bab cakupan.
8. Pembuatan paket belum diuji di browser, dan pemasangan paket npm tidak bisa dilakukan di lingkungan audit 27 Oktober (registry npm diblokir): `vite build` belum dijalankan ulang; sintaks `web/App.jsx` diperiksa dengan esbuild, dan 369 dari 371 tes lulus. Dua yang gagal hanya karena paket `vite` dan `write-excel-file` tidak ada di sandbox (`dasborUi`, `excelConfig`), bukan karena kode.
