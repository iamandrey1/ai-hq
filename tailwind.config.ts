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
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        "bg-2": "rgb(var(--color-bg-2) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        "panel-2": "rgb(var(--color-panel-2) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        "line-2": "rgb(var(--color-line-2) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        "ink-2": "rgb(var(--color-ink-2) / <alpha-value>)",
        "ink-3": "rgb(var(--color-ink-3) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        "accent-2": "rgb(var(--color-accent-2) / <alpha-value>)",
        green: "rgb(var(--color-green) / <alpha-value>)",
        red: "rgb(var(--color-red) / <alpha-value>)",
        blue: "rgb(var(--color-blue) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
        md: "8px",
        lg: "14px",
        xl: "14px",
        "2xl": "16px",
        "3xl": "20px",
        full: "9999px",
      },
      animation: {
        "msg-in": "msgIn 0.15s ease both",
        "pulse-slow": "pulseSlow 2s infinite",
        "fade-in-0": "fadeIn 0.18s ease both",
        "fade-out-0": "fadeOut 0.15s ease both",
        "zoom-in-95": "zoomIn95 0.18s cubic-bezier(0.2,0.7,0.2,1) both",
        "slide-in-from-left": "slideInLeft 0.22s cubic-bezier(0.2,0.7,0.2,1) both",
        "slide-in-from-bottom": "slideInBottom 0.22s cubic-bezier(0.2,0.7,0.2,1) both",
      },
      keyframes: {
        pulseSlow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        msgIn: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        fadeOut: {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        zoomIn95: {
          from: { opacity: "0", transform: "translate(-50%,-50%) scale(0.96)" },
          to: { opacity: "1", transform: "translate(-50%,-50%) scale(1)" },
        },
        slideInLeft: {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        slideInBottom: {
          from: { transform: "translateY(20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
      boxShadow: {
        "card": "0 1px 0 rgba(255,255,255,0.03) inset, 0 0 0 1px rgb(var(--color-line) / 1)",
        "card-hover": "0 1px 0 rgba(255,255,255,0.05) inset, 0 0 0 1px rgb(var(--color-line-2) / 1), 0 8px 24px rgba(0,0,0,0.4)",
        "glow-accent": "0 0 0 1px rgb(var(--color-accent) / 0.3), 0 0 40px rgb(var(--color-accent) / 0.18)",
      },
    },
  },
  plugins: [],
} satisfies Config;
