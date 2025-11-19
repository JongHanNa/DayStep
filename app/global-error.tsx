'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 서버 재시작 후 첫 요청에서 발생하는 SyntaxError 로깅
    console.error('Global error caught:', error)
    
    // 자동 재시도 로직 (layout.js SyntaxError 대응)
    const timer = setTimeout(() => {
      if (error.message.includes('SyntaxError') || error.message.includes('Unexpected token')) {
        console.log('Auto-retrying due to potential initial bundle timing issue...')
        reset()
      }
    }, 2000) // 2초 후 자동 재시도
    
    return () => clearTimeout(timer)
  }, [error, reset])

  return (
    <html lang="ko">
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '20px',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <h1 style={{ color: '#ef4444', fontSize: '24px', marginBottom: '16px' }}>
            앱 실행 중 오류가 발생했습니다
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '20px', textAlign: 'center' }}>
            {error.message.includes('SyntaxError')
              ? '서버 재시작 직후 발생할 수 있는 일시적 오류입니다. 자동으로 재시도됩니다...'
              : '예상치 못한 오류가 발생했습니다.'}
          </p>
          <button
            onClick={() => reset()}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            다시 시도
          </button>
          <details style={{ marginTop: '20px', maxWidth: '600px' }}>
            <summary style={{ cursor: 'pointer', color: '#6b7280' }}>
              기술적 세부정보
            </summary>
            <pre style={{
              backgroundColor: '#f3f4f6',
              padding: '10px',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto',
              marginTop: '10px'
            }}>
              {error.stack || error.message}
            </pre>
          </details>
        </div>
      </body>
    </html>
  )
}