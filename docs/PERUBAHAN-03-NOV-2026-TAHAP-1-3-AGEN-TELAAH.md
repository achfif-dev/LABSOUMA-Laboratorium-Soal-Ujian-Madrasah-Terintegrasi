# Perubahan 3 Nov 2026: agen telaah kitab, tahap 1 (tanya-jawab bersumber) dan tahap 3 (soal vs halaman rujukan)

## Audit perubahan sebelumnya (koreksi kitab dan otoritas Aswaja)
Diperiksa pada salinan baru repo (commit 2819c50). Seluruh suite lulus (673 lulus, 1 dilewati) dan `vite build` lolos, jadi kekhawatiran dokumen lama tentang 8 berkas yang tidak teruji (paket gagal terpasang di lingkungan audit saat itu) tidak berlaku di lingkungan dengan paket lengkap.

Diuji ulang oleh audit ini: `test/koreksiTambah.test.js` (koreksi pada jilid tambahan, indeks pencarian ikut berubah dan jilid lain tak tersentuh; koreksi sebelum dan sesudah impor ulang bertahap). Tidak ditemukan cacat pada interaksi koreksi, tambah jilid, dan impor ulang. Aturan Firestore: subkoleksi baru (`koreksi`, `otoritasRiwayat`, `impor`, `halaman_rN`, `cari_rN`) tidak punya aturan, jadi tertutup bagi klien; tidak perlu perubahan.

Temuan yang belum diperbaiki:
1. Dokumen otoritas menyebut uji buta memakai `q.kitabId`, tetapi `cekbuta` tidak ada di `PAKAI_KITAB` (`api/assist.js`) sehingga uji buta tidak membaca otoritas. Perbaiki dokumennya, atau tambahkan `cekbuta` bila memang diinginkan (prompt uji buta belum memuat baris otoritas).
2. Kunci simpanan pencarian memuat penghitung `koreksi`. Tiap koreksi membuat semua mesin server membuang indeks tersimpan; pencarian berikutnya membaca ulang puluhan dokumen per kitab. Wajar untuk koreksi jarang, terasa pada kuota baca Spark bila editor mengoreksi banyak halaman beruntun sambil orang lain mencari atau bertanya.
3. `perpus-riwayat` membaca seluruh arsip koreksi satu halaman lalu memotong 10. Biaya tumbuh seiring riwayat; beri `orderBy` dan `limit` bila satu halaman bisa punya puluhan koreksi.
4. `peringatanOtoritas` memberi peringatan untuk semua kitab `belum_dinilai` (termasuk seluruh kitab lama), jadi toast muncul di tiap generate dan telaah sampai admin menetapkan status. Sengaja, tetapi bising: tetapkan status kitab yang dipakai dulu.
5. Prompt generate berubah (aturan 9). `npm run eval` perlu kunci AI dan belum dijalankan.
6. `luar_rumpun` dan `pembanding` belum memblokir persetujuan soal (sudah dicatat di dokumen otoritas).

## Tahap 1: tanya-jawab bersumber (`aksi: tanyakitab`)
Berkas: `src/telaahKitab.js`, `web/lib/telaahKitab.js`, `web/TanyaKitab.jsx` (di bawah pembaca pada tab Baca Kitab), `src/kitabCari.js` (`cariTerbaik`), `web/lib/cariKitab.js` (`peringkatHalaman`).

Alur "cari dulu, baru baca", dua panggilan AI yang dikendalikan kode (bukan agen yang memanggil alat berulang): (1) AI mengubah pertanyaan Indonesia menjadi kata kunci Arab (dilewati bila pertanyaan sudah Arab); (2) kode meranking halaman di indeks perpustakaan (bobot kelangkaan kata, bonus kueri lengkap dan frasa), membaca hingga 6 halaman terbaik dari paling banyak 4 kitab; (3) AI menjawab hanya dari halaman itu, tiap butir wajib punya kutipan Arab; (4) kode mencocokkan tiap kutipan dengan halaman (`kutipan.js`, toleran harakat dan ejaan, selisih kecil ditandai "mirip"). Kutipan yang keliru menyebut halaman tetapi ada di halaman lain yang dibaca dikoreksi rujukannya.
- **Gagal-tertutup:** tanpa satu pun butir yang cocok, jawaban tidak ditampilkan (`tidak_terverifikasi`). Status: `terverifikasi`, `sebagian`, `tidak_terverifikasi`, `tidak_ditemukan`.
- **Otoritas kitab** dibaca dari perpustakaan (bukan dari klien): baris otoritas masuk ke prompt, tiap butir membawa `otoritas` dan `dasarMadrasah`; `dasarMadrasah` hasil keseluruhan hanya `true` bila semua butir yang terbukti berasal dari kitab muktamad atau rujukan. Peringatan otoritas (pembanding, di luar rumpun, belum dinilai) dihitung kode, bukan AI.
- **Penanda OCR:** halaman `ocr` yang belum `diverifikasi` memberi peringatan: kutipan terbukti ada di teks perpustakaan, belum tentu sama dengan kitab cetak (verifikasi hanya selaras dengan teks tersimpan).
- Batas biaya: pertanyaan 3 sampai 500 karakter, maksimal 4 kitab, 6 halaman, 3.500 karakter per halaman ke AI. Dihitung satu pemakaian kuota AI per pertanyaan walau memakai dua panggilan.
- Sengaja tidak memakai putaran alat: adaptor Gemini (penyedia bawaan) hanya mendukung satu giliran per panggilan, dan putaran terbuka sulit dibatasi biayanya.

## Tahap 3: periksa soal terhadap halaman rujukan (`aksi: periksarujukan`, gratis)
Berkas: `src/periksaRujukan.js`, `web/lib/periksaRujukan.js`, `web/PeriksaRujukan.jsx` (tombol di bawah "Tertaut ke perpustakaan" pada formulir soal). Tanpa AI dan tanpa kuota AI (batas laju 20/menit, 500/hari).
- Kutipan Arab pada pembahasan, stimulus, dan jawaban/rubrik harus ada di halaman rujukan. Opsi dan pertanyaan tidak diperlakukan sebagai kutipan (pengecoh memang tidak wajib ada di sumber).
- Dukungan kunci (heuristik kata, bukan makna): kata khas jawaban benar dibandingkan dengan kata khas pengecoh terhadap halaman. Hasil: `didukung`, `curiga_kunci` (pengecoh lebih cocok dengan sumber), `ambigu`, `tidak_didukung`, `lemah`, atau `tidak_dapat_dinilai` (benar/salah, opsi berbahasa lain dari sumber).
- Status akhir: `selaras`, `perlu_dicek`, `tidak_selaras`, `tidak_dapat_dinilai`. Halaman rujukan OCR yang belum dicocokkan menurunkan `selaras` menjadi `perlu_dicek`. Laporan memuat status otoritas kitab.
- Rentang rujukan melebihi jumlah halaman dipotong ke halaman terakhir; di atas 20 halaman ditolak.

## Batas yang perlu diketahui
- Pencarian leksikal (kata/frasa), bukan semantik. Pertanyaan yang istilahnya berbeda dari kitab bisa luput; AI perencana membantu dengan sinonim, tetapi tidak dijamin.
- Kutipan terbukti selaras dengan teks perpustakaan, bukan dengan kitab cetak; ini sebabnya penanda OCR/koreksi ditampilkan.
- Pemeriksaan kunci tidak menilai makna, negasi, atau parafrasa jauh; "selaras" bukan pengganti penelaahan ustadz.
- Indeks yang belum dibangun memicu pembacaan puluhan dokumen per kitab pada pertanyaan pertama.
- Belum dicoba dengan Gemini atau Firestore sungguhan, dan UI belum dilihat di browser. Tes UI hanya render SSR dan pemetaan label.

## Pengujian
`test/telaahKitab.test.js` (18 tes): peringkat, rencana, verifikasi kutipan, orkestrasi dengan klien AI tiruan (terverifikasi, gagal-tertutup, sebagian, Arab satu panggilan, tidak ditemukan, injeksi tag), otoritas dan OCR, periksa rujukan, `/api/assist`. `test/telaahUi.test.js` (3 tes). `test/koreksiTambah.test.js` (2 tes). Seluruh suite: 696 lulus, 1 dilewati; `vite build` lolos.
