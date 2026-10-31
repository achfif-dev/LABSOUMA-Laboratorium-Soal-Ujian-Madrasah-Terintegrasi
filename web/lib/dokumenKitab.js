// Pintu masuk impor kitab: mengenali format berkas lalu memanggil parser yang tepat. Semua parser menghasilkan bentuk yang sama:
// { kitab, halaman, daftarIsi, laporan } (lihat docs/SKEMA-KITAB.md). Format yang dikenali:
//  - .txt ekspor Syamilah: baris "<judul>(ص: N)"                         -> parseSyamilah
//  - .docx ekspor Syamilah, atau .txt/.docx lain dengan penanda "[ص N]" -> parsePenandaSisip
// Berkas tanpa penanda halaman (mis. hasil convert PDF) sengaja ditolak: membagi halaman dengan menebak membuat rujukan halaman salah.
import { parseSyamilah, ErrorSyamilah } from './syamilah.js';
import { bacaDocx } from './docx.js';
import { parsePenandaSisip, paragrafDariTeks } from './penandaSisip.js';
import { pecahHalamanPanjang } from './pecahHalaman.js';
import { parsePdf, parseEpub, parseHtml, parseJson, parseTeksBebas, parseDocxBebas } from './sumberLain.js';

export const FORMAT_LABEL = {
  'txt-syamilah': 'Ekspor .txt Syamilah',
  'docx-penanda-sisip': 'Dokumen Word (.docx) dengan penanda halaman [ص N]',
  'txt-penanda-sisip': 'Teks dengan penanda halaman [ص N]',
  pdf: 'PDF dengan lapisan teks (halaman PDF + nomor awal)',
  epub: 'EPUB dengan penanda halaman cetak',
  'epub-virtual': 'EPUB tanpa penanda halaman (halaman virtual)',
  html: 'HTML dengan penanda halaman',
  'html-virtual': 'HTML tanpa penanda halaman (halaman virtual)',
  json: 'JSON halaman',
  'docx-virtual': 'Dokumen Word tanpa penanda halaman (halaman virtual)',
  'teks-virtual': 'Teks tanpa penanda halaman (halaman virtual)',
};
export const EKSTENSI_DIKENAL = ['.txt', '.docx', '.pdf', '.epub', '.html', '.htm', '.xhtml', '.json'];
export const PESAN_TANPA_PENANDA = 'Penanda halaman tidak ditemukan. Format yang dikenali: (1) ekspor .txt Syamilah (baris berakhiran "(ص: N)"); (2) berkas .docx atau .txt yang memuat penanda "[ص N]" di dalam teks. Bila berkasnya tidak punya penanda sama sekali, pilih "Bagi halaman otomatis": halaman dibuat menurut panjang teks dan ditandai virtual (bukan nomor cetak).';

const tanpaPenanda = (e) => (e instanceof ErrorSyamilah && e.kode === 'TANPA_PENANDA' ? new ErrorSyamilah('TANPA_PENANDA', PESAN_TANPA_PENANDA) : e);

/** @param {{nama?:string, buffer?:ArrayBuffer, teks?:string, virtual?:boolean, halAwal?:number, bacaPdf?:Function}} berkas  `buffer` untuk .docx/.pdf/.epub; teks/HTML/JSON boleh `teks` atau `buffer`. `halAwal` = nomor cetak halaman pertama (PDF, halaman virtual). */
export async function bacaDokumenKitab(berkas) { return pecahHalamanPanjang(await bacaMentah(berkas)); }
/** Sama dengan bacaDokumenKitab, tetapi hasilnya bisa dipakai ulang: `err.kode === 'TANPA_PENANDA'` berarti berkas sah tetapi tanpa nomor halaman; ulangi dengan `{ virtual: true }`. */
export const bolehVirtual = (e) => e instanceof ErrorSyamilah && e.kode === 'TANPA_PENANDA';

async function bacaMentah({ nama = '', buffer, teks, virtual = false, halAwal = 1, bacaPdf = null }) {
  const ada = (re) => re.test(nama);
  const awal = Number.isInteger(halAwal) && halAwal >= 0 && halAwal <= 99999 ? halAwal : 1;
  const halAwalEksplisit = awal !== 1; // nilai bawaan 1 = admin tidak mengisi: nomor cetak boleh dibaca dari isi PDF (parsePdf)
  const teksBerkas = () => teks ?? new TextDecoder('utf-8').decode(buffer);
  if (ada(/\.pdf$/i)) {
    if (!buffer) throw new ErrorSyamilah('PDF_RUSAK', 'Isi berkas PDF tidak terbaca.');
    const per = bacaPdf || (await import('./bacaPdf.js')).teksPerHalamanPdf;
    return { ...parsePdf(await per(buffer), { halAwal: awal, halAwalEksplisit, namaBerkas: nama }), format: 'pdf' };
  }
  if (ada(/\.epub$/i)) {
    if (!buffer) throw new ErrorSyamilah('EPUB_RUSAK', 'Isi berkas EPUB tidak terbaca.');
    try { return await parseEpub(buffer, { halAwal: awal, virtual }); } catch (e) { throw tanpaPenanda(e); }
  }
  if (ada(/\.(x?html?)$/i)) { try { return parseHtml(teksBerkas(), { halAwal: awal, virtual }); } catch (e) { throw tanpaPenanda(e); } }
  if (ada(/\.json$/i)) return parseJson(teksBerkas());
  if (ada(/\.docx$/i)) {
    if (!buffer) throw new ErrorSyamilah('DOCX_RUSAK', 'Isi berkas .docx tidak terbaca.');
    const paragraf = await bacaDocx(buffer);
    try { return { ...parsePenandaSisip(paragraf, { jenis: 'syamilah-docx' }), format: 'docx-penanda-sisip' }; }
    catch (e) { if (virtual && bolehVirtual(e)) return parseDocxBebas(paragraf, { virtual: true, halAwal: awal }); throw tanpaPenanda(e); }
  }
  const isi = teksBerkas();
  try { return { ...parseSyamilah(isi), format: 'txt-syamilah' }; } catch (e) { if (!(e instanceof ErrorSyamilah) || e.kode !== 'TANPA_PENANDA') throw e; }
  try { return { ...parsePenandaSisip(paragrafDariTeks(isi), { jenis: 'teks-penanda' }), format: 'txt-penanda-sisip' }; }
  catch (e) { if (virtual && bolehVirtual(e)) return parseTeksBebas(paragrafDariTeks(isi), { virtual: true, halAwal: awal }); throw tanpaPenanda(e); }
}
