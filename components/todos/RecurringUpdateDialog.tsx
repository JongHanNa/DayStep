'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogPortal,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogPortal>
        <DialogContent className="sm:max-w-md recurring-update-dialog" style={{ zIndex: '999999 !important' as any }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            반복 할일 시간 변경
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-left space-y-2">
              <div className="font-medium text-gray-900 dark:text-gray-100">
                &ldquo;{todoTitle}&rdquo;
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(occurrenceDate, 'M월 d일 (E)', { locale: ko })}
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* 시간 변경 미리보기 */}
        <div className="space-y-3 py-4">
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">시간 변경</span>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground w-12">이전:</span>
                <span className="font-mono">{formatTimeRange(originalTime.start, originalTime.end)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground w-12">변경:</span>
                <span className="font-mono font-medium text-blue-600">{formatTimeRange(newTime.start, newTime.end)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            어떻게 업데이트하시겠습니까?
          </p>
          
          {/* 업데이트 옵션들 */}
          <div className="space-y-2">
            {/* 이 일정만 업데이트 */}
            <Button
              variant="outline"
              className="w-full justify-start h-auto p-3"
              onClick={() => handleChoice('this-only')}
              disabled={isProcessing}
            >
              <div className="text-left w-full">
                <div className="font-medium text-sm">이 일정만 업데이트</div>
                <div className="text-xs text-muted-foreground">
                  {format(occurrenceDate, 'M월 d일', { locale: ko })} 일정만 시간 변경
                </div>
              </div>
            </Button>

            {/* 이후 모든 일정 업데이트 */}
            <Button
              variant="outline"
              className="w-full justify-start h-auto p-3"
              onClick={() => handleChoice('from-now')}
              disabled={isProcessing}
            >
              <div className="text-left w-full">
                <div className="font-medium text-sm">이후 모든 일정 업데이트</div>
                <div className="text-xs text-muted-foreground">
                  {format(occurrenceDate, 'M월 d일', { locale: ko })} 이후의 모든 반복 일정 시간 변경
                </div>
              </div>
            </Button>

            {/* 모든 일정 업데이트 */}
            <Button
              variant="outline"
              className="w-full justify-start h-auto p-3"
              onClick={() => handleChoice('all')}
              disabled={isProcessing}
            >
              <div className="text-left w-full">
                <div className="font-medium text-sm">모든 일정 업데이트</div>
                <div className="text-xs text-muted-foreground">
                  과거부터 미래까지 모든 반복 일정 시간 변경
                </div>
              </div>
            </Button>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            <X className="h-4 w-4 mr-2" />
            취소
          </Button>
        </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}