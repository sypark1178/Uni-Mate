"use client";

import { useEffect, useState } from "react";
import type { StudentProfile } from "@/lib/types";
import { profile as defaultProfile } from "@/lib/mock-data";
import { getDraftProfile, setDraftProfile } from "@/lib/draft-store";

export const profileStorageKey = "uni-mate-profile-memory";

function normalizeProfile(raw: unknown): StudentProfile {
  if (!raw || typeof raw !== "object") {
    return defaultProfile;
  }

  const candidate = raw as Partial<StudentProfile>;
  const region = typeof candidate.region === "string" ? candidate.region : defaultProfile.region;
  const district = typeof candidate.district === "string" ? candidate.district : defaultProfile.district;
  const schoolName = typeof candidate.schoolName === "string" ? candidate.schoolName : defaultProfile.schoolName;
  const name = typeof candidate.name === "string" ? candidate.name : defaultProfile.name;
  const gradeLabel = typeof candidate.gradeLabel === "string" ? candidate.gradeLabel : defaultProfile.gradeLabel;
  const track = typeof candidate.track === "string" ? candidate.track : defaultProfile.track;
  const targetYear =
    typeof candidate.targetYear === "number" && Number.isFinite(candidate.targetYear)
      ? candidate.targetYear
      : defaultProfile.targetYear;

  return {
    name,
    gradeLabel,
    region,
    district,
    schoolName,
    track,
    targetYear,
    hasRequiredInfo: [name, gradeLabel, region, district, schoolName].every((item) => Boolean(item && String(item).trim())),
    hasScores: typeof candidate.hasScores === "boolean" ? candidate.hasScores : defaultProfile.hasScores
  };
}

function persistProfile(nextProfile: StudentProfile) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(profileStorageKey, JSON.stringify(nextProfile));
  }
}

async function loadProfileFromServer() {
  if (typeof window === "undefined") return null;
  try {
    const response = await fetch("/api/onboarding/profile", { method: "GET", cache: "no-store" });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: unknown };
    return payload.data ? normalizeProfile(payload.data) : null;
  } catch {
    return null;
  }
}

async function persistProfileToServer(nextProfile: StudentProfile) {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/onboarding/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextProfile),
      keepalive: true
    });
  } catch {
    // Keep local profile when backend bridge is unavailable.
  }
}

export function useStudentProfile() {
  const [studentProfile, setStudentProfile] = useState<StudentProfile>(defaultProfile);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      let localProfile: StudentProfile | null = null;
      try {
        const raw = window.localStorage.getItem(profileStorageKey);
        if (raw) {
          localProfile = normalizeProfile(JSON.parse(raw));
        }
      } catch {
        window.localStorage.removeItem(profileStorageKey);
        localProfile = defaultProfile;
      }
      const serverProfile = await loadProfileFromServer();
      const draftProfile = getDraftProfile<StudentProfile>();
      const resolved = draftProfile ?? serverProfile ?? localProfile ?? defaultProfile;
      if (!cancelled) {
        persistProfile(resolved);
        setStudentProfile(resolved);
        setHydrated(true);
      }
    };
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = (updater: (previous: StudentProfile) => StudentProfile) => {
    setStudentProfile((previous) => {
      const nextProfile = normalizeProfile(updater(previous));
      persistProfile(nextProfile);
      setDraftProfile(nextProfile);
      return nextProfile;
    });
  };

  const updateField = <K extends keyof StudentProfile>(field: K, value: StudentProfile[K]) => {
    commit((previous) => ({ ...previous, [field]: value }));
  };

  const flushProfileToServer = async () => {
    const normalized = normalizeProfile(studentProfile);
    persistProfile(normalized);
    await persistProfileToServer(normalized);
    return normalized;
  };

  return {
    studentProfile,
    hydrated,
    updateField,
    flushProfileToServer,
    setStudentProfile: (nextProfile: StudentProfile) => {
      const normalized = normalizeProfile(nextProfile);
      persistProfile(normalized);
      setDraftProfile(normalized);
      setStudentProfile(normalized);
    }
  };
}
