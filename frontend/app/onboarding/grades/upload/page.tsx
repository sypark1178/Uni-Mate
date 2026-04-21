"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PhoneFrame } from "@/components/phone-frame";
import { UploadDropzone } from "@/components/upload-dropzone";
import { mergeHrefWithSearchParams, safeNavigate } from "@/lib/navigation";
import { gradeTermOptions, gradeYearOptions, scoreTabOptions, useScoreRecords } from "@/lib/score-storage";
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
  const term = isGradeTerm(requestedTerm) ? requestedTerm : store.selectedTerm;

  const existingFiles = useMemo(
    () =>
      store.uploads
        .filter((file) => file.sourceTab === tab && file.year === year && file.term === term)
        .map((file) => file.name),
    [store.uploads, tab, term, year]
  );

  const gradesHref = mergeHrefWithSearchParams(`/onboarding/grades?tab=${tab}&year=${year}&term=${term}`, searchParams);

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
        현재 대상: {scoreTabOptions.find((item) => item.key === tab)?.label} / {gradeYearOptions.find((item) => item.value === year)?.label} /{" "}
        {gradeTermOptions.find((item) => item.value === term)?.label}
      </div>
      <UploadDropzone
        title="PDF / 사진 자료 선택"
        description="성적표, 모의고사표, 생기부 스캔본을 선택하면 현재 기록과 연결됩니다."
        initialFiles={existingFiles}
        onFilesSelected={(files) => registerUploads(files, tab, year, term)}
      />
      <div className="mt-6 grid gap-3">
        <button
          type="button"
          onClick={() => void handleBack()}
          className="rounded-xl bg-navy px-4 py-3 text-center text-sm font-semibold text-white"
        >
          추출 결과 확인하러 가기
        </button>
        <button
          type="button"
          onClick={() => void handleBack()}
          className="rounded-xl border border-line px-4 py-3 text-center text-sm font-semibold text-muted"
        >
          성적 입력 화면으로 돌아가기
        </button>
      </div>
    </PhoneFrame>
  );
}
