import { useCallback, useEffect, useState } from 'react';
import {
  useSubscriptionStore,
  type SubscriptionInfo,
  type SubscriptionStatus,
  type Platform,
} from '@/state/stores/subscriptionStore';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { supabase } from '@/lib/supabase';
import { queryRLSTableWithJWT } from '@/lib/supabase/core';

/**
 * 구독 관리 Hook
 *
 * Supabase DB 기반 구독 관리 (웹 전용)
 */
export const useSubscription = () => {
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
    isTrialEligible,
    hasSeenTrialOffer,
    setSubscriptionInfo,
    setCustomerInfo,
    setLoading,
    setError,
    setHasSeenTrialOffer,
    setTrialEligible,
    reset,
  } = useSubscriptionStore();

  /**
   * Supabase DB에서 구독 정보 조회
   * JWT 토큰 기반 REST API 호출
   */
  const fetchSubscriptionFromDb = useCallback(
    async (userId: string): Promise<SubscriptionInfo | null> => {
      try {
        console.log('💳 DB에서 구독 정보 조회 (JWT):', userId);

        // JWT 방식으로 subscriptions 테이블 조회
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
          paddleSubscriptionId: data.paddle_subscription_id || null,
          cancelledAt: data.cancelled_at || null,
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

        console.log('💳 구독 정보 동기화 완료');
      } catch (err: any) {
        console.error('💳 구독 정보 동기화 실패:', err);
        setError(err.message || '구독 정보 동기화 실패');
      } finally {
        setLoading(false);
      }
    },
    [fetchSubscriptionFromDb, setLoading, setError, setSubscriptionInfo]
  );

  /**
   * 트라이얼 자격 확인
   * subscription_history에서 trial_started 이벤트가 있으면 이미 체험한 유저
   */
  const checkTrialEligibility = useCallback(
    async (userId: string) => {
      try {
        // subscription_history에서 trial_started 이벤트 확인 (교차 플랫폼 악용 방지)
        const historyData = await queryRLSTableWithJWT(
          'subscription_history',
          [
            { column: 'user_id', operator: 'eq', value: userId },
            { column: 'event_type', operator: 'eq', value: 'trial_started' },
          ],
          {
            select: 'id',
            limit: 1,
          }
        );

        // trial_started 이벤트가 있으면 이미 체험한 유저 → 자격 없음
        if (historyData) {
          setTrialEligible(false);
          return false;
        }

        // subscriptions 테이블 레코드 존재 여부 확인
        // subscriptionInfo가 null이면 구독 이력 없음 → 자격 있음
        const { subscriptionInfo: currentInfo } = useSubscriptionStore.getState();
        const eligible = !currentInfo;
        setTrialEligible(eligible);
        return eligible;
      } catch (err) {
        console.error('💳 트라이얼 자격 확인 실패:', err);
        // 에러 시 store의 기본 계산 결과 유지
        return isTrialEligible;
      }
    },
    [setTrialEligible, isTrialEligible]
  );

  /**
   * 구독 구매 (웹 전용)
   */
  const purchasePackage = useCallback(
    async (plan: 'monthly' | 'yearly') => {
      if (!FEATURE_FLAGS.PAYMENTS_ENABLED) {
        return {
          success: false,
          error: '결제 기능이 비활성화되어 있습니다.',
        };
      }

      return {
        success: false,
        error: '웹에서는 구매할 수 없습니다.',
      };
    },
    []
  );

  /**
   * 구독 복원 (웹 전용)
   */
  const restoreSubscription = useCallback(async () => {
    if (!FEATURE_FLAGS.PAYMENTS_ENABLED) {
      return {
        success: false,
        error: '결제 기능이 비활성화되어 있습니다.',
      };
    }

    return {
      success: false,
      error: '웹에서는 복원할 수 없습니다.',
    };
  }, []);

  /**
   * 사용자 로그인 시 구독 정보 동기화
   */
  const linkUserToRevenueCat = useCallback(
    async (userId: string) => {
      // 결제 비활성화 시 동작 안함
      if (!FEATURE_FLAGS.PAYMENTS_ENABLED) {
        return;
      }

      // DB 구독 정보 동기화
      await syncSubscription(userId);
    },
    [syncSubscription]
  );

  /**
   * 사용자 로그아웃 시 구독 상태 초기화
   */
  const unlinkUserFromRevenueCat = useCallback(async () => {
    if (!FEATURE_FLAGS.PAYMENTS_ENABLED) {
      return;
    }

    reset();
  }, [reset]);

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
    isTrialEligible,
    hasSeenTrialOffer,

    // Actions
    syncSubscription,
    checkTrialEligibility,
    purchasePackage,
    restoreSubscription,
    linkUserToRevenueCat,
    unlinkUserFromRevenueCat,
    canAccessProFeature,
    setHasSeenTrialOffer,

    // 환경 정보
    paymentsEnabled: FEATURE_FLAGS.PAYMENTS_ENABLED,
  };
};
