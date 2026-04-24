import { Suspense } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { PhoneFrame } from "@/components/phone-frame";
import { SettingsView } from "./settings-view";

function SettingsLoading() {
  return (
    <>
      <PhoneFrame title="설정" subtitle="불러오는 중입니다.">
        <p className="text-sm text-muted">설정 화면을 준비하고 있어요.</p>
      </PhoneFrame>
      <BottomNav />
    </>
  );
}

/** useSearchParams는 Suspense 경계 안에서 써야 빌드·미리보기에서 안정적입니다. */
export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsView />
    </Suspense>
  );
}
