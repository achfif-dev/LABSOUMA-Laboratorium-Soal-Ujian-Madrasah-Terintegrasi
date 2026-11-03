// Tahap 3: periksa satu soal terhadap halaman rujukan di perpustakaan (aksi `periksarujukan` di /api/assist). Gratis: tanpa AI dan tanpa kuota AI.
import { ApiError } from './soalService.js';
import { firestoreAdmin } from './platform.js';
import { koleksiHalaman } from './kitabImpor.js';
import { bersihkanRujukan, rentangRujukan, idHalaman, MAKS_HALAMAN_RUJUKAN } from './rujukan.js';
import { bentukSah } from './bentuk.js';
import { periksaSoalDenganTeks } from '../web/lib/periksaRujukan.js';
import { normalOtoritas, peringatanOtoritas, bolehJadiDasar, LABEL_STATUS } from './otoritas.js';

const teks = (v, maks = 4000) => String(v == null ? '' : v).slice(0, maks);

/** Soal dari klien -> bentuk bersih. Menolak yang bukan objek; rujukan yang tidak sah = 422 (bukan memeriksa sebagian). */
export function validasiPeriksa(body) {
  const s = body && typeof body.soal === 'object' && body.soal ? body.soal : null;
  if (!s) throw new ApiError(400, 'BAD_REQUEST', 'Soal harus berupa objek.');
  const rj = bersihkanRujukan(s);
  if (!rj.kitabId) throw new ApiError(422, 'RUJUKAN_KOSONG', 'Soal belum tertaut ke halaman kitab di perpustakaan. Pilih teks dari Pustaka Kitab, atau tempel teks dan pakai Telaah AI.');
  const opsi = {}; for (const k of ['A', 'B', 'C', 'D', 'E']) opsi[k] = teks(s.opsi && s.opsi[k], 1500);
  return {
    rujukan: rj,
    soal: { bentuk: bentukSah(s.bentuk) || 'pilgan', kunci: teks(s.kunci, 2), opsi, pertanyaan: teks(s.pertanyaan), stimulus: teks(s.stimulus), pembahasan: teks(s.pembahasan), jawaban: teks(s.jawaban), rubrik: teks(s.rubrik) },
  };
}

export async function periksaRujukan(body, deps = {}) {
  const v = validasiPeriksa(body);
  const { db } = deps.db ? { db: deps.db } : await firestoreAdmin();
  const meta = await db.doc(`kitab/${v.rujukan.kitabId}`).get();
  if (!meta.exists || meta.data().aktif !== true || meta.data().status !== 'siap') throw new ApiError(404, 'KITAB_TIDAK_ADA', 'Kitab rujukan tidak ditemukan atau belum diaktifkan admin.');
  const m = meta.data();
  const r = rentangRujukan(v.rujukan);
  const sampai = Math.min(r.sampai, m.jumlahHalaman);
  if (r.dari > m.jumlahHalaman) throw new ApiError(422, 'RUJUKAN_INVALID', 'Halaman rujukan melebihi jumlah halaman kitab. Kitab mungkin sudah diimpor ulang; pilih ulang teks dari Pustaka Kitab.');
  if (sampai - r.dari + 1 > MAKS_HALAMAN_RUJUKAN) throw new ApiError(422, 'RUJUKAN_INVALID', `Rujukan lebih dari ${MAKS_HALAMAN_RUJUKAN} halaman; persempit rentangnya.`);
  const ids = []; for (let s = r.dari; s <= sampai; s++) ids.push(idHalaman(s));
  const snaps = await Promise.all(ids.map((id) => db.doc(`${koleksiHalaman(v.rujukan.kitabId, m)}/${id}`).get()));
  const halaman = snaps.filter((x) => x.exists).map((x) => x.data()).sort((a, b) => a.seq - b.seq);
  if (!halaman.length) throw new ApiError(404, 'HALAMAN_TIDAK_ADA', 'Halaman rujukan tidak ditemukan di perpustakaan.');
  const hasil = periksaSoalDenganTeks(v.soal, halaman.map((p) => p.teks).join('\n'));
  // Konteks dari data perpustakaan (bukan tebakan): status otoritas kitab menurut admin, dan halaman OCR yang belum dicocokkan dengan kitab asli.
  const st = normalOtoritas(m.otoritas).status; const peringatan = peringatanOtoritas(m);
  const ocrBelum = halaman.filter((p) => p.ocr === true && !p.diverifikasi).length;
  const temuan = [...hasil.temuan];
  if (peringatan) temuan.push({ tingkat: 'saran', teks: peringatan });
  let status = hasil.status;
  if (ocrBelum) {
    temuan.push({ tingkat: 'saran', teks: `${ocrBelum} halaman rujukan adalah hasil OCR yang belum dicocokkan dengan kitab asli; kecocokan di sini hanya terhadap teks perpustakaan.` });
    if (status === 'selaras') status = 'perlu_dicek'; // selaras dengan teks yang mungkin keliru belum cukup
  }
  return { ...hasil, status, temuan, otoritas: { status: st, label: LABEL_STATUS[st], dasarMadrasah: bolehJadiDasar(m) }, ocrBelumDicocokkan: ocrBelum,
    sumber: { kitabId: v.rujukan.kitabId, judul: m.judulLatin || m.judul || v.rujukan.kitabId, dari: r.dari, sampai, halaman: halaman.map((p) => ({ seq: p.seq, juz: p.juz, hal: p.hal })) } };
}
