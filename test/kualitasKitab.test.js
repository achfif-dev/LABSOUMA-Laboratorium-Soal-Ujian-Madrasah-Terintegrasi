// Mutu hasil impor kitab: pemeriksa teks rusak, pembersih judul berjalan/nomor halaman PDF, dan peringatan duplikat di layar impor.
import test from 'node:test';
import assert from 'node:assert/strict';
import { periksaKualitasTeks, deteksiBarisBerulang, bersihkanEkorKepala, kunciBaris, NOMOR } from '../web/lib/kualitasKitab.js';
import { parsePdf } from '../web/lib/sumberLain.js';
import { peringatanPratinjau, peringatanDuplikat } from '../web/lib/imporKitab.js';

// Kalimat Arab yang SEMUANYA berbeda (kitab nyata tidak mengulang baris yang sama di posisi yang sama): kata dipilih dengan aritmetika tetap.
const KATA = ['الصلاة', 'الزكاة', 'الصيام', 'الحج', 'البيع', 'النكاح', 'الطهارة', 'الوضوء', 'الغسل', 'التيمم', 'الإمام', 'الشافعي', 'النووي', 'المصلي', 'المسلم', 'العبد',
  'واجب', 'مندوب', 'مكروه', 'حرام', 'جائز', 'صحيح', 'باطل', 'فاسد', 'شرط', 'ركن', 'سنة', 'فرض', 'عند', 'على', 'في', 'من', 'إذا', 'لأن', 'ثم', 'قال', 'وهو', 'ولا', 'مع', 'بعد'];
const kalimat = (i, k) => Array.from({ length: 9 }, (_, w) => KATA[(i * 31 + k * 17 + w * 7 + ((i + k) % 5) * w) % KATA.length]).join(' ');
const halaman = (n, baris = 5, ekor = () => []) => Array.from({ length: n }, (_, i) => [...Array.from({ length: baris }, (_, k) => `${kalimat(i, k)} ${i * 10 + k}`), ...ekor(i)].join('\n'));
const objek = (arr) => arr.map((teks) => ({ teks }));
const kode = (arr) => periksaKualitasTeks(objek(arr)).map((x) => x.kode);

/* ---------- Pemeriksa teks ---------- */
test('teks Arab yang sehat tidak menghasilkan temuan apa pun', () => {
  assert.deepEqual(periksaKualitasTeks(objek(halaman(40, 6))), []);
  assert.deepEqual(periksaKualitasTeks([]), []); assert.deepEqual(periksaKualitasTeks(null), []); assert.deepEqual(periksaKualitasTeks(objek([''])), []);
});
test('mojibake (UTF-8 dibaca sebagai Latin-1) terdeteksi sebagai kesalahan', () => {
  const rusak = halaman(10).map((t) => Buffer.from(t, 'utf8').toString('latin1'));
  const t = periksaKualitasTeks(objek(rusak));
  assert.ok(t.some((x) => x.kode === 'mojibake' && x.tingkat === 'bad'));
});
test('karakter pengganti: banyak = kesalahan, sedikit = peringatan', () => {
  const banyak = halaman(10).map((t) => t.replace(/ا/g, '�'));
  assert.ok(periksaKualitasTeks(objek(banyak)).some((x) => x.kode === 'pengganti' && x.tingkat === 'bad'));
  const sedikit = halaman(40); sedikit[3] += ' ������';
  const r = periksaKualitasTeks(objek(sedikit)).find((x) => x.kode === 'pengganti');
  assert.equal(r.tingkat, 'warn');
  const pua = halaman(40).map((t) => t + ''); // area pribadi: glyph PDF tanpa pemetaan
  assert.ok(periksaKualitasTeks(objek(pua)).some((x) => x.kode === 'pengganti'));
});
test('urutan huruf terbalik dan huruf terpisah-pisah terdeteksi; teks lurus tidak salah tuduh', () => {
  const balik = halaman(20).map((t) => t.split(/\s+/).map((k) => Array.from(k).reverse().join('')).join(' '));
  assert.ok(kode(balik).includes('terbalik'), 'terbalik');
  const pisah = halaman(20).map((t) => Array.from(t).join(' '));
  assert.ok(kode(pisah).includes('huruf-terpisah'), 'terpisah');
  assert.ok(!kode(halaman(20)).includes('terbalik'));
});
test('kata menempel (spasi hilang) dan teks bukan Arab', () => {
  const menempel = halaman(20).map((t) => t.replace(/ /g, '').replace(/(.{30})/g, '$1 '));
  assert.ok(kode(menempel).includes('kata-menempel'));
  const latin = Array.from({ length: 12 }, (_, i) => `This is page ${i}. Nothing but plain English text goes here, repeated for length. `.repeat(6));
  assert.ok(periksaKualitasTeks(objek(latin)).some((x) => x.kode === 'bukan-arab' && x.tingkat === 'bad'));
  const campur = halaman(12).map((t) => `${t} ${'translation of the passage in latin letters '.repeat(3)}`);
  assert.ok(kode(campur).includes('sedikit-arab'));
});
test('halaman hampir kosong, terlalu pendek, dan ganda persis', () => {
  const kosong = [...halaman(10), ...Array(6).fill('')];
  assert.ok(kode(kosong).includes('hampir-kosong'));
  const dobel = halaman(10); const p = dobel[2]; dobel.push(p, p, p);
  assert.ok(kode(dobel).includes('ganda'));
  const pendek = Array.from({ length: 20 }, (_, i) => `نص قصير ${i} جدا لا يكفي لصفحة كاملة`);
  assert.ok(kode(pendek).includes('pendek'));
  assert.ok(!kode(halaman(5)).some((k) => ['hampir-kosong', 'pendek'].includes(k)), 'kitab di bawah 10 halaman tidak dinilai dari rata-rata');
});

/* ---------- Header/footer berulang ---------- */
test('kunciBaris: angka diganti penanda, nomor saja = NOMOR, baris panjang diabaikan', () => {
  assert.equal(kunciBaris('  - ١٢ -  '), NOMOR); assert.equal(kunciBaris('45'), NOMOR);
  assert.equal(kunciBaris('كتاب الصلاة   ١٢'), 'كتاب الصلاة #');
  assert.equal(kunciBaris('x'.repeat(81)), null); assert.equal(kunciBaris('   '), null);
  assert.equal(kunciBaris('الصَّلَاةُ'), 'الصلاه'.replace('ه', 'ة'));
});
test('bersihkanEkorKepala: membuang judul berjalan dan nomor, menjaga isi, dan membaca nomor cetak', () => {
  const sumber = halaman(30, 4, (i) => [`${i + 17}`]).map((t) => `فتح المعين\n${t}`); // judul berjalan di atas, nomor 17.. di bawah
  const r = bersihkanEkorKepala(sumber);
  assert.equal(r.dibuang, 60);
  assert.ok(r.halaman.every((t) => !t.includes('فتح المعين') && t.split('\n').length === 4));
  assert.equal(r.halaman[0], halaman(30, 4)[0], 'isi persis sama dengan sebelum ditambah judul dan nomor');
  assert.deepEqual(r.contoh, ['فتح المعين']);
  assert.equal(r.nomor.offset, 17); assert.equal(r.nomor.dukungan, 1); assert.equal(r.nomor.bertanda, 30);
});
test('bersihkanEkorKepala: nomor Arab-Indic, judul bernomor, dan nomor yang kadang hilang', () => {
  const ind = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
  const sumber = halaman(20, 4, (i) => (i % 5 === 4 ? [] : [`- ${ind(i + 3)} -`]));
  const r = bersihkanEkorKepala(sumber);
  assert.equal(r.nomor.offset, 3); assert.equal(r.nomor.bertanda, 16);
  assert.ok(r.halaman.every((t) => !/[٠-٩]{1,2} -$/.test(t)));
  const bernomorJudul = halaman(20, 4, (i) => [`كتاب الصلاة ${i + 1}`]);
  const r2 = bersihkanEkorKepala(bernomorJudul); assert.equal(r2.dibuang, 20); assert.equal(r2.nomor, null); // judul + angka bukan nomor halaman murni
});
test('bersihkanEkorKepala: tidak menyentuh baris isi, kitab pendek, atau penomoran tak konsisten', () => {
  const tengah = halaman(20, 6).map((t) => t.split('\n').map((x, i) => (i === 3 ? 'عنوان فصل في الوسط' : x)).join('\n')); // baris sama di TENGAH halaman: bukan header
  assert.equal(bersihkanEkorKepala(tengah).dibuang, 0);
  const pendek = halaman(4, 3, () => ['9']); assert.equal(bersihkanEkorKepala(pendek).dibuang, 0, 'di bawah 6 halaman tidak dibersihkan');
  const acak = halaman(20, 4, (i) => [`${(i * 7) % 13}`]);
  const r = bersihkanEkorKepala(acak); assert.equal(r.nomor, null);
  assert.deepEqual(deteksiBarisBerulang(halaman(20)), { atas: [], bawah: [] });
});
test('bersihkanEkorKepala: baris yang berulang hanya di sebagian kecil halaman dipertahankan', () => {
  const sumber = halaman(30, 4, (i) => (i < 4 ? ['بسم الله الرحمن الرحيم'] : []));
  assert.equal(bersihkanEkorKepala(sumber).dibuang, 0);
});

/* ---------- parsePdf ---------- */
test('parsePdf: judul berjalan dan nomor dibuang, nomor cetak dari PDF dipakai bila admin tidak mengisi', () => {
  const pdf = halaman(25, 6, (i) => [`${i + 9}`]).map((t) => `فتح المعين\n${t}`);
  const h = parsePdf(pdf, { namaBerkas: 'x.pdf' });
  assert.equal(h.halaman.length, 25);
  assert.equal(h.halaman[0].hal, 9); assert.equal(h.halaman[24].hal, 33);
  assert.ok(h.halaman.every((p) => !p.teks.includes('فتح المعين')));
  assert.equal(h.kitab.penomoranSesuaiCetak, true);
  assert.equal(h.laporan.barisBerulangDibuang, 50); assert.equal(h.laporan.nomorDariPdf.offset, 9);
  const w = peringatanPratinjau(h).map((x) => x.teks).join('\n');
  assert.match(w, /judul berjalan\/nomor halaman dibuang/); assert.match(w, /Nomor cetak dibaca dari nomor halaman di dalam PDF/);
});
test('parsePdf: nomor awal yang diisi admin tidak ditimpa; tanpa nomor/judul berjalan perilaku lama tetap', () => {
  const pdf = halaman(25, 6, (i) => [`${i + 9}`]);
  const h = parsePdf(pdf, { halAwal: 100, halAwalEksplisit: true });
  assert.equal(h.halaman[0].hal, 100); assert.equal(h.laporan.nomorDariPdf, null); assert.equal(h.laporan.nomorTerdeteksiDiabaikan, 9);
  assert.match(peringatanPratinjau(h).map((x) => x.teks).join('\n'), /nomor Anda yang dipakai/);
  const polos = parsePdf(halaman(12), { halAwal: 5 });
  assert.equal(polos.halaman[0].hal, 5); assert.equal(polos.halaman[11].hal, 16); assert.equal(polos.laporan.barisBerulangDibuang, 0); assert.equal(polos.kitab.penomoranSesuaiCetak, false);
});
test('parsePdf: nomor sebelum halaman bernomor 1 dijepit ke 0, tidak negatif', () => {
  const pdf = halaman(20, 5, (i) => [`${i - 3}`.replace('-', '')]); // 3,2,1,0,1,2... bukan monoton: tidak konsisten -> tidak dipakai
  const h = parsePdf(pdf); assert.ok(h.halaman.every((p) => p.hal >= 0));
  const pdf2 = halaman(20, 5, (i) => (i < 3 ? [] : [`${i - 2}`]));
  const h2 = parsePdf(pdf2); assert.deepEqual(h2.halaman.slice(0, 4).map((p) => p.hal), [0, 0, 0, 1]);
});
test('peringatanPratinjau memuat temuan mutu teks; hasil tanpa halaman tetap aman', () => {
  const rusak = parsePdf(halaman(12).map((t) => t.split(/\s+/).map((k) => Array.from(k).reverse().join('')).join(' ')));
  assert.ok(peringatanPratinjau(rusak).some((x) => x.tingkat === 'bad' && /terbalik/.test(x.teks)));
});

/* ---------- Duplikat ---------- */
test('peringatanDuplikat: ID sama (harus timpa), judul Arab sama dengan ID lain, dan aman bila daftar belum dimuat', () => {
  const hasil = { kitab: { judul: 'فَتْحُ الْمُعِينِ' } };
  const daftar = [{ id: 'fathul-muin', judulLatin: "Fathul Mu'in", judul: 'فتح المعين', jumlahHalaman: 673, revisi: 2 }, { id: 'lain', judulLatin: 'Lain', judul: 'كتاب آخر', jumlahHalaman: 5, revisi: 1 }];
  const a = peringatanDuplikat(hasil, { kitabId: 'fathul-muin', timpa: false }, daftar);
  assert.equal(a.length, 1); assert.equal(a[0].tingkat, 'bad'); assert.match(a[0].teks, /Centang "timpa"/);
  const b = peringatanDuplikat(hasil, { kitabId: 'fathul-muin', timpa: true }, daftar);
  assert.equal(b[0].tingkat, 'warn'); assert.match(b[0].teks, /DITIMPA/);
  const c = peringatanDuplikat(hasil, { kitabId: 'fathul-muin-2', timpa: false }, daftar);
  assert.equal(c.length, 1); assert.equal(c[0].tingkat, 'warn'); assert.match(c[0].teks, /fathul-muin/);
  assert.deepEqual(peringatanDuplikat({ kitab: { judul: 'كتاب جديد' } }, { kitabId: 'baru' }, daftar), []);
  assert.deepEqual(peringatanDuplikat(hasil, { kitabId: 'baru' }, null), []);
});
