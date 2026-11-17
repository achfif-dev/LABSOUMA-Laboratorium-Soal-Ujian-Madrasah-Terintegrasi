/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './web/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Sudut mengikuti variabel supaya admin bisa memilih tegas/sedang/membulat (web/lib/tampilan.js); nilai cadangan = bawaan Tailwind.
      borderRadius: { md: 'var(--r-md, 0.375rem)', lg: 'var(--r-lg, 0.5rem)', xl: 'var(--r-xl, 0.75rem)', '2xl': 'var(--r-2xl, 1rem)' },
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'Amiri', '"Scheherazade New"', 'system-ui', 'sans-serif'] },
      colors: {
        bg: 'var(--bg)', surface: 'var(--surface)', ink: 'var(--ink)', mute: 'var(--mute)',
        line: 'var(--line)', brand: 'var(--brand)', 'brand-fg': 'var(--brand-fg)',
        soft: 'var(--soft)', 'soft-ink': 'var(--soft-ink)', head: 'var(--head)', 'head-ink': 'var(--head-ink)',
        warn: 'var(--warn)', 'warn-bg': 'var(--warn-bg)', bad: 'var(--bad)', 'bad-bg': 'var(--bad-bg)',
        ok: 'var(--ok)', 'ok-bg': 'var(--ok-bg)'
      }
    }
  }
};
