"use client";

import type { Evidence } from "@/lib/types";

type EvidenceModalProps = {
  evidence: Evidence | null;
  onClose: () => void;
};

export function EvidenceModal({ evidence, onClose }: EvidenceModalProps) {
  if (!evidence) return null;

  const pageText = evidence.page ? `${evidence.page}페이지` : "확인 불가";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="w-full max-w-[360px] rounded-[24px] border border-navy bg-white p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Evidence Viewer</div>
        <h2 className="text-xl font-semibold">{evidence.title}</h2>
        <p className="mt-1 text-sm text-muted">
          {evidence.source} · {pageText}
        </p>
        <div className="mt-4 rounded-2xl bg-mist p-4 text-sm leading-6 text-ink">
          {evidence.snippet}
        </div>
        <div className="mt-4 rounded-2xl border border-dashed border-line p-4 text-sm">
          {evidence.status === "verified"
            ? "원문 하이라이트 대상 구간으로 연결 가능한 상태입니다."
            : "수치 근거가 아직 확보되지 않아 확인 불가 상태로 표시합니다."}
        </div>
        <button className="mt-5 w-full rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
