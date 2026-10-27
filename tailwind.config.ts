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
        aws: {
          squid: "#232f3e",
          orange: "#ff9900",
          blue: "#0073bb",
          smile: "#146eb4",
          light: "#f2f3f3",
        },
      },
    },
  },
  plugins: [],
};

export default config;
