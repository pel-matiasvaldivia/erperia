/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--color-brand-50, #fff1f2)',
          100: 'var(--color-brand-100, #ffe4e6)',
          200: 'var(--color-brand-200, #fecdd3)',
          300: 'var(--color-brand-300, #fda4af)',
          400: 'var(--color-brand-400, #fb7185)',
          500: 'var(--color-brand-500, #ef4444)', // Red 500
          600: 'var(--color-brand-600, #dc2626)', // Red 600 - Traditional Primary
          700: 'var(--color-brand-700, #b91c1c)',
          800: 'var(--color-brand-800, #991b1b)',
          900: 'var(--color-brand-900, #7f1d1d)',
          950: 'var(--color-brand-950, #450a0a)',
        },
        'accent-brown': {
          50: '#fdf8f6',
          100: '#f2e8e5',
          200: '#eaddd7',
          300: '#e0c1b3',
          400: '#d3a28e',
          500: '#c07e61',
          600: '#a6654a',
          700: '#8c5039',
          800: '#734230',
          900: '#5e3729',
          950: '#321c15', // Dark Brown for Sidebar
        },
        'accent-yellow': {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15', // Vibrant Yellow
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
          950: '#422006',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
