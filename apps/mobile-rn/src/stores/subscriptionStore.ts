/**
 * Subscription Store (Zustand + MMKV)
 * 구독 상태 관리 — 웹 subscriptionStore 포팅 (RN 네이티브)
 * Paddle/RevenueCat 제외, App Store/Play Store 링크만
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {supabase} from '@/lib/supabase';
import {zustandMMKVStorage} from '@/lib/mmkv';

export type SubscriptionStatus =
  | 'trial'
  | 'active'
  | 'cancelled'
  | 'expired'
  | 'paused'
  | 'free';

export type Platform = 'ios' | 'android' | 'web';

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

function calculateDaysRemainingInTrial(trialEndDate: string | null): number | null {
  if (!trialEndDate) return null;
  const diffMs = new Date(trialEndDate).getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

function checkActiveSubscription(status: SubscriptionStatus): boolean {
  return status === 'trial' || status === 'active';
}

function checkInTrial(status: SubscriptionStatus, trialEndDate: string | null): boolean {
  if (status !== 'trial' || !trialEndDate) return false;
  return Date.now() < new Date(trialEndDate).getTime();
}

interface SubscriptionState {
  subscriptionInfo: SubscriptionInfo | null;
  loading: boolean;
  error: string | null;

  // 계산된 상태
  hasActiveSubscription: boolean;
  isInTrial: boolean;
  daysRemainingInTrial: number | null;

  // 액션
  fetchSubscription: (userId: string) => Promise<void>;
  applyRevenueCatPurchase: (entitlements: Record<string, any>) => void;
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
            set({subscriptionInfo: info});
          } else {
            set({subscriptionInfo: null});
          }

          get().updateComputedStates();
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

      updateComputedStates: () => {
        const {subscriptionInfo} = get();

        if (!subscriptionInfo) {
          set({
            hasActiveSubscription: false,
            isInTrial: false,
            daysRemainingInTrial: null,
          });
          return;
        }

        set({
          hasActiveSubscription: checkActiveSubscription(subscriptionInfo.status),
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
        });
      },

      clearError: () => set({error: null}),
    }),
    {
      name: 'subscription-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        subscriptionInfo: state.subscriptionInfo,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.updateComputedStates();
        }
      },
    },
  ),
);
