import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalisasi, ekstrakKutipan, cocokkan, periksaKutipan, bidangDariAI, bidangDariSoal,
} from '../src/kutipan.js';

const TEKS = 'قَالَ الْمُصَنِّفُ: الْمِيَاهُ الَّتِي يَجُوزُ التَّطْهِيرُ بِهَا سَبْعُ مِيَاهٍ: مَاءُ السَّمَاءِ وَمَاءُ الْبَحْرِ وَمَاءُ النَّهْرِ وَمَاءُ الْبِئْرِ وَمَاءُ الْعَيْنِ وَمَاءُ الثَّلْجِ وَمَاءُ الْبَرَدِ';

test('normalisasi: harakat, tatwil, alif/ya/ta marbutah, tanda baca, spasi', () => {
  assert.equal(normalisasi('الْمِيَاهُ'), 'المياه');
  assert.equal(normalisasi('الـــمـاء'), 'الماء');
  assert.equal(normalisasi('أَحْمَد إِبْرَاهِيم آمَنَ'), normalisasi('احمد ابراهيم امن'));
  assert.equal(normalisasi('الصَّلَاة'), normalisasi('الصلاه'));
  assert.equal(normalisasi('على'), normalisasi('علي'));
  assert.equal(normalisasi('قال: «الماء» (طهور)،  فيه'), 'قال الماء طهور فيه');
  assert.equal(normalisasi(null), '');
});

test('normalisasi: karakter arah dan lebar-nol tidak memecah kata', () => {
  assert.equal(normalisasi('الم\u200cياه\u200f'), 'المياه');
});

test('ekstrakKutipan: hanya rangkaian Arab >= 3 kata, dipotong oleh teks Latin', () => {
  const k = ekstrakKutipan('Menurut pengarang: الْمِيَاهُ الَّتِي يَجُوزُ التَّطْهِيرُ بِهَا. Artinya air; istilah الطهارة saja.');
  assert.equal(k.length, 1);
  assert.equal(k[0].norm, 'المياه التي يجوز التطهير بها');
});

test('ekstrakKutipan: tanda titik tiga memisahkan dua kutipan', () => {
  const k = ekstrakKutipan('الماء الطهور يرفع الحدث ... ويزيل النجس عن البدن');
  assert.equal(k.length, 2);
});

test('cocokkan: jarak edit tingkat kata dan jendela yang cocok', () => {
  const t = 'a b c d e f g'.split(' ');
  assert.deepEqual(cocokkan('c d e'.split(' '), t), { jarak: 0, awal: 2, akhir: 5 });
  assert.equal(cocokkan('c x e'.split(' '), t).jarak, 1);
  assert.equal(cocokkan('c e'.split(' '), t).jarak, 1);
  assert.equal(cocokkan('x y z'.split(' '), t).jarak, 3);
});

test('periksaKutipan: kutipan persis (beda harakat) = lolos', () => {
  const r = periksaKutipan({ pembahasan: 'Dalil: الميـاه التي يجوز التطهير بها سبع مياه. Artinya air itu ada tujuh.' }, TEKS);
  assert.equal(r.status, 'lolos');
  assert.deepEqual(r.ringkas, { total: 1, cocok: 1, mirip: 0, tidak_ditemukan: 0 });
});

test('periksaKutipan: satu kata diganti = mirip (status periksa), bukan lolos', () => {
  const r = periksaKutipan({ pembahasan: 'ماء السماء وماء البحر وماء النهر وماء الدم' }, TEKS);
  assert.equal(r.status, 'periksa');
  assert.equal(r.detail[0].status, 'mirip');
  assert.ok(r.detail[0].terdekat.includes('ماء النهر'));
});

test('periksaKutipan: kutipan karangan AI = gagal', () => {
  const r = periksaKutipan({ pembahasan: 'يجب على المسلم أن يصلي خمس صلوات في اليوم والليلة' }, TEKS);
  assert.equal(r.status, 'gagal');
  assert.equal(r.ringkas.tidak_ditemukan, 1);
});

test('periksaKutipan: kutipan di opsi dan stimulus ikut diperiksa', () => {
  const r = periksaKutipan({ pembahasan: '', stimulus: 'x', A: 'ماء السماء وماء البحر وماء النهر', B: 'ماء الورد وماء الزهر وماء الريحان' }, TEKS);
  assert.equal(r.ringkas.total, 2);
  assert.equal(r.detail.find((d) => d.bidang === 'B').status, 'tidak_ditemukan');
  assert.equal(r.status, 'gagal');
});

test('periksaKutipan: pembahasan tanpa kutipan Arab = periksa dengan peringatan', () => {
  const r = periksaKutipan({ pembahasan: 'Air laut suci dan mensucikan.' }, TEKS);
  assert.equal(r.status, 'periksa');
  assert.equal(r.peringatan.length, 1);
});

test('periksaKutipan: pembahasan kosong tidak menghasilkan peringatan; teks kitab kosong = tanpa_teks', () => {
  assert.equal(periksaKutipan({ pembahasan: '' }, TEKS).status, 'lolos');
  assert.equal(periksaKutipan({ pembahasan: 'الماء الطهور يرفع الحدث' }, '').status, 'tanpa_teks');
});

test('periksaKutipan: kutipan harus mengikuti urutan kata dan tidak boleh melompat', () => {
  const r = periksaKutipan({ pembahasan: 'قال المصنف سبع مياه ماء السماء' }, TEKS); // "قال المصنف" lalu loncat ke "سبع مياه"
  assert.notEqual(r.detail[0].status, 'cocok');
});

test('bidangDariAI dan bidangDariSoal memetakan bentuk data yang berbeda', () => {
  const ai = bidangDariAI({ pembahasan: 'p', stimulus: 's', pertanyaan: 'q', pilihan_a: 'a', pilihan_e: 'e' });
  assert.equal(ai.A, 'a'); assert.equal(ai.E, 'e'); assert.equal(ai.pembahasan, 'p');
  const q = bidangDariSoal({ pembahasan: 'p', opsi: { A: 'a', B: 'b' } });
  assert.equal(q.B, 'b'); assert.equal(q.C, undefined);
});

test('performa: teks 6000 karakter dan 5 kutipan selesai < 300 ms', () => {
  const kata = TEKS.split(' ');
  let besar = ''; while (besar.length < 6000) besar += kata.join(' ') + ' ';
  const t0 = Date.now();
  periksaKutipan({ pembahasan: 'كلام ليس في الكتاب أبدا ولا مثله', A: 'ماء السماء وماء البحر وماء الدم', B: 'ماء الورد وماء الزهر وماء الريحان', C: 'قال المصنف سبع مياه', D: 'x' }, besar);
  assert.ok(Date.now() - t0 < 300);
});
