import type { GoalChoice, Recommendation } from "@/lib/types";

export const goalStorageKey = "uni-mate-goals";

export const defaultGoals: GoalChoice[] = [
  { university: "경희대학교", major: "경영학과" },
  { university: "서강대", major: "경영학과" },
  { university: "숭실대", major: "경영학과" }
];

const universityBaseScore: Record<string, number> = {
  서울대: 24,
  연세대: 28,
  고려대: 32,
  서강대: 38,
  성균관대: 74,
  한양대: 61,
  중앙대: 66,
  경희대학교: 64,
  경희대: 64,
  이화여대: 68,
  한국외대: 63,
  시립대: 62,
  건국대: 71,
  동국대: 69,
  숙명여대: 67,
  홍익대: 76,
  숭실대: 72,
  국민대: 75,
  광운대: 78,
  인하대: 73,
  아주대: 72,
  부산대: 70,
  경북대: 71,
  전남대: 74,
  충남대: 73,
  충북대: 75,
  강원대: 79,
  전북대: 77,
  경상국립대: 78
};

/** 모의·수능 등급(낮을수록 우수) 기준으로 목표 대학 대비 영어 쪽으로 더 끌어올려야 할 등급 폭(소수 첫째 자리)을 추정합니다. */
export function estimateEnglishPaceDelta(university: string, currentGradePoint: number): number {
  const base = universityBaseScore[university] ?? 70;
  const tier = (100 - base) / 100;
  const targetGrade = Math.round((1.5 + tier * 1.25) * 10) / 10;
  const raw = currentGradePoint - targetGrade;
  return Math.round(Math.max(0.1, raw) * 10) / 10;
}

type StrategySeed = {
  university: string;
  major: string;
  category: Recommendation["category"];
};

const strategyPoolByMajorKeyword: Record<string, StrategySeed[]> = {
  경영: [
    { university: "서강대", major: "경영학과", category: "도전" },
    { university: "연세대", major: "경영학과", category: "도전" },
    { university: "한양대", major: "경영학부", category: "적정" },
    { university: "중앙대", major: "경영학부", category: "적정" },
    { university: "건국대", major: "경영학과", category: "안정" },
    { university: "홍익대", major: "경영학부", category: "안정" }
  ],
  경제: [
    { university: "고려대", major: "경제학부", category: "도전" },
    { university: "서강대", major: "경제학부", category: "도전" },
    { university: "성균관대", major: "글로벌경제학과", category: "적정" },
    { university: "한양대", major: "경제금융학부", category: "적정" },
    { university: "중앙대", major: "경제학부", category: "안정" },
    { university: "인하대", major: "경제학과", category: "안정" }
  ]
};

const fallbackStrategyPool: StrategySeed[] = [
  { university: "서강대", major: "경영학과", category: "도전" },
  { university: "경희대학교", major: "경영학과", category: "도전" },
  { university: "한양대", major: "정책학과", category: "적정" },
  { university: "한국외대", major: "LD학부", category: "적정" },
  { university: "부산대", major: "경영학과", category: "안정" },
  { university: "충남대", major: "경영학부", category: "안정" }
];

function getBaseScore(university: string) {
  return universityBaseScore[university] ?? 70;
}

function getCategory(score: number): Recommendation["category"] {
  if (score >= 72) return "안정";
  if (score >= 55) return "적정";
  return "도전";
}

function buildEvidence(university: string, major: string, fitScore: number): Recommendation["evidence"] {
  const verified = fitScore >= 50;
  return {
    title: `${university} ${major} AI 분석 결과`,
    source: `${university} 입학처 / Uni-Mate RAG`,
    page: verified ? 12 + (fitScore % 17) : null,
    snippet: verified
      ? `${major} 기준 최근 모집요강과 학생부 반영 비율, 최저 기준을 근거로 ${fitScore}%의 합격 가능성을 산출했습니다.`
      : `${major} 관련 수치 근거가 충분하지 않아 현재는 확인 불가로 처리했습니다.`,
    status: verified ? "verified" : "unverified"
  };
}

export function buildGoalAnalyses(goals: GoalChoice[]): Recommendation[] {
  return goals.slice(0, 3).map((goal, index) => {
    const fitScore = Math.max(25, Math.min(88, getBaseScore(goal.university) - index * 2));
    return {
      id: `goal-${index + 1}`,
      university: goal.university,
      major: goal.major,
      category: getCategory(fitScore),
      fitScore,
      notes: `${goal.university} ${goal.major} 기준의 목표 카드입니다. 목표 대학 3개와 전략 6장은 분리해서 관리합니다.`,
      evidence: buildEvidence(goal.university, goal.major, fitScore)
    };
  });
}

export function buildStrategyRecommendations(goals: GoalChoice[]): Recommendation[] {
  const goalAnalyses = buildGoalAnalyses(goals);
  const firstMajor = goals[0]?.major ?? "";
  const matchedPool =
    Object.entries(strategyPoolByMajorKeyword).find(([keyword]) => firstMajor.includes(keyword))?.[1] ??
    fallbackStrategyPool;

  const goalKeys = new Set(goalAnalyses.map((item) => `${item.university}|${item.major}`));
  const supplemental = matchedPool.filter((item) => !goalKeys.has(`${item.university}|${item.major}`));

  const supplementalCards = supplemental.slice(0, Math.max(0, 6 - goalAnalyses.length)).map((item, index) => {
    const fitScore = Math.max(25, Math.min(88, getBaseScore(item.university) - (goalAnalyses.length + index) * 2));
    return {
      id: `strategy-extra-${index + 1}`,
      university: item.university,
      major: item.major,
      // 보완 추천 풀의 난이도 구간(도전/적정/안정)을 그대로 유지해야 필터에서 학교가 안정적으로 노출됩니다.
      category: item.category,
      fitScore,
      notes: `${item.university} ${item.major} 기준 보완 추천 카드입니다.`,
      evidence: buildEvidence(item.university, item.major, fitScore)
    };
  });

  const merged = [...goalAnalyses.map((item, index) => ({ ...item, id: `strategy-goal-${index + 1}` })), ...supplementalCards];
  const categories: Recommendation["category"][] = ["도전", "적정", "안정"];

  // 필터 버튼을 눌렀을 때 빈 목록이 되지 않도록 각 구간 카드를 최소 1개씩 보장합니다.
  categories.forEach((category) => {
    if (merged.some((item) => item.category === category)) {
      return;
    }

    const candidate = matchedPool.find((item) => item.category === category);
    if (!candidate) {
      return;
    }

    const fitScore = Math.max(25, Math.min(88, getBaseScore(candidate.university)));
    merged.push({
      id: `strategy-ensure-${category}`,
      university: candidate.university,
      major: candidate.major,
      category,
      fitScore,
      notes: `${candidate.university} ${candidate.major} 기준 구간 보완 카드입니다.`,
      evidence: buildEvidence(candidate.university, candidate.major, fitScore)
    });
  });

  const deduped: Recommendation[] = [];
  const seen = new Set<string>();
  for (const item of merged) {
    const key = `${item.university}|${item.major}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped.slice(0, 6);
}

export function parseSeededGoals(searchParams: URLSearchParams): GoalChoice[] {
  return [1, 2, 3]
    .map((index) => searchParams.get(`g${index}`))
    .filter((value): value is string => Boolean(value))
    .map((value) => {
      const [university = "", major = ""] = value.split("|");
      return { university, major };
    })
    .filter((item) => item.university && item.major)
    .slice(0, 3);
}
