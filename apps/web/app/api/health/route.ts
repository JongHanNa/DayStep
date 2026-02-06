import { NextResponse } from 'next/server';

// 환경별 분리: 웹(정적) ↔ 모바일(정적) - 둘 다 정적 가능
export const dynamic = 'force-static';
export const revalidate = false;

export async function GET() {
  // 서버 준비 상태 체크
  const serverReady = Date.now() - (global as any).__serverStartTime__ > 3000; // 3초 후 준비 완료
  
  return NextResponse.json({ 
    status: serverReady ? 'ready' : 'starting',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}

// 서버 시작 시간 기록
if (!(global as any).__serverStartTime__) {
  (global as any).__serverStartTime__ = Date.now();
}