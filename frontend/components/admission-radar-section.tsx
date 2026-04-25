"use client";

import { useMemo } from "react";
import type { RadarAxisModel } from "@/lib/gap-radar";
import { buildAdmissionRadarModel } from "@/lib/gap-radar";
import type { Recommendation } from "@/lib/types";

type AdmissionRadarSectionProps = {
  university: string;
  major: string;
  schoolAverage: string;
  mockAverage: string;
  admissionChance?: number;
  admissionCategory?: Recommendation["category"];
};

/** 바깥 축 라벨까지 포함하도록 여백 확보 */
const VB = 300;
const CX = VB / 2;
const CY = VB / 2;
const R_MAX = 96;
const N = 6;
const TARGET_TONE = "#ea580c";
const CURRENT_TONE = "#2e3f5d";

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function angleForIndex(index: number) {
  return toRad(-90 + (360 / N) * index);
}

function pointOnRadar(value: number, index: number) {
  const angle = angleForIndex(index);
  const r = (clampPercent(value) / 100) * R_MAX;
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
}

function clampPercent(v: number) {
  return Math.min(100, Math.max(0, v));
}

function polygonPoints(values: number[]) {
  return values
    .map((v, i) => {
      const { x, y } = pointOnRadar(v, i);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

/** 축별 설명·수치(바깥 고정 반경, 균등 배치) */
function axisLabelGroupPosition(index: number) {
  const angle = angleForIndex(index);
  const r = R_MAX + 28;
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
}

function RingGrid({ fraction }: { fraction: number }) {
  const pts = Array.from({ length: N }, (_, i) => {
    const { x, y } = pointOnRadar(fraction * 100, i);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  return <polygon points={pts} fill="none" stroke="#c4ccd7" strokeWidth={0.95} opacity={0.95} />;
}

function AxisSpokes() {
  return (
    <>
      {Array.from({ length: N }, (_, i) => {
        const { x, y } = pointOnRadar(100, i);
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#d6dde7" strokeWidth={1.05} />;
      })}
    </>
  );
}

function RadarChart({ axes }: { axes: RadarAxisModel[] }) {
  const targets = axes.map((a) => a.target);
  const currents = axes.map((a) => a.current);

  return (
    <div className="rounded-[18px] bg-[#ebebeb] px-3 py-4">
      <div className="mb-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-2">
          <svg width="36" height="10" viewBox="0 0 36 10" aria-hidden className="shrink-0">
            <line x1="0" y1="5" x2="36" y2="5" stroke={TARGET_TONE} strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" />
          </svg>
          <span className="font-medium tracking-tight">합격권 평균</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <svg width="36" height="10" viewBox="0 0 36 10" aria-hidden className="shrink-0">
            <line x1="0" y1="5" x2="36" y2="5" stroke={CURRENT_TONE} strokeWidth="2.25" strokeLinecap="round" />
          </svg>
          <span className="font-medium tracking-tight">현재 상태</span>
        </span>
      </div>
      <div className="mx-auto flex w-full max-w-[420px] justify-center px-1">
        <svg
          viewBox={`0 0 ${VB} ${VB}`}
          className="aspect-square w-full max-h-[420px] min-h-[260px]"
          role="img"
          aria-label="합격 가능성 체크 방사형 차트"
        >
          <defs>
            <linearGradient id="radarCurrentFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={CURRENT_TONE} stopOpacity="0.14" />
              <stop offset="100%" stopColor={CURRENT_TONE} stopOpacity="0.06" />
            </linearGradient>
            <filter id="radarSoftShadow" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.08" />
            </filter>
          </defs>
          <AxisSpokes />
          <RingGrid fraction={0.25} />
          <RingGrid fraction={0.5} />
          <RingGrid fraction={0.75} />
          <RingGrid fraction={1} />
          <polygon
            points={polygonPoints(targets)}
            fill="none"
            stroke={TARGET_TONE}
            strokeWidth={1.9}
            strokeDasharray="6 4"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.98}
          />
          <polygon
            points={polygonPoints(currents)}
            fill="url(#radarCurrentFill)"
            stroke={CURRENT_TONE}
            strokeWidth={2.3}
            strokeLinejoin="round"
            strokeLinecap="round"
            filter="url(#radarSoftShadow)"
          />
          {axes.map((axis, i) => {
            const { x, y } = axisLabelGroupPosition(i);
            return (
              <g key={axis.key} transform={`translate(${x.toFixed(2)},${y.toFixed(2)})`}>
                <text textAnchor="middle" y={-12} fill="#111827" style={{ fontSize: "10px", fontWeight: 700 }}>
                  {axis.shortLabel}
                </text>
                <text textAnchor="middle" y={4} fill={CURRENT_TONE} style={{ fontSize: "10px", fontWeight: 700 }} className="tabular-nums">
                  {axis.current}
                </text>
                <text textAnchor="middle" y={19} fill={TARGET_TONE} style={{ fontSize: "10px", fontWeight: 700 }}>
                  합격권 {axis.target}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function ProgressRow({ axis }: { axis: RadarAxisModel }) {
  const pct = clampPercent(axis.current);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="font-medium text-ink">{axis.label}</span>
        <span className="shrink-0 tabular-nums">
          <span className="text-muted">현재 {axis.current}% → </span>
          <span style={{ color: axis.barColor, fontWeight: 700 }}>합격권 {axis.target}%</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full border border-[#d7dce2] bg-white">
        <div className="h-full rounded-full transition-[width]" style={{ width: `${pct}%`, backgroundColor: axis.barColor }} />
      </div>
    </div>
  );
}

export function AdmissionRadarSection({
  university,
  major,
  schoolAverage,
  mockAverage,
  admissionChance,
  admissionCategory
}: AdmissionRadarSectionProps) {
  const model = useMemo(
    () => buildAdmissionRadarModel(university, major, schoolAverage, mockAverage),
    [university, major, schoolAverage, mockAverage]
  );
  const chanceText = Number.isFinite(admissionChance) ? `${Math.round(admissionChance ?? 0)}%` : `${model.axes[3]?.current ?? 0}%`;
  const categoryLabel = admissionCategory ?? "적정";
  const chanceTheme =
    categoryLabel === "도전"
      ? { cardClass: "bg-danger", valueClass: "text-[#b98484]" }
      : categoryLabel === "안정"
        ? { cardClass: "bg-safe", valueClass: "text-[#6f9b84]" }
        : { cardClass: "bg-normal", valueClass: "text-[#5f86b3]" };

  return (
    <section className="mt-4 space-y-4">
      <h3 className="text-[15px] font-semibold leading-tight text-ink">합격 가능성 체크</h3>
      <div className="rounded-[22px] border border-line bg-[#ebebeb] p-3">
        <div className="grid grid-cols-4 gap-2">
          <div className={`flex flex-col justify-between rounded-2xl border border-line px-2 py-2.5 text-center ${chanceTheme.cardClass}`}>
            <div className="text-[9px] font-medium uppercase tracking-wide text-ink/85">합격가능성</div>
            <div className={`my-1 text-lg font-extrabold tabular-nums leading-none ${chanceTheme.valueClass}`}>{chanceText}</div>
            <div className="text-[9px] leading-tight font-semibold text-ink/85">{categoryLabel}</div>
          </div>
          {model.summaryCards.map((card) => (
            <div key={card.key} className="flex flex-col justify-between rounded-2xl border border-line bg-white px-2 py-2.5 text-center">
              <div className="text-[9px] font-medium uppercase tracking-wide text-muted">{card.label}</div>
              <div className={`my-1 text-lg font-bold tabular-nums leading-none ${card.valueClass}`}>{card.value}</div>
              <div className="text-[9px] leading-tight text-muted">{card.sub}</div>
            </div>
          ))}
        </div>
        <RadarChart axes={model.axes} />
        <div className="space-y-3.5 rounded-[18px] bg-[#ebebeb] p-4">
          {model.axes.map((axis) => (
            <ProgressRow key={axis.key} axis={axis} />
          ))}
        </div>
      </div>
    </section>
  );
}
