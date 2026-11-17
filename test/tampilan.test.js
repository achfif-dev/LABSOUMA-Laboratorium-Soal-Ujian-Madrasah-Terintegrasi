import test from 'node:test';
import assert from 'node:assert/strict';
import { KATEGORI, HURUF_LATIN, HURUF_ARAB, ID_FONT, urlHuruf, TEMPLAT, URUTAN_TEMPLAT, OPSI, KUNCI_OPSI, normalisasiTampilan, efektif, adalahBawaan, cssTampilan, atributTampilan, terapkanTampilan, turunkanWarna, kontras, campur, HEX, ID_STYLE, bacaCache, tulisCache, KUNCI_CACHE, TAMPILAN_BAWAAN } from '../web/lib/tampilan.js';

// Pasangan teks-latar yang dipakai aplikasi, dengan batas kontras WCAG AA (4,5:1 teks biasa).
const PASANGAN = [['ink', 'bg', 7], ['ink', 'surface', 7], ['mute', 'surface', 4.5], ['mute', 'bg', 4.5], ['brand-fg', 'brand', 4.5], ['soft-ink', 'soft', 4.5], ['head-ink', 'head', 4.5],
  ['brand', 'surface', 4.5], ['brand', 'bg', 4.5], ['warn', 'warn-bg', 4.5], ['bad', 'bad-bg', 4.5], ['ok', 'ok-bg', 4.5]];

for (const id of URUTAN_TEMPLAT) {
  test(`template ${id}: kontras teks AA di mode terang dan gelap, semua token lengkap`, () => {
    for (const mode of ['terang', 'gelap']) {
      const p = TEMPLAT[id][mode];
      for (const [fg, bg, min] of PASANGAN) {
        assert.ok(HEX.test(p[fg]) && HEX.test(p[bg]), `${id}/${mode}: token ${fg}/${bg} bukan hex`);
        assert.ok(kontras(p[fg], p[bg]) >= min, `${id}/${mode}: ${fg} ${p[fg]} di atas ${bg} ${p[bg]} = ${kontras(p[fg], p[bg]).toFixed(2)} (< ${min})`);
      }
    }
  });
}

test('kontras tinggi: teks utama 15:1 ke atas di kedua mode', () => {
  assert.ok(kontras(TEMPLAT.kontras.terang.ink, TEMPLAT.kontras.terang.bg) >= 15);
  assert.ok(kontras(TEMPLAT.kontras.gelap.ink, TEMPLAT.kontras.gelap.bg) >= 15);
});

test('turunkanWarna: warna apa pun menghasilkan teks terbaca (AA), termasuk warna sangat terang, sangat gelap, dan kuning', () => {
  const contoh = ['#ffffff', '#000000', '#ffff00', '#ffd700', '#00ff00', '#ff00ff', '#0d6b4e', '#123456', '#fefefe', '#010101', '#7f7f7f'];
  for (let i = 0; i < 60; i++) contoh.push('#' + [0, 0, 0].map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(''));
  for (const h of contoh) for (const id of URUTAN_TEMPLAT) {
    const d = turunkanWarna(h, TEMPLAT[id]);
    for (const mode of ['terang', 'gelap']) {
      const p = { ...TEMPLAT[id][mode], ...d[mode] };
      assert.ok(kontras(p['brand-fg'], p.brand) >= 4.5, `${h}/${id}/${mode} brand-fg`);
      assert.ok(kontras(p['soft-ink'], p.soft) >= 4.5, `${h}/${id}/${mode} soft-ink`);
      assert.ok(kontras(p['head-ink'], p.head) >= 4.5, `${h}/${id}/${mode} head-ink`);
      assert.ok(kontras(p.brand, p.surface) >= 4.5, `${h}/${id}/${mode} brand di permukaan`);
    }
  }
  assert.equal(turunkanWarna('bukan-warna', TEMPLAT.zamrud).terang.brand, turunkanWarna('#0d6b4e', TEMPLAT.zamrud).terang.brand, 'masukan tak sah jatuh ke hijau bawaan');
});

test('normalisasi: templat tak dikenal jatuh ke bawaan; penyesuaian sama dengan template dibuang; nilai ngawur, kunci asing, dan prototipe diabaikan', () => {
  assert.deepEqual(normalisasiTampilan(null), TAMPILAN_BAWAAN);
  assert.deepEqual(normalisasiTampilan('x'), TAMPILAN_BAWAAN);
  assert.deepEqual(normalisasiTampilan({ templat: '__proto__' }), TAMPILAN_BAWAAN);
  assert.deepEqual(normalisasiTampilan({ templat: 'constructor', ganti: [] }), TAMPILAN_BAWAAN);
  const n = normalisasiTampilan({ templat: 'samudra', ganti: { sudut: 'bulat', huruf: 'comic', lebar: 'lebar', nav: 'samping', warnaUtama: '#ABCDEF', x: 1, mode: 42 } });
  assert.deepEqual(n, { templat: 'samudra', ganti: { lebar: 'lebar', warnaUtama: '#abcdef' } }, 'sudut/nav sama dengan template samudra -> dibuang');
  assert.deepEqual(normalisasiTampilan({ ganti: { warnaUtama: 'red; } body{display:none' } }), TAMPILAN_BAWAAN, 'warna harus #rrggbb: tidak bisa menyuntik CSS');
  assert.deepEqual(normalisasiTampilan(normalisasiTampilan({ templat: 'marun', ganti: { mode: 'gelap' } })), { templat: 'marun', ganti: { mode: 'gelap' } }, 'idempoten');
});

test('bawaan: tanpa CSS tambahan sama sekali; atribut netral', () => {
  assert.equal(cssTampilan(null), ''); assert.equal(cssTampilan({ templat: 'zamrud', ganti: {} }), '');
  assert.ok(adalahBawaan(undefined)); assert.ok(!adalahBawaan({ templat: 'tosca' })); assert.ok(!adalahBawaan({ ganti: { lebar: 'lebar' } }));
  assert.deepEqual(atributTampilan(null), { 'data-nav': 'menu', 'data-subtab': 'kapsul', 'data-templat': 'zamrud', 'data-tema-paksa': null });
});

test('CSS: tiap template menghasilkan variabel warna lengkap untuk terang, gelap otomatis, dan gelap paksa; hanya karakter aman', () => {
  for (const id of URUTAN_TEMPLAT.filter((x) => x !== 'zamrud')) {
    const css = cssTampilan({ templat: id });
    assert.ok(css.includes(`--brand:${TEMPLAT[id].terang.brand}`) && css.includes(`--brand:${TEMPLAT[id].gelap.brand}`), id);
    assert.ok(css.includes('@media (prefers-color-scheme: dark){:root:not([data-theme="light"])') && css.includes(':root[data-theme="dark"]'), id);
    assert.ok(!/[<>]|url\(|@import|expression|javascript:/i.test(css), `${id}: CSS tidak memuat konstruksi berbahaya`);
  }
  const marun = cssTampilan({ templat: 'marun' }); assert.match(marun, /font-family:Georgia/); assert.match(marun, /--r-xl:4px/);
  const g = cssTampilan({ templat: 'grafit' }); assert.match(g, /html\{font-size:14\.5px\}/); assert.match(g, /max-width:88rem/); assert.match(g, /\.pattern\{background-image:none/); assert.match(g, /box-shadow:none/);
  const lega = cssTampilan({ templat: 'zamrud', ganti: { kepadatan: 'lega', lebar: 'sempit', sudut: 'bulat' } });
  assert.ok(!lega.includes('--brand:'), 'tanpa perubahan warna, tidak ada variabel warna'); assert.match(lega, /font-size:17px/); assert.match(lega, /max-width:56rem/); assert.match(lega, /--r-2xl:1\.5rem/);
  assert.match(cssTampilan({ ganti: { warnaUtama: '#7c3aed' } }), /--brand:#[0-9a-f]{6}/);
});

test('efektif: penyesuaian menimpa template; warna utama menimpa keluarga merek tetapi bukan latar; mode dan atribut', () => {
  const e = efektif({ templat: 'samudra', ganti: { nav: 'menu', subtab: 'kapsul', mode: 'gelap', warnaUtama: '#7c3aed' } });
  assert.equal(e.nav, 'menu'); assert.equal(e.sudut, 'bulat'); assert.equal(e.mode, 'gelap');
  assert.notEqual(e.terang.brand, TEMPLAT.samudra.terang.brand); assert.equal(e.terang.bg, TEMPLAT.samudra.terang.bg);
  assert.deepEqual(atributTampilan({ templat: 'samudra', ganti: { mode: 'terang' } }), { 'data-nav': 'samping', 'data-subtab': 'kiri', 'data-templat': 'samudra', 'data-tema-paksa': 'light' });
  for (const k of KUNCI_OPSI) assert.ok(Object.keys(OPSI[k].nilai).includes(TEMPLAT.zamrud[k]), `bawaan ${k} ada di pilihan`);
  for (const id of URUTAN_TEMPLAT) for (const k of KUNCI_OPSI) assert.ok(Object.hasOwn(OPSI[k].nilai, TEMPLAT[id][k]), `${id}.${k}`);
});

/** DOM tiruan minimal: elemen dilacak menurut id (style kustom dan link font). */
function dokTiruan() {
  const attr = new Map(); const el = new Map(); const meta = { c: '', setAttribute(k, v) { if (k === 'content') this.c = v; } };
  return {
    attr, el, meta,
    get style() { return el.get(ID_STYLE) || null; },
    documentElement: { setAttribute: (k, v) => attr.set(k, v), removeAttribute: (k) => attr.delete(k) },
    head: { appendChild: (e) => { e.remove = () => el.delete(e.id); el.set(e.id, e); } },
    getElementById: (id) => el.get(id) || null,
    createElement: () => ({ id: '', textContent: '' }),
    querySelector: () => meta,
  };
}
test('terapkanTampilan: memasang, memperbarui satu elemen style, dan mencopotnya saat kembali ke bawaan; mode paksa', () => {
  const d = dokTiruan();
  terapkanTampilan({ templat: 'marun', ganti: { mode: 'gelap' } }, d);
  assert.ok(d.style && d.style.id === ID_STYLE && d.style.textContent.includes('--brand:'));
  assert.equal(d.attr.get('data-theme'), 'dark'); assert.equal(d.attr.get('data-nav'), 'menu'); assert.equal(d.attr.get('data-templat'), 'marun'); assert.equal(d.meta.c, TEMPLAT.marun.terang.head);
  const el = d.style; terapkanTampilan({ templat: 'tosca' }, d); assert.equal(d.style, el, 'elemen yang sama dipakai ulang');
  assert.equal(d.attr.has('data-theme'), false);
  terapkanTampilan(null, d); assert.equal(d.style, null); assert.equal(d.attr.get('data-templat'), 'zamrud');
  terapkanTampilan({ templat: 'tosca' }, null); // tanpa dokumen (server): tidak melempar
});

test('cache perangkat: pulang-pergi, rusak/penuh/diblokir tidak melempar, isi dinormalkan', () => {
  const peta = new Map(); const st = { getItem: (k) => (peta.has(k) ? peta.get(k) : null), setItem: (k, v) => peta.set(k, v) };
  tulisCache({ templat: 'pasir', ganti: { lebar: 'lebar', x: 1 } }, st);
  assert.deepEqual(bacaCache(st), { templat: 'pasir', ganti: { lebar: 'lebar' } });
  peta.set(KUNCI_CACHE, '{rusak'); assert.deepEqual(bacaCache(st), TAMPILAN_BAWAAN);
  peta.set(KUNCI_CACHE, JSON.stringify({ templat: 'x', ganti: { warnaUtama: '</style>' } })); assert.deepEqual(bacaCache(st), TAMPILAN_BAWAAN);
  assert.doesNotThrow(() => tulisCache({}, { setItem: () => { throw new Error('penuh'); } }));
  assert.deepEqual(bacaCache({ getItem: () => { throw new Error('diblokir'); } }), TAMPILAN_BAWAAN);
  assert.deepEqual(bacaCache(null), TAMPILAN_BAWAAN);
});

test('huruf: pilihan Latin dan Arab lengkap, tiap huruf punya keluarga dan generik; Google hanya untuk yang belum dimuat index.html', () => {
  for (const [k, v] of [...Object.entries(HURUF_LATIN), ...Object.entries(HURUF_ARAB)]) {
    assert.ok(v.label && v.famili && ['serif', 'sans-serif'].includes(v.generik), k);
    assert.ok(v.google === null || /^[A-Za-z+]+:wght@[\d;]+$/.test(v.google), `${k}: parameter Google Fonts`);
  }
  assert.ok(Object.keys(HURUF_LATIN).length >= 10 && Object.keys(HURUF_ARAB).length >= 5);
  assert.equal(urlHuruf(null), '', 'bawaan: tidak ada unduhan');
  assert.equal(urlHuruf({ ganti: { huruf: 'sistem', hurufArab: 'scheherazade' } }), '', 'font sistem/yang sudah dimuat tidak perlu diunduh');
  assert.equal(urlHuruf({ ganti: { huruf: 'inter' } }), 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  assert.match(urlHuruf({ ganti: { huruf: 'ibmplex', hurufArab: 'kufi' } }), /^https:\/\/fonts\.googleapis\.com\/css2\?family=IBM\+Plex\+Sans:wght@[\d;]+&family=Noto\+Kufi\+Arabic:wght@[\d;]+&display=swap$/);
  assert.ok(Object.values(HURUF_LATIN).concat(Object.values(HURUF_ARAB)).every((v) => !v.google || /^[\w+:@;=.-]+$/.test(v.google)), 'hanya karakter aman di URL');
});

test('huruf: CSS menaruh huruf Arab sebelum jenis generik, menimpa kelas Arab hanya bila huruf Arab diganti, dan bawaan tetap kosong', () => {
  assert.equal(cssTampilan({ ganti: {} }), '');
  const a = cssTampilan({ ganti: { huruf: 'lora' } });
  assert.match(a, /font-family:'Lora','Amiri','Scheherazade New','Traditional Arabic',serif/); assert.ok(!a.includes('[lang="ar"]'), 'huruf Arab tidak diubah: kelas Arab tidak ditimpa');
  const b = cssTampilan({ ganti: { hurufArab: 'naskh' } });
  assert.match(b, /font-family:'Plus Jakarta Sans','Noto Naskh Arabic','Amiri',sans-serif/); assert.match(b, /html \.ar,[^{]*\{font-family:'Noto Naskh Arabic','Amiri',serif\}/);
  const c = cssTampilan({ templat: 'marun', ganti: { huruf: 'merriweather', hurufArab: 'kufi' } });
  assert.match(c, /'Merriweather','Noto Kufi Arabic','Amiri',serif/); assert.ok(!/[<>]|url\(|@import/.test(c));
  assert.deepEqual(normalisasiTampilan({ ganti: { huruf: 'comic-sans', hurufArab: 'nastaliq' } }), TAMPILAN_BAWAAN, 'nilai tak dikenal dibuang');
  assert.deepEqual(normalisasiTampilan({ ganti: { huruf: 'jakarta', hurufArab: 'amiri' } }), TAMPILAN_BAWAAN, 'sama dengan template: dibuang');
});

test('huruf: terapkanTampilan memasang, memperbarui, dan mencopot link font; style dan link tidak saling menimpa', () => {
  const d = dokTiruan();
  terapkanTampilan({ ganti: { huruf: 'poppins', hurufArab: 'naskh' } }, d);
  assert.ok(d.el.get(ID_FONT) && d.el.get(ID_FONT).rel === 'stylesheet' && /Poppins/.test(d.el.get(ID_FONT).href) && /Noto\+Naskh/.test(d.el.get(ID_FONT).href));
  assert.ok(d.style && d.style.textContent.includes('Poppins'), 'style tetap ada');
  const ln = d.el.get(ID_FONT); terapkanTampilan({ ganti: { huruf: 'nunito' } }, d);
  assert.equal(d.el.get(ID_FONT), ln, 'link dipakai ulang'); assert.match(ln.href, /Nunito/); assert.ok(!/Naskh/.test(ln.href));
  terapkanTampilan({ ganti: { huruf: 'sistem' } }, d); assert.equal(d.el.has(ID_FONT), false, 'tanpa unduhan: link dicopot'); assert.ok(d.style);
  terapkanTampilan(null, d); assert.equal(d.el.size, 0);
});

test('kategori: setiap template punya kategori yang terdaftar; tiap kategori terisi; urutan memuat semua template tepat sekali', () => {
  const kat = new Set(KATEGORI.map((k) => k.id));
  assert.equal(new Set(URUTAN_TEMPLAT).size, URUTAN_TEMPLAT.length); assert.deepEqual([...URUTAN_TEMPLAT].sort(), Object.keys(TEMPLAT).sort());
  for (const id of URUTAN_TEMPLAT) { assert.ok(kat.has(TEMPLAT[id].kategori), `${id}: kategori`); assert.ok(TEMPLAT[id].label && TEMPLAT[id].deskripsi, id); }
  for (const k of KATEGORI) assert.ok(URUTAN_TEMPLAT.some((id) => TEMPLAT[id].kategori === k.id), `kategori ${k.id} kosong`);
  assert.ok(URUTAN_TEMPLAT.filter((id) => TEMPLAT[id].kategori === 'minimalis').length >= 3);
  assert.equal(new Set(URUTAN_TEMPLAT.map((id) => TEMPLAT[id].label)).size, URUTAN_TEMPLAT.length, 'nama template unik');
  assert.equal(URUTAN_TEMPLAT.length, 18);
});

test('letak menu dan sub-tab: sub-tab di kiri memaksa menu samping; rel ikon dan garis dikenali; nilai asing dibuang', () => {
  assert.equal(efektif({ ganti: { subtab: 'kiri' } }).nav, 'samping', 'zamrud + sub-tab kiri -> menu samping');
  assert.equal(efektif({ ganti: { subtab: 'kiri', nav: 'rel' } }).nav, 'samping', 'rel terlalu sempit untuk daftar sub-tab');
  assert.equal(efektif({ ganti: { nav: 'rel' } }).nav, 'rel'); assert.equal(efektif({ ganti: { nav: 'rel' } }).subtab, 'kapsul');
  assert.equal(efektif({ templat: 'putih' }).subtab, 'garis');
  assert.equal(efektif({ templat: 'malam' }).mode, 'gelap'); assert.equal(atributTampilan({ templat: 'malam' })['data-tema-paksa'], 'dark');
  assert.deepEqual(normalisasiTampilan({ ganti: { nav: 'bawah', subtab: 'atas' } }), TAMPILAN_BAWAAN);
  assert.equal(atributTampilan({ templat: 'senja' })['data-nav'], 'rel');
});
