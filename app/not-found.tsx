'use client'

import Link from 'next/link'

export default function NotFound() {
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
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '72px',
            fontWeight: 'bold',
            color: '#3b82f6',
            margin: '0'
          }}>
            404
          </h1>
          <h2 style={{
            fontSize: '24px',
            color: '#1f2937',
            marginTop: '16px',
            marginBottom: '8px'
          }}>
            페이지를 찾을 수 없습니다
          </h2>
          <p style={{
            color: '#6b7280',
            marginBottom: '32px'
          }}>
            요청하신 페이지가 존재하지 않거나 이동되었습니다.
          </p>
          <Link
            href="/"
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              textDecoration: 'none'
            }}
          >
            홈으로 돌아가기
          </Link>
        </div>
      </body>
    </html>
  )
}
