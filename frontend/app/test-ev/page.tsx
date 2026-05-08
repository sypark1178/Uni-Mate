'use client'

import { useState, useEffect } from 'react'
import EvidenceViewer from '../../components/EvidenceViewer.local'

interface Recommendation {
  admission_id: number
  univ_name: string
  dept_name: string
  admission_method: string
  cutoff_50: number
  competition_ratio: string | number
  strategy_type: string
}

interface SmartResult {
  student_id: number
  weighted_grade: number
  recommendations: Recommendation[]
}

export default function TestEvPage() {
  const [input, setInput] = useState('100')
  const [result, setResult] = useState<SmartResult | null>(null)
  const [error, setError] = useState('')

  const fetchRecs = async (id: string) => {
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
    fetchRecs('100')
  }, [])

  const strategyColor = (type: string) => {
    if (type === '도전') return '#fee2e2'
    if (type === '적정') return '#e0f2fe'
    return '#dcfce7'
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '700px' }}>
      <h1>근거 보기 테스트</h1>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          type="number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="student_id 입력"
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
        />
        <button onClick={() => fetchRecs(input)} style={{
          padding: '8px 16px', backgroundColor: '#1a56db',
          color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer'
        }}>
          조회
        </button>
      </div>

      {result && (
        <p style={{ color: '#555', marginBottom: '16px' }}>
          student_id: {result.student_id} | 환산 내신: <strong>{result.weighted_grade}등급</strong> | 전형 수: {result.recommendations.length}개
        </p>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {result?.recommendations.map((rec) => (
          <div key={rec.admission_id} style={{
            padding: '14px 16px', border: '1px solid #ddd',
            borderRadius: '12px', display: 'flex',
            justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <span style={{ fontWeight: 'bold' }}>{rec.univ_name}</span>
              <span style={{ marginLeft: '8px', color: '#555', fontSize: '13px' }}>{rec.dept_name}</span>
              <span style={{
                marginLeft: '8px', padding: '2px 8px', borderRadius: '12px',
                backgroundColor: strategyColor(rec.strategy_type), fontSize: '12px'
              }}>
                {rec.strategy_type}
              </span>
              <span style={{ marginLeft: '8px', color: '#888', fontSize: '12px' }}>
                50%컷: {rec.cutoff_50}
              </span>
            </div>
            <EvidenceViewer admissionId={rec.admission_id} />
          </div>
        ))}
      </div>
    </div>
  )
}