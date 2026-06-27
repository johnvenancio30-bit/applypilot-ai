import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        paper: "#f7f3ee",
        line: "#e3ded6",
        marine: "#0f766e",
        clay: "#c65f38",
        leaf: "#28885e",
        signal: "#3b5bdb",
        berry: "#a8556a",
        honey: "#f2b84b",
      },
      boxShadow: {
        panel: "0 18px 44px rgba(23, 32, 51, 0.09)",
        lift: "0 10px 24px rgba(15, 118, 110, 0.14)",
      },
    },
  },
  plugins: [],
};

export default config;
