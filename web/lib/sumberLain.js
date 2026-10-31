// Impor kitab dari sumber SELAIN ekspor Syamilah: PDF (berlapis teks), EPUB, HTML, JSON, serta teks/Word tanpa penanda halaman (halaman virtual).
// Semua jalur menghasilkan bentuk yang sama dengan parser Syamilah ({ kitab, halaman, daftarIsi, laporan }, docs/SKEMA-KITAB.md), jadi layar impor,
// pemecah halaman panjang, server, dan pembaca tidak perlu tahu asal berkasnya. Murni (tanpa DOM): berjalan di browser, server, dan tes.
//
// Soal nomor halaman (inti keputusan rancangan):
//  - Penanda halaman cetak ASLI (EPUB pagebreak, JSON ber-`hal`, PDF + nomor awal yang diisi admin) dipakai apa adanya.
//  - Tanpa penanda sama sekali, halaman DIBAGI OTOMATIS menurut panjang teks dan kitab ditandai `halamanVirtual: true`. Nomornya bukan nomor cetak;
//    soal yang merujuk ke sana tetap bisa ditautkan balik ke halamannya di perpustakaan, tetapi pembaca dan pemilih menampilkan peringatan.
import { ErrorSyamilah, HARAKAT, HURUF, KATA_KUNCI_BAB } from './syamilah.js';
import { parsePenandaSisip, paragrafDariTeks } from './penandaSisip.js';
import { potongTeks } from './pecahHalaman.js';
import { bacaBerkasZip, namaBerkasZip } from './docx.js';

export const FORMAT_VERSI_LAIN = 2;
export const TARGET_HALAMAN_VIRTUAL = 2200; // karakter per halaman virtual; di bawah batas Penyusunan Soal (6.000) sehingga 2-3 halaman muat sekaligus
export const MINIMAL_TEKS_PER_HALAMAN_PDF = 40; // rata-rata di bawah ini = PDF hasil pindai (tanpa lapisan teks)

/* ------------------------------------------------------------------ pembersih umum */
const NOL_LEBAR = /[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;
/** NFKC mengembalikan bentuk presentasi Arab (FB50-FDFF, FE70-FEFF) yang sering keluar dari PDF menjadi huruf biasa; tatwil dan karakter tak terlihat dibuang. */
export const normalArab = (s) => String(s ?? '').normalize('NFKC').replace(NOL_LEBAR, '').replace(/\u00a0/g, ' ')
  .replace(/(?<=[\u0621-\u064A\u064B-\u0652])\u0640+(?=[\u0621-\u064A])/g, '').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();

const ENTITAS = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', laquo: '«', raquo: '»' };
const dekode = (s) => s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-z]+);/g, (m, k) => {
  if (k[0] === '#') { const c = k[1] === 'x' || k[1] === 'X' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10); return Number.isFinite(c) && c > 0 && c <= 0x10ffff ? String.fromCodePoint(c) : m; }
  return k in ENTITAS ? ENTITAS[k] : m;
});

/* ------------------------------------------------------------------ HTML -> paragraf */
const RE_PAGEBREAK = /<(?:span|div|a|p|hr)\b[^>]*(?:epub:type\s*=\s*"[^"]*pagebreak[^"]*"|role\s*=\s*"doc-pagebreak")[^>]*>/gi;

/** Nomor halaman dari tag pagebreak EPUB: atribut title / aria-label / id ("page_12", "p12"). Tidak ketemu = null. */
function nomorPagebreak(tag) {
  const t = /\btitle\s*=\s*"([^"]*)"/i.exec(tag) || /\baria-label\s*=\s*"([^"]*)"/i.exec(tag);
  const dariTeks = t && /(\d{1,5})/.exec(t[1]); if (dariTeks) return +dariTeks[1];
  const id = /\bid\s*=\s*"([^"]*)"/i.exec(tag); const dariId = id && /(\d{1,5})(?!.*\d)/.exec(id[1]);
  return dariId ? +dariId[1] : null;
}

/**
 * HTML/XHTML -> paragraf [{ teks, tingkat, tebal }] (sama dengan keluaran bacaDocx, jadi parser berpenanda bisa memakainya).
 * h1..h6 menjadi tingkat 1..6. `pagebreak: true` mengganti tag pagebreak EPUB dengan penanda "[ص N]" (hanya bila nomornya terbaca).
 */
export function paragrafDariHtml(html, { pagebreak = false } = {}) {
  let h = String(html ?? '').replace(/^\ufeff/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|head)\b[\s\S]*?<\/\1>/gi, '');
  let ada = 0;
  if (pagebreak) h = h.replace(RE_PAGEBREAK, (tag) => { const n = nomorPagebreak(tag); if (n === null) return ''; ada++; return `\n[ص ${n}]\n`; });
  h = h.replace(/<h([1-6])\b[^>]*>/gi, (_, n) => `\n\u0001${n}\u0002`).replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|tr|section|article|blockquote|table|ul|ol)>/gi, '\n').replace(/<(p|div|li|tr|section|article|blockquote)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  const hasil = dekode(h).split('\n').map((baris) => {
    const m = /^\u0001([1-6])\u0002/.exec(baris);
    const teks = (m ? baris.slice(3) : baris).replace(/[\u0001\u0002]/g, '').replace(/[ \t]+/g, ' ').trim();
    return { teks, tingkat: m ? +m[1] : 0, tebal: false };
  }).filter((p) => p.teks);
  hasil.adaPagebreak = ada;
  return hasil;
}

/* ------------------------------------------------------------------ halaman virtual */
const levelKata = (t) => (/^(مقدمة|مدخل|كتاب)/.test(t) ? 1 : /^باب/.test(t) ? 2 : 3);
/** Baris pendek berawalan kata bab (باب، فصل، كتاب ...) tanpa tanda akhir kalimat = calon judul, untuk sumber tanpa gaya judul. */
export const calonJudul = (t) => { const s = String(t || '').trim(); return s.length >= 3 && s.length <= 90 && KATA_KUNCI_BAB.test(s) && !/[.؟!؛]$/.test(s); };

/**
 * Paragraf -> halaman virtual berukuran sekitar `target` karakter, dipotong hanya di batas paragraf (paragraf yang lebih panjang dari 2x target dipecah di batas kalimat).
 * Judul (gaya h1-h3 atau calon judul) dicatat dengan nomor halaman tempat ia jatuh.
 * @returns {{ halaman: string[], judul: {judul:string, level:number, seq:number}[] }}
 */
export function paginasiVirtual(paragraf, { target = TARGET_HALAMAN_VIRTUAL } = {}) {
  const halaman = []; const judul = [];
  let cur = [];
  let panjang = 0;
  const tutup = () => { if (cur.length) halaman.push(cur.join('\n')); cur = []; panjang = 0; };
  for (const p of paragraf) {
    const t = normalArab(p.teks); if (!t) continue;
    const penting = (p.tingkat >= 1 && p.tingkat <= 3) || calonJudul(t);
    if (panjang >= target) tutup();
    if (penting && t.length <= 300) judul.push({ judul: t.slice(0, 300), level: p.tingkat >= 1 && p.tingkat <= 3 ? Math.min(3, p.tingkat) : levelKata(t), seq: halaman.length + 1 });
    if (t.length > target * 2) {
      for (const b of potongTeks(t, target * 2)) { if (panjang >= target) tutup(); cur.push(b.teks); panjang += b.teks.length + 1; }
    } else { cur.push(t); panjang += t.length + 1; }
  }
  tutup();
  return { halaman, judul };
}

/* ------------------------------------------------------------------ penyusun hasil bersama */
const hitungAnomali = (halaman) => {
  const a = { duplikat: 0, mundur: 0, lompat: 0 }; const daftar = [];
  halaman.forEach((h, i) => {
    if (i === 0 || h.hal === null) return;
    const prev = halaman[i - 1]; let j = null;
    if (h.hal === prev.hal) j = 'duplikat'; else if (h.hal < prev.hal) j = 'mundur'; else if (h.hal > prev.hal + 1) j = 'lompat';
    if (j) { a[j]++; h.nomorAnomali = j; daftar.push({ seq: h.seq, juz: h.juz, hal: h.hal, prevHal: prev.hal, jenis: j }); }
  });
  return { a, daftar };
};

/**
 * @param {object} o
 * @param {{teks:string, hal?:number, juz?:number}[]} o.halaman  urutan baca; `hal` kosong = dinomori dari `halAwal`
 * @param {{judul:string, level?:number, seq?:number, hal?:number}[]} [o.judul]  judul bab; `seq` = urutan halaman (1..n)
 */
export function susunHasil({ halaman, judul = [], namaJudul = '', pengarang = '', jenis, rujukan = '', virtual = false, sesuaiCetak = false, halAwal = 1, batasTeks = 12000 }) {
  const halDocs = halaman.map((p, i) => ({
    id: `p${String(i + 1).padStart(5, '0')}`, seq: i + 1, juz: Number.isInteger(p.juz) && p.juz >= 1 && p.juz <= 99 ? p.juz : 1,
    hal: Number.isInteger(p.hal) && p.hal >= 0 && p.hal <= 99999 ? p.hal : Math.min(99999, halAwal + i), teks: normalArab(p.teks), batasMatn: null,
  }));
  const { a, daftar } = virtual ? { a: { duplikat: 0, mundur: 0, lompat: 0 }, daftar: [] } : hitungAnomali(halDocs);
  const daftarIsi = judul.map((j) => {
    const seq = Math.min(Math.max(1, Number.isInteger(j.seq) ? j.seq : (halDocs.findIndex((h) => h.hal === j.hal) + 1) || 1), halDocs.length);
    return { judul: String(j.judul).slice(0, 300), level: Math.min(4, Math.max(1, j.level || 3)), juz: halDocs[seq - 1].juz, hal: halDocs[seq - 1].hal, seq };
  }).sort((x, y) => x.seq - y.seq);
  let p = 0; let bab = '';
  for (const d of halDocs) {
    while (p < daftarIsi.length && daftarIsi[p].seq <= d.seq) { if (daftarIsi[p].level <= 3) bab = daftarIsi[p].judul; p++; }
    if (bab) d.bab = bab;
  }
  const semuaTeks = halDocs.map((h) => h.teks).join('');
  const harakat = (semuaTeks.match(HARAKAT) || []).length; const huruf = (semuaTeks.match(HURUF) || []).length;
  const terpanjang = halDocs.reduce((n, h) => Math.max(n, h.teks.length), 0);
  const ukuranBytes = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(semuaTeks).length : semuaTeks.length * 2;
  const kitab = {
    judul: String(namaJudul || '').slice(0, 300), judulLatin: '', pengarang: String(pengarang || '').slice(0, 400), wafatH: null, fan: '', mazhab: '',
    edisi: { penerbit: '', muhaqqiq: '', cetakan: '' }, jumlahHalaman: halDocs.length, jumlahJuz: Math.max(1, ...halDocs.map((h) => h.juz)),
    penomoranSesuaiCetak: !!sesuaiCetak && !virtual, bentukMatn: 'tanpa-pemisah', berharakat: huruf ? harakat / huruf > 0.02 : false,
    hakCipta: { status: 'belum-dicek', catatan: '' }, halamanVirtual: !!virtual,
    sumber: { jenis, pengunggah: '', tanggalSyamilah: '', rujukan: String(rujukan || '').slice(0, 200) },
    formatParser: FORMAT_VERSI_LAIN, aktif: true, revisi: 1,
  };
  const laporan = {
    format: jenis, jumlahHalaman: halDocs.length, halPertama: halDocs[0].hal, halTerakhir: halDocs[halDocs.length - 1].hal,
    judulTerdeteksi: daftarIsi.length, catatanKakiDibuang: 0, rujukanDibuang: 0, totalKarakter: semuaTeks.length, halamanTerpanjang: terpanjang, ukuranBytes,
    halamanMelebihiBatas: halDocs.filter((h) => h.teks.length > batasTeks).map((h) => h.seq), nisbahHarakat: huruf ? +(harakat / huruf).toFixed(4) : 0,
    anomali: a, daftarAnomali: daftar, halamanTanpaPemisah: halDocs.length, halamanKosong: halDocs.filter((h) => !h.teks).length,
    labelDibuang: 0, labelLapisan: '', selisihDenganKepala: null, halamanVirtual: !!virtual,
  };
  return { kitab, halaman: halDocs, daftarIsi, laporan };
}

const tanpaTeks = (pesan) => new ErrorSyamilah('TANPA_TEKS', pesan);
const judulDariBaris = (paragraf) => { const p = paragraf.find((x) => x.teks.trim().length >= 3 && x.teks.trim().length <= 200); return p ? normalArab(p.teks).slice(0, 300) : ''; };

/* ------------------------------------------------------------------ teks / Word / HTML tanpa penanda: halaman virtual */
/** Paragraf tanpa penanda halaman -> kitab berhalaman virtual. `jenis` kolom sumber: 'teks-virtual' | 'html' | 'epub'. */
export function parseVirtual(paragraf, { jenis = 'teks-virtual', halAwal = 1, target = TARGET_HALAMAN_VIRTUAL, rujukan = '', namaJudul = '', pengarang = '' } = {}) {
  const { halaman, judul } = paginasiVirtual(paragraf, { target });
  if (!halaman.length) throw tanpaTeks('Berkas tidak berisi teks yang bisa dibaca.');
  return susunHasil({ halaman: halaman.map((teks) => ({ teks })), judul, namaJudul: namaJudul || judulDariBaris(paragraf), pengarang, jenis, rujukan, virtual: true, halAwal });
}

/** Coba penanda "[ص N]" lebih dulu (halaman cetak asli); bila tidak ada, halaman virtual HANYA bila `opsi.virtual` (izin eksplisit admin). */
function penandaAtauVirtual(paragraf, opsi) {
  try { return { ...parsePenandaSisip(paragraf, { jenis: opsi.jenisPenanda || 'teks-penanda' }), format: opsi.formatPenanda }; }
  catch (e) { if (!opsi.virtual || !(e instanceof ErrorSyamilah) || e.kode !== 'TANPA_PENANDA') throw e; } // tanpa izin eksplisit, berkas tanpa penanda tetap ditolak
  return { ...parseVirtual(paragraf, { jenis: opsi.jenisVirtual, halAwal: opsi.halAwal, rujukan: opsi.rujukan }), format: opsi.formatVirtual };
}

/** .txt/.docx tanpa penanda Syamilah: penanda "[ص N]" bila ada, kalau tidak halaman virtual. */
export const parseTeksBebas = (paragraf, { halAwal = 1, virtual = false } = {}) => penandaAtauVirtual(paragraf, { jenisPenanda: 'teks-penanda', formatPenanda: 'txt-penanda-sisip', jenisVirtual: 'teks-virtual', formatVirtual: 'teks-virtual', halAwal, virtual });
export const parseDocxBebas = (paragraf, { halAwal = 1, virtual = false } = {}) => penandaAtauVirtual(paragraf, { jenisPenanda: 'syamilah-docx', formatPenanda: 'docx-penanda-sisip', jenisVirtual: 'teks-virtual', formatVirtual: 'docx-virtual', halAwal, virtual });

/** HTML (mis. halaman web yang disimpan): penanda "[ص N]" di teks bila ada, kalau tidak halaman virtual. */
export function parseHtml(html, { halAwal = 1, virtual = false } = {}) {
  const paragraf = paragrafDariHtml(html);
  if (!paragraf.length) throw tanpaTeks('Berkas HTML tidak berisi teks.');
  return penandaAtauVirtual(paragraf, { jenisPenanda: 'teks-penanda', formatPenanda: 'html-penanda-sisip', jenisVirtual: 'html', formatVirtual: 'html-virtual', halAwal, virtual });
}

/* ------------------------------------------------------------------ PDF */
/**
 * Item teks pdf.js ({ str, transform }) -> teks satu halaman. Item dikelompokkan per baris menurut koordinat y, lalu diurut menurut x
 * (kanan ke kiri bila dominan Arab). Spasi disisipkan hanya bila ada celah.
 */
export function teksHalamanPdf(items) {
  const unsur = (Array.isArray(items) ? items : []).filter((it) => it && typeof it.str === 'string' && it.str !== '' && Array.isArray(it.transform))
    .map((it) => ({ s: it.str, x: it.transform[4], y: it.transform[5], h: Math.abs(it.transform[3]) || 12, w: Number.isFinite(it.width) ? it.width : 0 }));
  if (!unsur.length) return '';
  const arab = unsur.reduce((n, u) => n + (u.s.match(/[\u0600-\u06ff\ufb50-\ufdff\ufe70-\ufeff]/g) || []).length, 0) > unsur.reduce((n, u) => n + u.s.length, 0) * 0.4;
  const baris = [];
  for (const u of [...unsur].sort((a, b) => b.y - a.y)) {
    const b = baris.find((r) => Math.abs(r.y - u.y) <= Math.max(2, u.h * 0.4));
    if (b) b.item.push(u); else baris.push({ y: u.y, h: u.h, item: [u] });
  }
  baris.sort((a, b) => b.y - a.y);
  const keluar = []; let prevY = null; let prevH = 12;
  for (const b of baris) {
    const urut = b.item.sort((p, q) => (arab ? q.x - p.x : p.x - q.x));
    let t = '';
    urut.forEach((u, i) => {
      if (i > 0) {
        const p = urut[i - 1]; const celah = arab ? (p.x - (u.x + u.w)) : (u.x - (p.x + p.w));
        if (celah > u.h * 0.15 || (!u.w && !p.w)) t += ' ';
      }
      t += u.s;
    });
    if (prevY !== null && Math.abs(prevY - b.y) > prevH * 1.9) keluar.push('');
    keluar.push(t.replace(/ {2,}/g, ' ').trim()); prevY = b.y; prevH = b.h;
  }
  return normalArab(keluar.join('\n'));
}

/** Halaman PDF (teks per halaman) -> kitab. `halAwal` = nomor cetak pada halaman PDF pertama (diisi admin; bawaan 1). */
export function parsePdf(teksPerHalaman, { halAwal = 1, namaBerkas = '' } = {}) {
  const hal = (Array.isArray(teksPerHalaman) ? teksPerHalaman : []).map((t) => normalArab(t));
  if (!hal.length) throw tanpaTeks('PDF tidak berisi halaman.');
  const rata = hal.reduce((n, t) => n + t.length, 0) / hal.length;
  if (rata < MINIMAL_TEKS_PER_HALAMAN_PDF) throw new ErrorSyamilah('PDF_TANPA_TEKS', 'PDF ini tidak punya lapisan teks (kemungkinan hasil pindai/gambar). Impor butuh PDF yang teksnya bisa diblok dan disalin. Untuk PDF pindai, ubah dulu ke teks (OCR) atau Word, lalu impor hasilnya.');
  const paragraf = hal.flatMap((t) => t.split('\n').map((x) => ({ teks: x, tingkat: 0, tebal: false })));
  const judul = [];
  hal.forEach((t, i) => { for (const baris of t.split('\n')) if (calonJudul(baris)) judul.push({ judul: baris.trim(), level: levelKata(baris.trim()), seq: i + 1 }); });
  return { ...susunHasil({ halaman: hal.map((teks) => ({ teks })), judul, namaJudul: namaBerkas.replace(/\.pdf$/i, '') || judulDariBaris(paragraf), jenis: 'pdf', halAwal }), format: 'pdf' };
}

/* ------------------------------------------------------------------ EPUB */
const bacaTeks = async (buffer, nama) => { const b = await bacaBerkasZip(buffer, nama); return b ? new TextDecoder('utf-8').decode(b) : null; };
const attr = (tag, nama) => { const m = new RegExp(`\\b${nama}\\s*=\\s*"([^"]*)"`, 'i').exec(tag); return m ? m[1] : ''; };
const gabungJalur = (dasar, rel) => {
  const bagian = (dasar.includes('/') ? dasar.slice(0, dasar.lastIndexOf('/') + 1) : '') + decodeURIComponent(rel.split('#')[0]);
  const hasil = []; for (const s of bagian.split('/')) { if (s === '..') hasil.pop(); else if (s && s !== '.') hasil.push(s); }
  return hasil.join('/');
};

/** EPUB -> kitab. Penanda halaman cetak EPUB (epub:type="pagebreak") dipakai bila ada; kalau tidak, halaman virtual. */
export async function parseEpub(buffer, { halAwal = 1, virtual = false } = {}) {
  if (!namaBerkasZip(buffer).length) throw new ErrorSyamilah('EPUB_RUSAK', 'Berkas EPUB kosong atau rusak.');
  const wadah = await bacaTeks(buffer, 'META-INF/container.xml');
  const opfPath = wadah && /full-path\s*=\s*"([^"]+)"/i.exec(wadah);
  if (!opfPath) throw new ErrorSyamilah('EPUB_RUSAK', 'EPUB tidak valid: container.xml tidak menunjuk berkas OPF.');
  const opf = await bacaTeks(buffer, opfPath[1]);
  if (!opf) throw new ErrorSyamilah('EPUB_RUSAK', 'EPUB tidak valid: berkas OPF tidak ditemukan.');
  const manifest = new Map();
  for (const m of opf.match(/<item\b[^>]*>/gi) || []) manifest.set(attr(m, 'id'), { href: attr(m, 'href'), tipe: attr(m, 'media-type') });
  const urutan = (opf.match(/<itemref\b[^>]*>/gi) || []).map((m) => manifest.get(attr(m, 'idref'))).filter((x) => x && /x?html/i.test(x.tipe));
  if (!urutan.length) throw new ErrorSyamilah('EPUB_RUSAK', 'EPUB tidak berisi bab yang bisa dibaca.');
  const judulOpf = /<dc:title\b[^>]*>([\s\S]*?)<\/dc:title>/i.exec(opf); const penulis = /<dc:creator\b[^>]*>([\s\S]*?)<\/dc:creator>/i.exec(opf);
  let paragraf = []; let adaPagebreak = 0;
  for (const it of urutan) {
    const html = await bacaTeks(buffer, gabungJalur(opfPath[1], it.href)); if (!html) continue;
    const p = paragrafDariHtml(html, { pagebreak: true }); adaPagebreak += p.adaPagebreak || 0; paragraf = paragraf.concat(p);
  }
  if (!paragraf.length) throw tanpaTeks('EPUB tidak berisi teks.');
  const meta = { namaJudul: judulOpf ? normalArab(dekode(judulOpf[1].replace(/<[^>]+>/g, ''))) : '', pengarang: penulis ? normalArab(dekode(penulis[1].replace(/<[^>]+>/g, ''))) : '' };
  let hasil;
  if (adaPagebreak > 0) {
    try { hasil = { ...parsePenandaSisip(paragraf, { jenis: 'epub' }), format: 'epub' }; } catch (e) { if (!(e instanceof ErrorSyamilah) || e.kode !== 'TANPA_PENANDA') throw e; }
  }
  if (!hasil && !virtual) throw new ErrorSyamilah('TANPA_PENANDA', 'EPUB ini tidak memuat penanda halaman cetak (pagebreak).');
  if (!hasil) hasil = { ...parseVirtual(paragraf, { jenis: 'epub', halAwal, ...meta }), format: 'epub-virtual' };
  else { hasil.kitab.judul = meta.namaJudul || hasil.kitab.judul; hasil.kitab.pengarang = meta.pengarang || hasil.kitab.pengarang; hasil.kitab.sumber.jenis = 'epub'; }
  if (!hasil.kitab.judul) hasil.kitab.judul = meta.namaJudul;
  return hasil;
}

/* ------------------------------------------------------------------ JSON */
/**
 * JSON bebas-vendor. Skema yang diuji: { judul, pengarang?, halaman: [{ hal, juz?, teks, bab? }], daftarIsi?: [{ judul, level?, hal }] }.
 * Alias yang ditoleransi (belum diuji pada ekspor situs mana pun): pages/halaman, text/teks, page/hal, vol/juz, title/judul, author/pengarang.
 * Larik polos [{...}] juga diterima. Nomor `hal` DIPAKAI sebagai nomor cetak (penomoranSesuaiCetak: true).
 */
export function parseJson(mentah) {
  let o; try { o = typeof mentah === 'string' ? JSON.parse(mentah.replace(/^\ufeff/, '')) : mentah; } catch { throw new ErrorSyamilah('JSON_RUSAK', 'Berkas JSON tidak bisa dibaca (bukan JSON yang valid).'); }
  const daftar = Array.isArray(o) ? o : (o && (o.halaman || o.pages));
  if (!Array.isArray(daftar) || !daftar.length) throw new ErrorSyamilah('JSON_FORMAT', 'JSON harus berisi larik "halaman" berisi objek { hal, teks }.');
  const angka = (v) => { const n = typeof v === 'number' ? v : parseInt(String(v ?? '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)), 10); return Number.isInteger(n) ? n : null; };
  const halaman = daftar.map((h, i) => {
    const teks = h && (h.teks ?? h.text); if (typeof teks !== 'string') throw new ErrorSyamilah('JSON_FORMAT', `Halaman ke-${i + 1} tidak punya "teks" berupa string.`);
    return { teks, hal: angka(h.hal ?? h.page) ?? undefined, juz: angka(h.juz ?? h.vol) ?? undefined, bab: h.bab };
  });
  const adaHal = halaman.every((h) => h.hal !== undefined);
  const judul = [];
  const toc = Array.isArray(o) ? [] : (o.daftarIsi || o.toc || o.indexes || []);
  if (Array.isArray(toc)) for (const e of toc) { const j = e && (e.judul ?? e.title); if (typeof j === 'string' && j.trim()) judul.push({ judul: j.trim(), level: angka(e.level) || 3, hal: angka(e.hal ?? e.page) ?? undefined, seq: angka(e.seq) ?? undefined }); }
  const h = susunHasil({ halaman, judul: judul.filter((j) => j.seq !== undefined || j.hal !== undefined), namaJudul: Array.isArray(o) ? '' : String(o.judul ?? o.title ?? ''), pengarang: Array.isArray(o) ? '' : String(o.pengarang ?? o.author ?? ''), jenis: 'json', sesuaiCetak: adaHal });
  return { ...h, format: 'json' };
}

/** Bagi tinggal satu fungsi dibutuhkan UI: apakah hasil ini memakai halaman virtual? */
export const halamanVirtual = (hasil) => !!(hasil && hasil.kitab && hasil.kitab.halamanVirtual);
