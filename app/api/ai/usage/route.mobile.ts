/**
 * 모바일 빌드용 AI Usage 라우트 (비활성화)
 *
 * 모바일 앱에서는 AI Usage API를 직접 호출하지 않고
 * Supabase Edge Function을 직접 호출합니다.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = false;

export async function GET() {
  return NextResponse.json({ error: 'AI Usage not available in mobile build' }, { status: 404 });
}
