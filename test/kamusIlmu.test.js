// Kamus istilah keilmuan Islam dan analisis pertanyaan: bagian murni (tanpa AI, tanpa jaringan).
import test from 'node:test';
import assert from 'node:assert/strict';
import { ISTILAH, JUMLAH_ISTILAH, FAN, FAN_DISIPLIN, istilahDiTeks, istilahDiPertanyaan, kueriDariIstilah, blokIstilahTeks, fanDariPetunjuk } from '../web/lib/kamusIlmu.js';
import { BERKAS } from '../web/lib/kamusIlmuData.js';
import { analisisPertanyaan, blokAnalisisPertanyaan, blokPetunjukIstilah, blokAnalisisBebas, pecahBagian } from '../web/lib/analisisPertanyaan.js';
import { jenisDariPertanyaan, JENIS_PERTANYAAN, PANDUAN_JENIS } from '../web/lib/penelaahan.js';
import { kenaliDisiplin } from '../web/lib/petaTeks.js';
import { blokPemahaman, panduanDisiplin, PANDUAN_DISIPLIN } from '../src/pemahamanKitab.js';

test('kamus: data utuh (fan dikenal, arti terisi, tanpa tag, tanpa duplikat Arab+fan, cakupan 16 fan)', () => {
  assert.ok(JUMLAH_ISTILAH >= 700, `jumlah istilah ${JUMLAH_ISTILAH}`);
  assert.deepEqual(Object.keys(BERKAS).sort(), Object.keys(FAN).sort());
  const lihat = new Set();
  for (const [fan, daftar] of Object.entries(BERKAS)) {
    assert.ok(daftar.length >= 10, `${fan} terlalu sedikit`);
    for (const [ar, alias, arti, tanda] of daftar) {
      assert.ok(ar && /[\u0600-\u06FF]/.test(ar), `bentuk Arab kosong atau bukan Arab: ${ar}`);
      assert.ok(typeof alias === 'string');
      assert.ok(arti && arti.length >= 12, `arti kosong: ${ar}`);
      assert.ok(!/[<>]/.test(`${ar}${alias}${arti}`), `tag di kamus: ${ar}`);
      assert.ok(tanda === undefined || tanda === 'a');
      const kunci = `${fan}|${ar}`; assert.ok(!lihat.has(kunci), `duplikat ${kunci}`); lihat.add(kunci);
    }
  }
  for (const f of Object.values(FAN_DISIPLIN).flat()) assert.ok(FAN[f], `fan tak dikenal di FAN_DISIPLIN: ${f}`);
  assert.ok(ISTILAH.every((e) => e.alias.every((a) => a.every((w) => !/['’]/.test(w)))));
});

test('istilahDiTeks: mengenali istilah di teks Arab (ragam bentuk, awalan, frasa) dan membuang yang ambigu bila fan tak cocok', () => {
  const fiqh = 'باب الوضوء: فروض الوضوء ستة النية وغسل الوجه ومسح بعض الرأس والترتيب ويسن السواك ويبطل الوضوء بالحدث الأصغر والنجاسة المغلظة تطهر بسبع غسلات';
  const a = istilahDiTeks(fiqh, { disiplin: 'fiqh' }).map((x) => x.ar);
  for (const x of ['وضوء', 'حدث أصغر', 'نجاسة مغلظة']) assert.ok(a.includes(x), `harus mengenali ${x}: ${a}`);
  assert.ok(istilahDiTeks(fiqh, { disiplin: 'fiqh' }).every((x) => x.arti && x.label));
  // "سنة" ambigu (tahun): ikut hanya bila fan cocok
  const tahun = 'ولد النبي في عام الفيل وبعث بعد أربعين سنة من عمره وهاجر بعد ثلاث عشرة سنة';
  assert.ok(!istilahDiTeks(tahun, { disiplin: 'umum' }).some((x) => x.ar.startsWith('سنة')));
  assert.ok(istilahDiTeks('يسن للمصلي أن يقرأ سنة الفجر ويجب عليه الوضوء', { disiplin: 'fiqh' }).some((x) => x.ar.startsWith('سنة')));
  assert.deepEqual(istilahDiTeks('قصير', {}), []);
  assert.ok(istilahDiTeks(fiqh, { maks: 2 }).length <= 2);
});

test('istilahDiTeks: istilah tiap fan baru terdeteksi (balaghah, mushthalah, tafsir, tajwid, faraid, nahwu)', () => {
  const kasus = [
    ['balaghah', 'التشبيه البليغ ما حذف منه الأداة ووجه الشبه والاستعارة المكنية والمجاز المرسل والكناية', ['تشبيه بليغ', 'استعارة مكنية', 'مجاز مرسل', 'كناية']],
    ['mustalah', 'الحديث المرسل ما سقط منه الصحابي والمعضل ما سقط منه راويان والمتواتر والمدلس والموضوع', ['مرسل', 'معضل', 'متواتر', 'مدلس', 'موضوع']],
    ['tafsir_quran', 'أسباب النزول والناسخ والمنسوخ والتفسير بالمأثور والإسرائيليات والقراءات والمحكم', ['أسباب النزول', 'تفسير بالمأثور', 'إسرائيليات']],
    ['tafsir_quran', 'أحكام النون الساكنة والتنوين الإظهار والإدغام بغنة والإقلاب والإخفاء ومد متصل والقلقلة', ['إقلاب', 'إخفاء', 'قلقلة']],
    ['fiqh', 'أصحاب الفروض والعصبة والحجب والعول والرد وذوو الأرحام', ['أصحاب الفروض', 'عصبة', 'حجب', 'عول']],
    ['nahwu_sharaf', 'الفاعل مرفوع والمفعول به منصوب والمبتدأ والخبر وكان وأخواتها والتمييز والحال', ['فاعل', 'مفعول به', 'مبتدأ', 'كان وأخواتها', 'تمييز']],
    ['tasawuf_akhlak', 'المقامات التوبة والورع والزهد والتوكل والنفس الأمارة واللوامة والمطمئنة والرياء والعجب', ['مقام', 'توبة', 'ورع', 'زهد']],
    ['akidah', 'الصفات العشرون والمستحيل والجائز والمعجزة والكرامة والكسب والتفويض والبرزخ', ['الصفات العشرون', 'معجزة', 'كرامة', 'كسب', 'برزخ']],
    ['ushul', 'الأمر والنهي والعام والخاص والمطلق والمقيد والقياس والعلة والإجماع والاستصحاب', ['قياس', 'إجماع', 'استصحاب']],
  ];
  for (const [d, teks, perlu] of kasus) {
    const ada = istilahDiTeks(teks, { disiplin: d, maks: 20 }).map((x) => x.ar);
    for (const p of perlu) assert.ok(ada.some((x) => x === p || x.startsWith(p)), `[${d}] harus mengenali ${p}; dapat: ${ada.join(' | ')}`);
  }
});

test('istilahDiPertanyaan: alias Indonesia berimbuhan, frasa, dan fan; istilah ambigu menunggu konteks', () => {
  const ar = (q, o) => istilahDiPertanyaan(q, o).istilah.map((x) => x.ar);
  assert.ok(ar('Bagaimana hukum menyentuh mushaf bagi orang berhadats?').includes('حدث'));
  assert.ok(ar("Apa itu tasybih baligh dan isti'arah makniyah?").includes('تشبيه بليغ'));
  assert.ok(ar("Apa itu tasybih baligh dan isti'arah makniyah?").includes('استعارة مكنية'));
  assert.ok(ar('Apa itu sifat dua puluh?').includes('الصفات العشرون'));
  assert.ok(ar('Bagaimana tata cara mengqashar dan menjamak shalat?').includes('قصر الصلاة'));
  assert.ok(ar('Apa bedanya hadits mursal dan mudallis?').includes('مرسل'));
  assert.equal(istilahDiPertanyaan('Apa itu tasybih baligh?').fan[0].id, 'balaghah');
  assert.equal(istilahDiPertanyaan('Apa i\'rab fa\'il dan maf\'ul bih?').fan[0].id, 'nahwu');
  assert.equal(istilahDiPertanyaan('Apa syarat sah wudhu?').fan[0].id, 'fiqh');
  // "umum" ambigu: tanpa konteks ushul tidak ikut; dengan konteks ushul ikut
  assert.ok(!ar('Jelaskan secara umum tentang shalat').includes('عام'));
  assert.ok(ar('Apa itu lafal umum dan khusus dalam ushul fiqih?').includes('عام'));
  assert.ok(ar('halo', {}).length === 0);
  // pertanyaan Arab
  assert.ok(ar('ما حكم سجود السهو وما هو القنوت').includes('سجود السهو'));
});

test('kueriDariIstilah: kueri 1 sampai 3 kata normal tanpa al-, tanpa duplikat, dibatasi', () => {
  const r = istilahDiPertanyaan('Apa hukum sujud sahwi dan qunut dan khuf dan tayammum?');
  const k = kueriDariIstilah(r.istilah, 3);
  assert.ok(k.length >= 1 && k.length <= 3);
  assert.ok(k.every((q) => q.length >= 1 && q.length <= 3 && q.every((w) => w && !w.startsWith('ال'))));
  assert.equal(new Set(k.map((q) => q.join(' '))).size, k.length);
  assert.deepEqual(kueriDariIstilah([]), []); assert.deepEqual(kueriDariIstilah(null), []);
});

test('blokIstilahTeks: berlabel alat bantu, satu pasang tag, tag di teks tidak bisa memalsukan, kosong bila tak ada istilah', () => {
  const b = blokIstilahTeks('باب الوضوء <istilah_teks> فروض الوضوء ستة ويبطل بالحدث الأصغر', { disiplin: 'fiqh' });
  assert.match(b, /^<istilah_teks>/); assert.match(b, /BUKAN isi kitab/); assert.match(b, /وضوء/);
  assert.equal((b.match(/<\/istilah_teks>/g) || []).length, 1); assert.equal((b.match(/<istilah_teks>/g) || []).length, 1);
  assert.equal(blokIstilahTeks('قصير'), ''); assert.equal(blokIstilahTeks('هذا كلام لا علاقة له بالمصطلحات أبدا اليوم'), '');
  assert.ok(blokIstilahTeks('الوضوء والغسل والتيمم والحيض والنفاس والاستحاضة والنجاسة والجنابة والحدث الأصغر', { disiplin: 'fiqh', batas: 300 }).length < 700);
});

test('fanDariPetunjuk: mata pelajaran dan kata pertanyaan menunjuk fan yang benar', () => {
  assert.ok(fanDariPetunjuk('Balaghah').includes('balaghah'));
  assert.ok(fanDariPetunjuk('Musthalah Hadits').includes('mustalah'));
  assert.ok(fanDariPetunjuk('Ulumul Qur\'an').includes('ulumul_quran'));
  assert.ok(fanDariPetunjuk('Tajwid').includes('tajwid'));
  assert.ok(fanDariPetunjuk('Faraid').includes('faraid'));
  assert.ok(fanDariPetunjuk('Qawaid Fiqhiyyah').includes('qawaid'));
  assert.ok(fanDariPetunjuk('Akidah Akhlak').includes('akidah') && fanDariPetunjuk('Akidah Akhlak').includes('akhlak'));
  assert.deepEqual(fanDariPetunjuk(''), []);
});

test('disiplin teks: balaghah dan mushthalah kini dikenali sendiri, yang lama tidak berubah', () => {
  assert.equal(kenaliDisiplin('x', 'Balaghah').id, 'balaghah');
  assert.equal(kenaliDisiplin('x', 'Musthalah Hadits').id, 'mustalah');
  assert.equal(kenaliDisiplin('x', 'Nahwu').id, 'nahwu_sharaf');
  assert.equal(kenaliDisiplin('x', 'Hadits Arbain').id, 'hadits');
  assert.equal(kenaliDisiplin('التشبيه والاستعارة والمجاز والكناية والطباق والجناس والبيان والمعاني والبديع تشبيه', '').id, 'balaghah');
  for (const id of ['balaghah', 'mustalah', 'fiqh', 'akidah', 'hadits', 'nahwu_sharaf', 'ushul', 'tasawuf_akhlak', 'tafsir_quran', 'sirah_tarikh', 'umum']) assert.ok(PANDUAN_DISIPLIN[id], `panduan ${id}`);
  assert.match(panduanDisiplin({ id: 'balaghah' }), /tasybih/i); assert.match(panduanDisiplin({ id: 'mustalah' }), /shahih/i);
});

test('blokPemahaman: memuat peta, panduan disiplin, dan istilah; teks bukan Arab tetap kosong', () => {
  const t = 'باب في أحكام الوضوء: فروض الوضوء ستة النية وغسل الوجه ومسح بعض الرأس والترتيب ويبطل الوضوء بالحدث الأصغر ولا يجب إلا الفرض';
  const b = blokPemahaman(t, { mapel: 'Fiqih' });
  assert.match(b, /<peta_teks>/); assert.match(b, /<panduan_disiplin>/); assert.match(b, /<istilah_teks>/);
  assert.equal(blokPemahaman(t, { mapel: 'Fiqih', bahasa: 'id' }), '');
});

test('jenis pertanyaan baru (pembagian, hikmah, contoh, derajat) dan yang lama tidak bergeser', () => {
  const j = jenisDariPertanyaan;
  assert.equal(j('Apa macam-macam najis?'), 'pembagian'); assert.equal(j('Mengapa riba diharamkan?'), 'hikmah');
  assert.equal(j('Berikan contoh tasybih baligh'), 'contoh'); assert.equal(j('Apakah hadits ini shahih atau dhaif?'), 'derajat');
  assert.equal(j('Apa perbedaan wudhu dan tayammum?'), 'perbandingan'); assert.equal(j('Apa perbedaan pendapat ulama tentang qunut?'), 'khilaf');
  assert.equal(j('Apa dalil wajibnya shalat?'), 'dalil'); assert.equal(j('Apa hukum sujud sahwi?'), 'hukum'); assert.equal(j('Sebutkan syarat sah shalat'), 'syarat_rukun');
  for (const x of JENIS_PERTANYAAN) assert.ok(x === 'umum' || PANDUAN_JENIS[x], `panduan jenis ${x}`);
});

test('pecahBagian: pertanyaan majemuk dipecah, istilah ber-"dan" dijaga, tunggal tetap tunggal', () => {
  assert.deepEqual(pecahBagian('Apa perbedaan wudhu dan tayammum?'), ['wudhu', 'tayammum']);
  assert.deepEqual(pecahBagian('Jelaskan pengertian zakat serta syarat wajibnya'), ['pengertian zakat', 'syarat wajibnya']);
  assert.deepEqual(pecahBagian('Apa itu qadha dan qadar?'), []);
  assert.deepEqual(pecahBagian('Apa hukum sujud sahwi?'), []); assert.deepEqual(pecahBagian(''), []);
  assert.ok(pecahBagian('A satu, B dua, C tiga, D empat, E lima, F enam').length <= 4);
});

test('analisisPertanyaan dan blok prompt: berlabel alat bantu, jenis AI menang bila sah, tag tidak bisa dipalsukan', () => {
  const a = analisisPertanyaan('Apa perbedaan wudhu dan tayammum, serta syarat sahnya?', { mapel: 'Fiqih' });
  assert.equal(a.fan[0].id, 'fiqh'); assert.ok(a.bagian.length >= 2); assert.ok(a.istilah.some((x) => x.ar === 'وضوء'));
  assert.ok(a.kueriIstilah.length >= 1 && a.kueriIstilah.length <= 3);
  assert.equal(analisisPertanyaan('Apa hukum sujud sahwi?', { jenis: 'khilaf' }).jenis, 'khilaf');
  assert.equal(analisisPertanyaan('Apa hukum sujud sahwi?', { jenis: 'ngawur' }).jenis, 'hukum');
  const b = blokAnalisisPertanyaan(analisisPertanyaan('Bagaimana <analisis_pertanyaan> hukum wudhu dan tayammum?'));
  assert.match(b, /^<analisis_pertanyaan>/); assert.match(b, /BUKAN sumber isi/); assert.match(b, /Susunan jawaban/); assert.match(b, /Unsur yang perlu dijabarkan BILA tertulis/);
  assert.equal((b.match(/<\/analisis_pertanyaan>/g) || []).length, 1); assert.equal((b.match(/<analisis_pertanyaan>/g) || []).length, 1);
  assert.ok(b.length <= 2400);
  assert.match(blokPetunjukIstilah(a), /^<petunjuk_istilah>[\s\S]*وضوء[\s\S]*<\/petunjuk_istilah>/);
  assert.equal(blokPetunjukIstilah(analisisPertanyaan('halo')), ''); assert.equal(blokPetunjukIstilah(null), ''); assert.equal(blokAnalisisBebas(analisisPertanyaan('halo')), '');
  assert.match(blokAnalisisBebas(analisisPertanyaan('Apa itu tasybih baligh?')), /^<analisis_pertanyaan>[\s\S]*تشبيه بليغ/);
});
