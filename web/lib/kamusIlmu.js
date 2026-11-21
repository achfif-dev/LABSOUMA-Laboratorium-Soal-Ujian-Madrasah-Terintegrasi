// Kamus istilah keilmuan Islam: bagian MURNI (tanpa AI, tanpa jaringan), dipakai server dan tes.
// Data ada di kamusIlmuData.js (kurang lebih 750 istilah dari 16 fan: fiqih, faraid, ushul fiqih, qawaid fiqhiyyah, akidah dan ilmu kalam, tasawuf,
// akhlak, balaghah, tafsir, ulumul Qur'an, tajwid, mushthalah hadits, nahwu, sharaf, mantiq, sirah).
//
// Fungsi di sini mengenali istilah dalam (1) teks kitab Arab dan (2) pertanyaan berbahasa Indonesia atau Arab, lalu menyiapkan blok prompt
// berisi arti ringkasnya. Tujuannya satu: AI memahami istilah teknis dengan benar sebelum menjawab, tanpa menebak dari kebiasaan satu fan.
//
// Prinsip yang sama dengan petaTeks: kamus ini ALAT BANTU memahami, bukan sumber isi. Kitab selalu lebih tinggi daripada kamus; bila kitab
// mendefinisikan istilah berbeda (sering terjadi antar mazhab dan antar fan), definisi kitab yang dipakai. Istilah yang berbeda arti antar fan
// ditandai 'a' (ambigu) dan hanya dipakai bila fan-nya cocok dengan konteks.
import { normalCari } from './cariKitab.js';
import { BERKAS } from './kamusIlmuData.js';

export const FAN = {
  fiqh: 'Fiqih', faraid: 'Faraid (waris)', ushul: 'Ushul fiqih', qawaid: 'Qawaid fiqhiyyah', akidah: 'Akidah dan ilmu kalam', tasawuf: 'Tasawuf', akhlak: 'Akhlak',
  balaghah: 'Balaghah', tafsir: 'Tafsir', ulumul_quran: "Ulumul Qur'an", tajwid: 'Tajwid', mustalah: 'Mushthalah hadits', nahwu: 'Nahwu', sharaf: 'Sharaf',
  mantiq: 'Mantiq', sirah: 'Sirah dan tarikh',
};

// Disiplin teks (petaTeks.js) -> fan kamus yang relevan.
export const FAN_DISIPLIN = {
  fiqh: ['fiqh', 'faraid', 'qawaid'], akidah: ['akidah'], hadits: ['mustalah'], mustalah: ['mustalah'], nahwu_sharaf: ['nahwu', 'sharaf'], balaghah: ['balaghah'],
  ushul: ['ushul', 'qawaid', 'mantiq'], tasawuf_akhlak: ['tasawuf', 'akhlak'], tafsir_quran: ['tafsir', 'ulumul_quran', 'tajwid'], sirah_tarikh: ['sirah'], umum: [],
};

// Petunjuk fan dari kata-kata mata pelajaran atau pertanyaan (Latin atau Arab). Satu kata bisa memunculkan lebih dari satu fan.
const PETUNJUK_FAN = [
  ['nahwu', /nahw|nahu\b|irab|i'?rab|jurumiyah|jurumiah|imrithi|alfiyah|ajurumiyah|إعراب|نحو/i],
  ['sharaf', /sharaf|shorof|sorof|tashrif|tasrif|wazan|صرف|تصريف/i],
  ['balaghah', /balaghah|balagoh|bayan\b|ma'?ani\b|badi'?\b|tasybih|isti'?arah|majaz|kinayah|jauhar maknun|بلاغة|تشبيه|استعارة|مجاز|كناية/i],
  ['mustalah', /mus?thalah|mustalah|sanad|perawi|rawi|derajat hadi|hadits|hadis\b|arbain|riyadhus|bulugh|jarh|ta'?dil|مصطلح|سند|راوي|حديث/i],
  ['tafsir', /tafsir|mufassir|jalalain|ibnu katsir|thabari|تفسير|مفسر/i],
  ['ulumul_quran', /ulumul|asbabun|nasikh|mansukh|qira'?at|makkiyah|madaniyah|rasm|علوم القرآن|أسباب النزول|ناسخ|منسوخ/i],
  ['tajwid', /tajwid|makhraj|makharij|ghunnah|idgham|idghom|ikhfa|iqlab|izh?har|izhhar|mad\b|waqaf|qalqalah|تجويد|مخرج|إدغام/i],
  ['tasawuf', /tasawuf|tasawwuf|sufi|maqam|tarekat|tarikat|thariqah|mursyid|suluk|ihya|hikam|bidayatul|munjiyat|تصوف|طريقة|مقام/i],
  ['akhlak', /akhlak|akhlaq|adab|tercela|terpuji|ta'?lim|nashaihul|washaya|أخلاق|آداب/i],
  ['akidah', /akidah|aqidah|akhidah|tauhid|tawhid|ilmu kalam|sifat (?:wajib|mustahil|jaiz|dua puluh|20)|jauharah|sanusiyah|aqaid|ushuluddin|iman\b|asy'?ariyah|maturidiyah|عقيدة|توحيد|إيمان/i],
  ['qawaid', /qawa'?id|qowaid|kaidah (?:fiqih|fikih)|asybah|asbah|قواعد|الأشباه/i],
  ['ushul', /ushul|usul\b|waraqat|qiyas|ijma'?|ijtihad|mujtahid|taklid|mantuq|manthuq|mafhum|nasakh|maqashid|sullam|أصول|قياس|إجماع|اجتهاد/i],
  ['mantiq', /mantiq|logika|isaghuji|sullamul munawraq|منطق/i],
  ['faraid', /faraid|fara'?idh|waris|mawaris|ahli waris|ashabah|faradh|فرائض|ميراث|إرث/i],
  ['fiqh', /fiqi?h|fikih|fiqh|thaharah|bersuci|wudhu|wudu|tayammum|shalat|salat|sholat|zakat|puasa|haji|umrah|nikah|talak|jual beli|riba|muamalah|ibadah|safinah|taqrib|fathul qarib|fathul mu'?in|sullamut taufiq|mabadi|فقه|طهارة|صلاة|زكاة|صوم|حج|نكاح|بيع/i],
  ['sirah', /sirah|tarikh|sejarah|ghazwah|maghazi|hijrah|khulafa|nurul yaqin|khulashah|سيرة|تاريخ|غزوة/i],
];

/** Fan yang ditunjuk kata-kata pendek (mata pelajaran atau pertanyaan); urutannya mengikuti daftar petunjuk. */
export function fanDariPetunjuk(s) {
  const t = String(s || ''); if (!t.trim()) return [];
  return PETUNJUK_FAN.filter(([, re]) => re.test(t)).map(([id]) => id);
}

/* ------------------------------------------------------------------ normalisasi */

const normID = (s) => String(s || '').normalize('NFKC').toLowerCase().replace(/['’`ʻʼ‘´-]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const stripAl = (w) => (w.startsWith('ال') && w.length > 4 ? w.slice(2) : w);

// Bentuk dasar token Arab: buang penyambung (و ف) dan awalan (ب ل ك ال) satu per satu; kembalikan semua kandidat (sudah tanpa "ال").
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
  return [...new Set([...hasil].map(stripAl))];
}

const AWALAN_ID = ['ber', 'meng', 'men', 'mem', 'me', 'di', 'ter', 'pen', 'pem', 'pe', 'per', 'se', 'ke'];
const AKHIRAN_ID = ['nyalah', 'nya', 'kan', 'lah', 'kah', 'an', 'i', 'ku', 'mu'];
// Variasi kata Indonesia (tanpa imbuhan lazim) untuk dicocokkan dengan alias.
function variasiID(tok) {
  const v = new Set([tok]);
  const tanpaAkhir = [tok];
  for (const a of AKHIRAN_ID) if (tok.length - a.length >= 3 && tok.endsWith(a)) { v.add(tok.slice(0, -a.length)); tanpaAkhir.push(tok.slice(0, -a.length)); }
  for (const t of tanpaAkhir) for (const p of AWALAN_ID) if (t.length - p.length >= 4 && t.startsWith(p)) v.add(t.slice(p.length));
  return v;
}

/* ------------------------------------------------------------------ entri dan indeks */

/** Satu entri kamus. `bentuk` = ragam bentuk Arab; `alias` = ragam ungkapan Indonesia (larik kata). */
export const ISTILAH = [];
for (const [fan, daftar] of Object.entries(BERKAS)) {
  for (const [ar, alias, arti, tanda] of daftar) {
    const bentuk = String(ar).split('/').map((x) => x.trim()).filter(Boolean)
      .map((asli) => ({ asli, kata: normalCari(asli).split(' ').filter(Boolean) }))
      .filter((b) => b.kata.length && !(b.kata.length === 1 && b.kata[0].length <= 2)); // kata Arab satu-dua huruf terlalu rawan salah kena
    if (!bentuk.length) continue;
    const aliasList = String(alias || '').split('|').map(normID).filter(Boolean).map((a) => a.split(' ')).filter((a) => !(a.length === 1 && a[0].length < 3));
    ISTILAH.push({ id: ISTILAH.length, fan, ar: bentuk[0].asli, bentuk, alias: aliasList, arti: String(arti || ''), ambigu: tanda === 'a' });
  }
}
export const JUMLAH_ISTILAH = ISTILAH.length;

// Kata Indonesia sehari-hari: alias satu kata ini tetap dianggap ambigu untuk entri bertanda 'a' (alias transliterasi khas seperti hadats, qiraat, idgham tidak).
const ALIAS_UMUM = new Set(['sebab', 'umum', 'khusus', 'mutlak', 'penghalang', 'jaminan', 'akad', 'hakim', 'perintah', 'larangan', 'hidup', 'kuasa', 'kehendak', 'nabi', 'rasul', 'takdir', 'iman', 'islam', 'kafir', 'hati', 'murid', 'jujur', 'kejujuran', 'adil', 'keadilan', 'santun', 'sombong', 'kalimat', 'relasi', 'premis', 'akhlak', 'adab', 'hikmah', 'waris', 'warisan', 'wakaf', 'wali', 'mazhab', 'dalil', 'fikih', 'fiqih', 'syariat', 'syariah', 'hadits', 'hadis', 'hasan', 'sunnah', 'sunah', 'timbangan', 'lazim', 'rakus', 'pamer', 'bangga', 'proposisi', 'memaafkan', 'penyerupaan', 'penghilangan', 'pembatasan', 'hakiki', 'mubah', 'jaiz', 'mizan', 'telaga', 'guru', 'nafsu', 'kasb']);

const INDEKS_ARAB = new Map(); // kata pertama (tanpa "ال") -> [{e, b}]
const INDEKS_ID = new Map();   // kata pertama alias -> [{e, a}]
for (const e of ISTILAH) {
  for (const b of e.bentuk) { const k = stripAl(b.kata[0]); (INDEKS_ARAB.get(k) || INDEKS_ARAB.set(k, []).get(k)).push({ e, b }); }
  for (const a of e.alias) { (INDEKS_ID.get(a[0]) || INDEKS_ID.set(a[0], []).get(a[0])).push({ e, a }); }
}

const sanitasi = (s) => String(s || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();

/* ------------------------------------------------------------------ pencocokan */

/** Semua kemunculan istilah Arab di token teks. @returns {Map<number,{e:object,jumlah:number}>} */
function cocokArab(tok) {
  const hit = new Map();
  for (let i = 0; i < tok.length; i++) {
    for (const c of kandidat(tok[i])) {
      const daftar = INDEKS_ARAB.get(c); if (!daftar) continue;
      for (const { e, b } of daftar) {
        let ok = true;
        for (let j = 1; j < b.kata.length; j++) {
          if (i + j >= tok.length || !kandidat(tok[i + j]).includes(stripAl(b.kata[j]))) { ok = false; break; }
        }
        if (!ok) continue;
        const h = hit.get(e.id) || { e, jumlah: 0, panjang: 0, ambiguIni: e.ambigu };
        h.jumlah++; h.panjang = Math.max(h.panjang, b.kata.length); hit.set(e.id, h);
      }
    }
  }
  return hit;
}

/** Semua kemunculan alias Indonesia di token pertanyaan. */
function cocokIndonesia(tok) {
  const hit = new Map();
  const vars = tok.map(variasiID);
  for (let i = 0; i < tok.length; i++) {
    for (const v of vars[i]) {
      const daftar = INDEKS_ID.get(v); if (!daftar) continue;
      for (const { e, a } of daftar) {
        let ok = true;
        for (let j = 1; j < a.length; j++) { if (i + j >= tok.length || !vars[i + j].has(a[j])) { ok = false; break; } }
        if (!ok) continue;
        const ambiguIni = e.ambigu && a.length === 1 && ALIAS_UMUM.has(a[0]);
        const h = hit.get(e.id) || { e, jumlah: 0, panjang: 0, ambiguIni };
        h.ambiguIni = h.ambiguIni && ambiguIni; h.jumlah++; h.panjang = Math.max(h.panjang, a.length); hit.set(e.id, h);
      }
    }
  }
  return hit;
}

const gabungHit = (...peta) => { const m = new Map(); for (const p of peta) for (const [id, h] of p) { const x = m.get(id); if (x) { x.jumlah += h.jumlah; x.panjang = Math.max(x.panjang, h.panjang); x.ambiguIni = x.ambiguIni && h.ambiguIni; } else m.set(id, { ...h }); } return m; };

const fanDariDisiplin = (d) => new Set(FAN_DISIPLIN[d && d.id ? d.id : d] || []);

const bentukHasil = (h) => ({ ar: h.e.ar, fan: h.e.fan, label: FAN[h.e.fan], arti: h.e.arti, jumlah: h.jumlah });

/**
 * Istilah keilmuan di TEKS Arab. Istilah ambigu hanya ikut bila fan-nya cocok dengan disiplin teks.
 * @param {string} teks
 * @param {{disiplin?:{id:string}|string, maks?:number}} [opsi]
 * @returns {{ar:string,fan:string,label:string,arti:string,jumlah:number}[]}
 */
export function istilahDiTeks(teks, { disiplin = 'umum', maks = 8 } = {}) {
  const tok = normalCari(String(teks || '').slice(0, 60000)).split(' ').filter(Boolean);
  if (tok.length < 3) return [];
  const fanSet = fanDariDisiplin(disiplin);
  const skor = [];
  for (const h of cocokArab(tok).values()) {
    const cocokFan = fanSet.has(h.e.fan);
    if (h.ambiguIni && !cocokFan) continue;
    skor.push({ h, s: Math.min(h.jumlah, 4) + (cocokFan ? 3 : 0) + (h.panjang > 1 ? 2 : 0) });
  }
  skor.sort((a, b) => b.s - a.s || a.h.e.id - b.h.e.id);
  const lihat = new Set(); const hasil = [];
  for (const { h } of skor) { if (lihat.has(h.e.ar)) continue; lihat.add(h.e.ar); hasil.push(bentukHasil(h)); if (hasil.length >= maks) break; }
  return hasil;
}

/**
 * Istilah keilmuan di PERTANYAAN (Indonesia, Arab, atau campuran) beserta fan yang paling mungkin.
 * Konteks fan (mata pelajaran kitab atau disiplin teks) dan istilah tak-ambigu dalam pertanyaan menentukan istilah ambigu mana yang ikut.
 * @param {string} q
 * @param {{mapel?:string, disiplin?:{id:string}|string, maks?:number}} [opsi]
 * @returns {{istilah:{ar:string,fan:string,label:string,arti:string,jumlah:number}[], fan:{id:string,label:string,skor:number}[]}}
 */
export function istilahDiPertanyaan(q, { mapel = '', disiplin = 'umum', maks = 8 } = {}) {
  const teks = String(q || '').slice(0, 1500);
  const hit = gabungHit(cocokIndonesia(normID(teks).split(' ').filter(Boolean)), cocokArab(normalCari(teks).split(' ').filter(Boolean)));
  const skorFan = new Map();
  const tambahFan = (f, n) => skorFan.set(f, (skorFan.get(f) || 0) + n);
  for (const f of fanDariPetunjuk(`${teks} ${mapel}`)) tambahFan(f, 2);
  for (const f of fanDariDisiplin(disiplin)) tambahFan(f, 1);
  for (const h of hit.values()) if (!h.ambiguIni) tambahFan(h.e.fan, 1);
  const urutFan = [...skorFan.entries()].sort((a, b) => b[1] - a[1]).map(([id, skor]) => ({ id, label: FAN[id], skor }));
  const dipakai = new Set(urutFan.slice(0, 3).map((f) => f.id));
  const skor = [];
  for (const h of hit.values()) {
    if (h.ambiguIni && !dipakai.has(h.e.fan)) continue;
    skor.push({ h, s: (dipakai.has(h.e.fan) ? 2 : 0) + (h.panjang > 1 ? 2 : 0) + Math.min(h.jumlah, 2) - (h.ambiguIni ? 1 : 0) });
  }
  skor.sort((a, b) => b.s - a.s || a.h.e.id - b.h.e.id);
  const lihat = new Set(); const istilah = [];
  for (const { h } of skor) { if (lihat.has(h.e.ar)) continue; lihat.add(h.e.ar); istilah.push(bentukHasil(h)); if (istilah.length >= maks) break; }
  return { istilah, fan: urutFan.slice(0, 3) };
}

/**
 * Kueri pencarian (larik larik kata normal, 1 sampai 3 kata) dari istilah yang dikenali di pertanyaan.
 * Dipakai sebagai VARIAN berbobot rendah agar pertanyaan Indonesia menemukan halaman yang memakai istilah Arabnya.
 */
export function kueriDariIstilah(istilah, maks = 3) {
  const hasil = []; const lihat = new Set();
  for (const it of istilah || []) {
    const e = ISTILAH.find((x) => x.ar === it.ar && x.fan === it.fan); if (!e) continue;
    for (const b of e.bentuk.slice(0, 2)) {
      if (b.kata.length > 3) continue;
      const k = b.kata.map(stripAl).join(' ');
      if (!k || lihat.has(k)) continue;
      lihat.add(k); hasil.push(b.kata.map(stripAl)); break;
    }
    if (hasil.length >= maks) break;
  }
  return hasil;
}

/* ------------------------------------------------------------------ blok prompt */

const BARIS = (it) => `- ${sanitasi(it.ar)} [${it.label}]: ${sanitasi(it.arti)}`;

/**
 * Blok prompt: istilah di TEKS Arab. '' bila tidak ada. Pemakai menambahkannya ke prompt pengguna (data), bukan ke system prompt.
 */
export function blokIstilahTeks(teks, { disiplin = 'umum', maks = 8, batas = 1500 } = {}) {
  const daftar = istilahDiTeks(teks, { disiplin, maks });
  if (!daftar.length) return '';
  let isi = ''; for (const it of daftar) { const b = BARIS(it); if (isi.length + b.length > batas) break; isi += `${isi ? '\n' : ''}${b}`; }
  if (!isi) return '';
  return `<istilah_teks>\nArti ringkas istilah teknis yang muncul di teks, dari kamus umum keilmuan Islam (dicocokkan otomatis oleh kode; bisa keliru bila kata itu dipakai dengan makna lain). Ini alat bantu memahami, BUKAN isi kitab: bila teks mendefinisikan istilah berbeda, ikuti teks, dan jangan mengutip arti ini sebagai dasar jawaban.\n${isi}\n</istilah_teks>`;
}
