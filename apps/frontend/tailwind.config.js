/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand': {
          'dark': '#090c19',
          'yellow': '#f6cb6e',
          'red': '#b24545',
          'pink': '#c9a8b5',
        }
      }
    },
  },
  plugins: [],
}
