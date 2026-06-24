/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          darkest: '#080C14',
          dark: '#0B0F19',
          medium: '#111827',
          light: '#1F2937',
          accent: '#374151',
        },
        gold: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          400: '#F59E0B',
          500: '#D97706',
          600: '#B45309',
        },
        coral: {
          500: '#EF4444',
          600: '#DC2626',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 15px rgba(217, 119, 6, 0.15)',
        'glow-strong': '0 0 25px rgba(217, 119, 6, 0.25)',
      }
    },
  },
  plugins: [],
}
