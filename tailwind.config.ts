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
        paper: "#f6f7f9",
        line: "#dfe4ea",
        marine: "#116466",
        clay: "#b85c38",
        leaf: "#2f855a",
        signal: "#2563eb",
      },
      boxShadow: {
        panel: "0 14px 36px rgba(23, 32, 51, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
