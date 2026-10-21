# Skema database kitab (rancangan, belum dipasang)

Tujuan: teks kitab disimpan **sekali** di Firestore, soal hanya menunjuk ke halamannya, dan pemeriksa
kutipan (`public/kutipan.js`) bisa memeriksa soal terhadap teks yang sah. Semua dirancang agar muat di paket
Spark (tanpa kartu).

## Batas gratis yang menjadi dasar rancangan

Angka kuota Firestore Spark di bawah ini dari ingatan, bukan dari dokumen yang saya baca hari ini. Cek ulang di
Firebase Console > Usage sebelum bergantung padanya.

| Batas (Spark) | Nilai | Dampak pada rancangan |
|---|---|---|
| Baca per hari | 50.000 | Kitab TIDAK boleh dimuat otomatis. Dibaca hanya saat pengguna memilih halaman. |
| Tulis per hari | 20.000 | Impor kitab 500 halaman = 501 tulis. Batasi impor besar ke beberapa kitab per hari. |
| Simpanan | 1 GiB | Satu halaman Arab sekitar 2.500 huruf = sekitar 5 KB. 100 kitab x 500 halaman = sekitar 250 MB. |
| Ukuran dokumen | 1 MiB | Satu dokumen per halaman jauh di bawah batas ini. |

## Struktur

```
kitab/{kitabId}                       metadata kitab (satu dokumen per kitab)
kitab/{kitabId}/daftar/isi            daftar isi (satu dokumen, satu kali baca untuk navigasi)
kitab/{kitabId}/halaman/{halId}       satu dokumen per halaman cetak
soal/{id}                             (sudah ada) + dua field baru: kitabId, halId
```

### `kitab/{kitabId}`

`kitabId` berupa slug stabil, mis. `fathul-qarib`, `safinatun-naja`.

| Field | Tipe | Keterangan |
|---|---|---|
| `judul` | string | Judul Arab, mis. `فتح القريب المجيب` |
| `judulLatin` | string | Dipakai sebagai nama kitab di soal (mengisi field `nama`) |
| `pengarang` | string | Nama pengarang |
| `wafatH` | number, opsional | Tahun wafat pengarang (Hijriah) |
| `fan` | string | `fiqih`, `tauhid`, `akhlak`, `nahwu`, `sharaf`, `hadits`, `tafsir`, dll. |
| `mazhab` | string, opsional | `syafii`, `hanafi`, `maliki`, `hanbali`, atau kosong |
| `edisi` | map | `{ penerbit, muhaqqiq, tahun }`, untuk rujukan yang akurat |
| `jumlahHalaman` | number | Jumlah dokumen di `halaman` |
| `revisi` | number | Naik 1 setiap teks diubah. Dipakai untuk membatalkan cache di browser |
| `hakCipta` | map | `{ status: 'domain-publik' \| 'izin' \| 'belum-dicek', catatan }` |
| `sumber` | map | `{ jenis: 'syamilah-txt' \| 'shamela.ws' \| 'manual', host, bookId }` |
| `aktif` | bool | `false` menyembunyikan kitab dari pilihan tanpa menghapus datanya |
| `dibuatOleh`, `dibuatAt` | string, timestamp | Jejak impor |

### `kitab/{kitabId}/halaman/{halId}`

`halId` = `j{juz 2 digit}h{halaman 5 digit}`, mis. `j01h00045`. Dengan pola ini, rentang halaman bisa diambil dengan
query rentang pada ID dokumen tanpa indeks tambahan:
`orderBy(documentId()).startAt('j01h00045').endAt('j01h00049')` = 5 bacaan.

| Field | Tipe | Keterangan |
|---|---|---|
| `juz` | number | 1 bila kitab tidak berjilid |
| `hal` | number | Nomor halaman cetak |
| `bab` | string, opsional | Judul bab/fasal aktif di halaman ini |
| `teks` | string, maks 12.000 | Teks Arab sudah dibersihkan. Batas ini harus >= `MAX_TEKS` (6.000) |
| `halEstimasi` | bool | `true` bila nomor halaman ditebak parser (tidak ada penanda di berkas sumber) |
| `sumberUrl` | string, opsional | Tautan asal (untuk halaman hasil ambil dari situs) |

### `kitab/{kitabId}/daftar/isi`

```json
{ "bab": [ { "judul": "كتاب الطهارة", "juz": 1, "hal": 7 }, ... ] }
```

Satu dokumen berisi seluruh daftar isi. 2.000 bab sekitar 200 KB, jadi tetap di bawah 1 MiB. Pengguna memilih bab, lalu
aplikasi membaca halaman-halaman bab itu. Ini jalur navigasi utama dan hanya butuh 1 bacaan.

### Perubahan pada `soal/{id}`

Tambahkan `kitabId` (string, maks 100) dan `halId` (string, maks 20), keduanya boleh kosong untuk soal tempelan manual.
Field `teks`, `nama`, `juz`, `hal` yang sudah ada **tetap disimpan sebagai salinan**. Alasannya: bila teks kitab
dikoreksi belakangan, soal yang sudah disetujui tidak boleh berubah diam-diam, dan pemeriksa kutipan tetap bisa
memeriksa soal terhadap teks yang dipakai saat soal dibuat.

## Pencarian (tanpa biaya)

Firestore tidak punya pencarian teks penuh. Rancangan yang muat di Spark:

1. **Navigasi bab** lewat `daftar/isi` (1 bacaan), jalur utama.
2. **Pencarian di browser**: saat guru memilih "cari di kitab ini", aplikasi mengunduh seluruh halaman kitab itu sekali
   ke IndexedDB (kitab 500 halaman = 500 bacaan = 1% kuota harian), lalu mencari secara lokal memakai `normalisasi()` dari
   `kutipan.js` (harakat diabaikan). Cache dibatalkan bila `revisi` berubah.
3. Tidak disarankan: menyimpan indeks kata di Firestore. Itu melipatgandakan tulis dan simpanan.

## Pengisian data (impor)

| Jalur | Cara | Catatan |
|---|---|---|
| Ekspor Syamilah (.txt) | Admin mengunggah `.txt`, parser memecah per halaman berdasarkan penanda halaman | **Format penanda perlu contoh berkas nyata.** Bila tidak ada penanda, halaman dipecah per jumlah karakter dan diberi `halEstimasi: true` |
| Ambil dari situs (sudah ada) | Tombol baru "Simpan ke perpustakaan" setelah `/api/kitab` berhasil | Menjadi cache: halaman yang sama tidak diambil dari situs sumber dua kali, jadi lebih kecil kemungkinan diblokir |
| Tempel manual | Penyusun menempel teks | Tetap menjadi soal saja, tidak masuk perpustakaan kecuali admin menyetujui |

Impor dijalankan lewat endpoint server khusus admin (`/api/kitab-impor`, Admin SDK), bukan langsung dari browser. Alasannya:
aturan Firestore tetap ketat (klien tidak punya hak tulis ke `kitab`), dan tulis dari server tidak memicu pembacaan
tambahan untuk memeriksa peran di aturan. Batas ukuran badan permintaan fungsi Vercel sekitar 4,5 MB [Perkiraan], jadi
berkas besar harus dipecah di browser menjadi unggahan di bawah 1 MB.

## Draf aturan Firestore

Tambahkan di dalam `match /databases/{database}/documents`. Hanya staf yang membaca, klien tidak menulis sama sekali.

```
match /kitab/{kid} {
  allow read: if isStaff();
  allow write: if false;                      // impor lewat server (Admin SDK)
  match /halaman/{hid} { allow read: if isStaff(); allow write: if false; }
  match /daftar/{x}    { allow read: if isStaff(); allow write: if false; }
}
```

Untuk `soal`, agar klien lama tidak rusak saat rilis bertahap, jadikan dua field baru **opsional**, bukan wajib:

```
function wajibKeys() { return [ ...createKeys yang sekarang... ]; }
function opsiKeys()  { return ['kitabId', 'halId']; }
// create : d().keys().hasAll(wajibKeys()) && d().keys().hasOnly(wajibKeys().concat(opsiKeys()))
// update : changed().hasOnly(authorKeys().concat(opsiKeys()))
// validContent: tambahkan (!('kitabId' in d()) || (d().kitabId is string && d().kitabId.size() <= 100)), sama untuk halId
```

## Indeks: matikan pengindeksan `teks`

Firestore otomatis mengindeks setiap field string. Untuk teks Arab panjang itu memboroskan simpanan tanpa guna (kita tidak
pernah menyaring berdasarkan `teks`). Tambahkan pengecualian di `firestore.indexes.json`:

```json
{
  "indexes": [],
  "fieldOverrides": [
    { "collectionGroup": "halaman", "fieldPath": "teks", "indexes": [] },
    { "collectionGroup": "soal", "fieldPath": "teks", "indexes": [] },
    { "collectionGroup": "soal", "fieldPath": "pembahasan", "indexes": [] }
  ]
}
```

Efek ke ukuran simpanan belum saya ukur [Perkiraan]. Ini praktik umum untuk field teks besar.

## Urutan pengerjaan yang disarankan

1. Minta contoh berkas ekspor Syamilah (satu kitab kecil, mis. Safinatun Naja) untuk menulis parser yang benar.
2. Pasang aturan `kitab` dan field opsional `kitabId`/`halId` di `soal`, serta pengecualian indeks.
3. Tulis `/api/kitab-impor` dan parser, lengkap dengan tes memakai berkas contoh tadi.
4. Antarmuka: pilih kitab, bab, halaman, lalu isi otomatis `teks`, `nama`, `juz`, `hal`, `kitabId`, `halId` di form soal.
5. Tombol "Simpan ke perpustakaan" pada pengambilan dari situs.
6. Pencarian di browser (IndexedDB).

## Pertanyaan terbuka yang memengaruhi desain

- **Hak cipta.** Teks kitab klasik milik pengarang sudah domain publik, tetapi hasil tahqiq, catatan kaki, dan penomoran
  edisi modern bisa dilindungi. Parser pengambil situs sudah membuang catatan kaki (`hamesh`). Pastikan impor Syamilah
  juga hanya mengambil matan, dan isi `hakCipta.status` untuk tiap kitab.
- **Apakah perpustakaan dibagi antar madrasah?** Rancangan ini mengasumsikan satu madrasah, satu proyek Firebase.
  Bila ada beberapa madrasah, perlu koleksi `lembaga` dan aturan per lembaga.
