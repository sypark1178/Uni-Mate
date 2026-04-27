"use client";

import { useEffect, useState } from "react";
import type { GoalChoice } from "@/lib/types";
import { defaultGoals, goalStorageKey } from "@/lib/planning";
import { normalizeUniversityName } from "@/lib/admission-data";
import { clearDraftGoals, getDraftGoals, isDraftDirty, setDraftGoals } from "@/lib/draft-store";
import { getCurrentMember } from "@/lib/member-store";

function normalizeStoredGoals(goals: GoalChoice[]): GoalChoice[] {
  return goals.map((goal) => ({
    university: normalizeUniversityName(goal.university),
    major: (goal.major ?? "").trim(),
    priority: typeof goal.priority === "number" ? goal.priority : null,
    strategyType: goal.strategyType ?? null,
    status: goal.status ?? null,
    note: goal.note ?? null
  }));
}

function getCurrentUserKey() {
  return getCurrentMember()?.userId?.trim() || "local-user";
}

function getScopedGoalStorageKey() {
  return `${goalStorageKey}:${getCurrentUserKey()}`;
}

function persistGoalsLocally(goals: GoalChoice[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getScopedGoalStorageKey(), JSON.stringify(goals));
  if (getCurrentUserKey() === "local-user") {
    window.localStorage.setItem(goalStorageKey, JSON.stringify(goals));
  }
}

async function loadGoalsFromServer(userKey?: string) {
  if (typeof window === "undefined") return null;
  try {
    const response = await fetch("/api/onboarding/goals", {
      method: "GET",
      cache: "no-store",
      headers: { "x-user-key": userKey || getCurrentUserKey() }
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: GoalChoice[] };
    if (!Array.isArray(payload.data) || payload.data.length === 0) return null;
    return normalizeStoredGoals(payload.data.slice(0, 3));
  } catch {
    return null;
  }
}

async function persistGoalsToServer(goals: GoalChoice[]) {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/onboarding/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-key": getCurrentUserKey() },
      body: JSON.stringify(goals),
      keepalive: true
    });
  } catch {
    // Keep local goals when backend bridge is unavailable.
  }
}

function normalizePersistGoals(nextGoals: GoalChoice[]) {
  return normalizeStoredGoals(nextGoals).slice(0, 3);
}

export function useGoals(seedGoals?: GoalChoice[] | null) {
  const [goals, setGoals] = useState<GoalChoice[]>(defaultGoals);
  const [hydrated, setHydrated] = useState(false);

  /** 매 렌더 새 배열 참조([])로 effect가 무한 재실행되지 않도록 문자열로 고정 */
  const seedKey =
    seedGoals && seedGoals.length > 0 ? JSON.stringify(normalizeStoredGoals(seedGoals.slice(0, 3))) : "";

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      const memberKey = getCurrentMember()?.userId?.trim();
      if (seedKey.length > 0) {
        let parsed: GoalChoice[] = [];
        try {
          parsed = JSON.parse(seedKey) as GoalChoice[];
        } catch {
          parsed = [];
        }
        if (parsed.length > 0) {
          const trimmed = normalizeStoredGoals(parsed.slice(0, 3));
          setGoals(trimmed);
          persistGoalsLocally(trimmed);
          if (!memberKey) {
            void persistGoalsToServer(trimmed);
          }
          if (!cancelled) setHydrated(true);
          return;
        }
      }
      let localGoals: GoalChoice[] | null = null;
      try {
        const raw =
          window.localStorage.getItem(getScopedGoalStorageKey()) ??
          (getCurrentUserKey() === "local-user" ? window.localStorage.getItem(goalStorageKey) : null);
        if (raw) {
          const parsed = JSON.parse(raw) as GoalChoice[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            localGoals = normalizeStoredGoals(parsed.slice(0, 3));
          }
        }
      } catch {
        window.localStorage.removeItem(getScopedGoalStorageKey());
        if (getCurrentUserKey() === "local-user") {
          window.localStorage.removeItem(goalStorageKey);
        }
      }
      let serverGoals = await loadGoalsFromServer();
      if (!serverGoals && !memberKey) {
        serverGoals = await loadGoalsFromServer("LDY01");
      }
      const draftRaw = getDraftGoals<GoalChoice[]>();
      const draftGoals =
        Array.isArray(draftRaw) && draftRaw.length > 0 ? normalizeStoredGoals(draftRaw.slice(0, 3)) : null;
      let resolved: GoalChoice[];
      if (memberKey) {
        if (isDraftDirty() && draftGoals) {
          resolved = draftGoals;
        } else {
          if (serverGoals) {
            clearDraftGoals();
          }
          resolved = serverGoals ?? localGoals ?? draftGoals ?? defaultGoals;
        }
      } else {
        resolved = draftGoals ?? serverGoals ?? localGoals ?? defaultGoals;
      }
      if (!cancelled) {
        setGoals(resolved);
        persistGoalsLocally(resolved);
        setHydrated(true);
      }
    };
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [seedKey]);

  const updateGoals = (nextGoals: GoalChoice[]) => {
    const trimmed = normalizePersistGoals(nextGoals);
    setGoals(trimmed);
    persistGoalsLocally(trimmed);
    setDraftGoals(trimmed);
  };

  const flushGoalsToServer = async (nextGoals?: GoalChoice[]) => {
    const trimmed = normalizePersistGoals(nextGoals ?? goals);
    persistGoalsLocally(trimmed);
    await persistGoalsToServer(trimmed);
    return trimmed;
  };

  return { goals, updateGoals, hydrated, flushGoalsToServer };
}
