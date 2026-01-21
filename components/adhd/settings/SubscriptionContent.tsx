'use client';

import { useEffect, useState, useCallback } from 'react';
import { Crown, RefreshCw, Calendar, AlertCircle, Wrench, XCircle, CheckCircle, Globe, CreditCard, Check } from 'lucide-react';
import Script from 'next/script';
import { useAuth } from '@/app/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SubscriptionPlanCard } from '@/components/subscription/SubscriptionPlanCard';
import { toast } from 'sonner';
import { devCancelSubscription, devActivateSubscription } from '@/lib/supabase/subscription';

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
      Environment: {
        set: (env: 'sandbox' | 'production') => void;
      };
      Setup: (config: { token: string }) => void;
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

interface SubscriptionContentProps {
  onBack: () => void;
}

/**
 * 구독 관리 콘텐츠
 *
 * 기존 /subscription 페이지의 콘텐츠를 URL 변경 없이 렌더링합니다.
 */
export default function SubscriptionContent({ onBack }: SubscriptionContentProps) {
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

  // 개발 환경 여부
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Paddle 초기화
  const initializePaddle = useCallback(() => {
    if (window.Paddle && !isPaddleReady) {
      try {
        window.Paddle.Environment.set(PADDLE_CONFIG.environment);
        window.Paddle.Setup({ token: PADDLE_CONFIG.clientToken });
        setIsPaddleReady(true);
        console.log('Paddle initialized successfully');
      } catch (error) {
        console.error('Paddle initialization error:', error);
      }
    }
  }, [isPaddleReady]);

  // Paddle Checkout 열기
  const openPaddleCheckout = useCallback((plan: 'monthly' | 'yearly') => {
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
          successUrl: `${window.location.origin}/?settings=subscription&success=true`,
        },
      });
    } catch (error) {
      console.error('Paddle checkout error:', error);
      toast.error('결제 창을 열 수 없습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsPaddleLoading(false);
    }
  }, [user?.id]);

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

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">구독 관리</h1>
        <p className="text-muted-foreground">Pro 기능을 잠금 해제하세요</p>
      </div>

      {/* 현재 구독 상태 */}
      {hasActiveSubscription ? (
        <Card className="border-primary border-2 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Pro 구독자</CardTitle>
                <CardDescription>
                  모든 Pro 기능을 사용하실 수 있습니다
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">상태:</span>
                <p className="mt-1 font-semibold text-foreground">
                  {isInTrial ? '🎁 무료 체험 중' : '✅ 활성'}
                </p>
              </div>
              {isInTrial && daysRemainingInTrial !== null && (
                <div>
                  <span className="font-medium text-muted-foreground">남은 기간:</span>
                  <p className="mt-1 font-semibold text-foreground">
                    {daysRemainingInTrial}일
                  </p>
                </div>
              )}
              {subscriptionExpiresAt && !isInTrial && (
                <div>
                  <span className="font-medium text-muted-foreground">갱신일:</span>
                  <p className="mt-1 font-semibold text-foreground">
                    {new Date(subscriptionExpiresAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              )}
              {subscriptionInfo?.platform && (
                <div>
                  <span className="font-medium text-muted-foreground">플랫폼:</span>
                  <p className="mt-1 font-semibold text-foreground">
                    {subscriptionInfo.platform === 'ios' ? '🍎 iOS' : '🤖 Android'}
                  </p>
                </div>
              )}
            </div>

            {isInTrial && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  💡 무료 체험 기간 동안 모든 Pro 기능을 자유롭게 사용해보세요.
                  체험 종료 전 언제든지 구독을 시작할 수 있습니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-orange-500" />
              <div>
                <CardTitle className="text-xl">무료 사용자</CardTitle>
                <CardDescription>
                  Pro 구독으로 모든 기능을 잠금 해제하세요
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* 웹에서 구독하기 (Paddle) */}
      {!isNative && !hasActiveSubscription && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-semibold mb-1">웹에서 구독하기</p>
                <p>
                  웹 브라우저에서 바로 구독을 시작할 수 있습니다.
                  결제 완료 후 모바일 앱에서 자동으로 활성화됩니다.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => openPaddleCheckout('monthly')}
                disabled={isPaddleLoading || !isPaddleReady}
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900"
              >
                {isPaddleLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                월간 ₩5,500
              </Button>
              <Button
                onClick={() => openPaddleCheckout('yearly')}
                disabled={isPaddleLoading || !isPaddleReady}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
              >
                {isPaddleLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                연간 ₩44,000
              </Button>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 text-center">
              연간 구독 시 33% 할인 (월 ₩3,667)
            </p>
          </CardContent>
        </Card>
      )}

      {/* 구독 플랜 선택 */}
      {!hasActiveSubscription && (
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">구독 플랜</h2>

          {/* Pro 기능 안내 */}
          <div className="bg-base-200 rounded-xl p-4 mb-4">
            <h3 className="font-semibold mb-3">Pro 기능</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                <span>무제한 소중한 사람 등록</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                <span>무제한 관심 기록 저장</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                <span>관계 인사이트 & 통계</span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <SubscriptionPlanCard
              plan="monthly"
              isPurchasing={isPurchasing}
              onPurchase={handlePurchase}
              disabled={!isNative}
              disabledMessage="모바일 앱에서만 구매 가능"
            />
            <SubscriptionPlanCard
              plan="yearly"
              isPurchasing={isPurchasing}
              onPurchase={handlePurchase}
              disabled={!isNative}
              disabledMessage="모바일 앱에서만 구매 가능"
            />
          </div>
        </div>
      )}

      {/* 구독 복원 버튼 (모바일만) */}
      {isNative && !hasActiveSubscription && (
        <div className="flex justify-center pt-4">
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

      {/* 구독 관리 링크 (활성 구독자만) */}
      {hasActiveSubscription && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">구독 관리</CardTitle>
            <CardDescription>
              구독을 취소하거나 결제 정보를 변경하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscriptionInfo?.platform && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  if (subscriptionInfo.platform === 'ios') {
                    window.open('https://apps.apple.com/account/subscriptions', '_blank');
                  } else if (subscriptionInfo.platform === 'android') {
                    window.open('https://play.google.com/store/account/subscriptions', '_blank');
                  }
                }}
              >
                <Calendar className="w-4 h-4 mr-2" />
                {subscriptionInfo.platform === 'ios' ? 'App Store' : 'Play Store'}에서 관리
              </Button>
            )}

            {!subscriptionInfo?.platform && (
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">웹에서 결제하셨다면:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>결제 시 수신한 영수증 이메일 확인</li>
                  <li>&quot;Manage Subscription&quot; 링크 클릭</li>
                  <li>Paddle 고객 포털에서 구독 관리</li>
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
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

      {/* 이용 약관 */}
      <div className="text-center text-xs text-muted-foreground">
        <p>
          구독을 진행하면{' '}
          <a href="/terms" className="underline hover:text-foreground">
            이용 약관
          </a>{' '}
          및{' '}
          <a href="/privacy" className="underline hover:text-foreground">
            개인정보 처리방침
          </a>
          에 동의하는 것으로 간주됩니다.
        </p>
      </div>

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
