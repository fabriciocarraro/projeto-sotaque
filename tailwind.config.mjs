import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}"],
  theme: {
    extend: {
      colors: {
        // Verde bandeira — acento primário, links, botões, destaques
        verde: {
          50: "#ecfdf1",
          100: "#d1fae0",
          200: "#a7f3c5",
          300: "#6ee7a0",
          400: "#34d176",
          500: "#14b85a",
          600: "#009c3b", // verde bandeira oficial
          700: "#007a2f",
          800: "#006b29",
          900: "#064e23",
        },
        // Amarelo — fundo do site e acentos suaves
        amarelo: {
          50: "#fffdf5",
          100: "#fffbeb", // fundo principal
          200: "#fef3c7",
          300: "#fde68a",
          400: "#facc15",
          500: "#fbbf24",
          600: "#f59e0b",
          700: "#b45309",
        },
        // Cinzas quentes — texto e bordas que combinam com o amarelo
        stone: {
          50: "#fafaf9",
          100: "#f5f5f4",
          200: "#e7e5e4",
          300: "#d6d3d1",
          400: "#a8a29e",
          500: "#78716c",
          600: "#57534e",
          700: "#44403c",
          800: "#292524",
          900: "#1c1917",
        },
      },
      fontFamily: {
        sans: [
          "Manrope",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      maxWidth: {
        prose: "70ch",
      },
    },
  },
  plugins: [typography],
};
