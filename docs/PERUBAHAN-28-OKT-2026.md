# Perubahan 28 Oktober 2026

Menindaklanjuti audit: penggantian nama, analisis butir, riwayat versi, pencarian, dan offline.

## Yang berubah
1. **Dawr menjadi Dauri** di semua tampilan, teks, dan nama fungsi. Kunci data `dawr` di Firestore sengaja tetap (lihat `docs/AUDIT-PAKET-DAURI.md`).
2. **Tab Analisis Butir** (penyusun, editor, admin; bukan ustadz). Tempel hasil ujian dari Excel/Sheets: kesukaran, daya beda (kelompok atas-bawah 27%), korelasi butir-total, fungsi pengecoh, KR-20, saran per soal, unduh CSV. Diproses di perangkat, tidak dikirim ke server. Kode: `web/lib/analisisButir.js`, `web/AnalisisButir.jsx`.
3. **Riwayat versi soal.** Saat soal yang sudah ada disimpan ulang dan isinya berubah, versi lama disalin ke `soal/{id}/riwayat`. Dilihat dari form edit ("Lihat riwayat versi soal ini"); versi lama bisa dimuat ke form. Kode: `web/lib/riwayat.js`.
4. **Pencarian teks di Bank Soal** (Latin tanpa peka huruf; Arab tanpa harakat dan variasi alif/ya/ta marbuthah). Kode: `web/lib/cariSoal.js`.
5. **Cangkang aplikasi offline** lewat `public/sw.js` (hanya halaman dan berkas statis; `/api/*` dan Firebase tidak disentuh).
6. **Integrasi antartab.**
   - Bank Soal: tombol **Ke Export** dan **Ke Fokus Ujian** pada tiap soal Approved, serta **Kirim ke Export/Fokus Ujian** untuk semua soal Approved hasil filter. Tab tujuan terbuka dengan soal itu sudah terpilih.
   - Paket Dauri: setelah paket disimpan, Bank Soal otomatis terbuka pada paket itu (semua status), siap ditelaah dan dikirim ke editor.
   - Analisis Butir: pilihan **Hubungkan dengan paket** mengisi kunci dari soal (urut seperti naskah), menampilkan soal di hasil, dan memberi tombol membuka soal bermasalah untuk diperbaiki.
   - Serah-terima lewat draf perangkat (`web/lib/serahTerima.js`, dijaga `test/serahTerima.test.js`); tidak ada perubahan aturan Firestore.
7. **Filter Kitab dan Bab di Bank Soal** (`web/lib/saringKitab.js`). Ejaan berbeda ("Safinatun Naja", "safinatun  naja ") digabung; pilihan Bab hanya dari kitab terpilih, diurut angka alami (Bab 2 sebelum Bab 10); jumlah soal ditampilkan; soal tanpa kitab/bab punya pilihan sendiri. Filter ini ikut tersimpan per perangkat.

## Wajib dilakukan setelah deploy
- **Terbitkan ulang `firestore.rules`** (Firebase Console > Firestore > Rules > tempel isi file > Publish). Tanpa ini, riwayat versi tidak tercatat, tetapi menyimpan soal tetap berhasil (ada cadangan otomatis di `commit`).
- Setelah deploy pertama, muat ulang halaman dua kali agar service worker aktif.

## Belum dikerjakan (disengaja)
- `eval/golden.json`: kunci dan kebenaran fiqihnya harus ditetapkan ustadz, bukan AI.
- Pemecahan `web/App.jsx` per tab: perlu diuji di perangkat nyata, dilakukan bertahap.
