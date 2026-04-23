import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#b9d1ff",
          300: "#8eb4ff",
          400: "#5f8eff",
          500: "#3a67ff",
          600: "#2548e6",
          700: "#1c38b4",
          800: "#1a308f",
          900: "#182c72",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
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
        prose: "72ch",
      },
    },
  },
  plugins: [typography],
};
