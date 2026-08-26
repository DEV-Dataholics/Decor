/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      colors: {
        zinc: {
          50: '#1c1007',    // Darkest (almost black-brown)
          100: '#2c190c',   // Very dark brown
          200: '#3e2413',   // Dark brown
          300: '#5c3d24',   // Medium-dark brown
          400: '#7d5c3f',   // Medium brown
          500: '#a37e58',   // Sand brown
          600: '#c5a37f',   // Light sand
          700: '#dfcaad',   // Very light sand
          800: '#eddcc4',   // Cream border
          900: '#f5eee0',   // Card background (warm cream)
          950: '#FAF6EE',   // Body background (light plaster off-white)
        },
        amber: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#14b8a6',   // Vibrant Santa Fe turquoise
          500: '#0d9488',   // Authentic Santa Fe turquoise primary
          600: '#0f766e',
          700: '#115e59',
          800: '#134e4a',
          900: '#13403d',
          950: '#042f2e',
        },
        turquoise: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#14b8a6',
          500: '#0d9488',
          600: '#0f766e',
          700: '#115e59',
          800: '#134e4a',
          900: '#13403d',
          950: '#042f2e',
          DEFAULT: '#0d9488',
          light: '#14b8a6',
          dark: '#0f766e',
        },
        surface: {
          DEFAULT: 'rgba(45, 32, 21, 0.5)',
          solid: '#2d2015',
          hover: 'rgba(45, 32, 21, 0.7)',
          border: 'rgba(65, 49, 35, 0.5)',
        },
        accent: {
          DEFAULT: '#0d9488',
          hover: '#0f766e',
          light: '#14b8a6',
          muted: 'rgba(13, 148, 136, 0.15)',
          text: '#0d9488',
        },
        terracotta: {
          DEFAULT: '#c2703e',
          light: '#d4915f',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
