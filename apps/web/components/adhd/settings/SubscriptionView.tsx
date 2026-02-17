'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Crown, RefreshCw, XCircle, CheckCircle, CreditCard, ChevronDown, ChevronRight, Mail, ExternalLink, HelpCircle, Shield, Sparkles } from 'lucide-react';
import Script from 'next/script';
import { useAuth } from '@/app/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { FREE_TIER_LIMITS } from '@/lib/featureFlags';
import { useUsageStats } from '@/hooks/useUsageStats';
import { useSubscriptionStore } from '@/state/stores/subscriptionStore';
import type { UserUsageStats } from '@/lib/supabase/usage';

// Paddle 설정 (환경변수 기반 — .env.development: sandbox, .env.production: production)
const PADDLE_CONFIG = {
  clientToken: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || '',
  environment: (process.env.NEXT_PUBLIC_PADDLE_ENV || 'production') as 'sandbox' | 'production',
  prices: {
    monthly: process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY || 'pri_01kbgwtw6fdknst82vxc9sjg3s',
    yearly: process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY || 'pri_01kbgx1kbjmtw96e0fkjg46j1r',
  },
};

// Paddle 타입 선언
declare global {
  interface Window {
    Paddle?: {
      Environment: {
        set: (environment: 'sandbox' | 'production') => void;
      };
      Initialize: (config: {
        token: string;
        eventCallback?: (event: any) => void;
      }) => void;
      Checkout: {
        open: (options: {
          items?: Array<{ priceId: string; quantity: number }>;
          transactionId?: string;
          customData?: Record<string, any>;
          settings?: {
            displayMode?: 'overlay' | 'inline';
            theme?: 'light' | 'dark';
            locale?: string;
            successUrl?: string;
          };
        }) => void;
      };
    };
  }
}

interface SubscriptionViewProps {
  onBack: () => void;
}

// 플랜 정보 헬퍼
function getPlanInfo(productId?: string) {
  if (!productId) return { label: '구독 중', price: '-' };

  // Paddle price ID 정확 매칭
  if (productId === PADDLE_CONFIG.prices.monthly) return { label: '월간', price: '₩5,500/월' };
  if (productId === PADDLE_CONFIG.prices.yearly) return { label: '연간', price: '₩44,000/년' };

  // 문자열 패턴 매칭 (개발 환경, 스토어 productId 등)
  const lower = productId.toLowerCase();
  if (lower.includes('yearly') || lower.includes('annual')) return { label: '연간', price: '₩44,000/년' };
  if (lower.includes('monthly')) return { label: '월간', price: '₩5,500/월' };

  return { label: '구독 중', price: '-' };
}

// 플랫폼 표시명 헬퍼
function getPlatformLabel(platform?: string) {
  switch (platform) {
    case 'ios': return 'App Store';
    case 'android': return 'Play Store';
    case 'web': return 'Paddle (웹)';
    default: return 'Paddle (웹)';
  }
}

// Free vs Pro 비교 테이블 데이터
const FEATURE_COMPARISON: Array<{
  name: string;
  freeLimit: number;
  unit: string;
  pro: string | true;
  statsKey: keyof UserUsageStats | null;
}> = [
  { name: '할일', freeLimit: FREE_TIER_LIMITS.MAX_TODOS, unit: '개', pro: '무제한', statsKey: 'todoCount' },
  { name: '습관', freeLimit: FREE_TIER_LIMITS.MAX_HABITS, unit: '개', pro: '무제한', statsKey: 'habitCount' },
  { name: '프로젝트', freeLimit: FREE_TIER_LIMITS.MAX_PROJECTS, unit: '개', pro: '무제한', statsKey: 'projectCount' },
  { name: '노트', freeLimit: FREE_TIER_LIMITS.MAX_NOTES, unit: '개', pro: '무제한', statsKey: 'noteCount' },
  { name: '연락처 연결', freeLimit: FREE_TIER_LIMITS.MAX_CONTACTS, unit: '개', pro: '무제한', statsKey: 'contactCount' },
  { name: '소중한 사람', freeLimit: FREE_TIER_LIMITS.MAX_CHERISHED_PEOPLE, unit: '명', pro: '무제한', statsKey: 'cherishedPeopleCount' },
  { name: '관심 기록', freeLimit: FREE_TIER_LIMITS.MAX_CARE_INTERACTIONS, unit: '개', pro: '무제한', statsKey: 'careInteractionCount' },
  { name: '통계 & 인사이트', freeLimit: 0, unit: '', pro: true, statsKey: null },
];

/**
 * 구독 관리 뷰
 *
 * 기존 /subscription 페이지의 콘텐츠를 URL 변경 없이 렌더링합니다.
 */
export default function SubscriptionView({ onBack }: SubscriptionViewProps) {
  const { user } = useAuth();
  const {
    subscriptionInfo,
    hasActiveSubscription,
    isInTrial,
    daysRemainingInTrial,
    subscriptionExpiresAt,
    isLoading,
    purchasePackage,
    restoreSubscription,
    syncSubscription,
    isNative,
    paymentsEnabled,
  } = useSubscription();

  const { stats: usageStats } = useUsageStats();

  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isPaddleReady, setIsPaddleReady] = useState(false);
  const [isPaddleLoading, setIsPaddleLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [isUpgradingPlan, setIsUpgradingPlan] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  // Paddle 초기화 (v2 Initialize API 사용, production이 기본값)
  const initializePaddle = useCallback(() => {
    if (window.Paddle && !isPaddleReady) {
      try {
        if (PADDLE_CONFIG.environment === 'sandbox') {
          window.Paddle.Environment.set('sandbox');
        }
        window.Paddle.Initialize({
          token: PADDLE_CONFIG.clientToken,
          eventCallback: (event: any) => {
            if (event.name === 'checkout.completed') {
              setCheckoutSuccess(true);
            }
            if (event.name === 'checkout.error') {
              console.error('[Paddle Error]', event.detail, event);
            }
          },
        });
        setIsPaddleReady(true);
        console.log('Paddle initialized successfully');
      } catch (error) {
        console.error('Paddle initialization error:', error);
      }
    }
  }, [isPaddleReady]);

  // 클라이언트 사이드 네비게이션 시 Paddle.js가 이미 로드되어 있으면 즉시 초기화
  useEffect(() => {
    if (window.Paddle && !isPaddleReady) {
      initializePaddle();
    }
  }, [initializePaddle, isPaddleReady]);

  // Paddle Checkout 열기
  const openPaddleCheckout = useCallback((plan: 'monthly' | 'yearly') => {
    if (hasActiveSubscription) {
      toast.error('이미 Pro 구독이 활성화되어 있습니다.');
      return;
    }

    if (!window.Paddle) {
      toast.error('결제 시스템을 로드하는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    if (!user?.id) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    setIsPaddleLoading(true);

    try {
      const priceId = PADDLE_CONFIG.prices[plan];

      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customData: {
          app_user_id: user.id,
        },
        settings: {
          displayMode: 'overlay',
          theme: 'light',
          locale: 'ko',
          successUrl: `${window.location.origin}/adhd/settings/subscription?success=true`,
        },
      });
    } catch (error) {
      console.error('Paddle checkout error:', error);
      toast.error('결제 창을 열 수 없습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsPaddleLoading(false);
    }
  }, [user?.id, hasActiveSubscription]);

  // 결제 성공 처리
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      toast.success('결제가 완료되었습니다! 구독이 곧 활성화됩니다.');
      window.history.replaceState({}, '', window.location.pathname);
      setCheckoutSuccess(true);
    }
  }, []);

  // 결제 완료 후 구독 상태 폴링
  const syncSubscriptionRef = useRef(syncSubscription);
  syncSubscriptionRef.current = syncSubscription;

  useEffect(() => {
    if (!checkoutSuccess || !user?.id || hasActiveSubscription) return;

    let attempt = 0;
    const maxAttempts = 5;

    const intervalId = setInterval(async () => {
      attempt++;
      try {
        await syncSubscriptionRef.current(user.id);
      } catch (e) {
        console.error('[Subscription Polling] sync error:', e);
      }
      if (attempt >= maxAttempts) {
        clearInterval(intervalId);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [checkoutSuccess, user?.id, hasActiveSubscription]);

  // 결제 기능 비활성화 시 알림
  useEffect(() => {
    if (!paymentsEnabled) {
      toast.info('결제 기능이 현재 비활성화되어 있습니다.');
      onBack();
    }
  }, [paymentsEnabled, onBack]);

  // 구매 핸들러
  const handlePurchase = async (plan: 'monthly' | 'yearly') => {
    setIsPurchasing(true);
    try {
      const result = await purchasePackage(plan);

      if (result.success) {
        toast.success('구독이 완료되었습니다! 🎉');
      } else {
        toast.error(result.error || '구독 처리 중 오류가 발생했습니다.');
      }
    } catch (error: any) {
      console.error('구독 오류:', error);
      toast.error(error.message || '구독 처리 중 오류가 발생했습니다.');
    } finally {
      setIsPurchasing(false);
    }
  };

  // 복원 핸들러
  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const result = await restoreSubscription();

      if (result.success) {
        toast.success('구독이 복원되었습니다!');
      } else {
        toast.error(result.error || '복원 중 오류가 발생했습니다.');
      }
    } catch (error: any) {
      console.error('복원 오류:', error);
      toast.error(error.message || '복원 중 오류가 발생했습니다.');
    } finally {
      setIsRestoring(false);
    }
  };

  // Paddle API를 통한 구독 취소
  const handlePaddleCancel = async () => {
    if (!window.confirm('현재 결제 기간까지 이용 가능합니다. 구독을 취소하시겠습니까?')) {
      return;
    }

    setIsCancelling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('로그인이 필요합니다.');
        return;
      }

      const res = await fetch('/api/paddle/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'cancel' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '구독 취소 실패');
      }

      const endDate = data.subscriptionEndDate
        ? new Date(data.subscriptionEndDate).toLocaleDateString('ko-KR')
        : '';
      toast.success(`구독 취소가 예약되었습니다.${endDate ? ` ${endDate}까지 이용 가능합니다.` : ''}`);

      // Optimistic update: Paddle API 성공 = 확실한 상태 변경
      // syncSubscription 호출 제거 — DB cancelled_at이 아직 null이면 optimistic update를 덮어씀
      const currentInfo = useSubscriptionStore.getState().subscriptionInfo;
      if (currentInfo) {
        useSubscriptionStore.getState().setSubscriptionInfo({
          ...currentInfo,
          cancelledAt: data.cancelledAt || new Date().toISOString(),
        });
      }
    } catch (error: any) {
      console.error('Paddle cancel error:', error);
      toast.error(error.message || '구독 취소 중 오류가 발생했습니다.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Paddle API를 통한 취소 철회 (Reactivate)
  const handlePaddleReactivate = async () => {
    setIsReactivating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('로그인이 필요합니다.');
        return;
      }

      const res = await fetch('/api/paddle/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'reactivate' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '취소 철회 실패');
      }

      toast.success('구독 취소가 철회되었습니다.');

      // Optimistic update: Paddle API 성공 = 확실한 상태 변경
      // syncSubscription 호출 제거 — DB cancelled_at이 아직 null이면 optimistic update를 덮어씀
      const currentInfo = useSubscriptionStore.getState().subscriptionInfo;
      if (currentInfo) {
        useSubscriptionStore.getState().setSubscriptionInfo({
          ...currentInfo,
          cancelledAt: null,
        });
      }
    } catch (error: any) {
      console.error('Paddle reactivate error:', error);
      toast.error(error.message || '취소 철회 중 오류가 발생했습니다.');
    } finally {
      setIsReactivating(false);
    }
  };

  // Paddle API를 통한 결제 수단 변경
  const handlePaddleUpdatePayment = async () => {
    setIsUpdatingPayment(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('로그인이 필요합니다.');
        return;
      }

      const res = await fetch('/api/paddle/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'update-payment' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '결제 수단 변경 요청 실패');
      }

      if (!window.Paddle) {
        toast.error('결제 시스템을 로드하는 중입니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      window.Paddle.Checkout.open({
        transactionId: data.transactionId,
        settings: {
          displayMode: 'overlay',
          theme: 'light',
          locale: 'ko',
        },
      });
    } catch (error: any) {
      console.error('Paddle update payment error:', error);
      toast.error(error.message || '결제 수단 변경 중 오류가 발생했습니다.');
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  // Paddle API를 통한 월간→연간 업그레이드
  const handleUpgradeToYearly = async () => {
    if (!window.confirm('연간 플랜으로 업그레이드하시겠습니까?\n\n• 즉시 연간 플랜으로 전환됩니다\n• 미사용 월간 기간은 비례 차감됩니다')) {
      return;
    }

    setIsUpgradingPlan(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('로그인이 필요합니다.');
        return;
      }

      const res = await fetch('/api/paddle/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'change-plan',
          newPriceId: PADDLE_CONFIG.prices.yearly,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '플랜 변경 실패');
      }

      toast.success('연간 플랜으로 업그레이드되었습니다! 🎉');

      // Optimistic update: API 응답의 새 billing date 즉시 반영
      const currentInfo = useSubscriptionStore.getState().subscriptionInfo;
      if (currentInfo) {
        useSubscriptionStore.getState().setSubscriptionInfo({
          ...currentInfo,
          productId: 'pro_yearly',
          subscriptionEndDate: data.subscriptionEndDate || currentInfo.subscriptionEndDate,
        });
      }

      // DB sync (webhook이 이미 업데이트했을 수 있음)
      if (user?.id) {
        await syncSubscription(user.id);
      }
    } catch (error: any) {
      console.error('Paddle change-plan error:', error);
      toast.error(error.message || '플랜 변경 중 오류가 발생했습니다.');
    } finally {
      setIsUpgradingPlan(false);
    }
  };

  // Paddle API를 통한 환불 요청 (7일 이내)
  const handlePaddleRefund = async () => {
    if (!window.confirm('환불 시 구독이 즉시 취소됩니다. 환불을 요청하시겠습니까?')) {
      return;
    }

    setIsRefunding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('로그인이 필요합니다.');
        return;
      }

      const res = await fetch('/api/paddle/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'refund' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '환불 요청 실패');
      }

      toast.success('환불 요청이 접수되었습니다. Paddle 승인 후 환불이 처리됩니다.');

      // Optimistic update: 구독 즉시 취소 상태로 변경
      const currentInfo = useSubscriptionStore.getState().subscriptionInfo;
      if (currentInfo) {
        useSubscriptionStore.getState().setSubscriptionInfo({
          ...currentInfo,
          status: 'cancelled',
          cancelledAt: data.cancelledAt || new Date().toISOString(),
        });
      }
    } catch (error: any) {
      console.error('Paddle refund error:', error);
      toast.error(error.message || '환불 요청 중 오류가 발생했습니다.');
    } finally {
      setIsRefunding(false);
    }
  };

  // 7일 이내 환불 가능 여부 계산
  const isWithinRefundPeriod = (() => {
    const startDate = subscriptionInfo?.subscriptionStartDate;
    if (!startDate) return false;
    const daysSinceStart = (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceStart <= 7;
  })();

  // 로딩 중
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const planInfo = getPlanInfo(subscriptionInfo?.productId);
  const platformLabel = getPlatformLabel(subscriptionInfo?.platform);

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">구독 관리</h1>
        <p className="text-muted-foreground mt-1">
          {hasActiveSubscription ? 'Pro를 이용 중입니다' : 'Pro로 더 많은 것을 해보세요'}
        </p>
      </div>

      {/* ===== 구독 상태: 활성 구독자 ===== */}
      {hasActiveSubscription && (
        <>
          {/* 섹션 1 — 구독 정보 */}
          <details open className="group rounded-xl border bg-card text-card-foreground shadow-sm">
            <summary className="flex items-center gap-3 cursor-pointer p-4 select-none list-none [&::-webkit-details-marker]:hidden">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">1</span>
              <span className="font-semibold text-base flex-1">구독 정보</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 font-medium">
                {isInTrial ? '체험 중' : '활성'}
              </span>
              <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4 pt-2 border-t">
              {isInTrial && daysRemainingInTrial !== null ? (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 mb-4">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    무료 체험 기간 중입니다. <strong>{daysRemainingInTrial}일</strong> 남았습니다.
                    체험 종료 전 언제든 구독을 시작할 수 있습니다.
                  </p>
                </div>
              ) : null}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">플랜</span>
                  <p className="font-semibold mt-0.5">{planInfo.label}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">결제 금액</span>
                  <p className="font-semibold mt-0.5">{planInfo.price}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">다음 결제일</span>
                  <p className="font-semibold mt-0.5">
                    {subscriptionExpiresAt
                      ? new Date(subscriptionExpiresAt).toLocaleDateString('ko-KR')
                      : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">결제 플랫폼</span>
                  <p className="font-semibold mt-0.5">{platformLabel}</p>
                </div>
              </div>
            </div>
          </details>

          {/* 섹션 2 — 구독 관리 */}
          <details open className="group rounded-xl border bg-card text-card-foreground shadow-sm">
            <summary className="flex items-center gap-3 cursor-pointer p-4 select-none list-none [&::-webkit-details-marker]:hidden">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">2</span>
              <span className="font-semibold text-base flex-1">구독 관리</span>
              <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4 pt-2 border-t">
              <div className="rounded-xl border overflow-hidden">
                {subscriptionInfo?.paddleSubscriptionId ? (
                  /* Case A: 웹 Paddle 구독 — 결제 수단 변경 + 구독 취소 버튼 */
                  <>
                    {/* 결제 수단 변경 */}
                    <button
                      onClick={handlePaddleUpdatePayment}
                      disabled={isUpdatingPayment}
                      className="flex items-center gap-3 w-full px-4 py-3 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors text-left"
                    >
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-blue-700 dark:text-blue-300" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">결제 수단 변경</p>
                        <p className="text-xs text-muted-foreground">
                          {isUpdatingPayment ? '처리 중...' : '클릭하여 결제 수단을 변경하세요'}
                        </p>
                      </div>
                      {isUpdatingPayment ? (
                        <RefreshCw className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>

                    {/* 플랜 변경: 월간 사용자만 연간 업그레이드 버튼 표시 */}
                    {subscriptionInfo?.productId?.includes('monthly') && (
                      <button
                        onClick={handleUpgradeToYearly}
                        disabled={isUpgradingPlan || !!subscriptionInfo?.cancelledAt}
                        className="flex items-center gap-3 w-full px-4 py-3 text-left bg-primary/5 hover:bg-primary/10 transition-colors border-t disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          {isUpgradingPlan ? (
                            <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 text-primary" />
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-primary">연간 플랜으로 업그레이드</p>
                          <p className="text-xs text-muted-foreground">
                            {isUpgradingPlan
                              ? '변경 처리 중...'
                              : subscriptionInfo?.cancelledAt
                                ? '취소 예약 상태에서는 변경할 수 없습니다'
                                : '₩44,000/년 (33% 할인) · 미사용분 비례 차감'}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </button>
                    )}

                    {/* 구독 취소 / 취소 철회 */}
                    {subscriptionInfo?.cancelledAt ? (
                      /* 취소 예약 상태 → 취소 철회 버튼 */
                      <>
                        <div className="px-4 py-3 border-t bg-amber-50 dark:bg-amber-950/30">
                          <p className="text-sm text-amber-800 dark:text-amber-200">
                            구독 취소가 예약되었습니다.
                            {subscriptionExpiresAt
                              ? ` ${new Date(subscriptionExpiresAt).toLocaleDateString('ko-KR')}까지 이용 가능합니다.`
                              : ''}
                          </p>
                        </div>
                        <button
                          onClick={handlePaddleReactivate}
                          disabled={isReactivating}
                          className="flex items-center gap-3 w-full px-4 py-3 border-t bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors text-left"
                        >
                          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center">
                            {isReactivating ? (
                              <RefreshCw className="w-4 h-4 text-green-600 dark:text-green-400 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            )}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-green-700 dark:text-green-400">취소 철회</p>
                            <p className="text-xs text-muted-foreground">
                              {isReactivating ? '철회 처리 중...' : '구독을 계속 유지합니다'}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        </button>
                      </>
                    ) : (
                      /* 일반 상태 → 구독 취소 버튼 */
                      <button
                        onClick={handlePaddleCancel}
                        disabled={isCancelling}
                        className="flex items-center gap-3 w-full px-4 py-3 border-t hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left"
                      >
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                          {isCancelling ? (
                            <RefreshCw className="w-4 h-4 text-red-600 dark:text-red-400 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-red-600 dark:text-red-400">구독 취소</p>
                          <p className="text-xs text-muted-foreground">
                            {isCancelling ? '취소 처리 중...' : '현재 결제 기간까지 이용 가능합니다'}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </button>
                    )}
                  </>
                ) : subscriptionInfo?.platform === 'ios' ? (
                  /* Case B: App Store 구독 */
                  <>
                    <a
                      href="https://apps.apple.com/account/subscriptions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 w-full px-4 py-3 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors text-left"
                    >
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-blue-700 dark:text-blue-300" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">App Store에서 구독 관리</p>
                        <p className="text-xs text-muted-foreground">결제 수단 변경, 구독 취소 등은 App Store에서 관리할 수 있습니다</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </a>

                    {/* 플랜 변경 */}
                    <a
                      className="flex items-center gap-3 w-full px-4 py-3 text-left bg-muted/50 hover:bg-muted/80 transition-colors border-t"
                      href="mailto:skwhdgks@gmail.com?subject=DayStep%20%ED%94%8C%EB%9E%9C%20%EB%B3%80%EA%B2%BD%20%EC%9A%94%EC%B2%AD"
                    >
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <RefreshCw className="w-4 h-4 text-muted-foreground" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">플랜 변경</p>
                        <p className="text-xs text-muted-foreground">이메일로 플랜 변경 요청</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </a>
                  </>
                ) : subscriptionInfo?.platform === 'android' ? (
                  /* Case C: Play Store 구독 */
                  <>
                    <a
                      href="https://play.google.com/store/account/subscriptions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 w-full px-4 py-3 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors text-left"
                    >
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-blue-700 dark:text-blue-300" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Play Store에서 구독 관리</p>
                        <p className="text-xs text-muted-foreground">결제 수단 변경, 구독 취소 등은 Play Store에서 관리할 수 있습니다</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </a>

                    {/* 플랜 변경 */}
                    <a
                      className="flex items-center gap-3 w-full px-4 py-3 text-left bg-muted/50 hover:bg-muted/80 transition-colors border-t"
                      href="mailto:skwhdgks@gmail.com?subject=DayStep%20%ED%94%8C%EB%9E%9C%20%EB%B3%80%EA%B2%BD%20%EC%9A%94%EC%B2%AD"
                    >
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <RefreshCw className="w-4 h-4 text-muted-foreground" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">플랜 변경</p>
                        <p className="text-xs text-muted-foreground">이메일로 플랜 변경 요청</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </a>
                  </>
                ) : (
                  /* Fallback: platform 미지정 (web이지만 paddleSubscriptionId 없는 경우 등) */
                  <>
                    <div className="flex items-center gap-3 w-full px-4 py-3 bg-blue-50 dark:bg-blue-950/30">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-blue-700 dark:text-blue-300" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">결제 수단 변경</p>
                        <p className="text-xs text-muted-foreground">구독 확인 이메일의 &lsquo;결제 방법 업데이트&rsquo; 링크를 이용해주세요</p>
                      </div>
                    </div>

                    {/* 플랜 변경 */}
                    <a
                      className="flex items-center gap-3 w-full px-4 py-3 text-left bg-muted/50 hover:bg-muted/80 transition-colors border-t"
                      href="mailto:skwhdgks@gmail.com?subject=DayStep%20%ED%94%8C%EB%9E%9C%20%EB%B3%80%EA%B2%BD%20%EC%9A%94%EC%B2%AD"
                    >
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <RefreshCw className="w-4 h-4 text-muted-foreground" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">플랜 변경</p>
                        <p className="text-xs text-muted-foreground">이메일로 플랜 변경 요청</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </a>

                    {/* 구독 취소 */}
                    <div className="flex items-center gap-3 w-full px-4 py-3 border-t">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">구독 취소</p>
                        <p className="text-xs text-muted-foreground">구독 확인 이메일의 &lsquo;구독 취소&rsquo; 링크를 이용해주세요</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

            </div>
          </details>

          {/* 섹션 3 — 도움말 & 환불 */}
          <details open className="group rounded-xl border bg-card text-card-foreground shadow-sm">
            <summary className="flex items-center gap-3 cursor-pointer p-4 select-none list-none [&::-webkit-details-marker]:hidden">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">3</span>
              <span className="font-semibold text-base flex-1">도움말 & 환불</span>
              <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4 pt-2 border-t space-y-4">
              {/* 환불 정책 요약 */}
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 space-y-1.5">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">환불 정책</p>
                <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-0.5 list-disc list-inside">
                  <li>구독 후 <strong>7일 이내</strong>: 전액 환불 가능</li>
                  <li>7일 이후: 환불 불가 (구독 취소 시 현재 기간까지 이용 가능)</li>
                </ul>
                <a
                  href="/refund"
                  className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline mt-1"
                >
                  환불 정책 전문 보기
                  <ChevronRight className="w-3 h-3" />
                </a>
              </div>

              {/* 환불 요청하기 */}
              {subscriptionInfo?.paddleSubscriptionId && isWithinRefundPeriod ? (
                <button
                  onClick={handlePaddleRefund}
                  disabled={isRefunding}
                  className="flex items-center gap-3 rounded-lg bg-red-50 dark:bg-red-950/30 p-3 text-sm hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-red-200 dark:bg-red-800 flex items-center justify-center">
                    {isRefunding ? (
                      <RefreshCw className="w-4 h-4 text-red-700 dark:text-red-300 animate-spin" />
                    ) : (
                      <HelpCircle className="w-4 h-4 text-red-700 dark:text-red-300" />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-red-700 dark:text-red-300">환불 요청하기</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isRefunding ? '환불 처리 중...' : '7일 이내 전액 환불'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-red-400 dark:text-red-500 flex-shrink-0" />
                </button>
              ) : (
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 text-sm">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <HelpCircle className="w-4 h-4 text-muted-foreground" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-muted-foreground">환불 기간 만료</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      구독 후 7일이 경과하여 앱 내 환불이 불가합니다.{' '}
                      <a
                        href="https://www.paddle.net"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-foreground"
                      >
                        Paddle 고객지원
                      </a>
                      으로 문의해주세요.
                    </p>
                  </div>
                </div>
              )}

              {/* 이메일 문의 */}
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 text-sm">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">이메일 문의</p>
                  <a href="mailto:skwhdgks@gmail.com" className="text-xs text-primary hover:underline">skwhdgks@gmail.com</a>
                </div>
              </div>

              {/* 정책 링크 */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <a href="/terms" className="underline hover:text-foreground">이용약관</a>
                <a href="/privacy" className="underline hover:text-foreground">개인정보 처리방침</a>
                <a href="/refund" className="underline hover:text-foreground">환불 정책</a>
              </div>
            </div>
          </details>
          {/* 다른 플랫폼에서 구독하셨나요? — Paddle(web) 구독자에게는 숨김 */}
          {subscriptionInfo?.platform && subscriptionInfo.platform !== 'web' && (
            <div className="rounded-xl border bg-muted/50 p-4 space-y-3">
              <p className="text-sm font-semibold">다른 플랫폼에서 구독하셨나요?</p>
              <div className="space-y-2">
                <a
                  href="https://apps.apple.com/account/subscriptions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-card border rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <span>🍎</span>
                  <span className="flex-1 font-medium">App Store에서 관리</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </a>
                <a
                  href="https://play.google.com/store/account/subscriptions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-card border rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <span>🤖</span>
                  <span className="flex-1 font-medium">Play Store에서 관리</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </a>
              </div>
              <p className="text-xs text-muted-foreground">
                iOS/Android에서 구독하신 경우 해당 스토어에서 결제 관리, 구독 취소가 가능합니다.
              </p>
            </div>
          )}
        </>
      )}

      {/* ===== 비구독 상태 ===== */}
      {!hasActiveSubscription && (
        <>
          {/* 섹션 1 — Pro 기능 살펴보기 (Free vs Pro 비교 테이블) */}
          <details open className="group rounded-xl border bg-card text-card-foreground shadow-sm">
            <summary className="flex items-center gap-3 cursor-pointer p-4 select-none list-none [&::-webkit-details-marker]:hidden">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">1</span>
              <span className="font-semibold text-base flex-1">Pro 기능 살펴보기</span>
              <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4 pt-2 border-t">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">기능</th>
                      <th className="text-center py-2 px-3 font-semibold text-muted-foreground w-24">Free</th>
                      <th className="text-center py-2 pl-3 font-semibold w-24">
                        <span className="inline-flex items-center gap-1 text-primary">
                          <Crown className="w-3.5 h-3.5" />
                          Pro
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {FEATURE_COMPARISON.map((feat) => {
                      const currentCount = feat.statsKey && usageStats
                        ? (usageStats[feat.statsKey] as number) || 0
                        : null;
                      return (
                        <tr key={feat.name} className="border-b last:border-0">
                          <td className="py-2.5 pr-4">{feat.name}</td>
                          <td className="py-2.5 px-3 text-center text-muted-foreground">
                            {feat.statsKey === null ? (
                              <span className="text-red-400 dark:text-red-500">✕</span>
                            ) : currentCount !== null ? (
                              `${currentCount}/${feat.freeLimit}${feat.unit}`
                            ) : (
                              `${feat.freeLimit}${feat.unit}`
                            )}
                          </td>
                          <td className="py-2.5 pl-3 text-center font-medium text-primary">
                            {feat.pro === true ? (
                              <span className="text-green-600 dark:text-green-400">✓</span>
                            ) : (
                              feat.pro
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </details>

          {/* 섹션 2 — 플랜 선택 */}
          <details open className="group rounded-xl border bg-card text-card-foreground shadow-sm">
            <summary className="flex items-center gap-3 cursor-pointer p-4 select-none list-none [&::-webkit-details-marker]:hidden">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">2</span>
              <span className="font-semibold text-base flex-1">플랜 선택</span>
              <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4 pt-2 border-t">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 월간 플랜 */}
                <label
                  className={`relative flex flex-col rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                    selectedPlan === 'monthly'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/30'
                  } ${(!isPaddleReady && !isNative) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value="monthly"
                    checked={selectedPlan === 'monthly'}
                    onChange={() => setSelectedPlan('monthly')}
                    className="sr-only"
                    disabled={!isPaddleReady && !isNative}
                  />
                  <span className="font-semibold">월간</span>
                  <span className="text-2xl font-bold mt-1">₩5,500<span className="text-sm font-normal text-muted-foreground">/월</span></span>
                </label>

                {/* 연간 플랜 */}
                <label
                  className={`relative flex flex-col rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                    selectedPlan === 'yearly'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/30'
                  } ${(!isPaddleReady && !isNative) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value="yearly"
                    checked={selectedPlan === 'yearly'}
                    onChange={() => setSelectedPlan('yearly')}
                    className="sr-only"
                    disabled={!isPaddleReady && !isNative}
                  />
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">연간</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-medium">추천 · 33% 할인</span>
                  </div>
                  <span className="text-2xl font-bold mt-1">₩44,000<span className="text-sm font-normal text-muted-foreground">/년</span></span>
                  <span className="text-xs text-muted-foreground mt-0.5">월 ₩3,667</span>
                </label>
              </div>

              {!isPaddleReady && !isNative && (
                <p className="text-xs text-muted-foreground mt-2 text-center">결제 시스템을 불러오는 중...</p>
              )}
            </div>
          </details>

          {/* 섹션 3 — 결제하기 */}
          <details open className="group rounded-xl border bg-card text-card-foreground shadow-sm">
            <summary className="flex items-center gap-3 cursor-pointer p-4 select-none list-none [&::-webkit-details-marker]:hidden">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">3</span>
              <span className="font-semibold text-base flex-1">결제하기</span>
              <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4 pt-2 border-t space-y-4">
              {/* CTA 버튼 */}
              {isNative ? (
                <Button
                  onClick={() => handlePurchase(selectedPlan)}
                  disabled={isPurchasing}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80"
                  size="lg"
                >
                  {isPurchasing ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Pro 구독 시작하기
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => openPaddleCheckout(selectedPlan)}
                  disabled={isPaddleLoading || !isPaddleReady}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80"
                  size="lg"
                >
                  {isPaddleLoading ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Pro 구독 시작하기
                    </>
                  )}
                </Button>
              )}

              {/* 안내 문구 */}
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  안전한 결제
                </span>
                <span>·</span>
                <span>7일 이내 전액 환불</span>
                <span>·</span>
                <a href="/refund" className="underline hover:text-foreground">환불 정책</a>
              </div>

              {/* 동의 문구 */}
              <p className="text-center text-xs text-muted-foreground">
                구독을 진행하면{' '}
                <a href="/terms" className="underline hover:text-foreground">이용약관</a>
                {' '}및{' '}
                <a href="/privacy" className="underline hover:text-foreground">개인정보 처리방침</a>
                에 동의하는 것으로 간주됩니다.
              </p>
            </div>
          </details>

          {/* 구독 복원 버튼 (모바일만) */}
          {isNative && (
            <div className="flex justify-center pt-2">
              <Button
                onClick={handleRestore}
                disabled={isRestoring || isPurchasing}
                variant="ghost"
                className="text-sm"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    복원 중...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    구독 복원하기
                  </>
                )}
              </Button>
            </div>
          )}

          {/* 다른 플랫폼에서 구독하셨나요? — 비구독자에게 표시 */}
          <div className="rounded-xl border bg-muted/50 p-4 space-y-3">
            <p className="text-sm font-semibold">다른 플랫폼에서 구독하셨나요?</p>
            <div className="space-y-2">
              <a
                href="https://apps.apple.com/account/subscriptions"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-card border rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <span>🍎</span>
                <span className="flex-1 font-medium">App Store에서 관리</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </a>
              <a
                href="https://play.google.com/store/account/subscriptions"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-card border rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <span>🤖</span>
                <span className="flex-1 font-medium">Play Store에서 관리</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              iOS/Android에서 구독하신 경우 해당 스토어에서 결제 관리, 구독 취소가 가능합니다.
            </p>
          </div>
        </>
      )}

      {/* Paddle.js 스크립트 로드 (웹에서만) */}
      {!isNative && (
        <Script
          src="https://cdn.paddle.com/paddle/v2/paddle.js"
          strategy="afterInteractive"
          onLoad={initializePaddle}
          onError={(e) => {
            console.error('Paddle.js load error:', e);
          }}
        />
      )}
    </div>
  );
}
