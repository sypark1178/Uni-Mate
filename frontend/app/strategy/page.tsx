"use client";

import Link from "next/link";
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
  const activeFilter = (searchParams.get("filter") as "전체" | "도전" | "적정" | "안정" | null) ?? "전체";
  const seededGoals = parseSeededGoals(searchParams);
  const { goals } = useGoals(seededGoals);
  const { summary } = useScoreRecords();
  const recommendations = useMemo(() => buildStrategyRecommendations(goals), [goals]);
  const filterCounts = useMemo(() => {
    const challenge = recommendations.filter((item) => item.category === "도전").length;
    const normal = recommendations.filter((item) => item.category === "적정").length;
    const safe = recommendations.filter((item) => item.category === "안정").length;
    return {
      전체: recommendations.length,
      도전: challenge,
      적정: normal,
      안정: safe
    };
  }, [recommendations]);
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

  const filterHref = (filter: "전체" | "도전" | "적정" | "안정") => {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === "전체") {
      params.delete("filter");
    } else {
      params.set("filter", filter);
    }
    const next = params.toString();
    return next ? `/strategy?${next}` : "/strategy";
  };

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
          notes: `수능 조건·내신 아직 없음\n성적을 넣으면 아래 문장이 더 맞게 바뀌어요.\n이 학교가 보는 키워드 | 과에 맞는지 · 공부 태도 · 앞으로의 가능성`
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
            ? `붙으려면 대략 내신 ${target.toFixed(1)} 전후를 많이 보는 편인데, 지금이랑 ${gap} 정도 차이가 나요. 수능이랑 학생부를 같이 챙기는 게 좋아요.`
            : `내신 차이는 ${gap} 정도로 버틸 만해요. 수능 조건을 못 맞추면 위험할 수 있어요.`
            ,
        적정:
          gapValue > 0.5
            ? `적당히 도전하는 구간인데, 내신이 대략 ${gap} 정도 부족해 보여요. 교과 말고 동아리·봉사 같은 활동도 조금 보태 보세요.`
            : `적당한 구간이에요. 지금처럼 공부하는 속도를 유지하는 게 가장 중요해요.`
            ,
        안정:
          gapValue > 0.7
            ? `비교적 여유 있어 보이지만, 내신이 크게 떨어지면 위험해질 수 있어요.`
            : `여유 있는 구간이에요. 시험에서 실수만 줄이면 돼요.`
      };

      const keywordByMajor = item.major.includes("경영")
        ? "이 학교가 보는 키워드 | 앞장서기 · 문제 풀기 · 숫자·그래프 읽기"
        : item.major.includes("경제")
          ? "이 학교가 보는 키워드 | 자료 읽기 · 말이 맞는지 따지기 · 뉴스 이해"
          : "이 학교가 보는 키워드 | 과에 맞는지 · 공부 태도 · 스스로 계획하기";
      const scoreLineSuffix = mockAverage !== null ? ` / 모의 ${mockAverage.toFixed(1)}` : "";

      return {
        ...item,
        notes: `수능 조건 ${minMet} · 내신 평균 ${schoolText}${scoreLineSuffix}\n조심할 점: ${riskByCategory[item.category]}\n${keywordByMajor}`
      };
    });
  }, [filteredRecommendations, summary.schoolAverage, summary.mockAverage]);

  return (
    <>
      <PhoneFrame title="추천 전략" bottomPaddingClassName={activeFilter === "전체" ? "pb-[66px]" : "pb-0"}>
        <SectionTabs
          tabs={[
            { href: "/strategy", label: "추천 전략" },
            { href: "/strategy/subjects", label: "추천 수강과목" },
            { href: "/strategy/study-plan", label: "추천 공부계획" }
          ]}
        />

        <div className="mb-4">
          <section className="rounded-xl bg-[#ebebeb] px-4 py-3">
            <h2 className="text-sm font-bold leading-tight text-ink">추천 전략이 중요한 이유</h2>
            <p className="mt-1 text-xs leading-snug text-muted">
              지원 가능한 학교를 구간별로 나눠, 합격 가능성을 한눈에 확인할 수 있어요. 전략 없이 지원하면 실패 확률이 높기 때문에, 기준을 잡고 준비하는 것이 중요해요.
            </p>
          </section>
        </div>

        <section className="mt-0">
          <div className="mb-1 flex flex-nowrap items-center gap-1">
            {(["전체", "도전", "적정", "안정"] as const).map((filter) => (
              <Link
                key={filter}
                href={filterHref(filter)}
                prefetch={false}
                className={`inline-flex min-w-[68px] shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                  filter === "전체"
                    ? activeFilter === filter
                      ? "border border-black bg-[#e5e7eb] text-black"
                      : "bg-[#f3f4f6] text-black"
                    : filter === "도전"
                      ? activeFilter === filter
                        ? "border border-black bg-danger text-black"
                        : "bg-danger text-black"
                      : filter === "적정"
                        ? activeFilter === filter
                          ? "border border-black bg-normal text-black"
                          : "bg-normal text-black"
                        : activeFilter === filter
                          ? "border border-black bg-safe text-black"
                          : "bg-safe text-black"
                }`}
              >
                {`${filter} ${filterCounts[filter]}`}
              </Link>
            ))}
          </div>
        </section>
        <section className="mt-0 space-y-3">
          {enrichedRecommendations.length === 0 ? (
            <p className="rounded-[18px] border border-line bg-white p-4 text-sm text-muted">
              이 필터에 해당하는 학교가 아직 없어요. 전체를 누르거나 목표 대학 설정을 확인해 주세요.
            </p>
          ) : (
            enrichedRecommendations.map((item) => (
              <RecommendationCard key={item.id} recommendation={item} onEvidence={setSelected} />
            ))
          )}
        </section>
      </PhoneFrame>
      <BottomNav />
      <EvidenceModal evidence={selected?.evidence ?? null} onClose={() => setSelected(null)} />
    </>
  );
}
