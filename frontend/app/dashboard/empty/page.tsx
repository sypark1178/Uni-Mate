import { BottomNav } from "@/components/bottom-nav";
import { EmptyState } from "@/components/empty-state";
import { PhoneFrame } from "@/components/phone-frame";
import { SectionTabs } from "@/components/section-tabs";

export default function DashboardEmptyPage() {
  return (
    <>
      <PhoneFrame title="분석 후 기본정보 미기입" subtitle="정보가 없는 경우 우선 노출해야 하는 상태를 별도 화면으로 구성했습니다.">
        <SectionTabs
          tabs={[
            { href: "/dashboard", label: "메인" },
            { href: "/dashboard/save", label: "저장하기" },
            { href: "/dashboard/empty", label: "정보 없음" },
            { href: "/dashboard/signup", label: "가입 유도" }
          ]}
        />
        <EmptyState />
      </PhoneFrame>
      <BottomNav />
    </>
  );
}
