"use client";

import { useState } from "react";

type SimulationPanelProps = {
  baseRate: number;
};

export function SimulationPanel({ baseRate }: SimulationPanelProps) {
  const [gpa, setGpa] = useState(1.6);
  const [mock, setMock] = useState(1.8);
  const [minRequirementMet, setMinRequirementMet] = useState(true);

  const adjusted = Math.min(
    95,
    Math.round(baseRate + Math.max(0, (2.2 - gpa) * 15) + Math.max(0, (2.1 - mock) * 12) + (minRequirementMet ? 7 : -10))
  );
  const diff = adjusted - baseRate;

  return (
    <section className="rounded-[24px] bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">시뮬레이션</h3>
        <span className="text-xs text-muted">가정값 즉시 반영</span>
      </div>
      <div className="space-y-4">
        <label className="block">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>내신 조정</span>
            <strong className="text-accent">{gpa.toFixed(1)}</strong>
          </div>
          <input
            type="range"
            min="1"
            max="9"
            step="0.1"
            value={gpa}
            onChange={(event) => setGpa(Number(event.target.value))}
            className="w-full"
          />
        </label>
        <label className="block">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>모의고사 조정</span>
            <strong className="text-accent">{mock.toFixed(1)}</strong>
          </div>
          <input
            type="range"
            min="1"
            max="9"
            step="0.1"
            value={mock}
            onChange={(event) => setMock(Number(event.target.value))}
            className="w-full"
          />
        </label>
        <button
          type="button"
          onClick={() => setMinRequirementMet((prev) => !prev)}
          className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm ${
            minRequirementMet ? "border-navy bg-mist text-navy" : "border-line text-muted"
          }`}
        >
          <span>수능 최저 충족</span>
          <span>{minRequirementMet ? "ON" : "OFF"}</span>
        </button>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-mist px-4 py-4 text-center">
          <div className="text-xs text-muted">현재 조건</div>
          <div className="mt-2 text-2xl font-semibold text-navy">{baseRate}%</div>
        </div>
        <div className="rounded-2xl bg-mist px-4 py-4 text-center">
          <div className="text-xs text-muted">변경 후</div>
          <div className="mt-2 text-2xl font-semibold text-navy">{adjusted}%</div>
          <div className={`mt-2 text-xs font-semibold ${diff >= 0 ? "text-accent" : "text-rose-600"}`}>
            {diff >= 0 ? `+${diff}%p 상승` : `${diff}%p 하락`}
          </div>
        </div>
      </div>
    </section>
  );
}
