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
        // Primary button hover: a slight darkening, nothing more.
        "canary-hover": "#EBBD35",
        urgent: "#E03B3B",
        positive: "#2D9E6B",
        // Darker versions for text. The bright ones above are for dots, bars,
        // fills and the canaries; as text they fall below 4.5:1 on the paper.
        // Each passes 4.5:1 on #F7F5F0, white, #F0EDE6 and the tinted boxes.
        "positive-ink": "#1E7650",
        "urgent-ink": "#C42B2B",
        "gold-ink": "#86670F",
        border: "#E8E4DC",
        // Edges of form fields: 3.3:1 on the paper (WCAG 1.4.11 asks 3:1).
        field: "#8C877E",
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        playfair: ["var(--font-playfair)", "Georgia", "serif"],
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
