# Penguatan AI: kamus istilah keilmuan Islam dan analisis pertanyaan (21 Nov 2026)

## Latar
Audit 18 Nov (`AUDIT-AI-KITAB-2026-11-18.md`) menambah metode membaca kitab dan peta teks, tetapi AI masih (1) hanya mengenal 8 disiplin (balaghah masuk nahwu, mushthalah masuk hadits, ulumul Qur'an dan tajwid masuk tafsir), (2) tidak punya kamus istilah: arti istilah bergantung ingatan model dan condong ke fiqih, dan (3) memahami pertanyaan hanya lewat satu panggilan rencana pencarian, tanpa memecah pertanyaan majemuk, mengenali fan, atau menyusun unsur jawaban.

## Perubahan
- `web/lib/kamusIlmuData.js` (baru): 752 istilah dari 16 fan, tiap istilah berisi bentuk Arab (ragam bentuk dipisah `/`), alias Indonesia, arti ringkas, dan penanda ambigu `a`. Fan: fiqih (138), faraid, ushul fiqih, qawaid fiqhiyyah, akidah dan ilmu kalam, tasawuf, akhlak, balaghah, tafsir (termasuk kitab tafsir utama), ulumul Qur'an, tajwid, mushthalah hadits, nahwu, sharaf, mantiq, sirah.
- `web/lib/kamusIlmu.js` (baru, tanpa AI): mengenali istilah di teks Arab (awalan و ف ب ل ك ال, frasa, ragam bentuk) dan di pertanyaan Indonesia, Arab, atau campuran (imbuhan: berwudhu, mengqashar, hukumnya). Istilah yang artinya berbeda antar fan (sunnah, hal, hadd, mutlaq, tasybih, dan sejenisnya) hanya ikut bila fannya cocok dengan konteks. Menyediakan blok `<istilah_teks>` dan kueri pencarian dari istilah.
- `web/lib/analisisPertanyaan.js` (baru, tanpa AI): jenis pertanyaan, fan yang tampak, istilah beserta arti, pemecahan pertanyaan majemuk ("beda wudhu dan tayammum, serta syaratnya" menjadi 3 bagian; "qadha dan qadar" tetap utuh), unsur jawaban per fan, dan susunan jawaban. Menyediakan blok `<analisis_pertanyaan>`, `<petunjuk_istilah>`.
- `web/lib/penelaahan.js`: jenis pertanyaan bertambah: `pembagian`, `hikmah`, `contoh`, `derajat` (masing-masing punya arahan menjawab). "Perbedaan wudhu dan tayammum" kini terbaca `perbandingan` (sebelumnya `umum`).
- `web/lib/petaTeks.js`: disiplin baru `balaghah` dan `mustalah` (pola mata pelajaran dan kata petunjuk); deteksi disiplin dari isi teks kini menangani kata berawalan و dan ف.
- `src/pemahamanKitab.js`: panduan 10 disiplin (dua baru, enam diperkaya: bab muamalah, waris, jinayat; klasifikasi sifat Allah; dalil vs metode vs kaidah; tiga lapis tafsir/ulumul Qur'an/tajwid; maqam vs hal). `blokPemahaman` kini juga memuat `<istilah_teks>`, jadi penyusunan soal, Paket Dauri, terjemah, analisis, telaah soal, dan ekstrak fakta ikut menerima istilah teks.
- `src/telaahKitab.js` (Tanya Kitab): padanan Arab istilah masuk prompt rencana (`<petunjuk_istilah>`); varian kueri dari istilah (maks. 3, berbobot rendah) membantu pertanyaan Indonesia menemukan halaman yang memakai istilah Arabnya; jawaban menerima `<analisis_pertanyaan>` dan `<istilah_teks>`. Batas jawaban 8 menjadi 12 kalimat, boleh berparagraf atau butir bernomor; ada aturan 11 (ISTILAH): bila halaman mendefinisikan lain, halaman menang. Tag pembatas baru dilindungi dari injeksi.
- `src/chatBebas.js`: menerima `<analisis_pertanyaan>` (fan, istilah, bagian pertanyaan) sebagai alat bantu.

## Prinsip yang dijaga
- Kamus dan analisis adalah ALAT BANTU memahami, bukan sumber isi; setiap blok berlabel itu. Jawaban Tanya Kitab tetap harus berkutipan yang terbukti di halaman (gagal-tertutup tidak berubah).
- Tidak ada panggilan AI tambahan. Input prompt bertambah kira-kira 400 sampai 900 token per panggilan Tanya Kitab, dan 150 sampai 400 token per panggilan teks Arab pada fitur lain.
- Arti di kamus netral dan mencantumkan perbedaan mazhab bila ada (fardhu vs wajib, batil vs fasid, waktu sujud sahwi, dan seterusnya). Aliran seperti Mu'tazilah hanya diberi arti netral sebagai pembanding.

## Yang perlu ditinjau ustadz sebelum rilis
Isi `kamusIlmuData.js` ditulis dari pengetahuan umum, bukan dari kitab perpustakaan: periksa terutama (1) rumusan definisi yang berbeda antar mazhab, (2) istilah tarjih dan fiqih Syafi'iyah (abadh/haiat, najis mughallazhah, qunut, radd), (3) uraian akidah (sifat dua puluh, kasb, tafwidh/takwil), (4) istilah tasawuf yang diperdebatkan (wahdatul wujud, hulul, ittihad, syathahat), dan (5) uraian kitab tafsir dan hadits. Menambah atau mengoreksi istilah cukup dengan mengedit satu baris di berkas data; tes `test/kamusIlmu.test.js` memeriksa keutuhan data.

## Tes
`test/kamusIlmu.test.js` (12 tes baru) dan 2 tes integrasi di `test/tanyaKitabLanjutan.test.js`. Satu tes lama (`tanyaKitabLanjutan`, halaman sambungan) disesuaikan: pertanyaannya diganti agar tidak memunculkan varian istilah yang kini menarik halaman 2 sebagai hasil langsung. Seluruh 1.057 tes yang bisa dijalankan lulus; 14 berkas tes lain gagal sama seperti sebelum perubahan karena paket `react`, `lucide-react`, dan sejenisnya tidak terpasang di lingkungan ini (jalankan `npm install` lalu `npm test`).

## Belum dilakukan
- Uji dengan model AI dan kitab sungguhan (tidak ada kunci API di sini). Disarankan mencoba 10 pertanyaan nyata dari tiap fan, terutama pertanyaan Indonesia yang istilahnya tidak ditulis persis seperti di kitab.
- UI belum menampilkan analisis pertanyaan; ia hanya bekerja di prompt. Jawaban kini bisa berparagraf: `TanyaKitab.jsx` sudah memakai `whitespace-pre-wrap`.
