"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { PhoneFrame } from "@/components/phone-frame";
import { SectionTabs } from "@/components/section-tabs";
import { normalizeUniversityName } from "@/lib/admission-data";
import { compactGoalLine } from "@/lib/goal-display";
import { defaultGoals, parseSeededGoals } from "@/lib/planning";
import { useScoreRecords } from "@/lib/score-storage";
import { useGoals } from "@/lib/use-goals";
import type { ScoreMemoryStore } from "@/lib/types";

type SubjectCard = {
  name: string;
  status: "이수 중" | "미이수";
  reasonTitle: string;
  reasonBody: string;
};

type UniBucket = "kyunghee" | "sogang" | "soongsil" | "biz_default";

function uniBucket(university: string): UniBucket {
  const n = normalizeUniversityName(university);
  if (n.includes("경희")) return "kyunghee";
  if (n.includes("서강")) return "sogang";
  if (n.includes("숭실")) return "soongsil";
  return "biz_default";
}

function collectSchoolSubjectLabels(store: ScoreMemoryStore): string[] {
  const labels: string[] = [];
  for (const record of store.schoolRecords) {
    for (const entry of record.subjects) {
      const t = entry.subject.trim();
      if (t) labels.push(t);
    }
  }
  return labels;
}

function inferSubjectStatus(subjectName: string, labels: string[]): "이수 중" | "미이수" {
  const hay = labels.join(" ");
  const any = (re: RegExp) => labels.some((l) => re.test(l)) || re.test(hay);
  if (subjectName.includes("경제")) {
    if (any(/경제/)) return "이수 중";
  } else if (subjectName.includes("사회·문화")) {
    if (any(/사회.?문화|사회문화|사회와.?문화/) || (any(/사회/) && any(/문화/))) return "이수 중";
  } else if (subjectName.includes("확률") || subjectName.includes("통계")) {
    if (any(/확률|통계|확률과.?통계/)) return "이수 중";
  } else if (subjectName.includes("미적분")) {
    if (any(/미적분|미적/)) return "이수 중";
  } else if (subjectName.includes("물리")) {
    if (any(/물리/)) return "이수 중";
  } else if (subjectName.includes("화학")) {
    if (any(/화학/)) return "이수 중";
  }
  return "미이수";
}

function scoreHintLine(schoolAverage: string, mockAverage: string): string {
  const hasSchool = schoolAverage !== "-";
  const hasMock = mockAverage !== "-";
  if (!hasSchool && !hasMock) {
    return "설정에 성적을 입력하면 과목 표시가 더 정확해져요.";
  }
  const parts: string[] = [];
  if (hasSchool) parts.push(`내신 평균 ${schoolAverage}`);
  if (hasMock) parts.push(`모의고사 평균 ${mockAverage}`);
  return `${parts.join(", ")} 숫자를 보고 ‘이수 중 / 미이수’를 짐작해 둔 거예요.`;
}

function businessCardsByUniversity(bucket: UniBucket, university: string, major: string): Omit<SubjectCard, "status">[] {
  const u = normalizeUniversityName(university);
  const m = major.trim() || "경영";

  if (bucket === "kyunghee") {
    return [
      {
        name: "사회 - 경제",
        reasonTitle: `${u} ${m}에 맞는 경제 과목`,
        reasonBody:
          "세계 경제와 우리나라 경제 흐름을 읽는 연습이 자기소개서와 면접에서 자주 도움이 돼요. 경제 과목을 듣고 교과 평가란과 탐구 활동 주제를 한 줄로 이어 적어 두면 좋아요."
      },
      {
        name: "사회 - 사회·문화",
        reasonTitle: `${u} ${m}에 맞는 사회·문화`,
        reasonBody:
          "함께 일하고 발표하는 경험이 자기소개서와 면접에서 자주 도움이 돼요. 사회·문화 과목을 듣고 교과 평가란에 모둠·토론 내용을 한 줄로 이어 적어 두면 좋아요. 넣기 어렵다면 정치와 법·생활과 윤리로 이어 갈 계획을 세워 보세요."
      },
      {
        name: "수학 - 확률과 통계",
        reasonTitle: `${u} ${m}에 맞는 확률과 통계`,
        reasonBody:
          "숫자와 그래프로 자료를 설명하는 연습이 자기소개서와 면접에서도 도움이 돼요. 확률과 통계를 이수하고, 대학 홈페이지나 안내 책자에 권장돼 있으면 우선 알아보면 좋아요."
      }
    ];
  }

  if (bucket === "sogang") {
    return [
      {
        name: "사회 - 경제",
        reasonTitle: `${u} ${m}에 맞는 경제 과목`,
        reasonBody:
          "경제 뉴스를 내 말로 정리한 흔적이 자기소개서와 면접에서 자주 도움이 돼요. 경제 과목을 듣고 교과 평가란과 독서·탐구 활동 주제를 한 줄로 이어 적어 두면 좋아요."
      },
      {
        name: "사회 - 사회·문화",
        reasonTitle: `${u} ${m}에 맞는 사회·문화`,
        reasonBody:
          "인문과 사회 과목을 골고루 듣는 모습이 자기소개서와 면접에서 도움이 돼요. 사회·문화 과목을 듣고 토론·모둠 활동을 교과 평가란에 한 줄로 이어 적어 두면 좋아요."
      },
      {
        name: "수학 - 확률과 통계",
        reasonTitle: `${u} ${m}에 맞는 확률과 통계`,
        reasonBody:
          "경영을 지원해도 수학 성적을 꼼꼼히 보는 경우가 많아 자기소개서와 면접에서도 수학 이야기가 나올 수 있어요. 확률과 통계를 이수할지는 수능 조건과 내신 반영을 대학 홈페이지나 안내 책자로 확인하고 정하면 좋아요."
      }
    ];
  }

  if (bucket === "soongsil") {
    return [
      {
        name: "사회 - 경제",
        reasonTitle: `${u} ${m}에 맞는 경제 과목`,
        reasonBody:
          "배운 내용을 실제 사례에 연결하는 경험이 자기소개서와 면접에서 도움이 돼요. 경제 과목을 듣고 회사나 시장 이야기를 교과 평가란과 탐구 활동 주제에 한 줄로 이어 적어 두면 좋아요."
      },
      {
        name: "사회 - 사회·문화",
        reasonTitle: `${u} ${m}에 맞는 사회·문화`,
        reasonBody:
          "동네·복지·미디어 같은 주제를 깊게 다룬 경험이 자기소개서와 면접에서 도움이 돼요. 사회·문화 과목을 듣고 모둠 활동을 동아리·봉사와 한 가지 주제로 이어 적어 두면 좋아요."
      },
      {
        name: "수학 - 확률과 통계",
        reasonTitle: `${u} ${m}에 맞는 확률과 통계`,
        reasonBody:
          "자료를 보고 선택할 때 숫자 감각이 자기소개서와 면접에서도 도움이 돼요. 확률과 통계가 있으면 이수하고, 없으면 비슷한 수학 과목으로 채울지 담임 선생님과 상의해 보세요."
      }
    ];
  }

  return [
    {
      name: "사회 - 경제",
      reasonTitle: `${u} ${m}에 맞는 경제 과목`,
      reasonBody:
        "가고 싶은 과에 왜 맞는지 말할 근거가 자기소개서와 면접에서 도움이 돼요. 경제 과목을 듣고 교과 평가란과 탐구 활동 주제를 한 줄로 이어 적어 두고, 다음 학기 개설 여부는 미리 확인해 보세요."
    },
    {
      name: "사회 - 사회·문화",
      reasonTitle: `${u} ${m}에 맞는 사회·문화`,
      reasonBody:
        "사회 교과에서 활동한 기록이 자기소개서와 면접에서 도움이 돼요. 사회·문화 과목을 듣고 교과 평가란에 토론·모둠 활동을 한 줄로 이어 적고, 고르기 전에 담임 선생님께 가능한지 먼저 확인해 보세요."
    },
    {
      name: "수학 - 확률과 통계",
      reasonTitle: `${u} ${m}에 맞는 확률과 통계`,
      reasonBody:
        "경영 쪽에서 자주 권하는 과목이라 자기소개서와 면접에서도 무난하게 설명할 수 있어요. 확률과 통계는 내신과 모의고사 부담을 생각해 무리 없는 시기에 이수하는 것을 추천해요."
    }
  ];
}

function genericNonBusinessCards(majorText: string): Omit<SubjectCard, "status">[] {
  const label = majorText.trim() || "희망 학과";
  return [
    {
      name: "수학 - 미적분",
      reasonTitle: `${label}에 맞는 미적분`,
      reasonBody:
        "공학·과학 쪽 과에서는 미적분 이수가 자기소개서와 면접에서 설명하기 좋아요. 학교에서 정한 순서에 맞춰 미적분을 언제 들을지 정해 두면 좋아요."
    },
    {
      name: "과학 - 물리학Ⅰ",
      reasonTitle: `${label}에 맞는 물리학Ⅰ`,
      reasonBody:
        "전공과 연결되는 과학 탐구 한 가지를 잡아 두면 자기소개서와 면접에서 말하기 편해요. 물리학Ⅰ을 듣고 탐구 활동 주제를 한 줄로 이어 가면 좋아요."
    },
    {
      name: "과학 - 화학Ⅰ",
      reasonTitle: `${label}에 맞는 화학Ⅰ`,
      reasonBody:
        "실험 과정이 교과 평가란에 잘 보이면 자기소개서와 면접에서도 도움이 돼요. 화학Ⅰ을 듣고 실험·보고서 활동을 차근차근 이어 적어 두면 좋아요."
    }
  ];
}

function buildRecommendedSubjects(university: string, majorText: string, store: ScoreMemoryStore): SubjectCard[] {
  const labels = collectSchoolSubjectLabels(store);
  const isBusinessTrack = /경영|경제|무역|회계|경영학|경제학/.test(majorText);
  const base = isBusinessTrack
    ? businessCardsByUniversity(uniBucket(university), university, majorText)
    : genericNonBusinessCards(majorText || "희망 학과");

  return base.map((row) => {
    const status = inferSubjectStatus(row.name, labels);
    return { ...row, status };
  });
}

function StrategySubjectsPageInner() {
  const searchParams = useSearchParams();
  const seededGoals = useMemo(() => parseSeededGoals(searchParams), [searchParams.toString()]);
  const { goals } = useGoals(seededGoals);
  const { store, summary } = useScoreRecords();
  const rankedGoals = useMemo(() => {
    const filled = goals.filter((g) => g.university?.trim() && g.major?.trim()).slice(0, 3);
    return filled.length > 0 ? filled : defaultGoals;
  }, [goals]);
  const [selectedGoalIndex, setSelectedGoalIndex] = useState(0);

  useEffect(() => {
    if (selectedGoalIndex > rankedGoals.length - 1) {
      setSelectedGoalIndex(0);
    }
  }, [rankedGoals.length, selectedGoalIndex]);

  const selectedGoal = rankedGoals[selectedGoalIndex] ?? rankedGoals[0];
  const majorText = selectedGoal?.major?.trim() ?? "";
  const scoreLine = scoreHintLine(summary.schoolAverage, summary.mockAverage);
  const cards = useMemo(
    () => buildRecommendedSubjects(selectedGoal?.university ?? "", majorText, store),
    [selectedGoal?.university, majorText, store, store.updatedAt]
  );

  return (
    <>
      <PhoneFrame title="추천 수강과목">
        <SectionTabs
          tabs={[
            { href: "/strategy", label: "추천 전략" },
            { href: "/strategy/subjects", label: "추천 수강과목" },
            { href: "/strategy/study-plan", label: "추천 공부계획" }
          ]}
        />

        <div className="mb-4 space-y-2">
          <section className="rounded-xl bg-[#ebebeb] px-4 py-3">
            <h2 className="app-info-title">추천 수강과목이 중요한 이유</h2>
            <p className="mt-1 app-info-body">
              희망하는 대학·학과와 관련된 과목을 선택하면 입시에서 좋은 평가를 받을 수 있어요. 과목 선택은 한 번 결정하면 바꾸기 어려우니, 미리 확인하고 준비하는 것이 중요해요.
            </p>
          </section>
          <section className="rounded-xl bg-[#f7d3d3] px-4 py-3">
            <div className="app-info-title flex items-center gap-2 text-[#B42318]">
              <span aria-hidden="true">⚠️</span>
              <span>확인</span>
            </div>
            <p className="mt-1 app-info-body text-ink/85">
              선택과목은 한 번 정하면 학교 규정에 따라 변경이 어려울 수 있어요. 과목을 선택하기 전에는 꼭 담임 선생님이나 과목 선생님과 상담해보세요.
            </p>
          </section>
          <div className="grid grid-cols-3 gap-2 pt-1">
            {rankedGoals.map((goal, index) => {
              const isActive = selectedGoalIndex === index;
              const buttonLabel = compactGoalLine(goal.university, goal.major);
              return (
                <button
                  key={`${goal.university}-${goal.major}-${index}`}
                  type="button"
                  onClick={() => setSelectedGoalIndex(index)}
                  className={`goal-chip-button truncate ${
                    isActive ? "goal-chip-button-active" : "goal-chip-button-inactive"
                  }`}
                  title={`${goal.university} ${goal.major}`}
                >
                  {buttonLabel}
                </button>
              );
            })}
          </div>
          <p className="text-xs leading-snug text-muted">{scoreLine}</p>
        </div>

        <div className="space-y-4">
          {cards.map((subject, cardIndex) => (
            <article
              key={`${selectedGoalIndex}-${subject.name}-${cardIndex}`}
              className="rounded-[18px] border border-line bg-white px-4 py-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[20px] font-semibold leading-tight">{subject.name}</h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    subject.status === "이수 중" ? "bg-safe text-black" : "bg-danger text-black"
                  }`}
                >
                  {subject.status}
                </span>
              </div>
              <p className="mt-3 text-base font-medium leading-snug">{subject.reasonTitle}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink/85">{subject.reasonBody}</p>
            </article>
          ))}
        </div>
      </PhoneFrame>
      <BottomNav />
    </>
  );
}

export default function StrategySubjectsPage() {
  return (
    <Suspense
      fallback={
        <>
          <PhoneFrame title="추천 수강과목">
            <p className="text-sm text-muted">불러오는 중…</p>
          </PhoneFrame>
          <BottomNav />
        </>
      }
    >
      <StrategySubjectsPageInner />
    </Suspense>
  );
}
