export const refinedFlow = {
  landing: "/",
  login: "/login",
  onboarding: {
    basic: "/onboarding/basic",
    grades: "/onboarding/grades",
    goals: "/onboarding/goals",
    loading: "/analysis/loading"
  },
  dashboard: "/dashboard",
  tabs: {
    strategy: "/strategy",
    analysis: "/analysis",
    execution: "/execution",
    settings: "/settings"
  }
} as const;

export const correctedIssues = [
  "가입 없이 시작하기 링크를 기본정보 입력으로 수정",
  "기본정보 입력의 건너뛰기 동선을 성적입력으로 조정",
  "성적입력의 AI 분석하기를 목표설정 이후 분석 진행으로 수정",
  "대시보드 하위 탭의 더미 파일명을 실제 App Router 경로로 통일",
  "근거 보기에서 페이지 번호가 없으면 확인 불가 상태를 명시",
  "원본 HTML 변형 화면들을 저장하기/정보없음/가입유도/추천수강과목/갭분석/시뮬레이션으로 세분화"
];
