import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || '').split(',').filter(Boolean);

export type AdminServiceClient = SupabaseClient<Database>;

/**
 * Admin API route 인증 검증
 * - Authorization 헤더에서 JWT 추출
 * - 사용자 인증 확인
 * - ADMIN_USER_IDS에 포함 여부 확인
 * - 성공 시 service-role 클라이언트 반환
 */
export async function verifyAdmin(req: NextRequest): Promise<
  | { authorized: true; userId: string; serviceClient: AdminServiceClient }
  | { authorized: false; response: NextResponse }
> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Authorization header required' }, { status: 401 }),
    };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Invalid token' }, { status: 401 }),
    };
  }

  if (!ADMIN_USER_IDS.includes(user.id)) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  const serviceClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  return { authorized: true, userId: user.id, serviceClient };
}
