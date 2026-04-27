"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { EvidenceModal } from "@/components/evidence-modal";
import { PhoneFrame } from "@/components/phone-frame";
import { RecommendationCard } from "@/components/recommendation-card";
import { SectionTabs } from "@/components/section-tabs";
import { buildStrategyRecommendations, parseSeededGoals } from "@/lib/planning";
import { useScoreRecords } from "@/lib/score-storage";
import { useGoals } from "@/lib/use-goals";
import type { Recommendation } from "@/lib/types";

export default function AnalysisPage() {
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Recommendation | null>(null);
  const [universitySearch, setUniversitySearch] = useState("");
  const [majorSearch, setMajorSearch] = useState("");
  const [admissionFilter, setAdmissionFilter] = useState<"교과" | "학종" | "논술" | "수능최저 없음">("교과");
  const seededGoals = parseSeededGoals(searchParams);
  const { goals } = useGoals(seededGoals);
  const { summary } = useScoreRecords();
  const strategyRecommendations = useMemo(() => buildStrategyRecommendations(goals), [goals]);

  const CHOSEONG = [
    "ㄱ",
    "ㄲ",
    "ㄴ",
    "ㄷ",
    "ㄸ",
    "ㄹ",
    "ㅁ",
    "ㅂ",
    "ㅃ",
    "ㅅ",
    "ㅆ",
    "ㅇ",
    "ㅈ",
    "ㅉ",
    "ㅊ",
    "ㅋ",
    "ㅌ",
    "ㅍ",
    "ㅎ"
  ];
  const UNIVERSITY_SUGGESTIONS_POOL = [
    "서울대",
    "서울여대",
    "서울시립대",
    "서강대",
    "성균관대",
    "숙명여대",
    "숭실대",
    "세종대",
    "연세대",
    "이화여대",
    "중앙대",
    "한양대",
    "경희대",
    "건국대",
    "고려대",
    "동국대",
    "홍익대",
    "한국외대",
    "국민대",
    "인하대",
    "아주대",
    "부산대",
    "경북대",
    "전남대",
    "충남대",
    "전북대"
  ];
  const MAJOR_SUGGESTIONS_POOL = [
    "경영학과",
    "경제학과",
    "국어국문학과",
    "교육학과",
    "광고홍보학과",
    "국제학과",
    "기계공학과",
    "도시공학과",
    "데이터사이언스학과",
    "미디어커뮤니케이션학과",
    "법학과",
    "사회복지학과",
    "사회학과",
    "생명과학과",
    "수학과",
    "심리학과",
    "언론정보학과",
    "영어영문학과",
    "응용통계학과",
    "유아교육과",
    "의류학과",
    "전자공학과",
    "정치외교학과",
    "중어중문학과",
    "철학과",
    "컴퓨터공학과",
    "통계학과",
    "행정학과",
    "화학공학과"
  ];
  const UNIVERSITY_MAJOR_POOL: Record<string, string[]> = {
    아주대: ["경영학과", "경제학과", "응용통계학과", "영어영문학과", "미디어커뮤니케이션학과", "행정학과"],
    서울대: ["경영학과", "경제학과", "통계학과", "사회학과", "정치외교학과", "영어영문학과"],
    연세대: ["경영학과", "경제학과", "응용통계학과", "언론정보학과", "심리학과", "행정학과"],
    고려대: ["경영학과", "경제학과", "통계학과", "정치외교학과", "사회학과", "영어영문학과"],
    서강대: ["경영학과", "경제학과", "영어영문학과", "사회학과", "정치외교학과", "미디어커뮤니케이션학과"],
    성균관대: ["경영학과", "경제학과", "통계학과", "사회복지학과", "영어영문학과", "행정학과"],
    한양대: ["경영학과", "경제학과", "정치외교학과", "사회학과", "영어영문학과", "미디어커뮤니케이션학과"],
    중앙대: ["경영학과", "경제학과", "광고홍보학과", "사회학과", "심리학과", "영어영문학과"],
    경희대: ["경영학과", "경제학과", "무역학과", "국제학과", "사회학과", "영어영문학과"],
    건국대: ["경영학과", "경제학과", "응용통계학과", "국제학과", "사회학과", "영어영문학과"],
    숭실대: ["경영학과", "경제학과", "통계학과", "컴퓨터공학과", "사회복지학과", "영어영문학과"]
  };

  const normalizeText = (value: string) => value.replace(/\s+/g, "").toLowerCase();

  const toChoseong = (value: string) =>
    [...value]
      .map((char) => {
        const code = char.charCodeAt(0);
        if (code >= 0xac00 && code <= 0xd7a3) {
          const initialIndex = Math.floor((code - 0xac00) / 588);
          return CHOSEONG[initialIndex] ?? char;
        }
        return char;
      })
      .join("");

  const isHangulJamoQuery = (value: string) => /^[ㄱ-ㅎ]+$/.test(value);

  const matchesKeyword = (target: string, query: string) => {
    const normalizedTarget = normalizeText(target);
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return true;
    if (normalizedTarget.includes(normalizedQuery)) return true;
    const targetChoseong = normalizeText(toChoseong(target));
    if (isHangulJamoQuery(normalizedQuery)) {
      return targetChoseong.startsWith(normalizedQuery);
    }
    return targetChoseong.includes(normalizedQuery);
  };

  const clampSuggestionsForSingleRow = (items: string[]) => {
    const base = items.slice(0, 4);
    const fifth = items[4];
    if (!fifth) return base;
    const totalLength = [...base, fifth].reduce((sum, item) => sum + item.length, 0);
    return totalLength <= 18 ? items.slice(0, 5) : base;
  };

  const sortByChoseongOrder = (items: string[]) =>
    [...items].sort((left, right) => {
      const leftChoseong = normalizeText(toChoseong(left));
      const rightChoseong = normalizeText(toChoseong(right));
      if (leftChoseong !== rightChoseong) {
        return leftChoseong.localeCompare(rightChoseong, "ko");
      }
      return left.localeCompare(right, "ko");
    });

  const searchedRecommendations = useMemo(() => {
    const universityKeyword = universitySearch.trim();
    const majorKeyword = majorSearch.trim();
    if (!universityKeyword && !majorKeyword) return strategyRecommendations;
    return strategyRecommendations.filter((item) => {
      const universityMatched = matchesKeyword(item.university, universityKeyword);
      const majorMatched = matchesKeyword(item.major, majorKeyword);
      return universityMatched && majorMatched;
    });
  }, [majorSearch, strategyRecommendations, universitySearch]);

  const selectedTargetRecommendations = useMemo(() => {
    const universityKeyword = universitySearch.trim();
    const majorKeyword = majorSearch.trim();
    if (!universityKeyword && !majorKeyword) {
      return searchedRecommendations;
    }

    const normalize = (value: string) => normalizeText(value);
    const schoolAverageRaw = Number.parseFloat(summary.schoolAverage);
    const mockAverageRaw = Number.parseFloat(summary.mockAverage);
    const schoolAverage = Number.isFinite(schoolAverageRaw) ? schoolAverageRaw : 3.3;
    const mockAverage = Number.isFinite(mockAverageRaw) ? mockAverageRaw : 3.2;

    const knownUniversities = Array.from(new Set([...UNIVERSITY_SUGGESTIONS_POOL, ...strategyRecommendations.map((item) => item.university)]));
    const exactUniversity =
      knownUniversities.find((name) => normalize(name) === normalize(universityKeyword)) ?? null;

    if (universityKeyword && !majorKeyword) {
      if (!exactUniversity) {
        return [];
      }

      const normalizedUniversity = normalize(universityKeyword);
      const majors = UNIVERSITY_MAJOR_POOL[exactUniversity] ?? MAJOR_SUGGESTIONS_POOL;
      const preferredBand = schoolAverage <= 2.2 ? "high" : schoolAverage <= 3.0 ? "mid" : "support";
      const majorBandScore = (major: string) => {
        if (major.includes("경영") || major.includes("경제") || major.includes("통계")) {
          return preferredBand === "high" ? 1 : preferredBand === "mid" ? 2 : 3;
        }
        if (major.includes("영어") || major.includes("사회") || major.includes("행정") || major.includes("언론")) {
          return preferredBand === "mid" ? 1 : 2;
        }
        return preferredBand === "support" ? 1 : 3;
      };

      return majors
        .map((major, index) => {
          const competitiveness = majorBandScore(major);
          const scoreSeed = 76 - competitiveness * 7 - index;
          const evidenceStatus = scoreSeed >= 55 ? ("verified" as const) : ("unverified" as const);
          return {
            id: `uni-major-${normalize(exactUniversity)}-${normalize(major)}`,
            university: exactUniversity,
            major,
            category: "적정" as const,
            fitScore: Math.max(28, Math.min(86, Math.round(scoreSeed - Math.max(0, schoolAverage - 2.4) * 8 - Math.max(0, mockAverage - 2.6) * 5))),
            notes: `${exactUniversity} ${major} 기준 추천 학과\n내신 ${schoolAverage.toFixed(2)} / 모의 ${mockAverage.toFixed(2)} 기준 상위 적합 학과`,
            evidence: {
              title: `${exactUniversity} ${major} 전형 분석`,
              source: "Uni-Mate 학과 추천 로직",
              page: null,
              snippet: `${exactUniversity} 내 지원 성향과 성적 구간을 반영해 추천한 학과입니다.`,
              status: evidenceStatus
            }
          };
        })
        .sort((left, right) => right.fitScore - left.fitScore)
        .slice(0, 3);
    }

    if (!universityKeyword || !majorKeyword) {
      return searchedRecommendations;
    }

    if (!exactUniversity) {
      return [];
    }

    const exactMatch = searchedRecommendations.filter(
      (item) => normalize(item.university) === normalize(universityKeyword) && normalize(item.major) === normalize(majorKeyword)
    );
    if (exactMatch.length > 0) {
      return exactMatch;
    }

    return [
      {
        id: `manual-target-${normalize(universityKeyword)}-${normalize(majorKeyword)}`,
        university: universityKeyword,
        major: majorKeyword,
        category: "적정" as const,
        fitScore: 60,
        notes: "선택한 학교/학과 기준 기본 분석 카드입니다.",
        evidence: {
          title: `${universityKeyword} ${majorKeyword} 전형 분석`,
          source: "Uni-Mate 분석 로직",
          page: null,
          snippet: "입력한 학교와 학과를 기준으로 교과/학종/논술/수능최저없음 전형별 가능성을 계산했습니다.",
          status: "unverified" as const
        }
      }
    ];
  }, [majorSearch, searchedRecommendations, summary.mockAverage, summary.schoolAverage, universitySearch]);

  const universitySuggestions = useMemo(() => {
    const keyword = universitySearch.trim();
    if (!keyword) return [];
    const unique = Array.from(new Set([...UNIVERSITY_SUGGESTIONS_POOL, ...strategyRecommendations.map((item) => item.university)]));
    const sorted = sortByChoseongOrder(unique.filter((name) => matchesKeyword(name, keyword)));
    return clampSuggestionsForSingleRow(sorted);
  }, [strategyRecommendations, universitySearch]);

  const majorSuggestions = useMemo(() => {
    const keyword = majorSearch.trim();
    if (!keyword) return [];
    const unique = Array.from(new Set([...MAJOR_SUGGESTIONS_POOL, ...strategyRecommendations.map((item) => item.major)]));
    const sorted = sortByChoseongOrder(unique.filter((name) => matchesKeyword(name, keyword)));
    return clampSuggestionsForSingleRow(sorted);
  }, [majorSearch, strategyRecommendations]);

  const matchedRecommendations = useMemo(() => {
    const schoolAverageRaw = Number.parseFloat(summary.schoolAverage);
    const mockAverageRaw = Number.parseFloat(summary.mockAverage);
    const schoolAverage = Number.isFinite(schoolAverageRaw) ? schoolAverageRaw : null;
    const mockAverage = Number.isFinite(mockAverageRaw) ? mockAverageRaw : null;
    const hasSchool = schoolAverage !== null;
    const hasMock = mockAverage !== null;
    const defaultSchool = 3.3;
    const defaultMock = 3.2;
    const school = schoolAverage ?? defaultSchool;
    const mock = mockAverage ?? defaultMock;

    const profile = {
      교과: { note: "교과 성적 중심 정량 평가", countBias: 0, visibleMin: 52 },
      학종: { note: "교과+활동 종합 평가", countBias: 1, visibleMin: 50 },
      논술: { note: "논술·수능최저 충족 중심", countBias: -1, visibleMin: 55 },
      "수능최저 없음": { note: "최저 부담이 없는 전형 중심", countBias: 2, visibleMin: 48 }
    }[admissionFilter];

    const withAdmissionScore = selectedTargetRecommendations.map((item, index) => {
      let category: Recommendation["category"];
      let fitScore: number;

      if (admissionFilter === "교과") {
        if (school <= 2.0) {
          category = "안정";
          fitScore = 76 - index;
        } else if (school <= 2.2) {
          category = "적정";
          fitScore = 64 - index;
        } else if (school <= 2.8) {
          category = "도전";
          fitScore = 50 - index;
        } else {
          category = "도전";
          fitScore = 38 - index;
        }
      } else if (admissionFilter === "학종") {
        if (school <= 2.2 && mock <= 2.6) {
          category = "안정";
          fitScore = 74 - index;
        } else if (school <= 2.8 && mock <= 3.0) {
          category = "적정";
          fitScore = 62 - index;
        } else {
          category = "도전";
          fitScore = 48 - index;
        }
      } else if (admissionFilter === "논술") {
        if (mock <= 2.0) {
          category = "안정";
          fitScore = 73 - index;
        } else if (mock <= 2.4) {
          category = "적정";
          fitScore = 61 - index;
        } else {
          category = "도전";
          fitScore = 46 - index;
        }
      } else {
        if (school <= 2.4) {
          category = "안정";
          fitScore = 75 - index;
        } else if (school <= 3.0) {
          category = "적정";
          fitScore = 63 - index;
        } else {
          category = "도전";
          fitScore = 49 - index;
        }
      }

      fitScore = Math.max(24, Math.min(88, fitScore));
      const scoreLine = hasSchool ? `내신 평균 ${school.toFixed(2)}` : "내신 미입력";
      const mockLine = hasMock ? `모의 평균 ${mock.toFixed(2)}` : "모의 미입력";
      const readiness =
        fitScore >= 72 ? "현재 점수 기준으로 유리한 편이에요." : fitScore >= 55 ? "조금 더 보완하면 안정적으로 지원 가능해요." : "상향 지원에 가까워 보완 전략이 필요해요.";

      return {
        ...item,
        category,
        fitScore,
        notes: `${admissionFilter} · ${scoreLine} / ${mockLine}\n${profile.note}\n${readiness}`
      };
    });

    const eligibleCount = withAdmissionScore.filter((item) => item.fitScore >= profile.visibleMin).length;
    const missingPenalty = !hasSchool || !hasMock ? 1 : 0;
    const adjustedCount = Math.max(1, Math.min(6, eligibleCount + profile.countBias - missingPenalty));

    return withAdmissionScore
      .sort((left, right) => right.fitScore - left.fitScore)
      .slice(0, adjustedCount);
  }, [admissionFilter, selectedTargetRecommendations, summary.mockAverage, summary.schoolAverage]);

  return (
    <>
      <PhoneFrame title="전형 분석">
        <SectionTabs
          tabs={[
            { href: "/analysis", label: "전형 탐색" },
            { href: "/analysis/gap", label: "갭 분석" },
            { href: "/analysis/simulation", label: "시뮬레이션" }
          ]}
        />
        <section className="mb-4 rounded-xl bg-[#ebebeb] px-4 py-3">
          <h2 className="app-info-title">전형 탐색이란?</h2>
          <p className="mt-1 app-info-body">
            교과, 학종, 논술 등 전형 조건을 기준으로 나에게 유리한 대학을 찾을 수 있어요. 조건에 맞는 학교를 비교하면서 지원 전략을 세우는 데 도움이 돼요. 학교·학과가 있다면 아래 검색창에서 바로 찾아보세요.
          </p>
        </section>
        <section className="mb-4">
          <label className="relative block">
            <input
              value={universitySearch}
              onChange={(event) => setUniversitySearch(event.target.value)}
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
          {universitySuggestions.length > 0 && (
            <div className="mt-2 flex flex-nowrap gap-2 overflow-hidden">
              {universitySuggestions.map((name) => (
                <button
                  key={`uni-${name}`}
                  type="button"
                  onClick={() => setUniversitySearch(name)}
                  className="shrink-0 rounded-full border border-line bg-white px-3 py-1.5 text-xs text-muted"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
          <label className="relative mt-3 block">
            <input
              value={majorSearch}
              onChange={(event) => setMajorSearch(event.target.value)}
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
          {majorSuggestions.length > 0 && (
            <div className="mt-2 flex flex-nowrap gap-2 overflow-hidden">
              {majorSuggestions.map((name) => (
                <button
                  key={`major-${name}`}
                  type="button"
                  onClick={() => setMajorSearch(name)}
                  className="shrink-0 rounded-full border border-line bg-white px-3 py-1.5 text-xs text-muted"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
          {isHangulJamoQuery(universitySearch.trim()) && universitySuggestions.length === 0 && (
            <p className="mt-2 text-xs text-muted">입력한 초성에 맞는 대학이 없어요.</p>
          )}
          {isHangulJamoQuery(majorSearch.trim()) && majorSuggestions.length === 0 && (
            <p className="mt-2 text-xs text-muted">입력한 초성에 맞는 학과가 없어요.</p>
          )}
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
            {admissionFilter} 전형 매칭 결과 <span className="ml-1 rounded-full bg-[#d9d9d9] px-2 py-0.5 text-xs text-muted">{matchedRecommendations.length}개</span>
          </h3>
          <div className="mt-3 space-y-3">
            {matchedRecommendations.map((item) => (
              <RecommendationCard key={`${admissionFilter}-${item.id}`} recommendation={item} onEvidence={setSelected} />
            ))}
          </div>
        </section>
      </PhoneFrame>
      <BottomNav />
      <EvidenceModal evidence={selected?.evidence ?? null} onClose={() => setSelected(null)} />
    </>
  );
}
