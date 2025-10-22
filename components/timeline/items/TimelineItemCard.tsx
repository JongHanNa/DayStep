'use client';

import React, { memo, useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Repeat, Check, StickyNote, ChevronDown, Tag } from 'lucide-react';
import { getUnifiedIcon, UnifiedIconKey } from '@/lib/icon-collection';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTodoStore } from '@/state/stores/todoStore';
import { useSettingsStore } from '@/state/stores/settingsStore';
import { useNoteStore } from '@/state/stores/noteStore';
import { useMemoTagStore } from '@/state/stores/memoTagStore';
import ConfettiExplosion from 'react-confetti-explosion';
import { PomodoroTimer } from '@/components/ui/PomodoroTimer';
import { getColorById, getColorByHex, DEFAULT_COLOR } from '@/lib/color-palette';
import MarkdownViewer from '@/components/memos/MarkdownViewer';
import { isRecurringTodo } from '@/lib/utils/recurring';
import { useMotivationStore } from '@/state/stores/motivationStore';
import MotivationBadge from '@/components/motivation/MotivationBadge';

interface TimelineItemCardProps {
  item: {
    id: string;
    type: string;
    title: string;
    isCompleted?: boolean;
    startTime?: string | Date;
    endTime?: string | Date;
    data?: any; // 반복 할일 데이터 포함
  };
  isDraggable?: boolean;
  isDragging?: boolean;
  draggedItemId?: string | null;
  cardOffsetY?: number; // 터치 위치와 카드 중앙의 차이
  realTimeNow?: Date;
  currentTimeMarkerPosition?: {
    timeInMinutes: number;
    hour: number;
    minute: number;
  } | null;
  showCheckbox?: boolean; // 완료 체크박스 표시 여부
  onTodoClick: (itemId: string) => void;
  onToggleComplete: (itemId: string) => void;
  onDragHandlers?: {
    onTouchStart: (e: React.TouchEvent | React.MouseEvent, itemId: string) => void;
    onTouchMove: (e: React.TouchEvent | React.MouseEvent) => void;
    onTouchEnd: () => void;
  };
}

const TimelineItemCard: React.FC<TimelineItemCardProps> = memo(({
  item,
  isDraggable = false,
  isDragging = false,
  draggedItemId = null,
  cardOffsetY = 0,
  realTimeNow,
  currentTimeMarkerPosition,
  showCheckbox = true, // 기본값: 체크박스 표시
  onTodoClick,
  onToggleComplete,
  onDragHandlers
}) => {
  // 완료 동작 설정 가져오기
  const todoCompletion = useSettingsStore(state => state.todoCompletion);
  
  // 연결된 노트 확인
  const { notes, setSelectedNoteForEdit, getDisplayNotesForTask } = useNoteStore();

  // 태그 정보 확인
  const { getTagsForMemo } = useMemoTagStore();

  // 동기부여 메시지 확인
  const { getMotivationForTodo, getMotivationsForTodo } = useMotivationStore();
  
  // 타임라인 ID에서 실제 UUID 추출 (todo- 접두사 제거, recurrence 부분 처리)
  const extractTaskId = (timelineId: string) => {
    // "todo-" 접두사 제거
    let taskId = timelineId.replace(/^todo-/, '');
    
    // 반복 할일인 경우 "-recurrence-날짜-인덱스" 부분 제거하여 원본 ID 추출
    if (taskId.includes('-recurrence-')) {
      taskId = taskId.split('-recurrence-')[0];
    }
    
    return taskId;
  };
  
  const actualTaskId = extractTaskId(item.id);

  // 노트 상태 관리
  const [displayMemos, setDisplayMemos] = useState<Array<any>>([]);
  const [hasLinkedMemos, setHasLinkedMemos] = useState(false);
  const [memoTags, setMemoTags] = useState<Array<any>>([]);

  // 연결된 동기부여 메시지들 확인
  const linkedMotivationMessages = item.type === 'todo' ? getMotivationsForTodo(actualTaskId) : [];

  // 노트 로딩 함수
  const loadDisplayMemos = async () => {
    try {
      let memosToDisplay: Array<any> = [];

      // 반복 할일 인스턴스인 경우 날짜 정보 포함해서 노트 가져오기
      if (isRecurringTodo(item)) {
        const instanceDate = extractDateFromRecurringId(item.id);
        console.log('🔄 반복 할일 노트 로딩:', { actualTaskId, instanceDate });

        if (instanceDate) {
          memosToDisplay = await getDisplayNotesForTask(actualTaskId, instanceDate);
        } else {
          // 날짜 추출 실패 시 기본 메모만 표시
          memosToDisplay = notes.filter(memo =>
            memo.related_task_id === actualTaskId ||
            memo.linked_timeline_task_id === actualTaskId
          );
        }
      } else {
        // 일반 할일인 경우 기본 필터링
        memosToDisplay = notes.filter(memo =>
          memo.related_task_id === actualTaskId ||
          memo.linked_timeline_task_id === actualTaskId
        );
      }

      setDisplayMemos(memosToDisplay);
      setHasLinkedMemos(memosToDisplay.length > 0);

      // 메모들의 태그도 수집
      const allTags = new Map();
      memosToDisplay.forEach(memo => {
        const memoId = memo._isInstance ? memo.original_memo_id : memo.id;
        const tags = getTagsForMemo(memoId);
        tags.forEach(tag => {
          allTags.set(tag.id, tag);
        });
      });

      setMemoTags(Array.from(allTags.values()));
    } catch (error) {
      console.error('메모 로딩 실패:', error);
      // 에러 시 기본 필터링으로 폴백
      const fallbackMemos = notes.filter(memo =>
        memo.related_task_id === actualTaskId ||
        memo.linked_timeline_task_id === actualTaskId
      );
      setDisplayMemos(fallbackMemos);
      setHasLinkedMemos(fallbackMemos.length > 0);
      setMemoTags([]); // 에러 시 태그도 초기화
    }
  };

  // 노트 다시 로딩이 필요한 경우들
  useEffect(() => {
    loadDisplayMemos();
  }, [actualTaskId, item.id, notes]);
  

  // 반복 할일인지 확인
  const isRecurring = (() => {
    if (item.type !== 'todo') return false;
    
    // 반복 인스턴스인지 확인 (ID에 -recurrence- 포함)
    if (item.id.includes('-recurrence-')) return true;
    
    // 데이터에서 반복 패턴 확인
    if (item.data?.recurrence_pattern && item.data.recurrence_pattern !== 'none') return true;
    
    return false;
  })();

  // 완료 상태가 변경될 때마다 리렌더링을 위한 스토어 상태 구독
  const { todoCompletions, todos } = useTodoStore();
  
  // 스토어에서 최신 할일 데이터 가져오기 (색상 정보 동기화)
  const latestTodoData = useMemo(() => {
    if (item.type !== 'todo' || !item.id) return item.data;
    
    // item.id에서 todo- 프리픽스를 제거하여 실제 ID 추출
    const actualTodoId = item.id.startsWith('todo-') ? item.id.replace('todo-', '') : item.id;
    const todoFromStore = todos.find(todo => todo.id === actualTodoId);
    
    if (todoFromStore) {
      // 스토어의 최신 데이터와 기존 데이터를 병합
      return {
        ...item.data,
        color: todoFromStore.color,
        icon: todoFromStore.icon,
        title: todoFromStore.title,
        priority: todoFromStore.priority,
        completed: todoFromStore.completed // 완료 상태도 병합
      };
    }
    return item.data;
  }, [item.type, item.id, item.data, todos]);

  // 할일 색상 계산 (최신 데이터 사용)
  const todoColor = useMemo(() => {
    if (item.type !== 'todo') return null;
    const colorValue = latestTodoData?.color;
    if (!colorValue) return DEFAULT_COLOR;
    
    // hex 값인지 colorId인지 판단하여 처리
    if (colorValue.startsWith('#')) {
      // hex 값인 경우
      return getColorByHex(colorValue);
    } else {
      // colorId인 경우  
      return getColorById(colorValue);
    }
  }, [item.type, latestTodoData?.color]);

  // 실제 완료 상태 계산 - ModernDayView와 동일한 로직 + 캐퍼시터 환경 최적화
  const isCompleted = useMemo(() => {
    if (item.type !== 'todo') return false;
    
    const todoData = latestTodoData;
    if (!todoData) return item.isCompleted || false;
    
    // 반복 할일인지 확인
    const isRecurring = (todoData as any).is_recurrence_instance || 
                       (todoData.recurrence_pattern && todoData.recurrence_pattern !== 'none');
    
    let result = false;
    
    if (isRecurring) {
      // 반복 할일: 날짜별 완료 상태 확인
      const originalId = (todoData as any).recurrence_source_id || todoData.id;
      // 반복 할일의 실제 발생 날짜 사용 (recurrence_occurrence_date)
      const occurrenceDate = (todoData as any).recurrence_occurrence_date;
      const { isRecurrenceCompleted } = useTodoStore.getState();
      
      result = isRecurrenceCompleted(originalId, occurrenceDate);
      
    } else {
      // 일반 할일: completed 필드 확인 (스토어 우선)
      const actualTodoId = item.id.startsWith('todo-') ? item.id.replace('todo-', '') : item.id;
      const storeCurrentTodo = todos.find(t => t.id === actualTodoId);
      
      // 스토어에서 찾은 데이터를 우선 사용, 없으면 기존 데이터 사용
      const finalCompletedValue = storeCurrentTodo ? storeCurrentTodo.completed : (todoData.completed || false);
      result = finalCompletedValue;
      
    }
    
    return result;
  }, [item.type, latestTodoData, item.isCompleted, item.title, todoCompletions]);

  // 완료 축하 효과 상태 관리
  const [showCelebration, setShowCelebration] = useState(false);
  const [prevCompleted, setPrevCompleted] = useState(isCompleted);
  
  // 최종 표시 완료 상태 (스토어 상태 사용)
  const finalIsCompleted = isCompleted;

  // 취소선 표시 여부
  const shouldShowStrikethrough = useMemo(() => {
    return finalIsCompleted && todoCompletion.behavior === 'strikethrough-inline';
  }, [finalIsCompleted, todoCompletion.behavior]);
  
  
  // 연결된 노트 아코디언 상태 관리
  const [isMemosExpanded, setIsMemosExpanded] = useState(false);
  
  // 노트 클릭 시 수정 모달 열기
  const handleMemoClick = (memo: any, e: React.MouseEvent) => {
    e.stopPropagation(); // 할일 클릭 이벤트 방지
    setSelectedNoteForEdit(memo);
  };

  // 반복 할일 인스턴스에서 날짜 추출
  const extractDateFromRecurringId = (itemId: string): string | null => {
    if (!itemId.includes('-recurrence-')) return null;
    const parts = itemId.split('-recurrence-');
    if (parts.length < 2) return null;
    const dateAndIndex = parts[1].split('-');
    if (dateAndIndex.length >= 3) {
      return `${dateAndIndex[0]}-${dateAndIndex[1]}-${dateAndIndex[2]}`;
    }
    return null;
  };

  // 노트 내용 변경 핸들러
  const handleMemoContentChange = async (memo: any, newContent: string) => {
    try {
      const { updateNote, upsertMemoInstance } = useNoteStore.getState();

      // 노트 인스턴스인 경우 (displayMemos에서 _isInstance 플래그 확인)
      if (memo._isInstance) {
        console.log('🔄 노트 인스턴스 수정:', memo.original_memo_id);

        // 스마트한 인스턴스 관리를 위해 upsertMemoInstance 사용
        const result = await upsertMemoInstance(
          memo.original_memo_id,
          memo.instance_date,
          newContent,
          memo.related_task_id
        );

        if (result === null) {
          console.log('✨ 인스턴스 정리됨');
        }

        // 노트 목록 다시 로딩
        await loadDisplayMemos();
        return;
      }

      // 반복 메모이고 현재 아이템이 반복 할일 인스턴스인 경우 (원본 메모를 인스턴스로 변환)
      if (memo.is_recurring && memo.recurrence_type === 'recurring' && isRecurringTodo(item)) {
        const instanceDate = extractDateFromRecurringId(item.id);

        if (instanceDate) {
          console.log('🔄 반복 노트 인스턴스:', memo.id);

          // upsertMemoInstance 함수를 사용하여 스마트한 인스턴스 관리 (원본과 동일하면 자동 삭제)
          const result = await upsertMemoInstance(memo.id, instanceDate, newContent, memo.related_task_id);

          if (result === null) {
            console.log('✨ 인스턴스 정리됨');
          }

          // 노트 목록 다시 로딩
          await loadDisplayMemos();
          return;
        }
      }

      // 일반 노트 또는 단일 연결 반복 메모인 경우 원본 수정
      await updateNote({
        id: memo.id,
        content: newContent,
      });

      // 노트 목록 다시 로딩
      await loadDisplayMemos();
    } catch (error) {
      console.error('메모 내용 업데이트 실패:', error);
    }
  };

  // 완료 상태 변경 감지하여 축하 효과 실행 (최종 완료 상태 기준)
  useEffect(() => {
    if (!prevCompleted && finalIsCompleted) {
      // 미완료 → 완료로 변경된 경우에만 축하 효과 실행
      setShowCelebration(true);
      // 2초 후 축하 효과 제거
      const timer = setTimeout(() => {
        setShowCelebration(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
    setPrevCompleted(finalIsCompleted);
    
    // 축하 효과가 필요하지 않을 때는 cleanup 없음
    return;
  }, [finalIsCompleted, prevCompleted]);

  // 현재 시간이 이 할일 진행 중인지 확인 및 포모도로 진행률 계산
  const { isCurrentTimeInItem, pomodoroProgress } = useMemo(() => {
    if (!currentTimeMarkerPosition || !realTimeNow || !item.startTime || item.type !== 'todo') {
      return { isCurrentTimeInItem: false, pomodoroProgress: 0 };
    }
    
    const itemStartTime = new Date(item.startTime);
    const itemEndTime = item.endTime 
      ? new Date(item.endTime) 
      : new Date(itemStartTime.getTime() + 30 * 60 * 1000); // 기본 30분
    
    const itemStartMinutes = itemStartTime.getHours() * 60 + itemStartTime.getMinutes();
    const itemEndMinutes = itemEndTime.getHours() * 60 + itemEndTime.getMinutes();
    const currentMinutes = currentTimeMarkerPosition.timeInMinutes;
    
    const isInTimeRange = currentMinutes >= itemStartMinutes && currentMinutes <= itemEndMinutes;
    
    // 포모도로 진행률 계산 (0-1)
    let progress = 0;
    if (isInTimeRange && itemEndMinutes > itemStartMinutes) {
      const elapsed = currentMinutes - itemStartMinutes;
      const total = itemEndMinutes - itemStartMinutes;
      progress = Math.min(Math.max(elapsed / total, 0), 1);
    }
    
    return { 
      isCurrentTimeInItem: isInTimeRange, 
      pomodoroProgress: progress 
    };
  }, [currentTimeMarkerPosition, realTimeNow, item.startTime, item.endTime, item.type]);

  return (
    <div
      data-todo-id={item.id}
      className={cn(
        'bg-white dark:bg-gray-900',
        'rounded-lg shadow-sm transition-all',
        // 드래그 중이 아닐 때만 호버 효과 적용
        !isDragging && 'hover:shadow-md',
        // 모든 할일 카드를 더 컴팩트하게, 아코디언 펼쳐졌을 때만 기본 크기
        (hasLinkedMemos && isMemosExpanded) ? 'p-4' : 'p-3 py-2.5',
        'cursor-pointer select-none',
        // 완료 상태에 따른 스타일
        shouldShowStrikethrough && 'opacity-70 hover:opacity-90',
        // 완료 영역으로 이동 설정인 경우
        finalIsCompleted && todoCompletion.behavior === 'move-to-completed' && 'opacity-60',
        // 드래그 중에도 원래 카드는 그대로 유지 (작은 프리뷰만 별도 표시)
        // isDragging && draggedItemId === item.id && 'opacity-50',
        // 취소선 효과
        shouldShowStrikethrough && 'relative'
      )}
      onClick={() => item.type === 'todo' && onTodoClick(item.id)}
      {...(isDraggable && onDragHandlers ? {
        onTouchStart: (e) => {
          // 체크박스 클릭인지 확인
          const target = e.target as HTMLElement;
          if (target.classList.contains('cm-checkbox') || target.closest('.cm-checkbox')) {
            return; // 체크박스 클릭 시 드래그 이벤트 무시
          }

          // 🎯 즉시 이벤트 캡처하지 않고 핸들러에 위임
          // 스크롤과 구분하기 위해 기본 동작 허용
          onDragHandlers.onTouchStart(e, item.id);
        },
        onTouchMove: (e) => {
          // 드래그 중일 때만 이벤트 처리
          onDragHandlers.onTouchMove(e);
        },
        onTouchEnd: onDragHandlers.onTouchEnd,
        onMouseDown: (e) => {
          // 체크박스 클릭인지 확인
          const target = e.target as HTMLElement;
          if (target.classList.contains('cm-checkbox') || target.closest('.cm-checkbox')) {
            return; // 체크박스 클릭 시 드래그 이벤트 무시
          }

          onDragHandlers.onTouchStart(e, item.id);
        },
        onMouseMove: onDragHandlers.onTouchMove,
        onMouseUp: onDragHandlers.onTouchEnd,
        onMouseLeave: onDragHandlers.onTouchEnd,
        // 🎯 원래 카드는 변경하지 않음 (작은 프리뷰만 DragPortal에서 표시)
        style: {}
      } : {})}
    >
      <div className="flex items-center gap-3">
        {/* 타입별 색상 인디케이터 - 높이도 아코디언 상태에 맞춰 조정 */}
        <div 
          className={cn(
            "w-2 rounded-full flex-shrink-0 transition-all duration-200",
            // 모든 카드를 더 컴팩트하게, 아코디언 펼쳐졌을 때만 큰 크기
            (hasLinkedMemos && isMemosExpanded) ? 'h-12' : 'h-8'
          )}
          style={{
            backgroundColor: item.type === 'todo' && todoColor
              ? todoColor.hex
              : item.type === 'repository'
                ? '#22c55e' // green-500
                : '#3b82f6' // blue-500 (calendar or fallback)
          }}
        />
        
        {/* 제목과 설명 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className={cn(
              'font-semibold text-base leading-6 relative',
              // 최종 완료 상태 사용
              finalIsCompleted && todoCompletion.behavior === 'move-to-completed' && 'text-gray-500',
              // 커스텀 취소선 적용
              shouldShowStrikethrough && 'custom-strikethrough'
            )}>
              {/* 커스텀 취소선 */}
              {shouldShowStrikethrough && (
                <div
                  className="absolute top-1/2 left-0 h-0.5 bg-black dark:bg-white transition-all duration-500 ease-out transform origin-left -translate-y-1/2 z-10"
                  style={{
                    width: '100%',
                    opacity: 0.8,
                    transform: 'translateY(-50%) scaleX(1)'
                  }}
                />
              )}
              {item.title}
            </h3>
            {isRecurring && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Repeat className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help flex-shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>반복 할일</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* 동기부여 메시지 배지들 - 제목과 같은 라인에 표시 */}
            {linkedMotivationMessages.length > 0 && (
              <div className="flex items-center gap-1.5 flex-1 min-w-0 ml-1 overflow-hidden">
                <MotivationBadge
                  message={linkedMotivationMessages[0]}
                  variant="compact"
                  size="sm"
                  className="flex-1 min-w-0 max-w-none"
                />
                {linkedMotivationMessages.length > 1 && (
                  <div className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md flex-shrink-0">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      외 {linkedMotivationMessages.length - 1}개
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* 포모도로 타이머 (시간 지정된 할일만) */}
        {item.type === 'todo' && item.startTime && item.endTime && (
          <div className="flex-shrink-0 mr-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <PomodoroTimer
                      progress={finalIsCompleted ? 1 : pomodoroProgress}
                      size={48}
                      isActive={isCurrentTimeInItem && !finalIsCompleted}
                      isCompleted={finalIsCompleted}
                      color={todoColor?.hex}
                      className="cursor-help"
                      iconElement={(() => {
                        const iconKey = latestTodoData?.icon;

                        // 아이콘이 없으면 null 반환 (PomodoroTimer가 기본 표시 사용)
                        if (!iconKey) {
                          return null;
                        }

                        const iconData = getUnifiedIcon(iconKey as UnifiedIconKey);
                        if (!iconData) return null;
                        const IconComponent = iconData.component;
                        return <IconComponent size={20} className="text-black dark:text-white" />;
                      })()}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {finalIsCompleted
                      ? '완료됨'
                      : isCurrentTimeInItem
                        ? `진행 중 (${Math.round(pomodoroProgress * 100)}%)`
                        : `${format(new Date(item.startTime), 'HH:mm')} - ${format(new Date(item.endTime), 'HH:mm')}`
                    }
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* 시간 미지정 할일의 아이콘 표시 (언제든지 할일 등) */}
        {item.type === 'todo' && (!item.startTime || !item.endTime) && (
          <div className="flex-shrink-0 mr-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <PomodoroTimer
                      progress={finalIsCompleted ? 1 : 0}
                      size={48}
                      isActive={false}
                      isCompleted={finalIsCompleted}
                      color={todoColor?.hex}
                      className="cursor-help"
                      iconElement={(() => {
                        const iconKey = latestTodoData?.icon;

                        // 아이콘이 없으면 null 반환 (PomodoroTimer가 기본 표시 사용)
                        if (!iconKey) {
                          return null;
                        }

                        const iconData = getUnifiedIcon(iconKey as UnifiedIconKey);
                        if (!iconData) return null;
                        const IconComponent = iconData.component;
                        return <IconComponent size={20} className="text-black dark:text-white" />;
                      })()}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {finalIsCompleted ? '완료됨' : '언제든지 할일'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
        
        {/* 완료 체크박스 - showCheckbox가 true일 때만 표시 */}
        {showCheckbox && (
          <div className="relative">
            <button
              onClick={async (e) => {
                e.stopPropagation();

                try {
                  // 스토어에서 즉시 optimistic update 처리
                  await onToggleComplete(item.id);
                } catch (error) {
                  console.error('완료 상태 토글 실패:', error);
                }
              }}
              className={cn(
                'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 relative overflow-hidden',
                'transition-all duration-300 ease-out hover:scale-110',
                // 최종 완료 상태 사용
                finalIsCompleted
                  ? 'border-transparent text-white transform scale-105'
                  : 'bg-white'
              )}
              style={{
                backgroundColor: finalIsCompleted ? (todoColor?.hex || '#22C55E') : 'white',
                borderColor: finalIsCompleted ? 'transparent' : (todoColor?.hex || '#D1D5DB')
              }}
            >
              {/* 체크마크 배경 채우기 효과 */}
              <div
                className={cn(
                  'absolute inset-0 rounded-full transition-all duration-500 ease-out',
                  finalIsCompleted ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                )}
                style={{
                  backgroundColor: todoColor?.hex || '#22C55E'
                }}
              />

              {/* 체크마크 */}
              <Check
                className={cn(
                  'w-4 h-4 text-white transition-all duration-700 ease-out transform relative z-10',
                  finalIsCompleted
                    ? 'opacity-100 scale-100 rotate-0'
                    : 'opacity-0 scale-0 rotate-180'
                )}
                style={{
                  transitionDelay: finalIsCompleted ? '200ms' : '0ms' // 배경 채워진 후 체크마크 나타남
                }}
              />
            </button>

            {/* 완료 축하 폭죽 효과 - react-confetti-explosion 라이브러리 사용 */}
            {showCelebration && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
                <ConfettiExplosion
                  particleCount={15}
                  particleSize={8}
                  duration={2500}
                  colors={['#FCD34D', '#F97316', '#EF4444', '#EC4899', '#8B5CF6']}
                  force={0.8}
                  width={200}
                  height={200}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 노트 아코디언 토글 버튼 - 접혔을 때만 표시 */}
      {hasLinkedMemos && !isMemosExpanded && (
        <div
          className={cn(
            'mt-2 py-2 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-b-lg transition-all duration-200',
            // 카드 padding에 맞춰 동적 negative margin
            '-mx-3 -mb-2.5 px-3'
          )}
          onClick={(e) => {
            e.stopPropagation(); // 할일 클릭 이벤트 방지
            e.preventDefault(); // 기본 동작 방지
          }}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // 할일 클릭 이벤트 방지
                    e.preventDefault(); // 기본 동작 방지
                    setIsMemosExpanded(!isMemosExpanded);
                  }}
                  className="w-full flex items-center justify-between"
                >
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    0/{displayMemos.length}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 text-gray-400 dark:text-gray-500 transition-transform duration-200',
                      isMemosExpanded && 'rotate-180'
                    )}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {displayMemos.length === 1
                    ? '연결된 노트 1개 (클릭하여 보기)'
                    : `연결된 노트 ${displayMemos.length}개 (클릭하여 보기)`
                  }
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* 아코디언 형태로 연결된 노트 표시 - 전체 카드 너비 활용 */}
      {hasLinkedMemos && (
        <div
          className={cn(
            'overflow-hidden transition-all duration-200 ease-out',
            isMemosExpanded ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'
          )}
        >
          {/* 노트 태그들 표시 - 아코디언 내부 상단 */}
          {memoTags.length > 0 && isMemosExpanded && (
            <div className="mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <div className="flex flex-wrap gap-1.5">
                  {memoTags.map((tag) => (
                    <div
                      key={tag.id}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
                        "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
                        "hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors",
                        tag.is_template && "ring-1 ring-blue-400 ring-opacity-50"
                      )}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="truncate max-w-[120px]">
                        {tag.name}
                      </span>
                      {tag.is_template && (
                        <span className="text-blue-500 text-[10px] ml-0.5">(T)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div
            className="space-y-2 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {displayMemos.map((memo) => (
              <div
                key={memo.id}
                className="group py-2 px-1 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/20 rounded-md transition-all duration-200"
                onClick={(e) => handleMemoClick(memo, e)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-1 h-4 bg-gray-300 dark:bg-gray-600 rounded-full flex-shrink-0 mt-1 group-hover:bg-gray-400 dark:group-hover:bg-gray-500 transition-colors" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      <MarkdownViewer
                        content={memo.content}
                        className="memo-markdown-content"
                        interactive={true}
                        onContentChange={(newContent) => handleMemoContentChange(memo, newContent)}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                        메모
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {format(new Date(memo.created_at), 'M월 d일 HH:mm', { locale: ko })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 노트 아코디언 토글 버튼 - 펼쳐졌을 때 하단에 표시 (overflow 밖에 배치) */}
      {hasLinkedMemos && isMemosExpanded && (
        <div
          className={cn(
            'mt-2 py-2 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-b-lg transition-all duration-200',
            // 카드 padding에 맞춰 동적 negative margin
            '-mx-4 -mb-4 px-4'
          )}
          onClick={(e) => {
            e.stopPropagation(); // 할일 클릭 이벤트 방지
            e.preventDefault(); // 기본 동작 방지
          }}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // 할일 클릭 이벤트 방지
                    e.preventDefault(); // 기본 동작 방지
                    setIsMemosExpanded(!isMemosExpanded);
                  }}
                  className="w-full flex items-center justify-between"
                >
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    0/{displayMemos.length}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 text-gray-400 dark:text-gray-500 transition-transform duration-200',
                      isMemosExpanded && 'rotate-180'
                    )}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {displayMemos.length === 1
                    ? '연결된 노트 1개 (클릭하여 접기)'
                    : `연결된 노트 ${displayMemos.length}개 (클릭하여 접기)`
                  }
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      
      {/* 현재 시간이 이 할일 진행 중일 때 마커 표시 */}
      {isCurrentTimeInItem && realTimeNow && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <span className="text-red-600 dark:text-red-400 font-medium">
            지금 {format(realTimeNow, 'a h:mm', { locale: ko })}
          </span>
          <div className="flex-1 h-px bg-red-200 dark:bg-red-800" />
        </div>
      )}
    </div>
  );
});

TimelineItemCard.displayName = 'TimelineItemCard';

export default TimelineItemCard;