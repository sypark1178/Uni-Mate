"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { EmptyState } from "@/components/empty-state";
import { PhoneFrame } from "@/components/phone-frame";
import { mergeHrefWithSearchParams, safeNavigate } from "@/lib/navigation";
import { ddayItems, emptyProfile, initialSimulation } from "@/lib/mock-data";
import { normalizeUniversityName } from "@/lib/admission-data";
import {
  compactGoalLine,
  compactMajorLabel,
  compactUniversityLabel,
  goalRankNumberToneClass
} from "@/lib/goal-display";
import { buildGoalAnalyses, buildStrategyRecommendations, estimateEnglishPaceDelta, parseSeededGoals } from "@/lib/planning";
import type { ScoreMemoryStore } from "@/lib/types";
import { isDraftDirty, markDraftDirty } from "@/lib/draft-store";
import { useStudentProfile } from "@/lib/profile-storage";
import { useScoreRecords } from "@/lib/score-storage";
import { useGoals } from "@/lib/use-goals";
import { getCurrentMember } from "@/lib/member-store";
import { readJsonResponse } from "@/lib/read-json-response";

function getCategoryTone(category: "도전" | "적정" | "안정") {
  if (category === "도전") return "bg-danger";
  if (category === "적정") return "bg-normal";
  return "bg-safe";
}

/** 대시보드 링크·버튼용 얇은 오른쪽 화살표 (텍스트 색은 currentColor) */
function ArrowRightLine({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M2.5 7h7M7.5 3.5L11 7l-3.5 3.5"
        stroke="currentColor"
        strokeWidth={1.35}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
  const [guestSaveType, setGuestSaveType] = useState<"email" | "kakao">("email");
  const [guestSaveId, setGuestSaveId] = useState("");

  const isEmpty = searchParams.get("empty") === "1";
  const analysisDone = searchParams.get("analysis") === "done";
  const { studentProfile, hydrated: profileHydrated, flushProfileToServer } = useStudentProfile();
  const { store, summary: scoreSummary, flushStoreToServer } = useScoreRecords();
  const currentProfile = isEmpty ? emptyProfile : studentProfile;
  const currentMember = getCurrentMember();
  const isGuestSession = Boolean(currentMember?.userId?.startsWith("guest:"));
  const isLoggedInMember = Boolean(currentMember?.userId) && !isGuestSession;
  const seededGoals = useMemo(() => parseSeededGoals(searchParams), [searchParams.toString()]);
  const { goals, flushGoalsToServer } = useGoals(seededGoals);
  const goalAnalyses = useMemo(() => buildGoalAnalyses(goals), [goals]);
  const strategyRecommendations = useMemo(() => buildStrategyRecommendations(goals), [goals]);
  const primaryGoal = goals[0];

  const currentSearch = searchParams.toString();
  const dashboardCurrentHref = currentSearch ? `/dashboard?${currentSearch}` : "/dashboard";
  const strategyHref = mergeHrefWithSearchParams("/strategy", searchParams);
  const analysisLoadingHref = mergeHrefWithSearchParams("/analysis/loading?source=dashboard", searchParams);
  const gradesReanalysisHref = mergeHrefWithSearchParams("/onboarding/grades", searchParams);
  const simulationHref = mergeHrefWithSearchParams("/analysis/simulation", searchParams);
  const goalsHref = useMemo(() => {
    const params = new URLSearchParams(currentSearch);
    params.set("returnTo", dashboardCurrentHref);
    [1, 2, 3].forEach((rank) => params.delete(`g${rank}`));
    goals.slice(0, 3).forEach((goal, index) => {
      const university = goal.university.trim();
      const major = goal.major.trim();
      if (university && major) {
        params.set(`g${index + 1}`, `${university}|${major}`);
      }
    });

    const query = params.toString();
    return query ? `/onboarding/goals?${query}` : "/onboarding/goals";
  }, [currentSearch, dashboardCurrentHref, goals]);
  const signupEntryHref = `/signup?returnTo=${encodeURIComponent(dashboardCurrentHref)}&from=dashboard-save`;

  const summary = useMemo(
    () => ({
      safe: strategyRecommendations.filter((item) => item.category === "안정").length,
      normal: strategyRecommendations.filter((item) => item.category === "적정").length,
      challenge: strategyRecommendations.filter((item) => item.category === "도전").length
    }),
    [strategyRecommendations]
  );

  const paceMessage = useMemo(() => {
    const uniRaw = primaryGoal?.university ?? "";
    const uniForScore = uniRaw ? normalizeUniversityName(uniRaw) : "";
    const uniDisplay = uniRaw ? compactUniversityLabel(uniRaw) : "목표 대학";
    const majorDisplay = compactMajorLabel(primaryGoal?.major ?? "");
    const english = getLatestEnglishMockGrade(store);
    const mockAvg = Number.parseFloat(scoreSummary.mockAverage);
    const currentPoint =
      english ?? (Number.isFinite(mockAvg) ? mockAvg : initialSimulation.mock);
    const delta = estimateEnglishPaceDelta(uniForScore || "서강대", currentPoint);
    const targetLine = majorDisplay ? `${uniDisplay} ${majorDisplay}` : uniDisplay;
    return `영어(수능·모의) 등급을 ${delta}만 더 끌어올리면 1지망 ${targetLine} 합격 가능성에 한 걸음 더 가까워집니다.`;
  }, [store, scoreSummary.mockAverage, primaryGoal?.university, primaryGoal?.major]);

  const profileSummaryLine = useMemo(() => {
    const schoolAverage = scoreSummary.schoolAverage === "-" ? "미입력" : scoreSummary.schoolAverage;
    const goalText = primaryGoal ? `${compactGoalLine(primaryGoal.university, primaryGoal.major)} 목표` : "목표 미설정";
    return `내신 ${schoolAverage} / ${goalText}`;
  }, [scoreSummary.schoolAverage, primaryGoal]);

  useEffect(() => {
    let cancelled = false;
    const hydrateNotice = async () => {
      try {
        const response = await fetch("/api/analysis/result", { method: "GET", cache: "no-store" });
        if (response.ok) {
          const payload = await readJsonResponse<{ data?: { completedAt?: string; source?: string } | null }>(response);
          if (!cancelled && payload?.data?.completedAt) {
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
    if (!isLoggedInMember) {
      setShowSaveModal(true);
      return;
    }
    await flushProfileToServer();
    await flushStoreToServer();
    await flushGoalsToServer();
    // 저장 후에도 화면 표시 상태는 유지하고, "미저장 변경" 상태만 해제한다.
    markDraftDirty(false);
    setSaveNotice("회원 저장 완료: 변경사항이 DB에 반영되고 로그 시각이 갱신되었습니다.");
    window.setTimeout(() => setSaveNotice(""), 2500);
  };
  const hasUnsavedChanges = profileHydrated && isDraftDirty();

  const handleGuestTempSave = async () => {
    const normalizedId = guestSaveId.trim();
    if (!normalizedId) {
      setSaveNotice("이메일 또는 카카오톡 ID를 입력해 주세요.");
      return;
    }
    const payload = {
      contactType: guestSaveType,
      contactId: normalizedId,
      snapshot: {
        profile: studentProfile,
        scores: store,
        goals
      }
    };
    try {
      const response = await fetch("/api/onboarding/guest-temp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await readJsonResponse<{ ok?: boolean; expiresAt?: string; error?: string }>(response);
      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "임시 저장에 실패했습니다.");
      }
      setShowSaveModal(false);
      setSaveNotice(`비회원 임시 저장 완료 (24시간 보관, 만료: ${new Date(result.expiresAt ?? "").toLocaleString("ko-KR")})`);
      window.setTimeout(() => setSaveNotice(""), 4500);
    } catch (error) {
      const message = error instanceof Error ? error.message : "임시 저장 중 오류가 발생했습니다.";
      setSaveNotice(message);
      window.setTimeout(() => setSaveNotice(""), 3500);
    }
  };

  return (
    <>
      <PhoneFrame>
            <div className="mb-3 flex items-center justify-between gap-3 px-2">
              <div>
                <div className="mb-0.5 text-base leading-tight text-muted">안녕하세요</div>
                <div className="flex items-center gap-2">
                  <div className="max-w-[170px] truncate text-[27px] font-bold leading-tight">{currentProfile.name}님</div>
                  {!isEmpty ? (
                    <div className="rounded-full bg-safe px-3 py-1 text-xs leading-none text-black">{currentProfile.gradeLabel}</div>
                  ) : null}
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
                <button
                  type="button"
                  onClick={() => (isLoggedInMember ? void handleSaveAll() : setShowSaveModal(true))}
                  className={`min-w-[82px] rounded-lg border px-4 py-2 text-base ${
                    hasUnsavedChanges ? "border-navy bg-navy text-white" : "border-line bg-white text-black"
                  }`}
                >
                  저장
                </button>
              </div>
            </div>

            {!isEmpty ? (
              <div className="space-y-3">
                {!profileHydrated ? (
                  <p className="px-1 text-sm leading-snug text-muted">최근 작업 정보를 불러오는 중입니다...</p>
                ) : null}
                <section className="overflow-hidden rounded-[20px] bg-navy text-white ring-1 ring-white/15">
                  <div className="px-3 py-3">
                    <div className="text-sm font-bold leading-tight">📊 AI 전략 요약</div>
                    <div className="mt-1.5">
                      <p className="text-xs font-bold leading-snug text-white/95">
                        <span className="inline-block max-w-[260px] truncate align-bottom">
                          1지망 목표 대학 -{" "}
                          {primaryGoal ? compactGoalLine(primaryGoal.university, primaryGoal.major) : "미설정"}
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
                    목표 대학의 주요 입시 정보에 변경 가능성이 있습니다.{" "}
                    {primaryGoal
                      ? `${compactGoalLine(primaryGoal.university, primaryGoal.major)} `
                      : "목표대학 "}
                    모집요강 근거를 다시 확인해 주세요.
                  </p>
                  <div className="mt-1.5 flex justify-end">
                    <Link
                      href="/evidence"
                      className="inline-flex items-center gap-0.5 text-xs font-bold leading-tight text-[#8C0000]"
                    >
                      확인하기
                      <ArrowRightLine className="h-3 w-3 shrink-0 opacity-90" />
                    </Link>
                  </div>
                </section>

                <section className="rounded-[20px] bg-[#EBEBEB] px-3 py-3">
                  <div className="text-sm font-bold leading-tight">⏱️ AI 페이스메이커</div>
                  <p className="mt-1 text-xs leading-snug">{paceMessage}</p>
                  <div className="mt-1.5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => safeNavigate(router, simulationHref)}
                      className="inline-flex items-center gap-0.5 text-xs font-bold leading-tight text-navy"
                    >
                      AI 분석 이어서 보기
                      <ArrowRightLine className="h-3 w-3 shrink-0 opacity-90" />
                    </button>
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between px-1">
                    <h2 className="app-section-title">목표대학 / 학과</h2>
                    <button
                      type="button"
                      onClick={() => safeNavigate(router, goalsHref)}
                      className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-muted"
                    >
                      수정
                    </button>
                  </div>
                  <div className="space-y-3">
                    {goalAnalyses.map((item, index) => (
                      <article key={item.id} className="rounded-[18px] border border-line bg-white px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${goalRankNumberToneClass(
                              index
                            )}`}
                          >
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-bold leading-tight">
                              {compactGoalLine(item.university, item.major)}
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
                  <div className="app-section-title mb-3 px-1">주요 D-Day</div>
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
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGuestSaveType("email")}
                  className={`rounded-xl border px-3 py-2 text-sm ${guestSaveType === "email" ? "border-navy bg-[#EAF2FB] text-navy" : "border-line"}`}
                >
                  이메일
                </button>
                <button
                  type="button"
                  onClick={() => setGuestSaveType("kakao")}
                  className={`rounded-xl border px-3 py-2 text-sm ${guestSaveType === "kakao" ? "border-navy bg-[#EAF2FB] text-navy" : "border-line"}`}
                >
                  카카오톡 ID
                </button>
              </div>
              <input
                value={guestSaveId}
                onChange={(event) => setGuestSaveId(event.target.value)}
                placeholder={guestSaveType === "email" ? "이메일 주소 입력" : "카카오톡 ID 입력"}
                className="rounded-xl border border-line px-3 py-2 text-sm"
              />
              <button className="rounded-xl bg-navy px-4 py-3 text-lg font-semibold text-white" onClick={() => void handleGuestTempSave()}>
                24시간 임시 저장
              </button>
              <Link
                href={`${signupEntryHref}&provider=${guestSaveType}&guestSaveType=${guestSaveType}&guestSaveId=${encodeURIComponent(guestSaveId.trim())}`}
                className="rounded-xl border border-ink px-4 py-3 text-lg text-center"
              >
                가입 후 영구 저장
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
