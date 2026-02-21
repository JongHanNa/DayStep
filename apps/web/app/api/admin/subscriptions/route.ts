import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin/auth';
import type { SubscriptionListItem, SubscriptionListResponse, SubscriptionStatus, Platform } from '@/lib/admin/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdmin(req);
    if (!auth.authorized) return auth.response;

    const { serviceClient } = auth;
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const platform = searchParams.get('platform') || '';
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') === 'asc' ? true : false;

    const offset = (page - 1) * limit;

    // 검색어가 있으면 먼저 users 테이블에서 매칭되는 user_id 목록을 가져옴
    let matchingUserIds: string[] | null = null;
    if (search) {
      const { data: matchingUsers } = await serviceClient
        .from('users')
        .select('id')
        .or(`email.ilike.%${search}%,name.ilike.%${search}%`);

      matchingUserIds = matchingUsers?.map((u: { id: string }) => u.id) || [];
      if (matchingUserIds.length === 0) {
        const response: SubscriptionListResponse = {
          subscriptions: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
        return NextResponse.json(response);
      }
    }

    // subscriptions 쿼리 빌드
    let query = serviceClient
      .from('subscriptions')
      .select('*', { count: 'exact' });

    if (matchingUserIds) {
      query = query.in('user_id', matchingUserIds);
    }
    if (status) {
      query = query.eq('status', status as SubscriptionStatus);
    }
    if (platform) {
      query = query.eq('platform', platform as Platform);
    }

    // 정렬 + 페이지네이션
    const allowedSortFields = ['created_at', 'updated_at', 'status', 'platform', 'product_id'] as const;
    const sortField = allowedSortFields.includes(sort as any) ? sort : 'created_at';

    const { data: subscriptions, count, error: subError } = await query
      .order(sortField, { ascending: order })
      .range(offset, offset + limit - 1);

    if (subError) {
      console.error('Admin subscriptions query error:', subError);
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    // user_id 목록으로 users 테이블 batch 조회
    const userIds = [...new Set((subscriptions || []).map((s) => s.user_id))];
    let usersMap: Record<string, { email: string | null; name: string | null }> = {};

    if (userIds.length > 0) {
      const { data: users } = await serviceClient
        .from('users')
        .select('id, email, name')
        .in('id', userIds);

      if (users) {
        for (const u of users) {
          usersMap[u.id] = { email: u.email, name: u.name };
        }
      }
    }

    // merge
    const items: SubscriptionListItem[] = (subscriptions || []).map((sub) => ({
      ...sub,
      userEmail: usersMap[sub.user_id]?.email || null,
      userName: usersMap[sub.user_id]?.name || null,
    }));

    const total = count || 0;
    const response: SubscriptionListResponse = {
      subscriptions: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Admin subscriptions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
