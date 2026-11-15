// Batas ujian (cakupan materi) yang TERHUBUNG ke perpustakaan kitab. Logika murni: tanpa React, tanpa jaringan, tanpa Firestore.
// Dipakai server (src/appConfig.js), menu Konfigurasi, Susun Soal, dan Paket Dauri.
//
// Dulu cakupan hanya teks bebas (\"Bab wudhu sampai tayammum\"): AI menebak sendiri bagian mana yang masuk, dan penyusun harus mencari
// halamannya sendiri di perpustakaan. Sekarang satu penempatan kitab (kitab x kelas x ujian) boleh membawa `batas` terstruktur:
//
//   kitab.kitabId                     = (opsional) id kitab di perpustakaan; kosong = dicocokkan otomatis menurut nama, atau manual
//   penempatan[].periode[].batas      = { awal: { seq, judul? }, akhir: { seq, judul? } }
//
//   - Jangkar BERJUDUL (judul diisi): `seq` = urutan halaman awal bab itu saat disimpan. Posisi sebenarnya dicari ulang dari daftar isi
//     perpustakaan SETIAP kali dipakai (cocokkan judul), jadi bila daftar isi dikoreksi atau kitab diimpor ulang, batas ikut bergeser sendiri.
//     Jangkar akhir berjudul berarti \"sampai akhir bab itu\".
//   - Jangkar TANPA judul: `seq` = urutan halaman apa adanya (untuk kitab yang belum punya daftar isi).
//
// Kitab yang belum ada di perpustakaan tetap jalan seperti sebelumnya: cakupan teks bebas + teks ditempel manual.
import { samaKitab, kunciBab } from './kitabNama.js';
import { rentangBab } from './perpus.js';
import { RE_KITAB_ID, seqDariHalId } from './rujukan.js';

export const SEQ_MAKS = 99999;
export const JUDUL_MAKS = 120;
export const CAKUPAN_MAKS = 120; // sama dengan BATAS_UJIAN.cakupan dan aturan Firestore soal.cakupan

const rapi = (v, max) => String(v ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const seqSah = (v) => Number.isInteger(v) && v >= 1 && v <= SEQ_MAKS;
const arr = (v) => (Array.isArray(v) ? v : []);

/** Satu jangkar -> { seq, judul? } atau null bila tidak sah. */
function bersihJangkar(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const seq = Number(raw.seq);
  if (!seqSah(seq)) return null;
  const judul = rapi(raw.judul, JUDUL_MAKS);
  return judul ? { seq, judul } : { seq };
}

/**
 * Bersihkan `batas` dari klien. null = tidak ada batas (atau tidak sah: dibuang, bukan ditolak, supaya konfigurasi lama tetap terbaca).
 * Dua jangkar tanpa judul dengan awal > akhir dianggap tidak sah (urutannya sudah pasti terbalik).
 */
export function bersihBatas(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const awal = bersihJangkar(raw.awal); const akhir = bersihJangkar(raw.akhir);
  if (!awal || !akhir) return null;
  if (!awal.judul && !akhir.judul && awal.seq > akhir.seq) return null;
  return { awal, akhir };
}

/** Id kitab perpustakaan yang sah, selain itu ''. */
export const bersihKitabId = (v) => (typeof v === 'string' && RE_KITAB_ID.test(v.trim()) ? v.trim() : '');

/* ----------------------------------------------------------------- Mencocokkan kitab katalog <-> perpustakaan */

/**
 * Kitab perpustakaan yang cocok dengan satu nama kitab di katalog Konfigurasi. Ejaan persis didahulukan; selain itu harus TEPAT SATU
 * kecocokan longgar (alias dari kitabNama.js), karena dua kitab dengan nama mirip tidak boleh dipilihkan diam-diam.
 * @param {{id:string, judul?:string, judulLatin?:string}[]} daftar hasil `perpus-daftar`
 */
export function cocokkanKitabPerpus(daftar, nama) {
  const d = arr(daftar).filter((k) => k && typeof k === 'object' && k.id);
  const t = String(nama || '').trim().toLowerCase();
  if (!t || !d.length) return null;
  const persis = d.filter((k) => String(k.judulLatin || '').trim().toLowerCase() === t || String(k.judul || '').trim().toLowerCase() === t);
  if (persis.length === 1) return persis[0];
  if (persis.length > 1) return null;
  const longgar = d.filter((k) => samaKitab(k.judulLatin, nama) || (k.judul && samaKitab(k.judul, nama)));
  return longgar.length === 1 ? longgar[0] : null;
}

/**
 * Kitab perpustakaan untuk satu kitab katalog.
 *  - sumber 'tautan'        : admin menautkan kitabId dan kitab itu aktif di perpustakaan
 *  - sumber 'tautan-hilang' : admin menautkan, tetapi kitabnya dihapus/dinonaktifkan di perpustakaan (item null)
 *  - sumber 'otomatis'      : dicocokkan menurut nama
 *  - sumber 'manual'        : tidak ada di perpustakaan (item null): teks ditempel sendiri
 */
export function kitabPerpusUntuk(kitabCfg, daftar) {
  const d = arr(daftar);
  const id = bersihKitabId(kitabCfg && kitabCfg.kitabId);
  if (id) {
    const ada = d.find((k) => k && k.id === id);
    return ada ? { item: ada, sumber: 'tautan' } : { item: null, sumber: 'tautan-hilang' };
  }
  const oto = cocokkanKitabPerpus(d, kitabCfg && kitabCfg.nama);
  return oto ? { item: oto, sumber: 'otomatis' } : { item: null, sumber: 'manual' };
}

/* ----------------------------------------------------------------- Menyelesaikan batas terhadap daftar isi terkini */

const kunciJudul = (s) => kunciBab(s);

/** Entri daftar isi yang judulnya sama; bila kembar (judul berulang di juz berbeda) pilih yang paling dekat dengan posisi tersimpan. */
function cariEntri(entri, judul, seqLama) {
  const kunci = kunciJudul(judul); if (!kunci) return -1;
  let terbaik = -1; let jarak = Infinity;
  entri.forEach((e, i) => {
    if (!e || kunciJudul(e.judul) !== kunci || !seqSah(e.seq)) return;
    const j = Math.abs(e.seq - seqLama);
    if (j < jarak) { jarak = j; terbaik = i; }
  });
  return terbaik;
}

/**
 * Tetapkan satu ujung batas dari hasil pencarian kalimat di kitab (untuk pelajaran yang batasnya tidak sama dengan judul bab).
 * Ujung itu berupa urutan halaman apa adanya: `awal` mulai di halaman itu, `akhir` berakhir di halaman itu (halaman ikut). Ujung lain dipertahankan;
 * bila belum ada, sama dengan halaman ini; bila kedua ujung polos dan menjadi terbalik, ujung lain ikut pindah ke halaman ini.
 */
export function tetapkanUjung(batas, sisi, seq) {
  const b = bersihBatas(batas);
  if (!seqSah(seq) || (sisi !== 'awal' && sisi !== 'akhir')) return b;
  const j = { seq }; const lain = sisi === 'awal' ? 'akhir' : 'awal';
  let lainJ = b ? b[lain] : j;
  const a = sisi === 'awal' ? j : lainJ; const z = sisi === 'akhir' ? j : lainJ;
  if (!a.judul && !z.judul && a.seq > z.seq) lainJ = j;
  return sisi === 'awal' ? { awal: j, akhir: lainJ } : { awal: lainJ, akhir: j };
}

/** Indeks entri daftar isi untuk satu jangkar berjudul (untuk menampilkan pilihan bab di Konfigurasi); -1 bila tanpa judul atau tidak ditemukan. */
export const indeksJangkar = (entri, jangkar) => (jangkar && jangkar.judul ? cariEntri(arr(entri), jangkar.judul, jangkar.seq) : -1);

/**
 * Selesaikan batas tersimpan terhadap daftar isi kitab SAAT INI.
 * @param {object|null} batas   hasil bersihBatas
 * @param {object[]} entri      daftar isi dari `perpus-isi` (urut menurut seq): { judul, level, seq, hal }
 * @param {number} jumlahHalaman jumlah halaman kitab
 * @returns {null | {awal:number, akhir:number, judulAwal:string, judulAkhir:string, status:string, catatan:string[]}}
 *   status: 'ok' | 'bergeser' (judul ditemukan di posisi baru; otomatis mengikuti) | 'hilang' (judul tidak ada lagi; pakai posisi tersimpan)
 *           | 'tetap' (tanpa judul) | 'terbalik' | 'kosong' (di luar halaman kitab)
 */
export function selesaikanBatas(batas, entri, jumlahHalaman) {
  const b = bersihBatas(batas); if (!b) return null;
  const daftar = arr(entri).filter((e) => e && typeof e === 'object');
  const total = Number.isInteger(jumlahHalaman) && jumlahHalaman > 0 ? jumlahHalaman : SEQ_MAKS;
  const catatan = []; let status = 'tetap';
  const turun = (s) => { if (status === 'tetap' || status === 'ok') status = s; else if (s === 'hilang') status = 'hilang'; };

  let awal = b.awal.seq; let judulAwal = '';
  if (b.awal.judul) {
    const i = cariEntri(daftar, b.awal.judul, b.awal.seq);
    if (i >= 0) { awal = daftar[i].seq; judulAwal = daftar[i].judul; status = awal === b.awal.seq ? 'ok' : 'bergeser'; if (status === 'bergeser') catatan.push(`Awal \"${judulAwal}\" kini di urutan ${awal} (tersimpan ${b.awal.seq}).`); }
    else { status = 'hilang'; judulAwal = b.awal.judul; catatan.push(`Judul awal \"${b.awal.judul}\" tidak ada lagi di daftar isi; dipakai urutan tersimpan ${b.awal.seq}.`); }
  }

  let akhir = b.akhir.seq; let judulAkhir = '';
  if (b.akhir.judul) {
    const i = cariEntri(daftar, b.akhir.judul, b.akhir.seq);
    if (i >= 0) {
      const r = rentangBab(daftar, i, total);
      akhir = r.akhir; judulAkhir = daftar[i].judul;
      const geser = daftar[i].seq !== b.akhir.seq;
      if (geser) catatan.push(`Akhir \"${judulAkhir}\" kini di urutan ${daftar[i].seq}–${akhir} (tersimpan ${b.akhir.seq}).`);
      turun(geser ? 'bergeser' : 'ok');
    } else { status = 'hilang'; judulAkhir = b.akhir.judul; catatan.push(`Judul akhir \"${b.akhir.judul}\" tidak ada lagi di daftar isi; dipakai urutan tersimpan ${b.akhir.seq}.`); }
  }

  if (awal > akhir) return { awal, akhir, judulAwal, judulAkhir, status: 'terbalik', catatan: [...catatan, `Awal (urutan ${awal}) berada setelah akhir (urutan ${akhir}). Periksa batas di Konfigurasi.`] };
  if (awal > total) return { awal, akhir, judulAwal, judulAkhir, status: 'kosong', catatan: [...catatan, `Batas dimulai di urutan ${awal}, padahal kitab hanya ${total} halaman.`] };
  if (akhir > total) { catatan.push(`Akhir batas (urutan ${akhir}) melebihi jumlah halaman (${total}); dipotong.`); akhir = total; }
  return { awal, akhir, judulAwal, judulAkhir, status, catatan };
}

/** Batas dapat dipakai (tidak terbalik/kosong)? */
export const batasBisaDipakai = (res) => !!res && res.status !== 'terbalik' && res.status !== 'kosong';

/* ----------------------------------------------------------------- Teks cakupan untuk AI dan tampilan */

const potong = (s, n) => (s.length > n ? `${s.slice(0, Math.max(0, n - 1)).trimEnd()}…` : s);

/** Label pendek batas: \"Bab Thaharah s.d. Bab Tayammum (urutan 12–34)\". '' bila res kosong. */
export function labelBatas(res) {
  if (!res) return '';
  const posisi = `urutan ${res.awal === res.akhir ? res.awal : `${res.awal}–${res.akhir}`}`;
  const a = res.judulAwal ? potong(rapi(res.judulAwal, 60), 40) : ''; const z = res.judulAkhir ? potong(rapi(res.judulAkhir, 60), 40) : '';
  const nama = a && z ? (kunciJudul(a) === kunciJudul(z) ? a : `${a} s.d. ${z}`) : (a || z);
  return potong(nama ? `${nama} (${posisi})` : `Halaman ${posisi}`, CAKUPAN_MAKS);
}

/**
 * Teks cakupan yang dikirim ke AI dan disimpan pada soal (maks. 120). Teks admin (bila ada) didahulukan karena itu bahasa admin sendiri;
 * batas terstruktur melengkapinya dengan posisi halaman. Tanpa teks admin, dipakai label batas. Tanpa keduanya: ''.
 */
export function cakupanEfektif(teksAdmin, res) {
  const t = rapi(teksAdmin, CAKUPAN_MAKS);
  if (!res || !batasBisaDipakai(res)) return t;
  const pos = `urutan ${res.awal === res.akhir ? res.awal : `${res.awal}–${res.akhir}`}`;
  if (!t) return labelBatas(res);
  const sisip = ` [${pos}]`;
  return `${potong(t, CAKUPAN_MAKS - sisip.length)}${sisip}`;
}

/* ----------------------------------------------------------------- Pemeriksaan teks terhadap batas */

/**
 * Apakah rujukan perpustakaan sebuah soal berada di dalam batas? `rujukan` = { kitabId, halId, halIdAkhir }.
 * @returns {{ok:true|false|null, alasan:string}} ok null = tidak bisa diperiksa (rujukan bukan dari kitab batas ini, atau tak ada tautan).
 */
export function periksaRujukanDalamBatas(res, kitabId, rujukan) {
  if (!batasBisaDipakai(res)) return { ok: null, alasan: '' };
  const r = rujukan && typeof rujukan === 'object' ? rujukan : {};
  if (!r.kitabId || r.kitabId !== kitabId) return { ok: null, alasan: '' };
  const a = seqDariHalId(r.halId); if (a === null) return { ok: null, alasan: '' };
  const b = r.halIdAkhir ? seqDariHalId(r.halIdAkhir) : a;
  if (b === null || b < a) return { ok: null, alasan: '' };
  if (a >= res.awal && b <= res.akhir) return { ok: true, alasan: '' };
  const pakai = a === b ? `urutan ${a}` : `urutan ${a}–${b}`;
  return { ok: false, alasan: `Teks yang dipilih (${pakai}) berada di luar batas ujian (urutan ${res.awal}–${res.akhir}).` };
}

/** Sama, untuk Paket Dauri: `ids` = id halaman bentuk \"kitabId:seq\" dari materi paket. Mengembalikan daftar seq yang di luar batas. */
export function halamanDiLuarBatas(res, kitabId, ids) {
  if (!batasBisaDipakai(res)) return { diperiksa: 0, luar: [] };
  const luar = []; let diperiksa = 0;
  for (const raw of arr(ids)) {
    const id = String(raw ?? ''); const i = id.lastIndexOf(':');
    if (i < 0 || id.slice(0, i) !== kitabId) continue;
    const seq = Number(id.slice(i + 1)); if (!seqSah(seq)) continue;
    diperiksa++;
    if (seq < res.awal || seq > res.akhir) luar.push(seq);
  }
  return { diperiksa, luar };
}

/** Pembatas gerak: tempatkan urutan halaman di dalam batas. */
export const jepitSeq = (seq, res) => (batasBisaDipakai(res) ? Math.min(Math.max(seq, res.awal), res.akhir) : seq);

/** Entri daftar isi yang MULAI di dalam batas (untuk menyaring pilihan \"Lompat ke bab\"). Mengembalikan indeks asli. */
export function indeksBabDalamBatas(entri, res) {
  const d = arr(entri);
  if (!batasBisaDipakai(res)) return d.map((_, i) => i);
  const hasil = [];
  d.forEach((e, i) => { if (e && Number.isInteger(e.seq) && e.seq >= res.awal && e.seq <= res.akhir) hasil.push(i); });
  return hasil;
}
