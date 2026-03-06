/**
 * Subscription Store (Zustand + MMKV)
 * 구독 상태 관리 — 웹 subscriptionStore 포팅 (RN 네이티브)
 * Paddle/RevenueCat 제외, App Store/Play Store 링크만
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {supabase} from '@/lib/supabase';
import {zustandMMKVStorage} from '@/lib/mmkv';
import {
  type SubscriptionStatus,
  type Platform,
  type SubscriptionInfo,
  calculateDaysRemainingInTrial,
  checkActiveSubscription,
  checkInTrial,
} from '@daystep/shared-core';

export type {SubscriptionStatus, Platform, SubscriptionInfo};

interface SubscriptionState {
  subscriptionInfo: SubscriptionInfo | null;
  loading: boolean;
  error: string | null;

  // 계산된 상태
  hasActiveSubscription: boolean;
  isInTrial: boolean;
  daysRemainingInTrial: number | null;
  isTrialEligible: boolean;
  _recentPurchase: boolean; // RevenueCat 구매 직후 플래그 (MMKV 미저장)

  // 트라이얼 제안 UI 상태
  hasSeenTrialOffer: boolean;

  // 액션
  fetchSubscription: (userId: string) => Promise<void>;
  applyRevenueCatPurchase: (entitlements: Record<string, any>) => void;
  setHasSeenTrialOffer: (seen: boolean) => void;
  setTrialEligible: (eligible: boolean) => void;
  updateComputedStates: () => void;
  reset: () => void;
  clearError: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      subscriptionInfo: null,
      loading: false,
      error: null,
      hasActiveSubscription: false,
      isInTrial: false,
      daysRemainingInTrial: null,
      isTrialEligible: false,
      _recentPurchase: false,
      hasSeenTrialOffer: false,

      fetchSubscription: async (userId: string) => {
        try {
          set({loading: true, error: null});

          const {data, error} = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', {ascending: false})
            .limit(1)
            .maybeSingle();

          if (error) throw error;

          if (data) {
            const info: SubscriptionInfo = {
              id: data.id,
              userId: data.user_id,
              status: data.status,
              platform: data.platform,
              productId: data.product_id ?? '',
              trialStartDate: data.trial_start_date,
              trialEndDate: data.trial_end_date,
              subscriptionStartDate: data.subscription_start_date,
              subscriptionEndDate: data.subscription_end_date,
              isLegacyUser: data.is_legacy_user ?? false,
              legacyGracePeriodEnd: data.legacy_grace_period_end,
              promoCode: data.promo_code,
              autoRenewEnabled: data.auto_renew_enabled ?? true,
              cancelledAt: data.cancelled_at,
              createdAt: data.created_at,
              updatedAt: data.updated_at,
            };
            set({subscriptionInfo: info, _recentPurchase: false});
          } else {
            // _recentPurchase=true (방금 RevenueCat 구매)일 때만 로컬 상태 보존
            // MMKV 리하이드레이션된 stale 상태(_recentPurchase=false)는 리셋
            if (!get()._recentPurchase) {
              set({subscriptionInfo: null});
            }
          }

          // DB 레코드가 있거나, 방금 구매한 상태가 아닐 때만 computed states 갱신
          if (data || !get()._recentPurchase) {
            get().updateComputedStates();
          }
        } catch (err: any) {
          console.error('[SubscriptionStore] Fetch error:', err);
          set({error: err.message ?? 'Failed to fetch subscription'});
        } finally {
          set({loading: false});
        }
      },

      applyRevenueCatPurchase: (entitlements: Record<string, any>) => {
        const entitlementKeys = Object.keys(entitlements);
        if (entitlementKeys.length === 0) return;

        const ent = entitlements[entitlementKeys[0]];
        set({
          hasActiveSubscription: true,
          _recentPurchase: true,
          subscriptionInfo: {
            ...(get().subscriptionInfo ?? {
              id: '',
              userId: '',
              trialStartDate: null,
              trialEndDate: null,
              isLegacyUser: false,
              legacyGracePeriodEnd: null,
              promoCode: null,
              cancelledAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
            status: 'active',
            platform: 'ios',
            productId: ent.productIdentifier ?? '',
            subscriptionStartDate: ent.originalPurchaseDate ?? new Date().toISOString(),
            subscriptionEndDate: ent.expirationDate ?? null,
            autoRenewEnabled: ent.willRenew ?? true,
          } as SubscriptionInfo,
        });
      },

      setHasSeenTrialOffer: (seen: boolean) => {
        set({hasSeenTrialOffer: seen});
      },

      setTrialEligible: (eligible: boolean) => {
        set({isTrialEligible: eligible});
      },

      updateComputedStates: () => {
        const {subscriptionInfo} = get();

        if (!subscriptionInfo) {
          set({
            hasActiveSubscription: false,
            isInTrial: false,
            daysRemainingInTrial: null,
            isTrialEligible: true,
          });
          return;
        }

        set({
          hasActiveSubscription: checkActiveSubscription(
            subscriptionInfo.status,
            subscriptionInfo.subscriptionEndDate,
          ),
          isInTrial: checkInTrial(subscriptionInfo.status, subscriptionInfo.trialEndDate),
          daysRemainingInTrial: calculateDaysRemainingInTrial(subscriptionInfo.trialEndDate),
        });
      },

      reset: () => {
        set({
          subscriptionInfo: null,
          loading: false,
          error: null,
          hasActiveSubscription: false,
          isInTrial: false,
          daysRemainingInTrial: null,
          isTrialEligible: false,
          _recentPurchase: false,
          hasSeenTrialOffer: false,
        });
      },

      clearError: () => set({error: null}),
    }),
    {
      name: 'subscription-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        subscriptionInfo: state.subscriptionInfo,
        hasSeenTrialOffer: state.hasSeenTrialOffer,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.updateComputedStates();
        }
      },
    },
  ),
);
