# Perubahan 6 Nov 2026 (2): tab Konfigurasi dan Pengaturan AI dipisah dari App.jsx

## Hasil terukur (vite build)
| | Sebelum | Sesudah |
|---|---|---|
| Bundel utama | 1.332 KB (gzip 423 KB) | 1.282 KB (gzip 409 KB) |
| `AdminKonfigurasi` (baru, dimuat saat admin membuka tab) | - | 50 KB (gzip 14 KB) |
| `App.jsx` | 5.4 rb baris | ±4.7 rb baris (757 baris pindah) |

## Isi
- `web/AdminKonfigurasi.jsx` (baru): `AiConfig`, `RiwayatCfg`, `AppCfgAdmin`, `AlurEditorAdmin`, `PemeliharaanAdmin`, beserta `TingkatChecks`, `AktifCek`, `AI_PROV`, dan pembantu kecilnya. Hanya empat komponen diekspor.
- `web/App.jsx`: empat komponen itu kini `lazyPanel(...)`. `TahapEditorPilih` tetap di App.jsx karena `UserAdmin` juga memakainya. App.jsx mengekspor pembantu bersama (`Btn`, `Label`, `Section`, `ErrorBox`, `callApi`, `apiErr`, `simpanBerkas`, `useDraftSync`, `Uj`, `Draft`).
- Impor melingkar `AdminKonfigurasi` <-> `App` disengaja dan aman: berkas admin hanya dimuat malas setelah App selesai dievaluasi. Tes `adminKonfigurasiUi` memuat modul admin lebih dulu untuk memastikannya.
- Tes: `adminKonfigurasiUi.test.js` (baru, 3 tes); `alurSoal` dan `review` kini membaca App.jsx + AdminKonfigurasi.jsx.

## Catatan
Penghematan unduhan awal hanya ±50 KB (14 KB gzip): tab admin memang kecil. Pemisahan ini terutama mempermudah pemeliharaan; bundel terbesar masih Firebase compat dan sisa App.jsx.
