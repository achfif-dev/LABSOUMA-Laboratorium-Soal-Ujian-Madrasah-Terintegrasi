// Penghubung antarmuka dengan pipeline soal (src/faktaService.js, web/lib/rencanaSoal.js). Fungsi murni, tanpa jaringan dan tanpa DOM.
import { rencanaKisi, skorCocok } from './rencanaSoal.js';

/** Fakta hasil ekstrak -> bentuk yang dikirim ke /api/generate sebagai `faktaTerikat` (hanya yang dibutuhkan server). */
export function faktaTerikatDari(f) {
  if (!f || typeof f !== 'object') return null;
  return { fakta: String(f.fakta || ''), kutipan: String(f.kutipan || ''), pengecoh: Array.isArray(f.pengecoh) ? f.pengecoh.map(String) : [] };
}

/** Peringatan bila level yang dipilih pengguna berbeda dari level yang paling cocok untuk fakta itu; '' bila sama. Tidak mengubah pilihan pengguna. */
export function peringatanLevel(f, level) {
  if (!f || !level || !f.tingkat_cocok || f.tingkat_cocok === level) return '';
  return skorCocok(f, level) >= 10 ? `Fakta ini lebih cocok untuk ${f.tingkat_cocok}; soal ${level} darinya bisa terasa dangkal atau dipaksakan.` : '';
}

/**
 * Pilih fakta berikutnya yang BELUM dipakai untuk satu soal (bentuk, level), memakai kisi-kisi oleh kode.
 * @returns {{fakta: object|null, habis: boolean}} habis=true bila semua fakta sudah dipakai (lalu dipilih yang paling cocok, ditandai).
 */
export function pilihFaktaBerikut(daftar, terpakai, { bentuk, level }, rand = Math.random) {
  if (!Array.isArray(daftar) || !daftar.length) return { fakta: null, habis: false };
  const pakai = new Set(terpakai || []);
  const sisa = daftar.filter((f) => !pakai.has(f.id));
  const habis = sisa.length === 0;
  const { rencana } = rencanaKisi(habis ? daftar : sisa, [{ bentuk, level }], rand);
  const id = rencana[0] && rencana[0].faktaId;
  return { fakta: (habis ? daftar : sisa).find((f) => f.id === id) || null, habis };
}

/** Teks berubah sejak fakta diekstrak: kutipan dasar bisa tidak berlaku lagi (server memeriksa ulang dan menolak). */
export const faktaBasi = (state, teksSekarang) => !!(state && state.data && state.teks !== teksSekarang);

const URUT_LEVEL = { L1: 1, L2: 2, L3: 3 };

/**
 * Kutipan dasar fakta masih sah di teks segmen (persis, tanpa selisih, tanpa negasi terpotong).
 * `periksa` = periksaKutipan; bila tidak tersedia di browser, dianggap sah (server tetap memeriksa ulang dan menolak yang tidak sah).
 */
export function faktaSahDi(f, teks, periksa) {
  if (!f || !f.kutipan) return false;
  if (typeof periksa !== 'function') return true;
  const r = periksa({ kutipan: f.kutipan }, teks).ringkas;
  return r.total >= 1 && r.tidak_ditemukan === 0 && r.mirip === 0;
}

/**
 * Bagikan fakta ke butir-butir satu panggilan paket: tiap fakta dipakai sekali, yang belum terpakai lebih dulu, dipilih menurut
 * kecocokan level. Butir yang tidak kebagian fakta (fakta segmen itu habis) TIDAK dipaksa memakai fakta kembar: ia dibuat tanpa fakta
 * (alur lama) dan dihitung di `tanpaFakta`, supaya paket tidak berisi butir yang menguji hal yang sama.
 * @returns {{pilihan: (object|null)[], tanpaFakta: number}} pilihan sejajar dengan `spek`.
 */
export function susunSpekFakta(spek, daftar, terpakai, rand = Math.random) {
  const pakai = new Set(terpakai || []);
  const pilihan = new Array((spek || []).length).fill(null);
  let tanpaFakta = 0;
  // Level tertinggi dipilihkan dulu agar fakta yang cocok untuk L3 tidak habis oleh butir L1 (sama dengan rencanaKisi).
  const urutan = pilihan.map((_, i) => i).sort((a, b) => (URUT_LEVEL[spek[b].level] || 1) - (URUT_LEVEL[spek[a].level] || 1) || a - b);
  for (const i of urutan) {
    const { fakta, habis } = pilihFaktaBerikut(daftar, [...pakai], { bentuk: spek[i].bentuk, level: spek[i].level }, rand);
    if (!fakta || habis) { tanpaFakta++; continue; }
    pilihan[i] = fakta; pakai.add(fakta.id);
  }
  return { pilihan, tanpaFakta };
}

/**
 * Siapkan butir satu panggilan paket untuk mode fakta: bagikan fakta (yang belum dipakai di segmen ini) lalu susun `spek` yang dikirim ke server.
 * @param {{bentuk:string, level:string}[]} spek  butir pada tugas ini
 * @param {object[]} daftar  fakta sah segmen ini
 * @param {{faktaKutipan?:string}[]} butirSegmen  butir yang SUDAH jadi di segmen yang sama; fakta yang kutipannya sudah dipakai tidak dibagikan lagi (tahan muat ulang)
 * @returns {{spekKirim: object[], pilihan: (object|null)[], tanpaFakta: number}}
 */
export function spekDenganFakta(spek, daftar, butirSegmen, rand = Math.random) {
  const dipakai = new Set((butirSegmen || []).map((x) => x && x.faktaKutipan).filter(Boolean));
  const sp = susunSpekFakta(spek, daftar || [], (daftar || []).filter((f) => dipakai.has(f.kutipan)).map((f) => f.id), rand);
  const spekKirim = spek.map((s, i) => ({ bentuk: s.bentuk, level: s.level, ...(sp.pilihan[i] ? { faktaTerikat: faktaTerikatDari(sp.pilihan[i]) } : {}) }));
  return { spekKirim, pilihan: sp.pilihan, tanpaFakta: sp.tanpaFakta };
}

/** Bidang tambahan pada butir hasil paket bila butir itu terikat fakta; {} bila tidak. */
export function jejakFaktaButir(butir, pilihan) {
  const f = butir && pilihan && pilihan[butir.indeks];
  return butir && butir.faktaDasar && f ? { faktaDasar: butir.faktaDasar, faktaKutipan: f.kutipan, alasanPengecoh: butir.alasanPengecoh || '' } : {};
}

export const MAKS_DASAR = 2000; // sama dengan batas kolom `dasar` di firestore.rules

/**
 * Teks kolom `dasar` pada soal: fakta yang diuji dan alasan tiap pengecoh salah. Untuk pembaca (penyusun, editor); TIDAK ikut ke naskah ujian.
 * '' bila tidak ada fakta. Dipotong ke batas aturan Firestore.
 */
export function susunDasar({ fakta, alasan } = {}) {
  const f = String(fakta || '').replace(/\s+/g, ' ').trim();
  if (!f) return '';
  const a = String(alasan || '').trim();
  const teks = `Fakta yang diuji: ${f}${a ? `\nMengapa pengecoh salah: ${a}` : ''}`;
  return teks.length > MAKS_DASAR ? teks.slice(0, MAKS_DASAR - 1) + '…' : teks;
}
