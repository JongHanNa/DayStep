'use client';

import { Zap, Crown } from 'lucide-react';
import type { AIUsage } from '@/state/stores/aiPlanningStore';

interface UsageIndicatorProps {
  usage: AIUsage | null;
  isPro: boolean;
}

/**
 * AI 사용량 표시 컴포넌트
 */
export default function UsageIndicator({ usage, isPro }: UsageIndicatorProps) {
  if (!usage) {
    return (
      <div className="flex items-center gap-1 text-xs text-base-content/50">
        <Zap className="w-3 h-3" />
        <span>--</span>
      </div>
    );
  }

  const percentage = Math.round(
    ((usage.dailyLimit - usage.remaining) / usage.dailyLimit) * 100
  );
  const isLow = usage.remaining <= 1;
  const isExceeded = usage.isLimitExceeded;

  return (
    <div
      className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
        isExceeded
          ? 'bg-error/10 text-error'
          : isLow
          ? 'bg-warning/10 text-warning'
          : 'bg-base-200 text-base-content/70'
      }`}
    >
      {isPro ? (
        <Crown className="w-3 h-3 text-primary" />
      ) : (
        <Zap className="w-3 h-3" />
      )}
      <span>
        {usage.remaining}/{usage.dailyLimit}
      </span>

      {/* 프로그레스 바 (간소화) */}
      <div className="w-8 h-1 bg-base-300 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            isExceeded
              ? 'bg-error'
              : isLow
              ? 'bg-warning'
              : 'bg-primary'
          }`}
          style={{ width: `${100 - (usage.remaining / usage.dailyLimit) * 100}%` }}
        />
      </div>
    </div>
  );
}
