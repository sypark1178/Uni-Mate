"use client";

import { getCurrentMember } from "@/lib/member-store";

const draftProfileKey = "uni-mate-draft-profile";
const draftGoalsKey = "uni-mate-draft-goals";
const draftScoresKey = "uni-mate-draft-scores";
const draftDirtyKey = "uni-mate-draft-dirty";
const draftGenericDirtyKey = "uni-mate-draft-generic-dirty";
const draftProfileDirtyKey = "uni-mate-draft-profile-dirty";
const draftGoalsDirtyKey = "uni-mate-draft-goals-dirty";
const draftScoresDirtyKey = "uni-mate-draft-scores-dirty";

function getDraftUserKey() {
  return getCurrentMember()?.userId?.trim() || "local-user";
}

function scopedKey(key: string) {
  return `${key}:${getDraftUserKey()}`;
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const scopedRaw = window.sessionStorage.getItem(scopedKey(key));
    const raw = scopedRaw ?? (getDraftUserKey() === "local-user" ? window.sessionStorage.getItem(key) : null);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(scopedKey(key), JSON.stringify(value));
}

function isSpecificDraftDirty(key: string) {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(scopedKey(key)) === "1";
}

function syncAggregateDraftDirty() {
  if (typeof window === "undefined") return;
  const hasDirtyScope =
    isSpecificDraftDirty(draftGenericDirtyKey) ||
    isSpecificDraftDirty(draftProfileDirtyKey) ||
    isSpecificDraftDirty(draftGoalsDirtyKey) ||
    isSpecificDraftDirty(draftScoresDirtyKey);
  if (hasDirtyScope) {
    window.sessionStorage.setItem(scopedKey(draftDirtyKey), "1");
  } else {
    window.sessionStorage.removeItem(scopedKey(draftDirtyKey));
    window.sessionStorage.removeItem(draftDirtyKey);
  }
}

function markScopedDraftDirty(key: string, isDirty: boolean) {
  if (typeof window === "undefined") return;
  if (isDirty) {
    window.sessionStorage.setItem(scopedKey(key), "1");
  } else {
    window.sessionStorage.removeItem(scopedKey(key));
    window.sessionStorage.removeItem(key);
  }
  syncAggregateDraftDirty();
}

export function getDraftProfile<T>() {
  return readJson<T>(draftProfileKey);
}

export function setDraftProfile(value: unknown) {
  writeJson(draftProfileKey, value);
  markDraftProfileDirty(true);
}

export function clearDraftProfile() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(scopedKey(draftProfileKey));
  window.sessionStorage.removeItem(draftProfileKey);
  markDraftProfileDirty(false);
}

export function markDraftProfileDirty(isDirty: boolean) {
  markScopedDraftDirty(draftProfileDirtyKey, isDirty);
}

export function isDraftProfileDirty() {
  return isSpecificDraftDirty(draftProfileDirtyKey);
}

export function getDraftGoals<T>() {
  return readJson<T>(draftGoalsKey);
}

export function setDraftGoals(value: unknown) {
  writeJson(draftGoalsKey, value);
  markDraftGoalsDirty(true);
}

export function clearDraftGoals() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(scopedKey(draftGoalsKey));
  window.sessionStorage.removeItem(draftGoalsKey);
  markDraftGoalsDirty(false);
}

export function getDraftScores<T>() {
  return readJson<T>(draftScoresKey);
}

export function setDraftScores(value: unknown) {
  writeJson(draftScoresKey, value);
  markDraftScoresDirty(true);
}

/** 하이드레이션 등: 세션에 성적 스냅샷만 맞추고 저장하지 않은 변경으로 취급하지 않음 */
export function setDraftScoresSnapshot(value: unknown) {
  writeJson(draftScoresKey, value);
}

export function clearDraftScores() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(scopedKey(draftScoresKey));
  window.sessionStorage.removeItem(draftScoresKey);
  markDraftScoresDirty(false);
}

export function markDraftDirty(isDirty: boolean) {
  if (typeof window === "undefined") return;
  if (isDirty) {
    window.sessionStorage.setItem(scopedKey(draftGenericDirtyKey), "1");
    window.sessionStorage.setItem(scopedKey(draftDirtyKey), "1");
    return;
  }
  window.sessionStorage.removeItem(scopedKey(draftDirtyKey));
  window.sessionStorage.removeItem(draftDirtyKey);
  markScopedDraftDirty(draftGenericDirtyKey, false);
  markScopedDraftDirty(draftProfileDirtyKey, false);
  markScopedDraftDirty(draftGoalsDirtyKey, false);
  markScopedDraftDirty(draftScoresDirtyKey, false);
}

export function isDraftDirty() {
  if (typeof window === "undefined") return false;
  return (
    window.sessionStorage.getItem(scopedKey(draftDirtyKey)) === "1" ||
    isSpecificDraftDirty(draftGenericDirtyKey) ||
    isDraftProfileDirty() ||
    isDraftGoalsDirty() ||
    isDraftScoresDirty()
  );
}

export function markDraftGoalsDirty(isDirty: boolean) {
  markScopedDraftDirty(draftGoalsDirtyKey, isDirty);
}

export function isDraftGoalsDirty() {
  return isSpecificDraftDirty(draftGoalsDirtyKey);
}

export function markDraftScoresDirty(isDirty: boolean) {
  markScopedDraftDirty(draftScoresDirtyKey, isDirty);
}

export function isDraftScoresDirty() {
  return isSpecificDraftDirty(draftScoresDirtyKey);
}

/** 프로필·목표·성적 초안을 모두 비움. 로그아웃/로그인 전환 시 백엔드 스냅샷을 다시 기준으로 삼기 위함. */
export function clearAllDrafts() {
  clearDraftProfile();
  clearDraftGoals();
  clearDraftScores();
  markDraftDirty(false);
}
