// Impor kitab dari sumber SELAIN ekspor Syamilah: PDF (berlapis teks), EPUB, HTML, JSON, serta teks/Word tanpa penanda halaman (halaman virtual).
// Semua jalur menghasilkan bentuk yang sama dengan parser Syamilah ({ kitab, halaman, daftarIsi, laporan }, docs/SKEMA-KITAB.md), jadi layar impor,
// pemecah halaman panjang, server, dan pembaca tidak perlu tahu asal berkasnya. Murni (tanpa DOM): berjalan di browser, server, dan tes.
//
// Soal nomor halaman (inti keputusan rancangan):
//  - Penanda halaman cetak ASLI (EPUB pagebreak, JSON ber-`hal`, PDF + nomor awal yang diisi admin) dipakai apa adanya.
//  - Tanpa penanda sama sekali, halaman DIBAGI OTOMATIS menurut panjang teks dan kitab ditandai `halamanVirtual: true`. Nomornya bukan nomor cetak;
//    soal yang merujuk ke sana tetap bisa ditautkan balik ke halamannya di perpustakaan, tetapi pembaca dan pemilih menampilkan peringatan.
import { ErrorSyamilah, HARAKAT, HURUF, KATA_KUNCI_BAB, levelKata } from './syamilah.js';
import { parsePenandaSisip, paragrafDariTeks } from './penandaSisip.js';
import { potongTeks } from './pecahHalaman.js';
import { bacaBerkasZip, namaBerkasZip } from './docx.js';
import { bersihkanEkorKepala, nilaiHalamanPdf } from './kualitasKitab.js';

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
const RE_PAGEBREAK = /<(?:span|div|a|p|hr)\b[^>]*(?:epub:type\s*=\s*(?:"[^"]*pagebreak[^"]*"|'[^']*pagebreak[^']*')|role\s*=\s*(?:"doc-pagebreak"|'doc-pagebreak'))[^>]*>/gi;
// Catatan kaki/akhir EPUB3 (aside atau li bertipe footnote/endnote/rearnote) dan tautan rujukannya (noteref).
const RE_CATATAN = /<(aside|li)\b[^>]*(?:epub:type\s*=\s*(?:"[^"]*(?:foot|end|rear)notes?\b[^"]*"|'[^']*(?:foot|end|rear)notes?\b[^']*')|role\s*=\s*(?:"doc-(?:foot|end)notes?"|'doc-(?:foot|end)notes?'))[^>]*>[\s\S]*?<\/\1>/gi;
const RE_NOTEREF = /<a\b[^>]*(?:epub:type\s*=\s*(?:"[^"]*noteref[^"]*"|'[^']*noteref[^']*')|role\s*=\s*(?:"doc-noteref"|'doc-noteref'))[^>]*>[\s\S]*?<\/a>/gi;
/** Nilai atribut XML/HTML (kutip ganda atau tunggal); kosong bila tidak ada. Tidak cocok dengan atribut bernama sebagian (data-id untuk id). */
const attr = (tag, nama) => { const m = new RegExp(`(?<![\\w:.-])${nama}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(tag); return m ? (m[1] ?? m[2] ?? '') : ''; };
const keAscii = (s) => String(s).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));

/** Nomor halaman dari tag pagebreak EPUB: atribut title / aria-label / id ("page_12", "p12"). Tidak ketemu = null. */
function nomorPagebreak(tag) {
  const label = attr(tag, 'title') || attr(tag, 'aria-label');
  const dariTeks = label && /(\d{1,5})/.exec(keAscii(label)); if (dariTeks) return +dariTeks[1];
  const id = attr(tag, 'id'); const dariId = id && /(\d{1,5})(?!.*\d)/.exec(keAscii(id));
  return dariId ? +dariId[1] : null;
}

/**
 * HTML/XHTML -> paragraf [{ teks, tingkat, tebal }] (sama dengan keluaran bacaDocx, jadi parser berpenanda bisa memakainya).
 * h1..h6 menjadi tingkat 1..6. `pagebreak: true` mengganti tag pagebreak EPUB dengan penanda "[ص N]" (hanya bila nomornya terbaca).
 */
export function paragrafDariHtml(html, { pagebreak = false, buangCatatan = false } = {}) {
  let h = String(html ?? '').replace(/^\ufeff/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|head)\b[\s\S]*?<\/\1>/gi, '');
  let ada = 0; let catatan = 0;
  if (buangCatatan) h = h.replace(RE_CATATAN, () => { catatan++; return ''; }).replace(RE_NOTEREF, '');
  if (pagebreak) h = h.replace(RE_PAGEBREAK, (tag) => { const n = nomorPagebreak(tag); if (n === null) return ''; ada++; return `\n[ص ${n}]\n`; });
  h = h.replace(/<h([1-6])\b[^>]*>/gi, (_, n) => `\n\u0001${n}\u0002`).replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(td|th)>/gi, ' ').replace(/<\/(p|div|li|tr|section|article|blockquote|table|ul|ol|dd|dt|figcaption|caption|aside|header|footer|pre|figure)>/gi, '\n').replace(/<(p|div|li|tr|section|article|blockquote)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  const hasil = dekode(h).split('\n').map((baris) => {
    const m = /^\u0001([1-6])\u0002/.exec(baris);
    const teks = (m ? baris.slice(3) : baris).replace(/[\u0001\u0002]/g, '').replace(/[ \t]+/g, ' ').trim();
    return { teks, tingkat: m ? +m[1] : 0, tebal: false };
  }).filter((p) => p.teks);
  hasil.adaPagebreak = ada; hasil.catatanDibuang = catatan;
  return hasil;
}

/* ------------------------------------------------------------------ halaman virtual */
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
const RE_ARAB_PDF = /[\u0600-\u06ff\ufb50-\ufdff\ufe70-\ufeff]/g;

/** Item pdf.js dikelompokkan per baris menurut koordinat y (atas ke bawah). */
function kelompokBaris(unsur) {
  const baris = [];
  for (const u of [...unsur].sort((a, b) => b.y - a.y)) {
    const b = baris.find((r) => Math.abs(r.y - u.y) <= Math.max(2, u.h * 0.4));
    if (b) b.item.push(u); else baris.push({ y: u.y, h: u.h, item: [u] });
  }
  return baris.sort((a, b) => b.y - a.y);
}

/** Item satu kelompok -> baris [{ teks, tinggi, jeda, x0, x1, celahMaks }]. `celahMaks` = celah terlebar di dalam baris dalam satuan tinggi huruf (syair dua syatr: besar). */
function barisDariUnsur(unsur, arab) {
  const keluar = []; let prevY = null; let prevH = 12;
  for (const b of kelompokBaris(unsur)) {
    const urut = b.item.sort((p, q) => (arab ? q.x - p.x : p.x - q.x));
    let t = ''; let celahMaks = 0;
    urut.forEach((u, i) => {
      if (i > 0) {
        const p = urut[i - 1]; const celah = arab ? (p.x - (u.x + u.w)) : (u.x - (p.x + p.w));
        if (celah > u.h * 0.15 || (!u.w && !p.w)) t += ' ';
        if (u.w && p.w) celahMaks = Math.max(celahMaks, celah / u.h);
      }
      t += u.s;
    });
    keluar.push({
      teks: t.replace(/ {2,}/g, ' ').trim(), tinggi: Math.max(...b.item.map((u) => u.h)), jeda: prevY !== null && Math.abs(prevY - b.y) > prevH * 1.9,
      x0: Math.min(...b.item.map((u) => u.x)), x1: Math.max(...b.item.map((u) => u.x + u.w)), celahMaks,
    });
    prevY = b.y; prevH = b.h;
  }
  return keluar;
}

/**
 * Cari talang (celah vertikal) di tengah halaman yang memisahkan dua kolom prosa. Konservatif: syair (nazham) tersusun dua syatr per baris sehingga
 * secara geometri mirip dua kolom, dan membacanya per kolom akan mengacak urutan bait. Syarat: celah 1,2-6 em di sekitar tengah blok teks, tak ada
 * item sempit yang melintasinya, >= 16 baris berisi di kedua sisi (>= 60% baris), dan tiap sisi median >= 30 karakter per baris (syatr nazham umumnya 18-25 karakter; syatr bahar panjang seperti thawil/basith bisa mendekati batas ini, karena itu ada tombol baca ulang tanpa deteksi kolom).
 * @returns {number|null} koordinat x talang
 */
export function cariTalang(unsur) {
  const ber = unsur.filter((u) => u.w > 0);
  if (ber.length < 40) return null;
  const hs = ber.map((u) => u.h).sort((a, b) => a - b); const med = hs[hs.length >> 1];
  const minX = Math.min(...ber.map((u) => u.x)); const maxX = Math.max(...ber.map((u) => u.x + u.w)); const W = maxX - minX;
  if (W < med * 20) return null;
  const sempit = ber.filter((u) => u.w <= W * 0.55); // judul selebar halaman tidak ikut menentukan talang
  if (sempit.length < 30) return null;
  const urut = [...sempit].sort((a, b) => a.x - b.x); const gabung = [];
  for (const u of urut) { const l = gabung[gabung.length - 1]; if (l && u.x <= l.akhir) l.akhir = Math.max(l.akhir, u.x + u.w); else gabung.push({ awal: u.x, akhir: u.x + u.w }); }
  let talang = null; let lebarTerbaik = 0;
  for (let i = 1; i < gabung.length; i++) {
    const celah = gabung[i].awal - gabung[i - 1].akhir; const tengah = (gabung[i].awal + gabung[i - 1].akhir) / 2;
    if (tengah >= minX + 0.35 * W && tengah <= minX + 0.65 * W && celah >= Math.max(1.2 * med, 0.02 * W) && celah <= Math.max(6 * med, 0.18 * W) && celah > lebarTerbaik) { talang = tengah; lebarTerbaik = celah; }
  }
  if (talang === null) return null;
  let berisi = 0; let ganda = 0; const panjangKiri = []; const panjangKanan = [];
  for (const r of kelompokBaris(sempit)) {
    const ki = r.item.filter((u) => u.x + u.w / 2 < talang); const ka = r.item.filter((u) => u.x + u.w / 2 >= talang); berisi++;
    if (ki.length && ka.length) { ganda++; panjangKiri.push(ki.reduce((n, u) => n + u.s.length, 0)); panjangKanan.push(ka.reduce((n, u) => n + u.s.length, 0)); }
  }
  const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1] || 0; };
  if (ganda < 16 || ganda < berisi * 0.6 || median(panjangKiri) < 30 || median(panjangKanan) < 30) return null;
  return talang;
}

/** Susun halaman dua kolom: per pita (antara baris selebar halaman) kolom awal-baca dulu (kanan bila Arab), lalu kolom lainnya. */
function barisDuaKolom(unsur, arab, talang) {
  const keluar = []; let pita = [];
  const taruh = (b) => { if (b.length) { if (keluar.length) b[0].jeda = true; keluar.push(...b); } };
  const alir = () => {
    if (!pita.length) return;
    const kiri = []; const kanan = [];
    for (const r of pita) for (const u of r.item) (u.x + u.w / 2 < talang ? kiri : kanan).push(u);
    for (const grup of (arab ? [kanan, kiri] : [kiri, kanan])) taruh(barisDariUnsur(grup, arab));
    pita = [];
  };
  for (const r of kelompokBaris(unsur)) {
    if (r.item.some((u) => u.w > 0 && u.x < talang && u.x + u.w > talang)) { alir(); taruh(barisDariUnsur(r.item, arab)); } else pita.push(r);
  }
  alir();
  return keluar;
}

const RE_ANGKA_SAJA = /^[\s\-–—_.()[\]{}«»*•·0-9٠-٩۰-۹]*$/;
/** Gabung baris visual menjadi paragraf. Baris digabung HANYA bila yang sebelumnya terisi penuh selebar blok, dan baris berikutnya tidak: menjorok, berceda
 *  paragraf, bercelah lebar (syair), berhuruf judul, berawalan kata bab (juga bila baris sebelumnya judul), atau pendek/berupa angka. Dua baris pertama dan terakhir halaman tidak disentuh agar
 *  pembersih judul berjalan dan nomor halaman (kualitasKitab.js) tetap mengenalinya. Kata terpotong tanda hubung (huruf Latin) disambung. */
export function lipatBaris(baris, arab) {
  const n = baris.length;
  if (n < 6) return { baris, digabung: 0 };
  const x0 = Math.min(...baris.map((b) => b.x0)); const x1 = Math.max(...baris.map((b) => b.x1)); const lebarBlok = x1 - x0;
  const adaLebar = lebarBlok > 0 && baris.some((b) => b.x1 - b.x0 > 1);
  const hs = baris.map((b) => ({ h: b.tinggi, n: b.teks.length })).sort((a, b) => a.h - b.h);
  const total = hs.reduce((s, x) => s + x.n, 0); let acc = 0; let median = hs[0].h;
  for (const x of hs) { acc += x.n; if (acc >= total / 2) { median = x.h; break; } }
  const maksPanjang = Math.max(...baris.map((b) => b.teks.length));
  const penuh = (b) => (adaLebar ? (b.x1 - b.x0) >= 0.9 * lebarBlok : b.teks.length >= 0.85 * maksPanjang);
  const menjorok = (b) => adaLebar && Math.abs((arab ? b.x1 : b.x0) - (arab ? x1 : x0)) > 1.5 * b.tinggi;
  const puisi = (b) => b.celahMaks >= 3; const judul = (b) => b.tinggi >= RASIO_JUDUL_UKURAN * median;
  const keluar = []; let digabung = 0;
  baris.forEach((b, i) => {
    const p = baris[i - 1];
    const boleh = i >= 3 && i <= n - 3 && !b.jeda && penuh(p) && !puisi(p) && !puisi(b) && !judul(p) && !judul(b) && !menjorok(b) && b.teks.length > 6 && !RE_ANGKA_SAJA.test(b.teks) && !calonJudul(b.teks) && !calonJudul(p.teks);
    if (!boleh) { keluar.push({ ...b }); return; }
    const l = keluar[keluar.length - 1]; digabung++;
    l.teks = !arab && /\p{L}-$/u.test(l.teks) && /^\p{Ll}/u.test(b.teks) ? l.teks.slice(0, -1) + b.teks : `${l.teks} ${b.teks}`;
  });
  return { baris: keluar, digabung };
}

/** Item teks pdf.js ({ str, transform }) -> { baris, duaKolom }. `kolom: 'auto'` mengenali halaman dua kolom prosa; `paragraf: true` menggabung baris visual (lihat lipatBaris). */
function susunBarisPdf(items, { kolom = 'tutup', paragraf = false } = {}) {
  const unsur = (Array.isArray(items) ? items : []).filter((it) => it && typeof it.str === 'string' && it.str !== '' && Array.isArray(it.transform))
    .map((it) => ({ s: it.str, x: it.transform[4], y: it.transform[5], h: Math.abs(it.transform[3]) || 12, w: Number.isFinite(it.width) ? it.width : 0 }));
  if (!unsur.length) return { baris: [], duaKolom: false, digabung: 0 };
  const arab = unsur.reduce((n, u) => n + (u.s.match(RE_ARAB_PDF) || []).length, 0) > unsur.reduce((n, u) => n + u.s.length, 0) * 0.4;
  const talang = kolom === 'auto' ? cariTalang(unsur) : null;
  let baris = talang !== null ? barisDuaKolom(unsur, arab, talang) : barisDariUnsur(unsur, arab);
  let digabung = 0;
  if (paragraf) ({ baris, digabung } = lipatBaris(baris, arab));
  return { baris, duaKolom: talang !== null, digabung };
}
const gabungBaris = (baris) => normalArab(baris.flatMap((b) => (b.jeda ? ['', b.teks] : [b.teks])).join('\n'));

/**
 * Item teks pdf.js ({ str, transform }) -> teks satu halaman. Item dikelompokkan per baris menurut koordinat y, lalu diurut menurut x
 * (kanan ke kiri bila dominan Arab). Spasi disisipkan hanya bila ada celah.
 */
export function teksHalamanPdf(items) {
  const { baris } = susunBarisPdf(items);
  return baris.length ? gabungBaris(baris) : '';
}

/** Rasio tinggi huruf terhadap teks isi (median tertimbang panjang) agar baris berhuruf lebih besar dikenali sebagai calon judul. */
export const RASIO_JUDUL_UKURAN = 1.25;

/**
 * Seperti teksHalamanPdf, tetapi juga mengembalikan calon judul menurut ukuran huruf: baris pendek berhuruf >= 1,25x ukuran isi halaman
 * (halaman bergaris < 3 baris, mis. sampul, tidak dipakai). Opsi `kolom` ('auto' | 'tutup') dan `paragraf` (boolean): lihat susunBarisPdf.
 * @returns {{ teks:string, judul:{teks:string, rasio:number}[], duaKolom:boolean, digabung:number }}
 */
export function rincianHalamanPdf(items, opsi = {}) {
  const { baris: asli, duaKolom } = susunBarisPdf(items, { kolom: opsi.kolom, paragraf: false });
  if (!asli.length) return { teks: '', judul: [], duaKolom: false, digabung: 0 };
  const judul = [];
  if (asli.length >= 3) {
    const urut = asli.map((b) => ({ h: b.tinggi, n: b.teks.length })).sort((a, b) => a.h - b.h);
    const total = urut.reduce((s, x) => s + x.n, 0); let acc = 0; let median = urut[0].h;
    for (const x of urut) { acc += x.n; if (acc >= total / 2) { median = x.h; break; } }
    for (const b of asli) {
      const t = normalArab(b.teks); const rasio = b.tinggi / median;
      if (rasio >= RASIO_JUDUL_UKURAN && t.length >= 3 && t.length <= 90 && !RE_ANGKA_SAJA.test(t) && !/[.؟!؛]$/.test(t)) judul.push({ teks: t, rasio: +rasio.toFixed(2) });
    }
  }
  const arab = asli.reduce((n, b) => n + (b.teks.match(RE_ARAB_PDF) || []).length, 0) > asli.reduce((n, b) => n + b.teks.length, 0) * 0.4;
  const { baris, digabung } = opsi.paragraf ? lipatBaris(asli, arab) : { baris: asli, digabung: 0 };
  return { teks: gabungBaris(baris), judul, duaKolom, digabung };
}
const levelUkuran = (rasio) => (rasio >= 1.7 ? 1 : rasio >= 1.4 ? 2 : 3);

/* ---- ligatur yang hilang dari PDF ---- */
const RE_NUL_SENDIRI = /(?<![\p{L}\p{M}\p{N}\u0000])\u0000(?![\p{L}\p{M}\p{N}\u0000])/gu;
const HARAKAT_LEPAS = /[\u064B-\u0652\u0670\u0640]/g;
const SEBELUM_SHALAWAT = new Set(['محمد', 'محمدا', 'النبي', 'نبينا', 'سيدنا', 'والنبي']);
const sebelumToken = (teks, idx, ke = 1) => { const t = teks.slice(0, idx).split(/\s+/).filter(Boolean); return (t[t.length - ke] || '').replace(HARAKAT_LEPAS, ''); };
/**
 * Sebagian font tidak punya pemetaan Unicode untuk ligatur lafzh (ﷲ) dan shalawat (ﷺ); pdf.js mengeluarkan karakter NUL. Karakter itu TIDAK menyimpan
 * ligatur aslinya, jadi ini TEBAKAN dari konteks: NUL yang berdiri sendiri diganti "الله", kecuali sesudah محمد/النبي/نبينا/سيدنا atau "رسول الله" (shalawat):
 * "صلى الله عليه وسلم". NUL yang menempel pada huruf dibiarkan (tetap diperingatkan pemeriksa mutu).
 * @returns {{teks:string, jumlah:number}}
 */
export function perbaikiLigatur(teks) {
  const t = String(teks ?? ''); if (!t.includes('\u0000')) return { teks: t, jumlah: 0 };
  let jumlah = 0;
  const hasil = t.replace(RE_NUL_SENDIRI, (m, offset) => {
    jumlah++;
    const s1 = sebelumToken(t, offset); const s2 = sebelumToken(t, offset, 2);
    return SEBELUM_SHALAWAT.has(s1) || (s1 === 'الله' && s2 === 'رسول') ? 'صلى الله عليه وسلم' : 'الله';
  });
  return { teks: hasil, jumlah };
}

/**
 * Halaman PDF (teks per halaman) -> kitab. `halAwal` = nomor cetak pada halaman PDF pertama (diisi admin; bawaan 1).
 * Judul berjalan dan nomor halaman di awal/akhir halaman dibuang (web/lib/kualitasKitab.js). Bila nomor itu konsisten dan admin tidak mengisi nomor awal
 * sendiri (`halAwalEksplisit` false), nomor cetak dipakai dari sana: lebih benar daripada menebak dari urutan halaman PDF (sampul dan pengantar bergeser).
 * Opsi tambahan (semuanya opsional; tanpa itu perilaku lama tetap):
 *  - `outline`  [{ judul, level, indeks }]  penanda buku (bookmark) PDF; bila >= 3 entri sah, dipakai sebagai daftar isi (lebih tepat daripada menebak dari teks).
 *  - `judulUkuran` string[][]  calon judul per halaman menurut ukuran huruf ({ teks, rasio }[] dari rincianHalamanPdf).
 *  - `meta` { judul, pengarang }  metadata dokumen PDF, dipakai sebagai nama awal.
 *  - `ocr` number[]  indeks halaman PDF (0-based) yang teksnya hasil OCR AI. Kitab ditandai sumber `pdf-ocr` dan halamannya `ocr: true`.
 */
export function parsePdf(teksPerHalaman, { halAwal = 1, halAwalEksplisit = false, namaBerkas = '', outline = null, judulUkuran = null, meta = null, ocr = null } = {}) {
  let ligatur = 0;
  const mentah = (Array.isArray(teksPerHalaman) ? teksPerHalaman : []).map((t) => { const r = perbaikiLigatur(normalArab(t)); ligatur += r.jumlah; return r.teks; });
  if (!mentah.length) throw tanpaTeks('PDF tidak berisi halaman.');
  const rata = mentah.reduce((n, t) => n + t.length, 0) / mentah.length;
  const perluOcr = mentah.reduce((a, t, i) => (nilaiHalamanPdf(t) === 'teks' ? a : (a.push(i), a)), []);
  if (rata < MINIMAL_TEKS_PER_HALAMAN_PDF) {
    const e = new ErrorSyamilah('PDF_TANPA_TEKS', 'PDF ini tidak punya lapisan teks (kemungkinan hasil pindai/gambar). Impor butuh teks yang bisa diblok dan disalin. Untuk PDF pindai, gunakan \"Baca dengan OCR AI\", atau ubah dulu ke teks (OCR) atau Word lalu impor hasilnya.');
    e.halamanPerluOcr = perluOcr.length; throw e;
  }
  const bersih = bersihkanEkorKepala(mentah);
  const hal = bersih.halaman;
  const pakaiNomor = !!bersih.nomor && !halAwalEksplisit;
  const paragraf = hal.flatMap((t) => t.split('\n').map((x) => ({ teks: x, tingkat: 0, tebal: false })));
  const judul = []; let sumberJudul = 'kata-kunci';
  const outlineSah = (Array.isArray(outline) ? outline : []).filter((o) => o && typeof o.judul === 'string' && o.judul.trim() && Number.isInteger(o.indeks) && o.indeks >= 0 && o.indeks < hal.length);
  if (outlineSah.length >= 3) {
    sumberJudul = 'penanda-buku';
    for (const o of outlineSah) judul.push({ judul: o.judul.trim(), level: Math.min(3, Math.max(1, o.level || 3)), seq: o.indeks + 1 });
  } else {
    const sudah = new Set();
    const tambah = (j, level, seq) => { const k = `${seq}|${j}`; if (!sudah.has(k)) { sudah.add(k); judul.push({ judul: j, level, seq }); } };
    hal.forEach((t, i) => {
      const barisHal = t.split('\n');
      for (const u of (Array.isArray(judulUkuran) && Array.isArray(judulUkuran[i]) ? judulUkuran[i] : [])) if (u && barisHal.includes(u.teks)) { tambah(u.teks, levelUkuran(u.rasio), i + 1); sumberJudul = 'ukuran-huruf'; }
      for (const baris of barisHal) if (calonJudul(baris)) tambah(baris.trim(), levelKata(baris.trim()), i + 1);
    });
  }
  const ocrSet = new Set((Array.isArray(ocr) ? ocr : []).filter((i) => Number.isInteger(i) && i >= 0 && i < hal.length));
  const halaman = hal.map((teks, i) => ({ teks, ...(pakaiNomor ? { hal: Math.max(0, bersih.nomor.offset + i) } : {}) }));
  const namaJudul = (meta && typeof meta.judul === 'string' && meta.judul.trim()) || namaBerkas.replace(/\.pdf$/i, '') || judulDariBaris(paragraf);
  const h = susunHasil({ halaman, judul, namaJudul, pengarang: (meta && meta.pengarang) || '', jenis: ocrSet.size ? 'pdf-ocr' : 'pdf', sesuaiCetak: pakaiNomor, halAwal });
  h.halaman.forEach((p, i) => { if (ocrSet.has(i)) p.ocr = true; });
  h.kitab.ocrHalaman = ocrSet.size;
  h.laporan.barisBerulangDibuang = bersih.dibuang; h.laporan.contohBarisBerulang = bersih.contoh;
  h.laporan.nomorDariPdf = pakaiNomor ? { ...bersih.nomor } : null;
  h.laporan.nomorTerdeteksiDiabaikan = !!bersih.nomor && !pakaiNomor ? bersih.nomor.offset : null;
  h.laporan.judulSumber = h.daftarIsi.length ? sumberJudul : '';
  h.laporan.halamanOcr = ocrSet.size;
  h.laporan.ligaturDiperbaiki = ligatur;
  h.laporan.halamanPerluOcr = perluOcr.filter((i) => !ocrSet.has(i));
  return { ...h, format: ocrSet.size ? 'pdf-ocr' : 'pdf' };
}

/* ------------------------------------------------------------------ EPUB */
const bacaTeks = async (buffer, nama) => {
  let b;
  try { b = await bacaBerkasZip(buffer, nama); }
  catch (e) { throw new ErrorSyamilah('EPUB_RUSAK', 'Isi EPUB tidak bisa dibuka (arsip rusak atau terkunci DRM).'); }
  return b ? new TextDecoder('utf-8').decode(b) : null;
};
const gabungJalur = (dasar, rel) => {
  let tanpaFragmen = rel.split('#')[0];
  try { tanpaFragmen = decodeURIComponent(tanpaFragmen); } catch { /* persen tak sah: pakai apa adanya */ }
  const bagian = (dasar.includes('/') ? dasar.slice(0, dasar.lastIndexOf('/') + 1) : '') + tanpaFragmen;
  const hasil = []; for (const s of bagian.split('/')) { if (s === '..') hasil.pop(); else if (s && s !== '.') hasil.push(s); }
  return hasil.join('/');
};
// EPUB hasil pindai Internet Archive ("hocr-to-epub"): satu berkas page_N.html per lembar pindai, tanpa penanda halaman cetak; N = nomor lembar pindai (bukan nomor cetak).
// Halaman berteks OCR buruk diberi baris "The text on this page is estimated to be only N% accurate" oleh Internet Archive.
const RE_AKURASI_ARSIP = /^The text on this page is estimated to be only ([\d.]+)% accurate\.?$/i;
const RE_HALAMAN_ARSIP = /(?:^|\/)page_(\d+)\.x?html?$/i;
const RE_NOTICE_ARSIP = /(?:^|\/)notice\.x?html?$/i;
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const ALGORITMA_FONT = ['http://www.idpf.org/2008/embedding', 'http://ns.adobe.com/pdf/enc#RC']; // pengaburan font: bukan DRM atas teks

/**
 * EPUB hasil pindai Internet Archive: tiap berkas page_N.html dijadikan satu halaman bernomor N (nomor lembar pindai, bukan nomor cetak; lembar tanpa teks dilewati).
 * Baris perkiraan akurasi OCR dari Internet Archive dibuang dari teks dan diringkas di `laporan.ocrAkurasi`. Seluruh halaman ditandai `ocr: true`, sumber `epub-ocr`.
 */
async function parseEpubArsip({ buffer, opfJalur, urutan, arsip, judulOpf, penulis }) {
  const halaman = []; const judul = []; const akurasi = []; let kosong = 0; let babTakTerbaca = 0;
  for (const it of urutan) {
    const html = await bacaTeks(buffer, gabungJalur(opfJalur, it.href));
    if (!html) { babTakTerbaca++; continue; }
    let p = Array.from(paragrafDariHtml(html, { buangCatatan: true }));
    const iAkurasi = p.findIndex((x) => RE_AKURASI_ARSIP.test(x.teks.trim()));
    if (iAkurasi >= 0) { akurasi.push(+RE_AKURASI_ARSIP.exec(p[iAkurasi].teks.trim())[1]); p = p.filter((_, i) => i !== iAkurasi); }
    if (!p.some((x) => normalArab(x.teks))) { kosong++; continue; }
    for (const x of p) { const t = normalArab(x.teks); const gaya = x.tingkat >= 1 && x.tingkat <= 3; if (t && t.length <= 300 && (gaya || calonJudul(t))) judul.push({ judul: t, level: gaya ? x.tingkat : levelKata(t), seq: halaman.length + 1 }); }
    halaman.push({ teks: p.map((x) => x.teks).join('\n'), hal: +RE_HALAMAN_ARSIP.exec(it.href)[1] });
  }
  if (!halaman.length) throw tanpaTeks('EPUB ini tidak memuat teks pada satu pun halaman.');
  const bersih = (m) => (m ? normalArab(dekode(m[1].replace(/<[^>]+>/g, ''))) : '');
  const hasil = susunHasil({ halaman, judul, namaJudul: bersih(judulOpf), pengarang: bersih(penulis), jenis: 'epub-ocr', rujukan: `archive.org/details/${arsip[1]}`, sesuaiCetak: false });
  // Nomor lembar pindai melompat di lembar kosong yang dilewati: itu wajar, bukan anomali penomoran.
  for (const h of hasil.halaman) { delete h.nomorAnomali; h.ocr = true; }
  hasil.laporan.anomali = { duplikat: 0, mundur: 0, lompat: 0 }; hasil.laporan.daftarAnomali = [];
  hasil.kitab.ocrHalaman = hasil.halaman.length;
  hasil.laporan.babTakTerbaca = babTakTerbaca; hasil.laporan.halamanPindaiKosong = kosong;
  hasil.laporan.ocrAkurasi = akurasi.length ? { bertanda: akurasi.length, median: +median(akurasi).toFixed(2), min: Math.min(...akurasi), maks: Math.max(...akurasi), rendah: akurasi.filter((a) => a < 70).length } : null;
  return { ...hasil, format: 'epub-ocr' };
}

/**
 * EPUB -> kitab. Penanda halaman cetak EPUB (epub:type="pagebreak" / role="doc-pagebreak", nomor Latin atau Arab-Hindi) dipakai bila ada; kalau tidak, halaman virtual.
 * Catatan kaki EPUB3 (aside footnote/endnote) dibuang dan dihitung, sama dengan jalur Syamilah. Teks sebelum penanda halaman pertama (sampul, pengantar penerbit)
 * tidak diimpor pada jalur penanda; jumlahnya dilaporkan (`laporan.teksSebelumPenanda`). Bab yang disebut di OPF tetapi tidak terbaca dilaporkan (`laporan.babTakTerbaca`).
 */
export async function parseEpub(buffer, { halAwal = 1, virtual = false } = {}) {
  const nama = namaBerkasZip(buffer);
  if (!nama.length) throw new ErrorSyamilah('EPUB_RUSAK', 'Berkas EPUB kosong atau rusak.');
  if (nama.includes('META-INF/encryption.xml')) {
    const enk = (await bacaTeks(buffer, 'META-INF/encryption.xml')) || '';
    const asing = (enk.match(/Algorithm\s*=\s*(?:"[^"]*"|'[^']*')/gi) || []).map((m) => m.replace(/^[^=]*=\s*["']|["']$/g, '')).filter((a) => !ALGORITMA_FONT.includes(a));
    if (asing.length) throw new ErrorSyamilah('EPUB_DRM', 'EPUB ini terenkripsi (DRM) sehingga teksnya tidak bisa dibaca. Gunakan salinan tanpa DRM.');
  }
  const wadah = await bacaTeks(buffer, 'META-INF/container.xml');
  const opfPath = wadah && /full-path\s*=\s*(?:"([^"]+)"|'([^']+)')/i.exec(wadah);
  if (!opfPath) throw new ErrorSyamilah('EPUB_RUSAK', 'EPUB tidak valid: container.xml tidak menunjuk berkas OPF.');
  const opfJalur = opfPath[1] || opfPath[2];
  const opf = await bacaTeks(buffer, opfJalur);
  if (!opf) throw new ErrorSyamilah('EPUB_RUSAK', 'EPUB tidak valid: berkas OPF tidak ditemukan.');
  const manifest = new Map();
  for (const m of opf.match(/<(?:[\w-]+:)?item\b[^>]*>/gi) || []) manifest.set(attr(m, 'id'), { href: attr(m, 'href'), tipe: attr(m, 'media-type'), sifat: attr(m, 'properties') });
  const urutan = (opf.match(/<(?:[\w-]+:)?itemref\b[^>]*>/gi) || []).map((m) => manifest.get(attr(m, 'idref')))
    .filter((x) => x && /x?html/i.test(x.tipe) && !/(^|\s)nav(\s|$)/.test(x.sifat)); // dokumen navigasi (daftar isi EPUB3) bukan isi kitab
  if (!urutan.length) throw new ErrorSyamilah('EPUB_RUSAK', 'EPUB tidak berisi bab yang bisa dibaca.');
  const judulOpf = /<dc:title\b[^>]*>([\s\S]*?)<\/dc:title>/i.exec(opf); const penulis = /<dc:creator\b[^>]*>([\s\S]*?)<\/dc:creator>/i.exec(opf);
  const arsip = /archive\.org\/details\/([A-Za-z0-9._-]+)/i.exec(opf);
  const bukanNotice = urutan.filter((it) => !RE_NOTICE_ARSIP.test(it.href));
  const modeArsip = !!arsip && bukanNotice.length >= 5 && bukanNotice.filter((it) => RE_HALAMAN_ARSIP.test(it.href)).length >= 0.8 * bukanNotice.length;
  if (modeArsip) return parseEpubArsip({ buffer, opfJalur, urutan: bukanNotice, arsip, opf, judulOpf, penulis });
  const paragraf = []; let adaPagebreak = 0; let catatanKaki = 0; let babTakTerbaca = 0;
  for (const it of urutan) {
    const jalur = gabungJalur(opfJalur, it.href);
    const html = (await bacaTeks(buffer, jalur)) ?? (await bacaTeks(buffer, gabungJalur(opfJalur, it.href.replace(/%/g, '%25'))));
    if (!html) { babTakTerbaca++; continue; }
    const p = paragrafDariHtml(html, { pagebreak: true, buangCatatan: true }); adaPagebreak += p.adaPagebreak || 0; catatanKaki += p.catatanDibuang || 0;
    for (const x of p) paragraf.push(x);
  }
  if (!paragraf.length) {
    const adaGambar = nama.some((n) => /\.(jpe?g|png|gif|webp|svg)$/i.test(n));
    throw tanpaTeks(adaGambar ? 'EPUB ini hanya berisi gambar halaman (hasil pindai), tanpa teks. Impor EPUB belum membaca gambar: ubah ke PDF lalu gunakan "Baca dengan OCR AI", atau cari salinan berteks.' : 'EPUB tidak berisi teks.');
  }
  const meta = { namaJudul: judulOpf ? normalArab(dekode(judulOpf[1].replace(/<[^>]+>/g, ''))) : '', pengarang: penulis ? normalArab(dekode(penulis[1].replace(/<[^>]+>/g, ''))) : '' };
  let hasil;
  if (adaPagebreak > 0) {
    try { hasil = { ...parsePenandaSisip(paragraf, { jenis: 'epub' }), format: 'epub' }; } catch (e) { if (!(e instanceof ErrorSyamilah) || e.kode !== 'TANPA_PENANDA') throw e; }
  }
  if (!hasil && !virtual) throw new ErrorSyamilah('TANPA_PENANDA', 'EPUB ini tidak memuat penanda halaman cetak (pagebreak).');
  let teksSebelumPenanda = 0;
  if (!hasil) hasil = { ...parseVirtual(paragraf, { jenis: 'epub', halAwal, ...meta }), format: 'epub-virtual' };
  else {
    hasil.kitab.judul = meta.namaJudul || hasil.kitab.judul; hasil.kitab.pengarang = meta.pengarang || hasil.kitab.pengarang; hasil.kitab.sumber.jenis = 'epub';
    const i = paragraf.findIndex((p) => /\[ص\s*\d/.test(p.teks));
    teksSebelumPenanda = i > 0 ? paragraf.slice(0, i).filter((p) => !(p.tingkat > 0)).reduce((n, p) => n + p.teks.length, 0) : 0;
  }
  if (!hasil.kitab.judul) hasil.kitab.judul = meta.namaJudul;
  hasil.laporan.catatanKakiDibuang = (hasil.laporan.catatanKakiDibuang || 0) + catatanKaki;
  hasil.laporan.babTakTerbaca = babTakTerbaca; hasil.laporan.teksSebelumPenanda = teksSebelumPenanda;
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
