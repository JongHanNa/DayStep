// app/api/sse/route.mobile.ts - 모바일 빌드용 SSE 라우트 (비활성화)
import { NextResponse } from 'next/server';

// 모바일 빌드용 정적 설정
export const dynamic = 'force-static';
export const revalidate = false;

export async function GET() {
  return NextResponse.json({ error: 'SSE not available in mobile build' }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}