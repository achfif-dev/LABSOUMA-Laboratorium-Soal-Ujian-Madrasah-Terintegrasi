// Regresi: pertanyaan definisi ("apa yang dinamakan shalat") gagal menemukan halaman definisi karena kueri berisi kata umum,
// bonus frasa mati (awalan "ال"), dan varian sampah dari كتاب -> تاب. Korpus sintetis, bukan teks kitab asli.
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalCari, adaFrasa, peringkatHalaman } from '../web/lib/cariKitab.js';
import { peringkatBeragam, perluasKueri, varianDefinisi, jenisDariPertanyaan } from '../web/lib/penelaahan.js';
import { bersihkanRencana } from '../web/lib/telaahKitab.js';
import { analisisPertanyaan } from '../web/lib/analisisPertanyaan.js';

const isi = (n, kata) => Array.from({ length: n }, (_, i) => kata[i % kata.length]).join(' ');
function korpus() {
  const h = [];
  for (let i = 1; i <= 300; i++) h.push({ s: i, h: i, j: 1, t: normalCari(`${i % 3 === 0 ? 'الصلاة والصلاة فيها في الصلاة ويشترط في الصلاة' : 'في المسألة وفي الباب'} ${isi(80, ['الماء', 'الطهارة', 'في', 'يجب', 'على', 'من'])}`) });
  h[149].t = normalCari(`كتاب الصلاة هي لغة الدعاء وشرعا أقوال وأفعال مفتتحة بالتكبير مختتمة بالتسليم ${isi(60, ['فرض', 'يوم', 'وليلة'])}`);
  h[250].t = normalCari(`كتاب اللقطة هي لغة الشيء الملتقط وشرعا ما وجد من حق ضائع ويجب تعريف اللقطة في الأسواق ${isi(60, ['في', 'سنة', 'تعريف'])}`);
  h[251].t = normalCari(`باب تعريف الملتقط وشرط التعريف في اللغة العرفية ${isi(60, ['في', 'تعريف'])}`);
  return h;
}

test('bersihkanRencana membuang kata umum (في, تعريف) tetapi mempertahankan istilah dan kata hukum', () => {
  const r = bersihkanRencana(['كتاب الصلاة', 'الصلاة في الشرع', 'الصلاة في اللغة', 'الصلاة تعريف', 'في', 'تعريف']);
  assert.deepEqual(r, [['كتاب', 'الصلاه'], ['الصلاه', 'الشرع'], ['الصلاه', 'اللغه'], ['الصلاه']]);
});

test('bonus frasa bekerja untuk kueri ber-"ال" (sebelumnya selalu gagal)', () => {
  assert.equal(adaFrasa(normalCari('كتاب الصلاة هي لغة'), ['كتاب', 'صلاه']), true);
  assert.equal(adaFrasa(normalCari('وكتاب والصلاة'), ['كتاب', 'صلاه']), true);
  assert.equal(adaFrasa(normalCari('كتاب الزكاة والصلاة'), ['كتاب', 'صلاه']), false);
});

test('perluasKueri tidak mengubah كتاب menjadi تاب (varian توبة/استغفار sampah)', () => {
  const v = perluasKueri([['كتاب', 'الصلاه']]).map((q) => q.join(' '));
  assert.ok(!v.some((x) => x.includes('توبه') || x.includes('استغفار')), v.join(' | '));
});

test('varianDefinisi: istilah inti + لغة / شرعا, bukan kata umum', () => {
  const v = varianDefinisi([['كتاب', 'الصلاه'], ['الصلاه', 'الشرع'], ['الصلاه', 'اللغه'], ['الصلاه']]).map((q) => q.join(' '));
  assert.deepEqual(v, ['صلاه لغه', 'صلاه شرعا']);
  assert.deepEqual(varianDefinisi([['كتاب'], ['باب']]), []);
});

test('definisi shalat: halaman definisi peringkat 1, bukan bab luqathah yang memuat تعريف dan في', () => {
  const h = korpus();
  const kueri = bersihkanRencana(['كتاب الصلاة', 'الصلاة في الشرع', 'الصلاة في اللغة', 'الصلاة تعريف']);
  const r = peringkatBeragam(h, kueri, { k: 6, varian: varianDefinisi(kueri) });
  assert.equal(r[0].seq, 150);
  // kueri lama (sebelum perbaikan) menaruh halaman luqathah di atas halaman definisi
  const lama = peringkatBeragam(h, [['كتاب', 'الصلاه'], ['الصلاه', 'في', 'الشرع'], ['الصلاه', 'في', 'اللغه'], ['الصلاه', 'تعريف']], { k: 6 });
  assert.notEqual(lama[0].seq, 150);
  assert.equal(peringkatHalaman(h, kueri, { k: 3 })[0].seq, 150);
});

test('"apa yang dinamakan shalat" terbaca definisi dan mengenali istilah الصلاة', () => {
  for (const q of ['apa yang dinamakan shalat', 'shalat itu apa', 'apa yang disebut sholat']) assert.equal(jenisDariPertanyaan(q), 'definisi', q);
  const a = analisisPertanyaan('apa yang dinamakan shalat', { mapel: 'fiqih' });
  assert.ok(a.istilah.some((i) => i.ar.includes('صلاة')));
  assert.deepEqual(a.kueriIstilah, [['صلاه']]);
});
