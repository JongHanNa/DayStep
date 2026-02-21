import { Database } from '@/types/supabase';

// DB Row 타입 재사용
export type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row'];
export type UserRow = Database['public']['Tables']['users']['Row'];
export type SubscriptionHistoryRow = Database['public']['Tables']['subscription_history']['Row'];

// Enum 타입 재사용
export type SubscriptionStatus = Database['public']['Enums']['subscription_status_enum'];
export type Platform = Database['public']['Enums']['platform_enum'];
export type SubscriptionEventType = Database['public']['Enums']['subscription_event_type_enum'];
export type SubscriptionType = Database['public']['Enums']['subscription_type_enum'];

// Admin 대시보드 통계
export interface AdminStats {
  totalUsers: number;
  totalSubscriptions: number;
  byStatus: Record<SubscriptionStatus, number>;
  byPlatform: Record<Platform, number>;
  byProduct: Record<string, number>;
  recentEventsCount: number; // 최근 7일
}

// 구독 목록 아이템 (users 테이블 join)
export interface SubscriptionListItem extends SubscriptionRow {
  userEmail: string | null;
  userName: string | null;
}

// 구독 목록 API 응답
export interface SubscriptionListResponse {
  subscriptions: SubscriptionListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 사용자 상세 API 응답
export interface UserDetailResponse {
  user: UserRow;
  subscription: SubscriptionRow | null;
  history: SubscriptionHistoryRow[];
  authInfo: {
    lastSignIn: string | null;
    provider: string | null;
    createdAt: string | null;
  } | null;
}
