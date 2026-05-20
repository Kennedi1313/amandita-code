/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "black-1000": "#121212",
        "rose-1000": "#F4EBE7",
        "brown-1000": "#B48F57",
        "green-whatsapp": "#3cc13f",
      },
      fontFamily: {
        "dream-avenue": ["DreamAvenue"],
        sans: ["Roboto", "Helvetica", "Arial", "sans-serif", "Unlock"],
        unlock: ["Unlock", "Roboto"],
      },
      backgroundImage: {
        retrato: "url('/colecao_dia_das_maes_retrato.png')",
        vertical: "url('/colecao_dia_das_maes.png')",
      },
    },
  },
  variants: {
    display: ["group-hover"],
  },
  plugins: [],
};
