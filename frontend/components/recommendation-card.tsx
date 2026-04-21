"use client";

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

export function RecommendationCard({ recommendation, onEvidence }: RecommendationCardProps) {
  return (
    <article className="rounded-[22px] border border-line bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-lg font-semibold">
            {recommendation.university} {recommendation.major}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">{recommendation.notes}</p>
        </div>
        <span
          className={`inline-flex min-w-[68px] shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${categoryClassMap[recommendation.category]}`}
        >
          {recommendation.category}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-mist px-4 py-3">
        <span className="text-sm text-muted">합격 가능성</span>
        <span className="text-xl font-semibold text-navy">{recommendation.fitScore}%</span>
      </div>
      <button
        type="button"
        className="mt-4 w-full rounded-xl border border-line px-4 py-3 text-sm font-semibold text-navy"
        onClick={() => onEvidence(recommendation)}
      >
        근거 보기
      </button>
    </article>
  );
}
