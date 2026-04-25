 "use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { PhoneFrame } from "@/components/phone-frame";
import { SectionTabs } from "@/components/section-tabs";
import { SimulationPanel } from "@/components/simulation-panel";
import { compactGoalLine } from "@/lib/goal-display";
import { buildGoalAnalyses, defaultGoals, parseSeededGoals } from "@/lib/planning";
import { useGoals } from "@/lib/use-goals";

function AnalysisSimulationPageInner() {
  const searchParams = useSearchParams();
  const seededGoals = useMemo(() => parseSeededGoals(searchParams), [searchParams]);
  const { goals } = useGoals(seededGoals);
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
  const selectedGoalLabel = compactGoalLine(selectedGoal.university, selectedGoal.major);

  return (
    <>
      <PhoneFrame title="시뮬레이션">
        <SectionTabs
          tabs={[
            { href: "/analysis", label: "전형 탐색" },
            { href: "/analysis/gap", label: "갭 분석" },
            { href: "/analysis/simulation", label: "시뮬레이션" }
          ]}
        />
        <section className="mb-4 rounded-xl bg-[#ebebeb] px-4 py-3">
          <h2 className="app-info-title">시뮬레이션이란?</h2>
          <p className="mt-1 app-info-body">
            성적 조건을 바꾸면 합격 가능성이 어떻게 달라지는지 즉시 확인할 수 있어요. 어디에 집중해야 할지 판단하는 데 도움이 돼요.
          </p>
        </section>
        <div className="mb-4 grid grid-cols-3 gap-2">
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
        <SimulationPanel
          key={`${selectedGoal.university}-${selectedGoal.major}-${selectedGoalIndex}`}
          baseRate={selectedAnalysis?.fitScore ?? 31}
          contextLabel={selectedGoalLabel}
        />
      </PhoneFrame>
      <BottomNav />
    </>
  );
}

function SimulationFallback() {
  return (
    <>
      <PhoneFrame title="시뮬레이션">
        <SectionTabs
          tabs={[
            { href: "/analysis", label: "전형 탐색" },
            { href: "/analysis/gap", label: "갭 분석" },
            { href: "/analysis/simulation", label: "시뮬레이션" }
          ]}
        />
        <p className="text-sm text-muted">불러오는 중…</p>
      </PhoneFrame>
      <BottomNav />
    </>
  );
}

export default function AnalysisSimulationPage() {
  return (
    <Suspense fallback={<SimulationFallback />}>
      <AnalysisSimulationPageInner />
    </Suspense>
  );
}
