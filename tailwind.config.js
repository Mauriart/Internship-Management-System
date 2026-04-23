/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(214 32% 91%)",
        input: "hsl(214 32% 91%)",
        ring: "hsl(197 84% 34%)",
        background: "hsl(210 33% 98%)",
        foreground: "hsl(222 47% 11%)",
        primary: {
          DEFAULT: "hsl(197 84% 34%)",
          foreground: "hsl(210 40% 98%)",
        },
        secondary: {
          DEFAULT: "hsl(45 93% 90%)",
          foreground: "hsl(28 72% 22%)",
        },
        muted: {
          DEFAULT: "hsl(210 24% 94%)",
          foreground: "hsl(215 16% 35%)",
        },
        accent: {
          DEFAULT: "hsl(157 41% 88%)",
          foreground: "hsl(161 65% 20%)",
        },
        destructive: {
          DEFAULT: "hsl(0 72% 51%)",
          foreground: "hsl(210 40% 98%)",
        },
        card: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(222 47% 11%)",
        },
      },
      borderRadius: {
        lg: "1rem",
        md: "0.75rem",
        sm: "0.5rem",
      },
      boxShadow: {
        soft: "0 18px 48px -24px rgb(15 23 42 / 0.28)",
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
};
