import type { ChecklistItem, Recommendation, SimulationInput, StudentProfile } from "@/lib/types";

export const profile: StudentProfile = {
  name: "학생",
  gradeLabel: "고2",
  region: "서울",
  district: "강남구",
  schoolName: "대치고등학교",
  track: "인문",
  targetYear: 2027,
  profileImageUrl: "",
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
  profileImageUrl: "",
  hasRequiredInfo: false,
  hasScores: false
};

export const recommendations: Recommendation[] = [
  {
    id: "kyunghee-business",
    university: "경희대",
    major: "경영학과",
    category: "도전",
    fitScore: 64,
    notes: "전공 연계 활동과 면접 준비를 함께 챙기면 좋아요.",
    evidence: {
      title: "2026학년도 수시모집요강",
      source: "경희대학교 입학처",
      page: 22,
      snippet: "학생부 중심 평가와 전공적합성 서류 검토 비중이 높습니다.",
      status: "verified"
    }
  },
  {
    id: "sogang-business",
    university: "서강대",
    major: "경영학부",
    category: "적정",
    fitScore: 60,
    notes: "교과 성적과 비교과 근거를 균형 있게 준비해 보세요.",
    evidence: {
      title: "2026학년도 수시모집요강",
      source: "서강대학교 입학처",
      page: 27,
      snippet: "학생부·서류 평가에서 전공 연계 활동이 핵심입니다.",
      status: "verified"
    }
  },
  {
    id: "soongsil-business",
    university: "숭실대",
    major: "경영학부",
    category: "안정",
    fitScore: 72,
    notes: "현재 페이스를 유지하면 안정권 합격 가능성이 높아요.",
    evidence: {
      title: "2026학년도 모집요강",
      source: "숭실대학교 입학처",
      page: 19,
      snippet: "학생부 기반 평가에서 과목 선택과 세부능력특기사항 반영",
      status: "verified"
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
