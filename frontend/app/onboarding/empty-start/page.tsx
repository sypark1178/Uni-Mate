"use client";

import { useEffect } from "react";
import { clearUniMateBrowserState } from "@/lib/clear-uni-mate-client-storage";

const NEXT_BASIC = "/onboarding/basic";

/**
 * 저장 데이터를 비운 뒤 온보딩 1단계로 이동.
 * `router.replace` 대신 전체 로드하여 메모리·훅 상태와 스토리지를 맞춘다.
 */
export default function OnboardingEmptyStartPage() {
  useEffect(() => {
    try {
      clearUniMateBrowserState();
    } catch {
      /* noop */
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    if (!origin) return;
    window.location.replace(`${origin}${NEXT_BASIC}`);
  }, []);

  return (
    <div className="flex min-h-[40dvh] w-full items-center justify-center bg-mist px-6 text-center text-sm text-muted">
      온보딩을 새로 시작하는 중…
    </div>
  );
}
