// Pemasangan LABSOUMA sebagai aplikasi (PWA): ajakan "Pasang" (Android/Chrome), petunjuk Tambah ke Layar Utama (iPhone/iPad),
// dan pemberitahuan versi baru untuk aplikasi yang dibiarkan terbuka lama. Berdiri sendiri (tanpa React) dan hanya aktif di produksi.
// Semua akses localStorage dibungkus try/catch: bila ditolak, ajakan tetap jalan, hanya tidak mengingat pilihan "Nanti".

const KUNCI_TUNDA = 'labsouma-pasang-ditunda';
const JEDA_TUNDA_MS = 14 * 24 * 3600 * 1000;
const JEDA_CEK_VERSI_MS = 30 * 60 * 1000;

const baca = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const tulis = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* diabaikan */ } };

const terpasang = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
const ditunda = () => { const t = Number(baca(KUNCI_TUNDA)); return Number.isFinite(t) && t > 0 && Date.now() - t < JEDA_TUNDA_MS; };
const tundakan = () => tulis(KUNCI_TUNDA, String(Date.now()));

const iosSafari = () => {
  const ua = navigator.userAgent || '';
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
};

let gayaSudah = false;
function pasangGaya() {
  if (gayaSudah) return; gayaSudah = true;
  const s = document.createElement('style');
  s.textContent = `
.pwa-kartu{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:70;max-width:30rem;margin:0 auto;display:flex;flex-direction:column;gap:10px;padding:14px 16px;border-radius:16px;border:1px solid #cfdcd4;background:#fff;color:#0f1f18;box-shadow:0 8px 28px rgba(0,0,0,.18);font:500 .875rem/1.45 'Plus Jakarta Sans',system-ui,sans-serif}
.pwa-kartu p{margin:0}.pwa-kartu b{font-weight:700}
.pwa-aksi{display:flex;gap:8px;justify-content:flex-end}
.pwa-aksi button{min-height:40px;padding:0 16px;border-radius:10px;border:1px solid #cfdcd4;background:transparent;color:inherit;font:inherit;font-weight:600;cursor:pointer}
.pwa-aksi button.pwa-utama{background:#0d6b4e;border-color:#0d6b4e;color:#fff}
.pwa-aksi button:focus-visible{outline:3px solid #3fbf8f;outline-offset:2px}
@media (prefers-color-scheme:dark){.pwa-kartu{background:#14211b;color:#e6efe9;border-color:#25382e}.pwa-aksi button{border-color:#25382e}.pwa-aksi button.pwa-utama{background:#1f8f69;border-color:#1f8f69}}
@media (prefers-reduced-motion:no-preference){.pwa-kartu{animation:pwa-naik .25s ease}@keyframes pwa-naik{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}}`;
  document.head.appendChild(s);
}

// Membuat kartu dengan teks aman (textContent), lalu mengembalikan elemen dan fungsi penutupnya.
function kartu({ judul, isi, tombol }) {
  pasangGaya();
  const el = document.createElement('div');
  el.className = 'pwa-kartu'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', judul);
  const p = document.createElement('p');
  const b = document.createElement('b'); b.textContent = judul + '. ';
  p.append(b, document.createTextNode(isi));
  const aksi = document.createElement('div'); aksi.className = 'pwa-aksi';
  const tutup = () => { if (el.parentNode) el.parentNode.removeChild(el); };
  for (const t of tombol) {
    const bt = document.createElement('button'); bt.type = 'button'; bt.textContent = t.teks;
    if (t.utama) bt.className = 'pwa-utama';
    bt.addEventListener('click', () => { tutup(); t.aksi && t.aksi(); });
    aksi.appendChild(bt);
  }
  el.append(p, aksi); document.body.appendChild(el);
  return { el, tutup };
}

let tampil = null; // kartu yang sedang tampil, agar tidak bertumpuk
function tampilkan(opsi) { if (tampil && tampil.el.parentNode) return; tampil = kartu(opsi); }
function sembunyikan() { if (tampil) { tampil.tutup(); tampil = null; } }

function ajakanPasang() {
  if (terpasang()) return;
  let tertunda = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); tertunda = e;
    if (ditunda()) return;
    setTimeout(() => {
      if (!tertunda || terpasang()) return;
      tampilkan({
        judul: 'Pasang LABSOUMA',
        isi: 'Pasang di layar utama agar terbuka seperti aplikasi, layar penuh, dan lebih cepat dimuat.',
        tombol: [
          { teks: 'Nanti', aksi: tundakan },
          { teks: 'Pasang', utama: true, aksi: async () => {
            const p = tertunda; tertunda = null; if (!p) return;
            try { await p.prompt(); const h = await p.userChoice; if (!h || h.outcome !== 'accepted') tundakan(); } catch (err) { /* diabaikan */ }
          } },
        ],
      });
    }, 3000);
  });
  window.addEventListener('appinstalled', () => { tertunda = null; sembunyikan(); tulis(KUNCI_TUNDA, String(Date.now() + 3650 * 24 * 3600 * 1000)); });

  // iPhone/iPad tidak punya beforeinstallprompt: tampilkan petunjuk manual sekali per jeda.
  if (iosSafari() && !ditunda()) {
    setTimeout(() => {
      if (terpasang()) return;
      tampilkan({
        judul: 'Pasang di iPhone/iPad',
        isi: 'Ketuk ikon Bagikan di Safari, lalu pilih "Tambah ke Layar Utama".',
        tombol: [{ teks: 'Mengerti', utama: true, aksi: tundakan }],
      });
    }, 5000);
  }
}

// Aplikasi terpasang sering hanya dilanjutkan dari latar belakang (tanpa muat ulang), jadi bisa tertinggal versi.
// Bandingkan berkas skrip utama pada index.html terbaru dengan yang sedang berjalan; bila beda, tawarkan muat ulang (tidak otomatis, agar draf tidak hilang).
function pemberitahuanVersi() {
  const skripKini = () => { const s = document.querySelector('script[type="module"][src*="/assets/"]'); return s ? s.getAttribute('src') : null; };
  const awal = skripKini(); if (!awal) return;
  let terakhir = Date.now(); let sudahTawar = false;
  const cek = async () => {
    if (sudahTawar || document.visibilityState !== 'visible' || Date.now() - terakhir < JEDA_CEK_VERSI_MS) return;
    terakhir = Date.now();
    try {
      const res = await fetch('/', { cache: 'no-store' }); if (!res.ok) return;
      const html = await res.text();
      if (html.includes(awal)) return;
      sudahTawar = true;
      tampilkan({
        judul: 'Versi baru tersedia',
        isi: 'Muat ulang untuk memakai pembaruan. Simpan dulu pekerjaan yang belum tersimpan.',
        tombol: [{ teks: 'Nanti' }, { teks: 'Muat ulang', utama: true, aksi: () => window.location.reload() }],
      });
    } catch (err) { /* offline: abaikan */ }
  };
  document.addEventListener('visibilitychange', cek);
  setInterval(cek, JEDA_CEK_VERSI_MS);
}

if (typeof window !== 'undefined' && import.meta.env.PROD) {
  ajakanPasang();
  pemberitahuanVersi();
}
