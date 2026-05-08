"use client";

import { useMemo, useState, useEffect } from "react";
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

interface DbAdmission {
  admission_id: number;
  univ_name: string;
  dept_name: string;
  admission_name: string;
  admission_method: string;
  csat_required: number | null;
  cutoff_50: string | number;
  competition_ratio: string | number;
}

export default function AnalysisPage() {
  const [selected, setSelected] = useState<Recommendation | null>(null);
  const [studentId, setStudentId] = useState<number>(100);
  const [universitySearch, setUniversitySearch] = useState("");
  const [majorSearch, setMajorSearch] = useState("");
  const [admissionFilter, setAdmissionFilter] = useState<"교과" | "학종" | "논술" | "수능최저 없음">("학종");
  const [dbResults, setDbResults] = useState<DbAdmission[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStudentId(getStudentId());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!universitySearch && !majorSearch) {
        setDbResults([]);
        return;
      }
      setLoading(true);
      const params = new URLSearchParams();
      if (universitySearch) params.set("univ_name", universitySearch);
      if (majorSearch) params.set("dept_name", majorSearch);
      params.set("filter_type", admissionFilter);
      fetch(`http://127.0.0.1:8004/api/search-admissions?${params.toString()}`)
        .then((res) => res.json())
        .then((json) => setDbResults(Array.isArray(json) ? json : []))
        .catch(() => setDbResults([]))
        .finally(() => setLoading(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [universitySearch, majorSearch, admissionFilter]);

  const recommendations: Recommendation[] = useMemo(() => {
    return dbResults.map((rec) => {
      const cutoff = typeof rec.cutoff_50 === "number" ? rec.cutoff_50 : null;
      let category: Recommendation["category"] = "적정";
      let fitScore = 55;

      if (cutoff !== null) {
        if (cutoff <= 2.0) { category = "도전"; fitScore = 35; }
        else if (cutoff <= 2.5) { category = "도전"; fitScore = 42; }
        else if (cutoff <= 3.0) { category = "적정"; fitScore = 58; }
        else if (cutoff <= 3.5) { category = "적정"; fitScore = 65; }
        else { category = "안정"; fitScore = 72; }
      }

      const evidence: Evidence = {
        title: `${rec.univ_name} ${rec.dept_name} AI 분석 결과`,
        source: `${rec.univ_name} 입학처 / Uni-Mate RAG`,
        page: null,
        snippet: `${rec.dept_name} 기준 최근 모집요강과 학생부 반영 비율을 근거로 분석 중입니다.`,
        status: "verified",
      };

      return {
        id: `db-analysis-${rec.admission_id}`,
        university: rec.univ_name,
        major: rec.dept_name,
        category,
        fitScore,
        notes: `${admissionFilter} · 50%컷: ${rec.cutoff_50} | 경쟁률: ${rec.competition_ratio}\n전형방법: ${rec.admission_method}\n수능최저: ${rec.csat_required ? "있음" : "없음"}`,
        evidence,
        admissionId: rec.admission_id,
      };
    });
  }, [dbResults, admissionFilter]);

  const categoryClassMap: Record<Recommendation["category"], string> = {
    도전: "bg-danger text-ink",
    적정: "bg-normal text-ink",
    안정: "bg-safe text-ink",
  };

  const categoryTextClassMap: Record<Recommendation["category"], string> = {
    도전: "text-[#e18a8a]",
    적정: "text-[#6fa0d6]",
    안정: "text-[#72b78a]",
  };

  return (
    <>
      <PhoneFrame title="전형 분석">
        <SectionTabs
          tabs={[
            { href: "/analysis", label: "전형 탐색" },
            { href: "/analysis/gap", label: "갭 분석" },
            { href: "/analysis/simulation", label: "시뮬레이션" },
          ]}
        />
        <section className="mb-4 rounded-xl bg-[#ebebeb] px-4 py-3">
          <h2 className="app-info-title">전형 탐색이란?</h2>
          <p className="mt-1 app-info-body">
            교과, 학종, 논술 등 전형 조건을 기준으로 나에게 유리한 대학을 찾을 수 있어요.
          </p>
        </section>

        <section className="mb-4">
          <label className="relative block">
            <input
              value={universitySearch}
              onChange={(e) => setUniversitySearch(e.target.value)}
              placeholder="대학 검색 (ex : 서울대)"
              className="w-full rounded-xl border border-line bg-white px-4 py-3 pr-10 text-sm text-ink placeholder:text-muted"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            </span>
          </label>

          <label className="relative mt-3 block">
            <input
              value={majorSearch}
              onChange={(e) => setMajorSearch(e.target.value)}
              placeholder="학과검색 (ex : 경영)"
              className="w-full rounded-xl border border-line bg-white px-4 py-3 pr-10 text-sm text-ink placeholder:text-muted"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            </span>
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            {(["교과", "학종", "논술", "수능최저 없음"] as const).map((filter) => {
              const active = admissionFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setAdmissionFilter(filter)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    active ? "bg-navy text-white" : "border border-line bg-white text-muted"
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mb-4">
          <h3 className="app-section-title">
            {admissionFilter} 전형 매칭 결과{" "}
            <span className="ml-1 rounded-full bg-[#d9d9d9] px-2 py-0.5 text-xs text-muted">
              {loading ? "검색 중..." : `${recommendations.length}개`}
            </span>
          </h3>

          {!universitySearch && !majorSearch ? (
            <p className="mt-3 rounded-[18px] border border-line bg-white p-4 text-sm text-muted">
              대학명 또는 학과명을 입력하면 DB에서 전형을 검색합니다.
            </p>
          ) : recommendations.length === 0 && !loading ? (
            <p className="mt-3 rounded-[18px] border border-line bg-white p-4 text-sm text-muted">
              {admissionFilter} 전형에 해당하는 결과가 없어요.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {recommendations.map((item) => (
                <article key={item.id} className="rounded-[18px] border border-line bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-lg font-semibold leading-tight">
                        {item.university} {item.major}
                      </div>
                      <div className="mt-2 space-y-1.5">
                        {item.notes.split("\n").filter(Boolean).map((line, idx) => (
                          <p key={idx} className="text-xs leading-5 text-muted">{line}</p>
                        ))}
                      </div>
                    </div>
                    <span className={`inline-flex min-w-[68px] shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${categoryClassMap[item.category]}`}>
                      {item.category}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`text-sm font-semibold ${categoryTextClassMap[item.category]}`}>
                      합격가능성 {item.fitScore}%
                    </span>
                    <button
                      type="button"
                      className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white"
                      onClick={() => setSelected(item)}
                    >
                      근거 보기
                    </button>
                  </div>
                </article>
              ))}
            </div>
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