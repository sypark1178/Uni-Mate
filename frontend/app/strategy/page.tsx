"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { EvidenceModal } from "@/components/evidence-modal";
import { PhoneFrame } from "@/components/phone-frame";
import { RecommendationCard } from "@/components/recommendation-card";
import { SectionTabs } from "@/components/section-tabs";
import { buildStrategyRecommendations, parseSeededGoals } from "@/lib/planning";
import { useScoreRecords } from "@/lib/score-storage";
import { useGoals } from "@/lib/use-goals";
import type { Recommendation } from "@/lib/types";

export default function StrategyPage() {
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Recommendation | null>(null);
  const [activeFilter, setActiveFilter] = useState<"전체" | "도전" | "적정" | "안정">("전체");
  const seededGoals = parseSeededGoals(searchParams);
  const { goals } = useGoals(seededGoals);
  const { summary } = useScoreRecords();
  const recommendations = useMemo(() => buildStrategyRecommendations(goals), [goals]);
  const firstGoal = goals[0];
  const strategySubtitle = useMemo(() => {
    const schoolAverage = summary.schoolAverage === "-" ? "미입력" : summary.schoolAverage;
    const goalText = firstGoal
      ? `${firstGoal.university}${firstGoal.major ? ` ${firstGoal.major}` : ""} 목표`
      : "목표 미설정";
    return `내신 ${schoolAverage} / ${goalText}`;
  }, [summary.schoolAverage, firstGoal]);

  const filteredRecommendations = useMemo(() => {
    const categoryOrder: Record<Recommendation["category"], number> = {
      도전: 0,
      적정: 1,
      안정: 2
    };

    if (activeFilter === "전체") {
      return [...recommendations].sort((left, right) => {
        const categoryDiff = categoryOrder[left.category] - categoryOrder[right.category];
        if (categoryDiff !== 0) return categoryDiff;
        return left.fitScore - right.fitScore;
      });
    }

    return recommendations
      .filter((item) => item.category === activeFilter)
      .sort((left, right) => left.fitScore - right.fitScore);
  }, [activeFilter, recommendations]);

  const enrichedRecommendations = useMemo(() => {
    const schoolAverageRaw = Number.parseFloat(summary.schoolAverage);
    const schoolAverage = Number.isFinite(schoolAverageRaw) ? schoolAverageRaw : null;
    const mockAverageRaw = Number.parseFloat(summary.mockAverage);
    const mockAverage = Number.isFinite(mockAverageRaw) ? mockAverageRaw : null;

    const categoryTarget: Record<Recommendation["category"], number> = {
      도전: 1.6,
      적정: 2.1,
      안정: 2.7
    };

    return filteredRecommendations.map((item) => {
      if (schoolAverage === null) {
        return {
          ...item,
          notes: `최저충족 미입력 | 내신 미입력\n위험요소 내신 입력 전 단계입니다. 성적 입력 후 격차/위험도를 자동 계산합니다.\n인재상 키워드 | 전공적합 · 학업역량 · 발전가능성`
        };
      }

      const target = categoryTarget[item.category];
      const gapValue = Math.abs(schoolAverage - target);
      const gap = gapValue.toFixed(1);
      const schoolText = schoolAverage.toFixed(1);
      const minMet = schoolAverage <= target + 0.3 ? "O" : "X";
      const riskByCategory: Record<Recommendation["category"], string> = {
        도전:
          gapValue > 0.5
            ? `합격권 내신(${target.toFixed(1)}) 대비 ${gap} 단계 격차로 수능·학생부 보완 필요`
            : `격차 ${gap} 단계로 관리 가능, 수능 최저 관리 실패 시 위험`
            ,
        적정:
          gapValue > 0.5
            ? `적정권(${target.toFixed(1)}) 대비 ${gap} 단계 차이, 비교과 보강 필요`
            : `적정권과 격차 ${gap} 단계, 현재 페이스 유지가 핵심`
            ,
        안정:
          gapValue > 0.7
            ? `안정권이지만 내신 변동 폭이 크면 하락 위험 존재`
            : `안정권(${target.toFixed(1)}) 대비 여유 구간, 실수 관리 중심`
      };

      const keywordByMajor = item.major.includes("경영")
        ? "인재상 키워드 | 리더십 · 문제해결 · 수리해석"
        : item.major.includes("경제")
          ? "인재상 키워드 | 데이터해석 · 논리추론 · 시사이해"
          : "인재상 키워드 | 전공적합 · 학업역량 · 자기주도";
      const scoreLineSuffix = mockAverage !== null ? ` / 모의 ${mockAverage.toFixed(1)}` : "";

      return {
        ...item,
        notes: `최저충족 ${minMet} | 내신 ${schoolText}${scoreLineSuffix}\n위험요소 ${riskByCategory[item.category]}\n${keywordByMajor}`
      };
    });
  }, [filteredRecommendations, summary.schoolAverage, summary.mockAverage]);

  return (
    <>
      <PhoneFrame title="전략 추천" bottomPaddingClassName={activeFilter === "전체" ? "pb-[66px]" : "pb-0"}>
        <SectionTabs
          tabs={[
            { href: "/strategy", label: "전략 추천" },
            { href: "/strategy/subjects", label: "추천 수강과목" },
            { href: "/strategy/study-plan", label: "공부 계획" }
          ]}
        />
        <section className="mt-0">
          <div className="mb-1 flex flex-nowrap items-center gap-1">
            <div className="shrink-0 text-lg font-bold leading-tight">수시 6장 전략</div>
            {(["전체", "도전", "적정", "안정"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`inline-flex min-w-[56px] shrink-0 items-center justify-center whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-semibold leading-none ${
                  filter === "전체"
                    ? activeFilter === filter
                      ? "border border-black bg-[#e5e7eb] text-black"
                      : "bg-[#f3f4f6] text-black"
                    : filter === "도전"
                      ? activeFilter === filter
                        ? "border border-black bg-danger text-ink"
                        : "bg-danger text-black"
                      : filter === "적정"
                        ? activeFilter === filter
                          ? "border border-black bg-normal text-ink"
                          : "bg-normal text-black"
                        : activeFilter === filter
                          ? "border border-black bg-safe text-ink"
                          : "bg-safe text-black"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </section>
        <section className="mt-0 space-y-3">
          {enrichedRecommendations.map((item) => (
            <RecommendationCard key={item.id} recommendation={item} onEvidence={setSelected} />
          ))}
        </section>
      </PhoneFrame>
      <BottomNav />
      <EvidenceModal evidence={selected?.evidence ?? null} onClose={() => setSelected(null)} />
    </>
  );
}
