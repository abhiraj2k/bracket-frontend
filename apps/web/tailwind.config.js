/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#6366F1',
          dark: '#4F46E5',
        },
        surface: {
          DEFAULT: '#1C1C22',
          raised: '#26262E',
        },
        border: '#2E2E38',
        income: '#22C55E',
        expense: '#EF4444',
        transfer: '#94A3B8',
        warning: '#F59E0B',
        milestone: '#22C55E',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
