import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0e0d0b",
        "bg-2": "#15130f",
        panel: "#1a1714",
        "panel-2": "#221d18",
        line: "#2a2520",
        "line-2": "#3a322a",
        ink: "#f4ede0",
        "ink-2": "#c8bfae",
        "ink-3": "#8a8273",
        accent: "#d4a45c",
        "accent-2": "#e8c98a",
        green: "#7fb069",
        red: "#d97757",
        blue: "#6b8caf",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-manrope)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      animation: {
        pulse: "pulse 2s infinite",
        "msg-in": "msgIn 0.4s ease both",
      },
      keyframes: {
        pulse: {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 0 0 rgba(127,176,105,0.5)" },
          "50%": { opacity: "0.7", boxShadow: "0 0 0 6px rgba(127,176,105,0)" },
        },
        msgIn: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
