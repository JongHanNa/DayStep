'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { FEATURE_FLAGS } from '@/lib/featureFlags';

/**
 * 구독 동기화 Provider
 *
 * 인증 상태 변화를 감지하여 Revenue Cat와 Supabase DB를 자동 동기화
 */
export function SubscriptionSyncProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const {
    syncSubscription,
    linkUserToRevenueCat,
    unlinkUserFromRevenueCat,
    setUserCreatedAt,
    paymentsEnabled,
  } = useSubscription();

  // 이전 사용자 ID 추적 (로그인/로그아웃 감지용)
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // 결제 비활성화 시 동작 안함
    if (!paymentsEnabled) {
      console.log('💳 [SubscriptionSync] 결제 비활성화 - 동기화 생략');
      return;
    }

    const currentUserId = user?.id || null;
    const prevUserId = prevUserIdRef.current;

    // 사용자 ID 변화 감지
    if (currentUserId !== prevUserId) {
      console.log('💳 [SubscriptionSync] 사용자 ID 변화 감지:', {
        prevUserId,
        currentUserId,
        isAuthenticated,
      });

      if (currentUserId && isAuthenticated) {
        // 로그인: Revenue Cat 연결 + 구독 정보 동기화
        console.log('💳 [SubscriptionSync] 로그인 감지 - 구독 동기화 시작');

        // Grace period: user.created_at 기반 7일 Pro 화면 접근
        if (user?.created_at) {
          setUserCreatedAt(user.created_at);
        }

        linkUserToRevenueCat(currentUserId)
          .then(() => {
            console.log('💳 [SubscriptionSync] Revenue Cat 연결 완료');
          })
          .catch((error) => {
            console.error('💳 [SubscriptionSync] Revenue Cat 연결 실패:', error);
          });
      } else if (!currentUserId && prevUserId) {
        // 로그아웃: Revenue Cat 연결 해제 + Store 초기화
        console.log('💳 [SubscriptionSync] 로그아웃 감지 - 구독 Store 초기화');

        unlinkUserFromRevenueCat()
          .then(() => {
            console.log('💳 [SubscriptionSync] Revenue Cat 연결 해제 완료');
          })
          .catch((error) => {
            console.error('💳 [SubscriptionSync] Revenue Cat 연결 해제 실패:', error);
          });
      }

      // 이전 사용자 ID 업데이트
      prevUserIdRef.current = currentUserId;
    }
  }, [
    user?.id,
    user?.created_at,
    isAuthenticated,
    paymentsEnabled,
    linkUserToRevenueCat,
    unlinkUserFromRevenueCat,
    setUserCreatedAt,
  ]);

  // 이 Provider는 UI를 렌더링하지 않음 (동기화 로직만 처리)
  return <>{children}</>;
}
