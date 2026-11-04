/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f3ff',
          100: '#ede9ff',
          200: '#ddd4ff',
          300: '#c4b5ff',
          400: '#a89cff',
          500: '#8b7bff',
          600: '#6f5ae8',
          700: '#5a3fd1',
          800: '#4a2ba8',
          900: '#3e1f85',
        },
        secondary: {
          50: '#fffbf0',
          100: '#fff7e6',
          200: '#ffedcc',
          300: '#ffe0b3',
          400: '#ffd699',
          500: '#ffc700',
          600: '#e6b200',
          700: '#cc9a00',
          800: '#995200',
          900: '#663400',
        },
        accent: {
          500: '#d97757',
          600: '#b85a4a',
        },
        neutral: {
          50: '#faf9f7',
          100: '#f3f0ec',
          200: '#e8e4de',
          300: '#d9d3cb',
          400: '#c4bab2',
          500: '#9d9187',
          600: '#7d7569',
          700: '#5f5752',
          800: '#433d37',
          900: '#2a251f',
        },
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      fontFamily: {
        serif: ['Merriweather', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
