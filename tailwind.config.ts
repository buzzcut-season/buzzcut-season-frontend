import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 0 1px rgba(255, 105, 180, 0.35), 0 10px 30px rgba(0,0,0,0.55)",
      },
      colors: {
        ink: {
          950: "#07060a",
          900: "#0b0910",
          800: "#12101a"
        }
      }
    },
  },
  plugins: [],
} satisfies Config;
