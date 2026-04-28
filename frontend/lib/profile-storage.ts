"use client";

import { useEffect, useState } from "react";
import type { StudentProfile } from "@/lib/types";
import { examYears } from "@/lib/admission-data";
import { readJsonResponse } from "@/lib/read-json-response";
import { getDraftProfile, setDraftProfile } from "@/lib/draft-store";
import { getCurrentMember } from "@/lib/member-store";

export const profileStorageKey = "uni-mate-profile-memory";
function getCurrentUserKey() {
  return getCurrentMember()?.userId?.trim() || "local-user";
}
function getScopedProfileStorageKey() {
  return `${profileStorageKey}:${getCurrentUserKey()}`;
}

/** `local-user` 로컬에 남은 구버전/서버 병합 프로필을 1회 비움(이후 버전만 유지). */
const LOCAL_USER_PROFILE_STORE_VERSION_KEY = "uni-mate-local-profile-store-v";
const LOCAL_USER_PROFILE_STORE_VERSION = "2";

function withLoggedInMemberName(profile: StudentProfile): StudentProfile {
  const memberName = getCurrentMember()?.name?.trim() || "";
  if (!memberName) return profile;
  const currentName = String(profile.name ?? "").trim();
  if (!currentName || currentName === "학생") {
    return { ...profile, name: memberName };
  }
  return profile;
}

function normalizeProfile(raw: unknown): StudentProfile {
  if (!raw || typeof raw !== "object") {
    return {
      name: "",
      gradeLabel: "",
      region: "",
      district: "",
      schoolName: "",
      track: "미정",
      targetYear: 0,
      profileImageUrl: "",
      hasRequiredInfo: false,
      hasScores: false
    };
  }

  const candidate = raw as Partial<StudentProfile>;
  const region = typeof candidate.region === "string" ? candidate.region : "";
  const district = typeof candidate.district === "string" ? candidate.district : "";
  const schoolName = typeof candidate.schoolName === "string" ? candidate.schoolName : "";
  const name = typeof candidate.name === "string" ? candidate.name : "";
  const gradeLabel = typeof candidate.gradeLabel === "string" ? candidate.gradeLabel : "";
  const trackRaw = typeof candidate.track === "string" ? candidate.track.trim() : "";
  const track = trackRaw || "미정";
  const targetYearRaw = typeof candidate.targetYear === "number" && Number.isFinite(candidate.targetYear) ? candidate.targetYear : 0;
  const targetYear = examYears.includes(targetYearRaw) ? targetYearRaw : 0;

  return {
    name,
    gradeLabel,
    region,
    district,
    schoolName,
    track,
    targetYear,
    profileImageUrl: typeof candidate.profileImageUrl === "string" ? candidate.profileImageUrl : "",
    hasRequiredInfo: [name, gradeLabel, region, district, schoolName].every((item) => Boolean(item && String(item).trim())),
    hasScores: typeof candidate.hasScores === "boolean" ? candidate.hasScores : false
  };
}

function persistProfile(nextProfile: StudentProfile) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(getScopedProfileStorageKey(), JSON.stringify(nextProfile));
  }
}

async function loadProfileFromServer(userKey?: string) {
  if (typeof window === "undefined") return null;
  try {
    const response = await fetch("/api/onboarding/profile", {
      method: "GET",
      cache: "no-store",
      headers: { "x-user-key": userKey || getCurrentUserKey() }
    });
    if (!response.ok) return null;
    const payload = await readJsonResponse<{ data?: unknown }>(response);
    if (!payload) return null;
    return payload.data ? normalizeProfile(payload.data) : null;
  } catch {
    return null;
  }
}

async function persistProfileToServer(nextProfile: StudentProfile) {
  if (typeof window === "undefined") return;
  try {
    const response = await fetch("/api/onboarding/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-key": getCurrentUserKey() },
      body: JSON.stringify(nextProfile)
    });
    if (!response.ok) {
      return;
    }
  } catch {
    // Keep local profile when backend bridge is unavailable.
  }
}

async function persistProfileImageToServer(profileImageUrl: string) {
  if (typeof window === "undefined") return false;
  try {
    const response = await fetch("/api/onboarding/profile-image", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-key": getCurrentUserKey() },
      body: JSON.stringify({ profileImageUrl })
    });
    const payload = await readJsonResponse<{ ok?: boolean }>(response);
    return Boolean(response.ok && payload && payload.ok !== false);
  } catch {
    return false;
  }
}

export function useStudentProfile() {
  const [studentProfile, setStudentProfile] = useState<StudentProfile>(() => normalizeProfile({}));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      const userKey = getCurrentUserKey();
      if (userKey === "local-user" && typeof window !== "undefined") {
        try {
          const v = window.localStorage.getItem(LOCAL_USER_PROFILE_STORE_VERSION_KEY);
          if (v !== LOCAL_USER_PROFILE_STORE_VERSION) {
            window.localStorage.removeItem(`${profileStorageKey}:${userKey}`);
            window.localStorage.setItem(LOCAL_USER_PROFILE_STORE_VERSION_KEY, LOCAL_USER_PROFILE_STORE_VERSION);
          }
        } catch {
          /* noop */
        }
      }
      let localProfile: StudentProfile | null = null;
      try {
        const raw = window.localStorage.getItem(getScopedProfileStorageKey());
        if (raw) {
          localProfile = normalizeProfile(JSON.parse(raw));
        }
      } catch {
        window.localStorage.removeItem(getScopedProfileStorageKey());
        localProfile = normalizeProfile({});
      }
      let serverProfile = await loadProfileFromServer(userKey);
      if (userKey === "local-user") {
        serverProfile = null;
      }
      const draftProfile = getDraftProfile<StudentProfile>();
      const resolved = withLoggedInMemberName(
        draftProfile ?? localProfile ?? serverProfile ?? normalizeProfile({})
      );
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

  const updateFieldAndSync = async <K extends keyof StudentProfile>(field: K, value: StudentProfile[K]) => {
    const nextProfile = normalizeProfile({ ...studentProfile, [field]: value });
    persistProfile(nextProfile);
    setDraftProfile(nextProfile);
    setStudentProfile(nextProfile);
    await persistProfileToServer(nextProfile);
    return nextProfile;
  };

  const updateProfileImageAndSync = async (profileImageUrl: string) => {
    const nextProfile = normalizeProfile({ ...studentProfile, profileImageUrl });
    persistProfile(nextProfile);
    setDraftProfile(nextProfile);
    setStudentProfile(nextProfile);
    await persistProfileImageToServer(profileImageUrl);
    return nextProfile;
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
    updateFieldAndSync,
    updateProfileImageAndSync,
    flushProfileToServer,
    setStudentProfile: (nextProfile: StudentProfile) => {
      const normalized = normalizeProfile(nextProfile);
      persistProfile(normalized);
      setDraftProfile(normalized);
      setStudentProfile(normalized);
    }
  };
}
