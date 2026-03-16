import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pyrimid: {
          bg: '#08090c',
          surface: '#0d0f14',
          elevated: '#13161d',
          border: '#1e2230',
          accent: '#5eead4',
          'accent-dim': 'rgba(94,234,212,0.12)',
          orange: '#fb923c',
          purple: '#c084fc',
        },
      },
      fontFamily: {
        sans: ['Instrument Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
