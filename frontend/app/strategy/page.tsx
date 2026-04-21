"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { EvidenceModal } from "@/components/evidence-modal";
import { PhoneFrame } from "@/components/phone-frame";
import { RecommendationCard } from "@/components/recommendation-card";
import { SectionTabs } from "@/components/section-tabs";
import { buildStrategyRecommendations, parseSeededGoals } from "@/lib/planning";
import { useGoals } from "@/lib/use-goals";
import type { Recommendation } from "@/lib/types";

export default function StrategyPage() {
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Recommendation | null>(null);
  const seededGoals = parseSeededGoals(searchParams);
  const { goals } = useGoals(seededGoals);
  const recommendations = useMemo(() => buildStrategyRecommendations(goals), [goals]);

  const summaryItems = useMemo(
    () => [
      {
        label: "도전",
        count: recommendations.filter((item) => item.category === "도전").length,
        className: "bg-danger"
      },
      {
        label: "적정",
        count: recommendations.filter((item) => item.category === "적정").length,
        className: "bg-normal"
      },
      {
        label: "안정",
        count: recommendations.filter((item) => item.category === "안정").length,
        className: "bg-safe"
      }
    ],
    [recommendations]
  );

  return (
    <>
      <PhoneFrame title="전략 추천" subtitle="수시 6장 배치와 추천 수강과목, 우선순위 조정을 한 페이지에서 확인합니다.">
        <SectionTabs
          tabs={[
            { href: "/strategy", label: "전략 추천" },
            { href: "/strategy/subjects", label: "추천 수강과목" }
          ]}
        />
        <section className="rounded-[24px] bg-mist p-4">
          <div className="text-sm text-muted">권장 배치</div>
          <div className="mt-3 space-y-2">
            {summaryItems.map((item) => (
              <div
                key={item.label}
                className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold ${item.className}`}
              >
                <span>{item.label}</span>
                <span>{item.count}개</span>
              </div>
            ))}
          </div>
        </section>
        <section className="mt-4 space-y-3">
          {recommendations.map((item) => (
            <RecommendationCard key={item.id} recommendation={item} onEvidence={setSelected} />
          ))}
        </section>
      </PhoneFrame>
      <BottomNav />
      <EvidenceModal evidence={selected?.evidence ?? null} onClose={() => setSelected(null)} />
    </>
  );
}
