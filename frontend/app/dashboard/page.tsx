"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { EmptyState } from "@/components/empty-state";
import { EvidenceModal } from "@/components/evidence-modal";
import { PhoneFrame } from "@/components/phone-frame";
import { mergeHrefWithSearchParams, safeNavigate } from "@/lib/navigation";
import { ddayItems, emptyProfile } from "@/lib/mock-data";
import { buildGoalAnalyses, buildStrategyRecommendations, parseSeededGoals } from "@/lib/planning";
import { isDraftDirty, markDraftDirty } from "@/lib/draft-store";
import { useStudentProfile } from "@/lib/profile-storage";
import { useScoreRecords } from "@/lib/score-storage";
import { useGoals } from "@/lib/use-goals";
import type { Recommendation } from "@/lib/types";

function getCategoryToneByScore(score: number) {
  if (score >= 72) return "bg-safe";
  if (score >= 55) return "bg-normal";
  return "bg-danger";
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Recommendation | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [analysisNotice, setAnalysisNotice] = useState("");
  const [saveNotice, setSaveNotice] = useState("");

  const isEmpty = searchParams.get("empty") === "1";
  const analysisDone = searchParams.get("analysis") === "done";
  const { studentProfile, hydrated: profileHydrated, flushProfileToServer } = useStudentProfile();
  const { flushStoreToServer } = useScoreRecords();
  const currentProfile = isEmpty ? emptyProfile : studentProfile;
  const seededGoals = useMemo(() => parseSeededGoals(searchParams), [searchParams.toString()]);
  const { goals, flushGoalsToServer } = useGoals(seededGoals);
  const goalAnalyses = useMemo(() => buildGoalAnalyses(goals), [goals]);
  const strategyRecommendations = useMemo(() => buildStrategyRecommendations(goals), [goals]);
  const primaryGoal = goals[0];

  const currentSearch = searchParams.toString();
  const dashboardCurrentHref = currentSearch ? `/dashboard?${currentSearch}` : "/dashboard";
  const strategyHref = mergeHrefWithSearchParams("/strategy", searchParams);
  const analysisLoadingHref = mergeHrefWithSearchParams("/analysis/loading?source=dashboard", searchParams);
  const goalsBaseHref = mergeHrefWithSearchParams("/onboarding/goals", searchParams);
  const goalsHref = `${goalsBaseHref}${goalsBaseHref.includes("?") ? "&" : "?"}returnTo=${encodeURIComponent(dashboardCurrentHref)}`;
  const signupEntryHref = `/signup?returnTo=${encodeURIComponent(dashboardCurrentHref)}`;

  const summary = useMemo(
    () => ({
      safe: strategyRecommendations.filter((item) => item.category === "안정").length,
      normal: strategyRecommendations.filter((item) => item.category === "적정").length,
      challenge: strategyRecommendations.filter((item) => item.category === "도전").length
    }),
    [strategyRecommendations]
  );

  useEffect(() => {
    let cancelled = false;
    const hydrateNotice = async () => {
      try {
        const response = await fetch("/api/analysis/result", { method: "GET", cache: "no-store" });
        if (response.ok) {
          const payload = (await response.json()) as { data?: { completedAt?: string; source?: string } | null };
          if (!cancelled && payload.data?.completedAt) {
            setAnalysisNotice(`최근 AI 분석 완료: ${payload.data.source ?? "unknown"} 기준 결과가 반영되었습니다.`);
            return;
          }
        }
      } catch {
        // Fallback to localStorage below.
      }

      try {
        const raw = window.localStorage.getItem("uni-mate-analysis-result");
        if (!raw) {
          if (!cancelled) setAnalysisNotice("");
          return;
        }
        const parsed = JSON.parse(raw) as { completedAt?: string; source?: string };
        if (!cancelled && parsed.completedAt) {
          setAnalysisNotice(`최근 AI 분석 완료: ${parsed.source ?? "unknown"} 기준 결과가 반영되었습니다.`);
          return;
        }
      } catch {
        if (!cancelled) setAnalysisNotice("");
      }
    };

    if (analysisDone) {
      setAnalysisNotice("AI 분석이 완료되어 대시보드 결과가 새로 반영되었습니다.");
      return;
    }
    void hydrateNotice();
    return () => {
      cancelled = true;
    };
  }, [analysisDone]);

  const handleSaveAll = async () => {
    await flushProfileToServer();
    await flushStoreToServer();
    await flushGoalsToServer();
    // 저장 후에도 화면 표시 상태는 유지하고, "미저장 변경" 상태만 해제한다.
    markDraftDirty(false);
    setSaveNotice("변경사항을 저장했습니다.");
    window.setTimeout(() => setSaveNotice(""), 2500);
  };

  return (
    <>
      <PhoneFrame>
        <div className="px-4 pb-28">
            <div className="mb-4 flex items-start justify-between gap-3 px-2">
              <div>
                <div className="mb-1 text-base text-muted">안녕하세요</div>
                <div className="flex items-center gap-2">
                  <div className="text-[27px] font-bold leading-none">{currentProfile.name}님</div>
                  {!isEmpty ? (
                    <div className="rounded-full bg-[#128F171F] px-3 py-1 text-xs">{currentProfile.gradeLabel}</div>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => safeNavigate(router, signupEntryHref)}
                  aria-label="회원가입"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-navy shadow-soft"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                    <path
                      d="M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M19 6v4M17 8h4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                {isEmpty ? (
                  <button
                    type="button"
                    onClick={() => safeNavigate(router, signupEntryHref)}
                    className="min-w-[82px] rounded-lg border border-line bg-white px-4 py-2 text-center text-base"
                  >
                    가입하기
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleSaveAll()}
                    className="min-w-[82px] rounded-lg border border-line bg-white px-4 py-2 text-base"
                  >
                    저장
                  </button>
                )}
              </div>
            </div>

            {!isEmpty ? (
              <div className="space-y-4">
                {!profileHydrated ? (
                  <section className="rounded-[18px] border border-line bg-white px-4 py-3 text-sm text-muted">
                    최근 작업 정보를 불러오는 중입니다...
                  </section>
                ) : null}
                {analysisNotice ? (
                  <section className="rounded-[18px] border border-[#b8d4ff] bg-[#f1f6ff] px-4 py-3 text-sm text-navy">
                    {analysisNotice}
                  </section>
                ) : null}
                {saveNotice ? (
                  <section className="rounded-[18px] border border-[#cbe7d0] bg-[#f1fcf4] px-4 py-3 text-sm text-[#166534]">
                    {saveNotice}
                  </section>
                ) : null}
                {!isEmpty && isDraftDirty() ? (
                  <section className="rounded-[18px] border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-xs text-[#92400e]">
                    저장되지 않은 변경사항이 있습니다. 종료 전 `저장` 버튼으로 DB에 반영해 주세요.
                  </section>
                ) : null}

                <section className="overflow-hidden rounded-[20px] bg-navy text-white shadow-soft ring-1 ring-white/15">
                  <div className="px-4 py-4">
                    <div className="text-sm font-bold">AI 전략 요약</div>
                    <p className="mt-2 text-xs leading-6 text-white/80">
                      1지망 목표 대학{" "}
                      <span className="font-semibold text-white">{primaryGoal?.university ?? "미설정"}</span>{" "}
                      {primaryGoal?.major?.trim() ? primaryGoal.major.trim() : ""}
                    </p>
                    <div className="mt-4 rounded-2xl bg-white/[0.08] px-4 py-4 ring-1 ring-white/10">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-10 w-1 shrink-0 rounded-full bg-[#FC8B00]" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <h2 className="text-lg font-bold leading-snug tracking-tight">수시 6장 전략 준비중</h2>
                          <p className="mt-2 text-xs leading-6 text-white/75">
                            안정 {summary.safe} / 적정 {summary.normal} / 도전 {summary.challenge}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => safeNavigate(router, strategyHref)}
                              className="rounded-full bg-[#E6F1FB] px-3 py-2 text-xs font-bold text-navy"
                            >
                              수시 6장 보러가기
                            </button>
                            <button
                              type="button"
                              onClick={() => safeNavigate(router, analysisLoadingHref)}
                              className="rounded-full bg-white/15 px-3 py-2 text-xs font-bold text-white ring-1 ring-white/20"
                            >
                              AI 분석 다시하기
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[20px] bg-[#F2B5B57A] px-4 py-4 shadow-soft">
                  <div className="text-sm font-bold">입시 정보 업데이트</div>
                  <p className="mt-2 text-xs leading-6">
                    목표 대학의 주요 입시 정보에 변경 가능성이 있습니다. {primaryGoal?.university ?? "목표대학"}{" "}
                    {primaryGoal?.major ?? ""} 모집요강 근거를 다시 확인해 주세요.
                  </p>
                  <Link href="/evidence" className="mt-2 inline-block text-xs font-bold text-[#8C0000]">
                    확인하기
                  </Link>
                </section>

                <section className="rounded-[20px] bg-[#EBEBEB] px-4 py-4 shadow-soft">
                  <div className="text-sm font-bold">AI 페이스메이커</div>
                  <p className="mt-2 text-xs leading-6">
                    목표 대학 3개와 전략 6장을 분리해서 보면 우선순위가 더 선명해집니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => safeNavigate(router, analysisLoadingHref)}
                    className="mt-3 inline-block text-xs font-bold text-navy"
                  >
                    AI 분석 이어서 보기
                  </button>
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between px-1">
                    <h2 className="text-lg font-bold">목표대학 / 학과</h2>
                    <button
                      type="button"
                      onClick={() => safeNavigate(router, goalsHref)}
                      className="rounded-full border border-line bg-white px-3 py-2 text-sm font-semibold text-navy"
                    >
                      수정
                    </button>
                  </div>
                  <div className="space-y-3">
                    {goalAnalyses.map((item, index) => (
                      <article key={item.id} className="rounded-[18px] border border-line bg-white px-4 py-4 shadow-soft">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${getCategoryToneByScore(
                              item.fitScore
                            )}`}
                          >
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold">
                              {item.university} - {item.major}
                            </div>
                            <div className="mt-1 text-sm text-muted">목표 카드 / 우선순위 {index + 1}</div>
                          </div>
                          <div
                            className={`inline-flex min-w-[72px] items-center justify-center rounded-full px-3 py-2 text-xs font-bold ${getCategoryToneByScore(
                              item.fitScore
                            )}`}
                          >
                            {item.category} {item.fitScore}%
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-mist px-3 py-3">
                          <div className="text-xs text-muted">{item.notes}</div>
                          <button
                            type="button"
                            onClick={() => setSelected(item)}
                            className="shrink-0 rounded-full border border-line bg-white px-3 py-2 text-xs font-bold text-navy"
                          >
                            근거 보기
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="mb-3 px-1 text-lg font-bold">주요 D-Day</div>
                  <div className="space-y-3">
                    {ddayItems.map((item, index) => (
                      <div key={item.label} className="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3">
                        <span className="text-lg">{item.label}</span>
                        <span
                          className={`rounded-full px-3 py-2 text-xs font-bold ${
                            index === 0 ? "bg-[#D30F0F4F]" : "bg-[#0169C34F]"
                          }`}
                        >
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState />
              </div>
            )}
        </div>
      </PhoneFrame>

      <BottomNav />
      <EvidenceModal evidence={selected?.evidence ?? null} onClose={() => setSelected(null)} />

      {showSaveModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowSaveModal(false)}>
          <div
            className="w-full max-w-[360px] rounded-[20px] border border-ink bg-white p-5 text-center"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-2xl font-bold">분석 결과 저장</h2>
            <p className="mt-4 text-base leading-7 text-ink/80">
              가입하면 다음에도 이어서 사용할 수 있어요.
              <br />
              이메일이나 간편 계정으로 바로 연결해 주세요.
            </p>
            <div className="mt-5 grid gap-3">
              <Link href={`${signupEntryHref}&provider=email`} className="rounded-xl border border-ink px-4 py-3 text-lg">
                이메일로 가입
              </Link>
              <Link href={`${signupEntryHref}&provider=kakao`} className="rounded-xl border border-ink px-4 py-3 text-lg">
                카카오로 가입
              </Link>
              <button className="rounded-xl border border-ink px-4 py-3 text-lg" onClick={() => setShowSaveModal(false)}>
                나중에 하기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
