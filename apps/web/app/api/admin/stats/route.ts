import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin/auth';
import type { AdminStats, SubscriptionStatus, Platform } from '@/lib/admin/types';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdmin(req);
    if (!auth.authorized) return auth.response;

    const { serviceClient } = auth;

    // 총 사용자 수
    const { count: totalUsers } = await serviceClient
      .from('users')
      .select('*', { count: 'exact', head: true });

    // 총 구독 수
    const { count: totalSubscriptions } = await serviceClient
      .from('subscriptions')
      .select('*', { count: 'exact', head: true });

    // 전체 구독 데이터 가져오기 (status, platform, product_id)
    const { data: subscriptions } = await serviceClient
      .from('subscriptions')
      .select('status, platform, product_id');

    // 상태별 집계
    const byStatus: Record<SubscriptionStatus, number> = {
      trial: 0, active: 0, cancelled: 0, expired: 0, paused: 0,
    };

    // 플랫폼별 집계
    const byPlatform: Record<Platform, number> = {
      ios: 0, android: 0, web: 0,
    };

    // 상품별 집계
    const byProduct: Record<string, number> = {};

    if (subscriptions) {
      for (const sub of subscriptions) {
        if (sub.status && sub.status in byStatus) {
          byStatus[sub.status as SubscriptionStatus]++;
        }
        if (sub.platform && sub.platform in byPlatform) {
          byPlatform[sub.platform as Platform]++;
        }
        const productKey = sub.product_id || 'unknown';
        byProduct[productKey] = (byProduct[productKey] || 0) + 1;
      }
    }

    // 최근 7일 이벤트 수
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { count: recentEventsCount } = await serviceClient
      .from('subscription_history')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    const stats: AdminStats = {
      totalUsers: totalUsers || 0,
      totalSubscriptions: totalSubscriptions || 0,
      byStatus,
      byPlatform,
      byProduct,
      recentEventsCount: recentEventsCount || 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
