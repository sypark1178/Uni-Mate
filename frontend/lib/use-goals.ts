"use client";

import { useEffect, useState } from "react";
import type { GoalChoice } from "@/lib/types";
import { defaultGoals, goalStorageKey } from "@/lib/planning";

export function useGoals(seedGoals?: GoalChoice[] | null) {
  const [goals, setGoals] = useState<GoalChoice[]>(defaultGoals);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (seedGoals && seedGoals.length > 0) {
      const trimmed = seedGoals.slice(0, 3);
      setGoals(trimmed);
      window.localStorage.setItem(goalStorageKey, JSON.stringify(trimmed));
      setHydrated(true);
      return;
    }
    const raw = window.localStorage.getItem(goalStorageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as GoalChoice[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGoals(parsed.slice(0, 3));
        }
      } catch {
        window.localStorage.removeItem(goalStorageKey);
      }
    }
    setHydrated(true);
  }, [seedGoals]);

  const updateGoals = (nextGoals: GoalChoice[]) => {
    const trimmed = nextGoals.slice(0, 3);
    setGoals(trimmed);
    window.localStorage.setItem(goalStorageKey, JSON.stringify(trimmed));
  };

  return { goals, updateGoals, hydrated };
}
