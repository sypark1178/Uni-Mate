"use client";

import { useEffect, useState } from "react";
import type { GoalChoice } from "@/lib/types";
import { defaultGoals, goalStorageKey } from "@/lib/planning";
import { normalizeUniversityName } from "@/lib/admission-data";
import { getDraftGoals, setDraftGoals } from "@/lib/draft-store";
import { getCurrentMember } from "@/lib/member-store";

function normalizeStoredGoals(goals: GoalChoice[]): GoalChoice[] {
  return goals.map((goal) => ({
    university: normalizeUniversityName(goal.university),
    major: (goal.major ?? "").trim()
  }));
}

function getCurrentUserKey() {
  return getCurrentMember()?.userId?.trim() || "local-user";
}

function getScopedGoalStorageKey() {
  return `${goalStorageKey}:${getCurrentUserKey()}`;
}

async function loadGoalsFromServer() {
  if (typeof window === "undefined") return null;
  try {
    const response = await fetch("/api/onboarding/goals", {
      method: "GET",
      cache: "no-store",
      headers: { "x-user-key": getCurrentUserKey() }
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

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      if (seedGoals && seedGoals.length > 0) {
        const trimmed = normalizeStoredGoals(seedGoals.slice(0, 3));
        setGoals(trimmed);
        window.localStorage.setItem(getScopedGoalStorageKey(), JSON.stringify(trimmed));
        void persistGoalsToServer(trimmed);
        if (!cancelled) setHydrated(true);
        return;
      }
      let localGoals: GoalChoice[] | null = null;
      try {
        const raw = window.localStorage.getItem(getScopedGoalStorageKey());
        if (raw) {
          const parsed = JSON.parse(raw) as GoalChoice[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            localGoals = normalizeStoredGoals(parsed.slice(0, 3));
          }
        }
      } catch {
        window.localStorage.removeItem(getScopedGoalStorageKey());
      }
      const serverGoals = await loadGoalsFromServer();
      const draftGoals = getDraftGoals<GoalChoice[]>();
      const resolved = serverGoals ?? draftGoals ?? localGoals ?? defaultGoals;
      if (!cancelled) {
        setGoals(resolved);
        window.localStorage.setItem(getScopedGoalStorageKey(), JSON.stringify(resolved));
        setHydrated(true);
      }
    };
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [seedGoals]);

  const updateGoals = (nextGoals: GoalChoice[]) => {
    const trimmed = normalizePersistGoals(nextGoals);
    setGoals(trimmed);
    window.localStorage.setItem(getScopedGoalStorageKey(), JSON.stringify(trimmed));
    setDraftGoals(trimmed);
  };

  const flushGoalsToServer = async () => {
    const trimmed = normalizePersistGoals(goals);
    window.localStorage.setItem(getScopedGoalStorageKey(), JSON.stringify(trimmed));
    await persistGoalsToServer(trimmed);
    return trimmed;
  };

  return { goals, updateGoals, hydrated, flushGoalsToServer };
}
