import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefdf3",
          100: "#d6f9e2",
          200: "#aff1c8",
          300: "#79e4a7",
          400: "#3fce80",
          500: "#18b364",
          600: "#0c9151",
          700: "#0b7343",
          800: "#0d5b38",
          900: "#0c4b30",
        },
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
