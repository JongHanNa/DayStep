'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Cloud,
  Clock,
  Play,
  Trash2,
  X,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { AnytimeInboxItem } from '@/types';
import {
  queryAnytimeTodosWithJWT,
  restoreFromAnytimeWithJWT,
  removeAnytimeOverrideWithJWT,
} from '@/lib/supabase/todo-postpone';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';

interface AnytimeInboxSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  onRefresh?: () => void;
}

type ItemAction = 'start_now' | 'reschedule' | 'delete';

const AnytimeInboxSheet: React.FC<AnytimeInboxSheetProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onRefresh,
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<AnytimeInboxItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AnytimeInboxItem | null>(null);
  const [showTimeInput, setShowTimeInput] = useState(false);
  const [newTime, setNewTime] = useState('14:00');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // 시간 미정 할일 조회
  useEffect(() => {
    if (isOpen && user?.id) {
      loadAnytimeItems();
    }
  }, [isOpen, user?.id, selectedDate]);

  const loadAnytimeItems = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const result = await queryAnytimeTodosWithJWT(user.id, selectedDate);
      setItems(result);
    } catch (error) {
      console.error('시간 미정 할일 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemAction = async (item: AnytimeInboxItem, action: ItemAction) => {
    if (!user?.id) return;

    setIsProcessing(true);
    try {
      switch (action) {
        case 'start_now':
          // 타이머 페이지로 이동 (반복 할일 정보 전달)
          // URL 파라미터로 전달
          const timerParams = new URLSearchParams({
            todoId: item.parentTodoId,
            occurrenceDate: item.occurrenceDate,
            title: item.title,
          });
          router.push(`/pomodoro?${timerParams.toString()}`);
          onClose();
          break;

        case 'reschedule':
          // 시간 지정 모드 활성화
          setSelectedItem(item);
          setShowTimeInput(true);
          // 원래 시간을 기본값으로
          if (item.originalStartTime) {
            setNewTime(item.originalStartTime);
          }
          break;

        case 'delete':
          // anytime override 삭제 (원래 시간으로 복원)
          await removeAnytimeOverrideWithJWT({
            parentTodoId: item.parentTodoId,
            occurrenceDate: item.occurrenceDate,
            userId: user.id,
          });
          await loadAnytimeItems();
          onRefresh?.();
          break;
      }
    } catch (error) {
      console.error('액션 처리 실패:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!user?.id || !selectedItem) return;

    setIsProcessing(true);
    try {
      await restoreFromAnytimeWithJWT({
        parentTodoId: selectedItem.parentTodoId,
        occurrenceDate: selectedItem.occurrenceDate,
        userId: user.id,
        newTime,
      });

      setShowTimeInput(false);
      setSelectedItem(null);
      await loadAnytimeItems();
      onRefresh?.();
    } catch (error) {
      console.error('시간 변경 실패:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPostponedTime = (isoString: string) => {
    try {
      return formatDistanceToNow(new Date(isoString), {
        addSuffix: true,
        locale: ko,
      });
    } catch {
      return '';
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center bg-black/50"
      style={{ zIndex: 999999 }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-lg w-full sm:max-w-md sm:mx-4 max-h-[80vh] overflow-hidden flex flex-col"
        style={{ zIndex: 1000000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Cloud className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold">시간 미정 할일</h2>
              <p className="text-sm text-base-content/60">
                {items.length > 0 ? `${items.length}개의 할일` : '할일이 없습니다'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-circle btn-ghost btn-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-base-content/60">
              <Cloud className="w-12 h-12 mb-3 opacity-30" />
              <p>시간 미정 할일이 없습니다</p>
            </div>
          ) : (
            <div className="divide-y divide-base-200">
              {items.map((item) => (
                <div
                  key={`${item.parentTodoId}-${item.occurrenceDate}`}
                  className="p-4 hover:bg-base-100 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* 아이콘 */}
                    <div className="w-10 h-10 rounded-lg bg-base-200 flex items-center justify-center flex-shrink-0">
                      {item.icon ? (
                        <span className="text-xl">{item.icon}</span>
                      ) : (
                        <Cloud className="w-5 h-5 text-base-content/40" />
                      )}
                    </div>

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold line-clamp-1">{item.title}</p>
                      <div className="flex items-center gap-2 text-sm text-base-content/60 mt-1">
                        {item.originalStartTime && (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            <span>원래 {item.originalStartTime}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{formatPostponedTime(item.postponedAt)}</span>
                      </div>
                    </div>

                    {/* 액션 버튼들 */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* 지금 하기 */}
                      <button
                        type="button"
                        onClick={() => handleItemAction(item, 'start_now')}
                        disabled={isProcessing}
                        className="btn btn-circle btn-ghost btn-sm text-green-600 hover:bg-green-50"
                        title="지금 바로 하기"
                      >
                        <Play className="w-4 h-4" />
                      </button>

                      {/* 시간 지정 */}
                      <button
                        type="button"
                        onClick={() => handleItemAction(item, 'reschedule')}
                        disabled={isProcessing}
                        className="btn btn-circle btn-ghost btn-sm text-blue-600 hover:bg-blue-50"
                        title="시간 지정"
                      >
                        <Clock className="w-4 h-4" />
                      </button>

                      {/* 삭제 (원래대로) */}
                      <button
                        type="button"
                        onClick={() => handleItemAction(item, 'delete')}
                        disabled={isProcessing}
                        className="btn btn-circle btn-ghost btn-sm text-red-600 hover:bg-red-50"
                        title="원래 시간으로 복원"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 시간 선택 입력 (reschedule 모드) */}
        {showTimeInput && selectedItem && (
          <div className="p-4 border-t border-base-300 bg-blue-50">
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium text-blue-700">
                "{selectedItem.title}" 시간 변경
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowTimeInput(false);
                  setSelectedItem(null);
                }}
                className="btn btn-circle btn-ghost btn-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="input input-bordered flex-1"
                disabled={isProcessing}
              />
              <Button
                type="button"
                onClick={handleConfirmReschedule}
                disabled={isProcessing}
                className="rounded-full"
              >
                {isProcessing ? '변경 중...' : '확인'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default AnytimeInboxSheet;
