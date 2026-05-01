"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OnboardingStep } from "@/components/onboarding-step";
import {
  clampExamYearToList,
  examYears,
  regionDistrictSchoolMap,
  suggestedTargetExamYear
} from "@/lib/admission-data";
import { demoSeededProfile } from "@/lib/mock-data";
import { onboardingFormFieldClass, onboardingSelectFieldClass } from "@/lib/onboarding-buttons";
import { readJsonResponse } from "@/lib/read-json-response";
import { useStudentProfile } from "@/lib/profile-storage";

const gradeOptions = ["초등학생", "중학생", "고1", "고2", "고3", "N수생", "학부모", "교육관계자"];

function isAutoExamYearGrade(gradeLabel: string): boolean {
  const normalized = gradeLabel.trim();
  return normalized === "고1" || normalized === "고2" || normalized === "고3";
}

const regionAliasMap: Record<string, string> = {
  서울: "서울특별시",
  인천: "인천광역시",
  경기: "경기도",
  강원: "강원특별자치도",
  대전: "대전광역시",
  세종: "세종특별자치시",
  충북: "충청북도",
  충남: "충청남도",
  광주: "광주광역시",
  전북: "전라북도",
  전남: "전라남도",
  부산: "부산광역시",
  대구: "대구광역시",
  울산: "울산광역시",
  경북: "경상북도",
  경남: "경상남도",
  제주: "제주특별자치도"
};

function normalizeRegionKey(region: string): string {
  const trimmed = region.trim();
  return regionAliasMap[trimmed] ?? trimmed;
}

function getSchoolKeywordByGrade(gradeLabel: string): "초등학교" | "중학교" | "고등학교" | "" {
  if (gradeLabel.includes("초등")) return "초등학교";
  if (gradeLabel.includes("중")) return "중학교";
  if (gradeLabel.includes("고")) return "고등학교";
  return "";
}

export default function OnboardingBasicPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const demoAppliedRef = useRef(false);
  /** 유형 자동 연도: 최초 로드(빈 연도)와 유형 변경 시에만 덮어씀 — 저장된 연도는 유지 */
  const prevGradeForAutoYear = useRef<string | null>(null);
  const regions = useMemo(
    () => Object.keys(regionDistrictSchoolMap).sort((left, right) => left.localeCompare(right, "ko-KR")),
    []
  );
  const { studentProfile, updateField, hydrated, setStudentProfile } = useStudentProfile();

  const selectedGrade = studentProfile.gradeLabel || "";
  const selectedRegion = studentProfile.region || "";
  const normalizedSelectedRegion = normalizeRegionKey(selectedRegion);
  const selectedDistrict = studentProfile.district || "";
  const selectedSchool = studentProfile.schoolName || "";
  const selectedYear = examYears.includes(studentProfile.targetYear) ? String(studentProfile.targetYear) : "";
  const schoolKeyword = getSchoolKeywordByGrade(selectedGrade);
  const [remoteSchools, setRemoteSchools] = useState<string[]>([]);

  const districts = useMemo(
    () =>
      Object.keys(regionDistrictSchoolMap[normalizedSelectedRegion] ?? {}).sort((left, right) => left.localeCompare(right, "ko-KR")),
    [normalizedSelectedRegion]
  );
  const schools = useMemo(
    () => {
      const regionRows = regionDistrictSchoolMap[normalizedSelectedRegion] ?? {};
      if (!selectedDistrict) {
        const allSchools = Array.from(new Set(Object.values(regionRows).flat()));
        const gradeMatched = schoolKeyword ? allSchools.filter((school) => school.includes(schoolKeyword)) : allSchools;
        return gradeMatched.sort((left, right) => left.localeCompare(right, "ko-KR"));
      }
      const districtSchools = [...(regionRows[selectedDistrict] ?? [])];
      const gradeMatched = schoolKeyword ? districtSchools.filter((school) => school.includes(schoolKeyword)) : districtSchools;
      return gradeMatched.sort((left, right) => left.localeCompare(right, "ko-KR"));
    },
    [normalizedSelectedRegion, schoolKeyword, selectedDistrict]
  );
  const districtsForUi = districts;
  const schoolsForUi = remoteSchools.length > 0 ? remoteSchools : schools;

  useEffect(() => {
    let cancelled = false;
    if (!selectedRegion || !selectedGrade) {
      setRemoteSchools([]);
      return;
    }

    const controller = new AbortController();
    const load = async () => {
      try {
        const params = new URLSearchParams({
          region: selectedRegion,
          gradeLabel: selectedGrade
        });
        const response = await fetch(`/api/onboarding/schools?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal
        });
        const payload = await readJsonResponse<{ ok?: boolean; data?: { districts?: string[]; schools?: string[] } }>(
          response
        );
        if (cancelled || !payload || !payload.ok || !payload.data) return;
        if (!selectedDistrict) {
          const nextSchools = (payload.data.schools ?? []).sort((left, right) => left.localeCompare(right, "ko-KR"));
          setRemoteSchools(nextSchools);
        }
      } catch {
        if (!cancelled) {
          if (!selectedDistrict) setRemoteSchools([]);
        }
      }
    };
    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedRegion, selectedGrade, selectedDistrict]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedRegion || !selectedGrade) {
      setRemoteSchools([]);
      return;
    }
    if (!selectedDistrict) {
      return;
    }
    const controller = new AbortController();
    const load = async () => {
      try {
        const params = new URLSearchParams({
          region: selectedRegion,
          district: selectedDistrict,
          gradeLabel: selectedGrade
        });
        const response = await fetch(`/api/onboarding/schools?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal
        });
        const payload = await readJsonResponse<{ ok?: boolean; data?: { schools?: string[] } }>(response);
        if (cancelled || !payload || !payload.ok || !payload.data) return;
        setRemoteSchools((payload.data.schools ?? []).sort((left, right) => left.localeCompare(right, "ko-KR")));
      } catch {
        if (!cancelled) setRemoteSchools([]);
      }
    };
    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedDistrict, selectedGrade, selectedRegion]);

  useEffect(() => {
    if (!hydrated || demoAppliedRef.current) {
      return;
    }
    if (searchParams.get("demo") !== "1") {
      return;
    }
    demoAppliedRef.current = true;
    setStudentProfile(demoSeededProfile);
    const next =
      returnTo && returnTo.startsWith("/")
        ? `/onboarding/basic?returnTo=${encodeURIComponent(returnTo)}`
        : "/onboarding/basic";
    router.replace(next);
  }, [hydrated, returnTo, router, searchParams, setStudentProfile]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!isAutoExamYearGrade(selectedGrade)) {
      if (studentProfile.targetYear !== 0) {
        updateField("targetYear", 0);
      }
      prevGradeForAutoYear.current = selectedGrade;
      return;
    }

    const suggested = suggestedTargetExamYear(selectedGrade);
    const prev = prevGradeForAutoYear.current;

    if (suggested !== null) {
      const clamped = clampExamYearToList(suggested);
      const initialized = prev !== null && prev !== "";
      const gradeChanged = initialized && prev !== selectedGrade;
      const initialUnset =
        !initialized &&
        Boolean(selectedGrade) &&
        (!examYears.includes(studentProfile.targetYear) || studentProfile.targetYear === 0);

      if (gradeChanged || initialUnset) {
        updateField("targetYear", clamped);
      }
    }

    prevGradeForAutoYear.current = selectedGrade;
  }, [hydrated, selectedGrade, studentProfile.targetYear, updateField]);

  const handleRegionChange = (value: string) => {
    updateField("region", value);
    updateField("district", "");
    updateField("schoolName", "");
  };

  const handleGradeChange = (value: string) => {
    updateField("gradeLabel", value);
    if (!isAutoExamYearGrade(value)) {
      updateField("targetYear", 0);
      return;
    }
    const suggested = suggestedTargetExamYear(value);
    if (suggested !== null) {
      updateField("targetYear", clampExamYearToList(suggested));
    }
  };

  const handleDistrictChange = (value: string) => {
    updateField("district", value);
    updateField("schoolName", "");
  };

  return (
    <OnboardingStep
      step="1/3"
      title="기본 정보를 알려주세요"
      subtitle="학년, 지역, 수능 응시 연도 정보는 전형과 일정 계산의 기준이 됩니다."
      subtitleClassName="text-xs leading-5 whitespace-nowrap"
      prevHref={returnTo ?? undefined}
      prevLabel={returnTo ? "호출한 메뉴로 돌아가기" : undefined}
      helperLink={{ href: "/login", label: "뒤로가기", plainHref: true }}
      nextHref="/onboarding/grades"
      nextLabel={hydrated ? "2단계 성적 입력 →" : "불러오는 중..."}
      nextDisabled={!hydrated}
    >
      {!hydrated ? (
        <div className="rounded-[22px] border border-line bg-white p-5 text-sm leading-6 text-muted">
          저장된 기본정보를 불러오는 중입니다.
        </div>
      ) : (
        <>
          <input
            className={onboardingFormFieldClass}
            placeholder="이름"
            value={studentProfile.name}
            onChange={(event) => updateField("name", event.target.value)}
          />
          <select
            required
            className={onboardingSelectFieldClass}
            value={selectedGrade}
            onChange={(event) => handleGradeChange(event.target.value)}
          >
            <option value="" disabled>
              유형
            </option>
            {gradeOptions.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
          <select
            required
            className={onboardingSelectFieldClass}
            value={selectedRegion}
            onChange={(event) => handleRegionChange(event.target.value)}
          >
            <option value="" disabled>
              지역
            </option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
          <div className="-mt-1 text-xs leading-snug text-muted">
            지역인재 등 전형 지원 가능 여부를 판단하는 데 사용됩니다.
          </div>
          <select
            required={Boolean(selectedRegion)}
            className={onboardingSelectFieldClass}
            value={selectedDistrict}
            disabled={!selectedRegion}
            onChange={(event) => handleDistrictChange(event.target.value)}
          >
            <option value="" disabled>
              {selectedRegion ? "세부지역" : "먼저 지역을 선택하세요"}
            </option>
            {districtsForUi.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
          <select
            required={Boolean(selectedRegion && selectedGrade)}
            className={onboardingSelectFieldClass}
            value={selectedSchool}
            disabled={!selectedRegion || !selectedGrade}
            onChange={(event) => updateField("schoolName", event.target.value)}
          >
            <option value="" disabled>
              {!selectedGrade ? "먼저 유형을 선택하세요" : selectedRegion ? "학교 선택" : "먼저 지역을 선택하세요"}
            </option>
            {selectedSchool && !schoolsForUi.includes(selectedSchool) ? (
              <option key="__current-school" value={selectedSchool} hidden>
                {selectedSchool}
              </option>
            ) : null}
            {schoolsForUi.map((school) => (
              <option key={school} value={school}>
                {school}
              </option>
            ))}
          </select>
          <div className="-mt-1 text-xs leading-snug text-muted">
            학교 알리미 데이터를 활용해 내신을 학교별로 알맞게 보정합니다.
          </div>
          <select
            required
            className={onboardingSelectFieldClass}
            value={selectedYear}
            onChange={(event) => updateField("targetYear", Number(event.target.value))}
          >
            <option value="" disabled>
              수능 응시 년도
            </option>
            {examYears.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </>
      )}
    </OnboardingStep>
  );
}
