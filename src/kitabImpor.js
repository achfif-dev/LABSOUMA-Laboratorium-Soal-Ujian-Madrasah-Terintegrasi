// Impor perpustakaan kitab ke Firestore (khusus admin, lewat Admin SDK). Skema: docs/SKEMA-KITAB.md (v2).
// Alur: impor-mulai (metadata + daftar isi, kitab belum aktif) -> impor-halaman (<= 100 halaman per panggilan) -> impor-selesai
// (jumlah dihitung ulang di server; baru aktif bila cocok). Klien dianggap tidak tepercaya: semua bidang divalidasi dan
// ditulis ulang dari daftar putih, hasil parse klien tidak pernah disalin mentah.
import { ApiError } from './soalService.js';
import { firestoreAdmin } from './platform.js';
import { VERSI_INDEKS, bangunPotongan } from '../web/lib/cariKitab.js';
import { BAHASA, AKSARA, aksaraBawaan } from '../web/lib/bahasa.js';

export const MAKS_HALAMAN_PER_PANGGILAN = 100;
export const MAKS_TEKS_HALAMAN = 12000;
export const MAKS_HALAMAN_KITAB = 5000;
export const MAKS_DAFTAR_ISI = 3000;
const MAKS_BATCH = 400;
export const MAZHAB = ['', 'syafii', 'hanafi', 'maliki', 'hanbali'];
export const STATUS_HAK_CIPTA = ['belum-dicek', 'domain-publik', 'izin'];
const BENTUK_MATN = ['pemisah-tatwil', 'tanpa-pemisah'];
const ANOMALI = ['duplikat', 'mundur', 'lompat'];
export const JENIS_SUMBER = ['syamilah-txt', 'syamilah-docx', 'teks-penanda', 'pdf', 'pdf-ocr', 'epub', 'epub-ocr', 'html', 'json', 'teks-virtual', 'docx-halaman'];
const RE_ID = /^[a-z0-9][a-z0-9-]{1,59}$/;

const tolak = (kode, pesan, status = 422) => { throw new ApiError(status, kode, pesan); };
const str = (v, maks, nama, { wajib = false } = {}) => {
  if (v === undefined || v === null || v === '') { if (wajib) tolak('KITAB_INVALID', `${nama} wajib diisi.`); return ''; }
  if (typeof v !== 'string') tolak('KITAB_INVALID', `${nama} harus berupa teks.`);
  if (v.length > maks) tolak('KITAB_INVALID', `${nama} terlalu panjang (maksimal ${maks} karakter).`);
  return v;
};
const bil = (v, min, maks, nama, { boleh_null = false } = {}) => {
  if ((v === null || v === undefined) && boleh_null) return null;
  if (!Number.isInteger(v) || v < min || v > maks) tolak('KITAB_INVALID', `${nama} harus bilangan bulat ${min}-${maks}.`);
  return v;
};

export const idHalaman = (seq) => `p${String(seq).padStart(5, '0')}`;

// Ruang (revisi) penyimpanan. Kitab lama menyimpan halaman di `halaman`, `cari`, `daftar/isi` (ruang kosong). Impor ulang ("timpa") atas kitab yang
// sudah siap ditulis ke ruang BARU (`halaman_r3`, `cari_r3`, `daftar/isi_r3`) sementara kitab lama tetap terbaca; baru di impor-selesai
// meta.ruang dialihkan dalam SATU penulisan dokumen. Semua pembaca (kitabBaca, kitabCari) wajib lewat pembantu ini.
const RE_RUANG = /^_r\d{1,5}$/;
export const akhiran = (meta) => (meta && typeof meta.ruang === 'string' && RE_RUANG.test(meta.ruang) ? meta.ruang : '');
export const koleksiHalaman = (kid, meta) => `kitab/${kid}/halaman${akhiran(meta)}`;
export const koleksiCari = (kid, meta) => `kitab/${kid}/cari${akhiran(meta)}`;
export const dokDaftarIsi = (kid, meta) => `kitab/${kid}/daftar/isi${akhiran(meta)}`;
const RE_SIDIK = /^[a-z0-9:-]{1,40}$/;
export function validasiSidik(v) {
  if (v === undefined || v === null || v === '') return '';
  if (typeof v !== 'string' || !RE_SIDIK.test(v)) tolak('KITAB_INVALID', 'Sidik berkas tidak valid.');
  return v;
}

export function validasiKitabId(id) {
  if (typeof id !== 'string' || !RE_ID.test(id)) tolak('KITAB_ID_INVALID', 'ID kitab hanya huruf kecil, angka, dan tanda hubung (2-60 karakter), mis. fathul-muin.');
  return id;
}

/** Metadata kitab dari klien -> objek bersih. Bidang yang tidak dikenal dibuang. */
export function validasiKitab(k) {
  if (!k || typeof k !== 'object') tolak('KITAB_INVALID', 'Metadata kitab kosong.');
  const edisi = k.edisi && typeof k.edisi === 'object' ? k.edisi : {};
  const hak = k.hakCipta && typeof k.hakCipta === 'object' ? k.hakCipta : {};
  const sumber = k.sumber && typeof k.sumber === 'object' ? k.sumber : {};
  const mazhab = str(k.mazhab, 20, 'Mazhab');
  if (!MAZHAB.includes(mazhab)) tolak('KITAB_INVALID', 'Mazhab tidak dikenal.');
  const status = str(hak.status || 'belum-dicek', 20, 'Status hak cipta');
  if (!STATUS_HAK_CIPTA.includes(status)) tolak('KITAB_INVALID', 'Status hak cipta tidak dikenal.');
  const jenisSumber = str(sumber.jenis || 'syamilah-txt', 30, 'Jenis sumber');
  if (!JENIS_SUMBER.includes(jenisSumber)) tolak('KITAB_INVALID', 'Jenis sumber tidak dikenal.');
  const bentuk = str(k.bentukMatn, 30, 'Bentuk matn', { wajib: true });
  if (!BENTUK_MATN.includes(bentuk)) tolak('KITAB_INVALID', 'Bentuk matn tidak dikenal.');
  // Bahasa dan aksara: klien lama tidak mengirimnya, dan kitab lama tidak punya; keduanya dianggap Arab. Teks tidak diperiksa di sini (server hanya melihat
  // metadata pada impor-mulai); ketidakcocokan isi dengan pilihan ini sudah diperiksa klien dan hanya memengaruhi arah tampilan, bukan keamanan.
  const bahasa = str(k.bahasa, 10, 'Bahasa') || 'ar';
  if (!BAHASA.includes(bahasa)) tolak('KITAB_INVALID', 'Bahasa kitab tidak dikenal.');
  const aksara = str(k.aksara, 10, 'Aksara') || aksaraBawaan(bahasa);
  if (!AKSARA.includes(aksara)) tolak('KITAB_INVALID', 'Aksara kitab tidak dikenal.');
  if (bahasa === 'ar' && aksara !== 'arab') tolak('KITAB_INVALID', 'Kitab berbahasa Arab harus beraksara Arab.');
  return {
    judul: str(k.judul, 300, 'Judul', { wajib: true }),
    judulLatin: str(k.judulLatin, 150, 'Nama kitab (Latin)', { wajib: true }),
    pengarang: str(k.pengarang, 400, 'Pengarang'),
    wafatH: bil(k.wafatH ?? null, 1, 2000, 'Tahun wafat', { boleh_null: true }),
    fan: str(k.fan, 80, 'Fan'),
    mazhab,
    edisi: { penerbit: str(edisi.penerbit, 400, 'Penerbit'), muhaqqiq: str(edisi.muhaqqiq, 400, 'Muhaqqiq'), cetakan: str(edisi.cetakan, 400, 'Cetakan') },
    jumlahHalaman: bil(k.jumlahHalaman, 1, MAKS_HALAMAN_KITAB, 'Jumlah halaman'),
    jumlahJuz: bil(k.jumlahJuz, 1, 99, 'Jumlah juz'),
    penomoranSesuaiCetak: k.penomoranSesuaiCetak === true,
    ocrHalaman: bil(k.ocrHalaman ?? 0, 0, MAKS_HALAMAN_KITAB, 'Jumlah halaman OCR'), // halaman yang teksnya hasil OCR AI (PDF pindai); 0 = tidak ada
    halamanVirtual: k.halamanVirtual === true, // nomor halaman dibagi otomatis saat impor (bukan nomor cetak); pembaca menampilkan peringatan
    bentukMatn: bentuk,
    bahasa, aksara,
    berharakat: k.berharakat === true,
    hakCipta: { status, catatan: str(hak.catatan, 600, 'Catatan hak cipta') },
    sumber: { jenis: jenisSumber, pengunggah: str(sumber.pengunggah, 200, 'Pengunggah'), tanggalSyamilah: str(sumber.tanggalSyamilah, 100, 'Tanggal Syamilah'), rujukan: str(sumber.rujukan, 200, 'Rujukan sumber') },
    formatParser: bil(k.formatParser ?? 1, 1, 99, 'Versi parser'),
  };
}

export function validasiDaftarIsi(arr) {
  if (!Array.isArray(arr)) tolak('KITAB_INVALID', 'Daftar isi harus berupa larik.');
  if (arr.length > MAKS_DAFTAR_ISI) tolak('KITAB_INVALID', `Daftar isi terlalu panjang (maksimal ${MAKS_DAFTAR_ISI} entri).`);
  return arr.map((e, i) => {
    if (!e || typeof e !== 'object') tolak('KITAB_INVALID', `Entri daftar isi ke-${i + 1} tidak valid.`);
    return { judul: str(e.judul, 300, 'Judul daftar isi', { wajib: true }), level: bil(e.level, 1, 4, 'Level'), juz: bil(e.juz, 1, 99, 'Juz'), hal: bil(e.hal, 0, 99999, 'Halaman'), seq: bil(e.seq, 1, MAKS_HALAMAN_KITAB, 'Urutan') };
  });
}

/** Satu halaman -> dokumen bersih. `id` WAJIB sama dengan idHalaman(seq): klien tidak boleh memilih kunci lain. */
export function validasiHalaman(h, jumlahHalaman) {
  if (!h || typeof h !== 'object') tolak('KITAB_INVALID', 'Halaman tidak valid.');
  const seq = bil(h.seq, 1, jumlahHalaman, 'Urutan halaman');
  if (h.id !== idHalaman(seq)) tolak('KITAB_INVALID', `ID halaman ${seq} tidak sesuai urutannya.`);
  const teks = typeof h.teks === 'string' ? h.teks : tolak('KITAB_INVALID', `Teks halaman ${seq} harus berupa teks.`);
  if (teks.length > MAKS_TEKS_HALAMAN) tolak('KITAB_INVALID', `Teks halaman ${seq} melebihi ${MAKS_TEKS_HALAMAN} karakter.`);
  const doc = { seq, juz: bil(h.juz, 1, 99, 'Juz'), hal: bil(h.hal, 0, 99999, 'Halaman'), teks, batasMatn: bil(h.batasMatn ?? null, 0, teks.length, 'Batas matn', { boleh_null: true }) };
  if (h.bab !== undefined && h.bab !== '') doc.bab = str(h.bab, 300, 'Bab');
  if (h.ocr === true) doc.ocr = true; // teks halaman ini hasil OCR AI: bisa keliru pada huruf dan harakat
  if (h.potongan !== undefined) { // halaman cetak yang dipecah: bagian ke-`ke` dari `dari`
    const p = h.potongan && typeof h.potongan === 'object' ? h.potongan : tolak('KITAB_INVALID', `Potongan halaman ${seq} tidak valid.`);
    const dari = bil(p.dari, 2, 99, 'Jumlah bagian'); doc.potongan = { ke: bil(p.ke, 1, dari, 'Bagian ke'), dari };
  }
  if (h.nomorAnomali !== undefined) { if (!ANOMALI.includes(h.nomorAnomali)) tolak('KITAB_INVALID', 'Jenis anomali nomor tidak dikenal.'); doc.nomorAnomali = h.nomorAnomali; }
  return doc;
}

async function hitung(col) {
  if (typeof col.count === 'function') return (await col.count().get()).data().count;
  return (await col.select().get()).docs.length;
}

async function hapusKoleksi(db, path) {
  const snap = await db.collection(path).select().get();
  for (let i = 0; i < snap.docs.length; i += MAKS_BATCH) {
    const b = db.batch();
    snap.docs.slice(i, i + MAKS_BATCH).forEach((d) => b.delete(d.ref));
    await b.commit();
  }
  return snap.docs.length;
}
// Halaman, indeks pencarian, dan daftar isi satu ruang dihapus bersama; yang dilaporkan hanya jumlah halaman.
async function hapusHalaman(db, kid, meta) {
  const n = await hapusKoleksi(db, koleksiHalaman(kid, meta));
  await hapusKoleksi(db, koleksiCari(kid, meta));
  await db.doc(dokDaftarIsi(kid, meta)).delete();
  return n;
}

/** Urutan halaman yang sudah tertulis di satu koleksi halaman (untuk melanjutkan impor yang terputus). */
async function seqTertulis(db, path) {
  const snap = await db.collection(path).select().get();
  return snap.docs.map((d) => Number((/^p(\d{5})$/.exec(d.id) || [])[1])).filter((n) => Number.isInteger(n) && n >= 1).sort((a, b) => a - b);
}

const t0 = (sekarang) => sekarang();
/** Sisa penambahan jilid yang ditinggalkan: halaman dan potongan indeks dengan urutan di atas `offset` (jilid yang sah tidak pernah menyentuhnya). */
async function bersihkanEkor(db, kid, meta, offset) {
  const hapusId = async (path, ambilSeq) => {
    const snap = await db.collection(path).select().get();
    const target = snap.docs.filter((d) => { const n = ambilSeq(d.id); return Number.isInteger(n) && n > offset; });
    for (let i = 0; i < target.length; i += 400) { const b = db.batch(); target.slice(i, i + 400).forEach((d) => b.delete(d.ref)); await b.commit(); }
  };
  await hapusId(koleksiHalaman(kid, meta), (id) => { const m = /^p(\d{5})$/.exec(id); return m ? Number(m[1]) : NaN; });
  await hapusId(koleksiCari(kid, meta), (id) => { const m = /^c(\d{5})$/.exec(id); return m ? Number(m[1]) : NaN; });
}

const ringkasMeta = (id, d) => ({
  id, jumlahJuz: d.jumlahJuz || 1, judul: d.judul, judulLatin: d.judulLatin, pengarang: d.pengarang, jumlahHalaman: d.jumlahHalaman, status: d.status, bahasa: d.bahasa || 'ar', aksara: d.aksara || 'arab',
  aktif: d.aktif === true, revisi: d.revisi || 1, hakCipta: d.hakCipta?.status || 'belum-dicek', bentukMatn: d.bentukMatn, diubahAt: d.diubahAt || '',
});

/** Satu pintu untuk semua aksi impor. `uid` = admin yang memanggil. */
export async function aksiImpor(body, uid, { sekarang = () => new Date().toISOString() } = {}) {
  const b = body && typeof body === 'object' ? body : {};
  const { db } = await firestoreAdmin();
  const metaRef = (kid) => db.doc(`kitab/${kid}`);

  if (b.aksi === 'impor-daftar') {
    const snap = await db.collection('kitab').get();
    return { kitab: snap.docs.slice(0, 200).map((d) => ringkasMeta(d.id, d.data())) };
  }

  const kid = validasiKitabId(b.kitabId);
  const ref = metaRef(kid);
  const berjalanRef = db.doc(`kitab/${kid}/impor/berjalan`);
  const ada = await ref.get();
  // Impor bertahap (timpa atas kitab yang sudah siap): metadata run baru ada di impor/berjalan, kitab lama tidak disentuh sampai impor-selesai.
  const brj = ada.exists ? await berjalanRef.get() : null;
  const berjalan = brj && brj.exists ? brj.data() : null;

  if (b.aksi === 'impor-mulai') {
    const meta0 = ada.exists ? ada.data() : null;
    const sidik = validasiSidik(b.sidik);
    const mengimpor = !!meta0 && meta0.status === 'mengimpor';
    if (b.lanjut === true && (mengimpor || berjalan)) { // lanjutkan impor yang terputus: tidak ada yang dihapus
      const kitab = validasiKitab(b.kitab);
      const sasaran = berjalan || meta0;
      if (!sidik || !sasaran.sidik || sasaran.sidik !== sidik || sasaran.jumlahHalaman !== kitab.jumlahHalaman) {
        tolak('KITAB_SIDIK_BEDA', 'Berkas ini tidak sama dengan berkas pada impor yang terputus, jadi tidak bisa dilanjutkan. Pilih berkas yang sama persis dengan pengaturan baca yang sama, atau impor ulang dengan \"timpa\" tanpa \"lanjutkan\".', 409);
      }
      const off = berjalan && berjalan.tambah ? berjalan.tambah.offset : 0; // jilid tambahan ditulis dengan urutan bergeser; klien memakai urutan berkasnya sendiri
      const sudah = (await seqTertulis(db, koleksiHalaman(kid, berjalan || meta0))).filter((q) => q > off && q <= off + sasaran.jumlahHalaman).map((q) => q - off);
      return { ok: true, kitabId: kid, revisi: sasaran.revisi || 1, lanjut: true, bertahap: !!berjalan && !berjalan.tambah, tambah: !!(berjalan && berjalan.tambah), sudah };
    }
    if (b.tambah === true) { // jilid berikutnya ditambahkan di belakang kitab yang sudah siap; baru terlihat pembaca saat impor-selesai menaikkan jumlahHalaman
      if (!ada.exists || meta0.status !== 'siap') tolak('KITAB_TIDAK_ADA', 'Menambah jilid hanya untuk kitab yang sudah siap. Impor jilid pertama dulu.', 404);
      const kitab = validasiKitab(b.kitab);
      const daftar = validasiDaftarIsi(b.daftarIsi);
      if ((kitab.bahasa || 'ar') !== (meta0.bahasa || 'ar') || (kitab.aksara || 'arab') !== (meta0.aksara || 'arab') || !!kitab.halamanVirtual !== !!meta0.halamanVirtual) {
        tolak('TAMBAH_TIDAK_SAMA', 'Jilid yang ditambahkan harus sama bahasa, aksara, dan jenis penomoran halamannya (nyata atau virtual) dengan kitab yang sudah ada.', 422);
      }
      const offset = meta0.jumlahHalaman;
      if (offset + kitab.jumlahHalaman > MAKS_HALAMAN_KITAB) tolak('KITAB_INVALID', `Total halaman akan ${offset + kitab.jumlahHalaman}, melebihi batas ${MAKS_HALAMAN_KITAB} per kitab.`, 422);
      const juzAwal = b.juzAwal === undefined ? (meta0.jumlahJuz || 1) + 1 : bil(b.juzAwal, 1, 99, 'Juz awal');
      if (juzAwal + (kitab.jumlahJuz || 1) - 1 > 99) tolak('KITAB_INVALID', 'Nomor juz melebihi 99.', 422);
      if (berjalan && !berjalan.tambah) await hapusHalaman(db, kid, berjalan); // sisa impor-ulang yang ditinggalkan (ruangnya bukan ruang kitab yang aktif)
      const geser = daftar.map((e) => ({ ...e, seq: e.seq + offset, juz: juzAwal + e.juz - 1 }));
      await bersihkanEkor(db, kid, meta0, offset);
      await berjalanRef.set({ tambah: { offset, juzAwal }, ruang: akhiran(meta0), revisi: meta0.revisi || 1, kitab, jumlahHalaman: kitab.jumlahHalaman, sidik, daftar: geser, mulaiAt: t0(sekarang), oleh: uid });
      return { ok: true, kitabId: kid, revisi: meta0.revisi || 1, tambah: true, offsetSeq: offset, juzAwal };
    }
    if (ada.exists && b.timpa !== true) tolak('KITAB_SUDAH_ADA', `Kitab \"${kid}\" sudah ada. Centang \"timpa\" untuk mengimpor ulang, atau \"lanjutkan\" bila impor sebelumnya terputus.`, 409);
    const kitab = validasiKitab(b.kitab);
    const daftar = validasiDaftarIsi(b.daftarIsi);
    const t = sekarang();
    if (ada.exists && meta0.status === 'siap') { // impor ulang bertahap: kitab lama tetap aktif dan terbaca selama impor
      if (berjalan && !berjalan.tambah) await hapusHalaman(db, kid, berjalan); // sisa percobaan sebelumnya (run "tambah jilid" memakai ruang kitab aktif: jangan dihapus)
      const revisi = (meta0.revisi || 1) + 1; const ruang = `_r${revisi}`;
      await berjalanRef.set({ revisi, ruang, kitab, jumlahHalaman: kitab.jumlahHalaman, sidik, mulaiAt: t, oleh: uid });
      await db.doc(dokDaftarIsi(kid, { ruang })).set({ entri: daftar, jumlah: daftar.length, revisi });
      return { ok: true, kitabId: kid, revisi, bertahap: true, halamanDihapus: 0 };
    }
    // Kitab baru, atau kitab yang impornya belum pernah selesai (tidak ada yang dibaca pemakai): tulis langsung.
    const terhapus = ada.exists ? await hapusHalaman(db, kid, meta0) : 0;
    const revisi = ada.exists ? (meta0.revisi || 1) + 1 : 1;
    await ref.set({ ...kitab, ...(sidik ? { sidik } : {}), status: 'mengimpor', aktif: false, revisi, dibuatOleh: ada.exists ? (meta0.dibuatOleh || uid) : uid, dibuatAt: ada.exists ? (meta0.dibuatAt || t) : t, diubahAt: t, diubahOleh: uid });
    await db.doc(dokDaftarIsi(kid, {})).set({ entri: daftar, jumlah: daftar.length, revisi });
    return { ok: true, kitabId: kid, revisi, halamanDihapus: terhapus };
  }

  if (!ada.exists) tolak('KITAB_TIDAK_ADA', 'Kitab belum dimulai. Jalankan impor-mulai dulu.', 404);
  const meta = ada.data();

  if (b.aksi === 'impor-halaman') {
    if (!berjalan && meta.status !== 'mengimpor') tolak('KITAB_STATUS', 'Kitab ini tidak sedang diimpor. Mulai ulang dengan \"timpa\".', 409);
    const sasaran = berjalan || meta; // tempat tulis: ruang baru (bertahap) atau ruang kitab itu sendiri
    if (!Array.isArray(b.halaman) || !b.halaman.length) tolak('KITAB_INVALID', 'Larik halaman kosong.');
    if (b.halaman.length > MAKS_HALAMAN_PER_PANGGILAN) tolak('KITAB_INVALID', `Maksimal ${MAKS_HALAMAN_PER_PANGGILAN} halaman per panggilan.`);
    const docs = b.halaman.map((h) => validasiHalaman(h, sasaran.jumlahHalaman));
    if (berjalan && berjalan.tambah) docs.forEach((d) => { d.seq += berjalan.tambah.offset; d.juz = berjalan.tambah.juzAwal + d.juz - 1; if (d.juz > 99) tolak('KITAB_INVALID', 'Nomor juz melebihi 99.'); });
    if (new Set(docs.map((d) => d.seq)).size !== docs.length) tolak('KITAB_INVALID', 'Ada urutan halaman kembar dalam satu panggilan.');
    const bt = db.batch();
    docs.forEach((d) => bt.set(db.doc(`${koleksiHalaman(kid, sasaran)}/${idHalaman(d.seq)}`), d));
    // Indeks pencarian ditulis dalam batch yang sama dengan halamannya: halaman lengkap = indeks lengkap (src/kitabCari.js).
    bangunPotongan(docs).forEach((p) => bt.set(db.doc(`${koleksiCari(kid, sasaran)}/${p.id}`), { ...p.data, revisi: sasaran.revisi || 1 }));
    await bt.commit();
    return { ok: true, tertulis: docs.length };
  }

  if (b.aksi === 'impor-selesai') {
    if (berjalan && berjalan.tambah) { // jilid tambahan: halaman sudah tertulis di ruang kitab; satu penulisan meta membuatnya terlihat
      const { offset, juzAwal } = berjalan.tambah; const total = offset + berjalan.jumlahHalaman;
      if (meta.jumlahHalaman < total) {
        if (meta.jumlahHalaman !== offset) tolak('KITAB_STATUS', 'Kitab berubah sejak penambahan jilid ini dimulai. Mulai lagi penambahan jilid.', 409);
        const tertulis = (await seqTertulis(db, koleksiHalaman(kid, meta))).filter((q) => q > offset && q <= total).length;
        if (tertulis !== berjalan.jumlahHalaman) tolak('KITAB_JUMLAH_BEDA', `Halaman jilid tersimpan ${tertulis}, seharusnya ${berjalan.jumlahHalaman}. Pilih berkas yang sama lalu \"lanjutkan\"; kitab yang ada belum berubah.`, 409);
        const dref = db.doc(dokDaftarIsi(kid, meta)); const d0 = await dref.get();
        const entri = [...(d0.exists ? d0.data().entri || [] : []).filter((e) => e.seq <= offset), ...berjalan.daftar];
        await dref.set({ entri, jumlah: entri.length, revisi: meta.revisi || 1 });
        const cref = db.doc(`${koleksiCari(kid, meta)}/meta`); const cm = await cref.get();
        if (cm.exists && cm.data().status === 'siap' && cm.data().versi === VERSI_INDEKS) await cref.set({ ...cm.data(), halaman: total });
        else if (cm.exists) await cref.delete(); // indeks lama belum lengkap: dibangun ulang bertahap saat pencarian berikutnya
        await ref.set({ ...meta, jumlahHalaman: total, jumlahJuz: Math.max(meta.jumlahJuz || 1, juzAwal + (berjalan.kitab.jumlahJuz || 1) - 1), ocrHalaman: (meta.ocrHalaman || 0) + (berjalan.kitab.ocrHalaman || 0), penomoranSesuaiCetak: meta.penomoranSesuaiCetak === true && berjalan.kitab.penomoranSesuaiCetak === true, diubahAt: sekarang(), diubahOleh: uid });
      }
      await berjalanRef.delete();
      return { ok: true, jumlah: total, tambah: true, jilidDitambah: berjalan.jumlahHalaman };
    }
    if (berjalan) { // peralihan bertahap: satu penulisan meta mengalihkan seluruh kitab ke ruang baru
      const n = await hitung(db.collection(koleksiHalaman(kid, berjalan)));
      if (n !== berjalan.jumlahHalaman) tolak('KITAB_JUMLAH_BEDA', `Halaman tersimpan ${n}, seharusnya ${berjalan.jumlahHalaman}. Kitab yang sedang dipakai tidak diubah; pilih berkas yang sama lalu \"lanjutkan\", atau ulangi dengan \"timpa\".`, 409);
      const sudahTukar = meta.revisi === berjalan.revisi && akhiran(meta) === akhiran(berjalan);
      if (!sudahTukar) {
        await db.doc(`${koleksiCari(kid, berjalan)}/meta`).set({ versi: VERSI_INDEKS, revisi: berjalan.revisi, status: 'siap', halaman: n });
        const t = sekarang();
        await ref.set({ ...berjalan.kitab, ...(berjalan.sidik ? { sidik: berjalan.sidik } : {}), status: 'siap', aktif: meta.aktif === true, revisi: berjalan.revisi, ruang: berjalan.ruang, dibuatOleh: meta.dibuatOleh || uid, dibuatAt: meta.dibuatAt || t, diubahAt: t, diubahOleh: uid });
      }
      await berjalanRef.delete();
      let lamaDihapus = false;
      if (!sudahTukar) { try { await hapusHalaman(db, kid, meta); lamaDihapus = true; } catch { /* sisa ruang lama hanya memakan ruang simpan; impor berikutnya tidak terpengaruh */ } }
      return { ok: true, jumlah: n, bertahap: true, lamaDihapus };
    }
    if (meta.status === 'siap') return { ok: true, jumlah: meta.jumlahHalaman, sudah: true };
    if (meta.status !== 'mengimpor') tolak('KITAB_STATUS', 'Kitab ini tidak sedang diimpor.', 409);
    const n = await hitung(db.collection(koleksiHalaman(kid, meta)));
    if (n !== meta.jumlahHalaman) tolak('KITAB_JUMLAH_BEDA', `Halaman tersimpan ${n}, seharusnya ${meta.jumlahHalaman}. Kitab belum diaktifkan; pilih berkas yang sama lalu \"lanjutkan\", atau ulangi impor dengan \"timpa\".`, 409);
    await db.doc(`${koleksiCari(kid, meta)}/meta`).set({ versi: VERSI_INDEKS, revisi: meta.revisi || 1, status: 'siap', halaman: n });
    await ref.set({ ...meta, status: 'siap', aktif: true, diubahAt: sekarang(), diubahOleh: uid });
    return { ok: true, jumlah: n };
  }

  if (b.aksi === 'impor-aktif') {
    if (typeof b.aktif !== 'boolean') tolak('KITAB_INVALID', 'Nilai aktif harus true atau false.');
    if (meta.status !== 'siap') tolak('KITAB_STATUS', 'Hanya kitab yang impornya selesai yang bisa diaktifkan atau disembunyikan.', 409);
    await ref.set({ ...meta, aktif: b.aktif, diubahAt: sekarang(), diubahOleh: uid });
    return { ok: true, aktif: b.aktif };
  }

  return tolak('AKSI_TIDAK_DIKENAL', 'Aksi impor tidak dikenal.', 400);
}
