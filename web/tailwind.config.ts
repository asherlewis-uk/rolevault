import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        display: ["Sora", "sans-serif"],
        body:    ["Inter", "sans-serif"],
        sans:    ["Inter", "sans-serif"],
      },
      colors: {
        border:      "hsl(var(--border))",
        input:       "hsl(var(--input))",
        ring:        "hsl(var(--ring))",
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow:       "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT:              "hsl(var(--sidebar-background))",
          foreground:           "hsl(var(--sidebar-foreground))",
          primary:              "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent:               "hsl(var(--sidebar-accent))",
          "accent-foreground":  "hsl(var(--sidebar-accent-foreground))",
          border:               "hsl(var(--sidebar-border))",
          ring:                 "hsl(var(--sidebar-ring))",
        },
        /* Brand shorthands */
        violet:  "hsl(var(--primary))",
        sky:     "hsl(var(--secondary))",
        surface: "hsl(var(--card))",
        /* Spectral edge-light accents — warm stage palette */
        spectral: {
          gold:    "hsl(var(--spectral-gold))",
          crimson: "hsl(var(--spectral-crimson))",
          emerald: "hsl(var(--spectral-emerald))",
          rose:    "hsl(var(--spectral-rose))",
          amber:   "hsl(var(--spectral-amber))",
          violet:  "hsl(var(--spectral-violet))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      backgroundImage: {
        "gradient-hero":      "var(--gradient-hero)",
        "gradient-card":      "var(--gradient-card)",
        "gradient-primary":   "var(--gradient-primary)",
        "gradient-secondary": "var(--gradient-secondary)",
        "gradient-accent":    "var(--gradient-accent)",
      },
      boxShadow: {
        "glow-primary":   "var(--shadow-glow-primary)",
        "glow-secondary": "var(--shadow-glow-secondary)",
        "card":           "var(--shadow-card)",
        "elevated":       "var(--shadow-elevated)",
      },
      spacing: {
        "4.5": "1.125rem",
        "18":  "4.5rem",
        "22":  "5.5rem",
      },
      width: {
        "4.5": "1.125rem",
        "9":   "2.25rem",
        "18":  "4.5rem",
      },
      height: {
        "4.5": "1.125rem",
        "9":   "2.25rem",
        "18":  "4.5rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to:   { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to:   { height: "0", opacity: "0" },
        },
        "fade-in": {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-scale": {
          "0%":   { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-left": {
          "0%":   { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0)",     opacity: "1" },
        },
        "slide-in-right": {
          "0%":   { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)",    opacity: "1" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 12px hsl(var(--primary) / 0.3)" },
          "50%":      { boxShadow: "0 0 28px hsl(var(--primary) / 0.5), 0 0 60px hsl(var(--primary) / 0.15)" },
        },
        "pulse-send": {
          "0%, 100%": { transform: "scale(1)",   boxShadow: "0 3px 14px hsl(var(--primary) / 0.32)" },
          "50%":      { transform: "scale(1.06)", boxShadow: "0 4px 22px hsl(var(--primary) / 0.48)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-8px)" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        typing: {
          "0%, 60%, 100%": { transform: "translateY(0)" },
          "30%":           { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "accordion-down":  "accordion-down 0.2s ease-out",
        "accordion-up":    "accordion-up 0.2s ease-out",
        "fade-in":         "fade-in 0.4s ease-out",
        "fade-in-scale":   "fade-in-scale 0.35s ease-out",
        "slide-in-left":   "slide-in-left 0.3s ease-out",
        "slide-in-right":  "slide-in-right 0.3s ease-out",
        "pulse-glow":      "pulse-glow 2.5s ease-in-out infinite",
        float:             "float 4s ease-in-out infinite",
        shimmer:           "shimmer 2.5s linear infinite",
        typing:            "typing 1.2s ease-in-out infinite",
      },
      transitionTimingFunction: {
        glass: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      backdropBlur: {
        glass: "16px",
        heavy: "32px",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
