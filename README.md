# Bank Soal Madrasah (Vercel + Firebase Spark + Gemini gratis)

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
git init && git add . && git commit -m "Bank Soal Madrasah"
git branch -M main
git remote add origin https://github.com/<akun>/<repo>.git
git push -u origin main
```
Pastikan `git status` tidak menampilkan `.env` atau file kunci JSON. Repositori Private disarankan.

### 4. Vercel
1. https://vercel.com/new > pilih repositori. Framework Preset = **Other**. Jangan ubah Build Command.
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

## Batas gratis yang perlu diperhatikan

- **Firestore Spark:** contoh kuota di dokumen Firebase adalah 20.000 tulis dan 50.000 baca per hari. Bila habis, Firestore berhenti sampai bulan berikutnya. Aplikasi menyimpan salinan data di browser dan membatasi daftar soal ke 300 terbaru untuk menghemat bacaan. Untuk madrasah dengan puluhan pengguna, ini umumnya cukup, tetapi pantau di Firebase Console > Usage.
- **Gemini gratis:** jika muncul "Batas permintaan AI tercapai", itu kuota proyek habis. Tunggu atau ganti `AI_MODEL` ke `gemini-3.5-flash-lite`.
- **Vercel Hobby:** ketentuan wajarnya membatasi pemakaian ke personal non-komersial. Pastikan penggunaan Anda sesuai.
- Batas per pengguna di aplikasi (5 per menit, 60 per hari untuk AI) disimpan di Firestore dan bisa diubah lewat `LIMIT_*`.

## Mengganti penyedia AI

- Gemini (bawaan): `AI_PROVIDER=gemini`, `GEMINI_API_KEY=...`, model bawaan `gemini-3.8-flash`.
- Claude: `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY=...`, model bawaan `claude-sonnet-5-5`. Memerlukan kredit API Anthropic.
- Ubah model kapan saja dengan `AI_MODEL`.

## Keamanan

- Browser tidak pernah memegang kunci AI maupun kunci server. Setiap panggilan `/api/*` membawa token login Firebase, diverifikasi server, lalu peran diperiksa di Firestore.
- `firestore.rules` memaksa: hanya peran aktif yang bisa membaca soal; penyusun hanya mengubah soalnya sendiri saat Draft atau Perlu Revisi; hanya editor atau admin yang bisa menyetujui; peran hanya diubah admin. Profil pengguna hanya dibuat server.
- Server hanya mengambil teks kitab dari https di domain yang diizinkan (`KITAB_ALLOWED_HOSTS`), memeriksa ulang pengalihan, dan membatasi ukuran dan waktu.
- Jika kunci pernah bocor: Gemini, hapus dan buat ulang di AI Studio. Firebase, hapus kunci akun layanan di Google Cloud Console > IAM > Service Accounts > Keys dan buat baru, lalu perbarui env di Vercel dan Redeploy.

## Fitur teks kitab dan bantuan AI

- **Ambil teks dari tautan:** shamela.ws, al-maktaba.org, islamweb.net, ar.wikisource.org, archive.org (teks). Satu halaman per permintaan; nama kitab dan nomor halaman terisi dari judul halaman bila terbaca. Tautan sumber disimpan bersama soal. Struktur halaman situs bisa berubah; bila gagal, salin manual.
- **Maktabah Syamilah desktop:** berjalan offline di Windows dan tidak bisa diakses dari web. Salin teks atau ekspor ke .txt, tempel atau **Impor file .txt**, lalu **Bersihkan teks**.
- **Terjemahkan**, **Analisis teks** (ide soal per level, calon pengecoh), dan **Telaah & Perbaiki** (editor punya **Telaah AI** di tab Review). Semuanya berdasar teks Arab yang diberikan, dengan konteks Ahlussunnah wal Jamaah yang moderat. Hasil AI perlu ditelaah manusia.
- Pastikan pemakaian teks sesuai ketentuan situs sumber dan hak cipta edisi kitabnya.

## Struktur

```
public/index.html        frontend React (satu file)
api/                     fungsi Vercel: config, session, generate, assist, kitab
src/gemini.js            adapter Gemini (tanpa dependensi)
src/soalService.js       validasi, system prompt, pemilihan penyedia AI
src/assistService.js     terjemah, analisis, telaah soal
src/kitabFetch.js        pengambilan dan penyaringan teks kitab online
src/platform.js          Firebase Admin, autentikasi, peran, batas pemakaian
src/access.js            logika murni: peran, domain, batas
firestore.rules          aturan keamanan data
test/                    npm test (tanpa kunci, tanpa internet)
```
