import type { Config } from "tailwindcss";

// The visual system lives in app/globals.css as CSS variables + component classes
// (ported from the reference design). Tailwind is kept for layout utilities only.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["DM Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
