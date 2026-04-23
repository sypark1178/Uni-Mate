import { BottomNav } from "@/components/bottom-nav";
import { PhoneFrame } from "@/components/phone-frame";
import { SectionTabs } from "@/components/section-tabs";

const weeklyPlan = [
  { day: "월", task: "수학 오답 정리 60분 + 영어 독해 2지문" },
  { day: "화", task: "국어 비문학 2세트 + 사탐 개념 복습" },
  { day: "수", task: "수학 실전 1세트 + 영어 어휘 점검" },
  { day: "목", task: "국어 문학 1세트 + 사탐 기출 20문항" },
  { day: "금", task: "주간 오답 재풀이 + 약점 단원 보완" }
];

export default function StrategyStudyPlanPage() {
  return (
    <>
      <PhoneFrame title="공부 계획" subtitle="전략 추천 흐름에 맞춘 주간 학습 계획을 확인합니다.">
        <SectionTabs
          tabs={[
            { href: "/strategy", label: "전략 추천" },
            { href: "/strategy/subjects", label: "추천 수강과목" },
            { href: "/strategy/study-plan", label: "공부 계획" }
          ]}
        />
        <div className="space-y-3">
          {weeklyPlan.map((item) => (
            <article key={item.day} className="rounded-[22px] border border-line bg-white p-4">
              <div className="text-base font-semibold">{item.day}요일</div>
              <p className="mt-2 text-sm leading-6 text-muted">{item.task}</p>
            </article>
          ))}
        </div>
      </PhoneFrame>
      <BottomNav />
    </>
  );
}
