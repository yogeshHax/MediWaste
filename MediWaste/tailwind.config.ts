import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // --- Cyber-medical dark palette -----------------------------------
        obsidian: {
          950: "#040911",
          900: "#071320",
          800: "#0b1b2d",
          700: "#10243a",
        },
        neon: {
          cyan: "#00F0FF",
          green: "#00FF9D",
          pink: "#FF2A85",
          amber: "#FFB454",
        },
        // Legacy medical greens retained for existing pages
        medical: {
          50: "#f0f7f4",
          100: "#d9ece3",
          200: "#b6d7c7",
          300: "#8fc0a8",
          400: "#67a585",
          500: "#4a8a63",
          600: "#3d7253",
          700: "#345b42",
          800: "#2c4835",
          900: "#233b2b",
          950: "#0f1c14",
        },
        station: {
          green: "#22c55e",
          red: "#ef4444",
          amber: "#f59e0b",
          blue: "#3b82f6",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        grotesk: ["var(--font-grotesk)", "var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        "neon-cyan": "0 0 18px rgba(0, 240, 255, 0.35)",
        "neon-green": "0 0 18px rgba(0, 255, 157, 0.30)",
        "neon-pink": "0 0 18px rgba(255, 42, 133, 0.35)",
        glass: "inset 0 1px 0 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.45)",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.82)" },
        },
        "led-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.25" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
      },
      animation: {
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        "led-blink": "led-blink 1.4s ease-in-out infinite",
        shimmer: "shimmer 1.8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
