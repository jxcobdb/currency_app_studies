import type { Config } from "tailwindcss";
import { nextui } from "@nextui-org/react";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "container-light": "#d4d4d4",
        "container-dark": "#403f3f",
      },
    },
  },
  darkMode: "class",
  plugins: [nextui()],
};

export default config;
