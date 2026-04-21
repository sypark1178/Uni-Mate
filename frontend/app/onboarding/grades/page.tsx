"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PhoneFrame } from "@/components/phone-frame";
import { UploadDropzone } from "@/components/upload-dropzone";
import { mergeHrefWithSearchParams, safeNavigate } from "@/lib/navigation";
import {
  getScoreRecord,
  gradeTermOptions,
  gradeYearOptions,
  scoreTabOptions,
  useScoreRecords
} from "@/lib/score-storage";
import type { GradeTerm, GradeYear, ScoreTabKey, SubjectScoreEntry } from "@/lib/types";

const fixedScoreLabels = ["국어", "수학", "영어", "사탐", "과탐"] as const;

function isScoreTabKey(value: string | null): value is ScoreTabKey {
  return scoreTabOptions.some((item) => item.key === value);
}

function isGradeYear(value: string | null): value is GradeYear {
  return gradeYearOptions.some((item) => item.value === value);
}

function isGradeTerm(value: string | null): value is GradeTerm {
  return gradeTermOptions.some((item) => item.value === value);
}

function buildFixedSubjectSlots(subjects: SubjectScoreEntry[]) {
  const fixedSubjects = subjects.filter((entry) => !entry.isCustom).slice(0, fixedScoreLabels.length);
  return fixedScoreLabels.map((label, index) => ({
    label,
    entry: fixedSubjects[index] ?? null
  }));
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
    updateSubjectName,
    updateOverallAverage,
    addSubject,
    removeSubject,
    updateStudentRecordField,
    registerUploads,
    flushStoreToServer
  } = useScoreRecords();

  const selectedTab = store.activeTab;
  const selectedYear = store.selectedYear;
  const selectedTerm = store.selectedTerm;

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
      store.uploads
        .filter((file) => file.sourceTab === selectedTab && file.year === selectedYear && file.term === selectedTerm)
        .map((file) => file.name),
    [selectedTab, selectedTerm, selectedYear, store.uploads]
  );

  const fixedSubjectSlots = useMemo(
    () => buildFixedSubjectSlots(activeScoreRecord?.subjects ?? []),
    [activeScoreRecord?.subjects]
  );

  const customSubjects = useMemo(
    () => activeScoreRecord?.subjects.filter((entry) => entry.isCustom && entry.subject.trim()) ?? [],
    [activeScoreRecord?.subjects]
  );

  const displayedSubjectCount = fixedSubjectSlots.length + customSubjects.length;

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
    if (selectedTab === "studentRecord" || customSubjects.length === 0) {
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

    matches.forEach((entry) => {
      removeSubject(selectedTab, selectedYear, selectedTerm, entry.id);
    });
  };

  const uploadTitle = selectedTab === "studentRecord" ? "생기부 / 활동 자료 업로드" : "PDF / 사진 성적 업로드";
  const uploadDescription =
    selectedTab === "studentRecord"
      ? "생기부, 활동증빙, 특기자료를 올리면 현재 학년/학기 기록과 함께 저장됩니다."
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

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="space-y-2">
          <span className="text-sm text-muted">학년 구분</span>
          <select
            className="w-full rounded-full border border-line bg-white px-4 py-3"
            value={selectedYear}
            onChange={(event) => setSelectedPeriod(event.target.value as GradeYear, selectedTerm)}
          >
            {gradeYearOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm text-muted">학기 구분</span>
          <select
            className="w-full rounded-full border border-line bg-white px-4 py-3"
            value={selectedTerm}
            onChange={(event) => setSelectedPeriod(selectedYear, event.target.value as GradeTerm)}
          >
            {gradeTermOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
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
            {fixedSubjectSlots.map(({ label, entry }) => (
              <label key={label} className="space-y-2">
                <span className="text-sm text-muted">{label}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={entry?.score ?? ""}
                  onChange={(event) => {
                    if (!entry) return;
                    updateSubjectScore(selectedTab, selectedYear, selectedTerm, entry.id, event.target.value);
                  }}
                  placeholder="직접 입력"
                  className="w-full rounded-xl border border-white bg-white px-4 py-3"
                />
              </label>
            ))}

            {customSubjects.map((entry) => (
              <label key={entry.id} className="space-y-2">
                <span className="text-sm text-muted">{entry.subject}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={entry.score}
                  onChange={(event) => updateSubjectScore(selectedTab, selectedYear, selectedTerm, entry.id, event.target.value)}
                  placeholder="직접 입력"
                  className="w-full rounded-xl border border-white bg-white px-4 py-3"
                />
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
                placeholder="직접 입력"
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
