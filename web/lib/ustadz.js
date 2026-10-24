// Peran Ustadz: catatan wajib pada setiap ekspor dan penyimpanan "Soal Saya" di perangkat.
// Sumber tunggal untuk browser (web/App.jsx) dan tes (src/ustadz.js).
//
// Soal Ustadz TIDAK PERNAH dikirim ke Firestore atau koleksi `soal`: hanya ada di localStorage perangkat ini, per akun.
// Karena itu ada ekspor/impor berkas cadangan (JSON). Tidak ada kedaluwarsa (berbeda dengan draf otomatis yang 30 hari).

export const CATATAN_USTADZ = 'Soal latihan buatan ustadz dengan bantuan AI, belum ditelaah tim editor madrasah.';

// Awalan SENGAJA berbeda dari draf otomatis ('labsouma:v1:'): createDraftStore.purgeExpired() dan clearAll() menghapus semua kunci
// berawalan itu yang bukan bentuk draf atau sudah lewat 30 hari. Di bawah awalan itu, Soal Saya akan terhapus tiap kali masuk.
export const KUNCI = 'labsouma-soalsaya:v1:';
export const NAMA_BERKAS = 'labsouma-soal-saya';
export const MAKS_SOAL = 500;
export const MAKS_KARAKTER = 3_000_000; // di bawah kuota localStorage umum (±5 juta), sisakan ruang untuk draf otomatis

const rand = () => Math.random().toString(36).slice(2, 10);
const msDari = (x) => (Number.isFinite(x) ? x : 0);

/**
 * @param {object} o
 * @param {Storage|null} o.storage  localStorage (atau tiruan di tes)
 * @param {(item:object)=>object} o.normal  membentuk satu soal dari data mentah (total: tidak pernah melempar)
 * @param {()=>number} [o.now]
 * @param {()=>string} [o.newId]
 */
export function createSoalSaya({ storage = null, normal, now = () => Date.now(), newId = () => 's' + now().toString(36) + rand() } = {}) {
  let uid = '';
  const key = () => KUNCI + uid;

  const bacaMentah = () => {
    if (!storage || !uid) return [];
    let raw = null;
    try { raw = storage.getItem(key()); } catch (e) { return []; }
    if (!raw) return [];
    try {
      const o = JSON.parse(raw);
      if (!o || o.v !== 1 || !Array.isArray(o.items)) return [];
      return o.items;
    } catch (e) { return []; }
  };
  const rapikan = (it) => {
    if (!it || typeof it !== 'object' || typeof it.id !== 'string' || !it.id || it.id.length > 60) return null;
    const isi = normal(it.isi);
    return { id: it.id, isi, createdAt: msDari(it.createdAt), updatedAt: msDari(it.updatedAt) };
  };
  const tulis = (items) => {
    if (!storage || !uid) return { ok: false, reason: 'tidak-tersedia' };
    const raw = JSON.stringify({ v: 1, items });
    if (raw.length > MAKS_KARAKTER) return { ok: false, reason: 'terlalu-besar' };
    try { storage.setItem(key(), raw); return { ok: true }; } catch (e) { return { ok: false, reason: 'ditolak' }; }
  };

  return {
    setUser(next) { uid = String(next || ''); },
    get tersedia() { return !!storage && !!uid; },
    /** Terbaru dulu. Entri rusak dilewati. */
    list() { return bacaMentah().map(rapikan).filter(Boolean).sort((a, b) => b.updatedAt - a.updatedAt); },
    /** Simpan soal baru (tanpa id) atau timpa (dengan id yang ada). */
    simpan(isi, id) {
      const items = this.list();
      const t = now();
      const ada = id ? items.findIndex((x) => x.id === id) : -1;
      if (ada < 0 && items.length >= MAKS_SOAL) return { ok: false, reason: 'terlalu-banyak' };
      const baru = { id: ada >= 0 ? id : newId(), isi: normal(isi), createdAt: ada >= 0 ? items[ada].createdAt : t, updatedAt: t };
      if (ada >= 0) items[ada] = baru; else items.push(baru);
      const r = tulis(items);
      return r.ok ? { ok: true, id: baru.id } : r;
    },
    hapus(id) { return tulis(this.list().filter((x) => x.id !== id)); },
    kosongkan() { return tulis([]); },
    /** Isi berkas cadangan (JSON). */
    ekspor() {
      return JSON.stringify({ app: NAMA_BERKAS, v: 1, dibuat: new Date(now()).toISOString(), catatan: CATATAN_USTADZ, soal: this.list() }, null, 1);
    },
    /**
     * Gabungkan berkas cadangan. Berkas dari mana pun diperlakukan sebagai data tak tepercaya: tiap soal dibentuk ulang lewat `normal`.
     * Id yang sudah ada diganti hanya bila berkas lebih baru. Mengembalikan {ok, tambah, perbarui, lewati} atau {ok:false, reason}.
     */
    impor(teks) {
      if (!storage || !uid) return { ok: false, reason: 'tidak-tersedia' };
      let o;
      try { o = JSON.parse(String(teks || '')); } catch (e) { return { ok: false, reason: 'bukan-json' }; }
      if (!o || o.app !== NAMA_BERKAS || o.v !== 1 || !Array.isArray(o.soal)) return { ok: false, reason: 'bukan-berkas-soal-saya' };
      const items = this.list();
      const peta = new Map(items.map((x, i) => [x.id, i]));
      let tambah = 0; let perbarui = 0; let lewati = 0;
      for (const mentah of o.soal) {
        const it = rapikan(mentah);
        if (!it) { lewati++; continue; }
        if (peta.has(it.id)) {
          const i = peta.get(it.id);
          if (it.updatedAt > items[i].updatedAt) { items[i] = it; perbarui++; } else lewati++;
        } else if (items.length >= MAKS_SOAL) lewati++;
        else { peta.set(it.id, items.length); items.push(it); tambah++; }
      }
      const r = tulis(items);
      return r.ok ? { ok: true, tambah, perbarui, lewati } : r;
    },
  };
}
