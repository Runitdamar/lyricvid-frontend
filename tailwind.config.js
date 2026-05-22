/** @type {import('tailwindcss').Config} */
export default {
  content: ['./*.{js,jsx,html}'],
  theme: {
    extend: {
      colors: {
        brand: {
          300: '#ff96d9', 400: '#ff54be', 500: '#ff1fa0',
          600: '#f0007d', 700: '#cc005e'
        },
        dark: {
          900: '#050507', 800: '#0a0a0f', 700: '#111118',
          600: '#1a1a24', 500: '#242430'
        }
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        }
      },
      animation: {
        float: 'float 6s ease-in-out infinite'
      }
    }
  },
  plugins: []
}
