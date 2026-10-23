// Modul murni dipakai kode aplikasi lewat window.* (pola lama dari masa Babel di browser). Harus diimpor PALING DULU di main.jsx.
// Tahap berikutnya: ganti Proxy di App.jsx dengan import langsung, lalu hapus berkas ini.
import * as docx from 'docx';
import * as K from './lib/kutipan.js';
import * as S from './lib/sikap.js';
import * as G from './lib/pegon.js';
import * as D from './lib/draft.js';
import * as V from './lib/drive.js';
import * as U from './lib/ujian.js';
import * as KS from './lib/kisi.js';
import * as BT from './lib/bentuk.js';

Object.assign(window, { docx, Bentuk: BT, Kisi: KS, Kutipan: K, Sikap: S, Pegon: G, LabDraft: D, LabDrive: V, Ujian: U });
