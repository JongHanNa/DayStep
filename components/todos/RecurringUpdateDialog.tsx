'use client';

import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar, Clock, RefreshCw, X } from 'lucide-react';

interface RecurringUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todoTitle: string;
  originalTime: { start: Date; end?: Date };
  newTime: { start: Date; end?: Date };
  occurrenceDate: Date;
  onUpdateChoice: (choice: 'this-only' | 'from-now' | 'all') => Promise<void>;
}

export default function RecurringUpdateDialog({
  open,
  onOpenChange,
  todoTitle,
  originalTime,
  newTime,
  occurrenceDate,
  onUpdateChoice
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
      await onUpdateChoice(choice);
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

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box max-w-md">
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-lg">반복 할일 시간 변경</h3>
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

        {/* 시간 변경 미리보기 */}
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
                {format(occurrenceDate, 'M월 d일', { locale: ko })} 일정만 시간 변경
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
                {format(occurrenceDate, 'M월 d일', { locale: ko })} 이후의 모든 반복 일정 시간 변경
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
                과거부터 미래까지 모든 반복 일정 시간 변경
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