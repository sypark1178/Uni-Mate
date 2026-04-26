"use client";



import { useEffect, useMemo, useRef, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { PhoneFrame } from "@/components/phone-frame";

import { UploadDropzone } from "@/components/upload-dropzone";

import { mergeHrefWithSearchParams, safeNavigate } from "@/lib/navigation";

import { onboardingPrimaryCtaClass } from "@/lib/onboarding-buttons";

import {

  getScoreRecord,

  getGradeTermOptionsByTab,

  gradeTermOptions,

  gradeYearOptions,

  scoreTabOptions,

  subjectGradeOptions,

  useScoreRecords

} from "@/lib/score-storage";

import type { GradeTerm, GradeYear, ScoreTabKey, SubjectScoreEntry } from "@/lib/types";



const fixedScoreLabels = ["국어", "수학", "영어"] as const;

const fixedHeadCount = Math.max(0, fixedScoreLabels.length - 1);

const coreAverageSubjects = ["국어", "수학", "영어"] as const;

/** 모달 상단: 사회·과학 탐구 + 제2외국어 (표시만 다르고 패널은 social / science / foreign) */

const extraInquiryModalEntries = [

  { panel: "social" as const, label: "사회탐구" },

  { panel: "science" as const, label: "과학탐구" },

  { panel: "foreign" as const, label: "제2외국어" }

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



/** 제2외국어·한문 선택 과목 */

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



type ExtraInquiryPanel = "social" | "science" | "foreign";



function labelsForExtraInquiryPanel(panel: ExtraInquiryPanel): readonly string[] {

  if (panel === "social") {

    return socialInquirySubjectLabels;

  }

  if (panel === "science") {

    return scienceInquirySubjectLabels;

  }

  return secondForeignSubjectLabels;

}



function titleForExtraInquiryPanel(panel: ExtraInquiryPanel): string {

  if (panel === "social") {

    return "사회탐구 과목";

  }

  if (panel === "science") {

    return "과학탐구 과목";

  }

  return "제2외국어·한문";

}



function scoreForFirstMatchingSubject(subjects: SubjectScoreEntry[], labels: readonly string[]): string {

  for (const label of labels) {

    const entry = subjects.find((item) => item.subject.trim() === label);

    const raw = entry?.score?.trim() ?? "";

    if (raw) {

      return raw;

    }

  }

  return "";

}



function getInquiryScoreForAverage(subjects: SubjectScoreEntry[]): string {

  const social = scoreForFirstMatchingSubject(subjects, socialInquirySubjectLabels);

  if (social) {

    return social;

  }

  const legacySocial = subjects.find((entry) => entry.subject.trim() === "사탐")?.score?.trim() ?? "";

  if (legacySocial) {

    return legacySocial;

  }

  const science = scoreForFirstMatchingSubject(subjects, scienceInquirySubjectLabels);

  if (science) {

    return science;

  }

  return subjects.find((entry) => entry.subject.trim() === "과탐")?.score?.trim() ?? "";

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



function buildMockTerm(month: "3" | "6" | "9"): GradeTerm {

  return `mock-nat-${month}` as GradeTerm;

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



function SelectChevron({ active }: { active: boolean }) {

  return (

    <span className={`pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 ${active ? "text-ink" : "text-muted"}`} aria-hidden="true">

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
  onChange
}: {
  ariaLabel: string;
  value: string;
  options: TopFilterDropdownOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedLabel = options.find((item) => item.value === value)?.label ?? options[0]?.label ?? "";

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
    <div ref={rootRef} className="relative z-20">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full rounded-full border bg-white px-4 py-3 pr-10 text-left text-sm font-normal text-ink ${open ? "border-navy" : "border-line"}`}
      >
        {selectedLabel}
      </button>
      <SelectChevron active />
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
                  selected ? "bg-[#2A69C7] text-white" : "bg-white text-ink hover:bg-mist"
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



export default function OnboardingGradesPage() {

  const router = useRouter();

  const searchParams = useSearchParams();

  const {

    store,

    currentScoreRecord,

    currentStudentRecord,

    setActiveTab,

    setSelectedPeriod,

    updateSubjectScore,

    updateOverallAverage,

    addSubject,

    removeSubject,

    updateStudentRecordField,

    registerUploads,

    flushStoreToServer

  } = useScoreRecords();



  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const [subjectManageModalOpen, setSubjectManageModalOpen] = useState(false);

  const [extraInquiryPanelOpen, setExtraInquiryPanelOpen] = useState<ExtraInquiryPanel | null>("social");

  const [extraInquiryPick, setExtraInquiryPick] = useState("");

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

  const [savedSummariesCollapsed, setSavedSummariesCollapsed] = useState(false);



  const selectedTab = store.activeTab;

  const selectedYear = store.selectedYear;

  const selectedTerm = store.selectedTerm;

  const selectedSchoolTerm = useMemo(() => splitSchoolTerm(selectedTerm), [selectedTerm]);

  const selectedMockMonth = useMemo(() => {

    const month = inferMockMonth(selectedTerm);

    return month === "3" || month === "6" || month === "9" ? month : "3";

  }, [selectedTerm]);

  const availableTermOptions = useMemo(() => getGradeTermOptionsByTab(selectedTab, selectedYear), [selectedTab, selectedYear]);



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

    if (selectedTab === "mockExam") {

      return;

    }

    const isCurrentTermAvailable = availableTermOptions.some((item) => item.value === selectedTerm);

    if (!isCurrentTermAvailable) {

      setSelectedPeriod(selectedYear, availableTermOptions[0].value);

    }

  }, [availableTermOptions, selectedTab, selectedTerm, selectedYear, setSelectedPeriod]);



  useEffect(() => {

    setSubjectManageModalOpen(false);

    setExtraInquiryPanelOpen("social");

    setExtraInquiryPick("");

  }, [selectedTab, selectedYear, selectedTerm]);



  useEffect(() => {

    if (!subjectManageModalOpen) {

      setExtraInquiryPanelOpen("social");

      setExtraInquiryPick("");

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



  const currentUploads = useMemo(

    () =>

      store.uploads

        .filter((file) => file.sourceTab === selectedTab && file.year === selectedYear && file.term === selectedTerm)

        .map((file) => file.name),

    [selectedTab, selectedTerm, selectedYear, store.uploads]

  );



  const fixedSubjectSlots = useMemo(

    () => buildFixedSubjectSlots(activeScoreRecord?.subjects ?? []),

    [activeScoreRecord?.subjects]

  );



  useEffect(() => {

    if (!activeScoreRecord || selectedTab === "studentRecord") {

      return;

    }



    const inquiryScore = getInquiryScoreForAverage(activeScoreRecord.subjects);

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



  const handleSaveGrades = async () => {

    setGradeSavePending(true);

    try {

      await flushStoreToServer();

      if (activeScoreRecord && selectedTab !== "studentRecord") {

        const tabLabel = scoreTabOptions.find((item) => item.key === selectedTab)?.label ?? selectedTab;

        const yearLabel = gradeYearOptions.find((item) => item.value === selectedYear)?.label ?? selectedYear;

        const termLabel =

          availableTermOptions.find((item) => item.value === selectedTerm)?.label ??

          gradeTermOptions.find((item) => item.value === selectedTerm)?.label ??

          selectedTerm;

        const periodCaption = `${yearLabel} · ${termLabel}`;

        const periodKey = `${selectedTab}:${selectedYear}:${selectedTerm}`;

        const nextSummary = {

          periodKey,

          tabKey: selectedTab,

          year: selectedYear,

          term: selectedTerm,

          tabLabel,

          periodCaption,

          rows: activeScoreRecord.subjects

            .map((entry) => ({

              name: entry.subject.trim(),

              grade: entry.score.trim()

            }))

            .filter((entry) => entry.name && entry.grade),

          overall: activeScoreRecord.overallAverage.trim() || "—"

        };

        setSavedSummariesCollapsed(false);

        setSavedGradeSummaries((previous) => [nextSummary, ...previous.filter((item) => item.periodKey !== periodKey)].slice(0, 8));

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



    const name = extraInquiryPick.trim();

    if (!name) {

      window.alert("과목을 선택해 주세요.");

      return;

    }



    const allowed = labelsForExtraInquiryPanel(extraInquiryPanelOpen);

    if (!allowed.includes(name)) {

      return;

    }



    if (activeScoreRecord.subjects.some((entry) => entry.subject.trim() === name)) {

      window.alert("이미 추가된 과목이에요.");

      return;

    }



    addSubject(selectedTab, selectedYear, selectedTerm, name);

    setSubjectManageModalOpen(false);

    setExtraInquiryPanelOpen(null);

    setExtraInquiryPick("");

  };



  const handleDeleteSubjectById = (entryId: string) => {

    if (selectedTab === "studentRecord") {

      return;

    }

    removeSubject(selectedTab, selectedYear, selectedTerm, entryId);

  };



  const uploadTitle = selectedTab === "studentRecord" ? "생기부 / 활동 자료 업로드" : "PDF / 사진 성적 업로드";

  const uploadDescription =

    selectedTab === "studentRecord"

      ? "생기부, 활동증빙, 특기자료를 올리면 현재 학년/학기 기록과 함께 저장됩니다."

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



      <div className={`mt-4 grid gap-3 ${selectedTab === "schoolRecord" || selectedTab === "mockExam" ? "grid-cols-3" : "grid-cols-2"}`}>

        <TopFilterDropdown
          ariaLabel="학년 구분"
          value={selectedYear}
          options={gradeYearOptions.map((item) => ({ value: item.value, label: item.label }))}
          onChange={(nextValue) => {
            const nextYear = nextValue as GradeYear;
            if (selectedTab === "mockExam") {
              setSelectedPeriod(nextYear, buildMockTerm(selectedMockMonth));
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

          <TopFilterDropdown
            ariaLabel="모의고사 월 선택"
            value={selectedMockMonth}
            options={[
              { value: "3", label: "3월" },
              { value: "6", label: "6월" },
              { value: "9", label: "9월" }
            ]}
            onChange={(nextValue) => setSelectedPeriod(selectedYear, buildMockTerm(nextValue as "3" | "6" | "9"))}
          />

        ) : null}

        {selectedTab !== "schoolRecord" && selectedTab !== "mockExam" ? (

          <label className="relative z-10 block">

            <select

              className="w-full appearance-none rounded-full border border-line bg-white px-4 py-3 pr-10 text-sm text-ink"

              aria-label="학기 구분"

              value={selectedTerm}

              onChange={(event) => setSelectedPeriod(selectedYear, event.target.value as GradeTerm)}

            >

              {availableTermOptions.map((item) => (

                <option key={item.value} value={item.value}>

                  {item.label}

                </option>

              ))}

            </select>

            <SelectChevron active />

          </label>

        ) : null}

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

                onChange={(event) => updateStudentRecordField(selectedYear, selectedTerm, "title", event.target.value)}

              />

            </label>

            <label className="space-y-2">

              <span className="text-sm text-muted">특기 / 생기부 메모</span>

              <textarea

                className="min-h-[128px] w-full rounded-xl border border-white bg-white px-4 py-3"

                placeholder="학년/학기별 활동 내용, 교내 수상, 프로젝트 메모를 입력해 주세요."

                value={currentStudentRecord.description}

                onChange={(event) => updateStudentRecordField(selectedYear, selectedTerm, "description", event.target.value)}

              />

            </label>

            <div className="rounded-2xl bg-white px-4 py-4 text-sm leading-6 text-muted">

              생기부와 활동 자료는 현재 학년/학기 기록에 즉시 저장되고 목표설정과 AI 분석에도 함께 반영됩니다.

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

                    className={`w-full appearance-none rounded-xl border border-white bg-white px-4 py-3 pr-10 text-sm ${entry?.score ? "text-ink" : "text-muted"}`}

                  >

                    <option value="">등급 선택</option>

                    {subjectGradeOptions.map((grade) => (

                      <option key={grade} value={grade}>

                        {grade}

                      </option>

                    ))}

                  </select>

                  <SelectChevron active={Boolean(entry?.score)} />

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

                    className={`w-full appearance-none rounded-xl border border-white bg-white px-4 py-3 pr-10 text-sm ${entry?.score ? "text-ink" : "text-muted"}`}

                  >

                    <option value="">등급 선택</option>

                    {subjectGradeOptions.map((grade) => (

                      <option key={grade} value={grade}>

                        {grade}

                      </option>

                    ))}

                  </select>

                  <SelectChevron active={Boolean(entry?.score)} />

                </div>

              </label>

            ))}



            {customSubjects.map((entry) => (

              <label key={entry.id} className="relative space-y-2">

                <span className="text-sm text-muted">{entry.subject}</span>

                <div className="relative">

                  <select

                    value={entry.score}

                    onChange={(event) => updateSubjectScore(selectedTab, selectedYear, selectedTerm, entry.id, event.target.value)}

                    className={`w-full appearance-none rounded-xl border border-white bg-white px-4 py-3 pr-10 text-sm ${entry.score ? "text-ink" : "text-muted"}`}

                  >

                    <option value="">등급 선택</option>

                    {subjectGradeOptions.map((grade) => (

                      <option key={grade} value={grade}>

                        {grade}

                      </option>

                    ))}

                  </select>

                  <SelectChevron active={Boolean(entry.score)} />

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

                className="w-full rounded-xl border border-white bg-white px-4 py-3 text-sm text-ink placeholder:text-muted"

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

                <div className="rounded-lg border border-navy/10 bg-white p-2.5">

                  <div className="mb-2 flex items-center justify-between">

                    <p className="text-[11px] font-semibold text-muted">저장된 성적 기록</p>

                    <button

                      type="button"

                      onClick={() => setSavedSummariesCollapsed((prev) => !prev)}

                      className="shrink-0 rounded-md border border-line bg-white px-1.5 py-0.5 text-[10px] font-medium text-muted hover:bg-mist"

                    >

                      {savedSummariesCollapsed ? "펼치기" : "접기"}

                    </button>

                  </div>

                  {!savedSummariesCollapsed ? (

                    <div className="space-y-1.5">

                      {savedGradeSummaries.map((summary) => (

                        <div key={summary.periodKey} className="rounded-md border border-line/80 bg-[#FAFAFA] px-2 py-1.5">

                          <div className="flex items-center justify-between gap-2">

                            <p className="text-[11px] font-semibold leading-snug text-ink">

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

                            <button

                              type="button"

                              onClick={() => handleEditSavedSummary(summary)}

                              className="shrink-0 rounded-md border border-line bg-white px-1.5 py-0.5 text-[10px] font-medium text-muted hover:bg-mist"

                            >

                              수정하기

                            </button>

                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1">

                            {summary.rows.length > 0 ? (

                              summary.rows.map((row, index) => (

                                <span

                                  key={`${summary.periodKey}-${row.name}-${index}`}

                                  className="inline-flex max-w-full items-baseline gap-0.5 whitespace-nowrap rounded-md bg-[#EBEBEB] px-1.5 py-0.5 text-[10px] leading-tight"

                                >

                                  <span className="truncate text-muted">{row.name}</span>

                                  <span className="shrink-0 tabular-nums font-semibold text-ink">{row.grade}</span>

                                </span>

                              ))

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

                      ))}

                    </div>

                  ) : null}

                </div>

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

        className="mt-3 box-border flex w-full min-w-0 items-center justify-center rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink"

      >

        + {uploadTitle}

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

            title={uploadTitle}

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



    {subjectManageModalOpen ? (

      <div

        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 py-6"

        role="presentation"

        onClick={() => setSubjectManageModalOpen(false)}

      >

        <div

          className="relative w-full max-w-[340px] rounded-[24px] bg-white px-4 pb-5 pt-10 shadow-soft"

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

                    isActive ? "border-navy bg-navy text-white" : "border-line bg-white text-ink"

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

                <span className="text-xs font-medium text-muted">{titleForExtraInquiryPanel(extraInquiryPanelOpen)}</span>

                <div className="relative">

                  <select

                    className={`w-full appearance-none rounded-xl border border-white bg-white px-3 py-2.5 pr-9 text-sm ${extraInquiryPick ? "text-ink" : "text-muted"}`}

                    value={extraInquiryPick}

                    onChange={(event) => setExtraInquiryPick(event.target.value)}

                  >

                    <option value="">과목을 선택하세요</option>

                    {labelsForExtraInquiryPanel(extraInquiryPanelOpen).map((subjectLabel) => {

                      const taken =

                        activeScoreRecord?.subjects.some((entry) => entry.subject.trim() === subjectLabel) ?? false;

                      return (

                        <option key={subjectLabel} value={subjectLabel} disabled={taken}>

                          {taken ? `${subjectLabel} (추가됨)` : subjectLabel}

                        </option>

                      );

                    })}

                  </select>

                  <SelectChevron active={Boolean(extraInquiryPick)} />

                </div>

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

            <p className="mb-2 text-sm font-semibold text-ink">과목 삭제</p>

            {customSubjects.length === 0 ? (

              <div className="rounded-xl border border-white bg-white px-3 py-3 text-sm text-muted">삭제할 추가 과목이 아직 없어요.</div>

            ) : (

              <div className="space-y-2">

                {customSubjects.map((entry) => (

                  <div key={entry.id} className="flex items-center justify-between rounded-xl border border-white bg-white px-3 py-2.5">

                    <span className="text-sm text-ink">{entry.subject}</span>

                    <button

                      type="button"

                      onClick={() => handleDeleteSubjectById(entry.id)}

                      className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-muted"

                    >

                      삭제

                    </button>

                  </div>

                ))}

              </div>

            )}

          </div>

        </div>

      </div>

    ) : null}

    </>

  );

}

