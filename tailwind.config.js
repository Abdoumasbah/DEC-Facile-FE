/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",           // Angular templates
    "./node_modules/primeng/**/*.{js,ts}"  // For PrimeNG classes
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

