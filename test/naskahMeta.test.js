// Opsi dropdown Pengaturan Naskah Ujian yang diturunkan dari Konfigurasi: web/lib/naskahMeta.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hijriahDari, tahunAjaranBerjalan, opsiTahunAjaran, tahunAjaranBawaan, arabTingkat, opsiTingkat, angkaKelas, arabKelas, opsiKelas,
  arabMapel, opsiMapel, selaraskanDenganFilter, pilihTingkat, pilihKelas, pilihMapel,
} from '../web/lib/naskahMeta.js';
import { META_AWAL, namaBerkasNaskah } from '../web/lib/naskah.js';
import { DEFAULT_APP_CONFIG } from '../src/appConfig.js';

const cfg = DEFAULT_APP_CONFIG;
const meta = () => ({ ...META_AWAL });

test('tahun ajaran hijriah: berganti pada Syawal, bukan Muharram', () => {
  // 26 Okt 2026 = Rabiul Akhir 1448 H -> tahun ajaran berjalan dimulai 1447 (Syawal 1447 jatuh Maret 2026).
  const h = hijriahDari(new Date('2026-10-26T05:00:00Z'));
  assert.equal(h.tahun, 1448);
  assert.equal(tahunAjaranBerjalan(new Date('2026-10-26T05:00:00Z')), 1447);
  assert.equal(tahunAjaranBawaan(new Date('2026-10-26T05:00:00Z')), '1447 – 1448');
  // Setelah Syawal 1448 (sekitar Maret 2027) tahun ajaran baru mulai.
  assert.equal(tahunAjaranBerjalan(new Date('2027-04-15T05:00:00Z')), 1448);
});

test('opsiTahunAjaran: terbaru di atas, nilai tersimpan tidak hilang, tanpa duplikat', () => {
  const t = new Date('2026-10-26T05:00:00Z');
  assert.deepEqual(opsiTahunAjaran(t), ['1448 – 1449', '1447 – 1448', '1446 – 1447', '1445 – 1446']);
  assert.deepEqual(opsiTahunAjaran(t, '1447 – 1448'), ['1448 – 1449', '1447 – 1448', '1446 – 1447', '1445 – 1446']);
  assert.equal(opsiTahunAjaran(t, '1440 – 1441').at(-1), '1440 – 1441');
});

test('arabTingkat: nama lembaga menjadi bentuk sifat seperti di template', () => {
  assert.equal(arabTingkat({ labelArab: 'المدرسة الثانوية' }), 'الثانوي');
  assert.equal(arabTingkat({ labelArab: 'المدرسة الابتدائية' }), 'الابتدائي');
  assert.equal(arabTingkat({ labelArab: 'المدرسة العالية' }), 'العالي');
  assert.equal(arabTingkat({ labelArab: 'المرحلة' }), 'المرحلة'); // label Arab buatan admin dipakai apa adanya
  assert.equal(arabTingkat({}), '');
});

test('opsiTingkat: hanya tingkat aktif; tingkat tersimpan yang sudah nonaktif tetap ditawarkan', () => {
  const c = { tingkat: [{ nama: 'A', label: 'A (x)', aktif: true }, { nama: 'B', label: 'B', aktif: false }] };
  assert.deepEqual(opsiTingkat(c).map((o) => o.kunci), ['A']);
  assert.deepEqual(opsiTingkat(c, 'B').map((o) => o.kunci), ['A', 'B']);
});

test('kelas: angka Romawi dan angka biasa; ordinal dihitung dari urutan di dalam tingkat', () => {
  assert.equal(angkaKelas('VII'), 7); assert.equal(angkaKelas('XII'), 12); assert.equal(angkaKelas('Kelas 3'), 3); assert.equal(angkaKelas('abc'), 0);
  assert.equal(arabKelas('IV'), 'الرابع'); assert.equal(arabKelas('XX'), '');
  const mts = opsiKelas(cfg.tingkat.find((t) => t.nama === 'Tsanawiyah').kelas);
  assert.deepEqual(mts.map((o) => [o.kunci, o.arab]), [['VII', 'الأول'], ['VIII', 'الثاني'], ['IX', 'الثالث']]);
  assert.deepEqual(opsiKelas([], 'X').map((o) => o.kunci), ['X']);
});

test('mapel: dari Konfigurasi per tingkat; namaArab di Konfigurasi didahulukan; mapel tak dikenal -> kosong', () => {
  const mi = opsiMapel(cfg, 'Ibtidaiyah').map((o) => o.kunci);
  assert.ok(mi.includes('Fiqih') && !mi.includes('Nahwu')); // Nahwu hanya MTs dan MA
  assert.ok(opsiMapel(cfg, 'Tsanawiyah').some((o) => o.kunci === 'Nahwu'));
  assert.equal(arabMapel(cfg, 'Fiqih'), 'فقه');
  assert.equal(arabMapel(cfg, 'Tarikh (SKI)'), 'تاريخ الإسلام');
  assert.equal(arabMapel(cfg, "Qur'an Hadits"), 'القرآن والحديث');
  assert.equal(arabMapel(cfg, 'Lainnya'), '');
  assert.equal(arabMapel({ mapel: [{ nama: 'Fiqih', namaArab: 'الفقه' }] }, 'Fiqih'), 'الفقه');
  assert.equal(arabMapel({ mapel: [{ nama: 'Fiqih', namaArab: 'Fiqh' }] }, 'Fiqih'), 'فقه'); // bukan huruf Arab -> abaikan
  assert.ok(opsiMapel(cfg, 'Ibtidaiyah', 'Mapel Lama').some((o) => o.kunci === 'Mapel Lama'));
  // semua mapel bawaan Konfigurasi punya usulan Arab, kecuali "Lainnya"
  for (const m of cfg.mapel) if (m.nama !== 'Lainnya') assert.ok(arabMapel(cfg, m.nama), m.nama);
});

test('memilih tingkat -> kelas dan mapel yang tidak cocok dikosongkan bersama teks Arabnya', () => {
  let m = pilihTingkat(cfg, meta(), 'Aliyah');
  assert.equal(m.tingkatKey, 'Aliyah'); assert.equal(m.tingkat, 'العالي');
  m = pilihMapel(cfg, pilihKelas(cfg, m, 'XI'), 'Faraidh');
  assert.deepEqual([m.kelasKey, m.kelas, m.mapelKey, m.mapelLatin, m.mapel], ['XI', 'الثاني', 'Faraidh', 'Faraidh', 'فرائض']);
  m = pilihTingkat(cfg, m, 'Ibtidaiyah'); // kelas XI dan mapel Faraidh bukan milik MI
  assert.deepEqual([m.kelasKey, m.kelas, m.mapelKey, m.mapelLatin, m.mapel], ['', '', '', '', '']);
  // mapel yang masih cocok dipertahankan
  m = pilihTingkat(cfg, pilihMapel(cfg, meta(), 'Fiqih'), 'Tsanawiyah');
  assert.equal(m.mapelKey, 'Fiqih'); assert.equal(m.mapel, 'فقه');
});

test('pilihan tanpa usulan Arab mengosongkan teks, tidak membawa nilai pilihan sebelumnya', () => {
  const m = pilihMapel(cfg, pilihMapel(cfg, meta(), 'Fiqih'), 'Lainnya');
  assert.equal(m.mapelKey, 'Lainnya'); assert.equal(m.mapel, '');
  assert.equal(pilihMapel(cfg, m, '').mapelKey, '');
});

test('selaraskanDenganFilter: filter terisi diteruskan, "Semua" membiarkan pilihan naskah', () => {
  let m = selaraskanDenganFilter(cfg, meta(), { tingkat: 'Tsanawiyah', kelas: 'VIII', mapel: 'Nahwu' });
  assert.deepEqual([m.tingkatKey, m.kelasKey, m.kelas, m.mapelKey, m.mapel], ['Tsanawiyah', 'VIII', 'الثاني', 'Nahwu', 'نحو']);
  m = selaraskanDenganFilter(cfg, m, { tingkat: '', kelas: '', mapel: '' });
  assert.deepEqual([m.tingkatKey, m.kelasKey], ['Tsanawiyah', 'VIII']);
  m = selaraskanDenganFilter(cfg, m, { tingkat: 'Aliyah', kelas: '', mapel: 'Tafsir' });
  assert.deepEqual([m.tingkatKey, m.kelasKey, m.kelas, m.mapelKey, m.mapel], ['Aliyah', '', '', 'Tafsir', 'تفسير']);
});

test('nama berkas naskah memakai nama Latin mapel dari Konfigurasi, sehingga mapel Arab tidak lagi bertabrakan', () => {
  const a = pilihMapel(cfg, { ...META_AWAL, dawr: 2 }, 'Fiqih');
  const b = pilihMapel(cfg, { ...META_AWAL, dawr: 2 }, 'Akidah');
  assert.equal(namaBerkasNaskah(a, false), 'naskah-ujian-dawr-2-fiqih.docx');
  assert.equal(namaBerkasNaskah(b, true), 'naskah-ujian-dawr-2-akidah-kunci.docx');
  assert.equal(namaBerkasNaskah(pilihMapel(cfg, { ...META_AWAL }, "Qur'an Hadits"), false), 'naskah-ujian-dawr-1-qur-an-hadits.docx');
  assert.equal(namaBerkasNaskah({ dawr: 4, mapel: 'فقه' }, false), 'naskah-ujian-dawr-4.docx'); // tanpa kunci Latin: perilaku lama
});
