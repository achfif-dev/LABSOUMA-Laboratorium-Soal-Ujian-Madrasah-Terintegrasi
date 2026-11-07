# LABSOUMA: Laboratorium Soal Ujian Madrasah Terintegrasi (Vercel + Firebase Spark + Gemini gratis + Claude Ai (Wajib Tautkan Kredit/ Debit Card dan Deposit Min 5$))

Susunan tanpa kartu kredit:

| Bagian | Layanan | Biaya |
|---|---|---|
| Halaman dan API (`/api/*`) | Vercel Hobby | gratis, khusus pemakaian personal non-komersial |
| Login Google | Firebase Authentication (paket Spark) | gratis |
| Bank soal bersama dan peran pengguna | Cloud Firestore (paket Spark) | gratis dalam kuota harian |
| AI (soal, terjemah, analisis, telaah) | Gemini API tier gratis (bisa diganti Claude) | gratis, dengan batas |

Cloud Functions tidak dipakai karena butuh paket Blaze. Fungsi server ada di folder `api/`.

Peran: **pending** (baru daftar), **penyusun**, **editor** (menyetujui atau meminta revisi, tidak untuk soal buatannya sendiri), **admin** (mengelola pengguna dan semua soal), **ustadz** (alat bantu pribadi, lihat bagian Peran Ustadz), **nonaktif**.

## Kondisi aplikasi saat ini (7 Nov 2026)

Ringkasan keadaan kode di `main`; riwayat lengkap tiap audit dan perubahan ada di `docs/RIWAYAT-AUDIT-DAN-PERUBAHAN.md` (25 bagian, kronologis).

**Yang sudah ada**
- **Penyusunan soal berbantuan AI** dari teks kitab: lima bentuk soal, terjemah, analisis teks, telaah dan perbaikan, uji jawab buta, pemeriksa kutipan Arab dan nada, Paket Dauri (materi panjang menjadi soal bersegmen), kisi-kisi, dan haluan Ahlussunnah wal Jamaah yang moderat satu sumber di semua prompt (`src/aswaja.js`).
- **Perpustakaan kitab di Firestore** (bukan lagi hanya tempel teks): impor ekspor Syamilah (.txt/.docx), teks bertanda `[ص N]`, PDF (lapisan teks atau OCR AI Arab, Latin, Pegon), EPUB, HTML, JSON; pembaca layar penuh dengan pencarian isi; pilih kitab, bab, dan halaman langsung dari form soal; tautan balik soal ke halaman kitab; koreksi teks oleh editor dan admin; status otoritas kitab; tanya-jawab bersumber dan pemeriksaan soal terhadap halaman rujukan. Lihat bagian *Perpustakaan kitab* di bawah.
- **Alur editor bertahap** (1 sampai 3 editor) dan filter penyusun; persetujuan hanya lewat server dengan gerbang kutipan, uji buta, dan sumber.
- **Pegonizer**: mesin aturan al-Qolam '24 di browser, bantuan AI, kamus bersama di Firestore, ekspor Soal Pegon dan Naskah Ujian IMDA.
- **Admin**: konfigurasi aplikasi dengan cadangan dan riwayat, pengaturan AI (Gemini atau Claude), pengguna dan peran (termasuk tahap editor), dasbor kuota, backup dan arsip ke Google Drive, impor Excel.
- **Peran Ustadz**: alat bantu pribadi, soal disimpan hanya di perangkat.

**Menu** (dua tingkat: grup lalu sub-tab)

| Grup | Sub-tab | Siapa |
|---|---|---|
| Susun | Penyusunan, Paket Dauri, Pegonizer | staf (Ustadz: Penyusunan dan Pegonizer) |
| Baca Kitab | pembaca, pencarian isi, Tanya Kitab | staf |
| Bank Soal | Review (editor, admin), Approved | staf |
| Ujian | Fokus & Kisi-kisi, Export, Analisis Butir | staf (Ustadz: Fokus dan Export untuk soalnya sendiri) |
| Kelola | Backup Drive (editor, admin); Dasbor, Pengguna, Konfigurasi, Perpustakaan, Pengaturan AI (admin) | sesuai peran |

Ustadz hanya mendapat lima sub-tab: Penyusunan, Soal Saya, Export, Fokus & Kisi-kisi, dan Pegonizer.

**Angka terukur** (clone `main`, 7 Nov 2026)
- `npm test`: 770 tes, 769 lulus, 1 dilewati (uji berkas nyata Dasuqi; jalankan dengan `KITAB_DASUQI_DOCX=...`). `npm run lint`: 0 error, 72 peringatan (kebanyakan `react-hooks/exhaustive-deps`, belum ditriase). `npm run build` lolos.
- Bundel awal 994 KB (gzip 305 KB), turun dari 1.984 KB (gzip 622 KB) pada 6 Nov. Dimuat saat dipakai: mesin Pegon 259 KB, `docx` 466 KB, tab Export 30 KB, tab Konfigurasi/Pengaturan AI 50 KB, dan tujuh panel lain. Lihat *Arsitektur frontend*.
- Fungsi Vercel: 11 dari 12 yang diizinkan paket Hobby. Fitur API baru harus digabung ke berkas `api/` yang ada.

**Yang belum teruji atau belum dikerjakan (jujur)**
- Aturan Firestore hanya diuji sebagai teks (`firestore.rules` belum diuji di emulator). Pemuatan malas dan tampilan di HP belum dicoba di perangkat sungguhan; setelah memperbarui, uji tab Pegon, Export, dan Konfigurasi.
- Mutu OCR AI (Arab, Latin, Pegon), deteksi dua kolom, dan pembersih PDF baru diuji dengan data buatan dan beberapa berkas nyata; periksa sampel halaman sebelum kitab dijadikan rujukan soal.
- `npm run eval` (set soal emas, butuh kunci AI) belum dijalankan setelah prompt generate berubah (aturan haluan 9). `eval/golden.json` masih draf yang harus diverifikasi ustadz.
- `npm audit`: 6 temuan moderat, semuanya transitif lewat `firebase-admin` (terkunci di `@google-cloud/firestore-api`), risiko praktis rendah karena berjalan di server; belum ada perbaikan hulu. Jangan memakai `npm audit fix --force` (menurunkan `firebase`).
- `web/App.jsx` masih 4.014 baris; tab Paket Dauri dan Penyusunan belum dipisah. Migrasi Firebase compat ke modular ditunda dengan sengaja (hemat ±22 KB gzip tidak sebanding risikonya; alasan di bagian 20 riwayat).
- Pencarian isi hanya dalam satu kitab; pencarian lintas kitab belum ada.

## Pemasangan

### 1. Firebase (paket Spark)
1. https://console.firebase.google.com > Add project. Tidak perlu mengaktifkan Google Analytics.
2. **Build > Authentication > Get started > Sign-in method > Google > Enable**, pilih email dukungan, Save.
3. **Build > Firestore Database > Create database**. Pilih mode **Production**. Lokasi: `asia-southeast1` (Singapura) atau `asia-southeast2` (Jakarta). Jika konsol meminta penagihan untuk lokasi yang Anda pilih, pilih lokasi lain di daftar yang tidak memintanya.
4. **Aturan keamanan:** buka tab **Firestore > Rules**, hapus isinya, tempel seluruh isi file `firestore.rules`, lalu **Publish**. (Atau pakai CLI: `firebase deploy --only firestore:rules` setelah mengisi `.firebaserc`.)
5. **Konfigurasi web:** Project settings (ikon roda gigi) > General > Your apps > ikon **</>** (Web) > beri nama > Register. Salin objek `firebaseConfig`, ubah menjadi JSON satu baris, mis.
   `{"apiKey":"...","authDomain":"PROJECT.firebaseapp.com","projectId":"PROJECT","appId":"..."}`
   Ini nilai untuk `FIREBASE_WEB_CONFIG` (bersifat publik, bukan rahasia).
6. **Kunci server:** Project settings > **Service accounts** > **Generate new private key**. File JSON terunduh. Ubah menjadi base64 satu baris:
   - Linux/Mac: `base64 -w0 nama-file.json`
   - Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("nama-file.json"))`
   Hasilnya untuk `FIREBASE_SERVICE_ACCOUNT`. File ini **rahasia penuh** atas proyek Firebase Anda: jangan masukkan ke Git atau kirim lewat chat, dan hapus file JSON dari komputer setelah dipakai.

### 2. Kunci Gemini (gratis)
1. Buka https://aistudio.google.com/apikey dan masuk dengan akun Google.
2. Klik **Create API key**, salin kuncinya. Ini nilai untuk `GEMINI_API_KEY`.
3. Sebaiknya batasi kunci hanya untuk Gemini API: pada kunci itu pilih **Add restrictions > Restrict to Gemini API only**.
4. Jika AI Studio tidak bisa dibuka atau tidak mau membuat kunci (wilayah, usia akun, atau pembatasan lain), catat pesan galatnya. Penyedia AI bisa diganti tanpa mengubah kode: lihat bagian "Mengganti penyedia AI".

Tier gratis Gemini: konten yang dikirim boleh dipakai Google untuk meningkatkan produknya, dan batasnya (per menit dan per hari) berlaku untuk seluruh proyek, bukan per pengguna. Jangan memasukkan data siswa atau nilai.

### 3. GitHub
```bash
git init && git add . && git commit -m "LABSOUMA"
git branch -M main
git remote add origin https://github.com/<akun>/<repo>.git
git push -u origin main
```
Pastikan `git status` tidak menampilkan `.env` atau file kunci JSON. Repositori Private disarankan.

### 4. Vercel
1. https://vercel.com/new > pilih repositori. Framework Preset = **Vite** (build `vite build`, output `dist`; sudah diatur di `vercel.json`, jangan diubah).
2. Buka **Environment Variables** dan isi (lihat `.env.example`):

   | Nama | Isi |
   |---|---|
   | `FIREBASE_WEB_CONFIG` | JSON satu baris dari langkah 1.5 |
   | `FIREBASE_SERVICE_ACCOUNT` | base64 dari langkah 1.6 |
   | `GEMINI_API_KEY` | kunci dari langkah 2 |
   | `ADMIN_EMAILS` | email Google Anda (admin pertama), pisahkan dengan koma bila lebih dari satu |

   Opsional: `ALLOWED_EMAIL_DOMAIN`, `AI_MODEL`, `LIMIT_*` (termasuk `LIMIT_OCR_PER_MINUTE` 20 dan `LIMIT_OCR_PER_DAY` 1500 untuk OCR PDF pindai Arab, Latin, atau Pegon saat impor kitab; lihat `docs/RIWAYAT-AUDIT-DAN-PERUBAHAN.md` bagian 11).
3. **Deploy.**
4. **Izinkan domain Vercel di Firebase** (wajib, kalau tidak login Google ditolak): Firebase Console > Authentication > Settings > **Authorized domains** > Add domain > isi domain Vercel Anda (mis. `nama-proyek.vercel.app`, dan domain kustom bila ada).
5. Buka situs, masuk dengan email admin. Akun itu otomatis menjadi admin. Guru lain yang masuk berstatus "Menunggu persetujuan" sampai Anda memberi peran di tab **Pengguna**.

Mengubah environment variable di Vercel hanya berlaku pada deploy berikutnya: lakukan Redeploy.

## Pegonizer (alih aksara Latin ke Pegon)

Tab **Pegonizer** menyatukan aplikasi Pegon ke dalam sistem ini (standar ortografi al-Qolam '24). Dipakai semua pengguna aktif.

- **Mesin aturan** berjalan di browser tanpa kuota AI: `web/lib/pegon.js` (sumber tunggal; `src/pegon.js` hanya meneruskannya ke server dan tes, sama seperti `kutipan.js`). Aturan master untuk prompt AI ada di `src/pegonRules.js`. Mesin (±259 KB) **dimuat malas**: diunduh di latar belakang setelah layar pertama tampil (`web/lib/muatPegon.js`) dan dipasang sebagai `window.Pegon`. Komponen yang membutuhkannya (Pegonizer, Pegonkan, Export) dibungkus `denganPegon` dan menampilkan "Memuat mesin Pegon…" sampai siap. Kode baru yang memakai Pegon harus memakai pola itu atau `await muatPegon()`, jangan membaca `window.Pegon` langsung saat render.
- **Masukan:** teks, suara (Web Speech API bawaan browser), file Word/PDF (pustaka mammoth dan pdf.js dimuat hanya saat dibutuhkan), dan foto.
- **Bantuan AI** lewat `/api/assist`, aksi `pegon` (memperkuat hasil mesin) dan `pegonfoto` (membaca teks Latin dari foto). Memakai login, peran, batas pemakaian, plafon harian madrasah, dan pengembalian kuota yang sama dengan fitur AI lain. Foto diperkecil di browser (maks. 1600 px) dan dibatasi di server. Adapter Gemini kini mendukung gambar, jadi kedua penyedia AI bisa membaca foto.
- **Ekspor soal:** di tab Export/Download ada format **Soal Pegon (DOCX)**. Teks soal, opsi, kunci, dan pembahasan ditulis Pegon (aksara Arab di dalam teks tidak diubah); kata yang diragukan mesin disorot kuning agar diperiksa editor. Setiap sorotan diberi komentar Word berisi alasannya. Format **Soal Pegon + Latin (DOCX)** menambahkan baris Latin asli di bawah tiap paragraf Pegon. Angka, nominal (Rp1.000,00), URL, email, dan kode (C2) tidak dialihaksarakan.
- **Kamus tambahan** (serapan Arab, e keras/pepet, pengecualian -kan/-kah/-lah) tersimpan di browser perangkat masing-masing dan bisa diekspor atau diimpor sebagai `.json`. Entri divalidasi saat ditambah atau diimpor.
- Tes: `test/pegon.test.js` (kalibrasi master prompt, validasi, layanan AI dengan klien palsu, adapter gambar).

### Kamus Pegon bersama dan tombol Pegonkan

- **Kamus bersama** disimpan di Firestore, koleksi `kamusPegon` (satu kata satu dokumen; id `arab_ilmu`, `e_seperti`, `suf_seolah`). Semua staf membacanya, jadi hasil Pegon seragam antarpengguna. **Hanya editor dan admin** yang boleh menambah, mengubah, atau menghapus.
- **Urutan pemakaian mesin:** kamus bawaan, lalu kamus bersama, lalu tambahan di perangkat (yang terakhir menang, hanya di perangkat itu). Entri perangkat yang berbeda dari kamus bersama ditandai di tab Pegonizer, dengan tombol **Pakai kamus bersama**.
- **Membagikan:** editor/admin memakai **Bagikan tambahan perangkat ini**; entri yang berhasil dibagikan otomatis dicabut dari perangkat supaya salinan lokal yang usang tidak menimpa koreksi editor lain. Penyusun tidak bisa menulis ke kamus bersama: koreksinya tetap di perangkatnya sampai diekspor dan diserahkan ke editor.
- **Keamanan:** data dari jaringan tidak dipercaya. Setiap entri divalidasi ulang di mesin (`kamus.muatBersama`): huruf Latin a-z, ejaan Arab hanya blok Arab dasar, id harus cocok dengan isi, jumlah dibatasi 5000. `firestore.rules` menerapkan pola yang sama sebagai lapisan kedua.
- **Wajib setelah memperbarui:** salin ulang `firestore.rules` ke Firebase Console > Rules dan **Publish**. Tanpa itu kamus bersama tidak termuat (muncul peringatan di tab Pegonizer; Pegon tetap jalan dengan kamus bawaan dan perangkat).
- **Tombol Pegonkan** ada di form Penyusunan Soal. Ia hanya menampilkan pratinjau Pegon (stimulus, pertanyaan, opsi, pembahasan opsional) dan tidak mengubah isian Latin, karena telaah AI, cek kutipan, dan uji buta bekerja pada teks Latin. Kata yang disorot mesin bisa langsung dibereskan ke kamus dari panel itu.
- Tes: `test/kamusRules.test.js` menjaga pola regex dan struktur izin di `firestore.rules` tetap sama dengan mesin. Aturan itu sendiri belum diuji di emulator Firestore.

## Batas gratis yang perlu diperhatikan

- **Firestore Spark:** contoh kuota di dokumen Firebase adalah 20.000 tulis dan 50.000 baca per hari. Bila habis, Firestore berhenti sampai bulan berikutnya. Aplikasi menyimpan salinan data di browser dan membatasi daftar soal ke 300 terbaru untuk menghemat bacaan. Untuk madrasah dengan puluhan pengguna, ini umumnya cukup, tetapi pantau di Firebase Console > Usage.
- **Gemini gratis:** jika muncul "Batas permintaan AI tercapai", itu kuota proyek habis. Tunggu atau ganti `AI_MODEL` ke `gemini-3.5-flash-lite`.
- **Vercel Hobby:** ketentuan wajarnya membatasi pemakaian ke personal non-komersial. Pastikan penggunaan Anda sesuai.
- Batas per pengguna di aplikasi (5 per menit, 60 per hari untuk AI) disimpan di Firestore dan bisa diubah lewat `LIMIT_*`.
- **Ustadz** punya batas dan plafon harian sendiri (`LIMIT_USTADZ_PER_MINUTE` 3, `LIMIT_USTADZ_PER_DAY` 15, `LIMIT_USTADZ_GLOBAL_PER_DAY` 300; ambil halaman kitab `LIMIT_USTADZ_KITAB_PER_MINUTE` 5 dan `LIMIT_USTADZ_KITAB_PER_DAY` 50), terpisah dari kolam tim agar tidak saling menghabiskan.
- **Plafon global:** selain batas per pengguna, ada plafon harian untuk seluruh madrasah (`LIMIT_GLOBAL_PER_DAY`, bawaan 1000 panggilan AI). Bila penuh, semua pengguna ditolak sampai besok (WIB). Sesuaikan dengan kuota penyedia Anda. Uji jawab buta dan telaah juga dihitung.

## Peran Ustadz (alat bantu pribadi)

Untuk guru yang ingin membuat soal latihan bagi muridnya sendiri tanpa melewati editor. Admin memberi peran **Ustadz** di tab Pengguna; akun baru tetap menunggu persetujuan.

| Boleh | Tidak boleh |
|---|---|
| Menyusun soal, generate AI, telaah, uji jawab buta, saran bab, ambil halaman kitab | Membaca bank soal, soal orang lain, atau kunci jawaban tim |
| Pegonizer (kamus bersama hanya dibaca), cadangan otomatis Soal Saya ke Drive pribadi | Mengirim ke editor, Review, Backup Drive tim, Pengguna, Dasbor, Konfigurasi, Pengaturan AI |
| Ekspor dan kisi-kisi dari soalnya sendiri | Mengubah kamus Pegon bersama |

- **Penyimpanan.** Soal Ustadz **tidak pernah** dikirim ke server atau Firestore. Soal disimpan di browser perangkat itu (tab **Soal Saya**), per akun, tanpa kedaluwarsa, maksimal 500 soal. Tidak ikut pindah perangkat: pakai **Unduh cadangan** (berkas `.json`) dan **Pulihkan dari cadangan**. Di komputer bersama, hapus Soal Saya sebelum keluar.
- **Catatan wajib.** Setiap ekspor (DOCX di bawah judul dan di kaki halaman, GIFT dan Moodle XML sebagai komentar, CSV sebagai kolom `Catatan`, kisi-kisi) memuat: "Soal latihan buatan ustadz dengan bantuan AI, belum ditelaah tim editor madrasah." Catatan ini menjaga asal-usul soal; ia tidak bisa dipaksakan, karena berkas DOCX dapat disunting.
- **Pengamanan di server.** `isStaff()` di `firestore.rules` tidak memuat `ustadz`, jadi koleksi `soal` tertutup bagi Ustadz. Endpoint backup, konfigurasi, dan pengaturan AI tetap khusus editor/admin. `test/ustadz.test.js` menjaga hal ini.
- **Urutan rilis:** (1) tempel `firestore.rules` di Firebase Console dan **Publish**, (2) deploy aplikasi, (3) beri peran Ustadz di tab Pengguna. Bila aturan belum dipublish, admin tidak bisa memberi peran itu (ditolak aturan lama).

## Pengaturan AI dari aplikasi (admin)

Admin bisa mengganti penyedia (Gemini atau Claude), model, dan kunci API lewat tab **Pengaturan AI** tanpa mengubah
environment variable atau redeploy. Pengaturan ini menimpa environment variable; bila kosong, aplikasi memakai
environment variable seperti sebelumnya.

- Kunci disimpan terenkripsi (AES-256-GCM) di Firestore `config/ai`. Aturan Firestore menolak semua akses klien ke koleksi
  ini; hanya server (`/api/ai-config`, khusus admin) yang membaca dan menulisnya. Browser hanya menerima 4 karakter terakhir.
- Kunci enkripsi diturunkan dari `FIREBASE_SERVICE_ACCOUNT`. Atau isi `CONFIG_ENCRYPTION_KEY` (32 byte base64) sendiri.
  Bila kunci akun layanan diganti, kunci AI tersimpan tidak bisa dibuka lagi: masukkan ulang di tab Pengaturan AI.
- Perubahan berlaku paling lama sekitar satu menit di semua instance (cache 60 detik).
- Admin tetap bisa melihat semua soal draf yang dikirim ke AI lewat penyedia yang ia pilih. Beri peran admin hanya ke orang tepercaya.

### Uji koneksi AI

Tombol **Uji koneksi AI** mengirim satu permintaan kecil ke penyedia untuk memastikan kunci, model, dan pemanggilan alat berfungsi.

- Bisa dijalankan **sebelum menyimpan**: kunci dan model yang baru diketik diuji apa adanya, tanpa ditulis ke Firestore.
- Kesalahan konfigurasi (kunci kosong, pengaturan tidak terbaca) ditolak sebelum memanggil AI dan tidak memakai jatah uji (3 per menit, 20 per hari).
- Bila gagal, pesan menyebut penyebabnya: kunci ditolak (`AI_TEST_KEY`), model tidak ditemukan (`AI_MODEL_NOT_FOUND`), kuota atau laju
  tercapai (`RATE_LIMIT`), waktu habis (`AI_TIMEOUT`), atau penyedia tidak terjangkau (`AI_UNREACHABLE`). Kunci tidak pernah ikut tercetak di pesan.

## Konfigurasi aplikasi (admin)

Tab **Konfigurasi** mengatur pilihan yang muncul di form penyusunan soal dan filter, tanpa redeploy:

- **Tingkatan dan turunannya (kelas):** bebas ditambah (maks. 8), diurutkan (↑ ↓), dinonaktifkan, atau dihapus. Tiap tingkat punya *kunci*,
  label, label Arab, singkatan, dan daftar kelas (maks. 12). **Kunci** adalah nilai yang disimpan pada setiap soal (`soal.tingkat`), jadi
  tidak bisa diubah setelah disimpan; label dan lainnya bisa diubah kapan saja. Tiga tingkat bawaan memakai kunci lama (`Ibtidaiyah`,
  `Tsanawiyah`, `Aliyah`) agar soal lama tetap cocok. Tingkat baru belum punya mapel/kitab: pakai tombol **Salin mapel & kitab dari…**.
  **Kelas** adalah data tersendiri: dipakai di form soal (`soal.kelas`), filter Bank Soal dan Ekspor, serta pemetaan kitab (lihat di bawah).
  Mengganti nama kelas memutus pemetaan kitab lama ke kelas itu; pemetaannya perlu diatur ulang.
- **Sistem ujian:** tiap tingkat memakai satu sistem. Bawaan: **Semester** (4 ujian: UTS dan UAS Semester 1, UTS dan UAS Semester 2) dan
  **Catur Wulan** (3 ujian). Nama sistem dan nama tiap ujian bebas diubah, ditambah (maks. 4 sistem, 6 ujian per sistem), dan diurutkan ulang.
  Tiap ujian punya *kode* otomatis yang tetap (dipakai `soal.periode`), jadi mengganti nama tidak memutus soal lama. Mengganti sistem
  ujian suatu tingkat mengosongkan pembagian periode kitab di tingkat itu (kelasnya tetap).
- **Pemetaan kitab ke kelas dan ujian:** pada tiap kitab, tombol **Atur kelas & ujian**. Centang kelas tempat kitab dipakai, lalu centang
  ujian mana saja di kelas itu; tiap ujian boleh diberi **cakupan materi** (teks bebas, mis. "Kitab Thaharah"). Contoh: Fathul Mu'in di
  Tsanawiyah kelas VII hanya UTS dan UAS Semester 1, kelas VIII semua ujian, kelas IX tidak. Aturannya: kitab tanpa pemetaan tetap berlaku
  untuk semua kelas dan ujian di tingkatnya (kompatibel dengan konfigurasi lama); begitu ada kelas dicentang, hanya kelas itu yang berlaku.
  Di form soal, pilihan **Kelas** dan **Ujian** menyaring daftar kitab, dan cakupan materi tampil bila kitab, kelas, dan ujian sudah dipilih.
  Kelas dan ujian tersimpan pada soal (opsional; soal lama tidak punya dan tetap sah), tampil di daftar soal, filter, dan ekspor
  (kolom **Kelas** dan **Ujian** di akhir CSV lengkap, komentar GIFT, dan judul kartu DOCX).
- **Mata pelajaran:** nama, berlaku di tingkat mana (mengikuti daftar tingkat di atas), aktif atau tidak. Mapel di form mengikuti tingkat yang dipilih.
- **Katalog kitab:** nama Latin, **nama Arab**, pengarang, **pengarang Arab**, mapel, tingkat, tautan. Muncul sebagai pilihan di kolom Nama Kitab
  (disaring menurut tingkat dan mapel). Nama Arab tampil dengan font Amiri di form (kartu di bawah pilihan kitab), daftar soal, dan ekspor
  DOCX/CSV (kolom "Kitab (Arab)"). Isian Arab wajib memuat huruf Arab (harakat boleh). Nama Arab tidak disimpan pada soal; diambil dari katalog
  berdasarkan nama kitab, jadi mengubah nama Latin kitab memutus kaitannya untuk soal lama. 52 kitab bawaan sudah berisi nama Arab usulan: tinjau bersama ustadz.
  Kolom **Tempel banyak kitab** menerima `Nama | Pengarang | Mapel | Tautan | Nama Arab | Pengarang Arab` (kolom 4 sampai 6 opsional).

> **Penting saat memperbarui dari versi lama:** aturan Firestore untuk `soal` tidak lagi membatasi `tingkat` pada tiga nama tetap, dan kini
> menerima dua field opsional `kelas` dan `periode`. Tempel ulang `firestore.rules` dan **Publish** (atau `firebase deploy --only firestore:rules`)
> **sebelum** memakai versi baru; tanpa itu soal dengan tingkat baru, atau soal yang diberi kelas/ujian, ditolak database.

Disimpan di Firestore `config/app` (klien tidak boleh mengaksesnya; lewat `/api/app-config`, baca untuk semua pengguna aktif, ubah khusus admin).
Bila belum pernah diubah, aplikasi memakai `DEFAULT_APP_CONFIG` di `src/appConfig.js`. Daftar kitab bawaan hanyalah usulan awal: tinjau
pengarang dan pembagian tingkatnya bersama guru mapel. Mengganti nama mapel tidak mengubah soal lama; soal lama tetap tampil di filter dengan nama lamanya.

### Cadangan dan riwayat konfigurasi (anti salah ubah)

Agar kesalahan admin (menimpa, salah hapus tingkat atau kitab, salah menekan **Kembali ke bawaan aplikasi**) bisa dikembalikan ke **setelan buatan madrasah**, bukan ke bawaan aplikasi, tab **Konfigurasi** dan **Pengaturan AI** punya bagian **Cadangan & Riwayat**:

- **Otomatis.** Setiap Simpan, Kembali ke bawaan, atau Pulihkan lebih dulu mencadangkan keadaan *sebelumnya*, dalam transaksi Firestore yang sama dengan perubahannya. Bila cadangan gagal ditulis, perubahan ikut batal. 30 cadangan otomatis terakhir disimpan; yang lebih tua dipangkas. Salinan kembar tidak ditumpuk.
- **Titik pulih.** Tandai setelan yang sudah benar dengan nama (mis. "Setelan awal tahun ajaran 2026/2027"). Titik pulih tidak pernah dipangkas otomatis (maks. 20, hanya titik pulih yang bisa dihapus manual).
- **Lihat perubahan, lalu Pulihkan.** Sebelum memulihkan, tombol *Lihat perubahan* menunjukkan apa yang akan muncul lagi, apa yang akan terhapus, dan apa yang isinya berubah. Pemulihan juga dicadangkan lebih dulu, jadi salah pilih cadangan bisa dibatalkan. Isi cadangan diperiksa ulang dengan aturan validasi yang berlaku sekarang.
- **Bentrok antar admin.** Editor mengirim waktu simpan terakhir yang dilihatnya; bila admin lain sudah menyimpan lebih dulu, simpan ditolak dengan pesan jelas (HTTP 409) dan pekerjaan admin lain tidak tertimpa.
- **Unduh .json.** Tombol *Unduh konfigurasi (.json)* menyimpan salinan konfigurasi di komputer Anda (alat bantu luar-aplikasi; pemulihan lewat menu ini memakai riwayat di server, atau cadangan Google Drive).
- **Pengaturan AI:** yang dicadangkan hanya penyedia dan model. **Kunci API tidak pernah ikut dicadangkan** (rahasia hanya hidup di `config/ai`). Bila kunci terhapus, tempel ulang.
- **Bukan pengganti cadangan data.** Cakupannya konfigurasi (`config/app`, `config/ai`). Soal dicadangkan lewat *Backup ke Google Drive*. Konfigurasi juga ikut di cadangan Drive.

Disimpan di koleksi Firestore `configRiwayatApp` dan `configRiwayatAi` (tertutup untuk klien; hanya `/api/config-backup`, khusus admin). **Urutan rilis:** Publish `firestore.rules` terbaru, lalu deploy. Tanpa publish, aplikasi tetap jalan (Admin SDK tidak terikat aturan), tetapi koleksi riwayat hanya terlindungi oleh penolakan bawaan Firestore.

Bila **semua** admin terkunci (mis. peran dinonaktifkan keliru), pulihkan lewat Firebase Console: Firestore > `users/{uid}` > ubah field `role` menjadi `admin`. `ADMIN_EMAILS` hanya mengangkat akun yang masih `pending`.

## Mengganti penyedia AI lewat environment variable

- Gemini (bawaan): `AI_PROVIDER=gemini`, `GEMINI_API_KEY=...`, model bawaan `gemini-3.8-flash`.
- Pilihan model Gemini di tab Pengaturan AI: `gemini-3.8-flash` (bawaan), `gemini-3.5-flash-lite` (lebih hemat, uji mutu dulu), dan `gemini-3.1-pro-preview` (paling cermat; preview, berbayar sejak panggilan pertama). Model lama seperti `gemini-2.5-flash-lite` sudah dijadwalkan pensiun, jangan dipakai.
- Claude: `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY=...`, model bawaan `claude-sonnet-5-5`. Memerlukan kredit API Anthropic.
- Claude Haiku (lebih hemat): `AI_PROVIDER=anthropic`, `AI_MODEL=claude-haiku-5-5`, atau pilih tombol **Claude Haiku 5.5** di tab Pengaturan AI. Uji dulu mutu soal dan terjemahan Arab sebelum dipakai luas.
- Ubah model kapan saja dengan `AI_MODEL`.

## Keamanan

- Browser tidak pernah memegang kunci AI maupun kunci server. Setiap panggilan `/api/*` membawa token login Firebase, diverifikasi server, lalu peran diperiksa di Firestore.
- `firestore.rules` memaksa: hanya peran aktif yang bisa membaca soal; penyusun hanya mengubah soalnya sendiri saat Draft atau Perlu Revisi; hanya editor atau admin yang bisa menyetujui; peran hanya diubah admin. Profil pengguna hanya dibuat server.
- Server hanya mengambil teks kitab dari https di domain yang diizinkan (`KITAB_ALLOWED_HOSTS`), memeriksa ulang pengalihan, dan membatasi ukuran dan waktu.
- **Kuota AI:** bila panggilan AI gagal karena masalah server atau penyedia (kode 5xx, timeout, batas permintaan penyedia), jatah harian dan per menit pengguna dikembalikan. Penolakan karena isi teks tetap dihitung.
- **`ADMIN_EMAILS`:** hanya mengangkat akun baru, atau akun yang masih `pending`. Admin yang diturunkan atau dinonaktifkan lewat aplikasi tidak diangkat lagi saat login.
- **Enkripsi kunci AI:** isi `CONFIG_ENCRYPTION_KEY` (`openssl rand -base64 32`) agar kunci enkripsi tidak diturunkan dari kunci akun layanan. Setelah itu masukkan ulang kunci AI di Pengaturan AI.
- **CSP:** `vercel.json` kini menegakkan `Content-Security-Policy` (bukan lagi Report-Only). Setelah deploy, uji dengan konsol terbuka: login Google, unggah ke Drive, baca PDF/Word, foto kitab. Bila ada pemblokiran sah, tambahkan host-nya ke direktif yang tepat. Bila `authDomain` Firebase memakai domain kustom, tambahkan ke `frame-src` dan `connect-src`. Untuk kembali sementara, ubah nama header menjadi `Content-Security-Policy-Report-Only`.
- Jika kunci pernah bocor: Gemini, hapus dan buat ulang di AI Studio. Firebase, hapus kunci akun layanan di Google Cloud Console > IAM > Service Accounts > Keys dan buat baru, lalu perbarui env di Vercel dan Redeploy.

## Kontrol mutu soal AI

Pemeriksaan otomatis membantu editor, tidak menggantikannya. Hasilnya disimpan di dokumen soal (`ai`: dibuat AI, model, hasil kutipan, hasil uji buta) sebagai jejak audit.

- **Kutipan Arab:** kutipan di soal dan pembahasan dicocokkan dengan teks kitab. Kata yang sama tetapi **harakatnya berbeda** ditandai "mirip" (bukan lolos). Pemeriksaan ini tidak menilai kebenaran kunci atau terjemahan.
- **Uji jawab buta:** model menjawab soal tanpa melihat kunci dan pembahasan. Bila jawabannya berbeda (termasuk "tidak ada yang benar" atau "lebih dari satu benar"), soal ditandai. Berjalan otomatis setelah Generate dan bisa diulang dari tombol **Uji jawab buta** (penyusun dan editor). Biayanya satu panggilan AI tambahan. Isi `AI_VERIFY_MODEL` agar penguji memakai model berbeda dari pembuat soal.
- **Nada soal:** kata yang menyalahkan atau mengkafirkan ditandai untuk diperiksa manusia (kata seperti "kafir" sah dalam bahasan fiqih, jadi ini peringatan, bukan penolakan).
- **Gerbang persetujuan:** persetujuan hanya lewat server (`POST /api/assist`, aksi `setujui`); aturan Firestore tidak lagi mengizinkan klien menaikkan soal ke Approved. Server menghitung ulang kutipan dari teks dan isi soal tersimpan, memakai catatan uji buta milik server (`cekbutaHasil`), dan mencocokkan teks dengan halaman `sumberUrl`. Soal dengan kutipan "gagal", uji buta "beda", atau teks yang hampir seluruhnya tidak ada di halaman sumber hanya bisa disetujui dengan catatan alasan. Rincian dan batasnya: `docs/RIWAYAT-AUDIT-DAN-PERUBAHAN.md` bagian 7.
- **Terjemahan** ditandai sebagai draf mesin yang perlu ditinjau ustadz atau guru.
- **Tautan sumber** diisi penyusun dan tidak otomatis terikat ke teks yang disimpan; aturan Firestore hanya mensyaratkan `https://`. Editor perlu mencocokkannya.
- **Penolakan penyedia AI:** bila penyedia memblokir teks karena kebijakan keamanan, pengguna melihat pesan khusus (bukan galat generik). Penolakan ini tetap menghitung kuota.
- **Waktu:** satu panggilan AI dibatasi 45 detik (fungsi Vercel maksimal 60 detik). Claude tidak diulang otomatis; Gemini hanya diulang bila sisa waktu cukup.

### Evaluasi mutu AI (set soal emas)

Tes `npm test` hanya menguji kode (tanpa model sungguhan). Mutu keluaran model diukur terpisah:

`eval/golden.json` berisi 36 kasus awal (26 `generate` lintas MI/MTs/MA, L1-L3, kelima bentuk soal, kasus khilaf dan injeksi perintah; 8 `telaah` dengan soal yang sengaja dicacati plus satu kontrol soal baik; 2 `tolak`). **Ini draf**: teks Arabnya diketik dari ingatan tanpa harakat dan kuncinya harus ditetapkan ustadz, bukan AI. Untuk tiap kasus, ustadz mencocokkan teks dengan kitab, membetulkan `kunci_harus_memuat`, lalu mengisi `diverifikasi_oleh` dengan namanya. Tambahkan kasus dari kitab yang dipakai madrasah sampai kira-kira 50, terutama dari soal yang pernah ditolak editor.

1. Jenis kasus: `generate` (susun soal, lalu uji jawab buta, cek kutipan, nada, dan kunci), `telaah` (soal cacat yang harus ditangkap telaah AI; perbaikannya ikut diuji), `tolak` (teks tanpa materi yang harus ditolak AI). Format dan kolom: lihat `catatan` di `golden.json`.
2. Jalankan dari tab **Actions > Evaluasi AI > Run workflow** (butuh secret `GEMINI_API_KEY` atau `ANTHROPIC_API_KEY`), atau `npm run eval -- --ulang=3 --jeda=15000` di komputer. Pilihan: `--hanya=telaah,injeksi` (sebagian kasus), `--hanya-terverifikasi`, `--min=0.8`, `--bandingkan=hasil-lama.json`.
3. Hasil tersimpan di `eval/hasil.json` (tidak masuk Git; simpan salinannya tiap kali memakai model atau prompt baru). Ia mencatat sidik `golden.json` dan sidik berkas prompt, sehingga perubahan angka bisa ditelusuri. Gunakan `--bandingkan` untuk melihat kasus yang memburuk.
4. Galat penyedia (kuota, jaringan) dicatat sebagai `galat`, bukan `gagal`, dan tidak masuk penyebut laju lulus. Kunci atau model yang salah menghentikan eval (kode keluar 2).
5. Eval memakai kuota API sungguhan: satu kasus = 2-3 panggilan, dikali `--ulang`. Kuota gratis Gemini ketat, jadi pakai `--jeda`.

## Fitur teks kitab dan bantuan AI

- **Tautan per kitab:** di menu Konfigurasi, isi kolom *Tautan kitab* (mis. `https://shamela.ws/book/823`). Saat kitab itu dipilih di penyusunan soal, muncul tombol **Buka di situs** dan **Ambil halaman N**. Kolom **Tempel banyak kitab** menerima kolom ke-4 berisi tautan. Nomor di akhir alamat shamela.ws adalah urutan halaman situs, bukan selalu nomor halaman cetak.
- **Ambil teks dari tautan:** (tautan boleh ditempel tanpa `https://`; hasil di-cache 5 menit dan server mencoba ulang sekali bila situs sumber galat sementara) shamela.ws, al-maktaba.org, islamweb.net, ar.wikisource.org, archive.org (teks). Satu halaman per permintaan; nama kitab dan nomor halaman terisi dari judul halaman bila terbaca. Tautan sumber disimpan bersama soal. Struktur halaman situs bisa berubah; bila gagal, salin manual.
- **Maktabah Syamilah desktop:** berjalan offline di Windows dan tidak bisa diakses dari web. Ekspor ke .txt lalu impor ke Perpustakaan (bagian *Perpustakaan kitab*), atau untuk satu-dua halaman: tempel teks atau **Impor file .txt** di form, lalu **Bersihkan teks**.
- **Terjemahkan**, **Analisis teks** (ide soal per level, calon pengecoh), dan **Telaah & Perbaiki** (editor punya **Telaah AI** di tab Review). Semuanya berdasar teks Arab yang diberikan, dengan konteks Ahlussunnah wal Jamaah yang moderat. Hasil AI perlu ditelaah manusia.
- Pastikan pemakaian teks sesuai ketentuan situs sumber dan hak cipta edisi kitabnya.

## Perpustakaan kitab

Skema data dan keputusannya: `docs/SKEMA-KITAB.md`. Kronologi pengerjaan: `docs/RIWAYAT-AUDIT-DAN-PERUBAHAN.md` bagian 6 sampai 16.

**Impor (Kelola > Perpustakaan, admin).** Semua format dibaca di browser lalu dikirim per halaman lewat `/api/kitab` (`aksi: impor-*`); server menulis dengan Admin SDK dan koleksi `kitab` tidak pernah ditulis klien.
- Format: ekspor Syamilah `.txt` dan `.docx`; `.txt/.docx/.html` dengan penanda `[ص N]`; PDF berlapis teks (judul berjalan dan nomor halaman dibuang, penanda buku dan metadata dipakai, dua kolom dikenali); PDF pindai lewat **OCR AI** (`impor-ocr`, khusus admin, aksara Arab, Latin, atau Pegon, batas `LIMIT_OCR_PER_MINUTE` 20 dan `LIMIT_OCR_PER_DAY` 1500, hasil per halaman disimpan di IndexedDB agar bisa dilanjutkan); EPUB; HTML; JSON halaman; berkas tanpa penanda dengan halaman virtual (ditandai dan diperingatkan). Halaman yang terlalu panjang dipecah otomatis.
- Pemeriksa mutu isi di layar impor (mojibake, huruf terpisah, urutan terbalik, halaman kosong atau ganda, dan sebagainya) dan peringatan bentrok ID atau judul sebelum menekan impor. Kitab non-Arab (Indonesia, Inggris, Jawa, Sunda) bisa diimpor dan dipakai untuk soal; arah dan prompt mengikuti `aksara` kitab.
- Impor ulang ("timpa") bertahap dan bisa dilanjutkan, tidak menghapus kitab yang sedang dipakai; jilid berikutnya bisa ditambahkan ke kitab yang sudah ada.
- **Hak cipta:** status awal "belum dicek"; admin yang menentukan. Pastikan pemakaian sesuai ketentuan edisi kitabnya.

**Dipakai penyusun dan staf lain.**
- **Pemilih kitab** di Penyusunan Soal dan Paket Dauri: pilih kitab, bab, dan halaman; teks terisi otomatis (batas 6.000 karakter). Soal membawa tautan balik opsional `kitabId`, `halId`, `halIdAkhir` (muncul chip "Tertaut ke perpustakaan" dan tautan "Buka di kitab" di Review dan Bank Soal). Teks tetap disalin ke soal, jadi soal yang sudah disetujui tidak berubah bila teks kitab dikoreksi.
- **Baca Kitab**: layar lebar, huruf 20 sampai 60 px, daftar isi, lompat ke nomor cetak, matn dan syarah, salin dengan rujukan, alamat `#baca/<kitab>/<urutan>` yang bisa dibagikan. **Cari teks** mengabaikan harakat dan tatwil dan menyatukan varian huruf; memakai indeks di `kitab/{id}/cari/*` yang dibangun otomatis pada pencarian pertama kitab lama.
- **Tanya Kitab** (`aksi: tanyakitab`, 1 kuota AI per pertanyaan): AI menyusun kata kunci Arab, kode meranking halaman, AI menjawab hanya dari halaman itu. Gagal-tertutup: tanpa butir yang terbukti ada di halaman, jawaban tidak ditampilkan. Bisa memilih 1 sampai 4 kitab.
- **Periksa rujukan** (`aksi: periksarujukan`, tanpa AI dan tanpa kuota AI): kutipan pada pembahasan dan jawaban harus ada di halaman rujukan, dan kunci dibandingkan dengan pengecoh terhadap halaman (heuristik kata, bukan makna). Hasil: selaras, perlu dicek, tidak selaras, atau tidak dapat dinilai.

**Mutu teks dan haluan.**
- **Koreksi teks** oleh editor dan admin (tombol Koreksi teks di pembaca): satu koreksi satu transaksi, dengan arsip lama dan baru, deteksi bentrok (409), centang "sudah dicocokkan dengan kitab asli" (mencabut peringatan OCR), dan indeks pencarian ikut diperbarui. Impor ulang menimpa koreksi (arsipnya tetap).
- **Otoritas kitab** (admin): `belum_dinilai` (bawaan), `muktamad`, `rujukan`, `pembanding`, `luar_rumpun`, ditambah akidah dan catatan. Server yang membacanya dari Firestore lewat `kitabId` dan memasukkannya ke prompt; klien tidak bisa memalsukannya. Kitab pembanding, di luar rumpun, atau belum dinilai memunculkan peringatan. Status ini belum memblokir persetujuan soal.
- Teks yang dibaca dari perpustakaan paling jauh sejajar dengan teks tersimpan, bukan dengan kitab cetak: hasil OCR yang belum dicocokkan ditandai di pembaca dan di hasil Tanya Kitab.

## Alur editor bertahap

Satu editor (bawaan, seperti dulu) atau 1 sampai 3 tahap: penyusun, editor 1, (revisi), editor 2, (revisi), editor 3, persetujuan. Editor boleh meloloskan tanpa revisi; satu editor tidak boleh meninjau dua tahap pada soal yang sama; admin bisa meninjau tahap mana pun. Approved hanya lewat server (gerbang kutipan, uji buta, dan sumber).
- **Atur:** Konfigurasi > Alur Editor Bertahap (jumlah tahap standar dan per mata pelajaran; disimpan di `config/alur`) dan Pengguna > Tahap editor.
- **Filter:** Bank Soal punya filter Penyusun dan Tahap Editor.
- **Urutan rilis:** unggah kode dan tunggu deploy, baru publish `firestore.rules`, lalu atur tahap editor dan aktifkan alur. Pemulihan dari cadangan tidak membawa `tahap` dan `tinjauan`. Rincian: `docs/RIWAYAT-AUDIT-DAN-PERUBAHAN.md` bagian 19.

## Saran bab penting dan kisi-kisi

Tab **Fokus Ujian & Kisi-kisi** (editor dan admin):

1. **Saran AI.** Pilih tingkat, kelas, ujian, mapel, dan kitab. Tempelkan daftar isi kitab bila ada: dengan daftar isi, tiap bab yang disarankan diperiksa ulang dan yang tidak ada ditandai; tanpa daftar isi, hasil ditandai *perlu diverifikasi*. Saran disusun dengan haluan Ahlussunnah wal Jamaah yang moderat dan setia pada teks kitab. Ini bahan pertimbangan; guru atau ustadz yang menetapkan bab ujian. Memakai 1 kuota AI.
2. **Tandai bab pada soal.** Isi kolom *Bab / Materi* di form soal (atau klik *Susun soal untuk bab ini*).
3. **Kisi-kisi.** Pilih soal Approved, lalu unduh *Kisi-kisi guru*, *Lembar Fokus murid*, gabungan (DOCX), CSV, atau salin teksnya. Kunci jawaban, opsi, dan pembahasan tidak pernah dimasukkan. Bila saran AI tersedia, muncul analisis bab inti yang belum punya soal.

Rilis: tempel `firestore.rules` terbaru di Firebase Console dan **Publish** (field `bab` baru), lalu deploy.

## Bentuk soal (bukan hanya pilihan ganda)

Form Penyusunan Soal punya selektor **Bentuk Soal**. Soal lama (tanpa field `bentuk`) selalu dibaca sebagai pilihan ganda.

| Bentuk | Isi soal | Kunci |
|---|---|---|
| `pilgan` Pilihan ganda | kalimat tanya + 5 opsi | huruf A-E |
| `lanjutan` Melanjutkan (pilihan) | kalimat menggantung berakhir `.....` + 5 opsi kelanjutan | huruf A-E |
| `benarsalah` Benar-Salah | satu pernyataan | A = Benar, B = Salah |
| `isian` Melanjutkan (isian) | kalimat dengan `.....` yang diisi sendiri | field `jawaban` (pisahkan penulisan lain dengan ` / `) |
| `uraian` Uraian | pertanyaan/perintah terbuka | `jawaban` model + `rubrik` (poin, skor, skor maksimal) |

- **Saran per jenjang** (`BENTUK_PER_TINGKAT` di `web/lib/bentuk.js`, tanda ★ di form): MI: melanjutkan, benar-salah, isian, pilgan; MTs: pilgan, melanjutkan, isian, uraian, benar-salah; MA: pilgan, uraian, isian, melanjutkan. Ini saran awal, bukan pembatasan; semua bentuk tetap bisa dipilih, dan tingkat buatan admin mendapat semua bentuk.
- **AI**: `/api/generate` dan aksi `telaah` menerima `bentuk`. Tiap bentuk punya skema alat dan aturan prompt sendiri (`ATURAN_BENTUK` di `src/soalService.js`); prompt pilihan ganda tidak berubah. Keluaran yang tidak sesuai bentuk (mis. soal melanjutkan tanpa titik-titik, uraian tanpa rubrik) ditolak sebagai `AI_BAD_OUTPUT` dan kuota dikembalikan.
- **Uji jawab buta** hanya untuk bentuk berpilihan (pilgan, melanjutkan-pilihan, benar-salah). Isian dan uraian ditelaah dengan **Telaah &amp; Perbaiki**; server menolak `cekbuta` untuk keduanya dengan kode `BENTUK_TANPA_OPSI`.
- **Ekspor**: Word (semua mode, termasuk Pegon), CSV, GIFT dan Moodle XML (benar-salah = `truefalse`, isian = `shortanswer`, uraian = `essay`). CSV RDM menambah kolom Bentuk, Jawaban, Rubrik di akhir. Kisi-kisi mencatat bentuk tiap butir. Tab Bank dan Export punya filter Bentuk Soal.
- **Data**: field baru `bentuk`, `jawaban`, `rubrik` bersifat opsional. Klien hanya mengirimnya bila bukan pilihan ganda, jadi soal biasa tetap sama persis dengan sebelumnya.
- **Wajib saat rilis**: tempel `firestore.rules` terbaru di Firebase Console > Rules dan **Publish** SEBELUM deploy aplikasi. Tanpa itu, menyimpan soal bentuk baru ditolak ("Ditolak: Anda tidak berhak...").

## Backup ke Google Drive

Menu **Backup Drive** (editor dan admin) menyalin semua soal, termasuk draf, dan katalog kitab, mapel, serta tingkat ke satu berkas JSON di folder "LABSOUMA Backup" pada Google Drive akun yang dipilih di jendela izin. Gunakan akun Google madrasah, bukan akun pribadi.

- **Cadangan terverifikasi.** Setelah diunggah, berkas diunduh lagi dan harus identik dengan yang dikirim. Hanya setelah itu cadangan dianggap berhasil.
- **Arsipkan (khusus admin).** Setelah cadangan terverifikasi, admin dapat menghapus dari Firestore soal berstatus Disetujui yang terakhir diubah lebih dari 90/180/365 hari. Draf, soal menunggu review, dan soal perlu revisi tidak pernah dihapus. Soal yang berubah sejak cadangan dibuat dilewati.
- **Pulihkan (khusus admin).** Dari daftar Drive atau berkas `.json` di komputer. Mode "lewati" tidak menyentuh soal yang ID-nya sudah ada, jadi aman diulang. Katalog kitab hanya dipulihkan bila dicentang.
- **Izin minimal.** Aplikasi meminta scope `drive.file`: hanya berkas buatan aplikasi ini yang terlihat, bukan seluruh Drive. Token hanya di memori browser dan tidak disimpan.

Yang perlu dipahami: cadangan **tidak mengosongkan Firestore**. Penyimpanan Spark 1 GiB sulit penuh oleh teks soal; yang lebih sering habis adalah kuota baca/tulis harian. Satu cadangan membaca semua soal (satu dokumen = satu bacaan), dan arsip membaca sekali lagi tiap soal yang dihapus. Jalankan di luar jam ramai, dan perhatikan Firebase Console > Usage.

### Pemasangan (sekali, oleh admin)

Nama menu mengikuti tampilan Google Cloud saat ini ("Google Auth Platform"). Bila Google mengubahnya lagi, yang pasti dibutuhkan: Drive API aktif, OAuth Client ID jenis Web, dan origin situs terdaftar.

1. Buka [Google Cloud Console](https://console.cloud.google.com/) dan pilih **proyek yang sama dengan Firebase**.
2. **APIs & Services > Library**: cari dan aktifkan **Google Drive API**.
3. **Google Auth Platform** (menu di sidebar):
   - **Branding**: isi nama aplikasi dan email dukungan.
   - **Data Access > Add or remove scopes**: tambahkan `.../auth/drive.file`. Scope ini tercantum di "Your non-sensitive scopes", jadi **tidak perlu verifikasi Google**.
   - **Audience**: bila statusnya "Testing", tambahkan email semua editor dan admin di **Test users** (maksimal 100); tanpa itu mereka kena `access_denied`. Atau ubah ke "In production" agar tidak perlu mendaftarkan email.
4. **Google Auth Platform > Clients > Create client**: pilih **Web application**, beri nama yang jelas (mis. `LABSOUMA Web`; hanya label di console). Pada **Authorized JavaScript origins** isi alamat situs persis (mis. `https://labsouma.vercel.app`, tanpa garis miring akhir; tambahkan `http://localhost:3000` untuk uji lokal, dan alamat lain bila situs diakses lewat domain berbeda). **Authorized redirect URIs** dikosongkan. Klik **Create**.
5. Salin **Client ID** (bentuknya `123456-abc.apps.googleusercontent.com`; client secret tidak dipakai), isi di Vercel sebagai `GOOGLE_DRIVE_CLIENT_ID`, lalu **Redeploy**.

Galat yang paling umum: *Google Drive API belum aktif* (langkah 2), *origin_mismatch* (alamat yang dipakai tidak terdaftar di langkah 4), dan *access_denied* (email belum menjadi Test user, langkah 3). Cadangan yang sangat besar (di atas sekitar 5 MB) diunggah sekali jalan; bila gagal, verifikasi menolaknya dan tidak ada soal yang dihapus.

## Dasbor admin, deteksi soal mirip, dan cadangan otomatis Ustadz

**Dasbor (menu Dasbor, khusus admin).** Menampilkan plafon harian AI (tim dan Ustadz), pemakaian AI per pengguna hari ini beserta sisa kuotanya, dan antrean review.
- Titik merah di menu muncul saat salah satu plafon harian sudah 80% atau lebih (dicek tiap 3 menit selama halaman terlihat, hanya 2 bacaan Firestore). Rincian per pengguna hanya dimuat saat tab Dasbor dibuka (otomatis tiap 2 menit) dan hanya membaca dokumen `rate/*` yang aktif hari ini.
- Hitungan bersifat **hari ini saja** (reset 00.00 WIB) dan sudah dikurangi pengembalian kuota akibat kegagalan server. Belum ada riwayat harian atau bulanan.
- Menaikkan batas: ubah `LIMIT_GLOBAL_PER_DAY`, `LIMIT_USTADZ_GLOBAL_PER_DAY`, `LIMIT_PER_DAY`, atau `LIMIT_USTADZ_PER_DAY` di Vercel lalu Redeploy.
- Antrean review dihitung dari soal pending yang sudah dimuat di browser (tanpa bacaan tambahan). Soal tertua, yang lewat 3 dan 7 hari, dan yang butuh catatan alasan (kutipan tak cocok atau uji buta berbeda) ditandai.
- Endpoint: `POST /api/admin-stats` (khusus admin; `{ringkas:true}` untuk dua plafon saja, `{semua:true}` untuk menyertakan yang belum memakai AI).

**Deteksi soal kembar atau mirip.** Saat Simpan Draft atau Kirim ke Editor (dan Simpan ke Soal Saya untuk Ustadz), soal dibandingkan dengan soal yang sudah ada. Bila kembar (>= 92%) atau mirip (>= 70%), muncul konfirmasi berisi soal pembandingnya; pengguna bisa tetap menyimpan. Pertanyaan yang sama dengan kunci berbeda diberi peringatan khusus.
- Yang dibandingkan: soal yang sudah dimuat di browser ditambah hingga 200 soal dengan nama kitab yang sama (disimpan 10 menit per kitab supaya hemat jatah baca). Soal lama di kitab lain atau dengan nama kitab yang ditulis berbeda **tidak** diperiksa.
- Pembandingan berdasarkan kata (harakat dan variasi huruf Arab diabaikan), bukan makna. Soal yang diparafrase habis-habisan bisa lolos. Ambang ada di `web/lib/duplikat.js`.
- Tidak ada perubahan `firestore.rules` atau indeks.

**Cadangan otomatis Soal Saya ke Google Drive (peran Ustadz).** Di tab Soal Saya, Ustadz menekan *Aktifkan cadangan otomatis* sekali. Setelah itu setiap menyimpan, menghapus, atau memulihkan soal menjalankan pencadangan ke folder "LABSOUMA Backup" di Drive akun Ustadz sendiri.
- Satu berkas per hari (`labsouma-soal-saya-YYYY-MM-DD.json`, ditimpa bila disimpan lagi di hari yang sama); 14 hari terakhir disimpan, yang lebih lama dihapus. Isi diunduh kembali dan dibandingkan sebelum dianggap berhasil. Daftar kosong tidak pernah diunggah.
- **Bukan pencadangan latar belakang.** Token Drive hanya di memori browser (±1 jam) dan jendela izin Google hanya boleh muncul dari klik. Jadi pencadangan terjadi saat Ustadz membuka aplikasi dan bertindak; bila izin ditolak atau koneksi putus, muncul penanda "belum tercadangkan" dan tombol *Cadangkan sekarang*.
- Pemulihan: tombol *Pulihkan dari Drive* memilih salah satu dari 14 berkas dan menggabungkannya ke Soal Saya di perangkat.
- Syarat di Google Cloud: `GOOGLE_DRIVE_CLIENT_ID` terisi (sama dengan Backup Drive tim), dan akun Ustadz harus bisa memakai aplikasi OAuth. Bila layar persetujuan OAuth masih berstatus **Testing**, tambahkan email setiap Ustadz sebagai Test user (maksimal 100), atau ubah status ke **In production** (scope `drive.file` tidak perlu verifikasi Google).
- Endpoint baru `POST /api/drive-client` (semua peran pemakai alat AI) hanya mengembalikan Client ID yang bersifat publik; Ustadz tetap tidak punya akses ke `/api/backup`.

## Naskah ujian format IMDA (Dauri I–IV)

Tab **Export/Download**, format **Naskah Ujian IMDA (DOCX)**. Soal Approved yang dipilih disusun menjadi naskah mengikuti empat template `FORMAT_SOAL_IMDA_I–IV`: kertas F4, kanan-ke-kiri, kop dengan logo, kotak nama/kelas/nomor/mata pelajaran, tiga bagian, kaki halaman `(* L@b I *)`.

| Dauri | أ pilihan | ب isian | ج uraian | Total |
|---|---|---|---|---|
| I dan III | 5 nomor × 5 | 5 × 7 | 5 × 8 | 100 |
| II dan IV | 7 nomor × 4 | 6 × 5 | 7 × 6 | 100 |

- Soal masuk ke bagian menurut **bentuknya**: pilihan ganda dan lanjutan ke أ, isian ke ب, uraian ke ج, dengan urutan pilihan Anda. Benar–Salah tidak ada di template, jadi tidak dimasukkan. Soal yang melebihi jumlah nomor bagiannya tidak dimasukkan; pratinjau menyebut alasannya. Nomor yang tidak terisi dibiarkan kosong sehingga naskah sebagian tetap bisa dicetak, dan pratinjau menunjukkan total nilai dari 100.
- **Dua berkas.** *Naskah peserta* tidak memuat jawaban. *Naskah kunci* menandai huruf opsi yang benar dan jawaban tertulis dengan warna merah, ditambah "ص" dengan halaman kitab (diambil dari kolom Halaman soal); jangan dibagikan kepada peserta.
- Kop (mata pelajaran, kelas, tingkat, tahun ajaran, dua baris nama lembaga, penanda kaki) bisa diubah di pengaturan dan tersimpan sebagai draf di perangkat. Logo diambil dari `public/logo-madrasah.png` (dari template); ganti berkas itu bila logonya berubah.
- Template memuat **tiga opsi** (أ ب ج). Soal dengan lebih dari tiga opsi tetap dicetak semuanya dan diberi peringatan.
- **Teks soal ditulis Pegon.** Kalimat soal, opsi, dan jawaban di naskah kunci dialihaksarakan dengan mesin Pegon (kamus bersama ikut dipakai); kop sudah berbahasa Arab. Soal di bank tetap Latin, dipakai untuk telaah AI, cek kutipan, dan uji buta. Kotak **Tulis soal dalam Pegon** di panel Pengaturan bisa dimatikan. Kata serapan Arab yang belum ada di kamus ditampilkan di pratinjau sebelum unduh; tambahkan ke kamus (tab Pegonizer) lalu unduh ulang.
- **Ejaan huruf.** Pilihan di panel Pengaturan: *Al-Qolam '24* (bawaan, ڤ ڬ ڠ چ پ) atau *Klasik* seperti contoh naskah: p = ف, c = ج, g = ك, ng = غ, ngg = غك, ny/nya = ني/نيا. Pemetaan huruf ada di `ubahEjaan` (`web/lib/pegon.js`) dan hanya mengganti huruf pada hasil mesin.
- **Kop sama dengan template asli.** Kop dibuat ulang dari `FIQH.docx` (modul `web/lib/kopAsli.js`): grup gambar Word berisi kotak data bergaris tebal-tipis, tiga kotak nomor, garis ganda, dan logo, dengan tiga baris judul Arial 16/16/10 pt. Bukan lagi tabel. Beda yang disengaja: logo PNG mengambang di titik logo template, dan 50 spasi penutup kotak data dibuang.
- **Ejaan klasik lengkap.** Selain pemetaan huruf, ejaan klasik menulis hamzah awal kata sebagai alif polos (اداله، اوراغ، افا) dan -kan + -nya ringkas (ملاكوكنيا). Pilihannya tersedia di tab Pegonizer, pratinjau Pegonkan, dan ekspor Soal Pegon, disimpan per perangkat.
- **Kamus serapan kitab pesantren.** `docs/kamus-serapan-arab-kitab-pesantren.json` (647 entri: fikih, ushul, nahwu-sharaf, balaghah, mantiq, akidah, tasawuf, hadits, tafsir, tajwid, nama ulama dan kitab). Impor lewat tab Pegonizer, tombol impor kamus. Kunci Latin tanpa apostrof; entri yang sudah ada di kamus bawaan tidak diulang. Dijaga `test/kamusPesantren.test.js`.
- **Ringkas sesuai contoh.** Template hanya punya satu kalimat soal per nomor, jadi narasi/stimulus **tidak dicetak** (nyalakan **Sertakan narasi** bila perlu), dan opsi ditulis `(أ-2 ب-3 ج-4)` dalam satu baris. Form memberi catatan bila kalimat soal lebih dari ±150 karakter atau satu opsi lebih dari 40 karakter; isi soal tidak pernah dipotong otomatis.
- Arti "ص" pada template **diasumsikan** halaman kitab (karena soal sudah punya kolom Halaman). Bila maksudnya lain, ubah `rujukanHalaman` di `web/lib/naskah.js`.

## Variabel lingkungan (ringkasan)

Diisi di Vercel > Settings > Environment Variables (lihat juga `.env.example`, yang hanya memuat sebagian). Perubahan berlaku pada deploy berikutnya.

| Nama | Fungsi |
|---|---|
| `FIREBASE_WEB_CONFIG`, `FIREBASE_SERVICE_ACCOUNT` | konfigurasi web (publik) dan kunci server (rahasia penuh, base64) |
| `ADMIN_EMAILS`, `ALLOWED_EMAIL_DOMAIN` | admin pertama; membatasi domain email yang boleh masuk |
| `AI_PROVIDER`, `AI_MODEL`, `AI_VERIFY_MODEL` | penyedia (`gemini` atau `anthropic`), model, dan model penguji jawab buta |
| `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` | kunci penyedia AI (bisa diganti dari tab Pengaturan AI) |
| `CONFIG_ENCRYPTION_KEY` | kunci enkripsi 32 byte base64 untuk kunci AI tersimpan (opsional) |
| `GOOGLE_DRIVE_CLIENT_ID` | OAuth Client ID untuk Backup Drive dan cadangan Soal Saya |
| `KITAB_ALLOWED_HOSTS` | daftar host yang boleh diambil teks kitabnya |
| `SUMBER_WAJIB` | `1` = menyetujui soal yang halaman sumbernya kosong atau tidak terjangkau wajib memakai catatan alasan (dibaca `api/assist.js`, dipakai `src/review.js`) |
| `LIMIT_PER_MINUTE`, `LIMIT_PER_DAY`, `LIMIT_GLOBAL_PER_DAY` | batas AI per pengguna dan plafon harian madrasah |
| `LIMIT_KITAB_PER_MINUTE`, `LIMIT_KITAB_PER_DAY` | batas ambil teks kitab dari situs |
| `LIMIT_USTADZ_PER_MINUTE`, `LIMIT_USTADZ_PER_DAY`, `LIMIT_USTADZ_GLOBAL_PER_DAY`, `LIMIT_USTADZ_KITAB_PER_MINUTE`, `LIMIT_USTADZ_KITAB_PER_DAY` | batas dan plafon peran Ustadz |
| `LIMIT_OCR_PER_MINUTE`, `LIMIT_OCR_PER_DAY` | batas OCR AI saat impor kitab (admin) |

## Pengembangan lokal

Butuh Node.js 22.12 atau lebih baru.

```bash
npm ci
npm run lint        # eslint (0 error; peringatan hooks belum ditriase)
npm test            # node --test: tes server dan logika murni, plus render SSR komponen (tanpa kunci, tanpa internet)
npm run build       # bundel frontend ke dist/ (Vite)
npm run eval        # evaluasi mutu AI terhadap set soal emas (butuh kunci API; lihat bagian Evaluasi mutu AI)
vercel dev          # frontend (vite) dan fungsi api/ bersama; butuh variabel lingkungan seperti di Vercel
```

CI (`.github/workflows/ci.yml`, tiap push dan pull request) menjalankan `npm ci`, `npm run lint`, `npm test`, dan `npm run build`. `eval.yml` dijalankan manual. Setelah mengubah `package.json`, commit juga `package-lock.json`.

## Arsitektur frontend

Frontend ada di `web/` (Vite, React, Tailwind sebagai build; tidak ada skrip CDN). Agar unduhan awal kecil (penting di HP), bagian yang jarang dipakai dimuat malas:

- **Dimuat saat dipakai:** mesin Pegon (`web/lib/muatPegon.js`), pustaka `docx` (`web/lib/muatDocx.js`), tab Export (`ExportTab.jsx`), tab Konfigurasi dan Pengaturan AI (`AdminKonfigurasi.jsx`), dan panel `KitabImpor`, `PembacaKitab`, `PemilihKitab`, `TanyaKitab`, `PeriksaRujukan`, `ImporExcel`, `AnalisisButir`. Pembungkusnya `lazyPanel` di `App.jsx`: kegagalan memuat (mis. offline dan belum pernah dibuka) hanya menampilkan tombol "Coba lagi" di panel itu, tidak merobohkan aplikasi. `pdf.js`, `mammoth`, dan pustaka Excel juga hanya dimuat saat dibutuhkan.
- **Aturan impor (jangan dilanggar):** `web/lib/dasar.js` (konstanta dan pembantu murni) tidak mengimpor berkas proyek selain `lib/kitabNama.js`; `web/ui.jsx` (pembantu tampilan dan API bersama: `Btn`, `Section`, `callApi`, konteks, `Filters`, `denganPegon`) mengimpor `dasar.js`; `exportBuilders.js` mengimpor `dasar.js`; tab yang dimuat malas mengimpor dari `ui.jsx` dan `lib/*`. **Tidak ada berkas selain `main.jsx` yang boleh mengimpor `App.jsx`.** Tes `exportTabUi` dan `adminKonfigurasiUi` menjaganya.
- **Memisahkan tab baru:** pindahkan komponen ke berkas sendiri yang mengimpor dari `./ui.jsx` dan `./lib/*`, daftarkan di `App.jsx` dengan `lazyPanel(() => import('./NamaTab.jsx'))` (dibungkus `denganPegon` bila membaca `window.Pegon`), lalu jalankan lint untuk menangkap identifier yang tertinggal. Tes yang memeriksa teks kode membaca sumber gabungan lewat `test/_sumberWeb.js`.
- **Layanan Firebase di klien** masih memakai SDK compat (`firebase/compat/*`) di `web/main.jsx` dan `App.jsx`; migrasi ke API modular ditunda (lihat bagian 20 di `docs/RIWAYAT-AUDIT-DAN-PERUBAHAN.md`).

## Struktur

```
index.html               pintu masuk Vite
web/main.jsx             memulai aplikasi (Firebase compat, React), memuat Pegon di latar belakang; web/globals.js memasang modul murni ke window
web/App.jsx              frontend React (±4.000 baris): tab penyusunan, paket, review, bank, fokus, pegon, backup, pengguna, ustadz
web/ui.jsx               pembantu tampilan dan API bersama (Btn, Section, callApi, konteks, Filters, denganPegon)
web/ExportTab.jsx        tab Export (dimuat malas)
web/AdminKonfigurasi.jsx tab Konfigurasi, Alur Editor, Pengaturan AI, Pemeliharaan (dimuat malas)
web/KitabImpor.jsx, PembacaKitab.jsx, PemilihKitab.jsx, PenyuntingHalaman.jsx, TanyaKitab.jsx, PeriksaRujukan.jsx    perpustakaan kitab
web/ImporExcel.jsx, AnalisisButir.jsx                                                                                impor Excel konfigurasi; analisis butir
web/styles.css           gaya halaman + lapisan Tailwind (tailwind.config.js)
public/                  berkas statis: ikon, manifest, logo, sw.js (service worker: cangkang offline)
web/lib/dasar.js         konstanta dan pembantu murni bersama (LEVEL, KEYS, Bt, bacaPref, optsOf, ...)
web/lib/exportBuilders.js  pembuat berkas ekspor: DOCX, Moodle GIFT/XML, CSV, daftar FORMATS
web/lib/muatPegon.js, muatDocx.js    pemuat malas mesin Pegon dan pustaka docx
web/lib/pegon.js         mesin alih aksara Pegon (kode asli; src/pegon.js meneruskannya ke server dan tes)
web/lib/naskah.js, naskahDocx.js, naskahMeta.js, kopAsli.js   naskah ujian IMDA (preset Dauri I-IV, nilai, DOCX, kop)
web/lib/syamilah.js, dokumenKitab.js, penandaSisip.js, docx.js, sumberLain.js, bacaPdf.js, pdfKitab.js, ocrPdf.js, simpananOcr.js,
  pecahHalaman.js, kualitasKitab.js, bahasa.js, imporKitab.js    impor perpustakaan (semua format, OCR, mutu isi, bahasa)
web/lib/perpus.js, pembaca.js, rujukan.js, cariKitab.js, koreksi.js, otoritas.js, telaahKitab.js, periksaRujukan.js   baca, cari, koreksi, otoritas, tanya kitab
web/lib/alurSoal.js, bentuk.js, ujian.js, kisi.js, paket.js, kutipan.js, sikap.js, duplikat.js, riwayat.js, analisisButir.js, excelConfig.js, navigasi.js, dasbor.js   logika murni lain (dipakai klien; sebagian punya salinan di src/ untuk server dan tes)
web/lib/drive.js, cadanganDrive.js, ustadz.js, draft.js          cadangan Drive, cadangan Soal Saya, peran Ustadz, draf otomatis
api/                     11 fungsi Vercel: config, session, generate, assist, kitab, ai-config, app-config, config-backup, backup, admin-stats, drive-client
src/platform.js, access.js, secrets.js   Firebase Admin, autentikasi, peran, batas pemakaian; enkripsi AES-256-GCM
src/soalService.js, assistService.js, paketService.js, babService.js, cekButa.js, pegonService.js, pegonCek.js, pegonRules.js, gemini.js, aswaja.js   layanan AI: soal, terjemah, telaah, paket, bab, uji buta, Pegon, adapter Gemini, haluan Aswaja
src/kitabImpor.js, kitabBaca.js, kitabCari.js, kitabKoreksi.js, kitabOcr.js, kitabFetch.js, fotoKitab.js, syamilah.js, otoritas.js, telaahKitab.js, periksaRujukan.js   perpustakaan kitab di server (impor, baca, cari, koreksi, OCR, otoritas, tanya)
src/review.js, alurSoal.js, alurEditor.js, appConfig.js, aiConfig.js, configBackup.js, backup.js, adminStats.js   review bertahap, konfigurasi, cadangan, dasbor
firestore.rules          aturan keamanan data (soal, users, kamusPegon, kitab dan subkoleksi tertutup untuk klien, config tertutup)
docs/                    RIWAYAT-AUDIT-DAN-PERUBAHAN.md (25 bagian kronologis), SKEMA-KITAB.md, kamus-serapan-arab-kitab-pesantren.json
eval/                    evaluasi mutu AI terhadap set soal emas (butuh kunci API)
scripts/periksa-syamilah.mjs   pemeriksa berkas ekspor Syamilah
.github/workflows/       ci.yml (lint, tes, build) dan eval.yml (evaluasi manual)
test/                    npm test (tanpa kunci, tanpa internet); _sumberWeb.js, _fakeDb.js, _epub.js adalah pembantu tes
```

## Draf otomatis

Isian yang belum disimpan ke server (form soal, konfigurasi admin, pilihan Pengaturan AI, catatan review, teks Pegonizer, filter) dititipkan di `localStorage` per akun dan dipulihkan setelah muat ulang halaman. Kunci API tidak pernah disimpan di browser. Draf kedaluwarsa setelah 30 hari dan dihapus begitu berhasil disimpan. Di komputer bersama, tekan **Kosongkan** sebelum Keluar. Rincian dan batasan: `docs/RIWAYAT-AUDIT-DAN-PERUBAHAN.md` bagian 1 (pasal 9). Kodenya di `web/lib/draft.js`.

## Impor dan template Excel (menu Konfigurasi)

Admin bisa mengisi tingkat, kelas, sistem ujian, mapel, kitab, dan penempatan kitab sekaligus lewat Excel: **Konfigurasi > Impor & Template Excel**.

- **Unduh template**: berkas `.xlsx` dengan lembar Petunjuk dan contoh isian (baris berawalan `(contoh)` diabaikan saat impor).
- **Unduh konfigurasi saat ini**: isi konfigurasi sekarang dalam format yang sama, untuk disunting lalu diimpor kembali.
- **Impor dari Excel**: berkas dibaca di browser, diperiksa, lalu dimasukkan ke editor sebagai perubahan yang BELUM disimpan. Tekan Simpan konfigurasi untuk menerapkan; versi sebelumnya masuk ke Cadangan & Riwayat. Server tetap memvalidasi ulang saat Simpan.
- Lembar yang tidak ada atau kosong tidak mengubah apa pun. Cara memasukkan: *Tambah & perbarui* (aman) atau *Ganti seluruh daftar*.
- Kode: `web/lib/excelConfig.js` (murni, diuji di `test/excelConfig.test.js`) dan `web/ImporExcel.jsx`. Pustaka: `write-excel-file` dan `read-excel-file` (dimuat hanya saat dipakai).

## Analisis butir, riwayat versi, pencarian, offline

Ringkasan dan langkah pemasangan: `docs/RIWAYAT-AUDIT-DAN-PERUBAHAN.md` bagian 5. Setelah memperbarui kode, **terbitkan ulang `firestore.rules`** agar riwayat versi soal tercatat.
