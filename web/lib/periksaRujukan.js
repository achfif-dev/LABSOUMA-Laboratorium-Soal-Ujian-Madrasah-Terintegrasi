// Tahap 3: apakah soal benar-benar didukung halaman kitab yang dirujuknya? Murni, gratis, tanpa AI (dipakai server; boleh dipakai klien).
// Dua pemeriksaan: (1) kutipan Arab di soal/pembahasan ada di halaman (periksaKutipan, sama dengan telaah dan gerbang persetujuan);
// (2) dukungan KUNCI: seberapa banyak kata khas jawaban benar muncul di halaman dibandingkan pengecoh.
// Pemeriksaan (2) adalah heuristik berbasis kata, bukan pemahaman makna: ia menangkap kunci yang tidak ada di sumber, atau pengecoh yang justru lebih
// cocok dengan sumber. Ia TIDAK bisa menilai negasi (benar/salah) dan parafrasa jauh, dan hasilnya selalu berupa "perlu dicek", bukan vonis.
import { normalisasi, periksaKutipan } from './kutipan.js';
import { nisbahArab } from './bahasa.js';

export const AMBANG = { didukung: 0.6, lemah: 0.3, selisih: 0.2 };
const KUNCI_OPSI = ['A', 'B', 'C', 'D', 'E'];

/** Akar kata kasar: buang awalan sambung (ال، وال، بال، لل). Cukup untuk mencocokkan kata soal dengan kata kitab. */
const akar = (w) => w.replace(/^(?:وال|بال|فال|كال|لل|ال)/, '');
export const kataIsi = (s) => normalisasi(s).split(' ').map(akar).filter((w) => w.length >= 3);

const bulat2 = (n) => Math.round(n * 100) / 100;
const cakup = (kata, sumber) => (kata.length ? kata.filter((w) => sumber.has(w)).length / kata.length : 0);

/**
 * @param {{bentuk?:string, kunci?:string, opsi?:Record<string,string>, pertanyaan?:string, stimulus?:string, pembahasan?:string, jawaban?:string, rubrik?:string}} soal
 * @param {string} teksSumber  gabungan halaman rujukan
 */
export function periksaSoalDenganTeks(soal, teksSumber) {
  const q = soal || {};
  const bentuk = q.bentuk || 'pilgan';
  // Yang diperiksa sebagai KUTIPAN hanyalah bagian yang memang wajib bersumber dari kitab: pembahasan, stimulus, dan jawaban/rubrik. Opsi (terutama pengecoh) dan
  // pertanyaan tidak wajib berupa kutipan persis; kunci dinilai terpisah lewat dukungan kata di bawah.
  const kutipan = periksaKutipan({ pembahasan: q.pembahasan, stimulus: q.stimulus, ...(q.jawaban || q.rubrik ? { jawaban: q.jawaban, rubrik: q.rubrik } : {}) }, teksSumber);
  const sumber = new Set(normalisasi(teksSumber).split(' ').map(akar).filter(Boolean));
  const arabSumber = nisbahArab(String(teksSumber || '')) >= 0.5;
  const temuan = [];
  let kunci = { status: 'tidak_dapat_dinilai', catatan: '' };

  const sepaham = (teks) => !arabSumber || nisbahArab(String(teks || '')) >= 0.5; // bahasa soal sama dengan bahasa sumber?
  if (bentuk === 'pilgan' || bentuk === 'lanjutan') {
    const opsi = KUNCI_OPSI.filter((k) => q.opsi && String(q.opsi[k] || '').trim());
    const kK = String(q.kunci || '').toUpperCase();
    if (opsi.length < 2 || !opsi.includes(kK)) kunci.catatan = 'Opsi atau kunci belum lengkap.';
    else if (!sepaham(opsi.map((k) => q.opsi[k]).join(' '))) kunci.catatan = 'Opsi ditulis dalam bahasa yang berbeda dari kitab sumber; kecocokan kata tidak bisa dinilai otomatis.';
    else {
      const set = Object.fromEntries(opsi.map((k) => [k, new Set(kataIsi(q.opsi[k]))]));
      const frek = new Map(); for (const k of opsi) for (const w of set[k]) frek.set(w, (frek.get(w) || 0) + 1);
      const dukungan = {};
      for (const k of opsi) { // kata khas = hanya muncul di opsi ini; bila tidak ada, pakai semua kata opsi
        const khas = [...set[k]].filter((w) => frek.get(w) === 1); const dasar = khas.length ? khas : [...set[k]];
        dukungan[k] = bulat2(cakup(dasar, sumber));
      }
      const lain = opsi.filter((k) => k !== kK).sort((a, b) => dukungan[b] - dukungan[a]);
      const cK = dukungan[kK]; const cD = lain.length ? dukungan[lain[0]] : 0; const pecundang = lain[0];
      let status; let catatan;
      if (cK >= AMBANG.didukung && cK - cD >= AMBANG.selisih) { status = 'didukung'; catatan = 'Kata khas kunci ditemukan di halaman rujukan, dan lebih banyak daripada pengecoh.'; }
      else if (cD >= AMBANG.didukung && cD > cK + AMBANG.selisih) { status = 'curiga_kunci'; catatan = `Opsi ${pecundang} justru lebih banyak cocok dengan halaman rujukan daripada kunci (${kK}). Periksa apakah kunci salah.`; temuan.push({ tingkat: 'kritis', teks: catatan }); }
      else if (cK >= AMBANG.lemah && cD >= AMBANG.didukung && cD >= cK - AMBANG.selisih) { status = 'ambigu'; catatan = `Opsi ${pecundang} juga banyak cocok dengan halaman rujukan; pengecoh mungkin ikut benar.`; temuan.push({ tingkat: 'saran', teks: catatan }); }
      else if (cK < AMBANG.lemah) { status = 'tidak_didukung'; catatan = 'Kata khas kunci hampir tidak ditemukan di halaman rujukan. Periksa tautan rujukan atau isi kunci.'; temuan.push({ tingkat: 'kritis', teks: catatan }); }
      else { status = 'lemah'; catatan = 'Dukungan halaman rujukan terhadap kunci lemah; bisa parafrasa, bisa salah rujukan.'; temuan.push({ tingkat: 'saran', teks: catatan }); }
      kunci = { status, kunci: kK, dukungan, catatan };
    }
  } else if (bentuk === 'isian' || bentuk === 'uraian') {
    const j = String(q.jawaban || '').trim();
    if (!j) kunci.catatan = 'Jawaban belum diisi.';
    else if (!sepaham(j)) kunci.catatan = 'Jawaban ditulis dalam bahasa yang berbeda dari kitab sumber; kecocokan kata tidak bisa dinilai otomatis.';
    else {
      const c = bulat2(cakup([...new Set(kataIsi(j))], sumber));
      const status = c >= AMBANG.didukung ? 'didukung' : c < AMBANG.lemah ? 'tidak_didukung' : 'lemah';
      const catatan = status === 'didukung' ? 'Kata-kata jawaban ditemukan di halaman rujukan.' : status === 'tidak_didukung' ? 'Kata-kata jawaban hampir tidak ditemukan di halaman rujukan.' : 'Sebagian kata jawaban ada di halaman rujukan.';
      kunci = { status, dukungan: { jawaban: c }, catatan };
      if (status === 'tidak_didukung') temuan.push({ tingkat: 'kritis', teks: catatan });
    }
  } else {
    kunci.catatan = 'Soal benar/salah tidak bisa dinilai otomatis (negasi dan makna); periksa manual atau lewat telaah AI.';
  }

  if (kutipan.status === 'gagal') temuan.push({ tingkat: 'kritis', teks: `${kutipan.ringkas.tidak_ditemukan} kutipan Arab pada soal tidak ditemukan di halaman rujukan.` });
  else if (kutipan.status === 'periksa') temuan.push({ tingkat: 'saran', teks: 'Ada kutipan yang mirip tetapi tidak persis (selisih kata atau harakat); cek manual.' });

  let status;
  if (kutipan.status === 'gagal' || ['curiga_kunci', 'tidak_didukung'].includes(kunci.status)) status = 'tidak_selaras';
  else if (kutipan.status === 'tanpa_teks') status = 'tidak_dapat_dinilai';
  else if (kutipan.status === 'periksa' || ['ambigu', 'lemah'].includes(kunci.status)) status = 'perlu_dicek';
  else if (kunci.status === 'didukung') status = 'selaras';
  else status = kutipan.ringkas.total > 0 && kutipan.status === 'lolos' ? 'perlu_dicek' : 'tidak_dapat_dinilai';
  return { status, kutipan: { status: kutipan.status, ringkas: kutipan.ringkas, detail: kutipan.detail.slice(0, 12), peringatan: kutipan.peringatan }, kunci, temuan };
}
