// Parser dokumen kitab dengan penanda halaman SISIP "[ص N]" (di tengah teks): ekspor Word (.docx) Syamilah, atau .txt/.docx lain yang memakai penanda itu.
// Dirancang dari satu berkas nyata: Hasyiyah ad-Dasuqi 'ala Umm al-Barahin (.docx ekspor Syamilah, buku 8703, 261 halaman). Temuan yang membentuk aturan:
//  1. Penanda "[ص N]" berada di awal halaman N, sering di tengah kalimat (210 dari 261). Halaman = teks sesudah penanda sampai penanda berikutnya.
//  2. Judul = paragraf bergaya Heading1/Heading2 dan sesuai Daftar Isi di depan ("(ص N)"). Nomor halaman judul diambil dari Daftar Isi itu
//     (39 dari 47 judul terletak tepat sesudah penanda halamannya, 8 tepat sebelumnya), jadi daftar isi tidak bergantung pada letak judul.
//  3. Label tebal berbracket yang berulang hampir di tiap halaman ("[حاشية الدسوقي]", 231 kali) memisah dua lapisan teks halaman (teks asal dan hasyiyah).
//     Dipakai sebagai batas bagian (batasMatn), bukan isi.
//  3b. Label itu TIDAK dipakai membelah matn/syarah: pada contoh, kalimat hasyiyah berlanjut melintasi label (kutipan matn Sanusi disisipkan di tengahnya),
//      jadi pembagian atas/bawah akan memotong kalimat. Label dibuang dan teks dibiarkan mengalir menurut urutan baca.
//  3c. Penanda "[ص N]" yang nomornya melompat sendirian lalu kembali berurutan (mis. 241, 75, 242) bukan halaman: dianggap teks.
//  4. Syamilah menyisipkan tatwil sebelum kaf ("المالـكي", 1.266 kali): dibuang di sini.
import { ErrorSyamilah, FORMAT_VERSI, KATA_KUNCI_BAB, MEDAN, keAngka, rapikan, RE_TAKHRIJ, HARAKAT, HURUF } from './syamilah.js';

const SRC_PENANDA = '\\[\\s*(?:ج\\s*:?\\s*([0-9٠-٩]+)\\s*[-–،,]?\\s*)?ص\\s*([0-9٠-٩]+)\\s*\\]'; // tanpa titik dua: "[ص: ٧٥]" = ayat (surat Shad), bukan halaman
const RE_ADA = new RegExp(SRC_PENANDA);
const RE_LABEL = /^\[[^\]\n]{2,80}\]$/;
const RE_TOC = /^(.*?)\s*\(\s*ص\s*:?\s*([0-9٠-٩]+)\s*\)\s*$/;
const RE_CATATAN = /^\(\s*([0-9٠-٩]{1,3})\s*\)\s+\S/;
const INDIA = '٠١٢٣٤٥٦٧٨٩';
const keIndia = (n) => String(n).replace(/\d/g, (d) => INDIA[d]);
const bersihkan = (s) => String(s).replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '').replace(/\u00a0/g, ' ')
  .replace(/(?<=[\u0621-\u064A\u064B-\u0652])\u0640+(?=[\u0621-\u064A])/g, '').replace(/[ \t]+/g, ' ');
const tanpaEkor = (t) => t.replace(/[\u064B-\u0652\u0670]+$/, ''); // diakritik yatim di ujung (sisa kata sebelumnya) menempel pada label
const judulBersih = (t) => rapikan(t).replace(/^[0-9٠-٩]+(?:\.[0-9٠-٩]+)*\.?\s+/, '');
const levelKata = (t) => (/^(مقدمة|مدخل|كتاب)/.test(t) ? 1 : /^باب/.test(t) ? 2 : 3);

export const paragrafDariTeks = (teks) => String(teks ?? '').replace(/^\ufeff/, '').replace(/\r\n?/g, '\n').split('\n').map((t) => ({ teks: t, tingkat: 0, tebal: false }));

function kepalaDariBaris(baris) {
  const k = {};
  for (const b of baris) {
    const m = /^\s*([^:]{2,30}):\s*(.*\S)\s*$/.exec(b);
    if (m && MEDAN[m[1].trim()]) k[MEDAN[m[1].trim()]] = rapikan(m[2]);
    const id = /رقم الكتاب في المكتبة الشاملة\s*:\s*([0-9٠-٩]+)/.exec(b); if (id) k.idSyamilah = keAngka(id[1]);
    const ts = /^الطابع الزمني\s*:\s*(.+)$/.exec(b.trim()); if (ts) k.tanggalSyamilah = rapikan(ts[1]);
    if (/ترقيم الكتاب موافق للمطبوع/.test(b)) k.penomoranSesuaiCetak = true;
  }
  const w = /\(\s*(?:ت|المتوفى\s*:?)\s*([0-9٠-٩]{2,4})\s*هـ?\s*\)/.exec(k.pengarang || '');
  if (w) k.wafatH = +keAngka(w[1]);
  return k;
}

function selesaikanHalaman(h) {
  let paras = h.paras; let catatan = 0;
  let i = paras.length;
  while (i > 0 && RE_CATATAN.test(paras[i - 1])) i--;
  if (i < paras.length) {
    const ns = paras.slice(i).map((x) => +keAngka(RE_CATATAN.exec(x)[1]));
    const rujukan = new RegExp(`\\(\\s*(?:1|${keIndia(1)})\\s*\\)`).test(paras.slice(0, i).join('\n'));
    if (ns[0] === 1 && ns.every((n, k) => n === k + 1) && rujukan) { // catatan kaki sungguhan: bernomor 1.. berurutan dan ada rujukan sisipnya di teks
      catatan = ns.length; paras = paras.slice(0, i);
      for (const n of ns) paras = paras.map((x) => x.replace(new RegExp(`\\s*\\(\\s*(?:${n}|${keIndia(n)})\\s*\\)`, 'g'), ''));
    }
  }
  let rujukan = 0;
  paras = paras.map((x) => x.replace(RE_TAKHRIJ, () => { rujukan++; return ''; }));
  // catatan "(١) ..." yang tertinggal di tengah halaman (bukan di ekor): tidak dibuang karena mudah tertukar dengan butir bernomor; dilaporkan
  const tertinggal = catatan === 0 && paras.some((x) => RE_CATATAN.test(x) && +keAngka(RE_CATATAN.exec(x)[1]) === 1);
  return { teks: paras.join('\n'), batasMatn: null, catatan, rujukan, tertinggal };
}

/**
 * @param {{teks:string, tingkat:number, tebal:boolean}[]} paragraf  dari bacaDocx() atau paragrafDariTeks()
 * @param {{jenis?:string}} [opsi]
 */
export function parsePenandaSisip(paragraf, opsi = {}) {
  const iMarker = paragraf.findIndex((p) => RE_ADA.test(p.teks));
  if (iMarker < 0) throw new ErrorSyamilah('TANPA_PENANDA', 'Tidak ada penanda halaman "[ص N]" di dalam teks.');
  let iAwal = iMarker;
  while (iAwal > 0 && (paragraf[iAwal - 1].tingkat > 0 || !paragraf[iAwal - 1].teks.trim())) iAwal--; // judul tepat sebelum penanda pertama ikut isi
  const kepalaBaris = paragraf.slice(0, iAwal).map((p) => rapikan(bersihkan(p.teks))).filter(Boolean);
  const isi = paragraf.slice(iAwal);
  const punyaGaya = paragraf.some((p) => p.tingkat > 0);

  const toc = new Map();
  for (const b of kepalaBaris) { const m = RE_TOC.exec(b); if (m) { toc.set(judulBersih(m[1]), +keAngka(m[2])); toc.set(rapikan(m[1]), +keAngka(m[2])); } }

  // label pemisah lapisan: bracket-saja yang berulang di >= 25% halaman
  const hitung = new Map(); let jumlahPenanda = 0;
  for (const p of isi) {
    const t = tanpaEkor(rapikan(bersihkan(p.teks)));
    if (RE_LABEL.test(t) && !RE_ADA.test(t)) hitung.set(t, (hitung.get(t) || 0) + 1);
    jumlahPenanda += (p.teks.match(new RegExp(SRC_PENANDA, 'g')) || []).length;
  }
  const [labelTop, labelN] = [...hitung.entries()].sort((a, b) => b[1] - a[1])[0] || [null, 0];
  const label = labelN >= 5 && labelN >= 0.25 * jumlahPenanda ? labelTop : null;

  // penanda yang nomornya melompat sendirian lalu kembali berurutan bukan halaman (mis. kutipan "[ص 75]" di antara 241 dan 242)
  const semuaTeks = isi.map((p) => bersihkan(p.teks)); const kandidat = [];
  semuaTeks.forEach((t, pi) => { for (const m of t.matchAll(new RegExp(SRC_PENANDA, 'g'))) kandidat.push({ pi, at: m.index, juz: m[1] ? +keAngka(m[1]) : 1, hal: +keAngka(m[2]) }); });
  const dikecualikan = new Set();
  kandidat.forEach((c, i) => {
    const a = kandidat[i - 1]; const b = kandidat[i + 1];
    if (a && b && c.juz === a.juz && c.hal !== a.hal + 1 && b.juz === a.juz && b.hal === a.hal + 1) dikecualikan.add(`${c.pi}:${c.at}`);
  });
  const halaman = []; let cur = null; const mentah = []; let labelDibuang = 0;
  const mulai = (juz, hal) => { cur = { juz, hal, paras: [] }; halaman.push(cur); };
  for (const [pi, p] of isi.entries()) {
    const t0 = tanpaEkor(rapikan(semuaTeks[pi]));
    if (!t0) continue;
    const posisi = halaman.length || 1;
    if (!RE_ADA.test(t0) && (p.tingkat > 0 || (!punyaGaya && t0.length <= 100 && KATA_KUNCI_BAB.test(t0)))) {
      mentah.push({ judul: judulBersih(t0), level: p.tingkat > 0 ? Math.min(p.tingkat, 4) : levelKata(t0), posisi }); continue;
    }
    if (label && t0 === label) { labelDibuang++; continue; }
    if (p.tebal && RE_LABEL.test(t0) && !RE_ADA.test(t0)) { mentah.push({ judul: t0.slice(1, -1).trim(), level: 4, posisi }); continue; } // judul tambahan Syamilah "[ ... ]"
    const txt = semuaTeks[pi]; let akhir = 0;
    for (const m of txt.matchAll(new RegExp(SRC_PENANDA, 'g'))) {
      if (dikecualikan.has(`${pi}:${m.index}`)) continue;
      const potong = txt.slice(akhir, m.index).trim(); if (potong && cur) cur.paras.push(potong);
      mulai(m[1] ? +keAngka(m[1]) : 1, +keAngka(m[2])); akhir = m.index + m[0].length;
    }
    const sisa = txt.slice(akhir).trim(); if (sisa && cur) cur.paras.push(sisa);
  }

  const laporan = { anomali: { duplikat: 0, mundur: 0, lompat: 0 }, halamanTanpaPemisah: 0, catatanKakiDibuang: 0, rujukanDibuang: 0, halamanKosong: 0, catatanTertinggal: [], daftarAnomali: [] };
  const hasilHal = []; let prev = null; let totalChar = 0; let harakat = 0; let huruf = 0; let terpanjang = 0;
  halaman.forEach((h, k) => {
    const r = selesaikanHalaman(h); const seq = k + 1;
    let anomali = null;
    if (prev) {
      if (h.hal === prev.hal && h.juz === prev.juz) anomali = 'duplikat';
      else if (h.juz === prev.juz && h.hal < prev.hal) anomali = 'mundur';
      else if (h.juz === prev.juz && h.hal > prev.hal + 1) anomali = 'lompat';
    }
    if (anomali) { laporan.anomali[anomali]++; laporan.daftarAnomali.push({ seq, juz: h.juz, hal: h.hal, prevHal: prev.hal, jenis: anomali }); }
    if (!r.teks) laporan.halamanKosong++;
    laporan.halamanTanpaPemisah++;
    if (r.tertinggal) laporan.catatanTertinggal.push({ seq, hal: h.hal });
    laporan.catatanKakiDibuang += r.catatan; laporan.rujukanDibuang += r.rujukan;
    totalChar += r.teks.length; terpanjang = Math.max(terpanjang, r.teks.length);
    harakat += (r.teks.match(HARAKAT) || []).length; huruf += (r.teks.match(HURUF) || []).length;
    const doc = { id: `p${String(seq).padStart(5, '0')}`, seq, juz: h.juz, hal: h.hal, teks: r.teks, batasMatn: r.batasMatn };
    if (anomali) doc.nomorAnomali = anomali;
    hasilHal.push(doc); prev = h;
  });
  if (!halaman.length) throw new ErrorSyamilah('TANPA_PENANDA', 'Penanda halaman ditemukan tetapi tidak ada teks sesudahnya.');

  // daftar isi: halaman judul dari Daftar Isi di depan bila ada, selain itu dari penanda sebelumnya
  let cocokToc = 0;
  const daftarIsi = mentah.map((d, urut) => {
    const halToc = toc.get(d.judul);
    const idx = halToc !== undefined ? halaman.findIndex((x) => x.hal === halToc) : -1;
    if (idx >= 0) cocokToc++;
    const seq = idx >= 0 ? idx + 1 : Math.min(d.posisi, halaman.length);
    return { judul: d.judul.slice(0, 300), level: d.level, juz: halaman[seq - 1].juz, hal: halaman[seq - 1].hal, seq, urut };
  }).sort((a, b) => a.seq - b.seq || a.urut - b.urut).map(({ urut, ...e }) => e);
  let p = 0; let babAktif = '';
  for (const doc of hasilHal) {
    while (p < daftarIsi.length && daftarIsi[p].seq <= doc.seq) { if (daftarIsi[p].level <= 3) babAktif = daftarIsi[p].judul; p++; }
    if (babAktif) doc.bab = babAktif;
  }

  const k = kepalaDariBaris(kepalaBaris);
  const judul = k.judulPanjang || kepalaBaris.find((x) => !/:/.test(x)) || '';
  const kitab = {
    judul: judul.slice(0, 300), judulLatin: '', pengarang: k.pengarang || '', wafatH: k.wafatH ?? null, fan: k.fan || '', mazhab: '',
    edisi: { penerbit: k.penerbit || '', muhaqqiq: k.muhaqqiq || '', cetakan: k.cetakan || '' },
    jumlahHalaman: hasilHal.length, jumlahJuz: Math.max(...halaman.map((x) => x.juz)),
    penomoranSesuaiCetak: !!k.penomoranSesuaiCetak,
    bentukMatn: 'tanpa-pemisah',
    berharakat: huruf ? harakat / huruf > 0.02 : false,
    hakCipta: { status: 'belum-dicek', catatan: k.muhaqqiq ? `Ada muhaqqiq: ${k.muhaqqiq}. Hasil tahqiq edisi bisa dilindungi.` : '' },
    sumber: { jenis: opsi.jenis || 'teks-penanda', pengunggah: '', tanggalSyamilah: k.tanggalSyamilah || '', rujukan: k.idSyamilah ? `Syamilah #${k.idSyamilah}` : '' },
    formatParser: FORMAT_VERSI, aktif: true, revisi: 1,
  };
  const ukuranBytes = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(hasilHal.map((x) => x.teks).join('')).length : totalChar * 2;
  Object.assign(laporan, {
    format: 'penanda-sisip', jumlahHalaman: hasilHal.length, halPertama: halaman[0].hal, halTerakhir: halaman[halaman.length - 1].hal,
    judulTerdeteksi: daftarIsi.length, judulCocokDaftarIsi: cocokToc, totalKarakter: totalChar, halamanTerpanjang: terpanjang, ukuranBytes,
    halamanMelebihiBatas: hasilHal.filter((x) => x.teks.length > (opsi.batasTeks || 12000)).map((x) => x.seq),
    nisbahHarakat: huruf ? +(harakat / huruf).toFixed(4) : 0, selisihDenganKepala: null,
    labelDibuang: label ? labelDibuang : 0, labelLapisan: label || '',
  });
  return { kitab, halaman: hasilHal, daftarIsi, laporan };
}
