"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { EmptyState } from "@/components/empty-state";
import { EvidenceModal } from "@/components/evidence-modal";
import { mergeHrefWithSearchParams, safeNavigate } from "@/lib/navigation";
import { ddayItems, emptyProfile, profile } from "@/lib/mock-data";
import { buildGoalAnalyses, buildStrategyRecommendations, parseSeededGoals } from "@/lib/planning";
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

  const isEmpty = searchParams.get("empty") === "1";
  const analysisDone = searchParams.get("analysis") === "done";
  const currentProfile = isEmpty ? emptyProfile : profile;
  const seededGoals = parseSeededGoals(searchParams);
  const { goals } = useGoals(seededGoals);
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
    if (analysisDone) {
      setAnalysisNotice("AI 분석이 완료되어 대시보드 결과가 새로 반영되었습니다.");
      return;
    }

    try {
      const raw = window.localStorage.getItem("uni-mate-analysis-result");
      if (!raw) {
        setAnalysisNotice("");
        return;
      }

      const parsed = JSON.parse(raw) as { completedAt?: string; source?: string };
      if (parsed.completedAt) {
        setAnalysisNotice(`최근 AI 분석 완료: ${parsed.source ?? "unknown"} 기준 결과가 반영되었습니다.`);
      }
    } catch {
      setAnalysisNotice("");
    }
  }, [analysisDone]);

  return (
    <>
      <main className="app-shell flex min-h-screen justify-center px-4 py-6">
        <section className="relative w-full max-w-[430px] overflow-hidden rounded-phone border border-white/70 bg-white shadow-soft">
          <div className="flex items-center justify-between px-6 pb-3 pt-5 text-sm font-semibold">
            <span>9:41</span>
            <div className="flex items-center gap-2">
              <span className="h-3 w-5 rounded bg-black" />
              <span className="h-3 w-4 rounded bg-black" />
              <span className="h-3 w-6 rounded border border-black bg-white" />
            </div>
          </div>

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
                    onClick={() => setShowSaveModal(true)}
                    className="min-w-[82px] rounded-lg border border-line bg-white px-4 py-2 text-base"
                  >
                    저장
                  </button>
                )}
              </div>
            </div>

            {!isEmpty ? (
              <div className="space-y-4">
                {analysisNotice ? (
                  <section className="rounded-[18px] border border-[#b8d4ff] bg-[#f1f6ff] px-4 py-3 text-sm text-navy">
                    {analysisNotice}
                  </section>
                ) : null}

                <section className="rounded-[24px] bg-navy px-4 py-4 text-white">
                  <div className="text-sm text-white/80">
                    AI 전략 요약 / 1지망 목표 대학 {primaryGoal?.university ?? "미설정"} {primaryGoal?.major ?? ""}
                  </div>
                  <h1 className="mt-2 text-2xl font-bold">수시 6장 전략 준비중</h1>
                  <p className="mt-2 text-sm text-white/80">
                    안정 {summary.safe} / 적정 {summary.normal} / 도전 {summary.challenge}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
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
                      className="rounded-full bg-white/15 px-3 py-2 text-xs font-bold text-white"
                    >
                      AI 분석 다시하기
                    </button>
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
        </section>
      </main>

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
