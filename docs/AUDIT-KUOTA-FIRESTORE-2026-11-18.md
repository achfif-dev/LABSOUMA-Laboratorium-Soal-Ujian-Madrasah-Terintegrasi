# Audit kuota baca Firestore (paket Spark: 50.000 baca, 20.000 tulis, 20.000 hapus per hari)

Gejala: kuota baca habis (63 rb baca/24 jam), aplikasi menampilkan "Tidak bisa masuk – Server mengembalikan error 504".

## Penyebab
1. **Dua puluhan baca tersembunyi per permintaan.** Setiap panggilan API membaca `users/{uid}` (peran), ditambah transaksi `rate/*` (1 baca per batas; AI = 3 baca). Satu tindakan AI ≈ 4–5 baca.
2. **Pendengar realtime di klien dibaca ulang tiap halaman dimuat:** bank soal 100 dokumen, antrean review hingga 300, draf milik sendiri hingga 200, kamus Pegon penuh. Satu pemuatan bisa 300+ baca; ~150 pemuatan sehari menghabiskan kuota.
3. **Polling admin:** penanda kuota tiap 3 menit (3 baca per panggilan) dan dasbor tiap 2 menit memindai dokumen `rate` hari ini (+ `users` bila "semua").
4. **Daftar cadangan konfigurasi** (`configRiwayatApp/Ai`, hingga ~30 dokumen) dibaca ulang setiap tab konfigurasi dibuka (50 eksekusi ≈ 1.009 baca di Query Insights).
5. **504 bukan 503:** saat kuota habis, SDK terus mencoba sampai fungsi Vercel kehabisan waktu, sehingga pesan yang tampil hanya "504".

## Perbaikan
| Area | Perubahan | Dampak |
|---|---|---|
| `src/platform.js` | Cache peran per instance (`ROLE_CACHE_SECONDS`, bawaan 60 dtk, 0 = mati). Bila Firestore gagal, peran terakhir dipakai sampai 10 menit. | -1 baca di hampir tiap permintaan |
| `src/platform.js` | `denganBatasWaktu` (9 dtk) pada pembacaan peran, transaksi kuota, dan login: galat **503 FIRESTORE_LAMBAT** bukan 504. | Pesan jelas |
| `src/platform.js` | `firebaseError` memetakan RESOURCE_EXHAUSTED (kode 8) ke **503 FIRESTORE_QUOTA** + `Retry-After` 900 dtk, pesan menyebut reset ±15.00 WIB. | Pesan jelas |
| `src/configBackup.js` | Cache daftar riwayat 5 menit per jenis, dibuang saat ada perubahan (simpan/pangkas/hapus/titik/bersih). | ~20–30 baca per pembukaan tab -> 0 |
| `src/rute/admin-stats.js` | Cache hasil dasbor di server (ringkas 5 mnt, penuh 90 dtk); tombol Muat ulang melewati cache (`segarkan`). | Banyak tab/penyegaran = 1 pemindaian |
| `web/App.jsx` | Bank soal 100 -> 40 dokumen per halaman (sisanya "Muat lagi"); antrean review 300 -> 150; draf 200 -> 100; penanda kuota 3 -> 10 menit. | -60% baca per pemuatan |
| `web/Dasbor.jsx` | Polling 2 -> 5 menit. | -60% |

## Tidak diubah (disengaja)
- Pembangunan/pemuatan indeks pencarian kitab (`kitab/*/cari`): sudah di-cache di memori; hanya dibaca ulang saat cold start.
- `bersihriwayat`/`pangkasriwayat` (pindai `collectionGroup('riwayat')`): aksi manual admin; jalankan jarang (mis. sebulan sekali), jangan saat kuota menipis.
- Kuota `rate/*` per pengguna: tetap transaksi karena harus akurat lintas instance.

## Tindakan operasional
- Kuota reset harian sekitar **15.00 WIB** (tengah malam Pasifik). Aplikasi pulih sendiri setelah itu.
- Bila sering habis: beralih ke **Blaze** (bayar sesuai pemakaian, 50 rb baca/hari tetap gratis) dan pasang **budget alert**.
- Pantau di Firebase Console > Usage dan Query Insights.
- Perubahan peran admin kini berlaku maksimal ±1 menit di tiap instance (atur `ROLE_CACHE_SECONDS=0` bila tidak diinginkan).

Tes: `test/kuotaFirestore.test.js` (7 tes). Suite penuh: 14 kegagalan yang sama seperti sebelum perubahan (paket react/docx tidak terpasang), tanpa kegagalan baru.
