/**
 * 구독 관련 공유 타입 및 순수 헬퍼 함수
 * 웹(Next.js)과 모바일(React Native) 양쪽에서 사용
 */

/**
 * 구독 상태 타입
 * DB의 subscription_status_enum과 동일
 */
export type SubscriptionStatus = 'trial' | 'active' | 'cancelled' | 'expired' | 'paused' | 'free';

/**
 * 구독 플랫폼
 * DB의 platform_enum과 동일
 */
export type Platform = 'ios' | 'android' | 'web';

/**
 * 구독 정보 인터페이스 (공통)
 * Supabase subscriptions 테이블과 매핑
 */
export interface SubscriptionInfo {
  id: string;
  userId: string;
  status: SubscriptionStatus;
  platform: Platform;
  productId: string;
  trialStartDate: string | null;
  trialEndDate: string | null;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  isLegacyUser: boolean;
  legacyGracePeriodEnd: string | null;
  promoCode: string | null;
  autoRenewEnabled: boolean;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 웹 전용 구독 정보 (Paddle 구독 ID 포함)
 */
export interface WebSubscriptionInfo extends SubscriptionInfo {
  paddleSubscriptionId: string | null;
}

// ============================================
// Grace Period (신규 가입 7일 Pro 화면 접근)
// ============================================

/** 신규 가입 후 Pro 화면 무료 접근 기간 (일) */
export const GRACE_PERIOD_DAYS = 7;

/**
 * 신규 가입 grace period 내인지 확인
 * auth.users.created_at 기준
 */
export function isInGracePeriod(userCreatedAt: string | null | undefined): boolean {
  if (!userCreatedAt) return false;
  const createdMs = new Date(userCreatedAt).getTime();
  const graceEndMs = createdMs + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() < graceEndMs;
}

/**
 * Grace period 남은 일수 계산
 */
export function gracePeriodDaysRemaining(userCreatedAt: string | null | undefined): number {
  if (!userCreatedAt) return 0;
  const createdMs = new Date(userCreatedAt).getTime();
  const graceEndMs = createdMs + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  const remaining = Math.ceil((graceEndMs - Date.now()) / (1000 * 60 * 60 * 24));
  return remaining > 0 ? remaining : 0;
}

// ============================================
// 순수 헬퍼 함수
// ============================================

/**
 * 남은 트라이얼 기간 계산 (일 단위)
 */
export function calculateDaysRemainingInTrial(trialEndDate: string | null): number | null {
  if (!trialEndDate) return null;
  const diffMs = new Date(trialEndDate).getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

/**
 * 구독 활성 여부 확인
 */
export function checkActiveSubscription(
  status: SubscriptionStatus,
  subscriptionEndDate?: string | null,
): boolean {
  if (status === 'trial' || status === 'active') return true;
  if (status === 'cancelled' && subscriptionEndDate) {
    return new Date(subscriptionEndDate) > new Date();
  }
  return false;
}

/**
 * 트라이얼 여부 확인
 */
export function checkInTrial(status: SubscriptionStatus, trialEndDate: string | null): boolean {
  if (status !== 'trial' || !trialEndDate) return false;
  return Date.now() < new Date(trialEndDate).getTime();
}
