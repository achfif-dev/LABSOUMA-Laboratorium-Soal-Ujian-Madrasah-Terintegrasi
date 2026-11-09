import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { terapkanMerek } from './web/lib/merek.js';

// Mengisi penanda %MEREK_...% di index.html (layar pembuka) dari web/lib/merek.js, agar nama, logo, dan footnote hanya diubah di satu tempat.
const plugMerek = () => ({ name: 'labsouma-merek', transformIndexHtml: (html) => terapkanMerek(html) });

// Frontend: index.html + web/ (Vite). Fungsi server tetap di api/ (Vercel); untuk pengembangan lokal jalankan `vercel dev`,
// yang menjalankan `vite` lewat devCommand di vercel.json.
export default defineConfig({
  plugins: [react(), plugMerek()],
  build: { outDir: 'dist', chunkSizeWarningLimit: 1200 },
});
