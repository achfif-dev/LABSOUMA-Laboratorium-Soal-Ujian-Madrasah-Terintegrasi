// Perencana paket soal satu Dawr format IMDA. Fungsi murni, dipakai browser dan server (src/paketService.js) serta tes.
//
// Masalah yang dipecahkan:
//   1. Materi bisa jauh lebih panjang dari 6.000 karakter (batas satu panggilan AI). Materi dibagi menjadi segmen <= 6.000 karakter
//      di batas paragraf/kalimat, lalu setiap segmen diberi jatah soal sebanding panjangnya.
//   2. Satu Dawr butuh 15 atau 20 soal. Satu panggilan AI menyusun sampai 6 butir dari SATU segmen, boleh campuran bagian أ / ب / ج
//      (bentuk tiap butir sudah menentukan bagiannya). Jadi satu Dawr cukup 3-4 panggilan untuk materi satu segmen, dan sekitar
//      satu panggilan per segmen untuk materi panjang, bukan 15-20 panggilan satu soal per satu. Kuota AI harian terbatas (bawaan 60).
//   3. Sebaran tingkat kesukaran (L1/L2/L3) dibagi per bagian dengan pembulatan sisa terbesar, jadi jumlahnya selalu pas.
import { PRESET_DAWR, dawrSah, URUTAN_BAGIAN } from './naskah.js';

/* ---------------------------------------------------------------------------------- Paket sebagai satu kesatuan */

/** Id paket pendek (<= 40 karakter) yang dibagikan semua butir hasil satu kali "Simpan paket". */
export const idPaket = (now = Date.now(), rand = Math.random) => 'pk' + Math.floor(now).toString(36) + Math.floor(rand() * 46656).toString(36).padStart(3, '0');

/** Kolom penanda paket untuk satu butir. `cakupan` hanya ditulis bila terisi; semua kolom opsional di Firestore. */
export function penandaPaket({ id, dawr, cakupan, urut }) {
  const p = { paket: String(id), dawr: String(dawrSah(dawr)), urut: Number.isInteger(urut) && urut >= 1 && urut <= 200 ? urut : 1 };
  const c = String(cakupan || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (c) p.cakupan = c;
  return p;
}

/** Jumlah butir satu Dawr menurut template. */
export const jumlahDawr = (dawr) => PRESET_DAWR[dawrSah(dawr)].bagian.reduce((n, b) => n + b.n, 0);

const milis = (t) => (t && typeof t.toMillis === 'function' ? t.toMillis() : (t && typeof t.seconds === 'number' ? t.seconds * 1000 : (Date.parse(t) || 0)));

/**
 * Kelompokkan soal menurut paket. `tampil` = soal yang lolos filter; `semua` = seluruh soal (untuk menghitung kelengkapan paket,
 * yang tidak boleh ikut berubah hanya karena filter status).
 * @returns {{paket: object[], lepas: object[]}} paket: terbaru dulu; butir di dalam paket urut menurut nomor naskah; lepas = soal tanpa paket.
 */
export function kelompokPaket(tampil, semua = tampil) {
  const total = new Map();
  for (const q of semua || []) if (q && q.paket) { if (!total.has(q.paket)) total.set(q.paket, []); total.get(q.paket).push(q); }
  const peta = new Map(); const lepas = [];
  for (const q of tampil || []) {
    if (!q) continue;
    if (!q.paket) { lepas.push(q); continue; }
    if (!peta.has(q.paket)) {
      const isi = total.get(q.paket) || [q];
      const status = { draft: 0, pending: 0, revision: 0, approved: 0 };
      for (const x of isi) if (x.status in status) status[x.status]++;
      const dawr = dawrSah(q.dawr);
      peta.set(q.paket, {
        id: q.paket, dawr, nama: q.nama || '', mapel: q.mapel || '', tingkat: q.tingkat || '', kelas: q.kelas || '', periode: q.periode || '', cakupan: q.cakupan || '',
        soal: [], jumlah: isi.length, target: jumlahDawr(dawr), status, waktu: Math.max(0, ...isi.map((x) => milis(x.createdAt))),
      });
    }
    peta.get(q.paket).soal.push(q);
  }
  const paket = [...peta.values()];
  for (const g of paket) { g.soal.sort((a, b) => (a.urut || 999) - (b.urut || 999)); g.lengkap = g.jumlah >= g.target; g.semuaApproved = g.status.approved === g.jumlah; }
  paket.sort((a, b) => b.waktu - a.waktu);
  return { paket, lepas };
}

// Rujukan ke "teks/kitab" di dalam soal ("menurut kitab", "berdasarkan teks kitab", "pada bacaan di atas", "kutipan berikut"). Soal naskah ujian berdiri sendiri.
const KATA_SUMBER = '(?:kitab|kitabnya|teks|nash|nas|naskah|matan|syarah|syarh|kutipan|bacaan|paragraf|referensi|penjelasan)';
const PENGANTAR = '(?:menurut|berdasarkan|berdasar|sesuai|sebagaimana|merujuk|mengacu|bersumber|dalam|pada|di\\s+dalam)';
const RE_RUJUKAN = new RegExp(`(?:^|[\\s(,;:])${PENGANTAR}\\s+(?:[\\p{L}'’-]+\\s+){0,2}?${KATA_SUMBER}(?![\\p{L}])|(?:^|[\\s(,;:])${KATA_SUMBER}\\s+(?:di\\s+atas|berikut|tersebut|ini|itu)(?![\\p{L}])|disebutkan\\s+di\\s+atas|(?:^|[\\s(,;:])menurut\\s+penulis\\s+kitab|(?:^|[\\s(,;:])menurut\\s+pengarang\\s+kitab`, 'iu');
const RE_AWAL = new RegExp(`^\\s*${PENGANTAR}\\s+(?:[\\p{L}'’-]+\\s+){0,2}?${KATA_SUMBER}(?:\\s+[\\p{L}'’-]+){0,3}?\\s*[,:]\\s*`, 'iu');
const RE_AKHIR = new RegExp(`\\s*,?\\s*${PENGANTAR}\\s+(?:[\\p{L}'’-]+\\s+){0,2}?${KATA_SUMBER}(?:\\s+[\\p{L}'’-]+){0,3}?\\s*(?=[?.!]|$)`, 'iu');
export const adaRujukanTeks = (t) => RE_RUJUKAN.test(String(t || ''));
/** Membuang klausa rujukan di awal atau akhir kalimat soal. Bila masih tersisa (di tengah kalimat), pemanggil menolak butirnya. */
export function tanpaRujukanTeks(t) {
  let x = String(t || '');
  for (let i = 0; i < 2 && adaRujukanTeks(x); i++) {
    x = x.replace(RE_AWAL, '').replace(RE_AKHIR, '').replace(/\s+([?!,:])/g, '$1').replace(/\s+\.(?!\.)/g, '.').trim();
    x = x.charAt(0).toUpperCase() + x.slice(1);
  }
  return x;
}


export const LABEL_KUTIPAN = 'Kutipan kitab:';

/** Pembahasan butir paket = baris "Kutipan kitab: <Arab>" (bila ada) + satu baris kosong + penjelasan. Dipecah/digabung agar kutipan bisa disunting terpisah. */
export function pecahPembahasan(p) {
  const x = String(p || '');
  const m = /^\s*Kutipan kitab:[ \t]*(.*)(?:\r?\n\s*\r?\n|\r?\n|$)/.exec(x);
  return m ? { kutipan: m[1].replace(/\s+/g, ' ').trim(), isi: x.slice(m[0].length).trim() } : { kutipan: '', isi: x.trim() };
}
export const gabungPembahasan = (kutipan, isi) => (String(kutipan || '').trim() ? `${LABEL_KUTIPAN} ${String(kutipan).replace(/\s+/g, ' ').trim()}\n\n${String(isi || '').trim()}` : String(isi || '').trim());

/**
 * Status kutipan terhadap teks sumber: 'cocok' | 'mirip' | 'tidak_cocok' | 'kosong'. `kutipan` hanya terisi bila cocok atau mirip.
 * `periksa` = periksaKutipan (src/kutipan.js di server, window.Kutipan di browser).
 */
export function statusKutipan(periksa, mentah, teks) {
  const k = String(mentah || '').replace(/\s+/g, ' ').trim().slice(0, 700);
  if (!k) return { status: 'kosong', kutipan: '' };
  const r = periksa({ pembahasan: k }, teks);
  const cocok = r.ringkas.total > 0 && r.ringkas.tidak_ditemukan === 0;
  const status = r.ringkas.total === 0 ? 'kosong' : (!cocok ? 'tidak_cocok' : (r.status === 'lolos' ? 'cocok' : 'mirip'));
  return { status, kutipan: cocok ? k : '' };
}

export const MAKS_SEGMEN = 6000;        // batas satu panggilan AI (sama dengan MAX_TEKS di server)
export const MAKS_MATERI = 60000;       // batas total materi satu paket (±10 segmen)
export const MAKS_BUTIR_PANGGILAN = 6;  // butir soal per panggilan AI (keluaran ±250 token per butir: aman dalam anggaran 45 detik fungsi Vercel)
export const MIN_SEGMEN = 200;          // segmen lebih pendek digabung ke tetangganya

/** Perbandingan awal L1 : L2 : L3. Ini titik awal yang masuk akal untuk ujian dawr, bukan standar baku; ubah sesuai kebijakan madrasah. */
export const KOMPOSISI_BAWAAN = Object.freeze({ L1: 30, L2: 50, L3: 20 });
export const LANJUTAN_BAWAAN = 0.4;     // porsi soal "melanjutkan" di bagian أ (sisanya pilihan ganda biasa)
export const URUT_LEVEL = ['L1', 'L2', 'L3'];

const BATAS_KALIMAT = /(?<=[.؟!۔؛:])\s+/u;

/** Pembagian bilangan bulat `n` menurut bobot, jumlahnya selalu `n` (metode sisa terbesar). */
export function bagiProporsional(n, bobot) {
  const w = bobot.map((x) => Math.max(0, Number(x) || 0));
  const total = w.reduce((a, b) => a + b, 0);
  if (!(n > 0) || !w.length) return w.map(() => 0);
  if (total === 0) return w.map((_, i) => (i < n ? 1 : 0));
  const eksak = w.map((x) => (x / total) * n);
  const hasil = eksak.map(Math.floor);
  let sisa = n - hasil.reduce((a, b) => a + b, 0);
  const urut = eksak.map((x, i) => ({ i, f: x - Math.floor(x) })).sort((a, b) => b.f - a.f || a.i - b.i);
  for (let k = 0; sisa > 0; k = (k + 1) % urut.length, sisa--) hasil[urut[k].i]++;
  return hasil;
}

/** Jumlah soal per level untuk `n` soal. Komposisi {L1,L2,L3} berupa bobot (tidak harus 100). */
export function bagiLevel(n, komposisi = KOMPOSISI_BAWAAN) {
  const c = bagiProporsional(n, URUT_LEVEL.map((l) => (komposisi || {})[l]));
  return { L1: c[0], L2: c[1], L3: c[2] };
}

/** Daftar level berurutan dari mudah ke sukar, mis. {L1:1,L2:2,L3:1} -> ['L1','L2','L2','L3']. */
export const daftarLevel = (n, komposisi) => { const c = bagiLevel(n, komposisi); return URUT_LEVEL.flatMap((l) => Array(c[l]).fill(l)); };

/** Komposisi dari masukan pengguna; nilai negatif/bukan angka -> 0, semua nol -> bawaan. */
export function komposisiSah(k) {
  const x = { L1: Math.max(0, Number(k && k.L1) || 0), L2: Math.max(0, Number(k && k.L2) || 0), L3: Math.max(0, Number(k && k.L3) || 0) };
  return x.L1 + x.L2 + x.L3 > 0 ? x : { ...KOMPOSISI_BAWAAN };
}

/* ---------------------------------------------------------------- Pembagi materi */

const potongKeras = (s, maks) => {
  const hasil = [];
  let sisa = s;
  while (sisa.length > maks) {
    let i = sisa.lastIndexOf(' ', maks);
    if (i < maks * 0.5) i = maks; // tidak ada spasi yang layak: potong di batas
    hasil.push(sisa.slice(0, i).trim());
    sisa = sisa.slice(i).trim();
  }
  if (sisa) hasil.push(sisa);
  return hasil;
};

/** Memecah satu blok teks menjadi unit <= maks: paragraf dulu, lalu kalimat, terakhir potong keras. */
function pecahUnit(blok, maks) {
  const unit = [];
  for (const par of String(blok).split(/\n+/).map((x) => x.trim()).filter(Boolean)) {
    if (par.length <= maks) { unit.push(par); continue; }
    let buf = '';
    for (const kal of par.split(BATAS_KALIMAT)) {
      if ((buf + ' ' + kal).trim().length <= maks) { buf = (buf + ' ' + kal).trim(); continue; }
      if (buf) unit.push(buf);
      if (kal.length <= maks) buf = kal; else { unit.push(...potongKeras(kal, maks).slice(0, -1)); buf = potongKeras(kal, maks).slice(-1)[0] || ''; }
    }
    if (buf) unit.push(buf);
  }
  return unit;
}

/** Label halaman segmen: "12" atau "12–14" bila angka, selain itu digabung dengan koma. */
export function labelHalaman(daftar) {
  const u = [...new Set(daftar.map((h) => String(h || '').trim()).filter(Boolean))];
  if (!u.length) return '';
  if (u.length === 1) return u[0];
  const angka = u.map(Number);
  if (angka.every(Number.isInteger)) return `${Math.min(...angka)}–${Math.max(...angka)}`;
  return u.slice(0, 4).join(', ');
}

/**
 * Membagi materi menjadi segmen berukuran seimbang, masing-masing <= maks karakter.
 * @param {string | {teks:string, hal?:string}[]} sumber  satu teks, atau daftar halaman (mis. satu foto = satu halaman)
 * @returns {{teks:string, hal:string, panjang:number}[]}
 */
export function bagiTeks(sumber, maks = MAKS_SEGMEN) {
  const halaman = (typeof sumber === 'string' ? [{ teks: sumber, hal: '' }] : (Array.isArray(sumber) ? sumber : []))
    .map((p) => ({ teks: String((p && p.teks) || '').replace(/\r/g, '').trim(), hal: String((p && p.hal) || '').trim() }))
    .filter((p) => p.teks);
  const total = halaman.reduce((n, p) => n + p.teks.length, 0);
  if (!total) return [];
  const k = Math.max(1, Math.ceil(total / maks));
  const batas = Math.min(maks, Math.ceil(total / k) + 400); // segmen seimbang, bukan lima penuh dan satu sisa kecil

  const unit = [];
  for (const p of halaman) for (const u of pecahUnit(p.teks, batas)) unit.push({ teks: u, hal: p.hal });

  const segmen = [];
  let cur = null;
  for (const u of unit) {
    if (cur && cur.teks.length + 1 + u.teks.length <= batas) { cur.teks += '\n' + u.teks; cur.hals.push(u.hal); continue; }
    cur = { teks: u.teks, hals: [u.hal] }; segmen.push(cur);
  }
  // Ekor yang terlalu pendek digabung ke segmen sebelumnya bila masih muat dalam batas mutlak.
  for (let i = segmen.length - 1; i > 0; i--) {
    if (segmen[i].teks.length < MIN_SEGMEN && segmen[i - 1].teks.length + 1 + segmen[i].teks.length <= maks) {
      segmen[i - 1].teks += '\n' + segmen[i].teks; segmen[i - 1].hals.push(...segmen[i].hals); segmen.splice(i, 1);
    }
  }
  return segmen.map((s) => ({ teks: s.teks, hal: labelHalaman(s.hals), panjang: s.teks.length }));
}

/* ------------------------------------------------------------------ Rencana paket */

/** Indeks segmen yang dipilih bila soal lebih sedikit daripada segmen: tersebar merata dari awal sampai akhir. */
const sebar = (n, k) => Array.from({ length: n }, (_, i) => (n === 1 ? 0 : Math.round((i * (k - 1)) / (n - 1))));

/**
 * @param {object} o
 * @param {number} o.dawr  1..4
 * @param {string | {teks,hal}[]} o.sumber  materi (teks atau daftar halaman)
 * @param {{L1:number,L2:number,L3:number}} [o.komposisi]
 * @param {number} [o.lanjutan]  porsi soal melanjutkan di bagian أ (0..1)
 * @returns {{dawr:number, segmen:object[], tugas:object[], panggilan:number, total:number, masalah:string}}
 *   tugas[i] = { id, segmen:number, spek:[{bentuk, level, bagian:'a'|'b'|'c'}] } -> satu panggilan AI (satu segmen, boleh campuran bagian)
 */
export function rencanaPaket({ dawr = 1, sumber, komposisi, lanjutan = LANJUTAN_BAWAAN, maksSegmen = MAKS_SEGMEN, maksMateri = MAKS_MATERI } = {}) {
  const preset = PRESET_DAWR[dawrSah(dawr)];
  const kosong = (masalah) => ({ dawr: preset.dawr, segmen: [], tugas: [], panggilan: 0, total: 0, masalah });
  const segmen = bagiTeks(sumber, maksSegmen);
  if (!segmen.length) return kosong('Materi kosong. Tempel teks atau unggah foto kitab dulu.');
  const jumlah = segmen.reduce((n, s) => n + s.panjang, 0);
  if (jumlah > maksMateri) return kosong(`Materi ${jumlah.toLocaleString('id-ID')} karakter, melebihi batas ${maksMateri.toLocaleString('id-ID')} per paket. Bagi menjadi beberapa paket menurut bab.`);

  const kmp = komposisiSah(komposisi);
  const r = Math.min(1, Math.max(0, Number(lanjutan) || 0));
  const porSegmen = segmen.map(() => []);
  for (const kode of URUTAN_BAGIAN) {
    const p = preset.bagian.find((x) => x.kode === kode);
    // Butir bagian ini: level berurutan, bentuk disebar merata (bagian أ campur pilgan dan lanjutan).
    const levels = daftarLevel(p.n, kmp);
    const butir = levels.map((level, i) => ({
      level,
      bentuk: kode === 'b' ? 'isian' : kode === 'c' ? 'uraian' : (Math.floor((i + 1) * r) > Math.floor(i * r) ? 'lanjutan' : 'pilgan'),
    }));
    // Jatah per segmen sebanding panjang; bila butir < segmen, pilih segmen tersebar.
    const jatah = p.n >= segmen.length
      ? bagiProporsional(p.n, segmen.map((s) => s.panjang))
      : (() => { const a = segmen.map(() => 0); for (const i of sebar(p.n, segmen.length)) a[i]++; return a; })();
    // Bagikan butir ke segmen bergantian agar tiap segmen mendapat campuran level, bukan semua L1 di segmen awal.
    const kotak = segmen.map(() => []);
    let kursor = 0;
    for (const b of butir) {
      let guard = 0;
      while (kotak[kursor % segmen.length].length >= jatah[kursor % segmen.length] && guard++ < segmen.length) kursor++;
      kotak[kursor % segmen.length].push(b); kursor++;
    }
    kotak.forEach((spek, si) => { for (const b of spek) porSegmen[si].push({ ...b, bagian: kode }); });
  }
  // Satu panggilan = satu segmen. Bila butir segmen > MAKS_BUTIR_PANGGILAN, dibagi rata (mis. 20 butir -> 4 x 5, bukan 6+6+6+2).
  const tugas = [];
  porSegmen.forEach((butir, si) => {
    if (!butir.length) return;
    const k = Math.ceil(butir.length / MAKS_BUTIR_PANGGILAN);
    const ukuran = bagiProporsional(butir.length, Array(k).fill(1));
    let off = 0;
    ukuran.forEach((u, j) => { tugas.push({ id: `s${si}-${j}`, segmen: si, spek: butir.slice(off, off + u) }); off += u; });
  });
  return { dawr: preset.dawr, segmen, tugas, panggilan: tugas.length, total: tugas.reduce((n, t) => n + t.spek.length, 0), masalah: '' };
}

/** Urutan tampil dalam satu bagian naskah: mudah ke sukar, urutan susun dipertahankan di dalam level yang sama. */
export const urutkanSoal = (daftar) => daftar
  .map((q, i) => ({ q, i }))
  .sort((a, b) => URUT_LEVEL.indexOf(a.q.level) - URUT_LEVEL.indexOf(b.q.level) || a.i - b.i)
  .map((x) => x.q);

/**
 * Butir yang segmennya ditolak (di luar cakupan Konfigurasi) dialihkan ke segmen yang terbukti memuat materi cakupan,
 * bergantian, supaya naskah Dawr tidak kurang nomor hanya karena sebagian materi berada di luar cakupan.
 * @param {{spek:object}[]} butir   butir yang perlu tempat baru
 * @param {number[]} segmenAda      indeks segmen yang sudah menghasilkan butir (di dalam cakupan)
 * @returns {{per: Map<number, object[]>, tanpaTempat: object[]}} `tanpaTempat` terisi bila tidak ada segmen yang masuk cakupan
 */
export function alihkanButir(butir, segmenAda) {
  const per = new Map();
  const tempat = [...new Set((segmenAda || []).filter((x) => Number.isInteger(x) && x >= 0))].sort((a, b) => a - b);
  const tanpaTempat = [];
  (butir || []).forEach((b, i) => {
    if (!tempat.length) { tanpaTempat.push(b.spek); return; }
    const s = tempat[i % tempat.length];
    if (!per.has(s)) per.set(s, []);
    per.get(s).push(b.spek);
  });
  return { per, tanpaTempat };
}
