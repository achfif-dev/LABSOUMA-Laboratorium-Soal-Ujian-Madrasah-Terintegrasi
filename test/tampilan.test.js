import test from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLAT, URUTAN_TEMPLAT, OPSI, KUNCI_OPSI, normalisasiTampilan, efektif, adalahBawaan, cssTampilan, atributTampilan, terapkanTampilan, turunkanWarna, kontras, campur, HEX, ID_STYLE, bacaCache, tulisCache, KUNCI_CACHE, TAMPILAN_BAWAAN } from '../web/lib/tampilan.js';

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
  assert.deepEqual(atributTampilan(null), { 'data-nav': 'menu', 'data-templat': 'zamrud', 'data-tema-paksa': null });
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
  const e = efektif({ templat: 'samudra', ganti: { nav: 'menu', mode: 'gelap', warnaUtama: '#7c3aed' } });
  assert.equal(e.nav, 'menu'); assert.equal(e.sudut, 'bulat'); assert.equal(e.mode, 'gelap');
  assert.notEqual(e.terang.brand, TEMPLAT.samudra.terang.brand); assert.equal(e.terang.bg, TEMPLAT.samudra.terang.bg);
  assert.deepEqual(atributTampilan({ templat: 'samudra', ganti: { mode: 'terang' } }), { 'data-nav': 'samping', 'data-templat': 'samudra', 'data-tema-paksa': 'light' });
  for (const k of KUNCI_OPSI) assert.ok(Object.keys(OPSI[k].nilai).includes(TEMPLAT.zamrud[k]), `bawaan ${k} ada di pilihan`);
  for (const id of URUTAN_TEMPLAT) for (const k of KUNCI_OPSI) assert.ok(Object.hasOwn(OPSI[k].nilai, TEMPLAT[id][k]), `${id}.${k}`);
});

/** DOM tiruan minimal. */
function dokTiruan() {
  const attr = new Map(); let style = null; const meta = { c: '', setAttribute(k, v) { if (k === 'content') this.c = v; } };
  return {
    attr, get style() { return style; }, meta,
    documentElement: { setAttribute: (k, v) => attr.set(k, v), removeAttribute: (k) => attr.delete(k) },
    head: { appendChild: (el) => { style = el; el.remove = () => { style = null; }; } },
    getElementById: (id) => (id === ID_STYLE ? style : null),
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
