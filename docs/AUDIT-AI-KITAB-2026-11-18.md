# Audit AI: kemampuan menelaah dan memahami kitab (18 Nov 2026)

## Temuan
1. **Aturan baca tersebar dan dangkal.** Tiap fitur (soal, paket, terjemah, analisis, telaah, uji buta, fakta, Tanya Kitab, chat) menulis aturannya sendiri, hampir semuanya hanya "setia pada teks". Tidak ada panduan untuk jebakan baca kitab turats: pembatas dan pengecualian (إلا، غير، ما لم), negasi (لا ... إلا), kata hukum (wajib vs sah, boleh vs sunnah, "لا يجب"), lapisan matan/syarh/hasyiyah, pendapat yang hanya dinukil (قيل) vs pegangan, istilah tarjih (الأصح، الأظهر، المعتمد), teks terpotong.
2. **Contoh prompt condong ke fiqih.** Nahwu/sharaf, akidah, hadits, ushul, tasawuf, tafsir, dan sirah tidak punya arahan khas (apa yang boleh diuji, jebakannya).
3. **Tanya Kitab, pencarian:** kueri hanya dari 1 sampai 4 istilah AI; tanpa variasi bentuk kata (يجب/وجوb/فرض); pertanyaan majemuk bisa kehilangan salah satu bagian; halaman yang lebih dari 3500 karakter dipotong di kepala (bagian relevan di ujung halaman tidak pernah terbaca AI); kalimat yang melewati batas halaman terputus.
4. **Tanya Kitab, jawaban:** tidak membedakan pendapat pegangan dari pendapat yang dinukil, tidak menyebut penanda tarjih, tidak menyesuaikan cara menjawab dengan jenis pertanyaan.
5. **Telaah soal dan uji buta:** tidak diminta memeriksa apakah pengecoh ternyata benar karena pengecualian, atau apakah kunci/pembahasan menukar kata hukum.
6. **Terjemah dan analisis:** keambiguan hanya bisa ditaruh di "istilah"; analisis tidak memetakan lapisan, alur, istilah kunci, dan peringatan baca.

## Perubahan
- `web/lib/petaTeks.js` (baru, tanpa AI): peta teks deterministik: disiplin, lapisan, judul, kata hukum (dengan negasi), pembatas, istilah tarjih, khilaf, bilangan, kondisi teks (terpotong, menggantung, OCR, harakat).
- `src/pemahamanKitab.js` (baru): satu sumber metode baca kitab (A sampai G) dan panduan 8 disiplin ilmu. Dipasang ke system prompt (khusus teks Arab) dan peta teks ke prompt pengguna di: penyusunan soal, Paket Dauri, terjemah, analisis, telaah soal, ekstrak fakta, Tanya Kitab. Uji buta dan chat bebas mendapat versi ringkas.
- `web/lib/penelaahan.js` (baru): jenis pertanyaan, varian kueri dari 34 keluarga istilah, peringkat beragam (tiap bagian pertanyaan terwakili), halaman sambungan, potongan halaman di sekitar kata kunci.
- `src/telaahKitab.js`: rencana AI juga menetapkan jenis pertanyaan; jawaban butir berlabel `lapisan` dan `sifat`, plus `tarjih`; peringatan bila seluruh dasar jawaban adalah pendapat yang dinukil; tag blok baru dilindungi dari injeksi.
- `src/assistService.js`: terjemah mendapat `catatan_baca`; analisis mendapat `lapisan_teks`, `struktur`, `istilah_kunci`, `peringatan_baca` (field baru hanya muncul bila terisi, jadi klien lama tidak berubah); telaah soal mendapat 6 langkah pemeriksaan baca teks.
- UI: `TinjauanView.jsx` dan `TanyaKitab.jsx` menampilkan field baru.
- Tes: `test/pemahamanKitab.test.js`, `test/tanyaKitabLanjutan.test.js` (baru); 4 tes "prompt tidak berubah" disesuaikan karena prompt Arab memang sengaja bertambah.

## Biaya dan batas
- Tidak ada panggilan AI tambahan. Input prompt bertambah sekitar 1.000 sampai 1.500 token per panggilan Arab; Tanya Kitab bisa membaca sampai 2 halaman sambungan (2 pembacaan Firestore tambahan).
- Peta teks adalah heuristik: bisa keliru (mis. "سنة" = tahun) dan selalu diberi label alat bantu di prompt.
- Uraian istilah tarjih mengikuti kebiasaan kitab Syafi'iyah; kitab mazhab lain punya padanannya sendiri dan prompt meminta AI tidak melabeli bila ragu. Mohon ditinjau ustadz.
- Belum dilakukan: uji dengan model AI sungguhan dan kitab sungguhan (tidak ada kunci API di sini), dan pembangunan UI penuh (tes UI butuh paket react yang tidak terpasang). Disarankan menjalankan `npm test` penuh dan mencoba 10 pertanyaan nyata dari tiap fan sebelum rilis.
