import { Suspense } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { PhoneFrame } from "@/components/phone-frame";
import { DataQueryView } from "./data-query-view";

function DataQueryLoading() {
  return (
    <>
      <PhoneFrame title="데이터 조회" subtitle="불러오는 중입니다.">
        <p className="text-sm text-muted">테이블 정보를 준비하고 있어요.</p>
      </PhoneFrame>
      <BottomNav />
    </>
  );
}

export default function SettingsDataPage() {
  return (
    <Suspense fallback={<DataQueryLoading />}>
      <DataQueryView />
    </Suspense>
  );
}
