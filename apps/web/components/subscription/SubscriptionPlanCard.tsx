'use client';

import { Crown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { useState } from 'react';

interface SubscriptionPlanCardProps {
  /**
   * 플랜 유형
   */
  plan: 'monthly' | 'yearly';

  /**
   * 구매 중 상태
   */
  isPurchasing: boolean;

  /**
   * 구매 핸들러
   */
  onPurchase: (plan: 'monthly' | 'yearly') => Promise<void>;

  /**
   * 현재 활성화된 플랜 여부
   */
  isActive?: boolean;

  /**
   * 비활성화 여부 (웹 환경 등)
   */
  disabled?: boolean;

  /**
   * 비활성화 메시지
   */
  disabledMessage?: string;
}

/**
 * 구독 플랜 카드 컴포넌트
 *
 * - 월간/연간 구독 플랜 정보 표시
 * - 가격 및 할인율 표시
 * - Pro 기능 미리보기
 * - 구매 버튼
 */
export function SubscriptionPlanCard({
  plan,
  isPurchasing,
  onPurchase,
  isActive = false,
  disabled = false,
  disabledMessage,
}: SubscriptionPlanCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const isMonthly = plan === 'monthly';
  const price = isMonthly ? FEATURE_FLAGS.PRO_MONTHLY_PRICE : FEATURE_FLAGS.PRO_YEARLY_PRICE;
  const pricePerMonth = isMonthly
    ? FEATURE_FLAGS.PRO_MONTHLY_PRICE
    : `월 ${Math.round(parseInt(FEATURE_FLAGS.PRO_YEARLY_PRICE.replace(/[^0-9]/g, '')) / 12).toLocaleString()}원`;

  const discount = isMonthly ? null : FEATURE_FLAGS.PRO_YEARLY_DISCOUNT_PERCENTAGE;

  const handlePurchase = async () => {
    setIsLoading(true);
    try {
      await onPurchase(plan);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card
      className={`relative transition-all ${
        isActive
          ? 'border-primary border-2 shadow-lg scale-105'
          : 'border-border hover:border-primary/50'
      }`}
    >
      {/* 할인 배지 (연간 플랜만) */}
      {discount && (
        <div className="absolute -top-3 -right-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
          {discount}% 할인
        </div>
      )}

      {/* 활성 플랜 배지 */}
      {isActive && (
        <div className="absolute -top-3 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1">
          <Crown className="w-3 h-3" />
          현재 플랜
        </div>
      )}

      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl">
          {isMonthly ? '월간 구독' : '연간 구독'}
        </CardTitle>
        <CardDescription>
          {isMonthly ? '매월 자동 갱신' : '1년 약정 (최대 할인)'}
        </CardDescription>

        <div className="mt-4">
          <div className="text-4xl font-bold text-foreground">
            {price}
          </div>
          {!isMonthly && (
            <div className="text-sm text-muted-foreground mt-2">
              {pricePerMonth}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 구매 버튼 */}
        {disabled ? (
          <div className="text-center">
            <p className="text-sm text-muted-foreground py-3">
              {disabledMessage || '구매할 수 없습니다'}
            </p>
          </div>
        ) : isActive ? (
          <Button
            disabled
            variant="secondary"
            className="w-full h-11 font-semibold"
          >
            <Crown className="w-4 h-4 mr-2" />
            사용 중
          </Button>
        ) : (
          <Button
            onClick={handlePurchase}
            disabled={isPurchasing || isLoading}
            className="w-full h-11 font-semibold bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white"
          >
            {isLoading || isPurchasing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                처리 중...
              </>
            ) : (
              <>
                <Crown className="w-4 h-4 mr-2" />
                구독하기
              </>
            )}
          </Button>
        )}

        {/* 추가 정보 */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {isMonthly ? '언제든지 해지 가능' : '연간 결제, 언제든지 해지 가능'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
