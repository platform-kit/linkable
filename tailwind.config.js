/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/App.vue",
    "./src/themes/**/*.vue",
    "./src/pages/**/*.vue",
    "./src/overrides/**/*.vue",
    "./src/*.{js,ts}",
    "./src/themes/**/*.{js,ts}",
    "./src/lib/**/*.{js,ts}",
    "./src/pages/**/*.{js,ts}",
    "./src/utils/**/*.{js,ts}",
    "./src/overrides/**/*.{js,ts}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};