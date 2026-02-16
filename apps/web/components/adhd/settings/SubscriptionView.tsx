'use client';

import { useEffect, useState, useCallback } from 'react';
import { Crown, RefreshCw, Wrench, XCircle, CheckCircle, CreditCard, ChevronDown, Mail, ExternalLink, HelpCircle, Shield, Sparkles } from 'lucide-react';
import Script from 'next/script';
import { useAuth } from '@/app/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { devCancelSubscription, devActivateSubscription } from '@/lib/supabase/subscription';
import { FREE_TIER_LIMITS } from '@/lib/featureFlags';

// Paddle 설정
const PADDLE_CONFIG = {
  clientToken: 'live_f3f52a96a4d916a1382ee66aaa1',
  environment: 'production' as const,
  prices: {
    monthly: 'pri_01kbgwtw6fdknst82vxc9sjg3s',
    yearly: 'pri_01kbgx1kbjmtw96e0fkjg46j1r',
  },
};

// Paddle 타입 선언
declare global {
  interface Window {
    Paddle?: {
      Initialize: (config: {
        token: string;
        eventCallback?: (event: any) => void;
      }) => void;
      Checkout: {
        open: (options: {
          items: Array<{ priceId: string; quantity: number }>;
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
  if (productId === PADDLE_CONFIG.prices.monthly) {
    return { label: '월간', price: '₩5,500/월' };
  }
  if (productId === PADDLE_CONFIG.prices.yearly) {
    return { label: '연간', price: '₩44,000/년' };
  }
  return { label: productId || '구독 중', price: '-' };
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
const FEATURE_COMPARISON = [
  { name: '할일', free: `${FREE_TIER_LIMITS.MAX_TODOS}개`, pro: '무제한' },
  { name: '습관', free: `${FREE_TIER_LIMITS.MAX_HABITS}개`, pro: '무제한' },
  { name: '프로젝트', free: `${FREE_TIER_LIMITS.MAX_PROJECTS}개`, pro: '무제한' },
  { name: '노트', free: `${FREE_TIER_LIMITS.MAX_NOTES}개`, pro: '무제한' },
  { name: '연락처 연결', free: `${FREE_TIER_LIMITS.MAX_CONTACTS}개`, pro: '무제한' },
  { name: '소중한 사람', free: `${FREE_TIER_LIMITS.MAX_CHERISHED_PEOPLE}명`, pro: '무제한' },
  { name: '관심 기록', free: `${FREE_TIER_LIMITS.MAX_CARE_INTERACTIONS}개`, pro: '무제한' },
  { name: '통계 & 인사이트', free: null, pro: true },
] as const;

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
    isNative,
    paymentsEnabled,
  } = useSubscription();

  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDevCancelling, setIsDevCancelling] = useState(false);
  const [isDevActivating, setIsDevActivating] = useState(false);
  const [isPaddleReady, setIsPaddleReady] = useState(false);
  const [isPaddleLoading, setIsPaddleLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  // 개발 환경 여부
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Paddle 초기화 (v2 Initialize API 사용, production이 기본값)
  const initializePaddle = useCallback(() => {
    if (window.Paddle && !isPaddleReady) {
      try {
        window.Paddle.Initialize({ token: PADDLE_CONFIG.clientToken });
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
      // URL에서 success 파라미터 제거
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

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

  // [개발 전용] 구독 취소 핸들러
  const handleDevCancel = async () => {
    if (!user?.id) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    setIsDevCancelling(true);
    try {
      const result = await devCancelSubscription(user.id);

      if (result.success) {
        toast.success('구독이 취소되었습니다. (개발 테스트)');
        window.location.reload();
      } else {
        toast.error(result.error || '구독 취소 실패');
      }
    } catch (error: any) {
      console.error('[DEV] 구독 취소 오류:', error);
      toast.error(error.message || '구독 취소 중 오류 발생');
    } finally {
      setIsDevCancelling(false);
    }
  };

  // [개발 전용] 구독 활성화 핸들러
  const handleDevActivate = async () => {
    if (!user?.id) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    setIsDevActivating(true);
    try {
      const result = await devActivateSubscription(user.id);

      if (result.success) {
        toast.success('구독이 활성화되었습니다. (개발 테스트)');
        window.location.reload();
      } else {
        toast.error(result.error || '구독 활성화 실패');
      }
    } catch (error: any) {
      console.error('[DEV] 구독 활성화 오류:', error);
      toast.error(error.message || '구독 활성화 중 오류 발생');
    } finally {
      setIsDevActivating(false);
    }
  };

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
    <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
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
          <details className="group rounded-xl border bg-card text-card-foreground shadow-sm">
            <summary className="flex items-center gap-3 cursor-pointer p-4 select-none list-none [&::-webkit-details-marker]:hidden">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">2</span>
              <span className="font-semibold text-base flex-1">구독 관리</span>
              <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4 pt-2 border-t space-y-3">
              {subscriptionInfo?.platform && subscriptionInfo.platform !== 'web' ? (
                /* iOS / Android 스토어 관리 */
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    결제 관리, 구독 취소가 가능합니다.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => {
                      if (subscriptionInfo.platform === 'ios') {
                        window.open('https://apps.apple.com/account/subscriptions', '_blank');
                      } else {
                        window.open('https://play.google.com/store/account/subscriptions', '_blank');
                      }
                    }}
                  >
                    <span>{subscriptionInfo.platform === 'ios' ? 'App Store' : 'Play Store'}에서 관리</span>
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                /* 웹 (Paddle) 관리 */
                <div className="grid gap-3 sm:grid-cols-3">
                  <button
                    className="flex flex-col items-center gap-2 rounded-lg border p-4 text-sm hover:bg-accent transition-colors"
                    onClick={() => {
                      // Paddle 고객 포털 — 구독 이메일로 매직링크 전송
                      window.open('https://customer-portal.paddle.com', '_blank');
                    }}
                  >
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">결제 수단 변경</span>
                  </button>
                  <button
                    className="flex flex-col items-center gap-2 rounded-lg border p-4 text-sm hover:bg-accent transition-colors"
                    onClick={() => {
                      window.open('https://customer-portal.paddle.com', '_blank');
                    }}
                  >
                    <RefreshCw className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">플랜 변경</span>
                  </button>
                  <button
                    className="flex flex-col items-center gap-2 rounded-lg border p-4 text-sm hover:bg-accent transition-colors text-red-600 dark:text-red-400"
                    onClick={() => {
                      window.open('https://customer-portal.paddle.com', '_blank');
                    }}
                  >
                    <XCircle className="w-5 h-5" />
                    <span className="font-medium">구독 취소</span>
                  </button>
                </div>
              )}
            </div>
          </details>

          {/* 섹션 3 — 도움말 & 환불 */}
          <details className="group rounded-xl border bg-card text-card-foreground shadow-sm">
            <summary className="flex items-center gap-3 cursor-pointer p-4 select-none list-none [&::-webkit-details-marker]:hidden">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">3</span>
              <span className="font-semibold text-base flex-1">도움말 & 환불</span>
              <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4 pt-2 border-t space-y-4">
              {/* 환불 정책 요약 */}
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    구독 시작일로부터 <strong>7일 이내</strong> 전액 환불이 가능합니다.
                  </p>
                </div>
              </div>

              {/* 환불 요청 & 이메일 */}
              <div className="grid gap-3 sm:grid-cols-2">
                <a
                  href="/refund"
                  className="flex items-center gap-3 rounded-lg border p-3 text-sm hover:bg-accent transition-colors"
                >
                  <HelpCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <span className="font-medium">환불 요청</span>
                    <p className="text-xs text-muted-foreground mt-0.5">온라인으로 환불 신청</p>
                  </div>
                </a>
                <a
                  href="mailto:skwhdgks@gmail.com"
                  className="flex items-center gap-3 rounded-lg border p-3 text-sm hover:bg-accent transition-colors"
                >
                  <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <span className="font-medium">이메일 문의</span>
                    <p className="text-xs text-muted-foreground mt-0.5">skwhdgks@gmail.com</p>
                  </div>
                </a>
              </div>

              {/* 정책 링크 */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <a href="/terms" className="underline hover:text-foreground">이용약관</a>
                <a href="/privacy" className="underline hover:text-foreground">개인정보 처리방침</a>
                <a href="/refund-policy" className="underline hover:text-foreground">환불 정책</a>
              </div>
            </div>
          </details>
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
                    {FEATURE_COMPARISON.map((feat) => (
                      <tr key={feat.name} className="border-b last:border-0">
                        <td className="py-2.5 pr-4">{feat.name}</td>
                        <td className="py-2.5 px-3 text-center text-muted-foreground">
                          {feat.free === null ? (
                            <span className="text-red-400 dark:text-red-500">✕</span>
                          ) : (
                            feat.free
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
                    ))}
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
                <a href="/refund-policy" className="underline hover:text-foreground">환불 정책</a>
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
        </>
      )}

      {/* 개발자 옵션 (개발 환경에서만 표시) */}
      {isDevelopment && (
        <Card className="border-dashed border-2 border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/30">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Wrench className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <div>
                <CardTitle className="text-lg text-purple-800 dark:text-purple-200">
                  개발자 옵션
                </CardTitle>
                <CardDescription className="text-purple-600 dark:text-purple-400">
                  개발 테스트 전용 (프로덕션에서는 표시되지 않음)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              {hasActiveSubscription ? (
                <Button
                  onClick={handleDevCancel}
                  disabled={isDevCancelling}
                  variant="outline"
                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
                >
                  {isDevCancelling ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      취소 중...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      구독 취소 (Free 전환)
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleDevActivate}
                  disabled={isDevActivating}
                  variant="outline"
                  className="flex-1 border-green-300 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950"
                >
                  {isDevActivating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      활성화 중...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      구독 활성화 (Pro 전환)
                    </>
                  )}
                </Button>
              )}
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400">
              * DB 상태만 변경됩니다. RevenueCat에는 반영되지 않습니다.
            </p>
          </CardContent>
        </Card>
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
