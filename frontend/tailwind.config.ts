import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg:        "rgb(var(--bg) / <alpha-value>)",
        fg:        "rgb(var(--fg) / <alpha-value>)",
        muted:     "rgb(var(--muted) / <alpha-value>)",
        subtle:    "rgb(var(--subtle) / <alpha-value>)",
        border:    "rgb(var(--border) / <alpha-value>)",
        accent:    "rgb(var(--accent) / <alpha-value>)",
        "accent-fg": "rgb(var(--accent-fg) / <alpha-value>)",
        success:   "rgb(var(--success) / <alpha-value>)",
        warn:      "rgb(var(--warn) / <alpha-value>)",
        danger:    "rgb(var(--danger) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        "xxs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
        md: "6px",
        lg: "8px",
      },
      letterSpacing: {
        tight: "-0.01em",
        tighter: "-0.02em",
      },
    },
  },
  plugins: [],
};

export default config;
