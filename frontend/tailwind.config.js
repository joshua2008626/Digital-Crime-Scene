/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070b14',
          900: '#0b1220',
          800: '#101a2e',
          700: '#17233b',
          600: '#22314f',
          500: '#33456a',
        },
        slate2: { 300: '#a9b6d0', 400: '#8493b3', 500: '#64748f' },
        cyan2: { 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4' },
        violet2: { 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6' },
        alert: { 400: '#f87171', 500: '#ef4444' },
        verified: { 400: '#4ade80', 500: '#22c55e' },
        warn: { 400: '#fbbf24', 500: '#f59e0b' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
};
