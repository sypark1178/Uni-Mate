"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PhoneFrame } from "@/components/phone-frame";
import { UploadDropzone } from "@/components/upload-dropzone";
import { mergeHrefWithSearchParams, safeNavigate } from "@/lib/navigation";
import {
  getScoreRecord,
  getGradeTermOptionsByTab,
  gradeTermOptions,
  gradeYearOptions,
  scoreTabOptions,
  studentRecordAcademicYearOptions,
  studentRecordSemesterOptions,
  studentRecordTypeOptions,
  useScoreRecords
} from "@/lib/score-storage";
import type {
  GradeTerm,
  GradeYear,
  ScoreTabKey,
  StudentRecordAcademicYear,
  StudentRecordSemester,
  StudentRecordType,
  SubjectScoreEntry
} from "@/lib/types";

const fixedScoreLabels = ["국어", "수학", "영어", "사탐", "과탐"] as const;

function parseNumericScore(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatAverageValue(value: number) {
  return value.toFixed(2);
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

type MockExamType = "csat" | "national";

function inferMockExamType(term: GradeTerm): MockExamType {
  return String(term).startsWith("mock-csat-") ? "csat" : "national";
}

function inferMockMonth(term: GradeTerm): string {
  const raw = String(term);
  if (raw.startsWith("mock-csat-")) return raw.replace("mock-csat-", "");
  if (raw.startsWith("mock-nat-")) return raw.replace("mock-nat-", "");
  return "3";
}

function buildMockTerm(examType: MockExamType, month: string): GradeTerm {
  return `${examType === "csat" ? "mock-csat" : "mock-nat"}-${month}` as GradeTerm;
}

function getMockMonthOptions(examType: MockExamType, year: GradeYear): Array<{ value: string; label: string }> {
  if (examType === "csat") {
    if (year !== "3") return [];
    return [
      { value: "6", label: "6월" },
      { value: "9", label: "9월" }
    ];
  }
  if (year === "3") {
    return [
      { value: "3", label: "3월" },
      { value: "4", label: "4월" },
      { value: "7", label: "7월" },
      { value: "10", label: "10월" }
    ];
  }
  return [
    { value: "3", label: "3월" },
    { value: "6", label: "6월" },
    { value: "9", label: "9월" },
    { value: "11", label: "11월" }
  ];
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

function calculateDisplayedSubjectAverage(subjects: SubjectScoreEntry[]) {
  const values = subjects
    .filter((entry) => entry.subject.trim())
    .map((entry) => entry.score)
    .map(parseNumericScore)
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return "";
  }

  return formatAverageValue(values.reduce((sum, value) => sum + value, 0) / values.length);
}

const subjectGradeOptions = ["1", "2", "3", "4", "5"] as const;

export default function OnboardingGradesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAverageCalculatedKeys = useRef(new Set<string>());
  const {
    store,
    currentScoreRecord,
    currentStudentRecord,
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
    flushStoreToServer
  } = useScoreRecords({ useDbSchoolAverage: false, useDbMockAverage: false });

  const selectedTab = store.activeTab;
  const selectedYear = store.selectedYear;
  const selectedTerm = store.selectedTerm;
  const selectedStudentAcademicYear = store.selectedStudentAcademicYear;
  const selectedStudentSemester = store.selectedStudentSemester;
  const selectedStudentRecordType = store.selectedStudentRecordType;
  const selectedSchoolTerm = useMemo(() => splitSchoolTerm(selectedTerm), [selectedTerm]);
  const selectedMockExamType = useMemo(() => inferMockExamType(selectedTerm), [selectedTerm]);
  const selectedMockMonth = useMemo(() => inferMockMonth(selectedTerm), [selectedTerm]);
  const mockMonthOptions = useMemo(() => getMockMonthOptions(selectedMockExamType, selectedYear), [selectedMockExamType, selectedYear]);
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
    if (selectedTab === "studentRecord" || !currentScoreRecord) {
      return;
    }

    currentScoreRecord.subjects.forEach((entry) => {
      const subject = entry.subject.trim();
      if (!subject) {
        return;
      }

      if (!entry.isCustom && subject === "사회") {
        updateSubjectName(selectedTab, selectedYear, selectedTerm, entry.id, "사탐");
      }

      if (entry.isCustom && subject === "사회") {
        removeSubject(selectedTab, selectedYear, selectedTerm, entry.id);
      }
    });
  }, [currentScoreRecord, removeSubject, selectedTab, selectedTerm, selectedYear, updateSubjectName]);

  const activeScoreRecord =
    selectedTab === "studentRecord" ? null : currentScoreRecord ?? getScoreRecord(store, selectedTab, selectedYear, selectedTerm);

  const currentUploads = useMemo(
    () =>
      selectedTab === "studentRecord"
        ? currentStudentRecord.files.map((file) => file.name)
        : store.uploads
            .filter((file) => file.sourceTab === selectedTab && file.year === selectedYear && file.term === selectedTerm)
            .map((file) => file.name),
    [currentStudentRecord.files, selectedTab, selectedTerm, selectedYear, store.uploads]
  );

  const fixedSubjectSlots = useMemo(
    () => buildFixedSubjectSlots(activeScoreRecord?.subjects ?? []),
    [activeScoreRecord?.subjects]
  );

  useEffect(() => {
    if (selectedTab !== "schoolRecord" || !activeScoreRecord) {
      return;
    }

    const recordKey = `${selectedTab}:${selectedYear}:${selectedTerm}`;
    if (initialAverageCalculatedKeys.current.has(recordKey)) {
      return;
    }

    const nextAverage = calculateDisplayedSubjectAverage(activeScoreRecord.subjects);
    if (!nextAverage) {
      return;
    }

    initialAverageCalculatedKeys.current.add(recordKey);
    if (activeScoreRecord.overallAverage !== nextAverage) {
      updateOverallAverage(selectedTab, selectedYear, selectedTerm, nextAverage);
    }
  }, [activeScoreRecord, selectedTab, selectedTerm, selectedYear, updateOverallAverage]);

  const handleSubjectScoreChange = (entry: SubjectScoreEntry, value: string) => {
    if (selectedTab === "studentRecord") return;
    if (!activeScoreRecord) return;
    const nextSubjects = activeScoreRecord.subjects.map((subject) => (subject.id === entry.id ? { ...subject, score: value } : subject));
    updateSubjectScore(selectedTab, selectedYear, selectedTerm, entry.id, value);
    if (selectedTab === "schoolRecord" || selectedTab === "mockExam") {
      updateOverallAverage(selectedTab, selectedYear, selectedTerm, calculateDisplayedSubjectAverage(nextSubjects));
    }
  };

  const customSubjects = useMemo(
    () => activeScoreRecord?.subjects.filter((entry) => entry.isCustom && entry.subject.trim()) ?? [],
    [activeScoreRecord?.subjects]
  );
  const selectedGradeSummary = useMemo(() => {
    if (!activeScoreRecord) return [];
    return activeScoreRecord.subjects
      .filter((entry) => entry.subject.trim() && entry.score.trim())
      .map((entry) => `${entry.subject}: ${entry.score}등급`);
  }, [activeScoreRecord]);
  const displayedSubjectCount = fixedSubjectSlots.length + customSubjects.length;
  const studentRecordPeriodTitle = `${selectedStudentAcademicYear}학년도 / ${selectedStudentSemester}학기 / ${selectedStudentRecordType}`;

  const uploadHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", selectedTab);
    params.set("year", selectedYear);
    params.set("term", selectedTerm);
    const nextQuery = params.toString();
    return nextQuery ? `/onboarding/grades/upload?${nextQuery}` : "/onboarding/grades/upload";
  }, [searchParams, selectedTab, selectedTerm, selectedYear]);

  const goalsHref = mergeHrefWithSearchParams("/onboarding/goals", searchParams);
  const analysisHref = mergeHrefWithSearchParams("/analysis/loading?source=grades", searchParams);
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

  const handleAddSubject = () => {
    if (selectedTab === "studentRecord" || !activeScoreRecord) {
      return;
    }

    const subjectName = window.prompt("추가할 과목명을 입력해 주세요.");
    if (!subjectName || !subjectName.trim()) {
      return;
    }

    const normalized = subjectName.trim();
    if (normalized === "사회") {
      window.alert("사회 과목은 삭제되고 사탐으로 통합되었습니다.");
      return;
    }

    addSubject(selectedTab, selectedYear, selectedTerm, normalized);
  };

  const handleDeleteSubject = () => {
    if (selectedTab === "studentRecord" || !activeScoreRecord || customSubjects.length === 0) {
      window.alert("삭제할 추가 과목이 없습니다.");
      return;
    }

    const subjectName = window.prompt("삭제할 과목명을 입력해 주세요.");
    if (!subjectName || !subjectName.trim()) {
      return;
    }

    const normalized = subjectName.trim();
    const matches = customSubjects.filter((entry) => entry.subject.trim() === normalized);

    if (matches.length === 0) {
      window.alert("입력한 이름의 추가 과목을 찾지 못했습니다.");
      return;
    }

    const matchIds = new Set(matches.map((entry) => entry.id));
    const nextSubjects = activeScoreRecord.subjects.filter((entry) => !matchIds.has(entry.id));

    matches.forEach((entry) => {
      removeSubject(selectedTab, selectedYear, selectedTerm, entry.id);
    });
    updateOverallAverage(selectedTab, selectedYear, selectedTerm, calculateDisplayedSubjectAverage(nextSubjects));
  };

  const uploadTitle = selectedTab === "studentRecord" ? "생기부 / 활동 자료 업로드" : "PDF / 사진 성적 업로드";
  const uploadDescription =
    selectedTab === "studentRecord"
      ? "생기부, 활동증빙, 특기자료를 올리면 현재 학년도/학기/기록유형 기록과 함께 저장됩니다."
      : "내신과 모의고사 성적표를 올리면 OCR 파이프라인으로 이어집니다.";

  return (
    <PhoneFrame title="성적을 입력해 주세요" subtitle="AI가 맞는 전형을 분석하려면 성적 정보가 최대한 자세할수록 좋아요.">
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full w-[66%] rounded-full bg-navy" />
      </div>
      <div className="mb-4 text-sm text-muted">2/3 단계</div>

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
        {selectedTab === "schoolRecord" ? (
          <label className="space-y-2">
            <span className="text-sm text-muted">학년 구분</span>
            <select
              className="w-full rounded-full border border-line bg-white px-4 py-3"
              value={selectedYear}
              onChange={(event) => {
                const nextYear = event.target.value as GradeYear;
                const nextTermOptions = getGradeTermOptionsByTab(selectedTab, nextYear);
                const nextTerm = nextTermOptions.some((item) => item.value === selectedTerm) ? selectedTerm : nextTermOptions[0].value;
                setSelectedPeriod(nextYear, nextTerm);
              }}
            >
              {gradeYearOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {selectedTab === "schoolRecord" ? (
          <>
            <label className="space-y-2">
              <span className="text-sm text-muted">학기 구분</span>
              <select
                className="w-full rounded-full border border-line bg-white px-4 py-3"
                value={selectedSchoolTerm.semester}
                onChange={(event) => {
                  const semester = event.target.value === "2" ? "2" : "1";
                  setSelectedPeriod(selectedYear, buildSchoolTerm(semester, selectedSchoolTerm.exam));
                }}
              >
                <option value="1">1학기</option>
                <option value="2">2학기</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-muted">중간/기말</span>
              <select
                className="w-full rounded-full border border-line bg-white px-4 py-3"
                value={selectedSchoolTerm.exam}
                onChange={(event) => {
                  const exam = event.target.value === "final" ? "final" : "midterm";
                  setSelectedPeriod(selectedYear, buildSchoolTerm(selectedSchoolTerm.semester, exam));
                }}
              >
                <option value="midterm">중간</option>
                <option value="final">기말</option>
              </select>
            </label>
          </>
        ) : null}
        {selectedTab === "mockExam" ? (
          <>
            <label className="space-y-2">
              <span className="text-sm text-muted">시험 구분</span>
              <select
                className="w-full rounded-full border border-line bg-white px-4 py-3"
                value={selectedMockExamType}
                onChange={(event) => {
                  const nextExamType: MockExamType = event.target.value === "csat" ? "csat" : "national";
                  const nextMonthOptions = getMockMonthOptions(nextExamType, selectedYear);
                  if (nextMonthOptions.length === 0) {
                    setSelectedPeriod(selectedYear, buildMockTerm(nextExamType, "6"));
                    return;
                  }
                  const nextMonth = nextMonthOptions.some((item) => item.value === selectedMockMonth)
                    ? selectedMockMonth
                    : nextMonthOptions[0].value;
                  setSelectedPeriod(selectedYear, buildMockTerm(nextExamType, nextMonth));
                }}
              >
                <option value="csat">대학수학능력시험</option>
                <option value="national">전국연합학력평가</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-muted">학년 구분</span>
              <select
                className="w-full rounded-full border border-line bg-white px-4 py-3"
                value={selectedYear}
                onChange={(event) => {
                  const nextYear = event.target.value as GradeYear;
                  const nextMonthOptions = getMockMonthOptions(selectedMockExamType, nextYear);
                  const nextMonth = nextMonthOptions.some((item) => item.value === selectedMockMonth)
                    ? selectedMockMonth
                    : nextMonthOptions[0]?.value ?? "6";
                  setSelectedPeriod(nextYear, buildMockTerm(selectedMockExamType, nextMonth));
                }}
              >
                {gradeYearOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-muted">월도 구분</span>
              <select
                className="w-full rounded-full border border-line bg-white px-4 py-3 disabled:bg-slate-100 disabled:text-muted"
                value={mockMonthOptions.some((item) => item.value === selectedMockMonth) ? selectedMockMonth : ""}
                disabled={mockMonthOptions.length === 0}
                onChange={(event) => setSelectedPeriod(selectedYear, buildMockTerm(selectedMockExamType, event.target.value))}
              >
                {mockMonthOptions.length === 0 ? <option value="">선택 불가</option> : null}
                {mockMonthOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
        {selectedTab === "studentRecord" ? (
          <>
            <label className="space-y-2">
              <span className="text-sm text-muted">학년도</span>
              <select
                className="w-full rounded-full border border-line bg-white px-4 py-3"
                value={selectedStudentAcademicYear}
                onChange={(event) =>
                  setSelectedStudentRecordPeriod(
                    Number(event.target.value) as StudentRecordAcademicYear,
                    selectedStudentSemester,
                    selectedStudentRecordType
                  )
                }
              >
                {studentRecordAcademicYearOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-muted">학기구분</span>
              <select
                className="w-full rounded-full border border-line bg-white px-4 py-3"
                value={selectedStudentSemester}
                onChange={(event) =>
                  setSelectedStudentRecordPeriod(
                    selectedStudentAcademicYear,
                    Number(event.target.value) as StudentRecordSemester,
                    selectedStudentRecordType
                  )
                }
              >
                {studentRecordSemesterOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-muted">기록유형</span>
              <select
                className="w-full rounded-full border border-line bg-white px-4 py-3"
                value={selectedStudentRecordType}
                onChange={(event) =>
                  setSelectedStudentRecordPeriod(
                    selectedStudentAcademicYear,
                    selectedStudentSemester,
                    event.target.value as StudentRecordType
                  )
                }
              >
                {studentRecordTypeOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
      </div>

      <section className="mt-4 rounded-[24px] bg-[#EBEBEB] p-4">
        {selectedTab === "studentRecord" ? (
          <div className="space-y-3">
            <label className="space-y-2">
              <span className="text-sm text-muted">활동 제목</span>
              <input
                className="w-full rounded-xl border border-white bg-white px-4 py-3"
                placeholder="기록내용의 첫 문장을 제목으로 표시합니다."
                value={currentStudentRecord.title}
                readOnly
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-muted">특기/생기부 메모</span>
              <textarea
                className="min-h-[128px] w-full rounded-xl border border-white bg-white px-4 py-3"
                placeholder="학생생활기록부의 기록내용을 입력해 주세요."
                value={currentStudentRecord.description}
                onChange={(event) => updateStudentRecordField("description", event.target.value)}
              />
            </label>
            <div className="rounded-2xl bg-white px-4 py-4 text-sm leading-6 text-muted">
              생기부와 활동 자료는 현재 선택한 {studentRecordPeriodTitle} 기록에 저장되고 목표설정과 AI 분석에도 함께 반영됩니다.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {fixedSubjectSlots.map(({ label, entry }) => (
              <label key={label} className="space-y-2">
                <span className="text-sm text-muted">{label}</span>
                <select
                  value={entry?.score ?? ""}
                  onChange={(event) => {
                    if (!entry) return;
                    handleSubjectScoreChange(entry, event.target.value);
                  }}
                  className="w-full rounded-xl border border-white bg-white px-4 py-3 text-ink"
                >
                  <option value="">등급 선택</option>
                  {subjectGradeOptions.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </label>
            ))}

            {customSubjects.map((entry) => (
              <label key={entry.id} className="space-y-2">
                <span className="text-sm text-muted">{entry.subject}</span>
                <select
                  value={entry.score}
                  onChange={(event) => handleSubjectScoreChange(entry, event.target.value)}
                  className="w-full rounded-xl border border-white bg-white px-4 py-3 text-ink"
                >
                  <option value="">등급 선택</option>
                  {subjectGradeOptions.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </label>
            ))}

            {displayedSubjectCount % 2 === 1 ? <div aria-hidden="true" className="invisible" /> : null}

            <label className="space-y-2">
              <span className="text-sm text-muted">전체평균</span>
              <input
                type="text"
                inputMode="decimal"
                value={activeScoreRecord?.overallAverage ?? ""}
                onChange={(event) => updateOverallAverage(selectedTab, selectedYear, selectedTerm, event.target.value)}
                placeholder="자동 계산 / 수기 입력"
                className="w-full rounded-xl border border-white bg-white px-4 py-3"
              />
            </label>

            <div className="space-y-2">
              <span className="text-sm text-muted">과목 관리</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleAddSubject}
                  className="w-full rounded-xl border border-white bg-white px-4 py-3 text-center text-sm font-semibold"
                >
                  추가
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSubject}
                  className="w-full rounded-xl border border-white bg-white px-4 py-3 text-center text-sm font-semibold"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <p className="mt-3 text-xs leading-5 text-muted">
        이 화면의 입력값은 학년/학기 배열로 저장되며 설정 &gt; 성적정보와 AI 분석 직전까지 그대로 반영됩니다.
      </p>
      <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-xs leading-5 text-muted">
        <div>
          현재 선택: {scoreTabOptions.find((tab) => tab.key === selectedTab)?.label} /{" "}
          {selectedTab === "studentRecord" ? (
            studentRecordPeriodTitle
          ) : (
            <>
              {gradeYearOptions.find((item) => item.value === selectedYear)?.label} /{" "}
              {gradeTermOptions.find((item) => item.value === selectedTerm)?.label}
            </>
          )}
        </div>
        {selectedTab !== "studentRecord" ? (
          <div className="mt-1">
            입력된 등급: {selectedGradeSummary.length > 0 ? selectedGradeSummary.join(", ") : "아직 선택된 과목 등급이 없습니다."}
            <br />
            전체평균: {activeScoreRecord?.overallAverage || "-"}
          </div>
        ) : (
          <div className="mt-1">
            현재 선택: {studentRecordPeriodTitle}
            <br />
            생기부 제목: {currentStudentRecord.title || "-"} / 메모: {currentStudentRecord.description || "-"}
          </div>
        )}
      </div>

      <div className="mt-4">
        <UploadDropzone
          title={uploadTitle}
          description={uploadDescription}
          buttonLabel="파일 선택"
          initialFiles={currentUploads}
          onFilesSelected={(files) => registerUploads(files, selectedTab, selectedYear, selectedTerm)}
        />
      </div>

      <button
        type="button"
        onClick={() => void handleMoveNext(uploadHref)}
        className="mt-4 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink"
      >
        PDF / 사진 업로드 화면으로 이동
      </button>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() => void handleMoveNext(goalsHref)}
          className="flex w-full items-center justify-center rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white"
        >
          저장하고 목표 대학 / 학과 설정 하기
        </button>
        <button
          type="button"
          onClick={() => void handleMoveNext(analysisHref)}
          className="flex w-full items-center justify-center rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink"
        >
          AI 분석 시작
        </button>
        <button type="button" onClick={() => void handleBack()} className="block w-full text-center text-sm text-muted">
          뒤로가기
        </button>
      </div>
    </PhoneFrame>
  );
}
