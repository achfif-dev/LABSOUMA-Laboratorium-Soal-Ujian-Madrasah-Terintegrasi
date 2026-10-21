// Konfigurasi aplikasi yang bisa diubah admin dari menu "Konfigurasi": tingkatan, mata pelajaran, dan katalog kitab.
// Disimpan di Firestore config/app (klien tidak boleh membaca langsung; lihat firestore.rules). Klien membacanya lewat /api/app-config.
// Urutan prioritas: pengaturan admin -> bawaan kode (DEFAULT_APP_CONFIG di bawah).
//
// Catatan desain: nama tingkat (Ibtidaiyah, Tsanawiyah, Aliyah) TETAP karena aturan Firestore pada soal/{id} hanya menerima ketiganya
// dan soal lama menyimpan nama itu. Yang bisa diatur admin: label tampilan, daftar kelas, dan tingkat mana yang aktif.
import { ApiError, cleanLine } from './soalService.js';
import { firestoreAdmin } from './platform.js';
import { DEFAULT_HOSTS, hostAllowed, normalisasiUrl } from './kitabFetch.js';

export const TINGKAT_NAMA = ['Ibtidaiyah', 'Tsanawiyah', 'Aliyah'];
const DOC = 'config/app';
const TTL_MS = 60_000;
export const BATAS = { mapel: 60, kitab: 400, kelas: 12 };

const MI = 'Ibtidaiyah'; const MTS = 'Tsanawiyah'; const MA = 'Aliyah';
const SEMUA = [MI, MTS, MA];
const M = (nama, tingkat = SEMUA) => ({ nama, tingkat, aktif: true });
const K = (nama, pengarang, mapel, tingkat) => ({ nama, pengarang, mapel, tingkat, aktif: true });

export const DEFAULT_APP_CONFIG = {
  versi: 1,
  tingkat: [
    { nama: MI, label: 'Ibtidaiyah (MI)', singkat: 'MI', kelas: ['I', 'II', 'III', 'IV', 'V', 'VI'], aktif: true },
    { nama: MTS, label: 'Tsanawiyah (MTs)', singkat: 'MTs', kelas: ['VII', 'VIII', 'IX'], aktif: true },
    { nama: MA, label: 'Aliyah (MA)', singkat: 'MA', kelas: ['X', 'XI', 'XII'], aktif: true },
  ],
  mapel: [
    M('Fiqih'), M('Akidah'), M('Akhlak'), M('Tarikh (SKI)'), M("Qur'an Hadits"), M('Bahasa Arab'), M('Tajwid'),
    M('Nahwu', [MTS, MA]), M('Sharaf', [MTS, MA]),
    M('Hadits', [MA]), M('Ilmu Hadits', [MA]), M('Tafsir', [MA]), M('Ilmu Tafsir', [MA]),
    M('Ushul Fiqih', [MA]), M('Faraidh', [MA]), M('Ilmu Kalam', [MA]), M('Akhlak Tasawuf', [MA]),
    M('Balaghah', [MA]), M('Mantiq', [MA]),
    M('Lainnya'),
  ],
  // Daftar awal untuk memudahkan pengisian. Tinjau pengarang dan pembagian tingkat bersama ustadz/guru mapel, lalu sesuaikan di menu Konfigurasi.
  kitab: [
    K('Safinatun Naja', 'Salim bin Sumair al-Hadhrami', 'Fiqih', [MI, MTS]),
    K('Sullam at-Taufiq', "Abdullah bin Husain bin Thahir Ba'alawi", 'Fiqih', [MTS]),
    K('Mabadi Fiqhiyyah', 'Umar Abdul Jabbar', 'Fiqih', [MI, MTS]),
    K('Taqrib (Matan Abu Syuja)', "Abu Syuja' al-Ashfahani", 'Fiqih', [MTS, MA]),
    K('Fathul Qarib', 'Ibnu Qasim al-Ghazzi', 'Fiqih', [MTS, MA]),
    K('Kifayatul Akhyar', 'Taqiyuddin al-Hishni', 'Fiqih', [MA]),
    K("Fathul Mu'in", 'Zainuddin al-Malibari', 'Fiqih', [MA]),
    K("I'anatut Thalibin", 'Abu Bakr Syatha ad-Dimyathi', 'Fiqih', [MA]),
    K('Minhajut Thalibin', 'Yahya bin Syaraf an-Nawawi', 'Fiqih', [MA]),
    K('Al-Fiqh al-Manhaji', "Mustafa al-Khin, Mustafa al-Bugha, Ali asy-Syarbaji", 'Fiqih', [MA]),
    K('Fiqhus Sunnah', 'Sayyid Sabiq', 'Fiqih', [MA]),
    K('Aqidatul Awam', 'Ahmad al-Marzuqi', 'Akidah', [MI, MTS]),
    K('Tijan ad-Darari', 'Muhammad Nawawi al-Bantani', 'Akidah', [MTS, MA]),
    K('Jauharat at-Tauhid', 'Ibrahim al-Laqqani', 'Akidah', [MA]),
    K('Kifayatul Awam', 'Muhammad al-Fudhali', 'Akidah', [MA]),
    K('Fathul Majid', 'Muhammad Nawawi al-Bantani', 'Akidah', [MA]),
    K('Umm al-Barahin (as-Sanusiyyah)', 'Muhammad bin Yusuf as-Sanusi', 'Akidah', [MA]),
    K('Al-Aqidah ath-Thahawiyyah', "Abu Ja'far ath-Thahawi", 'Akidah', [MA]),
    K("Ta'lim al-Muta'allim", 'Burhanuddin az-Zarnuji', 'Akhlak', [MTS, MA]),
    K('Akhlaq lil Banin', 'Umar bin Ahmad Baraja', 'Akhlak', [MI, MTS]),
    K("Washaya al-Aba' lil Abna'", 'Muhammad Syakir', 'Akhlak', [MI, MTS]),
    K('Nashaihul Ibad', 'Muhammad Nawawi al-Bantani', 'Akhlak', [MTS, MA]),
    K("Adabul Alim wal Muta'allim", "Hasyim Asy'ari", 'Akhlak', [MA]),
    K('Bidayatul Hidayah', 'Abu Hamid al-Ghazali', 'Akhlak Tasawuf', [MA]),
    K("Ihya' Ulumiddin", 'Abu Hamid al-Ghazali', 'Akhlak Tasawuf', [MA]),
    K('Al-Hikam', "Ibnu Atha'illah as-Sakandari", 'Akhlak Tasawuf', [MA]),
    K("Arba'in Nawawi", 'Yahya bin Syaraf an-Nawawi', "Qur'an Hadits", [MTS, MA]),
    K('Riyadhus Shalihin', 'Yahya bin Syaraf an-Nawawi', "Qur'an Hadits", [MTS, MA]),
    K('Bulughul Maram', 'Ibnu Hajar al-Asqalani', 'Hadits', [MA]),
    K('Al-Adab al-Mufrad', 'Muhammad bin Ismail al-Bukhari', 'Hadits', [MA]),
    K("Mukhtar al-Ahadits an-Nabawiyyah", 'Ahmad al-Hasyimi', 'Hadits', [MA]),
    K('Al-Manzhumah al-Baiquniyyah', 'Umar al-Baiquni', 'Ilmu Hadits', [MA]),
    K('Tafsir Jalalain', 'Jalaluddin al-Mahalli dan Jalaluddin as-Suyuthi', 'Tafsir', [MA]),
    K('Tafsir Ibnu Katsir', 'Ismail bin Umar Ibnu Katsir', 'Tafsir', [MA]),
    K('Al-Itqan fi Ulumil Quran', 'Jalaluddin as-Suyuthi', 'Ilmu Tafsir', [MA]),
    K('Mabahits fi Ulumil Quran', "Manna' al-Qaththan", 'Ilmu Tafsir', [MA]),
    K('Tuhfatul Athfal', 'Sulaiman al-Jamzuri', 'Tajwid', [MI, MTS]),
    K('Al-Muqaddimah al-Jazariyyah', 'Ibnul Jazari', 'Tajwid', [MA]),
    K('Al-Ajurumiyyah', 'Ibnu Ajurrum', 'Nahwu', [MTS]),
    K('Nahwu al-Wadhih', 'Ali al-Jarim dan Mustafa Amin', 'Nahwu', [MTS, MA]),
    K('Al-Imrithi', 'Syarafuddin Yahya al-Imrithi', 'Nahwu', [MTS, MA]),
    K('Alfiyyah Ibnu Malik', 'Ibnu Malik', 'Nahwu', [MA]),
    K('Amtsilah at-Tashrifiyyah', "Muhammad Ma'shum bin Ali", 'Sharaf', [MTS]),
    K('Nurul Yaqin', 'Muhammad al-Khudhari Bik', 'Tarikh (SKI)', [MTS, MA]),
    K('Khulashah Nurul Yaqin', 'Umar Abdul Jabbar', 'Tarikh (SKI)', [MI, MTS]),
    K('Ar-Rahiq al-Makhtum', 'Shafiyyurrahman al-Mubarakfuri', 'Tarikh (SKI)', [MA]),
    K('Al-Waraqat', 'Imam al-Haramain al-Juwaini', 'Ushul Fiqih', [MA]),
    K('Al-Asybah wan Nazha\'ir', 'Jalaluddin as-Suyuthi', 'Ushul Fiqih', [MA]),
    K('Matan ar-Rahabiyyah', 'Muhammad ar-Rahabi', 'Faraidh', [MA]),
    K('Al-Balaghah al-Wadhihah', 'Ali al-Jarim dan Mustafa Amin', 'Balaghah', [MA]),
    K('Jauhar al-Maknun', 'Abdurrahman al-Akhdhari', 'Balaghah', [MA]),
    K('As-Sullam al-Munawraq', 'Abdurrahman al-Akhdhari', 'Mantiq', [MA]),
  ],
};

/* ------------------------------------------------------------------ Validasi */

const bad = (m) => new ApiError(422, 'CONFIG_INVALID', m);
const arr = (v) => (Array.isArray(v) ? v : []);
const subsetTingkat = (v) => { const s = new Set(arr(v).map((x) => String(x))); return TINGKAT_NAMA.filter((t) => s.has(t)); };
const salin = (o) => JSON.parse(JSON.stringify(o));

/** Logika murni: periksa dan bersihkan konfigurasi dari klien. Melempar ApiError 422 berisi pesan yang menunjuk bagian yang salah. */
export function sanitizeAppConfig(input) {
  if (!input || typeof input !== 'object') throw bad('Isi konfigurasi tidak valid.');

  const tingkat = TINGKAT_NAMA.map((nama) => {
    const t = arr(input.tingkat).find((x) => x && x.nama === nama) || {};
    const bawaan = DEFAULT_APP_CONFIG.tingkat.find((x) => x.nama === nama);
    const kelas = [...new Set(arr(t.kelas).map((k) => cleanLine(k, 10)).filter(Boolean))];
    if (kelas.length > BATAS.kelas) throw bad(`Kelas untuk ${nama} maksimal ${BATAS.kelas}.`);
    return {
      nama,
      label: cleanLine(t.label, 40) || bawaan.label,
      singkat: cleanLine(t.singkat, 10) || bawaan.singkat,
      kelas: kelas.length ? kelas : bawaan.kelas,
      aktif: t.aktif !== false,
    };
  });
  if (!tingkat.some((t) => t.aktif)) throw bad('Minimal satu tingkat harus aktif.');

  const dilihat = new Set();
  const mapel = arr(input.mapel).map((m) => {
    const nama = cleanLine(m && m.nama, BATAS.mapel);
    if (!nama) throw bad('Ada mata pelajaran tanpa nama.');
    if (dilihat.has(nama.toLowerCase())) throw bad(`Mata pelajaran "${nama}" tercatat dua kali.`);
    dilihat.add(nama.toLowerCase());
    const tk = subsetTingkat(m.tingkat);
    return { nama, tingkat: tk.length ? tk : [...TINGKAT_NAMA], aktif: m.aktif !== false };
  });
  if (!mapel.some((m) => m.aktif)) throw bad('Minimal satu mata pelajaran harus aktif.');
  if (mapel.length > 60) throw bad('Mata pelajaran maksimal 60.');

  const kdilihat = new Set();
  const kitabIn = arr(input.kitab);
  if (kitabIn.length > BATAS.kitab) throw bad(`Katalog kitab maksimal ${BATAS.kitab}.`);
  /** Tautan kitab opsional: hanya https di situs kitab yang diizinkan; selain itu dikosongkan. */
  const tautanAman = (raw) => {
    const t = normalisasiUrl(cleanLine(raw, 300));
    if (!t) return '';
    try { const u = new URL(t); return u.protocol === 'https:' && !u.username && !u.password && !u.port && hostAllowed(u.hostname.toLowerCase(), DEFAULT_HOSTS) ? u.origin + u.pathname.replace(/\/$/, '') : ''; } catch { return ''; }
  };
  const kitab = kitabIn.map((k) => {
    const nama = cleanLine(k && k.nama, 120);
    if (!nama) throw bad('Ada kitab tanpa nama.');
    if (kdilihat.has(nama.toLowerCase())) throw bad(`Kitab "${nama}" tercatat dua kali.`);
    kdilihat.add(nama.toLowerCase());
    const tk = subsetTingkat(k.tingkat);
    return { nama, pengarang: cleanLine(k.pengarang, 100), mapel: cleanLine(k.mapel, BATAS.mapel), tautan: tautanAman(k.tautan), tingkat: tk.length ? tk : [...TINGKAT_NAMA], aktif: k.aktif !== false };
  });

  return { versi: 1, tingkat, mapel, kitab };
}

/** Logika murni: dokumen Firestore -> konfigurasi aktif. Dokumen rusak/kosong jatuh ke bawaan agar aplikasi tidak pernah macet. */
export function resolveAppConfig(doc) {
  if (doc && doc.cfg) { try { return sanitizeAppConfig(doc.cfg); } catch { /* jatuh ke bawaan */ } }
  return salin(DEFAULT_APP_CONFIG);
}

/* ------------------------------------------------------------------- Firestore */

let cache = null;
export const invalidateAppConfig = () => { cache = null; };

async function bacaDoc() {
  const { db } = await firestoreAdmin();
  const snap = await db.doc(DOC).get();
  return snap.exists ? snap.data() : null;
}

/** Dibaca klien (semua peran aktif). Cache 60 detik per instance; bila Firestore gagal, memakai bawaan. */
export async function bacaAplikasi({ now = Date.now() } = {}) {
  if (cache && now - cache.at < TTL_MS) return cache.value;
  let doc = null; let galat = '';
  try { doc = await bacaDoc(); } catch (e) { galat = String(e?.code ?? e?.message ?? 'tak diketahui'); console.error('[appConfig] gagal membaca config/app, memakai bawaan:', galat); }
  const value = { config: resolveAppConfig(doc), kustom: !!(doc && doc.cfg), diubahOleh: (doc && doc.updatedBy) || '', diubahAt: (doc && doc.updatedAt) || null, ...(galat ? { galatBaca: galat } : {}) };
  if (!galat) cache = { at: now, value };
  return value;
}

export async function simpanApp(user, body, { now = () => new Date().toISOString() } = {}) {
  const cfg = sanitizeAppConfig(body && body.config);
  const { db } = await firestoreAdmin();
  await db.doc(DOC).set({ cfg, updatedBy: user.email || user.uid, updatedAt: now() });
  invalidateAppConfig();
  return bacaAplikasi();
}

/** Pulihkan ke bawaan kode: menghapus dokumen config/app. */
export async function resetApp() {
  const { db } = await firestoreAdmin();
  await db.doc(DOC).delete();
  invalidateAppConfig();
  return bacaAplikasi();
}
