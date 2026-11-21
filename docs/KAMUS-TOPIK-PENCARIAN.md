# Kamus Topik untuk Pencarian Halaman (Tanya Kitab)

Kamus topik ini membantu MENEMUKAN halaman. Ia pelengkap `web/lib/kamusIlmuData.js` (arti istilah untuk MEMAHAMI teks): kamus ilmu menjawab "apa arti ini", kamus topik menjawab "di kitab, topik ini ditulis dengan nama apa dan kata apa yang ada di halamannya". Isinya hanya NAMA topik dan KATA KUNCI, bukan isi hukum, jadi tidak pernah dikutip sebagai sumber jawaban.

## Lokasi
- `web/lib/kamusTopikFiqh.js`: fiqih ibadah, muamalat, munakahat, jinayat, faraidh
- `web/lib/kamusTopikIlmu.js`: akidah, tasawuf, akhlak, ushul, qawaid, balaghah, nahwu, sharaf, tafsir, ulumul Qur'an, tajwid, mustalah, hadits, sirah, mantiq, istilah mazhab
- `web/lib/kamusTopik.js`: pemuat dan pencocok (jangan diubah untuk menambah istilah)

## Format satu baris
`fan | sebutan Indonesia; sebutan lain | istilah Arab di kitab; istilah lain | kata isi khas`

Contoh: `fiqh_ibadah|zakat sapi; zakat kerbau|زكاة البقر; زكاة النعم|تبيع; مسنة; ثلاثين; أربعين`

- Kolom 1: salah satu id fan (lihat `FAN_TOPIK` di kamusTopik.js).
- Kolom 2: cara orang bertanya, termasuk variasi ejaan (wudhu/wudu, shalat/sholat).
- Kolom 3: nama topik seperti tertulis di kitab, tanpa harakat. Yang pertama jadi kueri utama.
- Kolom 4: kata yang biasanya ADA di halaman jawaban. Dua kata pertama dipakai sebagai kueri pasangan, jadi taruh yang paling khas di depan.
- Jangan memakai tanda `|` atau `;` di dalam isian. Baris berawalan `#` adalah komentar.

## Aturan agar tidak jadi derau
- Kata Indonesia biasa (hal, sifat, jumlah, sama, perang, dst.) tidak memicu entri sendirian; gunakan frasa. Daftarnya `ALIAS_UMUM` di kamusTopik.js.
- Satu sebutan tidak boleh ganda dalam satu fan (dijaga tes). Tumpang tindih lintas fan boleh.
- Keluarga kata (`KELUARGA_*` di file data) hanya untuk bentuk kata dan sinonim SEJATI, bukan kata yang sekadar berkaitan.

## Cara kerja ringkas
1. Pertanyaan (dan dua pertanyaan pengguna terakhir) dicocokkan ke kamus topik oleh kode, tanpa AI: paling banyak 2 entri untuk petunjuk perencana (`<petunjuk_topik>`), skor rendah dibuang.
2. Setelah AI menyusun kueri, kamus dicocokkan lagi dengan kueri Arab itu; dari entri yang cocok dibuat paling banyak 4 kueri tambahan berbobot rendah (varian), bersama varian dari kamus istilah.
3. Kueri yang hanya berisi kata umum (`باب`, `فصل`, ...) dibuang kode (`saringKueriUmum`), karena kueri itu menyedot slot halaman dengan halaman acak.
4. AI penjawab mengisi `rincian` (status tiap bagian pertanyaan dari `<analisis_pertanyaan>`): terjawab, sebagian, atau tidak_ada. UI menampilkannya.
5. Verifikasi kutipan tidak berubah: tanpa kutipan yang cocok, jawaban tidak ditampilkan.

Setelah mengubah kamus jalankan `npm test` (tes `kamusTopik.test.js` memeriksa format, duplikat, dan bahwa tiap entri terjangkau).
