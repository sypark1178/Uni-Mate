"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  GradePeriodRecord,
  GradeTerm,
  GradeYear,
  ScoreMemoryStore,
  ScoreTabKey,
  StudentRecordPeriod,
  SubjectScoreEntry,
  UploadedRecordFile
} from "@/lib/types";
import { getDraftScores, setDraftScores } from "@/lib/draft-store";
import { getCurrentMember } from "@/lib/member-store";

export const scoreStorageKey = "uni-mate-score-memory";

/** 서버(DB) 기준 설정 화면 성적 요약 — TB_ACADEMIC_SCORE 등급(grade) 평균, TB_CSAT_SCORE 최신 4과목 등급 평균 */
export type ScoreSettingsDisplay = {
  schoolGradeAverage: string;
  latestMockFourGradeAverage: string;
};
function getCurrentUserKey() {
  return getCurrentMember()?.userId?.trim() || "local-user";
}
function getScopedScoreStorageKey() {
  return `${scoreStorageKey}:${getCurrentUserKey()}`;
}

export const scoreTabOptions: Array<{ key: ScoreTabKey; label: string }> = [
  { key: "schoolRecord", label: "내신" },
  { key: "mockExam", label: "모의고사" },
  { key: "studentRecord", label: "특기 / 생기부" }
];

/** 내신·모의고사 과목 등급 (1~9등급) */
export const subjectGradeOptions = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

function isSubjectGradeValue(value: string): boolean {
  return (subjectGradeOptions as readonly string[]).includes(value);
}

export const gradeYearOptions: Array<{ value: GradeYear; label: string }> = [
  { value: "1", label: "1학년" },
  { value: "2", label: "2학년" },
  { value: "3", label: "3학년" }
];

export const gradeTermOptions: Array<{ value: GradeTerm; label: string }> = [
  { value: "1-midterm", label: "1학기 중간" },
  { value: "1-final", label: "1학기 기말" },
  { value: "2-midterm", label: "2학기 중간" },
  { value: "2-final", label: "2학기 기말" },
  { value: "mock-nat-3", label: "전국연합학력평가 3월" },
  { value: "mock-nat-4", label: "전국연합학력평가 4월" },
  { value: "mock-nat-6", label: "전국연합학력평가 6월" },
  { value: "mock-nat-7", label: "전국연합학력평가 7월" },
  { value: "mock-nat-9", label: "전국연합학력평가 9월" },
  { value: "mock-nat-10", label: "전국연합학력평가 10월" },
  { value: "mock-nat-11", label: "전국연합학력평가 11월" },
  { value: "mock-csat-6", label: "대학수학능력시험 6월" },
  { value: "mock-csat-9", label: "대학수학능력시험 9월" }
];

const schoolTermOptions: Array<{ value: GradeTerm; label: string }> = [
  { value: "1-midterm", label: "1학기 중간" },
  { value: "1-final", label: "1학기 기말" },
  { value: "2-midterm", label: "2학기 중간" },
  { value: "2-final", label: "2학기 기말" }
];

const mockTermOptionsByYear: Record<GradeYear, Array<{ value: GradeTerm; label: string }>> = {
  "1": [
    { value: "mock-nat-3", label: "전국연합학력평가 3월" },
    { value: "mock-nat-6", label: "전국연합학력평가 6월" },
    { value: "mock-nat-9", label: "전국연합학력평가 9월" },
    { value: "mock-nat-11", label: "전국연합학력평가 11월" }
  ],
  "2": [
    { value: "mock-nat-3", label: "전국연합학력평가 3월" },
    { value: "mock-nat-6", label: "전국연합학력평가 6월" },
    { value: "mock-nat-9", label: "전국연합학력평가 9월" },
    { value: "mock-nat-11", label: "전국연합학력평가 11월" }
  ],
  "3": [
    { value: "mock-nat-3", label: "전국연합학력평가 3월" },
    { value: "mock-nat-4", label: "전국연합학력평가 4월" },
    { value: "mock-nat-7", label: "전국연합학력평가 7월" },
    { value: "mock-nat-10", label: "전국연합학력평가 10월" },
    { value: "mock-csat-6", label: "대학수학능력시험 6월" },
    { value: "mock-csat-9", label: "대학수학능력시험 9월" },
    { value: "mock-nat-11", label: "수능(11월)" }
  ]
};

function mockTermCalendarMonth(term: GradeTerm): number {
  if (term.startsWith("mock-nat-")) {
    return Number.parseInt(term.slice("mock-nat-".length), 10) || 0;
  }
  if (term.startsWith("mock-csat-")) {
    return Number.parseInt(term.slice("mock-csat-".length), 10) || 0;
  }
  return 0;
}

export function getGradeTermOptionsByTab(tab: ScoreTabKey, year: GradeYear) {
  if (tab === "mockExam") {
    const rows = [...mockTermOptionsByYear[year]];
    rows.sort((a, b) => mockTermCalendarMonth(a.value) - mockTermCalendarMonth(b.value));
    return rows;
  }
  return schoolTermOptions;
}

/**
 * 모의고사 탭에서 학년·시기(term)에 따른 시험 구분.
 * - `mock-nat-*`: 전국연합학력평가(학력평가)
 * - `mock-csat-*`: 대학수학능력시험(교육부·평가원) 6·9월 모의고사
 */
export function getMockExamSeriesCaption(year: GradeYear, term: GradeTerm): string {
  if (!term.startsWith("mock-")) {
    return "";
  }
  if (term.startsWith("mock-csat-")) {
    return "대학수학능력시험 (모의고사)";
  }
  if (term.startsWith("mock-nat-")) {
    if (term === "mock-nat-11" && year === "3") {
      return "수능(대학수학능력시험)";
    }
    return "전국연합학력평가(학력평가)";
  }
  return "";
}

const defaultSubjectNames = ["국어", "수학", "영어"];

function nowIso() {
  return new Date().toISOString();
}

function buildKey(year: GradeYear, term: GradeTerm) {
  return `${year}-${term}`;
}

function createSubjectId(subject: string, index: number) {
  const safeName = (subject || "custom-subject").replace(/\s+/g, "-").toLowerCase();
  return `${safeName}-${index}-${Date.now()}`;
}

function createSubjectEntries(subjectNames = defaultSubjectNames): SubjectScoreEntry[] {
  return subjectNames.map((subject, index) => ({
    id: createSubjectId(subject, index),
    subject,
    score: "",
    isCustom: false
  }));
}

export function createEmptyGradeRecord(year: GradeYear, term: GradeTerm): GradePeriodRecord {
  return {
    id: buildKey(year, term),
    year,
    term,
    subjects: createSubjectEntries(),
    overallAverage: "",
    updatedAt: nowIso()
  };
}

export function createEmptyStudentRecord(year: GradeYear, term: GradeTerm): StudentRecordPeriod {
  return {
    id: buildKey(year, term),
    year,
    term,
    title: "",
    description: "",
    files: [],
    updatedAt: nowIso()
  };
}

const SCORE_SCHEMA_VERSION = 2;

function stripSataemGataemSubjects(records: GradePeriodRecord[]): GradePeriodRecord[] {
  return records.map((record) => ({
    ...record,
    subjects: record.subjects.filter((entry) => {
      const name = entry.subject.trim();
      return name !== "사탐" && name !== "과탐";
    })
  }));
}

export const defaultScoreMemoryStore: ScoreMemoryStore = {
  schoolRecords: [createEmptyGradeRecord("1", "1-midterm")],
  mockExams: [createEmptyGradeRecord("1", "1-midterm")],
  studentRecords: [createEmptyStudentRecord("1", "1-midterm")],
  uploads: [],
  activeTab: "schoolRecord",
  selectedYear: "1",
  selectedTerm: "1-midterm",
  updatedAt: nowIso(),
  scoreSchemaVersion: SCORE_SCHEMA_VERSION
};

function termOrder(term: GradeTerm) {
  return gradeTermOptions.findIndex((item) => item.value === term);
}

function sortByPeriod<T extends { year: GradeYear; term: GradeTerm }>(records: T[]) {
  return [...records].sort((left, right) => {
    if (left.year === right.year) {
      return termOrder(left.term) - termOrder(right.term);
    }
    return Number(left.year) - Number(right.year);
  });
}

function normalizeSubjectEntries(raw: unknown): SubjectScoreEntry[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return createSubjectEntries();
  }

  const filteredRaw = raw.filter((item) => {
    if (!item || typeof item !== "object" || !("subject" in item)) {
      return true;
    }
    const subject = String(item.subject ?? "").trim();
    const isCustom = "isCustom" in item ? Boolean(item.isCustom) : false;
    if ((subject === "사탐" || subject === "과탐") && !isCustom) {
      return false;
    }
    return true;
  });

  if (filteredRaw.length === 0) {
    return createSubjectEntries();
  }

  return filteredRaw.map((item, index) => {
    const subject = typeof item === "object" && item && "subject" in item ? String(item.subject ?? "") : defaultSubjectNames[index] ?? "";
    const rawScore = typeof item === "object" && item && "score" in item ? String(item.score ?? "") : "";
    const score = isSubjectGradeValue(rawScore) ? rawScore : "";
    const id = typeof item === "object" && item && "id" in item ? String(item.id) : createSubjectId(subject, index);
    const isCustom =
      typeof item === "object" && item && "isCustom" in item ? Boolean(item.isCustom) : index >= defaultSubjectNames.length;
    return { id, subject, score, isCustom };
  });
}

function normalizeGradeRecord(raw: unknown): GradePeriodRecord {
  const rawYear = typeof raw === "object" && raw && "year" in raw ? String(raw.year) : "1";
  const rawTerm = typeof raw === "object" && raw && "term" in raw ? String(raw.term) : "1-midterm";
  const year = (gradeYearOptions.find((item) => item.value === rawYear)?.value ?? "1") as GradeYear;
  const term = (gradeTermOptions.find((item) => item.value === rawTerm)?.value ?? "1-midterm") as GradeTerm;

  const rawOverallAverage = typeof raw === "object" && raw && "overallAverage" in raw ? String(raw.overallAverage ?? "").trim() : "";
  const parsedOverallAverage = Number(rawOverallAverage);
  const normalizedOverallAverage =
    rawOverallAverage && Number.isFinite(parsedOverallAverage) ? parsedOverallAverage.toFixed(2) : rawOverallAverage;

  return {
    id: typeof raw === "object" && raw && "id" in raw ? String(raw.id) : buildKey(year, term),
    year,
    term,
    subjects: normalizeSubjectEntries(typeof raw === "object" && raw && "subjects" in raw ? raw.subjects : []),
    overallAverage: normalizedOverallAverage,
    updatedAt: typeof raw === "object" && raw && "updatedAt" in raw ? String(raw.updatedAt) : nowIso()
  };
}

function normalizeUpload(raw: unknown): UploadedRecordFile | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const sourceTab = "sourceTab" in raw ? String(raw.sourceTab) : "schoolRecord";
  const year = "year" in raw ? String(raw.year) : "1";
  const term = "term" in raw ? String(raw.term) : "1-midterm";

  return {
    id: "id" in raw ? String(raw.id) : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "name" in raw ? String(raw.name) : "uploaded-file",
    size: "size" in raw ? Number(raw.size) || 0 : 0,
    type: "type" in raw ? String(raw.type) : "application/octet-stream",
    sourceTab: (scoreTabOptions.find((item) => item.key === sourceTab)?.key ?? "schoolRecord") as ScoreTabKey,
    year: (gradeYearOptions.find((item) => item.value === year)?.value ?? "1") as GradeYear,
    term: (gradeTermOptions.find((item) => item.value === term)?.value ?? "1-midterm") as GradeTerm,
    uploadedAt: "uploadedAt" in raw ? String(raw.uploadedAt) : nowIso()
  };
}

function normalizeStudentRecord(raw: unknown): StudentRecordPeriod {
  const rawYear = typeof raw === "object" && raw && "year" in raw ? String(raw.year) : "1";
  const rawTerm = typeof raw === "object" && raw && "term" in raw ? String(raw.term) : "1-midterm";
  const year = (gradeYearOptions.find((item) => item.value === rawYear)?.value ?? "1") as GradeYear;
  const term = (gradeTermOptions.find((item) => item.value === rawTerm)?.value ?? "1-midterm") as GradeTerm;
  const files =
    typeof raw === "object" && raw && "files" in raw && Array.isArray(raw.files)
      ? raw.files.map(normalizeUpload).filter((item): item is UploadedRecordFile => item !== null)
      : [];

  return {
    id: typeof raw === "object" && raw && "id" in raw ? String(raw.id) : buildKey(year, term),
    year,
    term,
    title: typeof raw === "object" && raw && "title" in raw ? String(raw.title ?? "") : "",
    description: typeof raw === "object" && raw && "description" in raw ? String(raw.description ?? "") : "",
    files,
    updatedAt: typeof raw === "object" && raw && "updatedAt" in raw ? String(raw.updatedAt) : nowIso()
  };
}

function normalizeScoreStore(raw: unknown): ScoreMemoryStore {
  if (!raw || typeof raw !== "object") {
    return defaultScoreMemoryStore;
  }

  const schoolRecords =
    "schoolRecords" in raw && Array.isArray(raw.schoolRecords) ? raw.schoolRecords.map(normalizeGradeRecord) : defaultScoreMemoryStore.schoolRecords;
  const mockExams =
    "mockExams" in raw && Array.isArray(raw.mockExams) ? raw.mockExams.map(normalizeGradeRecord) : defaultScoreMemoryStore.mockExams;
  const studentRecords =
    "studentRecords" in raw && Array.isArray(raw.studentRecords)
      ? raw.studentRecords.map(normalizeStudentRecord)
      : defaultScoreMemoryStore.studentRecords;
  const uploads =
    "uploads" in raw && Array.isArray(raw.uploads)
      ? raw.uploads.map(normalizeUpload).filter((item): item is UploadedRecordFile => item !== null)
      : defaultScoreMemoryStore.uploads;
  const activeTab = "activeTab" in raw ? String(raw.activeTab) : "schoolRecord";
  const selectedYear = "selectedYear" in raw ? String(raw.selectedYear) : "1";
  const selectedTerm = "selectedTerm" in raw ? String(raw.selectedTerm) : "1-midterm";

  const schemaVersionRaw =
    "scoreSchemaVersion" in raw && typeof (raw as { scoreSchemaVersion?: unknown }).scoreSchemaVersion === "number"
      ? Number((raw as { scoreSchemaVersion: number }).scoreSchemaVersion)
      : 0;
  const schemaVersion = Number.isFinite(schemaVersionRaw) && schemaVersionRaw >= 0 ? schemaVersionRaw : 0;

  let next: ScoreMemoryStore = {
    schoolRecords: sortByPeriod(schoolRecords),
    mockExams: sortByPeriod(mockExams),
    studentRecords: sortByPeriod(studentRecords),
    uploads,
    activeTab: (scoreTabOptions.find((item) => item.key === activeTab)?.key ?? "schoolRecord") as ScoreTabKey,
    selectedYear: (gradeYearOptions.find((item) => item.value === selectedYear)?.value ?? "1") as GradeYear,
    selectedTerm: (gradeTermOptions.find((item) => item.value === selectedTerm)?.value ?? "1-midterm") as GradeTerm,
    updatedAt: "updatedAt" in raw ? String(raw.updatedAt) : nowIso(),
    scoreSchemaVersion: schemaVersion >= SCORE_SCHEMA_VERSION ? schemaVersion : SCORE_SCHEMA_VERSION
  };

  if (schemaVersion < SCORE_SCHEMA_VERSION) {
    next = {
      ...next,
      schoolRecords: stripSataemGataemSubjects(next.schoolRecords),
      mockExams: stripSataemGataemSubjects(next.mockExams),
      scoreSchemaVersion: SCORE_SCHEMA_VERSION,
      updatedAt: nowIso()
    };
  }

  return next;
}

function getScoreRecordBucket(store: ScoreMemoryStore, tab: ScoreTabKey) {
  return tab === "schoolRecord" ? store.schoolRecords : store.mockExams;
}

function updateScoreRecordBucket(store: ScoreMemoryStore, tab: ScoreTabKey, nextRecords: GradePeriodRecord[]) {
  return tab === "schoolRecord"
    ? { ...store, schoolRecords: sortByPeriod(nextRecords), updatedAt: nowIso() }
    : { ...store, mockExams: sortByPeriod(nextRecords), updatedAt: nowIso() };
}

function upsertScoreRecord(records: GradePeriodRecord[], nextRecord: GradePeriodRecord) {
  const next = records.filter((record) => !(record.year === nextRecord.year && record.term === nextRecord.term));
  next.push({ ...nextRecord, updatedAt: nowIso() });
  return sortByPeriod(next);
}

function upsertStudentRecord(records: StudentRecordPeriod[], nextRecord: StudentRecordPeriod) {
  const next = records.filter((record) => !(record.year === nextRecord.year && record.term === nextRecord.term));
  next.push({ ...nextRecord, updatedAt: nowIso() });
  return sortByPeriod(next);
}

export function getScoreRecord(store: ScoreMemoryStore, tab: "schoolRecord" | "mockExam", year: GradeYear, term: GradeTerm) {
  return getScoreRecordBucket(store, tab).find((record) => record.year === year && record.term === term) ?? createEmptyGradeRecord(year, term);
}

export function getStudentRecord(store: ScoreMemoryStore, year: GradeYear, term: GradeTerm) {
  return store.studentRecords.find((record) => record.year === year && record.term === term) ?? createEmptyStudentRecord(year, term);
}

function persistStore(nextStore: ScoreMemoryStore) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(getScopedScoreStorageKey(), JSON.stringify(nextStore));
  }
}

async function loadServerStore(): Promise<{
  store: ScoreMemoryStore | null;
  settingsDisplay: ScoreSettingsDisplay | null;
}> {
  if (typeof window === "undefined") {
    return { store: null, settingsDisplay: null };
  }

  try {
    const response = await fetch("/api/onboarding/scores", {
      method: "GET",
      cache: "no-store",
      headers: { "x-user-key": getCurrentUserKey() }
    });
    if (!response.ok) {
      return { store: null, settingsDisplay: null };
    }

    const payload = (await response.json()) as { data?: unknown; settingsDisplay?: ScoreSettingsDisplay | null };
    const store = payload.data ? normalizeScoreStore(payload.data) : null;
    const settingsDisplay =
      payload.settingsDisplay &&
      typeof payload.settingsDisplay.schoolGradeAverage === "string" &&
      typeof payload.settingsDisplay.latestMockFourGradeAverage === "string"
        ? payload.settingsDisplay
        : null;
    return { store, settingsDisplay };
  } catch {
    return { store: null, settingsDisplay: null };
  }
}

async function persistStoreToServer(nextStore: ScoreMemoryStore) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    await fetch("/api/onboarding/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-key": getCurrentUserKey() },
      body: JSON.stringify(nextStore),
      keepalive: true
    });
  } catch {
    // Keep local snapshot even if the backend bridge is temporarily unavailable.
  }
}

function parseNumber(input: string) {
  if (!input.trim()) {
    return null;
  }
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatSummaryAverage(value: number) {
  return value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

function computeAverage(records: GradePeriodRecord[]) {
  const values = records
    .map((record) => {
      if (record.overallAverage.trim()) {
        return parseNumber(record.overallAverage.trim());
      }

      const subjectValues = record.subjects.map((entry) => parseNumber(entry.score.trim())).filter((value): value is number => value !== null);
      if (subjectValues.length === 0) {
        return null;
      }

      return subjectValues.reduce((sum, value) => sum + value, 0) / subjectValues.length;
    })
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return "-";
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return formatSummaryAverage(average);
}

export function buildScoreSummary(store: ScoreMemoryStore, settingsDisplay: ScoreSettingsDisplay | null = null) {
  return {
    schoolAverage: computeAverage(store.schoolRecords),
    mockAverage: computeAverage(store.mockExams),
    /** 설정 화면 전용: TB_ACADEMIC_SCORE 등급(grade) 평균(소수 2자리), 없으면 null → 화면에서 schoolAverage로 대체 */
    settingsSchoolFromDb: settingsDisplay?.schoolGradeAverage ?? null,
    /** 설정 화면 전용: TB_CSAT_SCORE 최신 4과목 등급 평균(소수 2자리), 없으면 null */
    settingsMockFromDb: settingsDisplay?.latestMockFourGradeAverage ?? null,
    studentRecordCount: store.studentRecords.filter((record) => record.title || record.description || record.files.length > 0).length,
    uploadCount: store.uploads.length
  };
}

function getStoreTimestamp(store: ScoreMemoryStore | null) {
  if (!store) {
    return 0;
  }

  const timestamp = Date.parse(store.updatedAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function useScoreRecords() {
  const [store, setStore] = useState<ScoreMemoryStore>(defaultScoreMemoryStore);
  const [settingsDisplay, setSettingsDisplay] = useState<ScoreSettingsDisplay | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const hydrateStore = async () => {
      let localStore: ScoreMemoryStore | null = null;

      try {
        const raw = window.localStorage.getItem(getScopedScoreStorageKey());
        if (raw) {
          localStore = normalizeScoreStore(JSON.parse(raw));
        }
      } catch {
        window.localStorage.removeItem(getScopedScoreStorageKey());
      }

      const { store: serverStore, settingsDisplay: serverHints } = await loadServerStore();
      const draftStore = getDraftScores<ScoreMemoryStore>();
      const draftTs = getStoreTimestamp(draftStore);
      const serverTs = getStoreTimestamp(serverStore);
      const localTs = getStoreTimestamp(localStore);
      const draftWins = draftTs >= serverTs && draftTs >= localTs && Boolean(draftStore);

      let resolvedStore: ScoreMemoryStore | null = null;
      if (draftWins) {
        resolvedStore = draftStore;
      } else if (serverTs >= localTs && serverStore) {
        resolvedStore = serverStore;
      } else {
        resolvedStore = localStore;
      }

      const resolvedHints: ScoreSettingsDisplay | null = draftWins ? null : serverHints;
      const finalStore = normalizeScoreStore(resolvedStore ?? defaultScoreMemoryStore);

      if (!cancelled) {
        setStore(finalStore);
        setSettingsDisplay(resolvedHints);
        persistStore(finalStore);
        setDraftScores(finalStore);
        void persistStoreToServer(finalStore);
        setHydrated(true);
      }
    };

    void hydrateStore();

    return () => {
      cancelled = true;
    };
  }, []);

  const commit = (updater: (previous: ScoreMemoryStore) => ScoreMemoryStore) => {
    setSettingsDisplay(null);
    setStore((previous) => {
      const nextStore = normalizeScoreStore(updater(previous));
      persistStore(nextStore);
      setDraftScores(nextStore);
      return nextStore;
    });
  };

  const setActiveTab = (tab: ScoreTabKey) => {
    commit((previous) => ({ ...previous, activeTab: tab, updatedAt: nowIso() }));
  };

  const setSelectedPeriod = (year: GradeYear, term: GradeTerm) => {
    commit((previous) => ({ ...previous, selectedYear: year, selectedTerm: term, updatedAt: nowIso() }));
  };

  const updateSubjectScore = (tab: "schoolRecord" | "mockExam", year: GradeYear, term: GradeTerm, entryId: string, value: string) => {
    const normalizedValue = isSubjectGradeValue(value) ? value : "";
    commit((previous) => {
      const current = getScoreRecord(previous, tab, year, term);
      const nextRecord: GradePeriodRecord = {
        ...current,
        subjects: current.subjects.map((entry) => (entry.id === entryId ? { ...entry, score: normalizedValue } : entry)),
        updatedAt: nowIso()
      };
      return updateScoreRecordBucket(previous, tab, upsertScoreRecord(getScoreRecordBucket(previous, tab), nextRecord));
    });
  };

  const updateSubjectName = (tab: "schoolRecord" | "mockExam", year: GradeYear, term: GradeTerm, entryId: string, value: string) => {
    commit((previous) => {
      const current = getScoreRecord(previous, tab, year, term);
      const nextRecord: GradePeriodRecord = {
        ...current,
        subjects: current.subjects.map((entry) => (entry.id === entryId ? { ...entry, subject: value } : entry)),
        updatedAt: nowIso()
      };
      return updateScoreRecordBucket(previous, tab, upsertScoreRecord(getScoreRecordBucket(previous, tab), nextRecord));
    });
  };

  const updateOverallAverage = (tab: "schoolRecord" | "mockExam", year: GradeYear, term: GradeTerm, value: string) => {
    const trimmed = value.trim();
    let normalizedValue = "";
    if (trimmed) {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) {
        normalizedValue = parsed.toFixed(2);
      }
    }
    commit((previous) => {
      const current = getScoreRecord(previous, tab, year, term);
      const nextRecord: GradePeriodRecord = { ...current, overallAverage: normalizedValue, updatedAt: nowIso() };
      return updateScoreRecordBucket(previous, tab, upsertScoreRecord(getScoreRecordBucket(previous, tab), nextRecord));
    });
  };

  const addSubject = (tab: "schoolRecord" | "mockExam", year: GradeYear, term: GradeTerm, subjectName = "") => {
    commit((previous) => {
      const current = getScoreRecord(previous, tab, year, term);
      const normalizedSubjectName = subjectName.trim();
      const nextRecord: GradePeriodRecord = {
        ...current,
        subjects: [
          ...current.subjects,
          {
            id: createSubjectId(normalizedSubjectName || "custom-subject", current.subjects.length),
            subject: normalizedSubjectName,
            score: "",
            isCustom: true
          }
        ],
        updatedAt: nowIso()
      };
      return updateScoreRecordBucket(previous, tab, upsertScoreRecord(getScoreRecordBucket(previous, tab), nextRecord));
    });
  };

  const removeSubject = (tab: "schoolRecord" | "mockExam", year: GradeYear, term: GradeTerm, entryId: string) => {
    commit((previous) => {
      const current = getScoreRecord(previous, tab, year, term);
      const nextRecord: GradePeriodRecord = {
        ...current,
        subjects: current.subjects.filter((entry) => entry.id !== entryId),
        updatedAt: nowIso()
      };
      return updateScoreRecordBucket(previous, tab, upsertScoreRecord(getScoreRecordBucket(previous, tab), nextRecord));
    });
  };

  const updateStudentRecordField = (year: GradeYear, term: GradeTerm, field: "title" | "description", value: string) => {
    commit((previous) => {
      const current = getStudentRecord(previous, year, term);
      const nextRecord: StudentRecordPeriod = { ...current, [field]: value, updatedAt: nowIso() };
      return {
        ...previous,
        studentRecords: upsertStudentRecord(previous.studentRecords, nextRecord),
        updatedAt: nowIso()
      };
    });
  };

  const registerUploads = (files: File[], sourceTab: ScoreTabKey, year: GradeYear, term: GradeTerm) => {
    commit((previous) => {
      const nextFiles: UploadedRecordFile[] = files.map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        sourceTab,
        year,
        term,
        uploadedAt: nowIso()
      }));

      if (sourceTab === "studentRecord") {
        const current = getStudentRecord(previous, year, term);
        const nextRecord: StudentRecordPeriod = {
          ...current,
          files: [...current.files, ...nextFiles],
          updatedAt: nowIso()
        };

        return {
          ...previous,
          studentRecords: upsertStudentRecord(previous.studentRecords, nextRecord),
          uploads: [...previous.uploads, ...nextFiles],
          updatedAt: nowIso()
        };
      }

      return {
        ...previous,
        uploads: [...previous.uploads, ...nextFiles],
        updatedAt: nowIso()
      };
    });
  };

  const flushStore = () => {
    persistStore(store);
    return store;
  };

  const flushStoreToServer = async () => {
    persistStore(store);
    await persistStoreToServer(store);
    return store;
  };

  const currentScoreRecord = useMemo(() => {
    if (store.activeTab === "studentRecord") {
      return null;
    }
    return getScoreRecord(store, store.activeTab, store.selectedYear, store.selectedTerm);
  }, [store]);

  const currentStudentRecord = useMemo(() => getStudentRecord(store, store.selectedYear, store.selectedTerm), [store]);
  const summary = useMemo(() => buildScoreSummary(store, settingsDisplay), [store, settingsDisplay]);

  return {
    store,
    settingsDisplay,
    hydrated,
    currentScoreRecord,
    currentStudentRecord,
    summary,
    setActiveTab,
    setSelectedPeriod,
    updateSubjectScore,
    updateSubjectName,
    updateOverallAverage,
    addSubject,
    removeSubject,
    updateStudentRecordField,
    registerUploads,
    flushStore,
    flushStoreToServer
  };
}
