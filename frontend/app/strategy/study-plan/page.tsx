"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { PhoneFrame } from "@/components/phone-frame";
import { SectionTabs } from "@/components/section-tabs";
import { compactGoalLine, compactMajorLabel, compactUniversityLabel } from "@/lib/goal-display";
import { buildStrategyRecommendations, parseSeededGoals } from "@/lib/planning";
import { useScoreRecords } from "@/lib/score-storage";
import { useGoals } from "@/lib/use-goals";
import type { AdmissionCategory, Recommendation } from "@/lib/types";

type Slot = {
  id: string;
  shortLabel: string;
  title: string;
  done: boolean;
};

type Band = "2학년" | "3학년";

const SLOTS: Slot[] = [
  { id: "g2s1m", shortLabel: "1학기 중간", title: "2학년 1학기 중간고사", done: true },
  { id: "g2s1f", shortLabel: "1학기 기말", title: "2학년 1학기 기말고사", done: true },
  { id: "g2s2m", shortLabel: "2학기 중간", title: "2학년 2학기 중간고사", done: false },
  { id: "g2s2f", shortLabel: "2학기 기말", title: "2학년 2학기 기말고사", done: false },
  { id: "g3s1m", shortLabel: "1학기 중간", title: "3학년 1학기 중간고사", done: false },
  { id: "g3s1f", shortLabel: "1학기 기말", title: "3학년 1학기 기말고사", done: false },
  { id: "g3s2m", shortLabel: "2학기 중간", title: "3학년 2학기 중간고사", done: false },
  { id: "g3s2f", shortLabel: "2학기 기말", title: "3학년 2학기 기말고사", done: false }
];

function slotBand(s: Slot): Band {
  if (s.id.startsWith("g2")) return "2학년";
  return "3학년";
}

const selectShellClass =
  "relative w-full rounded-full border border-[#C7D7E8] bg-white py-2.5 pl-4 pr-10 text-left text-sm font-medium text-ink shadow-sm";

function SelectChevron() {
  return (
    <span className="pointer-events-none absolute right-3.5 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-ink" aria-hidden>
      <svg viewBox="0 0 12 8" width="12" height="8" fill="none" className="opacity-80">
        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

const categoryBadgeClass: Record<AdmissionCategory, string> = {
  도전: "bg-danger text-ink",
  적정: "bg-normal text-ink",
  안정: "bg-safe text-ink"
};

const categoryScoreClass: Record<AdmissionCategory, string> = {
  도전: "text-[#e18a8a]",
  적정: "text-[#6fa0d6]",
  안정: "text-[#72b78a]"
};

/** 학교·적성·시험 구간별 추천 공부 계획(불릿) */
function studyPlanTasksFor(rec: Recommendation, slot: Slot): string[] {
  const u = compactUniversityLabel(rec.university);
  const m = compactMajorLabel(rec.major);
  const goalLine = `${u} ${m}`;
  const majorHint = rec.major.includes("경영") || rec.major.includes("경제");

  if (rec.category === "도전") {
    return [
      `${goalLine}에 맞추려면 ${slot.title} 범위에서 개념 요약 1장 + 기출·부교재 25문항을 먼저 끝내세요.`,
      majorHint
        ? `사례·수치형 문항은 ‘풀이→오답→유형 이름’ 순으로만 정리해 생기부에 쓸 활동으로 연결하세요.`
        : `서술·도식형 문항은 답안 형식(근거→결론)을 미리 맞춰 두세요.`,
      `시험 직후, 성취기준 키워드 한 줄과 연결되는 성찰 문장을 바로 적어 두세요.`
    ];
  }

  if (rec.category === "적정") {
    return [
      `${goalLine}에 맞는 속도로는 교과서 핵심 단원 + 기출 15문항을 번갈 하루 1세트가 적당합니다.`,
      `틀린 문항은 ‘왜 틀렸는지’ 한 줄만 적고, 다음 날 같은 유형 5문제로 확인하세요.`,
      `${slot.shortLabel} 이후에도 이어질 내신 곡선을 위해 과목당 1개씩만 장기 목표를 적어 두세요.`
    ];
  }

  return [
    `${goalLine}은(는) 내신 여유가 있는 구간입니다. 이번 시험은 범위 정리 + 기출 10문항으로 부담을 낮추세요.`,
    `실수만 줄이면 되므로, 시험지를 ‘검산 체크’용으로 한 번 더 훑는 루틴을 만드세요.`,
    `동아리·세특과 연결되는 과목이면, 한 활동을 시험 범위 키워드와 짝지어 한 문장으로 남기세요.`
  ];
}

export default function StrategyStudyPlanPage() {
  const searchParams = useSearchParams();
  const seededGoals = useMemo(() => parseSeededGoals(searchParams), [searchParams]);
  const { goals } = useGoals(seededGoals);
  const recommendations = useMemo(() => buildStrategyRecommendations(goals), [goals]);
  const filterCounts = useMemo(() => {
    const challenge = recommendations.filter((item) => item.category === "도전").length;
    const normal = recommendations.filter((item) => item.category === "적정").length;
    const safe = recommendations.filter((item) => item.category === "안정").length;
    return {
      전체: recommendations.length,
      도전: challenge,
      적정: normal,
      안정: safe
    };
  }, [recommendations]);

  const activeFilter = (searchParams.get("filter") as "전체" | "도전" | "적정" | "안정" | null) ?? "전체";

  const upcoming = useMemo(() => SLOTS.filter((s) => !s.done), []);
  const [activeId, setActiveId] = useState(upcoming[0]?.id ?? "g2s2m");

  const bandsInOrder = useMemo(() => {
    const seen = new Set<Band>();
    const order: Band[] = [];
    for (const s of upcoming) {
      const b = slotBand(s);
      if (!seen.has(b)) {
        seen.add(b);
        order.push(b);
      }
    }
    return order;
  }, [upcoming]);

  const activeSlot = useMemo(() => SLOTS.find((s) => s.id === activeId) ?? upcoming[0], [activeId, upcoming]);

  const currentBand = slotBand(activeSlot);
  const slotsInBand = useMemo(() => upcoming.filter((s) => slotBand(s) === currentBand), [upcoming, currentBand]);

  const filteredRecommendations = useMemo(() => {
    const categoryOrder: Record<Recommendation["category"], number> = {
      도전: 0,
      적정: 1,
      안정: 2
    };

    if (activeFilter === "전체") {
      return [...recommendations].sort((left, right) => {
        const categoryDiff = categoryOrder[left.category] - categoryOrder[right.category];
        if (categoryDiff !== 0) return categoryDiff;
        return left.fitScore - right.fitScore;
      });
    }

    return recommendations
      .filter((item) => item.category === activeFilter)
      .sort((left, right) => left.fitScore - right.fitScore);
  }, [activeFilter, recommendations]);

  const filterHref = (filter: "전체" | "도전" | "적정" | "안정") => {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === "전체") {
      params.delete("filter");
    } else {
      params.set("filter", filter);
    }
    const next = params.toString();
    return next ? `/strategy/study-plan?${next}` : "/strategy/study-plan";
  };

  return (
    <>
      <PhoneFrame title="추천 공부계획" bottomPaddingClassName={activeFilter === "전체" ? "pb-[100px]" : "pb-[66px]"}>
        <SectionTabs
          tabs={[
            { href: "/strategy", label: "추천 전략" },
            { href: "/strategy/subjects", label: "추천 수강과목" },
            { href: "/strategy/study-plan", label: "추천 공부계획" }
          ]}
        />

        <div className="mb-4">
          <section className="rounded-xl bg-[#ebebeb] px-4 py-3">
            <h2 className="app-info-title">추천 공부계획이 중요한 이유</h2>
            <p className="mt-1 app-info-body">
              지원 가능한 학교에 맞춰 지금 무엇을 어떻게 공부해야 할지 바로 알 수 있어요. 학년·학기에 맞는 계획으로 준비하면, 시험 대비를 더 효율적으로 할 수 있어요.
            </p>
          </section>
        </div>

        <div className="mt-0 grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <label htmlFor="study-plan-band" className="mb-1.5 block text-sm font-semibold text-navy">
              학년 구분
            </label>
            <div className="relative">
              <select
                id="study-plan-band"
                className={`${selectShellClass} w-full cursor-pointer appearance-none`}
                value={currentBand}
                onChange={(e) => {
                  const nextBand = e.target.value as Band;
                  const first = upcoming.find((s) => slotBand(s) === nextBand);
                  if (first) setActiveId(first.id);
                }}
              >
                {bandsInOrder.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </div>
          <div className="min-w-0">
            <label htmlFor="study-plan-slot" className="mb-1.5 block text-sm font-semibold text-navy">
              학기 구분
            </label>
            <div className="relative">
              <select
                id="study-plan-slot"
                className={`${selectShellClass} w-full cursor-pointer appearance-none`}
                value={activeId}
                onChange={(e) => setActiveId(e.target.value)}
              >
                {slotsInBand.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.shortLabel}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </div>
        </div>

        <section className="mt-5">
          <div className="mb-2 flex flex-nowrap items-center gap-1">
            {(["전체", "도전", "적정", "안정"] as const).map((filter) => (
              <Link
                key={filter}
                href={filterHref(filter)}
                prefetch={false}
                className={`inline-flex min-w-[68px] shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                  filter === "전체"
                    ? activeFilter === filter
                      ? "border border-black bg-[#e5e7eb] text-black"
                      : "bg-[#f3f4f6] text-black"
                    : filter === "도전"
                      ? activeFilter === filter
                        ? "border border-black bg-danger text-black"
                        : "bg-danger text-black"
                      : filter === "적정"
                        ? activeFilter === filter
                          ? "border border-black bg-normal text-black"
                          : "bg-normal text-black"
                        : activeFilter === filter
                          ? "border border-black bg-safe text-black"
                          : "bg-safe text-black"
                }`}
              >
                {`${filter} ${filterCounts[filter]}`}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-4 space-y-3">
          {filteredRecommendations.length === 0 ? (
            <p className="rounded-[18px] border border-line bg-white p-4 text-sm text-muted">
              이 필터에 해당하는 학교가 없어요. 전체를 눌러 6장을 함께 보거나, 목표 대학을 먼저 설정해 주세요.
            </p>
          ) : (
            filteredRecommendations.map((rec) => (
              <article key={rec.id} className="rounded-[18px] border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate app-section-title">{compactGoalLine(rec.university, rec.major)}</h3>
                    <p className="mt-1 text-xs text-muted">{activeSlot.title}</p>
                  </div>
                  <span
                    className={`inline-flex min-w-[68px] shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${categoryBadgeClass[rec.category]}`}
                  >
                    {rec.category}
                  </span>
                </div>
                <p className={`mt-2 text-sm font-semibold ${categoryScoreClass[rec.category]}`}>합격가능성 {rec.fitScore}%</p>
                <ul className="mt-3 space-y-2 border-t border-line pt-3 text-sm leading-snug text-ink">
                  {studyPlanTasksFor(rec, activeSlot).map((line, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="shrink-0 font-semibold text-navy">{i + 1}.</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))
          )}
        </section>
      </PhoneFrame>
      <BottomNav />
    </>
  );
}
