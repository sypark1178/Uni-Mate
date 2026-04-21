import { BottomNav } from "@/components/bottom-nav";
import { PhoneFrame } from "@/components/phone-frame";
import { SectionTabs } from "@/components/section-tabs";

const subjects = [
  { name: "확률과 통계", reason: "경영/경제 계열 교과 적합도 강화" },
  { name: "사회문화", reason: "학생부 서술과 탐구 일관성 강화" },
  { name: "경제", reason: "전공 적합도 핵심 과목" }
];

export default function StrategySubjectsPage() {
  return (
    <>
      <PhoneFrame title="추천 수강과목" subtitle="전략추천 하위 화면을 별도 라우트로 분리했습니다.">
        <SectionTabs
          tabs={[
            { href: "/strategy", label: "전략 추천" },
            { href: "/strategy/subjects", label: "추천 수강과목" }
          ]}
        />
        <div className="space-y-3">
          {subjects.map((subject) => (
            <article key={subject.name} className="rounded-[22px] border border-line bg-white p-4 shadow-sm">
              <div className="text-base font-semibold">{subject.name}</div>
              <p className="mt-2 text-sm leading-6 text-muted">{subject.reason}</p>
            </article>
          ))}
        </div>
      </PhoneFrame>
      <BottomNav />
    </>
  );
}
