import type { ChecklistItem, Recommendation, SimulationInput, StudentProfile } from "@/lib/types";

export const profile: StudentProfile = {
  name: "학생",
  gradeLabel: "고2",
  region: "서울",
  district: "강남구",
  schoolName: "대치고등학교",
  track: "인문",
  targetYear: 2027,
  hasRequiredInfo: true,
  hasScores: true
};

export const emptyProfile: StudentProfile = {
  name: "게스트",
  gradeLabel: "미입력",
  region: "",
  district: "",
  schoolName: "",
  track: "미정",
  targetYear: 2027,
  hasRequiredInfo: false,
  hasScores: false
};

export const recommendations: Recommendation[] = [
  {
    id: "sogang-business",
    university: "서강대",
    major: "경영학과",
    category: "도전",
    fitScore: 38,
    notes: "내신 상위권 유지와 영어 최저 대응이 중요합니다.",
    evidence: {
      title: "2026학년도 수시모집요강",
      source: "서강대학교 입학처",
      page: 27,
      snippet: "학생부교과 성적 100% 반영, 수능 최저 국수영탐 2개 합 5 이내",
      status: "verified"
    }
  },
  {
    id: "skku-business",
    university: "성균관대",
    major: "경영학과",
    category: "안정",
    fitScore: 74,
    notes: "현재 기준으로 가장 안정적인 카드입니다.",
    evidence: {
      title: "2026학년도 학생부종합 안내",
      source: "성균관대학교 입학처",
      page: 18,
      snippet: "학생부종합 서류평가 중심, 비교과와 전공적합성 반영",
      status: "verified"
    }
  },
  {
    id: "hanyang-business",
    university: "한양대",
    major: "경영학부",
    category: "적정",
    fitScore: 61,
    notes: "교과 성적과 활동 서류의 균형이 중요합니다.",
    evidence: {
      title: "2026학년도 모집요강",
      source: "한양대학교 입학처",
      page: null,
      snippet: "비교 가능한 수치 근거가 아직 추출되지 않았습니다.",
      status: "unverified"
    }
  }
];

export const checklist: ChecklistItem[] = [
  { id: "1", title: "학생부 PDF 업로드", due: "오늘", done: true },
  { id: "2", title: "영어 최저 대비 계획 세우기", due: "D-7", done: false },
  { id: "3", title: "자소서 활동 근거 정리", due: "D-14", done: false }
];

export const ddayItems = [
  { label: "수시 원서 접수", value: "D-47" },
  { label: "6월 모의평가", value: "D-22" },
  { label: "수능", value: "D-128" }
];

export const initialSimulation: SimulationInput = {
  gpa: 1.6,
  mock: 1.8,
  minRequirementMet: true
};
