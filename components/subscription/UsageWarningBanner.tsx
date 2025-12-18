'use client';

/**
 * UsageWarningBanner - 용량 경고 배너
 *
 * 화면 진입 시 무료 플랜 제한에 근접/초과했을 때 표시하는 배너
 * - 경고(80%+): 노란색 배너
 * - 차단(100%): 빨간색 배너 + Pro 업그레이드 버튼
 */

import { AlertTriangle, TrendingUp, Crown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUsageStats } from '@/hooks/useUsageStats';
import type { UsageEntityType } from '@/lib/featureFlags';

interface UsageWarningBannerProps {
  /** 체크할 엔티티 타입들 */
  entities: UsageEntityType[];
  /** 추가 CSS 클래스 */
  className?: string;
}

export function UsageWarningBanner({ entities, className = '' }: UsageWarningBannerProps) {
  const router = useRouter();
  const { usageSummary, hasActiveSubscription } = useUsageStats();

  // Pro 사용자는 표시 안 함
  if (hasActiveSubscription) return null;

  // 해당 엔티티 중 경고/차단 상태인 것만 필터
  const relevantWarnings = usageSummary.filter((item) =>
    entities.includes(item.entity)
  );

  if (relevantWarnings.length === 0) return null;

  // 가장 심각한 상태 기준으로 표시
  const hasBlocked = relevantWarnings.some((item) => item.blocked);
  const warningItems = relevantWarnings.filter((item) => item.warning || item.blocked);

  const handleUpgrade = () => {
    router.push('/settings/subscription');
  };

  return (
    <div
      className={`p-3 rounded-xl ${
        hasBlocked ? 'bg-error/10 border border-error/20' : 'bg-warning/10 border border-warning/20'
      } ${className}`}
    >
      <div className="flex items-start gap-2">
        {hasBlocked ? (
          <AlertTriangle className="w-5 h-5 text-error flex-shrink-0" />
        ) : (
          <TrendingUp className="w-5 h-5 text-warning flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium ${
              hasBlocked ? 'text-error' : 'text-warning'
            }`}
          >
            {hasBlocked ? '무료 플랜 한도 도달' : '무료 플랜 한도 근접'}
          </p>
          <div className={`text-xs mt-1 ${hasBlocked ? 'text-error/80' : 'text-warning/80'}`}>
            {warningItems.map((item, idx) => (
              <span key={item.entity}>
                {item.displayName} {item.current}/{item.limit}개
                {idx < warningItems.length - 1 && ', '}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={handleUpgrade}
          className={`btn btn-xs gap-1 ${hasBlocked ? 'btn-error' : 'btn-warning'}`}
        >
          <Crown className="w-3 h-3" />
          Pro
        </button>
      </div>
    </div>
  );
}

export default UsageWarningBanner;
