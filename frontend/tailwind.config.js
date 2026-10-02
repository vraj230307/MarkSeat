/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        themeText: "#0b0519",
        themeBg: "#f4f1fc",
        themePrimary: "#5c34d7",
        themeSecondary: "#e98dc5",
        themeAccent: "#e1658b",
        primaryHover: "#4a28b5",
        cardBg: "#ffffff",
        cardBorder: "#dfd8f5",
        inputBorder: "#cbbfef",
        seatAvailable: "#ffffff",
        seatHeld: "#e98dc5",
        seatSold: "#d8d1e7",
        seatSelected: "#5c34d7",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        button: "6px",
        card: "8px",
        input: "6px",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
    },
  },
  plugins: [],
}
