// Peta Teks: analisis DETERMINISTIK (tanpa AI, tanpa jaringan) atas satu potongan teks kitab Arab. Murni, dipakai klien dan server.
//
// Tujuan: memberi AI (dan pengguna) "peta bacaan" sebelum menyusun soal, menerjemah, menelaah, atau menjawab pertanyaan:
// disiplin ilmu, lapisan teks (matan/syarh/hasyiyah), judul bagian, kata hukum, pembatas dan pengecualian, istilah tarjih mazhab,
// penanda khilaf, bilangan tertulis, serta kondisi teks (terpotong, OCR rusak, berharakat atau tidak).
//
// Prinsip: peta ini ALAT BANTU membaca, bukan sumber isi. Ia dihitung dari kata-kata di teks, bisa keliru (mis. "سنة" bermakna tahun),
// dan selalu diberi label itu di prompt. Isi <teks_kitab> tetap satu-satunya sumber jawaban.
import { normalCari } from './cariKitab.js';

const HARAKAT = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ]/g;
const HURUF_ARAB = /[ء-يٱ-ەٮٯ]/g;
const BERSIH_FRAGMEN = (s) => String(s || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();

const n = (s) => normalCari(s);
// Ejaan asli (dengan hamza, ta marbuthah) untuk menampilkan hasil; kunci = bentuk normal.
const ASLI = new Map();
const catatAsli = (daftar) => { for (const x of daftar) ASLI.set(n(x), x); };
const tampil = (norm) => ASLI.get(norm) || norm;

/* ------------------------------------------------------------------ disiplin */

export const DISIPLIN = {
  fiqh: 'Fiqih',
  akidah: 'Akidah/Tauhid',
  hadits: 'Hadits dan ilmunya',
  nahwu_sharaf: 'Nahwu/Sharaf',
  balaghah: 'Balaghah (ma\'ani, bayan, badi\')',
  mustalah: 'Mushthalah hadits',
  ushul: 'Ushul fiqih dan kaidah',
  tasawuf_akhlak: 'Akhlak/Tasawuf',
  tafsir_quran: 'Tafsir, Ulumul Qur\'an, dan Tajwid',
  sirah_tarikh: 'Sirah dan Tarikh',
  umum: 'Umum',
};

// Mata pelajaran (teks bebas dari form) -> disiplin. Urutan penting: yang lebih spesifik lebih dulu.
const POLA_MAPEL = [
  ['balaghah', /balaghah|balagoh|bayan\b|ma'?ani\b|badi'?\b|jauhar maknun|uqudul juman|balaghoh/i],
  ['mustalah', /mus?thalah|mustalah|baiquniyah|nukhbatul fikar|ilmu hadi[st]|ulumul hadi[st]/i],
  ['nahwu_sharaf', /nahw|shorof|sharaf|sorof|tashrif|tasrif|jurumiyah|jurumiah|amtsilati|imrithi|alfiyah|bahasa arab/i],
  ['ushul', /ushul|usul|qawa'?id|qowaid|kaidah|waraqat|mantiq/i],
  ['hadits', /hadi[st]|musthalah|mushthalah|arbain|riyadhus|bulugh|mustalah/i],
  ['tafsir_quran', /tafsir|qur'?an|quran|tajwid|ulumul|jalalain|tahfidz|tahfiz/i],
  ['akidah', /akidah|aqidah|akhidah|tauhid|tauhīd|ilmu kalam|jauharah|sanusiyah|aqaid|ushuluddin/i],
  ['tasawuf_akhlak', /akhlak|akhlaq|tasawuf|tasawwuf|ta'?lim|adab|bidayatul|ihya|nashaihul|washaya/i],
  ['sirah_tarikh', /sirah|tarikh|sejarah|ski\b|khulashah|nurul yaqin/i],
  ['fiqh', /fiqi?h|fikih|fiqh|thaharah|ibadah|muamalah|munakahat|safinah|taqrib|fathul qarib|fathul mu'?in|sullam|mabadi/i],
];

// Kata petunjuk (sudah dinormalkan lewat normalCari saat dimuat). Dipakai bila mata pelajaran tak menentukan.
const PETUNJUK = {
  fiqh: ['يجب', 'يسن', 'يحرم', 'يكره', 'يجوز', 'شرط', 'شروط', 'ركن', 'اركان', 'باطل', 'يبطل', 'صلاه', 'وضوء', 'زكاه', 'صوم', 'نجس', 'طهاره', 'فرض', 'مكروه', 'مندوب', 'سنه', 'ماء'],
  akidah: ['توحيد', 'ايمان', 'صفه', 'صفات', 'قديم', 'حادث', 'مستحيل', 'رسول', 'نبي', 'ملائكه', 'قدر', 'قضاء', 'رؤيه', 'معجزه', 'عقيده', 'كفر', 'الله', 'واجب'],
  hadits: ['حدثنا', 'اخبرنا', 'رواه', 'سمعت', 'متفق', 'سند', 'راوي', 'صحيح', 'ضعيف', 'حسن', 'مرسل', 'متواتر', 'مرفوع', 'موقوف', 'رسول'],
  nahwu_sharaf: ['فاعل', 'مفعول', 'مبتدا', 'خبر', 'مرفوع', 'منصوب', 'مجرور', 'فعل', 'ماضي', 'مضارع', 'اسم', 'حرف', 'مبني', 'معرب', 'مضاف', 'نعت', 'حال', 'تمييز', 'وزن', 'اشتقاق', 'تصريف', 'اعراب', 'جزم'],
  ushul: ['دليل', 'ادله', 'عام', 'خاص', 'مطلق', 'مقيد', 'قياس', 'اجماع', 'علت', 'علة', 'علي', 'قاعده', 'استصحاب', 'مفهوم', 'منطوق', 'نهي', 'امر', 'مجمل', 'مبين', 'تخصيص'],
  tasawuf_akhlak: ['قلب', 'نفس', 'اخلاص', 'رياء', 'توبه', 'صبر', 'شكر', 'زهد', 'تواضع', 'كبر', 'حسد', 'عجب', 'محبه', 'خوف', 'رجاء', 'مجاهده', 'سالك', 'طريق', 'ورع', 'تقوي'],
  tafsir_quran: ['ايه', 'ايات', 'سوره', 'نزلت', 'تفسير', 'تجويد', 'غنه', 'ادغام', 'اخفاء', 'اظهار', 'مخرج', 'قراءه', 'مكيه', 'مدنيه', 'ناسخ', 'منسوخ'],
  balaghah: ['تشبيه', 'استعاره', 'مجاز', 'كنايه', 'طباق', 'جناس', 'بلاغه', 'معاني', 'بيان', 'بديع', 'فصاحه', 'اطناب', 'ايجاز', 'مشبه', 'شبه', 'قرينه', 'توريه', 'مقابله', 'التفات', 'سجع'],
  mustalah: ['مصطلح', 'اسناد', 'متن', 'مرسل', 'منقطع', 'معضل', 'متواتر', 'احاد', 'مشهور', 'غريب', 'عزيز', 'موضوع', 'متروك', 'تدليس', 'مدلس', 'جرح', 'تعديل', 'ثقه', 'ضبط', 'عداله', 'شاذ', 'منكر', 'معلل', 'مضطرب', 'سند', 'راوي', 'صحيح', 'ضعيف', 'حسن'],
  sirah_tarikh: ['غزوه', 'هجره', 'مكه', 'مدينه', 'خليفه', 'ولد', 'توفي', 'معركه', 'فتح', 'بعثه', 'سريه', 'عام'],
};
const PETUNJUK_N = Object.fromEntries(Object.entries(PETUNJUK).map(([k, v]) => [k, new Set(v.map(n))]));

/**
 * Disiplin teks. Mata pelajaran yang dikenali menentukan disiplin utama; bila tidak, dihitung dari kata petunjuk di teks.
 * @returns {{id:string,label:string,sumber:'mapel'|'teks'|'tidak_jelas',sekunder?:{id:string,label:string}}}
 */
export function kenaliDisiplin(teks, mapel = '') {
  const m = String(mapel || '');
  for (const [id, re] of POLA_MAPEL) if (re.test(m)) return { id, label: DISIPLIN[id], sumber: 'mapel' };
  const tok = n(teks).split(' ').filter(Boolean);
  if (tok.length < 8) return { id: 'umum', label: DISIPLIN.umum, sumber: 'tidak_jelas' };
  const skor = Object.entries(PETUNJUK_N).map(([id, set]) => {
    let hit = 0; const beda = new Set();
    for (const t of tok) { const dasar = /^[وف]/.test(t) && t.length > 3 ? t.slice(1) : t; const inti = dasar.startsWith('ال') && dasar.length > 4 ? dasar.slice(2) : dasar; if (set.has(t) || set.has(inti)) { hit++; beda.add(inti); } }
    return { id, s: hit + beda.size * 2 };
  }).sort((a, b) => b.s - a.s);
  const [a, b] = skor;
  if (!a || a.s < 6) return { id: 'umum', label: DISIPLIN.umum, sumber: 'tidak_jelas' };
  const hasil = { id: a.id, label: DISIPLIN[a.id], sumber: 'teks' };
  if (b && b.s >= a.s * 0.6 && b.s >= 6) hasil.sekunder = { id: b.id, label: DISIPLIN[b.id] };
  return hasil;
}

/* ------------------------------------------------------------------ kamus penanda */

// Kata hukum taklifi dan wadh'i. Bentuk dinormalkan (normalCari): ة->ه, أ->ا, ى->ي, tanpa harakat.
const KELAS_HUKUM = {
  wajib: ['يجب', 'يلزم', 'واجب', 'فرض', 'فريضه', 'لزم', 'وجب', 'وجوب', 'لازم', 'يتعين', 'متعين', 'تجب', 'تلزم'],
  sunnah: ['يسن', 'يستحب', 'يندب', 'سنه', 'مسنون', 'مستحب', 'مندوب', 'استحباب', 'تسن', 'تستحب', 'سن'],
  makruh: ['يكره', 'مكروه', 'كراهه', 'كره', 'تكره'],
  haram: ['يحرم', 'حرام', 'محرم', 'تحريم', 'حرم', 'تحرم'],
  mubah: ['يجوز', 'جائز', 'مباح', 'يباح', 'حلال', 'يحل', 'جاز', 'اباحه', 'تجوز'],
  sah: ['يصح', 'تصح', 'صح', 'صحيح', 'صحه', 'يجزي', 'تجزي', 'مجزي', 'اجزاء'],
  batal: ['يبطل', 'تبطل', 'بطل', 'باطل', 'بطلت', 'يفسد', 'تفسد', 'فسد', 'فاسد', 'ينقض', 'تنقض', 'ناقض', 'نواقض', 'مبطلات', 'مفسدات', 'بطلان'],
};
const BIGRAM_HUKUM = [
  ['لا يجوز', 'haram'], ['لا يحل', 'haram'], ['لا تجوز', 'haram'], ['لا تحل', 'haram'],
  ['خلاف الأولى', 'khilaful_aula'], ['لا بأس', 'mubah'], ['لا بد', 'wajib'],
];
const PETA_KATA_HUKUM = new Map();
for (const [kelas, daftar] of Object.entries(KELAS_HUKUM)) for (const k of daftar) PETA_KATA_HUKUM.set(n(k), kelas);
const BIGRAM_N = BIGRAM_HUKUM.map(([b, k]) => [n(b), k]);
const NEGASI = new Set(['لا', 'لم', 'لن', 'ليس', 'غير'].map(n));
const AMBIGU_HUKUM = new Set(['ينبغي', 'يستحسن'].map(n));

export const LABEL_HUKUM = { wajib: 'wajib', sunnah: 'sunnah', makruh: 'makruh', haram: 'haram', mubah: 'boleh', sah: 'sah/mencukupi', batal: 'batal/rusak', khilaful_aula: 'khilaful aula' };

const PEMBATAS_ASLI = ['إلا', 'غير', 'سوى', 'بشرط', 'لكن', 'عدا', 'ما عدا', 'إذا', 'لو', 'حيث', 'إنما', 'فقط', 'فحسب', 'بدون', 'بلا', 'مهما', 'ما لم', 'من غير', 'إلا أن', 'إلا إذا'];
const PEMBATAS = PEMBATAS_ASLI.map((x) => [n(x), n(x).split(' ').length]);
const NEGASI_TAMPIL = ['لا', 'لم', 'لن', 'ليس'].map(n);

const ISTILAH_MAZHAB = [
  ['الأظهر', 'lebih kuat di antara dua qaul (istilah Syafi\'iyah)'],
  ['الأصح', 'lebih sahih di antara beberapa wajh (istilah Syafi\'iyah)'],
  ['الصحيح', 'pendapat yang dinilai sahih (tarjih)'],
  ['المذهب', 'pendapat mazhab hasil tarjih (bila dipakai sebagai istilah, bukan sekadar "mazhab")'],
  ['المعتمد', 'pendapat pegangan'],
  ['المنصوص', 'pendapat yang ditegaskan langsung oleh imam'],
  ['الأشهر', 'pendapat yang lebih masyhur'],
  ['المشهور', 'pendapat yang masyhur'],
  ['الراجح', 'pendapat yang unggul'],
  ['المرجوح', 'pendapat yang kalah kuat'],
  ['الضعيف', 'pendapat lemah'],
  ['الشيخان', 'al-Nawawi dan al-Rafi\'i (istilah Syafi\'iyah)'],
  ['الجديد', 'qaul baru Imam al-Syafi\'i (Mesir)'],
  ['القديم', 'qaul lama Imam al-Syafi\'i (Irak)'],
  ['قولان', 'dua qaul dari imam'],
  ['وجهان', 'dua wajh dari ashab mazhab'],
  ['وجه', 'wajh (pendapat ashab mazhab)'],
  ['قيل', 'pendapat dinukil, umumnya bukan pegangan'],
  ['الصواب', 'yang dinilai benar'],
  ['الأحوط', 'yang lebih hati-hati'],
  ['عند الجمهور', 'menurut jumhur'],
  ['الجمهور', 'jumhur ulama'],
].map(([k, g]) => [n(k), g, k]);

const NAMA_MAZHAB_ASLI = ['الحنفية', 'المالكية', 'الشافعية', 'الحنابلة', 'الحنفي', 'المالكي', 'الشافعي', 'الحنبلي', 'أبو حنيفة', 'مالك', 'أحمد', 'الأشاعرة', 'الماتريدية', 'الإمام'];
const NAMA_MAZHAB = NAMA_MAZHAB_ASLI.map(n);
const MARKER_KHILAF = ['خلافا', 'خلاف', 'اختلف', 'اختلفوا', 'قيل', 'قولان', 'وجهان', 'خلافا ل'].map(n);

const PENANDA_LAPISAN = ['قوله', 'قال الشارح', 'قال المصنف', 'قال المؤلف', 'قال الماتن', 'قال الشيخ', 'اقول', 'المتن', 'الشرح', 'ش', 'م'].map((x) => [x, n(x)]);

const KATA_JUDUL = ['كتاب', 'باب', 'فصل', 'مسالة', 'فرع', 'تنبيه', 'فائده', 'تتمه', 'خاتمه', 'قاعده', 'ضابط', 'مطلب', 'فروع', 'تنبيهات', 'فوائد', 'مقدمه', 'اصل', 'مبحث', 'درس'].map(n);

const ANGKA = new Set(['واحد', 'واحده', 'اثنان', 'اثنين', 'اثنتان', 'اثنتين', 'ثلاثه', 'ثلاث', 'اربعه', 'اربع', 'خمسه', 'خمس', 'سته', 'ست', 'سبعه', 'سبع', 'ثمانيه', 'ثماني', 'ثمان', 'تسعه', 'تسع', 'عشره', 'عشر', 'عشرون', 'عشرين', 'ثلاثون', 'ثلاثين', 'اربعون', 'اربعين', 'خمسون', 'خمسين', 'ستون', 'ستين', 'سبعون', 'سبعين', 'ثمانون', 'ثمانين', 'تسعون', 'تسعين', 'ماءه', 'مائه', 'مايه', 'الف', 'ثلث', 'ربع', 'نصف', 'ثمن', 'سدس'].map(n));

const SAMBUNG_AWAL = new Set(['ثم', 'اي', 'لكن', 'الا', 'او', 'حتي', 'لان', 'ولان', 'والا', 'اذ', 'بل'].map(n));
const SAMBUNG_AKHIR = new Set(['و', 'ثم', 'في', 'من', 'الي', 'علي', 'عن', 'او', 'ب', 'ل', 'ما', 'لا', 'الذي', 'التي', 'ان', 'كان', 'هو', 'هي', 'مع', 'بين', 'حتي', 'لان', 'اذا', 'لو', 'قد', 'ف', 'ك'].map(n));

catatAsli(PEMBATAS_ASLI);
catatAsli(Object.values(KELAS_HUKUM).flat());
catatAsli(['سنة', 'سنة', 'فريضة', 'كراهة', 'إباحة', 'صحة', 'استحباب', 'استحباب', 'مائة', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'واحدة', 'اثنان', 'اثنين', 'الشافعية', 'الحنفية', 'المالكية', 'الحنابلة', 'أبو حنيفة', 'الأشاعرة', 'الماتريدية', 'الإمام', 'خلافًا', 'قولان', 'وجهان']);
for (const [k, , asli] of ISTILAH_MAZHAB) ASLI.set(k, asli);
for (const x of NAMA_MAZHAB_ASLI) ASLI.set(n(x), x);

/* ------------------------------------------------------------------ utilitas */

/** Token normal dan token asli (berharakat) yang sejajar, agar cuplikan di peta memakai ejaan teks aslinya. */
function siapkanToken(asli) {
  const tok = []; const ori = [];
  for (const w of String(asli || '').match(/[\p{L}\p{M}\p{N}]+/gu) || []) {
    const nw = n(w); if (!nw) continue;
    for (const x of nw.split(' ')) { if (x) { tok.push(x); ori.push(w); } }
  }
  return { tok, ori };
}

// Bentuk dasar token: buang penyambung depan (و ف) dan awalan (ب ل ك ال) satu per satu; kembalikan semua kandidat.
function kandidat(tok) {
  const hasil = new Set([tok]);
  const tambah = (s) => { if (s.length >= 2) hasil.add(s); };
  const A = [tok];
  if (/^[وف]/.test(tok) && tok.length > 2) { tambah(tok.slice(1)); A.push(tok.slice(1)); }
  for (const x of A) {
    if (x.startsWith('ال') && x.length > 4) tambah(x.slice(2));
    if (x.startsWith('بال') && x.length > 5) tambah(x.slice(3));
    if (x.startsWith('لل') && x.length > 4) tambah(x.slice(2));
    if (/^[بلك]/.test(x) && x.length > 3) tambah(x.slice(1));
  }
  return [...hasil];
}
const cuplik = (ori, i, kiri = 2, kanan = 3) => BERSIH_FRAGMEN(ori.slice(Math.max(0, i - kiri), i + kanan + 1).join(' '));
const hitungDalam = (arr) => { const m = new Map(); for (const x of arr) m.set(x, (m.get(x) || 0) + 1); return m; };

/* ------------------------------------------------------------------ bagian peta */

function petaHukum(tok, ori) {
  const kelas = {}; const dinegasi = []; const ambigu = new Set();
  const catat = (k, kata, i, negasi) => {
    const tk = tampil(kata);
    (kelas[k] || (kelas[k] = new Map())).set(tk, (kelas[k].get(tk) || 0) + 1);
    if (negasi && dinegasi.length < 6) dinegasi.push({ kelas: k, kata: tk, konteks: cuplik(ori, i, 2, 2) });
  };
  const dipakai = new Set();
  for (let i = 0; i < tok.length - 1; i++) {
    const a = kandidat(tok[i]); const b = kandidat(tok[i + 1]);
    const hit = BIGRAM_N.find(([x]) => { const [x1, x2] = x.split(' '); return a.includes(x1) && b.includes(x2); });
    if (hit) { catat(hit[1], hit[0], i, false); dipakai.add(i); dipakai.add(i + 1); }
  }
  tok.forEach((t, i) => {
    if (dipakai.has(i)) return;
    const k = kandidat(t);
    const amb = k.find((x) => AMBIGU_HUKUM.has(x));
    if (amb) { ambigu.add(amb); return; }
    const inti = k.find((x) => PETA_KATA_HUKUM.has(x));
    if (!inti) return;
    const sebelum = i > 0 ? kandidat(tok[i - 1]) : [];
    catat(PETA_KATA_HUKUM.get(inti), inti, i, sebelum.some((x) => NEGASI.has(x)));
  });
  const ringkas = {};
  for (const [k, m] of Object.entries(kelas)) ringkas[k] = { jumlah: [...m.values()].reduce((a, b) => a + b, 0), kata: [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([w, c]) => `${w}${c > 1 ? `×${c}` : ''}`) };
  return { kelas: ringkas, dinegasi, ambigu: [...ambigu].map(tampil) };
}

function petaPembatas(tok) {
  const hit = new Map();
  tok.forEach((t, i) => {
    for (const [p, len] of PEMBATAS) {
      const gabung = tok.slice(i, i + len).join(' ');
      if (len === 1 ? kandidat(t).includes(p) : gabung === p) hit.set(p, (hit.get(p) || 0) + 1);
    }
  });
  let nafiIlla = 0;
  const ilaIdx = []; const nafiIdx = [];
  tok.forEach((t, i) => { const k = kandidat(t); if (k.includes(n('الا'))) ilaIdx.push(i); if (NEGASI_TAMPIL.some((x) => k.includes(x))) nafiIdx.push(i); });
  for (const i of ilaIdx) if (nafiIdx.some((j) => j < i && i - j <= 9)) nafiIlla++;
  const negasi = {}; tok.forEach((t) => { const k = kandidat(t).find((x) => NEGASI_TAMPIL.includes(x)); if (k) negasi[k] = (negasi[k] || 0) + 1; });
  return { pembatas: [...hit.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, c]) => [tampil(k), c]), negasi, nafiIlla };
}

function petaMazhab(tok) {
  const norm = tok.join(' ');
  const istilah = [];
  for (const [k, gloss, asli] of ISTILAH_MAZHAB) {
    const re = new RegExp(`(?:^| )[وف]?[بك]?${k}(?= |$)`, 'g');
    const c = (norm.match(re) || []).length;
    if (c) istilah.push({ kata: asli, jumlah: c, arti: gloss });
  }
  const khilaf = tok.filter((t) => kandidat(t).some((x) => MARKER_KHILAF.includes(x))).length;
  const nama = [...new Set(tok.map((t) => kandidat(t).find((x) => NAMA_MAZHAB.includes(x))).filter(Boolean))].slice(0, 6).map(tampil);
  return { istilah: istilah.slice(0, 8), khilaf, nama };
}

function petaLapisan(asli, tok) {
  const hitung = {};
  for (const [label, norm] of PENANDA_LAPISAN) {
    if (norm.length <= 1) continue; // "ش" dan "م" diperiksa lewat pola kurung di bawah, bukan sebagai token lepas
    const len = norm.split(' ').length; let c = 0;
    for (let i = 0; i < tok.length; i++) {
      const bagian = tok.slice(i, i + len).join(' ');
      if (len === 1 ? kandidat(tok[i]).includes(norm) : bagian === norm) c++;
    }
    if (c) hitung[label] = c;
  }
  const kurung = (asli.match(/[\(\[]\s*(?:م|ش)\s*[\)\]]/g) || []).length;
  const qawluh = hitung['قوله'] || 0;
  let bentuk = 'tidak_ada_penanda';
  if (qawluh >= 2 || /[\(\[]\s*قوله/.test(asli)) bentuk = 'syarh_atau_hasyiyah';
  else if (hitung['قال الشارح'] || hitung['قال الماتن'] || kurung >= 2) bentuk = 'syarh';
  else if (hitung['قال المصنف'] || hitung['قال المؤلف']) bentuk = 'ada_nukilan_pengarang';
  return { bentuk, penanda: hitung, kurungMatanSyarh: kurung };
}

function petaJudul(asli) {
  const hasil = [];
  for (const baris of String(asli || '').split(/\n+/)) {
    const t = baris.trim(); if (!t || t.length > 140) continue;
    const kat = n(t).split(' ').filter(Boolean); if (!kat.length || kat.length > 16) continue;
    const awal = kandidat(kat[0]);
    const hit = KATA_JUDUL.find((j) => awal.includes(j));
    if (hit && (kat.length <= 12)) hasil.push({ jenis: hit, teks: BERSIH_FRAGMEN(t).slice(0, 80) });
    if (hasil.length >= 8) break;
  }
  return hasil;
}

function petaBilangan(tok, ori) {
  const hasil = []; const lihat = new Set();
  tok.forEach((t, i) => {
    const ang = /^\d{1,4}$/.test(t) ? t : kandidat(t).find((x) => ANGKA.has(x));
    if (!ang) return;
    if (/^\d+$/.test(ang) && tok.length > 3 && (i === 0 || i === tok.length - 1)) return; // angka di tepi sering nomor halaman/catatan kaki
    const c = cuplik(ori, i, 2, 3); const kunci = `${ang}|${c}`;
    if (lihat.has(kunci)) return; lihat.add(kunci);
    if (hasil.length < 10) hasil.push({ angka: tampil(ang), konteks: c });
  });
  return hasil;
}

function petaKondisi(asli, tok) {
  const t = String(asli || '').trim();
  const arab = (t.match(HURUF_ARAB) || []).length;
  const harakat = (t.match(HARAKAT) || []).length;
  const rasio = arab ? harakat / arab : 0;
  const berharakat = rasio >= 0.4 ? 'penuh' : rasio >= 0.05 ? 'sebagian' : 'tanpa';
  const awalTok = tok[0] || ''; const akhirTok = tok[tok.length - 1] || '';
  const awalTerpotong = !!t && (/^[)\]،,.؛:»]/.test(t) || SAMBUNG_AWAL.has(awalTok));
  const akhirHuruf = t.replace(/[\s\d٠-٩]+$/, '').slice(-1);
  const akhir = /[.؟?!۔:؛;)\]}»"”]/.test(akhirHuruf) ? 'rapi' : (SAMBUNG_AKHIR.has(akhirTok) ? 'menggantung' : 'tanpa_tanda');
  const tunggal = tok.filter((x) => x.length === 1 && !/\d/.test(x)).length;
  const rasioTunggal = tok.length ? tunggal / tok.length : 0;
  const asing = (t.match(/[^\s؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿\d.,;:!?()\[\]{}"'«»\-–—_*\/\\|ـ…“”‘’،؛؟۔٪%+=]/g) || []).length;
  const rasioAsing = t.length ? asing / t.length : 0;
  const noise = Math.min(1, rasioTunggal * 2 + rasioAsing * 3);
  return { berharakat, awalTerpotong, akhir, noiseOcr: Math.round(noise * 100) / 100, hurufTerpisah: rasioTunggal >= 0.12, hurufAsing: rasioAsing >= 0.04 };
}

/* ------------------------------------------------------------------ peta utuh */

/**
 * @param {string} teks  teks Arab (sudah dibersihkan pemanggil)
 * @param {{mapel?:string}} [opsi]
 */
export function petaTeks(teks, { mapel = '' } = {}) {
  const asli = String(teks || '');
  const { tok, ori } = siapkanToken(asli);
  const disiplin = kenaliDisiplin(asli, mapel);
  const hukum = petaHukum(tok, ori);
  const pb = petaPembatas(tok);
  const mazhab = petaMazhab(tok);
  const lapisan = petaLapisan(asli, tok);
  const judul = petaJudul(asli);
  const bilangan = petaBilangan(tok, ori);
  const kondisi = petaKondisi(asli, tok);

  const peringatan = [];
  if (kondisi.awalTerpotong) peringatan.push('Awal teks tampak terpotong (dimulai dengan penyambung atau tanda tutup); jangan membuat butir yang bergantung pada kalimat sebelumnya.');
  if (kondisi.akhir === 'menggantung') peringatan.push('Akhir teks tampak menggantung (berhenti di kata sambung atau preposisi); jangan melengkapi kalimat yang terpotong.');
  if (kondisi.hurufTerpisah) peringatan.push('Banyak huruf lepas: kemungkinan spasi rusak atau hasil OCR. Kata yang meragukan jangan dijadikan dasar soal.');
  if (kondisi.hurufAsing) peringatan.push('Ada banyak karakter non-Arab di tengah teks (kemungkinan noise OCR atau sisa format).');
  if (kondisi.berharakat === 'tanpa' && disiplin.id === 'nahwu_sharaf') peringatan.push('Teks nahwu/sharaf tanpa harakat: i\'rab, wazan, dan tanda baca tidak bisa ditentukan dengan pasti; soal i\'rab hanya bila harakatnya terbaca.');
  if (hukum.dinegasi.length) peringatan.push('Ada kata hukum yang didahului penafian (mis. لا يجب = tidak wajib, bukan wajib): baca negasinya.');
  if (pb.nafiIlla) peringatan.push('Ada pola penafian + إلا (pembatasan): hanya yang dikecualikan yang berlaku; jangan memperluas.');
  if (hukum.ambigu.length) peringatan.push('Ada kata "ينبغي": maknanya sunnah atau wajib menurut penggunaan kitab; ikuti konteks, jangan menyimpulkan sendiri.');

  return { panjang: asli.length, kata: tok.length, disiplin, lapisan, judul, hukum, pembatas: pb, mazhab, bilangan, kondisi, peringatan };
}

const fmtPasang = (arr) => arr.map(([w, c]) => `${w}${c > 1 ? `×${c}` : ''}`).join(', ');

/**
 * Peta -> blok teks untuk prompt. '' bila teks terlalu pendek untuk dipetakan.
 * `maks` membatasi panjang agar tidak memboroskan token.
 */
export function blokPetaTeks(peta, { maks = 1800 } = {}) {
  if (!peta || !peta.kata || peta.kata < 6) return '';
  const b = [];
  b.push(`Disiplin: ${peta.disiplin.label}${peta.disiplin.sumber === 'mapel' ? ' (dari mata pelajaran)' : peta.disiplin.sumber === 'teks' ? ' (dugaan dari isi teks)' : ' (tidak jelas)'}${peta.disiplin.sekunder ? `; juga memuat unsur ${peta.disiplin.sekunder.label}` : ''}`);
  const L = peta.lapisan;
  if (L.bentuk === 'syarh_atau_hasyiyah') b.push(`Lapisan: gaya syarh/hasyiyah (kutipan lafaz matan "قوله" diikuti penjelasan; ${L.penanda['قوله'] || 0} penanda). Bedakan lafaz matan dari penjelasan pensyarah.`);
  else if (L.bentuk === 'syarh') b.push('Lapisan: tampak ada pemisah matan dan syarh (penanda قال الشارح/الماتن atau (م)/(ش)).');
  else if (L.bentuk === 'ada_nukilan_pengarang') b.push('Lapisan: ada penanda "قال المصنف/المؤلف": periksa siapa yang sedang dikutip.');
  if (peta.judul.length) b.push(`Judul/penanda bagian: ${peta.judul.slice(0, 6).map((j) => j.teks).join(' | ')}`);
  const k = peta.hukum.kelas; const baris = Object.entries(k).map(([kelas, v]) => `${LABEL_HUKUM[kelas] || kelas}: ${v.kata.join(', ')}`);
  if (baris.length) b.push(`Kata hukum terdeteksi otomatis (bisa keliru, mis. "سنة" = tahun): ${baris.join('; ')}`);
  if (peta.hukum.dinegasi.length) b.push(`Kata hukum yang dinegasi: ${peta.hukum.dinegasi.map((d) => d.konteks).slice(0, 4).join(' | ')}`);
  const P = peta.pembatas;
  if (P.pembatas.length || P.nafiIlla) b.push(`Pembatas/pengecualian: ${fmtPasang(P.pembatas)}${P.nafiIlla ? `; pola penafian+إلا ×${P.nafiIlla}` : ''}. Hukum berubah oleh pembatas: baca sampai ujung kalimat.`);
  if (peta.mazhab.istilah.length) b.push(`Istilah tarjih/mazhab: ${peta.mazhab.istilah.map((x) => `${x.kata}${x.jumlah > 1 ? `×${x.jumlah}` : ''} (${x.arti})`).join('; ')}`);
  if (peta.mazhab.khilaf || peta.mazhab.nama.length) b.push(`Perbedaan pendapat: ${peta.mazhab.khilaf ? `${peta.mazhab.khilaf} penanda khilaf` : 'tidak ada penanda khilaf'}${peta.mazhab.nama.length ? `; disebut: ${peta.mazhab.nama.join(', ')}` : ''}`);
  if (peta.bilangan.length) b.push(`Bilangan tertulis (ikuti persis): ${peta.bilangan.slice(0, 6).map((x) => x.konteks).join(' | ')}`);
  const C = peta.kondisi;
  b.push(`Kondisi teks: harakat ${C.berharakat}; awal ${C.awalTerpotong ? 'mungkin terpotong' : 'wajar'}; akhir ${C.akhir === 'rapi' ? 'bertanda tutup' : C.akhir === 'menggantung' ? 'menggantung' : 'tanpa tanda tutup'}; dugaan noise OCR ${C.noiseOcr}`);
  if (peta.peringatan.length) b.push(`Peringatan baca:\n- ${peta.peringatan.join('\n- ')}`);
  const isi = BERSIH_FRAGMEN(b.join('\n')).length ? b.join('\n') : '';
  const teksBlok = `<peta_teks>\nPeta ini dihitung otomatis oleh kode dari kata-kata teks (bukan oleh AI) sebagai alat bantu membaca. Bisa keliru dan BUKAN sumber isi: <teks_kitab> tetap satu-satunya sumber.\n${isi}\n</peta_teks>`;
  return teksBlok.length > maks ? `${teksBlok.slice(0, maks - 14).replace(/[<>]/g, '')}\n</peta_teks>` : teksBlok;
}

/** Ringkasan satu baris untuk satu halaman (dipakai Tanya Kitab per halaman yang dibacakan). */
export function ringkasPetaHalaman(teks, { mapel = '' } = {}) {
  const p = petaTeks(teks, { mapel });
  if (p.kata < 6) return '';
  const bagian = [];
  if (p.lapisan.bentuk === 'syarh_atau_hasyiyah') bagian.push('gaya syarh/hasyiyah (قوله)');
  else if (p.lapisan.bentuk === 'syarh') bagian.push('ada pemisah matan/syarh');
  if (p.mazhab.istilah.length) bagian.push(`istilah tarjih: ${p.mazhab.istilah.slice(0, 3).map((x) => x.kata).join(', ')}`);
  if (p.mazhab.khilaf) bagian.push('memuat penanda khilaf');
  if (p.pembatas.nafiIlla) bagian.push('ada pembatasan (penafian+إلا)');
  if (p.hukum.dinegasi.length) bagian.push('ada kata hukum yang dinegasi');
  if (p.kondisi.awalTerpotong) bagian.push('awal mungkin terpotong');
  if (p.kondisi.akhir === 'menggantung') bagian.push('akhir menggantung');
  if (p.kondisi.hurufTerpisah || p.kondisi.hurufAsing) bagian.push('dugaan noise OCR');
  return bagian.join('; ');
}
