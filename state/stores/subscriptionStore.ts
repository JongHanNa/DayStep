import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { CustomerInfo } from '@revenuecat/purchases-capacitor';

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
 * 구독 정보 인터페이스
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
  createdAt: string;
  updatedAt: string;
}

/**
 * 구독 상태 관리 Store
 */
interface SubscriptionState {
  // 구독 상태
  subscriptionInfo: SubscriptionInfo | null;
  customerInfo: CustomerInfo | null;
  isLoading: boolean;
  error: string | null;

  // 계산된 상태 (캐시)
  hasActiveSubscription: boolean;
  isInTrial: boolean;
  daysRemainingInTrial: number | null;
  subscriptionExpiresAt: Date | null;

  // Actions
  setSubscriptionInfo: (info: SubscriptionInfo | null) => void;
  setCustomerInfo: (info: CustomerInfo | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateComputedStates: () => void;
  reset: () => void;
}

/**
 * 남은 트라이얼 기간 계산 (일 단위)
 */
function calculateDaysRemainingInTrial(trialEndDate: string | null): number | null {
  if (!trialEndDate) return null;

  const now = new Date();
  const end = new Date(trialEndDate);
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

/**
 * 구독 활성 여부 확인
 */
function checkActiveSubscription(status: SubscriptionStatus): boolean {
  return status === 'trial' || status === 'active';
}

/**
 * 트라이얼 여부 확인
 */
function checkInTrial(status: SubscriptionStatus, trialEndDate: string | null): boolean {
  if (status !== 'trial' || !trialEndDate) return false;

  const now = new Date();
  const end = new Date(trialEndDate);

  return now < end;
}

export const useSubscriptionStore = create<SubscriptionState>()(
  devtools(
    persist(
      (set, get) => ({
        // 초기 상태
        subscriptionInfo: null,
        customerInfo: null,
        isLoading: false,
        error: null,

        // 계산된 상태 초기값
        hasActiveSubscription: false,
        isInTrial: false,
        daysRemainingInTrial: null,
        subscriptionExpiresAt: null,

        // Actions
        setSubscriptionInfo: (info: SubscriptionInfo | null) => {
          console.log('💳 구독 정보 업데이트:', info);
          set({ subscriptionInfo: info });
          get().updateComputedStates();
        },

        setCustomerInfo: (info: CustomerInfo | null) => {
          console.log('💳 Revenue Cat 고객 정보 업데이트:', info);
          set({ customerInfo: info });
          get().updateComputedStates();
        },

        setLoading: (loading: boolean) => {
          set({ isLoading: loading });
        },

        setError: (error: string | null) => {
          if (error) {
            console.error('💳 구독 오류:', error);
          }
          set({ error });
        },

        /**
         * 계산된 상태 업데이트
         * subscriptionInfo 또는 customerInfo 변경 시 호출
         */
        updateComputedStates: () => {
          const { subscriptionInfo, customerInfo } = get();

          if (!subscriptionInfo) {
            set({
              hasActiveSubscription: false,
              isInTrial: false,
              daysRemainingInTrial: null,
              subscriptionExpiresAt: null,
            });
            return;
          }

          // Revenue Cat의 Pro entitlement 확인
          const hasRevenueCatEntitlement =
            customerInfo?.entitlements?.active?.['pro'] !== undefined;

          // DB의 구독 상태 확인
          const hasDbSubscription = checkActiveSubscription(subscriptionInfo.status);

          // 둘 중 하나라도 활성이면 구독 활성으로 간주
          const hasActiveSubscription = hasRevenueCatEntitlement || hasDbSubscription;

          const isInTrial = checkInTrial(
            subscriptionInfo.status,
            subscriptionInfo.trialEndDate
          );

          const daysRemainingInTrial = calculateDaysRemainingInTrial(
            subscriptionInfo.trialEndDate
          );

          const subscriptionExpiresAt = subscriptionInfo.subscriptionEndDate
            ? new Date(subscriptionInfo.subscriptionEndDate)
            : null;

          set({
            hasActiveSubscription,
            isInTrial,
            daysRemainingInTrial,
            subscriptionExpiresAt,
          });

          console.log('💳 계산된 구독 상태:', {
            hasActiveSubscription,
            isInTrial,
            daysRemainingInTrial,
            subscriptionExpiresAt,
          });
        },

        reset: () => {
          console.log('💳 구독 Store 초기화');
          set({
            subscriptionInfo: null,
            customerInfo: null,
            isLoading: false,
            error: null,
            hasActiveSubscription: false,
            isInTrial: false,
            daysRemainingInTrial: null,
            subscriptionExpiresAt: null,
          });
        },
      }),
      {
        name: 'subscription-store',
        partialize: (state) => ({
          subscriptionInfo: state.subscriptionInfo,
          // customerInfo는 민감 정보이므로 persist에서 제외
        }),
      }
    ),
    {
      name: 'subscription-store',
    }
  )
);
