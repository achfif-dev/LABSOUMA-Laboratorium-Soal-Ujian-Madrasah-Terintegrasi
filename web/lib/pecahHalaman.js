// Memecah halaman yang terlalu panjang menjadi beberapa bagian pada batas paragraf/kalimat, SESUDAH parser membaca kitab.
// Mengapa: satu halaman tersimpan harus muat utuh di Penyusunan Soal (maks 6.000 karakter) dan di batas server (12.000).
// Bagian-bagian itu mempertahankan nomor cetak (`hal`) yang sama, sehingga rujukan "hal. N" tetap benar; urutan (`seq`) dinomori ulang.
// Halaman yang jauh lebih panjang dari wajar (> BATAS_WAJAR) TIDAK dipecah: hampir pasti penanda halaman hilang atau bagian belakang kitab
// (indeks, daftar isi) menempel di halaman terakhir. Memecahnya diam-diam akan menyembunyikan kerusakan data, jadi dibiarkan dan ditolak.
export const BATAS_PECAH = 6000;
export const BATAS_WAJAR = 30000;
const idHalaman = (seq) => `p${String(seq).padStart(5, '0')}`;

// Posisi (indeks sesudah pemisah) terdekat ke `ideal` dalam [awal, akhir]; -1 bila tidak ada.
function terdekat(teks, awal, akhir, ideal, uji) {
  let terbaik = -1; let jarak = Infinity;
  for (let i = Math.max(1, awal); i <= akhir; i++) {
    if (!uji(teks, i)) continue;
    const j = Math.abs(i - ideal); if (j < jarak) { jarak = j; terbaik = i; }
  }
  return terbaik;
}
const UJI = [
  (t, i) => t[i - 1] === '\n',                                              // batas paragraf/baris
  (t, i) => /[.؟!؛:]/.test(t[i - 1]) && /\s/.test(t[i] || ' '),             // akhir kalimat
  (t, i) => t[i - 1] === '،' && /\s/.test(t[i] || ' '),                     // koma Arab
  (t, i) => /\s/.test(t[i - 1]),                                            // spasi
];

/** Teks -> [{ mulai, teks }]: bagian berukuran hampir sama, tiap bagian <= maks; `mulai` = posisi bagian (setelah dipangkas) di teks asal. */
export function potongTeks(teks, maks = BATAS_PECAH) {
  const n = Math.ceil(teks.length / maks);
  if (n <= 1) return [{ mulai: 0, teks }];
  const sasaran = Math.ceil(teks.length / n);
  const hasil = []; let dari = 0;
  while (dari < teks.length) {
    let akhir = teks.length;
    if (teks.length - dari > maks) {
      const batas = dari + maks; const ideal = dari + sasaran; const awal = dari + Math.floor(sasaran * 0.5);
      akhir = -1;
      for (const uji of UJI) { akhir = terdekat(teks, awal, batas, ideal, uji); if (akhir > 0) break; }
      if (akhir <= dari) akhir = batas; // tanpa pemisah sama sekali: potong keras
    }
    const mentah = teks.slice(dari, akhir); const depan = mentah.length - mentah.trimStart().length; const t = mentah.trim();
    if (t) hasil.push({ mulai: dari + depan, teks: t });
    dari = akhir;
  }
  return hasil;
}

/**
 * Hasil parser -> hasil baru (masukan tidak diubah). Halaman > maks dan <= wajar dipecah; seq dan id dinomori ulang; daftar isi dan
 * daftar anomali dipetakan ke bagian pertama. Laporan mendapat `halamanDipecah` dan `halamanPanjang` (5 terpanjang sebelum dipecah).
 */
export function pecahHalamanPanjang(hasil, { maks = BATAS_PECAH, wajar = BATAS_WAJAR } = {}) {
  const asli = hasil.halaman;
  const panjang = asli.map((h) => ({ seq: h.seq, hal: h.hal, panjang: h.teks.length })).sort((a, b) => b.panjang - a.panjang).slice(0, 5);
  const baru = []; const peta = new Map(); const dipecah = [];
  for (const h of asli) {
    peta.set(h.seq, baru.length + 1);
    if (h.teks.length > maks && h.teks.length <= wajar) {
      const bagian = potongTeks(h.teks, maks);
      dipecah.push({ hal: h.hal, juz: h.juz, panjang: h.teks.length, bagian: bagian.length });
      bagian.forEach((b, i) => {
        const seq = baru.length + 1;
        const d = { ...h, id: idHalaman(seq), seq, teks: b.teks, potongan: { ke: i + 1, dari: bagian.length } };
        d.batasMatn = h.batasMatn === null || h.batasMatn === undefined ? null : Math.min(Math.max(h.batasMatn - b.mulai, 0), b.teks.length);
        if (i > 0) delete d.nomorAnomali; // anomali nomor hanya milik bagian pertama
        baru.push(d);
      });
    } else { const seq = baru.length + 1; baru.push({ ...h, id: idHalaman(seq), seq }); }
  }
  const l = hasil.laporan;
  const laporan = {
    ...l, jumlahHalaman: baru.length, jumlahHalamanAsli: asli.length, halamanDipecah: dipecah, halamanPanjang: panjang,
    daftarAnomali: (l.daftarAnomali || []).map((a) => ({ ...a, seq: peta.get(a.seq) ?? a.seq })),
    catatanTertinggal: l.catatanTertinggal ? l.catatanTertinggal.map((c) => ({ ...c, seq: peta.get(c.seq) ?? c.seq })) : l.catatanTertinggal,
    totalKarakter: baru.reduce((n, h) => n + h.teks.length, 0), halamanTerpanjang: Math.max(...baru.map((h) => h.teks.length)),
    halamanMelebihiBatas: baru.filter((h) => h.teks.length > 12000).map((h) => h.seq),
  };
  return {
    ...hasil, halaman: baru, laporan,
    kitab: { ...hasil.kitab, jumlahHalaman: baru.length },
    daftarIsi: hasil.daftarIsi.map((e) => ({ ...e, seq: peta.get(e.seq) ?? e.seq })),
  };
}
