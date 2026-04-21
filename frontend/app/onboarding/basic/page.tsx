"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { OnboardingStep } from "@/components/onboarding-step";
import { examYears, regionDistrictSchoolMap } from "@/lib/admission-data";
import { useStudentProfile } from "@/lib/profile-storage";

const gradeOptions = ["고1", "고2", "고3", "N수생"];

export default function OnboardingBasicPage() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const regions = Object.keys(regionDistrictSchoolMap);
  const { studentProfile, updateField } = useStudentProfile();

  const selectedGrade = studentProfile.gradeLabel || "고2";
  const selectedRegion = studentProfile.region || "서울";
  const selectedDistrict = studentProfile.district || "강남구";
  const selectedSchool = studentProfile.schoolName || "대치고등학교";
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
      subtitle="지역, 학년, 목표 연도는 전형과 일정 계산의 기준이 됩니다."
      prevHref={returnTo ?? undefined}
      prevLabel={returnTo ? "호출한 메뉴로 돌아가기" : undefined}
      nextHref="/onboarding/grades"
      nextLabel="성적입력으로"
    >
      <input
        className="w-full rounded-xl border border-line px-4 py-3"
        placeholder="이름"
        value={studentProfile.name}
        onChange={(event) => updateField("name", event.target.value)}
      />
      <div className="grid grid-cols-4 gap-2">
        {gradeOptions.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => updateField("gradeLabel", label)}
            className={`rounded-full border px-3 py-3 text-sm font-semibold ${
              selectedGrade === label ? "border-navy bg-navy text-white" : "border-line bg-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <select className="w-full rounded-xl border border-line px-4 py-3" value={selectedRegion} onChange={(event) => handleRegionChange(event.target.value)}>
        {regions.map((region) => (
          <option key={region} value={region}>
            {region}
          </option>
        ))}
      </select>
      <select className="w-full rounded-xl border border-line px-4 py-3" value={selectedDistrict} onChange={(event) => handleDistrictChange(event.target.value)}>
        {districts.map((district) => (
          <option key={district} value={district}>
            {district}
          </option>
        ))}
      </select>
      <select className="w-full rounded-xl border border-line px-4 py-3" value={selectedSchool} onChange={(event) => updateField("schoolName", event.target.value)}>
        {schools.map((school) => (
          <option key={school} value={school}>
            {school}
          </option>
        ))}
      </select>
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
