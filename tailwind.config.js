/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0D1117',
        'dark-card': '#161B22',
        'dark-border': '#30363D',
        'dark-hover': '#21262D',
        'primary-cyan': '#58A6FF',
        'primary-teal': '#39D0D8',
      },
    },
  },
  plugins: [],
}
