/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        night: { DEFAULT: '#0C0F1A', card: '#131829', surface: '#1A2035', border: '#252D45', muted: '#3A4560' },
        amber: { 300:'#FDE68A', 400:'#FCD34D', 500:'#F59E0B', 600:'#D97706', 700:'#B45309' },
        teal:  { 300:'#5EEAD4', 400:'#2DD4BF', 500:'#14B8A6', 600:'#0D9488', 700:'#0F766E', 900:'#134E4A' },
        cyan:  { 400:'#22D3EE', 500:'#06B6D4' },
        green: { 400:'#4ADE80', 500:'#22C55E' },
        violet:{ 400:'#A78BFA', 500:'#8B5CF6' },
        rose:  { 400:'#FB7185', 500:'#F43F5E' },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        body:    ['"Plus Jakarta Sans"', 'sans-serif'],
        mono:    ['"DM Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
