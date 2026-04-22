"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OnboardingStep } from "@/components/onboarding-step";
import { getMajorsByUniversity, onboardingTabs, universityOptions } from "@/lib/admission-data";
import { parseSeededGoals } from "@/lib/planning";
import { useGoals } from "@/lib/use-goals";

type GoalRankState = {
  university: string;
  major: string;
};

const initialUniversities = universityOptions.slice(0, 3);
const fallbackUniversity = universityOptions[0] ?? "";

function normalizeGoalRanks(input: GoalRankState[]): GoalRankState[] {
  return input.map((item) => {
    const university = universityOptions.includes(item.university) ? item.university : fallbackUniversity;
    const major = item.major ?? "";
    return { university, major };
  });
}

export default function OnboardingGoalsPage() {
  const searchParams = useSearchParams();
  const focus = Number(searchParams.get("focus") ?? "1");
  const seededGoals = parseSeededGoals(searchParams);
  const { goals, updateGoals, hydrated, flushGoalsToServer } = useGoals(seededGoals);
  const [activeMode, setActiveMode] = useState<(typeof onboardingTabs)[number]>(onboardingTabs[1]);
  const [goalRanks, setGoalRanks] = useState<GoalRankState[]>(
    goals.length > 0
      ? goals
      : initialUniversities.map((university) => ({
          university,
          major: getMajorsByUniversity(university)[0] ?? ""
        }))
  );

  useEffect(() => {
    if (hydrated && goals.length > 0) {
      setGoalRanks(normalizeGoalRanks(goals));
    }
  }, [goals, hydrated]);

  const helperText = useMemo(() => {
    if (activeMode === onboardingTabs[0]) {
      return "학교 중심 모드: 학교 우선순위를 기준으로 학과를 탐색합니다.";
    }
    if (activeMode === onboardingTabs[2]) {
      return "둘 다 모드: 학교와 학과를 함께 고려해 균형 있게 목표를 설정합니다.";
    }
    return "학과 중심 모드: 같은 학과를 여러 학교에서 비교하면서 우선순위를 정리합니다.";
  }, [activeMode]);

  const handleUniversityChange = (index: number, university: string) => {
    const next = goalRanks.map((item, itemIndex) =>
      itemIndex === index
        ? {
            university,
            major: ""
          }
        : item
    );

    setGoalRanks(next);
    updateGoals(next);
  };

  const handleMajorChange = (index: number, major: string) => {
    const next = goalRanks.map((item, itemIndex) => (itemIndex === index ? { ...item, major } : item));
    setGoalRanks(next);
    updateGoals(next);
  };

  const handleNext = async () => {
    await flushGoalsToServer();
  };

  return (
    <OnboardingStep
      step="3/3"
      title="목표 대학과 학과를 설정해 주세요"
      subtitle="학교와 학과 우선순위를 정리하면 AI 분석과 전략 추천으로 바로 이어집니다."
      prevHref="/onboarding/grades"
      nextHref="/analysis/loading?source=goals"
      nextLabel="AI 분석 시작"
      onNext={handleNext}
    >
      <div className="grid grid-cols-3 gap-2">
        {onboardingTabs.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => setActiveMode(label)}
            className={`rounded-full border px-3 py-3 text-sm font-semibold ${
              activeMode === label ? "border-navy bg-navy text-white" : "border-line bg-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="rounded-[22px] bg-mist px-4 py-3 text-sm text-muted">{helperText}</div>
      {goalRanks.map((goalRank, index) => {
        const majors = getMajorsByUniversity(goalRank.university);
        const majorOptions = goalRank.major && !majors.includes(goalRank.major) ? [goalRank.major, ...majors] : majors;

        return (
          <div
            key={index}
            className={`rounded-[22px] border p-4 ${
              focus === index + 1 ? "border-navy ring-2 ring-navy/20" : "border-line"
            }`}
          >
            <div className="mb-3 text-sm font-semibold text-navy">{index + 1}순위 목표</div>
            <div className="space-y-3">
              <select
                className="w-full rounded-xl border border-line px-4 py-3"
                value={goalRank.university}
                onChange={(event) => handleUniversityChange(index, event.target.value)}
              >
                {universityOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select
                className="w-full rounded-xl border border-line px-4 py-3"
                value={goalRank.major}
                onChange={(event) => handleMajorChange(index, event.target.value)}
              >
                <option value="">학과를 선택해 주세요</option>
                {majorOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      })}
      <div className="rounded-[22px] bg-mist px-4 py-3 text-xs leading-5 text-muted">
        현재 목표 요약:{" "}
        {goalRanks.map((item, index) => `${index + 1}순위 ${item.university} ${item.major}`).join(" / ")}
      </div>
    </OnboardingStep>
  );
}
