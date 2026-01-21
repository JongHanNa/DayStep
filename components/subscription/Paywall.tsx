'use client';

import { Crown, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PRO_FEATURES } from '@/lib/featureFlags';
import { useSubscription } from '@/hooks/useSubscription';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';

interface PaywallProps {
  /**
   * 잠금 해제하려는 기능 ID (선택 사항)
   * PRO_FEATURES의 id와 매칭
   */
  featureId?: string;

  /**
   * 커스텀 제목 (선택 사항)
   */
  title?: string;

  /**
   * 커스텀 설명 (선택 사항)
   */
  description?: string;

  /**
   * 모달 형태로 표시할지 여부
   */
  isModal?: boolean;

  /**
   * 닫기 콜백 (모달일 때만)
   */
  onClose?: () => void;
}

/**
 * Pro 기능 Paywall 컴포넌트
 *
 * - Pro 구독이 필요한 기능에 접근 시 표시
 * - 전체 Pro 기능 목록 표시
 * - 구독 페이지로 이동하는 CTA
 */
export function Paywall({
  featureId,
  title = 'Pro 기능',
  description = '이 기능은 Pro 구독이 필요합니다',
  isModal = false,
  onClose,
}: PaywallProps) {
  const { hasActiveSubscription, isInTrial, daysRemainingInTrial } = useSubscription();
  const { enterSettingsMode } = useADHDModeStore();

  // 현재 기능 찾기
  const currentFeature = featureId
    ? PRO_FEATURES.find((f) => f.id === featureId)
    : null;

  const handleUpgrade = () => {
    enterSettingsMode('subscription');
    onClose?.();
  };

  const handleClose = () => {
    onClose?.();
  };

  // 이미 Pro 구독자면 이 컴포넌트를 보여주지 않음 (안전 장치)
  if (hasActiveSubscription) {
    return null;
  }

  return (
    <div className={isModal ? 'fixed inset-0 z-50 flex items-center justify-center bg-base-100' : ''}>
      <Card className={isModal ? 'w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto' : 'w-full'}>
        <CardHeader>
          {isModal && onClose && (
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>

          {isInTrial && daysRemainingInTrial !== null && daysRemainingInTrial > 0 && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 무료 체험이 <strong>{daysRemainingInTrial}일</strong> 남았습니다!
              </p>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 현재 기능 강조 */}
          {currentFeature && (
            <div className="p-4 bg-muted rounded-lg border-2 border-primary">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-foreground">{currentFeature.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentFeature.description}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pro 기능 목록 */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Pro 구독으로 잠금 해제
            </h3>
            <div className="space-y-3">
              {PRO_FEATURES.map((feature) => (
                <div
                  key={feature.id}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                    feature.id === featureId
                      ? 'bg-primary/10'
                      : 'bg-muted/50'
                  }`}
                >
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground text-sm">
                      {feature.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA 버튼 */}
          <div className="space-y-3 pt-4 border-t">
            <Button
              onClick={handleUpgrade}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white"
            >
              <Crown className="w-5 h-5 mr-2" />
              Pro 구독하기
            </Button>

            {isModal && onClose && (
              <Button
                onClick={handleClose}
                variant="ghost"
                className="w-full"
              >
                나중에
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 페이지 전체를 Paywall로 감싸는 HOC 패턴
 *
 * @example
 * ```tsx
 * export default function GoalCompassPage() {
 *   return (
 *     <PaywallGuard featureId="goal_compass">
 *       <GoalCompassContent />
 *     </PaywallGuard>
 *   );
 * }
 * ```
 */
export function PaywallGuard({
  featureId,
  children,
}: {
  featureId: string;
  children: React.ReactNode;
}) {
  const { hasActiveSubscription } = useSubscription();

  if (!hasActiveSubscription) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-6">
        <Paywall featureId={featureId} />
      </div>
    );
  }

  return <>{children}</>;
}
