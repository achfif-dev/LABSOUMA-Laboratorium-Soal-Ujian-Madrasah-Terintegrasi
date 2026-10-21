// Draf otomatis: isian yang belum disimpan ke server dititipkan di localStorage supaya selamat dari muat ulang halaman,
// tab tertutup, atau browser mati. Sumber tunggal untuk browser (public/index.html) dan tes (src/draft.js).
//
// Aturan yang dijaga di sini:
//  - Kunci dipisah per akun (uid): akun lain di perangkat yang sama tidak melihat draf ini.
//  - Draf kedaluwarsa setelah 30 hari dan dibuang otomatis.
//  - Penulisan ditunda (debounce) supaya mengetik tidak menulis ke disk di setiap huruf; flush() menulis sisanya
//    saat halaman disembunyikan atau ditutup.
//  - Kegagalan (penyimpanan penuh, mode privat, diblokir) tidak pernah melempar galat; status gagal dilaporkan lewat onStatus.
//  - Rahasia (mis. kunci API) tidak boleh dititipkan di sini. Pemanggil yang memutuskan apa yang disimpan.

export const PREFIX = 'labsouma:v1:';
export const TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_CHARS = 2_000_000; // di bawah kuota localStorage umum (±5 juta karakter), sisakan ruang untuk draf lain

export function createDraftStore({ storage = null, now = () => Date.now(), ttl = TTL_MS, delay = 500, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  let uid = '';
  let pending = new Map();   // nama -> nilai terbaru yang menunggu ditulis
  let timer = null;
  const listeners = new Set();
  const key = (name) => PREFIX + uid + ':' + name;
  const emit = (s) => { for (const fn of listeners) { try { fn(s); } catch (e) { /* pendengar rusak tidak boleh menggagalkan penyimpanan */ } } };

  function tulis(name, value) {
    if (!storage || !uid) return false;
    try {
      const raw = JSON.stringify({ v: 1, t: now(), d: value });
      if (raw.length > MAX_CHARS) { emit({ ok: false, name, reason: 'terlalu-besar' }); return false; }
      storage.setItem(key(name), raw);
      emit({ ok: true, name, at: now() });
      return true;
    } catch (e) {
      emit({ ok: false, name, reason: 'ditolak' });
      return false;
    }
  }

  function flush() {
    if (timer) { clearTimer(timer); timer = null; }
    const batch = pending; pending = new Map();
    let semua = true;
    for (const [name, value] of batch) if (!tulis(name, value)) semua = false;
    return semua;
  }

  return {
    // Dipanggil sekali saat akun diketahui. Mengganti akun menulis sisa draf akun sebelumnya lebih dulu.
    setUser(next) {
      flush();
      uid = String(next || '');
      this.purgeExpired();
    },
    get user() { return uid; },
    // Baca draf; null bila tidak ada, rusak, versi lain, atau kedaluwarsa (yang rusak/kedaluwarsa ikut dihapus).
    read(name) {
      if (!storage || !uid) return null;
      // Draf yang masih menunggu ditulis adalah yang paling baru.
      if (pending.has(name)) return pending.get(name);
      let raw = null;
      try { raw = storage.getItem(key(name)); } catch (e) { return null; }
      if (raw == null) return null;
      try {
        const o = JSON.parse(raw);
        if (!o || o.v !== 1 || typeof o.t !== 'number' || now() - o.t > ttl || o.d === undefined || o.d === null) throw new Error('usang');
        return o.d;
      } catch (e) {
        try { storage.removeItem(key(name)); } catch (e2) { /* abaikan */ }
        return null;
      }
    },
    // Jadwalkan penulisan (ditunda). Nilai harus bisa di-JSON-kan.
    save(name, value) {
      if (!storage || !uid) return;
      pending.set(name, value);
      if (timer) clearTimer(timer);
      timer = setTimer(flush, delay);
    },
    // Tulis langsung tanpa menunda; true bila berhasil.
    saveNow(name, value) { pending.delete(name); return tulis(name, value); },
    remove(name) {
      pending.delete(name);
      if (!storage || !uid) return;
      try { storage.removeItem(key(name)); } catch (e) { /* abaikan */ }
    },
    // Hapus semua draf akun saat ini (mis. tombol "buang draf" atau keluar di komputer bersama).
    clearAll() {
      pending = new Map();
      if (!storage || !uid) return;
      const p = PREFIX + uid + ':';
      try {
        const hapus = [];
        for (let i = 0; i < storage.length; i++) { const k = storage.key(i); if (k && k.startsWith(p)) hapus.push(k); }
        for (const k of hapus) storage.removeItem(k);
      } catch (e) { /* abaikan */ }
    },
    purgeExpired() {
      if (!storage || !uid) return;
      const p = PREFIX + uid + ':';
      try {
        const hapus = [];
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (!k || !k.startsWith(p)) continue;
          let usang = true;
          try { const o = JSON.parse(storage.getItem(k)); usang = !o || o.v !== 1 || typeof o.t !== 'number' || now() - o.t > ttl; } catch (e) { usang = true; }
          if (usang) hapus.push(k);
        }
        for (const k of hapus) storage.removeItem(k);
      } catch (e) { /* abaikan */ }
    },
    flush,
    // fn({ ok, name, at?, reason? }) dipanggil tiap penulisan. Mengembalikan fungsi untuk berhenti mendengar.
    onStatus(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}

// localStorage bisa melempar galat hanya dengan diakses (mode privat tertentu, cookie diblokir), jadi diuji dulu.
function storageBrowser() {
  try {
    const s = globalThis.localStorage;
    if (!s) return null;
    const k = PREFIX + '__uji__';
    s.setItem(k, '1'); s.removeItem(k);
    return s;
  } catch (e) { return null; }
}

const bawaan = createDraftStore({ storage: storageBrowser() });
export const tersedia = !!storageBrowser();
export const setUser = (u) => bawaan.setUser(u);
export const read = (n) => bawaan.read(n);
export const save = (n, v) => bawaan.save(n, v);
export const saveNow = (n, v) => bawaan.saveNow(n, v);
export const remove = (n) => bawaan.remove(n);
export const clearAll = () => bawaan.clearAll();
export const flush = () => bawaan.flush();
export const onStatus = (fn) => bawaan.onStatus(fn);

// Tulis sisa draf saat tab disembunyikan atau ditutup (pagehide lebih andal daripada beforeunload di perangkat seluler).
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('pagehide', () => bawaan.flush());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') bawaan.flush(); });
}
