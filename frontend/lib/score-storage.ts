"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  GradePeriodRecord,
  GradeTerm,
  GradeYear,
  ScoreMemoryStore,
  ScoreTabKey,
  StudentRecordAcademicYear,
  StudentRecordPeriod,
  StudentRecordSemester,
  StudentRecordType,
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

type UseScoreRecordsOptions = {
  useDbSchoolAverage?: boolean;
  useDbMockAverage?: boolean;
};

function normalizeSettingsDisplay(raw: unknown): ScoreSettingsDisplay | null {
  if (
    raw &&
    typeof raw === "object" &&
    "schoolGradeAverage" in raw &&
    "latestMockFourGradeAverage" in raw &&
    typeof raw.schoolGradeAverage === "string" &&
    typeof raw.latestMockFourGradeAverage === "string"
  ) {
    return {
      schoolGradeAverage: raw.schoolGradeAverage,
      latestMockFourGradeAverage: raw.latestMockFourGradeAverage
    };
  }
  return null;
}

function getCurrentUserKey() {
  return getCurrentMember()?.userId?.trim() || "local-user";
}
function getScopedScoreStorageKey() {
  return `${scoreStorageKey}:${getCurrentUserKey()}`;
}

export const scoreTabOptions: Array<{ key: ScoreTabKey; label: string }> = [
  { key: "schoolRecord", label: "내신" },
  { key: "mockExam", label: "모의고사" },
  { key: "studentRecord", label: "특기/생기부" }
];

export const gradeYearOptions: Array<{ value: GradeYear; label: string }> = [
  { value: "1", label: "1학년" },
  { value: "2", label: "2학년" },
  { value: "3", label: "3학년" }
];

export const studentRecordAcademicYearOptions: Array<{ value: StudentRecordAcademicYear; label: string }> = [
  2026,
  2027,
  2028,
  2029,
  2030,
  2031,
  2032,
  2033,
  2034,
  2035,
  2036
].map((year) => ({ value: year as StudentRecordAcademicYear, label: String(year) }));

export const studentRecordSemesterOptions: Array<{ value: StudentRecordSemester; label: string }> = [
  { value: 1, label: "1학기" },
  { value: 2, label: "2학기" }
];

export const studentRecordTypeOptions: Array<{ value: StudentRecordType; label: string }> = [
  { value: "세특", label: "세특" },
  { value: "동아리", label: "동아리" },
  { value: "봉사", label: "봉사" },
  { value: "진로", label: "진로" },
  { value: "수상", label: "수상" },
  { value: "독서", label: "독서" },
  { value: "행동특성", label: "행동특성" }
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
    { value: "mock-csat-9", label: "대학수학능력시험 9월" }
  ]
};

export function getGradeTermOptionsByTab(tab: ScoreTabKey, year: GradeYear) {
  if (tab === "mockExam") {
    return mockTermOptionsByYear[year];
  }
  return schoolTermOptions;
}

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

function extractStudentRecordTitle(content: string) {
  const normalized = content.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return "";
  }
  const firstSentence = normalized.match(/^.+?[.!?。！？]/)?.[0] ?? normalized;
  return firstSentence.slice(0, 80);
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

function buildStudentRecordKey(academicYear: StudentRecordAcademicYear, semester: StudentRecordSemester, recordType: StudentRecordType) {
  return `${academicYear}-${semester}-${recordType}`;
}

function inferGradeYearFromAcademicYear(academicYear: StudentRecordAcademicYear): GradeYear {
  const offset = academicYear - 2025;
  if (offset === 2) return "2";
  if (offset >= 3) return "3";
  return "1";
}

function termFromStudentSemester(semester: StudentRecordSemester): GradeTerm {
  return semester === 2 ? "2-final" : "1-final";
}

export function createEmptyStudentRecord(
  academicYear: StudentRecordAcademicYear = 2026,
  semester: StudentRecordSemester = 1,
  recordType: StudentRecordType = "세특"
): StudentRecordPeriod {
  return {
    id: buildStudentRecordKey(academicYear, semester, recordType),
    year: inferGradeYearFromAcademicYear(academicYear),
    term: termFromStudentSemester(semester),
    academicYear,
    semester,
    recordType,
    title: "",
    description: "",
    files: [],
    updatedAt: nowIso()
  };
}

export const defaultScoreMemoryStore: ScoreMemoryStore = {
  schoolRecords: [createEmptyGradeRecord("1", "1-midterm")],
  mockExams: [createEmptyGradeRecord("1", "1-midterm")],
  studentRecords: [createEmptyStudentRecord(2026, 1, "세특")],
  uploads: [],
  activeTab: "schoolRecord",
  selectedYear: "1",
  selectedTerm: "1-midterm",
  selectedStudentAcademicYear: 2026,
  selectedStudentSemester: 1,
  selectedStudentRecordType: "세특",
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

function sortStudentRecords(records: StudentRecordPeriod[]) {
  return [...records].sort((left, right) => {
    if (left.academicYear !== right.academicYear) {
      return left.academicYear - right.academicYear;
    }
    if (left.semester !== right.semester) {
      return left.semester - right.semester;
    }
    return studentRecordTypeOptions.findIndex((item) => item.value === left.recordType) - studentRecordTypeOptions.findIndex((item) => item.value === right.recordType);
  });
}

function normalizeSubjectEntries(raw: unknown): SubjectScoreEntry[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return createSubjectEntries();
  }

  return raw.map((item, index) => {
    const subject = typeof item === "object" && item && "subject" in item ? String(item.subject ?? "") : defaultSubjectNames[index] ?? "";
    const rawScore = typeof item === "object" && item && "score" in item ? String(item.score ?? "") : "";
    const score = ["1", "2", "3", "4", "5"].includes(rawScore) ? rawScore : "";
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
  const rawRecordId =
    typeof raw === "object" && raw && "recordId" in raw
      ? Number(raw.recordId)
      : typeof raw === "object" && raw && "record_id" in raw
        ? Number(raw.record_id)
        : null;
  const rawAcademicYearValue =
    typeof raw === "object" && raw && "academicYear" in raw
      ? Number(raw.academicYear)
      : typeof raw === "object" && raw && "academic_year" in raw
        ? Number(raw.academic_year)
        : 2026;
  const rawSemesterValue =
    typeof raw === "object" && raw && "semester" in raw
      ? Number(raw.semester)
      : typeof raw === "object" && raw && "term" in raw
        ? Number(String(raw.term).slice(0, 1))
        : 1;
  const rawRecordType =
    typeof raw === "object" && raw && "recordType" in raw
      ? String(raw.recordType)
      : typeof raw === "object" && raw && "record_type" in raw
        ? String(raw.record_type)
        : "세특";
  const academicYear = (studentRecordAcademicYearOptions.find((item) => item.value === rawAcademicYearValue)?.value ?? 2026) as StudentRecordAcademicYear;
  const semester = (studentRecordSemesterOptions.find((item) => item.value === rawSemesterValue)?.value ?? 1) as StudentRecordSemester;
  const recordType = (studentRecordTypeOptions.find((item) => item.value === rawRecordType)?.value ?? "세특") as StudentRecordType;
  const year = inferGradeYearFromAcademicYear(academicYear);
  const term = termFromStudentSemester(semester);
  const files =
    typeof raw === "object" && raw && "files" in raw && Array.isArray(raw.files)
      ? raw.files.map(normalizeUpload).filter((item): item is UploadedRecordFile => item !== null)
      : [];

  return {
    id: typeof raw === "object" && raw && "id" in raw ? String(raw.id) : buildStudentRecordKey(academicYear, semester, recordType),
    recordId: rawRecordId !== null && Number.isInteger(rawRecordId) && rawRecordId > 0 ? rawRecordId : undefined,
    year,
    term,
    academicYear,
    semester,
    recordType,
    subjectName:
      typeof raw === "object" && raw && "subjectName" in raw
        ? String(raw.subjectName ?? "")
        : typeof raw === "object" && raw && "subject_name" in raw
          ? String(raw.subject_name ?? "")
          : undefined,
    title:
      typeof raw === "object" && raw && "title" in raw
        ? String(raw.title ?? "")
        : extractStudentRecordTitle(typeof raw === "object" && raw && "description" in raw ? String(raw.description ?? "") : ""),
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
  const selectedStudentAcademicYear = "selectedStudentAcademicYear" in raw ? Number(raw.selectedStudentAcademicYear) : 2026;
  const selectedStudentSemester = "selectedStudentSemester" in raw ? Number(raw.selectedStudentSemester) : 1;
  const selectedStudentRecordType = "selectedStudentRecordType" in raw ? String(raw.selectedStudentRecordType) : "세특";

  return {
    schoolRecords: sortByPeriod(schoolRecords),
    mockExams: sortByPeriod(mockExams),
    studentRecords: sortStudentRecords(studentRecords),
    uploads,
    activeTab: (scoreTabOptions.find((item) => item.key === activeTab)?.key ?? "schoolRecord") as ScoreTabKey,
    selectedYear: (gradeYearOptions.find((item) => item.value === selectedYear)?.value ?? "1") as GradeYear,
    selectedTerm: (gradeTermOptions.find((item) => item.value === selectedTerm)?.value ?? "1-midterm") as GradeTerm,
    selectedStudentAcademicYear: (studentRecordAcademicYearOptions.find((item) => item.value === selectedStudentAcademicYear)?.value ?? 2026) as StudentRecordAcademicYear,
    selectedStudentSemester: (studentRecordSemesterOptions.find((item) => item.value === selectedStudentSemester)?.value ?? 1) as StudentRecordSemester,
    selectedStudentRecordType: (studentRecordTypeOptions.find((item) => item.value === selectedStudentRecordType)?.value ?? "세특") as StudentRecordType,
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
  const next = records.filter(
    (record) =>
      !(
        (record.recordId !== undefined && nextRecord.recordId !== undefined && record.recordId === nextRecord.recordId) ||
        record.academicYear === nextRecord.academicYear &&
        record.semester === nextRecord.semester &&
        record.recordType === nextRecord.recordType
      )
  );
  next.push({ ...nextRecord, updatedAt: nowIso() });
  return sortStudentRecords(next);
}

export function getScoreRecord(store: ScoreMemoryStore, tab: "schoolRecord" | "mockExam", year: GradeYear, term: GradeTerm) {
  return getScoreRecordBucket(store, tab).find((record) => record.year === year && record.term === term) ?? createEmptyGradeRecord(year, term);
}

export function getStudentRecord(
  store: ScoreMemoryStore,
  academicYear: StudentRecordAcademicYear,
  semester: StudentRecordSemester,
  recordType: StudentRecordType
) {
  return (
    store.studentRecords.find(
      (record) => record.academicYear === academicYear && record.semester === semester && record.recordType === recordType
    ) ?? createEmptyStudentRecord(academicYear, semester, recordType)
  );
}

function mergeServerStudentRecords(baseStore: ScoreMemoryStore, serverStore: ScoreMemoryStore | null) {
  if (!serverStore || serverStore.studentRecords.length === 0) {
    return baseStore;
  }

  let nextStudentRecords = baseStore.studentRecords;
  serverStore.studentRecords.forEach((serverRecord) => {
    nextStudentRecords = upsertStudentRecord(nextStudentRecords, serverRecord);
  });

  return {
    ...baseStore,
    studentRecords: nextStudentRecords
  };
}

function persistStore(nextStore: ScoreMemoryStore) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(getScopedScoreStorageKey(), JSON.stringify(nextStore));
  }
}

async function loadServerStore(userKey?: string): Promise<{
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
      headers: { "x-user-key": userKey || getCurrentUserKey() }
    });
    if (!response.ok) {
      return { store: null, settingsDisplay: null };
    }

    const payload = (await response.json()) as { data?: unknown; settingsDisplay?: unknown };
    const store = payload.data ? normalizeScoreStore(payload.data) : null;
    return { store, settingsDisplay: normalizeSettingsDisplay(payload.settingsDisplay) };
  } catch {
    return { store: null, settingsDisplay: null };
  }
}

async function persistStoreToServer(nextStore: ScoreMemoryStore) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const response = await fetch("/api/onboarding/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-key": getCurrentUserKey() },
      body: JSON.stringify(nextStore),
      keepalive: true
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { settingsDisplay?: unknown };
    return normalizeSettingsDisplay(payload.settingsDisplay);
  } catch {
    // Keep local snapshot even if the backend bridge is temporarily unavailable.
    return null;
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

export function buildScoreSummary(
  store: ScoreMemoryStore,
  settingsDisplay: ScoreSettingsDisplay | null = null,
  useDbSchoolAverage = true,
  useDbMockAverage = true
) {
  const localSchoolAverage = computeAverage(store.schoolRecords);
  const dbSchoolAverage =
    useDbSchoolAverage && settingsDisplay?.schoolGradeAverage && settingsDisplay.schoolGradeAverage !== "-"
      ? settingsDisplay.schoolGradeAverage
      : null;
  const localMockAverage = computeAverage(store.mockExams);
  const dbMockAverage =
    useDbMockAverage && settingsDisplay?.latestMockFourGradeAverage && settingsDisplay.latestMockFourGradeAverage !== "-"
      ? settingsDisplay.latestMockFourGradeAverage
      : null;
  return {
    schoolAverage: dbSchoolAverage ?? localSchoolAverage,
    mockAverage: dbMockAverage ?? localMockAverage,
    /** DB 기준: TB_ACADEMIC_SCORE의 과목별 이수단위 가중 평균을 학과군별 반영 과목으로 재평균 */
    settingsSchoolFromDb: dbSchoolAverage,
    /** DB 기준: TB_CSAT_SCORE의 시험년도 > 시험월도 최신 모의고사 평균 */
    settingsMockFromDb: dbMockAverage,
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

export function useScoreRecords(options: UseScoreRecordsOptions = {}) {
  const useDbSchoolAverage = options.useDbSchoolAverage ?? true;
  const useDbMockAverage = options.useDbMockAverage ?? true;
  const [store, setStore] = useState<ScoreMemoryStore>(defaultScoreMemoryStore);
  const [settingsDisplay, setSettingsDisplay] = useState<ScoreSettingsDisplay | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const hydrateStore = async () => {
      const userKey = getCurrentUserKey();
      let localStore: ScoreMemoryStore | null = null;

      try {
        const raw = window.localStorage.getItem(getScopedScoreStorageKey());
        if (raw) {
          localStore = normalizeScoreStore(JSON.parse(raw));
        }
      } catch {
        window.localStorage.removeItem(getScopedScoreStorageKey());
      }

      let { store: serverStore, settingsDisplay: serverHints } = await loadServerStore();
      if (!serverStore && userKey === "local-user") {
        const sample = await loadServerStore("LDY01");
        serverStore = sample.store;
        serverHints = sample.settingsDisplay;
      }
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

      const resolvedHints: ScoreSettingsDisplay | null = serverHints;
      const finalStore = mergeServerStudentRecords(resolvedStore ?? defaultScoreMemoryStore, serverStore);

      if (!cancelled) {
        setStore(finalStore);
        setSettingsDisplay(resolvedHints);
        if (resolvedStore || serverStore?.studentRecords.length) {
          persistStore(finalStore);
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

  const setSelectedStudentRecordPeriod = (
    academicYear: StudentRecordAcademicYear,
    semester: StudentRecordSemester,
    recordType: StudentRecordType
  ) => {
    commit((previous) => ({
      ...previous,
      selectedStudentAcademicYear: academicYear,
      selectedStudentSemester: semester,
      selectedStudentRecordType: recordType,
      updatedAt: nowIso()
    }));
  };

  const updateSubjectScore = (tab: "schoolRecord" | "mockExam", year: GradeYear, term: GradeTerm, entryId: string, value: string) => {
    const normalizedValue = ["1", "2", "3", "4", "5"].includes(value) ? value : "";
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

  const updateStudentRecordField = (field: "title" | "description", value: string) => {
    commit((previous) => {
      const current = getStudentRecord(
        previous,
        previous.selectedStudentAcademicYear,
        previous.selectedStudentSemester,
        previous.selectedStudentRecordType
      );
      const nextRecord: StudentRecordPeriod =
        field === "description"
          ? { ...current, description: value, title: extractStudentRecordTitle(value), updatedAt: nowIso() }
          : { ...current, title: value, updatedAt: nowIso() };
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
        const current = getStudentRecord(
          previous,
          previous.selectedStudentAcademicYear,
          previous.selectedStudentSemester,
          previous.selectedStudentRecordType
        );
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
    const serverHints = await persistStoreToServer(store);
    if (serverHints) {
      setSettingsDisplay(serverHints);
    }
    return store;
  };

  const currentScoreRecord = useMemo(() => {
    if (store.activeTab === "studentRecord") {
      return null;
    }
    return getScoreRecord(store, store.activeTab, store.selectedYear, store.selectedTerm);
  }, [store]);

  const currentStudentRecord = useMemo(
    () => getStudentRecord(store, store.selectedStudentAcademicYear, store.selectedStudentSemester, store.selectedStudentRecordType),
    [store]
  );
  const summary = useMemo(
    () => buildScoreSummary(store, settingsDisplay, useDbSchoolAverage, useDbMockAverage),
    [store, settingsDisplay, useDbSchoolAverage, useDbMockAverage]
  );

  return {
    store,
    settingsDisplay,
    hydrated,
    currentScoreRecord,
    currentStudentRecord,
    summary,
    setActiveTab,
    setSelectedPeriod,
    setSelectedStudentRecordPeriod,
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
