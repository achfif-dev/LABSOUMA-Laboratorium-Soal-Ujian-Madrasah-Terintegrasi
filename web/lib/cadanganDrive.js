// Cadangan otomatis "Soal Saya" (peran Ustadz) ke Google Drive. Fungsi murni + penyimpanan preferensi; sumber tunggal untuk browser dan tes.
//
// Batas yang disengaja: token Drive hanya ada di memori browser (kedaluwarsa ±1 jam) dan jendela izin Google hanya boleh dibuka oleh klik pengguna.
// Jadi "otomatis" berarti: setiap kali pengguna menyimpan, menghapus, atau memulihkan soal, cadangan ikut dijalankan; tidak ada pencadangan di latar belakang.
import { DriveError, namaSoalSaya, soalSayaLama, soalSayaTerbaru } from './drive.js';

// Awalan SENGAJA bukan 'labsouma:v1:' (draf otomatis dibersihkan di bawah awalan itu) dan bukan 'labsouma-soalsaya:v1:' (daftar soal).
export const KUNCI_PREF = 'labsouma-soalsaya-drive:v1:';

/** Sidik ringan daftar soal (id + waktu ubah): berubah bila ada soal ditambah, diubah, atau dihapus. Bukan untuk keamanan. */
export function sidikDaftar(items) {
  const s = (items || []).map((i) => `${i.id}:${i.updatedAt}`).sort().join('|') + '#' + (items || []).length;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

const tautanAman = (u) => (/^https:\/\/(drive|docs)\.google\.com\//.test(String(u || '')) ? String(u) : '');

export function createPrefDrive({ storage = null, now = () => Date.now() } = {}) {
  let uid = '';
  const key = () => KUNCI_PREF + uid;
  const kosong = () => ({ aktif: false, ok: null });
  const baca = () => {
    if (!storage || !uid) return kosong();
    try {
      const o = JSON.parse(storage.getItem(key()) || 'null');
      if (!o || o.v !== 1) return kosong();
      const k = o.ok && typeof o.ok === 'object' ? o.ok : null;
      return {
        aktif: o.aktif === true,
        ok: k && typeof k.sidik === 'string' && Number.isFinite(k.waktu)
          ? { waktu: k.waktu, sidik: k.sidik.slice(0, 16), jumlah: Number.isFinite(k.jumlah) ? k.jumlah : 0, nama: String(k.nama || '').slice(0, 80), link: tautanAman(k.link) }
          : null,
      };
    } catch (e) { return kosong(); }
  };
  const tulis = (m) => { if (!storage || !uid) return false; try { storage.setItem(key(), JSON.stringify({ v: 1, ...m })); return true; } catch (e) { return false; } };
  return {
    setUser(next) { uid = String(next || ''); },
    get tersedia() { return !!storage && !!uid; },
    baca,
    aktifkan() { return tulis({ ...baca(), aktif: true }); },
    matikan() { return tulis({ ...baca(), aktif: false }); },
    catatBerhasil({ sidik, jumlah, nama, link }) { return tulis({ ...baca(), ok: { waktu: now(), sidik, jumlah, nama, link: tautanAman(link) } }); },
  };
}

/** Perlu dicadangkan? Hanya bila aktif, ada soal, dan daftar berbeda dari cadangan terakhir yang berhasil. */
export const perluCadangan = ({ aktif, jumlah, sidik, ok }) => !!aktif && jumlah > 0 && (!ok || ok.sidik !== sidik);

const panjangByte = (s) => (typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(s).length : s.length);

/**
 * Unggah `isi` ke folder Drive pengguna sebagai berkas hari ini (membuat atau menimpa), lalu unduh kembali dan bandingkan.
 * Berkas hari-hari sebelumnya tidak disentuh, kecuali yang melewati `SIMPAN_SOAL_SAYA` terbaru (dihapus; kegagalan merapikan bukan galat cadangan).
 * Daftar kosong tidak pernah diunggah: itu akan menimpa cadangan hari ini dengan berkas kosong.
 */
export async function cadangkanSoalSaya({ drive, isi, jumlah, now = new Date() }) {
  if (!(jumlah > 0)) throw new DriveError('CADANGAN_KOSONG', 'Belum ada soal untuk dicadangkan.');
  const folder = await drive.siapkanFolder(); // panggilan Drive pertama (memicu token); pemanggil sudah meminta token lebih dulu dari klik pengguna
  const nama = namaSoalSaya(now);
  const ada = await drive.cari(folder, nama);
  const f = ada ? await drive.perbarui(ada.id, isi) : await drive.unggah(folder, nama, isi);
  if ((await drive.unduh(f.id)) !== isi) throw new DriveError('DRIVE_VERIFIKASI', 'Berkas di Google Drive tidak sama dengan data yang dikirim, jadi cadangan tidak dianggap berhasil. Coba lagi.');
  let dihapus = 0;
  try { for (const b of soalSayaLama(await drive.daftar(folder))) { await drive.hapus(b.id); dihapus++; } } catch (e) { /* biarkan: cadangan sudah aman */ }
  return { nama, id: f.id, link: f.webViewLink || '', ukuran: panjangByte(isi), dihapus };
}

/** Daftar cadangan Soal Saya di Drive pengguna, terbaru dulu. */
export async function daftarSoalSaya(drive) {
  return soalSayaTerbaru(await drive.daftar(await drive.siapkanFolder()));
}
