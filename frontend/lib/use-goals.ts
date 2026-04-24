"use client";

import { useEffect, useState } from "react";
import type { GoalChoice } from "@/lib/types";
import { defaultGoals, goalStorageKey } from "@/lib/planning";
import { normalizeUniversityName } from "@/lib/admission-data";
import { getDraftGoals, setDraftGoals } from "@/lib/draft-store";

function normalizeStoredGoals(goals: GoalChoice[]): GoalChoice[] {
  return goals.map((goal) => ({
    university: normalizeUniversityName(goal.university),
    major: (goal.major ?? "").trim()
  }));
}

async function loadGoalsFromServer() {
  if (typeof window === "undefined") return null;
  try {
    const response = await fetch("/api/onboarding/goals", { method: "GET", cache: "no-store" });
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
      headers: { "Content-Type": "application/json" },
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
          window.localStorage.setItem(goalStorageKey, JSON.stringify(trimmed));
          void persistGoalsToServer(trimmed);
          if (!cancelled) setHydrated(true);
          return;
        }
      }
      let localGoals: GoalChoice[] | null = null;
      try {
        const raw = window.localStorage.getItem(goalStorageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as GoalChoice[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            localGoals = normalizeStoredGoals(parsed.slice(0, 3));
          }
        }
      } catch {
        window.localStorage.removeItem(goalStorageKey);
      }
      const serverGoals = await loadGoalsFromServer();
      const draftRaw = getDraftGoals<GoalChoice[]>();
      const draftGoals =
        Array.isArray(draftRaw) && draftRaw.length > 0 ? normalizeStoredGoals(draftRaw.slice(0, 3)) : null;
      const resolved = draftGoals ?? serverGoals ?? localGoals ?? defaultGoals;
      if (!cancelled) {
        setGoals(resolved);
        window.localStorage.setItem(goalStorageKey, JSON.stringify(resolved));
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
    window.localStorage.setItem(goalStorageKey, JSON.stringify(trimmed));
    setDraftGoals(trimmed);
  };

  const flushGoalsToServer = async () => {
    const trimmed = normalizePersistGoals(goals);
    window.localStorage.setItem(goalStorageKey, JSON.stringify(trimmed));
    await persistGoalsToServer(trimmed);
    return trimmed;
  };

  return { goals, updateGoals, hydrated, flushGoalsToServer };
}
