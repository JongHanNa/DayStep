'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, Calendar, CalendarRange, CalendarClock, Type, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Todo } from '@/types';
import { format } from 'date-fns';

interface RecurringTimeChangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (updateType: 'this' | 'future' | 'all') => void;
  todo: Todo;
  // 변경된 항목 정보
  changedFields?: {
    title?: boolean;
    time?: boolean;
  };
  // 원본/새 값
  originalTitle?: string;
  newTitle?: string;
  originalTime?: { start?: string; end?: string };
  newTime?: { start?: string; end?: string };
  isUpdating?: boolean;
}

const RecurringTimeChangeDialog: React.FC<RecurringTimeChangeDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  todo,
  changedFields = { time: true }, // 기본값: 시간 변경 (하위 호환성)
  originalTitle,
  newTitle,
  originalTime,
  newTime,
  isUpdating = false
}) => {
  const [selectedUpdateType, setSelectedUpdateType] = useState<'this' | 'future' | 'all'>('this');

  const handleConfirm = () => {
    onConfirm(selectedUpdateType);
  };

  // 반복 패턴에 따른 설명 텍스트
  const getRecurrenceDescription = () => {
    switch (todo.recurrence_pattern) {
      case 'daily':
        return '매일 반복';
      case 'weekly':
        return '매주 반복';
      case 'monthly':
        return '매월 반복';
      case 'custom':
        return '사용자 정의 반복';
      default:
        return '반복 일정';
    }
  };

  // 모달 제목 동적 생성
  const getModalTitle = () => {
    if (changedFields.title && changedFields.time) return '반복 일정 변경';
    if (changedFields.title) return '반복 일정 제목 변경';
    return '반복 일정 시간 변경';
  };

  // 모달 아이콘 동적 선택
  const getModalIcon = () => {
    if (changedFields.title && changedFields.time) return Edit3;
    if (changedFields.title) return Type;
    return Clock;
  };

  // 시간 포맷팅 (HH:mm)
  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    try {
      // ISO 형식이면 Date로 파싱
      if (timeString.includes('T')) {
        const date = new Date(timeString);
        return format(date, 'HH:mm');
      }
      // 이미 HH:mm 형식이면 그대로 반환
      return timeString.slice(0, 5);
    } catch {
      return timeString;
    }
  };

  // 시간 범위 포맷팅 (시작~종료)
  const formatTimeRange = (start?: string, end?: string): string => {
    const startFormatted = formatTime(start);
    const endFormatted = formatTime(end);

    if (!startFormatted) return '';
    if (!endFormatted || startFormatted === endFormatted) return startFormatted;
    return `${startFormatted} ~ ${endFormatted}`;
  };

  // 옵션 설명 동적 생성
  const getOptionDescriptions = () => {
    const changeType = changedFields.title && changedFields.time
      ? '내용'
      : changedFields.title
        ? '제목'
        : '시간';

    return [
      {
        value: 'this' as const,
        icon: Calendar,
        title: '이것만 변경',
        description: `현재 선택한 일정의 ${changeType}만 변경합니다.`,
        detail: `다른 반복 일정은 원래 ${changeType}을 유지합니다.`,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      },
      {
        value: 'future' as const,
        icon: CalendarRange,
        title: '이후 모든 항목 변경',
        description: `이 일정부터 앞으로의 모든 반복 일정 ${changeType}을 변경합니다.`,
        detail: `과거의 일정은 원래 ${changeType}을 유지합니다.`,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      },
      {
        value: 'all' as const,
        icon: CalendarClock,
        title: '모두 변경',
        description: `과거, 현재, 미래의 모든 반복 일정 ${changeType}을 변경합니다.`,
        detail: `이 반복 일정의 기본 ${changeType}이 변경됩니다.`,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200'
      }
    ];
  };

  const updateOptions = getOptionDescriptions();
  const ModalIcon = getModalIcon();

  // Portal을 사용하여 document.body에 직접 렌더링
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50"
      style={{ zIndex: 999999 }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mx-4 w-full max-w-md"
        style={{ zIndex: 1000000 }}
        onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <ModalIcon className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
            {getModalTitle()}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            &ldquo;{todo.title}&rdquo; ({getRecurrenceDescription()})
          </p>

          {/* 제목 변경 표시 */}
          {changedFields.title && originalTitle && newTitle && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm">
              <Type className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500 line-through truncate max-w-[120px]">{originalTitle}</span>
              <span className="text-gray-400">→</span>
              <span className="text-blue-600 font-semibold truncate max-w-[120px]">{newTitle}</span>
            </div>
          )}

          {/* 시간 변경 표시 */}
          {changedFields.time && originalTime?.start && newTime?.start && (
            <div className="mt-2 flex items-center justify-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500 line-through">{formatTimeRange(originalTime.start, originalTime.end)}</span>
              <span className="text-gray-400">→</span>
              <span className="text-blue-600 font-semibold">{formatTimeRange(newTime.start, newTime.end)}</span>
            </div>
          )}
        </div>

        <div className="py-4">
          <RadioGroup
            value={selectedUpdateType}
            onValueChange={(value) => setSelectedUpdateType(value as 'this' | 'future' | 'all')}
            className="space-y-3"
          >
            {updateOptions.map((option) => {
              const Icon = option.icon;
              return (
                <div key={option.value} className="space-y-2">
                  <Label
                    htmlFor={`time-${option.value}`}
                    className={cn(
                      "flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                      selectedUpdateType === option.value
                        ? `${option.bgColor} ${option.borderColor}`
                        : "bg-muted border-border hover:bg-accent"
                    )}
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={`time-${option.value}`}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={cn("h-4 w-4", option.color)} />
                        <span className="font-medium text-sm">
                          {option.title}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">
                        {option.description}
                      </p>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        {option.detail}
                      </p>
                    </div>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isUpdating}
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isUpdating}
            className="min-w-[80px] bg-blue-600 hover:bg-blue-700"
          >
            {isUpdating ? '변경 중...' : '변경'}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default RecurringTimeChangeDialog;
