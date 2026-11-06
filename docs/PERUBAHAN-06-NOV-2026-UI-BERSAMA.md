# Perubahan 6 Nov 2026 (3): pembantu bersama dipindah ke web/ui.jsx

Memutus impor melingkar `AdminKonfigurasi.jsx` <-> `App.jsx` (lihat PERUBAHAN-06-NOV-2026-PISAH-TAB-ADMIN.md).

## Isi
- `web/ui.jsx` (baru, tidak mengimpor App.jsx): `Uj`, `Draft`, `useDraftSync`, `Label`, `Btn`, `Select`, `Section`, `layarHp`, `callApi`, `apiErr`, `ERR_TITLES`, `ErrorBox`, `Spin`, `simpanBerkas`. Dipindah apa adanya (tanpa perubahan perilaku).
- `web/App.jsx` dan `web/AdminKonfigurasi.jsx` mengimpor dari `ui.jsx`. App.jsx tidak lagi mengekspor pembantu itu.
- Tes `adminKonfigurasiUi` kini juga menegaskan bahwa `ui.jsx` dan `AdminKonfigurasi.jsx` tidak mengimpor `App.jsx`.

## Pola untuk tab berikutnya
Tab baru yang dipisah cukup mengimpor dari `./ui.jsx` (dan `./lib/*`), lalu didaftarkan di App.jsx dengan `lazyPanel(() => import('./NamaTab.jsx'))`. Komponen kecil yang dipakai banyak tempat (Badge, Chip, Empty, SourceLink, Toast) belum dipindah; pindahkan ke `ui.jsx` bila tab yang dipisah memerlukannya.
