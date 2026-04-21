import { BottomNav } from "@/components/bottom-nav";
import { PhoneFrame } from "@/components/phone-frame";
import { SectionTabs } from "@/components/section-tabs";
import { SimulationPanel } from "@/components/simulation-panel";

export default function AnalysisSimulationPage() {
  return (
    <>
      <PhoneFrame title="시뮬레이션" subtitle="원본 시뮬레이션 화면을 분리해 조건 변화에 따른 합격 가능성 변화를 즉시 보이게 했습니다.">
        <SectionTabs
          tabs={[
            { href: "/analysis", label: "전형 탐색" },
            { href: "/analysis/gap", label: "갭 분석" },
            { href: "/analysis/simulation", label: "시뮬레이션" }
          ]}
        />
        <SimulationPanel baseRate={31} />
      </PhoneFrame>
      <BottomNav />
    </>
  );
}
