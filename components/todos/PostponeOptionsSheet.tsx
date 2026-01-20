'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Clock,
  Cloud,
  Play,
  X,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { unifiedIconsCollection } from '@/lib/icon-collection';
import type { PostponeOptions, PostponeAction } from '@/types';

// 아이콘 이름을 Lucide 컴포넌트로 변환
const getTodoIcon = (iconName?: string | null): React.ComponentType<any> | null => {
  if (!iconName) return null;

  // 첫 글자 대문자 변환 (moon → Moon)
  const capitalizedName = iconName.charAt(0).toUpperCase() + iconName.slice(1);
  const iconKey = `lucide-${capitalizedName}`;

  const iconData = unifiedIconsCollection[iconKey];
  return iconData?.component || null;
};

// PostponeOptionsSheet에서 필요한 Todo 필드만 정의
interface TodoForPostpone {
  id: string;
  title: string;
  icon?: string | null;
  start_time?: Date | string | null;
  recurrence_pattern?: string | null;
}

interface PostponeOptionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  todo: TodoForPostpone;
  occurrenceDate: string; // YYYY-MM-DD
  onPostpone: (options: PostponeOptions) => void;
  isProcessing?: boolean;
}

interface OptionConfig {
  action: PostponeAction;
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const OPTIONS: OptionConfig[] = [
  {
    action: 'reschedule',
    icon: Clock,
    title: '시간 지정하여 미룸',
    description: '오늘 다른 시간으로 미룰래요.',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    action: 'anytime',
    icon: Cloud,
    title: '시간지정 없이 미룸',
    description: '몇시에 할지 아직 모르겠어요.',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  {
    action: 'start_now',
    icon: Play,
    title: '지금 바로 하기',
    description: '미뤘지만, 지금이라도 바로 시작할래요!',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
];

const PostponeOptionsSheet: React.FC<PostponeOptionsSheetProps> = ({
  isOpen,
  onClose,
  todo,
  occurrenceDate,
  onPostpone,
  isProcessing = false,
}) => {
  const [mounted, setMounted] = useState(false);
  const [selectedAction, setSelectedAction] = useState<PostponeAction>('reschedule');
  const [newTime, setNewTime] = useState('14:00'); // 기본값: 오후 2시

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // 모달 열릴 때 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setSelectedAction('reschedule');
      // 현재 시간 + 1시간을 기본값으로
      const now = new Date();
      now.setHours(now.getHours() + 1);
      now.setMinutes(0);
      const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setNewTime(defaultTime);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    const options: PostponeOptions = {
      action: selectedAction,
      recordPostponement: true, // 항상 미룸 기록 남기기
      ...(selectedAction === 'reschedule' && { newTime }),
    };
    onPostpone(options);
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50"
      style={{ zIndex: 999999 }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-full max-w-md mx-4 max-h-[85vh] overflow-hidden flex flex-col"
        style={{ zIndex: 1000000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <div className="flex items-center gap-3">
            {(() => {
              const TodoIcon = getTodoIcon(todo.icon);
              if (TodoIcon) {
                return (
                  <div className="w-10 h-10 rounded-lg bg-base-200 flex items-center justify-center">
                    <TodoIcon className="w-5 h-5 text-base-content/70" />
                  </div>
                );
              }
              return null;
            })()}
            <div>
              <h2 className="text-lg font-bold line-clamp-1">{todo.title}</h2>
              <p className="text-sm text-base-content/60">
                이 할일을 어떻게 처리할까요?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-circle btn-ghost btn-sm"
            disabled={isProcessing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 옵션 목록 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedAction === option.action;

            return (
              <button
                key={option.action}
                type="button"
                onClick={() => setSelectedAction(option.action)}
                disabled={isProcessing}
                className={cn(
                  "w-full flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left",
                  isSelected
                    ? `${option.bgColor} ${option.borderColor}`
                    : "bg-base-100 border-base-300 hover:bg-base-200"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                  isSelected ? option.bgColor : "bg-base-200"
                )}>
                  <Icon className={cn("w-5 h-5", isSelected ? option.color : "text-base-content/60")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-semibold",
                    isSelected ? option.color : "text-base-content"
                  )}>
                    {option.title}
                  </p>
                  <p className="text-sm text-base-content/60 mt-0.5">
                    {option.description}
                  </p>
                </div>
                {isSelected && (
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                    option.bgColor
                  )}>
                    <Check className={cn("w-4 h-4", option.color)} />
                  </div>
                )}
              </button>
            );
          })}

          {/* 시간 선택 (특정 시간으로 선택 시) */}
          {selectedAction === 'reschedule' && (
            <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <label className="block text-sm font-medium text-blue-700 mb-2">
                변경할 시간 선택
              </label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="input input-bordered w-full"
                disabled={isProcessing}
              />
            </div>
          )}
        </div>

        {/* 확인 버튼 */}
        <div className="p-4 border-t border-base-300">
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing}
            className="w-full rounded-full bg-primary hover:bg-primary/90"
          >
            {isProcessing ? '처리 중...' : '확인'}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default PostponeOptionsSheet;
