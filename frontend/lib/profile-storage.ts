"use client";

import { useEffect, useState } from "react";
import type { StudentProfile } from "@/lib/types";
import { profile as defaultProfile } from "@/lib/mock-data";

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

export function useStudentProfile() {
  const [studentProfile, setStudentProfile] = useState<StudentProfile>(defaultProfile);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(profileStorageKey);
      if (raw) {
        setStudentProfile(normalizeProfile(JSON.parse(raw)));
      }
    } catch {
      window.localStorage.removeItem(profileStorageKey);
      setStudentProfile(defaultProfile);
    } finally {
      setHydrated(true);
    }
  }, []);

  const commit = (updater: (previous: StudentProfile) => StudentProfile) => {
    setStudentProfile((previous) => {
      const nextProfile = normalizeProfile(updater(previous));
      persistProfile(nextProfile);
      return nextProfile;
    });
  };

  const updateField = <K extends keyof StudentProfile>(field: K, value: StudentProfile[K]) => {
    commit((previous) => ({ ...previous, [field]: value }));
  };

  return {
    studentProfile,
    hydrated,
    updateField,
    setStudentProfile: (nextProfile: StudentProfile) => {
      const normalized = normalizeProfile(nextProfile);
      persistProfile(normalized);
      setStudentProfile(normalized);
    }
  };
}
