// Penilaian murni (tanpa jaringan) untuk evaluasi mutu AI. Dipakai eval/run.mjs dan diuji di test/eval.test.js.
import { periksaKutipan, bidangDariAI } from '../src/kutipan.js';
import { periksaSikap } from '../src/sikap.js';

const OPSI = ['pilihan_a', 'pilihan_b', 'pilihan_c', 'pilihan_d', 'pilihan_e'];
const SEMUA = /semua (jawaban )?(di atas )?(benar|salah)|tidak ada (jawaban|opsi) (yang )?benar|jawaban (a|b|c|d) dan (a|b|c|d|e) benar/i;

/** @returns {{lulus:boolean, cek:Record<string,boolean>, catatan:string[]}} */
export function nilaiGenerate(kasus, { soal, buta }) {
  const cek = {};
  const catatan = [];
  const kunciTeks = String(soal[`pilihan_${String(soal.kunci_jawaban).toLowerCase()}`] || '').toLowerCase();

  const kut = periksaKutipan(bidangDariAI(soal), kasus.teks);
  cek.kutipan_tidak_gagal = kut.status !== 'gagal';
  if (!cek.kutipan_tidak_gagal) catatan.push(`kutipan tidak ditemukan: ${kut.detail.filter((d) => d.status === 'tidak_ditemukan').map((d) => d.label).join(', ')}`);

  cek.sikap_aman = periksaSikap(bidangDariAI(soal)).status === 'aman';
  cek.uji_buta_sepakat = !!buta && buta.status === 'sepakat';
  if (!cek.uji_buta_sepakat) catatan.push(`uji buta: ${buta ? buta.status : 'tidak ada'}`);
  cek.tanpa_semua_benar_salah = !OPSI.some((k) => SEMUA.test(soal[k] || ''));

  const panjang = OPSI.map((k) => String(soal[k] || '').length);
  cek.opsi_seimbang = Math.max(...panjang) / Math.max(1, Math.min(...panjang)) <= 3.5;

  if (kasus.kunci_harus_memuat && kasus.kunci_harus_memuat.length) {
    cek.kunci_sesuai_harapan = kasus.kunci_harus_memuat.every((x) => kunciTeks.includes(String(x).toLowerCase()));
    if (!cek.kunci_sesuai_harapan) catatan.push(`opsi kunci "${kunciTeks}" tidak memuat ${kasus.kunci_harus_memuat.join(', ')}`);
  }
  return { lulus: Object.values(cek).every(Boolean), cek, catatan };
}

/** Kasus telaah memakai soal yang SENGAJA cacat: telaah yang baik tidak boleh menyatakannya layak. */
export function nilaiTelaah(kasus, hasil) {
  const cek = {};
  const catatan = [];
  cek.tidak_dinyatakan_layak = hasil.verdict !== 'layak';
  const aspek = kasus.harapan && kasus.harapan.temuan_kritis_aspek;
  if (aspek) {
    cek.temuan_kritis_ditemukan = (hasil.temuan || []).some((t) => t.tingkat === 'kritis' && t.aspek === aspek);
    if (!cek.temuan_kritis_ditemukan) catatan.push(`tidak ada temuan kritis pada aspek ${aspek}`);
  }
  const benar = kasus.harapan && kasus.harapan.kunci_benar_memuat;
  if (benar) {
    const p = hasil.perbaikan || {};
    const kt = String(p[`pilihan_${String(p.kunci_jawaban).toLowerCase()}`] || '').toLowerCase();
    cek.perbaikan_benar = kt.includes(String(benar).toLowerCase());
    if (!cek.perbaikan_benar) catatan.push(`kunci perbaikan "${kt}" tidak memuat "${benar}"`);
  }
  return { lulus: Object.values(cek).every(Boolean), cek, catatan };
}
