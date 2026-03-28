import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  type SubscriptionStatus,
  type Platform,
  type WebSubscriptionInfo as SubscriptionInfo,
  calculateDaysRemainingInTrial,
  checkActiveSubscription,
  checkInTrial,
  isInGracePeriod as checkGracePeriod,
  gracePeriodDaysRemaining as calcGraceDays,
} from '@daystep/shared-core';

export type { SubscriptionStatus, Platform, SubscriptionInfo };

interface CustomerInfo {
  entitlements: { active: Record<string, any> };
  [key: string]: any;
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

  // Grace period (신규 가입 7일 Pro 화면 접근)
  userCreatedAt: string | null;
  isInGracePeriod: boolean;
  gracePeriodDaysRemaining: number;

  // Actions
  setSubscriptionInfo: (info: SubscriptionInfo | null) => void;
  setCustomerInfo: (info: CustomerInfo | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setUserCreatedAt: (createdAt: string) => void;
  updateComputedStates: () => void;
  reset: () => void;
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

        // Grace period
        userCreatedAt: null,
        isInGracePeriod: false,
        gracePeriodDaysRemaining: 0,

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

        setUserCreatedAt: (createdAt: string) => {
          set({
            userCreatedAt: createdAt,
            isInGracePeriod: checkGracePeriod(createdAt),
            gracePeriodDaysRemaining: calcGraceDays(createdAt),
          });
        },

        /**
         * 계산된 상태 업데이트
         * subscriptionInfo 또는 customerInfo 변경 시 호출
         */
        updateComputedStates: () => {
          const { subscriptionInfo, customerInfo, userCreatedAt } = get();

          // Grace period 갱신
          const graceUpdate = {
            isInGracePeriod: checkGracePeriod(userCreatedAt),
            gracePeriodDaysRemaining: calcGraceDays(userCreatedAt),
          };

          if (!subscriptionInfo) {
            set({
              hasActiveSubscription: false,
              isInTrial: false,
              daysRemainingInTrial: null,
              subscriptionExpiresAt: null,
              ...graceUpdate,
            });
            return;
          }

          // Revenue Cat의 Pro entitlement 확인
          const hasRevenueCatEntitlement =
            customerInfo?.entitlements?.active?.['pro'] !== undefined;

          // DB의 구독 상태 확인
          const hasDbSubscription = checkActiveSubscription(
            subscriptionInfo.status,
            subscriptionInfo.subscriptionEndDate
          );

          // 개발 환경에서는 DB 상태만 체크 (RevenueCat 무시 - 테스트 편의)
          // 프로덕션에서는 둘 중 하나라도 활성이면 구독 활성으로 간주
          const hasActiveSubscription = process.env.NODE_ENV === 'development'
            ? hasDbSubscription
            : (hasRevenueCatEntitlement || hasDbSubscription);

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
            ...graceUpdate,
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
            userCreatedAt: null,
            isInGracePeriod: false,
            gracePeriodDaysRemaining: 0,
          });
        },
      }),
      {
        name: 'subscription-store',
        partialize: (state) => ({
          subscriptionInfo: state.subscriptionInfo,
          userCreatedAt: state.userCreatedAt,
          // customerInfo는 민감 정보이므로 persist에서 제외
        }),
        // persist 복원 완료 후 계산된 상태 업데이트
        // hasActiveSubscription 등은 persist에 저장되지 않으므로 복원 후 재계산 필요
        onRehydrateStorage: () => (state) => {
          if (state) {
            console.log('💳 구독 Store hydration 완료 - 계산된 상태 업데이트');
            state.updateComputedStates();
          }
        },
      }
    ),
    {
      name: 'subscription-store',
    }
  )
);
