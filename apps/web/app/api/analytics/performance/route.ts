import { NextRequest, NextResponse } from 'next/server';

// Analytics API는 개발 모드에서만 사용 (프로덕션에서는 실제 서비스 필요)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  // 모바일 빌드에서는 501 반환
  if (process.env.BUILD_TARGET === 'mobile') {
    return NextResponse.json(
      {
        error: 'Performance analytics is not available in mobile builds',
        details: 'Use native Capacitor analytics plugins instead',
        platform: 'mobile'
      },
      { status: 501 }
    );
  }
  try {
    const body = await request.json();
    
    // 개발 환경에서는 로그만 출력하고 성공 반환
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics (Dev Mode):', body);
      return NextResponse.json({ success: true, message: 'Analytics logged in development' });
    }
    
    // 프로덕션에서는 실제 analytics 서비스로 전송
    // TODO: 실제 analytics 서비스 구현
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process analytics data' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST({} as NextRequest);
}