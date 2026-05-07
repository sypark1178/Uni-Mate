"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OnboardingStep } from "@/components/onboarding-step";
import { mergeHrefWithSearchParams, safeNavigate } from "@/lib/navigation";
import {
  getMajorsByUniversity,
  matchUniversityToDropdownKey,
  onboardingTabs,
  universityOptions
} from "@/lib/admission-data";
import { onboardingSelectFieldClass } from "@/lib/onboarding-buttons";
import type { GoalChoice } from "@/lib/types";
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

function normalizeGoalRanks(input: GoalRankState[]): GoalRankState[] {
  return input.map((item) => {
    const university = matchUniversityToDropdownKey(item.university);
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

function emptyRankTemplate(): GoalRankState {
  return {
    university: universityOptions[0] ?? "",
    major: "",
    strategyType: null,
    status: null,
    note: null
  };
}

function isRankComplete(rank: GoalRankState | undefined): boolean {
  if (!rank) return false;
  return Boolean(String(rank.university ?? "").trim() && String(rank.major ?? "").trim());
}

function goalChoiceToRank(goal: GoalChoice): GoalRankState {
  return {
    university: goal.university ?? "",
    major: goal.major ?? "",
    strategyType: goal.strategyType ?? null,
    status: goal.status ?? null,
    note: goal.note ?? null
  };
}

function appendEmptyRank(slotIndex: number): GoalRankState {
  const university = initialUniversities[slotIndex] ?? universityOptions[slotIndex] ?? universityOptions[0] ?? "";
  return {
    university,
    major: "",
    strategyType: null,
    status: null,
    note: null
  };
}

/** 학과 선택 전 순위 카드까지 잘라 쌓임을 맞춘다 */
function collapseIncompletePrefixRanks(ranks: GoalRankState[]): GoalRankState[] {
  const n = normalizeGoalRanks(ranks.length ? ranks : [emptyRankTemplate()]);
  if (!isRankComplete(n[0])) {
    return [n[0] ?? emptyRankTemplate()];
  }
  if (n.length === 1) {
    return [n[0]];
  }
  if (!isRankComplete(n[1])) {
    return n.slice(0, 2);
  }
  return n.slice(0, Math.min(3, n.length));
}

/** 사용자가 순위 입력을 마친 뒤(학과 선택) 다음 카드까지 열거나, 학교 변경 등에서는 접는다 */
function finalizeAfterCollapseWithTrailingToggle(
  ranks: GoalRankState[],
  options: { addTrailingSlotIfPossible: boolean }
): GoalRankState[] {
  let n = collapseIncompletePrefixRanks(ranks);
  if (!options.addTrailingSlotIfPossible) {
    return n;
  }
  const last = n[n.length - 1];
  if (last && isRankComplete(last) && n.length < 3) {
    return normalizeGoalRanks([...n, appendEmptyRank(n.length)]);
  }
  return n;
}

function sortGoalsByPriority(goals: GoalChoice[]): GoalChoice[] {
  return [...goals].sort((left, right) => (left.priority ?? 999) - (right.priority ?? 999));
}

function ranksToGoalChoices(ranks: GoalRankState[]): GoalChoice[] {
  return ranks.map((rank, index) => ({
    university: rank.university,
    major: (rank.major ?? "").trim(),
    priority: index + 1,
    strategyType: rank.strategyType ?? null,
    status: rank.status ?? null,
    note: rank.note ?? null
  }));
}

/** 저장된 목표 배열 → 화면에 보일 카드(최대 3) */
function resolveRanksFromStoredGoals(sortedInput: GoalChoice[]): GoalRankState[] {
  const sorted = sortGoalsByPriority(sortedInput);
  if (!sorted.length) {
    return [emptyRankTemplate()];
  }
  const rows = normalizeGoalRanks(sorted.map(goalChoiceToRank));
  let n = collapseIncompletePrefixRanks(rows);
  while (n.length < Math.min(sorted.length, 3)) {
    const nextGoal = sorted[n.length];
    if (!nextGoal) {
      break;
    }
    n = normalizeGoalRanks([...n, goalChoiceToRank(nextGoal)]);
    n = collapseIncompletePrefixRanks(n);
    if (!isRankComplete(n[n.length - 1])) {
      break;
    }
  }
  const last = n[n.length - 1];
  if (last && isRankComplete(last) && n.length < 3 && n.length === 1 && sorted.length === 1) {
    return normalizeGoalRanks([...n, appendEmptyRank(n.length)]);
  }
  return normalizeGoalRanks(n.slice(0, 3));
}

export default function OnboardingGoalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const focus = Number(searchParams.get("focus") ?? "1");
  const returnTo = searchParams.get("returnTo");
  const isSettingsEditMode = Boolean(returnTo && returnTo.startsWith("/settings"));

  const searchParamsWithoutReturnTo = useMemo(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("returnTo");
    return next;
  }, [searchParams]);

  const settingsReturnHref = useMemo(() => {
    if (!isSettingsEditMode || !returnTo) {
      return null;
    }
    return mergeHrefWithSearchParams(returnTo, searchParamsWithoutReturnTo);
  }, [isSettingsEditMode, returnTo, searchParamsWithoutReturnTo]);
  const seededGoals = useMemo(() => parseSeededGoals(searchParams), [searchParams.toString()]);
  const hasSeededGoals = seededGoals.length > 0;
  const { goals, updateGoals, hydrated, flushGoalsToServer } = useGoals(seededGoals);
  const [activeMode, setActiveMode] = useState<(typeof onboardingTabs)[number]>(onboardingTabs[1]);
  const [goalRanks, setGoalRanks] = useState<GoalRankState[]>(() => {
    if (hasSeededGoals) {
      return resolveRanksFromStoredGoals(seededGoals.map((g, index) => ({ ...g, priority: index + 1 })));
    }
    return [emptyRankTemplate()];
  });

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    const sorted = sortGoalsByPriority(goals);
    if (sorted.length > 0) {
      setGoalRanks(resolveRanksFromStoredGoals(sorted));
      return;
    }
    setGoalRanks([emptyRankTemplate()]);
  }, [goals, hydrated]);

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
    const drafted = goalRanks.map((item, itemIndex) =>
      itemIndex === index
        ? {
            ...item,
            university,
            major: ""
          }
        : item
    );

    const next = finalizeAfterCollapseWithTrailingToggle(normalizeGoalRanks(drafted), {
      addTrailingSlotIfPossible: false
    });

    setGoalRanks(next);
    updateGoals(ranksToGoalChoices(next));
  };

  const handleMajorChange = (index: number, major: string) => {
    const drafted = normalizeGoalRanks(goalRanks.map((item, itemIndex) => (itemIndex === index ? { ...item, major } : item)));
    const next = finalizeAfterCollapseWithTrailingToggle(drafted, { addTrailingSlotIfPossible: true });
    setGoalRanks(next);
    updateGoals(ranksToGoalChoices(next));
  };

  const handleRemoveRank = (index: number) => {
    const drafted =
      goalRanks.length <= 1
        ? [emptyRankTemplate()]
        : goalRanks.filter((_, itemIndex) => itemIndex !== index);
    const next = finalizeAfterCollapseWithTrailingToggle(normalizeGoalRanks(drafted), {
      addTrailingSlotIfPossible: false
    });
    setGoalRanks(next);
    updateGoals(ranksToGoalChoices(next));
  };

  const [goalSavePending, setGoalSavePending] = useState(false);

  const handleNext = async () => {
    await flushGoalsToServer(ranksToGoalChoices(goalRanks));
  };

  const handleSaveGoals = async () => {
    if (!hydrated) {
      return;
    }
    setGoalSavePending(true);
    try {
      await flushGoalsToServer(ranksToGoalChoices(goalRanks));
    } catch {
      window.alert("저장에 실패했어요. 네트워크를 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setGoalSavePending(false);
    }
  };

  const handleBackToSettings = () => {
    if (!settingsReturnHref) {
      return;
    }
    safeNavigate(router, settingsReturnHref);
  };

  return (
    <OnboardingStep
      step="3/3"
      title={isSettingsEditMode ? "목표 정보 수정하기" : "목표를 설정해 주세요"}
      subtitle="우선순위를 정리하면 바로 AI 분석·추천이 진행됩니다."
      showStepIndicator={!isSettingsEditMode}
      {...(isSettingsEditMode
        ? {
            settingsEditFooter: {
              onSave: handleSaveGoals,
              onBack: handleBackToSettings,
              savePending: goalSavePending,
              saveDisabled: !hydrated
            }
          }
        : {
            prevHref: "/onboarding/grades",
            nextHref: "/analysis/loading?source=goals",
            nextLabel: hydrated ? "AI 분석 시작" : "불러오는 중...",
            nextDisabled: !hydrated,
            onNext: handleNext
          })}
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
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-black">
                {index + 1}순위 희망
              </div>
              <button
                type="button"
                onClick={() => handleRemoveRank(index)}
                className="shrink-0 text-xs font-medium text-muted hover:text-ink"
              >
                삭제하기
              </button>
            </div>
            <div className="space-y-3">
              <select
                className={onboardingSelectFieldClass}
                value={goalRank.university}
                onChange={(event) => handleUniversityChange(index, event.target.value)}
              >
                {!universityOptions.includes(goalRank.university) && goalRank.university ? (
                  <option key="__saved-university" value={goalRank.university}>
                    {goalRank.university}
                  </option>
                ) : null}
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
