'use client';

/**
 * 용량 경고/위험 배너
 *
 * 대시보드 상단에 표시되는 용량 상태 배너
 * - 80% 이상: 노란색 경고
 * - 100% 도달: 빨간색 위험
 */

import { useState } from 'react';
import { X, AlertTriangle, AlertCircle, Crown } from 'lucide-react';
import Link from 'next/link';
import { useUsageStats, type UsageSummary } from '@/hooks/useUsageStats';
import { FEATURE_FLAGS } from '@/lib/featureFlags';

interface UsageBannerProps {
  /** 배너 표시 위치 */
  className?: string;
}

export function UsageBanner({ className = '' }: UsageBannerProps) {
  const { usageSummary, hasWarningOrBlocked, hasBlocked, hasActiveSubscription } = useUsageStats();
  const [isDismissed, setIsDismissed] = useState(false);

  // 결제 비활성화 또는 Pro 사용자면 표시 안함
  if (!FEATURE_FLAGS.PAYMENTS_ENABLED || hasActiveSubscription) {
    return null;
  }

  // 경고/차단 상태가 없으면 표시 안함
  if (!hasWarningOrBlocked || isDismissed) {
    return null;
  }

  // 가장 심각한 상태 찾기
  const mostCritical = usageSummary.reduce<UsageSummary | null>((prev, curr) => {
    if (!prev) return curr;
    if (curr.blocked && !prev.blocked) return curr;
    if (curr.percentage > prev.percentage) return curr;
    return prev;
  }, null);

  if (!mostCritical) return null;

  const isBlocked = hasBlocked;
  const bgColor = isBlocked ? 'bg-red-50 dark:bg-red-950' : 'bg-amber-50 dark:bg-amber-950';
  const borderColor = isBlocked ? 'border-error' : 'border-warning';
  const textColor = isBlocked ? 'text-error' : 'text-warning';
  const Icon = isBlocked ? AlertCircle : AlertTriangle;

  // 메시지 생성
  const blockedItems = usageSummary.filter((item) => item.blocked);
  const warningItems = usageSummary.filter((item) => item.warning && !item.blocked);

  let message = '';
  if (blockedItems.length > 0) {
    const names = blockedItems.map((item) => item.displayName).join(', ');
    message = `${names} 한도에 도달했습니다. 더 이상 생성할 수 없습니다.`;
  } else if (warningItems.length > 0) {
    const names = warningItems.map((item) => `${item.displayName}(${item.percentage}%)`).join(', ');
    message = `${names} 용량이 거의 찼습니다.`;
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border ${bgColor} ${borderColor} ${className}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Icon className={`w-5 h-5 flex-shrink-0 ${textColor}`} />
        <p className={`text-sm ${textColor} truncate`}>{message}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          href="/settings/subscription"
          className="btn btn-sm btn-primary gap-1.5 rounded-full"
        >
          <Crown className="w-4 h-4" />
          <span className="hidden sm:inline">Pro 업그레이드</span>
          <span className="sm:hidden">업그레이드</span>
        </Link>

        <button
          onClick={() => setIsDismissed(true)}
          className="btn btn-sm btn-ghost btn-circle"
          aria-label="배너 닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
