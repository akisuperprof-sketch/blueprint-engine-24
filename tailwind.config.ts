import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'blueprint': "linear-gradient(rgba(37, 99, 235, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(37, 99, 235, 0.08) 1px, transparent 1px)",
      },
      backgroundSize: {
        'blueprint': '24px 24px',
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        slate: {
            50: '#F8FAFC',
            900: '#0F172A',
        },
        primary: {
            DEFAULT: '#2563EB',
            hover: '#3B82F6',
        }
      },
    },
  },
  plugins: [],
};
export default config;
