import { NextResponse } from 'next/server';

// Mobile builds use native analytics through Capacitor plugins
// This route is a placeholder that returns an error for mobile static export compatibility
export const dynamic = 'force-static';
export const revalidate = false;

export async function POST() {
  return NextResponse.json(
    {
      error: 'Performance analytics is not available in mobile builds',
      details: 'Use native Capacitor analytics plugins instead',
      platform: 'mobile'
    },
    { status: 501 }
  );
}

export async function GET() {
  return POST();
}