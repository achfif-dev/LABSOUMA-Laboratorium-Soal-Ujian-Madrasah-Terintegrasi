// Membaca halaman PDF pindai (atau berlapis teks rusak) dengan OCR AI, satu halaman per panggilan, tanpa DOM dan tanpa Node API
// (pemanggil server dan pembuat gambar dioper dari luar, jadi seluruh logika bisa diuji).
// Rancangan: hasil OCR HANYA mengganti teks halaman yang dipilih; halaman gagal tidak menggagalkan seluruh kitab (teks asalnya dibiarkan, dilaporkan).
// Kuota harian habis = berhenti total (melanjutkan hanya menumpuk galat). Batas laju (429) = tunggu lalu ulang.
export const KONKUREN_OCR = 2;
export const KONKUREN_OCR_TERATUR = 3; // dipakai bersama maksPerMenit: tiga pekerja cukup menjenuhkan 18 panggilan/menit pada halaman padat
export const MAKS_PER_MENIT_OCR = 18;   // di bawah LIMIT_OCR_PER_MINUTE bawaan server (20)
export const MAKS_HALAMAN_OCR = 1000;
const tidurNyata = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {object} o
 * @param {number[]} o.indeks  indeks halaman PDF (0-based) yang akan dibaca
 * @param {(i:number)=>Promise<{mime:string,data:string}>} o.ambilGambar  menggambar halaman ke JPEG base64
 * @param {(gambar:{mime:string,data:string})=>Promise<{teks:string, kualitas?:string, jumlahRagu?:number}>} o.panggil  satu panggilan OCR ke server
 * @param {(n:number,total:number)=>void} [o.onProgres]
 * @param {()=>boolean} [o.batal]
 * @param {{ambil:(i:number)=>Promise<{teks:string,kualitas?:string}|undefined>, simpan:(i:number, r:{teks:string,kualitas?:string})=>Promise<void>}|null} [o.simpanan]
 *   titik simpan per halaman (IndexedDB di peramban): halaman yang sudah pernah dibaca tidak dipanggil lagi, jadi tab yang mati atau kuota yang habis tidak menghanguskan hasil sebelumnya.
 *   Hanya hasil berhasil (berteks atau kosong sah) disimpan; halaman gagal tidak. Galat simpanan tidak pernah menggagalkan OCR.
 * @param {number} [o.konkuren] @param {number} [o.ulang] percobaan ulang untuk 429/AI sibuk @param {(ms:number)=>Promise<void>} [o.tidur]
 * @param {number} [o.maksPerMenit] pengatur laju: paling banyak sekian panggilan AI dimulai per menit (semua pekerja berbagi satu jadwal), 0 = mati. Isi sedikit di bawah LIMIT_OCR_PER_MINUTE
 *   server supaya konkurensi lebih tinggi tidak memicu badai 429. @param {()=>number} [o.sekarang] jam (ms), untuk uji.
 *   Gambar bertanda `kosong` (halaman tanpa tinta, lihat olahGambar.js) tidak dikirim ke AI: dicatat kosong dan dihitung di `dilewati`.
 * @returns {Promise<{teks:Map<number,string>, kualitas:Map<number,string>, dariSimpanan:number, dilewati:number, kosong:number[], gagal:{indeks:number, pesan:string}[], dibatalkan:boolean, kuotaHabis:boolean}>}
 */
export async function jalankanOcr({ indeks, ambilGambar, panggil, onProgres = () => {}, batal = () => false, konkuren = KONKUREN_OCR, ulang = 3, tidur = tidurNyata, simpanan = null, maksPerMenit = 0, sekarang = Date.now }) {
  const antre = [...new Set(indeks)].sort((a, b) => a - b).slice(0, MAKS_HALAMAN_OCR);
  const hasil = { teks: new Map(), kualitas: new Map(), dariSimpanan: 0, dilewati: 0, kosong: [], gagal: [], dibatalkan: false, kuotaHabis: false };
  let ptr = 0; let selesai = 0; let berhenti = false;
  const total = antre.length;
  const dariSimpanan = async (i) => { try { return simpanan ? await simpanan.ambil(i) : undefined; } catch { return undefined; } };
  const kePenyimpanan = async (i, r) => { try { if (simpanan) await simpanan.simpan(i, r); } catch { /* simpanan penuh atau tidak tersedia: OCR tetap jalan */ } };
  // Pengatur laju: setiap pekerja memesan "slot mulai" secara sinkron (tanpa await di antara baca dan tulis), jadi pekerja serentak mendapat slot berbeda.
  const jeda = maksPerMenit > 0 ? Math.ceil(60000 / maksPerMenit) : 0; let slotBerikut = 0;
  const tungguSlot = async () => { if (!jeda) return; const t = sekarang(); const mulai = Math.max(t, slotBerikut); slotBerikut = mulai + jeda; if (mulai > t) await tidur(mulai - t); };
  const kerjakan = async (i) => {
    const lama = await dariSimpanan(i);
    if (lama && typeof lama.teks === 'string') { // sudah pernah dibaca: pakai hasilnya, tanpa gambar dan tanpa panggilan AI
      hasil.dariSimpanan++;
      const t = lama.teks.trim();
      if (t) { hasil.teks.set(i, t); hasil.kualitas.set(i, lama.kualitas || 'sedang'); } else hasil.kosong.push(i);
      return;
    }
    for (let percobaan = 0; ; percobaan++) {
      try {
        const gbr = await ambilGambar(i);
        if (gbr && gbr.kosong === true) { hasil.dilewati++; hasil.kosong.push(i); return; } // halaman tanpa tinta: tak perlu panggilan AI. SENGAJA tidak disimpan ke simpanan: menghitung ulang murah (lokal), dan salah deteksi tidak boleh menempel
        await tungguSlot(); if (batal()) { hasil.dibatalkan = true; return; }
        const r = await panggil(gbr);
        const t = String((r && r.teks) || '').trim();
        if (t) { hasil.teks.set(i, t); hasil.kualitas.set(i, (r && r.kualitas) || 'sedang'); await kePenyimpanan(i, { teks: t, kualitas: (r && r.kualitas) || 'sedang' }); } else { hasil.kosong.push(i); await kePenyimpanan(i, { teks: '' }); }
        return;
      } catch (e) {
        const kode = e && e.code;
        if (kode === 'TEKS_TIDAK_MEMADAI') { hasil.kosong.push(i); await kePenyimpanan(i, { teks: '' }); return; } // halaman tanpa teks Arab terbaca (kosong, gambar): bukan kegagalan
        if (kode === 'RATE_LIMIT_DAILY') { hasil.kuotaHabis = true; berhenti = true; hasil.gagal.push({ indeks: i, pesan: (e && e.message) || 'Kuota OCR harian habis.' }); return; }
        const bisaUlang = (e && e.status === 429) || kode === 'AI_OVERLOADED' || kode === 'AI_TIMEOUT' || (e && e.status >= 500);
        if (bisaUlang && percobaan < ulang && !batal()) { await tidur(Math.max(3, Math.min(90, Number(e && e.retryAfter) || 8 * (percobaan + 1))) * 1000); if (batal()) { hasil.dibatalkan = true; return; } continue; }
        hasil.gagal.push({ indeks: i, pesan: (e && e.message) || 'OCR gagal.' }); return;
      }
    }
  };
  const pekerja = async () => {
    while (!berhenti) {
      if (batal()) { hasil.dibatalkan = true; return; }
      const i = antre[ptr++]; if (i === undefined) return;
      await kerjakan(i);
      selesai++; onProgres(selesai, total);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(4, konkuren)) }, pekerja));
  if (batal()) hasil.dibatalkan = true;
  hasil.kosong.sort((a, b) => a - b); hasil.gagal.sort((a, b) => a.indeks - b.indeks);
  return hasil;
}
