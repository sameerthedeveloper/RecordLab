import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#faf7f0",
        ink: {
          DEFAULT: "#1c2b33",
          soft: "#4b5a63",
        },
        line: "#e5decb",
        accent: {
          DEFAULT: "#c2410c",
          soft: "#fde8d8",
          ink: "#7c2d12",
          hover: "#9a3412",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Arial", "sans-serif"],
        serif: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
