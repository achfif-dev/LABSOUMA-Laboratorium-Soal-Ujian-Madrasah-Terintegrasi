// Analisis pertanyaan DETERMINISTIK (tanpa AI, tanpa jaringan) untuk Tanya Kitab dan chat bebas. Murni, dipakai server dan tes.
//
// Tujuan: sebelum AI menjawab, pertanyaan dipecah menjadi: jenis (hukum, definisi, pembagian, hikmah, derajat, dan seterusnya), fan keilmuan yang
// tampak, istilah teknis di dalamnya (beserta arti umumnya), bagian-bagian pertanyaan majemuk, dan unsur jawaban yang perlu dijabarkan menurut fannya.
// Hasilnya masuk prompt sebagai ALAT BANTU (dicap bisa keliru) dan menambah varian kueri pencarian; ia bukan sumber isi jawaban.
import { jenisDariPertanyaan, PANDUAN_JENIS, sahJenis } from './penelaahan.js';
import { istilahDiPertanyaan, kueriDariIstilah, ISTILAH, FAN } from './kamusIlmu.js';

const sanitasi = (s) => String(s || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
const normID = (s) => String(s || '').normalize('NFKC').toLowerCase().replace(/['’`ʻʼ‘´]/g, '').replace(/[^\p{L}\p{N}\s-]+/gu, ' ').replace(/\s+/g, ' ').trim();

/* ------------------------------------------------------------------ bagian pertanyaan majemuk */

// Ungkapan istilah yang memuat "dan" (mis. "qadha dan qadar", "ijab dan qabul") tidak boleh dipecah.
const ISTILAH_DAN = [...new Set(ISTILAH.flatMap((e) => e.alias.map((a) => a.join(' '))).filter((a) => a.includes(' dan ')))].sort((a, b) => b.length - a.length);
const KATA_TANYA = /^(?:tolong |mohon |coba |silakan )?(?:jelaskan|sebutkan|uraikan|bandingkan|terangkan|apa(?:kah)?(?: saja| itu| yang dimaksud(?: dengan)?| perbedaan| bedanya)?|bagaimana(?:kah)?|berapa(?:kah)?|siapa(?:kah)?|kapan|mengapa|kenapa|apakah)\s+/;
const PEMBEDA = /^(?:perbedaan|beda(?:nya)?|persamaan|perbandingan|hubungan)(?: antara)?\s+(.+?)\s+(?:dan|dengan|serta|vs|versus|dibanding(?:kan)?(?: dengan)?)\s+(.+)$/;

/**
 * Pertanyaan majemuk -> bagian-bagiannya (paling banyak 4). Kosong bila pertanyaan tunggal.
 * Pemecahan memakai kata sambung (dan, serta, atau, koma) dan pola "perbedaan A dan B"; ungkapan istilah yang memuat "dan" dijaga utuh.
 */
export function pecahBagian(q) {
  let t = normID(q).replace(/\s*-\s*/g, '-');
  if (t.split(' ').length < 3) return [];
  const simpan = []; // lindungi ungkapan istilah ber-"dan"
  for (const a of ISTILAH_DAN) { if (t.includes(a)) { t = t.split(a).join(`\u0001${simpan.length}\u0001`); simpan.push(a); } }
  const pulihkan = (x) => x.replace(/\u0001(\d+)\u0001/g, (_, i) => simpan[Number(i)]);
  t = t.replace(KATA_TANYA, '').trim();
  const m = t.match(PEMBEDA);
  let bagian = m ? [m[1], m[2]] : t.split(/\s*(?:,|;|\bserta\b|\bdan\b|\batau\b|\bbeserta\b|\bkemudian\b|\blalu\b)\s*/);
  bagian = bagian.map((x) => pulihkan(x).replace(/\s+/g, ' ').trim()).filter((x) => x.length >= 3);
  if (bagian.length < 2) return [];
  return [...new Set(bagian)].slice(0, 4).map((x) => x.slice(0, 80));
}

/* ------------------------------------------------------------------ unsur jawaban per fan */

export const UNSUR_FAN = {
  fiqh: 'hukum (wajib, sunnah, makruh, haram, boleh, sah, atau batal), syarat dan rukun, pembatal, pengecualian atau keringanan, dalil, dan perbedaan mazhab',
  faraid: 'ahli waris yang dibahas, bagian masing-masing, hajb (penghalang), ashabah, dan pokok masalah',
  ushul: 'definisi istilah, pembagian, dalil atau contoh penerapan, dan pengecualiannya',
  qawaid: 'bunyi kaidah, maknanya, dalil pokok, contoh penerapan, dan pengecualiannya',
  akidah: 'definisi, pembagian, dalil naqli dan aqli, lawannya, dan pendapat aliran lain bila ditulis',
  tasawuf: 'definisi, tingkatan atau tahapan, cara melatihnya, dan kaitannya dengan syariat',
  akhlak: 'definisi, bentuk-bentuknya, sebab dan akibat, dalil, dan cara memperbaikinya',
  balaghah: 'nama unsur, jenisnya, bagian-bagiannya pada contoh, dan alasan penggolongannya',
  tafsir: 'bunyi ayat (bila tertulis), makna menurut mufassir, sumber penafsiran, asbabun nuzul, dan pelajaran hukum',
  ulumul_quran: "definisi istilah, pembagian, contoh, dan perbedaan pendapat ulama",
  tajwid: 'nama hukum bacaan, huruf pemicunya, cara membaca, dan contoh',
  mustalah: 'definisi, syarat, pembagian, contoh, dan hukum pengamalannya bila tertulis',
  nahwu: "kedudukan i'rab, tanda i'rab, sebabnya, dan contoh",
  sharaf: "wazan, bentuk dasar, perubahan (i'lal atau ibdal), dan contoh",
  mantiq: 'definisi, pembagian, relasi, dan contoh',
  sirah: 'tokoh, waktu, tempat, urutan peristiwa, dan sebab-akibat',
};

export const SUSUNAN_JAWABAN = 'Susunan jawaban: (1) kalimat pertama langsung menjawab inti pertanyaan; (2) rincian bagian demi bagian (syarat, rukun, pembagian, dan sejenisnya) sesuai urutan di halaman; (3) pembatas dan pengecualian yang menyertai; (4) perbedaan pendapat beserta penanda tarjih bila tertulis; (5) bagian pertanyaan yang tidak ditemukan di halaman. Semua isi tetap harus bersumber dari halaman.';

/* ------------------------------------------------------------------ analisis utuh */

/**
 * @param {string} q  pertanyaan (Indonesia, Arab, atau campuran)
 * @param {{mapel?:string, jenis?:string}} [opsi]  mapel = fan kitab yang dicari (bila ada); jenis = jenis dari AI (bila sah, menang atas dugaan kode)
 */
export function analisisPertanyaan(q, { mapel = '', jenis = '' } = {}) {
  const pertanyaan = String(q || '');
  const j = sahJenis(jenis) || jenisDariPertanyaan(pertanyaan);
  const { istilah, fan } = istilahDiPertanyaan(pertanyaan, { mapel });
  const bagian = pecahBagian(pertanyaan);
  const unsur = fan.slice(0, 2).map((f) => UNSUR_FAN[f.id]).filter(Boolean);
  return { jenis: j, fan, istilah, bagian, unsur, kueriIstilah: kueriDariIstilah(istilah, 3) };
}

/** Blok prompt jawaban. '' bila tidak ada yang berguna dilaporkan. */
export function blokAnalisisPertanyaan(a, { batas = 2200 } = {}) {
  if (!a) return '';
  const b = [];
  b.push(`Jenis pertanyaan: ${a.jenis}`);
  if (a.fan.length) b.push(`Fan yang tampak: ${a.fan.map((f) => f.label).join('; ')}`);
  if (a.bagian.length) b.push(`Bagian pertanyaan (jawab satu per satu; yang tidak ada di halaman ditulis di \"catatan\"): ${a.bagian.map((x, i) => `${i + 1}) ${sanitasi(x)}`).join('; ')}`);
  if (a.istilah.length) b.push(`Istilah teknis dalam pertanyaan (arti umum dari kamus; bila halaman mendefinisikan lain, ikuti halaman):\n${a.istilah.slice(0, 6).map((it) => `- ${sanitasi(it.ar)} [${it.label}]: ${sanitasi(it.arti)}`).join('\n')}`);
  if (a.unsur.length) b.push(`Unsur yang perlu dijabarkan BILA tertulis di halaman: ${a.unsur.join('; ')}. Unsur yang tidak tertulis jangan ditambahkan.`);
  b.push(SUSUNAN_JAWABAN);
  const isi = b.join('\n');
  const teks = `<analisis_pertanyaan>\nDihitung otomatis oleh kode dari kata-kata pertanyaan (bukan oleh AI) sebagai alat bantu. Bisa keliru dan BUKAN sumber isi: halaman kitab tetap satu-satunya sumber jawaban.\n${isi}\n</analisis_pertanyaan>`;
  return teks.length > batas ? `${teks.slice(0, batas - 24).replace(/[<>]/g, '')}\n</analisis_pertanyaan>` : teks;
}

/** Blok untuk tahap rencana pencarian: padanan Arab istilah di pertanyaan. '' bila tidak ada. */
export function blokPetunjukIstilah(a) {
  if (!a || !a.istilah.length) return '';
  return `<petunjuk_istilah>\nPadanan Arab lazim dari istilah dalam pertanyaan (dihitung kode, bisa keliru; pakai bila sesuai maksud pertanyaan, abaikan bila tidak):\n${a.istilah.slice(0, 6).map((it) => `- ${sanitasi(it.ar)} [${it.label}]`).join('\n')}\n</petunjuk_istilah>\n`;
}

/** Ringkasan untuk chat bebas (tanpa halaman): fan, istilah beserta arti, dan bagian pertanyaan. */
export function blokAnalisisBebas(a) {
  if (!a || (!a.istilah.length && !a.bagian.length)) return '';
  const b = [];
  if (a.fan.length) b.push(`Fan yang tampak: ${a.fan.map((f) => f.label).join('; ')}`);
  if (a.bagian.length) b.push(`Bagian pertanyaan (jawab satu per satu): ${a.bagian.map((x, i) => `${i + 1}) ${sanitasi(x)}`).join('; ')}`);
  if (a.istilah.length) b.push(`Istilah teknis dalam pertanyaan (arti umum; bila ragu bahwa maknanya sama di kitab yang dimaksud, katakan):\n${a.istilah.slice(0, 6).map((it) => `- ${sanitasi(it.ar)} [${it.label}]: ${sanitasi(it.arti)}`).join('\n')}`);
  return `<analisis_pertanyaan>\nDihitung otomatis oleh kode (bukan oleh AI); alat bantu memahami pertanyaan, bukan sumber hukum.\n${b.join('\n')}\n</analisis_pertanyaan>\n`;
}

export { PANDUAN_JENIS, FAN };
