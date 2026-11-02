// Membaca halaman PDF pindai (atau berlapis teks rusak) dengan OCR AI, satu halaman per panggilan, tanpa DOM dan tanpa Node API
// (pemanggil server dan pembuat gambar dioper dari luar, jadi seluruh logika bisa diuji).
// Rancangan: hasil OCR HANYA mengganti teks halaman yang dipilih; halaman gagal tidak menggagalkan seluruh kitab (teks asalnya dibiarkan, dilaporkan).
// Kuota harian habis = berhenti total (melanjutkan hanya menumpuk galat). Batas laju (429) = tunggu lalu ulang.
export const KONKUREN_OCR = 2;
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
 * @returns {Promise<{teks:Map<number,string>, kualitas:Map<number,string>, dariSimpanan:number, kosong:number[], gagal:{indeks:number, pesan:string}[], dibatalkan:boolean, kuotaHabis:boolean}>}
 */
export async function jalankanOcr({ indeks, ambilGambar, panggil, onProgres = () => {}, batal = () => false, konkuren = KONKUREN_OCR, ulang = 3, tidur = tidurNyata, simpanan = null }) {
  const antre = [...new Set(indeks)].sort((a, b) => a - b).slice(0, MAKS_HALAMAN_OCR);
  const hasil = { teks: new Map(), kualitas: new Map(), dariSimpanan: 0, kosong: [], gagal: [], dibatalkan: false, kuotaHabis: false };
  let ptr = 0; let selesai = 0; let berhenti = false;
  const total = antre.length;
  const dariSimpanan = async (i) => { try { return simpanan ? await simpanan.ambil(i) : undefined; } catch { return undefined; } };
  const kePenyimpanan = async (i, r) => { try { if (simpanan) await simpanan.simpan(i, r); } catch { /* simpanan penuh atau tidak tersedia: OCR tetap jalan */ } };
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
        const r = await panggil(await ambilGambar(i));
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
