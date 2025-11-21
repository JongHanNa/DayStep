'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Crown, RefreshCw, Calendar, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SubscriptionPlanCard } from '@/components/subscription/SubscriptionPlanCard';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { toast } from 'sonner';
import { saveLastVisitedRoute } from '@/lib/capacitor/lastVisitedRoute';

export default function SubscriptionPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
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

  // 경로 저장
  useEffect(() => {
    saveLastVisitedRoute('/settings/subscription');
  }, []);

  // 인증 확인
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=%2Fsettings%2Fsubscription');
    }
  }, [authLoading, isAuthenticated, router]);

  // 결제 기능 비활성화 시 설정 페이지로 리다이렉트
  useEffect(() => {
    if (!paymentsEnabled) {
      toast.info('결제 기능이 현재 비활성화되어 있습니다.');
      router.push('/settings');
    }
  }, [paymentsEnabled, router]);

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

  // 로딩 중
  if (authLoading || !isAuthenticated || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* 상단 네비게이션 */}
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="sm" className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">구독 관리</h1>
          <p className="text-muted-foreground">Pro 기능을 잠금 해제하세요</p>
        </div>
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
        // 구독하지 않은 경우
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

      {/* 웹 환경 알림 */}
      {!isNative && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-semibold mb-1">모바일 앱에서만 구독 가능</p>
                <p>
                  iOS 또는 Android 앱을 다운로드하여 구독을 시작하세요.
                  웹에서는 구독 정보만 확인할 수 있습니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 구독 플랜 선택 */}
      {!hasActiveSubscription && (
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">구독 플랜</h2>
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
      {hasActiveSubscription && subscriptionInfo?.platform && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">구독 관리</CardTitle>
            <CardDescription>
              구독을 취소하거나 결제 정보를 변경하려면 앱스토어에서 관리하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
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
    </div>
  );
}
