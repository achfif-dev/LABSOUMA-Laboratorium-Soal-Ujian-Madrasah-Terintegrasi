// Otoritas kitab: seberapa jauh sebuah kitab boleh dijadikan DASAR soal bagi madrasah berhaluan Aswaja.
// Satu sumber kebenaran untuk server (src/otoritas.js) dan klien (web/KitabImpor.jsx). Tanpa dependensi, tanpa AI.
//
// Penting: status ini ditetapkan ADMIN/USTADZ, bukan ditebak model. AI hanya menerima arahannya (barisOtoritas) dan
// tidak pernah diminta menilai sendiri apakah suatu kitab Aswaja atau bukan.

export const STATUS_OTORITAS = ['belum_dinilai', 'muktamad', 'rujukan', 'pembanding', 'luar_rumpun'];
export const AKIDAH = ['', 'asyari', 'maturidi', 'lain'];

export const LABEL_STATUS = {
  belum_dinilai: 'Belum dinilai',
  muktamad: 'Muktamad (pegangan madrasah)',
  rujukan: 'Rujukan diakui',
  pembanding: 'Pembanding',
  luar_rumpun: 'Di luar rumpun Aswaja',
};
export const LABEL_AKIDAH = { '': 'Tidak dicatat', asyari: 'Asy\'ari', maturidi: 'Maturidi', lain: 'Lainnya' };

/** Arahan untuk model per status. Teks ini dikirim ke prompt, jadi harus tetap pendek, tegas, dan santun. */
export const ARAHAN_STATUS = {
  belum_dinilai: 'Kitab ini belum ditinjau ustadz. Tetap hanya berdasar teks, dan jangan menyimpulkan bahwa isinya adalah pegangan madrasah.',
  muktamad: 'Kitab pegangan (muktamad) madrasah. Boleh menjadi dasar soal dan kunci.',
  rujukan: 'Kitab rujukan yang diakui. Boleh menjadi dasar soal; bila isinya memuat khilaf, tulis di pembahasan bahwa itu pendapat kitab ini.',
  pembanding: 'Kitab pembanding, bukan pegangan utama madrasah. Di pembahasan sebut bahwa jawaban adalah pendapat kitab ini, dan jangan menyimpulkan hukum bagi madrasah.',
  luar_rumpun: 'Kitab di luar rumpun Aswaja atau empat mazhab menurut penetapan admin. Uji hanya isi teks sebagai pendapat kitab itu, sebut hal tersebut di pembahasan, jangan jadikan dasar kebenaran bagi madrasah, dan jangan menghakimi pengarang.',
};

export const MAKS_CATATAN = 300;

/** Buang tag, baris baru, dan karakter kendali: nilai ini masuk ke prompt, jadi tidak boleh menyelipkan pembatas atau instruksi berlapis. */
const satuBaris = (v, maks) => String(v ?? '')
  .replace(/[\u0000-\u001F\u007F]/g, ' ')
  .replace(/[<>]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, maks);

/**
 * Baca otoritas dari dokumen kitab dengan toleran: kitab lama (tanpa bidang ini) = belum_dinilai.
 * Tidak melempar galat; dipakai untuk membaca data yang sudah tersimpan.
 */
export function normalOtoritas(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  return {
    status: STATUS_OTORITAS.includes(o.status) ? o.status : 'belum_dinilai',
    akidah: AKIDAH.includes(o.akidah) ? o.akidah : '',
    catatan: satuBaris(o.catatan, MAKS_CATATAN),
    ditetapkanOleh: typeof o.ditetapkanOleh === 'string' ? o.ditetapkanOleh.slice(0, 128) : '',
    ditetapkanAt: typeof o.ditetapkanAt === 'string' ? o.ditetapkanAt.slice(0, 40) : '',
  };
}

/**
 * Validasi masukan admin (ketat). `gagal(pesan)` harus melempar. Mengembalikan { status, akidah, catatan }.
 * Status bukan bagian daftar = ditolak, bukan diam-diam diubah jadi bawaan.
 */
export function validasiOtoritas(raw, gagal) {
  if (!raw || typeof raw !== 'object') gagal('Isian otoritas kosong.');
  if (!STATUS_OTORITAS.includes(raw.status)) gagal('Status otoritas tidak dikenal.');
  const akidah = raw.akidah == null ? '' : String(raw.akidah);
  if (!AKIDAH.includes(akidah)) gagal('Akidah tidak dikenal.');
  const catatan = raw.catatan == null ? '' : String(raw.catatan);
  if (catatan.length > MAKS_CATATAN) gagal(`Catatan maksimal ${MAKS_CATATAN} karakter.`);
  return { status: raw.status, akidah, catatan: satuBaris(catatan, MAKS_CATATAN) };
}

/**
 * Baris untuk blok <metadata> di prompt. `kitab` = { judulLatin|judul, pengarang, wafatH, fan, mazhab, otoritas } dari server.
 * Kitab tidak dikenal (teks ditempel manual, tanpa tautan perpustakaan) = string kosong, supaya prompt lama tidak berubah.
 */
export function barisOtoritas(kitab) {
  if (!kitab || typeof kitab !== 'object') return '';
  const o = normalOtoritas(kitab.otoritas);
  const ciri = [
    satuBaris(kitab.judulLatin || kitab.judul, 150),
    kitab.pengarang && `pengarang ${satuBaris(kitab.pengarang, 150)}`,
    Number.isInteger(kitab.wafatH) && `wafat ${kitab.wafatH} H`,
    kitab.fan && `fan ${satuBaris(kitab.fan, 80)}`,
    kitab.mazhab && `mazhab fiqih ${satuBaris(kitab.mazhab, 20)}`,
    o.akidah && `akidah ${LABEL_AKIDAH[o.akidah]}`,
  ].filter(Boolean).join(', ');
  const baris = [
    `Kitab terdaftar di perpustakaan: ${ciri || 'tanpa keterangan'}`,
    `Status otoritas kitab (ditetapkan admin, bukan hasil tebakan): ${LABEL_STATUS[o.status]}. ${ARAHAN_STATUS[o.status]}`,
  ];
  if (o.catatan) baris.push(`Catatan ustadz tentang kitab ini: ${o.catatan}`);
  return baris.join('\n');
}

/** Peringatan untuk pengguna (bukan untuk model). Kosong bila kitab muktamad/rujukan atau tidak tertaut. */
export function peringatanOtoritas(kitab) {
  if (!kitab || typeof kitab !== 'object') return '';
  const s = normalOtoritas(kitab.otoritas).status;
  if (s === 'luar_rumpun') return 'Kitab ini ditandai di luar rumpun Aswaja. Soal hanya menguji isi teks sebagai pendapat kitab itu; ustadz perlu menelaahnya sebelum dipakai.';
  if (s === 'pembanding') return 'Kitab ini berstatus pembanding, bukan pegangan utama madrasah. Periksa pembahasannya sebelum dipakai.';
  if (s === 'belum_dinilai') return 'Status otoritas kitab ini belum ditetapkan admin. Hasil tetap perlu ditinjau ustadz.';
  return '';
}

/** Hanya kitab muktamad dan rujukan yang boleh dijadikan dasar jawaban "menurut madrasah". */
export const bolehJadiDasar = (kitab) => ['muktamad', 'rujukan'].includes(normalOtoritas(kitab && kitab.otoritas).status);
