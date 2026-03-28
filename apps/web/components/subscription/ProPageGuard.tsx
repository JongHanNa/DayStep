'use client';
import { SCREEN_REGISTRY, type ADHDSubViewId } from '@daystep/shared-core/constants';
import { Paywall } from './Paywall';
import { useSubscription } from '@/hooks/useSubscription';

export function ProPageGuard({
  screenId,
  children,
}: {
  screenId: ADHDSubViewId;
  children: React.ReactNode;
}) {
  const screen = SCREEN_REGISTRY[screenId];
  const { hasActiveSubscription, isInGracePeriod } = useSubscription();

  if (screen?.isPro && !hasActiveSubscription && !isInGracePeriod) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-6">
        <Paywall
          title={screen.label}
          description={`${screen.label}은 Pro 구독이 필요합니다`}
        />
      </div>
    );
  }
  return <>{children}</>;
}
