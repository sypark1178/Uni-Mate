'use client'

import { useState } from 'react'

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

export default function EvidenceViewer({
  admissionId,
  studentId = 100
}: {
  admissionId: number
  studentId?: number
}) {
  const [data, setData] = useState<FullAnalysis | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleOpen = async () => {
    setLoading(true)
    try {
      const res = await fetch(`http://127.0.0.1:8004/api/full-analysis/${studentId}/${admissionId}`)
      const json = await res.json()
      if (json.error) {
        alert(json.error)
        return
      }
      setData(json)
      setOpen(true)
    } catch (e) {
      alert('데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={handleOpen} style={{
        padding: '6px 14px',
        backgroundColor: '#1a3a6b',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '13px'
      }}>
        {loading ? '분석 중...' : '근거 보기'}
      </button>

      {open && data && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            width: '360px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
          }}>
            <p style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
              EVIDENCE VIEWER
            </p>
            <h2 style={{ fontSize: '17px', fontWeight: 'bold', marginBottom: '4px' }}>
              {data.univ_name} {data.dept_name} AI 분석 결과
            </h2>
            <p style={{ fontSize: '11px', color: '#888', marginBottom: '16px' }}>
              {data.univ_name} 입학처 / Uni-Mate RAG · 출처: {data.source_doc}
            </p>

            <div style={{
              backgroundColor: '#f8f9fa',
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '12px',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              {data.summary}
            </div>

            <div style={{
              backgroundColor: '#f0f4ff',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '12px',
              color: '#555'
            }}>
              <div style={{ marginBottom: '6px', fontWeight: 'bold', color: '#333' }}>
                산출 근거
              </div>
              <div>내신 환산등급: {data.weighted_grade}</div>
              <div>생기부 등급: {data.record_scores.등급}등급 (총점 {data.record_scores.총점})</div>
              <div>종합등급: {data.composite_score}</div>
              <div style={{ marginTop: '6px', fontSize: '11px', color: '#888' }}>
                전공적합성 {data.record_scores.전공적합성} ·
                활동깊이 {data.record_scores.활동깊이} ·
                지속성 {data.record_scores.지속성} ·
                주도성 {data.record_scores.주도성} ·
                보너스 +{data.record_scores.보너스}
              </div>
            </div>

            <div style={{
              marginTop: '12px',
              padding: '12px',
              border: '1px dashed #ccc',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#888'
            }}>
              원문 하이라이트 대상 구간으로 연결 가능한 상태입니다.
            </div>

            <button onClick={() => setOpen(false)} style={{
              marginTop: '16px', width: '100%', padding: '12px',
              backgroundColor: '#1a3a6b', color: 'white',
              border: 'none', borderRadius: '8px',
              cursor: 'pointer', fontSize: '15px'
            }}>
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  )
}