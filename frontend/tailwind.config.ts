import type { Config } from "tailwindcss";

/** 사용자 지정 기준 핑크 — 도전 칩·목표대학 1순위 원 등 “핑크” 요청 시 이 톤으로 통일 */
const REFERENCE_PINK = "#F5D3D1";
/** 사용자 지정 연한 초록 — 안정·3순위 원·학년 칩·진행 등 `bg-safe`로 통일 */
const REFERENCE_MINT = "#E2F1E3";

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
        safe: REFERENCE_MINT,
        normal: "#D8E8F8",
        danger: REFERENCE_PINK,
        goalRank1: REFERENCE_PINK,
        goalRank2: "#D6EBF6",
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
