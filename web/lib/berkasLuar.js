// Naskah asli (.docx) Bank Soal Manual dan cadangannya ke Google Drive. Fungsi murni; dipakai browser, server, dan tes.
//
// Penyimpanan: .docx asli disimpan di Firestore sebagai potongan base64 pada subkoleksi `soalLuar/{id}/berkas/{n}` (satu dokumen Firestore
// maksimal 1 MiB, jadi tiap potongan 600.000 karakter). Hanya server yang menulis; semua staf boleh membaca (supaya bisa diunduh dan dicadangkan).
// Batas ukuran sengaja 2,5 MB: permintaan fungsi Vercel dibatasi 4,5 MB dan base64 membengkak sepertiga. Naskah ujian biasa jauh di bawah itu.
// Berkas lebih besar tetap tersimpan sebagai teks soal; hanya salinan aslinya tidak ikut (pengguna diberi tahu).
export const SUBKOLEKSI_BERKAS = 'berkas';
export const MAKS_ASLI = 2.5 * 1048576;
export const UKURAN_POTONGAN = 600000;
export const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const FORMAT_LUAR = 'labsouma-soalluar-backup';
export const VERSI_LUAR = 1;
export const NAMA_CADANGAN_LUAR = /^labsouma-soalluar-\d{4}-\d{2}-\d{2}-\d{4}\.json$/;
export const MAKS_NASKAH_LUAR = 500;

const dua = (n) => String(n).padStart(2, '0');
export const namaBerkasLuar = (d = new Date()) => `labsouma-soalluar-${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}-${dua(d.getHours())}${dua(d.getMinutes())}.json`;
/** Cadangan Bank Soal Manual terbaru dulu (nama memuat tanggal dan jam); berkas lain di folder diabaikan. */
export const cadanganLuarTerbaru = (files) => (files || []).filter((f) => f && NAMA_CADANGAN_LUAR.test(String(f.name || ''))).sort((a, b) => (a.name < b.name ? 1 : a.name > b.name ? -1 : 0));

export const adalahBase64 = (s) => typeof s === 'string' && s.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(s);
/** Ukuran asli (byte) dari panjang base64 yang valid. */
export const ukuranDariBase64 = (b64) => Math.floor((b64.length * 3) / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0);

export function potongBase64(b64, n = UKURAN_POTONGAN) {
  const out = []; for (let i = 0; i < b64.length; i += n) out.push(b64.slice(i, i + n)); return out;
}
/** Gabungkan potongan [{n, b64}] (urutan bebas); mengembalikan null bila nomor tidak runtut dari 0. */
export function gabungPotongan(potongan) {
  const arr = [...(potongan || [])].sort((a, b) => a.n - b.n);
  if (!arr.length || arr.some((p, i) => p.n !== i || typeof p.b64 !== 'string')) return null;
  return arr.map((p) => p.b64).join('');
}

const iso = (v) => {
  if (v && typeof v.toDate === 'function') { try { return v.toDate().toISOString(); } catch (e) { return null; } }
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
  return typeof v === 'string' ? v : null;
};
/** Dokumen `soalLuar` -> JSON biasa (Timestamp -> ISO) + salinan asli (base64, atau '' bila tidak ada). */
export function serialisasiLuar(id, data, berkasB64 = '') {
  const o = { id, ...(data || {}) };
  for (const k of ['createdAt', 'updatedAt']) if (k in o) o[k] = iso(o[k]);
  if (o.kisi && typeof o.kisi === 'object') o.kisi = { ...o.kisi, diubahAt: iso(o.kisi.diubahAt) };
  return { ...o, berkasB64: berkasB64 || '' };
}

export function buatBackupLuar({ naskah, oleh, now = new Date() }) {
  const jumlahAsli = naskah.filter((n) => n.berkasB64).length;
  return { format: FORMAT_LUAR, versi: VERSI_LUAR, dibuat: now.toISOString(), oleh: String(oleh || ''), jumlah: { naskah: naskah.length, asli: jumlahAsli }, naskah };
}

/** Periksa berkas cadangan Bank Soal Manual. Melempar Error berpesan Indonesia bila bukan cadangan jenis ini. */
export function periksaBackupLuar(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj) || obj.format !== FORMAT_LUAR) throw new Error('Berkas ini bukan cadangan Bank Soal Manual LABSOUMA.');
  if (obj.versi !== VERSI_LUAR) throw new Error(`Versi cadangan ${obj.versi} tidak didukung aplikasi ini (didukung: ${VERSI_LUAR}).`);
  if (!Array.isArray(obj.naskah)) throw new Error('Cadangan rusak: daftar naskah tidak ada.');
  if (obj.naskah.length > MAKS_NASKAH_LUAR) throw new Error(`Cadangan memuat lebih dari ${MAKS_NASKAH_LUAR} naskah.`);
  return { dibuat: typeof obj.dibuat === 'string' ? obj.dibuat : '', oleh: typeof obj.oleh === 'string' ? obj.oleh : '', naskah: obj.naskah };
}

/** Byte dari base64 (browser: atob; Node: Buffer). Dipakai untuk mengunduh naskah asli. */
export function base64KeByte(b64) {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'));
  const bin = atob(b64); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out;
}
/** Base64 dari byte, per bagian agar tidak melebihi batas argumen. */
export function byteKeBase64(buf) {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  if (typeof Buffer !== 'undefined') return Buffer.from(u).toString('base64');
  let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s);
}
