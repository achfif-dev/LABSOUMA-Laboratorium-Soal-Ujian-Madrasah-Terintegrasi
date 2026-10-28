// Navigasi dua tingkat: GRUP (di menu) lalu SUB-TAB (bilah di bawah header). Murni (tanpa React) agar mudah diuji.
// ID tab TIDAK berubah (compose, paket, review, ...), jadi #hash, serah-terima antartab (kirimKeTab, bukaPaketDiBank), dan draf tetap berlaku.
export const NAV_GRUP = [
  { id: 'susun', label: 'Susun', tabs: ['compose', 'paket', 'pegon'] },
  { id: 'bank', label: 'Bank Soal', tabs: ['review', 'bank'], lencana: 'review' }, // lencana grup = soal menunggu review
  { id: 'ujian', label: 'Ujian', tabs: ['fokus', 'export', 'analisis'] },
  { id: 'kelola', label: 'Kelola', tabs: ['backup', 'dasbor', 'users', 'cfg', 'ai'], lencana: 'dasbor' }, // lencana grup = peringatan kuota AI
];

/** Label pendek untuk sub-tab (label panjang di TABS tetap dipakai bila grup hanya berisi satu tab). */
export const SUB_LABEL = {
  compose: 'Penyusunan', paket: 'Paket Dauri', pegon: 'Pegonizer', review: 'Review', bank: 'Approved',
  fokus: 'Fokus & Kisi-kisi', export: 'Export', analisis: 'Analisis Butir',
  backup: 'Backup Drive', dasbor: 'Dasbor', users: 'Pengguna', cfg: 'Konfigurasi', ai: 'Pengaturan AI',
};

export const grupDariTab = (id) => NAV_GRUP.find((g) => g.tabs.includes(id)) || null;

/**
 * Kelompokkan daftar tab yang SUDAH disaring menurut peran. Grup tanpa tab tersembunyi; tab yang belum terdaftar di grup mana pun
 * tidak dibuang diam-diam, melainkan ditampung di grup "Lainnya".
 * @param {{id:string,n?:number}[]} tabs
 * @returns {{id:string,label:string,items:object[],lencana:number}[]}
 */
export function bangunNav(tabs) {
  const hasil = [];
  const terpakai = new Set();
  for (const g of NAV_GRUP) {
    const items = g.tabs.map((id) => tabs.find((t) => t.id === id)).filter(Boolean);
    items.forEach((t) => terpakai.add(t.id));
    if (!items.length) continue;
    const l = g.lencana ? (items.find((t) => t.id === g.lencana) || {}).n || 0 : 0;
    hasil.push({ id: g.id, label: g.label, items, lencana: l });
  }
  const sisa = tabs.filter((t) => !terpakai.has(t.id));
  if (sisa.length) hasil.push({ id: 'lainnya', label: 'Lainnya', items: sisa, lencana: 0 });
  return hasil;
}

/** Sub-tab yang dibuka saat grup diketuk: yang terakhir dipakai di grup itu (bila masih tersedia), selain itu yang pertama. */
export const tujuanGrup = (grup, terakhir) => ((terakhir && grup.items.some((t) => t.id === terakhir[grup.id])) ? terakhir[grup.id] : grup.items[0].id);
