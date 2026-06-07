import type { Config } from "tailwindcss";

/**
 * Premium internal finance/business palette.
 * - brand: a deep, calm navy/blue used for primary actions and emphasis.
 * - gold:  a restrained metallic accent for executive highlights (used sparingly).
 * Status colours (emerald / amber / rose) are pulled from Tailwind defaults but
 * applied in muted, professional tints via globals.css component classes.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f3f6fb",
          100: "#e6edf6",
          200: "#c8d8ea",
          300: "#9db9d7",
          400: "#6c92bd",
          500: "#46709f",
          600: "#345785",
          700: "#2a466b",
          800: "#243a57",
          900: "#1f3049",
          950: "#131e2e",
        },
        gold: {
          50: "#faf7ef",
          100: "#f2e9d2",
          200: "#e6d2a4",
          300: "#d8b76f",
          400: "#cca147",
          500: "#bd8b2d",
          600: "#a47023",
          700: "#85541f",
          800: "#6f4520",
          900: "#5e3a1f",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 30 46 / 0.04), 0 1px 3px 0 rgb(15 30 46 / 0.06)",
        elevated:
          "0 10px 30px -12px rgb(15 30 46 / 0.18), 0 4px 10px -6px rgb(15 30 46 / 0.10)",
        focus: "0 0 0 4px rgb(52 87 133 / 0.16)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
    },
  },
  plugins: [],
};

export default config;
