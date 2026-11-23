// Penyorotan bagian teks kitab yang dikutip soal (web/lib/sorotKutipan.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenBerposisi, sorotSoal } from '../web/lib/sorotKutipan.js';
import { normalisasi, periksaKutipan } from '../web/lib/kutipan.js';

const TEKS = 'والصيد مصدر أطلق هنا على اسم المفعول، وهو المصيد. (وما) أي والحيوان البري المأكول الذي (قُدر) بضم أوله (على ذكاتِه) أي ذبحه (فذكاته) تكون (في حلقه)، وهو أعلى العنق. (وشرائط تعليمها) أي الجوارحِ (أربعةٌ): أحدها أن يكون لها معلِّم، والثاني أن تسترسل إذا أرسلت.';
const gabung = (r) => r.segmen.map((s) => s.t).join('');
const tersorot = (r) => r.segmen.filter((s) => s.sorot).map((s) => s.t);

test('tokenBerposisi: urutan kata sama dengan normalisasi() pada teks bertanda baca, harakat, tatwil, dan karakter lebar-nol', () => {
  const contoh = [TEKS, 'ال\u200cحَمْدُ للهِ ربّ العالمين ١٢٣ (فتح) «القريب»', 'كتـــاب  ,, ، ؛ ؟ ---', '', '   ', 'abc DEF (ghi) 12', '\u0670\u064b', 'ﷲ أكبر'];
  for (const s of contoh) assert.equal(tokenBerposisi(s).map((x) => x.n).join(' '), normalisasi(s), JSON.stringify(s));
  for (const x of tokenBerposisi(TEKS)) assert.equal(normalisasi(TEKS.slice(x.a, x.b)), x.n, 'rentang karakter menunjuk kata yang benar');
});

test('sorotSoal: kutipan di pembahasan disorot persis, harakat dan tanda baca teks asli tetap utuh', () => {
  const r = sorotSoal(TEKS, { pembahasan: 'Kutipan kitab: وشرائط تعليمها أي الجوارح أربعة Syarat mengajar hewan buruan ada empat.' });
  assert.equal(gabung(r), TEKS, 'tidak ada karakter yang hilang atau berubah');
  assert.equal(r.rentang.length, 1); assert.equal(r.rentang[0].jenis, 'cocok'); assert.deepEqual(r.rentang[0].label, ['Pembahasan']);
  assert.deepEqual(tersorot(r), ['وشرائط تعليمها) أي الجوارحِ (أربعةٌ']);
  assert.equal(normalisasi(tersorot(r)[0]), 'وشرايط تعليمها اي الجوارح اربعه', 'dinormalisasi seperti pemeriksa kutipan (ئ menjadi ي)');
  assert.equal(r.tidakDitemukan.length, 0); assert.equal(r.latin, false);
  assert.equal(periksaKutipan({ pembahasan: 'وشرائط تعليمها أي الجوارح أربعة' }, TEKS).ringkas.cocok, 1, 'sejalan dengan lencana kutipan');
});

test('sorotSoal: sorotan tidak mencakup tanda baca di luar kutipan (awal huruf pertama, akhir huruf terakhir)', () => {
  const r = sorotSoal('قال (الشيخ) هذا الحكم ثابت (بالإجماع) عند الجمهور.', { pembahasan: 'الشيخ هذا الحكم ثابت' });
  assert.deepEqual(tersorot(r), ['الشيخ) هذا الحكم ثابت']);
  assert.ok(r.segmen[0].t.endsWith('('), 'tanda kurung pembuka tetap di luar sorotan');
});

test('sorotSoal: kutipan yang sama di beberapa bidang digabung jadi satu penanda dengan semua labelnya', () => {
  const r = sorotSoal(TEKS, { pembahasan: 'وشرائط تعليمها أي الجوارح أربعة', A: 'أي الجوارح أربعة شروط', B: 'وشرائط تعليمها أي' });
  assert.equal(r.rentang.length, 1); assert.deepEqual(r.rentang[0].label, ['Pembahasan', 'Opsi A', 'Opsi B']);
  assert.equal(r.rentang[0].kutipan.length, 3);
});

test('sorotSoal: dua kutipan terpisah menghasilkan dua penanda berurutan', () => {
  const r = sorotSoal(TEKS, { pembahasan: 'على اسم المفعول وهو المصيد', pertanyaan: 'أي الجوارح أربعة' });
  assert.equal(r.rentang.length, 2); assert.deepEqual(r.rentang.map((x) => x.id), [0, 1]); assert.ok(r.rentang[0].awal < r.rentang[1].awal); assert.equal(gabung(r), TEKS);
});

test('sorotSoal: selisih satu kata ditandai "mirip" pada posisi terdekat; kutipan yang tak ada dilaporkan', () => {
  const mirip = sorotSoal(TEKS, { pembahasan: 'وشرائط تعليمها أي الجوارح خمسة' });
  assert.equal(mirip.rentang.length, 1); assert.equal(mirip.rentang[0].jenis, 'mirip'); assert.match(normalisasi(tersorot(mirip)[0]), /شرايط تعليمها/);
  const hilang = sorotSoal(TEKS, { pembahasan: 'هذا كلام لا يوجد أصلا في النص أبدا' });
  assert.equal(hilang.rentang.length, 0); assert.deepEqual(hilang.tidakDitemukan.map((x) => x.label), ['Pembahasan']); assert.equal(gabung(hilang), TEKS);
});

test('sorotSoal: kutipan yang berulang di teks disorot di tiap kemunculan, dibatasi tiga', () => {
  const t = Array.from({ length: 5 }, (_, i) => `باب ${i} قال الإمام هذا هو الحكم الثابت`).join(' ');
  const r = sorotSoal(t, { pembahasan: 'قال الإمام هذا هو الحكم الثابت' });
  assert.equal(r.rentang.length, 3); assert.equal(gabung(r), t);
});

test('sorotSoal: teks sumber Latin memakai isi tanda petik sebagai kutipan', () => {
  const t = 'Menurut penulis, "zakat wajib dikeluarkan setelah mencapai nisab dan haul" dalam kitab ini.';
  const r = sorotSoal(t, { pembahasan: 'Kutipan: "zakat wajib dikeluarkan setelah mencapai nisab dan haul".' });
  assert.equal(r.latin, true); assert.deepEqual(tersorot(r), ['zakat wajib dikeluarkan setelah mencapai nisab dan haul']);
});

test('sorotSoal: tanpa kutipan, teks kosong, atau nilai kosong aman dan tanpa sorotan', () => {
  const polos = sorotSoal(TEKS, { pembahasan: 'tidak ada huruf Arab di sini' });
  assert.deepEqual(polos.segmen, [{ t: TEKS, sorot: null }]); assert.equal(polos.rentang.length, 0);
  for (const t of ['', null, undefined]) { const r = sorotSoal(t, { pembahasan: 'وشرائط تعليمها أي الجوارح أربعة' }); assert.equal(r.rentang.length, 0); assert.equal(gabung(r), ''); }
  assert.equal(gabung(sorotSoal(TEKS, null)), TEKS); assert.equal(gabung(sorotSoal(TEKS, {})), TEKS);
});

test('sorotSoal: kutipan di awal dan di akhir teks', () => {
  const t = 'الحمد لله رب العالمين والصلاة والسلام على سيدنا محمد';
  const awal = sorotSoal(t, { pembahasan: 'الحمد لله رب العالمين' }); assert.equal(awal.segmen[0].sorot.id, 0); assert.equal(gabung(awal), t);
  const akhir = sorotSoal(t, { pembahasan: 'والسلام على سيدنا محمد' }); assert.equal(akhir.segmen[akhir.segmen.length - 1].sorot.id, 0); assert.equal(gabung(akhir), t);
});
