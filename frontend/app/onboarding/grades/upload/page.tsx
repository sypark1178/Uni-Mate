"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PhoneFrame } from "@/components/phone-frame";
import { UploadDropzone } from "@/components/upload-dropzone";
import { mergeHrefWithSearchParams, safeNavigate } from "@/lib/navigation";
import { onboardingPrimaryCtaClass, onboardingSecondaryOutlineCtaClass } from "@/lib/onboarding-buttons";
import {
  getGradeTermOptionsByTab,
  gradeTermForStudentSemester,
  gradeTermOptions,
  gradeYearOptions,
  schoolGradeFromSchoolYear,
  scoreTabOptions,
  uploadMatchesStudentSelection,
  useScoreRecords
} from "@/lib/score-storage";
import type { GradeTerm, GradeYear, ScoreTabKey } from "@/lib/types";

function isScoreTabKey(value: string | null): value is ScoreTabKey {
  return scoreTabOptions.some((item) => item.key === value);
}

function isGradeYear(value: string | null): value is GradeYear {
  return gradeYearOptions.some((item) => item.value === value);
}

function isGradeTerm(value: string | null): value is GradeTerm {
  return gradeTermOptions.some((item) => item.value === value);
}

export default function GradeUploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { store, registerUploads, flushStoreToServer } = useScoreRecords();
  const requestedTab = searchParams.get("tab");
  const requestedYear = searchParams.get("year");
  const requestedTerm = searchParams.get("term");

  const tab = isScoreTabKey(requestedTab) ? requestedTab : store.activeTab;
  const year = isGradeYear(requestedYear) ? requestedYear : store.selectedYear;
  const availableTermOptions = tab === "studentRecord" ? [] : getGradeTermOptionsByTab(tab, year);
  const fallbackTerm = availableTermOptions[0]?.value ?? store.selectedTerm;
  const candidateTerm = isGradeTerm(requestedTerm) ? requestedTerm : store.selectedTerm;
  const term =
    tab === "studentRecord"
      ? gradeTermForStudentSemester(store.selectedStudentSemester)
      : availableTermOptions.some((item) => item.value === candidateTerm)
        ? candidateTerm
        : fallbackTerm;
  const yearForStudentUpload = schoolGradeFromSchoolYear(store.selectedStudentSchoolYear);
  const yearForUpload = tab === "studentRecord" ? yearForStudentUpload : year;

  const existingFiles = useMemo(() => {
    if (tab === "studentRecord") {
      return store.uploads
        .filter((file) =>
          uploadMatchesStudentSelection(
            file,
            store.selectedStudentSchoolYear,
            store.selectedStudentSemester,
            store.selectedStudentRecordType
          )
        )
        .map((file) => file.name);
    }
    return store.uploads
      .filter((file) => file.sourceTab === tab && file.year === year && file.term === term)
      .map((file) => file.name);
  }, [
    store.uploads,
    tab,
    term,
    year,
    store.selectedStudentSchoolYear,
    store.selectedStudentSemester,
    store.selectedStudentRecordType
  ]);

  const gradesHref = mergeHrefWithSearchParams(
    tab === "studentRecord"
      ? `/onboarding/grades?tab=studentRecord`
      : `/onboarding/grades?tab=${tab}&year=${year}&term=${term}`,
    searchParams
  );

  const handleBack = async () => {
    await flushStoreToServer();
    safeNavigate(router, gradesHref);
  };

  return (
    <PhoneFrame
      title="성적 파일 업로드"
      subtitle="OCR 파이프라인으로 진입하는 화면입니다. 선택한 파일 메타정보를 현재 학년/학기 기록과 함께 저장합니다."
    >
      <div className="mb-3 rounded-2xl bg-mist px-4 py-3 text-sm text-muted">
        {tab === "studentRecord" ? (
          <>
            현재 대상: {scoreTabOptions.find((item) => item.key === tab)?.label} / {store.selectedStudentSchoolYear}학년 /{" "}
            {store.selectedStudentSemester}학기 / {store.selectedStudentRecordType}
          </>
        ) : (
          <>
            현재 대상: {scoreTabOptions.find((item) => item.key === tab)?.label} / {gradeYearOptions.find((item) => item.value === year)?.label} /{" "}
            {availableTermOptions.find((item) => item.value === term)?.label ?? gradeTermOptions.find((item) => item.value === term)?.label}
          </>
        )}
      </div>
      <UploadDropzone
        title="PDF / 사진 자료 선택"
        description="성적표, 모의고사표, 생기부 스캔본을 선택하면 현재 기록과 연결됩니다."
        initialFiles={existingFiles}
        onFilesSelected={(files) => registerUploads(files, tab, yearForUpload, term)}
      />
      <div className="mt-6 grid w-full gap-3">
        <button type="button" onClick={() => void handleBack()} className={onboardingPrimaryCtaClass}>
          추출 결과 확인하러 가기
        </button>
        <button type="button" onClick={() => void handleBack()} className={onboardingSecondaryOutlineCtaClass}>
          성적 입력 화면으로 돌아가기
        </button>
      </div>
    </PhoneFrame>
  );
}
