"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { EmptyState } from "@/components/empty-state";
import { PhoneFrame } from "@/components/phone-frame";
import { mergeHrefWithSearchParams, safeNavigate } from "@/lib/navigation";
import { ddayItems, emptyProfile, initialSimulation } from "@/lib/mock-data";
import { buildGoalAnalyses, buildStrategyRecommendations, estimateEnglishPaceDelta } from "@/lib/planning";
import type { ScoreMemoryStore } from "@/lib/types";
import { isDraftDirty, markDraftDirty } from "@/lib/draft-store";
import { useStudentProfile } from "@/lib/profile-storage";
import { useScoreRecords } from "@/lib/score-storage";
import { useGoals } from "@/lib/use-goals";
import { getCurrentMember } from "@/lib/member-store";

function getCategoryToneByScore(score: number) {
  if (score >= 72) return "bg-safe";
  if (score >= 55) return "bg-normal";
  return "bg-danger";
}

function getCategoryTone(category: "도전" | "적정" | "안정") {
  if (category === "도전") return "bg-danger";
  if (category === "적정") return "bg-normal";
  return "bg-safe";
}

function normalizeGradeLabel(label: string) {
  const raw = String(label ?? "").trim();
  if (!raw) return "고2";
  if (/^고\s*\d$/.test(raw)) {
    return raw.replace(/\s+/g, "");
  }
  if (/^\d$/.test(raw)) {
    return `고${raw}`;
  }
  const match = raw.match(/^(\d)\s*학년$/);
  if (match) {
    return `고${match[1]}`;
  }
  return raw;
}

function getLatestEnglishMockGrade(store: ScoreMemoryStore): number | null {
  const exams = store.mockExams;
  for (let i = exams.length - 1; i >= 0; i -= 1) {
    const entry = exams[i]?.subjects.find((s) => s.subject.trim() === "영어" && s.score.trim());
    if (entry?.score.trim()) {
      const n = Number(entry.score.trim());
      if (Number.isFinite(n) && n >= 1 && n <= 9) {
        return n;
      }
    }
  }
  return null;
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [analysisNotice, setAnalysisNotice] = useState("");
  const [saveNotice, setSaveNotice] = useState("");

  const isEmpty = searchParams.get("empty") === "1";
  const analysisDone = searchParams.get("analysis") === "done";
  const { studentProfile, hydrated: profileHydrated, flushProfileToServer } = useStudentProfile();
  const { store, summary: scoreSummary, flushStoreToServer } = useScoreRecords();
  const currentProfile = isEmpty ? emptyProfile : studentProfile;
  const memberDisplayName = useMemo(() => {
    const memberName = getCurrentMember()?.name?.trim() || "";
    return memberName || currentProfile.name;
  }, [currentProfile.name]);
  const gradeBadgeLabel = useMemo(() => normalizeGradeLabel(studentProfile.gradeLabel), [studentProfile.gradeLabel]);
  const { goals, flushGoalsToServer } = useGoals();
  const goalAnalyses = useMemo(() => buildGoalAnalyses(goals), [goals]);
  const strategyRecommendations = useMemo(() => buildStrategyRecommendations(goals), [goals]);
  const primaryGoal = goals[0];

  const currentSearch = searchParams.toString();
  const dashboardCurrentHref = currentSearch ? `/dashboard?${currentSearch}` : "/dashboard";
  const strategyHref = mergeHrefWithSearchParams("/strategy", searchParams);
  const analysisLoadingHref = mergeHrefWithSearchParams("/analysis/loading?source=dashboard", searchParams);
  const gradesReanalysisHref = mergeHrefWithSearchParams("/onboarding/grades", searchParams);
  const simulationHref = mergeHrefWithSearchParams("/analysis/simulation", searchParams);
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

  const paceMessage = useMemo(() => {
    const uni = primaryGoal?.university ?? "목표 대학";
    const major = primaryGoal?.major?.trim() ?? "";
    const english = getLatestEnglishMockGrade(store);
    const mockAvg = Number.parseFloat(scoreSummary.mockAverage);
    const currentPoint =
      english ?? (Number.isFinite(mockAvg) ? mockAvg : initialSimulation.mock);
    const delta = estimateEnglishPaceDelta(uni, currentPoint);
    const targetLine = major ? `${uni} ${major}` : uni;
    return `영어(수능·모의) 등급을 ${delta}만 더 끌어올리면 1지망 ${targetLine} 합격 가능성에 한 걸음 더 가까워집니다.`;
  }, [store, scoreSummary.mockAverage, primaryGoal?.university, primaryGoal?.major]);

  const profileSummaryLine = useMemo(() => {
    if (!primaryGoal) {
      return "목표대학/학과 미설정";
    }
    const university = primaryGoal.university?.trim() || "미설정";
    const major = primaryGoal.major?.trim() || "미설정";
    return `${university} ${major}`;
  }, [primaryGoal]);

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
            <div className="mb-3 flex items-center justify-between gap-3 px-2">
              <div>
                <div className="mb-0.5 text-base leading-tight text-muted">안녕하세요</div>
                <div className="flex items-center gap-2">
                  <div className="max-w-[170px] truncate text-[27px] font-bold leading-tight">{memberDisplayName}님</div>
                  <div className="rounded-full bg-[#128F171F] px-3 py-1 text-xs leading-none">{gradeBadgeLabel}</div>
                </div>
                {!isEmpty ? <div className="mt-1 max-w-[240px] truncate whitespace-nowrap text-xs leading-tight text-muted">{profileSummaryLine}</div> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => safeNavigate(router, signupEntryHref)}
                  aria-label="회원가입"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-black"
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
              <div className="space-y-3">
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

                <section className="overflow-hidden rounded-[20px] bg-navy text-white ring-1 ring-white/15">
                  <div className="px-3 py-3">
                    <div className="text-sm font-bold leading-tight">📊 AI 전략 요약</div>
                    <div className="mt-1.5">
                      <p className="text-xs font-bold leading-snug text-white/95">
                        <span className="inline-block max-w-[260px] truncate align-bottom">
                          1지망 목표 대학 - {primaryGoal?.university ?? "미설정"}
                          {primaryGoal?.major?.trim() ? ` ${primaryGoal.major.trim()}` : ""}
                        </span>
                      </p>
                    </div>
                    <div className="mt-3 rounded-xl border border-white/15 bg-white/[0.1] px-3 py-3">
                      <div className="min-w-0">
                        <h2 className="text-sm font-bold leading-tight">수시 6장 전략 준비중</h2>
                        <p className="mt-0.5 text-[12px] font-medium leading-snug text-[#FC8B00]">
                          안정 {summary.safe} · 적정 {summary.normal} · 도전 {summary.challenge}
                        </p>
                      </div>
                      <div className="mt-2.5 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => safeNavigate(router, strategyHref)}
                          className="min-h-[40px] rounded-lg bg-[#E6F1FB] px-2 py-2 text-center text-[11px] leading-tight text-navy"
                        >
                          수시 6장 보러가기
                        </button>
                        <button
                          type="button"
                          onClick={() => safeNavigate(router, gradesReanalysisHref)}
                          className="min-h-[40px] rounded-lg bg-[#E6F1FB] px-2 py-2 text-center text-[11px] leading-tight text-navy"
                        >
                          새로운 점수로 다시 분석
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[20px] bg-[#F2B5B57A] px-3 py-3">
                  <div className="text-sm font-bold leading-tight">📌 입시 정보 업데이트</div>
                  <p className="mt-1 text-xs leading-snug">
                    목표 대학의 주요 입시 정보에 변경 가능성이 있습니다. {primaryGoal?.university ?? "목표대학"}{" "}
                    {primaryGoal?.major ?? ""} 모집요강 근거를 다시 확인해 주세요.
                  </p>
                  <Link href="/evidence" className="mt-1.5 inline-block text-xs font-bold leading-tight text-[#8C0000]">
                    확인하기
                  </Link>
                </section>

                <section className="rounded-[20px] bg-[#EBEBEB] px-3 py-3">
                  <div className="text-sm font-bold leading-tight">⏱️ AI 페이스메이커</div>
                  <p className="mt-1 text-xs leading-snug">{paceMessage}</p>
                  <button
                    type="button"
                    onClick={() => safeNavigate(router, simulationHref)}
                    className="mt-1.5 inline-block text-xs font-bold leading-tight text-navy"
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
                      className="rounded-full border border-line bg-white px-3 py-2 text-sm font-semibold text-muted"
                    >
                      수정
                    </button>
                  </div>
                  <div className="space-y-3">
                    {goalAnalyses.map((item, index) => (
                      <article key={item.id} className="rounded-[18px] border border-line bg-white px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${getCategoryToneByScore(
                              item.fitScore
                            )}`}
                          >
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-bold leading-tight">
                              {item.university} {item.major}
                            </div>
                          </div>
                          <div className={`inline-flex min-w-[72px] items-center justify-center rounded-full px-3 py-2 text-xs font-bold ${getCategoryTone(item.category)}`}>
                            {item.category} {item.fitScore}%
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="mb-3 px-1 text-lg font-bold">주요 D-Day</div>
                  <div className="space-y-3">
                    {ddayItems.map((item, index) => (
                      <div key={item.label} className="flex items-center justify-between rounded-[18px] border border-line bg-white px-4 py-3">
                        <span className="text-base font-bold leading-tight">{item.label}</span>
                        <span
                          className={`inline-flex min-w-[72px] items-center justify-center rounded-full px-3 py-2 text-xs font-bold ${
                            index === 0 ? getCategoryTone("도전") : index === 1 ? getCategoryTone("적정") : getCategoryTone("안정")
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
      </PhoneFrame>

      <BottomNav />
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
