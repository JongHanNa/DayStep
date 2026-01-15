'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TodoSummaryRowProps {
  /** 왼쪽 아이콘 */
  icon: React.ReactNode;
  /** 주요 라벨 (날짜, 시간 등) */
  label: string;
  /** 오른쪽 보조 텍스트 (내일, 30분 등) */
  suffix?: string;
  /** 클릭 핸들러 */
  onClick: () => void;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 아이콘 색상 클래스 */
  iconClassName?: string;
}

/**
 * 할일 편집 모달의 요약 행 컴포넌트
 *
 * 사용 예:
 * <TodoSummaryRow
 *   icon={<Calendar className="w-5 h-5" />}
 *   label="2026년 1월 16일 (금)"
 *   suffix="내일"
 *   onClick={() => setShowDateModal(true)}
 * />
 */
const TodoSummaryRow: React.FC<TodoSummaryRowProps> = ({
  icon,
  label,
  suffix,
  onClick,
  disabled = false,
  iconClassName,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg transition-colors',
        'bg-base-200 hover:bg-base-300',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* 아이콘 */}
      <div className={cn('flex-shrink-0 text-primary', iconClassName)}>
        {icon}
      </div>

      {/* 라벨 */}
      <span className="flex-1 text-left text-base font-medium truncate">
        {label}
      </span>

      {/* 보조 텍스트 */}
      {suffix && (
        <span className="text-sm text-base-content/60 flex-shrink-0">
          {suffix}
        </span>
      )}

      {/* 화살표 */}
      <ChevronRight className="w-5 h-5 text-base-content/40 flex-shrink-0" />
    </button>
  );
};

export default TodoSummaryRow;
