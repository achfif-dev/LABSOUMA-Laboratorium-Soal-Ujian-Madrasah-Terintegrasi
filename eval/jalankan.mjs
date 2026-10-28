// Menjalankan SATU kasus emas melalui jalur yang sama dengan aplikasi (generateSoal, cekButa, telaahSoal), lalu menilainya.
// Dipisah dari run.mjs agar bisa diuji dengan klien AI palsu (test/eval.test.js) tanpa kunci API.
import { ApiError, generateSoal } from '../src/soalService.js';
import { telaahSoal } from '../src/assistService.js';
import { cekButa, keBentukApp } from '../src/cekButa.js';
import { BENTUK, bentukDari } from '../src/bentuk.js';
import { nilaiGenerate, nilaiTelaah, nilaiTolak, KODE_GALAT_INFRA, KODE_GALAT_FATAL } from './lib.mjs';

const dapatDiulang = (e) => e instanceof ApiError && ['RATE_LIMIT', 'AI_OVERLOADED', 'AI_TIMEOUT'].includes(e.code);
const tidurAsli = (ms) => new Promise((r) => setTimeout(r, ms));

/** Ulangi `fn` bila penyedia membatasi laju atau sedang sibuk (kuota gratis ketat). Menunggu sesuai Retry-After, maksimal 60 detik. */
export async function denganUlang(fn, { maks = 3, tidur = tidurAsli, log = () => {} } = {}) {
  for (let i = 1; ; i++) {
    try { return await fn(); } catch (e) {
      if (!dapatDiulang(e) || i >= maks) throw e;
      const detik = Math.min(60, e.retryAfter || 15 * i);
      log(`  ${e.code}: menunggu ${detik} detik lalu mengulang (${i}/${maks - 1})`);
      await tidur(detik * 1000);
    }
  }
}

/**
 * @param {object} kasus  satu entri `kasus` dari golden.json
 * @param {{client?:any, tidur?:Function, log?:Function}} [deps]  client: klien AI (bawaan: penyedia aktif lewat environment)
 * @returns {Promise<{status:'lulus'|'gagal'|'galat', lulus:boolean, cek:object, catatan:string[], fatal?:boolean, keluaran?:object}>}
 */
export async function jalankanKasus(kasus, { client, tidur, log } = {}) {
  const jenis = kasus.jenis || 'generate';
  const bentuk = bentukDari(kasus.bentuk);
  const ulang = (fn) => denganUlang(fn, { tidur, log });
  const deps = client ? { client } : {};
  const tandai = (n, keluaran) => ({ status: n.lulus ? 'lulus' : 'gagal', ...n, ...(keluaran ? { keluaran } : {}) });
  try {
    if (jenis === 'telaah') {
      const hasil = await ulang(() => telaahSoal(kasus, deps));
      const h = kasus.harapan || {};
      let buta;
      if (h.perbaikan_diuji_buta && BENTUK[bentuk].opsi.length) {
        buta = await ulang(() => cekButa(keBentukApp(hasil.perbaikan), kasus.teks, { client, tingkat: kasus.tingkat, bentuk }));
      }
      return tandai(nilaiTelaah(kasus, hasil, { buta }), { verdict: hasil.verdict, temuan: hasil.temuan, perbaikan: hasil.perbaikan });
    }
    if (jenis === 'tolak') {
      let galat = null; let soal = null;
      try { soal = await ulang(() => generateSoal(kasus, deps)); } catch (e) {
        if (e instanceof ApiError && !KODE_GALAT_INFRA.includes(e.code)) galat = e; // penolakan atau keluaran cacat = hasil yang dinilai
        else throw e;
      }
      return tandai(nilaiTolak(kasus, galat), soal || undefined);
    }
    const soal = await ulang(() => generateSoal(kasus, deps));
    // Uji jawab buta persis seperti di aplikasi; isian dan uraian tidak punya opsi sehingga tidak diuji.
    const buta = BENTUK[bentuk].opsi.length
      ? await ulang(() => cekButa(keBentukApp(soal), kasus.teks, { client, tingkat: kasus.tingkat, bentuk }))
      : null;
    return tandai(nilaiGenerate(kasus, { soal, buta }), soal);
  } catch (e) {
    const kode = e && (e.code || e.name);
    // Galat infrastruktur (kuota, jaringan, kunci) bukan penilaian atas model: dicatat terpisah dari "gagal".
    if (e instanceof ApiError && KODE_GALAT_INFRA.includes(e.code)) {
      return { status: 'galat', lulus: false, cek: {}, catatan: [`${kode}: ${String(e.message).slice(0, 120)}`], fatal: KODE_GALAT_FATAL.includes(e.code) };
    }
    // Keluaran model cacat (AI_BAD_OUTPUT), teks ditolak AI padahal diharapkan jadi soal (TEKS_TIDAK_MEMADAI), dan sejenisnya = gagal.
    return { status: 'gagal', lulus: false, cek: {}, catatan: [`galat: ${kode}: ${String(e && e.message).slice(0, 140)}`] };
  }
}
