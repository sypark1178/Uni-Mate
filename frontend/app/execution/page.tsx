"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutGroup, motion } from "framer-motion";
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
    listTitle: "이번 달 핵심 미션",
    items: [
      { title: "영어 모의 2등급 달성", desc: "목표까지 약 20점 부족", status: "urgent", checked: false },
      { title: "서강대 학교 활동 포인트 발굴", desc: "탐구 및 통합 활동 1건 기획", status: "urgent", checked: false },
      { title: "모집요강 6개 대학 수집", desc: "완료", status: "done", checked: true },
      { title: "수학 미적분 완성", desc: "진도율 65%로 3단원 복습 필요", status: "progress", checked: false }
    ]
  }
};

const CHART_MIN_X = 24;
const CHART_MAX_X = 296;
const CHART_TOP_Y = 18;
const CHART_BOTTOM_Y = 58;
const CHART_MIN_VALUE = 0;
const CHART_MAX_VALUE = 100;

export default function ExecutionPage() {
  const searchParams = useSearchParams();
  const seededGoals = parseSeededGoals(searchParams);
  useGoals(seededGoals);
  const [mode, setMode] = useState<"week" | "month">("week");
  const [itemsByMode, setItemsByMode] = useState(() => ({
    week: executionData.week.items,
    month: executionData.month.items
  }));
  const analysisLoadingHref = mergeHrefWithSearchParams("/analysis/loading?source=execution", searchParams);

  const currentData = executionData[mode];
  const currentItems = itemsByMode[mode];
  const sortedChecklistItems = useMemo(() => {
    const pending = currentItems.filter((item) => !item.checked);
    const done = currentItems.filter((item) => item.checked);
    return [...pending, ...done];
  }, [currentItems]);
  const checkedCount = currentItems.filter((item) => item.checked).length;
  const computedPercent = Math.round((checkedCount / currentItems.length) * 100);
  const percentTextClass = computedPercent >= 100 ? "text-[18px]" : "text-[22px]";
  const trendValues = useMemo(() => {
    const base = [...currentData.trendValues];
    if (base.length === 0) return base;
    base[base.length - 1] = computedPercent;
    return base;
  }, [computedPercent, currentData.trendValues]);

  const points = useMemo(() => {
    const values = trendValues;
    return values
      .map((value, index) => {
        const clamped = Math.min(CHART_MAX_VALUE, Math.max(CHART_MIN_VALUE, value));
        const x = CHART_MIN_X + ((CHART_MAX_X - CHART_MIN_X) / (values.length - 1)) * index;
        const y =
          CHART_BOTTOM_Y -
          ((clamped - CHART_MIN_VALUE) / (CHART_MAX_VALUE - CHART_MIN_VALUE)) * (CHART_BOTTOM_Y - CHART_TOP_Y);
        return `${x},${y}`;
      })
      .join(" ");
  }, [trendValues]);

  const toggleItem = (title: string) => {
    setItemsByMode((prev) => ({
      ...prev,
      [mode]: prev[mode].map((item) =>
        item.title === title ? { ...item, checked: !item.checked } : item
      )
    }));
  };

  return (
    <>
      <PhoneFrame title="실행 관리">
        <div className="flex w-full gap-2">
          {[
            { key: "week", label: "이번 주" },
            { key: "month", label: "이번 달" }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setMode(tab.key as "week" | "month")}
              className={`flex-1 rounded-full border px-4 py-3 text-sm font-semibold ${
                mode === tab.key ? "border-navy bg-navy text-white" : "border-line bg-white text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <section className="mt-4 rounded-[24px] border border-line bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="relative h-[84px] w-[84px] shrink-0">
              <svg viewBox="0 0 120 120" className="h-[84px] w-[84px] -rotate-90">
                <circle cx="60" cy="60" r="46" fill="none" stroke="#E9EDF3" strokeWidth="9" />
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="#15356A"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={289}
                  strokeDashoffset={289 - (289 * computedPercent) / 100}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-center">
                <div className={`${percentTextClass} font-extrabold leading-none text-navy`}>{computedPercent}%</div>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="app-section-title">{currentData.label}</p>
              <p className="mt-1 text-[22px] font-extrabold leading-tight text-navy">
                {currentData.headlineBase} <span className="text-accent">{computedPercent}%</span> 달성 중
              </p>
              <p className="mt-1 text-sm font-semibold leading-tight text-muted">
                {currentData.deltaLabel} <span className="text-[#1f7a3d]">{currentData.delta}↑</span>
              </p>
            </div>
          </div>
        </section>

        <section className="mt-3">
          <h3 className="app-section-title">{currentData.trendTitle}</h3>
          <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <svg viewBox="0 0 320 112" className="h-[132px] w-full">
              <polyline
                points={points}
                fill="none"
                stroke="#15356A"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {trendValues.map((value, index) => {
                const clamped = Math.min(CHART_MAX_VALUE, Math.max(CHART_MIN_VALUE, value));
                const x =
                  CHART_MIN_X + ((CHART_MAX_X - CHART_MIN_X) / (trendValues.length - 1)) * index;
                const y =
                  CHART_BOTTOM_Y -
                  ((clamped - CHART_MIN_VALUE) / (CHART_MAX_VALUE - CHART_MIN_VALUE)) * (CHART_BOTTOM_Y - CHART_TOP_Y);
                return (
                  <g key={`${value}-${index}`}>
                    <circle
                      cx={x}
                      cy={y}
                      r="5"
                      fill={index === trendValues.length - 1 ? "#FC8B00" : "#FFFFFF"}
                      stroke="#111111"
                      strokeWidth="1.5"
                    />
                    <text
                      x={x}
                      y={y - 10}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="700"
                      fill={index === trendValues.length - 1 ? "#FC8B00" : "#111111"}
                    >
                      {value}%
                    </text>
                    <text x={x} y={100} textAnchor="middle" fontSize="11" fontWeight="600" fill="#667085">
                      {currentData.trendLabels[index]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </section>

        <section className="mt-4">
          <div className="mb-3">
            <h3 className="app-section-title">{currentData.listTitle}</h3>
          </div>
          <LayoutGroup id={`execution-checklist-${mode}`}>
            <div className="space-y-3">
              {sortedChecklistItems.map((item) => {
                return (
                  <motion.label
                    key={`${mode}-${item.title}`}
                    layout
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 34,
                      mass: 0.85
                    }}
                    className="grid grid-cols-[28px_1fr_auto] items-center gap-3 rounded-2xl border border-line bg-white p-4"
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleItem(item.title)}
                      className="h-6 w-6 rounded-md border border-slate-300 accent-navy"
                    />
                    <div>
                      <div className={`font-semibold ${item.checked ? "text-muted line-through" : ""}`}>{item.title}</div>
                      <div className={`mt-1 text-xs ${item.checked ? "text-muted line-through" : "text-muted"}`}>
                        {item.desc}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-2 text-xs font-extrabold ${
                        item.checked ? "bg-normal text-black" : "bg-[#F5D3D1] text-black"
                      }`}
                    >
                      {item.checked ? "완료" : "할일"}
                    </span>
                  </motion.label>
                );
              })}
            </div>
          </LayoutGroup>
        </section>
      </PhoneFrame>
      <BottomNav />
    </>
  );
}
