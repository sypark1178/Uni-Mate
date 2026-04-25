"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { EvidenceModal } from "@/components/evidence-modal";
import { AdmissionRadarSection } from "@/components/admission-radar-section";
import { PhoneFrame } from "@/components/phone-frame";
import { SectionTabs } from "@/components/section-tabs";
import { compactGoalLine, goalRankNumberToneClass } from "@/lib/goal-display";
import { buildGoalAnalyses, defaultGoals, parseSeededGoals } from "@/lib/planning";
import { useScoreRecords } from "@/lib/score-storage";
import { useGoals } from "@/lib/use-goals";
import type { Recommendation } from "@/lib/types";

function GapAnalysisViewInner() {
  const searchParams = useSearchParams();
  const seededGoals = useMemo(() => parseSeededGoals(searchParams), [searchParams]);
  const { goals } = useGoals(seededGoals);
  const { summary } = useScoreRecords();
  const [selected, setSelected] = useState<Recommendation | null>(null);
  const [selectedGoalIndex, setSelectedGoalIndex] = useState(0);

  const rankedGoals = useMemo(() => {
    const filled = goals.filter((g) => g.university?.trim() && g.major?.trim()).slice(0, 3);
    return filled.length > 0 ? filled : defaultGoals;
  }, [goals]);
  const goalAnalyses = useMemo(() => buildGoalAnalyses(rankedGoals), [rankedGoals]);

  useEffect(() => {
    if (selectedGoalIndex > rankedGoals.length - 1) {
      setSelectedGoalIndex(0);
    }
  }, [rankedGoals.length, selectedGoalIndex]);

  const selectedGoal = rankedGoals[selectedGoalIndex] ?? rankedGoals[0];
  const selectedAnalysis = goalAnalyses[selectedGoalIndex] ?? goalAnalyses[0];
  const schoolAverage = Number.parseFloat(summary.schoolAverage);
  const schoolAverageText = Number.isFinite(schoolAverage) ? schoolAverage.toFixed(1) : "-";

  const topGaps = useMemo(() => {
    const uni = selectedGoal.university || "목표대학";
    const major = selectedGoal.major || "목표학과";
    const targetSchool = selectedAnalysis?.category === "도전" ? "1.5" : selectedAnalysis?.category === "적정" ? "2.0" : "2.5";

    return [
      {
        rank: 1,
        title: "내신 0.5 갭",
        desc: `${uni} ${major} 합격선 ${targetSchool}`,
        tone: "warn" as const,
        label: "주의"
      },
      {
        rank: 2,
        title: "세특 키워드 갭",
        desc: `${major} 관련 활동 키워드 보완 필요`,
        tone: "good" as const,
        label: "보완가능"
      },
      {
        rank: 3,
        title: "수능최저 영어",
        desc: "최저 2등급 필요",
        tone: "focus" as const,
        label: "집중필요"
      }
    ];
  }, [schoolAverageText, selectedAnalysis?.category, selectedGoal.major, selectedGoal.university]);

  return (
    <>
      <PhoneFrame title="갭 분석">
        <SectionTabs
          tabs={[
            { href: "/analysis", label: "전형 탐색" },
            { href: "/analysis/gap", label: "갭 분석" },
            { href: "/analysis/simulation", label: "시뮬레이션" }
          ]}
        />
        <section className="rounded-xl bg-[#ebebeb] px-4 py-3">
          <h2 className="app-info-title">갭 분석이란 ?</h2>
          <p className="mt-1 app-info-body">
            목표 대학 합격 기준과 현재 내 성적·생기부를 비교해 어디가 부족한지 볼 수 있도록 보여줘요. 지표를 한눈에 비교해 어디를 채울지 균형을 보세요.
          </p>
        </section>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {rankedGoals.map((goal, index) => {
            const isActive = selectedGoalIndex === index;
            const label = compactGoalLine(goal.university, goal.major);
            return (
              <button
                key={`${goal.university}-${goal.major}-${index}`}
                type="button"
                onClick={() => setSelectedGoalIndex(index)}
                className={`goal-chip-button truncate ${
                  isActive ? "goal-chip-button-active" : "goal-chip-button-inactive"
                }`}
                title={`${goal.university} ${goal.major}`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <AdmissionRadarSection
          university={selectedGoal.university}
          major={selectedGoal.major}
          schoolAverage={summary.schoolAverage}
          mockAverage={summary.mockAverage}
          admissionChance={goalAnalyses[selectedGoalIndex]?.fitScore}
          admissionCategory={goalAnalyses[selectedGoalIndex]?.category}
        />
        <section className="mt-4">
          <h3 className="app-section-title mb-2">부족 요소 TOP 3</h3>
          <div className="space-y-3">
            {topGaps.map((item) => {
              const labelTone =
                item.tone === "warn" ? "bg-danger text-ink" : item.tone === "good" ? "bg-safe text-ink" : "bg-normal text-ink";

              return (
                <article
                  key={`gap-top-${item.rank}`}
                  className="flex items-start justify-between gap-3 rounded-[18px] border border-line bg-white p-3"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${goalRankNumberToneClass(item.rank - 1)}`}
                    >
                      {item.rank}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold leading-tight">{item.title}</p>
                      <p className="mt-2 text-xs leading-5 text-muted">{item.desc}</p>
                    </div>
                  </div>
                  <span className={`inline-flex min-w-[68px] shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${labelTone}`}>
                    {item.label}
                  </span>
                </article>
              );
            })}
          </div>
        </section>
      </PhoneFrame>
      <BottomNav />
      <EvidenceModal evidence={selected?.evidence ?? null} onClose={() => setSelected(null)} />
    </>
  );
}

function GapFallback() {
  return (
    <>
      <PhoneFrame title="갭 분석">
        <p className="text-sm text-muted">불러오는 중…</p>
      </PhoneFrame>
      <BottomNav />
    </>
  );
}

export function GapAnalysisView() {
  return (
    <Suspense fallback={<GapFallback />}>
      <GapAnalysisViewInner />
    </Suspense>
  );
}
