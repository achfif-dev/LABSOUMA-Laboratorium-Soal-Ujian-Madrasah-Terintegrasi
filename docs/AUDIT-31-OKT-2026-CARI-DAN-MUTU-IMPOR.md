# Audit 31 Okt 2026: pencarian teks Baca Kitab dan mutu impor kitab

## Temuan
1. **Tab Baca Kitab tidak punya pencarian isi.** Yang ada hanya penyaring judul bab dan lompat ke nomor halaman cetak. Mencari satu kalimat di kitab 600 halaman berarti membuka halaman satu per satu.
2. **Pencarian isi tidak bisa dibuat dengan membaca halaman biasa.** Firestore tidak punya pencarian teks penuh, dan satu kitab bisa 5.000 halaman; membacanya per pencarian menghabiskan kuota baca harian paket Spark (50 ribu) dalam beberapa kali coba.
3. **Impor tidak memeriksa ISI teks, hanya bentuknya.** Parser memastikan halaman, nomor, dan bab; teks rusak (PDF dengan pemetaan huruf buruk: huruf terpisah, urutan terbalik, karakter pengganti, UTF-8 terbaca sebagai Latin-1) lolos dan baru ketahuan setelah soal dibuat dari kutipan itu.
4. **PDF: judul berjalan dan nomor halaman ikut tersimpan** di awal/akhir tiap halaman, mengotori kutipan ke soal. Nomor cetak hanya ditebak dari urutan halaman PDF + nomor awal isian admin, padahal sampul dan pengantar menggeser hitungan.
5. **Pratinjau impor hanya menampilkan 500 karakter halaman pertama**, yaitu halaman yang paling tidak mewakili isi kitab (sampul/judul).
6. **Bentrokan dengan kitab yang sudah ada baru ketahuan dari galat server (409).** Tidak ada peringatan bila judul Arab yang sama sudah diimpor dengan ID lain, atau bahwa "timpa" menghapus halaman lama.
7. **`peringatanPratinjau` dipanggil di badan render** layar impor. Setelah ditambah pemeriksaan mutu yang menyisir seluruh teks, ia akan berjalan di setiap ketikan pada kolom Nama kitab bila tidak diingat.
8. Dicek dan baik: tiap `api/*.js` memakai autentikasi sesuai peran (kecuali `config.js`, memang publik); pengambil kitab dari situs memakai daftar host, https saja, tanpa kredensial/port; `sw.js` tidak menyentuh `/api/`; tidak ada kunci rahasia di repo; `.gitignore` menutup `.env` dan kunci layanan.

## Perubahan
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

## Yang perlu dilakukan saat memasang
1. **Terbitkan `firestore.rules`** (hanya menambah aturan tutup untuk `cari/*`; pencarian tetap jalan tanpa itu karena lewat server, tetapi klien tidak boleh membaca indeks).
2. Muat ulang aplikasi dua kali (service worker).
3. Buka tab Baca Kitab pada kitab yang sudah ada, cari satu kata. Kitab besar akan menyiapkan indeks dulu (beberapa detik sampai setengah menit, satu kali). Cek di Firestore bahwa `kitab/<id>/cari/meta` berstatus `siap`.
4. Impor ulang satu PDF nyata dan baca peringatan serta pratinjau (awal, tengah, akhir) sebelum menekan impor.

## Belum teruji (jujur)
- **`npm run build` dan 8 berkas tes tampilan tidak bisa dijalankan** (registry npm ditolak di lingkungan audit). Sintaks JSX dan nama variabel `PembacaKitab.jsx` dan `KitabImpor.jsx` diperiksa dengan `tsc`; tampilannya **belum dilihat di browser** (tab, sorotan, tampilan HP). Jalankan `npm test` dan `npm run build` di komputer Anda.
- Pencarian diuji dengan Firestore tiruan, bukan Firestore sungguhan: waktu bangun indeks kitab besar (5.000 halaman) belum terukur. Anggaran 5,5 detik per panggilan sengaja jauh di bawah `maxDuration` 60 detik.
- Pembersih PDF diuji dengan teks sintetis lewat jalur `bacaDokumenKitab` -> `parsePdf`, bukan PDF nyata melalui pdfjs. Ambang (30% halaman, 70% kesepakatan nomor) wajar tetapi belum diuji pada koleksi PDF kitab; periksa pratinjau pada PDF pertama Anda.
- Pemeriksa mutu diuji pada teks sintetis; ambang (mis. 20% kata satu huruf, 1% kata >= 22 huruf) belum dikalibrasi pada kitab nyata. Semua temuan bertingkat peringatan kecuali kerusakan jelas (mojibake, karakter pengganti > 0,5%, terbalik, huruf terpisah, bukan Arab).

## Catatan yang tidak diubah
- `perpus-*` tetap tanpa pembatas laju (pembatas laju menulis satu dokumen per panggilan dan menggerus kuota tulis Spark). Pencarian paling berat di antaranya, tetapi murah setelah indeks ada di memori; pantau kuota baca bila pemakai banyak.
- Pencarian hanya di satu kitab yang sedang dibuka. Pencarian lintas kitab membutuhkan membaca indeks semua kitab per pencarian (puluhan sampai ratusan pembacaan); belum dikerjakan.
- Perubahan aturan normalisasi (mis. menambah varian huruf) = naikkan `VERSI_INDEKS` di `web/lib/cariKitab.js`; indeks lama dibangun ulang sendiri.
