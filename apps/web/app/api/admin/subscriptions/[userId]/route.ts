import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/admin/auth';
import type { UserDetailResponse } from '@/lib/admin/types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await verifyAdmin(req);
    if (!auth.authorized) return auth.response;

    const { userId } = await params;
    const { serviceClient } = auth;

    // 1. users 테이블에서 사용자 정보
    const { data: user, error: userError } = await serviceClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. subscriptions (최신 1건)
    const { data: subscription } = await serviceClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3. subscription_history (최근 50건)
    const { data: history } = await serviceClient
      .from('subscription_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    // 4. auth.admin 정보 (마지막 로그인, 가입 경로 등)
    let authInfo: UserDetailResponse['authInfo'] = null;
    try {
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: { user: authUser } } = await adminClient.auth.admin.getUserById(userId);
      if (authUser) {
        authInfo = {
          lastSignIn: authUser.last_sign_in_at || null,
          provider: authUser.app_metadata?.provider || null,
          createdAt: authUser.created_at || null,
        };
      }
    } catch (err) {
      console.error('Admin getUserById error:', err);
    }

    const response: UserDetailResponse = {
      user,
      subscription: subscription || null,
      history: history || [],
      authInfo,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Admin user detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
