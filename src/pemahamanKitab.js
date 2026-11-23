// Kerangka PEMAHAMAN KITAB: satu sumber untuk cara AI membaca teks turats di SEMUA fitur
// (penyusunan soal, Paket Dauri, terjemah, analisis, telaah soal, uji jawab buta, ekstrak fakta, Tanya Kitab, chat bebas).
//
// Sebelumnya tiap prompt menulis aturan bacanya sendiri (dan hampir semuanya hanya "setia pada teks"). Akibatnya kesalahan baca yang paling umum
// pada kitab turats lolos: pembatas dan pengecualian yang terlewat (إلا، غير، ما لم), kata hukum yang tertukar (sah dengan wajib, boleh dengan sunnah),
// ucapan pensyarah dianggap ucapan pengarang matan, pendapat yang hanya dinukil (قيل) dianggap pegangan, dan kalimat terpotong yang "dilengkapi" sendiri.
//
// Teks di sini adalah ALAT MEMAHAMI, bukan sumber isi. Setiap prompt tetap memuat aturan sumber tunggal: semua yang disimpulkan harus tertulis di teks.
import { petaTeks, blokPetaTeks, kenaliDisiplin, DISIPLIN } from '../web/lib/petaTeks.js';
import { blokIstilahTeks } from '../web/lib/kamusIlmu.js';

export { petaTeks, blokPetaTeks, kenaliDisiplin, DISIPLIN };

/** Metode membaca kitab: dipakai semua fitur AI untuk teks Arab. Sengaja ringkas (token) tetapi lengkap pada jebakan baca yang paling sering. */
export const PANDUAN_BACA = `METODE MEMBACA KITAB (alat untuk MEMAHAMI teks, bukan sumber isi; semua kesimpulan tetap harus tertulis di teks):
A. SIAPA BERBICARA. Pisahkan lapisan: matan (teks pokok pengarang), syarh (penjelasan pensyarah), hasyiyah/ta'liq (catatan penulis hasyiyah), dan nukilan pendapat ulama atau mazhab. Penanda lazim: "قوله" atau "(قوله: ...)" mengutip lafaz matan lalu menjelaskannya; "قال الشارح/المصنف/المؤلف/الماتن"; "أقول"; (م) dan (ش) pada sebagian terbitan. Jangan menyamakan penjelasan pensyarah dengan ucapan pengarang matan, dan jangan menyamakan pendapat yang hanya dinukil dengan pendapat yang dipegang kitab.
B. JENIS UJARAN. Tentukan tiap kalimat inti: hukum, definisi, syarat/rukun/sunnah, dalil, bilangan, contoh kasus, khilaf, atau tarjih. Uji atau jelaskan jenis yang benar-benar dinyatakan teks.
C. KETELITIAN BAHASA.
 1) Pembatas dan pengecualian mengubah hukum: إلا، غير، سوى، ما لم، بشرط، إن/إذا/لو، حيث، لكن، عدا. Baca sampai ujung kalimat sebelum menyimpulkan.
 2) Negasi: لا، لم، لن، ليس. Penafian + إلا (لا ... إلا) dan إنما berarti pembatasan (hasr): hanya yang disebut yang berlaku.
 3) Rujukan dhamir (هو، هي، هم، ـه، ـها): tentukan kembali ke siapa dari kata sebelumnya; bila tidak pasti, jangan menebak.
 4) Umum vs khusus (عام/خاص) dan mutlak vs terikat (مطلق/مقيد): jangan memperluas atau mempersempit cakupan.
 5) Bilangan: ikuti angka persis dan hal yang dihitung (ma'dud); jangan menghitung ulang dari daftar yang mungkin terpotong.
D. KATA HUKUM (hanya bila teks memuat hukum fiqih; untuk teks akidah, tasawuf, tafsir, sirah, dan fan lain lewati bagian ini). يجب/يلزم/فرض/واجب = wajib; يسن/يستحب/يندب/مندوب = sunnah; يكره = makruh; يحرم/لا يجوز/لا يحل = haram; يجوز/جائز/يباح/لا بأس = boleh (tidak terlarang, bukan otomatis sunnah); خلاف الأولى = menyelisihi yang lebih utama; يصح/يجزئ = sah atau mencukupi (bukan otomatis wajib); يبطل/يفسد/ينقض = batal atau rusak. "لا يجب" berarti tidak wajib, bukan wajib. "ينبغي" bisa sunnah atau wajib menurut penggunaan kitab: ikuti konteks. Jangan menukar wajib dengan sah, atau boleh dengan sunnah.
E. ISTILAH TARJIH (hanya bila relevan dengan teks; kitab Syafi'iyah; bila kitab menjelaskan lain, ikuti kitab): الأظهر = lebih kuat di antara dua qaul; الأصح = lebih sahih di antara beberapa wajh; المذهب = pendapat mazhab hasil tarjih; المعتمد = pendapat pegangan; الشيخان = al-Nawawi dan al-Rafi'i; القديم/الجديد = qaul lama (Irak) / baru (Mesir) Imam al-Syafi'i; قيل، وقيل، وفي وجه، وفي قول = pendapat lain yang dinukil, umumnya bukan pegangan. Kitab mazhab lain punya padanannya sendiri; bila tidak yakin, uraikan apa adanya tanpa melabeli.
F. KEUTUHAN TEKS. Bila awal atau akhir teks terpotong (dimulai dengan penyambung, atau berhenti di tengah kalimat), ada noise OCR, atau kalimat yang dirujuk tidak lengkap: jangan melengkapinya dari pengetahuan sendiri, tandai sebagai terpotong, dan hindari butir yang bergantung pada bagian yang hilang.
G. PEMBACAAN GANDA. Sebelum menulis, baca ulang dan tanyakan: "bila satu kata pembatas saya abaikan, apakah kesimpulan saya berubah?" dan "adakah pendapat lain di teks yang membuat jawaban tidak tunggal?". Bila ya, tuliskan pembatasnya atau pilih bagian teks lain.`;

/** Versi pendek untuk fitur yang hanya butuh pengingat (uji jawab buta, chat bebas). */
export const PANDUAN_BACA_RINGKAS = `BACA DENGAN TELITI: perhatikan pembatas dan pengecualian (إلا، غير، ما لم، بشرط، إذا، لو), negasi (لا، لم، لن، ليس; لا ... إلا = pembatasan), rujukan dhamir, kata hukum (wajib ≠ sah, boleh ≠ sunnah, "لا يجب" = tidak wajib), dan siapa yang berbicara (matan, syarh, hasyiyah, atau nukilan pendapat lain: قيل/وقيل bukan pegangan). Teks yang terpotong atau rusak jangan dilengkapi dari pengetahuan sendiri.`;

/** Panduan khusus per disiplin: apa yang dipetakan, apa yang boleh diuji, dan jebakan khasnya. */
export const PANDUAN_DISIPLIN = {
  fiqh: 'FIQIH: petakan rukun, syarat (syarat sah atau syarat wajib), sunnah (hai\'ah dan ab\'adh), pembatal, makruh, rukhshah atau udzur, dan perbedaan mazhab. Bedakan syarat dari rukun, dan sah dari wajib. Bab muamalah: rukun akad (dua pihak, shighat ijab-qabul, objek akad), syarat, dan sebab batal atau fasid. Bab waris: bedakan ashhabul furudh, ashabah, hajb, dan pokok masalah. Bab jinayat: bedakan hadd, qishash, diyat, dan ta\'zir. Pada soal kasus, tokoh dan situasi boleh dikarang tetapi hukum penentunya harus tertulis di teks.',
  akidah: 'AKIDAH/TAUHID: perhatikan pembagian (wajib, mustahil, jaiz), sifat Allah (nafsiyah, salbiyah, ma\'ani, ma\'nawiyah) beserta lawannya, sifat rasul, dalil naqli versus aqli, dan lawan tiap istilah. Rumusan definisi harus dijaga persis: satu kata berbeda (mis. قديم vs باق) mengubah maknanya. Pada nash sifat khabariyah, sebut metode (tafwidh atau takwil) hanya bila tertulis di teks. Aliran lain disebut sebagaimana ditulis kitab, tanpa menghakimi.',
  hadits: 'HADITS: pisahkan sanad, matan, sahabat perawi, mukharrij, dan derajat. Derajat atau mukharrij hanya boleh disebut bila teks menyebutnya. Jangan menukar sahabat perawi dengan pengucap sabda. Untuk kitab syarah hadits, bedakan matan hadits dari penjelasan pensyarah, dan fiqh al-hadits (hukum yang diambil) dari bunyi hadits.',
  nahwu_sharaf: 'NAHWU/SHARAF: contoh dan i\'rab harus mengikuti kaidah yang tertulis di teks. Tentukan dulu babnya (marfu\'at, manshubat, majrurat, tashrif, wazan, dll.). Soal yang sah: kedudukan kata (i\'rab), tanda i\'rab, jenis kata, wazan, atau penerapan kaidah pada contoh BARU yang kaidahnya ada di teks. Harakat contoh menentukan jawaban: jangan diubah. Pengecoh: tanda i\'rab atau kedudukan lain yang masuk akal.',
  ushul: 'USHUL FIQIH/KAIDAH: perhatikan definisi istilah (amr, nahy, \'amm, khash, mutlaq, muqayyad, mujmal, mubayyan), daftar dalil, dan kaidah beserta contoh penerapannya. Bedakan dalil (nash, ijma\', qiyas) dari metode (istishhab, istihsan, maslahah mursalah) dan dari qawaid fiqhiyyah; status tiap sumber bisa berbeda antarmazhab, ikuti yang ditulis teks. Pada qiyas sebut ashl, far\', \'illat, dan hukum. Jangan melebarkan cakupan kaidah melebihi contoh dan pengecualian yang tertulis.',
  tasawuf_akhlak: 'AKHLAK/TASAWUF: perhatikan pembagian sifat terpuji dan tercela, tingkatan (maqam atau hal), definisi tiap istilah, dan adab. Bedakan maqam (diusahakan, menetap) dari hal (anugerah, tidak menetap), dan istilah sufi dari makna bahasanya. Untuk istilah yang diperdebatkan (mis. wahdatul wujud, hulul, syathahat) sampaikan sebagaimana uraian kitab tanpa menghakimi. Jangan menjadikan nasihat (targhib/tarhib) sebagai hukum wajib atau haram bila teks tidak menyatakannya.',
  tafsir_quran: 'TAFSIR/ULUMUL QUR\'AN/TAJWID: pisahkan tiga lapis. (1) Tafsir: makna ayat dan sumbernya (bil ma\'tsur atau bir ra\'yi), serta pendapat mufassir yang dinukil. (2) Ulumul Qur\'an: asbabun nuzul, makki-madani, nasikh-mansukh, muhkam-mutasyabih, qira\'at. (3) Tajwid: makhraj, sifat huruf, dan hukum bacaan beserta contohnya. Ayat, sebab turun, qira\'at, dan nama mufassir hanya boleh disebut bila tertulis di teks; jangan menulis ayat dari ingatan.',
  balaghah: 'BALAGHAH: tentukan dulu cabangnya (ma\'ani, bayan, badi\'). Tasybih: sebut musyabbah, musyabbah bih, adat, wajh syibh, dan jenisnya (mursal, muakkad, mujmal, mufashshal, baligh, tamtsil). Isti\'arah: sebut jenisnya (tashrihiyyah atau makniyyah; ashliyyah atau tabaiyyah) dan qarinahnya. Majaz: bedakan mursal dan \'aqli beserta \'alaqah-nya; kinayah dibedakan dari majaz oleh bolehnya makna asal ikut dimaksud. Kesimpulan harus dibuktikan oleh contoh yang tertulis; jangan mengubah kata atau harakat contoh.',
  mustalah: 'MUSHTHALAH HADITS: bedakan syarat shahih (sanad bersambung, perawi \'adil dan dhabith, tanpa syudzudz dan \'illat), tingkat hasan dan dha\'if, sebab dha\'if (gugurnya sanad atau cacat perawi), pembagian menurut jumlah jalur (mutawatir; ahad: masyhur, \'aziz, gharib) dan sandaran (marfu\', mauquf, maqthu\'). Derajat hadits tertentu hanya boleh disebut bila teks menyebutnya; jangan menilai sendiri.',
  sirah_tarikh: 'SIRAH/TARIKH: perhatikan tokoh, tempat, urutan, tahun, dan sebab-akibat sebagaimana tertulis. Nama dan angka tahun diambil persis; jangan menambah peristiwa.',
  umum: 'Tentukan dulu jenis materi (definisi, klasifikasi, kaidah, contoh, kisah) lalu uji atau jelaskan sesuai jenisnya.',
};

/** Panduan disiplin untuk teks ini (utama, dan sekunder bila ada). */
export function panduanDisiplin(disiplin) {
  const d = disiplin && disiplin.id ? disiplin : { id: 'umum' };
  const utama = PANDUAN_DISIPLIN[d.id] || PANDUAN_DISIPLIN.umum;
  const kedua = d.sekunder && PANDUAN_DISIPLIN[d.sekunder.id] ? `\nUnsur lain di teks: ${PANDUAN_DISIPLIN[d.sekunder.id]}` : '';
  return `${utama}${kedua}`;
}

/**
 * Blok untuk PROMPT PENGGUNA: peta teks (dihitung kode) + panduan disiplin. '' untuk teks bukan Arab atau terlalu pendek.
 * Hanya memberi data baca; tidak mengubah apa pun pada teks.
 */
export function blokPemahaman(teks, { mapel = '', bahasa = 'ar' } = {}) {
  if (bahasa && bahasa !== 'ar') return '';
  const peta = petaTeks(teks, { mapel });
  const blok = blokPetaTeks(peta);
  if (!blok) return '';
  const istilah = blokIstilahTeks(teks, { disiplin: peta.disiplin });
  return `${blok}\n<panduan_disiplin>\n${panduanDisiplin(peta.disiplin)}\n</panduan_disiplin>${istilah ? `\n${istilah}` : ''}`;
}

/** Tambahan system prompt untuk teks Arab. Bahasa lain: ''. */
export const sistemBaca = (bahasa = 'ar') => (!bahasa || bahasa === 'ar' ? `\n\n${PANDUAN_BACA}\nBlok <peta_teks>, <panduan_disiplin>, dan <istilah_teks> di pesan pengguna (bila ada) hanya alat bantu baca yang dihitung kode; isinya bisa keliru dan tidak boleh dikutip sebagai isi kitab.` : '');
