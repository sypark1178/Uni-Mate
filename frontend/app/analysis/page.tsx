"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { EvidenceModal } from "@/components/evidence-modal";
import { PhoneFrame } from "@/components/phone-frame";
import { RecommendationCard } from "@/components/recommendation-card";
import { SectionTabs } from "@/components/section-tabs";
import { mergeHrefWithSearchParams, safeNavigate } from "@/lib/navigation";
import { recommendations } from "@/lib/mock-data";
import type { Recommendation } from "@/lib/types";

export default function AnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Recommendation | null>(null);
  const analysisLoadingHref = mergeHrefWithSearchParams("/analysis/loading?source=analysis", searchParams);

  return (
    <>
      <PhoneFrame title="전형 분석" subtitle="전형 탐색, 갭 분석, 시뮬레이션을 한 흐름 안에서 확인할 수 있어요.">
        <SectionTabs
          tabs={[
            { href: "/analysis", label: "전형 탐색" },
            { href: "/analysis/gap", label: "갭 분석" },
            { href: "/analysis/simulation", label: "시뮬레이션" }
          ]}
        />
        <section className="rounded-[24px] bg-mist p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm text-muted">탐색 요약</div>
              <h2 className="mt-2 text-xl font-semibold">지원 가능한 전형과 보완이 필요한 요소를 정리합니다.</h2>
            </div>
            <button
              type="button"
              onClick={() => safeNavigate(router, analysisLoadingHref)}
              className="whitespace-nowrap rounded-full bg-navy px-4 py-3 text-sm font-semibold text-white"
            >
              AI 분석 시작
            </button>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">
            학교별 전형 요약, 최저 충족 여부, 학생부 반영 비중을 비교한 뒤 대시보드로 자동 반영합니다.
          </p>
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
