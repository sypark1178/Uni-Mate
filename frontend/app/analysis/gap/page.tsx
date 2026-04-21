"use client";

import { useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { EvidenceModal } from "@/components/evidence-modal";
import { GapAnalysisCard } from "@/components/gap-analysis-card";
import { PhoneFrame } from "@/components/phone-frame";
import { RecommendationCard } from "@/components/recommendation-card";
import { SectionTabs } from "@/components/section-tabs";
import { recommendations } from "@/lib/mock-data";
import type { Recommendation } from "@/lib/types";

export default function AnalysisGapPage() {
  const [selected, setSelected] = useState<Recommendation | null>(null);

  return (
    <>
      <PhoneFrame title="갭 분석" subtitle="현재 위치와 목표 조건의 차이를 과목, 최저, 활동 기준으로 나눠 보여줍니다.">
        <SectionTabs
          tabs={[
            { href: "/analysis", label: "전형 탐색" },
            { href: "/analysis/gap", label: "갭 분석" },
            { href: "/analysis/simulation", label: "시뮬레이션" }
          ]}
        />
        <div className="space-y-3">
          <GapAnalysisCard title="교과 평균" current="1.8등급" target="1.5등급" action="다음 시험에서 수학과 영어를 우선 끌어올리는 계획이 필요합니다." />
          <GapAnalysisCard title="수능 최저" current="2개 합 6 예상" target="2개 합 5" action="영어 1등급 확보가 가장 큰 레버리지입니다." />
          <GapAnalysisCard title="전공 적합 활동" current="경제 관련 활동 1건" target="3건 이상" action="세특, 독서, 탐구활동을 경영/경제 방향으로 정렬하세요." />
        </div>
        <section className="mt-4 space-y-3">
          {recommendations.slice(0, 2).map((item) => (
            <RecommendationCard key={item.id} recommendation={item} onEvidence={setSelected} />
          ))}
        </section>
      </PhoneFrame>
      <BottomNav />
      <EvidenceModal evidence={selected?.evidence ?? null} onClose={() => setSelected(null)} />
    </>
  );
}
