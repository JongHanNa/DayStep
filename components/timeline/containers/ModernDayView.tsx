'use client';

import React, { memo, useMemo, useEffect, useCallback, useState } from 'react';
import { isToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useTimelineViewStore } from '@/state/stores/timelineViewStore';
import { useSettingsStore } from '@/state/stores/settingsStore';
import { cn } from '@/lib/utils';
import { useTodoStore } from '@/state/stores/todoStore';
import TodoFormModal from '@/components/todos/TodoFormModal';
import RecurringUpdateDialog from '@/components/todos/RecurringUpdateDialog';
import { AllDaySection, CompletedSection, AnytimeSection, TimedItemsSection } from '../sections';
import { useModernDayViewState } from '@/hooks/useModernDayViewState';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useModernDayViewHandlers } from '@/hooks/useModernDayViewHandlers';
import { calculateTimeGaps } from '@/lib/timeGapUtils';
import { DragPortal } from '../drag/DragPortal';
import { getTailwindClasses } from '@/lib/theme-colors';
import { useTimelineWithCalendar } from '@/hooks/useTimelineWithCalendar';
import { CalendarEventCard } from '@/components/calendar/CalendarEventCard';

interface ModernDayViewProps {
  className?: string;
}

const ModernDayView: React.FC<ModernDayViewProps> = memo(({ className }) => {
  const {
    getFilteredAndSortedItems,
    currentDate,
    showDayStartGap,
    showPastGaps,
    navigateToToday,
    viewMode,
    items: storeItems  // 스토어의 실제 items 상태도 의존
  } = useTimelineViewStore();

  const { timeFormat, todoCompletion } = useSettingsStore();

  // 캘린더 이벤트 통합
  const {
    allDayItems: calendarAllDayItems,
    timedItems: calendarTimedItems,
    calendarEvents,
    calendarStatus
  } = useTimelineWithCalendar(currentDate);

  // console.log('🖥️ [Debug] ModernDayView 렌더링:', {
  //   currentDate: currentDate.toISOString(),
  //   calendarAllDayItemsCount: calendarAllDayItems.length,
  //   calendarTimedItemsCount: calendarTimedItems.length,
  //   calendarEventsTotal: calendarEvents.total,
  //   calendarStatus,
  //   calendarAllDayItemsPreview: calendarAllDayItems.slice(0, 3).map(item => ({
  //     id: item.id,
  //     type: item.type,
  //     title: item.title,
  //     isAllDay: item.isAllDay
  //   })),
  //   calendarTimedItemsPreview: calendarTimedItems.slice(0, 3).map(item => ({
  //     id: item.id,
  //     type: item.type,
  //     title: item.title,
  //     isAllDay: item.isAllDay,
  //     startTime: item.startTime?.toISOString()
  //   }))
  // });
  
  const { 
    todos,
    isRecurrenceCompleted,
    todoCompletions,
    loadCompletionsForDateRange,
    updateTodo
  } = useTodoStore();

  
  // 상태 관리 커스텀 훅
  const {
    isAllDayCollapsed,
    setIsAllDayCollapsed,
    isTimedCollapsed,
    setIsTimedCollapsed,
    isCompletedCollapsed,
    setIsCompletedCollapsed,
    isAnytimeCollapsed,
    setIsAnytimeCollapsed,
    isEditModalOpen,
    setIsEditModalOpen,
    selectedTodo,
    setSelectedTodo,
    loggedOngoingTasksRef,
    isAddModalOpen,
    setIsAddModalOpen,
    addModalStartTime,
    setAddModalStartTime,
    addModalEndTime,
    setAddModalEndTime,
    realTimeNow,
  } = useModernDayViewState();

  // 오늘 여부 확인
  const isTodayDate = isToday(currentDate);

  // 클라이언트 전용 상태
  const [isClient, setIsClient] = useState(false);

  // 중앙화된 색상 관리
  const { timelineBackground, darkTimelineBackground } = getTailwindClasses();

  // 반복 할일 업데이트 다이얼로그 상태
  const [recurringUpdateDialog, setRecurringUpdateDialog] = useState<{
    open: boolean;
    data?: {
      todoId: string;
      todoTitle: string;
      originalTime: { start: Date; end?: Date };
      newTime: { start: Date; end?: Date };
      occurrenceDate: Date;
    };
  }>({ open: false });

  useEffect(() => {
    setIsClient(true);
  }, []);

  
  // schedule_type별로 아이템 분류 - 새 스키마 기반 (완료 상태 포함) + 캘린더 이벤트 통합
  const { allDayItems, timedItems, completedItems, anytimeItems } = useMemo(() => {
    const allItems = getFilteredAndSortedItems();

    const allDayItems: any[] = [];
    const timedItems: any[] = [];
    const completedItems: any[] = [];
    const anytimeItems: any[] = [];
    
    // 완료 상태 확인 헬퍼 함수
    const isItemCompleted = (item: any) => {
      if (item.type !== 'todo') return false;
      
      const todoData = item.data;
      if (!todoData) return false;
      
      // 반복 할일인지 확인
      const isRecurring = todoData.is_recurrence_instance || 
                         (todoData.recurrence_pattern && todoData.recurrence_pattern !== 'none');
      
      if (isRecurring) {
        // 반복 할일: 날짜별 완료 상태 확인
        const originalId = todoData.recurrence_source_id || todoData.id;
        const isCompleted = isRecurrenceCompleted(originalId, currentDate);
        
        return isCompleted;
      } else {
        // 일반 할일: completed 필드 확인
        const isCompleted = todoData.completed || false;
        return isCompleted;
      }
    };

    allItems.forEach((item, index) => {
      
      // Todo 타입 아이템의 scheduleType 기반 분류
      if (item.type === 'todo') {
        // scheduleType과 schedule_type 양쪽을 모두 확인 (camelCase와 snake_case 호환)
        const scheduleType = (item.data as any)?.scheduleType || (item.data as any)?.schedule_type;
        
        // 먼저 완료 상태 확인
        const isCompleted = isItemCompleted(item);
        
        if (isCompleted && todoCompletion.behavior === 'move-to-completed') {
          // 완료 영역으로 이동 모드: 완료된 할일을 완료 영역에 추가
          completedItems.push(item);
        } else {
          // 미완료 할일은 scheduleType에 따라 분류
          if (scheduleType) {
            // scheduleType 기반 분류: ${scheduleType}
            switch (scheduleType) {
              case 'all_day':
                allDayItems.push(item);
                break;
              case 'timed':
                timedItems.push(item);
                break;
              case 'anytime':
                anytimeItems.push(item);
                break;
              default:
                console.log(`⚠️ [${item.title?.substring(0, 20)}] 알 수 없는 scheduleType: ${scheduleType}, isAllDay/시간 정보 기준으로 fallback`);
                // 알 수 없는 scheduleType인 경우 시간 정보를 기준으로 분류
                if (item.isAllDay) {
                  allDayItems.push(item);
                } else if (item.startTime || item.endTime) {
                  timedItems.push(item);
                } else {
                  // 시간 정보가 없으면 anytime으로 분류
                  anytimeItems.push(item);
                }
            }
          } else {
            // scheduleType이 없는 경우: 시간 정보를 기준으로 분류
            console.log(`⚠️ [${item.title?.substring(0, 20)}] scheduleType이 없음, 시간 정보 기준으로 fallback 분류`);
            if (item.isAllDay) {
              allDayItems.push(item);
            } else if (item.startTime || item.endTime) {
              timedItems.push(item);
            } else {
              // 시간 정보가 없으면 anytime으로 분류
              anytimeItems.push(item);
            }
          }
        }
      } else {
        // 다른 타입의 아이템 (repository, timeline-task 등)
        // 다른 타입은 완료 상태가 없으므로 기존 로직 유지
        if (item.isAllDay) {
          allDayItems.push(item);
        } else {
          timedItems.push(item);
        }
      }
    });
    
    // 🔍 디버깅: anytime 아이템들의 schedule_type 확인
    const anytimeDebugInfo = anytimeItems.map(item => ({
      title: item.title?.substring(0, 20),
      scheduleType: (item.data as any)?.scheduleType,
      schedule_type: (item.data as any)?.schedule_type,
      isAllDay: item.isAllDay,
      hasTime: !!(item.startTime || item.endTime)
    }));

    console.log('🔍 schedule_type 분류 디버깅:', {
      timedItemsCount: timedItems.length,
      allDayItemsCount: allDayItems.length,
      anytimeItemsCount: anytimeItems.length,
      completedItemsCount: completedItems.length,
      anytimeDebugInfo
    });

    // 캘린더 이벤트 통합 - 종일 이벤트와 시간 지정 이벤트 추가
    calendarEvents.allDay.forEach(event => {
      allDayItems.push(event);
    });

    calendarEvents.timed.forEach(event => {
      timedItems.push(event);
    });

    console.log('📅 캘린더 이벤트 통합 완료:', {
      totalCalendarEvents: calendarEvents.total,
      allDayCalendarEvents: calendarEvents.allDay.length,
      timedCalendarEvents: calendarEvents.timed.length,
      calendarStatus: {
        isConnected: calendarStatus.isConnected,
        isLoading: calendarStatus.isLoading,
        error: calendarStatus.error
      }
    });

    // ModernDayView schedule_type별 분류 완료: ${allItems.length}개 아이템 + ${calendarEvents.total}개 캘린더 이벤트 (종일: ${allDayItems.length}, 시간: ${timedItems.length}, 완료: ${completedItems.length}, 언제든지: ${anytimeItems.length})

    return { allDayItems, timedItems, completedItems, anytimeItems };
  }, [getFilteredAndSortedItems, currentDate, storeItems, isRecurrenceCompleted, todoCompletions, todoCompletion.behavior, calendarEvents]);
  
  // 드래그 앤 드롭 커스텀 훅 (timedItems 정의 이후)
  const {
    isDragging,
    draggedItemId,
    currentDragY,
    currentDragX,
    previewTime,
    draggedTodo,
    cardOffsetY, // 카드 위치 보정값
    handleTouchStart,
    handlePressMove,
    handleDragEnd,
  } = useDragAndDrop({ 
    currentDate, 
    timeFormat, 
    todos,
    timedItems: timedItems // 반복 할일 인스턴스 포함
  });
  
  // 현재 시간 마커 위치 계산 (실시간)
  const currentTimeMarkerPosition = useMemo(() => {
    if (!isTodayDate) return null;
    
    const currentHour = realTimeNow.getHours();
    const currentMinute = realTimeNow.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    return {
      timeInMinutes: currentTimeInMinutes,
      hour: currentHour,
      minute: currentMinute
    };
  }, [realTimeNow, isTodayDate]);

  // 반복 할일 업데이트 선택 처리
  const handleRecurringUpdate = useCallback((data: {
    todoId: string;
    originalTime: { start: Date; end?: Date };
    newTime: { start: Date; end?: Date };
    occurrenceDate: Date;
  }) => {
    const todo = todos.find(t => t.id === data.todoId);
    if (!todo) return;

    setRecurringUpdateDialog({
      open: true,
      data: {
        ...data,
        todoTitle: todo.content || '할일'
      }
    });
  }, [todos]);

  // 반복 할일 업데이트 선택 처리 (TodoStore 함수 사용)
  const handleRecurringUpdateChoice = useCallback(async (choice: 'this-only' | 'from-now' | 'all') => {
    if (!recurringUpdateDialog.data) return;

    const { todoId, newTime } = recurringUpdateDialog.data;
    
    try {
      // TodoStore의 updateTodo 사용 (자동 새로고침 포함)
      const updates = {
        start_time: newTime.start.toISOString(),
        end_time: newTime.end?.toISOString()
      };

      await updateTodo(todoId, updates);
      console.log(`✅ ${choice} 업데이트 완료`);
      
    } catch (error) {
      console.error('반복 할일 업데이트 실패:', error);
      throw error;
    }
  }, [recurringUpdateDialog.data, updateTodo]);

  // 핸들러들을 별도 훅으로 분리
  const {
    handleToggleComplete,
    handleTodoClick,
    handleAddTask,
  } = useModernDayViewHandlers({
    allDayItems,
    timedItems,
    completedItems,
    anytimeItems,
    todos,
    currentDate,
    setSelectedTodo,
    setIsEditModalOpen,
    setAddModalStartTime,
    setAddModalEndTime,
    setIsAddModalOpen,
  });

  // 간격 분석 - 20분 이상 간격이 있는 곳들 찾기
  const timeGaps = useMemo(() => {
    if (isTodayDate) {
      // 🌅 오늘 날짜: 모든 간격 계산 (실시간 기능 포함)
      return calculateTimeGaps({
        timedItems,
        currentDate,
        isTodayDate,
        realTimeNow,
        showPastGaps,
        loggedOngoingTasksRef
      });
    } else {
      // 📆 오늘이 아닌 날짜: 기본적인 간격만 계산 (실시간 기능 제외)
      return calculateTimeGaps({
        timedItems,
        currentDate,
        isTodayDate: false, // 실시간 기능 비활성화
        realTimeNow: new Date(), // 더미 값 - 실제로 사용되지 않음
        showPastGaps: true, // 과거 간격 표시 (오늘이 아니므로 모든 간격 표시)
        loggedOngoingTasksRef
      });
    }
  }, [timedItems, currentDate, isTodayDate, realTimeNow, showPastGaps]); // eslint-disable-line react-hooks/exhaustive-deps






  // 현재 날짜의 완료 기록 로드
  useEffect(() => {
    if (currentDate) {
      const startOfDay = new Date(currentDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(currentDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      loadCompletionsForDateRange(startOfDay, endOfDay);
    }
  }, [currentDate, loadCompletionsForDateRange]);


  return (
    <>
      {/* 🎯 오늘/오늘이 아닌 날짜로 큰 분기 나누기 */}
      {isTodayDate ? (
        // 📅 오늘 날짜 전용 로직: 복잡한 실시간 기능 포함
        <div className={cn('flex flex-col h-full ${timelineBackground} ${darkTimelineBackground}', className)}>
          {/* 헤더 섹션 제거됨 - SwipeCalendar에서 처리 */}

          {/* 오늘 날짜 메인 컨텐츠 영역 - 실시간 업데이트, 현재 시간 마커 등 포함 */}
          <div className="flex-1 overflow-y-auto">
            {timedItems.length === 0 && anytimeItems.length === 0 ? (
              // 오늘 날짜 전용 "계획 없음" 표시
              <div className="flex items-center justify-center h-full px-6">
                <div className="text-center max-w-sm">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted/30 flex items-center justify-center">
                    <span className="text-3xl opacity-60">🌅</span>
                  </div>
                  <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                    오늘 계획이 없습니다
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    새로운 할일이나 다짐을 추가해서<br />
                    오늘을 의미있게 계획해보세요
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* 오늘 날짜 시간 지정 할일들 - 실시간 기능 포함 */}
                <TimedItemsSection
                  currentDate={currentDate}
                  timedItems={timedItems}
                  isCollapsed={isTimedCollapsed}
                  onToggleCollapse={() => setIsTimedCollapsed(!isTimedCollapsed)}
                  isDragging={isDragging}
                  previewTime={previewTime}
                  currentDragY={currentDragY}
                  showDayStartGap={showDayStartGap}
                  isTodayDate={isTodayDate}
                  realTimeNow={realTimeNow}
                  currentTimeMarkerPosition={currentTimeMarkerPosition}
                  showPastGaps={showPastGaps}
                  timeGaps={timeGaps}
                  draggedItemId={draggedItemId}
                  cardOffsetY={cardOffsetY} // 카드 위치 보정값
                  onTodoClick={handleTodoClick}
                  onToggleComplete={handleToggleComplete}
                  onAddTask={handleAddTask}
                  onDragHandlers={{
                    onTouchStart: handleTouchStart,
                    onTouchMove: handlePressMove,
                    onTouchEnd: () => handleDragEnd(handleRecurringUpdate)
                  }}
                />
              </>
            )}
          </div>

          {/* 언제든지 할일 섹션 - AnytimeSection 컴포넌트 사용 */}
          <AnytimeSection
            anytimeItems={anytimeItems}
            isCollapsed={isAnytimeCollapsed}
            onToggleCollapse={() => setIsAnytimeCollapsed(!isAnytimeCollapsed)}
            onToggleComplete={handleToggleComplete}
            onTodoClick={handleTodoClick}
          />

          {/* 종일 일정 섹션 */}
          <AllDaySection
            allDayItems={allDayItems}
            isCollapsed={isAllDayCollapsed}
            onToggleCollapse={() => setIsAllDayCollapsed(!isAllDayCollapsed)}
            onToggleComplete={handleToggleComplete}
            onTodoClick={handleTodoClick}
            isDraggable={true}
            isDragging={isDragging}
            draggedItemId={draggedItemId}
            cardOffsetY={cardOffsetY} // 카드 위치 보정값
            onDragHandlers={{
              onTouchStart: handleTouchStart,
              onTouchMove: handlePressMove,
              onTouchEnd: () => handleDragEnd(handleRecurringUpdate)
            }}
          />

          {/* 완료된 할일 섹션 - CompletedSection 컴포넌트 사용 */}
          <CompletedSection
            completedItems={completedItems}
            isCollapsed={isCompletedCollapsed}
            onToggleCollapse={() => setIsCompletedCollapsed(!isCompletedCollapsed)}
            onToggleComplete={handleToggleComplete}
            onTodoClick={handleTodoClick}
            onEditModalOpen={(todo) => {
              setSelectedTodo(todo);
              setIsEditModalOpen(true);
            }}
          />
        </div>
      ) : (
        // 📆 오늘이 아닌 날짜 전용 로직: 단순화된 정적 표시
        <div className={cn('flex flex-col h-full ${timelineBackground} ${darkTimelineBackground}', className)}>
          {/* 헤더 섹션 제거됨 - SwipeCalendar에서 처리 */}

          {/* 오늘이 아닌 날짜 메인 컨텐츠 영역 - 단순화된 정적 표시 */}
          <div className="flex-1 overflow-y-auto">
            {timedItems.length === 0 && anytimeItems.length === 0 ? (
              // 오늘이 아닌 날짜 전용 "계획 없음" 표시
              <div className="flex items-center justify-center h-full px-6">
                <div className="text-center max-w-sm">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted/30 flex items-center justify-center">
                    <span className="text-3xl opacity-60">📋</span>
                  </div>
                  <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                    계획된 일정이 없습니다
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    새로운 할일이나 다짐을 추가해서<br />
                    하루를 계획해보세요
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* 오늘이 아닌 날짜 시간 지정 할일들 - 단순화된 버전 */}
                <TimedItemsSection
                  currentDate={currentDate}
                  timedItems={timedItems}
                  isCollapsed={isTimedCollapsed}
                  onToggleCollapse={() => setIsTimedCollapsed(!isTimedCollapsed)}
                  isDragging={false} // 드래그 비활성화
                  previewTime={null}
                  currentDragY={0}
                  showDayStartGap={true} // 🔧 다른 날짜에서는 하루 시작 간격 항상 표시
                  isTodayDate={false}
                  realTimeNow={new Date()} // 더미 값
                  currentTimeMarkerPosition={null} // 현재 시간 마커 비활성화
                  showPastGaps={true} // 🔧 다른 날짜에서는 모든 간격 표시
                  timeGaps={timeGaps} // 🔧 계산된 간격 전달 (빈 배열 아님)
                  draggedItemId={null}
                  cardOffsetY={0}
                  onTodoClick={handleTodoClick}
                  onToggleComplete={handleToggleComplete}
                  onAddTask={handleAddTask}
                  onDragHandlers={{
                    onTouchStart: () => {},
                    onTouchMove: () => {},
                    onTouchEnd: () => {}
                  }}
                />
              </>
            )}
          </div>

          {/* 언제든지 할일 섹션 - 단순화된 버전 */}
          <AnytimeSection
            anytimeItems={anytimeItems}
            isCollapsed={isAnytimeCollapsed}
            onToggleCollapse={() => setIsAnytimeCollapsed(!isAnytimeCollapsed)}
            onToggleComplete={handleToggleComplete}
            onTodoClick={handleTodoClick}
          />

          {/* 종일 일정 섹션 - 단순화된 버전 (드래그 비활성화) */}
          <AllDaySection
            allDayItems={allDayItems}
            isCollapsed={isAllDayCollapsed}
            onToggleCollapse={() => setIsAllDayCollapsed(!isAllDayCollapsed)}
            onToggleComplete={handleToggleComplete}
            onTodoClick={handleTodoClick}
            isDraggable={false} // 오늘이 아닌 날짜는 드래그 비활성화
            isDragging={false}
            draggedItemId={null}
            cardOffsetY={0}
            onDragHandlers={{
              onTouchStart: () => {},
              onTouchMove: () => {},
              onTouchEnd: () => {}
            }}
          />

          {/* 완료된 할일 섹션 - 단순화된 버전 */}
          <CompletedSection
            completedItems={completedItems}
            isCollapsed={isCompletedCollapsed}
            onToggleCollapse={() => setIsCompletedCollapsed(!isCompletedCollapsed)}
            onToggleComplete={handleToggleComplete}
            onTodoClick={handleTodoClick}
            onEditModalOpen={(todo) => {
              setSelectedTodo(todo);
              setIsEditModalOpen(true);
            }}
          />
        </div>
      )}
      
      {/* 🔧 공통 컴포넌트들 - 오늘/오늘이 아닌 날짜 모두에서 사용 */}
      
      {/* React Portal 기반 드래그 오버레이 - 오늘 날짜에만 활성화 */}
      {isTodayDate && (
        <DragPortal
          isActive={isDragging && !!draggedTodo}
          dragX={currentDragX}
          dragY={currentDragY}
          previewTime={previewTime}
        >
          {/* 작은 할일 카드 프리뷰 */}
          <div className="bg-white/60 dark:bg-gray-800/60 border-2 border-blue-500 rounded-lg shadow-xl p-3 scale-75 min-w-80 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex-1">
                {draggedTodo?.content || ''}
              </div>
            </div>
          </div>
        </DragPortal>
      )}
      
      {/* 할일 수정 모달 - 공통 사용 */}
      <TodoFormModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        editingTodo={selectedTodo}
      />
      
      {/* 할일 추가 모달 - 공통 사용 */}
      <TodoFormModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        initialStartTime={addModalStartTime}
        initialEndTime={addModalEndTime}
      />
      
      {/* 반복 할일 업데이트 다이얼로그 - 공통 사용 */}
      {recurringUpdateDialog.data && (
        <RecurringUpdateDialog
          open={recurringUpdateDialog.open}
          onOpenChange={(open) => setRecurringUpdateDialog({ open })}
          todoTitle={recurringUpdateDialog.data.todoTitle}
          originalTime={recurringUpdateDialog.data.originalTime}
          newTime={recurringUpdateDialog.data.newTime}
          occurrenceDate={recurringUpdateDialog.data.occurrenceDate}
          onUpdateChoice={handleRecurringUpdateChoice}
        />
      )}
    </>
  );
});

ModernDayView.displayName = 'ModernDayView';

export default ModernDayView;