"use client";

import { useState, useEffect } from "react";
import type { Evidence } from "@/lib/types";

type EvidenceModalProps = {
  evidence: Evidence | null;
  onClose: () => void;
  admissionId?: number;
  studentId?: number;
};

interface FullAnalysis {
  univ_name: string
  dept_name: string
  pass_prob: number
  summary: string
  source_doc: string
  composite_score: number
  weighted_grade: number
  record_scores: {
    전공적합성: number
    활동깊이: number
    지속성: number
    주도성: number
    보너스: number
    총점: number
    등급: number
  }
}

function getSourceLabel(univName: string): string {
  const currentYear = new Date().getFullYear()
  const admissionYear = currentYear
  const resultYear = currentYear - 1
  const admissionYearShort = String(admissionYear).slice(2)
  const resultYearShort = String(resultYear).slice(2)
  return `Uni-Mate RAG / 출처: ${univName} ${admissionYearShort}년도 모집요강, ${resultYearShort}년도 입시 결과`
}

export function EvidenceModal({ evidence, onClose, admissionId, studentId = 100 }: EvidenceModalProps) {
  const [data, setData] = useState<FullAnalysis | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!evidence) return
    if (!admissionId) return

    setLoading(true)
    setData(null)
    fetch(`http://127.0.0.1:8004/api/full-analysis/${studentId}/${admissionId}`)
      .then(res => res.json())
      .then(json => {
        if (!json.error) setData(json)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [evidence, admissionId, studentId])

  if (!evidence) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="w-full max-w-[360px] rounded-[24px] border border-navy bg-white p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Evidence Viewer
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted">AI 분석 중...</div>
        ) : data ? (
          <>
            <h2 className="text-xl font-semibold">
              {data.univ_name} {data.dept_name} AI 분석 결과
            </h2>
            <p className="mt-1 text-sm text-muted">
              {getSourceLabel(data.univ_name)}
            </p>
            <div className="mt-4 rounded-2xl bg-mist p-4 text-sm leading-6 text-ink">
              {data.summary}
            </div>
            <div className="mt-4 rounded-2xl bg-[#f0f4ff] p-4 text-sm">
              <div className="font-semibold text-ink mb-2">산출 근거</div>
              <div className="text-muted">내신 환산등급: {data.weighted_grade}</div>
              <div className="text-muted">생기부 등급: {data.record_scores.등급}등급 (총점 {data.record_scores.총점})</div>
              <div className="text-muted">종합등급: {data.composite_score}</div>
              <div className="mt-2 text-xs text-muted">
                전공적합성 {data.record_scores.전공적합성} ·
                활동깊이 {data.record_scores.활동깊이} ·
                지속성 {data.record_scores.지속성} ·
                주도성 {data.record_scores.주도성} ·
                보너스 +{data.record_scores.보너스}
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-dashed border-line p-4 text-sm">
              원문 하이라이트 대상 구간으로 연결 가능한 상태입니다.
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold">{evidence.title}</h2>
            <p className="mt-1 text-sm text-muted">{evidence.source}</p>
            <div className="mt-4 rounded-2xl bg-mist p-4 text-sm leading-6 text-ink">
              {evidence.snippet}
            </div>
            <div className="mt-4 rounded-2xl border border-dashed border-line p-4 text-sm">
              {evidence.status === "verified"
                ? "원문 하이라이트 대상 구간으로 연결 가능한 상태입니다."
                : "수치 근거가 아직 확보되지 않아 확인 불가 상태로 표시합니다."}
            </div>
          </>
        )}

        <button
          className="mt-5 w-full rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white"
          onClick={onClose}
        >
          닫기
        </button>
      </div>
    </div>
  )
}