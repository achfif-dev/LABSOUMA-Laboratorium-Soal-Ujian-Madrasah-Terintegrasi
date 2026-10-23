// Konfigurasi aplikasi yang bisa diubah admin dari menu "Konfigurasi": tingkatan, kelas, sistem ujian, mata pelajaran, dan katalog kitab.
// Disimpan di Firestore config/app (klien tidak boleh membaca langsung; lihat firestore.rules). Klien membacanya lewat /api/app-config.
// Urutan prioritas: pengaturan admin -> bawaan kode (DEFAULT_APP_CONFIG di bawah).
//
// Catatan desain: tingkatan dan turunannya (kelas) sepenuhnya bisa diatur admin: tambah, ubah label, urutkan, nonaktifkan, hapus.
// Field `nama` pada tingkat adalah KUNCI yang disimpan di setiap soal (soal.tingkat), jadi tidak diubah setelah dibuat; yang diubah
// admin adalah `label` (tampilan). Tiga tingkat bawaan memakai kunci lama (Ibtidaiyah, Tsanawiyah, Aliyah) agar soal lama tetap cocok.
// Kelas (versi 3): kelas adalah data tersendiri milik tingkat, dipakai soal (soal.kelas) dan penempatan kitab. Sistem ujian (semester 4 kali atau
// catur wulan 3 kali, nama dan periodenya bisa diubah) dipilih per tingkat; kode periode (soal.periode) bersifat tetap, labelnya boleh diganti.
// Penempatan kitab (kitab.penempatan) menentukan kitab itu dipakai di kelas dan periode ujian mana; aturannya ada di web/lib/ujian.js.
// Nama Arab: kitab punya `namaArab` dan `pengarangArab`; tingkat punya `labelArab`. Semuanya opsional dan harus berisi huruf Arab.
import { ApiError, cleanLine, daftarkanTingkat } from './soalService.js';
import { firestoreAdmin } from './platform.js';
import { DEFAULT_HOSTS, hostAllowed, normalisasiUrl } from './kitabFetch.js';
import { BATAS_UJIAN, KODE_OK, DEFAULT_SISTEM_UJIAN } from './ujian.js';
import { siapkanRiwayat, pangkasRiwayat, bacaRiwayat, bandingkan } from './configBackup.js';

export const TINGKAT_NAMA = ['Ibtidaiyah', 'Tsanawiyah', 'Aliyah']; // kunci tingkat bawaan (dipakai soal lama)
const DOC = 'config/app';
const TTL_MS = 60_000;
export const BATAS = { mapel: 60, kitab: 400, kelas: 12, tingkat: 8, namaTingkat: 40, namaKelas: 20, ukuranByte: 800_000 }; // ukuranByte: jauh di bawah batas dokumen Firestore 1 MiB
// Huruf Arab (termasuk Arabic Supplement dan bentuk presentasi) untuk memvalidasi isian nama Arab.
const HURUF_ARAB = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

const MI = 'Ibtidaiyah'; const MTS = 'Tsanawiyah'; const MA = 'Aliyah';
const SEMUA = [MI, MTS, MA];
const M = (nama, tingkat = SEMUA) => ({ nama, tingkat, aktif: true });
const K = (nama, pengarang, mapel, tingkat) => ({ nama, pengarang, mapel, tingkat, aktif: true });

// Nama Arab kitab bawaan: [judul Arab, pengarang Arab]. Usulan awal, mohon ditinjau ustadz/guru mapel lalu sesuaikan di menu Konfigurasi.
const ARAB = {
  'Safinatun Naja': ['سفينة النجا', 'سالم بن سمير الحضرمي'],
  'Sullam at-Taufiq': ['سلم التوفيق إلى محبة الله على التحقيق', 'عبد الله بن حسين بن طاهر باعلوي'],
  'Mabadi Fiqhiyyah': ['المبادئ الفقهية', 'عمر عبد الجبار'],
  'Taqrib (Matan Abu Syuja)': ['التقريب (متن أبي شجاع)', 'أبو شجاع الأصفهاني'],
  'Fathul Qarib': ['فتح القريب المجيب', 'ابن قاسم الغزي'],
  'Kifayatul Akhyar': ['كفاية الأخيار', 'تقي الدين الحصني'],
  "Fathul Mu'in": ['فتح المعين', 'زين الدين المليباري'],
  "I'anatut Thalibin": ['إعانة الطالبين', 'أبو بكر شطا الدمياطي'],
  'Minhajut Thalibin': ['منهاج الطالبين', 'يحيى بن شرف النووي'],
  'Al-Fiqh al-Manhaji': ['الفقه المنهجي', 'مصطفى الخن ومصطفى البغا وعلي الشربجي'],
  'Fiqhus Sunnah': ['فقه السنة', 'سيد سابق'],
  'Aqidatul Awam': ['عقيدة العوام', 'أحمد المرزوقي'],
  'Tijan ad-Darari': ['تيجان الدراري', 'محمد نووي الجاوي البنتني'],
  'Jauharat at-Tauhid': ['جوهرة التوحيد', 'إبراهيم اللقاني'],
  'Kifayatul Awam': ['كفاية العوام', 'محمد الفضالي'],
  'Fathul Majid': ['فتح المجيد', 'محمد نووي الجاوي البنتني'],
  'Umm al-Barahin (as-Sanusiyyah)': ['أم البراهين (السنوسية)', 'محمد بن يوسف السنوسي'],
  'Al-Aqidah ath-Thahawiyyah': ['العقيدة الطحاوية', 'أبو جعفر الطحاوي'],
  "Ta'lim al-Muta'allim": ['تعليم المتعلم طريق التعلم', 'برهان الدين الزرنوجي'],
  'Akhlaq lil Banin': ['الأخلاق للبنين', 'عمر بن أحمد بارجاء'],
  "Washaya al-Aba' lil Abna'": ['وصايا الآباء للأبناء', 'محمد شاكر'],
  'Nashaihul Ibad': ['نصائح العباد', 'محمد نووي الجاوي البنتني'],
  "Adabul Alim wal Muta'allim": ['آداب العالم والمتعلم', 'هاشم أشعري'],
  'Bidayatul Hidayah': ['بداية الهداية', 'أبو حامد الغزالي'],
  "Ihya' Ulumiddin": ['إحياء علوم الدين', 'أبو حامد الغزالي'],
  'Al-Hikam': ['الحكم العطائية', 'ابن عطاء الله السكندري'],
  "Arba'in Nawawi": ['الأربعون النووية', 'يحيى بن شرف النووي'],
  'Riyadhus Shalihin': ['رياض الصالحين', 'يحيى بن شرف النووي'],
  'Bulughul Maram': ['بلوغ المرام', 'ابن حجر العسقلاني'],
  'Al-Adab al-Mufrad': ['الأدب المفرد', 'محمد بن إسماعيل البخاري'],
  'Mukhtar al-Ahadits an-Nabawiyyah': ['مختار الأحاديث النبوية', 'أحمد الهاشمي'],
  'Al-Manzhumah al-Baiquniyyah': ['المنظومة البيقونية', 'عمر البيقوني'],
  'Tafsir Jalalain': ['تفسير الجلالين', 'جلال الدين المحلي وجلال الدين السيوطي'],
  'Tafsir Ibnu Katsir': ['تفسير القرآن العظيم', 'إسماعيل بن عمر ابن كثير'],
  'Al-Itqan fi Ulumil Quran': ['الإتقان في علوم القرآن', 'جلال الدين السيوطي'],
  'Mabahits fi Ulumil Quran': ['مباحث في علوم القرآن', 'مناع القطان'],
  'Tuhfatul Athfal': ['تحفة الأطفال', 'سليمان الجمزوري'],
  'Al-Muqaddimah al-Jazariyyah': ['المقدمة الجزرية', 'ابن الجزري'],
  'Al-Ajurumiyyah': ['الآجرومية', 'ابن آجروم'],
  'Nahwu al-Wadhih': ['النحو الواضح', 'علي الجارم ومصطفى أمين'],
  'Al-Imrithi': ['نظم العمريطي', 'شرف الدين يحيى العمريطي'],
  'Alfiyyah Ibnu Malik': ['ألفية ابن مالك', 'ابن مالك'],
  'Amtsilah at-Tashrifiyyah': ['الأمثلة التصريفية', 'محمد معصوم بن علي'],
  'Nurul Yaqin': ['نور اليقين', 'محمد الخضري بك'],
  'Khulashah Nurul Yaqin': ['خلاصة نور اليقين', 'عمر عبد الجبار'],
  'Ar-Rahiq al-Makhtum': ['الرحيق المختوم', 'صفي الرحمن المباركفوري'],
  'Al-Waraqat': ['الورقات', 'إمام الحرمين الجويني'],
  "Al-Asybah wan Nazha'ir": ['الأشباه والنظائر', 'جلال الدين السيوطي'],
  'Matan ar-Rahabiyyah': ['متن الرحبية', 'محمد الرحبي'],
  'Al-Balaghah al-Wadhihah': ['البلاغة الواضحة', 'علي الجارم ومصطفى أمين'],
  'Jauhar al-Maknun': ['الجوهر المكنون', 'عبد الرحمن الأخضري'],
  'As-Sullam al-Munawraq': ['السلم المنورق', 'عبد الرحمن الأخضري'],
};
const KA = (k) => { const [namaArab = '', pengarangArab = ''] = ARAB[k.nama] || []; return { ...k, namaArab, pengarangArab, penempatan: [] }; };

export const DEFAULT_APP_CONFIG = {
  versi: 3,
  // Sistem ujian bawaan: semester (4 ujian) dan catur wulan (3 ujian). Tiap tingkat memilih salah satu; nama dan periodenya bisa diubah.
  sistemUjian: DEFAULT_SISTEM_UJIAN.map((s) => ({ ...s, periode: s.periode.map((p) => ({ ...p })) })),
  tingkat: [
    { nama: MI, label: 'Ibtidaiyah (MI)', labelArab: 'المدرسة الابتدائية', singkat: 'MI', kelas: ['I', 'II', 'III', 'IV', 'V', 'VI'], sistemUjian: 'semester', aktif: true },
    { nama: MTS, label: 'Tsanawiyah (MTs)', labelArab: 'المدرسة الثانوية', singkat: 'MTs', kelas: ['VII', 'VIII', 'IX'], sistemUjian: 'semester', aktif: true },
    { nama: MA, label: 'Aliyah (MA)', labelArab: 'المدرسة العالية', singkat: 'MA', kelas: ['X', 'XI', 'XII'], sistemUjian: 'semester', aktif: true },
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
    K('Mukhtar al-Ahadits an-Nabawiyyah', 'Ahmad al-Hasyimi', 'Hadits', [MA]),
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
    K("Al-Asybah wan Nazha'ir", 'Jalaluddin as-Suyuthi', 'Ushul Fiqih', [MA]),
    K('Matan ar-Rahabiyyah', 'Muhammad ar-Rahabi', 'Faraidh', [MA]),
    K('Al-Balaghah al-Wadhihah', 'Ali al-Jarim dan Mustafa Amin', 'Balaghah', [MA]),
    K('Jauhar al-Maknun', 'Abdurrahman al-Akhdhari', 'Balaghah', [MA]),
    K('As-Sullam al-Munawraq', 'Abdurrahman al-Akhdhari', 'Mantiq', [MA]),
  ].map(KA),
};

/* ------------------------------------------------------------------ Validasi */

const bad = (m) => new ApiError(422, 'CONFIG_INVALID', m);
const arr = (v) => (Array.isArray(v) ? v : []);
const salin = (o) => JSON.parse(JSON.stringify(o));
/** Nama Arab opsional: dibersihkan satu baris; bila diisi, wajib memuat huruf Arab (menolak salah ketik Latin di kolom Arab). */
const teksArab = (raw, max, konteks) => {
  const t = cleanLine(raw, max);
  if (t && !HURUF_ARAB.test(t)) throw bad(`${konteks} harus ditulis dengan huruf Arab.`);
  return t;
};
const arabSerupa = (k) => (k || '').normalize('NFKC');

/** Sistem ujian: 1-4 sistem, tiap sistem 1-6 periode berurutan. ID sistem dan kode periode bersifat tetap (dipakai soal), label bebas. Kosong -> bawaan. */
export function sanitizeSistemUjian(raw) {
  const list = arr(raw).filter((x) => x && typeof x === 'object');
  if (!list.length) return salin(DEFAULT_SISTEM_UJIAN);
  if (list.length > BATAS_UJIAN.sistem) throw bad(`Sistem ujian maksimal ${BATAS_UJIAN.sistem}.`);
  const ids = new Set(); const kodeSemua = new Set();
  return list.map((s) => {
    const id = cleanLine(s.id, BATAS_UJIAN.kode).toLowerCase();
    if (!KODE_OK.test(id)) throw bad(`ID sistem ujian \"${id}\" tidak valid (huruf kecil, angka, tanda hubung; maks. ${BATAS_UJIAN.kode} karakter).`);
    if (ids.has(id)) throw bad(`Sistem ujian \"${id}\" tercatat dua kali.`);
    ids.add(id);
    const label = cleanLine(s.label, BATAS_UJIAN.labelSistem);
    if (!label) throw bad(`Sistem ujian \"${id}\" belum diberi nama.`);
    const per = arr(s.periode).filter((x) => x && typeof x === 'object');
    if (!per.length) throw bad(`Sistem ujian \"${label}\" minimal punya satu periode ujian.`);
    if (per.length > BATAS_UJIAN.periode) throw bad(`Sistem ujian \"${label}\" maksimal ${BATAS_UJIAN.periode} periode.`);
    const periode = per.map((p) => {
      const kode = cleanLine(p.kode, BATAS_UJIAN.kode).toLowerCase();
      if (!KODE_OK.test(kode)) throw bad(`Kode periode \"${kode}\" pada sistem \"${label}\" tidak valid (huruf kecil, angka, tanda hubung).`);
      if (kodeSemua.has(kode)) throw bad(`Kode periode \"${kode}\" dipakai dua kali. Setiap kode harus unik di seluruh sistem ujian.`);
      kodeSemua.add(kode);
      const pl = cleanLine(p.label, BATAS_UJIAN.labelPeriode);
      if (!pl) throw bad(`Ada periode ujian tanpa nama pada sistem \"${label}\".`);
      return { kode, label: pl };
    });
    return { id, label, periode };
  });
}

/**
 * Penempatan kitab: kelas dan periode ujian tempat kitab dipakai. Rujukan yang sudah tidak ada (tingkat dihapus, kelas diganti nama, periode dihapus)
 * dibuang diam-diam, sama seperti rujukan tingkat pada mapel dan kitab. Hasil berurutan mengikuti urutan tingkat, kelas, dan periode di konfigurasi.
 */
export function sanitizePenempatan(raw, tingkatKitab, tingkatList, sistemList) {
  const pen = []; const dilihat = new Set();
  for (const p of arr(raw)) {
    if (!p || typeof p !== 'object') continue;
    const tn = cleanLine(p.tingkat, BATAS.namaTingkat); const kelas = cleanLine(p.kelas, BATAS.namaKelas);
    const t = tingkatList.find((x) => x.nama === tn);
    if (!t || !tingkatKitab.includes(tn) || !t.kelas.includes(kelas)) continue;
    const kunci = `${tn}\u0000${kelas}`; if (dilihat.has(kunci)) continue; dilihat.add(kunci);
    const urutan = (sistemList.find((s) => s.id === t.sistemUjian) || sistemList[0]).periode.map((x) => x.kode);
    const kodeLihat = new Set(); const periode = [];
    for (const x of arr(p.periode)) {
      const kode = cleanLine(typeof x === 'string' ? x : x && x.kode, BATAS_UJIAN.kode).toLowerCase();
      if (!urutan.includes(kode) || kodeLihat.has(kode)) continue;
      kodeLihat.add(kode);
      periode.push({ kode, cakupan: typeof x === 'object' ? cleanLine(x.cakupan, BATAS_UJIAN.cakupan) : '' });
    }
    periode.sort((a, b) => urutan.indexOf(a.kode) - urutan.indexOf(b.kode));
    pen.push({ tingkat: tn, kelas, periode });
  }
  const ti = (n) => tingkatList.findIndex((x) => x.nama === n);
  pen.sort((a, b) => ti(a.tingkat) - ti(b.tingkat) || tingkatList[ti(a.tingkat)].kelas.indexOf(a.kelas) - tingkatList[ti(a.tingkat)].kelas.indexOf(b.kelas));
  if (pen.length > BATAS_UJIAN.penempatan) throw bad(`Penempatan satu kitab maksimal ${BATAS_UJIAN.penempatan} kelas.`);
  return pen;
}

/** Logika murni: periksa dan bersihkan konfigurasi dari klien. Melempar ApiError 422 berisi pesan yang menunjuk bagian yang salah. */
export function sanitizeAppConfig(input) {
  if (!input || typeof input !== 'object') throw bad('Isi konfigurasi tidak valid.');

  // Tingkatan: daftar bebas (maks. BATAS.tingkat), urutan mengikuti masukan. Tanpa daftar sama sekali -> bawaan.
  const tingkatIn = arr(input.tingkat).filter((x) => x && typeof x === 'object');
  if (tingkatIn.length > BATAS.tingkat) throw bad(`Tingkatan maksimal ${BATAS.tingkat}.`);
  const sistemUjian = sanitizeSistemUjian(input.sistemUjian);
  const sistemId = new Set(sistemUjian.map((x) => x.id));
  const tdilihat = new Set();
  const tingkat = (tingkatIn.length ? tingkatIn : DEFAULT_APP_CONFIG.tingkat).map((t) => {
    const nama = cleanLine(t.nama, BATAS.namaTingkat);
    if (!nama) throw bad('Ada tingkat tanpa nama.');
    if (tdilihat.has(nama.toLowerCase())) throw bad(`Tingkat "${nama}" tercatat dua kali.`);
    tdilihat.add(nama.toLowerCase());
    const bawaan = DEFAULT_APP_CONFIG.tingkat.find((x) => x.nama === nama);
    const kelas = [];
    for (const k of arr(t.kelas)) { const v = cleanLine(k, 20); if (v && !kelas.some((x) => x.toLowerCase() === v.toLowerCase())) kelas.push(v); }
    if (kelas.length > BATAS.kelas) throw bad(`Kelas untuk ${nama} maksimal ${BATAS.kelas}.`);
    const label = cleanLine(t.label, BATAS.namaTingkat) || (bawaan ? bawaan.label : nama);
    const sistemIn = cleanLine(t.sistemUjian, BATAS_UJIAN.kode).toLowerCase();
    if (sistemIn && !sistemId.has(sistemIn)) throw bad(`Tingkat \"${label}\" memakai sistem ujian \"${sistemIn}\" yang tidak ada. Pilih sistem ujian lain.`);
    const sistemDipilih = sistemIn || sistemUjian[0].id;
    return {
      nama,
      label,
      labelArab: teksArab(t.labelArab, BATAS.namaTingkat, `Label Arab tingkat ${label}`),
      singkat: cleanLine(t.singkat, 10) || (bawaan ? bawaan.singkat : ''),
      kelas,
      sistemUjian: sistemDipilih,
      aktif: t.aktif !== false,
    };
  });
  if (!tingkat.some((t) => t.aktif)) throw bad('Minimal satu tingkat harus aktif.');
  // Mapel dan kitab menunjuk tingkat lewat nama; nama yang sudah tidak ada dibuang. Kosong berarti berlaku untuk semua tingkat.
  const semuaNama = tingkat.map((t) => t.nama);
  const subsetTingkat = (v) => { const s = new Set(arr(v).map((x) => String(x))); return semuaNama.filter((n) => s.has(n)); };

  const dilihat = new Set();
  const mapel = arr(input.mapel).map((m) => {
    const nama = cleanLine(m && m.nama, BATAS.mapel);
    if (!nama) throw bad('Ada mata pelajaran tanpa nama.');
    if (dilihat.has(nama.toLowerCase())) throw bad(`Mata pelajaran "${nama}" tercatat dua kali.`);
    dilihat.add(nama.toLowerCase());
    const tk = subsetTingkat(m.tingkat);
    return { nama, tingkat: tk.length ? tk : [...semuaNama], aktif: m.aktif !== false };
  });
  if (!mapel.some((m) => m.aktif)) throw bad('Minimal satu mata pelajaran harus aktif.');
  if (mapel.length > 60) throw bad('Mata pelajaran maksimal 60.');

  const kdilihat = new Set();
  const kitabIn = arr(input.kitab);
  if (kitabIn.length > BATAS.kitab) throw bad(`Katalog kitab maksimal ${BATAS.kitab}.`);
  // Daftar host sama dengan api/kitab.js: KITAB_ALLOWED_HOSTS (bila diisi) menggantikan bawaan.
  const hostKitab = () => { const h = String(process.env.KITAB_ALLOWED_HOSTS || '').split(/[,\s]+/).map((x) => x.trim().toLowerCase()).filter(Boolean); return h.length ? h : DEFAULT_HOSTS; };
  /** Tautan kitab opsional: hanya https di situs kitab yang diizinkan; selain itu dikosongkan. */
  const tautanAman = (raw) => {
    const t = normalisasiUrl(cleanLine(raw, 300));
    if (!t) return '';
    try { const u = new URL(t); return u.protocol === 'https:' && !u.username && !u.password && !u.port && hostAllowed(u.hostname.toLowerCase(), hostKitab()) ? u.origin + u.pathname.replace(/\/$/, '') : ''; } catch { return ''; }
  };
  const kitab = kitabIn.map((k) => {
    const nama = cleanLine(k && k.nama, 120);
    if (!nama) throw bad('Ada kitab tanpa nama.');
    if (kdilihat.has(nama.toLowerCase())) throw bad(`Kitab "${nama}" tercatat dua kali.`);
    kdilihat.add(nama.toLowerCase());
    const tk = subsetTingkat(k.tingkat);
    return {
      nama,
      namaArab: teksArab(arabSerupa(k.namaArab), 120, `Nama Arab kitab "${nama}"`),
      pengarang: cleanLine(k.pengarang, 100),
      pengarangArab: teksArab(arabSerupa(k.pengarangArab), 100, `Pengarang Arab kitab "${nama}"`),
      mapel: cleanLine(k.mapel, BATAS.mapel),
      tautan: tautanAman(k.tautan),
      tingkat: tk.length ? tk : [...semuaNama],
      penempatan: [],
      aktif: k.aktif !== false,
    };
  });
  // Penempatan butuh tingkat (beserta kelas dan sistem ujiannya) yang sudah bersih, jadi dihitung sesudah kitab.
  kitab.forEach((b, i) => { b.penempatan = sanitizePenempatan(kitabIn[i] && kitabIn[i].penempatan, b.tingkat, tingkat, sistemUjian); });

  const hasil = { versi: 3, sistemUjian, tingkat, mapel, kitab };
  // config/app satu dokumen Firestore (maks. 1 MiB). Pemetaan kelas dan cakupan materi bisa membuatnya membengkak; tolak dengan pesan jelas, bukan galat 500 saat menulis.
  if (Buffer.byteLength(JSON.stringify(hasil), 'utf8') > BATAS.ukuranByte) throw bad('Konfigurasi terlalu besar untuk disimpan. Kurangi cakupan materi, pemetaan kelas, atau jumlah kitab.');
  return hasil;
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

/** Daftarkan tingkat buatan admin ke validasi server AI (generate/assist). Memakai cache 60 detik; gagal baca -> hanya tingkat bawaan. */
export async function muatTingkatKustom() {
  const { config } = await bacaAplikasi();
  daftarkanTingkat(config.tingkat.filter((t) => t.aktif));
}

/**
 * Semua perubahan config/app lewat sini: baca keadaan sekarang, cadangkan, lalu tulis, dalam SATU transaksi.
 * `ubah(cur)` mengembalikan { tulis: dokumenBaru } atau { hapus: true }. Cadangan gagal -> perubahan ikut batal (tidak ada perubahan tanpa cadangan).
 * `basisAt` (opsional): updatedAt yang dilihat klien saat membuka editor; bila sudah berbeda, ada admin lain yang menyimpan lebih dulu -> 409.
 */
async function ubahDenganCadangan(user, alasan, ubah, { now = () => new Date().toISOString(), basisAt } = {}) {
  const { db } = await firestoreAdmin();
  const ref = db.doc(DOC);
  const oleh = user.email || user.uid; const waktu = now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.exists ? snap.data() : null;
    if (basisAt !== undefined && (basisAt || null) !== ((cur && cur.updatedAt) || null)) {
      throw new ApiError(409, 'CONFIG_CONFLICT', `Konfigurasi sudah diubah${cur && cur.updatedBy ? ` oleh ${cur.updatedBy}` : ''} sejak Anda membukanya. Muat ulang halaman agar tidak menimpa pekerjaan itu; perubahan Anda di layar belum disimpan.`);
    }
    const cad = await siapkanRiwayat(db, { jenis: 'app', alasan, docSaatIni: cur, oleh, now: waktu });
    const aksi = ubah(cur, { oleh, waktu });
    if (cad) tx.set(cad.ref, cad.doc);
    if (aksi.hapus) { if (snap.exists) tx.delete(ref); } else tx.set(ref, aksi.tulis);
  });
  await pangkasRiwayat('app');
  invalidateAppConfig();
  return bacaAplikasi();
}

export async function simpanApp(user, body, opts = {}) {
  const cfg = sanitizeAppConfig(body && body.config);
  const basisAt = body && Object.hasOwn(body, 'basisAt') && (body.basisAt === null || typeof body.basisAt === 'string') ? body.basisAt : undefined;
  return ubahDenganCadangan(user, 'sebelum-simpan', (_cur, { oleh, waktu }) => ({ tulis: { cfg, updatedBy: oleh, updatedAt: waktu } }), { ...opts, basisAt });
}

/** Pulihkan ke BAWAAN KODE: menghapus config/app. Keadaan sebelumnya dicadangkan lebih dulu, jadi masih bisa dikembalikan dari riwayat. */
export async function resetApp(user = { uid: 'sistem' }, opts = {}) {
  return ubahDenganCadangan(user, 'sebelum-reset', () => ({ hapus: true }), opts);
}

/** Kembalikan konfigurasi dari cadangan (otomatis atau titik pulih). Isinya divalidasi ulang; keadaan sekarang dicadangkan lebih dulu. */
export async function pulihkanApp(user, id, opts = {}) {
  const r = await bacaRiwayat('app', id);
  const cfg = sanitizeAppConfig(r.data); // cadangan lama tetap diperiksa terhadap aturan sekarang
  return ubahDenganCadangan(user, 'sebelum-pulih', (_cur, { oleh, waktu }) => ({ tulis: { cfg, updatedBy: oleh, updatedAt: waktu, dipulihkanDari: r.id } }), opts);
}

/** Ringkasan perubahan bila cadangan ini dipulihkan, dibandingkan dengan konfigurasi yang berlaku sekarang. */
export async function lihatApp(id) {
  const r = await bacaRiwayat('app', id);
  const { db } = await firestoreAdmin();
  const s = await db.doc(DOC).get();
  const sekarang = resolveAppConfig(s.exists ? s.data() : null);
  let cadangan; let dapatDipulihkan = true; let alasanTolak = '';
  try { cadangan = sanitizeAppConfig(r.data); } catch (e) { cadangan = r.data; dapatDipulihkan = false; alasanTolak = e.message; }
  const { data: _d, ...meta } = r;
  return { meta, dapatDipulihkan, alasanTolak, perubahan: bandingkan('app', cadangan, sekarang) };
}
