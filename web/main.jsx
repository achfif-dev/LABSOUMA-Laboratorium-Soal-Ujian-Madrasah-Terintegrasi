import './globals.js'; // harus pertama: memasang window.Pegon, window.Ujian, dst. sebelum App dievaluasi
import './styles.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { Root, ErrorBoundary, SetupError } from './App.jsx';

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
})();
