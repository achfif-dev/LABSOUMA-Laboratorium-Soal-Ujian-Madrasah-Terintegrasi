# Perubahan 29 Oktober 2026

Menindaklanjuti audit 29 Okt: gerbang persetujuan AI yang bisa dipalsukan (temuan 1) dan riwayat versi tanpa batas ukuran (temuan 3a).

## Masalah
`ai.verifikasi` dan `ai.buta` ditulis penyusun sendiri, lalu aturan Firestore memakainya untuk menentukan apakah editor wajib memberi catatan alasan.
Penyusun bisa menulis `lolos`/`sepakat` untuk soal yang kutipannya gagal atau uji butanya berbeda; editor tidak akan diminta alasan.

## Yang berubah
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

## Lanjutan: teks kitab dicocokkan dengan halaman sumber
Menutup batas pertama di bawah. Saat persetujuan, server mengambil halaman `sumberUrl` (lewat `kitabFetch`, daftar situs yang sama dengan `/api/kitab`) dan mencocokkan baris `teks` soal (>= 3 kata, tanpa harakat dan tanda baca, selisih <= 15% kata dianggap mirip). Kode: `src/sumber.js`.
- `cocok`: semua baris ada. `sebagian`: separuh atau lebih ada (wajar untuk teks gabungan beberapa halaman, karena `sumberUrl` hanya satu). Keduanya tidak mewajibkan catatan; editor hanya diberi tahu.
- `tidak_cocok`: kurang dari separuh baris ada di halaman sumber, yaitu teks hampir seluruhnya karangan atau dari halaman lain: **catatan alasan wajib**.
- `tanpa_sumber`, `tidak_terjangkau` (situs memblokir, waktu habis, halaman terpotong), `tanpa_teks`: tidak menyimpulkan apa pun. Isi `SUMBER_WAJIB=1` di Vercel agar dua yang pertama juga mewajibkan catatan alasan (bawaan mati, karena soal dari foto kitab tidak punya tautan).
- Pengambilan halaman dilakukan sebelum transaksi; bila `teks`/`sumberUrl` berubah selagi diperiksa, persetujuan ditolak (409).

## Urutan deploy (penting)
1. Deploy kode (Vercel) lebih dulu.
2. Baru terbitkan ulang `firestore.rules` (Firebase Console > Firestore > Rules > Publish).
   Bila urutannya terbalik, tombol Setujui di klien lama ditolak sampai kode baru aktif.
3. Muat ulang aplikasi dua kali agar service worker memuat versi baru.

## Batas yang masih ada (jujur)
- Pencocokan sumber hanya berlaku bila ada `sumberUrl` yang terjangkau. Penyusun yang sengaja mengosongkan tautan sumber (atau memakai situs yang memblokir server) melewatinya, kecuali `SUMBER_WAJIB=1`. Satu kalimat karangan yang disisipkan ke teks yang selebihnya asli juga tidak tertangkap (rasio masih di atas separuh).
- Uji buta bisa diulang sampai `sepakat` (hasil AI tidak deterministik); yang dihitung adalah hasil terakhir untuk isi yang sama.
- Admin masih bisa mengubah isi soal yang sudah Approved tanpa pemeriksaan ulang (admin dipercaya).
- Aturan Firestore belum diuji di emulator (tidak tersedia di lingkungan audit); hanya diuji lewat tes penjaga teks aturan.
- Fungsi Vercel kini 11 berkas di `api/`; batas paket Hobby (12) perlu dicek bila Anda menambah endpoint.

## Navigasi dua tingkat (grup dan sub-tab)
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
