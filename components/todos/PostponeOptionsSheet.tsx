'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  Clock,
  Cloud,
  Play,
  X,
  Check,
  HelpCircle
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
  // 기록만 남기기는 체크박스 비활성화 (항상 true)
  recordDisabled?: boolean;
}

const OPTIONS: OptionConfig[] = [
  {
    action: 'record_only',
    icon: FileText,
    title: '기록만 남기기',
    description: '일단 미뤘다는 기록만 남겨둘게요. 시간은 그대로요.',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    recordDisabled: true, // 항상 true, 체크박스 비활성화
  },
  {
    action: 'reschedule',
    icon: Clock,
    title: '특정 시간으로',
    description: '지금은 안 되지만, 오늘 다른 시간에 할게요.',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    action: 'anytime',
    icon: Cloud,
    title: '나중에 (시간 미정)',
    description: '지금 당장은 못해요. 나중에 시간 날 때 할게요.',
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
  const [selectedAction, setSelectedAction] = useState<PostponeAction>('record_only');
  const [recordPostponement, setRecordPostponement] = useState(true);
  const [newTime, setNewTime] = useState('14:00'); // 기본값: 오후 2시

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // 모달 열릴 때 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setSelectedAction('record_only');
      setRecordPostponement(true);
      // 현재 시간 + 1시간을 기본값으로
      const now = new Date();
      now.setHours(now.getHours() + 1);
      now.setMinutes(0);
      const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setNewTime(defaultTime);
    }
  }, [isOpen]);

  // 선택된 액션에 따라 recordPostponement 강제 설정
  useEffect(() => {
    if (selectedAction === 'record_only') {
      setRecordPostponement(true); // 기록만 남기기는 항상 true
    }
  }, [selectedAction]);

  const handleConfirm = () => {
    const options: PostponeOptions = {
      action: selectedAction,
      recordPostponement: selectedAction === 'record_only' ? true : recordPostponement,
      ...(selectedAction === 'reschedule' && { newTime }),
    };
    onPostpone(options);
  };

  const selectedOption = OPTIONS.find(opt => opt.action === selectedAction);

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

        {/* 미룸 기록 체크박스 + 확인 버튼 */}
        <div className="p-4 border-t border-base-300 space-y-3">
          {/* 미룸 기록 체크박스 */}
          <label
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer",
              selectedOption?.recordDisabled
                ? "bg-base-200 opacity-60 cursor-not-allowed"
                : "bg-base-100 hover:bg-base-200"
            )}
          >
            <input
              type="checkbox"
              checked={recordPostponement}
              onChange={(e) => setRecordPostponement(e.target.checked)}
              disabled={selectedOption?.recordDisabled || isProcessing}
              className="checkbox checkbox-sm checkbox-primary"
            />
            <div className="flex-1">
              <p className="font-medium text-sm">미룸 기록 남기기</p>
              <p className="text-xs text-base-content/60">
                원래 {todo.start_time
                  ? (typeof todo.start_time === 'string'
                      ? todo.start_time.slice(11, 16) || todo.start_time.slice(0, 5)
                      : todo.start_time.toTimeString().slice(0, 5))
                  : '예정된 시간'}에 예정된 할일을 미뤘다는 히스토리를 저장합니다.
              </p>
            </div>
          </label>

          {/* 확인 버튼 */}
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
