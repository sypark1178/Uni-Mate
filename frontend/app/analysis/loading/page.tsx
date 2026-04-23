"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PhoneFrame } from "@/components/phone-frame";
import { mergeHrefWithSearchParams } from "@/lib/navigation";
import { getCurrentMember } from "@/lib/member-store";

export default function AnalysisLoadingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(18);
  const source = searchParams.get("source") ?? "goals";
  const currentUserKey = useMemo(() => getCurrentMember()?.userId?.trim() || "local-user", []);
  const analysisStorageKey = useMemo(() => `uni-mate-analysis-result:${currentUserKey}`, [currentUserKey]);

  const dashboardHref = useMemo(() => {
    const mergedHref = mergeHrefWithSearchParams("/dashboard?analysis=done", searchParams);
    return mergedHref;
  }, [searchParams]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setProgress((prev) => Math.min(prev + 11, 95));
    }, 260);

    const finish = window.setTimeout(() => {
      setProgress(100);
      const resultPayload = {
        completedAt: new Date().toISOString(),
        source
      };
      window.localStorage.setItem(analysisStorageKey, JSON.stringify(resultPayload));
      void fetch("/api/analysis/result", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-key": currentUserKey },
        body: JSON.stringify(resultPayload),
        keepalive: true
      });
      router.replace(dashboardHref);
    }, 2200);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(finish);
    };
  }, [analysisStorageKey, currentUserKey, dashboardHref, router, source]);

  return (
    <PhoneFrame
      title="AI 분석 진행중"
      subtitle="입시 정보와 목표 대학, 모집요강 근거를 함께 분석하고 있습니다. 분석이 끝나면 대시보드로 자동 이동합니다."
    >
      <div className="space-y-5">
        <div className="rounded-[24px] bg-navy p-6 text-white">
          <div className="h-2 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-4 text-sm font-semibold">{progress}%</div>
          <ul className="mt-5 space-y-3 text-sm text-white/80">
            <li>학생부와 성적 데이터를 정리하고 있어요.</li>
            <li>대학별 모집요강 근거를 찾아 비교하고 있어요.</li>
            <li>합격 가능성 점수와 전략 카드를 갱신하고 있어요.</li>
          </ul>
        </div>
      </div>
    </PhoneFrame>
  );
}
