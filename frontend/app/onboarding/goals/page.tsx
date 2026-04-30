"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OnboardingStep } from "@/components/onboarding-step";
import { getMajorsByUniversity, onboardingTabs, universityOptions } from "@/lib/admission-data";
import { onboardingFormFieldClass, onboardingSelectFieldClass } from "@/lib/onboarding-buttons";
import { parseSeededGoals } from "@/lib/planning";
import { useGoals } from "@/lib/use-goals";

type GoalRankState = {
  university: string;
  major: string;
  strategyType?: string | null;
  status?: string | null;
  note?: string | null;
};

const initialUniversities = universityOptions.slice(0, 3);
const fallbackUniversity = universityOptions[0] ?? "";

function normalizeGoalRanks(input: GoalRankState[]): GoalRankState[] {
  return input.map((item) => {
    const university = universityOptions.includes(item.university) ? item.university : fallbackUniversity;
    const major = item.major ?? "";
    return {
      university,
      major,
      strategyType: item.strategyType ?? null,
      status: item.status ?? null,
      note: item.note ?? null
    };
  });
}

function defaultStrategyByRank(rankIndex: number): string {
  if (rankIndex === 0) return "도전";
  if (rankIndex === 1) return "적정";
  return "안정";
}

export default function OnboardingGoalsPage() {
  const searchParams = useSearchParams();
  const focus = Number(searchParams.get("focus") ?? "1");
  const returnTo = searchParams.get("returnTo");
  const seededGoals = useMemo(() => parseSeededGoals(searchParams), [searchParams.toString()]);
  const hasSeededGoals = seededGoals.length > 0;
  const { goals, updateGoals, hydrated, flushGoalsToServer } = useGoals(seededGoals);
  const [activeMode, setActiveMode] = useState<(typeof onboardingTabs)[number]>(onboardingTabs[1]);
  const [hasUserEditedGoals, setHasUserEditedGoals] = useState(false);
  const [goalRanks, setGoalRanks] = useState<GoalRankState[]>(
    hasSeededGoals
      ? normalizeGoalRanks(seededGoals)
      : goals.length > 0
      ? goals
      : initialUniversities.map((university) => ({
          university,
          major: getMajorsByUniversity(university)[0] ?? ""
        }))
  );

  useEffect(() => {
    if (!hasSeededGoals && !hasUserEditedGoals && hydrated && goals.length > 0) {
      setGoalRanks(normalizeGoalRanks(goals));
    }
  }, [goals, hasSeededGoals, hasUserEditedGoals, hydrated]);

  const helperText = useMemo(() => {
    if (activeMode === onboardingTabs[0]) {
      return "학교가 중요하다면 선택해주세요.";
    }
    if (activeMode === onboardingTabs[2]) {
      return "학교, 학과 둘 다 중요하다면 선택해주세요.";
    }
    return "학과가 중요하다면 선택해주세요.";
  }, [activeMode]);

  const handleUniversityChange = (index: number, university: string) => {
    setHasUserEditedGoals(true);
    const next = goalRanks.map((item, itemIndex) =>
      itemIndex === index
        ? {
            ...item,
            university,
            major: ""
          }
        : item
    );

    setGoalRanks(next);
    updateGoals(next);
  };

  const handleMajorChange = (index: number, major: string) => {
    setHasUserEditedGoals(true);
    const next = goalRanks.map((item, itemIndex) => (itemIndex === index ? { ...item, major } : item));
    setGoalRanks(next);
    updateGoals(next);
  };

  const handleNext = async () => {
    await flushGoalsToServer(goalRanks);
  };

  return (
    <OnboardingStep
      step="3/3"
      title="목표를 설정해 주세요"
      subtitle="우선순위를 정리하면 바로 AI 분석·추천이 진행됩니다."
      prevHref="/onboarding/grades"
      postPrevLink={
        returnTo && returnTo.startsWith("/")
          ? { href: returnTo, label: "호출한 메뉴로 돌아가기", plainHref: true }
          : undefined
      }
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
      <div className="-mt-1 px-1 text-xs leading-snug text-muted">{helperText}</div>
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
            <div className="mb-3 text-sm font-semibold text-black">{index + 1}순위 희망</div>
            <div className="space-y-3">
              <select
                className={onboardingSelectFieldClass}
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
                required
                className={onboardingSelectFieldClass}
                value={goalRank.major}
                onChange={(event) => handleMajorChange(index, event.target.value)}
              >
                <option value="" disabled>
                  학과를 선택해 주세요
                </option>
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
    </OnboardingStep>
  );
}
