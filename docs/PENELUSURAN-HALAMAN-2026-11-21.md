# Menelusuri halaman sesudah/sebelum di Tanya Kitab (21 Nov 2026)

## Latar
Tanya Kitab hanya membaca halaman hasil pencarian kata kunci. Bila jawabannya ada di halaman tetangga (daftar syarat yang berlanjut, definisi di awal bab, uraian yang terpotong), AI berhenti dengan "tidak ditemukan" dan pengguna harus membuka kitab sendiri.

## Cara kerja
- Pengguna mengetik "halaman selanjutnya", "lanjutkan", "halaman sebelumnya", dan sejenisnya, atau menekan tombol di bawah jawaban terakhir. `niatLanjut` (`web/lib/telaahKitab.js`) hanya menerima pesan pendek yang seluruhnya berupa permintaan itu; pertanyaan biasa yang memuat "setelah" atau "lanjut" tidak dianggap.
- Setiap hasil Tanya Kitab membawa `penelusuran` ({kitabId, maju, mundur, jumlahHalaman, adaSesudah, adaSebelum}) = batas halaman yang sudah dibaca dari kitab teratas. Klien mengirimnya kembali sebagai `lanjut`.
- Server (`src/telaahKitab.js`) membaca `MAKS_HALAMAN_LANJUT` (3) halaman berurutan sesudah `maju` atau sebelum `mundur`, TANPA rencana pencarian, lalu menjawab PERTANYAAN ASAL (pesan pengguna terakhir di riwayat yang bukan permintaan menelusuri). Batas diperbarui di hasil, jadi bisa diulang sampai ujung kitab.
- Gagal-tertutup tidak berubah: tiap butir wajib berkutipan yang terbukti di halaman yang dibaca; kutipan tetap diverifikasi kode.
- Biaya: 1 panggilan AI (bukan 2) + 1 pembacaan metadata kitab + sampai 3 pembacaan halaman Firestore.
- Di ujung kitab: tidak ada panggilan AI, hanya catatan "sudah sampai halaman terakhir/pertama".
- UI menampilkan "Halaman yang dibaca AI" pada setiap jawaban dan dua tombol penelusuran.

## Keamanan
`lanjut` datang dari klien: kitab divalidasi (id, aktif, siap), arah dan nomor halaman divalidasi bilangan bulat dan dibatasi; tag `<lanjutan>` dilindungi dari injeksi seperti tag lain.

## Batas
- Hanya satu kitab per penelusuran (kitab teratas pada pencarian awal).
- Jawaban lanjutan hanya melihat halaman baru; jawaban sebelumnya masuk sebagai riwayat (bukan sumber).
- Penelusuran otomatis oleh AI (tanpa diminta) belum ada; sengaja, untuk menjaga biaya.
- Tes: `test/telusuriHalaman.test.js` (6 tes). Komponen React belum diuji di lingkungan ini (paket react tidak terpasang); sintaks JSX diperiksa dengan tsc.
