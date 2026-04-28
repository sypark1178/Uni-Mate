"use client";



import { useEffect, useMemo, useRef, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { PhoneFrame } from "@/components/phone-frame";

import { UploadDropzone } from "@/components/upload-dropzone";

import { mergeHrefWithSearchParams, safeNavigate } from "@/lib/navigation";

import { onboardingPrimaryCtaClass } from "@/lib/onboarding-buttons";

import {
  academicYearSelectOptions,
  getScoreRecord,
  getGradeTermOptionsByTab,
  getMockExamSeriesCaption,
  gradeTermOptions,
  gradeYearOptions,
  scoreTabOptions,
  studentRecordTypeTabOptions,
  studentSemesterTabOptions,
  subjectGradeOptions,
  uploadMatchesStudentSelection,
  useScoreRecords
} from "@/lib/score-storage";

import type {
  GradePeriodRecord,
  GradeTerm,
  GradeYear,
  ScoreTabKey,
  StudentRecordAcademicYear,
  StudentRecordType,
  SubjectScoreEntry
} from "@/lib/types";



const fixedScoreLabels = ["국어", "수학", "영어"] as const;

const fixedHeadCount = Math.max(0, fixedScoreLabels.length - 1);

const coreAverageSubjects = ["국어", "수학", "영어"] as const;
const passFailSubjectLabels = ["진로와 직업", "논술"] as const;
const passFailScoreOptions = ["PASS", "NON PASS"] as const;

/** 모달 상단: 한국사 / 탐구 / 기타 */
const extraInquiryModalEntries = [
  { panel: "history" as const, label: "한국사" },
  { panel: "inquiry" as const, label: "탐구" },
  { panel: "other" as const, label: "기타" }
] as const;



/** 수능 기준 사회탐구 선택 과목 (세부 과목명으로 저장) */

const socialInquirySubjectLabels = [

  "생활과 윤리",

  "윤리와 사상",

  "한국지리",

  "세계지리",

  "동아시아사",

  "세계사",

  "경제",

  "정치와 법",

  "사회·문화"

] as const;

const integratedSocialSubjectLabels = ["통합사회"] as const;



/** 수능 기준 과학탐구 선택 과목 (전체평균 탐구 반영용) */

const scienceInquirySubjectLabels = [

  "물리학Ⅰ",

  "화학Ⅰ",

  "지구과학Ⅰ",

  "생명과학Ⅰ",

  "물리학Ⅱ",

  "화학Ⅱ",

  "지구과학Ⅱ",

  "생명과학Ⅱ"

] as const;

const integratedScienceSubjectLabels = ["통합과학"] as const;



/** 제2외국어 선택 과목 */
const secondForeignSubjectLabels = [

  "독일어Ⅰ",

  "프랑스어Ⅰ",

  "스페인어Ⅰ",

  "중국어Ⅰ",

  "일본어Ⅰ",

  "러시아어Ⅰ",

  "베트남어Ⅰ",

  "아랍어Ⅰ",
  "한문Ⅰ"

] as const;

const historySubjectLabels = ["한국사"] as const;
const groupedInquirySubjectLabels = ["사탐", "과탐"] as const;
const otherSubjectLabels = [...secondForeignSubjectLabels, "한문Ⅰ", "정보"] as const;
const firstYearOtherSubjectLabels = ["한문Ⅰ", "정보"] as const;

type ExtraInquiryPanel = "history" | "inquiry" | "other";
type InquiryPickMode = "social" | "science";
type OtherPickMode = "foreign" | "elective";

const electiveSubjectLabels = [
  "정보",
  "진로와 직업",
  "환경",
  "보건",
  "기술과 가정",
  "실용경제",
  "철학",
  "심리학",
  "논술",
  "인공지능 기초",
  "창의융합"
] as const;

function labelsForExtraInquiryPanel(
  panel: ExtraInquiryPanel,
  year: GradeYear,
  inquiryPickMode: InquiryPickMode,
  otherPickMode: OtherPickMode
): readonly string[] {
  if (panel === "history") {
    return historySubjectLabels;
  }
  if (panel === "inquiry") {
    if (inquiryPickMode === "social") {
      return year === "1" ? integratedSocialSubjectLabels : socialInquirySubjectLabels;
    }
    return year === "1" ? integratedScienceSubjectLabels : scienceInquirySubjectLabels;
  }
  if (otherPickMode === "foreign") {
    return secondForeignSubjectLabels;
  }
  return electiveSubjectLabels;
}

function isOneOfLabels(value: string, labels: readonly string[]): boolean {
  return labels.some((label) => label === value);
}

function isPassFailSubject(subject: string) {
  return isOneOfLabels(subject.trim(), passFailSubjectLabels);
}



function getInquiryAverageScoreForAverage(subjects: SubjectScoreEntry[]): string {

  const inquiryScores = subjects
    .filter((entry) => {
      const name = entry.subject.trim();
      return (
        isOneOfLabels(name, socialInquirySubjectLabels) ||
        isOneOfLabels(name, scienceInquirySubjectLabels) ||
        isOneOfLabels(name, integratedSocialSubjectLabels) ||
        isOneOfLabels(name, integratedScienceSubjectLabels)
      );
    })
    .map((entry) => parseNumericScore(entry.score))
    .filter((value): value is number => value !== null);

  if (inquiryScores.length > 0) {
    return formatAverageValue(inquiryScores.reduce((sum, value) => sum + value, 0) / inquiryScores.length);
  }

  const legacyScores = ["사탐", "과탐"]
    .map((legacyName) => parseNumericScore(subjects.find((entry) => entry.subject.trim() === legacyName)?.score?.trim() ?? ""))
    .filter((value): value is number => value !== null);

  if (legacyScores.length === 0) {
    return "";
  }

  return formatAverageValue(legacyScores.reduce((sum, value) => sum + value, 0) / legacyScores.length);

}

function formatCustomSubjectLabel(subject: string): string {
  const trimmed = subject.trim();
  if (isOneOfLabels(trimmed, socialInquirySubjectLabels)) {
    return `사탐(${trimmed})`;
  }
  if (trimmed === "사탐") {
    return "사탐";
  }
  if (isOneOfLabels(trimmed, integratedSocialSubjectLabels)) {
    return trimmed;
  }
  if (isOneOfLabels(trimmed, scienceInquirySubjectLabels)) {
    return `과탐(${trimmed})`;
  }
  if (trimmed === "과탐") {
    return "과탐";
  }
  if (isOneOfLabels(trimmed, integratedScienceSubjectLabels)) {
    return trimmed;
  }
  if (isOneOfLabels(trimmed, secondForeignSubjectLabels)) {
    return `제2외국어(${trimmed})`;
  }
  return trimmed;
}



function parseNumericScore(value: string) {

  const trimmed = value.trim();

  if (!trimmed) {

    return null;

  }

  const numeric = Number(trimmed);

  return Number.isFinite(numeric) ? numeric : null;

}



function formatAverageValue(value: number) {

  return value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");

}

function splitInquiryCustomSubjects(entries: SubjectScoreEntry[]) {
  const social: SubjectScoreEntry[] = [];
  const science: SubjectScoreEntry[] = [];
  const other: SubjectScoreEntry[] = [];
  for (const entry of entries) {
    const name = entry.subject.trim();
    if (name === "사탐" || isOneOfLabels(name, socialInquirySubjectLabels) || isOneOfLabels(name, integratedSocialSubjectLabels)) {
      social.push(entry);
    } else if (name === "과탐" || isOneOfLabels(name, scienceInquirySubjectLabels) || isOneOfLabels(name, integratedScienceSubjectLabels)) {
      science.push(entry);
    } else {
      other.push(entry);
    }
  }
  return { social, science, other };
}

function buildSavedGradeRows(subjects: SubjectScoreEntry[]) {
  const rows: Array<{ name: string; grade: string }> = [];
  for (const subjectName of coreAverageSubjects) {
    const entry = subjects.find((item) => item.subject.trim() === subjectName && !item.isCustom);
    const grade = entry?.score.trim() ?? "";
    if (grade) {
      rows.push({ name: subjectName, grade });
    }
  }
  const customs = subjects.filter((item) => item.isCustom && item.subject.trim());
  const { social, science, other } = splitInquiryCustomSubjects(customs);
  for (const entry of social) {
    const grade = entry.score.trim();
    if (grade) {
      rows.push({ name: entry.subject.trim(), grade });
    }
  }
  for (const entry of science) {
    const grade = entry.score.trim();
    if (grade) {
      rows.push({ name: entry.subject.trim(), grade });
    }
  }
  for (const entry of other) {
    const grade = entry.score.trim();
    if (grade) {
      rows.push({ name: formatCustomSubjectLabel(entry.subject), grade });
    }
  }
  return rows;
}

function hasSavedGradeContent(record: GradePeriodRecord) {
  if (record.overallAverage.trim()) {
    return true;
  }
  return record.subjects.some((entry) => entry.score.trim().length > 0);
}

function buildSavedSummaryFromRecord(tabKey: "schoolRecord" | "mockExam", record: GradePeriodRecord) {
  const tabLabel = scoreTabOptions.find((item) => item.key === tabKey)?.label ?? tabKey;
  const yearLabel = gradeYearOptions.find((item) => item.value === record.year)?.label ?? record.year;
  const termLabel =
    getGradeTermOptionsByTab(tabKey, record.year).find((item) => item.value === record.term)?.label ??
    gradeTermOptions.find((item) => item.value === record.term)?.label ??
    record.term;
  return {
    periodKey: `${tabKey}:${record.year}:${record.term}`,
    tabKey,
    year: record.year,
    term: record.term,
    tabLabel,
    periodCaption: `${yearLabel} · ${termLabel}`,
    rows: buildSavedGradeRows(record.subjects),
    overall: record.overallAverage.trim() || "—",
    updatedAt: record.updatedAt
  };
}

/** 과목 추가 모달: 탐구·제2외국어 등 추가 과목 그룹별 등급 평균 숫자 부분만 (표시용) */
function getCustomSubjectGroupAverageGradeValue(
  subjects: SubjectScoreEntry[],
  subjectLabels: readonly string[]
): string | null {
  const nums = subjects
    .filter((entry) => entry.isCustom && isOneOfLabels(entry.subject.trim(), subjectLabels))
    .map((entry) => parseNumericScore(entry.score.trim()))
    .filter((n): n is number => n !== null && n >= 1 && n <= 9);
  if (nums.length === 0) {
    return null;
  }
  const avg = nums.reduce((sum, n) => sum + n, 0) / nums.length;
  return formatAverageValue(avg);
}

function isScoreTabKey(value: string | null): value is ScoreTabKey {

  return scoreTabOptions.some((item) => item.key === value);

}



function isGradeYear(value: string | null): value is GradeYear {

  return gradeYearOptions.some((item) => item.value === value);

}



function isGradeTerm(value: string | null): value is GradeTerm {

  return gradeTermOptions.some((item) => item.value === value);

}



function splitSchoolTerm(term: GradeTerm): { semester: "1" | "2"; exam: "midterm" | "final" } {

  if (term === "2-midterm") return { semester: "2", exam: "midterm" };

  if (term === "2-final") return { semester: "2", exam: "final" };

  if (term === "1-final") return { semester: "1", exam: "final" };

  return { semester: "1", exam: "midterm" };

}



function buildSchoolTerm(semester: "1" | "2", exam: "midterm" | "final"): GradeTerm {

  return `${semester}-${exam}` as GradeTerm;

}



function inferMockMonth(term: GradeTerm): string {

  const raw = String(term);

  if (raw.startsWith("mock-csat-")) return raw.replace("mock-csat-", "");

  if (raw.startsWith("mock-nat-")) return raw.replace("mock-nat-", "");

  return "3";

}



function buildFixedSubjectSlots(subjects: SubjectScoreEntry[]) {

  const subjectMap = new Map(

    subjects

      .filter((entry) => !entry.isCustom)

      .map((entry) => [entry.subject.trim(), entry] as const)

  );

  return fixedScoreLabels.map((label) => ({

    label,

    entry: subjectMap.get(label) ?? null

  }));

}



function SelectChevron({ variant = "inset" }: { variant?: "inset" | "flush" }) {

  const positionClass = variant === "flush" ? "right-0" : "right-4";

  return (

    <span
      className={`pointer-events-none absolute ${positionClass} top-1/2 -translate-y-1/2 text-muted`}
      aria-hidden="true"
    >

      <svg viewBox="0 0 12 8" width="12" height="8" fill="none">

        <path d="M1.5 1.5L6 6L10.5 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />

      </svg>

    </span>

  );

}

type TopFilterDropdownOption = {
  value: string;
  label: string;
};

function TopFilterDropdown({
  ariaLabel,
  value,
  options,
  onChange,
  placeholder
}: {
  ariaLabel: string;
  value: string;
  options: TopFilterDropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedLabel = value ? options.find((item) => item.value === value)?.label ?? options[0]?.label ?? "" : placeholder ?? "";

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative z-20 h-fit w-full self-start">
      <div className="relative w-full">
        <button
          type="button"
          aria-label={ariaLabel}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className={`relative z-0 w-full whitespace-nowrap rounded-full border bg-white px-3 py-3 pr-10 text-left text-sm font-normal text-muted ${open ? "border-navy" : "border-line"}`}
        >
          {selectedLabel}
        </button>
        <SelectChevron />
      </div>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-0 overflow-hidden rounded-none border border-[#707070] bg-white shadow-none">
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex h-10 w-full items-center px-4 text-left text-sm font-normal leading-none ${
                  selected ? "bg-[#2A69C7] text-white" : "bg-white text-muted hover:bg-mist"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ModalInquirySubjectGroupBlock({
  entries,
  averageValue,
  averageLeadingText,
  selectedTab,
  selectedYear,
  selectedTerm,
  updateSubjectScore,
  onDeleteSubject
}: {
  entries: SubjectScoreEntry[];
  averageValue: string | null;
  averageLeadingText: string;
  selectedTab: ScoreTabKey;
  selectedYear: GradeYear;
  selectedTerm: GradeTerm;
  updateSubjectScore: (
    tab: "schoolRecord" | "mockExam",
    year: GradeYear,
    term: GradeTerm,
    entryId: string,
    value: string
  ) => void;
  onDeleteSubject: (entryId: string) => void;
}) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-center gap-2 rounded-xl border border-white bg-white px-3 py-2.5">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-muted">{entry.subject.trim()}</span>

          <div className="relative w-[7.5rem] min-w-[7.5rem] max-w-[7.5rem] shrink-0">
            <select
              value={entry.score}
              onChange={(event) => {
                if (selectedTab !== "schoolRecord" && selectedTab !== "mockExam") {
                  return;
                }
                updateSubjectScore(selectedTab, selectedYear, selectedTerm, entry.id, event.target.value);
              }}
              aria-label={`${entry.subject.trim()} 성적`}
              className="w-full cursor-pointer appearance-none border-0 border-b-2 border-navy/30 bg-transparent py-1 pl-0 pr-6 text-sm font-semibold leading-none text-muted transition-colors focus:border-navy focus:outline-none"
            >
              {isPassFailSubject(entry.subject) ? (
                <>
                  <option value="">선택</option>
                  {passFailScoreOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </>
              ) : (
                <>
                  <option value="">등급</option>
                  {subjectGradeOptions.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </>
              )}
            </select>
            <SelectChevron variant="flush" />
          </div>

          <button
            type="button"
            onClick={() => onDeleteSubject(entry.id)}
            className="shrink-0 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-muted"
          >
            삭제
          </button>
        </div>
      ))}

      {averageValue && entries.length > 1 ? (
        <div className="mt-2 border-t border-line/80 pt-2">
          <p className="text-center text-sm font-semibold leading-tight text-navy">
            {averageLeadingText}
            <span className="tabular-nums">{averageValue}</span>등급
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function OnboardingGradesPage() {

  const router = useRouter();

  const searchParams = useSearchParams();

  const {

    store,

    currentScoreRecord,

    currentStudentRecord,

    setActiveTab,

    setSelectedPeriod,

    setStudentRecordSelection,

    updateSubjectScore,

    updateOverallAverage,

    addSubject,

    removeSubject,

    removeScoreRecord,

    updateStudentRecordField,

    registerUploads,

    flushStoreToServer

  } = useScoreRecords();



  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const [subjectManageModalOpen, setSubjectManageModalOpen] = useState(false);

  const [savedRecordsModalOpen, setSavedRecordsModalOpen] = useState(false);

  const [savedRecordsFilterYear, setSavedRecordsFilterYear] = useState<"all" | GradeYear>("all");

  const [savedRecordsFilterTab, setSavedRecordsFilterTab] = useState<"all" | "schoolRecord" | "mockExam">("all");

  const [extraInquiryPanelOpen, setExtraInquiryPanelOpen] = useState<ExtraInquiryPanel | null>("history");

  const [extraInquiryPick, setExtraInquiryPick] = useState("");
  const [inquiryPickMode, setInquiryPickMode] = useState<InquiryPickMode>("social");
  const [otherPickMode, setOtherPickMode] = useState<OtherPickMode>("foreign");

  const [gradeSavePending, setGradeSavePending] = useState(false);

  const [savedGradeSummaries, setSavedGradeSummaries] = useState<

    Array<{

      periodKey: string;

      tabKey: ScoreTabKey;

      year: GradeYear;

      term: GradeTerm;

    tabLabel: string;

      /** 예: `1학년 · 1학기 기말`, 모의고사면 `3학년 · 전국연합학력평가 3월` */

      periodCaption: string;

      rows: Array<{ name: string; grade: string }>;

      overall: string;

    }>

  >([]);

  const selectedTab = store.activeTab;

  const selectedYear = store.selectedYear;

  const selectedTerm = store.selectedTerm;

  const selectedSchoolTerm = useMemo(() => splitSchoolTerm(selectedTerm), [selectedTerm]);

  const availableTermOptions = useMemo(
    () => (selectedTab === "studentRecord" ? [] : getGradeTermOptionsByTab(selectedTab, selectedYear)),
    [selectedTab, selectedYear]
  );

  const mockExamSeriesCaption = useMemo(() => {

    if (selectedTab !== "mockExam") {

      return "";

    }

    return getMockExamSeriesCaption(selectedYear, selectedTerm);

  }, [selectedTab, selectedTerm, selectedYear]);

  const filteredSavedGradeSummaries = useMemo(() => {
    return savedGradeSummaries.filter((summary) => {
      if (savedRecordsFilterYear !== "all" && summary.year !== savedRecordsFilterYear) {
        return false;
      }
      if (savedRecordsFilterTab !== "all" && summary.tabKey !== savedRecordsFilterTab) {
        return false;
      }
      return true;
    });
  }, [savedGradeSummaries, savedRecordsFilterYear, savedRecordsFilterTab]);

  useEffect(() => {
    const nextSummaries = [
      ...store.schoolRecords
        .filter((record) => hasSavedGradeContent(record))
        .map((record) => buildSavedSummaryFromRecord("schoolRecord", record)),
      ...store.mockExams.filter((record) => hasSavedGradeContent(record)).map((record) => buildSavedSummaryFromRecord("mockExam", record))
    ].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

    setSavedGradeSummaries(nextSummaries.map(({ updatedAt: _updatedAt, ...summary }) => summary));
  }, [store.schoolRecords, store.mockExams]);

  useEffect(() => {

    const nextTab = searchParams.get("tab");

    const nextYear = searchParams.get("year");

    const nextTerm = searchParams.get("term");



    if (isScoreTabKey(nextTab) && nextTab !== selectedTab) {

      setActiveTab(nextTab);

    }



    if ((isGradeYear(nextYear) && nextYear !== selectedYear) || (isGradeTerm(nextTerm) && nextTerm !== selectedTerm)) {

      setSelectedPeriod(isGradeYear(nextYear) ? nextYear : selectedYear, isGradeTerm(nextTerm) ? nextTerm : selectedTerm);

    }

  }, [searchParams, selectedTab, selectedTerm, selectedYear, setActiveTab, setSelectedPeriod]);



  useEffect(() => {

    if (availableTermOptions.length === 0) {

      return;

    }

    const isCurrentTermAvailable = availableTermOptions.some((item) => item.value === selectedTerm);

    if (!isCurrentTermAvailable) {

      setSelectedPeriod(selectedYear, availableTermOptions[0].value);

    }

  }, [availableTermOptions, selectedTab, selectedTerm, selectedYear, setSelectedPeriod]);



  useEffect(() => {

    setSubjectManageModalOpen(false);

    setExtraInquiryPanelOpen("history");

    setExtraInquiryPick("");
    setInquiryPickMode("social");
    setOtherPickMode("foreign");

  }, [selectedTab, selectedYear, selectedTerm]);



  useEffect(() => {

    if (!subjectManageModalOpen) {

      setExtraInquiryPanelOpen("history");

      setExtraInquiryPick("");
      setInquiryPickMode("social");
      setOtherPickMode("foreign");

    }

  }, [subjectManageModalOpen]);



  useEffect(() => {

    if (selectedTab === "studentRecord" || !currentScoreRecord) {

      return;

    }



    currentScoreRecord.subjects.forEach((entry) => {

      const subject = entry.subject.trim();

      const isLegacyInquiry = subject === "사탐" || subject === "과탐";

      if (entry.isCustom && (subject === "사회" || isLegacyInquiry)) {

        removeSubject(selectedTab, selectedYear, selectedTerm, entry.id);

      }

    });

  }, [currentScoreRecord, removeSubject, selectedTab, selectedTerm, selectedYear]);



  const activeScoreRecord =

    selectedTab === "studentRecord" ? null : currentScoreRecord ?? getScoreRecord(store, selectedTab, selectedYear, selectedTerm);



  const currentUploads = useMemo(() => {
    if (selectedTab === "studentRecord") {
      return store.uploads
        .filter((file) =>
          uploadMatchesStudentSelection(
            file,
            store.selectedStudentAcademicYear,
            store.selectedStudentSemester,
            store.selectedStudentRecordType
          )
        )
        .map((file) => file.name);
    }
    return store.uploads
      .filter((file) => file.sourceTab === selectedTab && file.year === selectedYear && file.term === selectedTerm)
      .map((file) => file.name);
  }, [
    selectedTab,
    selectedTerm,
    selectedYear,
    store.uploads,
    store.selectedStudentAcademicYear,
    store.selectedStudentSemester,
    store.selectedStudentRecordType
  ]);



  const fixedSubjectSlots = useMemo(

    () => buildFixedSubjectSlots(activeScoreRecord?.subjects ?? []),

    [activeScoreRecord?.subjects]

  );



  useEffect(() => {

    if (!activeScoreRecord || selectedTab === "studentRecord") {

      return;

    }



    const inquiryScore = getInquiryAverageScoreForAverage(activeScoreRecord.subjects);

    const values = [...coreAverageSubjects.map((subjectName) => activeScoreRecord.subjects.find((entry) => entry.subject.trim() === subjectName)?.score ?? ""), inquiryScore]

      .map(parseNumericScore)

      .filter((value): value is number => value !== null);



    const nextAverage = values.length === 0 ? "" : formatAverageValue(values.reduce((sum, value) => sum + value, 0) / values.length);

    if (activeScoreRecord.overallAverage !== nextAverage) {

      updateOverallAverage(selectedTab, selectedYear, selectedTerm, nextAverage);

    }

  }, [activeScoreRecord, selectedTab, selectedTerm, selectedYear, updateOverallAverage]);



  const customSubjects = useMemo(

    () => activeScoreRecord?.subjects.filter((entry) => entry.isCustom && entry.subject.trim()) ?? [],

    [activeScoreRecord?.subjects]

  );

  const socialLabelsForSelectedYear = useMemo(
    () => (selectedYear === "1" ? integratedSocialSubjectLabels : socialInquirySubjectLabels),
    [selectedYear]
  );

  const scienceLabelsForSelectedYear = useMemo(
    () => (selectedYear === "1" ? integratedScienceSubjectLabels : scienceInquirySubjectLabels),
    [selectedYear]
  );

  const modalSocialInquiryAverageValue = useMemo(

    () => getCustomSubjectGroupAverageGradeValue(activeScoreRecord?.subjects ?? [], socialLabelsForSelectedYear),

    [activeScoreRecord?.subjects, socialLabelsForSelectedYear]

  );

  const modalScienceInquiryAverageValue = useMemo(

    () => getCustomSubjectGroupAverageGradeValue(activeScoreRecord?.subjects ?? [], scienceLabelsForSelectedYear),

    [activeScoreRecord?.subjects, scienceLabelsForSelectedYear]

  );

  const modalSecondForeignAverageValue = useMemo(

    () => getCustomSubjectGroupAverageGradeValue(activeScoreRecord?.subjects ?? [], secondForeignSubjectLabels),

    [activeScoreRecord?.subjects]

  );

  const modalCustomSocialSubjects = useMemo(

    () => customSubjects.filter((entry) => isOneOfLabels(entry.subject.trim(), socialLabelsForSelectedYear)),

    [customSubjects, socialLabelsForSelectedYear]

  );

  const modalCustomScienceSubjects = useMemo(

    () => customSubjects.filter((entry) => isOneOfLabels(entry.subject.trim(), scienceLabelsForSelectedYear)),

    [customSubjects, scienceLabelsForSelectedYear]

  );

  const modalCustomForeignSubjects = useMemo(

    () => customSubjects.filter((entry) => isOneOfLabels(entry.subject.trim(), secondForeignSubjectLabels)),

    [customSubjects]

  );

  const modalCustomOrphanSubjects = useMemo(

    () =>

      customSubjects.filter((entry) => {

        const t = entry.subject.trim();

        return (
          !isOneOfLabels(t, socialLabelsForSelectedYear) &&

          !isOneOfLabels(t, scienceLabelsForSelectedYear) &&

          !isOneOfLabels(t, secondForeignSubjectLabels)

        );

      }),

    [customSubjects, scienceLabelsForSelectedYear, socialLabelsForSelectedYear]

  );

  const modalInquirySubjectsHaveGrades = useMemo(

    () => customSubjects.some((entry) => entry.score.trim() !== ""),

    [customSubjects]

  );

  const socialInquirySummaryLabel = useMemo(

    () =>

      modalCustomSocialSubjects.length > 0

        ? selectedYear === "1"
          ? modalCustomSocialSubjects.map((entry) => entry.subject.trim()).join("/")
          : `사탐(${modalCustomSocialSubjects.map((entry) => entry.subject.trim()).join("/")})`

        : null,

    [modalCustomSocialSubjects, selectedYear]

  );

  const socialInquirySummaryGrade = useMemo(() => {

    const v = modalSocialInquiryAverageValue;

    if (!v) {
      return "";
    }
    return selectedYear === "1" ? v : `${v}등급`;

  }, [modalSocialInquiryAverageValue, selectedYear]);

  const scienceInquirySummaryLabel = useMemo(

    () =>

      modalCustomScienceSubjects.length > 0

        ? selectedYear === "1"
          ? modalCustomScienceSubjects.map((entry) => entry.subject.trim()).join("/")
          : `과탐(${modalCustomScienceSubjects.map((entry) => entry.subject.trim()).join("/")})`

        : null,

    [modalCustomScienceSubjects, selectedYear]

  );

  const scienceInquirySummaryGrade = useMemo(() => {

    const v = modalScienceInquiryAverageValue;

    if (!v) {
      return "";
    }
    return selectedYear === "1" ? v : `${v}등급`;

  }, [modalScienceInquiryAverageValue, selectedYear]);

  const secondForeignSummaryLabel = useMemo(

    () =>

      modalCustomForeignSubjects.length > 0

        ? `제2외국어(${modalCustomForeignSubjects.map((entry) => entry.subject.trim()).join("/")})`

        : null,

    [modalCustomForeignSubjects]

  );




  const hasGradeInput = useMemo(() => {

    const subjects = activeScoreRecord?.subjects;

    if (!subjects?.length) {

      return false;

    }

    return subjects.some((entry) => entry.score.trim() !== "");

  }, [activeScoreRecord?.subjects]);

  const goalsHref = mergeHrefWithSearchParams("/onboarding/goals", searchParams);

  const basicHref = mergeHrefWithSearchParams("/onboarding/basic", searchParams);



  const handleMoveNext = async (href: string) => {

    await flushStoreToServer();

    safeNavigate(router, href);

  };



  const handleBack = async () => {

    await flushStoreToServer();

    if (typeof window !== "undefined" && window.history.length > 1) {

      router.back();

      return;

    }



    safeNavigate(router, basicHref);

  };



  const handleSaveGrades = async (options?: { closeSubjectModalOnSuccess?: boolean }) => {

    setGradeSavePending(true);

    try {

      await flushStoreToServer();

      if (activeScoreRecord && selectedTab !== "studentRecord") {

        const nextSummary = buildSavedSummaryFromRecord(selectedTab, activeScoreRecord);
        setSavedGradeSummaries((previous) => [nextSummary, ...previous.filter((item) => item.periodKey !== nextSummary.periodKey)]);

      }

      if (options?.closeSubjectModalOnSuccess) {

        setSubjectManageModalOpen(false);

      }

    } catch {

      window.alert("저장에 실패했어요. 네트워크를 확인한 뒤 다시 시도해 주세요.");

    } finally {

      setGradeSavePending(false);

    }

  };



  const handleEditSavedSummary = (summary: {

    tabKey: ScoreTabKey;

    year: GradeYear;

    term: GradeTerm;

  }) => {

    setActiveTab(summary.tabKey);

    setSelectedPeriod(summary.year, summary.term);

    setSavedRecordsModalOpen(false);

    if (summary.tabKey === "schoolRecord" || summary.tabKey === "mockExam") {

      setSubjectManageModalOpen(true);

    }

  };

  const handleDeleteSavedSummary = (summary: {
    tabKey: ScoreTabKey;
    year: GradeYear;
    term: GradeTerm;
  }) => {
    if (summary.tabKey !== "schoolRecord" && summary.tabKey !== "mockExam") {
      return;
    }
    const ok = window.confirm("이 저장 기록을 삭제할까요?");
    if (!ok) {
      return;
    }
    removeScoreRecord(summary.tabKey, summary.year, summary.term);
  };



  const handleConfirmExtraInquirySubject = () => {

    if (

      !extraInquiryPanelOpen ||

      selectedTab === "studentRecord" ||

      (selectedTab !== "schoolRecord" && selectedTab !== "mockExam") ||

      !activeScoreRecord

    ) {

      return;

    }



    const name = extraInquiryPanelOpen === "history" ? "한국사" : extraInquiryPick.trim();

    if (!name) {

      window.alert("과목을 선택해 주세요.");

      return;

    }



    const allowed = labelsForExtraInquiryPanel(extraInquiryPanelOpen, selectedYear, inquiryPickMode, otherPickMode);

    if (!allowed.includes(name)) {

      return;

    }



    if (activeScoreRecord.subjects.some((entry) => entry.subject.trim() === name)) {

      window.alert("이미 추가된 과목이에요.");

      return;

    }



    addSubject(selectedTab, selectedYear, selectedTerm, name);

    setExtraInquiryPick("");

  };



  const handleDeleteSubjectById = (entryId: string) => {

    if (selectedTab === "studentRecord") {

      return;

    }

    removeSubject(selectedTab, selectedYear, selectedTerm, entryId);

  };



  const uploadButtonTitle = selectedTab === "studentRecord" ? "PDF / 사진 생기부·활동 자료 업로드" : "PDF / 사진 성적 업로드";
  const uploadModalTitle = selectedTab === "studentRecord" ? "생기부·활동 자료 업로드" : "PDF / 사진 성적 업로드";

  const uploadDescription =

    selectedTab === "studentRecord"

      ? "생기부, 활동증빙, 특기자료를 올리면 선택한 학년도·학기·기록유형과 함께 저장됩니다."

      : "내신과 모의고사 성적표를 올리면 OCR 파이프라인으로 이어집니다.";



  return (

    <>

    <PhoneFrame

      title="성적을 입력해 주세요"

      subtitle="성적 정보는 자세히 입력할수록 분석이 정확해요."

      subtitleClassName="text-xs leading-5 whitespace-nowrap"

      topSlot={

        <>

          <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-200">

            <div className="h-full w-[66%] rounded-full bg-navy" />

          </div>

          <div className="mb-4 text-xs leading-5 text-muted">2/3 단계</div>

        </>

      }

    >

      <div className="grid grid-cols-3 gap-2">

        {scoreTabOptions.map((tab) => (

          <button

            key={tab.key}

            type="button"

            onClick={() => setActiveTab(tab.key)}

            className={`rounded-full border px-3 py-3 text-sm font-semibold ${

              selectedTab === tab.key ? "border-navy bg-navy text-white" : "border-line bg-white"

            }`}

          >

            {tab.label}

          </button>

        ))}

      </div>



      <div className="mt-4 grid grid-cols-3 gap-3">

        {selectedTab === "studentRecord" ? (
          <>
            <TopFilterDropdown
              ariaLabel="학년도"
              value={String(store.selectedStudentAcademicYear)}
              options={academicYearSelectOptions}
              onChange={(nextValue) => {
                const n = Number.parseInt(nextValue, 10);
                if (Number.isFinite(n)) {
                  setStudentRecordSelection({ academicYear: n as StudentRecordAcademicYear });
                }
              }}
            />
            <TopFilterDropdown
              ariaLabel="학기 구분"
              value={String(store.selectedStudentSemester)}
              options={studentSemesterTabOptions}
              onChange={(nextValue) => {
                setStudentRecordSelection({ semester: nextValue === "2" ? 2 : 1 });
              }}
            />
            <TopFilterDropdown
              ariaLabel="기록유형"
              value={store.selectedStudentRecordType}
              options={studentRecordTypeTabOptions}
              onChange={(nextValue) => {
                setStudentRecordSelection({ recordType: nextValue as StudentRecordType });
              }}
            />
          </>
        ) : (
          <>
            <TopFilterDropdown
              ariaLabel="학년 구분"
              value={selectedYear}
              options={gradeYearOptions.map((item) => ({ value: item.value, label: item.label }))}
              onChange={(nextValue) => {
                const nextYear = nextValue as GradeYear;
                if (selectedTab === "mockExam") {
                  const nextTermOptions = getGradeTermOptionsByTab("mockExam", nextYear);
                  const nextTerm = nextTermOptions.some((item) => item.value === selectedTerm)
                    ? selectedTerm
                    : nextTermOptions[0].value;
                  setSelectedPeriod(nextYear, nextTerm);
                  return;
                }
                const nextTermOptions = getGradeTermOptionsByTab(selectedTab, nextYear);
                const nextTerm = nextTermOptions.some((item) => item.value === selectedTerm) ? selectedTerm : nextTermOptions[0].value;
                setSelectedPeriod(nextYear, nextTerm);
              }}
            />

        {selectedTab === "schoolRecord" ? (

          <>

            <TopFilterDropdown
              ariaLabel="학기 구분"
              value={selectedSchoolTerm.semester}
              options={[
                { value: "1", label: "1학기" },
                { value: "2", label: "2학기" }
              ]}
              onChange={(nextValue) => {
                const semester = nextValue === "2" ? "2" : "1";
                setSelectedPeriod(selectedYear, buildSchoolTerm(semester, selectedSchoolTerm.exam));
              }}
            />

            <TopFilterDropdown
              ariaLabel="중간 또는 기말"
              value={selectedSchoolTerm.exam}
              options={[
                { value: "midterm", label: "중간" },
                { value: "final", label: "기말" }
              ]}
              onChange={(nextValue) => {
                const exam = nextValue === "final" ? "final" : "midterm";
                setSelectedPeriod(selectedYear, buildSchoolTerm(selectedSchoolTerm.semester, exam));
              }}
            />

          </>

        ) : null}

        {selectedTab === "mockExam" ? (

          <>

            <div className="min-w-0 self-start">

              <TopFilterDropdown
                ariaLabel="모의고사 시기 선택"
                value={selectedTerm}
                options={availableTermOptions.map((item) => ({
                  value: item.value,
                  label:
                    item.value === "mock-nat-11" && selectedYear === "3" ? "수능(11월)" : `${inferMockMonth(item.value)}월`
                }))}
                onChange={(nextValue) => setSelectedPeriod(selectedYear, nextValue as GradeTerm)}
              />

            </div>

            {mockExamSeriesCaption ? (

              <div className="flex min-w-0 items-center justify-center self-center">

                <p

                  className="rounded-full border border-navy/25 bg-[#F4F7FB] px-2.5 py-1.5 text-center text-[11px] font-semibold leading-snug text-navy"

                  title={availableTermOptions.find((item) => item.value === selectedTerm)?.label}

                >

                  {mockExamSeriesCaption}

                </p>

              </div>

            ) : null}

          </>

        ) : null}

          </>
        )}

      </div>



      <section className="mt-4 rounded-[24px] bg-[#EBEBEB] p-4">

        {selectedTab === "studentRecord" ? (

          <div className="space-y-3">

            <label className="space-y-2">

              <span className="text-sm text-muted">활동 제목</span>

              <input

                className="w-full rounded-xl border border-white bg-white px-4 py-3"

                placeholder="예: 동아리 프로젝트 / 탐구 활동"

                value={currentStudentRecord.title}

                onChange={(event) => updateStudentRecordField("title", event.target.value)}

              />

            </label>

            <label className="space-y-2">

              <span className="text-sm text-muted">특기 / 생기부 메모</span>

              <textarea

                className="min-h-[128px] w-full rounded-xl border border-white bg-white px-4 py-3"

                placeholder="학년/학기별 활동 내용, 교내 수상, 프로젝트 메모를 입력해 주세요."

                value={currentStudentRecord.description}

                onChange={(event) => updateStudentRecordField("description", event.target.value)}

              />

            </label>

            <div className="rounded-2xl bg-white px-4 py-4 text-sm leading-6 text-muted">

              생기부와 활동 자료는 선택한 학년도·학기·기록유형에 즉시 저장되고 목표설정과 AI 분석에도 함께 반영됩니다.

            </div>

          </div>

        ) : (

          <div className="grid grid-cols-2 gap-3">

            {fixedSubjectSlots.slice(0, fixedHeadCount).map(({ label, entry }) => (

              <label key={label} className="relative space-y-2">

                <span className="text-sm text-muted">{label}</span>

                <div className="relative">

                  <select

                    value={entry?.score ?? ""}

                    onChange={(event) => {

                      if (!entry) return;

                      updateSubjectScore(selectedTab, selectedYear, selectedTerm, entry.id, event.target.value);

                    }}

                    className="w-full appearance-none rounded-xl border border-white bg-white px-4 py-3 pr-10 text-sm text-muted"

                  >

                    {isPassFailSubject(label) ? (
                      <>
                        <option value="">선택</option>
                        {passFailScoreOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </>
                    ) : (
                      <>
                        <option value="">등급 선택</option>

                        {subjectGradeOptions.map((grade) => (

                          <option key={grade} value={grade}>

                            {grade}

                          </option>

                        ))}
                      </>
                    )}

                  </select>

                  <SelectChevron />

                </div>

              </label>

            ))}

            {fixedSubjectSlots.slice(fixedHeadCount).map(({ label, entry }) => (

              <label key={label} className="relative space-y-2">

                <span className="text-sm text-muted">{label}</span>

                <div className="relative">

                  <select

                    value={entry?.score ?? ""}

                    onChange={(event) => {

                      if (!entry) return;

                      updateSubjectScore(selectedTab, selectedYear, selectedTerm, entry.id, event.target.value);

                    }}

                    className="w-full appearance-none rounded-xl border border-white bg-white px-4 py-3 pr-10 text-sm text-muted"

                  >

                    {isPassFailSubject(label) ? (
                      <>
                        <option value="">선택</option>
                        {passFailScoreOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </>
                    ) : (
                      <>
                        <option value="">등급 선택</option>

                        {subjectGradeOptions.map((grade) => (

                          <option key={grade} value={grade}>

                            {grade}

                          </option>

                        ))}
                      </>
                    )}

                  </select>

                  <SelectChevron />

                </div>

              </label>

            ))}



            {socialInquirySummaryLabel ? (

              <label className="space-y-2">

                <span className="text-sm text-muted">{socialInquirySummaryLabel}</span>

                <input

                  type="text"

                  readOnly

                  value={socialInquirySummaryGrade}

                  placeholder="자동 계산"

                  className="w-full rounded-xl border border-white bg-white px-4 py-3 text-sm text-muted placeholder:text-muted"

                />

              </label>

            ) : null}

            {scienceInquirySummaryLabel ? (

              <label className="space-y-2">

                <span className="text-sm text-muted">{scienceInquirySummaryLabel}</span>

                <input

                  type="text"

                  readOnly

                  value={scienceInquirySummaryGrade}

                  placeholder="자동 계산"

                  className="w-full rounded-xl border border-white bg-white px-4 py-3 text-sm text-muted placeholder:text-muted"

                />

              </label>

            ) : null}

            {modalCustomForeignSubjects.map((entry) => (

              <label key={entry.id} className="relative space-y-2">

                <span className="text-sm text-muted">{formatCustomSubjectLabel(entry.subject)}</span>

                <div className="relative">

                  <select

                    value={entry.score}

                    onChange={(event) => updateSubjectScore(selectedTab, selectedYear, selectedTerm, entry.id, event.target.value)}

                    className="w-full appearance-none rounded-xl border border-white bg-white px-4 py-3 pr-10 text-sm text-muted"

                  >

                    {isPassFailSubject(entry.subject) ? (
                      <>
                        <option value="">선택</option>
                        {passFailScoreOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </>
                    ) : (
                      <>
                        <option value="">등급 선택</option>

                        {subjectGradeOptions.map((grade) => (

                          <option key={grade} value={grade}>

                            {grade}

                          </option>

                        ))}
                      </>
                    )}

                  </select>

                  <SelectChevron />

                </div>

              </label>

            ))}

            {modalCustomOrphanSubjects.map((entry) => (

              <label key={entry.id} className="relative space-y-2">

                <span className="text-sm text-muted">{formatCustomSubjectLabel(entry.subject)}</span>

                <div className="relative">

                  <select

                    value={entry.score}

                    onChange={(event) => updateSubjectScore(selectedTab, selectedYear, selectedTerm, entry.id, event.target.value)}

                    className="w-full appearance-none rounded-xl border border-white bg-white px-4 py-3 pr-10 text-sm text-muted"

                  >

                    {isPassFailSubject(entry.subject) ? (
                      <>
                        <option value="">선택</option>
                        {passFailScoreOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </>
                    ) : (
                      <>
                        <option value="">등급 선택</option>

                        {subjectGradeOptions.map((grade) => (

                          <option key={grade} value={grade}>

                            {grade}

                          </option>

                        ))}
                      </>
                    )}

                  </select>

                  <SelectChevron />

                </div>

              </label>

            ))}



            <label className="space-y-2">

              <span className="text-sm text-muted">전체평균</span>

              <input

                type="text"

                inputMode="decimal"

                value={activeScoreRecord?.overallAverage ?? ""}

                readOnly

                placeholder="자동 계산"

                className="w-full rounded-xl border border-white bg-white px-4 py-3 text-sm text-muted placeholder:text-muted"

              />

            </label>



            <div className="col-span-2 min-w-0 w-full space-y-2">

              <button

                type="button"

                onClick={() => setSubjectManageModalOpen(true)}

                className="w-full rounded-xl border border-white bg-white px-4 py-3 text-center text-sm font-normal text-muted"

              >

                과목 추가 / 삭제

              </button>

              <button

                type="button"

                disabled={gradeSavePending}

                onClick={() => void handleSaveGrades()}

                className={

                  hasGradeInput

                    ? onboardingPrimaryCtaClass

                    : "box-border flex w-full min-w-0 items-center justify-center rounded-xl border border-white bg-white px-4 py-3 text-sm font-normal text-muted disabled:opacity-100"

                }

              >

                {gradeSavePending ? "저장 중..." : "성적 저장하기"}

              </button>

              {savedGradeSummaries.length > 0 ? (

                <button

                  type="button"

                  onClick={() => setSavedRecordsModalOpen(true)}

                  className="w-full rounded-xl border border-white bg-white px-4 py-3 text-center text-sm font-normal text-muted"

                >

                  저장된 성적 보기

                </button>

              ) : null}

            </div>

          </div>

        )}

      </section>

      <p className="mt-2 text-xs leading-5 text-muted">

        {"홈 > 설정 > 성적 정보에서 더 자세한 점수를 입력할 수 있어요."}

      </p>

      <button

        type="button"

        onClick={() => setUploadModalOpen(true)}

        className="mt-3 box-border flex w-full min-w-0 items-center justify-center rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium text-muted"

      >

        + {uploadButtonTitle}

      </button>



      <div className="mt-6 space-y-3">

        <button type="button" onClick={() => void handleMoveNext(goalsHref)} className={onboardingPrimaryCtaClass}>

          3단계 목표 대학 / 학과 설정 →

        </button>

        <button type="button" onClick={() => void handleBack()} className="block w-full text-center text-sm text-muted">

          뒤로가기

        </button>

      </div>

    </PhoneFrame>



    {uploadModalOpen ? (

      <div

        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 py-6"

        role="presentation"

        onClick={() => setUploadModalOpen(false)}

      >

        <div

          className="relative w-full max-w-[340px] rounded-[24px] bg-white p-1 pt-3 shadow-soft"

          role="dialog"

          aria-modal="true"

          aria-label="파일 업로드"

          onClick={(event) => event.stopPropagation()}

        >

          <button

            type="button"

            className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full text-lg leading-none text-muted hover:bg-mist"

            aria-label="닫기"

            onClick={() => setUploadModalOpen(false)}

          >

            ×

          </button>

          <UploadDropzone

            title={uploadModalTitle}

            description={uploadDescription}

            buttonLabel="파일 선택"

            initialFiles={currentUploads}

            onFilesSelected={(files) => {

              registerUploads(files, selectedTab, selectedYear, selectedTerm);

            }}

          />

        </div>

      </div>

    ) : null}

    {savedRecordsModalOpen ? (
      <div
        className="fixed inset-0 z-[81] flex items-center justify-center bg-black/45 px-4 py-6"
        role="presentation"
        onClick={() => setSavedRecordsModalOpen(false)}
      >
        <div
          className="relative flex max-h-[88vh] w-full max-w-[340px] flex-col overflow-hidden rounded-[24px] bg-white shadow-soft"
          role="dialog"
          aria-modal="true"
          aria-label="저장된 성적 보기"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full text-lg leading-none text-muted hover:bg-mist"
            aria-label="닫기"
            onClick={() => setSavedRecordsModalOpen(false)}
          >
            ×
          </button>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-10 [-webkit-overflow-scrolling:touch]">
            <p className="mb-1 text-base font-semibold text-ink">저장된 성적 보기</p>
            <p className="mb-4 text-sm leading-5 text-muted">학년과 유형을 골라서 모아 볼 수 있어요.</p>
            <p className="mb-1.5 text-[11px] font-semibold text-muted">학년</p>
            <div className="mb-4 grid grid-cols-4 gap-2">
              {[{ value: "all" as const, label: "전체" }, ...gradeYearOptions.map((item) => ({ value: item.value, label: item.label }))].map(
                (item) => (
                <button
                  key={item.value === "all" ? "year-all" : item.value}
                  type="button"
                  onClick={() => setSavedRecordsFilterYear(item.value)}
                  className={`rounded-full border px-2 py-2 text-center text-[11px] font-semibold leading-tight ${
                    savedRecordsFilterYear === item.value ? "border-navy bg-navy text-white" : "border-line bg-white text-muted"
                  }`}
                >
                  {item.label}
                </button>
              )
              )}
            </div>
            <p className="mb-1.5 text-[11px] font-semibold text-muted">유형</p>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {(
                [
                  { value: "all" as const, label: "전체" },
                  { value: "schoolRecord" as const, label: "내신" },
                  { value: "mockExam" as const, label: "모의고사" }
                ] as const
              ).map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSavedRecordsFilterTab(item.value)}
                  className={`rounded-full border px-2 py-2.5 text-sm font-semibold ${
                    savedRecordsFilterTab === item.value ? "border-navy bg-navy text-white" : "border-line bg-white text-muted"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="mb-2 text-[11px] text-muted">
              {filteredSavedGradeSummaries.length}건 표시 · 전체 {savedGradeSummaries.length}건
            </p>
            <div className="space-y-1.5">
              {filteredSavedGradeSummaries.length > 0 ? (
                filteredSavedGradeSummaries.map((summary) => (
                  <div key={summary.periodKey} className="rounded-md border border-line/80 bg-[#FAFAFA] px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold leading-snug text-muted">
                        <span
                          className={`mr-1 inline-block rounded border px-1 py-px text-[10px] font-semibold ${
                            summary.tabKey === "mockExam"
                              ? "border-[#efc7c7] bg-[#F2B5B57A] text-black"
                              : summary.tabKey === "schoolRecord"
                                ? "border-[#bfe3cb] bg-[#E7F5EC] text-black"
                                : "border-line bg-[#EBEBEB] text-muted"
                          }`}
                        >
                          {summary.tabLabel}
                        </span>
                        <span>{summary.periodCaption}</span>
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditSavedSummary(summary)}
                          className="shrink-0 rounded-md border border-line bg-white px-1.5 py-0.5 text-[10px] font-medium text-muted hover:bg-mist"
                        >
                          수정하기
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSavedSummary(summary)}
                          className="shrink-0 rounded-md border border-line bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#C83737] hover:bg-[#FFF4F4]"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 overflow-x-auto pb-1">
                      {summary.rows.length > 0 ? (
                        <div className="flex min-w-max items-center gap-1">
                          {summary.rows.map((row, index) => (
                            <span
                              key={`${summary.periodKey}-${row.name}-${index}`}
                              className="inline-flex max-w-[160px] items-baseline gap-0.5 whitespace-nowrap rounded-md bg-[#EBEBEB] px-1.5 py-0.5 text-[10px] leading-tight"
                            >
                              <span className="truncate text-muted">{row.name}</span>
                              <span className="shrink-0 tabular-nums font-semibold text-muted">{row.grade}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted">입력된 과목 등급 없음</span>
                      )}
                    </div>
                    <div className="mt-1 flex justify-end border-t border-line/80 pt-1">
                      <p className="text-[10px] font-semibold leading-tight text-navy">
                        전체평균 <span className="tabular-nums">{summary.overall}</span>
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-dashed border-line/80 bg-white px-3 py-4 text-center text-sm text-muted">
                  조건에 맞는 저장 기록이 없어요.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    ) : null}

    {subjectManageModalOpen ? (

      <div

        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 py-6"

        role="presentation"

        onClick={() => setSubjectManageModalOpen(false)}

      >

        <div

          className="relative flex max-h-[88vh] w-full max-w-[340px] flex-col overflow-hidden rounded-[24px] bg-white shadow-soft"

          role="dialog"

          aria-modal="true"

          aria-label="과목 추가 및 삭제"

          onClick={(event) => event.stopPropagation()}

        >

          <button

            type="button"

            className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full text-lg leading-none text-muted hover:bg-mist"

            aria-label="닫기"

            onClick={() => setSubjectManageModalOpen(false)}

          >

            ×

          </button>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-10 [-webkit-overflow-scrolling:touch]">

          <p className="mb-1 text-base font-semibold text-ink">과목 추가</p>

          <p className="mb-3 text-sm leading-5 text-muted">추가할 과목을 선택해 주세요.</p>

          <div className="grid grid-cols-3 gap-2">

            {extraInquiryModalEntries.map(({ panel, label }) => {
              const isActive = extraInquiryPanelOpen === panel;

              return (

                <button

                  key={panel}

                  type="button"

                  onClick={() => {

                    setExtraInquiryPanelOpen((cur) => (cur === panel ? null : panel));

                    setExtraInquiryPick("");

                  }}

                  className={`rounded-xl border px-2 py-3 text-center text-sm font-semibold ${

                    isActive ? "border-navy bg-navy text-white" : "border-line bg-white text-muted"

                  }`}

                >

                  {label}

                </button>

              );

            })}

          </div>

          {extraInquiryPanelOpen ? (

            <div className="mt-2 space-y-2 rounded-xl border border-line bg-[#EBEBEB] p-3">

              <label className="relative block space-y-1.5">
                {extraInquiryPanelOpen === "inquiry" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInquiryPickMode("social");
                        setExtraInquiryPick("");
                      }}
                      className={`rounded-lg border px-2 py-2 text-xs font-semibold ${
                        inquiryPickMode === "social" ? "border-navy bg-navy text-white" : "border-line bg-white text-muted"
                      }`}
                    >
                      사회탐구
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInquiryPickMode("science");
                        setExtraInquiryPick("");
                      }}
                      className={`rounded-lg border px-2 py-2 text-xs font-semibold ${
                        inquiryPickMode === "science" ? "border-navy bg-navy text-white" : "border-line bg-white text-muted"
                      }`}
                    >
                      과학탐구
                    </button>
                  </div>
                ) : null}

                {extraInquiryPanelOpen === "other" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOtherPickMode("foreign");
                        setExtraInquiryPick("");
                      }}
                      className={`rounded-lg border px-2 py-2 text-xs font-semibold ${
                        otherPickMode === "foreign" ? "border-navy bg-navy text-white" : "border-line bg-white text-muted"
                      }`}
                    >
                      제2외국어
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOtherPickMode("elective");
                        setExtraInquiryPick("");
                      }}
                      className={`rounded-lg border px-2 py-2 text-xs font-semibold ${
                        otherPickMode === "elective" ? "border-navy bg-navy text-white" : "border-line bg-white text-muted"
                      }`}
                    >
                      선택과목
                    </button>
                  </div>
                ) : null}

                {extraInquiryPanelOpen === "history" ? (
                  <div className="rounded-xl border border-white bg-white px-3 py-2.5 text-sm text-muted">한국사</div>
                ) : (
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-xl border border-white bg-white px-3 py-2.5 pr-9 text-sm text-muted"
                      value={extraInquiryPick}
                      onChange={(event) => setExtraInquiryPick(event.target.value)}
                    >
                      <option value="">과목을 선택하세요</option>
                      {labelsForExtraInquiryPanel(extraInquiryPanelOpen, selectedYear, inquiryPickMode, otherPickMode).map((subjectLabel) => {
                        const taken =
                          activeScoreRecord?.subjects.some((entry) => entry.subject.trim() === subjectLabel) ?? false;

                        return (
                          <option key={subjectLabel} value={subjectLabel} disabled={taken}>
                            {taken ? `${subjectLabel} (추가됨)` : subjectLabel}
                          </option>
                        );
                      })}
                    </select>
                    <SelectChevron />
                  </div>
                )}

              </label>

              <button

                type="button"

                onClick={() => handleConfirmExtraInquirySubject()}

                className="w-full rounded-xl border border-navy bg-white py-2.5 text-sm font-semibold text-navy"

              >

                선택 과목 추가하기

              </button>

            </div>

          ) : null}

          <div className="mt-5 border-t border-line pt-4">

            <p className="mb-2 text-sm font-semibold text-ink">과목 정보</p>

            {customSubjects.length === 0 ? (

              <div className="rounded-xl border border-white bg-white px-3 py-3 text-sm text-muted">추가된 과목 정보가 아직 없어요.</div>

            ) : (

              <>

                <div className="space-y-5">

                  <ModalInquirySubjectGroupBlock

                    entries={modalCustomSocialSubjects}

                    averageValue={modalSocialInquiryAverageValue}

                    averageLeadingText={socialInquirySummaryLabel ? `${socialInquirySummaryLabel} ` : ""}

                    selectedTab={selectedTab}

                    selectedYear={selectedYear}

                    selectedTerm={selectedTerm}

                    updateSubjectScore={updateSubjectScore}

                    onDeleteSubject={handleDeleteSubjectById}

                  />

                  <ModalInquirySubjectGroupBlock

                    entries={modalCustomScienceSubjects}

                    averageValue={modalScienceInquiryAverageValue}

                    averageLeadingText={scienceInquirySummaryLabel ? `${scienceInquirySummaryLabel} ` : ""}

                    selectedTab={selectedTab}

                    selectedYear={selectedYear}

                    selectedTerm={selectedTerm}

                    updateSubjectScore={updateSubjectScore}

                    onDeleteSubject={handleDeleteSubjectById}

                  />

                  <ModalInquirySubjectGroupBlock

                    entries={modalCustomForeignSubjects}

                    averageValue={modalSecondForeignAverageValue}

                    averageLeadingText={secondForeignSummaryLabel ? `${secondForeignSummaryLabel} ` : ""}

                    selectedTab={selectedTab}

                    selectedYear={selectedYear}

                    selectedTerm={selectedTerm}

                    updateSubjectScore={updateSubjectScore}

                    onDeleteSubject={handleDeleteSubjectById}

                  />

                  {modalCustomOrphanSubjects.length > 0 ? (

                    <ModalInquirySubjectGroupBlock

                      entries={modalCustomOrphanSubjects}

                      averageValue={null}

                      averageLeadingText=""

                      selectedTab={selectedTab}

                      selectedYear={selectedYear}

                      selectedTerm={selectedTerm}

                      updateSubjectScore={updateSubjectScore}

                      onDeleteSubject={handleDeleteSubjectById}

                    />

                  ) : null}

                </div>

                <button

                  type="button"

                  disabled={gradeSavePending}

                  onClick={() => void handleSaveGrades({ closeSubjectModalOnSuccess: true })}

                  className={

                    modalInquirySubjectsHaveGrades

                      ? `${onboardingPrimaryCtaClass} mt-3`

                      : "mt-3 box-border flex w-full min-w-0 items-center justify-center rounded-xl border border-line bg-white px-4 py-3 text-sm font-normal text-muted disabled:opacity-100"

                  }

                >

                  {gradeSavePending ? "저장 중..." : "저장하기"}

                </button>

              </>

            )}

          </div>

          </div>

        </div>

      </div>

    ) : null}

    </>

  );

}

