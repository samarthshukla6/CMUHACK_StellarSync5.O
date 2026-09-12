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
        background: "var(--background)",
        foreground: "var(--foreground)",
        "panel": "var(--panel)",
        "panel-strong": "var(--panel-strong)",
        border: "var(--border)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        "accent-2": "var(--accent-2)",
      },
      boxShadow: {
        custom: "var(--shadow)",
      },
      backdropBlur: {
        custom: "var(--blur)",
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'fadeIn': 'fadeIn 0.2s ease-out',
        'slideUp': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        fadeIn: {
          '0%': {
            opacity: '0',
          },
          '100%': {
            opacity: '1',
          },
        },
        slideUp: {
          '0%': {
            transform: 'translateY(20px)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1',
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;

