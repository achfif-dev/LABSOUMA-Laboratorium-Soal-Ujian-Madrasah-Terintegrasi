# Alur editor bertahap (1 sampai 3 editor) dan filter penyusun

## Alur
Penyusun → editor 1 → (revisi ke penyusun) → editor 2 → (revisi) → editor 3 → (revisi) → editor 3 menyetujui → Approved.

- Setelah penyusun merevisi, soal langsung ke editor berikutnya.
- **Tahap terakhir:** setelah revisi tahap terakhir, soal kembali ke editor terakhir untuk disetujui. Approved harus tindakan editor dan lewat gerbang kutipan/uji buta/sumber di server.
- Editor boleh **meloloskan tanpa revisi** ("Loloskan ke Editor N"), jadi revisi tidak wajib di setiap tahap.
- Satu editor tidak boleh meninjau dua tahap berbeda pada soal yang sama.
- Admin bisa meninjau tahap mana pun.

## Pengaturan admin
- **Konfigurasi → Alur Editor Bertahap:** nonaktif (satu editor mana pun, seperti dulu) atau aktif dengan jumlah tahap standar dan jumlah tahap per mata pelajaran (fan).
- **Pengguna → Tahap editor:** centang tahap 1/2/3 untuk tiap editor. Mapel yang hanya 1 tahap bisa ditinjau editor mana pun.
- Pengaturan disimpan di dokumen terpisah `config/alur` (tidak tersentuh simpan/reset konfigurasi utama).

## Filter
Bank Soal: filter **Penyusun** (nama dan jumlah soal) dan **Tahap Editor** (soal Pending yang menunggu editor N; tampil bila alur aktif).

## Yang berubah di kode
- `web/lib/alurSoal.js` (aturan murni), `src/alurSoal.js`, `src/alurEditor.js` (baca/simpan `config/alur`).
- `src/review.js`: `setujui` sadar tahap; `mintaRevisi` baru. `api/assist.js`: aksi `revisi`. `api/app-config.js`: aksi `alursimpan`, dan `baca` menyertakan `alur`.
- `firestore.rules`: admin boleh set `tahapEditor` pada profil; klien tidak lagi bisa menulis status `revision` (lewat server); `tahap` dan `tinjauan` hanya ditulis server.
- Tes: `test/alurSoal.test.js`, tambahan di `test/review.test.js`; beberapa tes teks-aturan diselaraskan dengan refactor `validContent(x)`.

## Urutan penerapan (penting)
1. Unggah kode (semua berkas kecuali `firestore.rules`) dan tunggu deploy selesai.
2. Baru terbitkan `firestore.rules`. Bila rules terbit lebih dulu, tombol "Minta Revisi" di aplikasi lama akan ditolak.
3. Masuk sebagai admin: tugaskan tahap ke tiap editor, lalu aktifkan alur.

## Batasan yang diketahui
- Penegakan tahap ada di server. Tanpa menerbitkan rules terbaru, editor yang paham teknis masih bisa menulis status `revision` langsung ke Firestore.
- Admin yang mengubah soal Approved kembali ke Pending dari klien tidak mereset `tahap`; soal bisa masuk di tahap lama.
- Pemulihan dari cadangan tidak membawa `tahap` dan `tinjauan`; soal Pending hasil pulih mulai lagi dari tahap 1.
- Bila pengaturan alur gagal dibaca server, persetujuan/revisi ditolak sementara (503) dan tidak melonggarkan pemeriksaan.
