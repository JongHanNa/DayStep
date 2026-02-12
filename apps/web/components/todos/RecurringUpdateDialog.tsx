'use client';

import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar, Clock, RefreshCw, X, Type } from 'lucide-react';

interface RecurringUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todoTitle: string;
  occurrenceDate: Date;
  onUpdateChoice: (choice: 'this-only' | 'from-now' | 'all', occurrenceDate: Date) => Promise<void>;
  // 변경 유형 및 정보
  changeType: 'time' | 'title' | 'mixed';
  // 시간 변경 정보 (선택적 - 제목만 변경 시 없을 수 있음)
  originalTime?: { start: Date; end?: Date } | null;
  newTime?: { start: Date; end?: Date } | null;
  // 제목 변경 정보 (선택적 - 시간만 변경 시 없을 수 있음)
  originalTitle?: string | null;
  newTitle?: string | null;
}

export default function RecurringUpdateDialog({
  open,
  onOpenChange,
  todoTitle,
  occurrenceDate,
  onUpdateChoice,
  changeType,
  originalTime,
  newTime,
  originalTitle,
  newTitle
}: RecurringUpdateDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // open prop 변경 시 모달 열기/닫기
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleChoice = async (choice: 'this-only' | 'from-now' | 'all') => {
    try {
      setIsProcessing(true);
      console.log('🔍 [RecurringUpdateDialog] handleChoice 호출:', {
        choice,
        occurrenceDate,
        changeType,
        occurrenceDateString: occurrenceDate?.toISOString()
      });
      await onUpdateChoice(choice, occurrenceDate);
      onOpenChange(false);
    } catch (error) {
      console.error('반복 할일 업데이트 실패:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    if (!isProcessing) {
      onOpenChange(false);
    }
  };

  // 시간 포맷팅 유틸리티
  const formatTime = (date: Date) => format(date, 'a h:mm', { locale: ko });
  const formatTimeRange = (start: Date, end?: Date) => {
    if (end) {
      return `${formatTime(start)} - ${formatTime(end)}`;
    }
    return formatTime(start);
  };

  // 변경 유형에 따른 모달 제목
  const getDialogTitle = () => {
    switch (changeType) {
      case 'title':
        return '반복 할일 제목 변경';
      case 'time':
        return '반복 할일 시간 변경';
      case 'mixed':
        return '반복 할일 수정';
      default:
        return '반복 할일 수정';
    }
  };

  // 변경 유형에 따른 버튼 설명 텍스트
  const getChangeDescription = () => {
    switch (changeType) {
      case 'title':
        return '제목';
      case 'time':
        return '시간';
      case 'mixed':
        return '제목과 시간';
      default:
        return '변경 사항';
    }
  };

  const modalPositionClass = 'modal-bottom sm:modal-middle';

  // 시간 변경이 있는지 확인
  const hasTimeChange = changeType === 'time' || changeType === 'mixed';
  // 제목 변경이 있는지 확인
  const hasTitleChange = changeType === 'title' || changeType === 'mixed';

  return (
    <dialog ref={dialogRef} className={`modal ${modalPositionClass}`}>
      <div className="modal-box max-w-md">
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-lg">{getDialogTitle()}</h3>
        </div>

        {/* 할일 제목과 날짜 */}
        <div className="space-y-2 mb-4">
          <div className="font-medium text-base-content">
            &ldquo;{todoTitle}&rdquo;
          </div>
          <div className="flex items-center gap-2 text-sm opacity-70">
            <Calendar className="h-4 w-4" />
            {format(occurrenceDate, 'M월 d일 (E)', { locale: ko })}
          </div>
        </div>

        {/* 제목 변경 미리보기 */}
        {hasTitleChange && originalTitle && newTitle && (
          <div className="bg-base-200 rounded-lg p-3 mb-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Type className="h-4 w-4 opacity-70" />
              <span className="font-medium">제목 변경</span>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-start gap-3">
                <span className="opacity-70 w-12 shrink-0">이전:</span>
                <span className="break-words">{originalTitle}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="opacity-70 w-12 shrink-0">변경:</span>
                <span className="font-medium text-primary break-words">{newTitle}</span>
              </div>
            </div>
          </div>
        )}

        {/* 시간 변경 미리보기 */}
        {hasTimeChange && originalTime && newTime && (
          <div className="bg-base-200 rounded-lg p-3 mb-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 opacity-70" />
              <span className="font-medium">시간 변경</span>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center gap-3">
                <span className="opacity-70 w-12">이전:</span>
                <span className="font-mono">{formatTimeRange(originalTime.start, originalTime.end)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="opacity-70 w-12">변경:</span>
                <span className="font-mono font-medium text-primary">{formatTimeRange(newTime.start, newTime.end)}</span>
              </div>
            </div>
          </div>
        )}

        {/* 업데이트 옵션 */}
        <div className="space-y-2 mb-4">
          <p className="text-sm font-medium">
            어떻게 업데이트하시겠습니까?
          </p>

          <div className="space-y-2">
            {/* 이 일정만 업데이트 */}
            <button
              className={`bg-base-200 hover:bg-base-300 rounded-lg w-full text-left px-4 py-3 transition-colors ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => handleChoice('this-only')}
              disabled={isProcessing}
            >
              <div className="font-medium text-sm">이 일정만 업데이트</div>
              <div className="text-xs opacity-70">
                {format(occurrenceDate, 'M월 d일', { locale: ko })} 일정만 {getChangeDescription()} 변경
              </div>
            </button>

            {/* 이후 모든 일정 업데이트 */}
            <button
              className={`bg-base-200 hover:bg-base-300 rounded-lg w-full text-left px-4 py-3 transition-colors ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => handleChoice('from-now')}
              disabled={isProcessing}
            >
              <div className="font-medium text-sm">이후 모든 일정 업데이트</div>
              <div className="text-xs opacity-70">
                {format(occurrenceDate, 'M월 d일', { locale: ko })} 이후의 모든 반복 일정 {getChangeDescription()} 변경
              </div>
            </button>

            {/* 모든 일정 업데이트 */}
            <button
              className={`bg-base-200 hover:bg-base-300 rounded-lg w-full text-left px-4 py-3 transition-colors ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => handleChoice('all')}
              disabled={isProcessing}
            >
              <div className="font-medium text-sm">모든 일정 업데이트</div>
              <div className="text-xs opacity-70">
                과거부터 미래까지 모든 반복 일정 {getChangeDescription()} 변경
              </div>
            </button>
          </div>
        </div>

        {/* 취소 버튼 */}
        <div className="modal-action mt-4">
          <button
            className={`btn btn-primary ${isProcessing ? 'btn-disabled' : ''}`}
            onClick={handleCancel}
            disabled={isProcessing}
          >
            <X className="h-4 w-4" />
            취소
          </button>
        </div>
      </div>

      {/* 배경 클릭으로 닫기 */}
      <form method="dialog" className="modal-backdrop" onSubmit={handleCancel}>
        <button type="button" onClick={handleCancel}>close</button>
      </form>
    </dialog>
  );
}
