import './globals.js'; // harus pertama: memasang window.Ujian, window.Bentuk, dst. sebelum App dievaluasi (Pegon dimuat malas, lihat bawah)
import './styles.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { Root, ErrorBoundary, SetupError } from './App.jsx';
import { muatPegon } from './lib/muatPegon.js';

(async function boot() {
  const root = createRoot(document.getElementById('root'));
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('config ' + res.status);
    firebase.initializeApp(await res.json());
    // Simpan salinan data di browser agar muat ulang halaman tidak menghabiskan kuota baca Firestore gratis.
    try { await firebase.firestore().enablePersistence({ synchronizeTabs: true }); } catch (e) { /* tidak didukung: lanjut tanpa cache */ }
  } catch (e) { root.render(<SetupError />); return; }
  root.render(<ErrorBoundary><Root /></ErrorBoundary>);
  // Mesin Pegon (±250 KB) diunduh di latar belakang setelah tampilan pertama, saat browser menganggur, agar tidak memperlambat layar awal.
  // Kegagalan diabaikan di sini: komponen Pegon menampilkan tombol "Coba lagi" sendiri.
  const nanti = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
  nanti(() => { muatPegon().catch(() => {}); }, { timeout: 4000 });
})();

// Cangkang aplikasi tersedia offline (public/sw.js). Hanya di produksi; kegagalan mendaftar tidak mengganggu aplikasi.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}
