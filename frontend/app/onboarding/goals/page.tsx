"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OnboardingStep } from "@/components/onboarding-step";
import { getMajorsByUniversity, onboardingTabs, universityOptions } from "@/lib/admission-data";
import { onboardingSelectFieldClass } from "@/lib/onboarding-buttons";
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
const constrainedSelectClass = `${onboardingSelectFieldClass} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-muted`;

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

function syncGoalsForMode(goalRanks: GoalRankState[], mode: (typeof onboardingTabs)[number]): GoalRankState[] {
  if (mode === onboardingTabs[0]) {
    const primaryUniversity = goalRanks[0]?.university || fallbackUniversity;
    const primaryMajors = getMajorsByUniversity(primaryUniversity);
    return goalRanks.map((item, index) =>
      index === 0
        ? item
        : {
            ...item,
            university: primaryUniversity,
            major: item.major && primaryMajors.includes(item.major) ? item.major : ""
          }
    );
  }

  if (mode === onboardingTabs[1]) {
    const primaryMajor = goalRanks[0]?.major ?? "";
    return goalRanks.map((item, index) => (index === 0 ? item : { ...item, major: primaryMajor }));
  }

  return goalRanks;
}

function goalRanksChanged(left: GoalRankState[], right: GoalRankState[]) {
  return JSON.stringify(left) !== JSON.stringify(right);
}

export default function OnboardingGoalsPage() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const seededGoals = useMemo(() => parseSeededGoals(searchParams), [searchParams.toString()]);
  const { goals, updateGoals, hydrated } = useGoals(seededGoals);
  const [activeMode, setActiveMode] = useState<(typeof onboardingTabs)[number]>(onboardingTabs[1]);
  const [hasUserEditedGoals, setHasUserEditedGoals] = useState(false);
  const [goalRanks, setGoalRanks] = useState<GoalRankState[]>(
    initialUniversities.map((university) => ({
      university,
      major: getMajorsByUniversity(university)[0] ?? ""
    }))
  );

  useEffect(() => {
    if (!hasUserEditedGoals && hydrated) {
      setGoalRanks(
        normalizeGoalRanks(
          goals.length > 0
            ? goals
            : initialUniversities.map((university) => ({
                university,
                major: getMajorsByUniversity(university)[0] ?? ""
              }))
        )
      );
    }
  }, [goals, hasUserEditedGoals, hydrated]);

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
    const next = syncGoalsForMode(
      goalRanks.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              university,
              major: ""
            }
          : item
      ),
      activeMode
    );

    setGoalRanks(next);
    updateGoals(next);
  };

  const handleMajorChange = (index: number, major: string) => {
    setHasUserEditedGoals(true);
    const next = syncGoalsForMode(
      goalRanks.map((item, itemIndex) => (itemIndex === index ? { ...item, major } : item)),
      activeMode
    );
    setGoalRanks(next);
    updateGoals(next);
  };

  const handleModeChange = (mode: (typeof onboardingTabs)[number]) => {
    setActiveMode(mode);
    const next = syncGoalsForMode(goalRanks, mode);
    if (!goalRanksChanged(goalRanks, next)) {
      return;
    }
    setHasUserEditedGoals(true);
    setGoalRanks(next);
    updateGoals(next);
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
      nextLabel={hydrated ? "AI 분석 시작" : "불러오는 중..."}
      nextDisabled={!hydrated}
    >
      {!hydrated ? (
        <div className="rounded-[22px] border border-line bg-white p-5 text-sm leading-6 text-muted">
          저장된 목표정보를 불러오는 중입니다.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {onboardingTabs.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => handleModeChange(label)}
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
            const universityLocked = activeMode === onboardingTabs[0] && index > 0;
            const majorLocked = activeMode === onboardingTabs[1] && index > 0;

            return (
              <div key={index} className="rounded-[22px] border border-navy p-4 ring-2 ring-navy/20">
                <div className="mb-3 text-sm font-semibold text-black">{index + 1}순위 희망</div>
                <div className="space-y-3">
                  <select
                    className={constrainedSelectClass}
                    value={goalRank.university}
                    disabled={universityLocked}
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
                    className={constrainedSelectClass}
                    value={goalRank.major}
                    disabled={majorLocked}
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
        </>
      )}
    </OnboardingStep>
  );
}
