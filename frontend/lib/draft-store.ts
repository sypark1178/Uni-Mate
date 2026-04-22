"use client";

const draftProfileKey = "uni-mate-draft-profile";
const draftGoalsKey = "uni-mate-draft-goals";
const draftScoresKey = "uni-mate-draft-scores";
const draftDirtyKey = "uni-mate-draft-dirty";

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
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
  window.sessionStorage.removeItem(draftProfileKey);
}

export function getDraftGoals<T>() {
  return readJson<T>(draftGoalsKey);
}

export function setDraftGoals(value: unknown) {
  writeJson(draftGoalsKey, value);
  markDraftDirty(true);
}

export function clearDraftGoals() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(draftGoalsKey);
}

export function getDraftScores<T>() {
  return readJson<T>(draftScoresKey);
}

export function setDraftScores(value: unknown) {
  writeJson(draftScoresKey, value);
  markDraftDirty(true);
}

export function clearDraftScores() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(draftScoresKey);
}

export function markDraftDirty(isDirty: boolean) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(draftDirtyKey, isDirty ? "1" : "0");
}

export function isDraftDirty() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(draftDirtyKey) === "1";
}

export function clearAllDrafts() {
  clearDraftProfile();
  clearDraftGoals();
  clearDraftScores();
  markDraftDirty(false);
}
