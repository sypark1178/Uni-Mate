"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { EvidenceModal } from "@/components/evidence-modal";
import { PhoneFrame } from "@/components/phone-frame";
import { SectionTabs } from "@/components/section-tabs";
import { getCurrentMember } from "@/lib/member-store";
import type { Recommendation, Evidence } from "@/lib/types";

const userIdToStudentId: Record<string, number> = {
  kmj11: 100,
  kmj12: 101,
  kmj13: 102,
  kmj14: 103,
};

function getStudentId(): number {
  const member = getCurrentMember();
  if (!member) return 100;
  const userId = member.userId.toLowerCase();
  return userIdToStudentId[userId] ?? 100;
}

interface DbRecommendation {
  admission_id: number;
  univ_name: string;
  dept_name: string;
  cutoff_50: number;
  competition_ratio: string | number;
  strategy_type: string;
  csat_required: number;
}

function generateCaution(category: string, weighted: number, cutoff: number): string {
  const diff = Math.abs(weighted - cutoff).toFixed(1);
  if (category === "도전") {
    return `조심할 점: 붙으려면 대략 내신 ${cutoff.toFixed(1)} 전후를 많이 보는 편인데, 지금이랑 ${diff} 정도 차이가 나요. 수능이랑 학생부를 같이 챙기는 게 좋아요.`;
  } else if (category === "적정") {
    return `조심할 점: 적당히 도전하는 구간인데, 내신이 대략 ${diff} 정도 부족해 보여요. 교과 말고 동아리·봉사 같은 활동도 조금 보태 보세요.`;
  } else {
    return `조심할 점: 여유 있는 구간이에요. 시험에서 실수만 줄이면 돼요.`;
  }
}

function dbRecToRecommendation(rec: DbRecommendation, weightedGrade: number): Recommendation {
  const categoryMap: Record<string, Recommendation["category"]> = {
    도전: "도전",
    적정: "적정",
    안정: "안정",
  };
  const category = categoryMap[rec.strategy_type] ?? "적정";
  const csatLabel = rec.csat_required ? "O" : "X";
  const caution = generateCaution(category, weightedGrade, rec.cutoff_50);

  const evidence: Evidence = {
    title: `${rec.univ_name} ${rec.dept_name} AI 분석 결과`,
    source: `${rec.univ_name} 입학처 / Uni-Mate RAG`,
    page: null,
    snippet: `${rec.dept_name} 기준 최근 모집요강과 학생부 반영 비율을 근거로 분석 중입니다.`,
    status: "verified",
  };

  return {
    id: `db-${rec.admission_id}`,
    university: rec.univ_name,
    major: rec.dept_name,
    category,
    fitScore: 0,
    notes: `수능 조건 ${csatLabel} · 내신 평균 ${weightedGrade}\n${caution}\n이 학교가 보는 키워드 | 앞장서기 · 문제 풀기 · 숫자·그래프 읽기`,
    evidence,
    admissionId: rec.admission_id,
  };
}

export default function StrategyPage() {
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Recommendation | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<number>(100);

  const activeFilter = (searchParams.get("filter") as "전체" | "도전" | "적정" | "안정" | null) ?? "전체";

  useEffect(() => {
    const id = getStudentId();
    setStudentId(id);
    fetch(`http://127.0.0.1:8004/api/smart-recommendations/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) return;
        const recs = json.recommendations.map((r: DbRecommendation) =>
          dbRecToRecommendation(r, json.weighted_grade)
        );
        setRecommendations(recs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filterCounts = useMemo(() => {
    return {
      전체: recommendations.length,
      도전: recommendations.filter((r) => r.category === "도전").length,
      적정: recommendations.filter((r) => r.category === "적정").length,
      안정: recommendations.filter((r) => r.category === "안정").length,
    };
  }, [recommendations]);

  const filteredRecommendations = useMemo(() => {
    const categoryOrder: Record<Recommendation["category"], number> = {
      도전: 0,
      적정: 1,
      안정: 2,
    };
    if (activeFilter === "전체") {
      return [...recommendations].sort((a, b) => {
        const diff = categoryOrder[a.category] - categoryOrder[b.category];
        if (diff !== 0) return diff;
        return a.fitScore - b.fitScore;
      });
    }
    return recommendations.filter((r) => r.category === activeFilter);
  }, [activeFilter, recommendations]);

  const filterHref = (filter: "전체" | "도전" | "적정" | "안정") => {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === "전체") {
      params.delete("filter");
    } else {
      params.set("filter", filter);
    }
    const next = params.toString();
    return next ? `/strategy?${next}` : "/strategy";
  };

  const categoryClassMap: Record<Recommendation["category"], string> = {
    도전: "bg-danger text-ink",
    적정: "bg-normal text-ink",
    안정: "bg-safe text-ink",
  };

  return (
    <>
      <PhoneFrame
        title="추천 전략"
        bottomPaddingClassName={activeFilter === "전체" ? "pb-[66px]" : "pb-0"}
      >
        <SectionTabs
          tabs={[
            { href: "/strategy", label: "추천 전략" },
            { href: "/strategy/subjects", label: "추천 수강과목" },
            { href: "/strategy/study-plan", label: "추천 공부계획" },
          ]}
        />
        <div className="mb-4">
          <section className="rounded-xl bg-[#ebebeb] px-4 py-3">
            <h2 className="text-sm font-bold leading-tight text-ink">추천 전략이 중요한 이유</h2>
            <p className="mt-1 text-xs leading-snug text-muted">
              지원 가능한 학교를 구간별로 나눠, 합격 가능성을 한눈에 확인할 수 있어요. 전략 없이 지원하면 실패 확률이 높기 때문에, 기준을 잡고 준비하는 것이 중요해요.
            </p>
          </section>
        </div>

        <section className="mt-0">
          <div className="mb-1 flex flex-nowrap items-center gap-1">
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

        <section className="mt-2 space-y-3">
          {loading ? (
            <p className="rounded-[18px] border border-line bg-white p-4 text-sm text-muted">
              분석 중...
            </p>
          ) : filteredRecommendations.length === 0 ? (
            <p className="rounded-[18px] border border-line bg-white p-4 text-sm text-muted">
              이 필터에 해당하는 학교가 아직 없어요.
            </p>
          ) : (
            filteredRecommendations.map((item) => (
              <article key={item.id} className="rounded-[18px] border border-line bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-semibold leading-tight">
                      {item.university} {item.major}
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {item.notes.split("\n").filter(Boolean).map((line, idx) => (
                        <p key={idx} className="text-xs leading-5 text-muted">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                  <span
                    className={`inline-flex min-w-[68px] shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${categoryClassMap[item.category]}`}
                  >
                    {item.category}
                  </span>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white"
                    onClick={() => setSelected(item)}
                  >
                    근거 보기
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </PhoneFrame>
      <BottomNav />
      <EvidenceModal
        evidence={selected?.evidence ?? null}
        onClose={() => setSelected(null)}
        admissionId={selected?.admissionId}
        studentId={studentId}
      />
    </>
  );
}