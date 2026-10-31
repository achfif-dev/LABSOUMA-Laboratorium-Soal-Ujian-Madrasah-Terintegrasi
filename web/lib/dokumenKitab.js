// Pintu masuk impor kitab: mengenali format berkas lalu memanggil parser yang tepat. Semua parser menghasilkan bentuk yang sama:
// { kitab, halaman, daftarIsi, laporan } (lihat docs/SKEMA-KITAB.md). Format yang dikenali:
//  - .txt ekspor Syamilah: baris "<judul>(ص: N)"                         -> parseSyamilah
//  - .docx ekspor Syamilah, atau .txt/.docx lain dengan penanda "[ص N]" -> parsePenandaSisip
// Berkas tanpa penanda halaman (mis. hasil convert PDF) sengaja ditolak: membagi halaman dengan menebak membuat rujukan halaman salah.
import { parseSyamilah, ErrorSyamilah } from './syamilah.js';
import { bacaDocx } from './docx.js';
import { parsePenandaSisip, paragrafDariTeks } from './penandaSisip.js';

export const FORMAT_LABEL = {
  'txt-syamilah': 'Ekspor .txt Syamilah',
  'docx-penanda-sisip': 'Dokumen Word (.docx) dengan penanda halaman [ص N]',
  'txt-penanda-sisip': 'Teks dengan penanda halaman [ص N]',
};
export const PESAN_TANPA_PENANDA = 'Penanda halaman tidak ditemukan. Format yang dikenali: (1) ekspor .txt Syamilah (baris berakhiran "(ص: N)"); (2) berkas .docx atau .txt yang memuat penanda "[ص N]" di dalam teks. Berkas hasil convert PDF biasanya tanpa penanda halaman; kirim contohnya supaya mode halaman virtual bisa dibuat.';

const tanpaPenanda = (e) => (e instanceof ErrorSyamilah && e.kode === 'TANPA_PENANDA' ? new ErrorSyamilah('TANPA_PENANDA', PESAN_TANPA_PENANDA) : e);

/** @param {{nama?:string, buffer?:ArrayBuffer, teks?:string}} berkas  `buffer` untuk .docx; .txt boleh `teks` atau `buffer`. */
export async function bacaDokumenKitab({ nama = '', buffer, teks }) {
  if (/\.docx$/i.test(nama)) {
    if (!buffer) throw new ErrorSyamilah('DOCX_RUSAK', 'Isi berkas .docx tidak terbaca.');
    const paragraf = await bacaDocx(buffer);
    try { return { ...parsePenandaSisip(paragraf, { jenis: 'syamilah-docx' }), format: 'docx-penanda-sisip' }; } catch (e) { throw tanpaPenanda(e); }
  }
  const isi = teks ?? new TextDecoder('utf-8').decode(buffer);
  try { return { ...parseSyamilah(isi), format: 'txt-syamilah' }; } catch (e) { if (!(e instanceof ErrorSyamilah) || e.kode !== 'TANPA_PENANDA') throw e; }
  try { return { ...parsePenandaSisip(paragrafDariTeks(isi), { jenis: 'teks-penanda' }), format: 'txt-penanda-sisip' }; } catch (e) { throw tanpaPenanda(e); }
}
