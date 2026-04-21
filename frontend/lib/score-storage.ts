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

export const scoreStorageKey = "uni-mate-score-memory";

export const scoreTabOptions: Array<{ key: ScoreTabKey; label: string }> = [
  { key: "schoolRecord", label: "내신" },
  { key: "mockExam", label: "모의고사" },
  { key: "studentRecord", label: "특기 / 생기부" }
];

export const gradeYearOptions: Array<{ value: GradeYear; label: string }> = [
  { value: "1", label: "1학년" },
  { value: "2", label: "2학년" },
  { value: "3", label: "3학년" }
];

export const gradeTermOptions: Array<{ value: GradeTerm; label: string }> = [
  { value: "1-midterm", label: "1학기 중간" },
  { value: "1-final", label: "1학기 기말" },
  { value: "2-midterm", label: "2학기 중간" },
  { value: "2-final", label: "2학기 기말" }
];

const defaultSubjectNames = ["국어", "수학", "영어", "사탐", "과탐"];

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

export const defaultScoreMemoryStore: ScoreMemoryStore = {
  schoolRecords: [createEmptyGradeRecord("1", "1-midterm")],
  mockExams: [createEmptyGradeRecord("1", "1-midterm")],
  studentRecords: [createEmptyStudentRecord("1", "1-midterm")],
  uploads: [],
  activeTab: "schoolRecord",
  selectedYear: "1",
  selectedTerm: "1-midterm",
  updatedAt: nowIso()
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

  return raw.map((item, index) => {
    const subject = typeof item === "object" && item && "subject" in item ? String(item.subject ?? "") : defaultSubjectNames[index] ?? "";
    const score = typeof item === "object" && item && "score" in item ? String(item.score ?? "") : "";
    const id = typeof item === "object" && item && "id" in item ? String(item.id) : createSubjectId(subject, index);
    const isCustom = typeof item === "object" && item && "isCustom" in item ? Boolean(item.isCustom) : index >= defaultSubjectNames.length;
    return { id, subject, score, isCustom };
  });
}

function normalizeGradeRecord(raw: unknown): GradePeriodRecord {
  const rawYear = typeof raw === "object" && raw && "year" in raw ? String(raw.year) : "1";
  const rawTerm = typeof raw === "object" && raw && "term" in raw ? String(raw.term) : "1-midterm";
  const year = (gradeYearOptions.find((item) => item.value === rawYear)?.value ?? "1") as GradeYear;
  const term = (gradeTermOptions.find((item) => item.value === rawTerm)?.value ?? "1-midterm") as GradeTerm;

  return {
    id: typeof raw === "object" && raw && "id" in raw ? String(raw.id) : buildKey(year, term),
    year,
    term,
    subjects: normalizeSubjectEntries(typeof raw === "object" && raw && "subjects" in raw ? raw.subjects : []),
    overallAverage: typeof raw === "object" && raw && "overallAverage" in raw ? String(raw.overallAverage ?? "") : "",
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

  return {
    schoolRecords: sortByPeriod(schoolRecords),
    mockExams: sortByPeriod(mockExams),
    studentRecords: sortByPeriod(studentRecords),
    uploads,
    activeTab: (scoreTabOptions.find((item) => item.key === activeTab)?.key ?? "schoolRecord") as ScoreTabKey,
    selectedYear: (gradeYearOptions.find((item) => item.value === selectedYear)?.value ?? "1") as GradeYear,
    selectedTerm: (gradeTermOptions.find((item) => item.value === selectedTerm)?.value ?? "1-midterm") as GradeTerm,
    updatedAt: "updatedAt" in raw ? String(raw.updatedAt) : nowIso()
  };
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
    window.localStorage.setItem(scoreStorageKey, JSON.stringify(nextStore));
  }
}

async function loadServerStore() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const response = await fetch("/api/onboarding/scores", {
      method: "GET",
      cache: "no-store"
    });
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { data?: unknown };
    return payload.data ? normalizeScoreStore(payload.data) : null;
  } catch {
    return null;
  }
}

async function persistStoreToServer(nextStore: ScoreMemoryStore) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    await fetch("/api/onboarding/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextStore),
      keepalive: true
    });
  } catch {
    // Keep local snapshot even if the backend bridge is temporarily unavailable.
  }
}

function parseNumber(input: string) {
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : null;
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
  return average.toFixed(1);
}

export function buildScoreSummary(store: ScoreMemoryStore) {
  return {
    schoolAverage: computeAverage(store.schoolRecords),
    mockAverage: computeAverage(store.mockExams),
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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const hydrateStore = async () => {
      let localStore: ScoreMemoryStore | null = null;

      try {
        const raw = window.localStorage.getItem(scoreStorageKey);
        if (raw) {
          localStore = normalizeScoreStore(JSON.parse(raw));
        }
      } catch {
        window.localStorage.removeItem(scoreStorageKey);
      }

      const serverStore = await loadServerStore();
      const resolvedStore = getStoreTimestamp(serverStore) > getStoreTimestamp(localStore) ? serverStore : localStore;

      if (!cancelled) {
        setStore(resolvedStore ?? defaultScoreMemoryStore);
        if (resolvedStore) {
          persistStore(resolvedStore);
        }
        setHydrated(true);
      }
    };

    void hydrateStore();

    return () => {
      cancelled = true;
    };
  }, []);

  const commit = (updater: (previous: ScoreMemoryStore) => ScoreMemoryStore) => {
    setStore((previous) => {
      const nextStore = normalizeScoreStore(updater(previous));
      persistStore(nextStore);
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
    commit((previous) => {
      const current = getScoreRecord(previous, tab, year, term);
      const nextRecord: GradePeriodRecord = {
        ...current,
        subjects: current.subjects.map((entry) => (entry.id === entryId ? { ...entry, score: value } : entry)),
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
    commit((previous) => {
      const current = getScoreRecord(previous, tab, year, term);
      const nextRecord: GradePeriodRecord = { ...current, overallAverage: value, updatedAt: nowIso() };
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
  const summary = useMemo(() => buildScoreSummary(store), [store]);

  return {
    store,
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
