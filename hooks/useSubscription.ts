import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  useSubscriptionStore,
  type SubscriptionInfo,
  type SubscriptionStatus,
  type Platform,
} from '@/state/stores/subscriptionStore';
import {
  getCustomerInfo,
  purchaseSubscription,
  restorePurchases,
  setRevenueCatUserId,
  logoutRevenueCatUser,
  hasActiveSubscription as checkRevenueCatSubscription,
  getSubscriptionExpirationDate,
} from '@/lib/revenue-cat';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { supabase } from '@/lib/supabase';
import { queryRLSTableWithJWT } from '@/lib/supabase/core';

/**
 * 구독 관리 Hook
 *
 * Revenue Cat + Supabase DB 통합 구독 관리
 */
export const useSubscription = () => {
  const isNative = Capacitor.isNativePlatform();

  // Zustand Store
  const {
    subscriptionInfo,
    customerInfo,
    isLoading,
    error,
    hasActiveSubscription,
    isInTrial,
    daysRemainingInTrial,
    subscriptionExpiresAt,
    setSubscriptionInfo,
    setCustomerInfo,
    setLoading,
    setError,
    reset,
  } = useSubscriptionStore();

  /**
   * Supabase DB에서 구독 정보 조회
   * JWT 토큰 기반 REST API 호출 (Capacitor WebView 호환)
   */
  const fetchSubscriptionFromDb = useCallback(
    async (userId: string): Promise<SubscriptionInfo | null> => {
      try {
        console.log('💳 DB에서 구독 정보 조회 (JWT):', userId);

        // JWT 방식으로 subscriptions 테이블 조회 (모바일 WebView 호환)
        const data = await queryRLSTableWithJWT(
          'subscriptions',
          { column: 'user_id', operator: 'eq', value: userId },
          {
            select: '*',
            order: 'created_at.desc',
            limit: 1,
            single: true
          }
        );

        // 구독 정보가 없는 경우
        if (!data) {
          console.log('💳 구독 정보 없음 (신규 사용자)');
          return null;
        }

        console.log('💳 DB 구독 정보 조회 성공:', data);

        // DB 컬럼명을 camelCase로 변환
        return {
          id: data.id,
          userId: data.user_id,
          status: data.status as SubscriptionStatus,
          platform: data.platform as Platform,
          productId: data.product_id,
          trialStartDate: data.trial_start_date,
          trialEndDate: data.trial_end_date,
          subscriptionStartDate: data.subscription_start_date,
          subscriptionEndDate: data.subscription_end_date,
          isLegacyUser: data.is_legacy_user,
          legacyGracePeriodEnd: data.legacy_grace_period_end,
          promoCode: data.promo_code,
          autoRenewEnabled: data.auto_renew_enabled,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      } catch (err: any) {
        console.error('💳 DB 구독 정보 조회 실패:', err);
        setError(err.message || 'DB 구독 정보 조회 실패');
        return null;
      }
    },
    [setError]
  );

  /**
   * Revenue Cat에서 고객 정보 조회 및 Store 업데이트
   */
  const refreshRevenueCatInfo = useCallback(async () => {
    if (!FEATURE_FLAGS.PAYMENTS_ENABLED || !isNative) {
      console.log('💳 결제 비활성화 또는 웹 환경 - Revenue Cat 조회 생략');
      return;
    }

    try {
      const info = await getCustomerInfo();
      setCustomerInfo(info);
    } catch (err: any) {
      console.error('💳 Revenue Cat 정보 조회 실패:', err);
      // Revenue Cat 조회 실패는 치명적이지 않음 (DB 정보로 대체 가능)
    }
  }, [isNative, setCustomerInfo]);

  /**
   * 구독 정보 전체 동기화
   * DB + Revenue Cat 정보를 모두 가져와서 Store 업데이트
   */
  const syncSubscription = useCallback(
    async (userId: string) => {
      setLoading(true);
      setError(null);

      try {
        console.log('💳 구독 정보 동기화 시작:', userId);

        // 1. DB에서 구독 정보 조회
        const dbInfo = await fetchSubscriptionFromDb(userId);
        setSubscriptionInfo(dbInfo);

        // 2. Revenue Cat 정보 조회 (네이티브 환경만)
        await refreshRevenueCatInfo();

        console.log('💳 구독 정보 동기화 완료');
      } catch (err: any) {
        console.error('💳 구독 정보 동기화 실패:', err);
        setError(err.message || '구독 정보 동기화 실패');
      } finally {
        setLoading(false);
      }
    },
    [fetchSubscriptionFromDb, refreshRevenueCatInfo, setLoading, setError, setSubscriptionInfo]
  );

  /**
   * 구독 구매
   */
  const purchasePackage = useCallback(
    async (plan: 'monthly' | 'yearly') => {
      if (!FEATURE_FLAGS.PAYMENTS_ENABLED) {
        return {
          success: false,
          error: '결제 기능이 비활성화되어 있습니다.',
        };
      }

      if (!isNative) {
        return {
          success: false,
          error: '모바일 앱에서만 구매할 수 있습니다.',
        };
      }

      setLoading(true);
      setError(null);

      try {
        console.log('💳 구독 구매 시작:', plan);

        const { customerInfo: newCustomerInfo, error: purchaseError } =
          await purchaseSubscription(plan);

        if (purchaseError) {
          throw purchaseError;
        }

        // Revenue Cat 정보 업데이트
        setCustomerInfo(newCustomerInfo);

        // DB 동기화 (Webhook이 DB를 업데이트하지만, 클라이언트에서도 조회)
        // Webhook은 비동기이므로 약간의 지연 후 재조회
        setTimeout(async () => {
          const { data: session } = await supabase.auth.getSession();
          if (session?.session?.user?.id) {
            await syncSubscription(session.session.user.id);
          }
        }, 2000);

        console.log('💳 구독 구매 완료');

        return {
          success: true,
          error: null,
        };
      } catch (err: any) {
        console.error('💳 구독 구매 실패:', err);
        const errorMessage = err.message || '구독 구매 실패';
        setError(errorMessage);

        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setLoading(false);
      }
    },
    [isNative, setLoading, setError, setCustomerInfo, syncSubscription]
  );

  /**
   * 구독 복원 (기기 변경, 앱 재설치)
   */
  const restoreSubscription = useCallback(async () => {
    if (!FEATURE_FLAGS.PAYMENTS_ENABLED) {
      return {
        success: false,
        error: '결제 기능이 비활성화되어 있습니다.',
      };
    }

    if (!isNative) {
      return {
        success: false,
        error: '모바일 앱에서만 복원할 수 있습니다.',
      };
    }

    setLoading(true);
    setError(null);

    try {
      console.log('💳 구독 복원 시작');

      const { customerInfo: restoredInfo, error: restoreError } = await restorePurchases();

      if (restoreError) {
        throw restoreError;
      }

      // Revenue Cat 정보 업데이트
      setCustomerInfo(restoredInfo);

      // DB 동기화
      setTimeout(async () => {
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.user?.id) {
          await syncSubscription(session.session.user.id);
        }
      }, 2000);

      console.log('💳 구독 복원 완료');

      return {
        success: true,
        error: null,
      };
    } catch (err: any) {
      console.error('💳 구독 복원 실패:', err);
      const errorMessage = err.message || '구독 복원 실패';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  }, [isNative, setLoading, setError, setCustomerInfo, syncSubscription]);

  /**
   * 사용자 로그인 시 Revenue Cat에 사용자 ID 설정 및 구독 정보 동기화
   */
  const linkUserToRevenueCat = useCallback(
    async (userId: string) => {
      // 결제 비활성화 시 동작 안함
      if (!FEATURE_FLAGS.PAYMENTS_ENABLED) {
        return;
      }

      // 네이티브 환경: RevenueCat 연결
      if (isNative) {
        try {
          console.log('💳 Revenue Cat에 사용자 연결:', userId);
          await setRevenueCatUserId(userId);
        } catch (err) {
          console.error('💳 Revenue Cat 사용자 연결 실패:', err);
        }
      }

      // 모든 환경: DB 구독 정보 동기화 (웹 포함)
      await syncSubscription(userId);
    },
    [isNative, syncSubscription]
  );

  /**
   * 사용자 로그아웃 시 Revenue Cat 로그아웃
   */
  const unlinkUserFromRevenueCat = useCallback(async () => {
    if (!FEATURE_FLAGS.PAYMENTS_ENABLED || !isNative) {
      return;
    }

    try {
      console.log('💳 Revenue Cat 사용자 연결 해제');
      await logoutRevenueCatUser();
      reset();
    } catch (err) {
      console.error('💳 Revenue Cat 사용자 연결 해제 실패:', err);
    }
  }, [isNative, reset]);

  /**
   * Pro 기능 접근 가능 여부 확인
   */
  const canAccessProFeature = useCallback(
    (featureId: string): boolean => {
      // 결제 비활성화 시 모든 기능 허용
      if (!FEATURE_FLAGS.PAYMENTS_ENABLED) {
        return true;
      }

      // 활성 구독이 있으면 모든 Pro 기능 허용
      return hasActiveSubscription;
    },
    [hasActiveSubscription]
  );

  return {
    // 상태
    subscriptionInfo,
    customerInfo,
    isLoading,
    error,

    // 계산된 상태
    hasActiveSubscription,
    isInTrial,
    daysRemainingInTrial,
    subscriptionExpiresAt,

    // Actions
    syncSubscription,
    purchasePackage,
    restoreSubscription,
    linkUserToRevenueCat,
    unlinkUserFromRevenueCat,
    canAccessProFeature,
    refreshRevenueCatInfo,

    // 환경 정보
    isNative,
    paymentsEnabled: FEATURE_FLAGS.PAYMENTS_ENABLED,
  };
};
