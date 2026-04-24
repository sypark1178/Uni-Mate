"use client";

import { compactGoalLine } from "@/lib/goal-display";
import type { Recommendation } from "@/lib/types";

type RecommendationCardProps = {
  recommendation: Recommendation;
  onEvidence: (recommendation: Recommendation) => void;
};

const categoryClassMap: Record<Recommendation["category"], string> = {
  도전: "bg-danger text-ink",
  적정: "bg-normal text-ink",
  안정: "bg-safe text-ink"
};

const categoryTextClassMap: Record<Recommendation["category"], string> = {
  도전: "text-[#e18a8a]",
  적정: "text-[#6fa0d6]",
  안정: "text-[#72b78a]"
};

export function RecommendationCard({ recommendation, onEvidence }: RecommendationCardProps) {
  const noteLines = recommendation.notes
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <article className="rounded-[18px] border border-line bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-semibold leading-tight">
            {compactGoalLine(recommendation.university, recommendation.major)}
          </div>
          <div className="mt-2 space-y-1.5">
            {noteLines.map((line, idx) => (
              <p
                key={`${recommendation.id}-line-${idx}`}
                className={`text-xs leading-5 text-muted ${line.startsWith("이 학교가 보는 키워드 |") ? "whitespace-nowrap" : ""}`}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
        <span
          className={`inline-flex min-w-[68px] shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${categoryClassMap[recommendation.category]}`}
        >
          {recommendation.category}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className={`text-sm font-semibold ${categoryTextClassMap[recommendation.category]}`}>합격가능성 {recommendation.fitScore}%</span>
        <button
          type="button"
          className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white"
          onClick={() => onEvidence(recommendation)}
        >
          근거 보기
        </button>
      </div>
    </article>
  );
}
