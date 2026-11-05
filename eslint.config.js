// Pemeriksa kode untuk CI (npm run lint). Hanya yang pasti salah yang menggagalkan CI (error);
// sisanya peringatan agar tidak memblokir. Lihat catatan di README bila ingin memperketat.
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'App.jsx'] },
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { react, 'react-hooks': hooks },
    rules: {
      // Error: membuat aplikasi rusak saat dijalankan.
      'no-undef': 'error',
      'no-dupe-keys': 'error',
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',
      'react/jsx-no-undef': 'error', // komponen JSX yang tidak diimpor/didefinisikan: no-undef biasa TIDAK menangkapnya
      'react-hooks/rules-of-hooks': 'error',
      // Peringatan: patut dibersihkan, tetapi tidak memblokir.
      'no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true, caughtErrors: 'none', varsIgnorePattern: '^_' }],
      'react-hooks/exhaustive-deps': 'warn',
      'react/jsx-key': 'warn',
      'no-unreachable': 'warn',
    },
  },
];
