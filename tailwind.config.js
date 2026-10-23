/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './web/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
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
