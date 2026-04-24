import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "추천 전략 | Uni-Mate"
};

export default function StrategyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
