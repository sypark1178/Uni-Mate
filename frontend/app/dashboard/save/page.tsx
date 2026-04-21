import { BottomNav } from "@/components/bottom-nav";
import { PhoneFrame } from "@/components/phone-frame";
import { SaveResultCard } from "@/components/save-result-card";
import { SectionTabs } from "@/components/section-tabs";

export default function DashboardSavePage() {
  return (
    <>
      <PhoneFrame title="메인 대시보드 저장하기" subtitle="원본 화면의 저장 팝업을 독립 화면으로도 확인할 수 있게 정리했습니다.">
        <SectionTabs
          tabs={[
            { href: "/dashboard", label: "메인" },
            { href: "/dashboard/save", label: "저장하기" },
            { href: "/dashboard/empty", label: "정보 없음" },
            { href: "/dashboard/signup", label: "가입 유도" }
          ]}
        />
        <SaveResultCard />
      </PhoneFrame>
      <BottomNav />
    </>
  );
}
