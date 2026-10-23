// Cadangan soal ke Google Drive: sisi server.
//
// Pembacaan soal dan unggahan ke Drive dilakukan di BROWSER (web/lib/drive.js): respons/permintaan fungsi Vercel dibatasi
// sekitar 4,5 MB, dan token Drive tidak perlu lewat server. Server hanya dibutuhkan untuk PEMULIHAN, karena aturan
// Firestore melarang klien membuat soal atas nama penyusun lain; Admin SDK tidak terikat aturan itu, jadi setiap entri
// di sini divalidasi ketat (cermin validContent() di firestore.rules) sebelum ditulis.
import { ApiError } from './soalService.js';
import { firestoreAdmin } from './platform.js';
import { BENTUK_IDS } from './bentuk.js';

export const MAKS_PER_PEMULIHAN = 100;
export const NAMA_FOLDER = 'LABSOUMA Backup';
const STATUS = ['draft', 'pending', 'approved', 'revision'];
const LEVEL = ['L1', 'L2', 'L3'];
const KUNCI = ['', 'A', 'B', 'C', 'D', 'E'];
const VERIFIKASI = ['', 'lolos', 'periksa', 'gagal', 'tanpa_teks'];
const BUTA = ['', 'sepakat', 'beda'];
// ID berbentuk __x__ dicadangkan Firestore (ditolak saat tulis dan menggagalkan seluruh batch), jadi ditolak sejak awal.
const ID_OK = /^(?!__.*__$)[A-Za-z0-9_-]{1,100}$/;
const bad = (m) => new ApiError(422, 'BACKUP_INVALID', m);

const teks = (v, max, nama) => {
  const t = v === undefined || v === null ? '' : v;
  if (typeof t !== 'string') throw bad(`${nama} harus berupa teks.`);
  if (t.length > max) throw bad(`${nama} terlalu panjang (maks. ${max} karakter).`);
  return t;
};
const waktu = (v, nama, { opsional = false } = {}) => {
  if ((v === undefined || v === null || v === '') && opsional) return undefined;
  if (typeof v !== 'string') throw bad(`${nama} bukan tanggal yang valid.`);
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw bad(`${nama} bukan tanggal yang valid.`);
  return d;
};

/** Cermin validContent() di firestore.rules. Mengembalikan { id, data } yang aman ditulis lewat Admin SDK; melempar 422 bila tidak sah. */
export function bersihkanSoal(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw bad('Entri soal tidak valid.');
  const id = typeof raw.id === 'string' ? raw.id : '';
  if (!ID_OK.test(id)) throw bad('ID soal tidak valid.');
  const tingkat = teks(raw.tingkat, 40, 'Tingkat');
  if (!tingkat) throw bad('Tingkat soal kosong.');
  if (!LEVEL.includes(raw.level)) throw bad('Level harus L1, L2, atau L3.');
  if (!STATUS.includes(raw.status)) throw bad('Status soal tidak dikenal.');
  const kunci = raw.kunci === undefined || raw.kunci === null ? '' : raw.kunci;
  if (!KUNCI.includes(kunci)) throw bad('Kunci jawaban harus A sampai E atau kosong.');
  const sumberUrl = teks(raw.sumberUrl, 500, 'Tautan sumber');
  if (sumberUrl && !/^https:\/\//.test(sumberUrl)) throw bad('Tautan sumber harus diawali https://.');

  const so = raw.opsi === undefined || raw.opsi === null ? {} : raw.opsi;
  if (typeof so !== 'object' || Array.isArray(so)) throw bad('Opsi jawaban tidak valid.');
  const opsi = {};
  for (const k of ['A', 'B', 'C', 'D', 'E']) opsi[k] = teks(so[k], 1000, `Opsi ${k}`);

  const sa = raw.ai === undefined || raw.ai === null ? {} : raw.ai;
  if (typeof sa !== 'object' || Array.isArray(sa)) throw bad('Jejak AI tidak valid.');
  const verifikasi = sa.verifikasi === undefined ? '' : sa.verifikasi;
  const buta = sa.buta === undefined ? '' : sa.buta;
  if (!VERIFIKASI.includes(verifikasi) || !BUTA.includes(buta)) throw bad('Jejak AI memuat nilai yang tidak dikenal.');
  const ai = { dibuat: sa.dibuat === true, model: teks(sa.model, 60, 'Model AI'), verifikasi, buta };

  // Opsional (soal lama tidak punya): kelas, kode periode ujian, dan bab kitab. Hanya ditulis bila terisi, supaya soal lama tetap sama persis.
  const kelas = teks(raw.kelas, 20, 'Kelas'); const periode = teks(raw.periode, 20, 'Periode ujian'); const bab = teks(raw.bab, 120, 'Bab');
  const authorUid = teks(raw.authorUid, 128, 'ID penyusun');
  if (!authorUid) throw bad('ID penyusun kosong.');
  const data = {
    tingkat, mapel: teks(raw.mapel, 60, 'Mapel'), level: raw.level,
    nama: teks(raw.nama, 120, 'Nama kitab'), juz: teks(raw.juz, 20, 'Juz'), hal: teks(raw.hal, 20, 'Halaman'),
    teks: teks(raw.teks, 8000, 'Teks kitab'), stimulus: teks(raw.stimulus, 3000, 'Stimulus'),
    pertanyaan: teks(raw.pertanyaan, 2000, 'Pertanyaan'), indikator: teks(raw.indikator, 1000, 'Indikator'),
    pembahasan: teks(raw.pembahasan, 4000, 'Pembahasan'), sumberUrl, opsi, kunci, ai,
    status: raw.status, catatan: teks(raw.catatan, 1000, 'Catatan'),
    authorUid, authorName: teks(raw.authorName, 120, 'Nama penyusun'),
    createdAt: waktu(raw.createdAt, 'Tanggal dibuat'), updatedAt: waktu(raw.updatedAt, 'Tanggal diubah'),
  };
  if (kelas) data.kelas = kelas;
  if (periode) data.periode = periode;
  if (bab) data.bab = bab;
  // Bentuk soal (opsional; tanpa bentuk = pilihan ganda). Hanya ditulis bila bukan pilihan ganda, supaya soal lama tetap sama persis.
  const bentuk = raw.bentuk === undefined || raw.bentuk === null || raw.bentuk === '' ? 'pilgan' : raw.bentuk;
  if (!BENTUK_IDS.includes(bentuk)) throw bad('Bentuk soal tidak dikenal.');
  if (bentuk !== 'pilgan') data.bentuk = bentuk;
  const jawaban = teks(raw.jawaban, 2000, 'Jawaban'); const rubrik = teks(raw.rubrik, 2000, 'Pedoman penskoran');
  if (jawaban) data.jawaban = jawaban;
  if (rubrik) data.rubrik = rubrik;
  const reviewerUid = teks(raw.reviewerUid, 128, 'ID peninjau');
  if (reviewerUid) {
    data.reviewerUid = reviewerUid;
    data.reviewerName = teks(raw.reviewerName, 120, 'Nama peninjau');
    const r = waktu(raw.reviewedAt, 'Tanggal ditinjau', { opsional: true });
    if (r) data.reviewedAt = r;
  }
  return { id, data };
}

/** Pemulihan soal dari cadangan (admin). mode "lewati": soal yang id-nya sudah ada tidak disentuh; "timpa": diganti isi cadangan. */
export async function pulihkanSoal(_user, body) {
  const mode = body && body.mode === 'timpa' ? 'timpa' : 'lewati';
  const daftar = body && Array.isArray(body.soal) ? body.soal : null;
  if (!daftar || !daftar.length) throw bad('Tidak ada soal untuk dipulihkan.');
  if (daftar.length > MAKS_PER_PEMULIHAN) throw bad(`Maksimal ${MAKS_PER_PEMULIHAN} soal per permintaan.`);

  const ok = []; const ditolak = []; const lihat = new Set();
  for (const raw of daftar) {
    try {
      const s = bersihkanSoal(raw);
      if (lihat.has(s.id)) throw bad('ID muncul dua kali dalam satu permintaan.');
      lihat.add(s.id); ok.push(s);
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      ditolak.push({ id: String((raw && raw.id) || '?').slice(0, 100), alasan: e.message });
    }
  }
  let ditulis = 0; let dilewati = 0;
  if (ok.length) {
    const { db } = await firestoreAdmin();
    const refs = ok.map((s) => db.collection('soal').doc(s.id));
    const ada = await db.getAll(...refs);
    const batch = db.batch();
    ok.forEach((s, i) => {
      if (ada[i].exists && mode === 'lewati') { dilewati++; return; }
      batch.set(refs[i], s.data); ditulis++;
    });
    if (ditulis) await batch.commit();
  }
  return { ditulis, dilewati, ditolak };
}

/** Client ID OAuth untuk Google Drive bukan rahasia (dipakai di browser), tetapi diatur lewat environment variable. */
export function infoBackup() {
  return { driveClientId: String(process.env.GOOGLE_DRIVE_CLIENT_ID || '').trim(), folder: NAMA_FOLDER, maksPemulihan: MAKS_PER_PEMULIHAN };
}
