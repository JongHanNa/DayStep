'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { TrialOfferModal } from '@/components/subscription/TrialOfferModal';
import { TrialPaywall } from '@/components/subscription/TrialPaywall';

// Paddle 설정 (SubscriptionView와 동일)
const PADDLE_PRICES = {
  monthly: process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY || 'pri_01kbgwtw6fdknst82vxc9sjg3s',
  yearly: process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY || 'pri_01kbgx1kbjmtw96e0fkjg46j1r',
};

/**
 * 트라이얼 제안 Provider
 *
 * 조건 충족 시 TrialOfferModal 또는 TrialPaywall을 표시
 * 조건: PAYMENTS_ENABLED && isAuthenticated && isTrialEligible && !hasSeenTrialOffer && !isLoading
 */
export function TrialOfferProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const {
    isTrialEligible,
    hasSeenTrialOffer,
    hasActiveSubscription,
    isLoading,
    checkTrialEligibility,
    setHasSeenTrialOffer,
    paymentsEnabled,
  } = useSubscription();

  const [showModal, setShowModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [eligibilityChecked, setEligibilityChecked] = useState(false);
  const checkInProgress = useRef(false);

  // 트라이얼 자격 확인 (로그인 후 1회)
  useEffect(() => {
    if (
      paymentsEnabled &&
      isAuthenticated &&
      user?.id &&
      !isLoading &&
      !hasActiveSubscription &&
      !eligibilityChecked &&
      !checkInProgress.current
    ) {
      checkInProgress.current = true;
      checkTrialEligibility(user.id).then(() => {
        setEligibilityChecked(true);
      });
    }
  }, [paymentsEnabled, isAuthenticated, user?.id, isLoading, hasActiveSubscription, eligibilityChecked, checkTrialEligibility]);

  // 자격 확인 후 모달 표시
  useEffect(() => {
    if (
      !paymentsEnabled ||
      !isAuthenticated ||
      !isTrialEligible ||
      hasSeenTrialOffer ||
      isLoading ||
      hasActiveSubscription ||
      !eligibilityChecked
    ) {
      return;
    }

    // 약간의 딜레이 후 표시 (앱 로드 직후 바로 뜨지 않도록)
    const timer = setTimeout(() => setShowModal(true), 1500);
    return () => clearTimeout(timer);
  }, [paymentsEnabled, isAuthenticated, isTrialEligible, hasSeenTrialOffer, isLoading, hasActiveSubscription, eligibilityChecked]);

  const handleClose = useCallback(() => {
    setShowModal(false);
    setShowPaywall(false);
    setHasSeenTrialOffer(true);
  }, [setHasSeenTrialOffer]);

  const handleShowDetails = useCallback(() => {
    setShowModal(false);
    setShowPaywall(true);
  }, []);

  const openPaddleCheckout = useCallback((plan: 'monthly' | 'yearly') => {
    if (!window.Paddle || !user?.id) return;

    try {
      window.Paddle.Checkout.open({
        items: [{ priceId: PADDLE_PRICES[plan], quantity: 1 }],
        customData: { app_user_id: user.id },
        settings: {
          displayMode: 'overlay',
          theme: 'light',
          locale: 'ko',
          successUrl: `${window.location.origin}/adhd/settings/subscription?success=true`,
        },
      });
    } catch (error) {
      console.error('Paddle checkout error:', error);
    }

    handleClose();
  }, [user?.id, handleClose]);

  const handleStartTrialFromModal = useCallback(() => {
    // 기본 모달에서는 연간 플랜으로 체크아웃
    openPaddleCheckout('yearly');
  }, [openPaddleCheckout]);

  const handleStartTrialFromPaywall = useCallback((plan: 'monthly' | 'yearly') => {
    openPaddleCheckout(plan);
  }, [openPaddleCheckout]);

  return (
    <>
      {children}
      {showModal && (
        <TrialOfferModal
          onClose={handleClose}
          onStartTrial={handleStartTrialFromModal}
          onShowDetails={handleShowDetails}
        />
      )}
      {showPaywall && (
        <TrialPaywall
          onClose={handleClose}
          onStartTrial={handleStartTrialFromPaywall}
        />
      )}
    </>
  );
}
