import { NextResponse } from 'next/server';

// Mobile builds use native OAuth through Capacitor plugins
// This route is a placeholder that returns an error for mobile static export compatibility
export const dynamic = 'force-static';
export const revalidate = false;

export async function GET() {
  return NextResponse.json(
    {
      error: 'OAuth callback is not available in mobile builds',
      details: 'Use native Capacitor OAuth plugins instead',
      platform: 'mobile'
    },
    { status: 501 }
  );
}