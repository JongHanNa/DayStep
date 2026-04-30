'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle, CheckCircle, RotateCcw } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export interface OptimisticIndicatorProps {
  isProcessing: boolean;
  hasError: boolean;
  pendingCount: number;
  retryingCount: number;
  onRetry?: () => void;
  onClear?: () => void;
  className?: string;
}

export function OptimisticIndicator({
  isProcessing,
  hasError,
  pendingCount,
  retryingCount,
  onRetry,
  onClear,
  className
}: OptimisticIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { colors, primaryColor, hexWithOpacity } = useTheme();

  useEffect(() => {
    setIsVisible(isProcessing || hasError || pendingCount > 0);
  }, [isProcessing, hasError, pendingCount]);

  if (!isVisible) {
    return null;
  }

  const accent = (() => {
    if (hasError) return colors.error;
    if (retryingCount > 0) return colors.warning;
    if (isProcessing) return primaryColor;
    return colors.success;
  })();

  const getStatusIcon = () => {
    if (hasError) return <AlertCircle className="w-4 h-4" />;
    if (retryingCount > 0) return <RotateCcw className="w-4 h-4 animate-spin" />;
    if (isProcessing) return <Loader2 className="w-4 h-4 animate-spin" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (hasError) return `${pendingCount}개 작업 실패`;
    if (retryingCount > 0) return `${retryingCount}개 작업 재시도 중...`;
    if (isProcessing) return `${pendingCount}개 작업 처리 중...`;
    return '모든 작업 완료';
  };

  const containerStyle: React.CSSProperties = {
    color: accent,
    backgroundColor: hexWithOpacity(accent, 0.08),
    borderColor: hexWithOpacity(accent, 0.25),
  };

  return (
    <div
      style={containerStyle}
      className={cn(
        'fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg border shadow-sm transition-all duration-300',
        className
      )}
    >
      {getStatusIcon()}
      <span className="text-sm font-medium">
        {getStatusText()}
      </span>

      {hasError && onRetry && (
        <button
          onClick={onRetry}
          className="p-1 hover:bg-black/10 rounded transition-colors"
          title="재시도"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      )}

      {(hasError || pendingCount > 0) && onClear && (
        <button
          onClick={onClear}
          className="text-xs px-2 py-1 hover:bg-black/10 rounded transition-colors"
          title="모두 지우기"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default OptimisticIndicator;
