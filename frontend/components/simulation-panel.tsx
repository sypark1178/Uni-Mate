"use client";

import { useState } from "react";

type SimulationPanelProps = {
  baseRate: number;
  contextLabel?: string;
};

export function SimulationPanel({ baseRate, contextLabel }: SimulationPanelProps) {
  const [gpa, setGpa] = useState(1.6);
  const [mock, setMock] = useState(1.8);
  const [minRequirementMet, setMinRequirementMet] = useState(true);
  const rangeMin = 1;
  const rangeMax = 9;

  const adjusted = Math.min(
    95,
    Math.round(baseRate + Math.max(0, (2.2 - gpa) * 15) + Math.max(0, (2.1 - mock) * 12) + (minRequirementMet ? 7 : -10))
  );
  const diff = adjusted - baseRate;
  const gpaPercent = ((gpa - rangeMin) / (rangeMax - rangeMin)) * 100;
  const mockPercent = ((mock - rangeMin) / (rangeMax - rangeMin)) * 100;

  return (
    <section className="rounded-[24px] bg-white p-4">
      <div className="mb-4">
        <h3 className="app-section-title">시뮬레이션</h3>
      </div>
      <div className="rounded-[18px] bg-[#ebebeb] p-4">
        <div className="space-y-4">
          <label className="block">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>내신 등급 조정</span>
              <strong className="text-accent">{gpa.toFixed(1)}</strong>
            </div>
            <input
              type="range"
              min={rangeMin}
              max={rangeMax}
              step="0.1"
              value={gpa}
              onChange={(event) => setGpa(Number(event.target.value))}
              className="simulation-slider w-full"
              style={{ backgroundSize: `${gpaPercent}% 100%` }}
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
              <span>1.0</span>
              <span>9.0</span>
            </div>
          </label>
          <label className="block">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>모의고사 등급 조정</span>
              <strong className="text-accent">{mock.toFixed(1)}</strong>
            </div>
            <input
              type="range"
              min={rangeMin}
              max={rangeMax}
              step="0.1"
              value={mock}
              onChange={(event) => setMock(Number(event.target.value))}
              className="simulation-slider w-full"
              style={{ backgroundSize: `${mockPercent}% 100%` }}
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
              <span>1.0</span>
              <span>9.0</span>
            </div>
          </label>
          <button
            type="button"
            onClick={() => setMinRequirementMet((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink"
            aria-pressed={minRequirementMet}
          >
            <span>수능 최저 충족</span>
            <span
              className={`relative h-[30px] w-16 rounded-full transition ${
                minRequirementMet ? "bg-navy" : "bg-slate-300"
              }`}
              aria-hidden="true"
            >
              <span
                className={`absolute top-[3px] h-6 w-6 rounded-full bg-white transition ${
                  minRequirementMet ? "left-[37px]" : "left-[3px]"
                }`}
              />
            </span>
          </button>
        </div>
      </div>
      <section className="mt-5">
        <h4 className="app-section-title mb-2">시뮬레이션 결과 (합격 가능성 변화)</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex min-h-[102px] flex-col items-center justify-between rounded-2xl bg-[#ebebeb] px-4 py-2.5 text-center">
            <div className="text-[13px] font-medium text-muted">현재 조건</div>
            <div className="text-[26px] font-semibold leading-none text-navy">{baseRate}%</div>
            <div className="min-h-[16px] text-[11px] font-medium text-muted">{contextLabel ?? "-"}</div>
          </div>
          <div className="flex min-h-[102px] flex-col items-center justify-between rounded-2xl bg-[#ebebeb] px-4 py-2.5 text-center">
            <div className="text-[13px] font-medium text-muted">변경 후</div>
            <div className="text-[26px] font-semibold leading-none text-navy">{adjusted}%</div>
            <div className={`min-h-[16px] text-[11px] font-semibold ${diff >= 0 ? "text-[#1f7a3d]" : "text-rose-600"}`}>
              {diff >= 0 ? `+${diff}%p 상승` : `${diff}%p 하락`}
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
