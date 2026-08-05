import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          foreground: "hsl(var(--surface-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        /** AI-originated content marker only — DESIGN_SPECIFICATION.md §3.2/§7.5. Never used for a plain button or KPI value. */
        ai: {
          DEFAULT: "hsl(var(--ai-accent))",
          foreground: "hsl(var(--ai-accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        critical: {
          DEFAULT: "hsl(var(--critical))",
          foreground: "hsl(var(--critical-foreground))",
        },
        border: {
          DEFAULT: "hsl(var(--border))",
          strong: "hsl(var(--border-strong))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
          "6": "hsl(var(--chart-6))",
          "7": "hsl(var(--chart-7))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontSize: {
        /** DESIGN_SPECIFICATION.md §4.2 — named sizes for roles the default Tailwind scale doesn't map to precisely. */
        "app-title": ["1rem", { lineHeight: "1.3", fontWeight: "600" }],
        "page-title": ["1.75rem", { lineHeight: "1.2", fontWeight: "700" }],
        "section-title": ["1.125rem", { lineHeight: "1.3", fontWeight: "600" }],
        "kpi-hero": ["2.25rem", { lineHeight: "1.1", fontWeight: "600" }],
        "kpi-secondary": ["1.5rem", { lineHeight: "1.15", fontWeight: "600" }],
        label: ["0.6875rem", { lineHeight: "1.3", fontWeight: "500", letterSpacing: "0.02em" }],
        caption: ["0.75rem", { lineHeight: "1.4", fontWeight: "400" }],
      },
      keyframes: {
        /** DESIGN_SPECIFICATION.md §11.5 — a slow, low-contrast sweep, not a hard pulse/blink. */
        shimmer: {
          from: { backgroundPosition: "150% 0" },
          to: { backgroundPosition: "-50% 0" },
        },
      },
      animation: {
        shimmer: "shimmer 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
