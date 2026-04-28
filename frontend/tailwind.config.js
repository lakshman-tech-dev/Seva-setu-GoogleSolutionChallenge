/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: { 50: '#eef7ff', 100: '#d9edff', 200: '#bce0ff', 300: '#8ecdff', 400: '#53b1ff', 500: '#2b91ff', 600: '#1470f5', 700: '#0d5ae1', 800: '#1149b6', 900: '#14408f', 950: '#112957' },
        surface: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      animation: { 'pulse-slow': 'pulse 3s ease-in-out infinite' },
    },
  },
  plugins: [],
};
