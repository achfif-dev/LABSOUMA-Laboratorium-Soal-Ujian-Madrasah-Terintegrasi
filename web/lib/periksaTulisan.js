// Pemeriksa tulisan Latin SEBELUM dipegonkan: salah ketik dan ejaan tidak baku yang membuat mesin Pegon menulis kata secara salah
// tanpa ada tanda (mis. "sholat" dan "diatas" tetap dikonversi, hanya hasilnya keliru). Murni: tanpa DOM, jaringan, atau AI.
// Kembalian: daftar `item` { id, kode, tingkat, dari, saran, alternatif, pesan, mulai, akhir, pasti }.
//   tingkat 'salah'   = hampir pasti keliru;  'periksa' = kemungkinan keliru, penyusun yang memutuskan.
//   pasti: true       = perbaikan aman diterapkan sekaligus (spasi, ejaan baku, singkatan baku).
//   saran '' tanpa penerapan otomatis (hanya peringatan).

const KATA = /[A-Za-z\u00C0-\u024F]+(?:['\u2019\u02bc-][A-Za-z\u00C0-\u024F]+)*/g;
const TERLINDUNG = /https?:\/\/[^\s<>"]+|www\.[^\s<>"]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+/gi;

const SINGKATAN = Object.freeze({
  tdk: 'tidak', yg: 'yang', dgn: 'dengan', dg: 'dengan', utk: 'untuk', krn: 'karena', sbg: 'sebagai', tsb: 'tersebut', spt: 'seperti',
  dlm: 'dalam', pd: 'pada', thd: 'terhadap', hrs: 'harus', blm: 'belum', sdh: 'sudah', tp: 'tetapi', hlm: 'halaman',
  dll: 'dan lain-lain', dst: 'dan seterusnya', dsb: 'dan sebagainya',
});
const TIDAK_BAKU = Object.freeze({
  karna: 'karena', aktifitas: 'aktivitas', analisa: 'analisis', resiko: 'risiko', sistim: 'sistem', praktek: 'praktik', nasehat: 'nasihat',
  ijin: 'izin', hakekat: 'hakikat', apotik: 'apotek', antri: 'antre', atlit: 'atlet', kwalitas: 'kualitas', kwantitas: 'kuantitas',
  standard: 'standar', jadual: 'jadwal', tehnik: 'teknik', obyek: 'objek', subyek: 'subjek', komplit: 'komplet', hirarki: 'hierarki',
  frekwensi: 'frekuensi', mengkonsumsi: 'mengonsumsi', mempengaruhi: 'memengaruhi', merubah: 'mengubah', menghapal: 'menghafal', hapal: 'hafal',
  sholat: 'shalat', sholawat: 'shalawat', wudlu: 'wudhu',
});
const PISAH = Object.freeze({
  diatas: 'di atas', dibawah: 'di bawah', didalam: 'di dalam', diluar: 'di luar', disini: 'di sini', disana: 'di sana', disitu: 'di situ',
  diantara: 'di antara', kedalam: 'ke dalam', keatas: 'ke atas', kebawah: 'ke bawah', daripada: 'daripada',
});
const PISAH_PERIKSA = Object.freeze({ dimana: 'di mana', kemana: 'ke mana' }); // bisa kata tanya (pisah) atau penghubung: penyusun memutuskan
const KATA_KERJA_DI = new Set(('ambil sebut tulis baca buat lakukan gunakan anggap tentukan jelaskan nyatakan terangkan sebabkan bagi bagikan bayar beli jual jawab pilih ' +
  'kerjakan laksanakan haramkan wajibkan halalkan sebutkan tuliskan ucapkan berikan serahkan tolak kutip riwayatkan nukil simpulkan pahami tafsirkan kenakan ' +
  'temukan sampaikan ajarkan hukumi putuskan batalkan sahkan bolehkan larang tinggalkan kerjakan wajibkan sunahkan makruhkan').split(/\s+/));

const kapital = (dari, saran) => {
  if (!saran) return saran;
  if (dari.length > 1 && dari === dari.toUpperCase()) return saran.toUpperCase();
  return /^[A-Z]/.test(dari) ? saran[0].toUpperCase() + saran.slice(1) : saran;
};
const norm = (w) => String(w).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/['\u2019\u2018\u02bc\u02bb`\u00b4-]/g, '');

// Jarak sunting (Damerau terbatas, transposisi huruf bersebelahan dihitung 1). Berhenti dini bila melebihi `maks`.
function jarak(a, b, maks) {
  if (Math.abs(a.length - b.length) > maks) return maks + 1;
  let p2 = null, p1 = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let min = i;
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(p1[j] + 1, cur[j - 1] + 1, p1[j - 1] + c);
      if (p2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, p2[j - 2] + 1);
      cur[j] = v; if (v < min) min = v;
    }
    if (min > maks) return maks + 1;
    p2 = p1; p1 = cur;
  }
  return p1[b.length];
}

export function periksaTulisan(teks, { kunci = [], dikenalArab = () => false, indonesia = () => false, maksSaranKamus = 40 } = {}) {
  const t = String(teks == null ? '' : teks);
  const item = [];
  const tambah = (kode, tingkat, mulai, akhir, saran, pesan, ekstra = {}) =>
    item.push({ id: `${kode}:${mulai}:${akhir}`, kode, tingkat, dari: t.slice(mulai, akhir), saran, alternatif: [], pesan, mulai, akhir, pasti: false, ...ekstra });

  // bagian terlindung (URL, email) tidak diperiksa
  const lindung = []; let m;
  TERLINDUNG.lastIndex = 0;
  while ((m = TERLINDUNG.exec(t)) !== null) lindung.push([m.index, m.index + m[0].length]);
  const dalamLindung = (i) => lindung.some(([a, b]) => i >= a && i < b);

  // 1) karakter spasi tak terlihat: kata menempel atau terputus tanpa terlihat
  const ANEH = /[\u00A0\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g;
  while ((m = ANEH.exec(t)) !== null) {
    const nol = m[0] === '\u200B' || m[0] === '\uFEFF';
    tambah('SPASI_ANEH', 'salah', m.index, m.index + 1, nol ? '' : ' ', nol ? 'Ada karakter tak terlihat (lebar nol) di sini; bisa memecah kata saat dipegonkan.' : 'Spasi khusus (bukan spasi biasa); kata di sekitarnya bisa dianggap satu kata.', { pasti: true });
  }
  // 2) spasi ganda, spasi sebelum tanda baca, tanda baca tanpa spasi sesudahnya
  const GANDA = /(\S)( {2,})(?=\S)/g;
  while ((m = GANDA.exec(t)) !== null) tambah('SPASI_GANDA', 'salah', m.index + 1, m.index + 1 + m[2].length, ' ', 'Spasi ganda.', { pasti: true });
  const SEBELUM = /(\S)( +)([,;:!?])/g;
  while ((m = SEBELUM.exec(t)) !== null) tambah('SPASI_SEBELUM_TANDA', 'salah', m.index + 1, m.index + 1 + m[2].length, '', `Spasi sebelum tanda "${m[3]}" tidak perlu.`, { pasti: true });
  const SESUDAH = /([A-Za-z\u00C0-\u024F) ])([,;:!?])(?=[A-Za-z\u00C0-\u024F])|([a-z\u00E0-\u024F]{3,})(\.)(?=[A-Z][a-z])/g;
  while ((m = SESUDAH.exec(t)) !== null) {
    const idx = m[2] !== undefined ? m.index + m[1].length : m.index + m[3].length;
    if (dalamLindung(idx)) continue;
    tambah('SPASI_SESUDAH_TANDA', 'salah', idx, idx + 1, t[idx] + ' ', 'Tanda baca perlu diikuti spasi; tanpa spasi dua kata menjadi satu saat dipegonkan.', { pasti: true });
  }

  // 3) kata demi kata
  const kata = [];
  KATA.lastIndex = 0;
  while ((m = KATA.exec(t)) !== null) if (!dalamLindung(m.index)) kata.push({ s: m[0], mulai: m.index, akhir: m.index + m[0].length });
  const terpakai = new Set();
  const semuaSpasi = (a, b) => /^[ \t]+$/.test(t.slice(a, b));
  kata.forEach((k, i) => {
    const l = k.s.toLowerCase();
    if (Object.hasOwn(SINGKATAN, l)) {
      const lengkap = SINGKATAN[l]; const panjang = lengkap.includes(' ');
      tambah('SINGKATAN', 'salah', k.mulai, k.akhir, kapital(k.s, lengkap),
        `"${k.s}" singkatan tidak baku: mesin Pegon menulisnya huruf demi huruf, bukan sebagai kata "${lengkap}". Tulis lengkap.`, { pasti: !panjang || l === 'dll' || l === 'dst' || l === 'dsb' });
      terpakai.add(i); return;
    }
    const n = norm(k.s);
    if (Object.hasOwn(TIDAK_BAKU, n) && !k.s.includes('-')) {
      const baku = TIDAK_BAKU[n];
      const arab = ['sholat', 'sholawat', 'wudlu'].includes(n);
      tambah('TIDAK_BAKU', arab ? 'periksa' : 'salah', k.mulai, k.akhir, kapital(k.s, baku),
        arab ? `"${k.s}" kemungkinan ejaan tidak baku; kamus mengenal "${baku}". Dengan ejaan ini kata ditulis huruf demi huruf, bukan ejaan Arabnya.`
             : `"${k.s}" tidak baku; yang baku "${baku}". Ejaan tidak baku bisa menghasilkan Pegon yang salah.`, { pasti: !arab });
      terpakai.add(i); return;
    }
    if (Object.hasOwn(PISAH, n) && PISAH[n] !== n) {
      tambah('PISAH_SAMBUNG', 'salah', k.mulai, k.akhir, kapital(k.s, PISAH[n]), `Kata depan ditulis terpisah: "${PISAH[n]}". Disambung, mesin menganggapnya awalan dan menyambungkan hurufnya.`, { pasti: true });
      terpakai.add(i); return;
    }
    if (Object.hasOwn(PISAH_PERIKSA, n)) {
      tambah('PISAH_SAMBUNG', 'periksa', k.mulai, k.akhir, kapital(k.s, PISAH_PERIKSA[n]), `Sebagai kata tanya, tulis terpisah: "${PISAH_PERIKSA[n]}". Bila penghubung (dimana-mana), abaikan.`);
      terpakai.add(i); return;
    }
    // di + kata kerja yang seharusnya awalan (di ambil -> diambil)
    if (l === 'di' && kata[i + 1] && semuaSpasi(k.akhir, kata[i + 1].mulai) && KATA_KERJA_DI.has(kata[i + 1].s.toLowerCase())) {
      const b = kata[i + 1];
      tambah('AWALAN_DI', 'periksa', k.mulai, b.akhir, kapital(k.s, 'di') + b.s, `"di ${b.s}" kemungkinan awalan (diambil). Awalan di- disambung; kata depan di ditulis terpisah. Pegon membedakan keduanya.`);
      terpakai.add(i); terpakai.add(i + 1); return;
    }
    // kata yang sama berturut-turut
    const p = kata[i - 1];
    if (p && p.s.toLowerCase() === l && l.length >= 2 && semuaSpasi(p.akhir, k.mulai)) {
      tambah('KATA_GANDA', 'periksa', p.akhir, k.akhir, '', `Kata "${k.s}" dua kali berturut-turut. Salah ketik, atau kata ulang yang perlu tanda hubung (${l}-${l}).`, { alternatif: [{ label: `${p.s}-${k.s}`, saran: `-${k.s}` }] });
      terpakai.add(i);
    }
  });

  // 4) mirip kata kamus: salah ketik pada kata serapan Arab yang akan dipegonkan huruf demi huruf
  if (kunci.length) {
    const perPanjang = new Map();
    for (const kk of kunci) { const L = kk.length; if (!perPanjang.has(L)) perPanjang.set(L, []); perPanjang.get(L).push(kk); }
    const sudah = new Map(); let jumlah = 0;
    kata.forEach((k, i) => {
      if (terpakai.has(i) || jumlah >= maksSaranKamus) return;
      const n = norm(k.s);
      if (n.length < 6 || sudah.has(n) || /^[A-Z]/.test(k.s)) return; // kata berhuruf kapital umumnya nama: tidak disaran

      if (dikenalArab(k.s) || indonesia(k.s)) { sudah.set(n, null); return; }
      const maks = n.length >= 9 ? 2 : 1;
      const hasil = [];
      for (let L = n.length - maks; L <= n.length + maks; L++) for (const kk of perPanjang.get(L) || []) { const d = jarak(n, kk, maks); if (d <= maks) hasil.push([d, kk]); }
      if (!hasil.length) { sudah.set(n, null); return; }
      hasil.sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]));
      const alt = hasil.slice(0, 3).map((x) => x[1]);
      sudah.set(n, alt); jumlah++;
    });
    kata.forEach((k, i) => {
      if (terpakai.has(i)) return;
      const alt = sudah.get(norm(k.s));
      if (!alt) return;
      tambah('MIRIP_KAMUS', 'periksa', k.mulai, k.akhir, kapital(k.s, alt[0]), `"${k.s}" tidak ada di kamus, tetapi mirip "${alt[0]}". Bila salah ketik, perbaiki; bila memang benar, tambahkan ke kamus. Tanpa itu kata ditulis huruf demi huruf.`, { alternatif: alt.slice(1).map((x) => ({ label: kapital(k.s, x), saran: kapital(k.s, x) })) });
    });
  }

  // 5) kurung dan tanda kutip tidak seimbang
  let buka = 0, tutup = 0, kutip = 0, awalBuka = -1, awalTutup = -1;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '(') { buka++; if (awalBuka < 0) awalBuka = i; }
    else if (t[i] === ')') { tutup++; if (buka < tutup && awalTutup < 0) awalTutup = i; }
    else if (t[i] === '"') kutip++;
  }
  if (buka !== tutup) { const i = awalTutup >= 0 ? awalTutup : awalBuka; tambah('KURUNG', 'periksa', i, i + 1, '', buka > tutup ? 'Tanda kurung buka tidak punya pasangan tutup.' : 'Tanda kurung tutup tidak punya pasangan buka.'); }
  if (kutip % 2) { const i = t.lastIndexOf('"'); tambah('KUTIP', 'periksa', i, i + 1, '', 'Jumlah tanda kutip ganjil: ada yang belum ditutup.'); }

  return item.sort((a, b) => a.mulai - b.mulai || a.akhir - b.akhir);
}

/** Kelompokkan item yang sama (kode + dari + saran) supaya satu kata salah yang muncul berkali-kali ditawarkan sekali. */
export function kelompokkan(items) {
  const peta = new Map();
  for (const x of items) {
    const kunci = `${x.kode}|${x.dari.toLowerCase()}|${x.saran}`;
    if (!peta.has(kunci)) peta.set(kunci, { ...x, items: [] });
    peta.get(kunci).items.push(x);
  }
  return [...peta.values()];
}

/** Terapkan item (hanya yang punya saran dan masih cocok dengan teks); dari belakang agar posisi tidak bergeser; yang tumpang tindih dilewati. */
export function terapkan(teks, items) {
  let t = String(teks == null ? '' : teks);
  let batas = Infinity;
  for (const x of [...items].filter((y) => y.kode !== 'KURUNG' && y.kode !== 'KUTIP').sort((a, b) => b.mulai - a.mulai)) {
    if (x.akhir > batas) continue;
    if (t.slice(x.mulai, x.akhir) !== x.dari) continue;
    t = t.slice(0, x.mulai) + x.saran + t.slice(x.akhir);
    batas = x.mulai;
  }
  return t;
}

/** Terapkan semua perbaikan yang pasti (aman). */
export const terapkanPasti = (teks, items) => terapkan(teks, items.filter((x) => x.pasti));

/** Saran tindakan untuk kata bersorot dari mesin (catatan `note` pada details). */
export function saranSorotan(note) {
  const n = String(note || '');
  if (n.includes('serapan Arab')) return 'Periksa ejaan Latinnya. Bila salah ketik, perbaiki di teks sumber. Bila benar, tambahkan ejaan Arabnya ke kamus supaya tidak ditulis huruf demi huruf.';
  if (n.startsWith('ada bunyi e')) return 'Mesin ragu e keras atau pepet. Tentukan lewat kamus agar konsisten.';
  if (n.includes('«ke»')) return 'Bila "ke" kata depan, tulis terpisah dari kata sesudahnya; bila awalan (kedua), sambung.';
  if (n.includes('setelah al-')) return 'Periksa ejaan nama atau istilah setelah "al-"; tambahkan ke kamus bila benar.';
  return 'Periksa kata ini; bila salah ketik, perbaiki di teks sumber.';
}
