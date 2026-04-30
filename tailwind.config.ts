import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F7F5F0",
        surface: "#FFFFFF",
        "text-primary": "#1A1A1A",
        "text-secondary": "#6B6B6B",
        canary: "#F5C842",
        "canary-dark": "#D4A800",
        urgent: "#E03B3B",
        positive: "#2D9E6B",
        border: "#E8E4DC",
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        body: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
      boxShadow: {
        card: "0 1px 4px 0 rgba(26, 20, 10, 0.07), 0 2px 12px 0 rgba(26, 20, 10, 0.05)",
        "card-hover":
          "0 4px 16px 0 rgba(26, 20, 10, 0.10), 0 2px 6px 0 rgba(26, 20, 10, 0.06)",
        "card-canary":
          "0 1px 4px 0 rgba(245, 200, 66, 0.15), 0 2px 12px 0 rgba(245, 200, 66, 0.10)",
      },
      borderRadius: {
        card: "8px",
      },
    },
  },
  plugins: [],
};

export default config;
