/**
 * Subscription Store (Zustand + MMKV)
 * 구독 상태 관리 — 웹 subscriptionStore 포팅 (RN 네이티브)
 * Paddle/RevenueCat 제외, App Store/Play Store 링크만
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {supabase} from '@/lib/supabase';
import {zustandMMKVStorage} from '@/lib/mmkv';
import {FEATURE_FLAGS} from '@/lib/featureFlags';
import {
  type SubscriptionStatus,
  type Platform,
  type SubscriptionInfo,
  calculateDaysRemainingInTrial,
  checkActiveSubscription,
  checkInTrial,
  isInGracePeriod as checkGracePeriod,
  gracePeriodDaysRemaining as calcGraceDays,
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
  _recentPurchase: boolean; // RevenueCat 구매 직후 플래그 (MMKV 미저장)

  /** 개발/관리자용 강제 Pro 토글. true면 fetchSubscription 결과 무시하고 hasActiveSubscription=true 유지 (persist됨) */
  adminOverride: boolean;

  // 전체 사용자 무료 Pro 기간 (출시 초기 프로모션)
  // app_config.free_pro_until — now < freeProUntil이면 모든 사용자가 Pro
  freeProUntil: string | null;
  isFreeProActive: boolean;

  // Grace period (신규 가입 7일 Pro 화면 접근)
  userCreatedAt: string | null;
  isInGracePeriod: boolean;
  gracePeriodDaysRemaining: number;
  graceChecked: boolean; // auth에서 최신 created_at을 가져왔는지 여부

  // 액션
  fetchSubscription: (userId: string) => Promise<void>;
  fetchAppConfig: () => Promise<void>;
  updateFreeProUntil: (date: string | null) => Promise<void>;
  applyRevenueCatPurchase: (entitlements: Record<string, any>) => void;
  setUserCreatedAt: (createdAt: string) => void;
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
      _recentPurchase: false,
      userCreatedAt: null,
      isInGracePeriod: false,
      gracePeriodDaysRemaining: 0,
      graceChecked: false,
      adminOverride: false,
      freeProUntil: null,
      isFreeProActive: false,

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

      fetchAppConfig: async () => {
        try {
          const {data, error} = await supabase
            .from('app_config')
            .select('free_pro_until')
            .eq('id', 1)
            .maybeSingle();

          if (error) throw error;

          set({freeProUntil: data?.free_pro_until ?? null});
          get().updateComputedStates();
        } catch (err: any) {
          console.error('[SubscriptionStore] fetchAppConfig error:', err);
        }
      },

      updateFreeProUntil: async (date: string | null) => {
        const {data: userData} = await supabase.auth.getUser();
        const userId = userData?.user?.id ?? null;
        const {error} = await supabase
          .from('app_config')
          .update({
            free_pro_until: date,
            updated_at: new Date().toISOString(),
            updated_by: userId,
          })
          .eq('id', 1);

        if (error) throw error;

        set({freeProUntil: date});
        get().updateComputedStates();
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

      setUserCreatedAt: (createdAt: string) => {
        set({
          userCreatedAt: createdAt,
          isInGracePeriod: checkGracePeriod(createdAt),
          gracePeriodDaysRemaining: calcGraceDays(createdAt),
          graceChecked: true,
        });
      },

      updateComputedStates: () => {
        const {subscriptionInfo, userCreatedAt, adminOverride, freeProUntil} = get();

        // Grace period 갱신
        const graceUpdate = {
          isInGracePeriod: checkGracePeriod(userCreatedAt),
          gracePeriodDaysRemaining: calcGraceDays(userCreatedAt),
        };

        // 전체 사용자 무료 Pro 기간 체크 — 출시 초기 프로모션
        const isFreeProActive = !!(
          freeProUntil && new Date(freeProUntil).getTime() > Date.now()
        );

        // PAYMENTS_ENABLED=false (앱 무료 운영기): 모든 사용자 자동 Pro
        // 페이월/구독 UI 비표시는 컴포넌트 레벨에서 PAYMENTS_ENABLED로 처리
        if (!FEATURE_FLAGS.PAYMENTS_ENABLED) {
          set({
            hasActiveSubscription: true,
            isInTrial: false,
            daysRemainingInTrial: null,
            isFreeProActive: true,
            ...graceUpdate,
          });
          return;
        }

        // 관리자 강제 Pro 토글 — 다른 모든 로직보다 우선
        if (adminOverride) {
          set({
            hasActiveSubscription: true,
            isInTrial: false,
            daysRemainingInTrial: null,
            isFreeProActive,
            ...graceUpdate,
          });
          return;
        }

        // 무료 Pro 기간 — 실제 구독 없어도 Pro 활성
        if (isFreeProActive) {
          set({
            hasActiveSubscription: true,
            isInTrial: subscriptionInfo
              ? checkInTrial(subscriptionInfo.status, subscriptionInfo.trialEndDate)
              : false,
            daysRemainingInTrial: subscriptionInfo
              ? calculateDaysRemainingInTrial(subscriptionInfo.trialEndDate)
              : null,
            isFreeProActive: true,
            ...graceUpdate,
          });
          return;
        }

        if (!subscriptionInfo) {
          set({
            hasActiveSubscription: false,
            isInTrial: false,
            daysRemainingInTrial: null,
            isFreeProActive: false,
            ...graceUpdate,
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
          isFreeProActive: false,
          ...graceUpdate,
        });
      },

      reset: () => {
        // freeProUntil은 앱 전역 설정이므로 logout시 보존
        const {freeProUntil} = get();
        const isFreeProActive = !!(
          freeProUntil && new Date(freeProUntil).getTime() > Date.now()
        );
        set({
          subscriptionInfo: null,
          loading: false,
          error: null,
          hasActiveSubscription: isFreeProActive,
          isInTrial: false,
          daysRemainingInTrial: null,
          _recentPurchase: false,
          userCreatedAt: null,
          isInGracePeriod: false,
          gracePeriodDaysRemaining: 0,
          graceChecked: false,
          isFreeProActive,
        });
      },

      clearError: () => set({error: null}),
    }),
    {
      name: 'subscription-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        subscriptionInfo: state.subscriptionInfo,
        adminOverride: state.adminOverride,
        freeProUntil: state.freeProUntil,
        // userCreatedAt은 persist하지 않음 — 매번 auth에서 최신 값을 가져옴
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // MMKV에 stale userCreatedAt이 남아있을 수 있으므로 강제 초기화
          // auth에서 최신 값을 가져올 때까지 grace 배너를 숨김
          useSubscriptionStore.setState({
            userCreatedAt: null,
            isInGracePeriod: false,
            gracePeriodDaysRemaining: 0,
            graceChecked: false,
          });
          state.updateComputedStates();
          // auth에서 최신 created_at + 최신 app_config 가져오기
          import('@/lib/supabase').then(({supabase}) => {
            supabase.auth.getUser().then(({data}) => {
              if (data?.user?.created_at) {
                useSubscriptionStore.getState().setUserCreatedAt(data.user.created_at);
              }
              // 인증된 사용자만 app_config 조회 가능 (RLS)
              if (data?.user) {
                useSubscriptionStore.getState().fetchAppConfig();
              }
            });
          });
        }
      },
    },
  ),
);
