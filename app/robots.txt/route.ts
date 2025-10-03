import { robotsTxt } from '@/lib/seo';

export const dynamic = 'force-static';

export async function GET() {
  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}