import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        navy: "#15356A",
        ink: "#101828",
        mist: "#F4F7FB",
        line: "#D8E0EC",
        muted: "#667085",
        safe: "#D9EED6",
        normal: "#D8E8F8",
        danger: "#F5D3D1",
        accent: "#FC8B00"
      },
      boxShadow: {
        soft: "0 18px 40px rgba(21, 53, 106, 0.08)"
      },
      borderRadius: {
        phone: "28px"
      }
    }
  },
  plugins: []
};

export default config;
