/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./entrypoints/**/*.{html,ts,tsx,js,jsx}",
    "./src/**/*.{html,ts,tsx,js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        'primary-red': 'var(--primary-red)',
        'primary-red-hover': 'var(--primary-red-hover)',
        'accent-blue': 'var(--accent-blue)',
        'accent-green': 'var(--accent-green)',
        'accent-gold': 'var(--accent-gold)',
        'accent-purple': 'var(--accent-purple)',
        'bg-body': 'var(--bg-body)',
        'bg-card': 'var(--bg-card)',
        'bg-subtle': 'var(--bg-subtle)',
        'border-card': 'var(--border-card)',
        'text-heading': 'var(--text-heading)',
        'text-main': 'var(--text-main)',
        'text-muted': 'var(--text-muted)',
        'text-dim': 'var(--text-dim)',
      },
      fontSize: {
        'xs': ['13px', { lineHeight: '18px' }],
        'sm': ['15px', { lineHeight: '22px' }],
        'base': ['16px', { lineHeight: '24px' }],
      }
    },
  },
  plugins: [],
}
