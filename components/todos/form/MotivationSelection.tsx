'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MotivationMessage } from '@/types/motivation';
import { useMotivationStore } from '@/state/stores/motivationStore';
import MotivationSheet from '@/components/motivation/MotivationSheet';
import { Heart, Plus, X, ChevronDown } from 'lucide-react';
import { getUnifiedIcon, UnifiedIconKey } from '@/lib/icon-collection';

interface MotivationSelectionProps {
  todoId?: string;
  todoContent?: string;
  selectedMotivations?: MotivationMessage[];
  onMotivationsChange?: (motivations: MotivationMessage[]) => void;
  selectedColor: string;
  className?: string;
}

const MotivationSelection: React.FC<MotivationSelectionProps> = ({
  todoId,
  todoContent,
  selectedMotivations = [],
  onMotivationsChange,
  selectedColor,
  className
}) => {
  const [motivationSheetOpen, setMotivationSheetOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    linkMotivationToTodo,
    unlinkMotivationFromTodo,
    getMotivationsForTodo,
    getAllMessages,
    initializeStore
  } = useMotivationStore();

  // 스토어 초기화
  React.useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  // 동기부여 메시지 추가
  const handleAddMotivation = (messageId: string) => {
    if (todoId) {
      // 할일이 있는 경우 직접 연결
      linkMotivationToTodo(todoId, messageId);
    } else {
      // 새로운 할일인 경우 로컬 상태만 업데이트
      const allMessages = getAllMessages();
      const newMessage = allMessages.find(msg => msg.id === messageId);

      if (newMessage && !selectedMotivations.find(m => m.id === messageId)) {
        const updatedMotivations = [...selectedMotivations, newMessage];
        onMotivationsChange?.(updatedMotivations);
      }
    }

    // 메시지가 추가되면 자동으로 확장
    setIsExpanded(true);
    setMotivationSheetOpen(false);
  };

  // 동기부여 메시지 제거
  const handleRemoveMotivation = (messageId: string) => {
    if (todoId) {
      // 할일이 있는 경우 직접 연결 해제
      unlinkMotivationFromTodo(todoId, messageId);
    } else {
      // 새로운 할일인 경우 로컬 상태만 업데이트
      const updatedMotivations = selectedMotivations.filter(m => m.id !== messageId);
      onMotivationsChange?.(updatedMotivations);

      // 모든 메시지가 삭제되면 축소
      if (updatedMotivations.length === 0) {
        setIsExpanded(false);
      }
    }
  };

  // 현재 연결된 동기부여 메시지들 가져오기
  const currentMotivations = todoId ? getMotivationsForTodo(todoId) : selectedMotivations;

  return (
    <>
      <div className={cn('mx-4 my-2', className)}>
        {/* 퀵메모 스타일의 섹션 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200"
          >
            <Heart className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              동기부여 메시지
            </span>
            {currentMotivations.length > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full min-w-[24px] text-center">
                {currentMotivations.length}
              </span>
            )}
            <ChevronDown
              className={cn(
                'h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-200',
                isExpanded && 'rotate-180'
              )}
            />
          </button>

          {/* 메시지 추가 버튼 */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMotivationSheetOpen(true)}
            className="border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <Plus className="h-3 w-3 mr-1" />
            메시지 추가
          </Button>
        </div>

        {/* 확장 가능한 메시지 목록 */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-200 ease-out',
            isExpanded ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'
          )}
        >
          {currentMotivations.length > 0 ? (
            <div className="space-y-2">
              {currentMotivations.map((motivation, index) => {
                const iconData = getUnifiedIcon(motivation.icon as UnifiedIconKey);
                const IconComponent = iconData.component;

                return (
                  <div
                    key={motivation.id}
                    className="group py-3 px-1 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 rounded-md transition-all duration-200"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-1 h-4 rounded-full flex-shrink-0 mt-1 group-hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: motivation.color }}
                      />
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* 메시지 헤더 */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <IconComponent size={16} style={{ color: motivation.color }} />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              {motivation.content.split('\n')[0]}
                            </span>
                          </div>

                          {/* 삭제 버튼 */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMotivation(motivation.id)}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* 메시지 내용 미리보기 */}
                        {motivation.content.includes('\n') && (
                          <div className="w-full p-3 text-sm bg-gray-50 dark:bg-gray-800/20 border border-gray-200 dark:border-gray-700 rounded-md">
                            <div className="max-h-20 overflow-hidden text-muted-foreground">
                              {motivation.content.split('\n').slice(1).join('\n').slice(0, 100)}
                              {motivation.content.split('\n').slice(1).join('\n').length > 100 && '...'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <Heart className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm mb-2">아직 연결된 동기부여 메시지가 없어요</p>
              <p className="text-xs text-muted-foreground">
                &ldquo;메시지 추가&rdquo; 버튼으로 할일을 더욱 의미있게 만들어보세요
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 동기부여 메시지 선택 모달 */}
      <MotivationSheet
        open={motivationSheetOpen}
        onOpenChange={setMotivationSheetOpen}
        todoId={todoId}
        todoContent={todoContent}
        onSelectMessage={handleAddMotivation}
      />
    </>
  );
};

export default MotivationSelection;