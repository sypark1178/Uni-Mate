 "use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { PhoneFrame } from "@/components/phone-frame";
import { SectionTabs } from "@/components/section-tabs";
import { parseSeededGoals } from "@/lib/planning";
import { useGoals } from "@/lib/use-goals";

type SubjectCard = {
  name: string;
  status: "이수 중" | "미이수";
  reasonTitle: string;
  reasonBody: string;
};

function buildRecommendedSubjects(majorText: string): SubjectCard[] {
  const isBusinessTrack = /경영|경제|무역|회계|경영학|경제학/.test(majorText);
  if (isBusinessTrack) {
    return [
      {
        name: "사회 - 경제",
        status: "이수 중",
        reasonTitle: "경영 / 경제 전공 필수 기반과목",
        reasonBody: "현재 선택과목에 포함. 계속 유지하세요."
      },
      {
        name: "사회 - 사회·문화",
        status: "미이수",
        reasonTitle: "소통 / 협업 역량 면제 신청",
        reasonBody: "선택 가능하면 추가 권장. 대체 시 정치와 법 / 생활과 윤리 고려."
      },
      {
        name: "수학 - 확률과 통계",
        status: "미이수",
        reasonTitle: "데이터 분석·경영통계 기반",
        reasonBody: "경영 계열 필수 권장과목. 학교 교육과정 확인 후 이수 강력 권장."
      }
    ];
  }

  return [
    {
      name: "수학 - 미적분",
      status: "이수 중",
      reasonTitle: "자연/공학 계열 전공 적합도 강화",
      reasonBody: "이미 수강 중인 과목입니다. 성취도 유지가 중요합니다."
    },
    {
      name: "과학 - 물리학Ⅰ",
      status: "미이수",
      reasonTitle: "전공 기초역량과 탐구 일관성 보완",
      reasonBody: "가능하면 다음 학기 선택 권장. 미선택 시 대체 과목 계획이 필요합니다."
    },
    {
      name: "과학 - 화학Ⅰ",
      status: "미이수",
      reasonTitle: "학과 연계 탐구활동 확장",
      reasonBody: "전공 연계 보고서/세특과 함께 구성하면 효과가 큽니다."
    }
  ];
}

export default function StrategySubjectsPage() {
  const searchParams = useSearchParams();
  const seededGoals = useMemo(() => parseSeededGoals(searchParams), [searchParams.toString()]);
  const { goals } = useGoals(seededGoals);
  const firstGoal = goals[0];
  const majorText = firstGoal?.major?.trim() ?? "";
  const cards = useMemo(() => buildRecommendedSubjects(majorText), [majorText]);

  return (
    <>
      <PhoneFrame title="추천 수강과목">
        <SectionTabs
          tabs={[
            { href: "/strategy", label: "전략 추천" },
            { href: "/strategy/subjects", label: "추천 수강과목" },
            { href: "/strategy/study-plan", label: "공부 계획" }
          ]}
        />

        <div className="mb-4 space-y-2">
          <section className="rounded-xl bg-[#ebebeb] px-4 py-3">
            <h2 className="text-base font-semibold leading-tight">수강과목이 중요한 이유</h2>
            <p className="mt-2 text-sm leading-snug text-muted">
              목표 대학·학과의 전공 연계 권장 과목을 이수하면 전공적합성 평가에서 유리해요. 잘못된 선택은 되돌리기 어려우니 지금 확인하세요.
            </p>
          </section>
          <section className="rounded-xl bg-[#f7d3d3] px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#B42318]">
              <span aria-hidden="true">⚠️</span>
              <span>확인</span>
            </div>
            <p className="mt-1 text-sm leading-snug text-ink/85">
              선택과목 변경은 학교 교육과정에 따라 제한될 수 있으므로 담임·교과 선생님과 반드시 먼저 확인하세요.
            </p>
          </section>
        </div>

        <div className="space-y-4">
          {cards.map((subject) => (
            <article key={subject.name} className="rounded-[18px] border border-line bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[20px] font-semibold leading-tight">{subject.name}</h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    subject.status === "이수 중" ? "bg-safe text-ink" : "bg-danger text-ink"
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
