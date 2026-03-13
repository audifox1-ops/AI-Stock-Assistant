/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#020617',
          900: '#0f172a', // Brand Main Base
          800: '#1e293b', // Card Base
          700: '#334155',
        },
        stock: {
          up: '#ef4444',   // Red-500 (Korean standard)
          down: '#60a5fa', // Blue-400 (Korean standard)
        },
        accent: {
          primary: '#3b82f6',   // Blue-500
          secondary: '#818cf8', // Indigo-400
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
