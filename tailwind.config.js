/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f6f1e7',
        ink: '#292524',
        sticky: {
          yellow: '#fde047',
          'yellow-dark': '#facc15',
          pink: '#fbcfe8',
          'pink-dark': '#f9a8d4',
          blue: '#bfdbfe',
          'blue-dark': '#93c5fd',
          green: '#bbf7d0',
          'green-dark': '#86efac',
        },
      },
      fontFamily: {
        sans: [
          'ui-rounded',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        note: '0 1px 1px rgba(41, 37, 36, 0.04), 0 12px 28px -14px rgba(41, 37, 36, 0.35)',
        'note-hover': '0 2px 2px rgba(41, 37, 36, 0.05), 0 20px 36px -16px rgba(41, 37, 36, 0.4)',
        float: '0 10px 30px -8px rgba(41, 37, 36, 0.45)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'sheet-in': {
          from: { opacity: '0', transform: 'translateY(18px) scale(0.985)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translate(-50%, 12px)' },
          to: { opacity: '1', transform: 'translate(-50%, 0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out both',
        'sheet-in': 'sheet-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-up': 'fade-up 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'toast-in': 'toast-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};
