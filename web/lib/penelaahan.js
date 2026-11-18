// Penelaahan kitab tingkat lanjut untuk Tanya Kitab: bagian MURNI (tanpa AI, tanpa jaringan), dipakai server (src/telaahKitab.js) dan tes.
//   1. jenisDariPertanyaan : jenis pertanyaan (hukum, definisi, dalil, syarat/rukun, perbandingan, bilangan, tata cara, khilaf, irab) dari kata kunci.
//   2. perluasKueri        : kueri pencarian diperluas dengan keluarga istilah (يجب/وجوب/فرض, بطل/نواقض/مبطلات, dst.) sebagai VARIAN berbobot rendah.
//   3. peringkatBeragam    : peringkat halaman yang menjamin tiap kueri (tiap bagian pertanyaan majemuk) punya wakil di halaman terpilih.
//   4. pilihBeragam        : gabungan lintas kitab dengan jaminan yang sama.
//   5. perluTetangga       : apakah halaman tampak terpotong di awal/akhir sehingga halaman sebelum/sesudahnya perlu dibaca.
//   6. ringkasHalaman      : halaman yang lebih panjang dari batas prompt dipotong di SEKITAR kata kunci, bukan di kepala halaman.
import { normalCari, siapkanKueri } from './cariKitab.js';

const n = (s) => normalCari(s);

/* ------------------------------------------------------------------ 1. jenis pertanyaan */

export const JENIS_PERTANYAAN = ['hukum', 'definisi', 'dalil', 'syarat_rukun', 'perbandingan', 'bilangan', 'tata_cara', 'khilaf', 'irab', 'umum'];

const POLA_JENIS = [
  ['irab', /i'?rab|kedudukan kata|tanda i'?rab|marfu|manshub|majrur|tashrif|wazan|jenis kata|إعراب|اعراب|محل/i],
  ['perbandingan', /bandingkan|perbedaan antara|beda(?:nya)?\b|bedanya|dibanding|versus|\bvs\b|persamaan|الفرق|الفرق بين|قارن/i],
  ['khilaf', /khilaf|perbedaan pendapat|pendapat (?:lain|ulama|mazhab)|menurut (?:mazhab|imam|hanafi|maliki|syafi|hanbali)|ikhtilaf|اختلاف|خلاف|مذهب/i],
  ['dalil', /dalil|hujjah|landasan|nash|ayat|hadits|hadis|sumber hukum|دليل|حجة/i],
  ['syarat_rukun', /syarat|rukun|sunnah[- ]sunnah|sunah[- ]sunah|pembatal|yang membatalkan|fardhu|fardu|شرط|شروط|ركن|أركان|اركان|مبطلات|نواقض/i],
  ['tata_cara', /tata cara|cara (?:me|ber)|bagaimana (?:cara|melakukan|mengerjakan)|langkah|urutan|kaifiyat|كيفية|صفة/i],
  ['bilangan', /berapa|jumlah|banyaknya|hitungan|nisab|kadar|ukuran|(?:^|\s)كم\s|عدد|مقدار|نصاب/i],
  ['definisi', /apa (?:itu|yang dimaksud|arti|pengertian)|pengertian|definisi|makna|arti(?:nya)?\b|maksud|yang dimaksud|تعريف|معنى|ما هو|ما هي/i],
  ['hukum', /hukum|boleh|bolehkah|haram|halal|wajib|sunnah|sunah|makruh|sah(?:kah)?\b|batal|apakah (?:boleh|sah|wajib)|حكم|يجوز|يجب|يحرم|يكره|يصح/i],
];

/** Jenis pertanyaan menurut kata kunci (Indonesia atau Arab). Tidak dikenal = 'umum'. */
export function jenisDariPertanyaan(q) {
  const t = String(q || '');
  for (const [j, re] of POLA_JENIS) if (re.test(t)) return j;
  return 'umum';
}

export const sahJenis = (j) => (JENIS_PERTANYAAN.includes(j) ? j : '');

/** Arahan menjawab per jenis pertanyaan; masuk prompt jawaban sebagai bimbingan, bukan sebagai sumber. */
export const PANDUAN_JENIS = {
  hukum: 'Jenis: HUKUM. Sebut hukumnya persis dengan kata hukum yang dipakai halaman (wajib/sunnah/makruh/haram/boleh/sah/batal), beserta syarat dan pengecualian yang menyertainya. Jangan menggeser "boleh" menjadi "sunnah" atau "sah" menjadi "wajib".',
  definisi: 'Jenis: DEFINISI. Salin rumusan definisi sebagaimana ditulis halaman (termasuk pembatasnya); jangan memperluas atau meringkasnya hingga maknanya berubah. Bila halaman menyebut dua definisi (bahasa dan istilah), bedakan.',
  dalil: 'Jenis: DALIL. Sebut dalil HANYA yang tertulis di halaman (ayat, hadits, ijma, qiyas) beserta bunyinya; jangan menambah dalil dari ingatan. Bila halaman tidak menyebut dalil, katakan itu.',
  syarat_rukun: 'Jenis: SYARAT/RUKUN. Sebut daftar lengkap sebagaimana ditulis halaman dengan jumlahnya; bedakan rukun, syarat, sunnah, dan pembatal. Bila daftar tampak terpotong di batas halaman, katakan daftarnya mungkin belum lengkap.',
  perbandingan: 'Jenis: PERBANDINGAN. Jawab dua sisi: tulis ketentuan tiap pihak dari halaman masing-masing, lalu perbedaannya. Bila hanya satu sisi ada di halaman, jawab sisi itu dan jelaskan sisi yang tidak ditemukan di "catatan".',
  bilangan: 'Jenis: BILANGAN. Tulis angka persis seperti di halaman beserta satuan dan hal yang dihitung; jangan menghitung ulang atau membulatkan.',
  tata_cara: 'Jenis: TATA CARA. Urutkan langkah sesuai urutan di halaman; jangan menambah langkah yang tidak tertulis.',
  khilaf: 'Jenis: KHILAF. Sebut tiap pendapat beserta pemiliknya sebagaimana disebut halaman, dan penanda tarjih bila ada (الأصح، المعتمد، قيل). Jangan menyimpulkan mana yang benar bila halaman tidak menyatakannya.',
  irab: 'Jenis: I\'RAB/KAIDAH BAHASA. Jawab hanya dari kaidah dan contoh yang tertulis di halaman; jangan mengubah harakat contoh.',
  umum: '',
};

/* ------------------------------------------------------------------ 2. keluarga istilah */

// Tiap baris = satu keluarga kata yang di kitab sering saling menggantikan (bentuk kerja, kata benda, sinonim). Ditulis tanpa harakat.
// Dipakai HANYA untuk menambah varian kueri; varian berbobot lebih rendah daripada kueri asli.
export const KELUARGA_ISTILAH = [
  ['وجب', 'واجب', 'يجب', 'فرض', 'فريضة', 'يلزم', 'لازم', 'وجوب', 'تجب'],
  ['سنة', 'يسن', 'مسنون', 'مستحب', 'يستحب', 'مندوب', 'يندب', 'استحباب', 'تسن'],
  ['كره', 'مكروه', 'يكره', 'كراهة'],
  ['حرم', 'حرام', 'يحرم', 'محرم', 'تحريم'],
  ['جاز', 'يجوز', 'جائز', 'مباح', 'يباح', 'حلال', 'إباحة'],
  ['شرط', 'شروط', 'يشترط', 'مشروط', 'اشتراط'],
  ['ركن', 'أركان', 'فروض'],
  ['بطل', 'يبطل', 'تبطل', 'باطل', 'مبطلات', 'بطلان', 'فسد', 'يفسد', 'فاسد', 'مفسدات', 'نواقض', 'ينقض', 'نقض', 'ناقض'],
  ['صح', 'يصح', 'تصح', 'صحة', 'صحيح', 'يجزئ', 'إجزاء', 'مجزئ'],
  ['نجس', 'نجاسة', 'نجاسات', 'متنجس', 'تنجس'],
  ['نكاح', 'زواج', 'تزويج'],
  ['صوم', 'صيام', 'صائم'],
  ['رخصة', 'رخص', 'ترخص', 'عذر', 'أعذار', 'ضرورة'],
  ['خلاف', 'اختلاف', 'خلافا', 'قولان', 'وجهان'],
  ['تعريف', 'معنى', 'حقيقة', 'حد', 'ضابط'],
  ['دليل', 'أدلة', 'حجة', 'برهان', 'استدلال'],
  ['أقسام', 'قسم', 'أنواع', 'ضروب'],
  ['حكم', 'أحكام'],
  ['نية', 'ينوي', 'نوى', 'قصد'],
  ['توحيد', 'وحدانية'],
  ['نبي', 'أنبياء', 'رسول', 'رسل'],
  ['ملائكة', 'ملك'],
  ['صفة', 'صفات'],
  ['حديث', 'أحاديث', 'خبر', 'رواية', 'روى', 'رواه'],
  ['ضعيف', 'ضعف', 'واه'],
  ['إعراب', 'معرب', 'أعرب'],
  ['مبني', 'بناء'],
  ['مضاف', 'إضافة', 'مضاف إليه'],
  ['توبة', 'تاب', 'استغفار'],
  ['صبر', 'صابر', 'صابرين'],
  ['شكر', 'شاكر', 'شاكرين'],
  ['غسل', 'اغتسال', 'يغتسل'],
  ['تيمم', 'يتيمم'],
  ['استنجاء', 'استجمار'],
];

const AWALAN = ['بال', 'وال', 'فال', 'لل', 'ال', 'و', 'ف', 'ب', 'ل', 'ك'];
// Bentuk inti kata (awalan dibuang) untuk dicocokkan dengan keluarga istilah.
function inti(w) {
  const s = [w];
  for (const a of AWALAN) if (w.startsWith(a) && w.length - a.length >= 3) s.push(w.slice(a.length));
  return s;
}
const INDEKS_KELUARGA = new Map(); // kata normal -> indeks keluarga
KELUARGA_ISTILAH.forEach((fam, i) => { for (const k of fam) { const kn = n(k); if (kn && !kn.includes(' ') && !INDEKS_KELUARGA.has(kn)) INDEKS_KELUARGA.set(kn, i); } });
const KELUARGA_N = KELUARGA_ISTILAH.map((fam) => fam.map(n));

export const MAKS_VARIAN = 4;

/**
 * Varian kueri: tiap kueri (larik kata normal) diganti satu katanya dengan anggota lain dari keluarga istilahnya.
 * Deterministik; paling banyak `maks` varian; tidak mengulang kueri asli atau varian lain.
 * @param {string[][]} kuerian
 * @returns {string[][]}
 */
export function perluasKueri(kuerian, maks = MAKS_VARIAN) {
  const dasar = new Set((kuerian || []).map((q) => (q || []).join(' ')));
  const hasil = []; const lihat = new Set(dasar);
  const putaran = []; // ambil bergiliran dari tiap kueri agar varian tidak dikuasai kueri pertama
  for (const q of kuerian || []) {
    const daftar = [];
    (q || []).forEach((w, pos) => {
      let fam = -1;
      for (const s of inti(w)) { if (INDEKS_KELUARGA.has(s)) { fam = INDEKS_KELUARGA.get(s); break; } }
      if (fam < 0) return;
      const sudah = new Set(inti(w));
      for (const alt of KELUARGA_N[fam]) {
        if (!alt || alt.includes(' ') || sudah.has(alt)) continue;
        daftar.push((q || []).map((x, i) => (i === pos ? alt : x)));
      }
    });
    putaran.push(daftar);
  }
  for (let r = 0; hasil.length < maks && putaran.some((d) => d.length > r); r++) {
    for (const d of putaran) {
      if (hasil.length >= maks) break;
      const v = d[r]; if (!v) continue;
      const k = v.join(' '); if (lihat.has(k)) continue;
      lihat.add(k); hasil.push(v);
    }
  }
  return hasil;
}

/* ------------------------------------------------------------------ 3-4. peringkat beragam */

const akarKata = (w) => (w.startsWith('ال') && w.length > 4 ? w.slice(2) : w);
const hitung = (t, k) => { let c = 0; for (let i = t.indexOf(k); i >= 0; i = t.indexOf(k, i + k.length)) c++; return c; };
const bersihKueri = (kuerian) => (Array.isArray(kuerian) ? kuerian : []).map((q) => (Array.isArray(q) ? q : []).map(akarKata).filter((w) => w.length >= 2)).filter((q) => q.length);

export const BOBOT_VARIAN = 0.5;

/**
 * Peringkat halaman: skor dasar sama dengan peringkatHalaman (idf + bonus kata sekueri + bonus frasa), ditambah skor varian berbobot BOBOT_VARIAN,
 * dengan JAMINAN: halaman terbaik untuk tiap kueri asli ikut terpilih lebih dulu (pertanyaan majemuk tidak kehilangan salah satu bagiannya).
 * @param {{s:number,h:any,j:any,t:string}[]} halaman  halaman terindeks (t = teks normal)
 * @param {string[][]} kuerian  kueri asli (sudah dinormalkan)
 * @param {{k?:number, varian?:string[][]}} [opsi]
 * @returns {{seq:number,hal:any,juz:any,skor:number,perKueri:number[],wajib?:boolean}[]}  paling relevan lebih dulu; maksimum k + jumlah kueri
 */
export function peringkatBeragam(halaman, kuerian, { k = 6, varian = [] } = {}) {
  const asli = bersihKueri(kuerian); const alt = bersihKueri(varian);
  const kata = [...new Set([...asli.flat(), ...alt.flat()])];
  if (!asli.length || !kata.length || !Array.isArray(halaman) || !halaman.length) return [];
  const df = new Map(kata.map((w) => [w, 0]));
  const ada = halaman.map((p) => { const m = new Map(); for (const w of kata) { const c = hitung(p.t, w); if (c) { m.set(w, c); df.set(w, df.get(w) + 1); } } return m; });
  const N = halaman.length; const idf = (w) => Math.log(1 + N / Math.max(1, df.get(w)));
  const skorUntuk = (i, qs) => {
    const m = ada[i]; const wq = new Set(qs.flat());
    let sk = 0; for (const [w, c] of m) if (wq.has(w)) sk += idf(w) * (1 + 0.25 * Math.log(1 + c));
    if (!sk) return 0;
    for (const q of qs) {
      if (!q.every((w) => m.has(w))) continue;
      const bobot = q.reduce((a, w) => a + idf(w), 0);
      sk += 0.5 * bobot; if (q.length > 1 && halaman[i].t.includes(q.join(' '))) sk += 0.5 * bobot;
    }
    return sk;
  };
  const baris = halaman.map((p, i) => {
    const dasar = skorUntuk(i, asli);
    const sv = alt.length ? skorUntuk(i, alt) : 0;
    const per = asli.map((q) => skorUntuk(i, [q]));
    return { seq: p.s, hal: p.h, juz: p.j, skor: Math.round((dasar + BOBOT_VARIAN * sv) * 100) / 100, perKueri: per.map((x) => Math.round(x * 100) / 100) };
  }).filter((x) => x.skor > 0);
  const urut = (a, b) => b.skor - a.skor || a.seq - b.seq;
  baris.sort(urut);
  const terpilih = new Map();
  asli.forEach((_, qi) => { // wakil tiap kueri: halaman dengan skor kueri itu tertinggi
    let best = null; for (const x of baris) if (x.perKueri[qi] > 0 && (!best || x.perKueri[qi] > best.perKueri[qi])) best = x;
    if (best && !terpilih.has(best.seq)) terpilih.set(best.seq, { ...best, wajib: true });
  });
  for (const x of baris) { if (terpilih.size >= k + asli.length) break; if (!terpilih.has(x.seq)) terpilih.set(x.seq, x); }
  return [...terpilih.values()].sort(urut);
}

/**
 * Gabung kandidat lintas kitab menjadi paling banyak `k` halaman. Tiap kueri dijamin punya satu wakil terbaik (menurut perKueri) lebih dulu,
 * sisanya diisi menurut skor. Kandidat: { kitabId, seq, skor, perKueri:number[], ... }.
 */
export function pilihBeragam(kandidat, k, jumlahKueri = 0) {
  const urut = (a, b) => b.skor - a.skor || String(a.kitabId).localeCompare(String(b.kitabId)) || a.seq - b.seq;
  const semua = [...kandidat].sort(urut);
  const kunci = (x) => `${x.kitabId}#${x.seq}`;
  const pilih = new Map();
  for (let qi = 0; qi < jumlahKueri && pilih.size < k; qi++) {
    let best = null; for (const x of semua) { const v = (x.perKueri || [])[qi] || 0; if (v > 0 && (!best || v > ((best.perKueri || [])[qi] || 0))) best = x; }
    if (best && !pilih.has(kunci(best))) pilih.set(kunci(best), best);
  }
  for (const x of semua) { if (pilih.size >= k) break; if (!pilih.has(kunci(x))) pilih.set(kunci(x), x); }
  return [...pilih.values()].sort(urut);
}

/* ------------------------------------------------------------------ 5. halaman sambungan */

const SAMBUNG_AWAL = new Set(['ثم', 'أي', 'لكن', 'إلا', 'أو', 'حتى', 'لأن', 'ولأن', 'وإلا', 'إذ', 'بل', 'فإنه', 'وهو', 'وهي'].map(n));
const SAMBUNG_AKHIR = new Set(['و', 'ثم', 'في', 'من', 'إلى', 'على', 'عن', 'أو', 'ب', 'ل', 'ما', 'لا', 'الذي', 'التي', 'أن', 'إن', 'كان', 'هو', 'هي', 'مع', 'بين', 'حتى', 'لأن', 'إذا', 'لو', 'قد', 'ف', 'ك'].map(n));

/**
 * Apakah halaman tampak terpotong sehingga halaman tetangganya perlu dibaca untuk memahami kalimat yang melewati batas halaman?
 * Heuristik: akhir halaman tanpa tanda tutup (atau berhenti di kata sambung) => sesudah; awal halaman berupa penyambung => sebelum.
 * @returns {{sebelum:boolean, sesudah:boolean}}
 */
export function perluTetangga(teks) {
  const t = String(teks || '').trim();
  if (t.length < 40) return { sebelum: false, sesudah: false };
  const tok = n(t).split(' ').filter(Boolean);
  const huruf = t.replace(/[\s\d٠-٩]+$/, '').slice(-1);
  const tutup = /[.؟?!۔:؛;)\]}»"”]/.test(huruf);
  const adaTandaBaca = /[.؟?!۔]/.test(t.slice(0, -1));
  const sesudah = !tutup && (SAMBUNG_AKHIR.has(tok[tok.length - 1] || '') || adaTandaBaca || tok.length > 30);
  const sebelum = /^[)\]،,.؛:»]/.test(t) || SAMBUNG_AWAL.has(tok[0] || '');
  return { sebelum, sesudah };
}

/* ------------------------------------------------------------------ 6. potongan halaman di sekitar kata kunci */

function pecahBlok(teks, sasaran = 450) {
  const baris = String(teks).split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const blok = [];
  for (const b of baris) {
    if (b.length <= sasaran * 1.6) { blok.push(b); continue; }
    let sisa = b;
    while (sisa.length > sasaran * 1.6) { // pecah di batas kalimat/spasi terdekat dari sasaran
      const kalimat = sisa.slice(0, sasaran * 1.4).search(/[.؟!؛][^.؟!؛]*$/);
      let potong = kalimat > sasaran * 0.5 ? kalimat + 1 : sisa.lastIndexOf(' ', sasaran);
      if (potong < sasaran * 0.4) potong = sasaran;
      blok.push(sisa.slice(0, potong).trim()); sisa = sisa.slice(potong).trim();
    }
    if (sisa) blok.push(sisa);
  }
  return blok;
}

/**
 * Halaman -> teks paling banyak `maks` karakter, dipilih di SEKITAR bagian yang memuat kata kunci. Halaman pendek dikembalikan utuh.
 * Potongan yang dibuang diganti penanda "…". Urutan teks asli dipertahankan.
 * @param {string} teks  teks halaman asli
 * @param {string[]} kata  kata kunci normal (gabungan semua kueri)
 */
export function ringkasHalaman(teks, kata, maks = 3500) {
  const s = String(teks || '');
  if (s.length <= maks) return s;
  const kunci = [...new Set((kata || []).map(akarKata).filter((w) => w.length >= 2))];
  const blok = pecahBlok(s);
  if (!blok.length) return s.slice(0, maks);
  const skor = blok.map((b) => { const t = n(b); let sk = 0; for (const w of kunci) { const c = hitung(t, w); if (c) sk += 2 + Math.log(1 + c); } return sk; });
  let pusat = 0; skor.forEach((v, i) => { if (v > skor[pusat]) pusat = i; });
  if (!skor[pusat]) return s.slice(0, maks); // tidak ada kecocokan: perilaku lama (kepala halaman)
  const ambil = new Set([pusat]); let total = blok[pusat].length;
  let kiri = pusat - 1; let kanan = pusat + 1;
  while (total < maks && (kiri >= 0 || kanan < blok.length)) {
    const pilihKanan = kanan < blok.length && (kiri < 0 || skor[kanan] >= skor[kiri]);
    const i = pilihKanan ? kanan : kiri;
    if (i < 0 || i >= blok.length) break;
    if (total + blok[i].length + 1 > maks) break;
    ambil.add(i); total += blok[i].length + 1; if (pilihKanan) kanan++; else kiri--;
  }
  const urut = [...ambil].sort((a, b) => a - b);
  let keluar = ''; let prev = -1;
  for (const i of urut) { keluar += `${prev >= 0 && i !== prev + 1 ? '\n…\n' : (keluar ? '\n' : '')}${blok[i]}`; prev = i; }
  if (urut[0] > 0) keluar = `…\n${keluar}`;
  if (prev < blok.length - 1) keluar = `${keluar}\n…`;
  return keluar.slice(0, maks + 6);
}

/** Kata kunci normal gabungan dari beberapa kueri (untuk ringkasHalaman). */
export const kataDariKueri = (kuerian) => [...new Set((kuerian || []).flat())];
export { siapkanKueri };
