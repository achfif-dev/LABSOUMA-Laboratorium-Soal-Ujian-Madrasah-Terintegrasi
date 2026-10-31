# Skema database kitab (v2; impor sudah ada di kode, belum dicoba di Firestore sungguhan)

Revisi 29 Okt 2026 setelah dua berkas ekspor Syamilah nyata dibedah (Fathul Mu'in, 673 halaman; Fathul Qarib, 329 halaman).
Parser: `web/lib/syamilah.js` (dipakai browser dan server lewat `src/syamilah.js`), tes: `test/syamilah.test.js`,
pemeriksa tanpa menulis ke database: `node scripts/periksa-syamilah.mjs berkas.txt [seq]`.

## Yang berubah dari v1 dan alasannya

| v1 | v2 | Bukti dari berkas nyata |
|---|---|---|
| ID halaman `j01h00045` (juz+nomor cetak) | `p00045` = **urutan** halaman di berkas (`seq`) | Fathul Mu'in punya 32 nomor kembar dan 2 nomor mundur (91,91 ; 332,239,333 ; 534,523,534). Dengan ID v1, 34 halaman menimpa halaman lain tanpa error |
| `halEstimasi`, pembagian per jumlah karakter bila tanpa penanda | dihapus; berkas tanpa penanda ditolak (`TANPA_PENANDA`) | Kedua berkas punya penanda `(ص: N)` di tiap halaman. Tebakan tidak diperlukan |
| teks satu blok | `teks` + `batasMatn` (angka atau `null`) | Fathul Mu'in memisah matn (atas) dan syarah (bawah) dengan baris tatwil `ـ`. Satu string + satu angka, tanpa menggandakan simpanan |
| perkiraan 5 KB/halaman | rata-rata nyata sekitar 1,5 KB, terbesar 2,2 KB | 673 halaman = 990 KB; 329 halaman = 403 KB |
| catatan kaki dibuang "bila ada" | blok catatan kaki dan rujukan takhrij dibuang otomatis, dihitung di laporan | 115 halaman Mu'in dan 2 halaman Qarib punya catatan kaki; 170 rujukan `[البخاري رقم: …]` |

## Struktur

```
kitab/{kitabId}                  metadata (satu dokumen)
kitab/{kitabId}/daftar/isi       daftar isi (satu dokumen, satu bacaan)
kitab/{kitabId}/halaman/{halId}  satu dokumen per halaman, halId = p + seq 5 digit
soal/{id}                        field opsional baru: kitabId, halId
```

### `kitab/{kitabId}`
`judul`, `judulLatin` (diisi admin; dipakai sebagai nama kitab di soal), `pengarang`, `wafatH`, `fan`, `mazhab`,
`edisi {penerbit, muhaqqiq, cetakan}`, `jumlahHalaman`, `jumlahJuz`, `penomoranSesuaiCetak`,
`bentukMatn` (`pemisah-tatwil` | `tanpa-pemisah`), `berharakat`, `hakCipta {status, catatan}`,
`sumber {jenis, pengunggah, tanggalSyamilah}`, `formatParser`, `revisi`, `aktif`, `dibuatOleh`, `dibuatAt`.

### `halaman/{halId}`
| Field | Keterangan |
|---|---|
| `seq` | urutan 1..N, kunci sebenarnya |
| `juz`, `hal` | label cetak. **Bukan unik** |
| `teks` | Arab bersih (tanpa ZWNJ, catatan kaki, rujukan takhrij, baris pengisi). Maks 12.000, terbesar nyata 1.160 |
| `batasMatn` | `null` = tidak diketahui. Angka = panjang bagian matn; `teks.slice(0, batasMatn)` matn, sisanya syarah |
| `bab` | judul bab/fasal aktif sampai halaman ini |
| `nomorAnomali` | `duplikat` / `mundur` / `lompat`, hanya bila ada. Untuk ditampilkan sebagai peringatan, bukan galat |

### `daftar/isi`
`{ entri: [{ judul, level, juz, hal, seq }], jumlah, revisi }`. Level 1 = مقدمة/مدخل/كتاب, 2 = باب, 3 = فصل, 4 = sub-judul bertanda "•" (Fathul Qarib).
Nyata: Mu'in 70 entri, Qarib 210 entri, sekitar 6 KB.

### `soal/{id}`
Tambah `kitabId` (maks 100) dan `halId` (maks 20), opsional. `teks`, `nama`, `juz`, `hal` tetap disalin ke soal
(soal yang sudah disetujui tidak berubah bila teks kitab dikoreksi).
Bila bab melintasi beberapa halaman, UI harus menggabungkan halaman terpilih dan menolak bila lebih dari `MAX_TEKS` (6.000).

## Format berkas yang dikenali (pintu masuk: `web/lib/dokumenKitab.js`)
| Format | Pembagi halaman | Parser |
|---|---|---|
| `.txt` ekspor Syamilah | baris berakhiran `(ص: N)` | `syamilah.js` |
| `.docx` ekspor Syamilah, atau `.txt`/`.docx` lain | penanda sisip `[ص N]` di awal halaman, boleh di tengah kalimat | `penandaSisip.js` (+ `docx.js`, pembaca Word tanpa dependensi) |

Berkas **tanpa** penanda halaman (mis. hasil convert PDF biasa) tetap ditolak dengan petunjuk format: membagi halaman dengan menebak membuat rujukan halaman salah.
Bila mengonversi PDF ke Word memakai AI, minta penanda `[ص N]` ditulis di awal setiap halaman sesuai nomor cetak.
Dasar rancangan format `[ص N]`: Hasyiyah ad-Dasuqi 'ala Umm al-Barahin (.docx, Syamilah #8703): 261 halaman (hal. 5-265), 51 judul, 233 label lapisan dibuang.
Pada kitab berlapis (syarah + hasyiyah) label pemisah lapisan dibuang dan teks dibiarkan mengalir (`batasMatn: null`), karena kalimat hasyiyah melintasi label.
`sumber.jenis`: `syamilah-txt` | `syamilah-docx` | `teks-penanda`; `sumber.rujukan` memuat "Syamilah #id" bila terbaca.

## Impor (sudah dikodekan: `src/kitabImpor.js`, `api/kitab.js`, `web/KitabImpor.jsx`)
Menu: **Kelola > Perpustakaan** (admin saja).
1. Admin memilih `.txt`; berkas diparse di perangkat (`web/lib/syamilah.js`), lalu tampil pratinjau dan peringatan.
2. `impor-mulai`: server memvalidasi ulang metadata dan daftar isi dari daftar putih, menulis `kitab/{id}` dengan `status: "mengimpor"`, `aktif: false`, dan `daftar/isi` (`{ entri, jumlah, revisi }`).
3. `impor-halaman`: maksimal 100 halaman per panggilan (muatan nyata terbesar 158 KB). ID dokumen harus sama dengan `p`+urutan; klien tidak bisa memilih kunci lain.
4. `impor-selesai`: server menghitung ulang halaman tersimpan. Hanya bila sama dengan `jumlahHalaman`, kitab menjadi `status: "siap"`, `aktif: true`. Bila beda: 409 `KITAB_JUMLAH_BEDA`, kitab tetap tidak aktif.
5. Impor ulang ID yang sama ditolak (409 `KITAB_SUDAH_ADA`) kecuali "timpa": halaman lama dihapus dulu, `revisi` naik, kitab nonaktif sampai selesai.
6. `impor-daftar` dan `impor-aktif` (sembunyikan atau tampilkan kitab yang sudah siap).

Biaya per impor 673 halaman (Fathul Mu'in): 675 tulis (3,4% kuota tulis harian Spark, per angka di atas yang berasal dari ingatan). Dengan "timpa" ditambah 673 baca dan 673 hapus.
Fungsi Vercel tidak bertambah (tetap 11 berkas di `api/`). Pembatas laju impor: 60/menit dan 600/hari per admin.

Tambahan pada `kitab/{id}`: `status` (`mengimpor` | `siap`), `diubahAt`, `diubahOleh`.

## Pemilih kitab, bab, halaman (sudah dikodekan: `src/kitabBaca.js`, `web/lib/perpus.js`, `web/PemilihKitab.jsx`)
Muncul di **Penyusunan Soal > Rujukan Kitab** (mode ganti/tambah, maks 6.000 karakter) dan **Paket Dauri > Materi** (mode tambah; tiap halaman jadi sumber sendiri
dengan nomor cetaknya, sehingga rujukan hal. per segmen akurat, mis. "40–44").
- Pembacaan lewat server (`aksi: perpus-daftar | perpus-isi | perpus-halaman`, semua peran pemakai alat termasuk ustadz), bukan Firestore klien: berjalan tanpa menerbitkan aturan.
  Hanya kitab `siap` dan `aktif`. Maksimal 10 halaman per panggilan; klien mengambil jendela 5 halaman dan menyimpannya di memori.
- Mengisi `nama` (memakai ejaan katalog Konfigurasi bila cocok, supaya cakupan materinya berlaku), `juz`, `hal` (rentang terkecil-terbesar), `bab`, `teks`.
  Ganti teks mengosongkan `sumberUrl`; menambahkan halaman dari kitab lain ke teks yang sudah ada meminta konfirmasi.
- Kitab bertatwil (Fathul Mu'in) bisa dipilih bagian: matn + syarah, matn saja, syarah saja.
- Cari menurut nomor cetak. Nomor kembar (mis. 91 di Fathul Mu'in) menampilkan kedua halaman untuk dipilih.
- **`kitabId` dan `halId` belum disimpan di dokumen soal.** `firestore.rules` untuk `soal` memakai `hasOnly(...)`: menambah bidang baru sebelum aturan diterbitkan membuat penyimpanan semua soal ditolak.
  Menyimpannya (supaya soal bisa menautkan balik ke halaman sumber) membutuhkan perubahan aturan dan klien sekaligus; dikerjakan sebagai langkah terpisah.

## Aturan Firestore (draf, belum diuji di emulator)
```
match /kitab/{kid} {
  allow read: if isStaff();
  allow write: if false;
  match /halaman/{hid} { allow read: if isStaff(); allow write: if false; }
  match /daftar/{x}    { allow read: if isStaff(); allow write: if false; }
}
// soal: tambahkan 'kitabId' dan 'halId' ke daftar kunci opsional + validasi string (maks 100 / 20)
```
Pengecualian indeks `halaman.teks`, `soal.teks`, `soal.pembahasan` dari v1 tetap berlaku. Dampaknya pada simpanan belum diukur.

## Batas yang masih ada
- **Matn Fathul Qarib tidak terpisah** (`batasMatn: null`): matn Abu Syuja' ada di dalam kurung di tengah syarah. Bisa diekstrak dengan aturan kurung, tapi kurung juga dipakai untuk hal lain; belum dikerjakan.
- 7 halaman Mu'in tanpa pemisah (hal. 394, 441, 443, 522, 523, 556, 574): `batasMatn: null`.
- 1 halaman Mu'in (hal. 486) masih memuat penanda catatan kaki menempel ("درهم1"), dan 2 sisa rujukan takhrij yang formatnya tidak lazim.
- Format juz pada penanda berjilid (`ج: 2 ص: 45`?) **tidak terverifikasi**: kedua contoh satu jilid. Parser menebak pola itu. Kirim satu kitab berjilid sebelum dipakai.
- Halaman awal tidak ada di ekspor (Mu'in mulai hal. 31, Qarib hal. 19): itu muqaddimah muhaqqiq, bukan hilangnya data.
- Daftar isi hanya mencakup judul yang ditandai Syamilah. Kelengkapannya terhadap daftar isi cetak tidak bisa diperiksa dari berkas ini.
- **Hak cipta belum diputuskan.** Fathul Qarib berisi tahqiq dan sub-judul editor modern (Bassam al-Jabi). Teks pengarang klasik domain publik; hasil tahqiq bisa dilindungi. Parser membuang catatan kaki dan rujukan takhrij, tapi sub-judul "•" dan tanda baca editor tetap masuk. Status awal `belum-dicek`; saya bukan penasihat hukum.
