"use client";

import { getCurrentMember } from "@/lib/member-store";

const draftProfileKey = "uni-mate-draft-profile";
const draftGoalsKey = "uni-mate-draft-goals";
const draftScoresKey = "uni-mate-draft-scores";
const draftDirtyKey = "uni-mate-draft-dirty";
const draftGoalsDirtyKey = "uni-mate-draft-goals-dirty";

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

export function getDraftProfile<T>() {
  return readJson<T>(draftProfileKey);
}

export function setDraftProfile(value: unknown) {
  writeJson(draftProfileKey, value);
  markDraftDirty(true);
}

export function clearDraftProfile() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(scopedKey(draftProfileKey));
  window.sessionStorage.removeItem(draftProfileKey);
}

export function getDraftGoals<T>() {
  return readJson<T>(draftGoalsKey);
}

export function setDraftGoals(value: unknown) {
  writeJson(draftGoalsKey, value);
  markDraftGoalsDirty(true);
  markDraftDirty(true);
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
  markDraftDirty(true);
}

/** 하이드레이션 등: 세션에 성적 스냅샷만 맞추고 저장하지 않은 변경으로 취급하지 않음 */
export function setDraftScoresSnapshot(value: unknown) {
  writeJson(draftScoresKey, value);
}

export function clearDraftScores() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(scopedKey(draftScoresKey));
  window.sessionStorage.removeItem(draftScoresKey);
}

export function markDraftDirty(isDirty: boolean) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(scopedKey(draftDirtyKey), isDirty ? "1" : "0");
  if (!isDirty) {
    window.sessionStorage.removeItem(draftDirtyKey);
  }
}

export function isDraftDirty() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(scopedKey(draftDirtyKey)) === "1";
}

export function markDraftGoalsDirty(isDirty: boolean) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(scopedKey(draftGoalsDirtyKey), isDirty ? "1" : "0");
  if (!isDirty) {
    window.sessionStorage.removeItem(draftGoalsDirtyKey);
  }
}

export function isDraftGoalsDirty() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(scopedKey(draftGoalsDirtyKey)) === "1";
}

/** 프로필·목표 초안만 비움. 성적(2단계) 세션 초안은 건드리지 않음 — 입력 성적 보존. */
export function clearAllDrafts() {
  clearDraftProfile();
  clearDraftGoals();
  markDraftDirty(false);
}
