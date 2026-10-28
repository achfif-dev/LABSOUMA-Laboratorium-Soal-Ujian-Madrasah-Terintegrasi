// Filter Kitab dan Bab untuk Bank Soal. Nama kitab dan bab diketik bebas oleh penyusun ("Safinatun Naja", "safinatun naja ", "Bab 2" vs "bab  2"),
// jadi dicocokkan lewat kunci yang dinormalisasi (huruf kecil, spasi dirapikan, harakat Arab diabaikan), bukan teks mentah.
import { normalisasi } from './cariSoal.js';

export const KOSONG = '__kosong__'; // nilai filter untuk soal yang belum diisi kitab/bab-nya

export const kunciTeks = (s) => normalisasi(s).replace(/\s+/g, ' ').trim();
const kunciAtauKosong = (s) => kunciTeks(s) || KOSONG;
const urut = new Intl.Collator('id', { numeric: true, sensitivity: 'base' });

/** Daftar opsi {nilai, label, jumlah} dari bidang `bidang` ('nama' atau 'bab'). Label = ejaan yang paling sering dipakai. */
function opsi(qs, bidang) {
  const peta = new Map();
  for (const q of qs || []) {
    const mentah = String((q && q[bidang]) ?? '').replace(/\s+/g, ' ').trim();
    const k = kunciAtauKosong(mentah);
    if (!peta.has(k)) peta.set(k, { nilai: k, ejaan: new Map(), jumlah: 0 });
    const o = peta.get(k); o.jumlah++; o.ejaan.set(mentah, (o.ejaan.get(mentah) || 0) + 1);
  }
  const hasil = [...peta.values()].map((o) => ({
    nilai: o.nilai, jumlah: o.jumlah,
    label: o.nilai === KOSONG ? (bidang === 'nama' ? '(tanpa kitab)' : '(tanpa bab)') : [...o.ejaan.entries()].sort((a, b) => b[1] - a[1])[0][0],
  }));
  return hasil.sort((a, b) => (a.nilai === KOSONG) - (b.nilai === KOSONG) || urut.compare(a.label, b.label));
}

export const opsiKitab = (qs) => opsi(qs, 'nama');
/** Bab hanya dari soal kitab terpilih (kitab kosong = semua kitab). */
export const opsiBab = (qs, kitab) => opsi((qs || []).filter((q) => !kitab || kunciAtauKosong(q.nama) === kitab), 'bab');

/** Cocok bila filter kosong atau kitab/bab soal sama dengan filter. */
export const cocokKitabBab = (q, f) => (!f.kitab || kunciAtauKosong(q.nama) === f.kitab) && (!f.bab || kunciAtauKosong(q.bab) === f.bab);
