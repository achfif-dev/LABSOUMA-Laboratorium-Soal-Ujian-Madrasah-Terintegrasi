// Pra-pemrosesan gambar halaman PDF sebelum dikirim ke OCR AI. Murni (tanpa DOM): menerima data piksel RGBA (Uint8ClampedArray / Uint8Array)
// sehingga bisa diuji di Node. Tiga tujuan:
//  1. Skala abu-abu: JPEG abu-abu jauh lebih kecil, jadi unggahan dari ponsel lebih cepat dan lebih jarang perlu diturunkan resolusinya.
//  2. Perataan kontras (titik putih = kertas, titik hitam = tinta tergelap): pindaian pucat atau kertas menguning jadi lebih tegas.
//  3. Deteksi halaman kosong: halaman tanpa tinta tidak perlu satu panggilan AI penuh (hemat kuota dan waktu).
// Pengolahan DILAKUKAN DI TEMPAT (data diubah langsung) agar tidak menggandakan memori di ponsel.

export const AMBANG_RENTANG_KOSONG = 20;   // selisih terang-gelap di bawah ini = halaman hampir seragam (putih/abu polos, derau pindai). Sengaja rendah: salah memanggil AI untuk halaman kosong hanya rugi kuota, salah melewati halaman bertulisan pudar menghilangkan teks
export const AMBANG_TINTA_KOSONG = 0.0004; // < 0,04% piksel gelap = tidak ada teks (nomor halaman tunggal pun masuk golongan ini)
const BAGIAN_GELAP = 0.43;                 // piksel di bagian bawah 43% rentang (hitam..putih) dihitung tinta; RELATIF terhadap kontras halaman, supaya pindaian pudar tidak dianggap kosong
const RENTANG_MIN_PERATAAN = 40;           // selisih lebih kecil dari ini: jangan diperataan (hanya akan memperbesar derau)

/** Persentil dari histogram 256 kotak. p dalam [0,1]. */
function persentil(hist, total, p) {
  const target = Math.max(0, Math.min(total - 1, Math.floor(total * p)));
  let kum = 0;
  for (let v = 0; v < 256; v++) { kum += hist[v]; if (kum > target) return v; }
  return 255;
}

/**
 * Ubah piksel RGBA ke abu-abu dan ratakan kontrasnya, di tempat.
 * @param {Uint8ClampedArray|Uint8Array} data  piksel RGBA berurutan (panjang kelipatan 4)
 * @returns {{kosong:boolean, tinta:number, hitam:number, putih:number}}
 *   `kosong`: halaman tidak memuat tinta yang berarti (pemanggil boleh melewati OCR). `tinta`: porsi piksel gelap relatif terhadap kontras halaman (0..1).
 */
export function olahPiksel(data) {
  const n = Math.floor(data.length / 4);
  if (!n) return { kosong: true, tinta: 0, hitam: 0, putih: 255 };
  const hist = new Uint32Array(256);
  for (let i = 0, p = 0; p < n; p++, i += 4) {
    const g = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8; // luminans (bobot Rec.601, bilangan bulat)
    data[i] = g; hist[g]++;
  }
  const hitam = persentil(hist, n, 0.005);
  const p90 = persentil(hist, n, 0.9);
  const putih = Math.max(150, Math.min(245, p90)); // kertas = persentil ke-90: piksel terang selalu menempati ujung atas histogram, jadi titik putih jatuh di lapisan atas kertas (bukan di tengah derau). Dibatasi >=150 agar halaman gelap tidak diterangkan paksa
  const rentangAsli = persentil(hist, n, 0.99) - hitam;
  const ratakan = putih - hitam >= RENTANG_MIN_PERATAAN;
  const skala = ratakan ? 255 / (putih - hitam) : 1;
  const dasar = ratakan ? hitam : 0;
  const ambang = hitam + BAGIAN_GELAP * (putih - hitam); // dihitung pada abu-abu asli, sebelum diratakan
  let gelap = 0;
  for (let i = 0, p = 0; p < n; p++, i += 4) {
    let g = data[i];
    if (g < ambang) gelap++;
    if (ratakan) { g = (g - dasar) * skala; g = g < 0 ? 0 : g > 255 ? 255 : g | 0; }
    data[i] = data[i + 1] = data[i + 2] = g; data[i + 3] = 255;
  }
  const tinta = gelap / n;
  return { kosong: rentangAsli < AMBANG_RENTANG_KOSONG || tinta < AMBANG_TINTA_KOSONG, tinta, hitam, putih };
}
