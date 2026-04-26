"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { OnboardingStep } from "@/components/onboarding-step";
import { examYears, regionDistrictSchoolMap } from "@/lib/admission-data";
import { useStudentProfile } from "@/lib/profile-storage";

const gradeOptions = ["초등학생", "중학생", "고1", "고2", "고3", "N수생", "학부모", "교육관계자"];

export default function OnboardingBasicPage() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const regions = Object.keys(regionDistrictSchoolMap);
  const { studentProfile, updateField } = useStudentProfile();

  const selectedGrade = studentProfile.gradeLabel || "";
  const selectedRegion = studentProfile.region || "서울";
  const selectedDistrict = studentProfile.district || "강남구";
  const selectedSchool = studentProfile.schoolName || "";
  const selectedYear = String(studentProfile.targetYear || 2027);

  const districts = useMemo(() => Object.keys(regionDistrictSchoolMap[selectedRegion] ?? {}), [selectedRegion]);
  const schools = useMemo(
    () => regionDistrictSchoolMap[selectedRegion]?.[selectedDistrict] ?? [],
    [selectedDistrict, selectedRegion]
  );

  const handleRegionChange = (value: string) => {
    const nextDistricts = Object.keys(regionDistrictSchoolMap[value] ?? {});
    const nextDistrict = nextDistricts[0] ?? "";
    const nextSchools = regionDistrictSchoolMap[value]?.[nextDistrict] ?? [];
    updateField("region", value);
    updateField("district", nextDistrict);
    updateField("schoolName", nextSchools[0] ?? "");
  };

  const handleDistrictChange = (value: string) => {
    const nextSchools = regionDistrictSchoolMap[selectedRegion]?.[value] ?? [];
    updateField("district", value);
    updateField("schoolName", nextSchools[0] ?? "");
  };

  return (
    <OnboardingStep
      step="1/3"
      title="기본 정보를 알려주세요"
      subtitle="학년, 지역, 수능 응시 연도 정보는 전형과 일정 계산의 기준이 됩니다."
      subtitleClassName="text-xs leading-5 whitespace-nowrap"
      prevHref={returnTo ?? undefined}
      prevLabel={returnTo ? "호출한 메뉴로 돌아가기" : undefined}
      nextHref="/onboarding/grades"
      nextLabel="2단계 성적 입력 →"
    >
      <input
        className="w-full rounded-xl border border-line px-4 py-3"
        placeholder="이름"
        value={studentProfile.name}
        onChange={(event) => updateField("name", event.target.value)}
      />
      <select
        className={`w-full rounded-xl border border-line px-4 py-3 ${selectedGrade ? "text-ink" : "text-muted"}`}
        value={selectedGrade}
        onChange={(event) => updateField("gradeLabel", event.target.value)}
      >
        <option value="" disabled hidden>
          학년
        </option>
        {gradeOptions.map((label) => (
          <option key={label} value={label}>
            {label}
          </option>
        ))}
      </select>
      <select className="w-full rounded-xl border border-line px-4 py-3" value={selectedRegion} onChange={(event) => handleRegionChange(event.target.value)}>
        <option value={selectedRegion} hidden>
          {selectedRegion}
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
      <select className="w-full rounded-xl border border-line px-4 py-3" value={selectedDistrict} onChange={(event) => handleDistrictChange(event.target.value)}>
        <option value={selectedDistrict} hidden>
          {selectedDistrict}
        </option>
        {districts.map((district) => (
          <option key={district} value={district}>
            {district}
          </option>
        ))}
      </select>
      <select className="w-full rounded-xl border border-line px-4 py-3" value={selectedSchool} onChange={(event) => updateField("schoolName", event.target.value)}>
        <option value="" disabled>
          학교 선택
        </option>
        {selectedSchool ? (
          <option value={selectedSchool} hidden>
            {selectedSchool}
          </option>
        ) : null}
        {schools.map((school) => (
          <option key={school} value={school}>
            {school}
          </option>
        ))}
      </select>
      <div className="-mt-1 text-xs leading-snug text-muted">
        학교 알리미 데이터를 활용해 내신을 학교별로 알맞게 보정합니다.
      </div>
      <select
        className="w-full rounded-xl border border-line px-4 py-3"
        value={selectedYear}
        onChange={(event) => updateField("targetYear", Number(event.target.value))}
      >
        {examYears.map((year) => (
          <option key={year} value={String(year)}>
            {year}
          </option>
        ))}
      </select>
    </OnboardingStep>
  );
}
