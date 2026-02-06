'use client';

import React from 'react';
import { Clock, Save, Check, AlertCircle } from 'lucide-react';
import type { SaveStatus } from '@/hooks/useAutoSave';

interface AutoSaveStatusProps {
  /**
   * 자동저장 상태
   */
  status: SaveStatus;
  /**
   * 재시도 버튼 클릭 핸들러
   */
  onRetry?: () => void;
  /**
   * 삭제 상태 표시 여부 (빈 노트 삭제 시)
   */
  showDeletingState?: boolean;
  /**
   * 추가 CSS 클래스
   */
  className?: string;
}

/**
 * 자동저장 상태를 표시하는 컴포넌트
 *
 * @example
 * ```tsx
 * <AutoSaveStatus
 *   status={autoSave.saveStatus}
 *   onRetry={autoSave.triggerSave}
 * />
 * ```
 */
export function AutoSaveStatus({
  status,
  onRetry,
  showDeletingState = false,
  className = ''
}: AutoSaveStatusProps) {
  // idle 상태에서는 아무것도 표시하지 않음
  if (status === 'idle') {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {status === 'pending' && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3 animate-pulse" />
          <span>저장 대기중...</span>
        </div>
      )}

      {status === 'saving' && (
        <div className="flex items-center gap-1 text-xs text-brand">
          <Save className="h-3 w-3 animate-spin" />
          <span>{showDeletingState ? '삭제 중...' : '저장 중...'}</span>
        </div>
      )}

      {status === 'saved' && (
        <div className="flex items-center gap-1 text-xs text-green-600">
          <Check className="h-3 w-3" />
          <span>{showDeletingState ? '삭제됨' : '저장됨'}</span>
        </div>
      )}

      {status === 'error' && onRetry && (
        <button
          onClick={onRetry}
          className="btn btn-ghost btn-sm text-error"
          aria-label="재시도"
        >
          <AlertCircle className="h-3 w-3 mr-1" />
          재시도
        </button>
      )}
    </div>
  );
}

export default AutoSaveStatus;
