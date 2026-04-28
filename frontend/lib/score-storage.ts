"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
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
import { readJsonResponse } from "@/lib/read-json-response";
import { getCurrentMember } from "@/lib/member-store";

export const scoreStorageKey = "uni-mate-score-memory";

/** 서버(DB) 기준 설정 화면 성적 요약 — TB_ACADEMIC_SCORE 등급(grade) 평균, TB_CSAT_SCORE 최신 4과목 등급 평균 */
export type ScoreSettingsDisplay = {
  schoolGradeAverage: string;
  latestMockFourGradeAverage: string;
};
function getCurrentUserKey() {
  const id = getCurrentMember()?.userId?.trim();
  if (!id) {
    return "local-user";
  }
  return id.toLowerCase();
}

function scoreMemoryLocalKey(userKey: string) {
  const key = userKey.trim().toLowerCase() || "local-user";
  return `${scoreStorageKey}:${key}`;
}

/** 하이드레이션 직전 등 세션을 아직 못 읽은 경우를 피하기 위해 동일 규칙으로 키를 만든다 */
function readEffectiveScoreUserKey(): string {
  if (typeof window === "undefined") {
    return "local-user";
  }
  const id = getCurrentMember()?.userId?.trim();
  if (!id) {
    return "local-user";
  }
  return id.toLowerCase();
}

export const scoreTabOptions: Array<{ key: ScoreTabKey; label: string }> = [
  { key: "schoolRecord", label: "내신" },
  { key: "mockExam", label: "모의고사" },
  { key: "studentRecord", label: "특기 / 생기부" }
];

/** 내신·모의고사 과목 등급 (1~9등급) */
export const subjectGradeOptions = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const passFailScoreOptions = ["PASS", "NON PASS"] as const;
const passFailSubjectNames = ["진로와 직업", "논술"] as const;

function isSubjectGradeValue(value: string): boolean {
  if ((subjectGradeOptions as readonly string[]).includes(value)) {
    return true;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 9;
}

function isPassFailScoreValue(value: string): boolean {
  return (passFailScoreOptions as readonly string[]).includes(value);
}

function isPassFailSubject(subject: string): boolean {
  return (passFailSubjectNames as readonly string[]).includes(subject.trim());
}

function isAllowedSubjectScore(value: string, subject: string): boolean {
  if (isSubjectGradeValue(value)) {
    return true;
  }
  if (isPassFailSubject(subject)) {
    return isPassFailScoreValue(value);
  }
  return false;
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

/** 특기/생기부: 실제 생기부처럼 학기(1·2학기)만 구분 — 중간·기말 없음 */
const studentRecordTermOptions: Array<{ value: GradeTerm; label: string }> = [
  { value: "1-final", label: "1학기" },
  { value: "2-final", label: "2학기" }
];

/** 생기부 UI·저장: 학기만 쓰므로 중간/기말 구분 값을 1·2학기 대표 term으로 맞춤 */
export function canonicalStudentRecordTerm(term: GradeTerm): GradeTerm {
  if (term === "1-midterm" || term === "1-final") {
    return "1-final";
  }
  if (term === "2-midterm" || term === "2-final") {
    return "2-final";
  }
  return term;
}

/** 과거 UI(중간·기말)로 나뉘어 저장된 생기부 행을 학기 단위로 합침 */
function mergeStudentRecordsBySemesterBucket(records: StudentRecordPeriod[]): StudentRecordPeriod[] {
  const map = new Map<string, StudentRecordPeriod>();
  for (const r of records) {
    const term = canonicalStudentRecordTerm(r.term);
    const row = { ...r, term };
    const key = `${row.year}|${row.term}|${row.academicYear}|${row.semester}|${row.recordType}|${row.subjectName ?? ""}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, row);
      continue;
    }
    const parts = [existing.description, row.description].map((t) => String(t ?? "").trim()).filter(Boolean);
    map.set(key, {
      ...existing,
      title: [existing.title, row.title].map((t) => String(t ?? "").trim()).filter(Boolean).join(" · ") || existing.title,
      description: parts.join("\n\n"),
      files: [...existing.files, ...row.files],
      recordId: existing.recordId ?? row.recordId,
      updatedAt: existing.updatedAt > row.updatedAt ? existing.updatedAt : row.updatedAt
    });
  }
  return sortByPeriod(Array.from(map.values()));
}

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
  if (tab === "studentRecord") {
    return studentRecordTermOptions;
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

const DEFAULT_STUDENT_ACADEMIC_YEAR: StudentRecordAcademicYear = 2026;
const DEFAULT_STUDENT_SEMESTER: StudentRecordSemester = 1;
const DEFAULT_STUDENT_RECORD_TYPE: StudentRecordType = "세특";

const STUDENT_RECORD_TYPES: StudentRecordType[] = ["세특", "동아리", "봉사", "진로", "수상", "독서", "행동특성"];

function parseStudentRecordAcademicYear(value: unknown): StudentRecordAcademicYear {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (Number.isFinite(n) && n >= 2026 && n <= 2036) {
    return n as StudentRecordAcademicYear;
  }
  return DEFAULT_STUDENT_ACADEMIC_YEAR;
}

function parseStudentRecordSemester(value: unknown): StudentRecordSemester {
  if (value === 1 || value === "1") {
    return 1;
  }
  if (value === 2 || value === "2") {
    return 2;
  }
  return DEFAULT_STUDENT_SEMESTER;
}

function parseStudentRecordType(value: unknown): StudentRecordType {
  const s = typeof value === "string" ? value.trim() : "";
  if ((STUDENT_RECORD_TYPES as readonly string[]).includes(s)) {
    return s as StudentRecordType;
  }
  return DEFAULT_STUDENT_RECORD_TYPE;
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
    academicYear: DEFAULT_STUDENT_ACADEMIC_YEAR,
    semester: DEFAULT_STUDENT_SEMESTER,
    recordType: DEFAULT_STUDENT_RECORD_TYPE,
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
  studentRecords: [createEmptyStudentRecord("1", "1-final")],
  uploads: [],
  activeTab: "schoolRecord",
  selectedYear: "1",
  selectedTerm: "1-midterm",
  selectedStudentAcademicYear: DEFAULT_STUDENT_ACADEMIC_YEAR,
  selectedStudentSemester: DEFAULT_STUDENT_SEMESTER,
  selectedStudentRecordType: DEFAULT_STUDENT_RECORD_TYPE,
  updatedAt: nowIso(),
  scoreSchemaVersion: SCORE_SCHEMA_VERSION
};

function hasAnySavedScoreContent(store: ScoreMemoryStore): boolean {
  const hasGrade = (record: GradePeriodRecord) =>
    record.overallAverage.trim().length > 0 || record.subjects.some((entry) => entry.score.trim().length > 0);
  return store.schoolRecords.some(hasGrade) || store.mockExams.some(hasGrade);
}

/** 내신·모의 행에 채워진 등급·평균 칸 수 — 어느 쪽 스냅샷이 더 완전한지 비교할 때 사용 */
function scoreContentRichness(store: ScoreMemoryStore | null): number {
  if (!store) {
    return 0;
  }
  let n = 0;
  for (const record of [...store.schoolRecords, ...store.mockExams]) {
    if (record.overallAverage.trim()) {
      n += 3;
    }
    for (const entry of record.subjects) {
      if (entry.score.trim()) {
        n += 2;
      }
    }
  }
  return n;
}

/**
 * 스냅샷 병합용 시각. 서버 JSON은 루트 `updatedAt`만 오래되고 학기별 `updatedAt`은 최신인 경우가 있어
 * 루트만 보면 로컬 빈 캐시가 서버 전체 내신보다 “최신”으로 잘못 이긴다.
 */
function getStoreFreshnessTimestamp(store: ScoreMemoryStore | null): number {
  if (!store) {
    return 0;
  }
  let maxMs = Date.parse(store.updatedAt);
  if (!Number.isFinite(maxMs)) {
    maxMs = 0;
  }
  for (const record of store.schoolRecords) {
    const t = Date.parse(record.updatedAt);
    if (Number.isFinite(t) && t > maxMs) {
      maxMs = t;
    }
  }
  for (const record of store.mockExams) {
    const t = Date.parse(record.updatedAt);
    if (Number.isFinite(t) && t > maxMs) {
      maxMs = t;
    }
  }
  return maxMs;
}

/** 세션 초안이 아닐 때 서버·로컬 중 더 완전한 성적 스냅샷을 고른다 */
function pickBetterSnapshot(server: ScoreMemoryStore | null, local: ScoreMemoryStore | null): ScoreMemoryStore | null {
  const serverHas = Boolean(server && hasAnySavedScoreContent(server));
  const localHas = Boolean(local && hasAnySavedScoreContent(local));
  if (serverHas && !localHas) {
    return server;
  }
  if (!serverHas && localHas) {
    return local;
  }
  if (!serverHas && !localHas) {
    return server ?? local;
  }
  const sR = scoreContentRichness(server);
  const lR = scoreContentRichness(local);
  if (sR > lR) {
    return server;
  }
  if (lR > sR) {
    return local;
  }
  const sTs = getStoreFreshnessTimestamp(server);
  const lTs = getStoreFreshnessTimestamp(local);
  return sTs >= lTs ? server : local;
}

function buildKimMinjiSeedScoreStore(): ScoreMemoryStore {
  const makeCoreRecord = (year: GradeYear, term: GradeTerm, korean: string, math: string, english: string, overall: string) => {
    const record = createEmptyGradeRecord(year, term);
    record.subjects = record.subjects.map((entry) => {
      if (entry.subject === "국어") return { ...entry, score: korean };
      if (entry.subject === "수학") return { ...entry, score: math };
      if (entry.subject === "영어") return { ...entry, score: english };
      return entry;
    });
    record.overallAverage = overall;
    record.updatedAt = nowIso();
    return record;
  };

  // 사용자 요청 복구: 김민지 저장분에서 자주 보던 한국사/사탐(경제, 정치와 법) 과목을 명시적으로 포함.
  const school = makeCoreRecord("2", "1-final", "2", "3", "2", "2.33");
  school.subjects = [
    ...school.subjects,
    { id: createSubjectId("한국사", school.subjects.length), subject: "한국사", score: "2", isCustom: true },
    { id: createSubjectId("경제", school.subjects.length + 1), subject: "경제", score: "2", isCustom: true },
    { id: createSubjectId("정치와 법", school.subjects.length + 2), subject: "정치와 법", score: "3", isCustom: true }
  ];

  const schoolMidterm = makeCoreRecord("2", "1-midterm", "3", "3", "2", "2.67");

  const mock = makeCoreRecord("2", "mock-nat-6", "2", "3", "2", "2.33");
  mock.subjects = [
    ...mock.subjects,
    { id: createSubjectId("한국사", mock.subjects.length), subject: "한국사", score: "2", isCustom: true },
    { id: createSubjectId("경제", mock.subjects.length + 1), subject: "경제", score: "2", isCustom: true },
    { id: createSubjectId("정치와 법", mock.subjects.length + 2), subject: "정치와 법", score: "3", isCustom: true }
  ];

  return normalizeScoreStore({
    ...defaultScoreMemoryStore,
    schoolRecords: [schoolMidterm, school],
    mockExams: [mock],
    activeTab: "schoolRecord",
    selectedYear: "2",
    selectedTerm: "1-final",
    updatedAt: nowIso()
  });
}

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
    const score = isAllowedSubjectScore(rawScore, subject) ? rawScore : "";
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
  const termRaw = "term" in raw ? String(raw.term) : "1-midterm";
  let termResolved = (gradeTermOptions.find((item) => item.value === termRaw)?.value ?? "1-midterm") as GradeTerm;
  if ((scoreTabOptions.find((item) => item.key === sourceTab)?.key ?? "schoolRecord") === "studentRecord") {
    termResolved = canonicalStudentRecordTerm(termResolved);
  }

  return {
    id: "id" in raw ? String(raw.id) : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "name" in raw ? String(raw.name) : "uploaded-file",
    size: "size" in raw ? Number(raw.size) || 0 : 0,
    type: "type" in raw ? String(raw.type) : "application/octet-stream",
    sourceTab: (scoreTabOptions.find((item) => item.key === sourceTab)?.key ?? "schoolRecord") as ScoreTabKey,
    year: (gradeYearOptions.find((item) => item.value === year)?.value ?? "1") as GradeYear,
    term: termResolved,
    uploadedAt: "uploadedAt" in raw ? String(raw.uploadedAt) : nowIso()
  };
}

function normalizeStudentRecord(raw: unknown): StudentRecordPeriod {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rawYear = "year" in obj ? String(obj.year) : "1";
  const rawTerm = "term" in obj ? String(obj.term) : "1-midterm";
  const year = (gradeYearOptions.find((item) => item.value === rawYear)?.value ?? "1") as GradeYear;
  const termParsed = (gradeTermOptions.find((item) => item.value === rawTerm)?.value ?? "1-midterm") as GradeTerm;
  const term = canonicalStudentRecordTerm(termParsed);
  const files =
    "files" in obj && Array.isArray(obj.files)
      ? obj.files.map(normalizeUpload).filter((item): item is UploadedRecordFile => item !== null)
      : [];

  const recordIdRaw = obj.recordId;
  const recordId = typeof recordIdRaw === "number" && Number.isFinite(recordIdRaw) ? recordIdRaw : undefined;
  const subjectNameRaw = obj.subjectName;
  const subjectName = typeof subjectNameRaw === "string" && subjectNameRaw.trim() ? subjectNameRaw.trim() : undefined;

  return {
    id: "id" in obj ? String(obj.id) : buildKey(year, term),
    ...(recordId !== undefined ? { recordId } : {}),
    year,
    term,
    academicYear: parseStudentRecordAcademicYear(obj.academicYear),
    semester: parseStudentRecordSemester(obj.semester),
    recordType: parseStudentRecordType(obj.recordType),
    ...(subjectName !== undefined ? { subjectName } : {}),
    title: "title" in obj ? String(obj.title ?? "") : "",
    description: "description" in obj ? String(obj.description ?? "") : "",
    files,
    updatedAt: "updatedAt" in obj ? String(obj.updatedAt) : nowIso()
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
      ? mergeStudentRecordsBySemesterBucket(raw.studentRecords.map(normalizeStudentRecord))
      : defaultScoreMemoryStore.studentRecords;
  const uploads =
    "uploads" in raw && Array.isArray(raw.uploads)
      ? raw.uploads.map(normalizeUpload).filter((item): item is UploadedRecordFile => item !== null)
      : defaultScoreMemoryStore.uploads;
  const activeTab = "activeTab" in raw ? String(raw.activeTab) : "schoolRecord";
  const selectedYear = "selectedYear" in raw ? String(raw.selectedYear) : "1";
  const selectedTerm = "selectedTerm" in raw ? String(raw.selectedTerm) : "1-midterm";
  const rawObj = raw as Record<string, unknown>;

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
    selectedStudentAcademicYear: parseStudentRecordAcademicYear(rawObj.selectedStudentAcademicYear),
    selectedStudentSemester: parseStudentRecordSemester(rawObj.selectedStudentSemester),
    selectedStudentRecordType: parseStudentRecordType(rawObj.selectedStudentRecordType),
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

function persistStore(nextStore: ScoreMemoryStore, storageUserKey?: string) {
  if (typeof window !== "undefined") {
    const key = storageUserKey?.trim().toLowerCase() || getCurrentUserKey();
    window.localStorage.setItem(scoreMemoryLocalKey(key), JSON.stringify(nextStore));
  }
}

async function loadServerStore(fetchUserKey?: string): Promise<{
  store: ScoreMemoryStore | null;
  settingsDisplay: ScoreSettingsDisplay | null;
}> {
  if (typeof window === "undefined") {
    return { store: null, settingsDisplay: null };
  }

  const userKey = (fetchUserKey?.trim().toLowerCase() || getCurrentUserKey()) || "local-user";

  try {
    const qs = new URLSearchParams({ userKey });
    const response = await fetch(`/api/onboarding/scores?${qs.toString()}`, {
      method: "GET",
      cache: "no-store",
      headers: { "x-user-key": userKey }
    });
    if (!response.ok) {
      return { store: null, settingsDisplay: null };
    }

    const payload = await readJsonResponse<{ data?: unknown; settingsDisplay?: ScoreSettingsDisplay | null }>(response);
    if (!payload) {
      return { store: null, settingsDisplay: null };
    }
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

async function persistStoreToServer(nextStore: ScoreMemoryStore, fetchUserKey?: string) {
  if (typeof window === "undefined") {
    return;
  }

  const userKey = (fetchUserKey?.trim().toLowerCase() || getCurrentUserKey()) || "local-user";

  try {
    const qs = new URLSearchParams({ userKey });
    await fetch(`/api/onboarding/scores?${qs.toString()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-key": userKey },
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

function toPeriodRank(record: GradePeriodRecord): number {
  const year = Number(record.year) || 0;
  const month = mockTermCalendarMonth(record.term);
  return year * 100 + month;
}

function formatSummaryAverage(value: number) {
  return value.toFixed(2);
}

function computeAverage(records: GradePeriodRecord[], latestOnly = false) {
  const targetRecords =
    latestOnly && records.length > 0
      ? [records.reduce((latest, current) => (toPeriodRank(current) >= toPeriodRank(latest) ? current : latest))]
      : records;

  const values = targetRecords
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
  const backendSchoolAverage = settingsDisplay?.schoolGradeAverage?.trim();
  const schoolAverageFromBackend = backendSchoolAverage && backendSchoolAverage !== "-" ? backendSchoolAverage : null;
  const backendMockAverage = settingsDisplay?.latestMockFourGradeAverage?.trim();
  const mockAverageFromBackend = backendMockAverage && backendMockAverage !== "-" ? backendMockAverage : null;
  return {
    schoolAverage: schoolAverageFromBackend ?? computeAverage(store.schoolRecords),
    // 온보딩 외 화면은 백엔드(TB_CSAT_SCORE 집계) 값을 우선 사용
    mockAverage: mockAverageFromBackend ?? computeAverage(store.mockExams, true),
    /** 설정 화면 전용: TB_ACADEMIC_SCORE 등급(grade) 평균(소수 2자리), 없으면 null → 화면에서 schoolAverage로 대체 */
    settingsSchoolFromDb: schoolAverageFromBackend,
    /** 설정 화면 전용: TB_CSAT_SCORE 최신 시험연월 집계 평균(소수 2자리), 없으면 null */
    settingsMockFromDb: mockAverageFromBackend,
    studentRecordCount: store.studentRecords.filter((record) => record.title || record.description || record.files.length > 0).length,
    uploadCount: store.uploads.length
  };
}

function hasMeaningfulMockExams(records: GradePeriodRecord[]) {
  return records.some((record) => {
    if (record.overallAverage.trim()) {
      return true;
    }
    return record.subjects.some((entry) => entry.score.trim());
  });
}
export function useScoreRecords() {
  const [store, setStore] = useState<ScoreMemoryStore>(defaultScoreMemoryStore);
  const [settingsDisplay, setSettingsDisplay] = useState<ScoreSettingsDisplay | null>(null);
  const [hydrated, setHydrated] = useState(false);
  /** `null`: 아직 세션 키를 읽기 전(첫 패시브 이펙트에서 `local-user`로 잘못 fetch 하는 것 방지) */
  const [scoreUserKey, setScoreUserKey] = useState<string | null>(null);

  useLayoutEffect(() => {
    const sync = () => setScoreUserKey(readEffectiveScoreUserKey());
    sync();
    if (typeof window === "undefined") {
      return;
    }
    window.addEventListener("uni-mate-member-changed", sync);
    return () => window.removeEventListener("uni-mate-member-changed", sync);
  }, []);

  /** useLayoutEffect가 없는 환경·하이드레이션 순서에서 null이 남는 경우 보정 */
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setScoreUserKey((prev) => (prev === null ? readEffectiveScoreUserKey() : prev));
  }, []);

  useEffect(() => {
    if (scoreUserKey === null) {
      return;
    }

    let cancelled = false;

    const hydrateStore = async (userKey: string) => {
      let localStore: ScoreMemoryStore | null = null;

      try {
        const keyPrimary = scoreMemoryLocalKey(userKey);
        let raw = window.localStorage.getItem(keyPrimary);
        if (!raw) {
          const rawId = getCurrentMember()?.userId?.trim();
          if (rawId && `${scoreStorageKey}:${rawId}` !== keyPrimary) {
            raw = window.localStorage.getItem(`${scoreStorageKey}:${rawId}`);
          }
        }
        if (raw) {
          localStore = normalizeScoreStore(JSON.parse(raw));
        }
      } catch {
        window.localStorage.removeItem(scoreMemoryLocalKey(userKey));
      }

      const { store: serverStore, settingsDisplay: serverHints } = await loadServerStore(userKey);
      const draftStore = getDraftScores<ScoreMemoryStore>();
      const draftTs = getStoreFreshnessTimestamp(draftStore);
      const serverTs = getStoreFreshnessTimestamp(serverStore);
      const localTs = getStoreFreshnessTimestamp(localStore);

      const draftWins =
        draftStore != null &&
        hasAnySavedScoreContent(draftStore) &&
        draftTs >= serverTs &&
        draftTs >= localTs;

      let resolvedStore: ScoreMemoryStore | null = null;
      if (draftWins) {
        resolvedStore = draftStore;
      } else {
        resolvedStore = pickBetterSnapshot(serverStore, localStore);
      }

      const resolvedHints: ScoreSettingsDisplay | null = draftWins ? null : serverHints;
      const shouldSeedKimMinji =
        userKey === "kmg11" ||
        userKey === "kmj11" ||
        getCurrentMember()?.name?.trim() === "김민지";
      const baseStore = normalizeScoreStore(resolvedStore ?? defaultScoreMemoryStore);
      let finalStore = shouldSeedKimMinji && !hasAnySavedScoreContent(baseStore) ? buildKimMinjiSeedScoreStore() : baseStore;

      // 서버 스냅샷 모의고사가 비어 있으면(기존 데이터 소실/초기화 케이스), 로컬·드래프트의 유효 모의고사 값을 우선 보존한다.
      if (
        serverStore &&
        !hasMeaningfulMockExams(serverStore.mockExams) &&
        ((localStore && hasMeaningfulMockExams(localStore.mockExams)) ||
          (draftStore && hasMeaningfulMockExams(draftStore.mockExams)))
      ) {
        const fallbackMockSource = draftStore && hasMeaningfulMockExams(draftStore.mockExams) ? draftStore : localStore;
        if (fallbackMockSource) {
          finalStore = normalizeScoreStore({
            ...finalStore,
            mockExams: fallbackMockSource.mockExams,
            updatedAt: nowIso()
          });
        }
      }

      if (!cancelled) {
        setStore(finalStore);
        setSettingsDisplay(resolvedHints);
        persistStore(finalStore, userKey);
        setDraftScores(finalStore);
        const serverHadScores = Boolean(serverStore && hasAnySavedScoreContent(serverStore));
        const finalHasScores = hasAnySavedScoreContent(finalStore);
        if (finalHasScores || !serverHadScores) {
          void persistStoreToServer(finalStore, userKey);
        }
        setHydrated(true);
      }
    };

    void hydrateStore(scoreUserKey);

    return () => {
      cancelled = true;
    };
  }, [scoreUserKey]);

  const commit = (updater: (previous: ScoreMemoryStore) => ScoreMemoryStore) => {
    setSettingsDisplay(null);
    setStore((previous) => {
      const nextStore = normalizeScoreStore(updater(previous));
      persistStore(nextStore);
      setDraftScores(nextStore);
      void persistStoreToServer(nextStore);
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
      const targetSubject = current.subjects.find((entry) => entry.id === entryId)?.subject ?? "";
      const normalizedValue = isAllowedSubjectScore(value, targetSubject) ? value : "";
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

  const removeScoreRecord = (tab: "schoolRecord" | "mockExam", year: GradeYear, term: GradeTerm) => {
    commit((previous) => {
      const nextRecords = getScoreRecordBucket(previous, tab).filter((record) => !(record.year === year && record.term === term));
      return updateScoreRecordBucket(previous, tab, nextRecords.length > 0 ? nextRecords : [createEmptyGradeRecord("1", "1-midterm")]);
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

  const removeUploads = (sourceTab: ScoreTabKey, year: GradeYear, term: GradeTerm, fileNames: string[]) => {
    const targets = new Set(fileNames.map((name) => name.trim()).filter(Boolean));
    if (targets.size === 0) {
      return;
    }
    commit((previous) => {
      const nextUploads = previous.uploads.filter(
        (file) =>
          !(
            file.sourceTab === sourceTab &&
            file.year === year &&
            file.term === term &&
            targets.has(file.name.trim())
          )
      );

      if (sourceTab !== "studentRecord") {
        return {
          ...previous,
          uploads: nextUploads,
          updatedAt: nowIso()
        };
      }

      const current = getStudentRecord(previous, year, term);
      const nextRecord: StudentRecordPeriod = {
        ...current,
        files: current.files.filter((file) => !targets.has(file.name.trim())),
        updatedAt: nowIso()
      };
      return {
        ...previous,
        studentRecords: upsertStudentRecord(previous.studentRecords, nextRecord),
        uploads: nextUploads,
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

  /** 서버(DB) 스냅샷을 다시 받아 로컬·세션 초안에 반영 — 온보딩 성적 화면에서 마운트 시 호출 */
  const refreshScoresFromServer = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }
    const userKey = readEffectiveScoreUserKey();
    const { store: serverStore, settingsDisplay: serverHints } = await loadServerStore(userKey);
    if (!serverStore || !hasAnySavedScoreContent(serverStore)) {
      return;
    }
    const next = normalizeScoreStore(serverStore);
    setStore(next);
    setSettingsDisplay(serverHints ?? null);
    persistStore(next, userKey);
    setDraftScores(next);
    void persistStoreToServer(next, userKey);
  }, []);

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
    removeScoreRecord,
    updateStudentRecordField,
    registerUploads,
    removeUploads,
    flushStore,
    flushStoreToServer,
    refreshScoresFromServer
  };
}
