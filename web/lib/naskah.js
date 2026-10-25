// Naskah ujian format IMDA (Dawr I-IV): tiga bagian dengan nilai per nomor, total 100. Fungsi murni, sumber tunggal untuk browser dan tes.
//
// Dibuat dari empat berkas contoh FORMAT_SOAL_IMDA_I..IV.docx:
//   bagian أ  "إختر إحدى الأجوبة الصحيحة مما بين القوسين"  -> soal pilihan (pilgan dan lanjutan)
//   bagian ب  "إملاء الفراغ الآتية بأجوبة صحيحة"            -> isian
//   bagian ج  "أجب أسئلة التالية إجابة صحيحة"               -> uraian (jawab singkat)
// Jumlah nomor dan nilai per nomor tiap Dawr (nilai 100):
//   Dawr I dan III : أ 5 x 5, ب 5 x 7, ج 5 x 8      Dawr II dan IV : أ 7 x 4, ب 6 x 5, ج 7 x 6
// Warna merah pada contoh dibaca sebagai penanda kunci: huruf opsi yang benar dan "ص" (rujukan halaman kitab, diambil dari kolom Halaman soal).
import { bentukDari, opsiTerpakai, kunciTeks } from './bentuk.js';

export const MAKS_NILAI = 100;
export const HURUF_OPSI = { A: 'أ', B: 'ب', C: 'ج', D: 'د', E: 'هـ' };
export const OPSI_ASLI = 3; // template memuat tiga opsi (أ ب ج)

export const BAGIAN = {
  a: { kode: 'a', huruf: 'أ', sambung: '–', judul: 'إختر إحدى الأجوبة الصحيحة مما بين القوسين', bentuk: ['pilgan', 'lanjutan'], label: 'Pilihan (pilgan, lanjutan)' },
  b: { kode: 'b', huruf: 'ب', sambung: '–', judul: 'إملاء الفراغ الآتية بأجوبة صحيحة', bentuk: ['isian'], label: 'Isian' },
  c: { kode: 'c', huruf: 'ج', sambung: '-', judul: 'أجب أسئلة التالية إجابة صحيحة', bentuk: ['uraian'], label: 'Uraian' },
};
export const URUTAN_BAGIAN = ['a', 'b', 'c'];

const tiga = (n, nilai) => URUTAN_BAGIAN.map((k, i) => ({ kode: k, n: n[i], nilai: nilai[i] }));
export const PRESET_DAWR = {
  1: { dawr: 1, nama: 'الأول', label: 'Dawr I', bagian: tiga([5, 5, 5], [5, 7, 8]) },
  2: { dawr: 2, nama: 'الثاني', label: 'Dawr II', bagian: tiga([7, 6, 7], [4, 5, 6]) },
  3: { dawr: 3, nama: 'الثالث', label: 'Dawr III', bagian: tiga([5, 5, 5], [5, 7, 8]) },
  4: { dawr: 4, nama: 'الرابع', label: 'Dawr IV', bagian: tiga([7, 6, 7], [4, 5, 6]) },
};
export const DAFTAR_DAWR = Object.values(PRESET_DAWR);
export const dawrSah = (v) => (Object.hasOwn(PRESET_DAWR, String(v)) ? Number(v) : 1);

/** Nilai per nomor ditulis dengan kata seperti pada template ("لكل رقم خمسة نتائج"); di atas sepuluh dipakai angka. */
const KATA_NILAI = ['', 'واحد', 'اثنان', 'ثلاثة', 'اربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة'];
export const kataNilai = (n) => (Number.isInteger(n) && n >= 1 && n <= 10 ? KATA_NILAI[n] : String(n));

export const judulBagian = (kode, nilai) => {
  const b = BAGIAN[kode];
  return `${b.huruf} ${b.sambung} ${b.judul} ( لكل رقم ${kataNilai(nilai)} نتائج )`;
};
export const judulDawr = (dawr) => `الامتحان في الدور ${PRESET_DAWR[dawrSah(dawr)].nama}`;

/** Nilai awal kop naskah; semuanya bisa diubah pengguna sebelum diunduh. */
export const META_AWAL = Object.freeze({
  dawr: 1, kelas: 'الأول', tingkat: 'الثانوي', mapel: '',
  tahun: '1446 – 1447',
  baris1: 'بالمدرسة الدينية السلفية المعارف',
  baris2: 'بمعهد شيخنا محمد خليل بغكالان',
  penanda: '(* L@b I *)',
});

export const bagianDari = (q) => {
  const b = bentukDari(q);
  return URUTAN_BAGIAN.find((k) => BAGIAN[k].bentuk.includes(b)) || null;
};

const potong = (s, n = 70) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };

/**
 * Menempatkan soal terpilih ke nomor-nomor template. Urutan soal dipertahankan; soal yang bentuknya tidak ada di template,
 * atau yang bagiannya sudah penuh, masuk `tidakDipakai` beserta alasannya. Nomor yang tidak terisi tetap ada (q: null) sebagai baris kosong.
 */
export function susunNaskah(soal, dawr = 1) {
  const preset = PRESET_DAWR[dawrSah(dawr)];
  const bagian = preset.bagian.map((p) => ({ ...p, huruf: BAGIAN[p.kode].huruf, judul: judulBagian(p.kode, p.nilai), butir: [], terisi: 0, kurang: 0 }));
  const tidakDipakai = []; const peringatan = [];
  for (const q of Array.isArray(soal) ? soal : []) {
    if (!q) continue;
    const kode = bagianDari(q);
    const b = bentukDari(q);
    if (!kode) { tidakDipakai.push({ q, alasan: b === 'benarsalah' ? 'Bentuk Benar–Salah tidak ada di template IMDA.' : 'Bentuk soal tidak dikenal.' }); continue; }
    const bg = bagian.find((x) => x.kode === kode);
    if (bg.butir.length >= bg.n) { tidakDipakai.push({ q, alasan: `Bagian ${bg.huruf} sudah penuh (${bg.n} nomor).` }); continue; }
    bg.butir.push({ no: bg.butir.length + 1, q });
  }
  for (const bg of bagian) {
    bg.terisi = bg.butir.length; bg.kurang = bg.n - bg.terisi;
    for (let i = bg.butir.length; i < bg.n; i++) bg.butir.push({ no: i + 1, q: null });
    if (bg.kurang > 0) peringatan.push(`Bagian ${bg.huruf}: ${bg.terisi} dari ${bg.n} nomor terisi (${bg.kurang} nomor dibiarkan kosong).`);
    for (const { q } of bg.butir) {
      if (q && BAGIAN[bg.kode].bentuk.some((x) => ['pilgan', 'lanjutan'].includes(x)) && opsiTerpakai(q).length > OPSI_ASLI) {
        peringatan.push(`Bagian ${bg.huruf} no. ${bg.butir.find((x) => x.q === q).no}: soal punya ${opsiTerpakai(q).length} opsi, template aslinya ${OPSI_ASLI}; semua opsi tetap dicetak (“${potong(q.pertanyaan, 40)}”).`);
      }
    }
  }
  const total = bagian.reduce((n, bg) => n + bg.terisi * bg.nilai, 0);
  const tanpaHal = bagian.reduce((n, bg) => n + bg.butir.filter((x) => x.q && !String(x.q.hal || '').trim()).length, 0);
  if (tanpaHal) peringatan.push(`${tanpaHal} soal belum punya halaman kitab: kolom “ص” di naskah kunci dibiarkan kosong.`);
  if (total !== MAKS_NILAI) peringatan.push(`Total nilai naskah ${total} dari ${MAKS_NILAI}.`);
  return { dawr: preset.dawr, nama: preset.nama, bagian, tidakDipakai, peringatan, total, maks: MAKS_NILAI };
}

/** Rujukan halaman untuk kolom "ص" naskah kunci. */
export const rujukanHalaman = (q) => { const h = String((q && q.hal) || '').trim(); return h ? `ص ${h}` : 'ص'; };

/** Jawaban untuk naskah kunci: huruf Arab (pilihan) atau jawaban tertulis. */
export function jawabanKunci(q) {
  const b = bentukDari(q);
  if (b === 'pilgan' || b === 'lanjutan') return { huruf: HURUF_OPSI[q.kunci] || '', teks: String((q.opsi || {})[q.kunci] || '').trim() };
  return { huruf: '', teks: kunciTeks(q) };
}

/** Isian dan uraian: kalimat tanya diberi tanda tanya bila belum diakhiri tanda baca. */
export const akhiriTanya = (s) => { const t = String(s || '').trim(); return !t || /[?؟!.:…]$/.test(t) ? t : t + ' ؟'; };

/** Nama berkas unduhan, mis. "naskah-ujian-dawr-2-fiqh.docx"; teks Arab/Latin dibersihkan agar aman di semua sistem berkas. */
export function namaBerkasNaskah(meta, kunci) {
  const m = { ...META_AWAL, ...(meta || {}) };
  const mapel = String(m.mapel || '').normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 30);
  const latin = /^[a-z0-9-]+$/i.test(mapel) ? mapel.toLowerCase() : '';
  return `naskah-ujian-dawr-${dawrSah(m.dawr)}${latin ? '-' + latin : ''}${kunci ? '-kunci' : ''}.docx`;
}

/* ---------- Mode "Ikuti template" pada form penyusunan soal ----------
 * Form tetap bebas seperti biasa. Bila mode template dinyalakan, form hanya menampilkan bentuk yang ada di template, membatasi opsi
 * pada tiga (أ ب ج), dan memberi catatan bila isi soal akan tampil menyimpang dari template saat diekspor. Tidak ada data baru pada soal. */

/** Bentuk soal yang punya tempat di template (Benar–Salah tidak ada). */
export const BENTUK_TEMPLATE = URUTAN_BAGIAN.flatMap((k) => BAGIAN[k].bentuk);

/** Bagian template untuk satu Dawr: huruf, judul, jumlah nomor, dan nilai per nomor. */
export function ringkasBagian(dawr, kode) {
  const p = PRESET_DAWR[dawrSah(dawr)].bagian.find((x) => x.kode === kode);
  if (!p) return null;
  return { kode, huruf: BAGIAN[kode].huruf, label: BAGIAN[kode].label, n: p.n, nilai: p.nilai, judul: judulBagian(kode, p.nilai) };
}

/** Ringkasan satu baris, mis. "أ 5×5 + ب 5×7 + ج 5×8 = 100". */
export function ringkasDawr(dawr) {
  const bg = URUTAN_BAGIAN.map((k) => ringkasBagian(dawr, k));
  return `${bg.map((b) => `${b.huruf} ${b.n}×${b.nilai}`).join(' + ')} = ${bg.reduce((n, b) => n + b.n * b.nilai, 0)}`;
}

/** Catatan (teks) untuk soal yang sedang disusun, bila diekspor ke template. Daftar kosong berarti soal sudah sesuai. */
export function catatanTemplate(q, dawr = 1) {
  const kode = bagianDari(q); const c = [];
  if (!kode) return ['Bentuk Benar–Salah tidak ada di template IMDA. Pilih Pilihan ganda, Lanjutan, Isian, atau Uraian agar soal ini masuk naskah.'];
  const bg = ringkasBagian(dawr, kode);
  if (BAGIAN[kode].bentuk.some((x) => ['pilgan', 'lanjutan'].includes(x))) {
    const n = opsiTerpakai(q).length;
    if (n > OPSI_ASLI) c.push(`Template memuat ${OPSI_ASLI} opsi (أ ب ج); soal ini punya ${n}. Semua opsi tetap dicetak, tetapi baris soal jadi lebih panjang dari template.`);
    else if (n > 0 && n < OPSI_ASLI) c.push(`Template memuat ${OPSI_ASLI} opsi (أ ب ج); baru ${n} yang terisi.`);
  }
  const stim = String((q && q.stimulus) || '').trim();
  if (stim) c.push('Template hanya punya satu kalimat soal per nomor. Narasi/stimulus akan dicetak di depan kalimat soal pada baris yang sama.');
  const panjang = (stim + ' ' + String((q && q.pertanyaan) || '')).trim().length;
  if (panjang > 260) c.push(`Kalimat soal ±${panjang} karakter; di template aslinya satu sampai dua baris. Pertimbangkan meringkas.`);
  if (!String((q && q.hal) || '').trim()) c.push('Halaman kitab (ص) belum diisi: kolom ص di naskah kunci akan kosong.');
  if (['isian', 'uraian'].includes(bentukDari(q)) && !kunciTeks(q)) c.push('Jawaban belum diisi: naskah kunci memuat jawaban ini di samping nomor.');
  return c.map((t) => `Bagian ${bg.huruf}: ${t}`);
}
