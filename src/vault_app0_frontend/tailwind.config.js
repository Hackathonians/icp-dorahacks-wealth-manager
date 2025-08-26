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
          white: '#ffffff',
          yellow: {
            400: '#fbbf24',
            500: '#f59e0b',
          },
          orange: {
            500: '#f97316',
            600: '#ea580c',
          },
          pink: {
            400: '#fb7185',
            500: '#ec4899',
          },
        },
      },
      animation: {
        'gradient-shift': 'gradientShift 8s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'subtle-pulse': 'subtlePulse 3.5s ease-in-out infinite',
        'pan-grid': 'panGrid 18s linear infinite',
      },
      keyframes: {
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        subtlePulse: {
          '0%, 100%': { opacity: '0.7', filter: 'drop-shadow(0 0 10px rgba(236, 72, 153, 0.3))' },
          '50%': { opacity: '1', filter: 'drop-shadow(0 0 16px rgba(249, 115, 22, 0.4))' },
        },
        panGrid: {
          '0%, 100%': { backgroundPosition: '0px 0px' },
          '50%': { backgroundPosition: '24px 24px' },
        }
      }
    },
  },
  plugins: [],
}
