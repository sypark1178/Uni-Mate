"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { PhoneFrame } from "@/components/phone-frame";
import { mergeHrefWithSearchParams } from "@/lib/navigation";
import { parseSeededGoals } from "@/lib/planning";
import { useGoals } from "@/lib/use-goals";

type ExecutionItem = {
  title: string;
  desc: string;
  status: "done" | "progress" | "urgent";
  checked: boolean;
};

type ExecutionMode = {
  label: string;
  headlineBase: string;
  deltaLabel: string;
  delta: string;
  percent: number;
  summary: string;
  trendTitle: string;
  trendLabels: string[];
  trendValues: number[];
  listTitle: string;
  items: ExecutionItem[];
};

const executionData: Record<"week" | "month", ExecutionMode> = {
  week: {
    label: "주간 달성률",
    headlineBase: "이번 주",
    deltaLabel: "지난 주 대비",
    delta: "+8%p",
    percent: 61,
    summary:
      "내신 평균 2.0등급으로 상위권 대학 교과전형 지원 가능 구간입니다. 수능 최저 충족 여부가 이번 주 핵심 관리 포인트입니다.",
    trendTitle: "주간 진도율 변화",
    trendLabels: ["3주 전", "2주 전", "지난 주", "이번 주"],
    trendValues: [48, 53, 57, 61],
    listTitle: "체크리스트",
    items: [
      { title: "학생부 비교과 활동 정리", desc: "비교과 활동 누락 여부 확인", status: "done", checked: true },
      { title: "자기소개서 1번 초안 작성", desc: "지원 동기와 경험 구조 정리", status: "done", checked: true },
      { title: "수능 최저 수학 모의고사 1회", desc: "목표 등급까지 약 20점 부족", status: "progress", checked: false },
      { title: "서강대 모집요강 다운로드", desc: "전형별 지원 조건 다시 확인", status: "urgent", checked: false }
    ]
  },
  month: {
    label: "월간 달성률",
    headlineBase: "이번 달",
    deltaLabel: "지난달 대비",
    delta: "+10%p",
    percent: 73,
    summary:
      "이번 달 기준 실행 성과가 양호합니다. 아직 영어와 면접 대비 보완 여지가 남아 있어 우선순위 관리가 중요합니다.",
    trendTitle: "월간 진도율 변화",
    trendLabels: ["2월", "3월", "4월", "5월"],
    trendValues: [51, 59, 63, 73],
    listTitle: "이번 달 도달 미션",
    items: [
      { title: "영어 모의 2등급 달성", desc: "목표까지 약 20점 부족", status: "urgent", checked: false },
      { title: "서강대 학교 활동 포인트 발굴", desc: "탐구 및 통합 활동 1건 기획", status: "urgent", checked: false },
      { title: "모집요강 6개 대학 수집", desc: "완료", status: "done", checked: true },
      { title: "수학 미적분 완성", desc: "진도율 65%로 3단원 복습 필요", status: "progress", checked: false }
    ]
  }
};

const statusClassMap = {
  done: "bg-normal",
  progress: "bg-safe",
  urgent: "bg-danger"
} as const;

const statusLabelMap = {
  done: "완료",
  progress: "진행",
  urgent: "긴급"
} as const;

export default function ExecutionPage() {
  const searchParams = useSearchParams();
  const seededGoals = parseSeededGoals(searchParams);
  const { goals } = useGoals(seededGoals);
  const [mode, setMode] = useState<"week" | "month">("week");
  const [itemsByMode, setItemsByMode] = useState(() => ({
    week: executionData.week.items,
    month: executionData.month.items
  }));
  const analysisLoadingHref = mergeHrefWithSearchParams("/analysis/loading?source=execution", searchParams);

  const currentData = executionData[mode];
  const currentItems = itemsByMode[mode];
  const checkedCount = currentItems.filter((item) => item.checked).length;
  const computedPercent = Math.round((checkedCount / currentItems.length) * 100);

  const points = useMemo(() => {
    const values = currentData.trendValues;
    const min = 40;
    const max = 80;
    return values
      .map((value, index) => {
        const x = 15 + (290 / (values.length - 1)) * index;
        const y = 60 - ((value - min) / (max - min)) * 40;
        return `${x},${y}`;
      })
      .join(" ");
  }, [currentData.trendValues]);

  const toggleItem = (index: number) => {
    setItemsByMode((prev) => ({
      ...prev,
      [mode]: prev[mode].map((item, itemIndex) =>
        itemIndex === index ? { ...item, checked: !item.checked } : item
      )
    }));
  };

  return (
    <>
      <PhoneFrame title="실행 관리" subtitle="체크리스트와 실행률을 주간 또는 월간 기준으로 확인할 수 있어요.">
        <div className="mb-3 rounded-2xl bg-mist px-4 py-3 text-xs leading-5 text-muted">
          목표 입력: {goals.map((goal, index) => `${index + 1}순위 ${goal.university} ${goal.major}`).join(" / ")}
        </div>
        <div className="flex gap-2 rounded-full border border-line bg-white p-1 shadow-soft">
          {[
            { key: "week", label: "이번 주" },
            { key: "month", label: "이번 달" }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setMode(tab.key as "week" | "month")}
              className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold ${
                mode === tab.key ? "bg-navy text-white" : "text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <section className="mt-4 rounded-[24px] border border-line bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <div className="relative h-32 w-32 shrink-0">
              <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
                <circle cx="60" cy="60" r="46" fill="none" stroke="#E9EDF3" strokeWidth="12" />
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="#15356A"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={289}
                  strokeDashoffset={289 - (289 * computedPercent) / 100}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="text-3xl font-extrabold text-navy">{computedPercent}%</div>
                <div className="mt-2 text-xs font-semibold text-muted">{currentData.label}</div>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-extrabold">
                {currentData.headlineBase} {computedPercent}% 달성 중
              </h2>
              <p className="mt-3 text-sm leading-6 text-ink">{currentData.summary}</p>
              <div className="mt-3 text-sm font-semibold text-muted">
                {currentData.deltaLabel} <strong className="text-[#59A056]">{currentData.delta}</strong>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-base font-extrabold">{currentData.trendTitle}</h3>
            <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <svg viewBox="0 0 320 80" className="h-24 w-full">
                <polyline
                  points={points}
                  fill="none"
                  stroke="#15356A"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {currentData.trendValues.map((value, index) => {
                  const x = 15 + (290 / (currentData.trendValues.length - 1)) * index;
                  const y = 60 - ((value - 40) / 40) * 40;
                  return (
                    <g key={`${value}-${index}`}>
                      <circle
                        cx={x}
                        cy={y}
                        r="5"
                        fill={index === currentData.trendValues.length - 1 ? "#111111" : "#FFFFFF"}
                        stroke="#111111"
                        strokeWidth="1.5"
                      />
                      <text
                        x={x}
                        y={y - 10}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="700"
                        fill={index === currentData.trendValues.length - 1 ? "#FC8B00" : "#111111"}
                      >
                        {value}%
                      </text>
                    </g>
                  );
                })}
              </svg>
              <div className="mt-2 grid grid-cols-4 text-center text-xs text-muted">
                {currentData.trendLabels.map((label) => (
                  <div key={label}>{label}</div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-[24px] border border-line bg-white p-5 shadow-soft">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-extrabold">{currentData.listTitle}</h3>
              <p className="mt-1 text-sm text-muted">항목을 체크하면 실행률이 즉시 반영됩니다.</p>
            </div>
            <Link
              href={analysisLoadingHref}
              className="min-w-[144px] whitespace-nowrap rounded-full bg-navy px-5 py-3 text-center text-sm font-extrabold text-white"
            >
              AI 분석 시작
            </Link>
          </div>
          <div className="space-y-3">
            {currentItems.map((item, index) => (
              <label
                key={`${item.title}-${index}`}
                className="grid grid-cols-[28px_1fr_auto] items-center gap-3 rounded-2xl border border-line bg-white p-4"
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleItem(index)}
                  className="h-6 w-6 rounded-md border border-slate-300 accent-navy"
                />
                <div>
                  <div className={`font-semibold ${item.checked ? "text-muted line-through" : ""}`}>{item.title}</div>
                  <div className={`mt-1 text-xs ${item.checked ? "text-muted line-through" : "text-muted"}`}>
                    {item.desc}
                  </div>
                </div>
                <span className={`rounded-full px-3 py-2 text-xs font-extrabold ${statusClassMap[item.status]}`}>
                  {statusLabelMap[item.status]}
                </span>
              </label>
            ))}
          </div>
        </section>
      </PhoneFrame>
      <BottomNav />
    </>
  );
}
