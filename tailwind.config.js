/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#050a1f', // Deep Navy Base
          900: '#0a1128',
          800: '#1e293b',
          700: '#334155',
        },
        stock: {
          up: '#ef4444',   // Red - Korean standard for increase
          down: '#3b82f6', // Blue - Korean standard for decrease
        },
        accent: {
          primary: '#38bdf8',
          secondary: '#818cf8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
