# Perubahan 6 Nov 2026 (4): tab Export dipisah dari App.jsx

## Hasil terukur (vite build)
| | Sebelum | Sesudah |
|---|---|---|
| Bundel utama | 1.282 KB (gzip 410 KB) | 1.252 KB (gzip 401 KB) |
| `ExportTab` (dimuat saat tab dibuka, sudah termasuk pembuat berkas) | - | 30 KB (gzip 11 KB) |
| `App.jsx` | 4.572 baris | 4.009 baris |

## Berkas baru
- `web/ExportTab.jsx`: komponen `Export` (default export), dimuat malas lewat `lazyPanel`.
- `web/lib/exportBuilders.js` (murni, tanpa React): `buildGift`, `buildMoodleXml`, `buildCsvForms`, `buildCsvRdm`, `buildDocx`, `FORMATS`, plus `giftEsc`, `xmlEsc`, `giftJawaban`. Hanya `ExportTab` yang memakainya, jadi ikut terpotong dari bundel utama.
- `web/lib/dasar.js` (murni): `TINGKAT`, `MAPEL`, `FALLBACK_CFG`, `LEVEL`, `KEYS`, `STATUS`, `Bt`, `BT_NOOP`, `Draft`, `DRAFT_NOOP`, `bacaPref`, `ejaanTersimpan`, `cariKitab`, `namaArabKitab`, `mapelUntuk`, `levelLabel`, `optsOf`, `fullQ`, `csvEsc`, `umpanUraian`.
- `web/ui.jsx` bertambah: `AppCfgCtx`, `useCfg`, `CatatanCtx`, `AlurCtx`, `useAlur`, `Filters`, `applyFilter`, `labelPaket`.

## Aturan impor (jangan dilanggar)
`dasar.js` tidak mengimpor siapa pun dari proyek selain `lib/kitabNama.js`; `ui.jsx` mengimpor `dasar.js`; `exportBuilders.js` mengimpor `dasar.js`; `ExportTab.jsx`, `AdminKonfigurasi.jsx`, dan `App.jsx` mengimpor yang di atas. Tidak ada yang mengimpor `App.jsx`. Dijaga oleh tes `exportTabUi` dan `adminKonfigurasiUi`.

## Tes
- Baru: `test/exportTabUi.test.js` (render tab Export, ekspor modul, tanpa impor melingkar) dan `test/_sumberWeb.js` (gabungan sumber untuk tes yang memeriksa teks kode).
- `bentukUi` dan `ustadzLokal` kini mengimpor `exportBuilders.js` langsung (sebelumnya memotong teks App.jsx dengan `new Function`).
- `alurSoal`, `naskah`, `serahTerima` membaca sumber gabungan.
