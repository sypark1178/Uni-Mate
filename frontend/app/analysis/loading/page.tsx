"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PhoneFrame } from "@/components/phone-frame";
import { mergeHrefWithSearchParams } from "@/lib/navigation";
import { getCurrentMember } from "@/lib/member-store";

export default function AnalysisLoadingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [matchingCount, setMatchingCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const source = searchParams.get("source") ?? "goals";
  const currentUserKey = useMemo(() => getCurrentMember()?.userId?.trim() || "local-user", []);
  const analysisStorageKey = useMemo(() => `uni-mate-analysis-result:${currentUserKey}`, [currentUserKey]);
  const totalScreenings = 3427;

  const dashboardHref = useMemo(() => {
    const mergedHref = mergeHrefWithSearchParams("/dashboard?analysis=done", searchParams);
    return mergedHref;
  }, [searchParams]);

  useEffect(() => {
    const startedAt = Date.now();
    const totalMs = 6200;
    const stage1Ms = 1900;
    const stage2Ms = 3800;
    const stage3Ms = 5400;

    const tick = window.setInterval(() => {
      if (isFinished) {
        return;
      }
      const elapsed = Date.now() - startedAt;
      const ratio = Math.min(elapsed / totalMs, 1);
      const eased = 1 - Math.pow(1 - ratio, 2);
      const nextProgress = Math.min(99, Math.floor(eased * 100));
      setProgress(nextProgress);

      // 진행률과 함께 매칭 수가 자연스럽게 증가하도록 보정
      const baseline = Math.floor((nextProgress / 100) * 32);
      const wobble = Math.floor(Math.random() * 3);
      const nextMatching = Math.min(32, baseline + wobble);
      setMatchingCount(nextMatching);

      if (elapsed >= stage3Ms) {
        setMatchingCount(32);
      }
    }, 140);

    const finish = window.setTimeout(() => {
      setIsFinished(true);
      setProgress(100);
      setMatchingCount(32);
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
      window.setTimeout(() => router.replace(dashboardHref), 1800);
    }, totalMs);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(finish);
    };
  }, [analysisStorageKey, currentUserKey, dashboardHref, isFinished, router, source]);

  const isSchoolDone = progress >= 35;
  const isMatchingDone = progress >= 65;
  const isReportDone = progress >= 88;
  const isAllDone = progress >= 100;
  const showLine1 = progress >= 18;
  const showLine2 = progress >= 40;
  const showLine3 = progress >= 62;
  const matchingMessage = isAllDone
    ? `${totalScreenings.toLocaleString()}개 전형 중 32개 매칭 완료`
    : `${totalScreenings.toLocaleString()}개 전형 중 ${matchingCount}개 매칭 중...`;

  return (
    <PhoneFrame fullBleed statusBarClassName="bg-navy" deviceClassName="bg-white" bottomPaddingClassName="pb-0">
      <div className="min-h-full bg-navy px-8 py-16 text-white">
        <div className="flex flex-col items-center">
        <div className="relative mb-8 h-24 w-24">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.28)" strokeWidth="8" fill="none" />
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="#F59E0B"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${(2 * Math.PI * 40 * progress) / 100} ${2 * Math.PI * 40}`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-xl font-bold">{progress}%</div>
        </div>

        <h1 className="text-[34px] font-bold leading-tight">{isAllDone ? "AI 분석 완료" : "AI 분석 중 ..."}</h1>
        {!isAllDone ? <p className="mt-2 text-xs font-semibold text-white/85">{matchingMessage}</p> : null}

        {!isAllDone ? (
          <>
            <div className="mt-6 text-center text-sm leading-6 text-white/85">
              <p>성적 데이터를 기반으로</p>
              <p>맞춤 전형을 찾고 있어요</p>
            </div>

            <ul className="mt-8 space-y-3 text-sm font-medium text-white/95">
              {showLine1 ? (
                <li className="flex items-center justify-center gap-3">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-[#F59E0B] text-[10px] leading-none text-white">✓</span>
                  <span>{isSchoolDone ? "내신 분석 완료" : "내신 분석 중..."}</span>
                </li>
              ) : null}
              {showLine2 ? (
                <li className="flex items-center justify-center gap-3">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-[#F59E0B] text-[10px] leading-none text-white">✓</span>
                  <span>{isMatchingDone ? "전형 매칭 완료" : "전형 매칭 진행 중..."}</span>
                </li>
              ) : null}
              {showLine3 ? (
                <li className="flex items-center justify-center gap-3">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-[#F59E0B] text-[10px] leading-none text-white">✓</span>
                  <span>{isReportDone ? "리포트 생성 완료" : "리포트 생성 중..."}</span>
                </li>
              ) : null}
            </ul>
          </>
        ) : null}
        </div>
      </div>
    </PhoneFrame>
  );
}
