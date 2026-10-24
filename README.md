# LABSOUMA: Laboratorium Soal Ujian Madrasah Terintegrasi (Vercel + Firebase Spark + Gemini gratis + Claude Ai (Wajib Tautkan Kredit/ Debit Card dan Deposit Min 5$))

Susunan tanpa kartu kredit:

| Bagian | Layanan | Biaya |
|---|---|---|
| Halaman dan API (`/api/*`) | Vercel Hobby | gratis, khusus pemakaian personal non-komersial |
| Login Google | Firebase Authentication (paket Spark) | gratis |
| Bank soal bersama dan peran pengguna | Cloud Firestore (paket Spark) | gratis dalam kuota harian |
| AI (soal, terjemah, analisis, telaah) | Gemini API tier gratis (bisa diganti Claude) | gratis, dengan batas |

Cloud Functions tidak dipakai karena butuh paket Blaze. Fungsi server ada di folder `api/`.

Peran: **pending** (baru daftar), **penyusun**, **editor** (menyetujui atau meminta revisi, tidak untuk soal buatannya sendiri), **admin** (mengelola pengguna dan semua soal), **nonaktif**.

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

   Opsional: `ALLOWED_EMAIL_DOMAIN`, `AI_MODEL`, `LIMIT_*`.
3. **Deploy.**
4. **Izinkan domain Vercel di Firebase** (wajib, kalau tidak login Google ditolak): Firebase Console > Authentication > Settings > **Authorized domains** > Add domain > isi domain Vercel Anda (mis. `nama-proyek.vercel.app`, dan domain kustom bila ada).
5. Buka situs, masuk dengan email admin. Akun itu otomatis menjadi admin. Guru lain yang masuk berstatus "Menunggu persetujuan" sampai Anda memberi peran di tab **Pengguna**.

Mengubah environment variable di Vercel hanya berlaku pada deploy berikutnya: lakukan Redeploy.

## Pegonizer (alih aksara Latin ke Pegon)

Tab **Pegonizer** menyatukan aplikasi Pegon ke dalam sistem ini (standar ortografi al-Qolam '24). Dipakai semua pengguna aktif.

- **Mesin aturan** berjalan di browser tanpa kuota AI: `web/lib/pegon.js` (sumber tunggal; `src/pegon.js` hanya meneruskannya ke server dan tes, sama seperti `kutipan.js`). Aturan master untuk prompt AI ada di `src/pegonRules.js`.
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
- **Plafon global:** selain batas per pengguna, ada plafon harian untuk seluruh madrasah (`LIMIT_GLOBAL_PER_DAY`, bawaan 1000 panggilan AI). Bila penuh, semua pengguna ditolak sampai besok (WIB). Sesuaikan dengan kuota penyedia Anda. Uji jawab buta dan telaah juga dihitung.

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
- **Gerbang persetujuan:** soal dengan kutipan "gagal" atau uji buta "beda" hanya bisa disetujui editor bila menulis catatan alasan (override), dan aturan Firestore menegakkannya. Catatan ini berdasarkan hasil yang dikirim aplikasi: ia jejak audit dan pengaman terhadap kelalaian, bukan pertahanan terhadap penyusun yang sengaja curang. Admin tetap bisa mengubah status langsung.
- **Terjemahan** ditandai sebagai draf mesin yang perlu ditinjau ustadz atau guru.
- **Tautan sumber** diisi penyusun dan tidak otomatis terikat ke teks yang disimpan; aturan Firestore hanya mensyaratkan `https://`. Editor perlu mencocokkannya.
- **Penolakan penyedia AI:** bila penyedia memblokir teks karena kebijakan keamanan, pengguna melihat pesan khusus (bukan galat generik). Penolakan ini tetap menghitung kuota.
- **Waktu:** satu panggilan AI dibatasi 45 detik (fungsi Vercel maksimal 60 detik). Claude tidak diulang otomatis; Gemini hanya diulang bila sisa waktu cukup.

### Evaluasi mutu AI (set soal emas)

Tes `npm test` hanya menguji kode (tanpa model sungguhan). Mutu keluaran model diukur terpisah:

1. Salin `eval/golden.example.json` menjadi `eval/golden.json`, lalu isi 20 sampai 30 kasus dari kitab yang Anda kuasai (campur L1/L2/L3, fiqih dan nahwu/sharaf, teks yang memuat khilaf, dan beberapa kasus `telaah` dengan soal yang sengaja dicacati). Isi contoh hanya ilustrasi: cocokkan dengan kitabnya.
2. Jalankan dari tab **Actions > Evaluasi AI > Run workflow** (butuh secret `GEMINI_API_KEY` atau `ANTHROPIC_API_KEY`), atau `npm run eval` di komputer.
3. Jalankan ulang tiap mengganti model atau prompt, lalu bandingkan angka lulusnya. Eval memakai kuota API sungguhan.

## Fitur teks kitab dan bantuan AI

- **Tautan per kitab:** di menu Konfigurasi, isi kolom *Tautan kitab* (mis. `https://shamela.ws/book/823`). Saat kitab itu dipilih di penyusunan soal, muncul tombol **Buka di situs** dan **Ambil halaman N**. Kolom **Tempel banyak kitab** menerima kolom ke-4 berisi tautan. Nomor di akhir alamat shamela.ws adalah urutan halaman situs, bukan selalu nomor halaman cetak.
- **Ambil teks dari tautan:** (tautan boleh ditempel tanpa `https://`; hasil di-cache 5 menit dan server mencoba ulang sekali bila situs sumber galat sementara) shamela.ws, al-maktaba.org, islamweb.net, ar.wikisource.org, archive.org (teks). Satu halaman per permintaan; nama kitab dan nomor halaman terisi dari judul halaman bila terbaca. Tautan sumber disimpan bersama soal. Struktur halaman situs bisa berubah; bila gagal, salin manual.
- **Maktabah Syamilah desktop:** berjalan offline di Windows dan tidak bisa diakses dari web. Salin teks atau ekspor ke .txt, tempel atau **Impor file .txt**, lalu **Bersihkan teks**.
- **Terjemahkan**, **Analisis teks** (ide soal per level, calon pengecoh), dan **Telaah & Perbaiki** (editor punya **Telaah AI** di tab Review). Semuanya berdasar teks Arab yang diberikan, dengan konteks Ahlussunnah wal Jamaah yang moderat. Hasil AI perlu ditelaah manusia.
- Pastikan pemakaian teks sesuai ketentuan situs sumber dan hak cipta edisi kitabnya.

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

## Pengembangan lokal

```bash
npm install
npm test            # tes server dan logika murni (tanpa kunci, tanpa internet)
npm run build       # bundel frontend ke dist/ (Vite)
vercel dev          # frontend (vite) dan fungsi api/ bersama; butuh variabel lingkungan seperti di Vercel
```

Frontend ada di `web/` (Vite, React, Tailwind sebagai build; tidak ada skrip CDN). Setelah mengubah `package.json`, commit juga `package-lock.json`.

## Struktur

```
index.html              pintu masuk Vite
web/main.jsx            memulai aplikasi (Firebase, React); web/globals.js memasang modul murni ke window
web/App.jsx             frontend React (satu berkas; dipecah per komponen di tahap berikutnya)
web/styles.css          gaya halaman + lapisan Tailwind (tailwind.config.js)
public/                 berkas statis: ikon, manifest
web/lib/drive.js        cadangan ke Google Drive: format, klien Drive, kandidat arsip (kode asli; src/drive.js untuk tes)
api/                     fungsi Vercel: config, session, generate, assist, kitab, ai-config, app-config, config-backup, backup
src/backup.js            pemulihan soal dari cadangan (validasi ketat, Admin SDK)
src/gemini.js            adapter Gemini (tanpa dependensi)
src/soalService.js       validasi, system prompt, pemilihan penyedia AI
src/assistService.js     terjemah, analisis, telaah soal
src/kitabFetch.js        pengambilan dan penyaringan teks kitab online
src/platform.js          Firebase Admin, autentikasi, peran, batas pemakaian
src/aiConfig.js          pengaturan AI dari admin (penyedia, model, kunci terenkripsi) dan uji koneksi
src/appConfig.js         konfigurasi aplikasi: tingkatan, kelas, sistem ujian, mata pelajaran, katalog kitab (dan pemetaannya)
web/lib/ujian.js          kelas, sistem ujian, penempatan kitab per kelas dan ujian (kode asli; src/ujian.js untuk server dan tes)
src/configBackup.js      cadangan dan riwayat konfigurasi (otomatis, titik pulih, perbandingan, pangkas)
src/secrets.js           enkripsi AES-256-GCM untuk kunci tersimpan
src/kutipan.js           pemeriksa kutipan Arab (kode asli: web/lib/kutipan.js)
src/sikap.js             pemeriksa nada soal (kode asli: web/lib/sikap.js)
src/babService.js       saran bab penting (aksi bab di /api/assist): validasi, pencocokan daftar isi, alokasi soal
src/aswaja.js            kerangka haluan Ahlussunnah wal Jamaah untuk prompt saran bab
web/lib/kisi.js           kisi-kisi dari soal: kelompok bab, cakupan, DOCX/CSV/teks (kode asli; src/kisi.js untuk server dan tes)
src/cekButa.js           uji jawab buta oleh model penguji
eval/                    evaluasi mutu AI terhadap set soal emas (butuh kunci API)
.github/workflows/       ci.yml (npm test) dan eval.yml (evaluasi manual)
src/access.js            logika murni: peran, domain, batas
firestore.rules          aturan keamanan data (bentuk soal: field opsional bentuk, jawaban, rubrik)
test/                    npm test (tanpa kunci, tanpa internet)
```

## Draf otomatis

Isian yang belum disimpan ke server (form soal, konfigurasi admin, pilihan Pengaturan AI, catatan review, teks Pegonizer, filter) dititipkan di `localStorage` per akun dan dipulihkan setelah muat ulang halaman. Kunci API tidak pernah disimpan di browser. Draf kedaluwarsa setelah 30 hari dan dihapus begitu berhasil disimpan. Di komputer bersama, tekan **Kosongkan** sebelum Keluar. Rincian dan batasan: `docs/LAPORAN-AUDIT.md` bagian 9. Kodenya di `web/lib/draft.js`.
