import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { kamus, convertText, convertTextEjaan } from '../src/pegon.js';

const berkas = readFileSync(new URL('../docs/kamus-serapan-arab-kitab-pesantren.json', import.meta.url), 'utf8');
const data = JSON.parse(berkas);
const arab = (t) => convertText(t).pegon;
const bersorot = (t) => convertText(t).details.filter((d) => d.flagged).map((d) => d.latin);

test('gerbang imbuhan: kata Indonesia biasa tidak berubah setelah kamus diimpor (terima, nilai, kebaikan, keadaan, saja)', () => {
  const kata = ['terima', 'diterima', 'menilai', 'penilai', 'nilai', 'kebaikan', 'berbaikan', 'keadaan', 'diadakan', 'saja', 'siapa saja', 'terimalah'];
  const sebelum = kata.map(arab);
  kamus.impor(berkas);
  kata.forEach((k, i) => assert.equal(arab(k), sebelum[i], `${k}: berubah setelah impor kamus`));
});

test('gerbang imbuhan: serapan Arab berimbuhan tetap terbaca Arab (tidak terlalu ketat)', () => {
  kamus.impor(berkas);
  assert.equal(arab('kitabnya'), 'كتابيا');
  assert.equal(arab('dihukum').startsWith('دي'), true);
  assert.equal(arab('hukumnya').includes('حكم'), true);
  assert.equal(arab('berzakat').includes('زكاة'), true);
});

test('kamus: kunci "saja" (kata Indonesia) tidak ada; istilah badi\u2019 memakai kunci "saj"', () => {
  assert.equal(Object.hasOwn(data.arabic, 'saja'), false);
  assert.equal(data.arabic.saj, 'سجع');
});

test('kamus: tidak ada kunci yang sama dengan kata fungsi Indonesia berfrekuensi tinggi', () => {
  const fungsi = `yang dan di ke dari untuk dengan pada adalah itu ini juga akan tidak dalam ada oleh atau sebagai saja sudah telah belum bisa dapat harus hanya lebih sangat sama setiap semua banyak beberapa lain antara karena sehingga agar supaya jika bila kalau maka namun tetapi tapi serta lalu kemudian setelah sebelum sambil ketika saat hari tahun bulan orang anak ibu bapak rumah tanah air api besar kecil baru lama baik buruk benar salah jalan cara hasil kata nama tempat kali lagi masih pernah selalu sering mau ingin boleh perlu pasti tentu apa siapa mana kapan bagaimana mengapa berapa atas bawah depan belakang kiri kanan tengah luar masuk keluar naik turun buka tutup ambil beri bawa pergi datang pulang lihat dengar tanya baca tulis makan minum tidur bangun duduk berdiri lari satu dua tiga empat lima enam tujuh delapan sembilan sepuluh bukan jangan kita kami kamu dia mereka saya aku nilai terima guru murid siswa kelas ujian soal jawaban pilihan lahir batin jamu jual hamil aman ketua nikmat`.split(/\s+/);
  for (const k of fungsi) assert.equal(Object.hasOwn(data.arabic, k), false, `${k}: kata Indonesia sehari-hari tidak boleh jadi kunci kamus`);
});

test('frasa baku: insya Allah, masya Allah, salam, wallahu a\u2019lam, ahlussunnah wal jamaah, hari raya, bulan hijriah', () => {
  assert.equal(arab('Insya Allah'), 'إن شاء الله');
  assert.equal(arab('Masya Allah'), 'ما شاء الله');
  assert.equal(arab('Bismillahirrahmanirrahim'), 'بسم الله الرحمن الرحيم');
  assert.equal(arab("Assalamu'alaikum warahmatullahi wabarakatuh"), 'السلام عليكم ورحمة الله وبركاته');
  assert.equal(arab('Assalamualaikum Wr. Wb.'), 'السلام عليكم ورحمة الله وبركاته');
  assert.equal(arab("Wallahu a'lam bish shawab"), 'والله أعلم بالصواب');
  assert.equal(arab('Ahlussunnah wal Jamaah'), 'أهل السنة والجماعة');
  assert.equal(arab('Idul Fitri dan Idul Adha'), 'عيد الفطر دان عيد الأضحى');
  assert.equal(arab('Rabiul Awal'), 'ربيع الأول');
  assert.equal(arab('Abu Bakar'), 'أبو بكر');
  assert.equal(arab('Abdullah bin Umar'), 'عبد الله بن عمر');
});

test("frasa baku: apostrof di awal kata kedua tidak meninggalkan tanda ' liar (radhiyallahu 'anhuma, 'anhu)", () => {
  assert.equal(arab("radhiyallahu 'anhuma"), 'رضي الله عنهما');
  assert.equal(arab("Radhiyallahu 'anhu"), 'رضي الله عنه');
  assert.equal(arab("'anhu dan 'alim"), 'عنه دان عالم');
});

test('frasa baku: tidak menelan kata yang mengandung polanya, kutip dan tanda baca tetap, ejaan klasik jalan', () => {
  assert.equal(arab('sawah'), convertText('sawah').pegon);
  assert.ok(!arab('sawah').includes('صلى'));
  assert.equal(arab("Dia berkata 'insya Allah' kepada guru."), "ديا بركاتا 'إن شاء الله' كڤادا ڬورو.");
  assert.ok(convertTextEjaan('Insya Allah', 'klasik').pegon.includes('إن شاء الله'));
});

test('singkatan: QS/HR/KH kapital diperluas; hr/qs/kh huruf kecil dan RA/AS tanpa titik tidak ditebak (bersorot)', () => {
  assert.equal(arab('QS. Al-Baqarah: 183'), 'سورة البقرة: 183');
  assert.equal(arab('HR. Bukhari dan Muslim'), 'رواه بخاري دان مسلم');
  assert.ok(arab('Dr. KH. Ahmad').includes('كياهي حاج'));
  assert.ok(!arab('hr kerja').includes('رواه'));
  assert.deepEqual(bersorot('Sayyidina Umar RA'), ['RA']);
  assert.deepEqual(bersorot('Nabi Ibrahim AS'), ['AS']);
});

test('singkatan huruf kapital tak dikenal bersorot, kata kapital biasa dan angka Romawi tidak', () => {
  assert.ok(bersorot('NU dan SD').includes('NU'));
  assert.deepEqual(bersorot('BAB III'), []);
  assert.deepEqual(bersorot('SOAL UJIAN'), []);
});

test('kinerja: lapisan frasa tidak memperlambat konversi (3000 kalimat < 2 detik)', () => {
  const t0 = performance.now();
  for (let i = 0; i < 3000; i++) convertText("Nabi Muhammad SAW bersabda bahwa ilmu itu cahaya, wallahu a'lam.");
  assert.ok(performance.now() - t0 < 2000);
});
