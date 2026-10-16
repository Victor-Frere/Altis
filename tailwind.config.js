/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "altis-navy": "#0B132B",
        "altis-gold": "#D4AF37",
        "altis-gold-hover": "#C5A028",
        "altis-marble": "#F8FAFC",
        "altis-card-light": "#FFFFFF",
        "altis-card-dark": "#1E293B",
      },
    },
  },
  plugins: [],
}
