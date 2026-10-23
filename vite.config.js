import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Frontend: index.html + web/ (Vite). Fungsi server tetap di api/ (Vercel); untuk pengembangan lokal jalankan `vercel dev`,
// yang menjalankan `vite` lewat devCommand di vercel.json.
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist', chunkSizeWarningLimit: 1200 },
});
