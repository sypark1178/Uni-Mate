'use client'

import { useState, useEffect } from 'react'
import { BottomNav } from '@/components/bottom-nav'
import { PhoneFrame } from '@/components/phone-frame'
import EvidenceViewer from '@/components/EvidenceViewer.local'

interface Recommendation {
  admission_id: number
  univ_name: string
  dept_name: string
  cutoff_50: number
  competition_ratio: string | number
  strategy_type: string
}

interface SmartResult {
  student_id: number
  weighted_grade: number
  recommendations: Recommendation[]
}

export default function LocalStrategyPage() {
  const [studentId, setStudentId] = useState(100)
  const [input, setInput] = useState('100')
  const [result, setResult] = useState<SmartResult | null>(null)
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState<'전체' | '도전' | '적정' | '안정'>('전체')

  const fetchRecs = async (id: number) => {
    setError('')
    setResult(null)
    try {
      const res = await fetch(`http://127.0.0.1:8004/api/smart-recommendations/${id}`)
      const json = await res.json()
      if (json.error) {
        setError(json.error)
      } else {
        setResult(json)
      }
    } catch (e) {
      setError('서버 연결 실패')
    }
  }

  useEffect(() => {
    fetchRecs(100)
  }, [])

  const handleSearch = () => {
    const id = parseInt(input)
    if (!isNaN(id)) {
      setStudentId(id)
      fetchRecs(id)
    }
  }

  const filtered = result?.recommendations.filter(r =>
    activeFilter === '전체' ? true : r.strategy_type === activeFilter
  ) ?? []

  const counts = {
    전체: result?.recommendations.length ?? 0,
    도전: result?.recommendations.filter(r => r.strategy_type === '도전').length ?? 0,
    적정: result?.recommendations.filter(r => r.strategy_type === '적정').length ?? 0,
    안정: result?.recommendations.filter(r => r.strategy_type === '안정').length ?? 0,
  }

  const categoryColor = (type: string) => {
    if (type === '도전') return { bg: '#fde8e8', text: '#c0392b' }
    if (type === '적정') return { bg: '#e0f2fe', text: '#1a56db' }
    return { bg: '#dcfce7', text: '#166534' }
  }

  return (
    <>
      <PhoneFrame title="추천 전략 (로컬 테스트)">

        {/* 학생 ID 입력 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="number"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="student_id"
            style={{
              flex: 1, padding: '8px 12px',
              border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px'
            }}
          />
          <button onClick={handleSearch} style={{
            padding: '8px 16px', backgroundColor: '#1a3a6b',
            color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer'
          }}>
            조회
          </button>
        </div>

        {/* 학생 정보 */}
        {result && (
          <div style={{
            backgroundColor: '#f0f4ff', borderRadius: '12px',
            padding: '12px', marginBottom: '16px', fontSize: '13px'
          }}>
            student_id: {result.student_id} | 환산 내신: <strong>{result.weighted_grade}등급</strong>
          </div>
        )}

        {/* 추천 전략 안내 */}
        <section style={{
          backgroundColor: '#ebebeb', borderRadius: '12px',
          padding: '12px', marginBottom: '16px'
        }}>
          <p style={{ fontWeight: 'bold', fontSize: '13px', margin: 0 }}>추천 전략이 중요한 이유</p>
          <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0' }}>
            지원 가능한 학교를 구간별로 나눠, 합격 가능성을 한눈에 확인할 수 있어요.
          </p>
        </section>

        {/* 필터 탭 */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          {(['전체', '도전', '적정', '안정'] as const).map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: '6px 12px', borderRadius: '20px', fontSize: '12px',
                fontWeight: 'bold', cursor: 'pointer', border: 'none',
                backgroundColor: activeFilter === f ? '#1a3a6b' : '#f3f4f6',
                color: activeFilter === f ? 'white' : '#333'
              }}
            >
              {f} {counts[f]}
            </button>
          ))}
        </div>

        {error && <p style={{ color: 'red', fontSize: '13px' }}>{error}</p>}

        {/* 추천 카드 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(rec => {
            const color = categoryColor(rec.strategy_type)
            return (
              <div key={rec.admission_id} style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '16px',
                padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{rec.univ_name}</span>
                    <span style={{ marginLeft: '6px', fontSize: '13px', color: '#555' }}>{rec.dept_name}</span>
                  </div>
                  <span style={{
                    padding: '2px 10px', borderRadius: '12px',
                    backgroundColor: color.bg, color: color.text,
                    fontSize: '12px', fontWeight: 'bold'
                  }}>
                    {rec.strategy_type}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>
                  수능 조건 X · 내신 평균 {result?.weighted_grade}
                </div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                  50%컷: {rec.cutoff_50} | 경쟁률: {rec.competition_ratio}
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginTop: '10px'
                }}>
                  <span style={{ fontSize: '13px', color: color.text, fontWeight: 'bold' }}>
                    근거 보기 →
                  </span>
                  <EvidenceViewer admissionId={rec.admission_id} studentId={studentId} />
                </div>
              </div>
            )
          })}
        </div>

      </PhoneFrame>
      <BottomNav />
    </>
  )
}